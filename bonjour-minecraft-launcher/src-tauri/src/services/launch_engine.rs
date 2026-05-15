use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use tauri::Emitter;
use crate::models::launch::*;
use crate::services::log_diagnoser;

pub struct LaunchEngine {
    sessions: Arc<RwLock<HashMap<String, LaunchSession>>>,
}

impl LaunchEngine {
    pub fn new() -> Self {
        LaunchEngine {
            sessions: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn start_session(&self, version: String, account_name: String, instance_id: Option<String>) -> LaunchSession {
        let now = chrono::Utc::now().timestamp_millis();
        let session_id = format!("launch-{}-{}", now, &uuid::Uuid::new_v4().to_string()[..8]);

        let phases = LaunchPhaseId::all().into_iter().map(|id| LaunchPhaseData {
            label: id.label().to_string(),
            status: LaunchPhaseStatus::Pending,
            started_at: None,
            completed_at: None,
            duration_ms: None,
            parallel_tasks: 0,
            id,
        }).collect();

        let session = LaunchSession {
            id: session_id.clone(),
            version,
            account_name,
            instance_id,
            start_time: now,
            phases,
            logs: Vec::new(),
            status: LaunchSessionStatus::Preparing,
            pid: None,
            exit_code: None,
            completed_at: None,
        };

        self.sessions.write().insert(session_id, session.clone());
        session
    }

    pub fn advance_to_phase(&self, session_id: &str, phase_id: &LaunchPhaseId, app: &tauri::AppHandle) -> Option<LaunchSession> {
        let mut sessions = self.sessions.write();
        let session = sessions.get_mut(session_id)?;

        let now = chrono::Utc::now().timestamp_millis();

        for phase in &mut session.phases {
            if phase.status == LaunchPhaseStatus::Active {
                phase.status = LaunchPhaseStatus::Completed;
                phase.completed_at = Some(now);
                phase.duration_ms = Some((now - phase.started_at.unwrap_or(now)) as u64);
            }
        }

        for phase in &mut session.phases {
            if phase.id == *phase_id && phase.status == LaunchPhaseStatus::Pending {
                phase.status = LaunchPhaseStatus::Active;
                phase.started_at = Some(now);
                break;
            }
        }

        if session.status == LaunchSessionStatus::Preparing {
            session.status = LaunchSessionStatus::Launching;
        }

        let _ = app.emit("launch-phase-update", serde_json::json!({
            "sessionId": session_id,
            "phaseId": phase_id.id_str(),
            "timestamp": now
        }));

        let snapshot = session.clone();
        Some(snapshot)
    }

    pub fn add_log(&self, session_id: &str, log_type: &str, message: &str, phase_id: Option<&LaunchPhaseId>, app: &tauri::AppHandle) -> Option<LaunchSession> {
        let mut sessions = self.sessions.write();
        let session = sessions.get_mut(session_id)?;

        let now = chrono::Utc::now().timestamp_millis();
        let phase_id_str = phase_id.map(|p| p.id_str().to_string());

        let diagnosis = if log_type == "error" || log_type == "warn" {
            log_diagnoser::diagnose_log(message)
        } else {
            None
        };

        let entry = LaunchLogEntry {
            log_type: log_type.to_string(),
            message: message.to_string(),
            phase_id: phase_id_str.clone(),
            timestamp: now,
            diagnosis: diagnosis.clone(),
        };

        session.logs.push(entry);

        if log_type == "error" {
            if let Some(ref pid) = phase_id_str {
                for phase in &mut session.phases {
                    if phase.id.id_str() == pid.as_str() && phase.status == LaunchPhaseStatus::Active {
                        phase.status = LaunchPhaseStatus::Error;
                        break;
                    }
                }
            }
        }

        let _ = app.emit("launch-log", serde_json::json!({
            "sessionId": session_id,
            "type": log_type,
            "message": message,
            "phaseId": phase_id_str,
            "timestamp": now,
            "diagnosis": diagnosis
        }));

        let snapshot = session.clone();
        Some(snapshot)
    }

    pub fn complete_phase(&self, session_id: &str, phase_id: &LaunchPhaseId, app: &tauri::AppHandle) -> Option<LaunchSession> {
        let mut sessions = self.sessions.write();
        let session = sessions.get_mut(session_id)?;

        let now = chrono::Utc::now().timestamp_millis();

        for phase in &mut session.phases {
            if phase.id == *phase_id && phase.status == LaunchPhaseStatus::Active {
                phase.status = LaunchPhaseStatus::Completed;
                phase.completed_at = Some(now);
                phase.duration_ms = Some((now - phase.started_at.unwrap_or(now)) as u64);
                break;
            }
        }

        let _ = app.emit("launch-phase-complete", serde_json::json!({
            "sessionId": session_id,
            "phaseId": phase_id.id_str(),
            "timestamp": now
        }));

        let snapshot = session.clone();
        Some(snapshot)
    }

    pub fn mark_running(&self, session_id: &str, pid: u32, app: &tauri::AppHandle) -> Option<LaunchSession> {
        let mut sessions = self.sessions.write();
        let session = sessions.get_mut(session_id)?;

        let now = chrono::Utc::now().timestamp_millis();
        session.pid = Some(pid);
        session.status = LaunchSessionStatus::Running;

        for phase in &mut session.phases {
            if phase.status == LaunchPhaseStatus::Active {
                phase.status = LaunchPhaseStatus::Completed;
                phase.completed_at = Some(now);
                phase.duration_ms = Some((now - phase.started_at.unwrap_or(now)) as u64);
            }
        }

        let _ = app.emit("launch-running", serde_json::json!({
            "sessionId": session_id,
            "pid": pid,
            "timestamp": now
        }));

        let snapshot = session.clone();
        Some(snapshot)
    }

    pub fn mark_exited(&self, session_id: &str, exit_code: i32, app: &tauri::AppHandle) -> Option<LaunchSession> {
        let mut sessions = self.sessions.write();
        let session = sessions.get_mut(session_id)?;

        let now = chrono::Utc::now().timestamp_millis();
        session.exit_code = Some(exit_code);
        session.completed_at = Some(now);
        session.status = if exit_code == 0 { LaunchSessionStatus::Exited } else { LaunchSessionStatus::Crashed };

        for phase in &mut session.phases {
            if phase.status == LaunchPhaseStatus::Active {
                phase.status = if exit_code == 0 { LaunchPhaseStatus::Completed } else { LaunchPhaseStatus::Error };
                phase.completed_at = Some(now);
                phase.duration_ms = Some((now - phase.started_at.unwrap_or(now)) as u64);
            }
        }

        let _ = app.emit("launch-exit", serde_json::json!({
            "sessionId": session_id,
            "exitCode": exit_code,
            "timestamp": now
        }));

        let snapshot = session.clone();
        Some(snapshot)
    }

    pub fn get_session(&self, session_id: &str) -> Option<LaunchSession> {
        self.sessions.read().get(session_id).cloned()
    }

    pub fn get_phase_progress(&self, session_id: &str) -> Option<(u32, u32, u32)> {
        let sessions = self.sessions.read();
        let session = sessions.get(session_id)?;
        let total = session.phases.len() as u32;
        let completed = session.phases.iter().filter(|p| p.status == LaunchPhaseStatus::Completed).count() as u32;
        let percentage = if total > 0 { (completed * 100) / total } else { 0 };
        Some((completed, total, percentage))
    }

    pub fn remove_session(&self, session_id: &str) {
        self.sessions.write().remove(session_id);
    }

    pub fn cleanup_old_sessions(&self, max_age_ms: u64) {
        let now = chrono::Utc::now().timestamp_millis() as u64;
        let mut sessions = self.sessions.write();
        sessions.retain(|_, s| {
            let age = now - s.start_time as u64;
            age < max_age_ms || s.status == LaunchSessionStatus::Running || s.status == LaunchSessionStatus::Launching
        });
    }
}

pub fn classify_log_to_phase(message: &str) -> LaunchPhaseId {
    let lower = message.to_lowercase();

    if lower.contains("validating") || lower.contains("checking") || lower.contains("verifying") {
        return LaunchPhaseId::Validating;
    }
    if lower.contains("download") || lower.contains("fetching") || lower.contains("progress") {
        return LaunchPhaseId::Downloading;
    }
    if lower.contains("extract") || lower.contains("unzip") || lower.contains("decompress") {
        return LaunchPhaseId::Extracting;
    }
    if lower.contains("java") || lower.contains("jvm") || lower.contains("launching") {
        return LaunchPhaseId::JavaInit;
    }
    if lower.contains("resource") || lower.contains("asset") || lower.contains("texture") || lower.contains("sound") {
        return LaunchPhaseId::ResourceLoading;
    }
    if lower.contains("window") || lower.contains("display") || lower.contains("opengl") || lower.contains("render") {
        return LaunchPhaseId::WindowCreating;
    }
    if lower.contains("class") || lower.contains("loading") || lower.contains("init") || lower.contains("forge") || lower.contains("fabric") || lower.contains("mod") || lower.contains("main") {
        return LaunchPhaseId::ClassLoading;
    }

    LaunchPhaseId::General
}
