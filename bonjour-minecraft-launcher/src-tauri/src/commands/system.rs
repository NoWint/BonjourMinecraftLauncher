use tauri;
use sysinfo::{ProcessesToUpdate, System};
use crate::services::file_manager;
use crate::utils::paths;
use crate::errors::AppError;

fn get_disk_free_gb(path: &std::path::Path) -> u64 {
    let disks = sysinfo::Disks::new_with_refreshed_list();
    for disk in &disks {
        if path.starts_with(disk.mount_point()) {
            return disk.available_space() / 1024 / 1024 / 1024;
        }
    }
    0
}

fn get_gpu_info() -> String {
    if cfg!(target_os = "macos") {
        if let Ok(output) = std::process::Command::new("sh")
            .arg("-c")
            .arg("system_profiler SPDisplaysDataType 2>/dev/null | grep 'Chipset Model' | head -1 | sed 's/.*: //'")
            .output()
        {
            return String::from_utf8_lossy(&output.stdout).trim().to_string();
        }
    } else if cfg!(target_os = "windows") {
        if let Ok(output) = std::process::Command::new("wmic")
            .args(["path", "win32_videocontroller", "get", "name"])
            .output()
        {
            let stdout = String::from_utf8_lossy(&output.stdout);
            let lines: Vec<&str> = stdout.lines().collect();
            if lines.len() > 1 {
                return lines[1].trim().to_string();
            }
        }
    } else {
        if let Ok(output) = std::process::Command::new("sh")
            .arg("-c")
            .arg("lspci 2>/dev/null | grep -i vga | head -1")
            .output()
        {
            return String::from_utf8_lossy(&output.stdout).trim().to_string();
        }
    }
    "Unknown".to_string()
}

fn check_network() -> (bool, String) {
    let hosts = ["bmclapi2.bangbang93.com", "launchermeta.mojang.com", "api.modrinth.com"];
    let mut reachable = 0;
    let mut details = Vec::new();

    for host in &hosts {
        let url = format!("https://{}", host);
        if let Ok(resp) = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .build()
            .and_then(|client| client.head(&url).send()) {
            if resp.status().is_success() {
                reachable += 1;
                details.push(format!("{} ✓", host));
            } else {
                details.push(format!("{} ✗ (HTTP {})", host, resp.status()));
            }
        } else {
            details.push(format!("{} ✗", host));
        }
    }

    let ok = reachable > 0;
    (ok, details.join(", "))
}

#[tauri::command]
pub fn get_system_info() -> Result<serde_json::Value, AppError> {
    let mut sys = System::new_all();
    sys.refresh_all();

    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "totalMemory": sys.total_memory() / 1024 / 1024,
        "freeMemory": sys.available_memory() / 1024 / 1024,
        "cpus": sys.cpus().len()
    }))
}

#[tauri::command]
pub fn get_hardware_info() -> Result<serde_json::Value, AppError> {
    let mut sys = System::new_all();
    sys.refresh_all();

    let cpu_name = sys.cpus().first()
        .map(|c| c.brand().to_string())
        .unwrap_or_default();

    let gpu = get_gpu_info();

    let game_dir = paths::default_game_dir();
    let disk_free = get_disk_free_gb(&game_dir);

    Ok(serde_json::json!({
        "cpu": cpu_name,
        "cpuCores": sys.cpus().len(),
        "gpu": gpu,
        "totalMemoryMB": sys.total_memory() / 1024 / 1024,
        "freeMemoryMB": sys.available_memory() / 1024 / 1024,
        "os": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "diskFreeGB": disk_free
    }))
}

#[tauri::command]
pub async fn open_external(url: String, _app: tauri::AppHandle) -> Result<(), AppError> {
    let parsed = url::Url::parse(&url)
        .map_err(|e| crate::errors::invalid_param("url", format!("Invalid URL: {}", e)))?;
    let scheme = parsed.scheme();
    if scheme != "http" && scheme != "https" {
        return Err(crate::errors::invalid_param("url", format!("Unsupported URL scheme: {}", scheme)));
    }
    open::that(&url).map_err(|e| crate::errors::internal(format!("Failed to open URL: {}", e)))
}

