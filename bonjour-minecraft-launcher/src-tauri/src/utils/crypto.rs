use sha2::{Sha256, Digest};
use sha1::Sha1;
use md5::Md5;
use aes_gcm::{Aes256Gcm, KeyInit, Nonce};
use aes_gcm::aead::Aead;
use base64::{Engine, engine::general_purpose::STANDARD as BASE64};
use crate::errors::{self, AppError};

const KEYRING_SERVICE: &str = "com.bonjour.minecraft-launcher";
const KEYRING_USERNAME: &str = "encryption-key";
const ENCRYPTION_PREFIX: &str = "ENC:v1:";

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

fn get_or_create_encryption_key() -> Result<[u8; 32], AppError> {
    let entry = keyring::Entry::new(KEYRING_SERVICE, KEYRING_USERNAME)
        .map_err(|e| errors::internal(format!("Keyring entry creation failed: {}", e)))?;

    match entry.get_password() {
        Ok(key_b64) => {
            let key_bytes = BASE64.decode(&key_b64)
                .map_err(|e| errors::internal(format!("Failed to decode key: {}", e)))?;
            if key_bytes.len() == 32 {
                let mut key = [0u8; 32];
                key.copy_from_slice(&key_bytes);
                Ok(key)
            } else {
                create_and_store_key(&entry)
            }
        }
        Err(_) => create_and_store_key(&entry),
    }
}

fn create_and_store_key(entry: &keyring::Entry) -> Result<[u8; 32], AppError> {
    let mut key = [0u8; 32];
    use rand::RngCore;
    rand::rng().fill_bytes(&mut key);

    let key_b64 = BASE64.encode(key);
    entry.set_password(&key_b64)
        .map_err(|e| errors::internal(format!("Failed to store encryption key: {}", e)))?;

    Ok(key)
}

pub fn encrypt_field(plaintext: &str) -> Result<String, AppError> {
    if plaintext.is_empty() {
        return Ok(String::new());
    }

    let key = get_or_create_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| errors::internal(format!("Cipher init failed: {}", e)))?;

    let nonce_bytes = rand::random::<[u8; 12]>();
    let nonce = Nonce::from_slice(&nonce_bytes);

    let ciphertext = cipher.encrypt(nonce, plaintext.as_bytes())
        .map_err(|e| errors::internal(format!("Encryption failed: {}", e)))?;

    let mut combined = Vec::with_capacity(12 + ciphertext.len());
    combined.extend_from_slice(&nonce_bytes);
    combined.extend_from_slice(&ciphertext);

    Ok(format!("{}{}", ENCRYPTION_PREFIX, BASE64.encode(&combined)))
}

pub fn decrypt_field(encrypted: &str) -> Result<String, AppError> {
    if encrypted.is_empty() {
        return Ok(String::new());
    }

    if !encrypted.starts_with(ENCRYPTION_PREFIX) {
        return Ok(encrypted.to_string());
    }

    let key = get_or_create_encryption_key()?;
    let cipher = Aes256Gcm::new_from_slice(&key)
        .map_err(|e| errors::internal(format!("Cipher init failed: {}", e)))?;

    let combined = BASE64.decode(&encrypted[ENCRYPTION_PREFIX.len()..])
        .map_err(|e| errors::internal(format!("Failed to decode encrypted data: {}", e)))?;

    if combined.len() < 12 {
        return Err(errors::internal("Invalid encrypted data: too short"));
    }

    let (nonce_bytes, ciphertext) = combined.split_at(12);
    let nonce = Nonce::from_slice(nonce_bytes);

    let plaintext = cipher.decrypt(nonce, ciphertext)
        .map_err(|e| errors::internal(format!("Decryption failed: {}", e)))?;

    String::from_utf8(plaintext)
        .map_err(|e| errors::internal(format!("Invalid UTF-8 in decrypted data: {}", e)))
}

pub fn is_encrypted(value: &str) -> bool {
    value.starts_with(ENCRYPTION_PREFIX)
}
