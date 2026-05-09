pub mod connection;
pub mod migrations;
pub mod repository;

use crate::errors::AppError;
use connection::DatabaseConnection;
use repository::*;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;

pub struct DatabaseManager {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl DatabaseManager {
    pub fn new(db_path: &PathBuf) -> Result<Self, AppError> {
        let conn = DatabaseConnection::new(db_path)?;
        let manager = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.run_migrations()?;
        Ok(manager)
    }

    pub fn new_in_memory() -> Result<Self, AppError> {
        let conn = DatabaseConnection::new_in_memory()?;
        let manager = Self {
            conn: Arc::new(Mutex::new(conn)),
        };
        manager.run_migrations()?;
        Ok(manager)
    }

    fn run_migrations(&self) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        migrations::run_migrations(&mut conn)?;
        Ok(())
    }

    pub fn accounts(&self) -> AccountRepository {
        AccountRepository::new(self.conn.clone())
    }

    pub fn settings(&self) -> SettingsRepository {
        SettingsRepository::new(self.conn.clone())
    }

    pub fn instances(&self) -> InstanceRepository {
        InstanceRepository::new(self.conn.clone())
    }

    pub fn installed_versions(&self) -> InstalledVersionRepository {
        InstalledVersionRepository::new(self.conn.clone())
    }

    pub fn servers(&self) -> ServerRepository {
        ServerRepository::new(self.conn.clone())
    }

    pub fn server_groups(&self) -> ServerGroupRepository {
        ServerGroupRepository::new(self.conn.clone())
    }

    pub fn world_backups(&self) -> WorldBackupRepository {
        WorldBackupRepository::new(self.conn.clone())
    }

    pub fn launch_records(&self) -> LaunchRecordRepository {
        LaunchRecordRepository::new(self.conn.clone())
    }

    pub fn crash_reports(&self) -> CrashReportRepository {
        CrashReportRepository::new(self.conn.clone())
    }

    pub fn local_mods(&self) -> LocalModRepository {
        LocalModRepository::new(self.conn.clone())
    }

    pub fn import_from_json(&self, json_dir: &PathBuf) -> Result<ImportStats, AppError> {
        let mut stats = ImportStats::default();
        let mut conn = self.conn.lock();

        let accounts_path = json_dir.join("accounts.json");
        if accounts_path.exists() {
            if let Ok(accounts) = crate::services::file_manager::load_json::<Vec<crate::models::account::Account>>(&accounts_path) {
                let count = accounts.len();
                for account in &accounts {
                    if let Err(e) = repository::import_account(&mut conn, account) {
                        tracing::warn!(account_id = %account.id, error = %e, "Failed to import account");
                    }
                }
                stats.accounts_imported = count;
                tracing::info!(count = count, "Imported accounts from JSON");
            }
        }

        let instances_path = json_dir.join("instances.json");
        if instances_path.exists() {
            if let Ok(instances) = crate::services::file_manager::load_json::<Vec<crate::models::instance::VersionInstance>>(&instances_path) {
                let count = instances.len();
                for instance in &instances {
                    if let Err(e) = repository::import_instance(&mut conn, instance) {
                        tracing::warn!(instance_id = %instance.id, error = %e, "Failed to import instance");
                    }
                }
                stats.instances_imported = count;
                tracing::info!(count = count, "Imported instances from JSON");
            }
        }

        let versions_path = json_dir.join("versions.json");
        if versions_path.exists() {
            if let Ok(versions) = crate::services::file_manager::load_json::<Vec<crate::models::version::InstalledVersion>>(&versions_path) {
                let count = versions.len();
                for version in &versions {
                    if let Err(e) = repository::import_installed_version(&mut conn, version) {
                        tracing::warn!(version_id = %version.id, error = %e, "Failed to import version");
                    }
                }
                stats.versions_imported = count;
                tracing::info!(count = count, "Imported versions from JSON");
            }
        }

        let settings_path = json_dir.join("settings.json");
        if settings_path.exists() {
            if let Ok(settings) = crate::services::file_manager::load_json::<crate::models::settings::LauncherSettings>(&settings_path) {
                if let Err(e) = repository::import_settings(&mut conn, &settings) {
                    tracing::warn!(error = %e, "Failed to import settings");
                } else {
                    stats.settings_imported = 1;
                    tracing::info!("Imported settings from JSON");
                }
            }
        }

        let servers_path = json_dir.join("servers.json");
        if servers_path.exists() {
            if let Ok(servers) = crate::services::file_manager::load_json::<Vec<crate::models::server::ServerEntry>>(&servers_path) {
                let count = servers.len();
                for server in &servers {
                    if let Err(e) = repository::import_server(&mut conn, server) {
                        tracing::warn!(server_id = %server.id, error = %e, "Failed to import server");
                    }
                }
                stats.servers_imported = count;
                tracing::info!(count = count, "Imported servers from JSON");
            }
        }

        let server_groups_path = json_dir.join("server_groups.json");
        if server_groups_path.exists() {
            if let Ok(groups) = crate::services::file_manager::load_json::<Vec<crate::models::server::ServerGroup>>(&server_groups_path) {
                let count = groups.len();
                for group in &groups {
                    if let Err(e) = repository::import_server_group(&mut conn, group) {
                        tracing::warn!(group_id = %group.id, error = %e, "Failed to import server group");
                    }
                }
                stats.server_groups_imported = count;
                tracing::info!(count = count, "Imported server groups from JSON");
            }
        }

        Ok(stats)
    }

