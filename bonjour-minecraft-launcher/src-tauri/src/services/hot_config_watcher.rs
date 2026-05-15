use std::collections::HashMap;
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::RwLock;
use tauri::Emitter;
use crate::models::launch::*;
use std::sync::LazyLock;
use notify::Watcher;

static CONFIG_CATEGORIES: LazyLock<Vec<HotConfigCategory>> = LazyLock::new(|| {
    vec![
        HotConfigCategory {
            id: "resourcepack".to_string(),
            name: "资源包".to_string(),
            requires_restart: false,
            patterns: vec!["resourcepacks/**".to_string(), "options.txt".to_string()],
        },
        HotConfigCategory {
            id: "shaderpack".to_string(),
            name: "光影包".to_string(),
            requires_restart: false,
            patterns: vec!["shaderpacks/**".to_string(), "optionsshaders.txt".to_string()],
        },
        HotConfigCategory {
            id: "mod_config".to_string(),
            name: "模组配置".to_string(),
            requires_restart: true,
            patterns: vec![
                "config/**/*.cfg".to_string(),
                "config/**/*.json".to_string(),
                "config/**/*.toml".to_string(),
                "config/**/*.yaml".to_string(),
                "config/**/*.yml".to_string(),
            ],
        },
        HotConfigCategory {
            id: "mod_list".to_string(),
            name: "模组列表".to_string(),
            requires_restart: true,
            patterns: vec!["mods/**/*.jar".to_string(), "mods/**/*.jar.disabled".to_string()],
        },
        HotConfigCategory {
            id: "game_options".to_string(),
            name: "游戏选项".to_string(),
            requires_restart: false,
            patterns: vec!["options.txt".to_string(), "optionsof.txt".to_string(), "servers.dat".to_string()],
        },
        HotConfigCategory {
            id: "jvm_args".to_string(),
            name: "JVM 参数".to_string(),
            requires_restart: true,
            patterns: vec![],
        },
    ]
});

pub fn get_config_categories() -> Vec<HotConfigCategory> {
    CONFIG_CATEGORIES.clone()
}

pub fn classify_config_change(file_path: &str) -> Option<HotConfigCategory> {
    let normalized = file_path.replace('\\', "/");

    for category in CONFIG_CATEGORIES.iter() {
        for pattern in &category.patterns {
            let regex_pattern = pattern
                .replace("**", ".*")
                .replace('*', "[^/]*")
                .replace('.', r"\.");
            let regex_str = format!(r"(^|/){}$", regex_pattern);

            if let Ok(re) = regex::Regex::new(&regex_str) {
                if re.is_match(&normalized) {
                    return Some(category.clone());
                }
            }
        }
    }

    None
}

pub fn can_hot_reload(file_path: &str) -> bool {
    classify_config_change(file_path)
        .map(|c| !c.requires_restart)
        .unwrap_or(false)
}

pub fn create_config_change(file_path: &str) -> Option<HotConfigChange> {
    let category = classify_config_change(file_path)?;
    Some(HotConfigChange {
        file_path: file_path.to_string(),
        category: category.id.clone(),
        can_hot_reload: !category.requires_restart,
        timestamp: chrono::Utc::now().timestamp_millis(),
    })
}

pub fn get_hot_reloadable_categories() -> Vec<HotConfigCategory> {
    CONFIG_CATEGORIES.iter().filter(|c| !c.requires_restart).cloned().collect()
}

pub fn get_restart_required_categories() -> Vec<HotConfigCategory> {
    CONFIG_CATEGORIES.iter().filter(|c| c.requires_restart).cloned().collect()
}

pub fn generate_hot_reload_command(change: &HotConfigChange) -> Option<String> {
    match change.category.as_str() {
        "resourcepack" => Some("/reload".to_string()),
        "shaderpack" => Some("/shader reload".to_string()),
        _ => None,
    }
}

pub struct ConfigWatcher {
    watchers: Arc<RwLock<HashMap<String, notify::RecommendedWatcher>>>,
    changes: Arc<RwLock<Vec<HotConfigChange>>>,
}

impl ConfigWatcher {
    pub fn new() -> Self {
        ConfigWatcher {
            watchers: Arc::new(RwLock::new(HashMap::new())),
            changes: Arc::new(RwLock::new(Vec::new())),
        }
    }

    pub fn watch_directory(&self, dir: &str, app: &tauri::AppHandle) -> Result<(), String> {
        let path = PathBuf::from(dir);
        if !path.exists() {
            return Err(format!("Directory does not exist: {}", dir));
        }

        let changes = self.changes.clone();
        let app_clone = app.clone();

        let mut watcher = notify::RecommendedWatcher::new(
            move |res: Result<notify::Event, notify::Error>| {
                if let Ok(event) = res {
                    for path in &event.paths {
                        let path_str = path.to_string_lossy().to_string();
                        if let Some(change) = create_config_change(&path_str) {
                            let _ = app_clone.emit("config-changed", serde_json::json!({
                                "filePath": change.file_path,
                                "category": change.category,
                                "canHotReload": change.can_hot_reload,
                                "timestamp": change.timestamp
                            }));
                            changes.write().push(change);
                        }
                    }
                }
            },
            notify::Config::default(),
        ).map_err(|e: notify::Error| e.to_string())?;

        watcher.watch(&path, notify::RecursiveMode::Recursive)
            .map_err(|e: notify::Error| e.to_string())?;

        self.watchers.write().insert(dir.to_string(), watcher);
        Ok(())
    }

    pub fn stop_watching(&self, dir: &str) {
        self.watchers.write().remove(dir);
    }

    pub fn get_recent_changes(&self, limit: usize) -> Vec<HotConfigChange> {
        let changes = self.changes.read();
        changes.iter().rev().take(limit).cloned().collect()
    }

    pub fn clear_changes(&self) {
        self.changes.write().clear();
    }
}
