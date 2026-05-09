use parking_lot::Mutex;
use std::collections::HashMap;
use std::sync::Arc;
use std::time::{Duration, Instant};
use tauri::{AppHandle, Emitter};

pub struct IpcEventBus {
    app: AppHandle,
    batcher: Arc<Mutex<EventBatcher>>,
    throttler: Arc<Mutex<EventThrottler>>,
}

struct EventBatcher {
    buffers: HashMap<String, Vec<serde_json::Value>>,
    flush_interval_ms: u64,
    last_flush: Instant,
    max_batch_size: usize,
}

struct EventThrottler {
    last_emit: HashMap<String, Instant>,
    min_interval_ms: u64,
    pending: HashMap<String, serde_json::Value>,
}

impl IpcEventBus {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            batcher: Arc::new(Mutex::new(EventBatcher {
                buffers: HashMap::new(),
                flush_interval_ms: 50,
                last_flush: Instant::now(),
                max_batch_size: 50,
            })),
            throttler: Arc::new(Mutex::new(EventThrottler {
                last_emit: HashMap::new(),
                min_interval_ms: 100,
                pending: HashMap::new(),
            })),
        }
    }

    pub fn emit(&self, event: &str, payload: serde_json::Value) {
        let _ = self.app.emit(event, payload);
    }

    pub fn emit_batched(&self, event: &str, payload: serde_json::Value) {
        let mut batcher = self.batcher.lock();
        let entries = batcher.buffers.entry(event.to_string()).or_insert_with(Vec::new);
        entries.push(payload);

        let should_flush = entries.len() >= batcher.max_batch_size
            || batcher.last_flush.elapsed() >= Duration::from_millis(batcher.flush_interval_ms);

        if should_flush {
            let entries = batcher.buffers.remove(event).unwrap_or_default();
            batcher.last_flush = Instant::now();
            drop(batcher);

            if !entries.is_empty() {
                let _ = self.app.emit(
                    &format!("{}-batch", event),
                    serde_json::json!({
                        "event": event,
                        "items": entries,
                        "count": entries.len(),
                    }),
                );
            }
        }
    }

    pub fn emit_throttled(&self, event: &str, payload: serde_json::Value) {
        let mut throttler = self.throttler.lock();
        let now = Instant::now();
        let min_interval = Duration::from_millis(throttler.min_interval_ms);

        if let Some(last) = throttler.last_emit.get(event) {
            if now.duration_since(*last) < min_interval {
                throttler.pending.insert(event.to_string(), payload);
                return;
            }
        }

        throttler.last_emit.insert(event.to_string(), now);
        throttler.pending.remove(event);
        drop(throttler);

        let _ = self.app.emit(event, payload);
    }

    pub fn flush_batched(&self) {
        let mut batcher = self.batcher.lock();
        let all_buffers: HashMap<String, Vec<serde_json::Value>> =
            batcher.buffers.drain().collect();
        batcher.last_flush = Instant::now();
        drop(batcher);

        for (event, entries) in all_buffers {
            if !entries.is_empty() {
                let _ = self.app.emit(
                    &format!("{}-batch", event),
                    serde_json::json!({
                        "event": event,
                        "items": entries,
                        "count": entries.len(),
                    }),
                );
            }
        }
    }

    pub fn flush_throttled(&self) {
        let mut throttler = self.throttler.lock();
        let pending: HashMap<String, serde_json::Value> = throttler.pending.drain().collect();
        drop(throttler);

        for (event, payload) in pending {
            let _ = self.app.emit(&event, payload);
        }
    }

    pub fn flush_all(&self) {
        self.flush_batched();
        self.flush_throttled();
    }

    pub fn set_batch_config(&self, flush_interval_ms: u64, max_batch_size: usize) {
        let mut batcher = self.batcher.lock();
        batcher.flush_interval_ms = flush_interval_ms;
        batcher.max_batch_size = max_batch_size;
    }

    pub fn set_throttle_config(&self, min_interval_ms: u64) {
        let mut throttler = self.throttler.lock();
        throttler.min_interval_ms = min_interval_ms;
    }
}

#[derive(Clone)]
pub struct LaunchLogBuffer {
    app: AppHandle,
    session_id: String,
    buffer: Arc<Mutex<Vec<serde_json::Value>>>,
    last_flush: Arc<Mutex<Instant>>,
    flush_interval_ms: u64,
    max_buffer_size: usize,
}

impl LaunchLogBuffer {
    pub fn new(app: AppHandle, session_id: String) -> Self {
        Self {
            app,
            session_id,
            buffer: Arc::new(Mutex::new(Vec::new())),
            last_flush: Arc::new(Mutex::new(Instant::now())),
            flush_interval_ms: 100,
            max_buffer_size: 20,
        }
    }

