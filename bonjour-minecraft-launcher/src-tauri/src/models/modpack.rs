use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackEntry {
    pub id: String,
    pub name: String,
    pub version: String,
    pub author: String,
    pub description: String,
    pub game_version: String,
    pub mod_loader: Option<String>,
    pub mod_loader_version: Option<String>,
    pub format: ModpackFormat,
    pub source_path: Option<String>,
    pub instance_id: Option<String>,
    pub instance_name: Option<String>,
    pub installed_at: i64,
    pub last_updated: Option<i64>,
    pub mods: Vec<ModpackModEntry>,
    pub configs: Vec<ModpackConfigEntry>,
    pub overrides_dir: Option<String>,
    pub icon_url: Option<String>,
    pub source_url: Option<String>,
    pub is_fork: Option<bool>,
    pub fork_info: Option<ModpackForkInfo>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ModpackFormat {
    CurseForge,
    Modrinth,
    Ftb,
    Technic,
    Bonjour,
    Unknown,
}

impl Default for ModpackFormat {
    fn default() -> Self {
        ModpackFormat::Unknown
    }
}

impl ModpackFormat {
    pub fn as_str(&self) -> &str {
        match self {
            ModpackFormat::CurseForge => "curseforge",
            ModpackFormat::Modrinth => "modrinth",
            ModpackFormat::Ftb => "ftb",
            ModpackFormat::Technic => "technic",
            ModpackFormat::Bonjour => "bonjour",
            ModpackFormat::Unknown => "unknown",
        }
    }

    pub fn from_str(s: &str) -> Self {
        match s.to_lowercase().as_str() {
            "curseforge" => ModpackFormat::CurseForge,
            "modrinth" => ModpackFormat::Modrinth,
            "ftb" => ModpackFormat::Ftb,
            "technic" => ModpackFormat::Technic,
            "bonjour" => ModpackFormat::Bonjour,
            _ => ModpackFormat::Unknown,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackModEntry {
    pub file_name: String,
    pub project_id: Option<i64>,
    pub file_id: Option<i64>,
    pub download_url: Option<String>,
    pub hash: Option<String>,
    pub size: Option<u64>,
    pub source: ModEntrySource,
    pub required: bool,
    pub folder_path: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ModEntrySource {
    CurseForge,
    Modrinth,
    Direct,
    Local,
}

impl Default for ModEntrySource {
    fn default() -> Self {
        ModEntrySource::Local
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackConfigEntry {
    pub relative_path: String,
    pub source: ConfigEntrySource,
    pub hash: Option<String>,
    pub size: Option<u64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConfigEntrySource {
    Override,
    Embedded,
}

impl Default for ConfigEntrySource {
    fn default() -> Self {
        ConfigEntrySource::Override
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackForkInfo {
    pub original_pack_id: String,
    pub original_pack_name: String,
    pub original_version: String,
    pub fork_created_at: i64,
    pub added_mods: Vec<String>,
    pub removed_mods: Vec<String>,
    pub modified_configs: Vec<String>,
    pub last_synced_version: String,
    pub has_upstream_update: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackDiff {
    pub added: Vec<ModpackModEntry>,
    pub removed: Vec<ModpackModEntry>,
    pub updated: Vec<ModpackModEntry>,
    pub config_changes: Vec<ModpackConfigChange>,
    pub summary: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackConfigChange {
    pub path: String,
    pub change_type: ConfigChangeType,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ConfigChangeType {
    Added,
    Modified,
    Removed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackUpdateResult {
    pub success: bool,
    pub mods_added: u32,
    pub mods_removed: u32,
    pub mods_updated: u32,
    pub config_changes: u32,
    pub errors: Vec<String>,
    pub rolled_back: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackTestResult {
    pub passed: bool,
    pub checks: Vec<ModpackTestCheck>,
    pub overall_score: u32,
    pub estimated_startup_time: u32,
    pub estimated_fps: u32,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackTestCheck {
    pub id: String,
    pub name: String,
    pub category: TestCheckCategory,
    pub status: TestCheckStatus,
    pub message: String,
    pub details: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TestCheckCategory {
    Dependency,
    Conflict,
    Resource,
    Compatibility,
    Performance,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum TestCheckStatus {
    Pass,
    Warn,
    Fail,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackPerformanceBenchmark {
    pub modpack_id: String,
    pub modpack_name: String,
    pub mod_count: u32,
    pub min_ram: u64,
    pub recommended_ram: u64,
    pub startup_time_min: u32,
    pub startup_time_max: u32,
    pub fps_min: u32,
    pub fps_avg: u32,
    pub fps_max: u32,
    pub test_config: String,
    pub sample_count: u32,
    pub last_updated: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackSyncRoom {
    pub id: String,
    pub code: String,
    pub host_id: String,
    pub host_name: String,
    pub modpack_name: String,
    pub modpack_version: String,
    pub game_version: String,
    pub mod_loader: String,
    pub mod_count: u32,
    pub participants: Vec<ModpackSyncParticipant>,
    pub created_at: i64,
    pub status: SyncRoomStatus,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncRoomStatus {
    Waiting,
    Syncing,
    Complete,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackSyncParticipant {
    pub id: String,
    pub name: String,
    pub status: SyncParticipantStatus,
    pub progress: u32,
    pub joined_at: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum SyncParticipantStatus {
    Waiting,
    Downloading,
    Installing,
    Complete,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackRecommendation {
    pub modpack_id: String,
    pub name: String,
    pub score: f64,
    pub reason: String,
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackRating {
    pub modpack_id: String,
    pub completeness: u32,
    pub stability: u32,
    pub performance: u32,
    pub difficulty: u32,
    pub innovation: u32,
    pub overall: u32,
    pub review_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackForkConflict {
    pub mod_file_name: String,
    pub conflict_type: ForkConflictType,
    pub upstream_action: String,
    pub fork_action: String,
    pub resolution: Option<ForkConflictResolution>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ForkConflictType {
    ModAddedUpstream,
    ModRemovedUpstream,
    ModVersionConflict,
    ConfigConflict,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub enum ForkConflictResolution {
    KeepFork,
    KeepUpstream,
    Merge,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModpackForkMergeResult {
    pub success: bool,
    pub conflicts: Vec<ModpackForkConflict>,
    pub auto_resolved: u32,
    pub manual_required: u32,
}
