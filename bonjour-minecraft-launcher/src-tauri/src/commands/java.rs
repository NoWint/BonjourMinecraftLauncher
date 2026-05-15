use tauri;
use tauri::Emitter;
use tauri::Manager;
use crate::services::java_detector;
use crate::utils::paths;
use crate::errors::{self, AppError};

fn get_java_download_urls(major_version: u32, os_str: &str, arch_str: &str) -> Vec<String> {
    let bmclapi_url = format!(
        "https://bmclapi2.bangbang93.com/java-runtime/{}/{}/{}",
        major_version, os_str, arch_str
    );
    let adoptium_url = format!(
        "https://api.adoptium.net/v3/binary/latest/{}/ga/{}/{}/jre/hotspot/normal/eclipse",
        major_version, os_str, arch_str
    );
    vec![bmclapi_url, adoptium_url]
}

async fn try_download_java(urls: &[String]) -> Result<reqwest::Response, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(300))
        .build()
        .map_err(|e| errors::internal(format!("Failed to create HTTP client: {}", e)))?;

    let mut last_error = None;
    for url in urls {
        match client.get(url).send().await {
            Ok(resp) if resp.status().is_success() => {
                return Ok(resp);
            }
            Ok(resp) => {
                eprintln!("HTTP {} from {}", resp.status(), url);
                last_error = Some(errors::download_error(url, format!("HTTP {}", resp.status())));
            }
            Err(e) => {
                eprintln!("Failed to fetch from {}: {}", url, e);
                last_error = Some(errors::download_error(url, e.to_string()));
            }
        }
    }
    Err(last_error.unwrap_or_else(|| errors::network_error("java_download", "All sources failed")))
}

fn find_java_home_in_dir(dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let java_bin_name = if cfg!(target_os = "windows") { "java.exe" } else { "java" };

    for entry in walkdir::WalkDir::new(dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_name() == java_bin_name {
            if let Some(bin_dir) = entry.path().parent() {
                if bin_dir.file_name().map_or(false, |n| n == "bin") {
                    if let Some(java_home) = bin_dir.parent() {
                        return Some(java_home.to_path_buf());
                    }
                }
            }
        }
    }

    None
}

fn relocate_java_home(extract_dir: &std::path::Path, target_dir: &std::path::Path) -> Result<(), AppError> {
    let java_home = find_java_home_in_dir(extract_dir)
        .ok_or_else(|| errors::internal("Failed to find Java home in extracted archive"))?;

    if java_home == target_dir || java_home == extract_dir {
        if java_home != target_dir {
            for entry in std::fs::read_dir(&java_home)
                .map_err(|e| errors::internal(format!("Failed to read Java home dir: {}", e)))?
            {
                let entry = entry.map_err(|e| errors::internal(format!("Failed to read dir entry: {}", e)))?;
                let dest = target_dir.join(entry.file_name());
                if dest.exists() {
                    if dest.is_dir() {
                        std::fs::remove_dir_all(&dest)
                            .map_err(|e| errors::internal(format!("Failed to remove existing dir: {}", e)))?;
                    } else {
                        std::fs::remove_file(&dest)
                            .map_err(|e| errors::internal(format!("Failed to remove existing file: {}", e)))?;
                    }
                }
                std::fs::rename(entry.path(), &dest)
                    .or_else(|_| {
                        copy_dir_recursive(&entry.path(), &dest)?;
                        std::fs::remove_dir_all(&entry.path())
                            .map_err(|e| errors::internal(format!("Failed to remove source: {}", e)))
                    })?;
            }
        }
        return Ok(());
    }

    for entry in std::fs::read_dir(&java_home)
        .map_err(|e| errors::internal(format!("Failed to read Java home dir: {}", e)))?
    {
        let entry = entry.map_err(|e| errors::internal(format!("Failed to read dir entry: {}", e)))?;
        let dest = target_dir.join(entry.file_name());
        if dest.exists() {
            if dest.is_dir() {
                std::fs::remove_dir_all(&dest)
                    .map_err(|e| errors::internal(format!("Failed to remove existing dir: {}", e)))?;
            } else {
                std::fs::remove_file(&dest)
                    .map_err(|e| errors::internal(format!("Failed to remove existing file: {}", e)))?;
            }
        }
        std::fs::rename(entry.path(), &dest)
            .or_else(|_| {
                copy_dir_recursive(&entry.path(), &dest)?;
                if entry.path().is_dir() {
                    std::fs::remove_dir_all(&entry.path())
                        .map_err(|e| errors::internal(format!("Failed to remove source: {}", e)))
                } else {
                    std::fs::remove_file(&entry.path())
                        .map_err(|e| errors::internal(format!("Failed to remove source: {}", e)))
                }
            })?;
    }

    Ok(())
}

