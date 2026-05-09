use std::path::{PathBuf, Path};

pub fn dir_size(path: &Path) -> u64 {
    let mut size = 0u64;
    if path.is_dir() {
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let p = entry.path();
                if p.is_dir() {
                    size += dir_size(&p);
                } else if let Ok(meta) = p.metadata() {
                    size += meta.len();
                }
            }
        }
    } else if let Ok(meta) = path.metadata() {
        size = meta.len();
    }
    size
}

pub fn default_game_dir() -> PathBuf {
    if cfg!(target_os = "macos") {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/"))
            .join("Library/Application Support/bonjour-minecraft")
    } else if cfg!(target_os = "windows") {
        dirs::data_dir()
            .unwrap_or_else(|| PathBuf::from("C:\\"))
            .join(".bonjour-minecraft")
    } else {
        dirs::home_dir()
            .unwrap_or_else(|| PathBuf::from("/"))
            .join(".bonjour-minecraft")
    }
}

pub fn config_dir() -> PathBuf {
    default_game_dir().join("launcher")
}

pub fn accounts_file() -> PathBuf {
    config_dir().join("accounts.json")
}

pub fn settings_file() -> PathBuf {
    config_dir().join("settings.json")
}

pub fn versions_file() -> PathBuf {
    config_dir().join("versions.json")
}

pub fn instances_file() -> PathBuf {
    config_dir().join("instances.json")
}

#[allow(dead_code)]
pub fn servers_file() -> PathBuf {
    config_dir().join("servers.json")
}

#[allow(dead_code)]
pub fn server_groups_file() -> PathBuf {
    config_dir().join("server_groups.json")
}

#[allow(dead_code)]
pub fn crash_reports_dir() -> PathBuf {
    config_dir().join("crash-reports")
}

#[allow(dead_code)]
pub fn benchmarks_dir() -> PathBuf {
    config_dir().join("benchmarks")
}

#[allow(dead_code)]
pub fn instance_snapshots_dir() -> PathBuf {
    config_dir().join("instance_snapshots")
}

#[allow(dead_code)]
pub fn instance_templates_dir() -> PathBuf {
    config_dir().join("instance_templates")
}

pub fn modpacks_dir() -> PathBuf {
    config_dir().join("modpacks")
}

pub fn ensure_default_game_dir() -> Result<PathBuf, String> {
    let game_dir = default_game_dir();
    let subdirs = ["versions", "libraries", "assets", "java/versions"];
    
    if !game_dir.exists() {
        std::fs::create_dir_all(&game_dir)
            .map_err(|e| format!("Failed to create game dir {:?}: {}", game_dir, e))?;
    }
    
    for subdir in &subdirs {
        let path = game_dir.join(subdir);
        if !path.exists() {
            std::fs::create_dir_all(&path)
                .map_err(|e| format!("Failed to create subdir {:?}: {}", path, e))?;
        }
    }
    
    let launcher_dir = config_dir();
    if !launcher_dir.exists() {
        std::fs::create_dir_all(&launcher_dir)
            .map_err(|e| format!("Failed to create launcher dir {:?}: {}", launcher_dir, e))?;
    }
    
    Ok(game_dir)
}

pub fn detect_game_root(selected_dir: &str) -> String {
    let dir = PathBuf::from(selected_dir);
    
    if dir.file_name().map_or(false, |n| n == "versions") {
        let parent = dir.parent();
        if let Some(p) = parent {
            if p.join("libraries").exists() {
                return p.to_string_lossy().to_string();
            }
        }
    }

    if dir.join("versions").exists() && dir.join("libraries").exists() {
        return selected_dir.to_string();
    }

    if let Some(parent) = dir.parent() {
        if parent.join("versions").exists() && parent.join("libraries").exists() {
            return parent.to_string_lossy().to_string();
        }
    }

    selected_dir.to_string()
}
