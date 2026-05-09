use crate::models::launch::*;
use crate::services::log_diagnoser;

pub fn collect_system_snapshot() -> CrashSystemInfo {
    let mut sys = sysinfo::System::new();
    sys.refresh_all();

    let os = System::name().unwrap_or_else(|| "Unknown".to_string());
    let os_version = System::os_version().unwrap_or_else(|| "Unknown".to_string());

    let cpu_model = sys.cpus().first()
        .map(|c| c.brand().to_string())
        .unwrap_or_else(|| "Unknown".to_string());

    let total_memory_mb = sys.total_memory() / 1024 / 1024;

    let gpu_info = sysinfo::Components::new()
        .iter()
        .filter(|c| c.label().contains("GPU") || c.label().contains("gpu"))
        .map(|c| c.label().to_string())
        .collect::<Vec<_>>()
        .join(", ");

    let gpu_info = if gpu_info.is_empty() { "Unknown".to_string() } else { gpu_info };

    let disk_free_gb = sysinfo::Disks::new_with_refreshed_list()
        .iter()
        .map(|d| d.available_space() as f64 / 1024.0 / 1024.0 / 1024.0)
        .sum::<f64>();

    let process_count = sys.processes().len() as u32;

    let java_version = std::process::Command::new("java")
        .arg("-version")
        .output()
        .ok()
        .and_then(|o| String::from_utf8(o.stderr).ok())
        .and_then(|s| s.lines().next().map(|l| l.to_string()))
        .unwrap_or_else(|| "Unknown".to_string());

    CrashSystemInfo {
        os,
        os_version,
        java_version,
        total_memory_mb,
        cpu_model,
        gpu_info,
        disk_free_gb,
        process_count,
    }
}

use sysinfo::System;

pub fn create_crash_report(
    version: &str,
    exit_code: i32,
    raw_log: &str,
    instance_id: Option<&str>,
    mod_list: &[String],
    jvm_args: &[String],
) -> CrashReport {
    let system_info = collect_system_snapshot();
    let stack_trace = log_diagnoser::extract_stack_trace(raw_log);
    let diagnosis = log_diagnoser::diagnose_crash_report(raw_log, exit_code, &system_info, mod_list, jvm_args);

    CrashReport {
        id: format!("crash-{}", chrono::Utc::now().timestamp_millis()),
        timestamp: chrono::Utc::now().timestamp_millis(),
        version: version.to_string(),
        instance_id: instance_id.map(|s| s.to_string()),
        exit_code,
        stack_trace,
        system_info,
        mod_list: mod_list.to_vec(),
        jvm_args: jvm_args.to_vec(),
        diagnosis,
        raw_log: raw_log.to_string(),
    }
}

pub fn analyze_exit_code(exit_code: i32) -> ExitCodeAnalysis {
    match exit_code {
        0 => ExitCodeAnalysis {
            category: "normal".to_string(),
            description: "游戏正常退出".to_string(),
            severity: ExitCodeSeverity::Info,
        },
        1 => ExitCodeAnalysis {
            category: "error".to_string(),
            description: "游戏因错误退出，通常是模组或配置问题".to_string(),
            severity: ExitCodeSeverity::Error,
        },
        -1 => ExitCodeAnalysis {
            category: "crash".to_string(),
            description: "JVM 崩溃，可能是内存不足或原生代码错误".to_string(),
            severity: ExitCodeSeverity::Critical,
        },
        137 => ExitCodeAnalysis {
            category: "oom".to_string(),
            description: "进程被系统杀死（OOM），内存不足".to_string(),
            severity: ExitCodeSeverity::Critical,
        },
        130 => ExitCodeAnalysis {
            category: "interrupted".to_string(),
            description: "游戏被用户中断".to_string(),
            severity: ExitCodeSeverity::Info,
        },
        _ => {
            if exit_code > 128 {
                ExitCodeAnalysis {
                    category: "signal".to_string(),
                    description: format!("进程收到信号 {} 终止", exit_code - 128),
                    severity: ExitCodeSeverity::Warning,
                }
            } else {
                ExitCodeAnalysis {
                    category: "unknown".to_string(),
                    description: format!("游戏以未知代码 {} 退出", exit_code),
                    severity: ExitCodeSeverity::Warning,
                }
            }
        }
    }
}

pub fn get_recovery_options(exit_code: i32, _version: &str, _instance_id: Option<&str>) -> Vec<ProcessRecoveryOption> {
    let mut options = vec![
        ProcessRecoveryOption {
            id: "restart".to_string(),
            label: "重新启动游戏".to_string(),
            description: "使用相同配置重新启动游戏".to_string(),
            action: ProcessRecoveryAction::Restart,
        },
        ProcessRecoveryOption {
            id: "view_log".to_string(),
            label: "查看日志".to_string(),
            description: "查看完整的游戏启动日志".to_string(),
            action: ProcessRecoveryAction::ViewLog,
        },
    ];

    if exit_code == -1 || exit_code == 137 {
        options.push(ProcessRecoveryOption {
            id: "quick_fix".to_string(),
            label: "一键修复".to_string(),
            description: "自动检测并修复常见启动问题".to_string(),
            action: ProcessRecoveryAction::QuickFix,
        });
    }

    if exit_code != 0 {
        options.push(ProcessRecoveryOption {
            id: "rollback".to_string(),
            label: "回退版本".to_string(),
            description: "回退到之前可以正常运行的版本".to_string(),
            action: ProcessRecoveryAction::RollbackVersion,
        });
    }

    options.push(ProcessRecoveryOption {
        id: "dismiss".to_string(),
        label: "忽略".to_string(),
        description: "关闭此通知".to_string(),
        action: ProcessRecoveryAction::Dismiss,
    });

    options
}