fn copy_dir_recursive(src: &std::path::Path, dst: &std::path::Path) -> Result<(), AppError> {
    if src.is_dir() {
        std::fs::create_dir_all(dst)
            .map_err(|e| errors::dir_create_error(dst, e.to_string()))?;
        for entry in std::fs::read_dir(src)
            .map_err(|e| errors::internal(format!("Failed to read dir: {}", e)))?
        {
            let entry = entry.map_err(|e| errors::internal(format!("Failed to read entry: {}", e)))?;
            copy_dir_recursive(&entry.path(), &dst.join(entry.file_name()))?;
        }
    } else {
        std::fs::copy(src, dst)
            .map_err(|e| errors::internal(format!("Failed to copy file: {}", e)))?;
    }
    Ok(())
}

fn set_java_executable_permission(java_dir: &std::path::Path) {
    if cfg!(target_os = "macos") || cfg!(target_os = "linux") {
        let bin_dir = java_dir.join("bin");
        if bin_dir.exists() {
            let _ = std::process::Command::new("chmod")
                .args(["-R", "+x", bin_dir.to_string_lossy().as_ref()])
                .output();
        }
    }
}

fn get_java_bin_path(java_dir: &std::path::Path) -> std::path::PathBuf {
    if cfg!(target_os = "macos") {
        java_dir.join("bin/java")
    } else if cfg!(target_os = "windows") {
        java_dir.join("bin/java.exe")
    } else {
        java_dir.join("bin/java")
    }
}

fn extract_java_archive(temp_file: &std::path::Path, extract_dir: &std::path::Path) -> Result<(), AppError> {
    std::fs::create_dir_all(extract_dir)
        .map_err(|e| errors::dir_create_error(extract_dir, e.to_string()))?;

    if cfg!(target_os = "windows") {
        let file = std::fs::File::open(temp_file)
            .map_err(|e| errors::file_read_error(temp_file, e.to_string()))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| errors::internal(format!("Failed to read zip: {}", e)))?;
        archive.extract(extract_dir)
            .map_err(|e| errors::internal(format!("Failed to extract zip: {}", e)))?;
    } else {
        let output = std::process::Command::new("tar")
            .args(["-xzf", temp_file.to_string_lossy().as_ref(), "-C", extract_dir.to_string_lossy().as_ref()])
            .output()
            .map_err(|e| errors::internal(format!("Failed to extract Java: {}", e)))?;
        if !output.status.success() {
            return Err(errors::internal(format!("Failed to extract Java: {}", String::from_utf8_lossy(&output.stderr))));
        }
    }

    Ok(())
}

fn validate_java_installation(java_bin: &std::path::Path) -> Result<String, AppError> {
    let output = std::process::Command::new(java_bin)
        .arg("-version")
        .output()
        .map_err(|e| errors::internal(format!("Failed to run java -version: {}", e)))?;

    let stderr = String::from_utf8_lossy(&output.stderr).to_string();
    let stdout = String::from_utf8_lossy(&output.stdout).to_string();
    let version_output = if stderr.is_empty() { stdout } else { stderr };

    if !output.status.success() {
        return Err(errors::internal(format!("Java validation failed: {}", version_output)));
    }

    Ok(version_output)
}

