use crate::errors::{self, AppError};
use crate::db::connection::DatabaseConnection;

const MIGRATIONS: &[(&str, &str)] = &[
    ("001_initial", include_str!("migrations/001_initial.sql")),
];

pub fn run_migrations(conn: &mut DatabaseConnection) -> Result<(), AppError> {
    conn.execute(
        "CREATE TABLE IF NOT EXISTS schema_migrations (
            version TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL DEFAULT (datetime('now'))
        );"
    )?;

    for (version, sql) in MIGRATIONS {
        let applied: bool = conn.query_row(
            "SELECT COUNT(*) > 0 FROM schema_migrations WHERE version = ?1",
            &[version],
            |row| row.get(0),
        ).unwrap_or(false);

        if !applied {
            tracing::info!(version = %version, "Applying migration");

            conn.connection().execute_batch("BEGIN TRANSACTION;").map_err(|e| {
                AppError::DatabaseMigrationError {
                    version: 0,
                    reason: format!("Failed to begin transaction: {}", e),
                    message_zh: "数据库迁移事务启动失败".to_string(),
                    message_en: "Failed to begin migration transaction".to_string(),
                    fix_action: "请重启启动器重试".to_string(),
                }
            })?;

            if let Err(e) = conn.connection().execute_batch(sql) {
                conn.connection().execute_batch("ROLLBACK;").ok();
                return Err(AppError::DatabaseMigrationError {
                    version: 0,
                    reason: format!("Migration {} failed: {}", version, e),
                    message_zh: format!("数据库迁移 {} 失败", version),
                    message_en: format!("Migration {} failed", version),
                    fix_action: "请重启启动器重试，如果问题持续请删除数据库文件重新初始化".to_string(),
                });
            }

            conn.execute_params(
                "INSERT INTO schema_migrations (version) VALUES (?1)",
                &[version],
            )?;

            conn.connection().execute_batch("COMMIT;").map_err(|e| {
                AppError::DatabaseMigrationError {
                    version: 0,
                    reason: format!("Failed to commit migration: {}", e),
                    message_zh: "数据库迁移提交失败".to_string(),
                    message_en: "Failed to commit migration".to_string(),
                    fix_action: "请重启启动器重试".to_string(),
                }
            })?;

            tracing::info!(version = %version, "Migration applied successfully");
        }
    }

    Ok(())
}

pub fn get_applied_migrations(conn: &mut DatabaseConnection) -> Result<Vec<String>, AppError> {
    let mut stmt = conn.prepare("SELECT version FROM schema_migrations ORDER BY version")?;
    let rows = stmt.query_map([], |row| row.get(0))?;
    let mut versions = Vec::new();
    for row in rows {
        versions.push(row.map_err(|e| errors::database_error("migration_row", e.to_string()))?);
    }
    Ok(versions)
}
