use tauri;
use tauri::State;
use crate::models::account::Account;
use crate::utils::crypto;
use crate::errors::AppError;
use crate::commands::db_commands::DbState;

#[tauri::command]
pub fn get_accounts(db: State<'_, DbState>) -> Result<Vec<Account>, AppError> {
    let manager = db.lock();
    manager.accounts().get_all()
}

#[tauri::command]
pub fn save_accounts(db: State<'_, DbState>, accounts: Vec<Account>) -> Result<bool, AppError> {
    let manager = db.lock();
    for account in &accounts {
        manager.accounts().insert(account)?;
    }
    Ok(true)
}

#[tauri::command]
pub fn add_offline_account(db: State<'_, DbState>, username: String) -> Result<Account, AppError> {
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
    let manager = db.lock();
    manager.accounts().insert(&account)?;
    Ok(account)
}

#[tauri::command]
pub fn delete_account(db: State<'_, DbState>, account_id: String) -> Result<bool, AppError> {
    let manager = db.lock();
    manager.accounts().delete(&account_id)
}
