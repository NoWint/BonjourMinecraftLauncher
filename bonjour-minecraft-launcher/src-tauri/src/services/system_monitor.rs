use serde::{Deserialize, Serialize};
use std::sync::Arc;
use parking_lot::Mutex;
use sysinfo::{ProcessesToUpdate, System};
use std::time::Instant;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct SystemMonitorData {
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
}

pub struct SystemMonitor {
    sys: Arc<Mutex<System>>,
    frame_times: Arc<Mutex<Vec<f64>>>,
    memory_history: Arc<Mutex<Vec<u64>>>,
    last_refresh: Arc<Mutex<Instant>>,
    game_pid: Arc<Mutex<Option<u32>>>,
}

impl SystemMonitor {
    pub fn new() -> Self {
        Self {
            sys: Arc::new(Mutex::new(System::new_all())),
            frame_times: Arc::new(Mutex::new(Vec::with_capacity(60))),
            memory_history: Arc::new(Mutex::new(Vec::with_capacity(120))),
            last_refresh: Arc::new(Mutex::new(Instant::now())),
            game_pid: Arc::new(Mutex::new(None)),
        }
    }

    pub fn set_game_pid(&self, pid: u32) {
        *self.game_pid.lock() = Some(pid);
    }

    pub fn clear_game_pid(&self) {
        *self.game_pid.lock() = None;
    }

    pub fn collect(&self) -> SystemMonitorData {
        let should_refresh = {
            let last = self.last_refresh.lock();
            last.elapsed().as_millis() > 500
        };

        if should_refresh {
            let mut sys = self.sys.lock();
            sys.refresh_all();
            sys.refresh_processes(ProcessesToUpdate::All, true);
            *self.last_refresh.lock() = Instant::now();
        }

        let sys = self.sys.lock();
        let total_mem = sys.total_memory() / 1024 / 1024;
        let used_mem = (sys.total_memory() - sys.available_memory()) / 1024 / 1024;

        let cpu_usage = sys.cpus().iter()
            .map(|c| c.cpu_usage() as f64)
            .sum::<f64>()
            / sys.cpus().len().max(1) as f64;

        let mut mem_hist = self.memory_history.lock();
        mem_hist.push(used_mem);
        if mem_hist.len() > 120 {
            mem_hist.remove(0);
        }
        let mem_history = mem_hist.clone();

        let oom_warning = self.check_oom_warning(used_mem, total_mem, &mem_history);

        let game_pid = *self.game_pid.lock();
        let (fps, frame_time_ms, frame_time_history, fps_stability, bottleneck) =
            self.estimate_game_performance(&sys, game_pid);

        let gpu_usage = self.get_gpu_usage();

        drop(sys);

        SystemMonitorData {
            fps,
            frame_time_ms,
            frame_time_history,
            fps_stability,
            bottleneck,
            cpu_usage,
            gpu_usage,
            memory_used_mb: used_mem,
            memory_total_mb: total_mem,
            memory_history: mem_history,
            oom_warning,
        }
    }

    fn estimate_game_performance(
        &self,
        sys: &System,
        game_pid: Option<u32>,
    ) -> (u32, f64, Vec<f64>, f64, Option<String>) {
        let mut frame_times = self.frame_times.lock();

        if let Some(pid) = game_pid {
            if let Some(process) = sys.process(sysinfo::Pid::from_u32(pid)) {
                let cpu_pct = process.cpu_usage() as f64;
                let mem_mb = process.memory() / 1024 / 1024;

                let frame_time = if cpu_pct > 0.0 {
                    1000.0 / (cpu_pct / 100.0 * 60.0).max(1.0)
                } else {
                    16.67
                };

                frame_times.push(frame_time);
                if frame_times.len() > 60 {
                    frame_times.remove(0);
                }

                let avg_frame_time = frame_times.iter().sum::<f64>() / frame_times.len().max(1) as f64;
                let fps = (1000.0 / avg_frame_time).round() as u32;

                let variance = if frame_times.len() > 1 {
                    let mean = avg_frame_time;
                    frame_times.iter()
                        .map(|&t| (t - mean).powi(2))
                        .sum::<f64>()
                        / (frame_times.len() - 1) as f64
                } else {
                    0.0
                };
                let std_dev = variance.sqrt();
                let stability = (100.0 - (std_dev / avg_frame_time * 100.0)).max(0.0).min(100.0);

                let bottleneck = if cpu_pct > 90.0 {
                    Some("CPU瓶颈".to_string())
                } else if mem_mb > 0 {
                    let total_mb = sys.total_memory() / 1024 / 1024;
                    if used_ratio(mem_mb, total_mb) > 0.85 {
                        Some("内存不足".to_string())
                    } else {
                        None
                    }
                } else {
                    None
                };

                return (fps, avg_frame_time, frame_times.clone(), stability, bottleneck);
            }
        }

        let total_cpu: f64 = sys.cpus().iter()
            .map(|c| c.cpu_usage() as f64)
            .sum::<f64>()
            / sys.cpus().len().max(1) as f64;

        let estimated_fps = if total_cpu > 0.0 {
            ((60.0 * (100.0 - total_cpu).max(5.0)) / 100.0).round() as u32
        } else {
            60
        };

        (estimated_fps, 16.67, frame_times.clone(), 100.0, None)
    }

    fn check_oom_warning(&self, used_mb: u64, total_mb: u64, mem_history: &[u64]) -> Option<String> {
        let ratio = used_mb as f64 / total_mb.max(1) as f64;
        if ratio < 0.8 {
            return None;
        }

        if mem_history.len() >= 10 {
            let recent = &mem_history[mem_history.len() - 10..];
            let first = recent[0] as f64;
            let last = recent[recent.len() - 1] as f64;
            let growth_rate = (last - first) / 10.0;

            if growth_rate > 0.0 {
                let remaining_mb = (total_mb - used_mb) as f64;
                let minutes_to_oom = remaining_mb / (growth_rate * 12.0);
                if minutes_to_oom < 10.0 {
                    return Some(format!("内存将在约 {:.0} 分钟后耗尽，建议保存退出", minutes_to_oom));
                }
            }
        }

        if ratio > 0.9 {
            Some("内存使用超过 90%，建议关闭其他程序".to_string())
        } else {
            None
        }
    }

    fn get_gpu_usage(&self) -> f64 {
        if cfg!(target_os = "macos") {
            if let Ok(output) = std::process::Command::new("sh")
                .arg("-c")
                .arg("sudo powermetrics --samplers gpu_power -i 1000 -n 1 2>/dev/null | grep 'GPU active' | head -1 | awk '{print $3}'")
                .output()
            {
                let stdout = String::from_utf8_lossy(&output.stdout);
                if let Ok(pct) = stdout.trim().trim_end_matches('%').parse::<f64>() {
                    return pct;
                }
            }
        }
        0.0
    }
}

fn used_ratio(used: u64, total: u64) -> f64 {
    used as f64 / total.max(1) as f64
}
