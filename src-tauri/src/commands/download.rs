use tauri;
use crate::errors::AppError;

#[tauri::command]
pub async fn download_file(url: String, target_path: String, options: Option<serde_json::Value>) -> Result<(), AppError> {
    let net = crate::services::network::NetworkService::new();
    let _ = options;
    net.download_file(&url, &target_path).await
}
#[tauri::command] pub fn pause_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
#[tauri::command] pub fn resume_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
#[tauri::command] pub fn cancel_download(task_id: String) -> Result<(), AppError> { let _ = task_id; Ok(()) }
