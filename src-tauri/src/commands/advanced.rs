use tauri;
use tauri::{Emitter, Manager};
use crate::services::file_manager;
use crate::utils::paths;
use crate::errors::{self, AppError};
use crate::services::incremental_sync;
use crate::services::launch_engine::LaunchEngine;
use crate::services::process_guardian::ProcessGuardian;
use crate::services::hot_config_watcher::ConfigWatcher;
use std::sync::Arc;
use std::io::Write as IoWrite;

pub struct AppState {
    pub launch_engine: LaunchEngine,
    pub process_guardian: ProcessGuardian,
    pub config_watcher: ConfigWatcher,
}

impl AppState {
    pub fn new() -> Self {
        AppState {
            launch_engine: LaunchEngine::new(),
            process_guardian: ProcessGuardian::new(),
            config_watcher: ConfigWatcher::new(),
        }
    }
}

fn groups_file() -> std::path::PathBuf {
    paths::config_dir().join("instance_groups_config.json")
}

fn templates_file() -> std::path::PathBuf {
    let dir = paths::config_dir().join("instance_templates");
    let _ = file_manager::ensure_dir(&dir);
    dir.join("templates.json")
}

fn snapshots_dir() -> std::path::PathBuf {
    let dir = paths::config_dir().join("instance_snapshots");
    let _ = file_manager::ensure_dir(&dir);
    dir
}

fn benchmarks_file() -> std::path::PathBuf {
    paths::config_dir().join("launch_benchmarks.json")
}

fn dependencies_file() -> std::path::PathBuf {
    paths::config_dir().join("launch_dependencies.json")
}

fn annotations_dir() -> std::path::PathBuf {
    let dir = paths::config_dir().join("version_annotations");
    let _ = file_manager::ensure_dir(&dir);
    dir
}

fn dashboard_dir() -> std::path::PathBuf {
    let dir = paths::config_dir().join("instance_dashboard");
    let _ = file_manager::ensure_dir(&dir);
    dir
}

fn version_annotations_file(version: &str) -> std::path::PathBuf {
    let safe: String = version.chars().map(|c| if c.is_alphanumeric() || c == '.' || c == '-' { c } else { '_' }).collect();
    annotations_dir().join(format!("{}.json", safe))
}

fn instance_dashboard_file(instance_id: &str) -> std::path::PathBuf {
    dashboard_dir().join(format!("{}.json", instance_id))
}

fn scan_mods(game_dir: &std::path::Path) -> Vec<serde_json::Value> {
    let mods_dir = game_dir.join("mods");
    let mut mods = Vec::new();
    if mods_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&mods_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if (name.ends_with(".jar") || name.ends_with(".jar.disabled")) && path.is_file() {
                    let size = path.metadata().map(|m| m.len()).unwrap_or(0);
                    let enabled = !name.ends_with(".disabled");
                    let hash = crate::utils::crypto::sha256_file(&path.to_string_lossy()).unwrap_or_default();
                    let relative = format!("mods/{}", name);
                    mods.push(serde_json::json!({
                        "fileName": name,
                        "filePath": relative,
                        "enabled": enabled,
                        "hash": hash,
                        "size": size
                    }));
                }
            }
        }
    }
    mods
}

fn scan_configs(game_dir: &std::path::Path) -> Vec<serde_json::Value> {
    let config_dir = game_dir.join("config");
    let mut configs = Vec::new();
    if config_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&config_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if path.is_file() {
                    let size = path.metadata().map(|m| m.len()).unwrap_or(0);
                    let hash = crate::utils::crypto::sha256_file(&path.to_string_lossy()).unwrap_or_default();
                    let relative = format!("config/{}", file_name);
                    configs.push(serde_json::json!({
                        "relativePath": relative,
                        "hash": hash,
                        "size": size
                    }));
                }
            }
        }
    }
    configs
}

fn scan_configs_with_content(game_dir: &std::path::Path) -> Vec<serde_json::Value> {
    let config_dir = game_dir.join("config");
    let mut configs = Vec::new();
    if config_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&config_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if path.is_file() {
                    let hash = crate::utils::crypto::sha256_file(&path.to_string_lossy()).unwrap_or_default();
                    let relative = format!("config/{}", file_name);
                    let content = std::fs::read_to_string(&path).unwrap_or_default();
                    configs.push(serde_json::json!({
                        "relativePath": relative,
                        "content": content,
                        "hash": hash
                    }));
                }
            }
        }
    }
    configs
}

fn scan_options_txt(game_dir: &std::path::Path) -> serde_json::Value {
    let options_path = game_dir.join("options.txt");
    if options_path.exists() {
        if let Ok(content) = std::fs::read_to_string(&options_path) {
            let mut settings = serde_json::Map::new();
            for line in content.lines() {
                let line = line.trim();
                if line.is_empty() || line.starts_with('#') { continue; }
                if let Some((key, value)) = line.split_once(':') {
                    settings.insert(key.trim().to_string(), serde_json::Value::String(value.trim().to_string()));
                }
            }
            serde_json::Value::Object(settings)
        } else {
            serde_json::json!({})
        }
    } else {
        serde_json::json!({})
    }
}

fn calc_dir_size(path: &std::path::Path) -> u64 {
    paths::dir_size(path)
}

fn find_instance_dir(instance_id: &str) -> Option<std::path::PathBuf> {
    let instances: Vec<serde_json::Value> = file_manager::load_json_or_default(&paths::instances_file());
    for inst in &instances {
        if inst["id"].as_str() == Some(instance_id) {
            if let Some(dir) = inst["instanceDir"].as_str() {
                let p = std::path::PathBuf::from(dir);
                if p.exists() { return Some(p); }
            }
            let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&paths::settings_file());
            let game_root = paths::detect_game_root(&settings.game_dir);
            let gv = inst["gameVersion"].as_str().unwrap_or("");
            let p = std::path::PathBuf::from(game_root).join(gv);
            if p.exists() { return Some(p); }
        }
    }
    None
}

#[tauri::command]
pub fn get_config_categories() -> Result<Vec<serde_json::Value>, AppError> {
    Ok(vec![
        serde_json::json!({"id": "game", "name": "游戏设置", "icon": "game"}),
        serde_json::json!({"id": "java", "name": "Java 设置", "icon": "coffee"}),
        serde_json::json!({"id": "launcher", "name": "启动器设置", "icon": "rocket"}),
        serde_json::json!({"id": "network", "name": "网络设置", "icon": "wifi"}),
        serde_json::json!({"id": "appearance", "name": "外观设置", "icon": "palette"}),
    ])
}

#[tauri::command]
pub fn classify_config_change(file_path: String) -> Result<Option<serde_json::Value>, AppError> {
    let name = std::path::Path::new(&file_path).file_name().unwrap_or_default().to_string_lossy().to_string();
    let category = if name.ends_with(".json") && name.contains("options") { "game" }
                   else if name.starts_with("forge") || name.starts_with("fabric") { "mod_loader" }
                   else if name == "options.txt" { "game" }
                   else { "other" };
    Ok(Some(serde_json::json!({"filePath": file_path, "category": category, "safeToModify": category != "mod_loader"})))
}

#[tauri::command]
pub async fn launch_multiple_instances(app: tauri::AppHandle, instance_ids: Vec<String>, account: serde_json::Value) -> Result<Vec<serde_json::Value>, AppError> {
    let launcher = crate::services::minecraft_launcher::MinecraftLauncher;
    let mut results = Vec::new();
    for id in instance_ids {
        let instances_path = crate::utils::paths::instances_file();
        let instances: Vec<crate::models::instance::VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);
        if let Some(instance) = instances.iter().find(|i| i.id == id) {
            let options = crate::models::launch::LaunchOptions {
                version: instance.game_version.clone(),
                account: crate::models::account::Account {
                    id: uuid::Uuid::new_v4().to_string(),
                    account_type: "offline".to_string(),
                    username: account["username"].as_str().unwrap_or("Player").to_string(),
                    uuid: account["uuid"].as_str().unwrap_or("").to_string(),
                    access_token: None,
                    refresh_token: None,
                    expires_at: None,
                    skin_url: None,
                    avatar_url: None,
                    littleskin_server_url: None,
                    littleskin_access_token: None,
                },
                java_path: if instance.settings.java_path.is_empty() { None } else { Some(instance.settings.java_path.clone()) },
                max_memory: instance.settings.max_memory,
                min_memory: instance.settings.min_memory,
                game_dir: instance.instance_dir.clone(),
                width: Some(instance.settings.window_width),
                height: Some(instance.settings.window_height),
                fullscreen: Some(instance.settings.fullscreen),
                server: if instance.settings.launch_server.is_empty() { None } else { Some(instance.settings.launch_server.clone()) },
                jvm_args: if instance.settings.jvm_args.is_empty() { None } else { Some(instance.settings.jvm_args.clone()) },
                instance_id: Some(id.clone()),
            };
            let result = match launcher.launch(&options, &app) {
                Ok(pid) => serde_json::json!({"instanceId": id, "success": true, "pid": pid}),
                Err(e) => serde_json::json!({"instanceId": id, "success": false, "error": e.to_string()}),
            };
            results.push(result);
            tokio::time::sleep(std::time::Duration::from_millis(500)).await;
        } else {
            results.push(serde_json::json!({"instanceId": id, "success": false, "error": "实例未找到"}));
        }
    }
    Ok(results)
}

#[tauri::command]
pub fn get_instance_groups() -> Result<serde_json::Value, AppError> {
    let path = groups_file();
    if !path.exists() {
        return Ok(serde_json::json!({
            "groups": [{"id": "default", "name": "默认", "parentId": null, "sortOrder": 0, "collapsed": false}],
            "tags": [],
            "instanceGroups": {},
            "instanceTags": {},
            "instanceSortOrder": {}
        }));
    }
    let data: serde_json::Value = file_manager::load_json_or_default(&path);
    Ok(data)
}

#[tauri::command]
pub fn save_instance_groups(config: serde_json::Value) -> Result<(), AppError> {
    let path = groups_file();
    file_manager::save_json(&path, &config)
}

