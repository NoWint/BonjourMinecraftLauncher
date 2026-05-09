use crate::errors::{self, AppError};
use crate::models::server::*;
use crate::services::file_manager;
use crate::utils::paths;
use std::collections::HashMap;
use std::io::{Read, Write};
use std::net::{Ipv4Addr, SocketAddrV4, TcpStream, UdpSocket};
use std::path::PathBuf;
use std::sync::Mutex;
use std::time::Duration;

lazy_static::lazy_static! {
    pub static ref LOCAL_SERVER_PROCESSES: Mutex<HashMap<String, u32>> = Mutex::new(HashMap::new());
    pub static ref FRIEND_LOBBY_STATE: Mutex<Option<FriendLobby>> = Mutex::new(None);
    pub static ref SERVER_NOTIFICATIONS: Mutex<Vec<ServerStatusNotification>> = Mutex::new(Vec::new());
    static ref SERVER_PREV_STATUS: Mutex<HashMap<String, ServerPrevStatus>> = Mutex::new(HashMap::new());
    pub static ref NOTIFICATION_CONFIGS: Mutex<HashMap<String, ServerNotificationConfig>> = Mutex::new(HashMap::new());
}

struct ServerPrevStatus {
    online: bool,
    version: String,
    player_count: u32,
}

fn servers_file() -> PathBuf {
    paths::config_dir().join("servers.json")
}

fn groups_file() -> PathBuf {
    paths::config_dir().join("server_groups.json")
}

fn local_servers_file() -> PathBuf {
    paths::config_dir().join("local_servers.json")
}

fn notifications_file() -> PathBuf {
    paths::config_dir().join("server_notifications.json")
}

fn portal_file() -> PathBuf {
    paths::config_dir().join("server_portals.json")
}

fn notification_configs_file() -> PathBuf {
    paths::config_dir().join("server_notification_configs.json")
}

pub fn load_servers() -> Vec<ServerEntry> {
    let path = servers_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect()
    } else {
        Vec::new()
    }
}

pub fn save_servers(servers: &Vec<ServerEntry>) -> Result<(), AppError> {
    file_manager::save_json(&servers_file(), servers)
}

pub fn load_groups() -> Vec<ServerGroup> {
    let path = groups_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect()
    } else {
        vec![ServerGroup {
            id: "default".to_string(),
            name: "默认".to_string(),
            color: None,
            icon: None,
            sort_order: 0,
            collapsed: false,
        }]
    }
}

pub fn save_groups(groups: &Vec<ServerGroup>) -> Result<(), AppError> {
    file_manager::save_json(&groups_file(), groups)
}

pub fn load_local_servers() -> Vec<LocalServerConfig> {
    let path = local_servers_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect()
    } else {
        Vec::new()
    }
}

pub fn save_local_servers(servers: &Vec<LocalServerConfig>) -> Result<(), AppError> {
    file_manager::save_json(&local_servers_file(), servers)
}

pub fn load_notifications() -> Vec<ServerStatusNotification> {
    let path = notifications_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect()
    } else {
        Vec::new()
    }
}

pub fn save_notifications(notifications: &Vec<ServerStatusNotification>) -> Result<(), AppError> {
    file_manager::save_json(&notifications_file(), notifications)
}

pub fn load_portal_entries() -> Vec<ServerPortalEntry> {
    let path = portal_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect()
    } else {
        Vec::new()
    }
}

pub fn save_portal_entries(entries: &Vec<ServerPortalEntry>) -> Result<(), AppError> {
    file_manager::save_json(&portal_file(), entries)
}

pub fn load_notification_configs() -> HashMap<String, ServerNotificationConfig> {
    let path = notification_configs_file();
    if path.exists() {
        let raw: Vec<serde_json::Value> = file_manager::load_json_or_default(&path);
        raw.iter()
            .filter_map(|v| {
                let config: Option<ServerNotificationConfig> = serde_json::from_value(v.clone()).ok();
                config.map(|c| (c.server_id.clone(), c))
            })
            .collect()
    } else {
        HashMap::new()
    }
}

pub fn save_notification_configs(configs: &HashMap<String, ServerNotificationConfig>) -> Result<(), AppError> {
    let list: Vec<&ServerNotificationConfig> = configs.values().collect();
    file_manager::save_json(&notification_configs_file(), &list)
}

pub fn parse_address(address: &str) -> (String, u16) {
    let trimmed = address.trim();
    if trimmed.starts_with('[') {
        if let Some(bracket_end) = trimmed.find(']') {
            let host = trimmed[1..bracket_end].to_string();
            let rest = &trimmed[bracket_end + 1..];
            if rest.starts_with(':') {
                if let Ok(port) = rest[1..].parse::<u16>() {
                    return (host, port);
                }
            }
            return (host, 25565);
        }
    }
    if let Some(idx) = trimmed.rfind(':') {
        let host = &trimmed[..idx];
        if let Ok(port) = trimmed[idx + 1..].parse::<u16>() {
            return (host.to_string(), port);
        }
    }
    (trimmed.to_string(), 25565)
}

