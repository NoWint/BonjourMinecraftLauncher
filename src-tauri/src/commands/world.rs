use crate::errors::{self, AppError};
use crate::services::world::WorldService;

fn wrap<T>(res: Result<T, String>) -> Result<T, AppError> {
    res.map_err(|e| errors::world_error("world", e))
}

#[tauri::command]
pub async fn get_worlds(saves_dir: String) -> Result<Vec<serde_json::Value>, AppError> {
    let dir = saves_dir.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        WorldService::scan_worlds(std::path::Path::new(&dir))
    }).await.map_err(|e| errors::internal(e.to_string()))?;
    Ok(result)
}

#[tauri::command]
pub async fn get_world_info(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let path = std::path::Path::new(&wp);
        if !path.exists() {
            return Err(errors::world_error(&wp, "存档路径不存在"));
        }
        Ok(WorldService::get_world_info(path))
    }).await.map_err(|e| errors::internal(e.to_string()))?
}

#[tauri::command]
pub async fn backup_world(world_path: String, backup_dir: String, description: Option<String>) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let bd = backup_dir.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::backup_world(
            std::path::Path::new(&wp),
            std::path::Path::new(&bd),
            description.as_deref(),
        )
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn get_backups(backup_dir: String) -> Result<Vec<serde_json::Value>, AppError> {
    let bd = backup_dir.clone();
    let result = tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_backups(std::path::Path::new(&bd))
    }).await.map_err(|e| errors::internal(e.to_string()))?;
    Ok(result)
}

