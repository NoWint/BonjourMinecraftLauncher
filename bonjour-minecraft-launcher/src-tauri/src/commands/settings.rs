use tauri;
use tauri_plugin_dialog::DialogExt;
use crate::models::settings::LauncherSettings;
use crate::services::{file_manager, java_detector};
use crate::utils::paths;
use crate::errors::{self, AppError};

#[tauri::command]
pub fn auto_setup() -> Result<serde_json::Value, AppError> {
    let game_dir = paths::ensure_default_game_dir()
        .map_err(|e| errors::internal(e))?;
    
    let game_dir_str = game_dir.to_string_lossy().to_string();
    
    let settings_path = paths::settings_file();
    let current: LauncherSettings = file_manager::load_json_or_default(&settings_path);
    
    let java_path = java_detector::find_system_java()
        .or_else(|| {
            let bundled_dir = game_dir.join("java").join("versions");
            if let Ok(entries) = std::fs::read_dir(&bundled_dir) {
                for entry in entries.flatten() {
                    let name = entry.file_name().to_string_lossy().to_string();
                    if name.parse::<u32>().is_ok() {
                        let bin = if cfg!(target_os = "windows") {
                            entry.path().join("bin").join("java.exe")
                        } else {
                            entry.path().join("bin").join("java")
                        };
                        if bin.exists() {
                            return Some(bin.to_string_lossy().to_string());
                        }
                    }
                }
            }
            None
        })
        .unwrap_or_default();
    
    let needs_java = java_path.is_empty();
    
    let merged = LauncherSettings {
        game_dir: if current.game_dir.is_empty() { game_dir_str } else { current.game_dir },
        java_path: if current.java_path.is_empty() { java_path } else { current.java_path },
        max_memory: if current.max_memory == 0 { 4096 } else { current.max_memory },
        min_memory: if current.min_memory == 0 { 512 } else { current.min_memory },
        ..current
    };
    
    file_manager::save_json(&settings_path, &merged)?;
    
    Ok(serde_json::json!({
        "gameDir": merged.game_dir,
        "javaPath": merged.java_path,
        "needsJavaDownload": needs_java,
        "settings": merged
    }))
}

#[tauri::command]
pub fn get_settings() -> Result<LauncherSettings, AppError> {
    let settings_path = paths::settings_file();
    let settings: LauncherSettings = file_manager::load_json_or_default(&settings_path);

    let corrected_dir = paths::detect_game_root(&settings.game_dir);
    let mut settings = settings;
    if corrected_dir != settings.game_dir {
        settings.game_dir = corrected_dir;
        let _ = save_settings(settings.clone());
    }

    Ok(settings)
}

#[tauri::command]
pub fn save_settings(settings: LauncherSettings) -> Result<bool, AppError> {
    let settings_path = paths::settings_file();
    file_manager::save_json(&settings_path, &settings)?;
    Ok(true)
}

#[tauri::command]
pub fn complete_setup(settings: serde_json::Value) -> Result<LauncherSettings, AppError> {
    let settings_path = paths::settings_file();
    let current: LauncherSettings = file_manager::load_json_or_default(&settings_path);

    let patch: LauncherSettings = serde_json::from_value(settings)
        .map_err(|e| errors::json_parse_error(format!("Invalid settings format: {}", e)))?;

    let merged = LauncherSettings {
        game_dir: if patch.game_dir.is_empty() { current.game_dir } else { patch.game_dir },
        java_path: if patch.java_path.is_empty() { current.java_path } else { patch.java_path },
        max_memory: if patch.max_memory == 0 { current.max_memory } else { patch.max_memory },
        min_memory: if patch.min_memory == 0 { current.min_memory } else { patch.min_memory },
        window_width: if patch.window_width == 0 { current.window_width } else { patch.window_width },
        window_height: if patch.window_height == 0 { current.window_height } else { patch.window_height },
        fullscreen: patch.fullscreen || current.fullscreen,
        launch_server: if patch.launch_server.is_empty() { current.launch_server } else { patch.launch_server },
        close_after_launch: patch.close_after_launch,
        setup_completed: patch.setup_completed,
        download_source: if patch.download_source.is_empty() { current.download_source } else { patch.download_source },
        region: if patch.region.is_empty() { current.region } else { patch.region },
        last_update_check: current.last_update_check,
        update_channel: if patch.update_channel.is_empty() { current.update_channel } else { patch.update_channel },
        theme: if patch.theme.is_empty() { current.theme } else { patch.theme },
        theme_preset: if patch.theme_preset.is_empty() { current.theme_preset } else { patch.theme_preset },
        custom_accent: if patch.custom_accent.is_empty() { current.custom_accent } else { patch.custom_accent },
        language: if patch.language.is_empty() { current.language } else { patch.language },
        background_variant: if patch.background_variant.is_empty() { current.background_variant } else { patch.background_variant },
        background_intensity: if patch.background_intensity.is_empty() { current.background_intensity } else { patch.background_intensity },
        sound_enabled: patch.sound_enabled || current.sound_enabled,
        sound_volume: if patch.sound_volume == 0.0 { current.sound_volume } else { patch.sound_volume },
        reduce_motion: patch.reduce_motion,
        high_contrast: patch.high_contrast,
        large_text: patch.large_text,
        launch_animation_style: if patch.launch_animation_style.is_empty() { current.launch_animation_style } else { patch.launch_animation_style },
        window_position: if patch.window_position.is_empty() { current.window_position } else { patch.window_position },
        skip_pre_check: patch.skip_pre_check || current.skip_pre_check,
        overlay_enabled: patch.overlay_enabled,
        overlay_opacity: if patch.overlay_opacity == 0.0 { current.overlay_opacity } else { patch.overlay_opacity },
        overlay_position: if patch.overlay_position.is_empty() { current.overlay_position } else { patch.overlay_position },
    };

    file_manager::save_json(&settings_path, &merged)?;
    Ok(merged)
}

#[tauri::command]
pub fn is_first_launch() -> Result<bool, AppError> {
    let settings_path = paths::settings_file();
    if !settings_path.exists() {
        return Ok(true);
    }
    let settings: LauncherSettings = file_manager::load_json_or_default(&settings_path);
    Ok(!settings.setup_completed)
}

#[tauri::command]
pub async fn select_java_path(app: tauri::AppHandle) -> Result<Option<String>, AppError> {
    let path = app.dialog()
        .file()
        .set_title("选择 Java 可执行文件")
        .blocking_pick_file();
    Ok(path.map(|p| p.to_string()))
}

#[tauri::command]
pub async fn select_game_dir(app: tauri::AppHandle) -> Result<Option<serde_json::Value>, AppError> {
    let path = app.dialog()
        .file()
        .set_title("选择游戏目录")
        .blocking_pick_folder();
    match path {
        Some(p) => {
            let dir = p.to_string();
            let versions = crate::commands::version::scan_game_dir(dir.clone())?;
            Ok(Some(serde_json::json!({
                "path": dir,
                "versions": versions
            })))
        }
        None => Ok(None),
    }
}
