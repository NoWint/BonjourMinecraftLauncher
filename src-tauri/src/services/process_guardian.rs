use std::collections::HashMap;
use std::sync::Arc;
use parking_lot::RwLock;
use crate::models::launch::*;

struct TrackedProcess {
    pid: u32,
    instance_id: Option<String>,
    version: String,
    started_at: i64,
}

pub struct ProcessGuardian {
    processes: Arc<RwLock<HashMap<u32, TrackedProcess>>>,
}

impl ProcessGuardian {
    pub fn new() -> Self {
        ProcessGuardian {
            processes: Arc::new(RwLock::new(HashMap::new())),
        }
    }

    pub fn register(&self, pid: u32, version: String, instance_id: Option<String>) {
        let process = TrackedProcess {
            pid,
            instance_id,
            version,
            started_at: chrono::Utc::now().timestamp_millis(),
        };
        self.processes.write().insert(pid, process);
    }

    pub fn unregister(&self, pid: u32) {
        self.processes.write().remove(&pid);
    }

    pub fn is_running(&self, pid: u32) -> bool {
        let processes = self.processes.read();
        if !processes.contains_key(&pid) {
            return false;
        }
        is_process_alive(pid)
    }

    pub fn get_running_processes(&self) -> Vec<GameProcessInfo> {
        let processes = self.processes.read();
        let mut sys = sysinfo::System::new();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let mut result = Vec::new();
        for (_, proc) in processes.iter() {
            let alive = is_process_alive(proc.pid);
            let (memory_usage, cpu_usage) = sys.process(sysinfo::Pid::from_u32(proc.pid))
                .map(|p| (p.memory() / 1024, p.cpu_usage() as f32))
                .unwrap_or((0, 0.0));

            result.push(GameProcessInfo {
                pid: proc.pid,
                instance_id: proc.instance_id.clone(),
                version: proc.version.clone(),
                started_at: proc.started_at,
                status: if alive { GameProcessStatus::Running } else { GameProcessStatus::Exited },
                exit_code: None,
                memory_usage,
                cpu_usage,
            });
        }
        result
    }

    pub fn get_process_by_instance(&self, instance_id: &str) -> Option<GameProcessInfo> {
        let processes = self.processes.read();
        for (_, proc) in processes.iter() {
            if proc.instance_id.as_deref() == Some(instance_id) {
                let alive = is_process_alive(proc.pid);
                let (memory_usage, cpu_usage) = if alive {
                    let mut sys = sysinfo::System::new();
                    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
                    if let Some(process) = sys.process(sysinfo::Pid::from_u32(proc.pid)) {
                        (process.memory(), process.cpu_usage() as f64)
                    } else {
                        (0, 0.0)
                    }
                } else {
                    (0, 0.0)
                };
                return Some(GameProcessInfo {
                    pid: proc.pid,
                    instance_id: proc.instance_id.clone(),
                    version: proc.version.clone(),
                    started_at: proc.started_at,
                    status: if alive { GameProcessStatus::Running } else { GameProcessStatus::Exited },
                    exit_code: None,
                    memory_usage,
                    cpu_usage: cpu_usage as f32,
                });
            }
        }
        None
    }

    pub fn kill_process(&self, pid: u32) -> bool {
        if !self.processes.read().contains_key(&pid) {
            return false;
        }

        let mut sys = sysinfo::System::new();
        sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
            process.kill();
            self.processes.write().remove(&pid);
            true
        } else {
            self.processes.write().remove(&pid);
            false
        }
    }

    pub fn get_process_count(&self) -> usize {
        self.processes.read().len()
    }
}

fn is_process_alive(pid: u32) -> bool {
    let mut sys = sysinfo::System::new();
    sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
    sys.process(sysinfo::Pid::from_u32(pid)).is_some()
}
