use crate::errors::{self, AppError};
use std::path::{Path, PathBuf};
use sha2::{Sha256, Digest};
use sha1::Sha1;
use md5::Md5;

pub fn sha256_file_streaming(path: &Path) -> Result<String, AppError> {
    let file = std::fs::File::open(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let mut reader = std::io::BufReader::new(file);
    let mut hasher = Sha256::new();
    std::io::copy(&mut reader, &mut hasher)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

pub fn sha1_file_streaming(path: &Path) -> Result<String, AppError> {
    let file = std::fs::File::open(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let mut reader = std::io::BufReader::new(file);
    let mut hasher = Sha1::new();
    std::io::copy(&mut reader, &mut hasher)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

pub fn md5_file_streaming(path: &Path) -> Result<String, AppError> {
    let file = std::fs::File::open(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let mut reader = std::io::BufReader::new(file);
    let mut hasher = Md5::new();
    std::io::copy(&mut reader, &mut hasher)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

pub fn sha256_data(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn sha1_data(data: &[u8]) -> String {
    let mut hasher = Sha1::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn md5_data(data: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

#[tauri::command]
pub async fn compute_file_sha256(file_path: String) -> Result<String, AppError> {
    let path = PathBuf::from(&file_path);
    tauri::async_runtime::spawn_blocking(move || sha256_file_streaming(&path)).await
        .map_err(|e| errors::internal(format!("spawn_blocking failed: {}", e)))?
}

#[tauri::command]
pub async fn compute_file_sha1(file_path: String) -> Result<String, AppError> {
    let path = PathBuf::from(&file_path);
    tauri::async_runtime::spawn_blocking(move || sha1_file_streaming(&path)).await
        .map_err(|e| errors::internal(format!("spawn_blocking failed: {}", e)))?
}

#[tauri::command]
pub async fn compute_file_md5(file_path: String) -> Result<String, AppError> {
    let path = PathBuf::from(&file_path);
    tauri::async_runtime::spawn_blocking(move || md5_file_streaming(&path)).await
        .map_err(|e| errors::internal(format!("spawn_blocking failed: {}", e)))?
}

#[tauri::command]
pub fn compute_data_sha256(data: Vec<u8>) -> String {
    sha256_data(&data)
}

#[tauri::command]
pub fn compute_data_sha1(data: Vec<u8>) -> String {
    sha1_data(&data)
}

#[tauri::command]
pub fn compute_data_md5(data: Vec<u8>) -> String {
    md5_data(&data)
}
