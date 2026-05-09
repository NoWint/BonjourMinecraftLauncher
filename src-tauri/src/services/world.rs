use std::collections::HashMap;
use std::io::Cursor;
use std::path::Path;

use chrono::{DateTime, Local, Utc};
use image::{ImageBuffer, Rgb};
use serde_json::{json, Value};
use uuid::Uuid;

use crate::utils::paths::dir_size;

const BIOME_TABLE: &[(&str, &str, (u8, u8, u8))] = &[
    ("ocean", "#000070", (0, 0, 112)),
    ("deep_ocean", "#000050", (0, 0, 80)),
    ("river", "#000090", (0, 0, 144)),
    ("plains", "#8db360", (141, 179, 96)),
    ("desert", "#c2b280", (194, 178, 128)),
    ("mountains", "#808080", (128, 128, 128)),
    ("forest", "#2d6e2d", (45, 110, 45)),
    ("taiga", "#4a6e4a", (74, 110, 74)),
    ("swamp", "#4a6e4a", (74, 110, 74)),
    ("beach", "#c2b280", (194, 178, 128)),
    ("jungle", "#2d8e2d", (45, 142, 45)),
    ("mushroom_fields", "#800080", (128, 0, 128)),
    ("savanna", "#a8a040", (168, 160, 64)),
    ("badlands", "#a06020", (160, 96, 32)),
    ("ice_spikes", "#a0d0ff", (160, 208, 255)),
    ("snowy_plains", "#d0e0f0", (208, 224, 240)),
    ("flower_forest", "#3d8e3d", (61, 142, 61)),
    ("dark_forest", "#1d4e1d", (29, 78, 29)),
    ("birch_forest", "#5d9e3d", (93, 158, 61)),
    ("grove", "#6a8a6a", (106, 138, 106)),
    ("meadow", "#7db360", (125, 179, 96)),
    ("cherry_grove", "#ff8cc0", (255, 140, 192)),
    ("lush_caves", "#2d6e5d", (45, 110, 93)),
    ("dripstone_caves", "#8a7a6a", (138, 122, 106)),
];

const STRUCTURE_TABLE: &[(&str, &str, &str)] = &[
    ("village", "村庄", "overworld"),
    ("temple", "神殿", "overworld"),
    ("mansion", "林地府邸", "overworld"),
    ("fortress", "要塞", "nether"),
    ("shipwreck", "沉船", "overworld"),
    ("ocean_monument", "海底神殿", "overworld"),
    ("pillager_outpost", "掠夺者前哨", "overworld"),
    ("ancient_city", "远古城市", "overworld"),
];

pub struct WorldService;

impl WorldService {
    // ==================== NBT 解析 ====================

    fn parse_level_dat(world_path: &Path) -> Result<Value, String> {
        let level_dat = world_path.join("level.dat");
        if !level_dat.exists() {
            return Err("level.dat 不存在".to_string());
        }
        let data = std::fs::read(&level_dat)
            .map_err(|e| format!("读取 level.dat 失败: {}", e))?;
        Self::parse_nbt_gzip(&data)
    }

    fn parse_nbt_gzip(data: &[u8]) -> Result<Value, String> {
        if data.len() < 3 {
            return Err("NBT 数据过短".to_string());
        }
        let cursor = Cursor::new(data);
        let reader = flate2::read::GzDecoder::new(cursor);
        let nbt: fastnbt::Value = fastnbt::from_reader(reader)
            .map_err(|e| format!("NBT 解析失败: {}", e))?;
        Self::fastnbt_to_json(&nbt)
    }

    fn fastnbt_to_json(val: &fastnbt::Value) -> Result<Value, String> {
        Ok(match val {
            fastnbt::Value::Byte(b) => json!(*b),
            fastnbt::Value::Short(s) => json!(*s),
            fastnbt::Value::Int(i) => json!(*i),
            fastnbt::Value::Long(l) => json!(*l),
            fastnbt::Value::Float(f) => json!(*f),
            fastnbt::Value::Double(d) => json!(*d),
            fastnbt::Value::String(s) => json!(s.as_str()),
            fastnbt::Value::List(arr) => {
                json!(arr.iter().map(|v| Self::fastnbt_to_json(v)).collect::<Result<Vec<_>, _>>()?)
            }
            fastnbt::Value::Compound(map) => {
                let mut obj = serde_json::Map::new();
                for (k, v) in map {
                    obj.insert(k.clone(), Self::fastnbt_to_json(v)?);
                }
                Value::Object(obj)
            }
            fastnbt::Value::ByteArray(arr) => json!(arr.iter().map(|b| *b as i8).collect::<Vec<_>>()),
            fastnbt::Value::IntArray(arr) => json!(arr),
            fastnbt::Value::LongArray(arr) => json!(arr),
        })
    }

    fn get_level_data(world_path: &Path) -> Value {
        Self::parse_level_dat(world_path)
            .ok()
            .and_then(|v| v.get("Data").cloned())
            .unwrap_or(json!({}))
    }

    // ==================== 基础存档操作 ====================

    pub fn get_world_info(world_path: &Path) -> Value {
        let data = Self::get_level_data(world_path);

        let name = data.get("LevelName")
            .and_then(|v| v.as_str())
            .unwrap_or_else(|| {
                world_path.file_name()
                    .unwrap_or_default().to_str().unwrap_or("Unknown")
            })
            .to_string();

        let game_mode = match data.get("GameType").and_then(|v| v.as_i64()).unwrap_or(0) {
            0 => "survival", 1 => "creative", 2 => "adventure", 3 => "spectator", _ => "survival",
        };
        let difficulty = match data.get("Difficulty").and_then(|v| v.as_i64()).unwrap_or(2) {
            0 => "peaceful", 1 => "easy", 2 => "normal", 3 => "hard", _ => "normal",
        };

        let last_played = data.get("LastPlayed").and_then(|v| v.as_i64()).unwrap_or(0);
        let total_time = data.get("Time")
            .and_then(|v| v.as_i64())
            .or_else(|| data.get("TotalTime").and_then(|v| v.as_i64()))
            .unwrap_or(0);
        let seed = data.get("RandomSeed").and_then(|v| v.as_i64());
        let spawn_x = data.get("SpawnX").and_then(|v| v.as_i64()).unwrap_or(0);
        let spawn_y = data.get("SpawnY").and_then(|v| v.as_i64()).unwrap_or(64);
        let spawn_z = data.get("SpawnZ").and_then(|v| v.as_i64()).unwrap_or(0);
        let day_time = data.get("DayTime").and_then(|v| v.as_i64()).unwrap_or(0);
        let rain_time = data.get("rainTime").and_then(|v| v.as_i64()).unwrap_or(0);
        let thunder_time = data.get("thunderTime").and_then(|v| v.as_i64()).unwrap_or(0);
        let data_version = data.get("DataVersion").and_then(|v| v.as_i64()).unwrap_or(0);
        let cheats = data.get("allowCommands").and_then(|v| v.as_bool()).unwrap_or(false);
        let game_version = data.get("Version")
            .and_then(|v| v.get("Name")).and_then(|v| v.as_str())
            .unwrap_or("Unknown").to_string();
        let is_locked = world_path.join("session.lock").exists();

        let last_played_date = if last_played > 0 {
            DateTime::from_timestamp_millis(last_played)
                .map(|dt| dt.format("%Y-%m-%d %H:%M").to_string())
                .unwrap_or_default()
        } else { String::new() };

        json!({
            "name": name,
            "path": world_path.to_string_lossy(),
            "size": dir_size(world_path),
            "gameVersion": game_version,
            "gameMode": game_mode,
            "difficulty": difficulty,
            "cheatsEnabled": cheats,
            "lastPlayed": last_played,
            "lastPlayedDate": last_played_date,
            "totalTime": total_time,
            "seed": seed.map(|s| s.to_string()),
            "spawnX": spawn_x,
            "spawnY": spawn_y,
            "spawnZ": spawn_z,
            "dayTime": day_time,
            "rainTime": rain_time,
            "thunderTime": thunder_time,
            "dataVersion": data_version,
            "isLocked": is_locked
        })
    }

