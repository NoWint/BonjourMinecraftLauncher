use crate::errors::AppError;
use crate::models::server::*;
use crate::services::server_manager as sm;

#[tauri::command]
pub fn get_servers() -> Result<Vec<serde_json::Value>, AppError> {
    let servers = sm::load_servers();
    let values: Vec<serde_json::Value> = servers.iter()
        .filter_map(|s| serde_json::to_value(s).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub fn add_server(name: String, address: String) -> Result<serde_json::Value, AppError> {
    if name.trim().is_empty() {
        return Err(crate::errors::invalid_param("name", "服务器名称不能为空"));
    }
    if address.trim().is_empty() {
        return Err(crate::errors::invalid_param("address", "服务器地址不能为空"));
    }
    let mut servers = sm::load_servers();
    let (host, port) = sm::parse_address(&address);
    let server = ServerEntry {
        id: format!("srv-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        name,
        address: host,
        port,
        icon: None,
        group_id: Some("default".to_string()),
        tags: vec![],
        added_at: chrono::Utc::now().timestamp_millis(),
        last_played_at: None,
        play_count: 0,
        favorite: false,
        notes: None,
        icon_url: None,
        last_ping: None,
    };
    let result = serde_json::to_value(&server)?;
    servers.push(server);
    sm::save_servers(&servers)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_server(server_id: String) -> Result<bool, AppError> {
    let mut servers = sm::load_servers();
    let before = servers.len();
    servers.retain(|s| s.id != server_id);
    if servers.len() == before {
        return Err(crate::errors::server_error(&server_id, "服务器未找到"));
    }
    sm::save_servers(&servers)?;
    Ok(true)
}

#[tauri::command]
pub fn update_server(server_id: String, updates: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let mut servers = sm::load_servers();
    for server in servers.iter_mut() {
        if server.id == server_id {
            if let Some(map) = updates.as_object() {
                for (k, v) in map {
                    match k.as_str() {
                        "name" => if let Some(s) = v.as_str() { server.name = s.to_string(); },
                        "address" => if let Some(s) = v.as_str() { server.address = s.to_string(); },
                        "port" => if let Some(n) = v.as_u64() { server.port = n as u16; },
                        "groupId" => server.group_id = v.as_str().map(|s| s.to_string()),
                        "favorite" => if let Some(b) = v.as_bool() { server.favorite = b; },
                        "notes" => server.notes = v.as_str().map(|s| s.to_string()),
                        "iconUrl" => server.icon_url = v.as_str().map(|s| s.to_string()),
                        "tags" => {
                            if let Some(arr) = v.as_array() {
                                server.tags = arr.iter().filter_map(|t| t.as_str().map(|s| s.to_string())).collect();
                            }
                        },
                        "lastPlayedAt" => server.last_played_at = v.as_i64(),
                        "playCount" => if let Some(n) = v.as_u64() { server.play_count = n as u32; },
                        _ => {}
                    }
                }
            }
            let result = serde_json::to_value(&*server)?;
            sm::save_servers(&servers)?;
            return Ok(result);
        }
    }
    Err(crate::errors::server_error(&server_id, "服务器未找到"))
}

#[tauri::command]
pub fn get_server_info(server_id: String) -> Result<Option<serde_json::Value>, AppError> {
    let servers = sm::load_servers();
    Ok(servers.into_iter().find(|s| s.id == server_id)
        .and_then(|s| serde_json::to_value(s).ok()))
}

#[tauri::command]
pub fn ping_server(address: String, port: u16) -> Result<serde_json::Value, AppError> {
    let result = sm::minecraft_server_ping(&address, port)?;
    serde_json::to_value(result).map_err(|e| e.into())
}

#[tauri::command]
pub fn get_server_groups() -> Result<Vec<serde_json::Value>, AppError> {
    let groups = sm::load_groups();
    let values: Vec<serde_json::Value> = groups.iter()
        .filter_map(|g| serde_json::to_value(g).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub fn create_server_group(name: String, color: Option<String>, icon: Option<String>) -> Result<serde_json::Value, AppError> {
    if name.trim().is_empty() {
        return Err(crate::errors::invalid_param("name", "分组名称不能为空"));
    }
    let mut groups = sm::load_groups();
    let group = ServerGroup {
        id: format!("grp-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        name,
        color,
        icon,
        sort_order: groups.len(),
        collapsed: false,
    };
    let result = serde_json::to_value(&group)?;
    groups.push(group);
    sm::save_groups(&groups)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_server_group(group_id: String) -> Result<bool, AppError> {
    if group_id == "default" {
        return Err(crate::errors::invalid_param("group_id", "不能删除默认分组"));
    }
    let mut groups = sm::load_groups();
    let before = groups.len();
    groups.retain(|g| g.id != group_id);
    sm::save_groups(&groups)?;
    Ok(groups.len() < before)
}

#[tauri::command]
pub fn assign_server_to_group(server_id: String, group_id: String) -> Result<(), AppError> {
    let mut servers = sm::load_servers();
    let mut found = false;
    for server in servers.iter_mut() {
        if server.id == server_id {
            server.group_id = Some(group_id);
            found = true;
            break;
        }
    }
    if !found {
        return Err(crate::errors::server_error(&server_id, "服务器未找到"));
    }
    sm::save_servers(&servers)?;
    Ok(())
}

#[tauri::command]
pub async fn scan_lan_worlds() -> Result<Vec<serde_json::Value>, AppError> {
    let worlds = tokio::task::spawn_blocking(|| sm::scan_lan_worlds_blocking()).await
        .map_err(|e| crate::errors::server_error("lan_scan", format!("扫描局域网失败: {}", e)))?;
    let values: Vec<serde_json::Value> = worlds.iter()
        .filter_map(|w| serde_json::to_value(w).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub async fn create_friend_lobby(player_name: String) -> Result<serde_json::Value, AppError> {
    if player_name.trim().is_empty() {
        return Err(crate::errors::invalid_param("player_name", "玩家名称不能为空"));
    }
    let lobby = tokio::task::spawn_blocking(move || sm::create_friend_lobby_state(&player_name)).await
        .map_err(|e| crate::errors::server_error("friend_lobby", format!("创建好友大厅失败: {}", e)))?;
    Ok(serde_json::to_value(lobby)?)
}

#[tauri::command]
pub async fn join_friend_lobby(code: String, player_name: String) -> Result<serde_json::Value, AppError> {
    if player_name.trim().is_empty() {
        return Err(crate::errors::invalid_param("player_name", "玩家名称不能为空"));
    }
    let lobby = tokio::task::spawn_blocking(move || sm::join_friend_lobby_state(&code, &player_name)).await
        .map_err(|e| crate::errors::server_error("friend_lobby", format!("加入好友大厅失败: {}", e)))?
        .map_err(|e| e)?;
    Ok(serde_json::to_value(lobby)?)
}

#[tauri::command]
pub async fn leave_friend_lobby() -> Result<bool, AppError> {
    tokio::task::spawn_blocking(|| sm::leave_friend_lobby_state()).await
        .map_err(|e| crate::errors::server_error("friend_lobby", format!("离开好友大厅失败: {}", e)))
}

#[tauri::command]
pub async fn get_friend_lobbies() -> Result<Vec<serde_json::Value>, AppError> {
    let status = tokio::task::spawn_blocking(|| sm::get_friend_lobby_status_state()).await
        .map_err(|e| crate::errors::server_error("friend_lobby", format!("获取好友大厅失败: {}", e)))?;
    if status.id.is_empty() {
        Ok(vec![])
    } else {
        Ok(vec![serde_json::to_value(status)?])
    }
}

#[tauri::command]
pub async fn get_friend_lobby_status() -> Result<serde_json::Value, AppError> {
    let status = tokio::task::spawn_blocking(|| sm::get_friend_lobby_status_state()).await
        .map_err(|e| crate::errors::server_error("friend_lobby", format!("获取好友大厅状态失败: {}", e)))?;
    Ok(serde_json::to_value(status)?)
}

#[tauri::command]
pub async fn get_community_servers() -> Result<Vec<serde_json::Value>, AppError> {
    let servers = tokio::task::spawn_blocking(|| sm::fetch_community_servers()).await
        .map_err(|e| crate::errors::server_error("community", format!("获取社区服务器失败: {}", e)))?;
    let values: Vec<serde_json::Value> = servers.iter()
        .filter_map(|s| serde_json::to_value(s).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub async fn create_local_server(config: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let mut local_config: LocalServerConfig = serde_json::from_value(config)
        .map_err(|e| crate::errors::invalid_param("config", format!("解析服务器配置失败: {}", e)))?;

    if local_config.name.trim().is_empty() {
        return Err(crate::errors::invalid_param("name", "服务器名称不能为空"));
    }
    if local_config.game_version.trim().is_empty() {
        return Err(crate::errors::invalid_param("gameVersion", "游戏版本不能为空"));
    }

    let server_dir = if local_config.server_dir.is_empty() {
        let dir = crate::utils::paths::default_game_dir()
            .join("local-servers")
            .join(&local_config.name.replace(' ', "-"));
        local_config.server_dir = dir.to_string_lossy().to_string();
        dir
    } else {
        std::path::PathBuf::from(&local_config.server_dir)
    };

    sm::create_local_server_dir(&local_config)?;

    let jar_name = format!("minecraft_server.{}.jar", local_config.game_version);
    let jar_path = server_dir.join(&jar_name);

    if !jar_path.exists() {
        let bmclapi_url = format!(
            "https://bmclapi2.bangbang93.com/version/{}/server",
            local_config.game_version
        );
        let client = reqwest::Client::new();
        let response = client.get(&bmclapi_url)
            .timeout(std::time::Duration::from_secs(300))
            .send().await
            .map_err(|e| crate::errors::download_error(&bmclapi_url, e.to_string()))?;

        let bytes = response.bytes().await
            .map_err(|e| crate::errors::download_error(&bmclapi_url, e.to_string()))?;

        std::fs::write(&jar_path, &bytes)?;
    }

    local_config.status = "stopped".to_string();
    local_config.pid = None;
    local_config.started_at = None;

    let mut local_servers = sm::load_local_servers();
    local_servers.push(local_config.clone());
    sm::save_local_servers(&local_servers)?;

    Ok(serde_json::to_value(&local_config)?)
}

#[tauri::command]
pub async fn start_local_server(app: tauri::AppHandle, server_id: String) -> Result<serde_json::Value, AppError> {
    let mut local_servers = sm::load_local_servers();
    let server = local_servers.iter_mut().find(|s| s.id == server_id)
        .ok_or_else(|| crate::errors::server_error(&server_id, "本地服务器未找到"))?;

    if server.status == "running" {
        return Err(crate::errors::server_error(&server.name, "服务器已在运行中"));
    }

    let jar_name = format!("minecraft_server.{}.jar", server.game_version);
    let max_memory = 2048u32;

    match sm::start_server_process(Some(app), &server_id, &server.server_dir, &jar_name, server.port, max_memory) {
        Ok(pid) => {
            server.pid = Some(pid);
            server.status = "running".to_string();
            server.started_at = Some(chrono::Utc::now().timestamp_millis());

            if let Ok(mut processes) = sm::LOCAL_SERVER_PROCESSES.lock() {
                processes.insert(server_id.clone(), pid);
            }

            let result = serde_json::to_value(&*server)?;
            sm::save_local_servers(&local_servers)?;
            Ok(result)
        }
        Err(e) => {
            server.status = "stopped".to_string();
            Err(e)
        }
    }
}

#[tauri::command]
pub async fn stop_local_server(server_id: String) -> Result<bool, AppError> {
    let mut local_servers = sm::load_local_servers();
    let server = local_servers.iter_mut().find(|s| s.id == server_id)
        .ok_or_else(|| crate::errors::server_error(&server_id, "本地服务器未找到"))?;

    if server.status != "running" {
        return Ok(true);
    }

    if let Some(pid) = server.pid {
        sm::stop_server_process(pid)?;
        if let Ok(mut processes) = sm::LOCAL_SERVER_PROCESSES.lock() {
            processes.remove(&server_id);
        }
    }

    server.status = "stopped".to_string();
    server.pid = None;
    server.started_at = None;

    sm::save_local_servers(&local_servers)?;
    Ok(true)
}

#[tauri::command]
pub async fn get_local_server_status(server_id: String) -> Result<serde_json::Value, AppError> {
    let local_servers = sm::load_local_servers();
    let server = local_servers.iter().find(|s| s.id == server_id);

    match server {
        Some(s) => {
            let mut status = s.clone();
            if status.status == "running" {
                if let Some(pid) = status.pid {
                    if !sm::is_process_running(pid) {
                        status.status = "stopped".to_string();
                        status.pid = None;
                        status.started_at = None;
                    }
                }
            }
            Ok(serde_json::json!({
                "running": status.status == "running",
                "status": status.status,
                "pid": status.pid,
                "uptime": if status.started_at.is_some() {
                    chrono::Utc::now().timestamp_millis() - status.started_at.unwrap()
                } else { 0 },
                "players": [],
                "serverId": status.id,
                "name": status.name,
            }))
        }
        None => Ok(serde_json::json!({
            "running": false,
            "status": "stopped",
            "players": [],
            "uptime": 0
        })),
    }
}

#[tauri::command]
pub async fn send_server_command(server_id: String, command: String) -> Result<bool, AppError> {
    sm::send_server_command(&server_id, &command)
}

#[tauri::command]
pub async fn get_local_servers() -> Result<Vec<serde_json::Value>, AppError> {
    let mut servers = sm::load_local_servers();
    let mut changed = false;

    for server in servers.iter_mut() {
        if server.status == "running" {
            if let Some(pid) = server.pid {
                if !sm::is_process_running(pid) {
                    server.status = "stopped".to_string();
                    server.pid = None;
                    server.started_at = None;
                    changed = true;
                }
            }
        }
    }

    if changed {
        sm::save_local_servers(&servers)?;
    }

    let values: Vec<serde_json::Value> = servers.iter()
        .filter_map(|s| serde_json::to_value(s).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub fn toggle_server_favorite(server_id: String) -> Result<bool, AppError> {
    let mut servers = sm::load_servers();
    for server in servers.iter_mut() {
        if server.id == server_id {
            server.favorite = !server.favorite;
            let result = server.favorite;
            sm::save_servers(&servers)?;
            return Ok(result);
        }
    }
    Err(crate::errors::server_error(&server_id, "服务器未找到"))
}

#[tauri::command]
pub fn get_server_player_history(server_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let _ = server_id;
    Ok(Vec::new())
}

#[tauri::command]
pub async fn join_server(address: String, port: u16) -> Result<bool, AppError> {
    let mut servers = sm::load_servers();
    for server in servers.iter_mut() {
        if server.address == address && server.port == port {
            server.last_played_at = Some(chrono::Utc::now().timestamp_millis());
            server.play_count += 1;
            sm::save_servers(&servers)?;
            break;
        }
    }
    Ok(true)
}

#[tauri::command]
pub async fn get_server_notifications() -> Result<Vec<serde_json::Value>, AppError> {
    let mut all_notifications = sm::load_notifications();

    if let Ok(memory_notifs) = sm::SERVER_NOTIFICATIONS.lock() {
        for n in memory_notifs.iter() {
            all_notifications.insert(0, n.clone());
        }
    }

    all_notifications.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
    all_notifications.dedup_by(|a, b| {
        a.server_id == b.server_id && a.notification_type == b.notification_type && (a.timestamp - b.timestamp).abs() < 5000
    });
    all_notifications.truncate(200);

    let values: Vec<serde_json::Value> = all_notifications.iter()
        .filter_map(|n| serde_json::to_value(n).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub async fn sync_server_resource_pack(server_id: String, url: String, hash: Option<String>) -> Result<serde_json::Value, AppError> {
    if url.trim().is_empty() {
        return Err(crate::errors::invalid_param("url", "资源包URL不能为空"));
    }
    let sid = server_id.clone();
    let result = tokio::task::spawn_blocking(move || {
        sm::sync_resource_pack(&server_id, &url, hash.as_deref())
    }).await
        .map_err(|e| crate::errors::server_error(&sid, format!("同步资源包失败: {}", e)))?
        .map_err(|e| e)?;

    Ok(serde_json::to_value(result)?)
}

#[tauri::command]
pub async fn sync_mods_to_server(instance_id: String, server_dir: String) -> Result<serde_json::Value, AppError> {
    if instance_id.trim().is_empty() {
        return Err(crate::errors::invalid_param("instanceId", "实例ID不能为空"));
    }
    if server_dir.trim().is_empty() {
        return Err(crate::errors::invalid_param("serverDir", "服务器目录不能为空"));
    }
    let iid = instance_id.clone();
    let result = tokio::task::spawn_blocking(move || {
        sm::sync_mods_to_server_dir(&instance_id, &server_dir)
    }).await
        .map_err(|e| crate::errors::server_error(&iid, format!("同步模组失败: {}", e)))?
        .map_err(|e| e)?;

    Ok(serde_json::to_value(result)?)
}

#[tauri::command]
pub async fn check_server_status_for_notifications(server_id: String, server_name: String, address: String, port: u16) -> Result<(), AppError> {
    let sid = server_id.clone();
    tokio::task::spawn_blocking(move || {
        sm::check_and_generate_notifications(&server_id, &server_name, &address, port);
    }).await
        .map_err(|e| crate::errors::server_error(&sid, format!("检查服务器状态失败: {}", e)))?;
    Ok(())
}

#[tauri::command]
pub fn get_server_portal_entries() -> Result<Vec<serde_json::Value>, AppError> {
    let entries = sm::load_portal_entries();
    let values: Vec<serde_json::Value> = entries.iter()
        .filter_map(|e| serde_json::to_value(e).ok())
        .collect();
    Ok(values)
}

#[tauri::command]
pub fn add_server_portal_entry(name: String, address: String, port: u16, shortcut_key: Option<String>) -> Result<serde_json::Value, AppError> {
    if name.trim().is_empty() {
        return Err(crate::errors::invalid_param("name", "快捷入口名称不能为空"));
    }
    let mut entries = sm::load_portal_entries();
    let entry = ServerPortalEntry {
        id: format!("portal-{}-{}", chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8]),
        name,
        address,
        port,
        shortcut_key,
        last_used: None,
    };
    let result = serde_json::to_value(&entry)?;
    entries.push(entry);
    sm::save_portal_entries(&entries)?;
    Ok(result)
}

#[tauri::command]
pub fn delete_server_portal_entry(entry_id: String) -> Result<bool, AppError> {
    let mut entries = sm::load_portal_entries();
    let before = entries.len();
    entries.retain(|e| e.id != entry_id);
    sm::save_portal_entries(&entries)?;
    Ok(entries.len() < before)
}

#[tauri::command]
pub fn update_server_notification_config(server_id: String, config: serde_json::Value) -> Result<serde_json::Value, AppError> {
    let mut notification_config: ServerNotificationConfig = serde_json::from_value(config)
        .unwrap_or_else(|_| ServerNotificationConfig {
            server_id: server_id.clone(),
            ..Default::default()
        });
    notification_config.server_id = server_id.clone();

    if let Ok(mut configs) = sm::NOTIFICATION_CONFIGS.lock() {
        configs.insert(server_id.clone(), notification_config.clone());
    }

    let all_configs = if let Ok(configs) = sm::NOTIFICATION_CONFIGS.lock() {
        configs.clone()
    } else {
        std::collections::HashMap::new()
    };
    let _ = sm::save_notification_configs(&all_configs);

    Ok(serde_json::to_value(notification_config)?)
}

#[tauri::command]
pub fn mark_server_notification_read(timestamp: i64, server_id: String) -> Result<bool, AppError> {
    if let Ok(mut notifs) = sm::SERVER_NOTIFICATIONS.lock() {
        for n in notifs.iter_mut() {
            if n.timestamp == timestamp && n.server_id == server_id {
                n.read = true;
                break;
            }
        }
    }

    let mut saved = sm::load_notifications();
    for n in saved.iter_mut() {
        if n.timestamp == timestamp && n.server_id == server_id {
            n.read = true;
            break;
        }
    }
    let _ = sm::save_notifications(&saved);
    Ok(true)
}

#[tauri::command]
pub fn mark_all_notifications_read() -> Result<bool, AppError> {
    if let Ok(mut notifs) = sm::SERVER_NOTIFICATIONS.lock() {
        for n in notifs.iter_mut() {
            n.read = true;
        }
    }

    let mut saved = sm::load_notifications();
    for n in saved.iter_mut() {
        n.read = true;
    }
    let _ = sm::save_notifications(&saved);
    Ok(true)
}