#[tauri::command]
pub fn create_instance_group(name: String, parent_id: Option<String>, icon: Option<String>, color: Option<String>) -> Result<serde_json::Value, AppError> {
    let mut config = get_instance_groups()?;
    let groups = config["groups"].as_array_mut().ok_or_else(|| errors::json_parse_error("Invalid groups format"))?;
    let group = serde_json::json!({
        "id": format!("group-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "name": name,
        "parentId": parent_id,
        "icon": icon,
        "color": color,
        "sortOrder": groups.len(),
        "collapsed": false
    });
    let result = group.clone();
    groups.push(group);
    save_instance_groups(config)?;
    Ok(result)
}

#[tauri::command]
pub fn update_instance_group(group_id: String, updates: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let mut config = get_instance_groups()?;
    let groups = config["groups"].as_array_mut().ok_or_else(|| errors::json_parse_error("Invalid groups format"))?;
    for group in groups.iter_mut() {
        if group["id"] == group_id {
            if let Some(map) = updates.as_object() {
                for (k, v) in map {
                    group[k.clone()] = v.clone();
                }
            }
            let result = group.clone();
            save_instance_groups(config)?;
            return Ok(result);
        }
    }
    Err(errors::internal(format!("Group {} not found", group_id)))
}

#[tauri::command]
pub fn delete_instance_group(group_id: String) -> Result<bool, AppError> {
    let mut config = get_instance_groups()?;
    if group_id == "default" { return Ok(false); }
    let groups = config["groups"].as_array_mut().ok_or_else(|| errors::json_parse_error("Invalid groups format"))?;
    groups.retain(|g| g["id"] != group_id);
    if let Some(ig) = config["instanceGroups"].as_object_mut() {
        for (_, gid) in ig.iter_mut() {
            if gid.as_str() == Some(&group_id) {
                *gid = serde_json::json!("default");
            }
        }
    }
    save_instance_groups(config)?;
    Ok(true)
}

#[tauri::command]
pub fn assign_instance_to_group(instance_id: String, group_id: String) -> Result<(), AppError> {
    let mut config = get_instance_groups()?;
    if let Some(ig) = config["instanceGroups"].as_object_mut() {
        ig.insert(instance_id, serde_json::json!(group_id));
    }
    save_instance_groups(config)?;
    Ok(())
}

#[tauri::command]
pub fn create_instance_tag(name: String, color: String) -> Result<serde_json::Value, AppError> {
    let mut config = get_instance_groups()?;
    let tags = config["tags"].as_array_mut().ok_or_else(|| errors::json_parse_error("Invalid tags format"))?;
    let tag = serde_json::json!({
        "id": format!("tag-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "name": name,
        "color": color,
        "createdAt": chrono::Utc::now().timestamp_millis()
    });
    let result = tag.clone();
    tags.push(tag);
    save_instance_groups(config)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_instance_tag(tag_id: String) -> Result<bool, AppError> {
    let mut config = get_instance_groups()?;
    if let Some(tags) = config["tags"].as_array_mut() {
        tags.retain(|t| t["id"] != tag_id);
    }
    if let Some(it) = config["instanceTags"].as_object_mut() {
        for (_, tag_ids) in it.iter_mut() {
            if let Some(arr) = tag_ids.as_array_mut() {
                arr.retain(|t| t != &tag_id);
            }
        }
    }
    save_instance_groups(config)?;
    Ok(true)
}

#[tauri::command]
pub fn assign_tag_to_instance(instance_id: String, tag_id: String) -> Result<(), AppError> {
    let mut config = get_instance_groups()?;
    if let Some(it) = config["instanceTags"].as_object_mut() {
        let entry = it.entry(instance_id.clone()).or_insert_with(|| serde_json::json!([]));
        if let Some(arr) = entry.as_array_mut() {
            if !arr.iter().any(|t| t == &tag_id) {
                arr.push(serde_json::json!(tag_id));
            }
        }
    }
    save_instance_groups(config)?;
    Ok(())
}

#[tauri::command]
pub fn remove_tag_from_instance(instance_id: String, tag_id: String) -> Result<(), AppError> {
    let mut config = get_instance_groups()?;
    if let Some(it) = config["instanceTags"].as_object_mut() {
        if let Some(entry) = it.get_mut(&instance_id) {
            if let Some(arr) = entry.as_array_mut() {
                arr.retain(|t| t != &tag_id);
            }
        }
    }
    save_instance_groups(config)?;
    Ok(())
}

#[tauri::command]
pub fn search_instances_by_tags(tag_ids: Vec<String>, match_all: bool) -> Result<Vec<String>, AppError> {
    let config = get_instance_groups()?;
    let it = config["instanceTags"].as_object().ok_or_else(|| errors::json_parse_error("Invalid instanceTags"))?;
    Ok(it.iter().filter(|(_, tags)| {
        if let Some(arr) = tags.as_array() {
            let ids: Vec<&str> = arr.iter().filter_map(|t| t.as_str()).collect();
            if match_all { tag_ids.iter().all(|tid| ids.contains(&tid.as_str())) } else { tag_ids.iter().any(|tid| ids.contains(&tid.as_str())) }
        } else { false }
    }).map(|(id, _)| id.clone()).collect())
}

#[tauri::command]
pub fn batch_assign_tag(instance_ids: Vec<String>, tag_id: String) -> Result<u32, AppError> {
    let mut config = get_instance_groups()?;
    let mut count = 0u32;
    if let Some(it) = config["instanceTags"].as_object_mut() {
        for iid in &instance_ids {
            let entry = it.entry(iid.clone()).or_insert_with(|| serde_json::json!([]));
            if let Some(arr) = entry.as_array_mut() {
                if !arr.iter().any(|t| t == &tag_id) {
                    arr.push(serde_json::json!(tag_id));
                    count += 1;
                }
            }
        }
    }
    save_instance_groups(config)?;
    Ok(count)
}

#[tauri::command]
pub fn batch_move_to_group(instance_ids: Vec<String>, group_id: String) -> Result<u32, AppError> {
    let mut config = get_instance_groups()?;
    let mut count = 0u32;
    if let Some(ig) = config["instanceGroups"].as_object_mut() {
        for iid in &instance_ids {
            ig.insert(iid.clone(), serde_json::json!(group_id));
            count += 1;
        }
    }
    save_instance_groups(config)?;
    Ok(count)
}

#[tauri::command]
pub fn get_instance_templates() -> Result<Vec<serde_json::Value>, AppError> {
    let path = templates_file();
    let data: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    Ok(data)
}

#[tauri::command]
pub fn save_instance_templates(templates: Vec<serde_json::Value>) -> Result<(), AppError> {
    let path = templates_file();
    file_manager::save_json(&path, &templates)
}

#[tauri::command]
pub fn create_instance_template(name: String, description: String, game_version: String, mod_loader: Option<String>, mod_loader_version: Option<String>, settings: serde_json::Value, mods: Vec<serde_json::Value>, shaders: Vec<serde_json::Value>, source_instance_id: Option<String>, tags: Option<Vec<String>>) -> Result<serde_json::Value, AppError> {
    let mut templates = get_instance_templates()?;
    let template = serde_json::json!({
        "id": format!("tpl-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "name": name,
        "description": description,
        "gameVersion": game_version,
        "modLoader": mod_loader,
        "modLoaderVersion": mod_loader_version,
        "settings": settings,
        "modList": mods,
        "shaderPacks": shaders,
        "createdAt": chrono::Utc::now().timestamp_millis(),
        "sourceInstanceId": source_instance_id,
        "tags": tags.unwrap_or_default()
    });
    let result = template.clone();
    templates.push(template);
    save_instance_templates(templates)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_instance_template(template_id: String) -> Result<bool, AppError> {
    let mut templates = get_instance_templates()?;
    let before = templates.len();
    templates.retain(|t| t["id"] != template_id);
    if templates.len() == before { return Ok(false); }
    save_instance_templates(templates)?;
    Ok(true)
}

#[tauri::command]
pub fn clone_instance_from_template(template_id: String, new_instance_name: String) -> Result<Option<serde_json::Value>, AppError> {
    let templates = get_instance_templates()?;
    let template = templates.iter().find(|t| t["id"] == template_id);
    match template {
        Some(t) => {
            let instance = crate::commands::instance::create_instance(
                serde_json::json!({
                    "name": new_instance_name,
                    "gameVersion": t["gameVersion"],
                    "modLoader": t["modLoader"],
                    "modLoaderVersion": t["modLoaderVersion"]
                })
            )?;
            Ok(Some(serde_json::to_value(instance)?))
        }
        None => Ok(None),
    }
}

#[tauri::command]
pub fn search_instance_templates(query: String, game_version: Option<String>, mod_loader: Option<String>, tags: Option<Vec<String>>) -> Result<Vec<serde_json::Value>, AppError> {
    let templates = get_instance_templates()?;
    let ql = query.to_lowercase();
    Ok(templates.into_iter().filter(|t| {
        if !ql.is_empty() {
            let n = t["name"].as_str().unwrap_or("").to_lowercase();
            let d = t["description"].as_str().unwrap_or("").to_lowercase();
            if !n.contains(&ql) && !d.contains(&ql) { return false; }
        }
        if let Some(ref gv) = game_version {
            if t["gameVersion"].as_str().unwrap_or("") != gv.as_str() { return false; }
        }
        if let Some(ref ml) = mod_loader {
            if t["modLoader"].as_str().unwrap_or("") != ml.as_str() { return false; }
        }
        if let Some(ref ft) = tags {
            if let Some(tt) = t["tags"].as_array() {
                let s: Vec<&str> = tt.iter().filter_map(|v| v.as_str()).collect();
                if !ft.iter().any(|f| s.contains(&f.as_str())) { return false; }
            } else { return false; }
        }
        true
    }).collect())
}

#[tauri::command]
pub fn get_version_compatibility(version: String) -> Result<serde_json::Value, AppError> {
    let v = version.as_str();
    let parts: Vec<&str> = v.split('.').collect();
    let major: Option<u32> = parts.get(1).and_then(|s| s.parse().ok());
    let minor: Option<u32> = parts.get(2).and_then(|s| s.split('-').next().and_then(|x| x.parse().ok()));
    let forge_ok = match (major, minor) {
        (Some(maj), Some(min)) if maj == 1 && min >= 6 => true,
        _ => false,
    };
    let fabric_ok = match (major, minor) {
        (Some(maj), Some(min)) if maj == 1 && min >= 14 => true,
        _ => false,
    };
    let quilt_ok = match (major, minor) {
        (Some(maj), Some(min)) if maj == 1 && min >= 14 => true,
        _ => false,
    };
    let optifine_ok = match (major, minor) {
        (Some(maj), Some(min)) if maj == 1 && min >= 7 => true,
        _ => false,
    };
    Ok(serde_json::json!({
        "version": version,
        "forge": forge_ok,
        "fabric": fabric_ok,
        "quilt": quilt_ok,
        "optifine": optifine_ok,
        "modCount": 0
    }))
}

#[tauri::command]
pub fn batch_get_version_compatibilities(versions: Vec<String>) -> Result<Vec<serde_json::Value>, AppError> {
    Ok(versions.iter().filter_map(|v| get_version_compatibility(v.clone()).ok()).collect())
}

#[tauri::command]
pub fn get_version_diff(from_version: String, to_version: String) -> Result<serde_json::Value, AppError> {
    let parse_mc = |v: &str| -> (Option<u32>, Option<u32>) {
        let parts: Vec<&str> = v.split('.').collect();
        let major = parts.get(1).and_then(|s| s.parse().ok());
        let minor = parts.get(2).and_then(|s| s.split('-').next().and_then(|x| x.parse().ok()));
        (major, minor)
    };
    let (_from_maj, from_min) = parse_mc(&from_version);
    let (_to_maj, to_min) = parse_mc(&to_version);
    let mut changes = Vec::new();
    let mut breaking = Vec::new();
    if let (Some(f), Some(t)) = (from_min, to_min) {
        if t > f {
            changes.push(serde_json::json!({"type": "minor_update", "description": format!("从 1.{}.x 升级到 1.{}.x", f, t)}));
            if t - f >= 4 {
                breaking.push(serde_json::json!({"type": "major_gap", "description": "跨越大版本，模组兼容性可能受影响"}));
            }
        }
        if t < f {
            changes.push(serde_json::json!({"type": "downgrade", "description": format!("从 1.{}.x 降级到 1.{}.x", f, t)}));
            breaking.push(serde_json::json!({"type": "world_incompatibility", "description": "降级可能导致存档不兼容"}));
        }
    }
    Ok(serde_json::json!({
        "from": from_version,
        "to": to_version,
        "changes": changes,
        "breakingChanges": breaking
    }))
}

#[tauri::command]
pub fn create_instance_snapshot(instance_id: String, name: String, description: String) -> Result<Option<serde_json::Value>, AppError> {
    let dir = snapshots_dir();
    let path = dir.join(format!("{}.json", instance_id));
    let mut snapshots: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);

    let game_dir = find_instance_dir(&instance_id);
    let (mod_list, config_files, settings, size_bytes) = match &game_dir {
        Some(gd) => {
            let mods = scan_mods(gd);
            let configs = scan_configs(gd);
            let opts = scan_options_txt(gd);
            let size = calc_dir_size(gd);
            (mods, configs, opts, size)
        }
        None => (Vec::new(), Vec::new(), serde_json::json!({}), 0u64),
    };

    let instances: Vec<serde_json::Value> = file_manager::load_json_or_default(&paths::instances_file());
    let instance_info = instances.iter().find(|i| i["id"].as_str() == Some(&instance_id));
    let game_version = instance_info.and_then(|i| i["gameVersion"].as_str()).unwrap_or("").to_string();
    let mod_loader = instance_info.and_then(|i| i["modLoader"].as_str()).map(String::from);
    let mod_loader_version = instance_info.and_then(|i| i["modLoaderVersion"].as_str()).map(String::from);

    let snapshot = serde_json::json!({
        "id": format!("snap-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "instanceId": instance_id,
        "name": name,
        "description": description,
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "modList": mod_list,
        "configFiles": config_files,
        "settings": settings,
        "gameVersion": game_version,
        "modLoader": mod_loader,
        "modLoaderVersion": mod_loader_version,
        "sizeBytes": size_bytes
    });
    let result = snapshot.clone();
    snapshots.push(snapshot);
    if snapshots.len() > 50 { snapshots = snapshots.split_off(snapshots.len() - 50); }
    file_manager::save_json(&path, &snapshots)?;
    Ok(Some(result))
}

#[tauri::command]
pub fn list_instance_snapshots(instance_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let path = snapshots_dir().join(format!("{}.json", instance_id));
    if !path.exists() { return Ok(Vec::new()); }
    let snapshots: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    Ok(snapshots)
}

#[tauri::command]
pub fn delete_instance_snapshot(instance_id: String, snapshot_id: String) -> Result<bool, AppError> {
    let path = snapshots_dir().join(format!("{}.json", instance_id));
    let mut snapshots: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    let before = snapshots.len();
    snapshots.retain(|s| s["id"] != snapshot_id);
    if snapshots.len() == before { return Ok(false); }
    file_manager::save_json(&path, &snapshots)?;
    Ok(true)
}

#[tauri::command]
pub fn restore_instance_snapshot(instance_id: String, snapshot_id: String) -> Result<serde_json::Value, AppError> {
    let path = snapshots_dir().join(format!("{}.json", instance_id));
    let snapshots: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    let snapshot = snapshots.iter().find(|s| s["id"] == snapshot_id)
        .ok_or_else(|| errors::internal(format!("Snapshot {} not found", snapshot_id)))?;

    let game_dir = find_instance_dir(&instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;

    let snapshot_mods: Vec<String> = snapshot["modList"].as_array()
        .map(|arr| arr.iter().filter_map(|m| m["fileName"].as_str().map(String::from)).collect())
        .unwrap_or_default();

    let current_mods = scan_mods(&game_dir);
    let current_mod_names: Vec<String> = current_mods.iter()
        .filter_map(|m| m["fileName"].as_str().map(String::from))
        .collect();

    let mods_to_remove: Vec<&String> = current_mod_names.iter()
        .filter(|n| !snapshot_mods.contains(n))
        .collect();

    for mod_name in &mods_to_remove {
        let mod_path = game_dir.join("mods").join(mod_name);
        if mod_path.exists() {
            let _ = std::fs::remove_file(&mod_path);
        }
    }

    let snapshot_configs: Vec<String> = snapshot["configFiles"].as_array()
        .map(|arr| arr.iter().filter_map(|c| c["relativePath"].as_str().or_else(|| c["fileName"].as_str()).map(String::from)).collect())
        .unwrap_or_default();

    let current_configs = scan_configs(&game_dir);
    let current_config_names: Vec<String> = current_configs.iter()
        .filter_map(|c| c["relativePath"].as_str().or_else(|| c["fileName"].as_str()).map(String::from))
        .collect();

    let configs_to_remove: Vec<&String> = current_config_names.iter()
        .filter(|n| !snapshot_configs.contains(n))
        .collect();

    for cfg_name in &configs_to_remove {
        let cfg_path = game_dir.join("config").join(cfg_name);
        if cfg_path.exists() {
            let _ = std::fs::remove_file(&cfg_path);
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "message": format!("已回滚到快照 {}", snapshot_id),
        "modsRemoved": mods_to_remove.len(),
        "configsRemoved": configs_to_remove.len()
    }))
}

#[tauri::command]
pub fn diff_instance_snapshot(instance_id: String, snapshot_id: String) -> Result<serde_json::Value, AppError> {
    let path = snapshots_dir().join(format!("{}.json", instance_id));
    let snapshots: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    let snapshot = snapshots.iter().find(|s| s["id"] == snapshot_id)
        .ok_or_else(|| errors::internal(format!("Snapshot {} not found", snapshot_id)))?;

    let game_dir = find_instance_dir(&instance_id);

    let snap_mods: Vec<serde_json::Value> = snapshot["modList"].as_array()
        .map(|a| a.clone())
        .unwrap_or_default();
    let snap_mod_names: Vec<String> = snap_mods.iter()
        .filter_map(|m| m["fileName"].as_str().map(String::from))
        .collect();

    let current_mods = match &game_dir {
        Some(gd) => scan_mods(gd),
        None => Vec::new(),
    };
    let current_mod_names: Vec<String> = current_mods.iter()
        .filter_map(|m| m["fileName"].as_str().map(String::from))
        .collect();

    let added: Vec<&String> = current_mod_names.iter().filter(|n| !snap_mod_names.contains(n)).collect();
    let removed: Vec<&String> = snap_mod_names.iter().filter(|n| !current_mod_names.contains(n)).collect();

    let mut changed = Vec::new();
    for snap_mod in &snap_mods {
        if let Some(name) = snap_mod["fileName"].as_str() {
            if let Some(cur) = current_mods.iter().find(|m| m["fileName"].as_str() == Some(name)) {
                if snap_mod["hash"].as_str() != cur["hash"].as_str() {
                    changed.push(serde_json::json!({
                        "fileName": name,
                        "snapshotHash": snap_mod["hash"],
                        "currentHash": cur["hash"]
                    }));
                }
            }
        }
    }

    Ok(serde_json::json!({
        "addedMods": added,
        "removedMods": removed,
        "changedMods": changed,
        "totalDiff": added.len() + removed.len() + changed.len()
    }))
}

#[tauri::command]
pub fn export_instance(instance_dir: String, name: String, description: String, game_version: Option<String>, author: String, mod_loader: Option<String>, mod_loader_version: Option<String>, source_instance_id: Option<String>, tags: Vec<String>) -> Result<serde_json::Value, AppError> {
    let game_dir = std::path::PathBuf::from(&instance_dir);
    let raw_mods = scan_mods(&game_dir);
    let mods: Vec<serde_json::Value> = raw_mods.into_iter().map(|m| {
        let mut pkg_mod = serde_json::json!({
            "fileName": m["fileName"],
            "source": "local",
            "hash": m["hash"],
            "size": m["size"]
        });
        if let Some(enabled) = m["enabled"].as_bool() {
            if !enabled {
                pkg_mod["disabled"] = serde_json::json!(true);
            }
        }
        pkg_mod
    }).collect();
    let configs = scan_configs_with_content(&game_dir);

    let mut shader_packs = Vec::new();
    let shaderpacks_dir = game_dir.join("shaderpacks");
    if shaderpacks_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&shaderpacks_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if path.is_file() {
                    shader_packs.push(serde_json::json!({"name": file_name, "fileName": file_name, "source": "local"}));
                }
            }
        }
    }

    let settings = scan_options_txt(&game_dir);

    Ok(serde_json::json!({
        "formatVersion": 1,
        "metadata": {"name": name, "description": description, "gameVersion": game_version, "modLoader": mod_loader, "modLoaderVersion": mod_loader_version, "author": author, "createdAt": chrono::Utc::now().timestamp_millis(), "sourceInstanceId": source_instance_id, "tags": tags},
        "mods": mods,
        "configs": configs,
        "shaderPacks": shader_packs,
        "settings": settings
    }))
}

#[tauri::command]
pub fn import_instance(pkg: serde_json::Value, target_dir: String) -> Result<serde_json::Value, AppError> {
    let target = std::path::PathBuf::from(&target_dir);
    file_manager::ensure_dir(&target)?;

    let mut mods_installed: u32 = 0;
    let mut configs_restored: u32 = 0;
    let mut shaders_installed: u32 = 0;

    if let Some(mods) = pkg["mods"].as_array() {
        let mods_dir = target.join("mods");
        file_manager::ensure_dir(&mods_dir)?;
        for m in mods {
            if let Some(file_name) = m["fileName"].as_str() {
                let dest = mods_dir.join(file_name);
                if !dest.exists() {
                    if let Some(content_b64) = m["content"].as_str() {
                        if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content_b64) {
                            if std::fs::write(&dest, &bytes).is_ok() {
                                mods_installed += 1;
                            }
                        }
                    } else if let Some(source_path) = m["sourcePath"].as_str() {
                        let src = std::path::Path::new(source_path);
                        if src.exists() && std::fs::copy(src, &dest).is_ok() {
                            mods_installed += 1;
                        }
                    }
                }
            }
        }
    }

    if let Some(configs) = pkg["configs"].as_array() {
        let config_dir = target.join("config");
        let _ = file_manager::ensure_dir(&config_dir);
        for c in configs {
            if let Some(relative_path) = c["relativePath"].as_str().or_else(|| c["fileName"].as_str()) {
                let clean_path = relative_path.trim_start_matches("config/");
                let dest = config_dir.join(clean_path);
                if !dest.exists() {
                    if let Some(content_b64) = c["content"].as_str() {
                        if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content_b64) {
                            if let Some(parent) = dest.parent() {
                                let _ = std::fs::create_dir_all(parent);
                            }
                            if std::fs::write(&dest, &bytes).is_ok() {
                                configs_restored += 1;
                            }
                        }
                    } else if let Some(content) = c["content"].as_str() {
                        if let Some(parent) = dest.parent() {
                            let _ = std::fs::create_dir_all(parent);
                        }
                        if std::fs::write(&dest, content).is_ok() {
                            configs_restored += 1;
                        }
                    }
                }
            }
        }
    }

    if let Some(shader_packs) = pkg["shaderPacks"].as_array() {
        let shaderpacks_dir = target.join("shaderpacks");
        file_manager::ensure_dir(&shaderpacks_dir)?;
        for sp in shader_packs {
            if let Some(file_name) = sp["fileName"].as_str() {
                let dest = shaderpacks_dir.join(file_name);
                if !dest.exists() {
                    if let Some(content_b64) = sp["content"].as_str() {
                        if let Ok(bytes) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, content_b64) {
                            if std::fs::write(&dest, &bytes).is_ok() {
                                shaders_installed += 1;
                            }
                        }
                    }
                }
            }
        }
    }

    if let Some(settings) = pkg["settings"].as_object() {
        let options_path = target.join("options.txt");
        if !options_path.exists() {
            let mut content = String::new();
            for (key, value) in settings {
                content.push_str(&format!("{}:{}\n", key, value.as_str().unwrap_or("")));
            }
            let _ = std::fs::write(&options_path, content);
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "message": "导入完成",
        "modsInstalled": mods_installed,
        "configsRestored": configs_restored,
        "shadersInstalled": shaders_installed
    }))
}

