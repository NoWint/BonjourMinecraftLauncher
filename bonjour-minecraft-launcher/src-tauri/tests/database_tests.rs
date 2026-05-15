use bonjour_minecraft_launcher_lib::db::DatabaseManager;
use bonjour_minecraft_launcher_lib::models::account::Account;
use bonjour_minecraft_launcher_lib::models::settings::LauncherSettings;
use bonjour_minecraft_launcher_lib::models::instance::{VersionInstance, InstanceSettings};
use bonjour_minecraft_launcher_lib::models::version::InstalledVersion;
use bonjour_minecraft_launcher_lib::models::server::{ServerEntry, ServerGroup};

#[test]
fn test_database_create_in_memory() {
    let db = DatabaseManager::new_in_memory();
    assert!(db.is_ok(), "Failed to create in-memory database");
}

#[test]
fn test_database_migrations() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");
    let accounts = db.accounts().get_all().expect("Failed to get accounts");
    assert!(accounts.is_empty(), "New database should have no accounts");

    let settings = db.settings().get().expect("Failed to get settings");
    assert_eq!(settings.game_dir, "", "Default game_dir should be empty");
}

#[test]
fn test_account_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let account = Account {
        id: "test-account-1".to_string(),
        account_type: "offline".to_string(),
        username: "TestPlayer".to_string(),
        uuid: "test-uuid-1234".to_string(),
        access_token: None,
        refresh_token: None,
        expires_at: None,
        skin_url: None,
        avatar_url: None,
        littleskin_server_url: None,
        littleskin_access_token: None,
    };

    db.accounts().insert(&account).expect("Failed to insert account");

    let accounts = db.accounts().get_all().expect("Failed to get accounts");
    assert_eq!(accounts.len(), 1, "Should have 1 account");
    assert_eq!(accounts[0].username, "TestPlayer");

    let found = db.accounts().get_by_id("test-account-1").expect("Failed to get by id");
    assert!(found.is_some(), "Should find account by id");
    assert_eq!(found.unwrap().username, "TestPlayer");

    let not_found = db.accounts().get_by_id("nonexistent").expect("Query failed");
    assert!(not_found.is_none(), "Should not find nonexistent account");

    let deleted = db.accounts().delete("test-account-1").expect("Failed to delete");
    assert!(deleted, "Should delete existing account");

    let accounts_after = db.accounts().get_all().expect("Failed to get accounts");
    assert!(accounts_after.is_empty(), "Should have no accounts after delete");
}

#[test]
fn test_settings_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let mut settings = LauncherSettings::default();
    settings.game_dir = "/test/game/dir".to_string();
    settings.java_path = "/usr/bin/java".to_string();
    settings.max_memory = 8192;
    settings.language = "en-US".to_string();

    db.settings().save(&settings).expect("Failed to save settings");

    let loaded = db.settings().get().expect("Failed to get settings");
    assert_eq!(loaded.game_dir, "/test/game/dir");
    assert_eq!(loaded.java_path, "/usr/bin/java");
    assert_eq!(loaded.max_memory, 8192);
    assert_eq!(loaded.language, "en-US");

    db.settings().set_key("custom_key", "custom_value").expect("Failed to set key");
    let val = db.settings().get_key("custom_key").expect("Failed to get key");
    assert_eq!(val, Some("custom_value".to_string()));
}

#[test]
fn test_instance_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let instance = VersionInstance {
        id: "instance-1".to_string(),
        name: "Test Instance".to_string(),
        game_version: "1.20.4".to_string(),
        mod_loader: Some("fabric".to_string()),
        mod_loader_version: Some("0.15.0".to_string()),
        created_at: "2024-01-01T00:00:00Z".to_string(),
        last_played_at: None,
        total_time: 0,
        icon_url: None,
        instance_dir: "/test/instance".to_string(),
        settings: InstanceSettings::default(),
        shader_packs: Vec::new(),
    };

    db.instances().insert(&instance).expect("Failed to insert instance");

    let instances = db.instances().get_all().expect("Failed to get instances");
    assert_eq!(instances.len(), 1);
    assert_eq!(instances[0].name, "Test Instance");
    assert_eq!(instances[0].game_version, "1.20.4");

    let found = db.instances().get_by_id("instance-1").expect("Query failed");
    assert!(found.is_some());

    let by_version = db.instances().get_by_version("1.20.4").expect("Query failed");
    assert!(by_version.is_some());

    db.instances().update_play_time("instance-1", 3600).expect("Failed to update play time");
    let updated = db.instances().get_by_id("instance-1").unwrap().unwrap();
    assert_eq!(updated.total_time, 3600);

    let deleted = db.instances().delete("instance-1").expect("Failed to delete");
    assert!(deleted);
}

