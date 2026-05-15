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
    system: Arc<RwLock<sysinfo::System>>,
}

impl ProcessGuardian {
    pub fn new() -> Self {
        let mut system = sysinfo::System::new();
        system.refresh_processes(sysinfo::ProcessesToUpdate::All, true);

        let processes = Arc::new(RwLock::new(HashMap::new()));
        let system = Arc::new(RwLock::new(system));

        let sys_clone = system.clone();
        std::thread::spawn(move || {
            loop {
                std::thread::sleep(std::time::Duration::from_secs(1));
                let mut sys = sys_clone.write();
                sys.refresh_processes(sysinfo::ProcessesToUpdate::All, true);
            }
        });

        ProcessGuardian {
            processes,
            system,
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
        let sys = self.system.read();
        sys.process(sysinfo::Pid::from_u32(pid)).is_some()
    }

    pub fn get_running_processes(&self) -> Vec<GameProcessInfo> {
        let processes = self.processes.read();
        let sys = self.system.read();

        let mut result = Vec::new();
        for (_, proc) in processes.iter() {
            let alive = sys.process(sysinfo::Pid::from_u32(proc.pid)).is_some();
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
        let sys = self.system.read();

        for (_, proc) in processes.iter() {
            if proc.instance_id.as_deref() == Some(instance_id) {
                let alive = sys.process(sysinfo::Pid::from_u32(proc.pid)).is_some();
                let (memory_usage, cpu_usage) = if alive {
                    sys.process(sysinfo::Pid::from_u32(proc.pid))
                        .map(|p| (p.memory(), p.cpu_usage() as f64))
                        .unwrap_or((0, 0.0))
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

        let sys = self.system.read();

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
