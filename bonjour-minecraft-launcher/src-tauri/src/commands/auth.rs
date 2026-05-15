use tauri;
use tauri_plugin_dialog::DialogExt;
use tauri::State;
use crate::services::microsoft_auth::MicrosoftAuthService;
use crate::services::littleskin_auth::LittleskinAuthService;
use crate::errors::AppError;
use reqwest::Client;

pub struct AuthState {
    pub client: Client,
}

impl AuthState {
    pub fn new() -> Self {
        AuthState {
            client: Client::builder()
                .timeout(std::time::Duration::from_secs(30))
                .build()
                .expect("Failed to create HTTP client"),
        }
    }
}

#[tauri::command]
pub async fn microsoft_login_start(state: State<'_, AuthState>) -> Result<serde_json::Value, AppError> {
    let service = MicrosoftAuthService::with_client(state.client.clone());
    let result = service.start_device_code_flow().await?;
    Ok(serde_json::to_value(result).unwrap_or_default())
}

#[tauri::command]
pub async fn microsoft_login_poll(state: State<'_, AuthState>, device_code: String) -> Result<serde_json::Value, AppError> {
    let service = MicrosoftAuthService::with_client(state.client.clone());
    let result = service.poll_token(&device_code).await?;
    Ok(serde_json::to_value(result).unwrap_or_default())
}

#[tauri::command]
pub async fn microsoft_login_refresh(state: State<'_, AuthState>, refresh_token: String) -> Result<serde_json::Value, AppError> {
    let service = MicrosoftAuthService::with_client(state.client.clone());
    match service.refresh_token(&refresh_token).await {
        Ok(account) => Ok(serde_json::json!({
            "success": true,
            "accessToken": account.access_token,
            "refreshToken": account.refresh_token,
            "expiresAt": account.expires_at,
            "profile": {
                "id": account.uuid,
                "name": account.username,
                "skinUrl": account.skin_url,
            }
        })),
        Err(e) => Ok(serde_json::json!({
            "success": false,
            "error": e.to_string()
        })),
    }
}

#[tauri::command]
pub async fn upload_skin(access_token: String, skin_path: String, skin_model: String) -> Result<serde_json::Value, AppError> {
    let _ = (access_token, skin_path, skin_model);
    Err(crate::errors::unsupported("upload_skin"))
}

#[tauri::command]
pub fn upload_avatar(account_id: String, image_path: String) -> Result<serde_json::Value, AppError> {
    let _ = (account_id, image_path);
    Err(crate::errors::unsupported("upload_avatar"))
}

#[tauri::command]
pub async fn select_image_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog()
        .file()
        .add_filter("Image", &["png", "jpg", "jpeg"])
        .set_title("选择图片文件")
        .blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn select_skin_file(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog()
        .file()
        .add_filter("Skin", &["png"])
        .set_title("选择皮肤文件")
        .blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn littleskin_login(state: State<'_, AuthState>, server_url: String, email: String, password: String) -> Result<serde_json::Value, AppError> {
    let service = LittleskinAuthService::with_client(state.client.clone());
    match service.login(&server_url, &email, &password).await {
        Ok((account, _token)) => Ok(serde_json::json!({"success": true, "account": account})),
        Err(e) => Ok(serde_json::json!({"success": false, "error": e.to_string()})),
    }
}

#[tauri::command]
pub async fn littleskin_get_players(server_url: String, access_token: String) -> Result<serde_json::Value, AppError> {
    let _ = (server_url, access_token);
    Err(crate::errors::unsupported("littleskin_get_players"))
}

#[tauri::command]
pub async fn littleskin_upload_skin(server_url: String, access_token: String, skin_path: String, player_name: String) -> Result<serde_json::Value, AppError> {
    let _ = (server_url, access_token, skin_path, player_name);
    Err(crate::errors::unsupported("littleskin_upload_skin"))
}
