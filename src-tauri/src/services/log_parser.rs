use notify::{Config, Event, EventKind, RecommendedWatcher, RecursiveMode, Watcher};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Arc;
use parking_lot::Mutex;
use tauri::{AppHandle, Emitter};
use regex::Regex;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogParseResult {
    pub coord_x: Option<f64>,
    pub coord_y: Option<f64>,
    pub coord_z: Option<f64>,
    pub dimension: Option<String>,
    pub biome: Option<String>,
    pub direction: Option<String>,
    pub server_name: Option<String>,
    pub server_ping_ms: Option<u64>,
    pub gc_event: Option<String>,
    pub chunk_load: bool,
    pub player_events: Vec<String>,
}

impl Default for LogParseResult {
    fn default() -> Self {
        Self {
            coord_x: None,
            coord_y: None,
            coord_z: None,
            dimension: None,
            biome: None,
            direction: None,
            server_name: None,
            server_ping_ms: None,
            gc_event: None,
            chunk_load: false,
            player_events: Vec::new(),
        }
    }
}

pub struct LogParser {
    latest_result: Arc<Mutex<LogParseResult>>,
    log_path: Arc<Mutex<Option<PathBuf>>>,
    last_position: Arc<Mutex<u64>>,
    watcher: Arc<Mutex<Option<RecommendedWatcher>>>,
}

impl LogParser {
    pub fn new() -> Self {
        Self {
            latest_result: Arc::new(Mutex::new(LogParseResult::default())),
            log_path: Arc::new(Mutex::new(None)),
            last_position: Arc::new(Mutex::new(0)),
            watcher: Arc::new(Mutex::new(None)),
        }
    }

    pub fn start_watching(&self, app: AppHandle, game_dir: &str) -> Result<(), String> {
        let log_path = find_latest_log(game_dir)?;
        *self.log_path.lock() = Some(log_path.clone());
        *self.last_position.lock() = 0;

        let result = Arc::clone(&self.latest_result);
        let last_pos = Arc::clone(&self.last_position);
        let log_path_clone = log_path.clone();
        let app_clone = app.clone();

        let mut watcher = RecommendedWatcher::new(
            move |res: Result<Event, notify::Error>| {
                if let Ok(event) = res {
                    if matches!(event.kind, EventKind::Modify(_)) {
                        if let Ok(parse_result) = read_and_parse(&log_path_clone, &last_pos) {
                            *result.lock() = parse_result.clone();
                            let _ = app_clone.emit("overlay-log-update", &parse_result);
                        }
                    }
                }
            },
            Config::default(),
        ).map_err(|e| e.to_string())?;

        watcher.watch(&log_path, RecursiveMode::NonRecursive)
            .map_err(|e| e.to_string())?;

        *self.watcher.lock() = Some(watcher);

        if let Ok(parse_result) = read_and_parse(&log_path, &self.last_position) {
            *self.latest_result.lock() = parse_result;
        }

        Ok(())
    }

    pub fn stop_watching(&self) {
        *self.watcher.lock() = None;
        *self.log_path.lock() = None;
        *self.last_position.lock() = 0;
    }

    pub fn get_latest(&self) -> LogParseResult {
        self.latest_result.lock().clone()
    }
}

fn find_latest_log(game_dir: &str) -> Result<PathBuf, String> {
    let log_path = PathBuf::from(game_dir)
        .join("logs")
        .join("latest.log");

    if log_path.exists() {
        Ok(log_path)
    } else {
        let alt_path = PathBuf::from(game_dir)
            .join(".minecraft")
            .join("logs")
            .join("latest.log");
        if alt_path.exists() {
            Ok(alt_path)
        } else {
            Err("latest.log not found".to_string())
        }
    }
}

fn read_and_parse(log_path: &PathBuf, last_position: &Arc<Mutex<u64>>) -> Result<LogParseResult, String> {
    use std::io::{Seek, SeekFrom, BufRead, BufReader};
    use std::fs::File;

    let file = File::open(log_path).map_err(|e| e.to_string())?;
    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);

    let mut pos = last_position.lock();
    if *pos > file_size {
        *pos = 0;
    }

    let mut file = file;
    file.seek(SeekFrom::Start(*pos)).map_err(|e| e.to_string())?;

    let reader = BufReader::new(file);
    let mut result = LogParseResult::default();

    let coord_re = Regex::new(r"XYZ:\s*(-?[\d.]+)\s*/\s*(-?[\d.]+)\s*/\s*(-?[\d.]+)").unwrap();
    let dim_re = Regex::new(r"(?i)(overworld|the_nether|the_end|minecraft:overworld|minecraft:the_nether|minecraft:the_end)").unwrap();
    let biome_re = Regex::new(r"Biome:\s*(\w+)").unwrap();
    let gc_re = Regex::new(r"\[GC\].*?(\d+\.\d+)\s*ms").unwrap();
    let gc_pause_re = Regex::new(r"GC pause.*?(\d+\.\d+)\s*ms").unwrap();
    let chunk_re = Regex::new(r"(?i)(loading chunk|chunk load|Preparing spawn)").unwrap();
    let ping_re = Regex::new(r"Returned.*?(\d+)ms").unwrap();
    let direction_re = Regex::new(r"(?i)(facing:\s*(north|south|east|west)(?:\/(?:north|south|east|west))?)").unwrap();

    for line in reader.lines() {
        let line = line.unwrap_or_default();

        if let Some(caps) = coord_re.captures(&line) {
            result.coord_x = caps.get(1).and_then(|m| m.as_str().parse().ok());
            result.coord_y = caps.get(2).and_then(|m| m.as_str().parse().ok());
            result.coord_z = caps.get(3).and_then(|m| m.as_str().parse().ok());
        }

        if let Some(caps) = dim_re.captures(&line) {
            let dim = caps.get(1).unwrap().as_str().to_lowercase();
            result.dimension = Some(match dim.as_str() {
                "overworld" | "minecraft:overworld" => "主世界".to_string(),
                "the_nether" | "minecraft:the_nether" => "下界".to_string(),
                "the_end" | "minecraft:the_end" => "末地".to_string(),
                _ => dim,
            });
        }

        if let Some(caps) = biome_re.captures(&line) {
            result.biome = Some(caps.get(1).unwrap().as_str().to_string());
        }

        if let Some(caps) = gc_re.captures(&line) {
            result.gc_event = Some(format!("GC: {}ms", caps.get(1).unwrap().as_str()));
        }
        if let Some(caps) = gc_pause_re.captures(&line) {
            result.gc_event = Some(format!("GC停顿: {}ms", caps.get(1).unwrap().as_str()));
        }

        if chunk_re.is_match(&line) {
            result.chunk_load = true;
        }

        if let Some(caps) = ping_re.captures(&line) {
            result.server_ping_ms = caps.get(1).and_then(|m| m.as_str().parse().ok());
        }

        if let Some(caps) = direction_re.captures(&line) {
            result.direction = Some(caps.get(1).unwrap().as_str().to_string());
        }
    }

    *pos = file_size;
    drop(pos);

    Ok(result)
}
