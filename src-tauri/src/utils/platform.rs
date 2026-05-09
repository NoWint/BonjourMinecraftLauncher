use crate::errors::AppError;

pub fn os_name() -> &'static str {
    if cfg!(target_os = "windows") { "windows" }
    else if cfg!(target_os = "macos") { "macos" }
    else if cfg!(target_os = "linux") { "linux" }
    else { "unknown" }
}

pub fn os_display_name() -> &'static str {
    if cfg!(target_os = "windows") { "Windows" }
    else if cfg!(target_os = "macos") { "macOS" }
    else if cfg!(target_os = "linux") { "Linux" }
    else { "Unknown" }
}

pub fn arch_name() -> &'static str {
    if cfg!(target_arch = "x86_64") { "x64" }
    else if cfg!(target_arch = "aarch64") { "arm64" }
    else if cfg!(target_arch = "x86") { "x86" }
    else { "unknown" }
}

pub fn java_subdir() -> &'static str {
    if cfg!(target_os = "windows") { "bin\\javaw.exe" }
    else if cfg!(target_os = "macos") { "bin/java" }
    else { "bin/java" }
}

pub fn classpath_separator() -> &'static str {
    if cfg!(target_os = "windows") { ";" } else { ":" }
}

pub fn natives_dir_name() -> &'static str {
    if cfg!(target_os = "windows") { "windows" }
    else if cfg!(target_os = "macos") { "osx" }
    else { "linux" }
}

pub fn native_extensions() -> &'static [&'static str] {
    if cfg!(target_os = "windows") { &["dll"] }
    else if cfg!(target_os = "macos") { &["dylib", "jnilib"] }
    else { &["so"] }
}

pub fn minecraft_data_dir() -> std::path::PathBuf {
    if cfg!(target_os = "windows") {
        std::path::PathBuf::from(std::env::var("APPDATA").unwrap_or_else(|_| ".".to_string()))
            .join(".minecraft")
    } else if cfg!(target_os = "macos") {
        dirs::home_dir()
            .unwrap_or_else(|| std::path::PathBuf::from("~"))
            .join("Library")
            .join("Application Support")
            .join("minecraft")
    } else {
        std::path::PathBuf::from(std::env::var("HOME").unwrap_or_else(|_| ".".to_string()))
            .join(".minecraft")
    }
}

pub fn default_java_paths() -> Vec<std::path::PathBuf> {
    let mut paths = Vec::new();

    if cfg!(target_os = "windows") {
        let program_files = std::env::var("ProgramFiles").unwrap_or_else(|_| "C:\\Program Files".to_string());
        let program_files_x86 = std::env::var("ProgramFiles(x86)").unwrap_or_else(|_| "C:\\Program Files (x86)".to_string());

        for base in [&program_files, &program_files_x86] {
            let java_dir = std::path::Path::new(base).join("Java");
            if let Ok(entries) = std::fs::read_dir(&java_dir) {
                for entry in entries.flatten() {
                    let javaw = entry.path().join("bin").join("javaw.exe");
                    if javaw.exists() {
                        paths.push(javaw);
                    }
                }
            }
        }

        if let Ok(output) = std::process::Command::new("where").arg("javaw.exe").output() {
            if output.status.success() {
                for line in String::from_utf8_lossy(&output.stdout).lines() {
                    let p = std::path::PathBuf::from(line.trim());
                    if p.exists() {
                        paths.push(p);
                    }
                }
            }
        }
    } else if cfg!(target_os = "macos") {
        let java_home = std::path::PathBuf::from("/Library/Java/JavaVirtualMachines");
        if let Ok(entries) = std::fs::read_dir(&java_home) {
            for entry in entries.flatten() {
                let java_bin = entry.path().join("Contents").join("Home").join("bin").join("java");
                if java_bin.exists() {
                    paths.push(java_bin);
                }
            }
        }

        if let Ok(output) = std::process::Command::new("/usr/libexec/java_home").output() {
            if output.status.success() {
                let home = String::from_utf8_lossy(&output.stdout).trim().to_string();
                let java_bin = std::path::PathBuf::from(&home).join("bin").join("java");
                if java_bin.exists() {
                    paths.push(java_bin);
                }
            }
        }

        let runtime_java = std::path::PathBuf::from("/usr/bin/java");
        if runtime_java.exists() {
            paths.push(runtime_java);
        }
    } else {
        for candidate in &["/usr/bin/java", "/usr/local/bin/java", "/usr/lib/jvm/default-java/bin/java"] {
            let p = std::path::PathBuf::from(candidate);
            if p.exists() {
                paths.push(p);
            }
        }

        if let Ok(output) = std::process::Command::new("which").arg("java").output() {
            if output.status.success() {
                for line in String::from_utf8_lossy(&output.stdout).lines() {
                    let p = std::path::PathBuf::from(line.trim());
                    if p.exists() {
                        paths.push(p);
                    }
                }
            }
        }
    }

    paths.dedup();
    paths
}