#[tauri::command]
pub fn export_instance_as_zip(instance_dir: String, name: String, description: String, game_version: Option<String>, author: String, mod_loader: Option<String>, mod_loader_version: Option<String>, source_instance_id: Option<String>, tags: Vec<String>) -> Result<String, AppError> {
    let pkg_json = export_instance(instance_dir.clone(), name.clone(), description, game_version, author, mod_loader, mod_loader_version, source_instance_id, tags.clone())?;
    let export_dir = paths::config_dir().join("exports");
    file_manager::ensure_dir(&export_dir)?;
    let safe_name: String = name.chars().map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' }).collect();
    let zip_path = export_dir.join(format!("{}.bonjour-pkg", safe_name));
    let game_dir = std::path::PathBuf::from(&instance_dir);
    let file = std::fs::File::create(&zip_path)?;
    let mut zw = zip::ZipWriter::new(file);
    let opts = zip::write::SimpleFileOptions::default().compression_method(zip::CompressionMethod::Deflated);
    let ps = serde_json::to_string_pretty(&pkg_json)?;
    zw.start_file("package.json", opts)?;
    IoWrite::write_all(&mut zw, ps.as_bytes())?;

    let md = game_dir.join("mods");
    if md.exists() {
        if let Ok(entries) = std::fs::read_dir(&md) {
            for e in entries.flatten() {
                let p = e.path();
                let n = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                if n.ends_with(".jar") && p.is_file() {
                    zw.start_file(format!("mods/{}", n), opts)?;
                    let d = std::fs::read(&p)?;
                    IoWrite::write_all(&mut zw, &d)?;
                }
            }
        }
    }

    let cd = game_dir.join("config");
    if cd.exists() {
        if let Ok(entries) = std::fs::read_dir(&cd) {
            for e in entries.flatten() {
                let p = e.path();
                let n = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                if p.is_file() {
                    zw.start_file(format!("config/{}", n), opts)?;
                    let d = std::fs::read(&p)?;
                    IoWrite::write_all(&mut zw, &d)?;
                }
            }
        }
    }

    let sd = game_dir.join("shaderpacks");
    if sd.exists() {
        if let Ok(entries) = std::fs::read_dir(&sd) {
            for e in entries.flatten() {
                let p = e.path();
                let n = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                if p.is_file() {
                    zw.start_file(format!("shaderpacks/{}", n), opts)?;
                    let d = std::fs::read(&p)?;
                    IoWrite::write_all(&mut zw, &d)?;
                }
            }
        }
    }

    let opt_file = game_dir.join("options.txt");
    if opt_file.exists() {
        if let Ok(data) = std::fs::read(&opt_file) {
            zw.start_file("options.txt", opts)?;
            IoWrite::write_all(&mut zw, &data)?;
        }
    }

    zw.finish()?;
    Ok(zip_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn import_instance_from_zip(zip_path: String, target_dir: String) -> Result<serde_json::Value, AppError> {
    let p = std::path::PathBuf::from(&zip_path);
    if !p.exists() {
        return Err(errors::file_not_found(&p));
    }
    let file = std::fs::File::open(&p)?;
    let mut archive = zip::ZipArchive::new(file)?;
    let mut mi: u32 = 0;
    let mut cr: u32 = 0;
    let mut si: u32 = 0;
    let target = std::path::PathBuf::from(&target_dir);
    file_manager::ensure_dir(&target)?;

    for i in 0..archive.len() {
        let mut f = archive.by_index(i)?;
        let op = match f.enclosed_name() {
            Some(p) => target.join(p),
            None => continue,
        };
        if f.name().ends_with('/') {
            file_manager::ensure_dir(&op)?;
        } else {
            if let Some(parent) = op.parent() {
                file_manager::ensure_dir(parent)?;
            }
            let mut of = std::fs::File::create(&op)?;
            std::io::copy(&mut f, &mut of)?;
            let n = f.name().to_string();
            if n.starts_with("mods/") { mi += 1; }
            else if n.starts_with("config/") { cr += 1; }
            else if n.starts_with("shaderpacks/") { si += 1; }
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "message": "导入完成",
        "modsInstalled": mi,
        "configsRestored": cr,
        "shadersInstalled": si
    }))
}

#[tauri::command]
pub fn analyze_instance_storage(instance_dir: String, instance_id: String) -> Result<serde_json::Value, AppError> {
    let game_dir = std::path::PathBuf::from(&instance_dir);
    let calc = |sub: &str| -> u64 {
        let dir = game_dir.join(sub);
        calc_dir_size(&dir)
    };
    let mods = calc("mods");
    let saves = calc("saves");
    let logs = calc("logs");
    let config = calc("config");
    let resourcepacks = calc("resourcepacks");
    let shaderpacks = calc("shaderpacks");
    let versions = calc("versions");
    let libraries = calc("libraries");
    let assets = calc("assets");
    let crash_reports = calc("crash-reports");
    let screenshots = calc("screenshots");
    let datapacks = calc("datapacks");
    let total = mods + saves + logs + config + resourcepacks + shaderpacks + versions + libraries + assets + crash_reports + screenshots + datapacks;

    let mut safe_to_clean = Vec::new();
    let mut cleanable_size: u64 = 0;

    let logs_dir = game_dir.join("logs");
    if logs_dir.exists() {
        let log_size = calc_dir_size(&logs_dir);
        if log_size > 10 * 1024 * 1024 {
            cleanable_size += log_size;
            safe_to_clean.push(serde_json::json!({
                "path": "logs",
                "size": log_size,
                "category": "old_log",
                "description": "日志文件",
                "safeToDelete": true
            }));
        }
    }
    let crash_reports_dir = game_dir.join("crash-reports");
    if crash_reports_dir.exists() {
        let crash_size = calc_dir_size(&crash_reports_dir);
        if crash_size > 0 {
            cleanable_size += crash_size;
            safe_to_clean.push(serde_json::json!({
                "path": "crash-reports",
                "size": crash_size,
                "category": "crash_report",
                "description": "崩溃报告",
                "safeToDelete": true
            }));
        }
    }

    Ok(serde_json::json!({
        "instanceId": instance_id,
        "totalSize": total,
        "versions": versions,
        "libraries": libraries,
        "assets": assets,
        "mods": mods,
        "saves": saves,
        "logs": logs,
        "config": config,
        "resourcepacks": resourcepacks,
        "shaderpacks": shaderpacks,
        "crashReports": crash_reports,
        "screenshots": screenshots,
        "datapacks": datapacks,
        "other": 0,
        "cleanableSize": cleanable_size,
        "safeToClean": safe_to_clean
    }))
}

#[tauri::command]
pub fn clean_instance_storage(instance_id: String, categories: Vec<String>) -> Result<serde_json::Value, AppError> {
    let game_dir = find_instance_dir(&instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;

    let mut cleaned_bytes: u64 = 0;
    let mut cleaned_items: u32 = 0;

    for cat in &categories {
        let dir = game_dir.join(cat);
        if !dir.exists() { continue; }
        match cat.as_str() {
            "logs" | "crash-reports" => {
                let size_before = calc_dir_size(&dir);
                if let Ok(entries) = std::fs::read_dir(&dir) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        if p.is_file() {
                            let _ = std::fs::remove_file(&p);
                            cleaned_items += 1;
                        }
                    }
                }
                cleaned_bytes += size_before;
            }
            "resourcepacks" | "shaderpacks" => {
                if let Ok(entries) = std::fs::read_dir(&dir) {
                    for entry in entries.flatten() {
                        let p = entry.path();
                        if p.is_file() {
                            if let Ok(meta) = p.metadata() {
                                cleaned_bytes += meta.len();
                            }
                            let _ = std::fs::remove_file(&p);
                            cleaned_items += 1;
                        }
                    }
                }
            }
            _ => {}
        }
    }

    Ok(serde_json::json!({
        "success": true,
        "cleanedBytes": cleaned_bytes,
        "cleanedItems": cleaned_items,
        "message": format!("清理完成，释放了 {} 字节", cleaned_bytes)
    }))
}