    pub fn clone_ref(&self) -> Self {
        Self {
            app: self.app.clone(),
            session_id: self.session_id.clone(),
            buffer: self.buffer.clone(),
            last_flush: self.last_flush.clone(),
            flush_interval_ms: self.flush_interval_ms,
            max_buffer_size: self.max_buffer_size,
        }
    }

    pub fn push_log(&self, log_type: &str, message: &str, phase_id: Option<&str>) {
        let entry = serde_json::json!({
            "sessionId": self.session_id,
            "type": log_type,
            "message": message,
            "phaseId": phase_id,
            "timestamp": chrono::Utc::now().timestamp_millis(),
        });

        let mut buffer = self.buffer.lock();
        buffer.push(entry);

        let should_flush = buffer.len() >= self.max_buffer_size
            || self.last_flush.lock().elapsed() >= Duration::from_millis(self.flush_interval_ms);

        if should_flush {
            let items: Vec<serde_json::Value> = buffer.drain(..).collect();
            *self.last_flush.lock() = Instant::now();
            drop(buffer);

            let _ = self.app.emit(
                "launch-log-batch",
                serde_json::json!({
                    "sessionId": self.session_id,
                    "items": items,
                    "count": items.len(),
                }),
            );
        }
    }

    pub fn flush(&self) {
        let mut buffer = self.buffer.lock();
        let items: Vec<serde_json::Value> = buffer.drain(..).collect();
        *self.last_flush.lock() = Instant::now();
        drop(buffer);

        if !items.is_empty() {
            let _ = self.app.emit(
                "launch-log-batch",
                serde_json::json!({
                    "sessionId": self.session_id,
                    "items": items,
                    "count": items.len(),
                }),
            );
        }
    }
}

pub struct DownloadProgressThrottler {
    app: AppHandle,
    last_emit: Arc<Mutex<HashMap<String, Instant>>>,
    min_interval_ms: u64,
}

impl DownloadProgressThrottler {
    pub fn new(app: AppHandle, min_interval_ms: u64) -> Self {
        Self {
            app,
            last_emit: Arc::new(Mutex::new(HashMap::new())),
            min_interval_ms,
        }
    }

    pub fn emit_progress(&self, task_id: &str, downloaded: u64, total: u64, speed: u64) {
        let mut last_emit = self.last_emit.lock();
        let now = Instant::now();

        if let Some(last) = last_emit.get(task_id) {
            if now.duration_since(*last) < Duration::from_millis(self.min_interval_ms) {
                return;
            }
        }

        last_emit.insert(task_id.to_string(), now);
        drop(last_emit);

        let _ = self.app.emit(
            "download-progress",
            serde_json::json!({
                "taskId": task_id,
                "downloaded": downloaded,
                "total": total,
                "speed": speed,
            }),
        );
    }
}

pub struct SyncProgressBatcher {
    app: AppHandle,
    buffer: Arc<Mutex<Vec<serde_json::Value>>>,
    last_flush: Arc<Mutex<Instant>>,
    flush_interval_ms: u64,
}

impl SyncProgressBatcher {
    pub fn new(app: AppHandle) -> Self {
        Self {
            app,
            buffer: Arc::new(Mutex::new(Vec::new())),
            last_flush: Arc::new(Mutex::new(Instant::now())),
            flush_interval_ms: 200,
        }
    }

    pub fn push(&self, url: &str, path: &str, status: &str, bytes: Option<u64>) {
        let entry = serde_json::json!({
            "url": url,
            "path": path,
            "status": status,
            "bytes": bytes,
            "timestamp": chrono::Utc::now().timestamp_millis(),
        });

        let mut buffer = self.buffer.lock();
        buffer.push(entry);

        if self.last_flush.lock().elapsed() >= Duration::from_millis(self.flush_interval_ms) {
            let items: Vec<serde_json::Value> = buffer.drain(..).collect();
            *self.last_flush.lock() = Instant::now();
            drop(buffer);

            let _ = self.app.emit(
                "sync-progress-batch",
                serde_json::json!({
                    "items": items,
                    "count": items.len(),
                }),
            );
        }
    }

    pub fn flush(&self) {
        let mut buffer = self.buffer.lock();
        let items: Vec<serde_json::Value> = buffer.drain(..).collect();
        *self.last_flush.lock() = Instant::now();
        drop(buffer);

        if !items.is_empty() {
            let _ = self.app.emit(
                "sync-progress-batch",
                serde_json::json!({
                    "items": items,
                    "count": items.len(),
                }),
            );
        }
    }
}
