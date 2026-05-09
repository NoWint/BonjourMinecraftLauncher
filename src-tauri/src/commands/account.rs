use tauri;
use crate::models::account::Account;
use crate::services::file_manager;
use crate::utils::{paths, crypto};
use crate::errors::AppError;

#[tauri::command]
pub fn get_accounts() -> Result<Vec<Account>, AppError> {
    let accounts_path = paths::accounts_file();
    let accounts: Vec<Account> = file_manager::load_json_or_default(&accounts_path);
    Ok(accounts)
}

#[tauri::command]
pub fn save_accounts(accounts: Vec<Account>) -> Result<bool, AppError> {
    let accounts_path = paths::accounts_file();
    file_manager::save_json(&accounts_path, &accounts)?;
    Ok(true)
}

#[tauri::command]
pub fn add_offline_account(username: String) -> Result<Account, AppError> {
    let accounts_path = paths::accounts_file();
    let mut accounts: Vec<Account> = file_manager::load_json_or_default(&accounts_path);
    
    let account = Account {
        id: uuid::Uuid::new_v4().to_string(),
        account_type: "offline".to_string(),
        username: username.clone(),
        uuid: crypto::offline_uuid(&username),
        access_token: None,
        refresh_token: None,
        expires_at: None,
        skin_url: None,
        avatar_url: None,
        littleskin_server_url: None,
        littleskin_access_token: None,
    };
    
    accounts.push(account.clone());
    file_manager::save_json(&accounts_path, &accounts)?;
    Ok(account)
}

#[tauri::command]
pub fn delete_account(account_id: String) -> Result<bool, AppError> {
    let accounts_path = paths::accounts_file();
    let mut accounts: Vec<Account> = file_manager::load_json_or_default(&accounts_path);
    
    accounts.retain(|a| a.id != account_id);
    file_manager::save_json(&accounts_path, &accounts)?;
    Ok(true)
}
