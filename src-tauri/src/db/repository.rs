use crate::errors::{self, AppError};
use crate::db::connection::DatabaseConnection;
use crate::models::{
    account::Account,
    settings::LauncherSettings,
    instance::{VersionInstance, InstanceSettings, ShaderPack},
    version::InstalledVersion,
    server::{ServerEntry, ServerGroup, ServerPingResult},
    world::WorldBackup,
    launch::{LaunchSession, LaunchSessionStatus},
};
use parking_lot::Mutex;
use std::sync::Arc;

macro_rules! db_op {
    ($conn:expr, $op:expr) => {
        $op.map_err(|e| errors::database_error(stringify!($op), e.to_string()))
    };
}

pub struct AccountRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl AccountRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<Account>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, account_type, username, uuid, access_token, refresh_token, expires_at, skin_url, avatar_url, littleskin_server_url, littleskin_access_token FROM accounts ORDER BY created_at"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([], |row| {
            Ok(Account {
                id: row.get(0)?,
                account_type: row.get(1)?,
                username: row.get(2)?,
                uuid: row.get(3)?,
                access_token: row.get(4)?,
                refresh_token: row.get(5)?,
                expires_at: row.get(6)?,
                skin_url: row.get(7)?,
                avatar_url: row.get(8)?,
                littleskin_server_url: row.get(9)?,
                littleskin_access_token: row.get(10)?,
            })
        }))?;
        let mut accounts = Vec::new();
        for row in rows {
            accounts.push(db_op!(row, row)?);
        }
        Ok(accounts)
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<Account>, AppError> {
        let mut conn = self.conn.lock();
        let result = db_op!(conn, conn.query_row(
            "SELECT id, account_type, username, uuid, access_token, refresh_token, expires_at, skin_url, avatar_url, littleskin_server_url, littleskin_access_token FROM accounts WHERE id = ?1",
            &[&id],
            |row| {
                Ok(Account {
                    id: row.get(0)?,
                    account_type: row.get(1)?,
                    username: row.get(2)?,
                    uuid: row.get(3)?,
                    access_token: row.get(4)?,
                    refresh_token: row.get(5)?,
                    expires_at: row.get(6)?,
                    skin_url: row.get(7)?,
                    avatar_url: row.get(8)?,
                    littleskin_server_url: row.get(9)?,
                    littleskin_access_token: row.get(10)?,
                })
            }
        ));
        match result {
            Ok(account) => Ok(Some(account)),
            Err(_) => Ok(None),
        }
    }

    pub fn insert(&self, account: &Account) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO accounts (id, account_type, username, uuid, access_token, refresh_token, expires_at, skin_url, avatar_url, littleskin_server_url, littleskin_access_token) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            &[&account.id as &dyn rusqlite::types::ToSql, &account.account_type, &account.username, &account.uuid, &account.access_token, &account.refresh_token, &account.expires_at, &account.skin_url, &account.avatar_url, &account.littleskin_server_url, &account.littleskin_access_token]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM accounts WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }

    pub fn update_tokens(&self, id: &str, access_token: Option<&str>, refresh_token: Option<&str>, expires_at: Option<u64>) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "UPDATE accounts SET access_token = ?1, refresh_token = ?2, expires_at = ?3, updated_at = datetime('now') WHERE id = ?4",
            &[&access_token as &dyn rusqlite::types::ToSql, &refresh_token, &expires_at, &id]
        ))?;
        Ok(())
    }
}

pub struct SettingsRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl SettingsRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get(&self) -> Result<LauncherSettings, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare("SELECT key, value FROM settings"))?;
        let rows = db_op!(stmt, stmt.query_map([], |row| {
            let key: String = row.get(0)?;
            let value: String = row.get(1)?;
            Ok((key, value))
        }))?;

        let mut map = std::collections::HashMap::new();
        for row in rows {
            let (k, v) = db_op!(row, row)?;
            map.insert(k, v);
        }

        Ok(LauncherSettings {
            game_dir: map.get("game_dir").cloned().unwrap_or_default(),
            java_path: map.get("java_path").cloned().unwrap_or_default(),
            max_memory: map.get("max_memory").and_then(|v| v.parse().ok()).unwrap_or(4096),
            min_memory: map.get("min_memory").and_then(|v| v.parse().ok()).unwrap_or(512),
            window_width: map.get("window_width").and_then(|v| v.parse().ok()).unwrap_or(1280),
            window_height: map.get("window_height").and_then(|v| v.parse().ok()).unwrap_or(720),
            fullscreen: map.get("fullscreen").and_then(|v| v.parse().ok()).unwrap_or(false),
            launch_server: map.get("launch_server").cloned().unwrap_or_default(),
            close_after_launch: map.get("close_after_launch").and_then(|v| v.parse().ok()).unwrap_or(false),
            setup_completed: map.get("setup_completed").and_then(|v| v.parse().ok()).unwrap_or(false),
            download_source: map.get("download_source").cloned().unwrap_or_else(|| "auto".to_string()),
            region: map.get("region").cloned().unwrap_or_default(),
            last_update_check: map.get("last_update_check").and_then(|v| v.parse().ok()).unwrap_or(0),
            update_channel: map.get("update_channel").cloned().unwrap_or_else(|| "stable".to_string()),
            theme: map.get("theme").cloned().unwrap_or_else(|| "system".to_string()),
            theme_preset: map.get("theme_preset").cloned().unwrap_or_else(|| "minecraft".to_string()),
            custom_accent: map.get("custom_accent").cloned().unwrap_or_default(),
            language: map.get("language").cloned().unwrap_or_else(|| "zh-CN".to_string()),
            background_variant: map.get("background_variant").cloned().unwrap_or_else(|| "mesh".to_string()),
            background_intensity: map.get("background_intensity").cloned().unwrap_or_else(|| "subtle".to_string()),
            sound_enabled: map.get("sound_enabled").and_then(|v| v.parse().ok()).unwrap_or(true),
            sound_volume: map.get("sound_volume").and_then(|v| v.parse().ok()).unwrap_or(0.5),
            reduce_motion: map.get("reduce_motion").and_then(|v| v.parse().ok()).unwrap_or(false),
            high_contrast: map.get("high_contrast").and_then(|v| v.parse().ok()).unwrap_or(false),
            large_text: map.get("large_text").and_then(|v| v.parse().ok()).unwrap_or(false),
            launch_animation_style: map.get("launch_animation_style").cloned().unwrap_or_else(|| "default".to_string()),
            window_position: map.get("window_position").cloned().unwrap_or_else(|| "center".to_string()),
            skip_pre_check: map.get("skip_pre_check").and_then(|v| v.parse().ok()).unwrap_or(true),
            overlay_enabled: map.get("overlay_enabled").and_then(|v| v.parse().ok()).unwrap_or(true),
            overlay_opacity: map.get("overlay_opacity").and_then(|v| v.parse().ok()).unwrap_or(0.85),
            overlay_position: map.get("overlay_position").cloned().unwrap_or_else(|| "top-right".to_string()),
        })
    }

    pub fn save(&self, settings: &LauncherSettings) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let pairs: Vec<(&str, String)> = vec![
            ("game_dir", settings.game_dir.clone()),
            ("java_path", settings.java_path.clone()),
            ("max_memory", settings.max_memory.to_string()),
            ("min_memory", settings.min_memory.to_string()),
            ("window_width", settings.window_width.to_string()),
            ("window_height", settings.window_height.to_string()),
            ("fullscreen", settings.fullscreen.to_string()),
            ("launch_server", settings.launch_server.clone()),
            ("close_after_launch", settings.close_after_launch.to_string()),
            ("setup_completed", settings.setup_completed.to_string()),
            ("download_source", settings.download_source.clone()),
            ("region", settings.region.clone()),
            ("last_update_check", settings.last_update_check.to_string()),
            ("update_channel", settings.update_channel.clone()),
            ("theme", settings.theme.clone()),
            ("theme_preset", settings.theme_preset.clone()),
            ("custom_accent", settings.custom_accent.clone()),
            ("language", settings.language.clone()),
            ("background_variant", settings.background_variant.clone()),
            ("background_intensity", settings.background_intensity.clone()),
            ("sound_enabled", settings.sound_enabled.to_string()),
            ("sound_volume", settings.sound_volume.to_string()),
            ("reduce_motion", settings.reduce_motion.to_string()),
            ("high_contrast", settings.high_contrast.to_string()),
            ("large_text", settings.large_text.to_string()),
            ("launch_animation_style", settings.launch_animation_style.clone()),
            ("window_position", settings.window_position.clone()),
            ("skip_pre_check", settings.skip_pre_check.to_string()),
            ("overlay_enabled", settings.overlay_enabled.to_string()),
            ("overlay_opacity", settings.overlay_opacity.to_string()),
            ("overlay_position", settings.overlay_position.clone()),
        ];

        db_op!(conn, conn.connection().execute_batch("BEGIN TRANSACTION;"))?;
        for (key, value) in &pairs {
            db_op!(conn, conn.execute_params(
                "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
                &[key as &dyn rusqlite::types::ToSql, value]
            ))?;
        }
        db_op!(conn, conn.connection().execute_batch("COMMIT;"))?;
        Ok(())
    }

    pub fn get_key(&self, key: &str) -> Result<Option<String>, AppError> {
        let mut conn = self.conn.lock();
        let result = db_op!(conn, conn.query_row(
            "SELECT value FROM settings WHERE key = ?1",
            &[&key],
            |row| row.get(0),
        ));
        match result {
            Ok(v) => Ok(Some(v)),
            Err(_) => Ok(None),
        }
    }

    pub fn set_key(&self, key: &str, value: &str) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
            &[&key as &dyn rusqlite::types::ToSql, &value]
        ))?;
        Ok(())
    }
}

