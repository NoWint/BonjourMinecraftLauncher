use crate::errors::{self, AppError};
use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayState {
    pub visible: bool,
    pub collapsed: bool,
    pub position: String,
    pub opacity: f64,
}

impl Default for OverlayState {
    fn default() -> Self {
        Self {
            visible: false,
            collapsed: false,
            position: "top-right".to_string(),
            opacity: 0.85,
        }
    }
}

pub struct OverlayManager {
    app: AppHandle,
    state: Arc<Mutex<OverlayState>>,
}

impl OverlayManager {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            state: Arc::new(Mutex::new(OverlayState::default())),
        }
    }

    pub fn open_overlay(&self, opacity: f64, position: &str) -> Result<(), AppError> {
        let label = "game-overlay";

        if let Some(existing) = self.app.get_webview_window(label) {
            let _ = existing.show();
            let _ = existing.set_focus();
            let mut state = self.state.lock();
            state.visible = true;
            return Ok(());
        }

        let url = WebviewUrl::App(format!("/overlay.html?opacity={}&position={}", opacity, position).into());

        let window = tauri::WebviewWindowBuilder::new(&self.app, label, url)
            .title("Bonjour Overlay")
            .inner_size(320.0, 400.0)
            .min_inner_size(200.0, 100.0)
            .decorations(false)
            .always_on_top(true)
            .skip_taskbar(true)
            .resizable(true)
            .build()
            .map_err(|e| errors::window_error(label, format!("Failed to create overlay window: {}", e)))?;

        let _ = window.show();

        let mut state = self.state.lock();
        state.visible = true;
        state.opacity = opacity;
        state.position = position.to_string();

        Ok(())
    }

    pub fn close_overlay(&self) -> Result<(), AppError> {
        let label = "game-overlay";
        if let Some(window) = self.app.get_webview_window(label) {
            window.close().map_err(|e| {
                errors::window_error(label, format!("Failed to close overlay: {}", e))
            })?;
        }

        let mut state = self.state.lock();
        state.visible = false;

        Ok(())
    }

    pub fn toggle_overlay(&self) -> Result<bool, AppError> {
        let visible = self.state.lock().visible;
        if visible {
            self.close_overlay()?;
            Ok(false)
        } else {
            let state = self.state.lock();
            let opacity = state.opacity;
            let position = state.position.clone();
            drop(state);
            self.open_overlay(opacity, &position)?;
            Ok(true)
        }
    }

    pub fn set_collapsed(&self, collapsed: bool) {
        let mut state = self.state.lock();
        state.collapsed = collapsed;
    }

    pub fn get_state(&self) -> OverlayState {
        self.state.lock().clone()
    }

    pub fn emit_overlay_data(&self, data: &OverlayData) {
        let _ = self.app.emit("overlay-data", data);
    }
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OverlayData {
    pub fps: u32,
    pub frame_time_ms: f64,
    pub frame_time_history: Vec<f64>,
    pub fps_stability: f64,
    pub bottleneck: Option<String>,
    pub cpu_usage: f64,
    pub gpu_usage: f64,
    pub memory_used_mb: u64,
    pub memory_total_mb: u64,
    pub memory_history: Vec<u64>,
    pub oom_warning: Option<String>,
    pub coord_x: Option<f64>,
    pub coord_y: Option<f64>,
    pub coord_z: Option<f64>,
    pub dimension: Option<String>,
    pub biome: Option<String>,
    pub direction: Option<String>,
    pub server_name: Option<String>,
    pub server_ping_ms: Option<u64>,
    pub ping_history: Vec<u64>,
}

impl Default for OverlayData {
    fn default() -> Self {
        Self {
            fps: 0,
            frame_time_ms: 0.0,
            frame_time_history: Vec::new(),
            fps_stability: 100.0,
            bottleneck: None,
            cpu_usage: 0.0,
            gpu_usage: 0.0,
            memory_used_mb: 0,
            memory_total_mb: 0,
            memory_history: Vec::new(),
            oom_warning: None,
            coord_x: None,
            coord_y: None,
            coord_z: None,
            dimension: None,
            biome: None,
            direction: None,
            server_name: None,
            server_ping_ms: None,
            ping_history: Vec::new(),
        }
    }
}
