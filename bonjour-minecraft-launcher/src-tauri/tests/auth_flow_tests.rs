use bonjour_minecraft_launcher::db::connection::DatabaseConnection;
use bonjour_minecraft_launcher::db::repository::AccountRepository;
use bonjour_minecraft_launcher::models::account::Account;

fn create_test_db() -> DatabaseConnection {
    DatabaseConnection::new_in_memory().unwrap()
}

fn create_test_account(id: &str, username: &str) -> Account {
    Account {
        id: id.to_string(),
        account_type: "offline".to_string(),
        username: username.to_string(),
        uuid: format!("uuid-{}", id),
        access_token: Some(format!("token-{}", id)),
        refresh_token: Some(format!("refresh-{}", id)),
        expires_at: Some(9999999999),
        skin_url: None,
        avatar_url: None,
        littleskin_server_url: None,
        littleskin_access_token: None,
    }
}

#[test]
fn test_insert_and_get_account() {
    let mut conn = create_test_db();
    conn.execute(include_str!("../src/db/migrations/001_initial.sql")).unwrap();

    let repo = AccountRepository::new(std::sync::Arc::new(parking_lot::Mutex::new(conn)));
    let account = create_test_account("1", "TestPlayer");

    repo.insert(&account).unwrap();

    let retrieved = repo.get_by_id("1").unwrap().unwrap();
    assert_eq!(retrieved.username, "TestPlayer");
    assert_eq!(retrieved.uuid, "uuid-1");
}

#[test]
fn test_get_all_accounts() {
    let mut conn = create_test_db();
    conn.execute(include_str!("../src/db/migrations/001_initial.sql")).unwrap();

    let repo = AccountRepository::new(std::sync::Arc::new(parking_lot::Mutex::new(conn)));
    repo.insert(&create_test_account("1", "Player1")).unwrap();
    repo.insert(&create_test_account("2", "Player2")).unwrap();

    let accounts = repo.get_all().unwrap();
    assert_eq!(accounts.len(), 2);
}

#[test]
fn test_delete_account() {
    let mut conn = create_test_db();
    conn.execute(include_str!("../src/db/migrations/001_initial.sql")).unwrap();

    let repo = AccountRepository::new(std::sync::Arc::new(parking_lot::Mutex::new(conn)));
    repo.insert(&create_test_account("1", "Player1")).unwrap();

    repo.delete("1").unwrap();

    let result = repo.get_by_id("1").unwrap();
    assert!(result.is_none());
}

#[test]
fn test_update_tokens() {
    let mut conn = create_test_db();
    conn.execute(include_str!("../src/db/migrations/001_initial.sql")).unwrap();

    let repo = AccountRepository::new(std::sync::Arc::new(parking_lot::Mutex::new(conn)));
    repo.insert(&create_test_account("1", "Player1")).unwrap();

    repo.update_tokens("1", Some("new-access-token"), Some("new-refresh-token"), Some(12345)).unwrap();

    let updated = repo.get_by_id("1").unwrap().unwrap();
    assert_eq!(updated.access_token.as_deref(), Some("new-access-token"));
    assert_eq!(updated.refresh_token.as_deref(), Some("new-refresh-token"));
    assert_eq!(updated.expires_at, Some(12345));
}

#[test]
fn test_encrypted_tokens_in_db() {
    let mut conn = create_test_db();
    conn.execute(include_str!("../src/db/migrations/001_initial.sql")).unwrap();

    let repo = AccountRepository::new(std::sync::Arc::new(parking_lot::Mutex::new(conn)));
    let account = create_test_account("1", "Player1");
    repo.insert(&account).unwrap();

    let retrieved = repo.get_by_id("1").unwrap().unwrap();
    assert_eq!(retrieved.access_token.as_deref(), Some("token-1"));
    assert_eq!(retrieved.refresh_token.as_deref(), Some("refresh-1"));
}