pub fn generate_server_properties(config: &LocalServerConfig) -> String {
    let mut lines = vec![
        "# Minecraft server properties - generated by Bonjour Launcher".to_string(),
        "enable-jmx-monitoring=false".to_string(),
        "rcon.port=25575".to_string(),
        "level-name=world".to_string(),
        format!("gamemode={}", config.game_mode),
        "enable-command-block=false".to_string(),
        "enable-query=false".to_string(),
        "generator-settings={}".to_string(),
        "enforce-secure-profile=true".to_string(),
        "level-type=minecraft\\:normal".to_string(),
        "spawn-npcs=true".to_string(),
        format!("spawn-animals={}", config.spawn_animals),
        "snooper-enabled=true".to_string(),
        format!("difficulty={}", config.difficulty),
        "function-permission-level=2".to_string(),
        "network-compression-threshold=256".to_string(),
        "max-tick-time=60000".to_string(),
        "require-resource-pack=false".to_string(),
        "use-native-transport=true".to_string(),
        format!("max-players={}", config.max_players),
        format!("online-mode={}", config.online_mode),
        "enable-status=true".to_string(),
        "allow-flight=false".to_string(),
        "initial-disabled-packs=".to_string(),
        "broadcast-rcon-to-ops=true".to_string(),
        "view-distance=10".to_string(),
        "server-ip=".to_string(),
        "resource-pack-prompt=".to_string(),
        "allow-nether=true".to_string(),
        format!("server-port={}", config.port),
        "enable-rcon=false".to_string(),
        "sync-chunk-writes=true".to_string(),
        "op-permission-level=4".to_string(),
        "prevent-proxy-connections=false".to_string(),
        "hide-online-players=false".to_string(),
        "resource-pack=".to_string(),
        "entity-broadcast-range-percentage=100".to_string(),
        "simulation-distance=10".to_string(),
        "rcon.password=".to_string(),
        "player-idle-timeout=0".to_string(),
        "force-gamemode=false".to_string(),
        "rate-limit=0".to_string(),
        "hardcore=false".to_string(),
        "white-list=false".to_string(),
        "broadcast-console-to-ops=true".to_string(),
        format!("pvp={}", config.pvp_enabled),
        format!("spawn-monsters={}", config.spawn_monsters),
        "max-world-size=29999984".to_string(),
        "resource-pack-sha1=".to_string(),
        "spawn-protection=16".to_string(),
        "max-chained-neighbor-updates=1000000".to_string(),
        "initial-enabled-packs=vanilla".to_string(),
        format!("motd={}", config.motd),
    ];
    if let Some(ref seed) = config.seed {
        lines.push(format!("level-seed={}", seed));
    }
    lines.join("\n")
}

pub fn create_local_server_dir(config: &LocalServerConfig) -> Result<PathBuf, AppError> {
    let server_dir = PathBuf::from(&config.server_dir);
    file_manager::ensure_dir(&server_dir)?;

    let props_path = server_dir.join("server.properties");
    let props_content = generate_server_properties(config);
    std::fs::write(&props_path, props_content)?;

    let eula_path = server_dir.join("eula.txt");
    std::fs::write(&eula_path, "eula=true\n")?;

    Ok(server_dir)
}

pub fn start_server_process(server_dir: &str, jar_name: &str, _port: u16, max_memory_mb: u32) -> Result<u32, AppError> {
    let dir = PathBuf::from(server_dir);
    if !dir.exists() {
        return Err(errors::file_not_found(&dir));
    }

    let jar_path = dir.join(jar_name);
    if !jar_path.exists() {
        return Err(errors::file_not_found(&jar_path));
    }

    let min_memory = (max_memory_mb / 2).max(512);
    let mut cmd = std::process::Command::new("java");
    cmd.arg(format!("-Xmx{}m", max_memory_mb))
        .arg(format!("-Xms{}m", min_memory))
        .arg("-jar")
        .arg(jar_name)
        .arg("nogui")
        .current_dir(&dir)
        .stdout(std::process::Stdio::piped())
        .stderr(std::process::Stdio::piped());

    #[cfg(target_os = "windows")]
    {
        use std::os::windows::process::CommandExt;
        cmd.creation_flags(0x00000008);
    }

    let child = cmd.spawn()
        .map_err(|e| errors::process_error(None, format!("启动服务器进程失败: {}", e)))?;

    Ok(child.id())
}

pub fn stop_server_process(pid: u32) -> Result<bool, AppError> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("taskkill")
            .args(["/PID", &pid.to_string(), "/F"])
            .output()
            .map(|_| true)
            .map_err(|e| errors::process_error(Some(pid), format!("停止服务器进程失败: {}", e)))
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("kill")
            .args(["-TERM", &pid.to_string()])
            .output()
            .map(|_| true)
            .map_err(|e| errors::process_error(Some(pid), format!("停止服务器进程失败: {}", e)))
    }
}

