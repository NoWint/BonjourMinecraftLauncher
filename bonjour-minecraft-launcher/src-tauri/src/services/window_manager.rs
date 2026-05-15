use crate::errors::{self, AppError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter, Manager, WebviewWindow};

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WindowConfig {
    pub label: String,
    pub title: String,
    pub url: String,
    pub width: f64,
    pub height: f64,
    pub min_width: Option<f64>,
    pub min_height: Option<f64>,
    pub resizable: bool,
    pub fullscreen: bool,
    pub decorations: bool,
    pub always_on_top: bool,
    pub center: bool,
    pub parent: Option<String>,
    pub skip_taskbar: bool,
}

impl Default for WindowConfig {
    fn default() -> Self {
        Self {
            label: "main".to_string(),
            title: "Bonjour Minecraft".to_string(),
            url: "/".to_string(),
            width: 1280.0,
            height: 720.0,
            min_width: Some(960.0),
            min_height: Some(600.0),
            resizable: true,
            fullscreen: false,
            decorations: true,
            always_on_top: false,
            center: true,
            parent: None,
            skip_taskbar: false,
        }
    }
}

pub struct WindowManager {
    app: AppHandle,
    windows: Arc<Mutex<HashMap<String, WindowConfig>>>,
}

impl WindowManager {
    pub fn new(app: AppHandle) -> Self {
        let mut windows = HashMap::new();
        windows.insert("main".to_string(), WindowConfig {
            label: "main".to_string(),
            title: "Bonjour Minecraft".to_string(),
            url: "/".to_string(),
            width: 1280.0,
            height: 720.0,
            min_width: Some(960.0),
            min_height: Some(600.0),
            ..Default::default()
        });

        Self {
            app,
            windows: Arc::new(Mutex::new(windows)),
        }
    }

    pub fn create_window(&self, config: WindowConfig) -> Result<WebviewWindow, AppError> {
        let label = config.label.clone();
        let url = tauri::WebviewUrl::App(config.url.clone().into());

        let mut builder = tauri::WebviewWindowBuilder::new(&self.app, &label, url)
            .title(&config.title)
            .inner_size(config.width, config.height)
            .resizable(config.resizable)
            .decorations(config.decorations)
            .always_on_top(config.always_on_top);

        if let Some(min_w) = config.min_width {
            builder = builder.min_inner_size(min_w, config.min_height.unwrap_or(400.0));
        }

        if config.center {
            builder = builder.center();
        }

        if config.fullscreen {
            builder = builder.fullscreen(true);
        }

        if config.skip_taskbar {
            builder = builder.skip_taskbar(true);
        }

        if let Some(parent_label) = &config.parent {
            if let Some(parent_window) = self.app.get_webview_window(parent_label) {
                builder = builder.parent(&parent_window).map_err(|e| {
                    errors::window_error(&label, format!("Failed to set parent: {}", e))
                })?;
            }
        }

        let window = builder.build().map_err(|e| {
            errors::window_error(&label, format!("Failed to create window: {}", e))
        })?;

        self.windows.lock().insert(label, config);

        Ok(window)
    }

    pub fn get_window(&self, label: &str) -> Option<WebviewWindow> {
        self.app.get_webview_window(label)
    }

    pub fn close_window(&self, label: &str) -> Result<bool, AppError> {
        if let Some(window) = self.get_window(label) {
            window.close().map_err(|e| {
                errors::window_error(label, format!("Failed to close window: {}", e))
            })?;
            self.windows.lock().remove(label);
            Ok(true)
        } else {
            Ok(false)
        }
    }

    pub fn show_window(&self, label: &str) -> Result<(), AppError> {
        let window = self.get_window(label)
            .ok_or_else(|| errors::window_error(label, "Window not found"))?;
        window.show().map_err(|e| {
            errors::window_error(label, format!("Failed to show window: {}", e))
        })
    }