pub struct InstanceRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl InstanceRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<VersionInstance>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings FROM instances ORDER BY created_at"
        ))?;

        let rows = db_op!(stmt, stmt.query_map([], |row| {
            let jvm_args_str: String = row.get(16)?;
            let jvm_args: Vec<String> = serde_json::from_str(&jvm_args_str).unwrap_or_default();
            Ok(VersionInstance {
                id: row.get(0)?,
                name: row.get(1)?,
                game_version: row.get(2)?,
                mod_loader: row.get(3)?,
                mod_loader_version: row.get(4)?,
                created_at: row.get(5)?,
                last_played_at: row.get(6)?,
                total_time: row.get(7)?,
                icon_url: row.get(8)?,
                instance_dir: row.get(9)?,
                settings: InstanceSettings {
                    java_path: row.get(10)?,
                    max_memory: row.get(11)?,
                    min_memory: row.get(12)?,
                    window_width: row.get(13)?,
                    window_height: row.get(14)?,
                    fullscreen: row.get(15)?,
                    jvm_args,
                    game_dir: row.get(17)?,
                    launch_server: row.get(18)?,
                    close_after_launch: row.get(19)?,
                    use_instance_settings: row.get(20)?,
                },
                shader_packs: Vec::new(),
            })
        }))?;

        let mut instances = Vec::new();
        for row in rows {
            instances.push(db_op!(row, row)?);
        }
        drop(stmt);

        for instance in &mut instances {
            instance.shader_packs = self.get_shader_packs_locked(&mut conn, &instance.id)?;
        }
        Ok(instances)
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<VersionInstance>, AppError> {
        let mut conn = self.conn.lock();
        let result = db_op!(conn, conn.query_row(
            "SELECT id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings FROM instances WHERE id = ?1",
            &[&id],
            |row| {
                let jvm_args_str: String = row.get(16)?;
                let jvm_args: Vec<String> = serde_json::from_str(&jvm_args_str).unwrap_or_default();
                Ok(VersionInstance {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    game_version: row.get(2)?,
                    mod_loader: row.get(3)?,
                    mod_loader_version: row.get(4)?,
                    created_at: row.get(5)?,
                    last_played_at: row.get(6)?,
                    total_time: row.get(7)?,
                    icon_url: row.get(8)?,
                    instance_dir: row.get(9)?,
                    settings: InstanceSettings {
                        java_path: row.get(10)?,
                        max_memory: row.get(11)?,
                        min_memory: row.get(12)?,
                        window_width: row.get(13)?,
                        window_height: row.get(14)?,
                        fullscreen: row.get(15)?,
                        jvm_args,
                        game_dir: row.get(17)?,
                        launch_server: row.get(18)?,
                        close_after_launch: row.get(19)?,
                        use_instance_settings: row.get(20)?,
                    },
                    shader_packs: Vec::new(),
                })
            }
        ));
        match result {
            Ok(mut instance) => {
                instance.shader_packs = self.get_shader_packs_locked(&mut conn, id)?;
                Ok(Some(instance))
            }
            Err(_) => Ok(None),
        }
    }

    fn get_shader_packs_locked(&self, conn: &mut DatabaseConnection, instance_id: &str) -> Result<Vec<ShaderPack>, AppError> {
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, name, file_name, file_path, file_size, is_enabled, priority, added_at, description, preview_url, source FROM instance_shader_packs WHERE instance_id = ?1 ORDER BY priority"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([&instance_id], |row| {
            let is_enabled: i32 = row.get(5)?;
            Ok(ShaderPack {
                id: row.get(0)?,
                name: row.get(1)?,
                file_name: row.get(2)?,
                file_path: row.get(3)?,
                file_size: row.get(4)?,
                is_enabled: is_enabled != 0,
                priority: row.get(6)?,
                added_at: row.get(7)?,
                description: row.get(8)?,
                preview_url: row.get(9)?,
                source: row.get(10)?,
            })
        }))?;
        let mut packs = Vec::new();
        for row in rows {
            packs.push(db_op!(row, row)?);
        }
        Ok(packs)
    }

    pub fn insert(&self, instance: &VersionInstance) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let jvm_args = serde_json::to_string(&instance.settings.jvm_args).unwrap_or_else(|_| "[]".to_string());
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO instances (id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
            &[&instance.id as &dyn rusqlite::types::ToSql, &instance.name, &instance.game_version, &instance.mod_loader, &instance.mod_loader_version, &instance.created_at, &instance.last_played_at, &instance.total_time, &instance.icon_url, &instance.instance_dir, &instance.settings.java_path, &instance.settings.max_memory, &instance.settings.min_memory, &instance.settings.window_width, &instance.settings.window_height, &instance.settings.fullscreen, &jvm_args, &instance.settings.game_dir, &instance.settings.launch_server, &instance.settings.close_after_launch, &instance.settings.use_instance_settings]
        ))?;

        for pack in &instance.shader_packs {
            let is_enabled = if pack.is_enabled { 1 } else { 0 };
            db_op!(conn, conn.execute_params(
                "INSERT OR REPLACE INTO instance_shader_packs (id, instance_id, name, file_name, file_path, file_size, is_enabled, priority, added_at, description, preview_url, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
                &[&pack.id as &dyn rusqlite::types::ToSql, &instance.id, &pack.name, &pack.file_name, &pack.file_path, &pack.file_size, &is_enabled, &pack.priority, &pack.added_at, &pack.description, &pack.preview_url, &pack.source]
            ))?;
        }
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM instances WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }

    pub fn update(&self, id: &str, updates: &serde_json::Value) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let mut set_clauses = Vec::new();
        let mut params: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
        let mut idx = 1;

        if let Some(name) = updates.get("name").and_then(|v| v.as_str()) {
            set_clauses.push(format!("name = ?{}", idx));
            params.push(Box::new(name.to_string()));
            idx += 1;
        }
        if let Some(gv) = updates.get("gameVersion").and_then(|v| v.as_str()) {
            set_clauses.push(format!("game_version = ?{}", idx));
            params.push(Box::new(gv.to_string()));
            idx += 1;
        }
        if let Some(ml) = updates.get("modLoader").and_then(|v| v.as_str()) {
            set_clauses.push(format!("mod_loader = ?{}", idx));
            params.push(Box::new(ml.to_string()));
            idx += 1;
        }
        if let Some(mlv) = updates.get("modLoaderVersion").and_then(|v| v.as_str()) {
            set_clauses.push(format!("mod_loader_version = ?{}", idx));
            params.push(Box::new(mlv.to_string()));
            idx += 1;
        }
        if let Some(icon) = updates.get("iconUrl").and_then(|v| v.as_str()) {
            set_clauses.push(format!("icon_url = ?{}", idx));
            params.push(Box::new(icon.to_string()));
            idx += 1;
        }

        if set_clauses.is_empty() {
            return Ok(());
        }

        set_clauses.push("updated_at = datetime('now')".to_string());
        params.push(Box::new(id.to_string()));

        let sql = format!("UPDATE instances SET {} WHERE id = ?{}", set_clauses.join(", "), idx);
        let param_refs: Vec<&dyn rusqlite::types::ToSql> = params.iter().map(|p| p.as_ref()).collect();
        db_op!(conn, conn.execute_params(&sql, &param_refs))?;
        Ok(())
    }

    pub fn update_play_time(&self, id: &str, additional_seconds: u64) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "UPDATE instances SET total_time = total_time + ?1, last_played_at = datetime('now'), updated_at = datetime('now') WHERE id = ?2",
            &[&additional_seconds as &dyn rusqlite::types::ToSql, &id]
        ))?;
        Ok(())
    }

    pub fn get_by_version(&self, game_version: &str) -> Result<Option<VersionInstance>, AppError> {
        let mut conn = self.conn.lock();
        let result = db_op!(conn, conn.query_row(
            "SELECT id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings FROM instances WHERE game_version = ?1",
            &[&game_version],
            |row| {
                let jvm_args_str: String = row.get(16)?;
                let jvm_args: Vec<String> = serde_json::from_str(&jvm_args_str).unwrap_or_default();
                Ok(VersionInstance {
                    id: row.get(0)?,
                    name: row.get(1)?,
                    game_version: row.get(2)?,
                    mod_loader: row.get(3)?,
                    mod_loader_version: row.get(4)?,
                    created_at: row.get(5)?,
                    last_played_at: row.get(6)?,
                    total_time: row.get(7)?,
                    icon_url: row.get(8)?,
                    instance_dir: row.get(9)?,
                    settings: InstanceSettings {
                        java_path: row.get(10)?,
                        max_memory: row.get(11)?,
                        min_memory: row.get(12)?,
                        window_width: row.get(13)?,
                        window_height: row.get(14)?,
                        fullscreen: row.get(15)?,
                        jvm_args,
                        game_dir: row.get(17)?,
                        launch_server: row.get(18)?,
                        close_after_launch: row.get(19)?,
                        use_instance_settings: row.get(20)?,
                    },
                    shader_packs: Vec::new(),
                })
            }
        ));
        match result {
            Ok(mut instance) => {
                instance.shader_packs = self.get_shader_packs_locked(&mut conn, &instance.id)?;
                Ok(Some(instance))
            }
            Err(_) => Ok(None),
        }
    }
}