#[test]
fn test_installed_version_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let version = InstalledVersion {
        id: "1.20.4".to_string(),
        version_type: "release".to_string(),
        installed_at: "2024-01-01".to_string(),
        path: "/test/versions/1.20.4".to_string(),
        mod_loader: Some("fabric".to_string()),
        mod_loader_version: Some("0.15.0".to_string()),
    };

    db.installed_versions().upsert(&version).expect("Failed to upsert version");

    let versions = db.installed_versions().get_all().expect("Failed to get versions");
    assert_eq!(versions.len(), 1);
    assert_eq!(versions[0].id, "1.20.4");

    let found = db.installed_versions().get_by_id("1.20.4").expect("Query failed");
    assert!(found.is_some());

    let deleted = db.installed_versions().delete("1.20.4").expect("Failed to delete");
    assert!(deleted);
}

#[test]
fn test_server_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let server = ServerEntry {
        id: "server-1".to_string(),
        name: "Test Server".to_string(),
        address: "localhost".to_string(),
        port: 25565,
        icon: None,
        group_id: None,
        tags: vec!["survival".to_string()],
        added_at: 1704067200,
        last_played_at: None,
        play_count: 0,
        favorite: false,
        notes: None,
        icon_url: None,
        last_ping: None,
    };

    db.servers().insert(&server).expect("Failed to insert server");

    let servers = db.servers().get_all().expect("Failed to get servers");
    assert_eq!(servers.len(), 1);
    assert_eq!(servers[0].name, "Test Server");

    let deleted = db.servers().delete("server-1").expect("Failed to delete");
    assert!(deleted);
}

#[test]
fn test_server_group_crud() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let group = ServerGroup {
        id: "group-1".to_string(),
        name: "Friends".to_string(),
        color: Some("#FF0000".to_string()),
        icon: None,
        sort_order: 0,
        collapsed: false,
    };

    db.server_groups().insert(&group).expect("Failed to insert group");

    let groups = db.server_groups().get_all().expect("Failed to get groups");
    assert_eq!(groups.len(), 1);
    assert_eq!(groups[0].name, "Friends");

    let deleted = db.server_groups().delete("group-1").expect("Failed to delete");
    assert!(deleted);
}

#[test]
fn test_json_import_export() {
    let db = DatabaseManager::new_in_memory().expect("Failed to create database");

    let account = Account {
        id: "import-test-1".to_string(),
        account_type: "offline".to_string(),
        username: "ImportTest".to_string(),
        uuid: "import-uuid".to_string(),
        access_token: None,
        refresh_token: None,
        expires_at: None,
        skin_url: None,
        avatar_url: None,
        littleskin_server_url: None,
        littleskin_access_token: None,
    };

    let instance = VersionInstance {
        id: "import-instance-1".to_string(),
        name: "Import Instance".to_string(),
        game_version: "1.20.4".to_string(),
        mod_loader: None,
        mod_loader_version: None,
        created_at: "2024-01-01T00:00:00Z".to_string(),
        last_played_at: None,
        total_time: 0,
        icon_url: None,
        instance_dir: String::new(),
        settings: InstanceSettings::default(),
        shader_packs: Vec::new(),
    };

    let tmp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let json_dir = tmp_dir.path().to_path_buf();

    let accounts_json = serde_json::to_string_pretty(&vec![&account]).expect("Failed to serialize");
    std::fs::write(json_dir.join("accounts.json"), accounts_json).expect("Failed to write");

    let instances_json = serde_json::to_string_pretty(&vec![&instance]).expect("Failed to serialize");
    std::fs::write(json_dir.join("instances.json"), instances_json).expect("Failed to write");

    let import_stats = db.import_from_json(&json_dir).expect("Failed to import");
    assert_eq!(import_stats.accounts_imported, 1);
    assert_eq!(import_stats.instances_imported, 1);

    let accounts = db.accounts().get_all().expect("Failed to get accounts");
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0].username, "ImportTest");

    let export_dir = tempfile::tempdir().expect("Failed to create export dir");
    let export_path = export_dir.path().to_path_buf();
    let export_stats = db.export_to_json(&export_path).expect("Failed to export");
    assert_eq!(export_stats.accounts_exported, 1);
    assert_eq!(export_stats.instances_exported, 1);

    assert!(export_path.join("accounts.json").exists());
    assert!(export_path.join("instances.json").exists());
}

#[test]
fn test_database_file_persistence() {
    let tmp_dir = tempfile::tempdir().expect("Failed to create temp dir");
    let db_path = tmp_dir.path().join("test.db");

    {
        let db = DatabaseManager::new(&db_path).expect("Failed to create database");
        let account = Account {
            id: "persist-1".to_string(),
            account_type: "offline".to_string(),
            username: "PersistTest".to_string(),
            uuid: "persist-uuid".to_string(),
            access_token: None,
            refresh_token: None,
            expires_at: None,
            skin_url: None,
            avatar_url: None,
            littleskin_server_url: None,
            littleskin_access_token: None,
        };
        db.accounts().insert(&account).expect("Failed to insert");
    }

    assert!(db_path.exists(), "Database file should exist after drop");

    let db2 = DatabaseManager::new(&db_path).expect("Failed to reopen database");
    let accounts = db2.accounts().get_all().expect("Failed to get accounts");
    assert_eq!(accounts.len(), 1);
    assert_eq!(accounts[0].username, "PersistTest");
}
