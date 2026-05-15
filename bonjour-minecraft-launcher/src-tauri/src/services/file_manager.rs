use std::path::Path;
use std::fs;
use serde::{de::DeserializeOwned, Serialize};
use crate::errors::{self, AppError};

pub fn ensure_dir(path: &Path) -> Result<(), AppError> {
    if !path.exists() {
        fs::create_dir_all(path).map_err(|e| errors::dir_create_error(path, e.to_string()))?;
    }
    Ok(())
}

pub fn load_json<T: DeserializeOwned>(path: &Path) -> Result<T, AppError> {
    let content = fs::read_to_string(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    serde_json::from_str(&content)
        .map_err(|e| errors::json_parse_error(format!("{}: {}", path.display(), e)))
}

pub fn save_json<T: Serialize>(path: &Path, data: &T) -> Result<(), AppError> {
    if let Some(parent) = path.parent() {
        ensure_dir(parent)?;
    }
    let content = serde_json::to_string_pretty(data)
        .map_err(|e| AppError::JsonSerializeError {
            reason: e.to_string(),
            message_zh: "数据序列化失败".to_string(),
            message_en: "Failed to serialize data".to_string(),
            fix_action: "请检查数据格式是否正确".to_string(),
        })?;
    fs::write(path, content)
        .map_err(|e| errors::file_write_error(path, e.to_string()))
}

pub fn load_json_or_default<T: DeserializeOwned + Default>(path: &Path) -> T {
    if path.exists() {
        load_json(path).unwrap_or_default()
    } else {
        T::default()
    }
}