pub struct InstalledVersionRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl InstalledVersionRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<InstalledVersion>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, version_type, installed_at, path, mod_loader, mod_loader_version FROM installed_versions ORDER BY installed_at"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([], |row| {
            Ok(InstalledVersion {
                id: row.get(0)?,
                version_type: row.get(1)?,
                installed_at: row.get(2)?,
                path: row.get(3)?,
                mod_loader: row.get(4)?,
                mod_loader_version: row.get(5)?,
            })
        }))?;
        let mut versions = Vec::new();
        for row in rows {
            versions.push(db_op!(row, row)?);
        }
        Ok(versions)
    }

    pub fn get_by_id(&self, id: &str) -> Result<Option<InstalledVersion>, AppError> {
        let mut conn = self.conn.lock();
        let result = db_op!(conn, conn.query_row(
            "SELECT id, version_type, installed_at, path, mod_loader, mod_loader_version FROM installed_versions WHERE id = ?1",
            &[&id],
            |row| {
                Ok(InstalledVersion {
                    id: row.get(0)?,
                    version_type: row.get(1)?,
                    installed_at: row.get(2)?,
                    path: row.get(3)?,
                    mod_loader: row.get(4)?,
                    mod_loader_version: row.get(5)?,
                })
            }
        ));
        match result {
            Ok(v) => Ok(Some(v)),
            Err(_) => Ok(None),
        }
    }

    pub fn upsert(&self, version: &InstalledVersion) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO installed_versions (id, version_type, installed_at, path, mod_loader, mod_loader_version, updated_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, datetime('now'))",
            &[&version.id as &dyn rusqlite::types::ToSql, &version.version_type, &version.installed_at, &version.path, &version.mod_loader, &version.mod_loader_version]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM installed_versions WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }
}