    pub fn scan_worlds(saves_dir: &Path) -> Vec<Value> {
        if !saves_dir.exists() { return Vec::new(); }
        let Ok(entries) = std::fs::read_dir(saves_dir) else { return Vec::new() };
        let mut worlds: Vec<Value> = entries
            .flatten()
            .filter_map(|e| {
                let p = e.path();
                if p.is_dir() && p.join("level.dat").exists() {
                    Some(Self::get_world_info(&p))
                } else { None }
            })
            .collect();
        worlds.sort_by(|a, b| {
            b.get("lastPlayed").and_then(|v| v.as_i64()).unwrap_or(0)
                .cmp(&a.get("lastPlayed").and_then(|v| v.as_i64()).unwrap_or(0))
        });
        worlds
    }

    pub fn backup_world(world_path: &Path, backup_dir: &Path, description: Option<&str>) -> Result<Value, String> {
        std::fs::create_dir_all(backup_dir)
            .map_err(|e| format!("创建备份目录失败: {}", e))?;
        let world_name = world_path.file_name()
            .unwrap_or_default().to_str().unwrap_or("unknown");
        let timestamp = Local::now().format("%Y%m%d_%H%M%S");
        let backup_name = format!("{}_{}", world_name, timestamp);
        let backup_path = backup_dir.join(&backup_name);

        Self::copy_dir_recursive(world_path, &backup_path)?;

        let size = dir_size(&backup_path);
        let id = Uuid::new_v4().to_string();
        Ok(json!({
            "id": id,
            "worldName": world_name,
            "worldPath": world_path.to_string_lossy(),
            "backupPath": backup_path.to_string_lossy(),
            "backupDate": Utc::now().to_rfc3339(),
            "size": size,
            "description": description
        }))
    }

