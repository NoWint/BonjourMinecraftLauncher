use rusqlite::Connection;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::errors::{self, AppError};

pub struct DatabaseConnection {
    conn: Connection,
}

impl DatabaseConnection {
    pub fn new(db_path: &PathBuf) -> Result<Self, AppError> {
        if let Some(parent) = db_path.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| errors::dir_create_error(parent, e.to_string()))?;
        }

        let conn = Connection::open(db_path)
            .map_err(|e| errors::database_error("open", e.to_string()))?;

        conn.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=NORMAL; PRAGMA cache_size=-64000; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;")
            .map_err(|e| errors::database_error("pragma", e.to_string()))?;

        tracing::info!(path = %db_path.display(), "Database opened");

        Ok(Self { conn })
    }

    pub fn new_in_memory() -> Result<Self, AppError> {
        let conn = Connection::open_in_memory()
            .map_err(|e| errors::database_error("open_in_memory", e.to_string()))?;

        conn.execute_batch("PRAGMA journal_mode=MEMORY; PRAGMA synchronous=OFF; PRAGMA foreign_keys=ON;")
            .map_err(|e| errors::database_error("pragma", e.to_string()))?;

        Ok(Self { conn })
    }

    pub fn connection(&mut self) -> &mut Connection {
        &mut self.conn
    }

    pub fn execute(&mut self, sql: &str) -> Result<(), AppError> {
        self.conn.execute_batch(sql)
            .map_err(|e| errors::database_error("execute_batch", e.to_string()))
    }

    pub fn execute_params(&mut self, sql: &str, params: &[&dyn rusqlite::types::ToSql]) -> Result<usize, AppError> {
        self.conn.execute(sql, params)
            .map_err(|e| errors::database_error("execute", e.to_string()))
    }

    pub fn query_row<T, F>(&mut self, sql: &str, params: &[&dyn rusqlite::types::ToSql], f: F) -> Result<T, AppError>
    where
        F: FnOnce(&rusqlite::Row<'_>) -> rusqlite::Result<T>,
    {
        self.conn.query_row(sql, params, f)
            .map_err(|e| match e {
                rusqlite::Error::QueryReturnedNoRows => {
                    errors::database_error("query_row_no_rows", "No rows returned".to_string())
                }
                other => errors::database_error("query_row", other.to_string()),
            })
    }

    pub fn prepare(&mut self, sql: &str) -> Result<rusqlite::Statement<'_>, AppError> {
        self.conn.prepare(sql)
            .map_err(|e| errors::database_error("prepare", e.to_string()))
    }

    pub fn last_insert_rowid(&self) -> i64 {
        self.conn.last_insert_rowid()
    }
}

pub struct DatabasePool {
    db_path: Arc<RwLock<Option<PathBuf>>>,
}

impl DatabasePool {
    pub fn new(db_path: PathBuf) -> Self {
        DatabasePool {
            db_path: Arc::new(RwLock::new(Some(db_path))),
        }
    }

    pub fn get_connection(&self) -> Result<DatabaseConnection, AppError> {
        let path_guard = self.db_path.read();
        let path = path_guard.as_ref()
            .ok_or_else(|| errors::database_error("pool", "Database not initialized"))?;
        DatabaseConnection::new(path)
    }

    pub fn is_initialized(&self) -> bool {
        self.db_path.read().is_some()
    }
}