    pub fn hide_window(&self, label: &str) -> Result<(), AppError> {
        let window = self.get_window(label)
            .ok_or_else(|| errors::window_error(label, "Window not found"))?;
        window.hide().map_err(|e| {
            errors::window_error(label, format!("Failed to hide window: {}", e))
        })
    }

    pub fn set_window_title(&self, label: &str, title: &str) -> Result<(), AppError> {
        let window = self.get_window(label)
            .ok_or_else(|| errors::window_error(label, "Window not found"))?;
        window.set_title(title).map_err(|e| {
            errors::window_error(label, format!("Failed to set title: {}", e))
        })
    }

    pub fn is_window_open(&self, label: &str) -> bool {
        self.app.get_webview_window(label).is_some()
    }

    pub fn list_windows(&self) -> Vec<String> {
        self.windows.lock().keys().cloned().collect()
    }

    pub fn focus_window(&self, label: &str) -> Result<(), AppError> {
        let window = self.get_window(label)
            .ok_or_else(|| errors::window_error(label, "Window not found"))?;
        window.set_focus().map_err(|e| {
            errors::window_error(label, format!("Failed to focus window: {}", e))
        })
    }

    pub fn emit_to_window(&self, label: &str, event: &str, payload: serde_json::Value) -> Result<(), AppError> {
        self.app.emit_to(label, event, payload).map_err(|e| {
            errors::window_error(label, format!("Failed to emit event: {}", e))
        })
    }