pub fn is_process_running(pid: u32) -> bool {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("tasklist")
            .args(["/FI", &format!("PID eq {}", pid)])
            .output()
            .map(|o| String::from_utf8_lossy(&o.stdout).contains(&pid.to_string()))
            .unwrap_or(false)
    }

    #[cfg(not(target_os = "windows"))]
    {
        std::process::Command::new("kill")
            .args(["-0", &pid.to_string()])
            .status()
            .map(|s| s.success())
            .unwrap_or(false)
    }
}

const SLP_PROTOCOL_VERSION: i32 = 770;

pub fn minecraft_server_ping(address: &str, port: u16) -> Result<ServerPingResult, AppError> {
    let addr = format!("{}:{}", address, port);
    let socket_addr: std::net::SocketAddr = addr.parse()
        .map_err(|e| errors::invalid_param("address", format!("无效地址 {}: {}", address, e)))?;

    let start = std::time::Instant::now();
    let stream_result = TcpStream::connect_timeout(&socket_addr, Duration::from_secs(5));

    match stream_result {
        Ok(mut stream) => {
            stream.set_read_timeout(Some(Duration::from_secs(5))).ok();
            stream.set_write_timeout(Some(Duration::from_secs(5))).ok();

            let latency = start.elapsed().as_millis() as u64;

            let handshake = build_handshake_packet(address, port, SLP_PROTOCOL_VERSION);
            let status_request = build_status_request_packet();

            if stream.write_all(&handshake).is_err() || stream.write_all(&status_request).is_err() {
                return Ok(ServerPingResult {
                    online: true,
                    latency_ms: latency,
                    players_online: None,
                    players_max: None,
                    version: None,
                    description: None,
                    protocol: None,
                    player_list: None,
                    icon_b64: None,
                    mod_info: None,
                    resource_pack_url: None,
                    resource_pack_hash: None,
                });
            }

            match read_status_response(&mut stream) {
                Ok(status_json) => {
                    let version_name = status_json.get("version").and_then(|v| v.get("name"))
                        .and_then(|v| v.as_str()).map(|s| s.to_string());
                    let protocol = status_json.get("version").and_then(|v| v.get("protocol"))
                        .and_then(|v| v.as_i64()).map(|v| v as i32);

                    let players_online = status_json.get("players").and_then(|p| p.get("online"))
                        .and_then(|p| p.as_i64()).map(|v| v as u32);
                    let players_max = status_json.get("players").and_then(|p| p.get("max"))
                        .and_then(|p| p.as_i64()).map(|v| v as u32);

                    let player_list = status_json.get("players")
                        .and_then(|p| p.get("sample"))
                        .and_then(|p| p.as_array())
                        .map(|arr| arr.iter()
                            .filter_map(|p| p.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()))
                            .collect::<Vec<_>>());

                    let description = extract_description(&status_json);
                    let icon_b64 = status_json.get("favicon").and_then(|f| f.as_str()).map(|s| s.to_string());
                    let mod_info = extract_mod_info(&status_json);

                    let resource_pack_url = status_json.get("resourcePack")
                        .or_else(|| status_json.get("resource-pack"))
                        .and_then(|v| v.as_str()).map(|s| s.to_string());
                    let resource_pack_hash = status_json.get("resourcePackHash")
                        .or_else(|| status_json.get("resource-pack-sha1"))
                        .and_then(|v| v.as_str()).map(|s| s.to_string());

                    Ok(ServerPingResult {
                        online: true,
                        latency_ms: latency,
                        players_online,
                        players_max,
                        version: version_name,
                        description,
                        protocol,
                        player_list,
                        icon_b64,
                        mod_info,
                        resource_pack_url,
                        resource_pack_hash,
                    })
                }
                Err(_) => {
                    Ok(ServerPingResult {
                        online: true,
                        latency_ms: latency,
                        players_online: None,
                        players_max: None,
                        version: None,
                        description: None,
                        protocol: None,
                        player_list: None,
                        icon_b64: None,
                        mod_info: None,
                        resource_pack_url: None,
                        resource_pack_hash: None,
                    })
                }
            }
        }
        Err(_) => {
            Ok(ServerPingResult {
                online: false,
                latency_ms: 0,
                players_online: None,
                players_max: None,
                version: None,
                description: None,
                protocol: None,
                player_list: None,
                icon_b64: None,
                mod_info: None,
                resource_pack_url: None,
                resource_pack_hash: None,
            })
        }
    }
}

fn build_handshake_packet(address: &str, port: u16, protocol_version: i32) -> Vec<u8> {
    let mut packet = Vec::new();
    write_varint(&mut packet, 0);
    write_varint(&mut packet, protocol_version);
    write_string(&mut packet, address);
    packet.extend_from_slice(&port.to_be_bytes());
    write_varint(&mut packet, 1);

    let mut framed = Vec::new();
    write_varint(&mut framed, packet.len() as i32);
    framed.extend_from_slice(&packet);
    framed
}

fn build_status_request_packet() -> Vec<u8> {
    let mut framed = Vec::new();
    write_varint(&mut framed, 1);
    write_varint(&mut framed, 0);
    framed
}

