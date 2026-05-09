use crate::db::{DatabaseManager, ImportStats, ExportStats};
use crate::errors::AppError;
use crate::utils::paths;
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::State;

pub type DbState = Arc<Mutex<DatabaseManager>>;

#[tauri::command]
pub fn db_get_accounts(db: State<'_, DbState>) -> Result<Vec<crate::models::account::Account>, AppError> {
    let manager = db.lock();
    manager.accounts().get_all()
}

#[tauri::command]
pub fn db_get_account(db: State<'_, DbState>, account_id: String) -> Result<Option<crate::models::account::Account>, AppError> {
    let manager = db.lock();
    manager.accounts().get_by_id(&account_id)
}

#[tauri::command]
pub fn db_insert_account(db: State<'_, DbState>, account: crate::models::account::Account) -> Result<(), AppError> {
    let manager = db.lock();
    manager.accounts().insert(&account)
}

#[tauri::command]
pub fn db_delete_account(db: State<'_, DbState>, account_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.accounts().delete(&account_id)
}

#[tauri::command]
pub fn db_get_settings(db: State<'_, DbState>) -> Result<crate::models::settings::LauncherSettings, AppError> {
    let manager = db.lock();
    manager.settings().get()
}

#[tauri::command]
pub fn db_save_settings(db: State<'_, DbState>, settings: crate::models::settings::LauncherSettings) -> Result<(), AppError> {
    let manager = db.lock();
    manager.settings().save(&settings)
}

#[tauri::command]
pub fn db_get_setting(db: State<'_, DbState>, key: String) -> Result<Option<String>, AppError> {
    let manager = db.lock();
    manager.settings().get_key(&key)
}

#[tauri::command]
pub fn db_set_setting(db: State<'_, DbState>, key: String, value: String) -> Result<(), AppError> {
    let manager = db.lock();
    manager.settings().set_key(&key, &value)
}

#[tauri::command]
pub fn db_get_instances(db: State<'_, DbState>) -> Result<Vec<crate::models::instance::VersionInstance>, AppError> {
    let manager = db.lock();
    manager.instances().get_all()
}

#[tauri::command]
pub fn db_get_instance(db: State<'_, DbState>, instance_id: String) -> Result<Option<crate::models::instance::VersionInstance>, AppError> {
    let manager = db.lock();
    manager.instances().get_by_id(&instance_id)
}

#[tauri::command]
pub fn db_insert_instance(db: State<'_, DbState>, instance: crate::models::instance::VersionInstance) -> Result<(), AppError> {
    let manager = db.lock();
    manager.instances().insert(&instance)
}

#[tauri::command]
pub fn db_delete_instance(db: State<'_, DbState>, instance_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.instances().delete(&instance_id)
}

#[tauri::command]
pub fn db_update_instance(db: State<'_, DbState>, instance_id: String, updates: serde_json::Value) -> Result<(), AppError> {
    let manager = db.lock();
    manager.instances().update(&instance_id, &updates)
}

#[tauri::command]
pub fn db_update_instance_play_time(db: State<'_, DbState>, instance_id: String, additional_seconds: u64) -> Result<(), AppError> {
    let manager = db.lock();
    manager.instances().update_play_time(&instance_id, additional_seconds)
}

#[tauri::command]
pub fn db_get_installed_versions(db: State<'_, DbState>) -> Result<Vec<crate::models::version::InstalledVersion>, AppError> {
    let manager = db.lock();
    manager.installed_versions().get_all()
}

#[tauri::command]
pub fn db_upsert_installed_version(db: State<'_, DbState>, version: crate::models::version::InstalledVersion) -> Result<(), AppError> {
    let manager = db.lock();
    manager.installed_versions().upsert(&version)
}

#[tauri::command]
pub fn db_get_servers(db: State<'_, DbState>) -> Result<Vec<crate::models::server::ServerEntry>, AppError> {
    let manager = db.lock();
    manager.servers().get_all()
}

#[tauri::command]
pub fn db_insert_server(db: State<'_, DbState>, server: crate::models::server::ServerEntry) -> Result<(), AppError> {
    let manager = db.lock();
    manager.servers().insert(&server)
}

#[tauri::command]
pub fn db_delete_server(db: State<'_, DbState>, server_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.servers().delete(&server_id)
}

#[tauri::command]
pub fn db_get_server_groups(db: State<'_, DbState>) -> Result<Vec<crate::models::server::ServerGroup>, AppError> {
    let manager = db.lock();
    manager.server_groups().get_all()
}