    pub fn open_launch_log_window(&self, session_id: &str) -> Result<WebviewWindow, AppError> {
        let label = format!("launch-log-{}", session_id);
        if let Some(existing) = self.get_window(&label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        self.create_window(WindowConfig {
            label: label.clone(),
            title: format!("启动日志 - {}", session_id),
            url: format!("/launch-log-window.html?sessionId={}", session_id),
            width: 800.0,
            height: 600.0,
            min_width: Some(600.0),
            min_height: Some(400.0),
            decorations: false,
            parent: Some("main".to_string()),
            ..Default::default()
        })
    }

    pub fn open_settings_window(&self, section: Option<&str>) -> Result<WebviewWindow, AppError> {
        let label = "settings-window";
        if let Some(existing) = self.get_window(label) {
            let _ = existing.set_focus();
            if let Some(sec) = section {
                let _ = self.emit_to_window(label, "navigate-section", serde_json::json!({ "section": sec }));
            }
            return Ok(existing);
        }

        let url = match section {
            Some(s) => format!("/settings-window.html?section={}", s),
            None => "/settings-window.html".to_string(),
        };

        self.create_window(WindowConfig {
            label: label.to_string(),
            title: "设置".to_string(),
            url,
            width: 900.0,
            height: 700.0,
            min_width: Some(700.0),
            min_height: Some(500.0),
            decorations: false,
            parent: Some("main".to_string()),
            ..Default::default()
        })
    }

    pub fn open_mods_browser_window(&self, game_version: Option<&str>, mod_loader: Option<&str>) -> Result<WebviewWindow, AppError> {
        let label = "mods-browser-window";
        if let Some(existing) = self.get_window(label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        let mut url = "/mods-browser-window.html".to_string();
        let mut params = Vec::new();
        if let Some(v) = game_version {
            params.push(format!("gameVersion={}", v));
        }
        if let Some(l) = mod_loader {
            params.push(format!("modLoader={}", l));
        }
        if !params.is_empty() {
            url = format!("{}?{}", url, params.join("&"));
        }

        self.create_window(WindowConfig {
            label: label.to_string(),
            title: "模组浏览".to_string(),
            url,
            width: 1000.0,
            height: 700.0,
            min_width: Some(800.0),
            min_height: Some(500.0),
            decorations: false,
            parent: Some("main".to_string()),
            ..Default::default()
        })
    }

    pub fn open_map_preview_window(&self, world_path: &str, world_name: &str) -> Result<WebviewWindow, AppError> {
        let label = format!("map-preview-{}", world_name.replace(|c: char| !c.is_alphanumeric(), "_"));
        if let Some(existing) = self.get_window(&label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        self.create_window(WindowConfig {
            label: label.clone(),
            title: format!("地图预览 - {}", world_name),
            url: format!("/map-preview-window.html?worldPath={}&worldName={}",
                urlencoding::encode(world_path),
                urlencoding::encode(world_name)),
            width: 900.0,
            height: 700.0,
            min_width: Some(700.0),
            min_height: Some(500.0),
            decorations: false,
            parent: Some("main".to_string()),
            ..Default::default()
        })
    }

    pub fn open_crash_report_window(&self, report_id: &str) -> Result<WebviewWindow, AppError> {
        let label = format!("crash-report-{}", report_id);
        if let Some(existing) = self.get_window(&label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        self.create_window(WindowConfig {
            label: label.clone(),
            title: format!("崩溃报告 - {}", report_id),
            url: format!("/crash-report?reportId={}", report_id),
            width: 800.0,
            height: 600.0,
            min_width: Some(600.0),
            min_height: Some(400.0),
            decorations: false,
            parent: Some("main".to_string()),
            ..Default::default()
        })
    }
}

#[tauri::command]
pub fn window_create(config: serde_json::Value, app: AppHandle) -> Result<bool, AppError> {
    let wc: WindowConfig = serde_json::from_value(config)
        .map_err(|e| errors::internal(format!("Invalid window config: {}", e)))?;
    let wm = WindowManager::new(app);
    wm.create_window(wc)?;
    Ok(true)
}

#[tauri::command]
pub fn window_close(label: String, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.close_window(&label)
}

#[tauri::command]
pub fn window_show(label: String, app: AppHandle) -> Result<(), AppError> {
    let wm = WindowManager::new(app);
    wm.show_window(&label)
}

#[tauri::command]
pub fn window_hide(label: String, app: AppHandle) -> Result<(), AppError> {
    let wm = WindowManager::new(app);
    wm.hide_window(&label)
}

#[tauri::command]
pub fn window_set_title(label: String, title: String, app: AppHandle) -> Result<(), AppError> {
    let wm = WindowManager::new(app);
    wm.set_window_title(&label, &title)
}

#[tauri::command]
pub fn window_focus(label: String, app: AppHandle) -> Result<(), AppError> {
    let wm = WindowManager::new(app);
    wm.focus_window(&label)
}

#[tauri::command]
pub fn window_is_open(label: String, app: AppHandle) -> bool {
    let wm = WindowManager::new(app);
    wm.is_window_open(&label)
}

#[tauri::command]
pub fn window_list(app: AppHandle) -> Vec<String> {
    let wm = WindowManager::new(app);
    wm.list_windows()
}

#[tauri::command]
pub fn window_open_launch_log(session_id: String, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_launch_log_window(&session_id)?;
    Ok(true)
}

#[tauri::command]
pub fn window_open_settings(section: Option<String>, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_settings_window(section.as_deref())?;
    Ok(true)
}

#[tauri::command]
pub fn window_open_mods_browser(game_version: Option<String>, mod_loader: Option<String>, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_mods_browser_window(game_version.as_deref(), mod_loader.as_deref())?;
    Ok(true)
}

#[tauri::command]
pub fn window_open_map_preview(world_path: String, world_name: String, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_map_preview_window(&world_path, &world_name)?;
    Ok(true)
}

#[tauri::command]
pub fn window_open_crash_report(report_id: String, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_crash_report_window(&report_id)?;
    Ok(true)
}

#[tauri::command]
pub fn window_emit_to(label: String, event: String, payload: serde_json::Value, app: AppHandle) -> Result<(), AppError> {
    let wm = WindowManager::new(app);
    wm.emit_to_window(&label, &event, payload)
}
