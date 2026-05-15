use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct InstanceSettings {
    pub java_path: String,
    pub max_memory: u64,
    pub min_memory: u64,
    pub window_width: u32,
    pub window_height: u32,
    pub fullscreen: bool,
    pub jvm_args: Vec<String>,
    pub game_dir: String,
    pub launch_server: String,
    pub close_after_launch: bool,
    pub use_instance_settings: bool,
}

impl Default for InstanceSettings {
    fn default() -> Self {
        Self {
            java_path: String::new(),
            max_memory: 4096,
            min_memory: 512,
            window_width: 1280,
            window_height: 720,
            fullscreen: false,
            jvm_args: Vec::new(),
            game_dir: String::new(),
            launch_server: String::new(),
            close_after_launch: false,
            use_instance_settings: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ShaderPack {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub is_enabled: bool,
    pub priority: u32,
    pub added_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub preview_url: Option<String>,
    pub source: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct VersionInstance {
    pub id: String,
    pub name: String,
    pub game_version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_loader: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_loader_version: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_played_at: Option<String>,
    pub total_time: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    pub instance_dir: String,
    pub settings: InstanceSettings,
    pub shader_packs: Vec<ShaderPack>,
}