fn read_varint_from_stream(stream: &mut TcpStream) -> Result<i32, AppError> {
    let mut result: i32 = 0;
    let mut num_read: usize = 0;
    loop {
        let mut buf = [0u8; 1];
        stream.read_exact(&mut buf)
            .map_err(|e| errors::server_error("read_varint", format!("读取VarInt失败: {}", e)))?;
        let byte = buf[0];
        let value = (byte & 0x7F) as i32;
        result |= value << (7 * num_read);
        num_read += 1;
        if num_read > 5 {
            return Err(errors::server_error("read_varint", "VarInt过长"));
        }
        if (byte & 0x80) == 0 {
            break;
        }
    }
    Ok(result)
}

fn read_status_response(stream: &mut TcpStream) -> Result<serde_json::Value, AppError> {
    let _packet_length = read_varint_from_stream(stream)?;
    let _packet_id = read_varint_from_stream(stream)?;
    let json_length = read_varint_from_stream(stream)?;

    if json_length <= 0 || json_length > 1048576 {
        return Err(errors::server_error("read_status", format!("无效的JSON长度: {}", json_length)));
    }

    let mut json_buf = vec![0u8; json_length as usize];
    stream.read_exact(&mut json_buf)
        .map_err(|e| errors::server_error("read_status", format!("读取JSON数据失败: {}", e)))?;

    let json_str = String::from_utf8(json_buf)
        .map_err(|e| errors::server_error("read_status", format!("JSON UTF-8解码失败: {}", e)))?;

    serde_json::from_str(&json_str)?
}

fn write_varint(buf: &mut Vec<u8>, mut value: i32) {
    loop {
        let mut byte = (value & 0x7F) as u8;
        value >>= 7;
        if value != 0 {
            byte |= 0x80;
        }
        buf.push(byte);
        if value == 0 {
            break;
        }
    }
}

fn write_string(buf: &mut Vec<u8>, s: &str) {
    let bytes = s.as_bytes();
    write_varint(buf, bytes.len() as i32);
    buf.extend_from_slice(bytes);
}

fn extract_description(status: &serde_json::Value) -> Option<String> {
    let desc = status.get("description")?;
    if let Some(s) = desc.as_str() {
        return Some(s.to_string());
    }
    if let Some(obj) = desc.as_object() {
        if let Some(text) = obj.get("text").and_then(|t| t.as_str()) {
            return Some(text.to_string());
        }
        if let Some(extra) = obj.get("extra").and_then(|e| e.as_array()) {
            let text: Vec<String> = extra.iter()
                .filter_map(|e| e.get("text").and_then(|t| t.as_str()).map(|s| s.to_string()))
                .collect();
            if !text.is_empty() {
                return Some(text.join(""));
            }
        }
    }
    if let Some(arr) = desc.as_array() {
        let text: Vec<String> = arr.iter()
            .filter_map(|e| e.get("text").and_then(|t| t.as_str()).map(|s| s.to_string()))
            .collect();
        if !text.is_empty() {
            return Some(text.join(""));
        }
    }
    None
}

fn extract_mod_info(status: &serde_json::Value) -> Option<ServerModInfo> {
    let version_name = status.get("version").and_then(|v| v.get("name"))?.as_str()?;
    let mod_type = if version_name.contains("NeoForge") {
        "neoforge"
    } else if version_name.contains("Forge") {
        "forge"
    } else if version_name.contains("Fabric") {
        "fabric"
    } else if version_name.contains("Quilt") {
        "quilt"
    } else {
        return None;
    };

    let mod_list = status.get("forgeData")
        .or_else(|| status.get("fabricData"))
        .and_then(|d| d.get("mods"))
        .and_then(|m| m.as_array())
        .map(|arr| arr.iter()
            .filter_map(|m| m.get("modId").or_else(|| m.get("id"))
                .and_then(|id| id.as_str()).map(|s| s.to_string()))
            .collect());

    Some(ServerModInfo {
        mod_type: mod_type.to_string(),
        mod_list,
    })
}

pub fn scan_lan_worlds_blocking() -> Vec<LANWorld> {
    let mut worlds = Vec::new();

    let multicast_addr = Ipv4Addr::new(224, 0, 2, 60);
    let multicast_port = 4445;
    let bind_addr = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, multicast_port);

    let socket = match UdpSocket::bind(bind_addr) {
        Ok(s) => s,
        Err(_) => {
            let bind_any = SocketAddrV4::new(Ipv4Addr::UNSPECIFIED, 0);
            match UdpSocket::bind(bind_any) {
                Ok(s) => s,
                Err(_) => return worlds,
            }
        }
    };

    let _ = socket.set_read_timeout(Some(Duration::from_secs(3)));
    let _ = socket.join_multicast_v4(&multicast_addr, &Ipv4Addr::UNSPECIFIED);

    let mut buf = [0u8; 4096];
    let start = std::time::Instant::now();
    let timeout = Duration::from_secs(5);

    while start.elapsed() < timeout {
        match socket.recv_from(&mut buf) {
            Ok((len, src)) => {
                if let Ok(data) = std::str::from_utf8(&buf[..len]) {
                    if let Some(world) = parse_lan_packet(data, src.to_string()) {
                        let key = format!("{}:{}", world.host, world.port);
                        if !worlds.iter().any(|w| format!("{}:{}", w.host, w.port) == key) {
                            worlds.push(world);
                        }
                    }
                }
            }
            Err(_) => break,
        }
    }

    let _ = socket.leave_multicast_v4(&multicast_addr, &Ipv4Addr::UNSPECIFIED);
    worlds
}