#[tauri::command]
pub fn run_pre_check(instance_id: Option<String>, game_version: Option<String>) -> Result<Vec<serde_json::Value>, AppError> {
    let _ = instance_id;
    let game_ver = game_version.clone();
    let mut results = Vec::new();

    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);

    let mut sys = System::new_all();
    sys.refresh_all();
    sys.refresh_processes(ProcessesToUpdate::All, true);

    // === Java 检查 ===
    let java_available = !settings.java_path.is_empty() || crate::services::java_detector::find_system_java().is_some();
    let java_version_info = if !settings.java_path.is_empty() {
        crate::services::java_detector::get_java_version(&settings.java_path)
    } else {
        crate::services::java_detector::find_system_java()
            .as_ref()
            .and_then(|p| crate::services::java_detector::get_java_version(p))
    };
    let java_major = java_version_info.as_ref().map(|v| v.major_version).unwrap_or(0);
    let java_ver_str = java_version_info.as_ref().map(|v| v.version.clone()).unwrap_or_default();

    results.push(serde_json::json!({
        "id": "java-check",
        "name": "Java 运行时",
        "category": "java",
        "status": if java_available { "pass" } else { "block" },
        "message": if java_available {
            if java_ver_str.is_empty() { "Java 可用".to_string() } else { format!("Java {} 可用", java_ver_str) }
        } else { "未找到 Java 运行时".to_string() },
        "detail": if java_available && !settings.java_path.is_empty() {
            format!("路径: {}", settings.java_path)
        } else { "".to_string() },
        "fixAction": if !java_available { "downloadJava" } else { "" },
        "fixLabel": if !java_available { "下载 Java" } else { "" }
    }));

    // Java 版本兼容性
    if java_available && java_major > 0 {
        let min_java = if game_ver.as_ref().map_or(false, |v| v.starts_with("1.")) { 8 }
                       else if game_ver.as_ref().map_or(false, |v| v.starts_with("1.16")) { 8 }
                       else if game_ver.as_ref().map_or(false, |v| v.as_str() >= "1.17") { 16 }
                       else { 8 };
        if java_major < min_java {
            results.push(serde_json::json!({
                "id": "java-version-check",
                "name": "Java 版本兼容性",
                "category": "java",
                "status": "warning",
                "message": format!("当前 Java {}, 建议 Java {}+", java_major, min_java),
                "detail": "旧版 Java 可能导致游戏崩溃或性能不佳",
                "fixAction": "downloadJavaVersion",
                "fixLabel": "下载 Java",
                "fixData": { "majorVersion": min_java }
            }));
        }
    }

    // === 内存检查 ===
    let total_mb = sys.total_memory() / 1024 / 1024;
    let free_mb = sys.available_memory() / 1024 / 1024;
    let needs_mb = settings.max_memory;
    let mem_status = if free_mb >= needs_mb { "pass" }
                     else if free_mb >= needs_mb / 2 { "warning" }
                     else { "block" };
    results.push(serde_json::json!({
        "id": "memory-check",
        "name": "内存检查",
        "category": "memory",
        "status": mem_status,
        "message": format!("可用: {}MB / 总计: {}MB, 需分配: {}MB", free_mb, total_mb, needs_mb),
        "detail": if mem_status != "pass" { "建议关闭其他程序释放内存" } else { "" }
    }));

    if total_mb < 4096 {
        results.push(serde_json::json!({
            "id": "memory-low",
            "name": "系统内存不足",
            "category": "memory",
            "status": "warning",
            "message": format!("系统总内存仅 {}MB，游戏体验可能不佳", total_mb),
            "detail": "建议至少 8GB 内存以获得流畅体验"
        }));
    }

    // === 磁盘检查 ===
    let game_dir = paths::detect_game_root(&settings.game_dir);
    let disk_free = get_disk_free_gb(std::path::Path::new(&game_dir));
    results.push(serde_json::json!({
        "id": "disk-check",
        "name": "磁盘空间",
        "category": "disk",
        "status": if disk_free >= 2 { "pass" } else if disk_free >= 1 { "warning" } else { "block" },
        "message": format!("可用: {}GB", disk_free),
        "detail": if disk_free < 2 { "建议至少保留 2GB 可用空间" } else { "" }
    }));

    // === GPU 检查 ===
    let gpu = get_gpu_info();
    let gpu_unknown = gpu == "Unknown" || gpu.is_empty();
    results.push(serde_json::json!({
        "id": "gpu-check",
        "name": "显卡检测",
        "category": "gpu",
        "status": if gpu_unknown { "warning" } else { "pass" },
        "message": if gpu_unknown { "无法检测显卡信息".to_string() } else { gpu.clone() },
        "detail": if gpu_unknown { "可能影响游戏性能，建议确认显卡驱动已安装" } else { "" }
    }));

    // === 网络检查 ===
    let (net_ok, net_detail) = check_network();
    results.push(serde_json::json!({
        "id": "network-check",
        "name": "网络连接",
        "category": "network",
        "status": if net_ok { "pass" } else { "warning" },
        "message": if net_ok { "网络连接正常" } else { "部分下载源不可达" },
        "detail": net_detail
    }));

    // === 账号检查 ===
    let accounts_path = paths::config_dir().join("accounts.json");
    let has_account = if accounts_path.exists() {
        if let Ok(data) = std::fs::read_to_string(&accounts_path) {
            let accounts: Vec<serde_json::Value> = serde_json::from_str(&data).unwrap_or_default();
            !accounts.is_empty()
        } else { false }
    } else { false };
    results.push(serde_json::json!({
        "id": "account-check",
        "name": "游戏账号",
        "category": "account",
        "status": if has_account { "pass" } else { "block" },
        "message": if has_account { "已登录账号" } else { "未登录游戏账号" },
        "fixAction": if !has_account { "addAccount" } else { "" },
        "fixLabel": if !has_account { "添加账号" } else { "" }
    }));

    // === 游戏目录检查 ===
    let game_dir_exists = std::path::Path::new(&game_dir).exists();
    results.push(serde_json::json!({
        "id": "gamedir-check",
        "name": "游戏目录",
        "category": "config",
        "status": if game_dir_exists || settings.game_dir.is_empty() { "pass" } else { "warning" },
        "message": if settings.game_dir.is_empty() { "使用默认游戏目录" } else if game_dir_exists { "游戏目录有效" } else { "游戏目录不存在" },
        "detail": if !settings.game_dir.is_empty() { settings.game_dir.clone() } else { game_dir.clone() }
    }));

    // === CPU 检查 ===
    let cpu_cores = sys.cpus().len();
    if cpu_cores < 2 {
        results.push(serde_json::json!({
            "id": "cpu-check",
            "name": "CPU 核心数",
            "category": "config",
            "status": "warning",
            "message": format!("检测到 {} 个 CPU 核心", cpu_cores),
            "detail": "建议至少 2 核以获得基本流畅体验"
        }));
    }

    Ok(results)
}

