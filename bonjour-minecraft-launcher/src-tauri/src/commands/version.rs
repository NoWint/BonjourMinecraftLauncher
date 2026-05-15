use tauri;
use tauri::Emitter;
use crate::models::version::{VersionManifest, InstalledVersion};
use crate::services::{file_manager, network};
use crate::utils::paths;
use crate::errors::{self, AppError};

const BMCLAPI_MIRROR: &str = "https://bmclapi2.bangbang93.com";
const MOJANG_BASE: &str = "https://launchermeta.mojang.com";
const MOJANG_META_BASE: &str = "https://piston-meta.mojang.com";

fn replace_with_mirror(url: &str) -> String {
    if url.starts_with(MOJANG_BASE) {
        format!("{}{}", BMCLAPI_MIRROR, &url[MOJANG_BASE.len()..])
    } else if url.starts_with(MOJANG_META_BASE) {
        format!("{}/{}", BMCLAPI_MIRROR, &url[MOJANG_META_BASE.len()..])
    } else {
        url.to_string()
    }
}

fn replace_urls_in_version_json(json: &mut serde_json::Value) {
    if let Some(obj) = json.as_object_mut() {
        if let Some(downloads) = obj.get_mut("downloads") {
            if let Some(downloads_obj) = downloads.as_object_mut() {
                for (_key, download_info) in downloads_obj.iter_mut() {
                    if let Some(info_obj) = download_info.as_object_mut() {
                        if let Some(url) = info_obj.get("url").and_then(|v| v.as_str()) {
                            info_obj.insert("url".to_string(), serde_json::Value::String(replace_with_mirror(url)));
                        }
                    }
                }
            }
        }

        if let Some(libraries) = obj.get_mut("libraries") {
            if let Some(libs_arr) = libraries.as_array_mut() {
                for lib in libs_arr.iter_mut() {
                    if let Some(lib_obj) = lib.as_object_mut() {
                        if let Some(downloads) = lib_obj.get_mut("downloads") {
                            if let Some(dl_obj) = downloads.as_object_mut() {
                                for (_key, info) in dl_obj.iter_mut() {
                                    if let Some(info_obj) = info.as_object_mut() {
                                        if let Some(url) = info_obj.get("url").and_then(|v| v.as_str()) {
                                            if !url.is_empty() {
                                                info_obj.insert("url".to_string(), serde_json::Value::String(replace_with_mirror(url)));
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        if let Some(asset_index) = obj.get_mut("assetIndex") {
            if let Some(ai_obj) = asset_index.as_object_mut() {
                if let Some(url) = ai_obj.get("url").and_then(|v| v.as_str()) {
                    ai_obj.insert("url".to_string(), serde_json::Value::String(replace_with_mirror(url)));
                }
            }
        }
    }
}

#[tauri::command]
pub async fn get_version_manifest() -> Result<VersionManifest, AppError> {
    let net = network::NetworkService::new();
    net.get_version_manifest().await
}

fn resolve_game_dir(settings_game_dir: &str) -> String {
    if settings_game_dir.is_empty() {
        paths::default_game_dir().to_string_lossy().to_string()
    } else {
        paths::detect_game_root(settings_game_dir)
    }
}

#[tauri::command]
pub fn get_installed_versions() -> Result<Vec<InstalledVersion>, AppError> {
    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);
    let game_dir = resolve_game_dir(&settings.game_dir);
    
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
pub async fn install_version(version_id: String, app: tauri::AppHandle) -> Result<bool, AppError> {
    let _ = app.emit("version-install-progress", serde_json::json!({
        "versionId": version_id,
        "stage": "fetching_manifest",
        "message": "正在获取版本信息...",
        "progress": 0
    }));

    let net = network::NetworkService::new();
    let manifest = net.get_version_manifest().await?;
    
    let version_entry = manifest.versions.iter()
        .find(|v| v.id == version_id)
        .ok_or_else(|| errors::version_not_found(&version_id))?;
    
    let _ = app.emit("version-install-progress", serde_json::json!({
        "versionId": version_id,
        "stage": "downloading_json",
        "message": "正在下载版本数据...",
        "progress": 10
    }));

    let version_json_url = replace_with_mirror(&version_entry.url);
    let resp = reqwest::get(&version_json_url).await
        .map_err(|e| errors::download_error(&version_json_url, e.to_string()))?;
    
    let mut version_json: serde_json::Value = resp.json().await
        .map_err(|e| errors::json_parse_error(format!("Version JSON parse error: {}", e)))?;
    
    replace_urls_in_version_json(&mut version_json);
    
    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);
    let game_dir = resolve_game_dir(&settings.game_dir);
    
    let version_dir = std::path::Path::new(&game_dir).join("versions").join(&version_id);
    std::fs::create_dir_all(&version_dir)
        .map_err(|e| errors::dir_create_error(&version_dir, e.to_string()))?;
    
    let _ = app.emit("version-install-progress", serde_json::json!({
        "versionId": version_id,
        "stage": "writing_json",
        "message": "正在写入版本配置...",
        "progress": 20
    }));

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
                let _ = app.emit("version-install-progress", serde_json::json!({
                    "versionId": version_id,
                    "stage": "downloading_client",
                    "message": "正在下载游戏核心文件...",
                    "progress": 30
                }));

                let jar_path = version_dir.join(format!("{}.jar", version_id));
                net.download_file_with_progress(
                    url,
                    jar_path.to_string_lossy().as_ref(),
                    &app,
                    &format!("install-{}", version_id),
                ).await?;
            }
        }
    }
    
    let _ = app.emit("version-install-progress", serde_json::json!({
        "versionId": version_id,
        "stage": "done",
        "message": "版本安装完成",
        "progress": 100
    }));

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