#[tauri::command]
pub async fn restore_backup(backup_path: String, target_path: String) -> Result<(), AppError> {
    let bp = backup_path.clone();
    let tp = target_path.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::restore_backup(std::path::Path::new(&bp), std::path::Path::new(&tp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn delete_backup(backup_path: String) -> Result<(), AppError> {
    let bp = backup_path.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::delete_backup(std::path::Path::new(&bp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn export_world(options: serde_json::Value) -> Result<(), AppError> {
    let world_path = options.get("worldPath").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let target_path = options.get("targetPath").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let format = options.get("format").and_then(|v| v.as_str()).unwrap_or("zip").to_string();
    if world_path.is_empty() || target_path.is_empty() {
        return Err(errors::internal("导出路径不能为空"));
    }
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::export_world(std::path::Path::new(&world_path), std::path::Path::new(&target_path), &format)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn import_world(options: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let source_path = options.get("sourcePath").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let target_dir = options.get("targetDir").and_then(|v| v.as_str()).unwrap_or("").to_string();
    let world_name = options.get("worldName").and_then(|v| v.as_str()).map(|s| s.to_string());
    if source_path.is_empty() || target_dir.is_empty() {
        return Err(errors::internal("导入路径不能为空"));
    }
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::import_world(std::path::Path::new(&source_path), std::path::Path::new(&target_dir), world_name.as_deref())
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn delete_world(world_path: String) -> Result<(), AppError> {
    let wp = world_path.clone();
    tauri::async_runtime::spawn_blocking(move || {
        std::fs::remove_dir_all(&wp).map_err(|e| errors::world_error(&wp, e.to_string()))
    }).await.map_err(|e| errors::internal(e.to_string()))?
}

#[tauri::command]
pub async fn rename_world(world_path: String, new_name: String) -> Result<(), AppError> {
    let wp = world_path.clone();
    let nn = new_name.clone();
    tauri::async_runtime::spawn_blocking(move || {
        let p = std::path::Path::new(&wp);
        let new_path = p.parent().unwrap_or(p).join(&nn);
        std::fs::rename(p, &new_path).map_err(|e| errors::world_error(&nn, e.to_string()))
    }).await.map_err(|e| errors::internal(e.to_string()))?
}

#[tauri::command]
pub async fn copy_world(source_path: String, target_path: String, new_name: Option<String>) -> Result<serde_json::Value, AppError> {
    let sp = source_path.clone();
    let tp = target_path.clone();
    let nn = new_name.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::copy_world(std::path::Path::new(&sp), std::path::Path::new(&tp), nn.as_deref())
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub fn get_world_icon(world_path: String) -> Result<Option<String>, AppError> {
    let icon_path = std::path::Path::new(&world_path).join("icon.png");
    if icon_path.exists() {
        let data = std::fs::read(&icon_path)
            .map_err(|e| errors::file_read_error(&icon_path, e.to_string()))?;
        use base64::Engine;
        Ok(Some(format!("data:image/png;base64,{}", base64::engine::general_purpose::STANDARD.encode(&data))))
    } else { Ok(None) }
}

// ========== #61 存档健康检查与修复 ==========

#[tauri::command]
pub async fn check_world_health(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::check_world_health(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn fix_world_health_issue(world_path: String, item_id: String) -> Result<bool, AppError> {
    let wp = world_path.clone();
    let iid = item_id.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::fix_world_health_issue(std::path::Path::new(&wp), &iid)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn fix_all_world_health_issues(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::fix_all_world_health_issues(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #62 存档时间线回放 ==========

#[tauri::command]
pub async fn get_world_timeline(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_timeline(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn create_timeline_entry(world_path: String, label: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let lb = label.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::create_timeline_entry(std::path::Path::new(&wp), &lb)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn restore_timeline_entry(world_path: String, entry_id: String) -> Result<bool, AppError> {
    let wp = world_path.clone();
    let eid = entry_id.clone();
    wrap(tauri::async_runtime::spawn_blocking(move || {
        WorldService::restore_timeline_entry(std::path::Path::new(&wp), &eid)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #63 存档世界地图生成 ==========

#[tauri::command]
pub async fn get_world_map_overview(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_map_overview(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn render_world_map(world_path: String, dimension: String, zoom: Option<f64>) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let dim = dimension.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::render_world_map(std::path::Path::new(&wp), &dim, zoom)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #64 存档统计面板 ==========

#[tauri::command]
pub async fn get_world_statistics(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_statistics(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #65 存档格式转换与迁移 ==========

#[tauri::command]
pub fn convert_world_format(options: serde_json::Value) -> Result<serde_json::Value, AppError> {
    Ok(WorldService::convert_world_format(&options))
}

#[tauri::command]
pub async fn get_world_migration_plan(world_path: String, target_version: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let tv = target_version.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_migration_plan(std::path::Path::new(&wp), &tv)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn execute_world_migration(world_path: String, plan: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let p = plan.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::execute_world_migration(std::path::Path::new(&wp), &p)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #66 种子预览器 ==========

#[tauri::command]
pub async fn preview_seed(seed: String, game_version: Option<String>) -> Result<serde_json::Value, AppError> {
    let s = seed.clone();
    let gv = game_version.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::preview_seed(&s, gv.as_deref())
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #67 存档云端同步 ==========

#[tauri::command]
pub async fn get_world_sync_info(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_sync_info(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn sync_world(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::sync_world(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub fn resolve_sync_conflict(world_path: String, file_path: String, use_local: bool) -> Result<bool, AppError> {
    Ok(WorldService::resolve_sync_conflict(std::path::Path::new(&world_path), &file_path, use_local))
}

// ========== #68 存档瘦身工具 ==========

#[tauri::command]
pub async fn analyze_world_slim(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::analyze_world_slim(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn execute_world_slim(world_path: String, plan: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let p = plan.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::execute_world_slim(std::path::Path::new(&wp), &p)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #69 存档日记 ==========

#[tauri::command]
pub async fn get_world_diary(world_path: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_diary(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

#[tauri::command]
pub async fn generate_diary_entry(world_path: String, date: String) -> Result<serde_json::Value, AppError> {
    let wp = world_path.clone();
    let d = date.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::generate_diary_entry(std::path::Path::new(&wp), &d)
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}

// ========== #70 存档蓝图分享 ==========

#[tauri::command]
pub fn export_structure(options: serde_json::Value) -> Result<serde_json::Value, AppError> {
    Ok(WorldService::export_structure(&options))
}

#[tauri::command]
pub fn import_structure(world_path: String, structure_path: String, x: i32, y: i32, z: i32) -> Result<bool, AppError> {
    Ok(WorldService::import_structure(std::path::Path::new(&world_path), &structure_path, x, y, z))
}

#[tauri::command]
pub fn share_blueprint(structure_path: String) -> Result<serde_json::Value, AppError> {
    Ok(WorldService::share_blueprint(&structure_path))
}

#[tauri::command]
pub async fn get_world_structures(world_path: String) -> Result<Vec<serde_json::Value>, AppError> {
    let wp = world_path.clone();
    Ok(tauri::async_runtime::spawn_blocking(move || {
        WorldService::get_world_structures(std::path::Path::new(&wp))
    }).await.map_err(|e| errors::internal(e.to_string()))?)
}
