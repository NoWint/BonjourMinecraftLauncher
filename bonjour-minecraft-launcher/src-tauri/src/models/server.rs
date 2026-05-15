use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerEntry {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub group_id: Option<String>,
    pub tags: Vec<String>,
    pub added_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_played_at: Option<i64>,
    pub play_count: u32,
    pub favorite: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub notes: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_ping: Option<ServerPingResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerPingResult {
    pub online: bool,
    pub latency_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub players_online: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub players_max: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub protocol: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub player_list: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_b64: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_info: Option<ServerModInfo>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_pack_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub resource_pack_hash: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerModInfo {
    pub mod_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_list: Option<Vec<String>>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerGroup {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub color: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon: Option<String>,
    pub sort_order: usize,
    #[serde(default)]
    pub collapsed: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalServerConfig {
    pub id: String,
    pub name: String,
    pub game_version: String,
    pub server_type: String,
    pub port: u16,
    pub max_players: u32,
    pub difficulty: String,
    pub game_mode: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub seed: Option<String>,
    pub motd: String,
    pub online_mode: bool,
    pub pvp_enabled: bool,
    pub spawn_animals: bool,
    pub spawn_monsters: bool,
    pub server_dir: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub pid: Option<u32>,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub started_at: Option<i64>,
    pub auto_connect_client: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LANWorld {
    pub host: String,
    pub port: u16,
    pub world_name: String,
    pub game_mode: String,
    pub player_count: u32,
    pub discovered_at: i64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub motd: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendLobby {
    pub id: String,
    pub code: String,
    pub host_name: String,
    pub host_address: String,
    pub port: u16,
    pub participants: Vec<FriendLobbyParticipant>,
    pub status: String,
    pub created_at: i64,
    pub connection_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub relay_latency_ms: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FriendLobbyParticipant {
    pub id: String,
    pub name: String,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub address: Option<String>,
    pub joined_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerPerformanceData {
    pub tps: f64,
    pub memory_used_mb: f64,
    pub memory_total_mb: f64,
    pub player_count: u32,
    pub entity_count: u32,
    pub chunk_count: u32,
    pub cpu_usage: f64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerPerformanceHistory {
    pub server_id: String,
    pub data_points: Vec<ServerPerformanceData>,
    pub average_tps: f64,
    pub average_memory_usage: f64,
    pub peak_player_count: u32,
    pub last_updated: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerResourcePackInfo {
    pub url: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub hash: Option<String>,
    pub file_name: String,
    pub file_size: u64,
    pub downloaded: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub local_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_synced: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerModSyncResult {
    pub server_id: String,
    pub total_mods: u32,
    pub synced_mods: u32,
    pub skipped_client_only: u32,
    pub skipped_server_only: u32,
    pub errors: Vec<String>,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CommunityServer {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    pub description: String,
    pub tags: Vec<String>,
    pub rating: f64,
    pub rating_count: u32,
    pub player_count: u32,
    pub max_players: u32,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    pub submitted_at: i64,
    pub submitted_by: String,
    pub featured: bool,
    pub online: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerStatusNotification {
    pub server_id: String,
    pub server_name: String,
    pub notification_type: String,
    pub message: String,
    pub timestamp: i64,
    pub read: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerNotificationConfig {
    pub server_id: String,
    pub notify_online: bool,
    pub notify_offline: bool,
    pub notify_version_change: bool,
    pub notify_player_peak: bool,
    pub notify_maintenance: bool,
    pub player_peak_threshold: u32,
    pub check_interval_ms: u64,
}

impl Default for ServerNotificationConfig {
    fn default() -> Self {
        Self {
            server_id: String::new(),
            notify_online: true,
            notify_offline: true,
            notify_version_change: true,
            notify_player_peak: false,
            notify_maintenance: true,
            player_peak_threshold: 50,
            check_interval_ms: 60000,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ServerPortalEntry {
    pub id: String,
    pub name: String,
    pub address: String,
    pub port: u16,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub shortcut_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_used: Option<i64>,
}