#[tauri::command]
pub fn check_instance_health(game_dir: String) -> Result<serde_json::Value, AppError> {
    let dir = std::path::PathBuf::from(&game_dir);
    let mut issues = Vec::new();
    let mut total_files: u32 = 0;
    let mut total_size: u64 = 0;

    if dir.exists() {
        total_size = calc_dir_size(&dir);
    }

    let versions_dir = dir.join("versions");
    if versions_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&versions_dir) {
            for entry in entries.flatten() {
                let v_dir = entry.path();
                if !v_dir.is_dir() { continue; }
                total_files += 1;
                let name = v_dir.file_name().unwrap_or_default().to_string_lossy().to_string();
                let json_path = v_dir.join(format!("{}.json", name));
                if !json_path.exists() {
                    issues.push(serde_json::json!({
                        "id": format!("missing-json-{}", name),
                        "severity": "error",
                        "category": "missing",
                        "path": format!("versions/{}/{}.json", name, name),
                        "description": format!("版本 {} 缺少版本 JSON 文件", name),
                        "suggestion": "删除孤立版本目录或重新下载版本",
                        "autoFixable": true,
                        "fixAction": "delete_orphan"
                    }));
                } else {
                    if let Ok(content) = std::fs::read_to_string(&json_path) {
                        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                            if json["id"].is_null() {
                                issues.push(serde_json::json!({
                                    "id": format!("invalid-json-{}", name),
                                    "severity": "warning",
                                    "category": "corrupted",
                                    "path": format!("versions/{}/{}.json", name, name),
                                    "description": format!("版本 {} JSON 缺少 id 字段", name),
                                    "suggestion": "重新下载该版本",
                                    "autoFixable": true,
                                    "fixAction": "reparse"
                                }));
                            }
                        } else {
                            issues.push(serde_json::json!({
                                "id": format!("corrupt-json-{}", name),
                                "severity": "error",
                                "category": "corrupted",
                                "path": format!("versions/{}/{}.json", name, name),
                                "description": format!("版本 {} JSON 格式损坏", name),
                                "suggestion": "删除损坏文件并重新下载",
                                "autoFixable": true,
                                "fixAction": "delete_corrupt"
                            }));
                        }
                    }
                }
            }
        }
    }

    let mods_dir = dir.join("mods");
    if mods_dir.exists() {
        if let Ok(entries) = std::fs::read_dir(&mods_dir) {
            for entry in entries.flatten() {
                let p = entry.path();
                let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                total_files += 1;
                if name.ends_with(".jar") && p.is_file() {
                    if let Ok(meta) = p.metadata() {
                        if meta.len() == 0 {
                            issues.push(serde_json::json!({
                                "id": format!("empty-mod-{}", name),
                                "severity": "warning",
                                "category": "corrupted",
                                "path": format!("mods/{}", name),
                                "description": format!("模组 {} 文件为空", name),
                                "suggestion": "删除空文件并重新下载模组",
                                "autoFixable": true,
                                "fixAction": "delete_empty"
                            }));
                        }
                    }
                }
            }
        }
    }

    let logs_dir = dir.join("logs");
    if logs_dir.exists() {
        let log_size = calc_dir_size(&logs_dir);
        if log_size > 100 * 1024 * 1024 {
            issues.push(serde_json::json!({
                "id": "logs-oversized",
                "severity": "info",
                "category": "oversized",
                "path": "logs",
                "description": format!("日志目录过大 ({}MB)", log_size / 1024 / 1024),
                "suggestion": "清理旧日志文件释放空间",
                "autoFixable": true,
                "fixAction": "clean_logs",
                "size": log_size
            }));
        }
    }

    let error_count = issues.iter().filter(|i| i["severity"] == "error").count() as u32;
    let warning_count = issues.iter().filter(|i| i["severity"] == "warning").count() as u32;
    let auto_fixable_count = issues.iter().filter(|i| i["autoFixable"].as_bool().unwrap_or(false)).count() as u32;
    let score = 100 - issues.iter().map(|i| match i["severity"].as_str() {
        Some("error") => 15,
        Some("warning") => 8,
        _ => 3,
    }).sum::<i32>();

    Ok(serde_json::json!({
        "timestamp": chrono::Utc::now().timestamp_millis(),
        "gameDir": game_dir,
        "totalFiles": total_files,
        "totalSize": total_size,
        "issues": issues,
        "score": score.max(0),
        "errorCount": error_count,
        "warningCount": warning_count,
        "autoFixableCount": auto_fixable_count
    }))
}

#[tauri::command]
pub fn get_instance_dashboard(instance_dir: String, instance_id: String) -> Result<serde_json::Value, AppError> {
    let game_dir = std::path::PathBuf::from(&instance_dir);

    let dashboard_path = instance_dashboard_file(&instance_id);
    let mut dashboard: serde_json::Value = if dashboard_path.exists() {
        file_manager::load_json_or_default(&dashboard_path)
    } else {
        serde_json::json!({})
    };

    let saves_dir = game_dir.join("saves");
    let save_count = if saves_dir.exists() {
        std::fs::read_dir(&saves_dir).map(|e| e.filter(|e| e.as_ref().map(|e| e.path().is_dir()).unwrap_or(false)).count()).unwrap_or(0) as u32
    } else {
        0
    };

    let mods = scan_mods(&game_dir);

    let total_play_time: u64 = dashboard["totalPlayTime"].as_u64().unwrap_or(0);
    let last_played_at = dashboard["lastPlayedAt"].as_u64().unwrap_or(0);
    let created_at = dashboard["createdAt"].as_u64().unwrap_or(0);
    let deaths: u64 = dashboard["deaths"].as_u64().unwrap_or(0);
    let mod_change_history = dashboard["modChangeHistory"].as_array().cloned().unwrap_or_default();
    let server_visit_count = dashboard["serverVisitCount"].as_u64().unwrap_or(0);

    let screenshots_dir = game_dir.join("screenshots");
    let screenshot_count = if screenshots_dir.exists() {
        std::fs::read_dir(&screenshots_dir).map(|e| e.filter(|e| e.as_ref().map(|e| e.path().is_file()).unwrap_or(false)).count()).unwrap_or(0) as u32
    } else {
        0
    };

    let crash_dir = game_dir.join("crash-reports");
    let crash_count = if crash_dir.exists() {
        std::fs::read_dir(&crash_dir).map(|e| e.filter(|e| e.as_ref().map(|e| e.path().is_file()).unwrap_or(false)).count()).unwrap_or(0) as u32
    } else {
        0
    };

    let instances: Vec<serde_json::Value> = file_manager::load_json_or_default(&paths::instances_file());
    let instance_created: u64 = instances.iter()
        .find(|i| i["id"].as_str() == Some(&instance_id))
        .and_then(|i| i["createdAt"].as_str())
        .and_then(|s| chrono::DateTime::parse_from_rfc3339(s).ok())
        .map(|dt| dt.timestamp_millis() as u64)
        .unwrap_or(0);

    Ok(serde_json::json!({
        "instanceId": instance_id,
        "totalPlayTime": total_play_time,
        "saveCount": save_count,
        "modCount": mods.len() as u32,
        "screenshotCount": screenshot_count,
        "crashCount": crash_count,
        "serverVisitCount": server_visit_count,
        "modChangeHistory": mod_change_history,
        "lastPlayedAt": if last_played_at > 0 { Some(chrono::DateTime::from_timestamp_millis(last_played_at as i64).map(|dt| dt.to_rfc3339()).unwrap_or_default()) } else { None },
        "createdAt": if created_at > 0 { serde_json::Value::String(chrono::DateTime::from_timestamp_millis(created_at as i64).map(|dt| dt.to_rfc3339()).unwrap_or_default()) } else if instance_created > 0 { serde_json::Value::String(chrono::DateTime::from_timestamp_millis(instance_created as i64).map(|dt| dt.to_rfc3339()).unwrap_or_default()) } else { serde_json::Value::Null },
        "achievementsProgress": 0,
        "deaths": deaths
    }))
}

#[tauri::command]
pub fn record_play_time(instance_id: String, duration_ms: u64) -> Result<(), AppError> {
    let dashboard_path = instance_dashboard_file(&instance_id);
    let mut dashboard: serde_json::Value = if dashboard_path.exists() {
        file_manager::load_json_or_default(&dashboard_path)
    } else {
        serde_json::json!({"instanceId": instance_id, "totalPlayTime": 0, "modChangeHistory": [], "serverVisitCount": 0, "deaths": 0})
    };

    let current = dashboard["totalPlayTime"].as_u64().unwrap_or(0);
    dashboard["totalPlayTime"] = serde_json::json!(current + duration_ms);
    dashboard["lastPlayedAt"] = serde_json::json!(chrono::Utc::now().timestamp_millis());

    file_manager::save_json(&dashboard_path, &dashboard)?;

    let instances_path = paths::instances_file();
    let mut instances: Vec<serde_json::Value> = file_manager::load_json_or_default(&instances_path);
    for inst in instances.iter_mut() {
        if inst["id"].as_str() == Some(&instance_id) {
            let current_total = inst["totalTime"].as_u64().unwrap_or(0);
            inst["totalTime"] = serde_json::json!(current_total + duration_ms);
            inst["lastPlayedAt"] = serde_json::json!(chrono::Utc::now().to_rfc3339());
            break;
        }
    }
    file_manager::save_json(&instances_path, &instances)?;

    Ok(())
}

#[tauri::command]
pub fn record_mod_change(instance_id: String, action: String, mod_name: String, file_name: String) -> Result<(), AppError> {
    let dashboard_path = instance_dashboard_file(&instance_id);
    let mut dashboard: serde_json::Value = if dashboard_path.exists() {
        file_manager::load_json_or_default(&dashboard_path)
    } else {
        serde_json::json!({"instanceId": instance_id, "totalPlayTime": 0, "modChangeHistory": [], "serverVisitCount": 0, "deaths": 0})
    };

    let history = dashboard["modChangeHistory"].as_array_mut()
        .ok_or_else(|| errors::json_parse_error("Invalid modChangeHistory"))?;

    history.push(serde_json::json!({
        "action": action,
        "modName": mod_name,
        "fileName": file_name,
        "timestamp": chrono::Utc::now().timestamp_millis()
    }));

    if history.len() > 200 {
        *history = history.split_off(history.len() - 200);
    }

    file_manager::save_json(&dashboard_path, &dashboard)?;
    Ok(())
}

