use tauri;
use tauri::Emitter;
use crate::services::java_detector;
use crate::utils::paths;
use crate::errors::{self, AppError};

#[tauri::command]
pub async fn download_java_with_progress(major_version: u32, app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    
    let (os_str, arch_str) = match (os, arch) {
        ("macos", "aarch64") => ("mac", "aarch64"),
        ("macos", "x86_64") => ("mac", "x64"),
        ("windows", "x86_64") => ("windows", "x64"),
        ("linux", "x86_64") => ("linux", "x64"),
        _ => return Err(errors::unsupported(format!("Platform {}-{}", os, arch))),
    };
    
    let url = format!(
        "https://api.adoptium.net/v3/binary/latest/{}/ga/{}/{}/jre/hotspot/normal/eclipse",
        major_version, os_str, arch_str
    );
    
    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "downloading",
        "message": format!("正在下载 Java {}...", major_version),
        "progress": 0
    }));
    
    let game_dir = paths::default_game_dir();
    let java_dir = game_dir.join("java").join("versions").join(major_version.to_string());
    std::fs::create_dir_all(&java_dir)
        .map_err(|e| errors::dir_create_error(&java_dir, e.to_string()))?;
    
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await
        .map_err(|e| errors::download_error(&url, e.to_string()))?;
    
    if !resp.status().is_success() {
        return Err(errors::download_error(&url, format!("HTTP {}", resp.status())));
    }
    
    let total_size = resp.content_length();
    let mut downloaded: u64 = 0;
    let mut stream = resp.bytes_stream();
    use futures_util::StreamExt;
    
    let temp_dir = std::env::temp_dir().join("bonjour-java-download");
    std::fs::create_dir_all(&temp_dir).ok();
    let ext = if cfg!(target_os = "windows") { "zip" } else { "tar.gz" };
    let temp_file = temp_dir.join(format!("java-{}.{}", major_version, ext));
    
    {
        use std::io::Write;
        let mut file = std::fs::File::create(&temp_file)
            .map_err(|e| errors::file_write_error(&temp_file, e.to_string()))?;
        
        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| errors::download_error(&url, e.to_string()))?;
            file.write_all(&chunk)
                .map_err(|e| errors::file_write_error(&temp_file, e.to_string()))?;
            downloaded += chunk.len() as u64;
            
            if let Some(total) = total_size {
                let progress = ((downloaded as f64 / total as f64) * 100.0) as u32;
                let _ = app.emit("java-download-progress", serde_json::json!({
                    "stage": "downloading",
                    "message": format!("正在下载 Java {}... {}%", major_version, progress),
                    "progress": progress,
                    "downloaded": downloaded,
                    "total": total
                }));
            }
        }
    }
    
    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "extracting",
        "message": format!("正在解压 Java {}...", major_version),
        "progress": 100
    }));
    
    if cfg!(target_os = "windows") {
        let file = std::fs::File::open(&temp_file).map_err(|e| errors::file_read_error(&temp_file, e.to_string()))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| errors::internal(format!("Failed to read zip: {}", e)))?;
        archive.extract(&java_dir).map_err(|e| errors::internal(format!("Failed to extract zip: {}", e)))?;
    } else {
        let output = std::process::Command::new("tar")
            .args(["-xzf", temp_file.to_string_lossy().as_ref(), "-C", java_dir.to_string_lossy().as_ref(), "--strip-components=1"])
            .output()
            .map_err(|e| errors::internal(format!("Failed to extract Java: {}", e)))?;
        if !output.status.success() {
            return Err(errors::internal(format!("Failed to extract Java: {}", String::from_utf8_lossy(&output.stderr))));
        }
    }
    
    let _ = std::fs::remove_file(&temp_file);
    
    let java_bin = if cfg!(target_os = "macos") {
        java_dir.join("bin/java")
    } else if cfg!(target_os = "windows") {
        java_dir.join("bin/java.exe")
    } else {
        java_dir.join("bin/java")
    };
    
    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "done",
        "message": format!("Java {} 安装完成！", major_version),
        "progress": 100,
        "path": java_bin.to_string_lossy()
    }));
    
    Ok(serde_json::json!({
        "success": true,
        "path": java_bin.to_string_lossy()
    }))
}

#[tauri::command]
pub async fn check_java() -> Result<serde_json::Value, AppError> {
    let java_path = java_detector::find_system_java();
    
    match java_path {
        Some(path) => {
            if let Some(info) = java_detector::get_java_version(&path) {
                let required_version = 17u32;
                let is_compatible = info.major_version >= required_version;
                Ok(serde_json::json!({
                    "available": true,
                    "path": info.path,
                    "version": info.version,
                    "majorVersion": info.major_version,
                    "isCompatible": is_compatible
                }))
            } else {
                Ok(serde_json::json!({
                    "available": true,
                    "path": path,
                    "version": null,
                    "majorVersion": 0,
                    "isCompatible": false
                }))
            }
        }
        None => Ok(serde_json::json!({
            "available": false,
            "path": null,
            "version": null,
            "majorVersion": 0,
            "isCompatible": false
        }))
    }
}

#[tauri::command]
pub async fn download_java() -> Result<serde_json::Value, AppError> {
    download_java_version_impl(17).await
}

#[tauri::command]
pub async fn download_java_version(major_version: u32) -> Result<serde_json::Value, AppError> {
    download_java_version_impl(major_version).await
}