fn get_platform_params(major_version: u32) -> Result<(String, String), AppError> {
    let os = std::env::consts::OS;
    let arch = std::env::consts::ARCH;

    match (os, arch) {
        ("macos", "aarch64") => Ok(("mac".to_string(), "aarch64".to_string())),
        ("macos", "x86_64") => Ok(("mac".to_string(), "x64".to_string())),
        ("windows", "x86_64") => Ok(("windows".to_string(), "x64".to_string())),
        ("windows", "aarch64") => {
            if major_version >= 21 {
                Ok(("windows".to_string(), "aarch64".to_string()))
            } else {
                Ok(("windows".to_string(), "x64".to_string()))
            }
        }
        ("linux", "x86_64") => Ok(("linux".to_string(), "x64".to_string())),
        ("linux", "aarch64") => Ok(("linux".to_string(), "aarch64".to_string())),
        _ => Err(errors::unsupported(format!("Platform {}-{}", os, arch))),
    }
}

#[tauri::command]
pub async fn download_java_with_progress(major_version: u32, app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    let lock_state = app.state::<tokio::sync::Mutex<()>>();
    let _lock = lock_state.lock().await;

    let (os_str, arch_str) = get_platform_params(major_version)?;

    let urls = get_java_download_urls(major_version, &os_str, &arch_str);

    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "downloading",
        "message": format!("正在下载 Java {}...", major_version),
        "progress": 0
    }));

    let game_dir = paths::default_game_dir();
    let java_dir = game_dir.join("java").join("versions").join(major_version.to_string());

    if java_dir.exists() {
        std::fs::remove_dir_all(&java_dir)
            .map_err(|e| errors::internal(format!("Failed to remove existing Java directory: {}", e)))?;
    }
    std::fs::create_dir_all(&java_dir)
        .map_err(|e| errors::dir_create_error(&java_dir, e.to_string()))?;

    let resp = try_download_java(&urls).await?;

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
            let chunk = chunk.map_err(|e| errors::download_error("java", e.to_string()))?;
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

    let tmp_extract_dir = java_dir.join("_tmp_extract");
    extract_java_archive(&temp_file, &tmp_extract_dir)?;

    relocate_java_home(&tmp_extract_dir, &java_dir)?;

    let _ = std::fs::remove_dir_all(&tmp_extract_dir);
    let _ = std::fs::remove_file(&temp_file);

    set_java_executable_permission(&java_dir);

    let java_bin = get_java_bin_path(&java_dir);

    if !java_bin.exists() {
        return Err(errors::internal(format!(
            "Java binary not found at expected path: {}. The archive structure may be unexpected.",
            java_bin.display()
        )));
    }

    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "validating",
        "message": format!("正在验证 Java {}...", major_version),
        "progress": 100
    }));

    let version_info = validate_java_installation(&java_bin)?;

    let _ = app.emit("java-download-progress", serde_json::json!({
        "stage": "done",
        "message": format!("Java {} 安装完成！", major_version),
        "progress": 100,
        "path": java_bin.to_string_lossy(),
        "version": version_info.trim()
    }));

    Ok(serde_json::json!({
        "success": true,
        "path": java_bin.to_string_lossy(),
        "version": version_info.trim()
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
pub async fn download_java(app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    download_java_with_progress(17, app).await
}

#[tauri::command]
pub async fn download_java_version(major_version: u32, app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    download_java_with_progress(major_version, app).await
}

fn find_java_bin_in_version_dir(version_dir: &std::path::Path) -> Option<std::path::PathBuf> {
    let direct_bin = if cfg!(target_os = "macos") {
        version_dir.join("bin/java")
    } else if cfg!(target_os = "windows") {
        version_dir.join("bin/java.exe")
    } else {
        version_dir.join("bin/java")
    };

    if direct_bin.exists() {
        return Some(direct_bin);
    }

    let java_bin_name = if cfg!(target_os = "windows") { "java.exe" } else { "java" };

    for entry in walkdir::WalkDir::new(version_dir)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        if entry.file_name() == java_bin_name {
            if let Some(bin_dir) = entry.path().parent() {
                if bin_dir.file_name().map_or(false, |n| n == "bin") {
                    return Some(entry.path().to_path_buf());
                }
            }
        }
    }

    None
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
                    if let Some(java_bin) = find_java_bin_in_version_dir(&entry.path()) {
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