fn parse_lan_packet(data: &str, source_addr: String) -> Option<LANWorld> {
    let parts: Vec<&str> = data.splitn(4, '\u{a7}').collect();
    if parts.len() >= 3 {
        let motd = parts.get(0).unwrap_or(&"").trim().to_string();
        let port_str = parts.get(1).unwrap_or(&"25565").trim();
        let game_mode = parts.get(2).unwrap_or(&"survival").trim().to_string();

        let port: u16 = port_str.parse().unwrap_or(25565);
        let host = source_addr.split(':').next().unwrap_or("0.0.0.0").to_string();

        return Some(LANWorld {
            host,
            port,
            world_name: motd,
            game_mode,
            player_count: 1,
            discovered_at: chrono::Utc::now().timestamp_millis(),
            motd: None,
        });
    }

    let motd = data.trim().to_string();
    if !motd.is_empty() && motd.len() > 2 {
        let host = source_addr.split(':').next().unwrap_or("0.0.0.0").to_string();
        return Some(LANWorld {
            host,
            port: 25565,
            world_name: motd,
            game_mode: "survival".to_string(),
            player_count: 1,
            discovered_at: chrono::Utc::now().timestamp_millis(),
            motd: None,
        });
    }
    None
}

pub fn create_friend_lobby_state(host_name: &str) -> FriendLobby {
    let code = generate_lobby_code();
    let now = chrono::Utc::now().timestamp_millis();
    let host_address = get_local_ip().unwrap_or_else(|| "127.0.0.1".to_string());
    let lobby = FriendLobby {
        id: format!("lobby-{}-{}", now, &uuid::Uuid::new_v4().to_string()[..8]),
        code: code.clone(),
        host_name: host_name.to_string(),
        host_address: host_address.clone(),
        port: 25565,
        participants: vec![FriendLobbyParticipant {
            id: format!("host-{}", &uuid::Uuid::new_v4().to_string()[..8]),
            name: host_name.to_string(),
            status: "connected".to_string(),
            address: Some(host_address),
            joined_at: now,
        }],
        status: "waiting".to_string(),
        created_at: now,
        connection_type: "relay".to_string(),
        relay_latency_ms: None,
    };

    if let Ok(mut state) = FRIEND_LOBBY_STATE.lock() {
        *state = Some(lobby.clone());
    }

    lobby
}

fn get_local_ip() -> Option<String> {
    let socket = std::net::UdpSocket::bind("0.0.0.0:0").ok()?;
    socket.connect("8.8.8.8:80").ok()?;
    let addr = socket.local_addr().ok()?;
    Some(addr.ip().to_string())
}

pub fn join_friend_lobby_state(code: &str, player_name: &str) -> Result<FriendLobby, AppError> {
    if code.len() != 6 {
        return Err(errors::invalid_param("code", format!("房间码长度必须为6位，当前为{}位", code.len())));
    }

    let now = chrono::Utc::now().timestamp_millis();
    let lobby = FriendLobby {
        id: format!("lobby-{}-{}", now, &uuid::Uuid::new_v4().to_string()[..8]),
        code: code.to_string(),
        host_name: "远程主机".to_string(),
        host_address: String::new(),
        port: 25565,
        participants: vec![FriendLobbyParticipant {
            id: format!("player-{}", &uuid::Uuid::new_v4().to_string()[..8]),
            name: player_name.to_string(),
            status: "pending".to_string(),
            address: None,
            joined_at: now,
        }],
        status: "connecting".to_string(),
        created_at: now,
        connection_type: "relay".to_string(),
        relay_latency_ms: None,
    };

    if let Ok(mut state) = FRIEND_LOBBY_STATE.lock() {
        *state = Some(lobby.clone());
    }

    Ok(lobby)
}

pub fn leave_friend_lobby_state() -> bool {
    if let Ok(mut state) = FRIEND_LOBBY_STATE.lock() {
        if let Some(ref mut lobby) = *state {
            lobby.status = "disconnected".to_string();
        }
        *state = None;
    }
    true
}

pub fn get_friend_lobby_status_state() -> FriendLobby {
    if let Ok(state) = FRIEND_LOBBY_STATE.lock() {
        if let Some(ref lobby) = *state {
            return lobby.clone();
        }
    }
    FriendLobby {
        id: String::new(),
        code: String::new(),
        host_name: String::new(),
        host_address: String::new(),
        port: 25565,
        participants: vec![],
        status: "disconnected".to_string(),
        created_at: 0,
        connection_type: "relay".to_string(),
        relay_latency_ms: None,
    }
}