    pub fn export_to_json(&self, json_dir: &PathBuf) -> Result<ExportStats, AppError> {
        crate::services::file_manager::ensure_dir(json_dir)?;
        let mut stats = ExportStats::default();
        let mut conn = self.conn.lock();

        let accounts: Vec<crate::models::account::Account> = repository::export_accounts(&mut conn)?;
        if !accounts.is_empty() {
            crate::services::file_manager::save_json(&json_dir.join("accounts.json"), &accounts)?;
            stats.accounts_exported = accounts.len();
        }

        let instances: Vec<crate::models::instance::VersionInstance> = repository::export_instances(&mut conn)?;
        if !instances.is_empty() {
            crate::services::file_manager::save_json(&json_dir.join("instances.json"), &instances)?;
            stats.instances_exported = instances.len();
        }

        let versions: Vec<crate::models::version::InstalledVersion> = repository::export_installed_versions(&mut conn)?;
        if !versions.is_empty() {
            crate::services::file_manager::save_json(&json_dir.join("versions.json"), &versions)?;
            stats.versions_exported = versions.len();
        }

        let settings: Option<crate::models::settings::LauncherSettings> = repository::export_settings(&mut conn)?;
        if let Some(s) = &settings {
            crate::services::file_manager::save_json(&json_dir.join("settings.json"), s)?;
            stats.settings_exported = 1;
        }

        let servers: Vec<crate::models::server::ServerEntry> = repository::export_servers(&mut conn)?;
        if !servers.is_empty() {
            crate::services::file_manager::save_json(&json_dir.join("servers.json"), &servers)?;
            stats.servers_exported = servers.len();
        }

        let groups: Vec<crate::models::server::ServerGroup> = repository::export_server_groups(&mut conn)?;
        if !groups.is_empty() {
            crate::services::file_manager::save_json(&json_dir.join("server_groups.json"), &groups)?;
            stats.server_groups_exported = groups.len();
        }

        Ok(stats)
    }
}

#[derive(Debug, Clone, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ImportStats {
    pub accounts_imported: usize,
    pub instances_imported: usize,
    pub versions_imported: usize,
    pub settings_imported: usize,
    pub servers_imported: usize,
    pub server_groups_imported: usize,
}

#[derive(Debug, Clone, serde::Serialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ExportStats {
    pub accounts_exported: usize,
    pub instances_exported: usize,
    pub versions_exported: usize,
    pub settings_exported: usize,
    pub servers_exported: usize,
    pub server_groups_exported: usize,
}
