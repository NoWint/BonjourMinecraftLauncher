use std::io::BufRead;
use std::path::{Path, PathBuf};
use std::process::{Child, Command, Stdio};
use std::sync::Arc;
use std::collections::HashMap;
use parking_lot::RwLock;
use tauri::Emitter;
use crate::models::launch::{LaunchOptions, LaunchPhaseId};
use crate::errors::{self, AppError};
use crate::services::ipc::LaunchLogBuffer;
use crate::services::launch_engine::LaunchEngine;

lazy_static::lazy_static! {
    static ref LAUNCH_CACHE: Arc<RwLock<LaunchCache>> = Arc::new(RwLock::new(LaunchCache::new()));
}

#[derive(Clone, serde::Serialize, serde::Deserialize)]
struct CachedLaunchConfig {
    version_json_hash: String,
    classpath: String,
    jvm_args: Vec<String>,
    game_args: Vec<String>,
    main_class: String,
    natives_dir: String,
    natives_extracted: bool,
    timestamp: u64,
}

struct LaunchCache {
    configs: HashMap<String, CachedLaunchConfig>,
}

impl LaunchCache {
    fn new() -> Self {
        LaunchCache {
            configs: HashMap::new(),
        }
    }
    
    fn get(&self, version: &str) -> Option<CachedLaunchConfig> {
        self.configs.get(version).cloned()
    }
    
    fn set(&mut self, version: String, config: CachedLaunchConfig) {
        self.configs.insert(version, config);
        if self.configs.len() > 50 {
            let mut oldest_key = None;
            let mut oldest_time = u64::MAX;
            for (k, v) in &self.configs {
                if v.timestamp < oldest_time {
                    oldest_time = v.timestamp;
                    oldest_key = Some(k.clone());
                }
            }
            if let Some(key) = oldest_key {
                self.configs.remove(&key);
            }
        }
    }
}

pub struct MinecraftLauncher;