pub struct ServerRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl ServerRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<ServerEntry>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, name, address, port, icon, group_id, tags, added_at, last_played_at, play_count, favorite, notes, icon_url, last_ping_online, last_ping_latency_ms, last_ping_players_online, last_ping_players_max, last_ping_version, last_ping_description, last_ping_protocol, last_ping_player_list, last_ping_icon_b64, last_ping_mod_type, last_ping_mod_list, last_ping_resource_pack_url, last_ping_resource_pack_hash FROM servers ORDER BY name"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([], |row| {
            let tags_str: String = row.get(6)?;
            let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
            let player_list_str: Option<String> = row.get(20)?;
            let player_list: Option<Vec<String>> = player_list_str.as_ref().and_then(|s| serde_json::from_str(s).ok());
            let mod_list_str: Option<String> = row.get(23)?;
            let mod_list: Option<Vec<String>> = mod_list_str.as_ref().and_then(|s| serde_json::from_str(s).ok());
            let last_ping_online: Option<i32> = row.get(13)?;
            let last_ping = if last_ping_online.is_some() {
                Some(ServerPingResult {
                    online: last_ping_online.unwrap_or(0) != 0,
                    latency_ms: row.get(14).unwrap_or(0),
                    players_online: row.get(15).unwrap_or(None),
                    players_max: row.get(16).unwrap_or(None),
                    version: row.get(17).unwrap_or(None),
                    description: row.get(18).unwrap_or(None),
                    protocol: row.get(19).unwrap_or(None),
                    player_list,
                    icon_b64: row.get(21).unwrap_or(None),
                    mod_info: None,
                    resource_pack_url: row.get(24).unwrap_or(None),
                    resource_pack_hash: row.get(25).unwrap_or(None),
                })
            } else {
                None
            };
            Ok(ServerEntry {
                id: row.get(0)?,
                name: row.get(1)?,
                address: row.get(2)?,
                port: row.get(3)?,
                icon: row.get(4)?,
                group_id: row.get(5)?,
                tags,
                added_at: row.get(7)?,
                last_played_at: row.get(8)?,
                play_count: row.get(9)?,
                favorite: row.get(10).unwrap_or(false),
                notes: row.get(11)?,
                icon_url: row.get(12)?,
                last_ping,
            })
        }))?;
        let mut servers = Vec::new();
        for row in rows {
            servers.push(db_op!(row, row)?);
        }
        Ok(servers)
    }

    pub fn insert(&self, server: &ServerEntry) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let tags = serde_json::to_string(&server.tags).unwrap_or_else(|_| "[]".to_string());
        let favorite = if server.favorite { 1 } else { 0 };
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO servers (id, name, address, port, icon, group_id, tags, added_at, last_played_at, play_count, favorite, notes, icon_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
            &[&server.id as &dyn rusqlite::types::ToSql, &server.name, &server.address, &server.port, &server.icon, &server.group_id, &tags, &server.added_at, &server.last_played_at, &server.play_count, &favorite, &server.notes, &server.icon_url]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM servers WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }

    pub fn update_ping(&self, id: &str, ping: &ServerPingResult) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let online = if ping.online { 1 } else { 0 };
        let player_list = serde_json::to_string(&ping.player_list).unwrap_or_default();
        db_op!(conn, conn.execute_params(
            "UPDATE servers SET last_ping_online = ?1, last_ping_latency_ms = ?2, last_ping_players_online = ?3, last_ping_players_max = ?4, last_ping_version = ?5, last_ping_description = ?6, last_ping_protocol = ?7, last_ping_player_list = ?8, last_ping_icon_b64 = ?9, updated_at = datetime('now') WHERE id = ?10",
            &[&online as &dyn rusqlite::types::ToSql, &ping.latency_ms, &ping.players_online, &ping.players_max, &ping.version, &ping.description, &ping.protocol, &player_list, &ping.icon_b64, &id]
        ))?;
        Ok(())
    }
}

pub struct ServerGroupRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl ServerGroupRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_all(&self) -> Result<Vec<ServerGroup>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, name, color, icon, sort_order, collapsed FROM server_groups ORDER BY sort_order"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([], |row| {
            let collapsed: i32 = row.get(5)?;
            Ok(ServerGroup {
                id: row.get(0)?,
                name: row.get(1)?,
                color: row.get(2)?,
                icon: row.get(3)?,
                sort_order: row.get(4)?,
                collapsed: collapsed != 0,
            })
        }))?;
        let mut groups = Vec::new();
        for row in rows {
            groups.push(db_op!(row, row)?);
        }
        Ok(groups)
    }

    pub fn insert(&self, group: &ServerGroup) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let collapsed = if group.collapsed { 1 } else { 0 };
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO server_groups (id, name, color, icon, sort_order, collapsed) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
            &[&group.id as &dyn rusqlite::types::ToSql, &group.name, &group.color, &group.icon, &group.sort_order, &collapsed]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM server_groups WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }
}

pub struct WorldBackupRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl WorldBackupRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_by_world(&self, world_name: &str) -> Result<Vec<WorldBackup>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, world_name, world_path, backup_path, backup_date, size, description FROM world_backups WHERE world_name = ?1 ORDER BY backup_date DESC"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([&world_name], |row| {
            Ok(WorldBackup {
                id: row.get(0)?,
                world_name: row.get(1)?,
                world_path: row.get(2)?,
                backup_path: row.get(3)?,
                backup_date: row.get(4)?,
                size: row.get(5)?,
                description: row.get(6)?,
            })
        }))?;
        let mut backups = Vec::new();
        for row in rows {
            backups.push(db_op!(row, row)?);
        }
        Ok(backups)
    }

    pub fn insert(&self, backup: &WorldBackup) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO world_backups (id, world_name, world_path, backup_path, backup_date, size, description) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            &[&backup.id as &dyn rusqlite::types::ToSql, &backup.world_name, &backup.world_path, &backup.backup_path, &backup.backup_date, &backup.size, &backup.description]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM world_backups WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }
}

