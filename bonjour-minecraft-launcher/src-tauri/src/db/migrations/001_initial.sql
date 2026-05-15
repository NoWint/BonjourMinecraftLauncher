CREATE TABLE IF NOT EXISTS accounts (
    id TEXT PRIMARY KEY,
    account_type TEXT NOT NULL,
    username TEXT NOT NULL,
    uuid TEXT NOT NULL UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    expires_at INTEGER,
    skin_url TEXT,
    avatar_url TEXT,
    littleskin_server_url TEXT,
    littleskin_access_token TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_accounts_username ON accounts(username);
CREATE INDEX IF NOT EXISTS idx_accounts_type ON accounts(account_type);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS instances (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    game_version TEXT NOT NULL,
    mod_loader TEXT,
    mod_loader_version TEXT,
    created_at TEXT NOT NULL,
    last_played_at TEXT,
    total_time INTEGER NOT NULL DEFAULT 0,
    icon_url TEXT,
    instance_dir TEXT NOT NULL DEFAULT '',
    java_path TEXT NOT NULL DEFAULT '',
    max_memory INTEGER NOT NULL DEFAULT 4096,
    min_memory INTEGER NOT NULL DEFAULT 512,
    window_width INTEGER NOT NULL DEFAULT 1280,
    window_height INTEGER NOT NULL DEFAULT 720,
    fullscreen INTEGER NOT NULL DEFAULT 0,
    jvm_args TEXT NOT NULL DEFAULT '[]',
    game_dir TEXT NOT NULL DEFAULT '',
    launch_server TEXT NOT NULL DEFAULT '',
    close_after_launch INTEGER NOT NULL DEFAULT 0,
    use_instance_settings INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_instances_game_version ON instances(game_version);
CREATE INDEX IF NOT EXISTS idx_instances_name ON instances(name);
CREATE INDEX IF NOT EXISTS idx_instances_last_played ON instances(last_played_at);

CREATE TABLE IF NOT EXISTS instance_shader_packs (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 0,
    priority INTEGER NOT NULL DEFAULT 0,
    added_at TEXT NOT NULL,
    description TEXT,
    preview_url TEXT,
    source TEXT NOT NULL DEFAULT '',
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shader_packs_instance ON instance_shader_packs(instance_id);

CREATE TABLE IF NOT EXISTS installed_versions (
    id TEXT PRIMARY KEY,
    version_type TEXT NOT NULL DEFAULT 'release',
    installed_at TEXT NOT NULL DEFAULT '',
    path TEXT NOT NULL DEFAULT '',
    mod_loader TEXT,
    mod_loader_version TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_installed_versions_type ON installed_versions(version_type);

CREATE TABLE IF NOT EXISTS servers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    address TEXT NOT NULL,
    port INTEGER NOT NULL DEFAULT 25565,
    icon TEXT,
    group_id TEXT,
    tags TEXT NOT NULL DEFAULT '[]',
    added_at INTEGER NOT NULL DEFAULT 0,
    last_played_at INTEGER,
    play_count INTEGER NOT NULL DEFAULT 0,
    favorite INTEGER NOT NULL DEFAULT 0,
    notes TEXT,
    icon_url TEXT,
    last_ping_online INTEGER,
    last_ping_latency_ms INTEGER,
    last_ping_players_online INTEGER,
    last_ping_players_max INTEGER,
    last_ping_version TEXT,
    last_ping_description TEXT,
    last_ping_protocol INTEGER,
    last_ping_player_list TEXT,
    last_ping_icon_b64 TEXT,
    last_ping_mod_type TEXT,
    last_ping_mod_list TEXT,
    last_ping_resource_pack_url TEXT,
    last_ping_resource_pack_hash TEXT,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_servers_name ON servers(name);
CREATE INDEX IF NOT EXISTS idx_servers_group ON servers(group_id);
CREATE INDEX IF NOT EXISTS idx_servers_favorite ON servers(favorite);

CREATE TABLE IF NOT EXISTS server_groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    icon TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    collapsed INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS world_backups (
    id TEXT PRIMARY KEY,
    world_name TEXT NOT NULL,
    world_path TEXT NOT NULL,
    backup_path TEXT NOT NULL,
    backup_date TEXT NOT NULL,
    size INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_world_backups_world ON world_backups(world_name);

CREATE TABLE IF NOT EXISTS launch_records (
    id TEXT PRIMARY KEY,
    version TEXT NOT NULL,
    account_name TEXT NOT NULL,
    instance_id TEXT,
    start_time INTEGER NOT NULL,
    status TEXT NOT NULL DEFAULT 'preparing',
    pid INTEGER,
    exit_code INTEGER,
    completed_at INTEGER,
    total_duration_ms INTEGER,
    phase_durations TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_launch_records_version ON launch_records(version);
CREATE INDEX IF NOT EXISTS idx_launch_records_instance ON launch_records(instance_id);
CREATE INDEX IF NOT EXISTS idx_launch_records_start_time ON launch_records(start_time);
CREATE INDEX IF NOT EXISTS idx_launch_records_status ON launch_records(status);

CREATE TABLE IF NOT EXISTS launch_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    launch_id TEXT NOT NULL,
    log_type TEXT NOT NULL,
    message TEXT NOT NULL,
    phase_id TEXT,
    timestamp INTEGER NOT NULL,
    diagnosis_rule_id TEXT,
    diagnosis_title TEXT,
    diagnosis_description TEXT,
    diagnosis_solution TEXT,
    diagnosis_severity TEXT,
    FOREIGN KEY (launch_id) REFERENCES launch_records(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_launch_logs_launch_id ON launch_logs(launch_id);

CREATE TABLE IF NOT EXISTS crash_reports (
    id TEXT PRIMARY KEY,
    timestamp INTEGER NOT NULL,
    version TEXT NOT NULL,
    instance_id TEXT,
    exit_code INTEGER NOT NULL,
    stack_trace TEXT NOT NULL,
    os TEXT NOT NULL DEFAULT '',
    os_version TEXT NOT NULL DEFAULT '',
    java_version TEXT NOT NULL DEFAULT '',
    total_memory_mb INTEGER NOT NULL DEFAULT 0,
    cpu_model TEXT NOT NULL DEFAULT '',
    gpu_info TEXT NOT NULL DEFAULT '',
    disk_free_gb REAL NOT NULL DEFAULT 0.0,
    process_count INTEGER NOT NULL DEFAULT 0,
    mod_list TEXT NOT NULL DEFAULT '[]',
    jvm_args TEXT NOT NULL DEFAULT '[]',
    diagnosis_category TEXT,
    diagnosis_title TEXT,
    diagnosis_description TEXT,
    diagnosis_confidence REAL,
    raw_log TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_crash_reports_version ON crash_reports(version);
CREATE INDEX IF NOT EXISTS idx_crash_reports_timestamp ON crash_reports(timestamp);

CREATE TABLE IF NOT EXISTS local_mods (
    id TEXT PRIMARY KEY,
    instance_id TEXT NOT NULL,
    name TEXT NOT NULL,
    file_name TEXT NOT NULL,
    file_path TEXT NOT NULL,
    file_size INTEGER NOT NULL DEFAULT 0,
    is_enabled INTEGER NOT NULL DEFAULT 1,
    description TEXT,
    version TEXT,
    game_versions TEXT,
    mod_loader TEXT,
    mod_id TEXT,
    sha256 TEXT,
    icon_url TEXT,
    install_date TEXT,
    config_path TEXT,
    source TEXT,
    source_id TEXT,
    metadata_json TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (instance_id) REFERENCES instances(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_local_mods_instance ON local_mods(instance_id);
CREATE INDEX IF NOT EXISTS idx_local_mods_name ON local_mods(name);
CREATE INDEX IF NOT EXISTS idx_local_mods_mod_id ON local_mods(mod_id);
CREATE INDEX IF NOT EXISTS idx_local_mods_enabled ON local_mods(is_enabled);