#[tauri::command]
pub fn get_version_migration_guide(current_version: String, target_version: String, current_mod_count: u32) -> Result<serde_json::Value, AppError> {
    let parse_mc = |v: &str| -> (Option<u32>, Option<u32>) {
        let parts: Vec<&str> = v.split('.').collect();
        let major = parts.get(1).and_then(|s| s.parse().ok());
        let minor = parts.get(2).and_then(|s| s.split('-').next().and_then(|x| x.parse().ok()));
        (major, minor)
    };

    let (_from_maj, from_min) = parse_mc(&current_version);
    let (_to_maj, to_min) = parse_mc(&target_version);

    let is_upgrade = match (from_min, to_min) {
        (Some(f), Some(t)) => t > f,
        _ => false,
    };
    let is_downgrade = match (from_min, to_min) {
        (Some(f), Some(t)) => t < f,
        _ => false,
    };
    let gap = match (from_min, to_min) {
        (Some(f), Some(t)) if t >= f => Some(t - f),
        _ => None,
    };

    let difficulty = match gap {
        Some(g) if g <= 1 => "easy",
        Some(g) if g <= 4 => "medium",
        Some(_) => "hard",
        None if is_downgrade => "hard",
        None => "medium",
    };

    let mut steps = Vec::new();
    steps.push(serde_json::json!({"order": 1, "title": "备份当前实例", "description": "创建完整快照备份", "action": "backup"}));

    if is_upgrade {
        steps.push(serde_json::json!({"order": 2, "title": "检查模组兼容性", "description": format!("检查 {} 个模组是否支持目标版本", current_mod_count), "action": "check_compatibility"}));
        if current_mod_count > 50 {
            steps.push(serde_json::json!({"order": 3, "title": "分批更新模组", "description": "建议先更新核心模组，再更新辅助模组", "action": "batch_update_mods"}));
        }
        steps.push(serde_json::json!({"order": steps.len() as u32 + 1, "title": "安装目标版本", "description": format!("下载并安装 {}", target_version), "action": "install_version"}));
        steps.push(serde_json::json!({"order": steps.len() as u32 + 1, "title": "测试启动", "description": "启动游戏确认正常运行", "action": "test_launch"}));
    } else if is_downgrade {
        steps.push(serde_json::json!({"order": 2, "title": "警告：降级风险", "description": "降级可能导致存档不兼容和模组失效", "action": "warn_downgrade"}));
        steps.push(serde_json::json!({"order": 3, "title": "备份存档", "description": "单独备份所有存档文件", "action": "backup_saves"}));
        steps.push(serde_json::json!({"order": steps.len() as u32 + 1, "title": "移除不兼容模组", "description": "移除目标版本不支持的模组", "action": "remove_incompatible_mods"}));
        steps.push(serde_json::json!({"order": steps.len() as u32 + 1, "title": "安装目标版本", "description": format!("下载并安装 {}", target_version), "action": "install_version"}));
        steps.push(serde_json::json!({"order": steps.len() as u32 + 1, "title": "测试启动", "description": "启动游戏确认正常运行", "action": "test_launch"}));
    } else {
        steps.push(serde_json::json!({"order": 2, "title": "安装目标版本", "description": format!("下载并安装 {}", target_version), "action": "install_version"}));
        steps.push(serde_json::json!({"order": 3, "title": "测试启动", "description": "启动游戏确认正常运行", "action": "test_launch"}));
    }

    Ok(serde_json::json!({
        "currentVersion": current_version,
        "targetVersion": target_version,
        "modCoverage": 0,
        "targetModCoverage": 0,
        "migrationDifficulty": difficulty,
        "steps": steps,
        "incompatibleMods": [],
        "missingMods": [],
        "estimatedTimeMinutes": match difficulty {
            "easy" => 5,
            "medium" => 15,
            _ => 30,
        },
        "riskLevel": match difficulty {
            "easy" => "low",
            "medium" => "medium",
            _ => "high",
        }
    }))
}

#[tauri::command]
pub fn run_health_check() -> Result<serde_json::Value, AppError> {
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&paths::settings_file());
    let game_dir = paths::detect_game_root(&settings.game_dir);
    check_instance_health(game_dir)
}

#[tauri::command]
pub fn auto_fix_health_issues(game_dir: String, issue_ids: Option<Vec<String>>) -> Result<serde_json::Value, AppError> {
    let health = check_instance_health(game_dir.clone())?;
    let issues = health["issues"].as_array().cloned().unwrap_or_default();

    let target_ids: Option<&Vec<String>> = issue_ids.as_ref();
    let mut fixed = 0u32;
    let mut failed = 0u32;
    let mut fix_details = Vec::new();

    for issue in &issues {
        if let Some(ids) = target_ids {
            if let Some(id) = issue["id"].as_str() {
                if !ids.contains(&id.to_string()) { continue; }
            }
        }

        let auto_fixable = issue["autoFixable"].as_bool().unwrap_or(false);
        if !auto_fixable { continue; }

        let fix_action = issue["fixAction"].as_str().unwrap_or("");
        let issue_id = issue["id"].as_str().unwrap_or("").to_string();
        let dir = std::path::PathBuf::from(&game_dir);

        let result = match fix_action {
            "delete_orphan" => {
                let version_name = issue_id.strip_prefix("missing-json-").unwrap_or("");
                let v_dir = dir.join("versions").join(version_name);
                if v_dir.exists() {
                    match std::fs::remove_dir_all(&v_dir) {
                        Ok(_) => format!("已删除孤立版本目录: {}", version_name),
                        Err(e) => { failed += 1; fix_details.push(serde_json::json!({"issueId": issue_id, "success": false, "error": e.to_string()})); continue; }
                    }
                } else {
                    "目录不存在，跳过".to_string()
                }
            }
            "delete_corrupt" => {
                let version_name = issue_id.strip_prefix("corrupt-json-").unwrap_or("");
                let json_path = dir.join("versions").join(version_name).join(format!("{}.json", version_name));
                if json_path.exists() {
                    match std::fs::remove_file(&json_path) {
                        Ok(_) => format!("已删除损坏的 JSON: {}", version_name),
                        Err(e) => { failed += 1; fix_details.push(serde_json::json!({"issueId": issue_id, "success": false, "error": e.to_string()})); continue; }
                    }
                } else {
                    "文件不存在，跳过".to_string()
                }
            }
            "delete_empty" => {
                let mod_name = issue_id.strip_prefix("empty-mod-").unwrap_or("");
                let mod_path = dir.join("mods").join(mod_name);
                if mod_path.exists() {
                    match std::fs::remove_file(&mod_path) {
                        Ok(_) => format!("已删除空模组: {}", mod_name),
                        Err(e) => { failed += 1; fix_details.push(serde_json::json!({"issueId": issue_id, "success": false, "error": e.to_string()})); continue; }
                    }
                } else {
                    "文件不存在，跳过".to_string()
                }
            }
            "clean_logs" => {
                let logs_dir = dir.join("logs");
                if logs_dir.exists() {
                    if let Ok(entries) = std::fs::read_dir(&logs_dir) {
                        for entry in entries.flatten() {
                            let p = entry.path();
                            if p.is_file() { let _ = std::fs::remove_file(&p); }
                        }
                    }
                    "已清理日志目录".to_string()
                } else {
                    "目录不存在，跳过".to_string()
                }
            }
            _ => { failed += 1; fix_details.push(serde_json::json!({"issueId": issue_id, "success": false, "error": "Unknown fix action"})); continue; }
        };

        fixed += 1;
        fix_details.push(serde_json::json!({"issueId": issue_id, "success": true, "message": result}));
    }

    Ok(serde_json::json!({
        "fixed": fixed,
        "failed": failed,
        "message": format!("自动修复完成：修复 {} 项，失败 {} 项", fixed, failed),
        "details": fix_details
    }))
}

#[tauri::command]
pub fn get_version_annotations(version: String) -> Result<serde_json::Value, AppError> {
    let path = version_annotations_file(&version);
    let annotations: Vec<serde_json::Value> = if path.exists() {
        file_manager::load_json_or_default(&path)
    } else {
        Vec::new()
    };

    let total = annotations.len() as u32;
    let avg_rating = if total > 0 {
        let sum: u32 = annotations.iter().filter_map(|a| a["rating"].as_u64()).map(|r| r as u32).sum();
        sum as f64 / total as f64
    } else {
        0.0
    };

    let mut tag_counts: std::collections::HashMap<String, u32> = std::collections::HashMap::new();
    for ann in &annotations {
        if let Some(tags) = ann["tags"].as_array() {
            for tag in tags {
                if let Some(t) = tag.as_str() {
                    *tag_counts.entry(t.to_string()).or_insert(0) += 1;
                }
            }
        }
    }

    let top_annotation = annotations.iter()
        .max_by_key(|a| a["likes"].as_u64().unwrap_or(0))
        .cloned();

    let official_tags: Vec<String> = Vec::new();

    Ok(serde_json::json!({
        "version": version,
        "averageRating": (avg_rating * 10.0).round() / 10.0,
        "totalAnnotations": total,
        "tags": tag_counts,
        "officialTags": official_tags,
        "topAnnotation": top_annotation,
        "annotations": annotations
    }))
}

#[tauri::command]
pub fn add_version_annotation(version: String, user_id: String, username: String, content: String, rating: u32, tags: Vec<String>) -> Result<serde_json::Value, AppError> {
    if rating > 5 {
        return Err(errors::invalid_param("rating", "Rating must be between 0 and 5"));
    }
    if content.trim().is_empty() {
        return Err(errors::invalid_param("content", "Content cannot be empty"));
    }

    let path = version_annotations_file(&version);
    let mut annotations: Vec<serde_json::Value> = if path.exists() {
        file_manager::load_json_or_default(&path)
    } else {
        Vec::new()
    };

    let annotation = serde_json::json!({
        "id": format!("ann-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "version": version,
        "userId": user_id,
        "username": username,
        "content": content,
        "rating": rating,
        "tags": tags,
        "createdAt": chrono::Utc::now().timestamp_millis(),
        "likes": 0,
        "official": false
    });

    let result = annotation.clone();
    annotations.push(annotation);

    if annotations.len() > 500 {
        annotations = annotations.split_off(annotations.len() - 500);
    }

    file_manager::save_json(&path, &annotations)?;
    Ok(result)
}

#[tauri::command]
pub fn like_version_annotation(annotation_id: String) -> Result<serde_json::Value, AppError> {
    let annotations_dir = annotations_dir();
    if !annotations_dir.exists() { return Err(errors::internal("No annotations found")); }

    if let Ok(entries) = std::fs::read_dir(&annotations_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                let mut annotations: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
                for ann in annotations.iter_mut() {
                    if ann["id"].as_str() == Some(&annotation_id) {
                        let current = ann["likes"].as_u64().unwrap_or(0);
                        ann["likes"] = serde_json::json!(current + 1);
                        let result = ann.clone();
                        file_manager::save_json(&path, &annotations)?;
                        return Ok(result);
                    }
                }
            }
        }
    }

    Err(errors::internal(format!("Annotation {} not found", annotation_id)))
}

#[tauri::command]
pub fn delete_version_annotation(annotation_id: String, user_id: String) -> Result<bool, AppError> {
    let annotations_dir = annotations_dir();
    if !annotations_dir.exists() { return Ok(false); }

    if let Ok(entries) = std::fs::read_dir(&annotations_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                let mut annotations: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
                let before = annotations.len();
                annotations.retain(|a| {
                    if a["id"].as_str() == Some(&annotation_id) {
                        a["userId"].as_str() == Some(&user_id)
                    } else {
                        true
                    }
                });
                if annotations.len() < before {
                    file_manager::save_json(&path, &annotations)?;
                    return Ok(true);
                }
            }
        }
    }

    Ok(false)
}

#[tauri::command]
pub fn get_launch_dependencies() -> Result<Vec<serde_json::Value>, AppError> {
    let path = dependencies_file();
    let data: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    Ok(data)
}

