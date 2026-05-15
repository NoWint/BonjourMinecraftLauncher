use crate::errors::AppError;
use std::path::Path;
use std::process::Command;

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct JavaVersionInfo {
    pub major_version: u32,
    pub path: String,
    pub version: String,
    pub source: String,
}

pub fn find_system_java() -> Option<String> {
    let all = find_all_system_java();
    all.into_iter().next().map(|info| info.path)
}

pub fn find_all_system_java() -> Vec<JavaVersionInfo> {
    let mut results = Vec::new();
    let mut seen_paths = std::collections::HashSet::new();

    if cfg!(target_os = "macos") {
        if let Ok(output) = Command::new("/usr/libexec/java_home")
            .args(["-V"])
            .output()
        {
            let stderr = String::from_utf8_lossy(&output.stderr);
            for line in stderr.lines() {
                let line = line.trim();
                if line.starts_with('/') && line.contains("JavaVirtualMachines") {
                    let java_bin = format!("{}/Contents/Home/bin/java", line);
                    if Path::new(&java_bin).exists() && !seen_paths.contains(&java_bin) {
                        seen_paths.insert(java_bin.clone());
                        if let Some(info) = get_java_version(&java_bin) {
                            results.push(info);
                        }
                    }
                }
            }
        }
    }

    let candidates = get_java_candidates();
    for dir in &candidates {
        if !Path::new(dir).exists() {
            continue;
        }

        if let Ok(entries) = std::fs::read_dir(dir) {
            for entry in entries.flatten() {
                let entry_path = entry.path();
                let java_bin = if cfg!(target_os = "macos") {
                    entry_path.join("Contents/Home/bin/java")
                } else if cfg!(target_os = "windows") {
                    entry_path.join("bin/java.exe")
                } else {
                    entry_path.join("bin/java")
                };

                let key = java_bin.to_string_lossy().to_string();
                if java_bin.exists() && !seen_paths.contains(&key) {
                    seen_paths.insert(key);
                    if let Some(info) = get_java_version(&java_bin.to_string_lossy()) {
                        results.push(info);
                    }
                }
            }
        }
    }

    #[cfg(target_os = "windows")]
    {
        if let Ok(output) = Command::new("where").arg("java").output() {
            if output.status.success() {
                for line in String::from_utf8_lossy(&output.stdout).lines() {
                    let path = line.trim().to_string();
                    if !path.is_empty() && Path::new(&path).exists() && !seen_paths.contains(&path) {
                        seen_paths.insert(path.clone());
                        if let Some(info) = get_java_version(&path) {
                            results.push(info);
                        }
                    }
                }
            }
        }
    }

    #[cfg(not(target_os = "windows"))]
    {
        if let Ok(output) = Command::new("which").arg("java").output() {
            if output.status.success() {
                let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path.is_empty() && Path::new(&path).exists() && !seen_paths.contains(&path) {
                    seen_paths.insert(path.clone());
                    if let Some(info) = get_java_version(&path) {
                        results.push(info);
                    }
                }
            }
        }
    }

    results.sort_by(|a, b| b.major_version.cmp(&a.major_version));
    results
}

fn get_java_candidates() -> Vec<String> {
    let mut candidates = Vec::new();

    if cfg!(target_os = "macos") {
        candidates.push("/Library/Java/JavaVirtualMachines".to_string());
        candidates.push("/System/Library/Java/JavaVirtualMachines".to_string());
        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join("Library/Java/JavaVirtualMachines").to_string_lossy().to_string());
        }
    } else if cfg!(target_os = "windows") {
        for env_var in &["ProgramFiles", "ProgramFiles(x86)"] {
            if let Ok(val) = std::env::var(env_var) {
                candidates.push(format!("{}\\Java", val));
                candidates.push(format!("{}\\Eclipse Adoptium", val));
                candidates.push(format!("{}\\Microsoft", val));
                candidates.push(format!("{}\\AdoptOpenJDK", val));
                candidates.push(format!("{}\\Zulu", val));
                candidates.push(format!("{}\\Amazon Corretto", val));
                candidates.push(format!("{}\\BellSoft", val));
                candidates.push(format!("{}\\Semeru", val));
            }
        }
        if let Ok(val) = std::env::var("JAVA_HOME") {
            let parent = Path::new(&val).parent();
            if let Some(p) = parent {
                candidates.push(p.to_string_lossy().to_string());
            }
        }
    } else {
        candidates.push("/usr/lib/jvm".to_string());
        candidates.push("/usr/java".to_string());
        candidates.push("/opt/java".to_string());
        candidates.push("/usr/lib/jvm/java-11-openjdk".to_string());
        candidates.push("/usr/lib/jvm/java-17-openjdk".to_string());
        candidates.push("/usr/lib/jvm/java-21-openjdk".to_string());
        candidates.push("/usr/lib/jvm/java-8-openjdk".to_string());
        if let Some(home) = dirs::home_dir() {
            candidates.push(home.join(".sdkman/candidates/java").to_string_lossy().to_string());
        }
    }

    candidates
}

pub fn get_java_version(java_path: &str) -> Option<JavaVersionInfo> {
    let output = Command::new(java_path)
        .arg("-version")
        .output()
        .ok()?;

    let version_output = String::from_utf8_lossy(&output.stderr);
    let major_version = parse_java_major_version(&version_output)?;

    Some(JavaVersionInfo {
        major_version,
        path: java_path.to_string(),
        version: version_output.lines().next().unwrap_or("").to_string(),
        source: "system".to_string(),
    })
}

fn parse_java_major_version(version_output: &str) -> Option<u32> {
    for line in version_output.lines() {
        if line.contains("version") {
            let start = line.find('"')?;
            let end = line.rfind('"')?;
            if start >= end { continue; }
            let version_str = &line[start + 1..end];
            let parts: Vec<&str> = version_str.split('.').collect();
            if parts.is_empty() { continue; }
            if parts[0] == "1" && parts.len() > 1 {
                return parts[1].parse().ok();
            }
            return parts[0].parse().ok();
        }
    }
    None
}

pub fn find_java_for_version(major_version: u32, bundled_dir: &std::path::Path) -> Option<String> {
    let all_system = find_all_system_java();
    for java in &all_system {
        if java.major_version == major_version {
            return Some(java.path.clone());
        }
    }

    let bundled_path = if cfg!(target_os = "macos") {
        bundled_dir.join(major_version.to_string()).join("bin/java")
    } else if cfg!(target_os = "windows") {
        bundled_dir.join(major_version.to_string()).join("bin/java.exe")
    } else {
        bundled_dir.join(major_version.to_string()).join("bin/java")
    };

    if bundled_path.exists() {
        return Some(bundled_path.to_string_lossy().to_string());
    }

    for java in &all_system {
        if java.major_version >= major_version {
            return Some(java.path.clone());
        }
    }

    all_system.into_iter().last().map(|j| j.path)
}