pub fn process_kill_command(pid: u32) -> Result<(), AppError> {
    if cfg!(target_os = "windows") {
        std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map_err(|e| crate::errors::internal(format!("Failed to kill process {}: {}", pid, e)))?;
    } else {
        std::process::Command::new("kill")
            .args(["-9", &pid.to_string()])
            .output()
            .map_err(|e| crate::errors::internal(format!("Failed to kill process {}: {}", pid, e)))?;
    }
    Ok(())
}

pub fn open_in_file_manager(path: &str) -> Result<(), AppError> {
    if cfg!(target_os = "windows") {
        std::process::Command::new("explorer").arg(path).spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(path).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(path).spawn()
    }.map_err(|e| crate::errors::internal(format!("Failed to open file manager: {}", e)))?;
    Ok(())
}

pub fn open_url(url: &str) -> Result<(), AppError> {
    if cfg!(target_os = "windows") {
        std::process::Command::new("cmd").args(["/c", "start", url]).spawn()
    } else if cfg!(target_os = "macos") {
        std::process::Command::new("open").arg(url).spawn()
    } else {
        std::process::Command::new("xdg-open").arg(url).spawn()
    }.map_err(|e| crate::errors::internal(format!("Failed to open URL: {}", e)))?;
    Ok(())
}

pub fn is_process_running(pid: u32) -> bool {
    if cfg!(target_os = "windows") {
        std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    } else {
        std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
}

pub fn memory_info() -> (u64, u64) {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    let total = sys.total_memory();
    let available = sys.available_memory();
    (total, available)
}

pub fn system_info() -> serde_json::Value {
    let (total_mem, avail_mem) = memory_info();
    serde_json::json!({
        "os": os_name(),
        "osDisplayName": os_display_name(),
        "arch": arch_name(),
        "totalMemoryMB": total_mem / (1024 * 1024),
        "availableMemoryMB": avail_mem / (1024 * 1024),
        "nativesDir": natives_dir_name(),
        "classpathSeparator": classpath_separator(),
    })
}

#[tauri::command]
pub fn platform_get_system_info() -> serde_json::Value {
    system_info()
}

#[tauri::command]
pub fn platform_get_memory_info() -> serde_json::Value {
    let (total, available) = memory_info();
    serde_json::json!({
        "totalMB": total / (1024 * 1024),
        "availableMB": available / (1024 * 1024),
    })
}

#[tauri::command]
pub fn platform_get_os_name() -> String {
    os_name().to_string()
}

#[tauri::command]
pub fn platform_get_arch() -> String {
    arch_name().to_string()
}

#[tauri::command]
pub fn platform_get_minecraft_data_dir() -> String {
    minecraft_data_dir().to_string_lossy().to_string()
}

#[tauri::command]
pub fn platform_get_default_java_paths() -> Vec<String> {
    default_java_paths().iter().map(|p| p.to_string_lossy().to_string()).collect()
}

#[tauri::command]
pub fn platform_open_in_file_manager(path: String) -> Result<(), AppError> {
    open_in_file_manager(&path)
}

#[tauri::command]
pub fn platform_open_url(url: String) -> Result<(), AppError> {
    open_url(&url)
}

#[tauri::command]
pub fn platform_kill_process(pid: u32) -> Result<(), AppError> {
    process_kill_command(pid)
}