#[tauri::command]
pub fn set_launch_dependency(instance_id: String, depends_on_instance_id: String, delay_ms: u64, required: bool) -> Result<serde_json::Value, AppError> {
    if instance_id == depends_on_instance_id {
        return Err(errors::invalid_param("dependsOnInstanceId", "Instance cannot depend on itself"));
    }

    let mut deps = get_launch_dependencies()?;

    let has_cycle = |deps: &[serde_json::Value], from: &str, to: &str| -> bool {
        let mut visited = std::collections::HashSet::new();
        let mut stack = vec![to.to_string()];
        while let Some(current) = stack.pop() {
            if current == from { return true; }
            if visited.contains(&current) { continue; }
            visited.insert(current.clone());
            for dep in deps {
                if dep["instanceId"].as_str() == Some(&current) {
                    if let Some(next) = dep["dependsOnInstanceId"].as_str() {
                        stack.push(next.to_string());
                    }
                }
            }
        }
        false
    };

    if has_cycle(&deps, &instance_id, &depends_on_instance_id) {
        return Err(errors::invalid_param("dependsOnInstanceId", "Circular dependency detected"));
    }

    let dep = serde_json::json!({
        "id": format!("dep-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        "instanceId": instance_id,
        "dependsOnInstanceId": depends_on_instance_id,
        "delayMs": delay_ms,
        "required": required
    });
    let result = dep.clone();
    deps.push(dep);
    file_manager::save_json(&dependencies_file(), &deps)?;
    Ok(result)
}

#[tauri::command]
pub fn remove_launch_dependency(dependency_id: String) -> Result<bool, AppError> {
    let mut deps = get_launch_dependencies()?;
    let before = deps.len();
    deps.retain(|d| d["id"] != dependency_id);
    file_manager::save_json(&dependencies_file(), &deps)?;
    Ok(deps.len() < before)
}

#[tauri::command]
pub async fn launch_dependent_instances(app: tauri::AppHandle, instance_id: String, account: serde_json::Value) -> Result<Vec<serde_json::Value>, AppError> {
    let launcher = crate::services::minecraft_launcher::MinecraftLauncher;
    let order = get_instance_launch_order(instance_id.clone())?;
    let mut results = Vec::new();
    let instances_path = crate::utils::paths::instances_file();
    let instances: Vec<crate::models::instance::VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);

    for dep in &order {
        if let Some(dep_id) = dep["instanceId"].as_str() {
            if dep_id == instance_id { continue; }
            let delay = dep["delayMs"].as_u64().unwrap_or(0);
            if delay > 0 {
                tokio::time::sleep(std::time::Duration::from_millis(delay)).await;
            }
            if let Some(instance) = instances.iter().find(|i| i.id == dep_id) {
                let options = crate::models::launch::LaunchOptions {
                    version: instance.game_version.clone(),
                    account: crate::models::account::Account {
                        id: uuid::Uuid::new_v4().to_string(),
                        account_type: "offline".to_string(),
                        username: account["username"].as_str().unwrap_or("Player").to_string(),
                        uuid: account["uuid"].as_str().unwrap_or("").to_string(),
                        access_token: None, refresh_token: None, expires_at: None,
                        skin_url: None, avatar_url: None,
                        littleskin_server_url: None, littleskin_access_token: None,
                    },
                    java_path: if instance.settings.java_path.is_empty() { None } else { Some(instance.settings.java_path.clone()) },
                    max_memory: instance.settings.max_memory,
                    min_memory: instance.settings.min_memory,
                    game_dir: instance.instance_dir.clone(),
                    width: Some(instance.settings.window_width),
                    height: Some(instance.settings.window_height),
                    fullscreen: Some(instance.settings.fullscreen),
                    server: if instance.settings.launch_server.is_empty() { None } else { Some(instance.settings.launch_server.clone()) },
                    jvm_args: if instance.settings.jvm_args.is_empty() { None } else { Some(instance.settings.jvm_args.clone()) },
                    instance_id: Some(dep_id.to_string()),
                };
                let result = match launcher.launch(&options, &app) {
                    Ok(pid) => serde_json::json!({"instanceId": dep_id, "success": true, "pid": pid, "required": dep["required"].as_bool().unwrap_or(true)}),
                    Err(e) => serde_json::json!({"instanceId": dep_id, "success": false, "error": e.to_string(), "required": dep["required"].as_bool().unwrap_or(true)}),
                };
                results.push(result);
            }
        }
    }

    if let Some(instance) = instances.iter().find(|i| i.id == instance_id) {
        let options = crate::models::launch::LaunchOptions {
            version: instance.game_version.clone(),
            account: crate::models::account::Account {
                id: uuid::Uuid::new_v4().to_string(),
                account_type: "offline".to_string(),
                username: account["username"].as_str().unwrap_or("Player").to_string(),
                uuid: account["uuid"].as_str().unwrap_or("").to_string(),
                access_token: None, refresh_token: None, expires_at: None,
                skin_url: None, avatar_url: None,
                littleskin_server_url: None, littleskin_access_token: None,
            },
            java_path: if instance.settings.java_path.is_empty() { None } else { Some(instance.settings.java_path.clone()) },
            max_memory: instance.settings.max_memory,
            min_memory: instance.settings.min_memory,
            game_dir: instance.instance_dir.clone(),
            width: Some(instance.settings.window_width),
            height: Some(instance.settings.window_height),
            fullscreen: Some(instance.settings.fullscreen),
            server: if instance.settings.launch_server.is_empty() { None } else { Some(instance.settings.launch_server.clone()) },
            jvm_args: if instance.settings.jvm_args.is_empty() { None } else { Some(instance.settings.jvm_args.clone()) },
            instance_id: Some(instance_id.clone()),
        };
        let main_result = match launcher.launch(&options, &app) {
            Ok(pid) => serde_json::json!({"instanceId": instance_id, "success": true, "pid": pid}),
            Err(e) => serde_json::json!({"instanceId": instance_id, "success": false, "error": e.to_string()}),
        };
        results.push(main_result);
    }

    Ok(results)
}

#[tauri::command]
pub fn get_instance_launch_order(instance_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let deps = get_launch_dependencies()?;

    let mut graph: std::collections::HashMap<String, Vec<(String, u64, bool)>> = std::collections::HashMap::new();
    for dep in &deps {
        if let (Some(from), Some(to)) = (dep["instanceId"].as_str(), dep["dependsOnInstanceId"].as_str()) {
            let delay = dep["delayMs"].as_u64().unwrap_or(0);
            let required = dep["required"].as_bool().unwrap_or(true);
            graph.entry(from.to_string()).or_default().push((to.to_string(), delay, required));
        }
    }

    let mut visited = std::collections::HashSet::new();
    let mut order = Vec::new();
    let mut stack = vec![(instance_id.clone(), 0u64, true)];

    while let Some((current, delay, required)) = stack.pop() {
        if visited.contains(&current) { continue; }
        visited.insert(current.clone());

        if let Some(dependencies) = graph.get(&current) {
            for (dep_id, dep_delay, dep_required) in dependencies {
                if !visited.contains(dep_id) {
                    stack.push((dep_id.clone(), *dep_delay, *dep_required));
                }
            }
        }

        order.push(serde_json::json!({
            "instanceId": current,
            "delayMs": delay,
            "required": required
        }));
    }

    order.reverse();
    Ok(order)
}

#[tauri::command]
pub async fn detect_launchers() -> Result<Vec<serde_json::Value>, AppError> {
    let mut launchers = Vec::new();
    let home = std::env::var("HOME").unwrap_or_default();
    let app_data = std::env::var("APPDATA").unwrap_or_default();

    let minecraft_dir = if cfg!(target_os = "macos") {
        format!("{}/Library/Application Support/minecraft", home)
    } else if cfg!(target_os = "windows") {
        format!("{}\\.minecraft", app_data)
    } else {
        format!("{}/.minecraft", home)
    };

    if std::path::Path::new(&minecraft_dir).exists() {
        let versions_dir = std::path::Path::new(&minecraft_dir).join("versions");
        let mut instances = Vec::new();
        if versions_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(&versions_dir) {
                for entry in entries.flatten() {
                    let p = entry.path();
                    if p.is_dir() {
                        let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                        let json_path = p.join(format!("{}.json", name));
                        if json_path.exists() {
                            let mod_loader: Option<&str> = if name.contains("forge") { Some("forge") } else if name.contains("fabric") { Some("fabric") } else if name.contains("quilt") { Some("quilt") } else { None };
                            let mods_dir = std::path::Path::new(&minecraft_dir).join("mods");
                            let mods_count = if mods_dir.exists() {
                                std::fs::read_dir(&mods_dir).map(|e| e.count()).unwrap_or(0)
                            } else { 0 };
                            instances.push(serde_json::json!({
                                "name": name,
                                "gameVersion": name.split('-').next().unwrap_or(&name),
                                "modLoader": mod_loader,
                                "modsCount": mods_count,
                                "savesCount": 0
                            }));
                        }
                    }
                }
            }
        }
        launchers.push(serde_json::json!({"id": "minecraft", "name": "Minecraft 官方启动器", "path": minecraft_dir, "type": "official", "instances": instances}));
    }

    let hmcl_dir = if cfg!(target_os = "macos") {
        format!("{}/.hmcl", home)
    } else {
        format!("{}/.hmcl", home)
    };
    if std::path::Path::new(&hmcl_dir).exists() {
        launchers.push(serde_json::json!({"id": "hmcl", "name": "HMCL", "path": hmcl_dir, "type": "hmcl", "instances": []}));
    }

    Ok(launchers)
}

#[tauri::command]
pub async fn migrate_launcher_data(source: serde_json::Value, selected_instances: Vec<usize>) -> Result<Vec<serde_json::Value>, AppError> {
    let launcher_type = source["type"].as_str().unwrap_or("");
    let launcher_path = source["path"].as_str().unwrap_or("");
    let launcher_dir = std::path::Path::new(launcher_path);

    if !launcher_dir.exists() {
        return Err(errors::invalid_param("path", format!("启动器目录不存在: {}", launcher_path)));
    }

    let mut migrated = Vec::new();
    let instances_path = crate::utils::paths::instances_file();
    let mut instances: Vec<crate::models::instance::VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);

    match launcher_type {
        "hmcl" => {
            if let Ok(entries) = std::fs::read_dir(launcher_dir.join(".minecraft")) {
                for (idx, entry) in entries.flatten().enumerate() {
                    if !selected_instances.contains(&idx) { continue; }
                    let name = entry.file_name().to_string_lossy().to_string();
                    let instance_dir = entry.path();
                    if instance_dir.is_dir() {
                        let instance = crate::models::instance::VersionInstance {
                            id: uuid::Uuid::new_v4().to_string(),
                            name: name.clone(),
                            game_version: "unknown".to_string(),
                            mod_loader: None,
                            mod_loader_version: None,
                            created_at: chrono::Utc::now().to_rfc3339(),
                            last_played_at: None,
                            total_time: 0,
                            icon_url: None,
                            instance_dir: instance_dir.to_string_lossy().to_string(),
                            settings: crate::models::instance::InstanceSettings::default(),
                            shader_packs: Vec::new(),
                        };
                        instances.push(instance.clone());
                        migrated.push(serde_json::to_value(&instance).unwrap_or_default());
                    }
                }
            }
        }
        "multimc" | "prism" => {
            let instances_dir = launcher_dir.join("instances");
            if let Ok(entries) = std::fs::read_dir(&instances_dir) {
                for (idx, entry) in entries.flatten().enumerate() {
                    if !selected_instances.contains(&idx) { continue; }
                    let name = entry.file_name().to_string_lossy().to_string();
                    let instance_dir = entry.path().join(".minecraft");
                    if instance_dir.exists() {
                        let instance = crate::models::instance::VersionInstance {
                            id: uuid::Uuid::new_v4().to_string(),
                            name: name.clone(),
                            game_version: "unknown".to_string(),
                            mod_loader: None,
                            mod_loader_version: None,
                            created_at: chrono::Utc::now().to_rfc3339(),
                            last_played_at: None,
                            total_time: 0,
                            icon_url: None,
                            instance_dir: instance_dir.to_string_lossy().to_string(),
                            settings: crate::models::instance::InstanceSettings::default(),
                            shader_packs: Vec::new(),
                        };
                        instances.push(instance.clone());
                        migrated.push(serde_json::to_value(&instance).unwrap_or_default());
                    }
                }
            }
        }
        _ => {
            return Err(errors::unsupported(format!("启动器类型: {}", launcher_type)));
        }
    }

    crate::services::file_manager::save_json(&instances_path, &instances)?;
    Ok(migrated)
}

#[tauri::command]
pub async fn detect_download_source() -> Result<Vec<serde_json::Value>, AppError> {
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(5))
        .no_proxy()
        .build()
        .map_err(|e| errors::internal(e.to_string()))?;

    let sources = [
        ("bmclapi", "BMCLAPI", "cn", "https://bmclapi2.bangbang93.com", "https://bmclapi2.bangbang93.com/mc/game/version_manifest.json"),
        ("mcbbs", "MCBBS", "cn", "https://download.mcbbs.net", "https://download.mcbbs.net/mc/game/version_manifest.json"),
        ("mojang", "Mojang 官方", "us", "https://launchermeta.mojang.com", "https://piston-meta.mojang.com/mc/game/version_manifest.json"),
    ];

    let mut results = Vec::new();
    for (id, name, region, base_url, test_url) in &sources {
        let start = std::time::Instant::now();
        let (latency, available) = match client.head(*test_url).send().await {
            Ok(resp) => {
                let lat = start.elapsed().as_millis() as u64;
                (lat, resp.status().is_success())
            }
            Err(_) => (9999u64, false),
        };
        results.push(serde_json::json!({
            "id": id, "name": name, "region": region,
            "baseUrl": base_url, "url": base_url,
            "latency": latency, "available": available
        }));
    }
    Ok(results)
}

#[tauri::command]
pub fn get_optimal_download_url(original_url: String) -> Result<String, AppError> {
    Ok(crate::services::incremental_sync::replace_download_url_internal(&original_url))
}