async fn download_java_version_impl(major_version: u32) -> Result<serde_json::Value, AppError> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;
    
    let (os_str, arch_str) = match (os, arch) {
        ("macos", "aarch64") => ("mac", "aarch64"),
        ("macos", "x86_64") => ("mac", "x64"),
        ("windows", "x86_64") => ("windows", "x64"),
        ("linux", "x86_64") => ("linux", "x64"),
        _ => return Err(errors::unsupported(format!("Platform {}-{}", os, arch))),
    };
    
    let url = format!(
        "https://api.adoptium.net/v3/binary/latest/{}/ga/{}/{}/jre/hotspot/normal/eclipse",
        major_version, os_str, arch_str
    );
    
    let game_dir = paths::default_game_dir();
    let java_dir = game_dir.join("java").join("versions").join(major_version.to_string());
    std::fs::create_dir_all(&java_dir)
        .map_err(|e| errors::dir_create_error(&java_dir, e.to_string()))?;
    
    let client = reqwest::Client::new();
    let resp = client.get(&url).send().await
        .map_err(|e| errors::download_error(&url, e.to_string()))?;
    
    if !resp.status().is_success() {
        return Err(errors::download_error(&url, format!("HTTP {}", resp.status())));
    }
    
    let temp_dir = std::env::temp_dir().join("bonjour-java-download");
    std::fs::create_dir_all(&temp_dir).ok();
    
    let ext = if cfg!(target_os = "windows") { "zip" } else { "tar.gz" };
    let temp_file = temp_dir.join(format!("java-{}.{}", major_version, ext));
    let bytes = resp.bytes().await
        .map_err(|e| errors::download_error(&url, e.to_string()))?;
    std::fs::write(&temp_file, &bytes)
        .map_err(|e| errors::file_write_error(&temp_file, e.to_string()))?;
    
    if cfg!(target_os = "windows") {
        let file = std::fs::File::open(&temp_file).map_err(|e| errors::file_read_error(&temp_file, e.to_string()))?;
        let mut archive = zip::ZipArchive::new(file).map_err(|e| errors::internal(format!("Failed to read zip: {}", e)))?;
        archive.extract(&java_dir).map_err(|e| errors::internal(format!("Failed to extract zip: {}", e)))?;
    } else {
        let output = std::process::Command::new("tar")
            .args(["-xzf", temp_file.to_string_lossy().as_ref(), "-C", java_dir.to_string_lossy().as_ref(), "--strip-components=1"])
            .output()
            .map_err(|e| errors::internal(format!("Failed to extract Java: {}", e)))?;
        if !output.status.success() {
            return Err(errors::internal(format!("Failed to extract Java: {}", String::from_utf8_lossy(&output.stderr))));
        }
    }
    
    let _ = std::fs::remove_file(&temp_file);
    
    let java_bin = if cfg!(target_os = "macos") {
        java_dir.join("bin/java")
    } else if cfg!(target_os = "windows") {
        java_dir.join("bin/java.exe")
    } else {
        java_dir.join("bin/java")
    };
    
    Ok(serde_json::json!({
        "success": true,
        "path": java_bin.to_string_lossy()
    }))
}

#[tauri::command]
pub fn get_all_java_versions() -> Result<Vec<serde_json::Value>, AppError> {
    let mut versions = Vec::new();
    
    if let Some(path) = java_detector::find_system_java() {
        if let Some(info) = java_detector::get_java_version(&path) {
            versions.push(serde_json::json!({
                "majorVersion": info.major_version,
                "path": info.path,
                "version": info.version,
                "source": "system"
            }));
        }
    }
    
    let java_versions_dir = paths::default_game_dir().join("java").join("versions");
    if java_versions_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&java_versions_dir) {
            for entry in entries.flatten() {
                let name = entry.file_name().to_string_lossy().to_string();
                if let Ok(_major_version) = name.parse::<u32>() {
                    let java_bin = if cfg!(target_os = "macos") {
                        entry.path().join("bin/java")
                    } else if cfg!(target_os = "windows") {
                        entry.path().join("bin/java.exe")
                    } else {
                        entry.path().join("bin/java")
                    };
                    
                    if java_bin.exists() {
                        if let Some(info) = java_detector::get_java_version(java_bin.to_string_lossy().as_ref()) {
                            versions.push(serde_json::json!({
                                "majorVersion": info.major_version,
                                "path": info.path,
                                "version": info.version,
                                "source": "bundled"
                            }));
                        }
                    }
                }
            }
        }
    }
    
    Ok(versions)
}

#[tauri::command]
pub fn get_java_for_version(game_version: String) -> Result<Option<String>, AppError> {
    let minor: u32 = game_version.split('.').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0);
    let patch: u32 = game_version.split('.').nth(2).and_then(|s| s.parse().ok()).unwrap_or(0);
    
    let required = if minor >= 21 { 21u32 }
        else if minor >= 20 && patch >= 5 { 21 }
        else if minor >= 18 { 17 }
        else if minor >= 17 { 16 }
        else { 8 };
    
    let java_versions = get_all_java_versions()?;
    for v in java_versions {
        if v["majorVersion"].as_u64() == Some(required as u64) {
            return Ok(v["path"].as_str().map(|s| s.to_string()));
        }
    }
    
    Ok(None)
}