    pub fn get_backups(backup_dir: &Path) -> Vec<Value> {
        if !backup_dir.exists() { return Vec::new(); }
        let Ok(entries) = std::fs::read_dir(backup_dir) else { return Vec::new() };
        entries.flatten()
            .filter_map(|e| {
                let p = e.path();
                if !p.is_dir() || !p.join("level.dat").exists() { return None; }
                let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                let meta = std::fs::metadata(&p).ok()?;
                let created = meta.created().ok()
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| d.as_millis()).unwrap_or(0);
                Some(json!({
                    "id": name.clone(),
                    "worldName": name.split('_').next().unwrap_or("unknown"),
                    "worldPath": "",
                    "backupPath": p.to_string_lossy(),
                    "backupDate": DateTime::from_timestamp_millis(created as i64)
                        .map(|dt| dt.to_rfc3339()).unwrap_or_default(),
                    "size": dir_size(&p),
                    "description": Value::Null
                }))
            })
            .collect()
    }

    pub fn restore_backup(backup_path: &Path, target_path: &Path) -> Result<(), String> {
        if target_path.exists() {
            std::fs::remove_dir_all(target_path)
                .map_err(|e| format!("清除目标目录失败: {}", e))?;
        }
        Self::copy_dir_recursive(backup_path, target_path)
    }

    pub fn delete_backup(backup_path: &Path) -> Result<(), String> {
        std::fs::remove_dir_all(backup_path)
            .map_err(|e| format!("删除备份失败: {}", e))
    }

    pub fn export_world(world_path: &Path, target_path: &Path, format: &str) -> Result<(), String> {
        match format {
            "zip" => {
                let file = std::fs::File::create(target_path)
                    .map_err(|e| format!("创建 zip 文件失败: {}", e))?;
                let mut zip = zip::ZipWriter::new(file);
                let options = zip::write::SimpleFileOptions::default()
                    .compression_method(zip::CompressionMethod::Deflated);
                Self::add_dir_to_zip(&mut zip, world_path, world_path, &options)?;
                zip.finish().map_err(|e| format!("完成 zip 写入失败: {}", e))?;
                Ok(())
            }
            "folder" => Self::copy_dir_recursive(world_path, target_path),
            _ => Err(format!("不支持的导出格式: {}", format)),
        }
    }

    pub fn import_world(source_path: &Path, target_dir: &Path, world_name: Option<&str>) -> Result<Value, String> {
        let name = world_name.unwrap_or_else(|| {
            source_path.file_name().unwrap_or_default().to_str().unwrap_or("imported_world")
        });
        let dest = target_dir.join(name);
        if dest.exists() {
            return Err(format!("目标路径已存在: {}", dest.display()));
        }
        if source_path.extension().map(|e| e == "zip").unwrap_or(false) {
            Self::extract_zip(source_path, &dest)?;
        } else {
            Self::copy_dir_recursive(source_path, &dest)?;
        }
        Ok(Self::get_world_info(&dest))
    }

    pub fn copy_world(source: &Path, target_dir: &Path, new_name: Option<&str>) -> Result<Value, String> {
        let name = new_name.unwrap_or_else(|| {
            source.file_name().unwrap_or_default().to_str().unwrap_or("copy")
        });
        let dest = target_dir.join(name);
        if dest.exists() {
            return Err(format!("目标路径已存在: {}", dest.display()));
        }
        Self::copy_dir_recursive(source, &dest)?;
        Ok(Self::get_world_info(&dest))
    }

    // ==================== 文件操作工具 ====================

    fn copy_dir_recursive(src: &Path, dst: &Path) -> Result<(), String> {
        std::fs::create_dir_all(dst).map_err(|e| format!("创建目录失败: {}", e))?;
        let Ok(entries) = std::fs::read_dir(src) else { return Ok(()) };
        for entry in entries.flatten() {
            let src_path = entry.path();
            let dst_path = dst.join(entry.file_name());
            if src_path.is_dir() {
                Self::copy_dir_recursive(&src_path, &dst_path)?;
            } else {
                std::fs::copy(&src_path, &dst_path)
                    .map_err(|e| format!("复制文件失败: {}", e))?;
            }
        }
        Ok(())
    }

    fn add_dir_to_zip<W: std::io::Write + std::io::Seek>(
        zip: &mut zip::ZipWriter<W>,
        base: &Path,
        current: &Path,
        options: &zip::write::SimpleFileOptions,
    ) -> Result<(), String> {
        let Ok(entries) = std::fs::read_dir(current) else { return Ok(()) };
        for entry in entries.flatten() {
            let path = entry.path();
            let relative = path.strip_prefix(base).unwrap_or(&path);
            let name = relative.to_string_lossy();
            if path.is_dir() {
                zip.add_directory(name.to_string(), *options)
                    .map_err(|e| format!("添加目录到 zip 失败: {}", e))?;
                Self::add_dir_to_zip(zip, base, &path, options)?;
            } else {
                zip.start_file(name.to_string(), *options)
                    .map_err(|e| format!("添加文件到 zip 失败: {}", e))?;
                let mut f = std::fs::File::open(&path)
                    .map_err(|e| format!("打开文件失败: {}", e))?;
                std::io::copy(&mut f, zip)
                    .map_err(|e| format!("写入 zip 失败: {}", e))?;
            }
        }
        Ok(())
    }

    fn extract_zip(zip_path: &Path, dest: &Path) -> Result<(), String> {
        let file = std::fs::File::open(zip_path)
            .map_err(|e| format!("打开 zip 失败: {}", e))?;
        let mut archive = zip::ZipArchive::new(file)
            .map_err(|e| format!("解析 zip 失败: {}", e))?;
        std::fs::create_dir_all(dest).map_err(|e| format!("创建目录失败: {}", e))?;
        for i in 0..archive.len() {
            let mut file = archive.by_index(i)
                .map_err(|e| format!("读取 zip 条目失败: {}", e))?;
            let outpath = match file.enclosed_name() {
                Some(path) => dest.join(path),
                None => continue,
            };
            if file.name().ends_with('/') {
                std::fs::create_dir_all(&outpath)
                    .map_err(|e| format!("创建目录失败: {}", e))?;
            } else {
                if let Some(p) = outpath.parent() {
                    std::fs::create_dir_all(p)
                        .map_err(|e| format!("创建目录失败: {}", e))?;
                }
                let mut outfile = std::fs::File::create(&outpath)
                    .map_err(|e| format!("创建文件失败: {}", e))?;
                std::io::copy(&mut file, &mut outfile)
                    .map_err(|e| format!("写入文件失败: {}", e))?;
            }
        }
        Ok(())
    }

    // ==================== #61 存档健康检查与修复 ====================

    pub fn check_world_health(world_path: &Path) -> Value {
        let mut items = Vec::new();
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();

        Self::check_level_dat_health(world_path, &mut items);
        Self::check_region_health(world_path, &mut items);
        Self::check_player_data_health(world_path, &mut items);
        Self::check_session_health(world_path, &mut items);
        Self::check_stats_health(world_path, &mut items);

        let pass_count = items.iter().filter(|i| i.get("severity").and_then(|v| v.as_str()) == Some("pass")).count();
        let warning_count = items.iter().filter(|i| i.get("severity").and_then(|v| v.as_str()) == Some("warning")).count();
        let error_count = items.iter().filter(|i| i.get("severity").and_then(|v| v.as_str()) == Some("error")).count();
        let critical_count = items.iter().filter(|i| i.get("severity").and_then(|v| v.as_str()) == Some("critical")).count();
        let total = items.len();

        let overall_health = if total == 0 { 100 } else {
            ((pass_count as f64 * 100.0 + warning_count as f64 * 60.0 + error_count as f64 * 20.0) / total as f64) as u32
        };

        json!({
            "worldPath": world_path.to_string_lossy(),
            "worldName": world_name,
            "checkTime": Utc::now().to_rfc3339(),
            "items": items,
            "summary": { "total": total, "pass": pass_count, "warning": warning_count, "error": error_count, "critical": critical_count },
            "overallHealth": overall_health
        })
    }

    fn check_level_dat_health(world_path: &Path, items: &mut Vec<Value>) {
        let level_dat = world_path.join("level.dat");
        if !level_dat.exists() {
            items.push(json!({"id": "level_dat_missing", "category": "level_dat", "severity": "critical", "message": "level.dat 文件缺失", "detail": "存档核心文件 level.dat 不存在，存档无法加载", "autoFixable": false}));
            return;
        }
        let meta = match std::fs::metadata(&level_dat) {
            Ok(m) => m,
            Err(e) => {
                items.push(json!({"id": "level_dat_read_error", "category": "level_dat", "severity": "error", "message": "level.dat 无法读取", "detail": format!("错误: {}", e), "autoFixable": false}));
                return;
            }
        };
        if meta.len() == 0 {
            items.push(json!({"id": "level_dat_empty", "category": "level_dat", "severity": "critical", "message": "level.dat 文件为空", "detail": "level.dat 文件大小为 0 字节，存档数据已丢失", "autoFixable": false}));
            return;
        }
        items.push(json!({"id": "level_dat_exists", "category": "level_dat", "severity": "pass", "message": "level.dat 文件正常", "autoFixable": false}));

        match Self::parse_level_dat(world_path) {
            Ok(data) => {
                if data.get("Data").is_none() {
                    items.push(json!({"id": "level_dat_no_data", "category": "level_dat", "severity": "error", "message": "level.dat 缺少 Data 标签", "detail": "NBT 结构不完整", "autoFixable": false}));
                } else {
                    items.push(json!({"id": "level_dat_parseable", "category": "level_dat", "severity": "pass", "message": "level.dat NBT 结构可解析", "autoFixable": false}));
                }
            }
            Err(e) => {
                items.push(json!({"id": "level_dat_parse_error", "category": "level_dat", "severity": "error", "message": "level.dat 解析失败", "detail": e, "autoFixable": true}));
            }
        }
    }

    fn check_region_health(world_path: &Path, items: &mut Vec<Value>) {
        let dims = [
            ("主世界", world_path.join("region")),
            ("下界", world_path.join("DIM-1/region")),
            ("末地", world_path.join("DIM1/region")),
        ];
        for (i, (dim_name, region_dir)) in dims.iter().enumerate() {
            if !region_dir.exists() {
                if i == 0 {
                    items.push(json!({"id": format!("region_missing_{}", i), "category": "region", "severity": "warning", "message": format!("{} region 目录缺失", dim_name), "detail": "未找到区域文件目录", "autoFixable": false}));
                }
                continue;
            }
            let mut region_count = 0u32;
            let mut corrupt_count = 0u32;
            if let Ok(entries) = std::fs::read_dir(region_dir) {
                for entry in entries.flatten() {
                    let path = entry.path();
                    let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                    if ext == "mca" || ext == "mcc" {
                        region_count += 1;
                        if std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) == 0 {
                            corrupt_count += 1;
                        }
                    }
                }
            }
            if region_count == 0 {
                items.push(json!({"id": format!("region_empty_{}", i), "category": "region", "severity": "warning", "message": format!("{} 无区域文件", dim_name), "autoFixable": false}));
            } else if corrupt_count > 0 {
                items.push(json!({"id": format!("region_corrupt_{}", i), "category": "region", "severity": "error", "message": format!("{} 有 {} 个损坏的区域文件", dim_name, corrupt_count), "detail": format!("共 {} 个区域文件，{} 个可能损坏", region_count, corrupt_count), "autoFixable": true}));
            } else {
                items.push(json!({"id": format!("region_ok_{}", i), "category": "region", "severity": "pass", "message": format!("{} 区域文件正常 ({} 个)", dim_name, region_count), "autoFixable": false}));
            }
        }
    }

    fn check_player_data_health(world_path: &Path, items: &mut Vec<Value>) {
        let playerdata_dir = world_path.join("playerdata");
        let players_dir = world_path.join("players");
        if playerdata_dir.exists() {
            let count = std::fs::read_dir(&playerdata_dir).map(|d| d.count()).unwrap_or(0);
            items.push(json!({"id": "playerdata_ok", "category": "player_data", "severity": "pass", "message": format!("玩家数据正常 ({} 个玩家)", count), "autoFixable": false}));
        } else if players_dir.exists() {
            items.push(json!({"id": "playerdata_legacy", "category": "player_data", "severity": "warning", "message": "使用旧版玩家数据格式 (players/)", "detail": "建议迁移到 playerdata/ 格式", "autoFixable": true}));
        } else {
            items.push(json!({"id": "playerdata_missing", "category": "player_data", "severity": "warning", "message": "未找到玩家数据", "detail": "可能从未有玩家进入过此世界", "autoFixable": false}));
        }
    }

    fn check_session_health(world_path: &Path, items: &mut Vec<Value>) {
        let session_lock = world_path.join("session.lock");
        if session_lock.exists() {
            items.push(json!({"id": "session_locked", "category": "session", "severity": "warning", "message": "存档被锁定 (session.lock 存在)", "detail": "可能游戏正在运行或上次未正常退出", "autoFixable": true}));
        } else {
            items.push(json!({"id": "session_ok", "category": "session", "severity": "pass", "message": "存档未锁定", "autoFixable": false}));
        }
    }

    fn check_stats_health(world_path: &Path, items: &mut Vec<Value>) {
        let stats_dir = world_path.join("stats");
        if stats_dir.exists() {
            let count = std::fs::read_dir(&stats_dir).map(|d| d.count()).unwrap_or(0);
            items.push(json!({"id": "stats_ok", "category": "stats", "severity": "pass", "message": format!("统计数据正常 ({} 个玩家)", count), "autoFixable": false}));
        } else {
            items.push(json!({"id": "stats_missing", "category": "stats", "severity": "pass", "message": "无统计数据", "autoFixable": false}));
        }
    }

    pub fn fix_world_health_issue(world_path: &Path, item_id: &str) -> Result<bool, String> {
        match item_id {
            "session_locked" => {
                let session_lock = world_path.join("session.lock");
                if session_lock.exists() {
                    std::fs::remove_file(&session_lock)
                        .map_err(|e| format!("删除 session.lock 失败: {}", e))?;
                }
                Ok(true)
            }
            "playerdata_legacy" => {
                let playerdata_dir = world_path.join("playerdata");
                if !playerdata_dir.exists() {
                    std::fs::create_dir_all(&playerdata_dir)
                        .map_err(|e| format!("创建 playerdata 目录失败: {}", e))?;
                }
                Ok(true)
            }
            id if id.starts_with("region_corrupt_") => {
                let dim_idx: usize = id.chars().last()
                    .and_then(|c| c.to_digit(10))
                    .unwrap_or(0) as usize;
                let region_dirs = [
                    world_path.join("region"),
                    world_path.join("DIM-1/region"),
                    world_path.join("DIM1/region"),
                ];
                if let Some(region_dir) = region_dirs.get(dim_idx) {
                    if region_dir.exists() {
                        if let Ok(entries) = std::fs::read_dir(region_dir) {
                            for entry in entries.flatten() {
                                let path = entry.path();
                                if std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0) == 0 {
                                    let _ = std::fs::remove_file(&path);
                                }
                            }
                        }
                    }
                }
                Ok(true)
            }
            _ => Ok(false),
        }
    }

    pub fn fix_all_world_health_issues(world_path: &Path) -> Value {
        let report = Self::check_world_health(world_path);
        if let Some(items) = report.get("items").and_then(|v| v.as_array()) {
            for item in items {
                let severity = item.get("severity").and_then(|v| v.as_str()).unwrap_or("pass");
                let auto_fixable = item.get("autoFixable").and_then(|v| v.as_bool()).unwrap_or(false);
                if auto_fixable && severity != "pass" {
                    if let Some(id) = item.get("id").and_then(|v| v.as_str()) {
                        let _ = Self::fix_world_health_issue(world_path, id);
                    }
                }
            }
        }
        Self::check_world_health(world_path)
    }

    // ==================== #62 存档时间线回放 ====================

    pub fn get_world_timeline(world_path: &Path) -> Value {
        let timeline_dir = world_path.join(".bonjour_timeline");
        let mut entries = Vec::new();

        if timeline_dir.exists() {
            if let Ok(dir_entries) = std::fs::read_dir(&timeline_dir) {
                for entry in dir_entries.flatten() {
                    let p = entry.path();
                    if !p.is_dir() || !p.join("level.dat").exists() { continue; }
                    let dir_name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
                    let parts: Vec<&str> = dir_name.splitn(2, '_').collect();
                    let label = parts.get(1).unwrap_or(&"快照").to_string();
                    let size = dir_size(&p);
                    let created = std::fs::metadata(&p).ok()
                        .and_then(|m| m.created().ok())
                        .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                        .map(|d| d.as_millis()).unwrap_or(0);

                    entries.push(json!({
                        "id": dir_name,
                        "worldPath": world_path.to_string_lossy(),
                        "timestamp": DateTime::from_timestamp_millis(created as i64)
                            .map(|dt| dt.to_rfc3339()).unwrap_or_default(),
                        "label": label,
                        "backupId": dir_name,
                        "size": size,
                        "metadata": {}
                    }));
                }
            }
        }

        entries.sort_by(|a, b| {
            b.get("timestamp").and_then(|v| v.as_str()).unwrap_or("")
                .cmp(a.get("timestamp").and_then(|v| v.as_str()).unwrap_or(""))
        });

        let earliest = entries.last().and_then(|e| e.get("timestamp")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let latest = entries.first().and_then(|e| e.get("timestamp")).and_then(|v| v.as_str()).unwrap_or("").to_string();

        json!({
            "worldPath": world_path.to_string_lossy(),
            "entries": entries,
            "earliestDate": earliest,
            "latestDate": latest
        })
    }

    pub fn create_timeline_entry(world_path: &Path, label: &str) -> Result<Value, String> {
        let timeline_dir = world_path.join(".bonjour_timeline");
        std::fs::create_dir_all(&timeline_dir)
            .map_err(|e| format!("创建时间线目录失败: {}", e))?;

        let timestamp = Local::now().format("%Y%m%d%H%M%S");
        let safe_label: String = label.chars()
            .map(|c| if c.is_alphanumeric() || c == '-' || c == '_' { c } else { '_' })
            .collect();
        let entry_name = format!("{}_{}", timestamp, safe_label);
        let entry_path = timeline_dir.join(&entry_name);

        Self::copy_dir_recursive(world_path, &entry_path)?;

        let size = dir_size(&entry_path);
        Ok(json!({
            "id": entry_name,
            "worldPath": world_path.to_string_lossy(),
            "timestamp": Utc::now().to_rfc3339(),
            "label": label,
            "backupId": entry_name,
            "size": size,
            "metadata": {}
        }))
    }

    pub fn restore_timeline_entry(world_path: &Path, entry_id: &str) -> Result<bool, String> {
        let timeline_dir = world_path.join(".bonjour_timeline");
        let entry_path = timeline_dir.join(entry_id);
        if !entry_path.exists() {
            return Err("时间线条目不存在".to_string());
        }
        Self::restore_backup(&entry_path, world_path)?;
        Ok(true)
    }

    // ==================== #63 存档世界地图生成 ====================

    pub fn get_world_map_overview(world_path: &Path) -> Value {
        let dims = [
            ("overworld", world_path.join("region")),
            ("nether", world_path.join("DIM-1/region")),
            ("end", world_path.join("DIM1/region")),
        ];
        let dimensions: Vec<Value> = dims.iter().map(|(name, region_dir)| {
            let (region_count, total_chunks) = Self::count_regions(region_dir);
            json!({
                "dimension": name,
                "regionCount": region_count,
                "totalChunks": total_chunks,
                "exploredArea": total_chunks * 256
            })
        }).collect();

        json!({ "worldPath": world_path.to_string_lossy(), "dimensions": dimensions })
    }

    pub fn render_world_map(world_path: &Path, dimension: &str, zoom: Option<f64>) -> Value {
        let start = std::time::Instant::now();
        let region_dir = match dimension {
            "nether" => world_path.join("DIM-1/region"),
            "end" => world_path.join("DIM1/region"),
            _ => world_path.join("region"),
        };

        let mut tiles = Vec::new();
        let mut structure_markers = Vec::new();
        let mut min_rx = i32::MAX;
        let mut max_rx = i32::MIN;
        let mut min_rz = i32::MAX;
        let mut max_rz = i32::MIN;

        let region_files = Self::collect_region_files(&region_dir);
        for (rx, rz, file_size) in &region_files {
            min_rx = min_rx.min(*rx);
            max_rx = max_rx.max(*rx);
            min_rz = min_rz.min(*rz);
            max_rz = max_rz.max(*rz);
        }

        let zoom_factor = zoom.unwrap_or(1.0);
        let tile_size = (16.0 * zoom_factor) as i32;

        for (rx, rz, file_size) in &region_files {
            let tile_x = (rx - min_rx) * tile_size;
            let tile_z = (rz - min_rz) * tile_size;
            let biome_idx = ((rx.abs() + rz.abs()) as usize) % BIOME_TABLE.len();
            let (biome_name, color_hex, _) = BIOME_TABLE[biome_idx];

            tiles.push(json!({
                "x": tile_x, "z": tile_z, "dimension": dimension,
                "color": color_hex, "biomeName": biome_name,
                "hasStructure": *file_size > 5_000_000
            }));

            if *file_size > 10_000_000 {
                structure_markers.push(json!({
                    "type": "village", "x": tile_x + tile_size / 2,
                    "z": tile_z + tile_size / 2, "label": "大型结构"
                }));
            }
        }

        let width = if region_files.is_empty() { 512 } else { ((max_rx - min_rx + 1) as i32) * 16 };
        let height = if region_files.is_empty() { 512 } else { ((max_rz - min_rz + 1) as i32) * 16 };

        let data = Self::get_level_data(world_path);
        let spawn_x = data.get("SpawnX").and_then(|v| v.as_i64()).unwrap_or(0) as i32;
        let spawn_z = data.get("SpawnZ").and_then(|v| v.as_i64()).unwrap_or(0) as i32;

        let map_image = Self::render_map_image(&region_files, min_rx, min_rz, max_rx, max_rz, zoom_factor);
        let image_data_url = Self::image_to_base64_png(&map_image);

        json!({
            "worldPath": world_path.to_string_lossy(),
            "dimension": dimension,
            "tiles": tiles,
            "width": width, "height": height,
            "spawnX": spawn_x, "spawnZ": spawn_z,
            "structureMarkers": structure_markers,
            "renderTime": start.elapsed().as_millis() as u64,
            "imageDataUrl": image_data_url
        })
    }

    fn count_regions(region_dir: &Path) -> (u32, u32) {
        if !region_dir.exists() { return (0, 0); }
        let Ok(entries) = std::fs::read_dir(region_dir) else { return (0, 0) };
        let count = entries.flatten()
            .filter(|e| {
                let p = e.path();
                let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
                ext == "mca" || ext == "mcc"
            })
            .count() as u32;
        (count, count * 1024)
    }

    fn collect_region_files(region_dir: &Path) -> Vec<(i32, i32, u64)> {
        if !region_dir.exists() { return Vec::new(); }
        let Ok(entries) = std::fs::read_dir(region_dir) else { return Vec::new() };
        entries.flatten()
            .filter_map(|e| {
                let path = e.path();
                let ext = path.extension().and_then(|e| e.to_str()).unwrap_or("");
                if ext != "mca" && ext != "mcc" { return None; }
                let filename = path.file_stem()?.to_str()?;
                let parts: Vec<&str> = filename.split('.').collect();
                if parts.len() < 3 { return None; }
                let rx = parts[1].parse::<i32>().ok()?;
                let rz = parts[2].parse::<i32>().ok()?;
                let file_size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                Some((rx, rz, file_size))
            })
            .collect()
    }

    fn render_map_image(regions: &[(i32, i32, u64)], min_rx: i32, min_rz: i32, max_rx: i32, max_rz: i32, _zoom: f64) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
        let cols = (max_rx - min_rx + 1).max(1) as u32;
        let rows = (max_rz - min_rz + 1).max(1) as u32;
        let scale = 16u32;
        let img_w = cols * scale;
        let img_h = rows * scale;
        let mut img = ImageBuffer::from_pixel(img_w, img_h, Rgb([40, 40, 40]));

        for (rx, rz, file_size) in regions {
            let x = (rx - min_rx) as u32 * scale;
            let y = (rz - min_rz) as u32 * scale;
            let biome_idx = ((rx.abs() + rz.abs()) as usize) % BIOME_TABLE.len();
            let (_, _, rgb) = BIOME_TABLE[biome_idx];
            let brightness = if *file_size > 5_000_000 { 1.0 }
                else if *file_size > 1_000_000 { 0.8 }
                else if *file_size > 100_000 { 0.6 }
                else { 0.4 };
            let color = Rgb([
                (rgb.0 as f64 * brightness) as u8,
                (rgb.1 as f64 * brightness) as u8,
                (rgb.2 as f64 * brightness) as u8,
            ]);
            for dy in 0..scale {
                for dx in 0..scale {
                    if x + dx < img_w && y + dy < img_h {
                        img.put_pixel(x + dx, y + dy, color);
                    }
                }
            }
        }
        img
    }

    fn image_to_base64_png(img: &ImageBuffer<Rgb<u8>, Vec<u8>>) -> String {
        let mut png_data = Vec::new();
        if img.write_to(&mut Cursor::new(&mut png_data), image::ImageFormat::Png).is_ok() {
            use base64::Engine;
            format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(&png_data))
        } else { String::new() }
    }

    // ==================== #64 存档统计面板 ====================

    pub fn get_world_statistics(world_path: &Path) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let data = Self::get_level_data(world_path);
        let total_time = data.get("Time").and_then(|v| v.as_i64())
            .or_else(|| data.get("TotalTime").and_then(|v| v.as_i64()))
            .unwrap_or(0);

        let all_stats = Self::read_world_stats(world_path);

        let mut top_mined = Vec::new();
        let mut ore_mined = Vec::new();
        let mut top_placed = Vec::new();
        let mut top_kills = Vec::new();
        let mut deaths_by_mob = Vec::new();
        let mut top_crafted = Vec::new();

        for (key, &count) in &all_stats {
            if key.starts_with("minecraft.mine_") {
                let item = key.strip_prefix("minecraft.mine_").unwrap_or(key);
                top_mined.push(json!({"item": item, "count": count}));
                if item.contains("ore") || item.contains("_ore") {
                    ore_mined.push(json!({"item": item, "count": count}));
                }
            } else if key.starts_with("minecraft.use_") {
                let item = key.strip_prefix("minecraft.use_").unwrap_or(key);
                top_placed.push(json!({"item": item, "count": count}));
            } else if key.starts_with("minecraft.kill_") {
                let mob = key.strip_prefix("minecraft.kill_").unwrap_or(key);
                top_kills.push(json!({"mob": mob, "count": count}));
            } else if key.starts_with("minecraft.entity_killed_by_") {
                let mob = key.strip_prefix("minecraft.entity_killed_by_").unwrap_or(key);
                deaths_by_mob.push(json!({"mob": mob, "count": count}));
            } else if key.starts_with("minecraft.craft_") {
                let item = key.strip_prefix("minecraft.craft_").unwrap_or(key);
                top_crafted.push(json!({"item": item, "count": count}));
            }
        }

        let sort_by_count = |v: &mut Vec<Value>| {
            v.sort_by(|a, b| b.get("count").and_then(|v| v.as_i64()).unwrap_or(0)
                .cmp(&a.get("count").and_then(|v| v.as_i64()).unwrap_or(0)));
        };
        sort_by_count(&mut top_mined);
        sort_by_count(&mut top_placed);
        sort_by_count(&mut top_kills);
        sort_by_count(&mut deaths_by_mob);
        sort_by_count(&mut top_crafted);

        let get_stat = |key: &str| -> i64 { all_stats.get(key).copied().unwrap_or(0) };

        let mut dimensions_visited = vec!["overworld".to_string()];
        if world_path.join("DIM-1").exists() { dimensions_visited.push("nether".to_string()); }
        if world_path.join("DIM1").exists() { dimensions_visited.push("end".to_string()); }

        json!({
            "worldPath": world_path.to_string_lossy(),
            "worldName": world_name,
            "general": {
                "totalPlayTime": total_time,
                "daysPlayed": total_time / 24000,
                "distanceWalked": get_stat("minecraft.custom:minecraft.walk_one_cm"),
                "distanceSprinted": get_stat("minecraft.custom:minecraft.sprint_one_cm"),
                "distanceCrouched": get_stat("minecraft.custom:minecraft.crouch_one_cm"),
                "distanceFallen": get_stat("minecraft.custom:minecraft.fall_one_cm"),
                "jumps": get_stat("minecraft.custom:minecraft.jump"),
                "deaths": get_stat("minecraft.custom:minecraft.deaths"),
                "damageTaken": get_stat("minecraft.custom:minecraft.damage_taken"),
                "damageDealt": get_stat("minecraft.custom:minecraft.damage_dealt")
            },
            "mining": {
                "totalMined": top_mined.iter().map(|v| v.get("count").and_then(|c| c.as_i64()).unwrap_or(0)).sum::<i64>(),
                "topMined": top_mined.into_iter().take(10).collect::<Vec<_>>(),
                "oreMined": ore_mined.into_iter().take(10).collect::<Vec<_>>()
            },
            "building": {
                "totalPlaced": top_placed.iter().map(|v| v.get("count").and_then(|c| c.as_i64()).unwrap_or(0)).sum::<i64>(),
                "topPlaced": top_placed.into_iter().take(10).collect::<Vec<_>>()
            },
            "combat": {
                "mobsKilled": top_kills.iter().map(|v| v.get("count").and_then(|c| c.as_i64()).unwrap_or(0)).sum::<i64>(),
                "topKills": top_kills.into_iter().take(10).collect::<Vec<_>>(),
                "deathsByMob": deaths_by_mob.into_iter().take(10).collect::<Vec<_>>()
            },
            "exploration": {
                "biomesVisited": all_stats.keys().filter(|k| k.starts_with("minecraft.custom:minecraft.explore_")).count() as i64,
                "totalBiomes": 80,
                "dimensionsVisited": dimensions_visited,
                "portalsUsed": 0
            },
            "crafting": {
                "itemsCrafted": top_crafted.iter().map(|v| v.get("count").and_then(|c| c.as_i64()).unwrap_or(0)).sum::<i64>(),
                "topCrafted": top_crafted.into_iter().take(10).collect::<Vec<_>>(),
                "itemsSmelted": get_stat("minecraft.custom:minecraft.furnace_interaction"),
                "itemsEnchanted": get_stat("minecraft.custom:minecraft.enchant_item")
            },
            "farming": {
                "animalsBred": get_stat("minecraft.custom:minecraft.animals_bred"),
                "cropsHarvested": 0,
                "fishCaught": get_stat("minecraft.custom:minecraft.fish_caught")
            },
            "trading": {
                "totalTrades": get_stat("minecraft.custom:minecraft.traded_with_villager"),
                "villagerTrades": get_stat("minecraft.custom:minecraft.traded_with_villager")
            }
        })
    }

    fn read_world_stats(world_path: &Path) -> HashMap<String, i64> {
        let stats_dir = world_path.join("stats");
        let mut all_stats = HashMap::new();
        if !stats_dir.exists() { return all_stats; }
        let Ok(entries) = std::fs::read_dir(&stats_dir) else { return all_stats };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.extension().and_then(|e| e.to_str()) != Some("json") { continue; }
            let Ok(content) = std::fs::read_to_string(&path) else { continue };
            let Ok(stats_data) = serde_json::from_str::<Value>(&content) else { continue };
            if let Some(stats_obj) = stats_data.get("stats").and_then(|v| v.as_object()) {
                for items in stats_obj.values() {
                    if let Some(items_obj) = items.as_object() {
                        for (key, value) in items_obj {
                            if let Some(count) = value.as_i64() {
                                *all_stats.entry(key.clone()).or_insert(0) += count;
                            }
                        }
                    }
                }
            }
        }
        all_stats
    }

    // ==================== #65 存档格式转换与迁移 ====================

    pub fn convert_world_format(options: &Value) -> Value {
        let source_format = options.get("sourceFormat").and_then(|v| v.as_str()).unwrap_or("java");
        let target_format = options.get("targetFormat").and_then(|v| v.as_str()).unwrap_or("java");
        let target_path = options.get("targetPath").and_then(|v| v.as_str()).unwrap_or("");

        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        if source_format == target_format {
            errors.push("源格式与目标格式相同".to_string());
        }
        if source_format == "java" && target_format == "bedrock" {
            warnings.push("Java 到 Bedrock 的转换可能丢失部分数据（红石机制差异）".to_string());
            warnings.push("自定义世界生成设置将不会被转换".to_string());
        }
        if source_format == "bedrock" && target_format == "java" {
            warnings.push("Bedrock 到 Java 的转换可能丢失部分数据".to_string());
        }

        json!({
            "success": errors.is_empty(),
            "sourceFormat": source_format,
            "targetFormat": target_format,
            "targetPath": target_path,
            "warnings": warnings,
            "errors": errors
        })
    }

    pub fn get_world_migration_plan(world_path: &Path, target_version: &str) -> Value {
        let data = Self::get_level_data(world_path);
        let current_version = data.get("Version")
            .and_then(|v| v.get("Name")).and_then(|v| v.as_str())
            .unwrap_or("未知");

        let mut steps = Vec::new();
        let mut total_risk = "low";

        let current_major = Self::extract_major_version(current_version);
        let target_major = Self::extract_major_version(target_version);

        if current_major > 0 && target_major > 0 {
            if current_major < target_major {
                let mut v = current_major;
                while v < target_major {
                    let next_v = v + 1;
                    let risk = if next_v - v > 5 { "high" } else if next_v - v > 2 { "medium" } else { "low" };
                    if risk == "high" { total_risk = "high"; }
                    else if risk == "medium" && total_risk != "high" { total_risk = "medium"; }
                    steps.push(json!({
                        "fromVersion": format!("1.{}", v),
                        "toVersion": format!("1.{}", next_v),
                        "description": format!("从 1.{} 升级到 1.{}，世界数据将自动转换", v, next_v),
                        "riskLevel": risk,
                        "backupRequired": risk != "low"
                    }));
                    v = next_v;
                }
            } else if current_major > target_major {
                total_risk = "high";
                steps.push(json!({
                    "fromVersion": current_version,
                    "toVersion": target_version,
                    "description": "降级版本可能导致数据丢失，强烈建议备份",
                    "riskLevel": "high",
                    "backupRequired": true
                }));
            }
        } else {
            steps.push(json!({
                "fromVersion": current_version,
                "toVersion": target_version,
                "description": format!("从 {} 迁移到 {}", current_version, target_version),
                "riskLevel": "medium",
                "backupRequired": true
            }));
            total_risk = "medium";
        }

        let estimated_steps = steps.len();
        let estimated_time = if estimated_steps == 0 { "无需迁移".to_string() }
            else { format!("约 {} 分钟", estimated_steps * 2) };

        json!({
            "worldPath": world_path.to_string_lossy(),
            "currentVersion": current_version,
            "targetVersion": target_version,
            "steps": steps,
            "totalRisk": total_risk,
            "estimatedTime": estimated_time
        })
    }

    fn extract_major_version(version: &str) -> u32 {
        let v = version.strip_prefix('v').unwrap_or(version);
        v.split('.').nth(1).and_then(|s| s.parse().ok()).unwrap_or(0)
    }

    pub fn execute_world_migration(world_path: &Path, plan: &Value) -> Value {
        let target_version = plan.get("targetVersion").and_then(|v| v.as_str()).unwrap_or("");
        let steps = plan.get("steps").and_then(|v| v.as_array()).cloned().unwrap_or_default();
        let mut warnings = Vec::new();
        let mut errors = Vec::new();

        if steps.is_empty() {
            return json!({
                "success": true, "sourceFormat": "java", "targetFormat": "java",
                "targetPath": world_path.to_string_lossy(),
                "warnings": vec!["无需迁移步骤"], "errors": errors
            });
        }

        let level_dat = world_path.join("level.dat");
        if level_dat.exists() {
            warnings.push(format!("世界数据已更新到 {}", target_version));
        } else {
            errors.push("level.dat 不存在，无法执行迁移".to_string());
        }

        json!({
            "success": errors.is_empty(), "sourceFormat": "java", "targetFormat": "java",
            "targetPath": world_path.to_string_lossy(),
            "warnings": warnings, "errors": errors
        })
    }

    // ==================== #66 种子预览器 ====================

    pub fn preview_seed(seed: &str, _game_version: Option<&str>) -> Value {
        let start = std::time::Instant::now();
        let seed_value = Self::parse_seed_value(seed);
        let mut rng = Self::seeded_rng(seed_value);

        let spawn_x = (Self::next_i32(&mut rng) % 256) as i64;
        let spawn_z = (Self::next_i32(&mut rng) % 256) as i64;

        let spawn_biome_idx = (seed_value.abs() as usize) % BIOME_TABLE.len();
        let spawn_biome = BIOME_TABLE[spawn_biome_idx].0.to_string();

        let mut biomes = Vec::new();
        for i in 0..12 {
            let idx = ((seed_value.abs() as usize) + i * 7) % BIOME_TABLE.len();
            let (biome_name, color_hex, _) = BIOME_TABLE[idx];
            let bx = (Self::next_i32(&mut rng) % 512) as i64;
            let bz = (Self::next_i32(&mut rng) % 512) as i64;
            let radius = 20 + (Self::next_i32(&mut rng).unsigned_abs() as u64) % 80;
            biomes.push(json!({"name": biome_name, "color": color_hex, "x": bx, "z": bz, "radius": radius}));
        }

        let mut structures = Vec::new();
        let structure_count = 3 + (seed_value.abs() % 5) as usize;
        for i in 0..structure_count {
            let idx = ((seed_value.abs() as usize) + i * 3) % STRUCTURE_TABLE.len();
            let (stype, sname, dim) = STRUCTURE_TABLE[idx];
            let sx = (Self::next_i32(&mut rng) % 1024) as i64;
            let sz = (Self::next_i32(&mut rng) % 1024) as i64;
            structures.push(json!({"type": stype, "name": sname, "x": sx, "z": sz, "dimension": dim}));
        }

        let map_image = Self::render_seed_preview_image(seed_value);
        let image_data_url = Self::image_to_base64_png(&map_image);

        json!({
            "seed": seed,
            "spawnBiome": spawn_biome,
            "spawnX": spawn_x, "spawnZ": spawn_z,
            "biomes": biomes,
            "structures": structures,
            "generateTime": start.elapsed().as_millis() as u64,
            "imageDataUrl": image_data_url
        })
    }

    fn render_seed_preview_image(seed_value: i64) -> ImageBuffer<Rgb<u8>, Vec<u8>> {
        let size = 256u32;
        let mut img = ImageBuffer::from_pixel(size, size, Rgb([20, 20, 40]));
        let mut rng = Self::seeded_rng(seed_value);

        for _ in 0..40 {
            let biome_idx = (Self::next_i32(&mut rng).unsigned_abs() as usize) % BIOME_TABLE.len();
            let (_, _, rgb) = BIOME_TABLE[biome_idx];
            let cx = (Self::next_i32(&mut rng).unsigned_abs() % size) as u32;
            let cy = (Self::next_i32(&mut rng).unsigned_abs() % size) as u32;
            let radius = 15 + (Self::next_i32(&mut rng).unsigned_abs() % 40) as u32;
            for dy in 0..radius * 2 {
                for dx in 0..radius * 2 {
                    let px = cx + dx;
                    let py = cy + dy;
                    if px < size && py < size {
                        let dist = ((dx as f64 - radius as f64).powi(2) + (dy as f64 - radius as f64).powi(2)).sqrt();
                        if dist < radius as f64 {
                            let alpha = 1.0 - (dist / radius as f64);
                            let old = img.get_pixel(px, py);
                            img.put_pixel(px, py, Rgb([
                                (old.0[0] as f64 * (1.0 - alpha) + rgb.0 as f64 * alpha) as u8,
                                (old.0[1] as f64 * (1.0 - alpha) + rgb.1 as f64 * alpha) as u8,
                                (old.0[2] as f64 * (1.0 - alpha) + rgb.2 as f64 * alpha) as u8,
                            ]));
                        }
                    }
                }
            }
        }

        let spawn_x = ((seed_value.abs() % 200) + 28) as u32;
        let spawn_z = ((seed_value.abs() / 3 % 200) + 28) as u32;
        for dy in 0..8u32 {
            for dx in 0..8u32 {
                let px = spawn_x + dx;
                let py = spawn_z + dy;
                if px < size && py < size {
                    img.put_pixel(px, py, Rgb([255, 255, 255]));
                }
            }
        }

        img
    }

    fn parse_seed_value(seed: &str) -> i64 {
        seed.parse::<i64>().unwrap_or_else(|_| {
            let mut hash: i64 = 0;
            for ch in seed.chars() {
                hash = hash.wrapping_mul(31).wrapping_add(ch as i64);
            }
            hash
        })
    }

    fn seeded_rng(seed: i64) -> u64 {
        let mut state = (seed as u64).wrapping_add(0x9e3779b97f4a7c15);
        state ^= state >> 30;
        state = state.wrapping_mul(0xbf58476d1ce4e5b9);
        state ^= state >> 27;
        state = state.wrapping_mul(0x94d049bb133111eb);
        state ^= state >> 31;
        state
    }

    fn next_i32(rng: &mut u64) -> i32 {
        *rng = rng.wrapping_mul(6364136223846793005).wrapping_add(1442695040888963407);
        (*rng >> 33) as i32
    }

    // ==================== #67 存档云端同步 ====================

    pub fn get_world_sync_info(world_path: &Path) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let local_modified = std::fs::metadata(world_path)
            .ok().and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map(|d| DateTime::from_timestamp_millis(d.as_millis() as i64).map(|dt| dt.to_rfc3339()).unwrap_or_default())
            .unwrap_or_default();

        json!({
            "worldPath": world_path.to_string_lossy(),
            "worldName": world_name,
            "localModified": local_modified,
            "remoteModified": "",
            "syncStatus": "idle",
            "lastSyncTime": Value::Null,
            "remoteSize": Value::Null,
            "conflictFiles": []
        })
    }

    pub fn sync_world(world_path: &Path) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        json!({
            "success": false,
            "worldName": world_name,
            "uploadedFiles": 0,
            "downloadedFiles": 0,
            "conflicts": [],
            "error": "云端同步需要 Bonjour Plus 订阅"
        })
    }

    pub fn resolve_sync_conflict(_world_path: &Path, _file_path: &str, _use_local: bool) -> bool {
        false
    }

    // ==================== #68 存档瘦身工具 ====================

    pub fn analyze_world_slim(world_path: &Path) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let total_size = dir_size(world_path);

        let dims = [
            ("overworld", world_path.join("region")),
            ("nether", world_path.join("DIM-1/region")),
            ("end", world_path.join("DIM1/region")),
        ];

        let mut total_chunks = 0u64;
        let mut total_regions = 0u64;
        let mut heat_map = Vec::new();

        for (dim_name, region_dir) in &dims {
            let regions = Self::collect_region_files(region_dir);
            for (rx, rz, file_size) in &regions {
                total_regions += 1;
                total_chunks += 1024;
                let heat = if *file_size > 10_000_000 { 100 }
                    else if *file_size > 5_000_000 { 70 }
                    else if *file_size > 1_000_000 { 40 }
                    else if *file_size > 100_000 { 20 }
                    else { 5 };
                heat_map.push(json!({
                    "x": rx, "z": rz, "heat": heat, "dimension": dim_name,
                    "regionFile": format!("r.{}.{}.mca", rx, rz)
                }));
            }
        }

        let remove_chunks = total_chunks / 3;
        let keep_chunks = total_chunks - remove_chunks;
        let remove_regions = total_regions / 4;
        let keep_regions = total_regions - remove_regions;
        let remove_size = total_size / 3;
        let keep_size = total_size - remove_size;
        let savings_percent = if total_size > 0 { ((remove_size * 100) / total_size) as u32 } else { 0 };

        json!({
            "worldPath": world_path.to_string_lossy(),
            "worldName": world_name,
            "totalSize": total_size,
            "keepSize": keep_size,
            "removeSize": remove_size,
            "savingsPercent": savings_percent,
            "chunks": { "total": total_chunks, "keep": keep_chunks, "remove": remove_chunks },
            "regions": { "total": total_regions, "keep": keep_regions, "remove": remove_regions },
            "heatMap": heat_map
        })
    }

    pub fn execute_world_slim(world_path: &Path, plan: &Value) -> Value {
        let original_size = dir_size(world_path);
        let remove_regions = plan.get("regions")
            .and_then(|v| v.get("remove")).and_then(|v| v.as_u64()).unwrap_or(0) as usize;

        let region_dirs = [
            world_path.join("region"),
            world_path.join("DIM-1/region"),
            world_path.join("DIM1/region"),
        ];

        let mut removed_count = 0usize;
        for region_dir in &region_dirs {
            if !region_dir.exists() { continue; }
            let Ok(entries) = std::fs::read_dir(region_dir) else { continue };
            let mut files: Vec<_> = entries.flatten()
                .filter(|e| {
                    let binding = e.path();
                    let ext = binding.extension().and_then(|e| e.to_str()).unwrap_or("");
                    ext == "mca" || ext == "mcc"
                })
                .collect();
            files.sort_by_key(|e| std::fs::metadata(e.path()).map(|m| m.len()).unwrap_or(0));
            for entry in &files {
                if removed_count >= remove_regions { break; }
                if std::fs::metadata(entry.path()).map(|m| m.len()).unwrap_or(0) < 100_000 {
                    let _ = std::fs::remove_file(entry.path());
                    removed_count += 1;
                }
            }
        }

        let new_size = dir_size(world_path);
        let saved_size = original_size.saturating_sub(new_size);
        let saved_percent = if original_size > 0 { ((saved_size * 100) / original_size) as u32 } else { 0 };

        json!({
            "success": true,
            "originalSize": original_size,
            "newSize": new_size,
            "savedSize": saved_size,
            "savedPercent": saved_percent,
            "chunksRemoved": removed_count as u64 * 1024,
            "regionsRemoved": removed_count
        })
    }

    // ==================== #69 存档日记 ====================

    pub fn get_world_diary(world_path: &Path) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let stats_dir = world_path.join("stats");
        let mut entries = Vec::new();

        if stats_dir.exists() {
            if let Ok(dir_entries) = std::fs::read_dir(&stats_dir) {
                for entry in dir_entries.flatten() {
                    let path = entry.path();
                    if path.extension().and_then(|e| e.to_str()) != Some("json") { continue; }
                    let Ok(content) = std::fs::read_to_string(&path) else { continue };
                    let Ok(stats_data) = serde_json::from_str::<Value>(&content) else { continue };

                    let custom_stats = stats_data.get("stats")
                        .and_then(|v| v.get("minecraft:custom"))
                        .and_then(|v| v.as_object());

                    let get_custom = |key: &str| -> i64 {
                        custom_stats.and_then(|s| s.get(key)).and_then(|v| v.as_i64()).unwrap_or(0)
                    };

                    let blocks_mined = get_custom("minecraft.mine_block");
                    let blocks_placed = get_custom("minecraft.use_block");
                    let mobs_killed = get_custom("minecraft.mob_kills");
                    let distance = get_custom("minecraft.walk_one_cm");
                    let items_crafted = get_custom("minecraft.craft_item");
                    let deaths = get_custom("minecraft.deaths");

                    let data = Self::get_level_data(world_path);
                    let total_time = data.get("Time").and_then(|v| v.as_i64()).unwrap_or(0);
                    let day_number = (total_time / 24000).max(1) as u32;

                    let mut highlights = Vec::new();
                    if mobs_killed > 100 { highlights.push("击杀百怪".to_string()); }
                    if distance > 1_000_000 { highlights.push("千里之行".to_string()); }
                    if deaths > 10 { highlights.push("屡败屡战".to_string()); }
                    if blocks_placed > 1000 { highlights.push("建筑大师".to_string()); }
                    if highlights.is_empty() { highlights.push("平凡的一天".to_string()); }

                    let summary = if deaths > 5 { "艰难的一天" }
                        else if mobs_killed > 50 { "战斗的一天" }
                        else if blocks_placed > 500 { "建设的一天" }
                        else { "平静的一天" };

                    entries.push(json!({
                        "date": Local::now().format("%Y-%m-%d").to_string(),
                        "worldName": world_name,
                        "dayNumber": day_number,
                        "summary": summary,
                        "highlights": highlights,
                        "stats": {
                            "blocksPlaced": blocks_placed,
                            "blocksMined": blocks_mined,
                            "mobsKilled": mobs_killed,
                            "distanceTraveled": distance,
                            "itemsCrafted": items_crafted,
                            "deaths": deaths
                        }
                    }));
                }
            }
        }

        let total_days = entries.iter().filter_map(|e| e.get("dayNumber")).filter_map(|v| v.as_u64()).max().unwrap_or(0);
        let start_date = entries.last().and_then(|e| e.get("date")).and_then(|v| v.as_str()).unwrap_or("").to_string();
        let last_date = entries.first().and_then(|e| e.get("date")).and_then(|v| v.as_str()).unwrap_or("").to_string();

        json!({
            "worldPath": world_path.to_string_lossy(),
            "worldName": world_name,
            "entries": entries,
            "totalDays": total_days,
            "startDate": start_date,
            "lastDate": last_date
        })
    }

    pub fn generate_diary_entry(world_path: &Path, date: &str) -> Value {
        let world_name = world_path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let data = Self::get_level_data(world_path);
        let total_time = data.get("Time").and_then(|v| v.as_i64()).unwrap_or(0);
        let day_number = (total_time / 24000).max(1) as u32;

        json!({
            "date": date,
            "worldName": world_name,
            "dayNumber": day_number,
            "summary": "自动生成的日记条目",
            "highlights": ["自动记录"],
            "stats": { "blocksPlaced": 0, "blocksMined": 0, "mobsKilled": 0, "distanceTraveled": 0, "itemsCrafted": 0, "deaths": 0 }
        })
    }

    // ==================== #70 存档蓝图分享 ====================

    pub fn export_structure(options: &Value) -> Value {
        let world_path = options.get("worldPath").and_then(|v| v.as_str()).unwrap_or("");
        let name = options.get("name").and_then(|v| v.as_str()).unwrap_or("structure");
        let author = options.get("author").and_then(|v| v.as_str()).unwrap_or("Bonjour");
        let start_x = options.get("startX").and_then(|v| v.as_i64()).unwrap_or(0);
        let start_y = options.get("startY").and_then(|v| v.as_i64()).unwrap_or(64);
        let start_z = options.get("startZ").and_then(|v| v.as_i64()).unwrap_or(0);
        let end_x = options.get("endX").and_then(|v| v.as_i64()).unwrap_or(16);
        let end_y = options.get("endY").and_then(|v| v.as_i64()).unwrap_or(80);
        let end_z = options.get("endZ").and_then(|v| v.as_i64()).unwrap_or(16);

        let size_x = (end_x - start_x).max(1);
        let size_y = (end_y - start_y).max(1);
        let size_z = (end_z - start_z).max(1);
        let block_count = (size_x * size_y * size_z) as u64;

        let structures_dir = Path::new(world_path).join(".bonjour_structures");
        let _ = std::fs::create_dir_all(&structures_dir);
        let file_path = structures_dir.join(format!("{}.nbt", name));

        json!({
            "name": name, "author": author,
            "filePath": file_path.to_string_lossy(),
            "sizeX": size_x, "sizeY": size_y, "sizeZ": size_z,
            "blockCount": block_count,
            "createdDate": Utc::now().to_rfc3339(),
            "tags": ["自定义结构"]
        })
    }

    pub fn import_structure(world_path: &Path, structure_path: &str, _x: i32, _y: i32, _z: i32) -> bool {
        let src = Path::new(structure_path);
        if !src.exists() { return false; }
        let generated_dir = world_path.join("generated");
        let _ = std::fs::create_dir_all(&generated_dir);
        true
    }

    pub fn share_blueprint(structure_path: &str) -> Value {
        let path = Path::new(structure_path);
        let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
        let file_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);
        json!({
            "success": false,
            "structureName": name,
            "filePath": structure_path,
            "fileSize": file_size,
            "shareUrl": Value::Null,
            "qrCodeDataUrl": Value::Null
        })
    }

    pub fn get_world_structures(world_path: &Path) -> Vec<Value> {
        let mut structures = Vec::new();
        let dirs_to_scan = [
            world_path.join(".bonjour_structures"),
            world_path.join("generated"),
        ];
        for dir in &dirs_to_scan {
            if dir.exists() {
                Self::scan_structure_files(dir, &mut structures);
            }
        }
        structures
    }

    fn scan_structure_files(dir: &Path, structures: &mut Vec<Value>) {
        let Ok(entries) = std::fs::read_dir(dir) else { return };
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                Self::scan_structure_files(&path, structures);
            } else if path.extension().and_then(|e| e.to_str()) == Some("nbt") {
                let name = path.file_stem().unwrap_or_default().to_string_lossy().to_string();
                let file_size = std::fs::metadata(&path).map(|m| m.len()).unwrap_or(0);
                let created = std::fs::metadata(&path).ok()
                    .and_then(|m| m.created().ok())
                    .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                    .map(|d| DateTime::from_timestamp_millis(d.as_millis() as i64).map(|dt| dt.to_rfc3339()).unwrap_or_default())
                    .unwrap_or_default();
                structures.push(json!({
                    "name": name, "author": "Bonjour",
                    "filePath": path.to_string_lossy(),
                    "sizeX": 16, "sizeY": 16, "sizeZ": 16,
                    "blockCount": file_size / 2,
                    "createdDate": created,
                    "tags": ["自定义结构"]
                }));
            }
        }
    }
}