pub struct LaunchRecordRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl LaunchRecordRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn insert(&self, session: &LaunchSession) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let status_str = match session.status {
            LaunchSessionStatus::Preparing => "preparing",
            LaunchSessionStatus::Launching => "launching",
            LaunchSessionStatus::Running => "running",
            LaunchSessionStatus::Exited => "exited",
            LaunchSessionStatus::Crashed => "crashed",
        };
        let phase_durations = serde_json::to_string(
            &session.phases.iter().filter_map(|p| {
                p.duration_ms.map(|d| (p.id.id_str().to_string(), d))
            }).collect::<std::collections::HashMap<String, u64>>()
        ).unwrap_or_default();

        let total_duration_ms: Option<u64> = session.completed_at.map(|c| {
            ((c - session.start_time) as u64 / 1_000_000).max(0)
        });

        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO launch_records (id, version, account_name, instance_id, start_time, status, pid, exit_code, completed_at, total_duration_ms, phase_durations) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
            &[&session.id as &dyn rusqlite::types::ToSql, &session.version, &session.account_name, &session.instance_id, &session.start_time, &status_str, &session.pid, &session.exit_code, &session.completed_at, &total_duration_ms, &phase_durations]
        ))?;

        for log in &session.logs {
            let diag_rule: Option<String> = log.diagnosis.as_ref().map(|d| d.rule_id.clone());
            let diag_title: Option<String> = log.diagnosis.as_ref().map(|d| d.title.clone());
            let diag_desc: Option<String> = log.diagnosis.as_ref().map(|d| d.description.clone());
            let diag_sol: Option<String> = log.diagnosis.as_ref().map(|d| d.solution.clone());
            let diag_sev: Option<String> = log.diagnosis.as_ref().map(|d| format!("{:?}", d.severity));
            db_op!(conn, conn.execute_params(
                "INSERT INTO launch_logs (launch_id, log_type, message, phase_id, timestamp, diagnosis_rule_id, diagnosis_title, diagnosis_description, diagnosis_solution, diagnosis_severity) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)",
                &[&session.id as &dyn rusqlite::types::ToSql, &log.log_type, &log.message, &log.phase_id, &log.timestamp, &diag_rule, &diag_title, &diag_desc, &diag_sol, &diag_sev]
            ))?;
        }
        Ok(())
    }

    pub fn update_status(&self, id: &str, status: &LaunchSessionStatus, pid: Option<u32>, exit_code: Option<i32>, completed_at: Option<i64>) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let status_str = match status {
            LaunchSessionStatus::Preparing => "preparing",
            LaunchSessionStatus::Launching => "launching",
            LaunchSessionStatus::Running => "running",
            LaunchSessionStatus::Exited => "exited",
            LaunchSessionStatus::Crashed => "crashed",
        };
        db_op!(conn, conn.execute_params(
            "UPDATE launch_records SET status = ?1, pid = ?2, exit_code = ?3, completed_at = ?4 WHERE id = ?5",
            &[&status_str as &dyn rusqlite::types::ToSql, &pid, &exit_code, &completed_at, &id]
        ))?;
        Ok(())
    }

    pub fn get_recent(&self, limit: usize) -> Result<Vec<LaunchSession>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, version, account_name, instance_id, start_time, status, pid, exit_code, completed_at, total_duration_ms, phase_durations FROM launch_records ORDER BY start_time DESC LIMIT ?1"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([&limit as &dyn rusqlite::types::ToSql], |row| {
            let status_str: String = row.get(5)?;
            let status = match status_str.as_str() {
                "preparing" => LaunchSessionStatus::Preparing,
                "launching" => LaunchSessionStatus::Launching,
                "running" => LaunchSessionStatus::Running,
                "exited" => LaunchSessionStatus::Exited,
                "crashed" => LaunchSessionStatus::Crashed,
                _ => LaunchSessionStatus::Preparing,
            };
            Ok(LaunchSession {
                id: row.get(0)?,
                version: row.get(1)?,
                account_name: row.get(2)?,
                instance_id: row.get(3)?,
                start_time: row.get(4)?,
                status,
                pid: row.get(6)?,
                exit_code: row.get(7)?,
                completed_at: row.get(8)?,
                phases: Vec::new(),
                logs: Vec::new(),
            })
        }))?;
        let mut records = Vec::new();
        for row in rows {
            records.push(db_op!(row, row)?);
        }
        Ok(records)
    }
}

pub struct CrashReportRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl CrashReportRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn insert(&self, report: &crate::models::launch::CrashReport) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let mod_list = serde_json::to_string(&report.mod_list).unwrap_or_default();
        let jvm_args = serde_json::to_string(&report.jvm_args).unwrap_or_default();
        let (diag_cat, diag_title, diag_desc, diag_conf) = if let Some(ref d) = report.diagnosis {
            (Some(d.category.clone()), Some(d.title.clone()), Some(d.description.clone()), Some(d.confidence))
        } else {
            (None, None, None, None)
        };
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO crash_reports (id, timestamp, version, instance_id, exit_code, stack_trace, os, os_version, java_version, total_memory_mb, cpu_model, gpu_info, disk_free_gb, process_count, mod_list, jvm_args, diagnosis_category, diagnosis_title, diagnosis_description, diagnosis_confidence, raw_log) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
            &[&report.id as &dyn rusqlite::types::ToSql, &report.timestamp, &report.version, &report.instance_id, &report.exit_code, &report.stack_trace, &report.system_info.os, &report.system_info.os_version, &report.system_info.java_version, &report.system_info.total_memory_mb, &report.system_info.cpu_model, &report.system_info.gpu_info, &report.system_info.disk_free_gb, &report.system_info.process_count, &mod_list, &jvm_args, &diag_cat, &diag_title, &diag_desc, &diag_conf, &report.raw_log]
        ))?;
        Ok(())
    }

    pub fn get_recent(&self, limit: usize) -> Result<Vec<crate::models::launch::CrashReport>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, timestamp, version, instance_id, exit_code, stack_trace, os, os_version, java_version, total_memory_mb, cpu_model, gpu_info, disk_free_gb, process_count, mod_list, jvm_args, diagnosis_category, diagnosis_title, diagnosis_description, diagnosis_confidence, raw_log FROM crash_reports ORDER BY timestamp DESC LIMIT ?1"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([&limit as &dyn rusqlite::types::ToSql], |row| {
            let mod_list_str: String = row.get(14)?;
            let mod_list: Vec<String> = serde_json::from_str(&mod_list_str).unwrap_or_default();
            let jvm_args_str: String = row.get(15)?;
            let jvm_args: Vec<String> = serde_json::from_str(&jvm_args_str).unwrap_or_default();
            Ok(crate::models::launch::CrashReport {
                id: row.get(0)?,
                timestamp: row.get(1)?,
                version: row.get(2)?,
                instance_id: row.get(3)?,
                exit_code: row.get(4)?,
                stack_trace: row.get(5)?,
                system_info: crate::models::launch::CrashSystemInfo {
                    os: row.get(6)?,
                    os_version: row.get(7)?,
                    java_version: row.get(8)?,
                    total_memory_mb: row.get(9)?,
                    cpu_model: row.get(10)?,
                    gpu_info: row.get(11)?,
                    disk_free_gb: row.get(12)?,
                    process_count: row.get(13)?,
                },
                mod_list,
                jvm_args,
                diagnosis: None,
                raw_log: row.get(20)?,
            })
        }))?;
        let mut reports = Vec::new();
        for row in rows {
            reports.push(db_op!(row, row)?);
        }
        Ok(reports)
    }
}