fn generate_lobby_code() -> String {
    let chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    let mut code = String::with_capacity(6);
    let mut seed = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default()
        .subsec_nanos();
    for _ in 0..6 {
        seed ^= seed << 13;
        seed ^= seed >> 17;
        seed ^= seed << 5;
        let idx = (seed as usize) % chars.len();
        code.push(chars.chars().nth(idx).unwrap_or('A'));
    }
    code
}

pub fn check_and_generate_notifications(server_id: &str, server_name: &str, address: &str, port: u16) {
    let ping = match minecraft_server_ping(address, port) {
        Ok(p) => p,
        Err(_) => return,
    };

    let current_online = ping.online;
    let current_version = ping.version.clone().unwrap_or_default();
    let current_players = ping.players_online.unwrap_or(0);

    let prev = if let Ok(mut states) = SERVER_PREV_STATUS.lock() {
        states.remove(server_id)
    } else {
        None
    };

    let config = if let Ok(configs) = NOTIFICATION_CONFIGS.lock() {
        configs.get(server_id).cloned().unwrap_or_default()
    } else {
        ServerNotificationConfig::default()
    };

    let mut new_notifications = Vec::new();

    if let Some(ref prev_status) = prev {
        if config.notify_offline && prev_status.online && !current_online {
            new_notifications.push(ServerStatusNotification {
                server_id: server_id.to_string(),
                server_name: server_name.to_string(),
                notification_type: "offline".to_string(),
                message: format!("{} 已离线", server_name),
                timestamp: chrono::Utc::now().timestamp_millis(),
                read: false,
            });
        }
        if config.notify_online && !prev_status.online && current_online {
            new_notifications.push(ServerStatusNotification {
                server_id: server_id.to_string(),
                server_name: server_name.to_string(),
                notification_type: "online".to_string(),
                message: format!("{} 已上线", server_name),
                timestamp: chrono::Utc::now().timestamp_millis(),
                read: false,
            });
        }
        if config.notify_version_change && !current_version.is_empty() && prev_status.version != current_version {
            new_notifications.push(ServerStatusNotification {
                server_id: server_id.to_string(),
                server_name: server_name.to_string(),
                notification_type: "version_change".to_string(),
                message: format!("{} 版本变更为 {}", server_name, current_version),
                timestamp: chrono::Utc::now().timestamp_millis(),
                read: false,
            });
        }
        if config.notify_player_peak && current_players >= config.player_peak_threshold && prev_status.player_count < config.player_peak_threshold {
            new_notifications.push(ServerStatusNotification {
                server_id: server_id.to_string(),
                server_name: server_name.to_string(),
                notification_type: "player_peak".to_string(),
                message: format!("{} 在线人数达到 {}", server_name, current_players),
                timestamp: chrono::Utc::now().timestamp_millis(),
                read: false,
            });
        }
    }

    if let Ok(mut states) = SERVER_PREV_STATUS.lock() {
        states.insert(server_id.to_string(), ServerPrevStatus {
            online: current_online,
            version: current_version,
            player_count: current_players,
        });
    }

    if !new_notifications.is_empty() {
        if let Ok(mut notifs) = SERVER_NOTIFICATIONS.lock() {
            for n in new_notifications {
                notifs.insert(0, n);
            }
            if notifs.len() > 200 {
                notifs.truncate(200);
            }
        }
    }
}

fn sanitize_filename_from_url(url: &str) -> String {
    let path_part = url.split('?').next().unwrap_or(url);
    let name = path_part.rsplit('/').next().unwrap_or("resource-pack");
    if name.is_empty() || name == "/" {
        return "resource-pack.zip".to_string();
    }
    let sanitized: String = name.chars()
        .map(|c| if c.is_alphanumeric() || c == '.' || c == '-' || c == '_' { c } else { '_' })
        .collect();
    if sanitized.is_empty() {
        "resource-pack.zip".to_string()
    } else {
        sanitized
    }
}

pub fn sync_resource_pack(server_id: &str, url: &str, hash: Option<&str>) -> Result<ServerResourcePackInfo, AppError> {
    let resource_packs_dir = paths::config_dir().join("server-resource-packs");
    file_manager::ensure_dir(&resource_packs_dir)?;

    let file_name = sanitize_filename_from_url(url);
    let local_path = resource_packs_dir.join(&file_name);

    if local_path.exists() {
        if let Some(h) = hash {
            let file_bytes = std::fs::read(&local_path)?;
            use sha1::Sha1;
            use sha1::Digest;
            let result = hex::encode(Sha1::digest(&file_bytes));
            if result == h {
                let file_size = std::fs::metadata(&local_path)
                    .map(|m| m.len()).unwrap_or(0);
                return Ok(ServerResourcePackInfo {
                    url: url.to_string(),
                    hash: Some(h.to_string()),
                    file_name,
                    file_size,
                    downloaded: true,
                    local_path: Some(local_path.to_string_lossy().to_string()),
                    last_synced: Some(chrono::Utc::now().timestamp_millis()),
                });
            }
        }
    }

    let response = reqwest::blocking::Client::new()
        .get(url)
        .timeout(Duration::from_secs(120))
        .send()
        .map_err(|e| errors::download_error(url, e.to_string()))?;

    let bytes = response.bytes()
        .map_err(|e| errors::download_error(url, e.to_string()))?;

    std::fs::write(&local_path, &bytes)?;

    let file_size = std::fs::metadata(&local_path)
        .map(|m| m.len()).unwrap_or(0);

    Ok(ServerResourcePackInfo {
        url: url.to_string(),
        hash: hash.map(|h| h.to_string()),
        file_name,
        file_size,
        downloaded: true,
        local_path: Some(local_path.to_string_lossy().to_string()),
        last_synced: Some(chrono::Utc::now().timestamp_millis()),
    })
}