impl MinecraftLauncher {
    pub fn warmup(game_dir: &str, version: &str) -> Result<(), AppError> {
        let game_dir_path = Path::new(game_dir);
        let version_dir = game_dir_path.join("versions").join(version);
        let version_json_path = version_dir.join(format!("{}.json", version));

        if !version_json_path.exists() {
            return Ok(());
        }

        let version_json_str = std::fs::read_to_string(&version_json_path)
            .map_err(|e| errors::file_read_error(&version_json_path, e.to_string()))?;
        
        let version_json: serde_json::Value = serde_json::from_str(&version_json_str)
            .map_err(|e| errors::json_parse_error(format!("{}: {}", version_json_path.display(), e)))?;

        let json_hash = Self::compute_hash(&version_json_str);

        {
            let cache = LAUNCH_CACHE.read();
            if let Some(cached) = cache.get(version) {
                if cached.version_json_hash == json_hash && cached.natives_extracted {
                    return Ok(());
                }
            }
        }

        let natives_dir = version_dir.join("natives");
        let marker_exists = natives_dir.join(".extracted_marker").exists();

        if !marker_exists {
            let _ = std::fs::create_dir_all(&natives_dir);
            Self::extract_natives_fast(game_dir_path, &version_json, &natives_dir)?;
        }

        let classpath = Self::build_classpath(game_dir_path, &version_json)?;
        let main_class = version_json["mainClass"]
            .as_str()
            .unwrap_or("net.minecraft.client.main.Main")
            .to_string();
        let natives_dir_str = natives_dir.to_string_lossy().to_string();

        let cached_config = CachedLaunchConfig {
            version_json_hash: json_hash,
            classpath,
            jvm_args: Vec::new(),
            game_args: Vec::new(),
            main_class,
            natives_dir: natives_dir_str,
            natives_extracted: true,
            timestamp: std::time::SystemTime::now()
                .duration_since(std::time::UNIX_EPOCH)
                .unwrap()
                .as_secs(),
        };

        LAUNCH_CACHE.write().set(version.to_string(), cached_config);
        Ok(())
    }
    pub fn launch(&self, options: &LaunchOptions, app: &tauri::AppHandle, launch_engine: Option<&LaunchEngine>) -> Result<u32, AppError> {
        let game_dir = Path::new(&options.game_dir);
        let version_dir = game_dir.join("versions").join(&options.version);
        let version_json_path = version_dir.join(format!("{}.json", options.version));

        if !version_json_path.exists() {
            return Err(errors::file_not_found(&version_json_path));
        }

        let account_name = options.account.username.clone();
        let instance_id = options.instance_id.clone();
        let session_id = format!("launch-{}", chrono::Utc::now().timestamp_millis());

        if let Some(engine) = launch_engine {
            engine.start_session(options.version.clone(), account_name.clone(), instance_id.clone());
            engine.advance_to_phase(&session_id, &LaunchPhaseId::Validating, app);
        }

        let version_json_str = std::fs::read_to_string(&version_json_path)
            .map_err(|e| errors::file_read_error(&version_json_path, e.to_string()))?;
        
        let version_json: serde_json::Value = serde_json::from_str(&version_json_str)
            .map_err(|e| errors::json_parse_error(format!("{}: {}", version_json_path.display(), e)))?;

        let json_hash = Self::compute_hash(&version_json_str);
        let java_path = options.java_path.as_deref().unwrap_or("java").to_string();

        let cached_hit = {
            let cache = LAUNCH_CACHE.read();
            if let Some(cached) = cache.get(&options.version) {
                cached.version_json_hash == json_hash && cached.natives_extracted
            } else {
                false
            }
        };

        if !cached_hit {
            if let Some(engine) = launch_engine {
                engine.complete_phase(&session_id, &LaunchPhaseId::Validating, app);
                engine.advance_to_phase(&session_id, &LaunchPhaseId::Extracting, app);
            }

            let natives_dir = version_dir.join("natives");
            let natives_dir_str = natives_dir.to_string_lossy().to_string();
            let marker_exists = natives_dir.join(".extracted_marker").exists();

            let game_dir_clone = game_dir.to_path_buf();
            let version_json_clone = version_json.clone();
            let natives_dir_clone = natives_dir.clone();
            let natives_handle = std::thread::spawn(move || -> Result<(), AppError> {
                if !marker_exists {
                    let _ = std::fs::create_dir_all(&natives_dir_clone);
                    Self::extract_natives_fast(&game_dir_clone, &version_json_clone, &natives_dir_clone)?;
                }
                Ok(())
            });

            let classpath = Self::build_classpath(game_dir, &version_json)?;

            natives_handle.join()
                .map_err(|_| errors::internal("Natives extraction thread panicked"))??;

            let main_class = version_json["mainClass"]
                .as_str()
                .unwrap_or("net.minecraft.client.main.Main")
                .to_string();

            let max_mem = format!("-Xmx{}M", options.max_memory);
            let min_mem = format!("-Xms{}M", options.min_memory);

            let mut jvm_args = vec![max_mem, min_mem];
            jvm_args.push(format!("-Djava.library.path={}", natives_dir_str));

            if let Some(custom_args) = &options.jvm_args {
                jvm_args.extend(custom_args.iter().cloned());
            }

            let jvm_args_from_json = Self::parse_jvm_arguments(&version_json, options);
            jvm_args.extend(jvm_args_from_json);

            let game_args = Self::parse_game_arguments(&version_json, options);

            let cached_config = CachedLaunchConfig {
                version_json_hash: json_hash,
                classpath: classpath.clone(),
                jvm_args: jvm_args.clone(),
                game_args: game_args.clone(),
                main_class: main_class.clone(),
                natives_dir: natives_dir_str,
                natives_extracted: true,
                timestamp: std::time::SystemTime::now()
                    .duration_since(std::time::UNIX_EPOCH)
                    .unwrap()
                    .as_secs(),
            };
            
            LAUNCH_CACHE.write().set(options.version.clone(), cached_config);

            if let Some(engine) = launch_engine {
                engine.complete_phase(&session_id, &LaunchPhaseId::Extracting, app);
            }
        }

        if let Some(engine) = launch_engine {
            engine.advance_to_phase(&session_id, &LaunchPhaseId::JavaInit, app);
            engine.complete_phase(&session_id, &LaunchPhaseId::JavaInit, app);
        }

        let (final_classpath, final_jvm_args, final_game_args, final_main_class) = {
            let cache = LAUNCH_CACHE.read();
            let cached = cache.get(&options.version).unwrap();
            (cached.classpath.clone(), cached.jvm_args.clone(), cached.game_args.clone(), cached.main_class.clone())
        };

        let mut all_args = final_jvm_args;
        all_args.push("-cp".to_string());
        all_args.push(final_classpath);
        all_args.push(final_main_class);
        all_args.extend(final_game_args);

        let child = Command::new(&java_path)
            .args(&all_args)
            .current_dir(game_dir)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .env("__GL_THREADED_OPTIMIZATION", "1")
            .spawn()
            .map_err(|e| {
                let err = errors::launch_failed(e.to_string());
                let _ = app.emit("launch-error", err.to_error_response());
                err
            })?;

        let pid = child.id();

        if let Some(engine) = launch_engine {
            engine.mark_running(&session_id, pid, app);
        }

        let app_clone = app.clone();
        let _sid = session_id.clone();
        std::thread::spawn(move || {
            Self::monitor_process(child, &app_clone, &_sid);
        });

        let _ = app.emit("launch-running", serde_json::json!({
            "sessionId": session_id,
            "pid": pid,
            "timestamp": chrono::Utc::now().timestamp_millis()
        }));

        Ok(pid)
    }