pub struct LocalModRepository {
    conn: Arc<Mutex<DatabaseConnection>>,
}

impl LocalModRepository {
    pub fn new(conn: Arc<Mutex<DatabaseConnection>>) -> Self {
        Self { conn }
    }

    pub fn get_by_instance(&self, instance_id: &str) -> Result<Vec<crate::models::mod_info::LocalMod>, AppError> {
        let mut conn = self.conn.lock();
        let mut stmt = db_op!(conn, conn.prepare(
            "SELECT id, name, file_name, file_path, file_size, is_enabled, description, version, game_versions, mod_loader, mod_id, sha256, icon_url, install_date, config_path, source, source_id, metadata_json FROM local_mods WHERE instance_id = ?1 ORDER BY name"
        ))?;
        let rows = db_op!(stmt, stmt.query_map([&instance_id], |row| {
            let is_enabled: i32 = row.get(5)?;
            let game_versions_str: Option<String> = row.get(8)?;
            let game_versions: Option<Vec<String>> = game_versions_str.as_ref().and_then(|s| serde_json::from_str(s).ok());
            let metadata_str: Option<String> = row.get(17)?;
            let metadata: Option<crate::models::mod_info::ModJarMetadata> = metadata_str.as_ref().and_then(|s| serde_json::from_str(s).ok());
            Ok(crate::models::mod_info::LocalMod {
                id: row.get(0)?,
                name: row.get(1)?,
                file_name: row.get(2)?,
                file_path: row.get(3)?,
                file_size: row.get(4)?,
                is_enabled: is_enabled != 0,
                description: row.get(6)?,
                version: row.get(7)?,
                game_versions,
                mod_loader: row.get(9)?,
                mod_id: row.get(10)?,
                sha256: row.get(11)?,
                icon_url: row.get(12)?,
                install_date: row.get(13)?,
                config_path: row.get(14)?,
                source: row.get(15)?,
                source_id: row.get(16)?,
                metadata,
            })
        }))?;
        let mut mods = Vec::new();
        for row in rows {
            mods.push(db_op!(row, row)?);
        }
        Ok(mods)
    }

    pub fn insert(&self, mod_entry: &crate::models::mod_info::LocalMod, instance_id: &str) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let is_enabled = if mod_entry.is_enabled { 1 } else { 0 };
        let game_versions = mod_entry.game_versions.as_ref().map(|v| serde_json::to_string(v).unwrap_or_default());
        let metadata = mod_entry.metadata.as_ref().map(|m| serde_json::to_string(m).unwrap_or_default());
        db_op!(conn, conn.execute_params(
            "INSERT OR REPLACE INTO local_mods (id, instance_id, name, file_name, file_path, file_size, is_enabled, description, version, game_versions, mod_loader, mod_id, sha256, icon_url, install_date, config_path, source, source_id, metadata_json) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19)",
            &[&mod_entry.id as &dyn rusqlite::types::ToSql, &instance_id, &mod_entry.name, &mod_entry.file_name, &mod_entry.file_path, &mod_entry.file_size, &is_enabled, &mod_entry.description, &mod_entry.version, &game_versions, &mod_entry.mod_loader, &mod_entry.mod_id, &mod_entry.sha256, &mod_entry.icon_url, &mod_entry.install_date, &mod_entry.config_path, &mod_entry.source, &mod_entry.source_id, &metadata]
        ))?;
        Ok(())
    }

    pub fn toggle(&self, id: &str, enabled: bool) -> Result<(), AppError> {
        let mut conn = self.conn.lock();
        let is_enabled = if enabled { 1 } else { 0 };
        db_op!(conn, conn.execute_params(
            "UPDATE local_mods SET is_enabled = ?1, updated_at = datetime('now') WHERE id = ?2",
            &[&is_enabled as &dyn rusqlite::types::ToSql, &id]
        ))?;
        Ok(())
    }

    pub fn delete(&self, id: &str) -> Result<bool, AppError> {
        let mut conn = self.conn.lock();
        let rows = db_op!(conn, conn.execute_params("DELETE FROM local_mods WHERE id = ?1", &[&id]))?;
        Ok(rows > 0)
    }
}

pub fn import_account(conn: &mut DatabaseConnection, account: &Account) -> Result<(), AppError> {
    conn.execute_params(
        "INSERT OR IGNORE INTO accounts (id, account_type, username, uuid, access_token, refresh_token, expires_at, skin_url, avatar_url, littleskin_server_url, littleskin_access_token) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)",
        &[&account.id as &dyn rusqlite::types::ToSql, &account.account_type, &account.username, &account.uuid, &account.access_token, &account.refresh_token, &account.expires_at, &account.skin_url, &account.avatar_url, &account.littleskin_server_url, &account.littleskin_access_token]
    )?;
    Ok(())
}

pub fn import_settings(conn: &mut DatabaseConnection, settings: &LauncherSettings) -> Result<(), AppError> {
    let pairs: Vec<(&str, String)> = vec![
        ("game_dir", settings.game_dir.clone()),
        ("java_path", settings.java_path.clone()),
        ("max_memory", settings.max_memory.to_string()),
        ("min_memory", settings.min_memory.to_string()),
        ("window_width", settings.window_width.to_string()),
        ("window_height", settings.window_height.to_string()),
        ("fullscreen", settings.fullscreen.to_string()),
        ("launch_server", settings.launch_server.clone()),
        ("close_after_launch", settings.close_after_launch.to_string()),
        ("setup_completed", settings.setup_completed.to_string()),
        ("download_source", settings.download_source.clone()),
        ("region", settings.region.clone()),
        ("last_update_check", settings.last_update_check.to_string()),
        ("update_channel", settings.update_channel.clone()),
        ("theme", settings.theme.clone()),
        ("theme_preset", settings.theme_preset.clone()),
        ("custom_accent", settings.custom_accent.clone()),
        ("language", settings.language.clone()),
        ("background_variant", settings.background_variant.clone()),
        ("background_intensity", settings.background_intensity.clone()),
        ("sound_enabled", settings.sound_enabled.to_string()),
        ("sound_volume", settings.sound_volume.to_string()),
        ("reduce_motion", settings.reduce_motion.to_string()),
        ("high_contrast", settings.high_contrast.to_string()),
        ("large_text", settings.large_text.to_string()),
        ("launch_animation_style", settings.launch_animation_style.clone()),
        ("window_position", settings.window_position.clone()),
    ];
    for (key, value) in &pairs {
        conn.execute_params(
            "INSERT OR REPLACE INTO settings (key, value, updated_at) VALUES (?1, ?2, datetime('now'))",
            &[key as &dyn rusqlite::types::ToSql, value]
        )?;
    }
    Ok(())
}

