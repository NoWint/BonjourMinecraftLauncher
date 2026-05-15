use tauri;
use crate::errors::AppError;

#[tauri::command]
pub async fn download_file(url: String, target_path: String, options: Option<serde_json::Value>) -> Result<(), AppError> {
    let target = std::path::Path::new(&target_path);
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_root_str = crate::utils::paths::detect_game_root(&settings.game_dir);
    let game_root = std::path::Path::new(&game_root_str);
    crate::utils::paths::validate_path_within_root(target, game_root)?;

    let net = crate::services::network::NetworkService::new();
    let _ = options;
    net.download_file(&url, &target_path).await
}
#[tauri::command] pub fn pause_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
#[tauri::command] pub fn resume_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
#[tauri::command] pub fn cancel_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
