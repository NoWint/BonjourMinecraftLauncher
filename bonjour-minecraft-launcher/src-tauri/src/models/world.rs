use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldInfo {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub game_version: String,
    pub game_mode: String,
    pub difficulty: String,
    pub cheats_enabled: bool,
    pub last_played: i64,
    pub last_played_date: String,
    pub total_time: i64,
    pub seed: Option<String>,
    pub spawn_x: i64,
    pub spawn_y: i64,
    pub spawn_z: i64,
    pub day_time: i64,
    pub rain_time: i64,
    pub thunder_time: i64,
    pub data_version: i64,
    pub is_locked: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorldBackup {
    pub id: String,
    pub world_name: String,
    pub world_path: String,
    pub backup_path: String,
    pub backup_date: String,
    pub size: u64,
    pub description: Option<String>,
}