pub fn import_instance(conn: &mut DatabaseConnection, instance: &VersionInstance) -> Result<(), AppError> {
    let jvm_args = serde_json::to_string(&instance.settings.jvm_args).unwrap_or_else(|_| "[]".to_string());
    conn.execute_params(
        "INSERT OR IGNORE INTO instances (id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14, ?15, ?16, ?17, ?18, ?19, ?20, ?21)",
        &[&instance.id as &dyn rusqlite::types::ToSql, &instance.name, &instance.game_version, &instance.mod_loader, &instance.mod_loader_version, &instance.created_at, &instance.last_played_at, &instance.total_time, &instance.icon_url, &instance.instance_dir, &instance.settings.java_path, &instance.settings.max_memory, &instance.settings.min_memory, &instance.settings.window_width, &instance.settings.window_height, &instance.settings.fullscreen, &jvm_args, &instance.settings.game_dir, &instance.settings.launch_server, &instance.settings.close_after_launch, &instance.settings.use_instance_settings]
    )?;
    for pack in &instance.shader_packs {
        let is_enabled = if pack.is_enabled { 1 } else { 0 };
        conn.execute_params(
            "INSERT OR IGNORE INTO instance_shader_packs (id, instance_id, name, file_name, file_path, file_size, is_enabled, priority, added_at, description, preview_url, source) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12)",
            &[&pack.id as &dyn rusqlite::types::ToSql, &instance.id, &pack.name, &pack.file_name, &pack.file_path, &pack.file_size, &is_enabled, &pack.priority, &pack.added_at, &pack.description, &pack.preview_url, &pack.source]
        )?;
    }
    Ok(())
}

pub fn import_installed_version(conn: &mut DatabaseConnection, version: &InstalledVersion) -> Result<(), AppError> {
    conn.execute_params(
        "INSERT OR IGNORE INTO installed_versions (id, version_type, installed_at, path, mod_loader, mod_loader_version) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        &[&version.id as &dyn rusqlite::types::ToSql, &version.version_type, &version.installed_at, &version.path, &version.mod_loader, &version.mod_loader_version]
    )?;
    Ok(())
}

pub fn import_server(conn: &mut DatabaseConnection, server: &ServerEntry) -> Result<(), AppError> {
    let tags = serde_json::to_string(&server.tags).unwrap_or_else(|_| "[]".to_string());
    let favorite = if server.favorite { 1 } else { 0 };
    conn.execute_params(
        "INSERT OR IGNORE INTO servers (id, name, address, port, icon, group_id, tags, added_at, last_played_at, play_count, favorite, notes, icon_url) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13)",
        &[&server.id as &dyn rusqlite::types::ToSql, &server.name, &server.address, &server.port, &server.icon, &server.group_id, &tags, &server.added_at, &server.last_played_at, &server.play_count, &favorite, &server.notes, &server.icon_url]
    )?;
    Ok(())
}

pub fn import_server_group(conn: &mut DatabaseConnection, group: &ServerGroup) -> Result<(), AppError> {
    let collapsed = if group.collapsed { 1 } else { 0 };
    conn.execute_params(
        "INSERT OR IGNORE INTO server_groups (id, name, color, icon, sort_order, collapsed) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        &[&group.id as &dyn rusqlite::types::ToSql, &group.name, &group.color, &group.icon, &group.sort_order, &collapsed]
    )?;
    Ok(())
}

pub fn export_accounts(conn: &mut DatabaseConnection) -> Result<Vec<Account>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, account_type, username, uuid, access_token, refresh_token, expires_at, skin_url, avatar_url, littleskin_server_url, littleskin_access_token FROM accounts ORDER BY created_at"
    ).map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        Ok(Account {
            id: row.get(0)?,
            account_type: row.get(1)?,
            username: row.get(2)?,
            uuid: row.get(3)?,
            access_token: row.get(4)?,
            refresh_token: row.get(5)?,
            expires_at: row.get(6)?,
            skin_url: row.get(7)?,
            avatar_url: row.get(8)?,
            littleskin_server_url: row.get(9)?,
            littleskin_access_token: row.get(10)?,
        })
    }).map_err(|e| errors::database_error("query", e.to_string()))?;
    let mut accounts = Vec::new();
    for row in rows {
        accounts.push(row.map_err(|e| errors::database_error("row", e.to_string()))?);
    }
    Ok(accounts)
}

