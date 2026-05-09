use crate::errors::AppError;
use std::path::{Path, PathBuf};
use std::sync::Arc;
use tokio::sync::Semaphore;
use crate::models::launch::IncrementalSyncResult;
use crate::utils::crypto;
use crate::services::file_manager;
use tauri::Emitter;

pub fn replace_download_url_internal(original_url: &str) -> String {
    original_url
        .replace("https://launchermeta.mojang.com", "https://bmclapi2.bangbang93.com")
        .replace("https://launcher.mojang.com", "https://bmclapi2.bangbang93.com")
        .replace("https://resources.download.minecraft.net", "https://bmclapi2.bangbang93.com/assets")
}

pub async fn incremental_sync_with_download(
    game_dir: &str,
    version_json: &serde_json::Value,
    concurrency: u32,
    app: &tauri::AppHandle,
) -> IncrementalSyncResult {
    let start = std::time::Instant::now();
    let dir = PathBuf::from(game_dir);

    let mut total_files: u32 = 0;
    let mut existing_files: u32 = 0;
    let mut missing_files: u32 = 0;
    let mut corrupted_files: u32 = 0;
    let mut downloaded_files: u32 = 0;
    let mut failed_files: u32 = 0;
    let mut total_bytes: u64 = 0;
    let mut downloaded_bytes: u64 = 0;

    let libraries = version_json["libraries"].as_array()
        .cloned()
        .unwrap_or_default();

    let mut download_tasks: Vec<(String, PathBuf, u64)> = Vec::new();

    for lib in &libraries {
        if let Some(artifact) = lib["downloads"]["artifact"].as_object() {
            total_files += 1;
            if let Some(path_str) = artifact["path"].as_str() {
                let lib_path = dir.join(path_str);
                if lib_path.exists() {
                    let valid = if let Some(expected_hash) = artifact["sha1"].as_str() {
                        let actual = crypto::sha1_file(&lib_path.to_string_lossy()).unwrap_or_default();
                        if actual.is_empty() || actual != expected_hash {
                            corrupted_files += 1;
                            false
                        } else {
                            true
                        }
                    } else {
                        true
                    };

                    if valid {
                        existing_files += 1;
                        if let Ok(meta) = lib_path.metadata() {
                            total_bytes += meta.len();
                        }
                    } else {
                        let size = artifact["size"].as_u64().unwrap_or(0);
                        let url = artifact["url"].as_str().unwrap_or("").to_string();
                        if !url.is_empty() {
                            download_tasks.push((url, lib_path, size));
                        }
                    }
                } else {
                    missing_files += 1;
                    let size = artifact["size"].as_u64().unwrap_or(0);
                    total_bytes += size;
                    let url = artifact["url"].as_str().unwrap_or("").to_string();
                    if !url.is_empty() {
                        download_tasks.push((url, lib_path, size));
                    }
                }
            }
        }
    }

    if !download_tasks.is_empty() {
        let semaphore = Arc::new(Semaphore::new(concurrency as usize));
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(120))
            .build()
            .unwrap_or_else(|_| reqwest::Client::new());

        let mut handles = Vec::new();

        for (url, path, _size) in download_tasks {
            let sem = semaphore.clone();
            let client = client.clone();
            let app = app.clone();

            handles.push(tokio::spawn(async move {
                let _permit = sem.acquire().await.unwrap();
                match download_file(&client, &url, &path).await {
                    Ok(bytes) => {
                        let _ = app.emit("sync-progress", serde_json::json!({
                            "url": url,
                            "path": path.to_string_lossy(),
                            "bytes": bytes,
                            "status": "downloaded"
                        }));
                        (true, bytes)
                    }
                    Err(_) => {
                        let _ = app.emit("sync-progress", serde_json::json!({
                            "url": url,
                            "path": path.to_string_lossy(),
                            "status": "failed"
                        }));
                        (false, 0u64)
                    }
                }
            }));
        }

        for handle in handles {
            if let Ok((success, bytes)) = handle.await {
                if success {
                    downloaded_files += 1;
                    downloaded_bytes += bytes;
                } else {
                    failed_files += 1;
                }
            }
        }
    }

    let duration_ms = start.elapsed().as_millis() as u64;

    IncrementalSyncResult {
        total_files,
        existing_files,
        missing_files: missing_files - downloaded_files - failed_files,
        corrupted_files,
        downloaded_files,
        skipped_files: existing_files,
        failed_files,
        total_bytes,
        downloaded_bytes,
        duration_ms,
    }
}

async fn download_file(client: &reqwest::Client, url: &str, path: &Path) -> Result<u64, AppError> {
    let url = replace_download_url_internal(url);

    if let Some(parent) = path.parent() {
        let _ = std::fs::create_dir_all(parent);
    }

    let response = client.get(&url).send().await.map_err(|e| e.to_string())?;
    let bytes = response.bytes().await.map_err(|e| e.to_string())?;
    let len = bytes.len() as u64;

    std::fs::write(path, &bytes).map_err(|e| e.to_string())?;

    Ok(len)
}

pub fn verify_file_batch(
    game_dir: &str,
    version_json: &serde_json::Value,
) -> Vec<serde_json::Value> {
    let dir = PathBuf::from(game_dir);
    let mut results = Vec::new();

    if let Some(libraries) = version_json["libraries"].as_array() {
        for lib in libraries {
            if let Some(artifact) = lib["downloads"]["artifact"].as_object() {
                if let Some(path_str) = artifact["path"].as_str() {
                    let lib_path = dir.join(path_str);
                    let status = if !lib_path.exists() {
                        "missing"
                    } else if let Some(expected_hash) = artifact["sha1"].as_str() {
                        let actual = crypto::sha1_file(&lib_path.to_string_lossy()).unwrap_or_default();
                        if actual.is_empty() || actual != expected_hash {
                            "corrupted"
                        } else {
                            "ok"
                        }
                    } else {
                        "ok"
                    };

                    if status != "ok" {
                        results.push(serde_json::json!({
                            "path": path_str,
                            "status": status,
                            "expectedHash": artifact["sha1"],
                            "url": artifact["url"],
                            "size": artifact["size"]
                        }));
                    }
                }
            }
        }
    }

    results
}

pub async fn repair_version_files(
    game_dir: &str,
    version_id: &str,
    app: &tauri::AppHandle,
) -> serde_json::Value {
    let dir = PathBuf::from(game_dir);
    let version_json_path = dir.join("versions").join(version_id).join(format!("{}.json", version_id));

    if !version_json_path.exists() {
        return serde_json::json!({
            "versionId": version_id,
            "totalFiles": 0, "existingFiles": 0, "missingFiles": 0,
            "corruptedFiles": 0, "downloadedFiles": 0, "failedFiles": 0
        });
    }

    let version_json: serde_json::Value = file_manager::load_json_or_default(&version_json_path);
    let result = incremental_sync_with_download(game_dir, &version_json, 8, app).await;

    serde_json::json!({
        "versionId": version_id,
        "totalFiles": result.total_files,
        "existingFiles": result.existing_files,
        "missingFiles": result.missing_files,
        "corruptedFiles": result.corrupted_files,
        "downloadedFiles": result.downloaded_files,
        "failedFiles": result.failed_files
    })
}
