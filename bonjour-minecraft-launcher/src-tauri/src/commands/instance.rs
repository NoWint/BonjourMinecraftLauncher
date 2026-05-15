use tauri;
use crate::models::instance::{VersionInstance, InstanceSettings};
use crate::services::file_manager;
use crate::utils::paths;
use crate::errors::{self, AppError};

#[tauri::command]
pub fn get_instances() -> Result<Vec<VersionInstance>, AppError> {
    let instances_path = paths::instances_file();
    let instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    Ok(instances)
}

#[tauri::command]
pub fn create_instance(data: serde_json::Value) -> Result<VersionInstance, AppError> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    
    let instance = VersionInstance {
        id: uuid::Uuid::new_v4().to_string(),
        name: data["name"].as_str().unwrap_or("New Instance").to_string(),
        game_version: data["gameVersion"].as_str().unwrap_or("").to_string(),
        mod_loader: data["modLoader"].as_str().map(|s| s.to_string()),
        mod_loader_version: data["modLoaderVersion"].as_str().map(|s| s.to_string()),
        created_at: chrono::Utc::now().to_rfc3339(),
        last_played_at: None,
        total_time: 0,
        icon_url: None,
        instance_dir: String::new(),
        settings: InstanceSettings::default(),
        shader_packs: Vec::new(),
    };
    
    instances.push(instance.clone());
    file_manager::save_json(&instances_path, &instances)?;
    Ok(instance)
}

#[tauri::command]
pub fn delete_instance(instance_id: String) -> Result<bool, AppError> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    instances.retain(|i| i.id != instance_id);
    file_manager::save_json(&instances_path, &instances)?;
    Ok(true)
}

#[tauri::command]
pub fn update_instance(instance_id: String, updates: serde_json::Value) -> Result<VersionInstance, AppError> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    
    let result = {
        if let Some(instance) = instances.iter_mut().find(|i| i.id == instance_id) {
            if let Some(name) = updates["name"].as_str() { instance.name = name.to_string(); }
            if let Some(gv) = updates["gameVersion"].as_str() { instance.game_version = gv.to_string(); }
            Ok(instance.clone())
        } else {
            Err(errors::instance_not_found(&instance_id))
        }
    };
    
    if result.is_ok() {
        file_manager::save_json(&instances_path, &instances)?;
    }
    result
}

#[tauri::command]
pub fn update_instance_settings(instance_id: String, settings: InstanceSettings) -> Result<VersionInstance, AppError> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    
    let result = {
        if let Some(instance) = instances.iter_mut().find(|i| i.id == instance_id) {
            instance.settings = settings;
            Ok(instance.clone())
        } else {
            Err(errors::instance_not_found(&instance_id))
        }
    };
    
    if result.is_ok() {
        file_manager::save_json(&instances_path, &instances)?;
    }
    result
}

#[tauri::command]
pub fn get_instance(instance_id: String) -> Result<Option<VersionInstance>, AppError> {
    let instances_path = paths::instances_file();
    let instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    Ok(instances.into_iter().find(|i| i.id == instance_id))
}

#[tauri::command]
pub fn get_instance_by_version(version_id: String) -> Result<Option<VersionInstance>, AppError> {
    let instances_path = paths::instances_file();
    let instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    Ok(instances.into_iter().find(|i| i.game_version == version_id))
}

#[tauri::command]
pub fn ensure_instances_for_versions(version_ids: Vec<String>) -> Result<bool, AppError> {
    let instances_path = paths::instances_file();
    let mut instances: Vec<VersionInstance> = file_manager::load_json_or_default(&instances_path);
    
    for vid in &version_ids {
        if !instances.iter().any(|i| i.game_version == *vid) {
            let instance = VersionInstance {
                id: uuid::Uuid::new_v4().to_string(),
                name: vid.clone(),
                game_version: vid.clone(),
                mod_loader: None,
                mod_loader_version: None,
                created_at: chrono::Utc::now().to_rfc3339(),
                last_played_at: None,
                total_time: 0,
                icon_url: None,
                instance_dir: String::new(),
                settings: InstanceSettings::default(),
                shader_packs: Vec::new(),
            };
            instances.push(instance);
        }
    }
    
    file_manager::save_json(&instances_path, &instances)?;
    Ok(true)
}