    fn compute_hash(s: &str) -> String {
        use std::collections::hash_map::DefaultHasher;
        use std::hash::{Hash, Hasher};
        let mut hasher = DefaultHasher::new();
        s.hash(&mut hasher);
        format!("{:x}", hasher.finish())
    }

    fn monitor_process(mut child: Child, app: &tauri::AppHandle, session_id: &str) {
        let stdout = child.stdout.take();
        let stderr = child.stderr.take();

        let log_buffer = LaunchLogBuffer::new(app.clone(), session_id.to_string());

        if let Some(out) = stdout {
            let buf = log_buffer.clone_ref();
            std::thread::spawn(move || {
                let reader = std::io::BufReader::new(out);
                for line in reader.lines().map_while(Result::ok) {
                    buf.push_log("stdout", &line, None);
                }
                buf.flush();
            });
        }

        if let Some(err) = stderr {
            let buf = log_buffer.clone_ref();
            std::thread::spawn(move || {
                let reader = std::io::BufReader::new(err);
                for line in reader.lines().map_while(Result::ok) {
                    buf.push_log("stderr", &line, None);
                }
                buf.flush();
            });
        }

        let exit_status = match child.wait() {
            Ok(status) => status.code().unwrap_or(-1),
            Err(_) => -1,
        };

        log_buffer.flush();

        let _ = app.emit("launch-close", exit_status);
        let _ = app.emit("launch-exit", serde_json::json!({
            "sessionId": session_id,
            "exitCode": exit_status,
            "timestamp": chrono::Utc::now().timestamp_millis()
        }));

        if exit_status != 0 {
            let _ = app.emit("launch-crash-recovery", serde_json::json!({
                "sessionId": session_id,
                "exitCode": exit_status,
                "recoveryOptions": [
                    {"id": "relaunch", "label": "重新启动"},
                    {"id": "logs", "label": "查看日志"},
                    {"id": "ignore", "label": "忽略"}
                ],
                "timestamp": chrono::Utc::now().timestamp_millis()
            }));
        }
    }

