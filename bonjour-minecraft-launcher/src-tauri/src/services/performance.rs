use std::time::Instant;
use std::collections::HashMap;
use std::sync::Mutex;
use serde::Serialize;
use crate::errors::AppError;

lazy_static::lazy_static! {
    static ref COMMAND_TIMINGS: Mutex<HashMap<String, Vec<f64>>> = Mutex::new(HashMap::new());
    static ref APP_START_TIME: Instant = Instant::now();
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandTimingEntry {
    pub command: String,
    pub duration_ms: f64,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PerformanceSnapshot {
    pub timestamp: i64,
    pub command_timings: HashMap<String, CommandStats>,
    pub memory_usage_mb: f64,
    pub uptime_secs: f64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct CommandStats {
    pub count: u32,
    pub avg_ms: f64,
    pub min_ms: f64,
    pub max_ms: f64,
    pub p95_ms: f64,
}

pub struct CommandTimer {
    command: String,
    start: Instant,
}

impl CommandTimer {
    pub fn new(command: impl Into<String>) -> Self {
        let cmd = command.into();
        tracing::debug!(command = %cmd, "Command started");
        Self {
            command: cmd,
            start: Instant::now(),
        }
    }

    pub fn stop(self) -> f64 {
        let duration = self.start.elapsed().as_secs_f64() * 1000.0;
        tracing::debug!(command = %self.command, duration_ms = duration, "Command completed");
        
        if let Ok(mut timings) = COMMAND_TIMINGS.lock() {
            let entries = timings.entry(self.command.clone()).or_insert_with(Vec::new);
            entries.push(duration);
            if entries.len() > 1000 {
                let excess = entries.len() - 1000;
                entries.drain(0..excess);
            }
        }
        
        duration
    }
}

pub fn get_command_stats() -> HashMap<String, CommandStats> {
    let timings = COMMAND_TIMINGS.lock().unwrap_or_else(|e| e.into_inner());
    let mut stats = HashMap::new();
    
    for (command, durations) in timings.iter() {
        if durations.is_empty() { continue; }
        let count = durations.len() as u32;
        let avg = durations.iter().sum::<f64>() / count as f64;
        let min = durations.iter().cloned().fold(f64::INFINITY, f64::min);
        let max = durations.iter().cloned().fold(f64::NEG_INFINITY, f64::max);
        
        let mut sorted = durations.clone();
        sorted.sort_by(|a, b| a.partial_cmp(b).unwrap_or(std::cmp::Ordering::Equal));
        let p95_idx = ((count as f64) * 0.95) as usize;
        let p95 = sorted.get(p95_idx.min(sorted.len() - 1)).copied().unwrap_or(0.0);
        
        stats.insert(command.clone(), CommandStats {
            count,
            avg_ms: (avg * 100.0).round() / 100.0,
            min_ms: (min * 100.0).round() / 100.0,
            max_ms: (max * 100.0).round() / 100.0,
            p95_ms: (p95 * 100.0).round() / 100.0,
        });
    }
    
    stats
}

pub fn get_performance_snapshot() -> PerformanceSnapshot {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    
    PerformanceSnapshot {
        timestamp: chrono::Utc::now().timestamp_millis(),
        command_timings: get_command_stats(),
        memory_usage_mb: sys.used_memory() as f64 / 1024.0 / 1024.0,
        uptime_secs: APP_START_TIME.elapsed().as_secs_f64(),
    }
}

pub fn init_tracing() {
    use tracing_subscriber::EnvFilter;
    
    let filter = EnvFilter::try_from_default_env()
        .unwrap_or_else(|_| EnvFilter::new("info"));
    
    tracing_subscriber::fmt()
        .with_env_filter(filter)
        .with_target(false)
        .with_thread_ids(false)
        .with_file(false)
        .with_line_number(false)
        .compact()
        .init();
}

#[tauri::command]
pub fn get_performance_panel_data() -> Result<serde_json::Value, AppError> {
    let snapshot = get_performance_snapshot();
    Ok(serde_json::to_value(snapshot).unwrap_or_default())
}

#[tauri::command]
pub fn get_command_performance_stats() -> Result<serde_json::Value, AppError> {
    let stats = get_command_stats();
    Ok(serde_json::to_value(stats).unwrap_or_default())
}

#[tauri::command]
pub fn clear_performance_data() -> Result<bool, AppError> {
    if let Ok(mut timings) = COMMAND_TIMINGS.lock() {
        timings.clear();
    }
    Ok(true)
}

#[macro_export]
macro_rules! timed_command {
    ($name:expr, $body:expr) => {{
        let _timer = $crate::services::performance::CommandTimer::new($name);
        let result = $body;
        _timer.stop();
        result
    }};
}
