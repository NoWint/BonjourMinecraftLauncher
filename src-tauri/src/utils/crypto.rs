use sha2::{Sha256, Digest};
use sha1::Sha1;
use md5::Md5;
use crate::errors::{self, AppError};

pub fn sha1_file(path: &str) -> Result<String, AppError> {
    let data = std::fs::read(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    let mut hasher = Sha1::new();
    hasher.update(&data);
    let result = hasher.finalize();
    Ok(format!("{:x}", result))
}

pub fn sha256(data: &[u8]) -> String {
    let mut hasher = Sha256::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn sha256_file(path: &str) -> Result<String, AppError> {
    let data = std::fs::read(path)
        .map_err(|e| errors::file_read_error(path, e.to_string()))?;
    Ok(sha256(&data))
}

pub fn md5_hash(data: &[u8]) -> String {
    let mut hasher = Md5::new();
    hasher.update(data);
    let result = hasher.finalize();
    format!("{:x}", result)
}

pub fn offline_uuid(username: &str) -> String {
    let hash = md5_hash(format!("OfflinePlayer:{}", username).as_bytes());
    format!("{}-{}-{}-{}-{}", &hash[0..8], &hash[8..12], &hash[12..16], &hash[16..20], &hash[20..32])
}