    fn extract_natives_fast(game_dir: &Path, version_json: &serde_json::Value, natives_dir: &Path) -> Result<(), AppError> {
        let os_name = if cfg!(target_os = "windows") { "windows" }
                      else if cfg!(target_os = "macos") { "osx" }
                      else { "linux" };
        let arch = if cfg!(target_arch = "x86_64") || cfg!(target_arch = "aarch64") {
            "64"
        } else {
            "32"
        };

        let marker_file = natives_dir.join(".extracted_marker");
        if marker_file.exists() {
            return Ok(());
        }

        if let Some(libraries) = version_json["libraries"].as_array() {
            for lib in libraries {
                if Self::should_skip_lib(lib) {
                    continue;
                }
                if let Some(natives) = lib.get("natives") {
                    if let Some(native_key) = natives.get(os_name).and_then(|v| v.as_str()) {
                        let native_key = native_key.replace("${arch}", arch);
                        if let Some(classifier) = lib
                            .get("downloads")
                            .and_then(|d| d.get("classifiers"))
                            .and_then(|c| c.get(&native_key))
                        {
                            if let Some(path) = classifier["path"].as_str() {
                                let jar_path = game_dir.join("libraries").join(path);
                                if jar_path.exists() {
                                    if let Err(e) = Self::extract_native_jar_fast(&jar_path, natives_dir) {
                                        eprintln!("Warning: Failed to extract native {}: {}", jar_path.display(), e);
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }
        
        let _ = std::fs::File::create(&marker_file);
        Ok(())
    }

    fn extract_native_jar_fast(jar_path: &Path, natives_dir: &Path) -> Result<(), AppError> {
        let file = std::fs::File::open(jar_path)
            .map_err(|e| errors::file_read_error(jar_path, e.to_string()))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| errors::internal(format!("Failed to read zip archive: {}", e)))?;

        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .map_err(|e| errors::internal(format!("Failed to read zip entry: {}", e)))?;
            let name = file.name().to_string();

            let is_native = name.ends_with(".so")
                || name.ends_with(".dll")
                || name.ends_with(".dylib")
                || (name.ends_with(".jnilib") && cfg!(target_os = "macos"));

            if is_native && !name.contains('/') {
                let out_path = natives_dir.join(Path::new(&name).file_name().unwrap());
                if !out_path.exists() {
                    let mut out_file = std::fs::File::create(&out_path)
                        .map_err(|e| errors::file_write_error(&out_path, e.to_string()))?;
                    std::io::copy(&mut file, &mut out_file)
                        .map_err(|e| errors::file_write_error(&out_path, e.to_string()))?;
                }
            }
        }
        Ok(())
    }

    fn should_skip_lib(lib: &serde_json::Value) -> bool {
        if let Some(rules) = lib.get("rules").and_then(|r| r.as_array()) {
            let mut allowed = true;
            for rule in rules {
                let action = rule["action"].as_str().unwrap_or("");
                let os_match = rule.get("os").and_then(|o| {
                    let os_name = o["name"].as_str().unwrap_or("");
                    let current_os = if cfg!(target_os = "windows") { "windows" }
                                     else if cfg!(target_os = "macos") { "osx" }
                                     else { "linux" };
                    Some(os_name == current_os)
                }).unwrap_or(true);

                if action == "allow" && !os_match {
                    allowed = false;
                } else if action == "disallow" && os_match {
                    allowed = false;
                }
            }
            return !allowed;
        }
        false
    }

    fn parse_jvm_arguments(version_json: &serde_json::Value, options: &LaunchOptions) -> Vec<String> {
        let mut args = Vec::new();

        if let Some(arguments) = version_json.get("arguments") {
            if let Some(jvm) = arguments.get("jvm").and_then(|j| j.as_array()) {
                for arg in jvm {
                    if let Some(s) = arg.as_str() {
                        let replaced = Self::replace_variables(s, options);
                        if !replaced.is_empty() {
                            args.push(replaced);
                        }
                    } else if let Some(obj) = arg.as_object() {
                        if !Self::should_skip_rule_arg(obj) {
                            if let Some(value) = obj.get("value") {
                                if let Some(s) = value.as_str() {
                                    let replaced = Self::replace_variables(s, options);
                                    if !replaced.is_empty() {
                                        args.push(replaced);
                                    }
                                } else if let Some(arr) = value.as_array() {
                                    for v in arr {
                                        if let Some(s) = v.as_str() {
                                            let replaced = Self::replace_variables(s, options);
                                            if !replaced.is_empty() {
                                                args.push(replaced);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        }

        args
    }

    fn parse_game_arguments(version_json: &serde_json::Value, options: &LaunchOptions) -> Vec<String> {
        let mut args = Vec::new();

        if let Some(arguments) = version_json.get("arguments") {
            if let Some(game) = arguments.get("game").and_then(|g| g.as_array()) {
                for arg in game {
                    if let Some(s) = arg.as_str() {
                        let replaced = Self::replace_variables(s, options);
                        if !replaced.is_empty() {
                            args.push(replaced);
                        }
                    } else if let Some(obj) = arg.as_object() {
                        if !Self::should_skip_rule_arg(obj) {
                            if let Some(value) = obj.get("value") {
                                if let Some(s) = value.as_str() {
                                    let replaced = Self::replace_variables(s, options);
                                    if !replaced.is_empty() {
                                        args.push(replaced);
                                    }
                                } else if let Some(arr) = value.as_array() {
                                    for v in arr {
                                        if let Some(s) = v.as_str() {
                                            let replaced = Self::replace_variables(s, options);
                                            if !replaced.is_empty() {
                                                args.push(replaced);
                                            }
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            }
        } else if let Some(minecraft_args) = version_json["minecraftArguments"].as_str() {
            for arg in minecraft_args.split(' ') {
                let replaced = Self::replace_variables(arg, options);
                if !replaced.is_empty() {
                    args.push(replaced);
                }
            }
        }

        args
    }

    fn should_skip_rule_arg(obj: &serde_json::Map<String, serde_json::Value>) -> bool {
        if let Some(rules) = obj.get("rules").and_then(|r| r.as_array()) {
            for rule in rules {
                let action = rule["action"].as_str().unwrap_or("");
                let os_match = rule.get("os").and_then(|o| {
                    let os_name = o["name"].as_str().unwrap_or("");
                    let current_os = if cfg!(target_os = "windows") { "windows" }
                                     else if cfg!(target_os = "macos") { "osx" }
                                     else { "linux" };
                    Some(os_name == current_os)
                }).unwrap_or(true);

                let features_ok = rule.get("features").map_or(true, |_| false);

                if action == "allow" && (!os_match || !features_ok) {
                    return true;
                } else if action == "disallow" && os_match && features_ok {
                    return true;
                }
            }
        }
        false
    }

    fn replace_variables(s: &str, options: &LaunchOptions) -> String {
        let game_dir = PathBuf::from(&options.game_dir);
        let assets_root = game_dir.join("assets").to_string_lossy().to_string();
        let assets_index_name = options.version.split('-').next().unwrap_or(&options.version).to_string();
        let version_type = if options.version.contains("snapshot") || options.version.contains("rc") || options.version.contains("pre") {
            "snapshot"
        } else {
            "release"
        };
        s.replace("${auth_player_name}", &options.account.username)
         .replace("${auth_uuid}", &options.account.uuid)
         .replace("${auth_access_token}", options.account.access_token.as_deref().unwrap_or(""))
         .replace("${user_type}", "mojang")
         .replace("${version_name}", &options.version)
         .replace("${game_directory}", &options.game_dir)
         .replace("${game_assets}", &assets_root)
         .replace("${assets_root}", &assets_root)
         .replace("${assets_index_name}", &assets_index_name)
         .replace("${version_type}", version_type)
         .replace("${launcher_name}", "Bonjour")
         .replace("${launcher_version}", env!("CARGO_PKG_VERSION"))
         .replace("${classpath_separator}", if cfg!(target_os = "windows") { ";" } else { ":" })
    }

    fn build_classpath(game_dir: &Path, version_json: &serde_json::Value) -> Result<String, AppError> {
        let mut classpath_entries: Vec<String> = Vec::new();
        let separator = if cfg!(target_os = "windows") { ";" } else { ":" };

        if let Some(libraries) = version_json["libraries"].as_array() {
            for lib in libraries {
                if Self::should_skip_lib(lib) {
                    continue;
                }
                if lib.get("natives").is_some() {
                    continue;
                }
                if let Some(downloads) = lib.get("downloads") {
                    if let Some(artifact) = downloads.get("artifact") {
                        if let Some(path) = artifact["path"].as_str() {
                            let lib_path = game_dir.join("libraries").join(path);
                            if lib_path.exists() {
                                classpath_entries.push(lib_path.to_string_lossy().to_string());
                            }
                        }
                    }
                }
            }
        }

        let version_id = version_json["id"].as_str().unwrap_or("unknown");
        let jar_path = game_dir.join("versions").join(version_id).join(format!("{}.jar", version_id));
        if jar_path.exists() {
            classpath_entries.push(jar_path.to_string_lossy().to_string());
        }

        Ok(classpath_entries.join(separator))
    }
}
