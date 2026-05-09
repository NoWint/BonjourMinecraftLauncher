use tauri;
use crate::models::version::{VersionManifest, InstalledVersion};
use crate::services::{file_manager, network};
use crate::utils::paths;
use crate::errors::{self, AppError};

#[tauri::command]
pub async fn get_version_manifest() -> Result<VersionManifest, AppError> {
    let net = network::NetworkService::new();
    net.get_version_manifest().await
}

#[tauri::command]
pub fn get_installed_versions() -> Result<Vec<InstalledVersion>, AppError> {
    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);
    let game_dir = paths::detect_game_root(&settings.game_dir);
    
    let scanned = scan_versions_dir(&game_dir);
    
    let versions_path = paths::versions_file();
    let saved: Vec<InstalledVersion> = file_manager::load_json_or_default(&versions_path);
    
    let merged: Vec<InstalledVersion> = scanned.iter().map(|s| {
        if let Some(saved_v) = saved.iter().find(|v| v.id == s.id) {
            InstalledVersion {
                mod_loader: saved_v.mod_loader.clone().or_else(|| s.mod_loader.clone()),
                mod_loader_version: saved_v.mod_loader_version.clone().or_else(|| s.mod_loader_version.clone()),
                ..s.clone()
            }
        } else {
            s.clone()
        }
    }).collect();
    
    Ok(merged)
}

#[tauri::command]
pub fn scan_game_dir(game_dir: String) -> Result<Vec<InstalledVersion>, AppError> {
    let root = paths::detect_game_root(&game_dir);
    Ok(scan_versions_dir(&root))
}

#[tauri::command]
pub async fn install_version(version_id: String) -> Result<bool, AppError> {
    let net = network::NetworkService::new();
    let manifest = net.get_version_manifest().await?;
    
    let version_entry = manifest.versions.iter()
        .find(|v| v.id == version_id)
        .ok_or_else(|| errors::version_not_found(&version_id))?;
    
    let version_json_url = &version_entry.url;
    let resp = reqwest::get(version_json_url).await
        .map_err(|e| errors::download_error(version_json_url, e.to_string()))?;
    
    let version_json: serde_json::Value = resp.json().await
        .map_err(|e| errors::json_parse_error(format!("Version JSON parse error: {}", e)))?;
    
    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);
    let game_dir = paths::detect_game_root(&settings.game_dir);
    
    let version_dir = std::path::Path::new(&game_dir).join("versions").join(&version_id);
    std::fs::create_dir_all(&version_dir)
        .map_err(|e| errors::dir_create_error(&version_dir, e.to_string()))?;
    
    let json_path = version_dir.join(format!("{}.json", version_id));
    let json_str = serde_json::to_string_pretty(&version_json)
        .map_err(|e| AppError::JsonSerializeError {
            reason: e.to_string(),
            message_zh: "版本 JSON 序列化失败".to_string(),
            message_en: "Failed to serialize version JSON".to_string(),
            fix_action: "请重试安装".to_string(),
        })?;
    std::fs::write(&json_path, json_str)
        .map_err(|e| errors::file_write_error(&json_path, e.to_string()))?;
    
    if let Some(downloads) = version_json.get("downloads") {
        if let Some(client) = downloads.get("client") {
            if let Some(url) = client["url"].as_str() {
                let jar_path = version_dir.join(format!("{}.jar", version_id));
                net.download_file(url, jar_path.to_string_lossy().to_string().as_str()).await?;
            }
        }
    }
    
    Ok(true)
}

fn scan_versions_dir(game_dir: &str) -> Vec<InstalledVersion> {
    let versions_dir = std::path::Path::new(game_dir).join("versions");
    let mut versions = Vec::new();
    
    if !versions_dir.exists() {
        return versions;
    }
    
    if let Ok(entries) = std::fs::read_dir(&versions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if !path.is_dir() {
                continue;
            }
            
            let name = match path.file_name() {
                Some(n) => n.to_string_lossy().to_string(),
                None => continue,
            };
            
            let json_file = path.join(format!("{}.json", name));
            let jar_file = path.join(format!("{}.jar", name));
            
            if json_file.exists() && jar_file.exists() {
                let version_type = std::fs::read_to_string(&json_file)
                    .ok()
                    .and_then(|s| serde_json::from_str::<serde_json::Value>(&s).ok())
                    .and_then(|v| v["type"].as_str().map(|s| s.to_string()))
                    .unwrap_or_else(|| "release".to_string());
                
                let ctime = path.metadata()
                    .and_then(|m| m.created())
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs().to_string())
                    .unwrap_or_default();
                
                versions.push(InstalledVersion {
                    id: name,
                    version_type,
                    installed_at: ctime,
                    path: path.to_string_lossy().to_string(),
                    mod_loader: None,
                    mod_loader_version: None,
                });
            }
        }
    }
    
    versions
}
