use tauri;
use tauri_plugin_dialog::DialogExt;
use crate::errors::{self, AppError};

#[tauri::command] pub fn scan_instance_shaders(instance_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let _ = instance_id;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = std::path::PathBuf::from(crate::utils::paths::detect_game_root(&settings.game_dir));
    let shader_dir = game_dir.join("shaderpacks");
    if !shader_dir.exists() { return Ok(Vec::new()); }
    let mut shaders = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&shader_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if name.ends_with(".zip") || name.ends_with(".jar") {
                let disabled = name.ends_with(".disabled") || name.ends_with(".disabled.zip");
                shaders.push(serde_json::json!({
                    "name": name.trim_end_matches(".disabled"),
                    "path": path.to_string_lossy(),
                    "enabled": !disabled,
                    "fileName": name
                }));
            }
        }
    }
    Ok(shaders)
}
#[tauri::command] pub fn add_shader_pack(instance_id: String, source_path: String) -> Result<bool, AppError> {
    let _ = instance_id;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = std::path::PathBuf::from(crate::utils::paths::detect_game_root(&settings.game_dir));
    let shader_dir = game_dir.join("shaderpacks");
    std::fs::create_dir_all(&shader_dir).map_err(|e| errors::dir_create_error(&shader_dir, e.to_string()))?;
    let file_name = std::path::Path::new(&source_path).file_name().unwrap_or_default().to_string_lossy();
    let target = shader_dir.join(file_name.as_ref());
    std::fs::copy(&source_path, &target).map_err(|e| errors::file_write_error(&target, e.to_string()))?;
    Ok(true)
}
#[tauri::command] pub fn toggle_shader_pack(instance_id: String, shader_path: String, enabled: bool) -> Result<bool, AppError> {
    let _ = instance_id;
    let path = std::path::Path::new(&shader_path);
    let new_path = if enabled {
        let p = shader_path.trim_end_matches(".disabled");
        if p != shader_path { p.to_string() } else { shader_path.clone() }
    } else if !shader_path.ends_with(".disabled") {
        format!("{}.disabled", shader_path)
    } else {
        shader_path.clone()
    };
    if new_path != shader_path {
        std::fs::rename(path, &new_path).map_err(|e| errors::file_write_error(&shader_path, e.to_string()))?;
    }
    Ok(true)
}
#[tauri::command] pub fn delete_shader_pack(instance_id: String, shader_path: String) -> Result<bool, AppError> {
    let _ = instance_id;
    std::fs::remove_file(&shader_path).map_err(|e| errors::resource_error(&shader_path, e.to_string()))?;
    Ok(true)
}
#[tauri::command] pub fn reorder_shader_packs(instance_id: String, shader_ids: Vec<String>) -> Result<serde_json::Value, AppError> { let _ = (instance_id, shader_ids); Ok(serde_json::json!({})) }
#[tauri::command]
pub async fn select_shader_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog().file().add_filter("Shader Pack", &["zip", "jar"]).set_title("选择光影包文件").blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}
#[tauri::command] pub fn scan_instance_resource_packs(instance_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let _ = instance_id;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = std::path::PathBuf::from(crate::utils::paths::detect_game_root(&settings.game_dir));
    let rp_dir = game_dir.join("resourcepacks");
    if !rp_dir.exists() { return Ok(Vec::new()); }
    let mut packs = Vec::new();
    if let Ok(entries) = std::fs::read_dir(&rp_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
            if name.ends_with(".zip") {
                packs.push(serde_json::json!({ "name": name.trim_end_matches(".zip"), "path": path.to_string_lossy(), "enabled": true, "fileName": name }));
            }
        }
    }
    Ok(packs)
}
#[tauri::command] pub fn add_resource_pack(instance_id: String, source_path: String) -> Result<bool, AppError> {
    let _ = instance_id;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = std::path::PathBuf::from(crate::utils::paths::detect_game_root(&settings.game_dir));
    let rp_dir = game_dir.join("resourcepacks");
    std::fs::create_dir_all(&rp_dir).map_err(|e| errors::dir_create_error(&rp_dir, e.to_string()))?;
    let file_name = std::path::Path::new(&source_path).file_name().unwrap_or_default().to_string_lossy();
    let target = rp_dir.join(file_name.as_ref());
    std::fs::copy(&source_path, &target).map_err(|e| errors::file_write_error(&target, e.to_string()))?;
    Ok(true)
}
#[tauri::command] pub fn toggle_resource_pack(instance_id: String, resource_pack_path: String, enabled: bool) -> Result<bool, AppError> { let _ = (instance_id, resource_pack_path, enabled); Ok(true) }
#[tauri::command] pub fn delete_resource_pack(instance_id: String, resource_pack_path: String) -> Result<bool, AppError> { let _ = instance_id; std::fs::remove_file(&resource_pack_path).map_err(|e| errors::resource_error(&resource_pack_path, e.to_string()))?; Ok(true) }
#[tauri::command] pub fn reorder_resource_packs(instance_id: String, resource_pack_ids: Vec<String>) -> Result<serde_json::Value, AppError> { let _ = (instance_id, resource_pack_ids); Ok(serde_json::json!({})) }
#[tauri::command]
pub async fn select_resource_pack_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog().file().add_filter("Resource Pack", &["zip"]).set_title("选择资源包文件").blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}
#[tauri::command] pub fn scan_instance_datapacks(instance_id: String, world_name: Option<String>) -> Result<Vec<serde_json::Value>, AppError> { let _ = (instance_id, world_name); Ok(Vec::new()) }
#[tauri::command] pub fn toggle_instance_datapack(instance_id: String, datapack_path: String, enabled: bool, world_name: Option<String>) -> Result<bool, AppError> { let _ = (instance_id, datapack_path, enabled, world_name); Ok(true) }
#[tauri::command] pub fn delete_instance_datapack(instance_id: String, datapack_path: String, world_name: Option<String>) -> Result<bool, AppError> { let _ = (instance_id, datapack_path, world_name); Ok(true) }
#[tauri::command] pub fn add_instance_datapack(instance_id: String, source_path: String, world_name: Option<String>) -> Result<bool, AppError> { let _ = (instance_id, source_path, world_name); Ok(true) }
#[tauri::command]
pub async fn select_datapack_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog().file().add_filter("Datapack", &["zip"]).set_title("选择数据包文件").blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}
#[tauri::command] pub fn scan_instance_structures(instance_id: String) -> Result<Vec<serde_json::Value>, AppError> { let _ = instance_id; Ok(Vec::new()) }
#[tauri::command] pub fn import_instance_structure(instance_id: String, source_path: String) -> Result<bool, AppError> { let _ = (instance_id, source_path); Ok(true) }
#[tauri::command] pub fn export_instance_structure(instance_id: String, structure_id: String, target_path: String) -> Result<bool, AppError> { let _ = (instance_id, structure_id, target_path); Ok(true) }
#[tauri::command] pub fn delete_instance_structure(instance_id: String, structure_path: String) -> Result<bool, AppError> { let _ = (instance_id, structure_path); Ok(true) }
#[tauri::command] pub fn get_structure_preview(instance_id: String, structure_path: String) -> Result<serde_json::Value, AppError> { let _ = (instance_id, structure_path); Ok(serde_json::json!(null)) }
#[tauri::command]
pub async fn select_structure_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog().file().add_filter("Structure", &["nbt"]).set_title("选择结构文件").blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}
#[tauri::command] pub fn build_global_resource_index() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command]
pub async fn select_mod_file(app: tauri::AppHandle) -> Result<Option<Vec<String>>, AppError> {
    let paths = app.dialog().file().add_filter("Mod", &["jar"]).set_title("选择模组文件").blocking_pick_files();
    Ok(paths.map(|ps| ps.into_iter().map(|p| p.to_string()).collect()))
}
#[tauri::command] pub fn create_texture_project(name: String, description: String, pack_format: u32) -> Result<serde_json::Value, AppError> { let _ = (name, description, pack_format); Ok(serde_json::json!({})) }
#[tauri::command] pub fn save_texture_project(project: serde_json::Value) -> Result<bool, AppError> { let _ = project; Ok(true) }
#[tauri::command] pub fn export_texture_project(project_id: String) -> Result<Option<String>, AppError> { let _ = project_id; Ok(None) }
#[tauri::command] pub fn get_texture_projects() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command] pub fn get_resource_subscriptions() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command] pub fn add_resource_subscription(sub: serde_json::Value) -> Result<serde_json::Value, AppError> { let _ = sub; Ok(serde_json::json!({})) }
#[tauri::command] pub fn remove_resource_subscription(sub_id: String) -> Result<bool, AppError> { let _ = sub_id; Ok(true) }
#[tauri::command] pub async fn check_resource_subscription_updates() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command] pub fn get_resource_subscription_notifications() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command] pub fn mark_resource_notification_read(notif_id: String) -> Result<bool, AppError> { let _ = notif_id; Ok(true) }
#[tauri::command] pub fn get_resource_collections() -> Result<Vec<serde_json::Value>, AppError> { Ok(Vec::new()) }
#[tauri::command] pub fn create_resource_collection(collection: serde_json::Value) -> Result<serde_json::Value, AppError> { let _ = collection; Ok(serde_json::json!({})) }
#[tauri::command] pub fn update_resource_collection(collection_id: String, updates: serde_json::Value) -> Result<serde_json::Value, AppError> { let _ = (collection_id, updates); Ok(serde_json::json!({})) }
#[tauri::command] pub fn delete_resource_collection(collection_id: String) -> Result<bool, AppError> { let _ = collection_id; Ok(true) }
#[tauri::command] pub fn install_resource_collection(collection_id: String, instance_id: String) -> Result<serde_json::Value, AppError> { let _ = (collection_id, instance_id); Ok(serde_json::json!({})) }