pub fn export_settings(conn: &mut DatabaseConnection) -> Result<Option<LauncherSettings>, AppError> {
    let mut stmt = conn.prepare("SELECT key, value FROM settings")
        .map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        let key: String = row.get(0)?;
        let value: String = row.get(1)?;
        Ok((key, value))
    }).map_err(|e| errors::database_error("query", e.to_string()))?;

    let mut map = std::collections::HashMap::new();
    for row in rows {
        let (k, v) = row.map_err(|e| errors::database_error("row", e.to_string()))?;
        map.insert(k, v);
    }

    if map.is_empty() {
        return Ok(None);
    }

    Ok(Some(LauncherSettings {
        game_dir: map.get("game_dir").cloned().unwrap_or_default(),
        java_path: map.get("java_path").cloned().unwrap_or_default(),
        max_memory: map.get("max_memory").and_then(|v| v.parse().ok()).unwrap_or(4096),
        min_memory: map.get("min_memory").and_then(|v| v.parse().ok()).unwrap_or(512),
        window_width: map.get("window_width").and_then(|v| v.parse().ok()).unwrap_or(1280),
        window_height: map.get("window_height").and_then(|v| v.parse().ok()).unwrap_or(720),
        fullscreen: map.get("fullscreen").and_then(|v| v.parse().ok()).unwrap_or(false),
        launch_server: map.get("launch_server").cloned().unwrap_or_default(),
        close_after_launch: map.get("close_after_launch").and_then(|v| v.parse().ok()).unwrap_or(false),
        setup_completed: map.get("setup_completed").and_then(|v| v.parse().ok()).unwrap_or(false),
        download_source: map.get("download_source").cloned().unwrap_or_else(|| "auto".to_string()),
        region: map.get("region").cloned().unwrap_or_default(),
        last_update_check: map.get("last_update_check").and_then(|v| v.parse().ok()).unwrap_or(0),
        update_channel: map.get("update_channel").cloned().unwrap_or_else(|| "stable".to_string()),
        theme: map.get("theme").cloned().unwrap_or_else(|| "system".to_string()),
        theme_preset: map.get("theme_preset").cloned().unwrap_or_else(|| "minecraft".to_string()),
        custom_accent: map.get("custom_accent").cloned().unwrap_or_default(),
        language: map.get("language").cloned().unwrap_or_else(|| "zh-CN".to_string()),
        background_variant: map.get("background_variant").cloned().unwrap_or_else(|| "mesh".to_string()),
        background_intensity: map.get("background_intensity").cloned().unwrap_or_else(|| "subtle".to_string()),
        sound_enabled: map.get("sound_enabled").and_then(|v| v.parse().ok()).unwrap_or(true),
        sound_volume: map.get("sound_volume").and_then(|v| v.parse().ok()).unwrap_or(0.5),
        reduce_motion: map.get("reduce_motion").and_then(|v| v.parse().ok()).unwrap_or(false),
        high_contrast: map.get("high_contrast").and_then(|v| v.parse().ok()).unwrap_or(false),
        large_text: map.get("large_text").and_then(|v| v.parse().ok()).unwrap_or(false),
        launch_animation_style: map.get("launch_animation_style").cloned().unwrap_or_else(|| "default".to_string()),
        window_position: map.get("window_position").cloned().unwrap_or_else(|| "center".to_string()),
        skip_pre_check: map.get("skip_pre_check").and_then(|v| v.parse().ok()).unwrap_or(true),
        overlay_enabled: map.get("overlay_enabled").and_then(|v| v.parse().ok()).unwrap_or(true),
        overlay_opacity: map.get("overlay_opacity").and_then(|v| v.parse().ok()).unwrap_or(0.85),
        overlay_position: map.get("overlay_position").cloned().unwrap_or_else(|| "top-right".to_string()),
    }))
}

pub fn export_instances(conn: &mut DatabaseConnection) -> Result<Vec<VersionInstance>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, game_version, mod_loader, mod_loader_version, created_at, last_played_at, total_time, icon_url, instance_dir, java_path, max_memory, min_memory, window_width, window_height, fullscreen, jvm_args, game_dir, launch_server, close_after_launch, use_instance_settings FROM instances ORDER BY created_at"
    ).map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        let jvm_args_str: String = row.get(16)?;
        let jvm_args: Vec<String> = serde_json::from_str(&jvm_args_str).unwrap_or_default();
        Ok(VersionInstance {
            id: row.get(0)?,
            name: row.get(1)?,
            game_version: row.get(2)?,
            mod_loader: row.get(3)?,
            mod_loader_version: row.get(4)?,
            created_at: row.get(5)?,
            last_played_at: row.get(6)?,
            total_time: row.get(7)?,
            icon_url: row.get(8)?,
            instance_dir: row.get(9)?,
            settings: InstanceSettings {
                java_path: row.get(10)?,
                max_memory: row.get(11)?,
                min_memory: row.get(12)?,
                window_width: row.get(13)?,
                window_height: row.get(14)?,
                fullscreen: row.get(15)?,
                jvm_args,
                game_dir: row.get(17)?,
                launch_server: row.get(18)?,
                close_after_launch: row.get(19)?,
                use_instance_settings: row.get(20)?,
            },
            shader_packs: Vec::new(),
        })
    }).map_err(|e| errors::database_error("query", e.to_string()))?;

    let mut instances = Vec::new();
    for row in rows {
        instances.push(row.map_err(|e| errors::database_error("row", e.to_string()))?);
    }
    Ok(instances)
}

pub fn export_installed_versions(conn: &mut DatabaseConnection) -> Result<Vec<InstalledVersion>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, version_type, installed_at, path, mod_loader, mod_loader_version FROM installed_versions ORDER BY installed_at"
    ).map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        Ok(InstalledVersion {
            id: row.get(0)?,
            version_type: row.get(1)?,
            installed_at: row.get(2)?,
            path: row.get(3)?,
            mod_loader: row.get(4)?,
            mod_loader_version: row.get(5)?,
        })
    }).map_err(|e| errors::database_error("query", e.to_string()))?;
    let mut versions = Vec::new();
    for row in rows {
        versions.push(row.map_err(|e| errors::database_error("row", e.to_string()))?);
    }
    Ok(versions)
}

pub fn export_servers(conn: &mut DatabaseConnection) -> Result<Vec<ServerEntry>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, address, port, icon, group_id, tags, added_at, last_played_at, play_count, favorite, notes, icon_url FROM servers ORDER BY name"
    ).map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        let tags_str: String = row.get(6)?;
        let tags: Vec<String> = serde_json::from_str(&tags_str).unwrap_or_default();
        let favorite: i32 = row.get(10).unwrap_or(0);
        Ok(ServerEntry {
            id: row.get(0)?,
            name: row.get(1)?,
            address: row.get(2)?,
            port: row.get(3)?,
            icon: row.get(4)?,
            group_id: row.get(5)?,
            tags,
            added_at: row.get(7)?,
            last_played_at: row.get(8)?,
            play_count: row.get(9)?,
            favorite: favorite != 0,
            notes: row.get(11)?,
            icon_url: row.get(12)?,
            last_ping: None,
        })
    }).map_err(|e| errors::database_error("query", e.to_string()))?;
    let mut servers = Vec::new();
    for row in rows {
        servers.push(row.map_err(|e| errors::database_error("row", e.to_string()))?);
    }
    Ok(servers)
}

pub fn export_server_groups(conn: &mut DatabaseConnection) -> Result<Vec<ServerGroup>, AppError> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, icon, sort_order, collapsed FROM server_groups ORDER BY sort_order"
    ).map_err(|e| errors::database_error("prepare", e.to_string()))?;
    let rows = stmt.query_map([], |row| {
        let collapsed: i32 = row.get(5)?;
        Ok(ServerGroup {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            icon: row.get(3)?,
            sort_order: row.get(4)?,
            collapsed: collapsed != 0,
        })
    }).map_err(|e| errors::database_error("query", e.to_string()))?;
    let mut groups = Vec::new();
    for row in rows {
        groups.push(row.map_err(|e| errors::database_error("row", e.to_string()))?);
    }
    Ok(groups)
}