#[tauri::command]
pub fn get_performance_tier() -> Result<serde_json::Value, AppError> {
    let mut sys = System::new_all();
    sys.refresh_all();
    let total_mb = sys.total_memory() / 1024 / 1024;
    let cpu_cores = sys.cpus().len();
    let tier = if total_mb >= 16384 && cpu_cores >= 8 { "high" }
               else if total_mb >= 8192 && cpu_cores >= 4 { "medium" }
               else { "low" };
    Ok(serde_json::json!({
        "tier": tier,
        "totalMemoryMB": total_mb,
        "cpuCores": cpu_cores
    }))
}

#[tauri::command]
pub fn find_java_installations() -> Result<Vec<serde_json::Value>, AppError> {
    let javas = crate::services::java_detector::find_all_system_java();
    Ok(javas.into_iter().map(|j| serde_json::json!({
        "majorVersion": j.major_version,
        "path": j.path,
        "version": j.version,
        "source": j.source
    })).collect())
}

#[tauri::command]
pub fn find_game_directories() -> Result<Vec<serde_json::Value>, AppError> {
    let mut dirs = Vec::new();

    let default_dir = paths::default_game_dir();
    if std::path::Path::new(&default_dir).exists() {
        dirs.push(serde_json::json!({
            "path": default_dir,
            "label": "默认 (.minecraft)",
            "isDefault": true
        }));
    }

    let custom_dir = paths::config_dir().join("instances");
    if custom_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&custom_dir) {
            for entry in entries.flatten() {
                if entry.path().is_dir() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    dirs.push(serde_json::json!({
                        "path": entry.path().to_string_lossy().to_string(),
                        "label": format!("实例: {}", name),
                        "isDefault": false
                    }));
                }
            }
        }
    }

    Ok(dirs)
}
