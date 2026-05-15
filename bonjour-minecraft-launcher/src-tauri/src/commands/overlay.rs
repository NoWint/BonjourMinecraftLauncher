use crate::errors::AppError;
use crate::services::overlay_manager::{OverlayData, OverlayManager};
use crate::services::system_monitor::SystemMonitor;
use crate::services::log_parser::LogParser;
use crate::services::file_manager;
use crate::utils::paths;
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::{AppHandle, State};

pub struct OverlayAppState {
    pub monitor: Arc<Mutex<SystemMonitor>>,
    pub log_parser: Arc<Mutex<LogParser>>,
    pub manager: Arc<Mutex<Option<OverlayManager>>>,
}

impl OverlayAppState {
    pub fn new() -> Self {
        Self {
            monitor: Arc::new(Mutex::new(SystemMonitor::new())),
            log_parser: Arc::new(Mutex::new(LogParser::new())),
            manager: Arc::new(Mutex::new(None)),
        }
    }
}

#[tauri::command]
pub fn overlay_open(
    app: AppHandle,
    state: State<'_, OverlayAppState>,
    opacity: Option<f64>,
    position: Option<String>,
) -> Result<bool, AppError> {
    let settings_path = paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&settings_path);

    let opacity = opacity.unwrap_or(settings.overlay_opacity);
    let position = position.unwrap_or(settings.overlay_position);

    let manager = OverlayManager::new(app);
    let result = manager.open_overlay(opacity, &position);
    *state.manager.lock() = Some(manager);

    result.map(|_| true)
}

#[tauri::command]
pub fn overlay_close(state: State<'_, OverlayAppState>) -> Result<bool, AppError> {
    let manager_lock = state.manager.lock();
    if let Some(ref manager) = *manager_lock {
        manager.close_overlay()?;
    }
    Ok(true)
}

#[tauri::command]
pub fn overlay_toggle(state: State<'_, OverlayAppState>) -> Result<bool, AppError> {
    let manager_lock = state.manager.lock();
    if let Some(ref manager) = *manager_lock {
        return manager.toggle_overlay();
    }
    Ok(false)
}

#[tauri::command]
pub fn overlay_get_data(state: State<'_, OverlayAppState>) -> Result<OverlayData, AppError> {
    let monitor = state.monitor.lock();
    let sys_data = monitor.collect();
    drop(monitor);

    let log_parser = state.log_parser.lock();
    let log_data = log_parser.get_latest();
    drop(log_parser);

    Ok(OverlayData {
        fps: sys_data.fps,
        frame_time_ms: sys_data.frame_time_ms,
        frame_time_history: sys_data.frame_time_history,
        fps_stability: sys_data.fps_stability,
        bottleneck: sys_data.bottleneck,
        cpu_usage: sys_data.cpu_usage,
        gpu_usage: sys_data.gpu_usage,
        memory_used_mb: sys_data.memory_used_mb,
        memory_total_mb: sys_data.memory_total_mb,
        memory_history: sys_data.memory_history,
        oom_warning: sys_data.oom_warning,
        coord_x: log_data.coord_x,
        coord_y: log_data.coord_y,
        coord_z: log_data.coord_z,
        dimension: log_data.dimension,
        biome: log_data.biome,
        direction: log_data.direction,
        server_name: log_data.server_name,
        server_ping_ms: log_data.server_ping_ms,
        ping_history: Vec::new(),
    })
}

#[tauri::command]
pub fn overlay_set_game_pid(state: State<'_, OverlayAppState>, pid: u32) -> Result<(), AppError> {
    state.monitor.lock().set_game_pid(pid);
    Ok(())
}

#[tauri::command]
pub fn overlay_start_log_watcher(
    app: AppHandle,
    state: State<'_, OverlayAppState>,
    game_dir: String,
) -> Result<(), AppError> {
    let parser = state.log_parser.lock();
    parser.start_watching(app, &game_dir)
        .map_err(|e| crate::errors::internal(format!("Failed to start log watcher: {}", e)))
}

#[tauri::command]
pub fn overlay_stop_log_watcher(state: State<'_, OverlayAppState>) -> Result<(), AppError> {
    state.log_parser.lock().stop_watching();
    state.monitor.lock().clear_game_pid();
    Ok(())
}

#[tauri::command]
pub fn overlay_set_collapsed(state: State<'_, OverlayAppState>, collapsed: bool) -> Result<(), AppError> {
    let manager_lock = state.manager.lock();
    if let Some(ref manager) = *manager_lock {
        manager.set_collapsed(collapsed);
    }
    Ok(())
}
