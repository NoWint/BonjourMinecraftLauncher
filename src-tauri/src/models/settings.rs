use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LauncherSettings {
    pub game_dir: String,
    pub java_path: String,
    pub max_memory: u64,
    pub min_memory: u64,
    pub window_width: u32,
    pub window_height: u32,
    pub fullscreen: bool,
    pub launch_server: String,
    pub close_after_launch: bool,
    pub setup_completed: bool,
    pub download_source: String,
    pub region: String,
    pub last_update_check: u64,
    pub update_channel: String,
    #[serde(default)]
    pub theme: String,
    #[serde(default)]
    pub theme_preset: String,
    #[serde(default)]
    pub custom_accent: String,
    #[serde(default)]
    pub language: String,
    #[serde(default)]
    pub background_variant: String,
    #[serde(default)]
    pub background_intensity: String,
    #[serde(default)]
    pub sound_enabled: bool,
    #[serde(default = "default_volume")]
    pub sound_volume: f64,
    #[serde(default)]
    pub reduce_motion: bool,
    #[serde(default)]
    pub high_contrast: bool,
    #[serde(default)]
    pub large_text: bool,
    #[serde(default)]
    pub launch_animation_style: String,
    #[serde(default)]
    pub window_position: String,
    #[serde(default = "default_true")]
    pub skip_pre_check: bool,
    #[serde(default)]
    pub overlay_enabled: bool,
    #[serde(default = "default_overlay_opacity")]
    pub overlay_opacity: f64,
    #[serde(default)]
    pub overlay_position: String,
}

fn default_volume() -> f64 {
    0.5
}

fn default_true() -> bool {
    true
}

fn default_overlay_opacity() -> f64 {
    0.85
}

impl Default for LauncherSettings {
    fn default() -> Self {
        Self {
            game_dir: String::new(),
            java_path: String::new(),
            max_memory: 4096,
            min_memory: 512,
            window_width: 1280,
            window_height: 720,
            fullscreen: false,
            launch_server: String::new(),
            close_after_launch: false,
            setup_completed: false,
            download_source: "auto".to_string(),
            region: String::new(),
            last_update_check: 0,
            update_channel: "stable".to_string(),
            theme: "system".to_string(),
            theme_preset: "minecraft".to_string(),
            custom_accent: String::new(),
            language: "zh-CN".to_string(),
            background_variant: "mesh".to_string(),
            background_intensity: "subtle".to_string(),
            sound_enabled: true,
            sound_volume: 0.5,
            reduce_motion: false,
            high_contrast: false,
            large_text: false,
            launch_animation_style: "default".to_string(),
            window_position: "center".to_string(),
            skip_pre_check: true,
            overlay_enabled: true,
            overlay_opacity: 0.85,
            overlay_position: "top-right".to_string(),
        }
    }
}