pub fn sync_mods_to_server_dir(instance_id: &str, server_dir: &str) -> Result<ServerModSyncResult, AppError> {
    let instance_dir = paths::config_dir().join("instances").join(instance_id);
    let instance_mods_dir = instance_dir.join("mods");

    if !instance_mods_dir.exists() {
        return Ok(ServerModSyncResult {
            server_id: instance_id.to_string(),
            total_mods: 0,
            synced_mods: 0,
            skipped_client_only: 0,
            skipped_server_only: 0,
            errors: vec![],
            timestamp: chrono::Utc::now().timestamp_millis(),
        });
    }

    let server_mods_dir = PathBuf::from(server_dir).join("mods");
    file_manager::ensure_dir(&server_mods_dir)?;

    let client_only_patterns = [
        "optifine", "sodium", "iris", "phosphor",
        "betterfps", "fpsplus", "chunkanimator", "journeymap",
        "xaerominimap", "voxelmap", "neat", "waila", "hwyla",
        "appleskin", "shulkerboxtooltip", "minimap",
        "dynamic surroundings", "sound filters", "visual workbench",
    ];
    let server_only_patterns = [
        "worldguard", "worldedit", "essentials", "luckperms",
        "vault", "coreprotect", "logblock", "griefprevention", "towny",
        "permissions", "economy", "authme", "protocollib",
    ];
    let dual_side_patterns = [
        "jei", "rei", "emi", "jade", "lithium", "carpet",
        "sodium", "ferritecore", "modernfix",
    ];

    let mut total_mods = 0u32;
    let mut synced_mods = 0u32;
    let mut skipped_client_only = 0u32;
    let mut skipped_server_only = 0u32;
    let mut errors = Vec::new();

    let entries = std::fs::read_dir(&instance_mods_dir)?;

    for entry in entries.flatten() {
        let path = entry.path();
        if !path.extension().map(|e| e == "jar").unwrap_or(false) {
            continue;
        }
        total_mods += 1;

        let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_lowercase();

        let is_dual = dual_side_patterns.iter().any(|p| file_name.contains(p));
        if is_dual {
            let dest = server_mods_dir.join(path.file_name().unwrap_or_default());
            if let Err(e) = std::fs::copy(&path, &dest) {
                errors.push(format!("复制 {} 失败: {}", path.display(), e));
            } else {
                synced_mods += 1;
            }
            continue;
        }

        let is_client_only = client_only_patterns.iter().any(|p| file_name.contains(p));
        let is_server_only = server_only_patterns.iter().any(|p| file_name.contains(p));

        if is_client_only {
            skipped_client_only += 1;
            continue;
        }
        if is_server_only {
            skipped_server_only += 1;
            continue;
        }

        let dest = server_mods_dir.join(path.file_name().unwrap_or_default());
        if let Err(e) = std::fs::copy(&path, &dest) {
            errors.push(format!("复制 {} 失败: {}", path.display(), e));
        } else {
            synced_mods += 1;
        }
    }

    Ok(ServerModSyncResult {
        server_id: instance_id.to_string(),
        total_mods,
        synced_mods,
        skipped_client_only,
        skipped_server_only,
        errors,
        timestamp: chrono::Utc::now().timestamp_millis(),
    })
}