#[tauri::command]
pub async fn check_for_updates() -> Result<serde_json::Value, AppError> {
    let current_version = env!("CARGO_PKG_VERSION").to_string();
    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(10))
        .build()
        .map_err(|e| errors::internal(e.to_string()))?;

    let latest_version = match client
        .get("https://api.github.com/repos/BonjourMinecraft/bonjour-minecraft-launcher/releases/latest")
        .header("User-Agent", "BonjourMinecraft-Launcher")
        .send().await
    {
        Ok(resp) if resp.status().is_success() => {
            resp.json::<serde_json::Value>().await
                .ok()
                .and_then(|v| v["tag_name"].as_str().map(|s| s.trim_start_matches('v').to_string()))
                .unwrap_or_else(|| current_version.clone())
        }
        _ => current_version.clone(),
    };

    let has_update = latest_version != current_version && latest_version > current_version;
    Ok(serde_json::json!({
        "hasUpdate": has_update,
        "currentVersion": current_version,
        "latestVersion": latest_version
    }))
}

#[tauri::command]
pub async fn check_network_status() -> Result<serde_json::Value, AppError> {
    let online = reqwest::Client::new()
        .head("https://www.microsoft.com")
        .timeout(std::time::Duration::from_secs(5))
        .send().await.is_ok();
    Ok(serde_json::json!({"online": online, "source": "heartbeat", "lastChecked": chrono::Utc::now().timestamp_millis()}))
}

#[tauri::command]
pub async fn launch_engine_start(app: tauri::AppHandle, version: String, account_name: String, instance_id: Option<String>) -> Result<String, AppError> {
    let state = app.state::<Arc<AppState>>();
    let session = state.launch_engine.start_session(version, account_name, instance_id);
    let session_id = session.id.clone();
    let _ = app.emit("launch-session-started", serde_json::to_value(&session).unwrap_or_default());
    Ok(session_id)
}

#[tauri::command]
pub fn launch_engine_phase(app: tauri::AppHandle, session_id: String, phase_id: String) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    let phase = crate::models::launch::LaunchPhaseId::from_str(&phase_id).unwrap_or(crate::models::launch::LaunchPhaseId::General);
    state.launch_engine.advance_to_phase(&session_id, &phase, &app);
    Ok(true)
}

#[tauri::command]
pub fn launch_engine_log(app: tauri::AppHandle, session_id: String, log_type: String, message: String, phase_id: String) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    let phase = if phase_id.is_empty() { None } else { crate::models::launch::LaunchPhaseId::from_str(&phase_id) };
    state.launch_engine.add_log(&session_id, &log_type, &message, phase.as_ref(), &app);
    Ok(true)
}

#[tauri::command]
pub fn launch_engine_complete(app: tauri::AppHandle, session_id: String, pid: u32) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    state.launch_engine.mark_running(&session_id, pid, &app);
    state.process_guardian.register(pid, session_id.clone(), Some(session_id));
    Ok(true)
}

#[tauri::command]
pub fn launch_engine_exit(app: tauri::AppHandle, session_id: String, exit_code: i32) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    if let Some(session) = state.launch_engine.mark_exited(&session_id, exit_code, &app) {
        if let Some(pid) = session.pid {
            state.process_guardian.unregister(pid);
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn get_running_game_processes(app: tauri::AppHandle) -> Result<Vec<serde_json::Value>, AppError> {
    let state = app.state::<Arc<AppState>>();
    let processes = state.process_guardian.get_running_processes();
    Ok(processes.into_iter().map(|p| serde_json::to_value(p).unwrap_or_default()).collect())
}

#[tauri::command]
pub fn kill_game_process(app: tauri::AppHandle, pid: u32) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    Ok(state.process_guardian.kill_process(pid))
}

#[tauri::command]
pub async fn repair_version_files(app: tauri::AppHandle, version_id: String) -> Result<serde_json::Value, AppError> {
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&paths::settings_file());
    let game_dir = paths::detect_game_root(&settings.game_dir);
    Ok(incremental_sync::repair_version_files(&game_dir, &version_id, &app).await)
}

#[tauri::command]
pub async fn verify_local_file(file_path: String, expected_hash: Option<String>, expected_size: Option<u64>) -> Result<serde_json::Value, AppError> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Ok(serde_json::json!({
            "status": "missing",
            "path": file_path,
            "message": "文件不存在"
        }));
    }
    let mut status = "ok".to_string();
    let mut issues: Vec<String> = Vec::new();
    if let Some(size) = expected_size {
        if let Ok(meta) = path.metadata() {
            if meta.len() != size {
                status = "size_mismatch".to_string();
                issues.push(format!("文件大小不匹配: 期望 {} 字节, 实际 {} 字节", size, meta.len()));
            }
        }
    }
    if let Some(hash) = expected_hash {
        let fp = file_path.clone();
        let actual = match tauri::async_runtime::spawn_blocking(move || {
            crate::services::compute::sha256_file_streaming(std::path::Path::new(&fp))
        }).await {
            Ok(Ok(h)) => h,
            _ => String::new(),
        };
        if actual != hash {
            status = "corrupted".to_string();
            issues.push("文件哈希不匹配，可能已损坏".to_string());
        }
    }
    Ok(serde_json::json!({
        "status": status,
        "path": file_path,
        "issues": issues
    }))
}

#[tauri::command]
pub async fn incremental_sync(app: tauri::AppHandle, game_dir: String, version_json: serde_json::Value, concurrency: Option<u32>) -> Result<serde_json::Value, AppError> {
    let conc = concurrency.unwrap_or(8);
    let result = incremental_sync::incremental_sync_with_download(&game_dir, &version_json, conc, &app).await;
    Ok(serde_json::to_value(result).unwrap_or_default())
}

#[tauri::command]
pub fn get_jvm_profiles() -> Result<Vec<serde_json::Value>, AppError> {
    let profiles = crate::services::jvm_tuner::get_jvm_profiles();
    Ok(profiles.into_iter().map(|p| serde_json::to_value(p).unwrap_or_default()).collect())
}

#[tauri::command]
pub fn recommend_jvm_profile(total_memory_mb: u64, java_major_version: u32, mod_count: u32) -> Result<serde_json::Value, AppError> {
    let result = crate::services::jvm_tuner::recommend_profile(total_memory_mb, java_major_version, mod_count);
    let mut result_val = serde_json::to_value(&result).unwrap_or_default();
    let args = crate::services::jvm_tuner::build_jvm_args(
        &result.profile,
        result.memory_config.max,
        result.memory_config.min,
        "",
        java_major_version,
        &[],
    );
    result_val["args"] = serde_json::to_value(args).unwrap_or_default();
    Ok(result_val)
}

#[tauri::command]
pub fn create_crash_report(version: String, exit_code: i32, raw_log: String, instance_id: Option<String>) -> Result<serde_json::Value, AppError> {
    let report = crate::services::crash_analyzer::create_crash_report(
        &version, exit_code, &raw_log, instance_id.as_deref(), &[], &[],
    );
    Ok(serde_json::to_value(report).unwrap_or_default())
}

#[tauri::command]
pub fn get_crash_reports(limit: u32) -> Result<Vec<serde_json::Value>, AppError> {
    let crash_dir = paths::config_dir().join("crash_reports");
    if !crash_dir.exists() {
        return Ok(Vec::new());
    }
    let mut reports: Vec<serde_json::Value> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&crash_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                        reports.push(val);
                    }
                }
            }
        }
    }
    reports.sort_by(|a, b| {
        b.get("timestamp").and_then(|v| v.as_i64()).unwrap_or(0)
            .cmp(&a.get("timestamp").and_then(|v| v.as_i64()).unwrap_or(0))
    });
    reports.truncate(limit as usize);
    Ok(reports)
}

#[tauri::command]
pub fn get_launch_benchmarks(version: String, limit: u32) -> Result<Vec<serde_json::Value>, AppError> {
    let path = benchmarks_file();
    let records: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    let filtered: Vec<serde_json::Value> = records.into_iter()
        .filter(|r| r["version"] == version)
        .rev()
        .take(limit as usize)
        .collect();
    Ok(filtered)
}

#[tauri::command]
pub fn get_benchmark_summary(version: String) -> Result<Option<serde_json::Value>, AppError> {
    let records = get_launch_benchmarks(version.clone(), 500)?;
    if records.is_empty() { return Ok(None); }
    let durations: Vec<u64> = records.iter()
        .filter_map(|r| r["totalDuration"].as_u64())
        .collect();
    if durations.is_empty() { return Ok(None); }
    let avg = durations.iter().sum::<u64>() / durations.len() as u64;
    let min = *durations.iter().min().unwrap_or(&0);
    let max = *durations.iter().max().unwrap_or(&0);
    Ok(Some(serde_json::json!({
        "version": version,
        "averageDuration": avg,
        "minDuration": min,
        "maxDuration": max,
        "sampleCount": durations.len(),
        "trend": "stable"
    })))
}

#[tauri::command]
pub fn save_benchmark(record: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let path = benchmarks_file();
    let mut records: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
    let entry = if record["id"].is_null() || record["id"].as_str().unwrap_or("").is_empty() {
        let mut merged = serde_json::json!({
            "id": format!("bench-{}", chrono::Utc::now().timestamp_millis()),
        });
        if let Some(obj) = record.as_object() {
            for (k, v) in obj {
                merged[k.clone()] = v.clone();
            }
        }
        merged
    } else {
        record
    };
    let result = entry.clone();
    records.push(entry);
    if records.len() > 500 { records = records.split_off(records.len() - 500); }
    file_manager::save_json(&path, &records)?;
    Ok(result)
}

#[tauri::command]
pub fn setup_tray(app: tauri::AppHandle, default_version: Option<String>) -> Result<bool, AppError> {
    use tauri::tray::TrayIconBuilder;
    use tauri::menu::{MenuBuilder, MenuItemBuilder};

    let show = MenuItemBuilder::with_id("show", "显示主窗口").build(&app)
        .map_err(|e| errors::internal(format!("创建菜单项失败: {}", e)))?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(&app)
        .map_err(|e| errors::internal(format!("创建菜单项失败: {}", e)))?;
    let _ = default_version;
    let menu = MenuBuilder::new(&app).items(&[&show, &quit]).build()
        .map_err(|e| errors::internal(format!("创建菜单失败: {}", e)))?;

    let _tray = TrayIconBuilder::new()
        .menu(&menu)
        .tooltip("Bonjour Minecraft Launcher")
        .on_menu_event(move |app, event| {
            match event.id().as_ref() {
                "show" => {
                    if let Some(window) = app.get_webview_window("main") {
                        let _ = window.show();
                        let _ = window.set_focus();
                    }
                }
                "quit" => {
                    app.exit(0);
                }
                _ => {}
            }
        })
        .build(&app)
        .map_err(|e| errors::internal(format!("创建系统托盘失败: {}", e)))?;

    Ok(true)
}

#[tauri::command]
pub fn update_tray_menu(app: tauri::AppHandle, versions: Vec<String>, default_version: Option<String>) -> Result<bool, AppError> {
    use tauri::menu::{MenuBuilder, MenuItemBuilder};

    let show = MenuItemBuilder::with_id("show", "显示主窗口").build(&app)
        .map_err(|e| errors::internal(format!("创建菜单项失败: {}", e)))?;
    let quit = MenuItemBuilder::with_id("quit", "退出").build(&app)
        .map_err(|e| errors::internal(format!("创建菜单项失败: {}", e)))?;
    let _ = default_version;
    let _ = versions;
    let menu = MenuBuilder::new(&app).items(&[&show, &quit]).build()
        .map_err(|e| errors::internal(format!("更新菜单失败: {}", e)))?;

    if let Some(tray) = app.tray_by_id("main") {
        tray.set_menu(Some(menu)).map_err(|e| errors::internal(format!("更新托盘菜单失败: {}", e)))?;
    }
    Ok(true)
}

#[tauri::command]
pub fn get_game_sessions(limit: Option<u32>) -> Result<Vec<serde_json::Value>, AppError> {
    let sessions_dir = paths::config_dir().join("sessions");
    if !sessions_dir.exists() {
        return Ok(Vec::new());
    }
    let mut sessions: Vec<serde_json::Value> = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&sessions_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().map(|e| e == "json").unwrap_or(false) {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                        sessions.push(val);
                    }
                }
            }
        }
    }
    sessions.sort_by(|a, b| {
        b.get("startTime").and_then(|v| v.as_i64()).unwrap_or(0)
            .cmp(&a.get("startTime").and_then(|v| v.as_i64()).unwrap_or(0))
    });
    sessions.truncate(limit.unwrap_or(50) as usize);
    Ok(sessions)
}

#[tauri::command]
pub fn diagnose_log_message(log_message: String) -> Result<serde_json::Value, AppError> {
    let diagnosis = crate::services::log_diagnoser::diagnose_log(&log_message);
    Ok(serde_json::to_value(diagnosis).unwrap_or_else(|_| {
        let msg = log_message.to_lowercase();
        let (level, category, suggestion) = if msg.contains("error") || msg.contains("exception") || msg.contains("fatal") {
            ("error", "error", Some("请检查错误详情并尝试修复".to_string()))
        } else if msg.contains("warn") {
            ("warning", "warning", None)
        } else {
            ("info", "general", None)
        };
        serde_json::json!({"level": level, "category": category, "suggestion": suggestion, "message": log_message})
    }))
}

