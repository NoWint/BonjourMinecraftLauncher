use crate::errors::{self, AppError};
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::{AppHandle, Manager, WebviewWindow};

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

    pub fn open_launch_log_window(&self, session_id: &str) -> Result<WebviewWindow, AppError> {
        let label = format!("launch-log-{}", session_id);
        if let Some(existing) = self.get_window(&label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        self.create_window(WindowConfig {
            label: label.clone(),
            title: format!("启动日志 - {}", session_id),
            url: format!("/launch-log?sessionId={}", session_id),
            width: 800.0,
            height: 600.0,
            min_width: Some(600.0),
            min_height: Some(400.0),
            resizable: true,
            fullscreen: false,
            decorations: true,
            always_on_top: false,
            center: true,
            parent: Some("main".to_string()),
        })
    }

    pub fn open_settings_window(&self) -> Result<WebviewWindow, AppError> {
        let label = "settings";
        if let Some(existing) = self.get_window(label) {
            let _ = existing.set_focus();
            return Ok(existing);
        }

        self.create_window(WindowConfig {
            label: label.to_string(),
            title: "设置".to_string(),
            url: "/settings".to_string(),
            width: 900.0,
            height: 700.0,
            min_width: Some(700.0),
            min_height: Some(500.0),
            resizable: true,
            fullscreen: false,
            decorations: true,
            always_on_top: false,
            center: true,
            parent: Some("main".to_string()),
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
            resizable: true,
            fullscreen: false,
            decorations: true,
            always_on_top: false,
            center: true,
            parent: Some("main".to_string()),
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
pub fn window_open_settings(app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_settings_window()?;
    Ok(true)
}

#[tauri::command]
pub fn window_open_crash_report(report_id: String, app: AppHandle) -> Result<bool, AppError> {
    let wm = WindowManager::new(app);
    wm.open_crash_report_window(&report_id)?;
    Ok(true)
}
