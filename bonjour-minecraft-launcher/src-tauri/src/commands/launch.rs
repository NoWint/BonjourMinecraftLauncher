use tauri;
use tauri::Manager;
use crate::models::instance::VersionInstance;
use crate::models::launch::LaunchOptions;
use crate::services::minecraft_launcher::MinecraftLauncher;
use crate::errors::AppError;
use std::sync::Arc;

#[tauri::command]
pub async fn launch_game(options: LaunchOptions, app: tauri::AppHandle) -> Result<bool, AppError> {
    let state = app.state::<Arc<crate::commands::advanced::AppState>>();
    let launcher = MinecraftLauncher;
    let _pid = launcher.launch(&options, &app, Some(&state.launch_engine))?;
    Ok(true)
}

#[tauri::command]
pub async fn launch_instance(instance_id: String, account: crate::models::account::Account, app: tauri::AppHandle) -> Result<bool, AppError> {
    let instances_path = crate::utils::paths::instances_file();
    let instances: Vec<VersionInstance> = 
        crate::services::file_manager::load_json_or_default(&instances_path);
    
    let instance = instances.iter()
        .find(|i| i.id == instance_id)
        .ok_or_else(|| crate::errors::instance_not_found(&instance_id))?
        .clone();
    
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = 
        crate::services::file_manager::load_json_or_default(&settings_path);
    
    let game_dir = if instance.settings.use_instance_settings && !instance.settings.game_dir.is_empty() {
        instance.settings.game_dir.clone()
    } else {
        crate::utils::paths::detect_game_root(&settings.game_dir)
    };
    
    let java_path = if instance.settings.use_instance_settings && !instance.settings.java_path.is_empty() {
        instance.settings.java_path.clone()
    } else {
        settings.java_path.clone()
    };
    
    let max_memory = if instance.settings.use_instance_settings { instance.settings.max_memory } else { settings.max_memory };
    let min_memory = if instance.settings.use_instance_settings { instance.settings.min_memory } else { settings.min_memory };
    
    let options = LaunchOptions {
        version: instance.game_version.clone(),
        account,
        java_path: Some(java_path),
        max_memory,
        min_memory,
        game_dir,
        width: Some(instance.settings.window_width),
        height: Some(instance.settings.window_height),
        fullscreen: Some(instance.settings.fullscreen),
        server: if !instance.settings.launch_server.is_empty() { Some(instance.settings.launch_server.clone()) } else { None },
        jvm_args: if !instance.settings.jvm_args.is_empty() { Some(instance.settings.jvm_args.clone()) } else { None },
        instance_id: Some(instance_id),
    };
    
    let state = app.state::<Arc<crate::commands::advanced::AppState>>();
    let launcher = MinecraftLauncher;
    let _pid = launcher.launch(&options, &app, Some(&state.launch_engine))?;
    Ok(true)
}

#[tauri::command]
pub async fn warmup_launch_cache(game_dir: String, version: String) -> Result<bool, AppError> {
    MinecraftLauncher::warmup(&game_dir, &version)?;
    Ok(true)
}