#[tauri::command]
pub fn build_jvm_args_command(settings: serde_json::Value) -> Result<Vec<String>, AppError> {
    let profile_id = settings.get("jvmProfile").and_then(|v| v.as_str()).unwrap_or("balanced");
    let max_memory = settings.get("maxMemory").and_then(|v| v.as_u64()).unwrap_or(4096);
    let min_memory = settings.get("minMemory").and_then(|v| v.as_u64()).unwrap_or(max_memory / 2);
    let game_version = settings.get("gameVersion").and_then(|v| v.as_str()).unwrap_or("");
    let java_version = settings.get("javaVersion").and_then(|v| v.as_u64()).unwrap_or(17) as u32;
    let custom_args: Vec<String> = settings.get("customArgs")
        .and_then(|v| v.as_array())
        .map(|arr| arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect())
        .unwrap_or_default();

    let profile = crate::services::jvm_tuner::get_jvm_profile_by_id(profile_id)
        .unwrap_or_else(|| crate::services::jvm_tuner::get_jvm_profile_by_id("balanced").unwrap());

    Ok(crate::services::jvm_tuner::build_jvm_args(
        &profile, max_memory, min_memory, game_version, java_version, &custom_args,
    ))
}

#[tauri::command]
pub fn get_system_memory() -> Result<serde_json::Value, AppError> {
    let mut sys = sysinfo::System::new_all();
    sys.refresh_all();
    Ok(serde_json::json!({
        "totalMB": sys.total_memory() / 1024 / 1024,
        "availableMB": sys.available_memory() / 1024 / 1024,
        "usedMB": (sys.total_memory() - sys.available_memory()) / 1024 / 1024
    }))
}

#[tauri::command]
pub fn watch_config_directory(app: tauri::AppHandle, path: String) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    state.config_watcher.watch_directory(&path, &app)
        .map_err(|e| errors::internal(e.to_string()))?;
    Ok(true)
}

#[tauri::command]
pub fn stop_watching_directory(app: tauri::AppHandle, path: String) -> Result<bool, AppError> {
    let state = app.state::<Arc<AppState>>();
    state.config_watcher.stop_watching(&path);
    Ok(true)
}

#[tauri::command]
pub fn get_recent_config_changes(app: tauri::AppHandle, limit: Option<u32>) -> Result<Vec<serde_json::Value>, AppError> {
    let state = app.state::<Arc<AppState>>();
    let changes = state.config_watcher.get_recent_changes(limit.unwrap_or(50) as usize);
    Ok(changes.into_iter().map(|c| serde_json::to_value(c).unwrap_or_default()).collect())
}

#[tauri::command]
pub fn analyze_exit_code(exit_code: i32) -> Result<serde_json::Value, AppError> {
    let analysis = crate::services::crash_analyzer::analyze_exit_code(exit_code);
    Ok(serde_json::to_value(analysis).unwrap_or_default())
}

#[tauri::command]
pub fn get_recovery_options(crash_info: serde_json::Value) -> Result<Vec<serde_json::Value>, AppError> {
    let exit_code = crash_info.get("exitCode").and_then(|v| v.as_i64()).unwrap_or(-1) as i32;
    let version = crash_info.get("version").and_then(|v| v.as_str()).unwrap_or("");
    let instance_id = crash_info.get("instanceId").and_then(|v| v.as_str());
    let options = crate::services::crash_analyzer::get_recovery_options(exit_code, version, instance_id);
    Ok(options.into_iter().map(|o| serde_json::to_value(o).unwrap_or_default()).collect())
}

#[tauri::command]
pub fn collect_system_snapshot() -> Result<serde_json::Value, AppError> {
    let mut sys = sysinfo::System::new_all();
    sys.refresh_all();
    Ok(serde_json::json!({
        "platform": std::env::consts::OS,
        "arch": std::env::consts::ARCH,
        "totalMemoryMB": sys.total_memory() / 1024 / 1024,
        "availableMemoryMB": sys.available_memory() / 1024 / 1024,
        "cpuCores": sys.cpus().len(),
        "timestamp": chrono::Utc::now().to_rfc3339()
    }))
}

#[tauri::command]
pub fn detect_slow_mod(mods_dir: String) -> Result<Vec<serde_json::Value>, AppError> {
    let path = std::path::Path::new(&mods_dir);
    if !path.exists() { return Ok(Vec::new()); }
    let mod_count: u32 = std::fs::read_dir(path)
        .map(|d| d.filter_map(|e| e.ok()).filter(|e| e.path().extension().map(|ext| ext == "jar").unwrap_or(false)).count() as u32)
        .unwrap_or(0);
    let version = path.parent()
        .and_then(|p| p.file_name())
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_default();
    if let Some(slow) = crate::services::launch_benchmark::detect_slow_mod(&version, mod_count) {
        Ok(vec![serde_json::json!({"message": slow, "version": version, "modCount": mod_count})])
    } else {
        Ok(Vec::new())
    }
}

#[tauri::command]
pub fn classify_log_phase(log_line: String) -> Result<serde_json::Value, AppError> {
    let phase = crate::services::launch_engine::classify_log_to_phase(&log_line);
    Ok(serde_json::json!({
        "phase": phase.id_str(),
        "label": phase.label(),
        "line": log_line
    }))
}

#[tauri::command]
pub fn register_global_shortcut(
    app: tauri::AppHandle,
    shortcut: String,
    event_name: String,
) -> Result<bool, AppError> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
    let (code, mods) = parse_shortcut_str(&shortcut)?;
    let gs = app.global_shortcut();
    let sh = Shortcut::new(Some(mods), code);
    let event_name_clone = event_name.clone();
    gs.on_shortcut(sh, move |_app, _shortcut, event| {
        if event.state == tauri_plugin_global_shortcut::ShortcutState::Pressed {
            let _ = _app.emit(&event_name_clone, serde_json::json!({"shortcut": shortcut.clone()}));
        }
    }).map_err(|e| errors::internal(format!("注册快捷键失败: {}", e)))?;
    gs.register(sh).map_err(|e| errors::internal(format!("注册快捷键失败: {}", e)))?;
    Ok(true)
}

#[tauri::command]
pub fn unregister_global_shortcut(
    app: tauri::AppHandle,
    shortcut: String,
) -> Result<bool, AppError> {
    use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut};
    let (code, mods) = parse_shortcut_str(&shortcut)?;
    let gs = app.global_shortcut();
    let sh = Shortcut::new(Some(mods), code);
    gs.unregister(sh).map_err(|e| errors::internal(format!("注销快捷键失败: {}", e)))?;
    Ok(true)
}

fn parse_shortcut_str(shortcut: &str) -> Result<(tauri_plugin_global_shortcut::Code, tauri_plugin_global_shortcut::Modifiers), AppError> {
    use tauri_plugin_global_shortcut::{Code, Modifiers};
    let mut mods = Modifiers::empty();
    let mut code = Code::KeyA;
    for part in shortcut.split('+') {
        let part = part.trim();
        match part.to_lowercase().as_str() {
            "ctrl" | "control" => mods |= Modifiers::CONTROL,
            "alt" => mods |= Modifiers::ALT,
            "shift" => mods |= Modifiers::SHIFT,
            "super" | "meta" | "cmd" | "command" => mods |= Modifiers::SUPER,
            "a" => code = Code::KeyA, "b" => code = Code::KeyB, "c" => code = Code::KeyC,
            "d" => code = Code::KeyD, "e" => code = Code::KeyE, "f" => code = Code::KeyF,
            "g" => code = Code::KeyG, "h" => code = Code::KeyH, "i" => code = Code::KeyI,
            "j" => code = Code::KeyJ, "k" => code = Code::KeyK, "l" => code = Code::KeyL,
            "m" => code = Code::KeyM, "n" => code = Code::KeyN, "o" => code = Code::KeyO,
            "p" => code = Code::KeyP, "q" => code = Code::KeyQ, "r" => code = Code::KeyR,
            "s" => code = Code::KeyS, "t" => code = Code::KeyT, "u" => code = Code::KeyU,
            "v" => code = Code::KeyV, "w" => code = Code::KeyW, "x" => code = Code::KeyX,
            "y" => code = Code::KeyY, "z" => code = Code::KeyZ,
            "0" => code = Code::Digit0, "1" => code = Code::Digit1, "2" => code = Code::Digit2,
            "3" => code = Code::Digit3, "4" => code = Code::Digit4, "5" => code = Code::Digit5,
            "6" => code = Code::Digit6, "7" => code = Code::Digit7, "8" => code = Code::Digit8,
            "9" => code = Code::Digit9,
            "f1" => code = Code::F1, "f2" => code = Code::F2, "f3" => code = Code::F3,
            "f4" => code = Code::F4, "f5" => code = Code::F5, "f6" => code = Code::F6,
            "f7" => code = Code::F7, "f8" => code = Code::F8, "f9" => code = Code::F9,
            "f10" => code = Code::F10, "f11" => code = Code::F11, "f12" => code = Code::F12,
            "space" => code = Code::Space,
            "enter" | "return" => code = Code::Enter,
            "tab" => code = Code::Tab,
            "escape" | "esc" => code = Code::Escape,
            "backspace" => code = Code::Backspace,
            _ => return Err(errors::invalid_param("shortcut", format!("无法识别的按键: {}", part))),
        }
    }
    Ok((code, mods))
}

#[tauri::command]
pub fn get_display_info(app: tauri::AppHandle) -> Result<serde_json::Value, AppError> {
    let monitors = app.available_monitors().unwrap_or_default();
    let current = app.primary_monitor().ok().flatten();
    let current_name: Option<String> = current.as_ref().and_then(|c| c.name().map(|n| n.as_str().to_string()));
    let displays: Vec<serde_json::Value> = monitors.iter().map(|m| {
        let size = m.size();
        let pos = m.position();
        let scale = m.scale_factor();
        let name: &str = m.name().map(|n| n.as_str()).unwrap_or("");
        serde_json::json!({
            "name": name,
            "width": size.width,
            "height": size.height,
            "scaleFactor": scale,
            "isPrimary": current_name.as_ref().map_or(false, |cn| name == cn.as_str()),
            "x": pos.x,
            "y": pos.y
        })
    }).collect();
    let current_idx = current_name.as_ref().map(|cn| {
        monitors.iter().position(|m| m.name().map(|n| n.as_str()) == Some(cn.as_str())).unwrap_or(0)
    }).unwrap_or(0);
    let primary_idx = current_idx;
    Ok(serde_json::json!({
        "displays": displays,
        "primaryIndex": primary_idx,
        "currentDisplayIndex": current_idx
    }))
}

#[tauri::command]
pub fn move_window_to_display(app: tauri::AppHandle, display_index: u32) -> Result<bool, AppError> {
    let monitors = app.available_monitors().unwrap_or_default();
    let monitor = monitors.iter().nth(display_index as usize);
    if let Some(monitor) = monitor {
        if let Some(window) = app.get_webview_window("main") {
            let pos = monitor.position();
            let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(pos.x, pos.y)));
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn save_window_position(app: tauri::AppHandle) -> Result<bool, AppError> {
    if let Some(window) = app.get_webview_window("main") {
        if let Ok(pos) = window.outer_position() {
            if let Ok(size) = window.inner_size() {
                let pos_data = serde_json::json!({
                    "x": pos.x, "y": pos.y,
                    "width": size.width, "height": size.height
                });
                let pos_file = paths::config_dir().join("window_position.json");
                let _ = std::fs::write(pos_file, serde_json::to_string_pretty(&pos_data).unwrap_or_default());
            }
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn restore_window_position(app: tauri::AppHandle) -> Result<bool, AppError> {
    let pos_file = paths::config_dir().join("window_position.json");
    if pos_file.exists() {
        if let Ok(content) = std::fs::read_to_string(&pos_file) {
            if let Ok(data) = serde_json::from_str::<serde_json::Value>(&content) {
                if let Some(window) = app.get_webview_window("main") {
                    if let (Some(x), Some(y)) = (data["x"].as_i64(), data["y"].as_i64()) {
                        let _ = window.set_position(tauri::Position::Physical(tauri::PhysicalPosition::new(x as i32, y as i32)));
                    }
                    if let (Some(w), Some(h)) = (data["width"].as_u64(), data["height"].as_u64()) {
                        let _ = window.set_size(tauri::Size::Physical(tauri::PhysicalSize::new(w as u32, h as u32)));
                    }
                }
            }
        }
    }
    Ok(true)
}

#[tauri::command]
pub fn detect_region() -> Result<serde_json::Value, AppError> {
    let tz = chrono::Local::now().offset().local_minus_utc() / 3600;
    let (region, method) = if tz >= 7 && tz <= 9 {
        ("cn", "timezone")
    } else if tz >= 0 && tz <= 2 {
        ("eu", "timezone")
    } else if tz >= -12 && tz <= -4 {
        ("us", "timezone")
    } else {
        ("cn", "timezone")
    };
    Ok(serde_json::json!({"region": region, "detected": true, "method": method}))
}