#[tauri::command]
pub fn db_insert_server_group(db: State<'_, DbState>, group: crate::models::server::ServerGroup) -> Result<(), AppError> {
    let manager = db.lock();
    manager.server_groups().insert(&group)
}

#[tauri::command]
pub fn db_get_world_backups(db: State<'_, DbState>, world_name: String) -> Result<Vec<crate::models::world::WorldBackup>, AppError> {
    let manager = db.lock();
    manager.world_backups().get_by_world(&world_name)
}

#[tauri::command]
pub fn db_insert_world_backup(db: State<'_, DbState>, backup: crate::models::world::WorldBackup) -> Result<(), AppError> {
    let manager = db.lock();
    manager.world_backups().insert(&backup)
}

#[tauri::command]
pub fn db_delete_world_backup(db: State<'_, DbState>, backup_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.world_backups().delete(&backup_id)
}

#[tauri::command]
pub fn db_insert_launch_record(db: State<'_, DbState>, session: crate::models::launch::LaunchSession) -> Result<(), AppError> {
    let manager = db.lock();
    manager.launch_records().insert(&session)
}

#[tauri::command]
pub fn db_get_recent_launches(db: State<'_, DbState>, limit: Option<usize>) -> Result<Vec<crate::models::launch::LaunchSession>, AppError> {
    let manager = db.lock();
    manager.launch_records().get_recent(limit.unwrap_or(50))
}

#[tauri::command]
pub fn db_insert_crash_report(db: State<'_, DbState>, report: crate::models::launch::CrashReport) -> Result<(), AppError> {
    let manager = db.lock();
    manager.crash_reports().insert(&report)
}

#[tauri::command]
pub fn db_get_recent_crash_reports(db: State<'_, DbState>, limit: Option<usize>) -> Result<Vec<crate::models::launch::CrashReport>, AppError> {
    let manager = db.lock();
    manager.crash_reports().get_recent(limit.unwrap_or(20))
}

#[tauri::command]
pub fn db_get_local_mods(db: State<'_, DbState>, instance_id: String) -> Result<Vec<crate::models::mod_info::LocalMod>, AppError> {
    let manager = db.lock();
    manager.local_mods().get_by_instance(&instance_id)
}

#[tauri::command]
pub fn db_insert_local_mod(db: State<'_, DbState>, mod_entry: crate::models::mod_info::LocalMod, instance_id: String) -> Result<(), AppError> {
    let manager = db.lock();
    manager.local_mods().insert(&mod_entry, &instance_id)
}

#[tauri::command]
pub fn db_toggle_local_mod(db: State<'_, DbState>, mod_id: String, enabled: bool) -> Result<(), AppError> {
    let manager = db.lock();
    manager.local_mods().toggle(&mod_id, enabled)
}

#[tauri::command]
pub fn db_delete_local_mod(db: State<'_, DbState>, mod_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.local_mods().delete(&mod_id)
}

#[tauri::command]
pub fn db_import_from_json(db: State<'_, DbState>) -> Result<ImportStats, AppError> {
    let json_dir = paths::config_dir();
    let manager = db.lock();
    manager.import_from_json(&json_dir)
}

#[tauri::command]
pub fn db_export_to_json(db: State<'_, DbState>) -> Result<ExportStats, AppError> {
    let json_dir = paths::config_dir();
    let manager = db.lock();
    manager.export_to_json(&json_dir)
}

pub fn init_database() -> Result<DbState, AppError> {
    let db_path = paths::config_dir().join("bonjour-minecraft.db");
    let manager = DatabaseManager::new(&db_path)?;

    let json_dir = paths::config_dir();
    let needs_import = {
        let accounts = manager.accounts().get_all()?;
        let instances = manager.instances().get_all()?;
        accounts.is_empty() && instances.is_empty()
    };

    if needs_import {
        tracing::info!("Database is empty, attempting JSON import...");
        match manager.import_from_json(&json_dir) {
            Ok(stats) => {
                tracing::info!(
                    accounts = stats.accounts_imported,
                    instances = stats.instances_imported,
                    versions = stats.versions_imported,
                    settings = stats.settings_imported,
                    servers = stats.servers_imported,
                    "JSON import completed"
                );
            }
            Err(e) => {
                tracing::warn!(error = %e, "JSON import failed, starting with empty database");
            }
        }
    }

    Ok(Arc::new(Mutex::new(manager)))
}
