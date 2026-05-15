use crate::models::launch::*;
use crate::services::file_manager;
use crate::utils::paths;
use std::collections::HashMap;

fn benchmarks_file() -> std::path::PathBuf {
    paths::config_dir().join("launch_benchmarks.json")
}

pub fn save_benchmark(record: LaunchBenchmarkRecord) -> LaunchBenchmarkRecord {
    let path = benchmarks_file();
    let mut records: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);

    let entry = serde_json::to_value(&record).unwrap_or_default();
    records.push(entry);

    if records.len() > 500 {
        records = records.split_off(records.len() - 500);
    }

    let _ = file_manager::save_json(&path, &records);
    record
}

pub fn get_benchmarks(version: &str, limit: u32) -> Vec<LaunchBenchmarkRecord> {
    let path = benchmarks_file();
    let records: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);

    records.into_iter()
        .filter(|r| r["version"].as_str() == Some(version))
        .filter_map(|r| serde_json::from_value::<LaunchBenchmarkRecord>(r).ok())
        .rev()
        .take(limit as usize)
        .collect()
}

pub fn get_benchmark_summary(version: &str) -> Option<LaunchBenchmarkSummary> {
    let records = get_benchmarks(version, 500);
    if records.is_empty() {
        return None;
    }

    let durations: Vec<u64> = records.iter()
        .map(|r| r.total_duration_ms)
        .collect();

    let avg = durations.iter().sum::<u64>() / durations.len() as u64;
    let min = *durations.iter().min().unwrap_or(&0);
    let max = *durations.iter().max().unwrap_or(&0);
    let last = *durations.last().unwrap_or(&0);

    let variance = if durations.len() > 1 {
        let mean = avg as f64;
        let sum_sq: f64 = durations.iter().map(|&d| (d as f64 - mean).powi(2)).sum();
        (sum_sq / (durations.len() - 1) as f64).sqrt()
    } else {
        0.0
    };

    let trend = if durations.len() >= 3 {
        let recent: f64 = durations.iter().rev().take(3).map(|&d| d as f64).sum::<f64>() / 3.0;
        let older: f64 = durations.iter().rev().skip(3).take(3).map(|&d| d as f64).sum::<f64>() / durations.iter().rev().skip(3).take(3).count().max(1) as f64;
        if recent < older * 0.9 {
            BenchmarkTrend::Improving
        } else if recent > older * 1.1 {
            BenchmarkTrend::Degrading
        } else {
            BenchmarkTrend::Stable
        }
    } else {
        BenchmarkTrend::Stable
    };

    Some(LaunchBenchmarkSummary {
        version: version.to_string(),
        average_duration_ms: avg,
        min_duration_ms: min,
        max_duration_ms: max,
        sample_count: records.len() as u32,
        last_duration_ms: last,
        deviation: variance,
        trend,
    })
}

pub fn detect_slow_mod(version: &str, current_mod_count: u32) -> Option<String> {
    let records = get_benchmarks(version, 50);
    let valid_records: Vec<&LaunchBenchmarkRecord> = records.iter()
        .filter(|r| r.exit_code == Some(0))
        .collect();

    if valid_records.len() < 2 {
        return None;
    }

    let last = valid_records.last()?;
    let prev = &valid_records[valid_records.len() - 2];

    let diff = last.total_duration_ms as i64 - prev.total_duration_ms as i64;
    let relative_diff = diff as f64 / prev.total_duration_ms as f64;

    if relative_diff > 0.2 && current_mod_count > prev.mod_count {
        let mod_diff = current_mod_count - prev.mod_count;
        return Some(format!(
            "本次启动比上次慢了 {} 毫秒，新增了 {} 个模组，可能是新增模组导致的",
            diff, mod_diff
        ));
    }

    None
}

pub fn create_benchmark_from_session(
    session: &LaunchSession,
    java_version: &str,
    mod_count: u32,
) -> LaunchBenchmarkRecord {
    let mut phase_durations_ms: HashMap<String, u64> = HashMap::new();
    for phase in &session.phases {
        phase_durations_ms.insert(
            phase.id.id_str().to_string(),
            phase.duration_ms.unwrap_or(0),
        );
    }

    let total_duration_ms = session.completed_at
        .map(|end| (end - session.start_time) as u64)
        .unwrap_or(0);

    LaunchBenchmarkRecord {
        id: format!("bench-{}", chrono::Utc::now().timestamp_millis()),
        version: session.version.clone(),
        instance_id: session.instance_id.clone(),
        timestamp: chrono::Utc::now().timestamp_millis(),
        total_duration_ms,
        phase_durations_ms,
        java_version: java_version.to_string(),
        max_memory: 0,
        mod_count,
        exit_code: session.exit_code,
    }
}