pub fn fetch_community_servers() -> Vec<CommunityServer> {
    let client = reqwest::blocking::Client::new();
    let url = "https://bmclapi2.bangbang93.com/mc/server/list";

    match client.get(url).timeout(Duration::from_secs(10)).send() {
        Ok(response) => {
            match response.json::<serde_json::Value>() {
                Ok(data) => {
                    if let Some(servers) = data.as_array() {
                        servers.iter().take(50).enumerate().map(|(i, s)| {
                            let online_players = s.get("playerCount").or_else(|| s.get("players"))
                                .and_then(|v| v.as_u64()).unwrap_or(0) as u32;
                            CommunityServer {
                                id: s.get("id").and_then(|v| v.as_str()).unwrap_or(&format!("cs-{}", i)).to_string(),
                                name: s.get("name").and_then(|v| v.as_str()).unwrap_or("未知服务器").to_string(),
                                address: s.get("ip").or_else(|| s.get("address")).and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                port: s.get("port").and_then(|v| v.as_u64()).unwrap_or(25565) as u16,
                                description: s.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                tags: s.get("tags").and_then(|v| v.as_array())
                                    .map(|arr| arr.iter().filter_map(|t| t.as_str().map(|s| s.to_string())).collect())
                                    .unwrap_or_default(),
                                rating: s.get("rating").and_then(|v| v.as_f64()).unwrap_or(0.0),
                                rating_count: s.get("ratingCount").and_then(|v| v.as_u64()).unwrap_or(0) as u32,
                                player_count: online_players,
                                max_players: s.get("maxPlayers").and_then(|v| v.as_u64()).unwrap_or(100) as u32,
                                version: s.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                icon_url: s.get("icon").and_then(|v| v.as_str()).map(|s| s.to_string()),
                                submitted_at: s.get("createdAt").and_then(|v| v.as_i64()).unwrap_or(0),
                                submitted_by: s.get("owner").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                                featured: s.get("featured").and_then(|v| v.as_bool()).unwrap_or(false),
                                online: online_players > 0 || s.get("online").and_then(|v| v.as_bool()).unwrap_or(false),
                            }
                        }).collect()
                    } else {
                        Vec::new()
                    }
                }
                Err(_) => Vec::new(),
            }
        }
        Err(_) => get_fallback_community_servers(),
    }
}

fn get_fallback_community_servers() -> Vec<CommunityServer> {
    let now = chrono::Utc::now().timestamp_millis();
    vec![
        CommunityServer {
            id: "cs-hypixel".to_string(),
            name: "Hypixel".to_string(),
            address: "mc.hypixel.net".to_string(),
            port: 25565,
            description: "全球最大的Minecraft服务器，提供多种小游戏模式".to_string(),
            tags: vec!["小游戏".to_string(), "PVP".to_string(), "全球".to_string()],
            rating: 4.8,
            rating_count: 10000,
            player_count: 50000,
            max_players: 200000,
            version: "1.8-1.21".to_string(),
            icon_url: None,
            submitted_at: now,
            submitted_by: "Bonjour".to_string(),
            featured: true,
            online: true,
        },
        CommunityServer {
            id: "cs-2b2t".to_string(),
            name: "2b2t".to_string(),
            address: "2b2t.org".to_string(),
            port: 25565,
            description: "最古老的混乱生存服务器，无规则无限制".to_string(),
            tags: vec!["生存".to_string(), "无规则".to_string(), "硬核".to_string()],
            rating: 3.5,
            rating_count: 5000,
            player_count: 200,
            max_players: 500,
            version: "1.12-1.21".to_string(),
            icon_url: None,
            submitted_at: now,
            submitted_by: "Bonjour".to_string(),
            featured: true,
            online: true,
        },
        CommunityServer {
            id: "cs-mcbbs".to_string(),
            name: "MCBBS 服务器".to_string(),
            address: "play.mcbbs.net".to_string(),
            port: 25565,
            description: "MCBBS社区推荐服务器，中文玩家首选".to_string(),
            tags: vec!["生存".to_string(), "创造".to_string(), "中文".to_string()],
            rating: 4.2,
            rating_count: 2000,
            player_count: 500,
            max_players: 2000,
            version: "1.20-1.21".to_string(),
            icon_url: None,
            submitted_at: now,
            submitted_by: "Bonjour".to_string(),
            featured: true,
            online: true,
        },
        CommunityServer {
            id: "cs-catserver".to_string(),
            name: "CatServer".to_string(),
            address: "play.catserver.org".to_string(),
            port: 25565,
            description: "高性能CatServer端服务器，支持Forge模组".to_string(),
            tags: vec!["模组".to_string(), "Forge".to_string(), "高性能".to_string()],
            rating: 4.0,
            rating_count: 1500,
            player_count: 300,
            max_players: 1000,
            version: "1.12.2".to_string(),
            icon_url: None,
            submitted_at: now,
            submitted_by: "Bonjour".to_string(),
            featured: false,
            online: true,
        },
    ]
}

pub fn classify_mod_side(mod_file_name: &str) -> &'static str {
    let lower = mod_file_name.to_lowercase();
    let dual_side = ["jei", "rei", "emi", "jade", "lithium", "carpet",
        "sodium", "ferritecore", "modernfix", "indium"];
    let client_only = ["optifine", "iris", "phosphor", "betterfps",
        "fpsplus", "chunkanimator", "journeymap", "xaerominimap", "voxelmap",
        "neat", "waila", "hwyla", "appleskin", "shulkerboxtooltip", "minimap",
        "dynamic surroundings", "sound filters", "visual workbench"];
    let server_only = ["worldguard", "worldedit", "essentials", "luckperms", "vault",
        "coreprotect", "logblock", "griefprevention", "towny", "authme", "protocollib"];

    for pattern in &dual_side {
        if lower.contains(pattern) {
            return "both";
        }
    }
    for pattern in &client_only {
        if lower.contains(pattern) {
            return "client";
        }
    }
    for pattern in &server_only {
        if lower.contains(pattern) {
            return "server";
        }
    }
    "both"
}
