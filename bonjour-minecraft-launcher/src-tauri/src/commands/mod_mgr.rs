use crate::errors::{self, AppError};
use crate::models::instance::VersionInstance;
use crate::models::mod_info::*;
use tauri::Emitter;

// IMPL_LEVEL: L2 - scan_local_mods
#[tauri::command]
pub async fn scan_local_mods(mods_dir: String) -> Result<Vec<LocalMod>, AppError> {
    tauri::async_runtime::spawn_blocking(move || {
        let path = std::path::Path::new(&mods_dir);
        if !path.exists() { return Ok(Vec::new()); }
        let mut mods = Vec::new();
        if let Ok(entries) = std::fs::read_dir(path) {
            for entry in entries.flatten() {
                let file_path = entry.path();
                let name = file_path.file_name().unwrap_or_default().to_string_lossy().to_string();
                if name.ends_with(".jar") || name.ends_with(".jar.disabled") {
                    let is_enabled = name.ends_with(".jar");
                    let file_size = std::fs::metadata(&file_path).map(|m| m.len()).unwrap_or(0);
                    let sha256 = crate::services::compute::sha256_file_streaming(&file_path).ok();
                    let metadata = crate::services::jar_analyzer::analyze_jar(&file_path).ok();

                    let mod_id = metadata.as_ref().map(|m| m.mod_id.clone())
                        .filter(|id| !id.is_empty() && id != "unknown")
                        .unwrap_or_else(|| {
                            let stem = file_path.file_stem()
                                .unwrap_or_default().to_string_lossy();
                            stem.trim_end_matches(".disabled").to_string()
                        });

                    let display_name = metadata.as_ref()
                        .and_then(|m| if m.name.is_empty() || m.name == "Unknown Mod" { None } else { Some(m.name.clone()) })
                        .unwrap_or_else(|| name.trim_end_matches(".disabled").to_string());

                    let version = metadata.as_ref().and_then(|m| {
                        if m.version.is_empty() || m.version == "unknown" { None } else { Some(m.version.clone()) }
                    });
                    let mod_loader = metadata.as_ref().map(|m| m.mod_loader.clone());
                    let description = metadata.as_ref().and_then(|m| m.description.clone());
                    let _authors = metadata.as_ref().and_then(|m| m.authors.clone());
                    let _dependencies = metadata.as_ref().and_then(|m| m.dependencies.clone());
                    let _chinese_name = MOD_CHINESE_NAMES.get(&mod_id).cloned()
                        .or_else(|| MOD_CHINESE_NAMES.get(&mod_id.replace('_', "-")).cloned());

                    let install_date = file_path.metadata().ok()
                        .and_then(|m| m.modified().ok())
                        .and_then(|t| {
                            let dt: chrono::DateTime<chrono::Local> = t.into();
                            Some(dt.to_rfc3339())
                        });

                    let config_path = {
                        let config_dir = file_path.parent()
                            .and_then(|p| p.parent())
                            .map(|p| p.join("config"));
                        if let Some(dir) = config_dir {
                            if dir.exists() { Some(dir.to_string_lossy().to_string()) } else { None }
                        } else { None }
                    };

                    mods.push(LocalMod {
                        id: mod_id.clone(),
                        name: display_name,
                        file_name: name,
                        file_path: file_path.to_string_lossy().to_string(),
                        file_size,
                        is_enabled,
                        description,
                        version,
                        game_versions: None,
                        mod_loader,
                        mod_id: Some(mod_id.clone()),
                        sha256,
                        icon_url: None,
                        metadata,
                        install_date,
                        config_path,
                        source: None,
                        source_id: None,
                    });
                }
            }
        }
        Ok(mods)
    }).await.map_err(|e| errors::internal(e.to_string()))?
}

// IMPL_LEVEL: L2 - scan_instance_mods
#[tauri::command]
pub async fn scan_instance_mods(instance_id: String) -> Result<Vec<LocalMod>, AppError> {
    let instances_path = crate::utils::paths::instances_file();
    let instances: Vec<VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);
    let instance = instances.iter().find(|i| i.id == instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = crate::utils::paths::detect_game_root(&settings.game_dir);
    let mods_dir = std::path::Path::new(&game_dir).join("versions").join(&instance.game_version).join("mods");
    scan_local_mods(mods_dir.to_string_lossy().to_string()).await
}

// IMPL_LEVEL: L2 - add_mod_to_instance (was stub, now real)
#[tauri::command]
pub fn add_mod_to_instance(instance_id: String, source_path: String, file_name: Option<String>) -> Result<bool, AppError> {
    let instances_path = crate::utils::paths::instances_file();
    let instances: Vec<VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);
    let instance = instances.iter().find(|i| i.id == instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;
    let settings_path = crate::utils::paths::settings_file();
    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&settings_path);
    let game_dir = crate::utils::paths::detect_game_root(&settings.game_dir);
    let mods_dir = std::path::Path::new(&game_dir).join("versions").join(&instance.game_version).join("mods");

    std::fs::create_dir_all(&mods_dir)
        .map_err(|e| errors::file_write_error(&mods_dir, e.to_string()))?;

    let source = std::path::Path::new(&source_path);
    if !source.exists() {
        return Err(errors::mod_error(&source_path, "源文件不存在".to_string()));
    }

    let target_name = file_name.unwrap_or_else(|| {
        source.file_name().unwrap_or_default().to_string_lossy().to_string()
    });
    let target = mods_dir.join(&target_name);

    if target.exists() {
        return Err(errors::mod_error(&target_name, "目标位置已存在同名文件".to_string()));
    }

    std::fs::copy(source, &target)
        .map_err(|e| errors::file_write_error(&target, e.to_string()))?;

    Ok(true)
}

// IMPL_LEVEL: L2 - toggle_instance_mod
#[tauri::command]
pub fn toggle_instance_mod(instance_id: String, mod_path: String, enabled: bool) -> Result<bool, AppError> {
    let _ = instance_id;
    toggle_mod(mod_path, enabled)
}

// IMPL_LEVEL: L2 - toggle_mod
#[tauri::command]
pub fn toggle_mod(mod_path: String, enabled: bool) -> Result<bool, AppError> {
    let path = std::path::Path::new(&mod_path);
    let new_path = if enabled {
        path.with_extension("jar")
    } else {
        path.with_extension("jar.disabled")
    };
    if path.exists() && path != new_path {
        std::fs::rename(path, new_path).map_err(|e| errors::file_write_error(&mod_path, e.to_string()))?;
    }
    Ok(true)
}

// IMPL_LEVEL: L2 - delete_instance_mod
#[tauri::command]
pub fn delete_instance_mod(instance_id: String, mod_path: String) -> Result<bool, AppError> {
    let _ = instance_id;
    delete_mod(mod_path)
}

// IMPL_LEVEL: L2 - delete_mod
#[tauri::command]
pub fn delete_mod(mod_path: String) -> Result<bool, AppError> {
    if std::path::Path::new(&mod_path).exists() {
        std::fs::remove_file(&mod_path).map_err(|e| errors::mod_error(&mod_path, e.to_string()))?;
    }
    Ok(true)
}

// IMPL_LEVEL: L2 - check_mod_compatibility (was stub, now real)
#[tauri::command]
pub fn check_mod_compatibility(instance_id: String, mod_game_versions: Vec<String>, mod_loader: String) -> Result<serde_json::Value, AppError> {
    let instances_path = crate::utils::paths::instances_file();
    let instances: Vec<VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);
    let instance = instances.iter().find(|i| i.id == instance_id);

    let (instance_version, instance_loader) = if let Some(inst) = instance {
        (inst.game_version.clone(), inst.mod_loader.clone().unwrap_or_default())
    } else {
        return Ok(serde_json::json!({ "compatible": true, "versionMatch": true, "loaderMatch": true, "reason": "" }));
    };

    let version_match = mod_game_versions.is_empty() || mod_game_versions.contains(&instance_version);
    let loader_match = mod_loader == "unknown" || instance_loader == "unknown" ||
        mod_loader.to_lowercase() == instance_loader.to_lowercase() ||
        (mod_loader == "fabric" && instance_loader == "quilt") ||
        (mod_loader == "forge" && instance_loader == "neoforge");

    let compatible = version_match && loader_match;
    let mut reason = String::new();
    if !version_match {
        reason = format!("模组支持的游戏版本 ({}) 与实例版本 ({}) 不匹配", mod_game_versions.join(", "), instance_version);
    }
    if !loader_match {
        if !reason.is_empty() { reason.push_str("; "); }
        reason.push_str(&format!("模组加载器 ({}) 与实例加载器 ({}) 不兼容", mod_loader, instance_loader));
    }

    Ok(serde_json::json!({
        "compatible": compatible,
        "versionMatch": version_match,
        "loaderMatch": loader_match,
        "reason": reason
    }))
}

// IMPL_LEVEL: L2 - install_mod
#[tauri::command]
pub async fn install_mod(download_url: String, target_path: String, options: Option<serde_json::Value>) -> Result<(), AppError> {
    let net = crate::services::network::NetworkService::new();
    net.download_file(&download_url, &target_path).await?;

    if let Some(opts) = options {
        if let Some(expected_hash) = opts.get("expectedHash").and_then(|v| v.as_str()) {
            let actual_hash = crate::services::compute::sha256_file_streaming(std::path::Path::new(&target_path))?;
            if !actual_hash.eq_ignore_ascii_case(expected_hash) {
                let _ = std::fs::remove_file(&target_path);
                return Err(errors::hash_mismatch(&target_path, expected_hash, &actual_hash));
            }
        }
    }

    Ok(())
}

// IMPL_LEVEL: L2 - analyze_mod_jar
#[tauri::command]
pub async fn analyze_mod_jar(file_path: String) -> Result<serde_json::Value, AppError> {
    let path = file_path.clone();
    let metadata = tauri::async_runtime::spawn_blocking(move || {
        crate::services::jar_analyzer::analyze_jar(std::path::Path::new(&path))
    }).await.map_err(|e| errors::internal(e.to_string()))??;

    let security_path = file_path.clone();
    let security = tauri::async_runtime::spawn_blocking(move || {
        crate::services::jar_analyzer::scan_jar_security(std::path::Path::new(&security_path))
    }).await.map_err(|e| errors::internal(e.to_string()))?;

    let chinese_name = metadata.mod_id.as_str()
        .split_once('-').map(|(k, _)| MOD_CHINESE_NAMES.get(k)).flatten()
        .or_else(|| MOD_CHINESE_NAMES.get(&metadata.mod_id))
        .cloned();

    Ok(serde_json::json!({
        "fileName": std::path::Path::new(&file_path).file_name().unwrap_or_default().to_string_lossy(),
        "filePath": file_path,
        "metadata": metadata,
        "security": security,
        "chineseName": chinese_name,
    }))
}

// IMPL_LEVEL: L2 - compute_mod_hash
#[tauri::command]
pub async fn compute_mod_hash(file_path: String) -> Result<Option<String>, AppError> {
    let path = file_path.clone();
    let hash = tauri::async_runtime::spawn_blocking(move || {
        crate::services::compute::sha256_file_streaming(std::path::Path::new(&path))
    }).await.map_err(|e| errors::internal(e.to_string()))??;
    Ok(Some(hash))
}

// IMPL_LEVEL: L2 - get_mod_loader_versions
#[tauri::command]
pub async fn get_mod_loader_versions(game_version: String) -> Result<serde_json::Value, AppError> {
    let client = reqwest::Client::new();
    let bmclapi = "https://bmclapi2.bangbang93.com";

    let (forge_resp, fabric_resp, quilt_resp, neoforge_resp) = {
        let f1 = client.get(format!("{}/forge/minecraft/{}", bmclapi, game_version)).send();
        let f2 = client.get(format!("{}/fabric/meta/v2/versions/loader/{}", bmclapi, game_version)).send();
        let f3 = client.get(format!("{}/quilt/meta/v3/versions/loader/{}", bmclapi, game_version)).send();
        let f4 = client.get(format!("{}/neoforge/list/{}", bmclapi, game_version)).send();
        tokio::join!(f1, f2, f3, f4)
    };

    let forge: Vec<serde_json::Value> = match forge_resp {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => Vec::new(),
    };
    let fabric: Vec<serde_json::Value> = match fabric_resp {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => Vec::new(),
    };
    let quilt: Vec<serde_json::Value> = match quilt_resp {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => Vec::new(),
    };
    let neoforge: Vec<serde_json::Value> = match neoforge_resp {
        Ok(r) if r.status().is_success() => r.json().await.unwrap_or_default(),
        _ => Vec::new(),
    };

    Ok(serde_json::json!({ "forge": forge, "fabric": fabric, "quilt": quilt, "neoforge": neoforge }))
}

#[tauri::command]
pub async fn install_mod_loader(instance_id: String, loader_type: String, loader_version: String) -> Result<VersionInstance, AppError> {
    let instances_path = crate::utils::paths::instances_file();
    let mut instances: Vec<VersionInstance> = crate::services::file_manager::load_json_or_default(&instances_path);
    let result = {
        let instance = instances.iter_mut().find(|i| i.id == instance_id)
            .ok_or_else(|| errors::instance_not_found(&instance_id))?;
        instance.mod_loader = Some(loader_type.clone());
        instance.mod_loader_version = Some(loader_version.clone());
        instance.clone()
    };
    crate::services::file_manager::save_json(&instances_path, &instances)?;

    let settings: crate::models::settings::LauncherSettings = crate::services::file_manager::load_json_or_default(&crate::utils::paths::settings_file());
    let game_dir = std::path::PathBuf::from(crate::utils::paths::detect_game_root(&settings.game_dir));
    let version_id = &result.game_version;
    let version_dir = game_dir.join("versions").join(version_id);

    let client = reqwest::Client::builder()
        .timeout(std::time::Duration::from_secs(120))
        .build()
        .map_err(|e| errors::internal(e.to_string()))?;

    match loader_type.to_lowercase().as_str() {
        "forge" | "neoforge" | "fabric" | "quilt" => {
            let profile_url = match loader_type.to_lowercase().as_str() {
                "forge" => format!("https://bmclapi2.bangbang93.com/forge/minecraft/{}/forge-{}-{}.jar",
                    version_id, version_id, loader_version),
                "neoforge" => format!("https://bmclapi2.bangbang93.com/neoforge/minecraft/{}/neoforge-{}-{}.jar",
                    version_id, version_id, loader_version),
                "fabric" => format!("https://meta.fabricmc.net/v2/versions/loader/{}/{}/profile/json",
                    version_id, loader_version),
                "quilt" => format!("https://meta.quiltmc.org/v3/versions/loader/{}/{}/profile/json",
                    version_id, loader_version),
                _ => return Ok(result),
            };

            if let Ok(resp) = client.get(&profile_url).send().await {
                if resp.status().is_success() {
                    if loader_type.to_lowercase() == "fabric" || loader_type.to_lowercase() == "quilt" {
                        if let Ok(profile_json) = resp.json::<serde_json::Value>().await {
                            let loader_dir = version_dir.join(format!("{}-{}", loader_type.to_lowercase(), loader_version));
                            std::fs::create_dir_all(&loader_dir).ok();
                            let profile_path = loader_dir.join(format!("{}.json", loader_dir.file_name().unwrap_or_default().to_string_lossy()));
                            std::fs::write(&profile_path, serde_json::to_string_pretty(&profile_json).unwrap_or_default()).ok();
                        }
                    } else {
                        let loader_dir = version_dir.join(format!("{}-{}-{}", loader_type.to_lowercase(), version_id, loader_version));
                        std::fs::create_dir_all(&loader_dir).ok();
                        let jar_path = loader_dir.join(format!("{}-{}-{}.jar", loader_type.to_lowercase(), version_id, loader_version));
                        let bytes = resp.bytes().await.map_err(|e| errors::internal(e.to_string()))?;
                        std::fs::write(&jar_path, &bytes).ok();
                    }
                }
            }
        }
        _ => {}
    }

    Ok(result)
}

// ===== #41 全局模组搜索引擎 =====
// IMPL_LEVEL: L2 - search_mods_global
#[tauri::command]
pub async fn search_mods_global(
    query: String,
    game_version: Option<String>,
    mod_loader: Option<String>,
    category: Option<String>,
    sort_by: Option<String>,
    limit: Option<usize>,
    offset: Option<usize>,
) -> Result<ModSearchResult, AppError> {
    let start = std::time::Instant::now();
    let limit = limit.unwrap_or(20);
    let offset = offset.unwrap_or(0);

    let client = reqwest::Client::new();
    let modrinth_future = search_modrinth(&client, &query, game_version.as_deref(), mod_loader.as_deref(), category.as_deref(), sort_by.as_deref(), limit, offset);
    let curseforge_future = search_curseforge(&client, &query, game_version.as_deref(), mod_loader.as_deref(), category.as_deref(), sort_by.as_deref(), limit, offset);

    let (modrinth_result, curseforge_result) = tokio::join!(modrinth_future, curseforge_future);

    let mut all_mods = Vec::new();
    let modrinth_info;
    let curseforge_info;

    match modrinth_result {
        Ok((mods, total, latency)) => {
            modrinth_info = ModSourceInfo { total, latency_ms: latency, error: None };
            all_mods.extend(mods);
        }
        Err(e) => {
            modrinth_info = ModSourceInfo { total: 0, latency_ms: 0, error: Some(e) };
        }
    }

    match curseforge_result {
        Ok((mods, total, latency)) => {
            curseforge_info = ModSourceInfo { total, latency_ms: latency, error: None };
            all_mods.extend(mods);
        }
        Err(e) => {
            curseforge_info = ModSourceInfo { total: 0, latency_ms: 0, error: Some(e) };
        }
    }

    all_mods.sort_by(|a, b| {
        let a_score = compute_search_score(a, &query);
        let b_score = compute_search_score(b, &query);
        b_score.partial_cmp(&a_score).unwrap_or(std::cmp::Ordering::Equal)
    });

    let deduped = deduplicate_search_results(all_mods);
    let total = modrinth_info.total + curseforge_info.total;

    Ok(ModSearchResult {
        mods: deduped.into_iter().take(limit).collect(),
        total,
        sources: ModSearchSources {
            modrinth: modrinth_info,
            curseforge: curseforge_info,
        },
        search_time_ms: start.elapsed().as_millis() as u64,
    })
}

async fn search_modrinth(
    client: &reqwest::Client, query: &str, game_version: Option<&str>,
    mod_loader: Option<&str>, category: Option<&str>, sort_by: Option<&str>,
    limit: usize, offset: usize,
) -> Result<(Vec<ModSearchItem>, usize, u64), String> {
    let start = std::time::Instant::now();
    let mut facets = Vec::new();
    if let Some(gv) = game_version { facets.push(format!("versions:{}", gv)); }
    if let Some(ml) = mod_loader { facets.push(format!("categories:{}", ml)); }
    if let Some(cat) = category { facets.push(format!("categories:{}", cat)); }

    let sort_map = [("relevance", "relevance"), ("downloads", "downloads"), ("updated", "updated"), ("newest", "newest")];
    let sort = sort_by.and_then(|s| sort_map.iter().find(|(k, _)| k == &s).map(|(_, v)| *v)).unwrap_or("relevance");

    let mut params: Vec<(&str, String)> = vec![
        ("query", query.to_string()), ("limit", limit.to_string()),
        ("offset", offset.to_string()), ("index", sort.to_string()),
    ];
    if !facets.is_empty() {
        let facets_json = format!("[{}]", facets.iter().map(|f| format!("[\"{}\"]", f)).collect::<Vec<_>>().join(","));
        params.push(("facets", facets_json));
    }

    let resp = client.get("https://api.modrinth.com/v2/search")
        .header("User-Agent", "BonjourMinecraftLauncher/1.0.0")
        .query(&params)
        .send().await.map_err(|e| format!("Modrinth search failed: {}", e))?;

    if !resp.status().is_success() { return Err(format!("Modrinth API error: {}", resp.status())); }

    let data: serde_json::Value = resp.json().await.map_err(|e| format!("Modrinth parse error: {}", e))?;
    let latency = start.elapsed().as_millis() as u64;
    let total = data.get("total_hits").and_then(|v| v.as_u64()).unwrap_or(0) as usize;

    let hits = data.get("hits").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let mods: Vec<ModSearchItem> = hits.iter().filter_map(|hit| {
        let id = hit.get("project_id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        Some(ModSearchItem {
            id: id.clone(),
            name: hit.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            description: hit.get("description").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            icon_url: hit.get("icon_url").and_then(|v| v.as_str()).map(|s| s.to_string()),
            authors: hit.get("author").and_then(|v| v.as_str()).map(|s| vec![s.to_string()]),
            downloads: hit.get("downloads").and_then(|v| v.as_u64()),
            game_versions: hit.get("versions").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
            }),
            mod_loader: mod_loader.map(|s| s.to_string()),
            source: "modrinth".to_string(),
            source_id: id,
            project_url: Some(format!("https://modrinth.com/mod/{}", hit.get("slug").and_then(|v| v.as_str()).unwrap_or(""))),
            categories: hit.get("categories").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|v| v.as_str().map(|s| s.to_string())).collect()
            }),
            last_updated: hit.get("date_modified").and_then(|v| v.as_str()).map(|s| s.to_string()),
        })
    }).collect();

    Ok((mods, total, latency))
}

async fn search_curseforge(
    client: &reqwest::Client, query: &str, game_version: Option<&str>,
    mod_loader: Option<&str>, _category: Option<&str>, _sort_by: Option<&str>,
    limit: usize, offset: usize,
) -> Result<(Vec<ModSearchItem>, usize, u64), String> {
    let start = std::time::Instant::now();
    let api_key = std::env::var("CURSEFORGE_API_KEY").unwrap_or_default();
    if api_key.is_empty() { return Ok((Vec::new(), 0, 0)); }

    let loader_map: [(&str, i64); 4] = [("forge", 1), ("fabric", 4), ("quilt", 5), ("neoforge", 6)];
    let mut params: Vec<(&str, String)> = vec![
        ("gameId", "432".to_string()), ("searchFilter", query.to_string()),
        ("pageSize", limit.to_string()), ("index", offset.to_string()),
        ("sortField", "2".to_string()),
    ];
    if let Some(gv) = game_version { params.push(("gameVersion", gv.to_string())); }
    if let Some(ml) = mod_loader {
        if let Some(&id) = loader_map.iter().find(|(k, _)| *k == ml).map(|(_, v)| v) {
            params.push(("modLoaderType", id.to_string()));
        }
    }

    let resp = client.get("https://api.curseforge.com/v1/mods/search")
        .header("x-api-key", &api_key)
        .header("Accept", "application/json")
        .query(&params)
        .send().await.map_err(|e| format!("CurseForge search failed: {}", e))?;

    if !resp.status().is_success() { return Err(format!("CurseForge API error: {}", resp.status())); }

    let data: serde_json::Value = resp.json().await.map_err(|e| format!("CurseForge parse error: {}", e))?;
    let latency = start.elapsed().as_millis() as u64;
    let total = data.get("pagination").and_then(|p| p.get("totalCount")).and_then(|v| v.as_i64()).unwrap_or(0) as usize;

    let mods_data = data.get("data").and_then(|v| v.as_array()).cloned().unwrap_or_default();
    let mods: Vec<ModSearchItem> = mods_data.iter().filter_map(|m| {
        let id = m.get("id").and_then(|v| v.as_i64()).unwrap_or(0).to_string();
        let slug = m.get("slug").and_then(|v| v.as_str()).unwrap_or("");
        Some(ModSearchItem {
            id: id.clone(),
            name: m.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            description: m.get("summary").and_then(|v| v.as_str()).unwrap_or("").to_string(),
            icon_url: m.get("logo").and_then(|l| l.get("thumbnailUrl")).and_then(|v| v.as_str()).map(|s| s.to_string()),
            authors: m.get("authors").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|a| a.get("name").and_then(|v| v.as_str()).map(|s| s.to_string())).collect()
            }),
            downloads: m.get("downloadCount").and_then(|v| v.as_u64()),
            game_versions: m.get("latestFilesIndexes").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|f| f.get("gameVersion").and_then(|v| v.as_str()).map(|s| s.to_string())).collect()
            }),
            mod_loader: mod_loader.map(|s| s.to_string()),
            source: "curseforge".to_string(),
            source_id: id,
            project_url: Some(format!("https://www.curseforge.com/minecraft/mc-mods/{}", slug)),
            categories: m.get("categories").and_then(|v| v.as_array()).map(|arr| {
                arr.iter().filter_map(|c| c.get("name").and_then(|v| v.as_str()).map(|s| s.to_string())).collect()
            }),
            last_updated: m.get("dateModified").and_then(|v| v.as_i64()).and_then(|ts| {
                chrono::DateTime::from_timestamp(ts, 0).map(|dt| dt.to_rfc3339())
            }),
        })
    }).collect();

    Ok((mods, total, latency))
}

fn compute_search_score(item: &ModSearchItem, query: &str) -> f64 {
    let mut score = 0.0;
    let downloads = item.downloads.unwrap_or(0) as f64;
    score += downloads.log10().max(0.0) * 2.0;
    if !query.is_empty() {
        let q = query.to_lowercase();
        if item.name.to_lowercase().contains(&q) { score += 50.0; }
        if !item.description.is_empty() && item.description.to_lowercase().contains(&q) { score += 10.0; }
    }
    let id_norm = item.id.replace('_', "-");
    if let Some(rating) = MOD_PERFORMANCE_RATINGS.get(&item.id).or_else(|| MOD_PERFORMANCE_RATINGS.get(&id_norm)) {
        match rating.as_str() {
            "none" => score += 3.0,
            "low" => score += 1.0,
            _ => {}
        }
    }
    score
}

fn deduplicate_search_results(mods: Vec<ModSearchItem>) -> Vec<ModSearchItem> {
    let mut seen = std::collections::HashMap::new();
    let mut result = Vec::new();
    for m in mods {
        let key = m.id.to_lowercase().replace('_', "-");
        if let Some(&existing_downloads) = seen.get(&key) {
            if m.downloads.unwrap_or(0) > existing_downloads {
                if let Some(pos) = result.iter().position(|r: &ModSearchItem| r.id.to_lowercase().replace('_', "-") == key) {
                    result[pos] = m;
                }
            }
        } else {
            seen.insert(key, m.downloads.unwrap_or(0));
            result.push(m);
        }
    }
    result
}

// ===== #42 模组批量安装队列 =====
// IMPL_LEVEL: L2 - batch_install_mods
#[tauri::command]
pub async fn batch_install_mods(
    app: tauri::AppHandle,
    tasks: Vec<BatchInstallTask>,
) -> Result<Vec<BatchInstallTask>, AppError> {
    let mut results = tasks;
    let total = results.len();

    for (i, task) in results.iter_mut().enumerate() {
        if task.status == "conflict" { continue; }

        task.status = "downloading".to_string();
        task.progress = ((i as f64) / (total as f64) * 100.0).min(95.0);

        let _ = app.emit("batch-install-progress", serde_json::json!({
            "taskId": task.id, "status": task.status, "progress": task.progress,
            "current": i + 1, "total": total,
        }));

        let target = std::path::Path::new(&task.target_path);
        if let Some(parent) = target.parent() {
            let _ = std::fs::create_dir_all(parent);
        }

        match crate::services::network::NetworkService::new().download_file(&task.download_url, &task.target_path).await {
            Ok(()) => {
                if let Some(ref expected) = task.expected_hash {
                    match crate::services::compute::sha256_file_streaming(std::path::Path::new(&task.target_path)) {
                        Ok(actual) if actual.eq_ignore_ascii_case(expected) => {
                            task.status = "done".to_string();
                            task.progress = 100.0;
                        }
                        Ok(actual) => {
                            task.status = "error".to_string();
                            task.error = Some(format!("Hash mismatch: expected {}, got {}", expected, actual));
                            let _ = std::fs::remove_file(&task.target_path);
                        }
                        Err(e) => {
                            task.status = "error".to_string();
                            task.error = Some(format!("Hash verification failed: {}", e));
                        }
                    }
                } else {
                    task.status = "done".to_string();
                    task.progress = 100.0;
                }
            }
            Err(e) => {
                task.status = "error".to_string();
                task.error = Some(e.to_string());
            }
        }

        let _ = app.emit("batch-install-progress", serde_json::json!({
            "taskId": task.id, "status": task.status, "progress": task.progress,
            "current": i + 1, "total": total,
        }));
    }

    Ok(results)
}

// ===== #43 版本组合推荐 =====
// IMPL_LEVEL: L2 - get_mod_recommendations
#[tauri::command]
pub fn get_mod_recommendations(mod_ids: Vec<String>) -> Result<serde_json::Value, AppError> {
    let mut recommendations = std::collections::HashMap::new();
    for mod_id in &mod_ids {
        let id_norm = mod_id.replace('_', "-");
        if let Some(associations) = MOD_ASSOCIATIONS.get(mod_id).or_else(|| MOD_ASSOCIATIONS.get(&id_norm)) {
            let recs: Vec<serde_json::Value> = associations.iter()
                .filter(|(_, pct)| *pct >= 50)
                .map(|(assoc_id, pct)| {
                    let chinese_name = MOD_CHINESE_NAMES.get(assoc_id).cloned();
                    serde_json::json!({
                        "modId": assoc_id,
                        "name": chinese_name.unwrap_or_else(|| assoc_id.clone()),
                        "coInstallPercentage": pct,
                    })
                }).collect();
            recommendations.insert(mod_id.clone(), recs);
        }
    }
    Ok(serde_json::json!({ "recommendations": recommendations }))
}

// ===== #44 实时冲突检测沙箱 =====
// IMPL_LEVEL: L2 - check_mod_conflicts
#[tauri::command]
pub fn check_mod_conflicts(mods: Vec<serde_json::Value>) -> Result<Vec<ModConflict>, AppError> {
    let mut conflicts = Vec::new();

    for i in 0..mods.len() {
        for j in (i + 1)..mods.len() {
            let a = &mods[i];
            let b = &mods[j];

            let a_id = a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_lowercase().replace('_', "-");
            let b_id = b.get("id").and_then(|v| v.as_str()).unwrap_or("").to_lowercase().replace('_', "-");
            let a_name = a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
            let b_name = b.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();

            if a_id == b_id && !a_id.is_empty() {
                conflicts.push(ModConflict {
                    mod_a_id: a_id.clone(), mod_a_name: a_name.clone(),
                    mod_b_id: b_id.clone(), mod_b_name: b_name.clone(),
                    reason: format!("重复的模组 ID: {}", a_id),
                    severity: "error".to_string(), conflict_type: "id-conflict".to_string(),
                    detail: None, suggestion: Some("删除其中一个重复的模组".to_string()),
                });
            }

            let a_loader = a.get("modLoader").or_else(|| a.get("mod_loader")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();
            let b_loader = b.get("modLoader").or_else(|| b.get("mod_loader")).and_then(|v| v.as_str()).unwrap_or("").to_lowercase();

            if !a_loader.is_empty() && !b_loader.is_empty() && a_loader != "unknown" && b_loader != "unknown" {
                for &(l1, l2) in LOADER_INCOMPATIBLE_PAIRS.iter() {
                    if (a_loader == l1 && b_loader == l2) || (a_loader == l2 && b_loader == l1) {
                        conflicts.push(ModConflict {
                            mod_a_id: a_id.clone(), mod_a_name: a_name.clone(),
                            mod_b_id: b_id.clone(), mod_b_name: b_name.clone(),
                            reason: format!("{} 和 {} 模组不能混用", l1, l2),
                            severity: "error".to_string(), conflict_type: "loader-mismatch".to_string(),
                            detail: Some(format!("{} 是 {} 模组，{} 是 {} 模组", a_name, a_loader, b_name, b_loader)),
                            suggestion: Some("将它们分别放在不同的实例中".to_string()),
                        });
                    }
                }
            }

            for &(c1, c2, reason, conflict_type) in KNOWN_MOD_CONFLICTS.iter() {
                if (a_id.contains(c1) && b_id.contains(c2)) || (a_id.contains(c2) && b_id.contains(c1)) {
                    if !conflicts.iter().any(|c| c.reason == reason) {
                        conflicts.push(ModConflict {
                            mod_a_id: a_id.clone(), mod_a_name: a_name.clone(),
                            mod_b_id: b_id.clone(), mod_b_name: b_name.clone(),
                            reason: reason.to_string(),
                            severity: "warning".to_string(), conflict_type: conflict_type.to_string(),
                            detail: None, suggestion: Some("选择其中一个安装".to_string()),
                        });
                    }
                }
            }
        }
    }

    let mods_with_meta: Vec<&serde_json::Value> = mods.iter().filter(|m| m.get("metadata").is_some()).collect();
    for i in 0..mods_with_meta.len() {
        for j in (i + 1)..mods_with_meta.len() {
            let a = mods_with_meta[i];
            let b = mods_with_meta[j];
            let a_meta = a.get("metadata").unwrap();
            let b_meta = b.get("metadata").unwrap();

            let a_classes = a_meta.get("classEntries").and_then(|v| v.as_array());
            let b_classes = b_meta.get("classEntries").and_then(|v| v.as_array());

            if let (Some(a_cls), Some(b_cls)) = (a_classes, b_classes) {
                for &(cls1, cls2, reason) in KNOWN_CLASS_CONFLICTS.iter() {
                    let a_has = a_cls.iter().any(|c| c.as_str().map(|s| s.contains(cls1) || s.contains(cls2)).unwrap_or(false));
                    let b_has = b_cls.iter().any(|c| c.as_str().map(|s| s.contains(cls1) || s.contains(cls2)).unwrap_or(false));
                    if a_has && b_has {
                        let a_id = a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let b_id = b.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        conflicts.push(ModConflict {
                            mod_a_id: a_id.clone(), mod_a_name: a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            mod_b_id: b_id.clone(), mod_b_name: b.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            reason: reason.to_string(),
                            severity: "warning".to_string(), conflict_type: "class-conflict".to_string(),
                            detail: Some(format!("检测到类加载冲突: {}", cls1)),
                            suggestion: Some("选择其中一个安装或测试兼容性".to_string()),
                        });
                    }
                }
            }

            let a_mixins = a_meta.get("mixins").and_then(|v| v.as_array());
            let b_mixins = b_meta.get("mixins").and_then(|v| v.as_array());

            if let (Some(a_mix), Some(b_mix)) = (a_mixins, b_mixins) {
                for &(m1, m2, reason) in KNOWN_MIXIN_CONFLICTS.iter() {
                    let m1_key = m1.trim_end_matches(".json").split('.').nth(1).unwrap_or("");
                    let m2_key = m2.trim_end_matches(".json").split('.').nth(1).unwrap_or("");
                    let a_has = a_mix.iter().any(|m| m.as_str().map(|s| s.to_lowercase().contains(m1_key)).unwrap_or(false));
                    let b_has = b_mix.iter().any(|m| m.as_str().map(|s| s.to_lowercase().contains(m2_key)).unwrap_or(false));
                    if a_has && b_has {
                        let a_id = a.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        let b_id = b.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
                        conflicts.push(ModConflict {
                            mod_a_id: a_id.clone(), mod_a_name: a.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            mod_b_id: b_id.clone(), mod_b_name: b.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                            reason: reason.to_string(),
                            severity: "warning".to_string(), conflict_type: "mixin-conflict".to_string(),
                            detail: Some(format!("MixIn 冲突: {} vs {}", m1, m2)),
                            suggestion: Some("选择其中一个安装".to_string()),
                        });
                    }
                }
            }
        }
    }

    Ok(conflicts)
}

// ===== #45 模组更新策略控制 =====
// IMPL_LEVEL: L2 - check_mod_updates_rust
#[tauri::command]
pub async fn check_mod_updates_rust(
    mods: Vec<serde_json::Value>,
    game_version: String,
    mod_loader: String,
) -> Result<Vec<ModUpdateInfo>, AppError> {
    let client = reqwest::Client::new();
    let mut updates = Vec::new();

    for mod_info in &mods {
        let is_enabled = mod_info.get("isEnabled").and_then(|v| v.as_bool()).unwrap_or(true);
        if !is_enabled { continue; }

        let mod_id = match mod_info.get("modId").or_else(|| mod_info.get("mod_id")).and_then(|v| v.as_str()) {
            Some(id) if !id.is_empty() => id.to_string(),
            _ => continue,
        };
        let current_version = mod_info.get("version").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let mod_name = mod_info.get("name").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let source = mod_info.get("source").and_then(|v| v.as_str()).unwrap_or("modrinth").to_string();
        let source_id = mod_info.get("sourceId").or_else(|| mod_info.get("source_id")).and_then(|v| v.as_str()).unwrap_or(&mod_id).to_string();
        let strategy = mod_info.get("updateStrategy").and_then(|v| v.as_str()).unwrap_or("same-major").to_string();

        let latest_version = if source == "curseforge" {
            check_curseforge_update(&client, &source_id, &game_version, &mod_loader).await.ok()
        } else {
            check_modrinth_update(&client, &source_id, &game_version, &mod_loader).await.ok()
        };

        if let Some((latest_ver, download_url, file_size, changelog)) = latest_version {
            if latest_ver == current_version { continue; }

            let version_diff = compute_version_diff(&current_version, &latest_ver);
            let is_safe = is_update_safe(&current_version, &latest_ver, &strategy);
            let safety_level = compute_safety_level(&version_diff, &strategy);
            let chinese_name = MOD_CHINESE_NAMES.get(&mod_id).cloned();

            updates.push(ModUpdateInfo {
                mod_id: mod_id.clone(),
                mod_name: chinese_name.unwrap_or(mod_name),
                current_version,
                latest_version: latest_ver,
                update_strategy: strategy,
                is_safe_update: is_safe,
                safety_level,
                changelog,
                download_url,
                file_size,
                version_diff: Some(version_diff),
            });
        }
    }

    Ok(updates)
}

async fn check_modrinth_update(client: &reqwest::Client, mod_id: &str, game_version: &str, mod_loader: &str) -> Result<(String, Option<String>, Option<u64>, Option<String>), String> {
    let loader_map = [("forge", "forge"), ("fabric", "fabric"), ("quilt", "quilt"), ("neoforge", "neoforge")];
    let loader_name = loader_map.iter().find(|(k, _)| *k == mod_loader).map(|(_, v)| *v).unwrap_or("fabric");

    let params = vec![
        ("game_versions", format!("[\"{}\"]", game_version)),
        ("loaders", format!("[\"{}\"]", loader_name)),
    ];

    let resp = client.get(format!("https://api.modrinth.com/v2/project/{}/version", mod_id))
        .header("User-Agent", "BonjourMinecraftLauncher/1.0.0")
        .query(&params)
        .send().await.map_err(|e| format!("Modrinth version check failed: {}", e))?;

    if !resp.status().is_success() { return Err(format!("Modrinth API error: {}", resp.status())); }

    let versions: Vec<serde_json::Value> = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let release = versions.iter().find(|v| {
        v.get("version_type").and_then(|v| v.as_str()).unwrap_or("") == "release"
    }).or_else(|| versions.first());

    if let Some(ver) = release {
        let version_number = ver.get("version_number").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let download_url = ver.get("files").and_then(|f| f.as_array()).and_then(|files| {
            files.first().and_then(|f| f.get("url")).and_then(|u| u.as_str()).map(|s| s.to_string())
        });
        let file_size = ver.get("files").and_then(|f| f.as_array()).and_then(|files| {
            files.first().and_then(|f| f.get("size")).and_then(|s| s.as_u64())
        });
        let changelog = ver.get("changelog").and_then(|v| v.as_str()).map(|s| s.to_string());
        Ok((version_number, download_url, file_size, changelog))
    } else { Err("No versions found".to_string()) }
}

async fn check_curseforge_update(client: &reqwest::Client, mod_id: &str, game_version: &str, mod_loader: &str) -> Result<(String, Option<String>, Option<u64>, Option<String>), String> {
    let api_key = std::env::var("CURSEFORGE_API_KEY").unwrap_or_default();
    if api_key.is_empty() { return Err("CurseForge API key not configured".to_string()); }

    let loader_map: [(&str, i64); 4] = [("forge", 1), ("fabric", 4), ("quilt", 5), ("neoforge", 6)];
    let mut params = vec![];
    if !game_version.is_empty() { params.push(("gameVersion", game_version.to_string())); }
    if let Some(&loader_id) = loader_map.iter().find(|(k, _)| *k == mod_loader).map(|(_, v)| v) {
        params.push(("modLoaderType", loader_id.to_string()));
    }

    let resp = client.get(format!("https://api.curseforge.com/v1/mods/{}/files", mod_id))
        .header("x-api-key", &api_key).header("Accept", "application/json")
        .query(&params)
        .send().await.map_err(|e| format!("CurseForge version check failed: {}", e))?;

    if !resp.status().is_success() { return Err(format!("CurseForge API error: {}", resp.status())); }

    let data: serde_json::Value = resp.json().await.map_err(|e| format!("Parse error: {}", e))?;
    let files = data.get("data").and_then(|v| v.as_array()).cloned().unwrap_or_default();

    let release = files.iter().find(|f| f.get("releaseType").and_then(|v| v.as_i64()).unwrap_or(0) == 1).or_else(|| files.first());

    if let Some(file) = release {
        let version = file.get("displayName").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let download_url = file.get("downloadUrl").and_then(|v| v.as_str()).map(|s| s.to_string());
        let file_size = file.get("fileLength").and_then(|v| v.as_u64());
        Ok((version, download_url, file_size, None))
    } else { Err("No files found".to_string()) }
}

fn compute_version_diff(current: &str, target: &str) -> ModVersionDiff {
    let parse_ver = |v: &str| -> Vec<i32> { v.trim_start_matches('v').split('.').map(|p| p.parse::<i32>().unwrap_or(0)).collect() };
    let cur = parse_ver(current);
    let tgt = parse_ver(target);
    ModVersionDiff {
        major_changed: cur.first() != tgt.first(),
        minor_changed: cur.get(1) != tgt.get(1),
        patch_changed: cur.get(2) != tgt.get(2),
        is_downgrade: tgt.first() < cur.first() || (tgt.first() == cur.first() && tgt.get(1) < cur.get(1)),
        distance: (tgt.first().unwrap_or(&0) - cur.first().unwrap_or(&0)).abs() * 100 +
            (tgt.get(1).unwrap_or(&0) - cur.get(1).unwrap_or(&0)).abs() * 10 +
            (tgt.get(2).unwrap_or(&0) - cur.get(2).unwrap_or(&0)).abs(),
    }
}

fn is_update_safe(current: &str, new_version: &str, strategy: &str) -> bool {
    let diff = compute_version_diff(current, new_version);
    match strategy {
        "latest" => true,
        "safe" => !diff.major_changed && !diff.minor_changed && diff.patch_changed,
        "same-major" => !diff.major_changed,
        _ => true,
    }
}

fn compute_safety_level(diff: &ModVersionDiff, strategy: &str) -> String {
    if diff.is_downgrade { return "risky".to_string(); }
    if diff.major_changed { return "risky".to_string(); }
    if diff.minor_changed { return if strategy == "safe" { "caution".to_string() } else { "safe".to_string() }; }
    "safe".to_string()
}

// ===== #46 模组社区评价聚合 =====
#[tauri::command]
pub async fn aggregate_mod_ratings(mod_ids: Vec<String>) -> Result<Vec<ModRatingAggregation>, AppError> {
    let client = reqwest::Client::new();
    let mut ratings = Vec::new();

    for mod_id in &mod_ids {
        let id_norm = mod_id.replace('_', "-");
        let mut rating = ModRatingAggregation {
            mod_id: mod_id.clone(), score: 0.0,
            curseforge_score: None, modrinth_score: None, community_score: None,
            download_count: None, time_decay_score: None,
        };

        if let Ok(modrinth_data) = fetch_modrinth_rating(&client, &id_norm).await {
            rating.modrinth_score = modrinth_data.0;
            rating.download_count = modrinth_data.1.or(rating.download_count);
        }

        if let Ok(cf_data) = fetch_curseforge_rating(&client, mod_id).await {
            rating.curseforge_score = cf_data.0;
            rating.download_count = cf_data.1.or(rating.download_count);
        }

        let mut weights: Vec<(f64, f64)> = Vec::new();
        if let Some(cf) = rating.curseforge_score { weights.push((0.4, cf)); }
        if let Some(mr) = rating.modrinth_score { weights.push((0.4, mr)); }

        if !weights.is_empty() {
            let total_weight: f64 = weights.iter().map(|(w, _)| w).sum();
            let weighted_avg: f64 = weights.iter().map(|(w, s)| w * s).sum::<f64>() / total_weight;
            let download_factor = rating.download_count.map(|d| (d as f64).log10().max(0.0) / 9.0).unwrap_or(0.0).min(1.0);
            rating.score = (weighted_avg * 0.7 + download_factor * 0.3 * 5.0 * 10.0).round() / 10.0;
        }

        ratings.push(rating);
    }

    Ok(ratings)
}

async fn fetch_modrinth_rating(client: &reqwest::Client, mod_id: &str) -> Result<(Option<f64>, Option<u64>), AppError> {
    let resp = client.get(format!("https://api.modrinth.com/v2/project/{}", mod_id))
        .header("User-Agent", "BonjourMinecraftLauncher/1.0.0")
        .send().await.map_err(|e| errors::internal(e.to_string()))?;
    if !resp.status().is_success() { return Err(errors::internal(format!("Modrinth API error: {}", resp.status()))); }
    let data: serde_json::Value = resp.json().await.map_err(|e| errors::internal(e.to_string()))?;
    let downloads = data.get("downloads").and_then(|v| v.as_u64());
    let followers = data.get("followers").and_then(|v| v.as_u64()).unwrap_or(0);
    let score = downloads.map(|d| ((followers as f64 / d as f64) * 20.0).min(5.0).round());
    Ok((score, downloads))
}

async fn fetch_curseforge_rating(client: &reqwest::Client, mod_id: &str) -> Result<(Option<f64>, Option<u64>), AppError> {
    let api_key = std::env::var("CURSEFORGE_API_KEY").unwrap_or_default();
    if api_key.is_empty() { return Err(errors::internal("No API key".to_string())); }
    let resp = client.get(format!("https://api.curseforge.com/v1/mods/{}", mod_id))
        .header("x-api-key", &api_key).header("Accept", "application/json")
        .send().await.map_err(|e| errors::internal(e.to_string()))?;
    if !resp.status().is_success() { return Err(errors::internal(format!("CurseForge API error: {}", resp.status()))); }
    let data: serde_json::Value = resp.json().await.map_err(|e| errors::internal(e.to_string()))?;
    let download_count = data.get("data").and_then(|d| d.get("downloadCount")).and_then(|v| v.as_u64());
    let rating = data.get("data").and_then(|d| d.get("rating")).and_then(|v| v.as_f64());
    Ok((rating, download_count))
}

// ===== #47 性能影响评级 =====
// IMPL_LEVEL: L2 - get_mod_performance_ratings
#[tauri::command]
pub fn get_mod_performance_ratings(mod_ids: Vec<String>) -> Result<Vec<ModPerformanceRating>, AppError> {
    let mut results = Vec::new();
    for mod_id in &mod_ids {
        let id_norm = mod_id.replace('_', "-");
        let impact = MOD_PERFORMANCE_RATINGS.get(mod_id)
            .or_else(|| MOD_PERFORMANCE_RATINGS.get(&id_norm))
            .cloned().unwrap_or_else(|| "unknown".to_string());
        let (fps, startup, memory) = MOD_PERFORMANCE_DETAILS.get(mod_id)
            .or_else(|| MOD_PERFORMANCE_DETAILS.get(&id_norm))
            .cloned().unwrap_or((0, 0, 0));
        results.push(ModPerformanceRating {
            mod_id: mod_id.clone(), impact,
            fps_impact: Some(fps), startup_impact: Some(startup), memory_impact: Some(memory),
        });
    }
    Ok(results)
}

// IMPL_LEVEL: L2 - estimate_instance_performance
#[tauri::command]
pub fn estimate_instance_performance(mods: Vec<serde_json::Value>, total_memory_mb: u64) -> Result<serde_json::Value, AppError> {
    let mut fps_impact: i32 = 0;
    let mut startup_impact: i32 = 0;
    let mut memory_impact: i32 = 0;
    let mut max_risk = "none".to_string();
    let mut recommendations = Vec::new();
    let risk_order = ["none", "low", "medium", "high"];

    for m in &mods {
        let is_enabled = m.get("isEnabled").and_then(|v| v.as_bool()).unwrap_or(true);
        if !is_enabled { continue; }
        let mod_id = m.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string();
        let id_norm = mod_id.replace('_', "-");
        if let Some(&(fps, startup, mem)) = MOD_PERFORMANCE_DETAILS.get(&mod_id).or_else(|| MOD_PERFORMANCE_DETAILS.get(&id_norm)) {
            fps_impact += fps; startup_impact += startup; memory_impact += mem;
        }
        let impact = MOD_PERFORMANCE_RATINGS.get(&mod_id).or_else(|| MOD_PERFORMANCE_RATINGS.get(&id_norm))
            .cloned().unwrap_or_else(|| "none".to_string());
        let current_idx = risk_order.iter().position(|&r| r == impact).unwrap_or(0);
        let max_idx = risk_order.iter().position(|&r| r == max_risk).unwrap_or(0);
        if current_idx > max_idx { max_risk = impact; }
    }

    if memory_impact as u64 > total_memory_mb / 2 {
        recommendations.push("模组总内存占用超过系统内存的50%，建议减少模组数量或增加内存分配".to_string());
    }
    if fps_impact < -30 { recommendations.push("预计FPS影响较大，建议安装性能优化模组（Sodium/Lithium）".to_string()); }
    if startup_impact > 60 { recommendations.push("启动时间可能较长，建议安装 ModernFix/DashLoader".to_string()); }
    if max_risk == "high" { recommendations.push("包含高性能影响模组，建议降低渲染距离和关闭光影".to_string()); }

    Ok(serde_json::json!({
        "estimatedFPSImpact": fps_impact, "estimatedStartupImpact": startup_impact,
        "estimatedMemoryMB": memory_impact, "riskLevel": max_risk, "recommendations": recommendations,
    }))
}

// ===== #48 配置迁移工具 =====
#[tauri::command]
pub fn check_config_migration(mod_id: String, mod_name: String, old_version: String, new_version: String, config_path: String) -> Result<ConfigMigrationInfo, AppError> {
    let config_dir = std::path::Path::new(&config_path);
    let mut changes = Vec::new();

    let old_parts: Vec<i32> = old_version.trim_start_matches('v').split('.').map(|p| p.parse().unwrap_or(0)).collect();
    let new_parts: Vec<i32> = new_version.trim_start_matches('v').split('.').map(|p| p.parse().unwrap_or(0)).collect();
    let major_changed = old_parts.first() != new_parts.first();
    let minor_changed = old_parts.get(1) != new_parts.get(1);

    if major_changed {
        changes.push(ConfigChangeInfo {
            key: "*".to_string(), old_value: None, new_value: None,
            status: "changed-type".to_string(), new_key: None,
            migration_note: Some("大版本更新，配置文件格式可能已变更，建议重新配置".to_string()),
        });
    } else if minor_changed {
        changes.push(ConfigChangeInfo {
            key: "*".to_string(), old_value: None, new_value: None,
            status: "kept".to_string(), new_key: None,
            migration_note: Some("小版本更新，大部分配置应该兼容".to_string()),
        });
    }

    if config_dir.exists() && config_dir.is_dir() {
        if let Ok(entries) = std::fs::read_dir(config_dir) {
            for entry in entries.flatten() {
                let path = entry.path();
                let ext = path.extension().map(|e| e.to_string_lossy().to_string()).unwrap_or_default();
                if ext == "json" || ext == "toml" || ext == "cfg" || ext == "yaml" || ext == "yml" || ext == "properties" {
                    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
                    if let Ok(content) = std::fs::read_to_string(&path) {
                        let line_count = content.lines().count();
                        let key_count = match ext.as_str() {
                            "json" => content.matches(':').count(),
                            "toml" => content.matches('=').count(),
                            "cfg" => content.matches('=').count(),
                            "properties" => content.matches('=').count(),
                            "yaml" | "yml" => content.lines().filter(|l| l.contains(':') && !l.trim().starts_with('#')).count(),
                            _ => 0,
                        };
                        if major_changed {
                            changes.push(ConfigChangeInfo {
                                key: file_name, old_value: None, new_value: None,
                                status: "needs-review".to_string(), new_key: None,
                                migration_note: Some(format!("大版本更新，需检查此配置文件是否兼容（{}行/{}键）", line_count, key_count)),
                            });
                        } else if minor_changed {
                            changes.push(ConfigChangeInfo {
                                key: file_name, old_value: None, new_value: None,
                                status: "kept".to_string(), new_key: None,
                                migration_note: Some(format!("小版本更新，配置大概率兼容（{}行/{}键）", line_count, key_count)),
                            });
                        }
                    }
                }
            }
        }
    }

    Ok(ConfigMigrationInfo {
        mod_id, mod_name, old_version, new_version,
        old_config_path: config_path.clone(), new_config_path: config_path,
        changes, auto_migratable: !major_changed,
    })
}

// ===== #50 模组分享链接 =====
#[tauri::command]
pub fn generate_mod_share_info(
    mod_id: String, name: String, chinese_name: Option<String>,
    version: String, description: String, icon_url: Option<String>,
    source: String, download_url: Option<String>, project_url: Option<String>,
) -> Result<ModShareInfo, AppError> {
    let bonjour_url = format!("bonjour://mod/{}/{}", source, mod_id);
    let share_url = project_url.clone().unwrap_or_else(|| bonjour_url.clone());
    let qr_code_data = bonjour_url.clone();

    Ok(ModShareInfo {
        mod_id, name, chinese_name, version, description, icon_url, source,
        download_url, share_url: Some(share_url), qr_code_data: Some(qr_code_data),
    })
}

// ===== #51 多模组加载器共存 =====
// IMPL_LEVEL: L2 - detect_mod_loader_from_jar
#[tauri::command]
pub async fn detect_mod_loader_from_jar(file_path: String) -> Result<serde_json::Value, AppError> {
    let path = file_path.clone();
    let metadata = tauri::async_runtime::spawn_blocking(move || {
        crate::services::jar_analyzer::analyze_jar(std::path::Path::new(&path))
    }).await.map_err(|e| errors::internal(e.to_string()))??;

    Ok(serde_json::json!({
        "modId": metadata.mod_id,
        "modLoader": metadata.mod_loader,
        "version": metadata.version,
        "name": metadata.name,
    }))
}

// IMPL_LEVEL: L2 - get_mod_chinese_name
#[tauri::command]
pub fn get_mod_chinese_name(mod_id: String) -> Result<Option<String>, AppError> {
    let id_norm = mod_id.replace('_', "-");
    Ok(MOD_CHINESE_NAMES.get(&mod_id).or_else(|| MOD_CHINESE_NAMES.get(&id_norm)).cloned())
}

// IMPL_LEVEL: L2 - get_mod_associations
#[tauri::command]
pub fn get_mod_associations(mod_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let id_norm = mod_id.replace('_', "-");
    let associations = MOD_ASSOCIATIONS.get(&mod_id).or_else(|| MOD_ASSOCIATIONS.get(&id_norm));

    match associations {
        Some(assocs) => Ok(assocs.iter().map(|(id, pct)| {
            let chinese_name = MOD_CHINESE_NAMES.get(id).cloned();
            serde_json::json!({
                "modId": id,
                "name": chinese_name.unwrap_or_else(|| id.clone()),
                "coInstallPercentage": pct,
            })
        }).collect()),
        None => Ok(Vec::new()),
    }
}

// ===== #52 模组元数据云端增强 =====
#[tauri::command]
pub async fn enhance_mod_metadata(file_path: String) -> Result<ModEnhancedMetadata, AppError> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() { return Err(errors::mod_error(&file_path, "文件不存在".to_string())); }

    let fp = file_path.clone();
    let sha256 = tauri::async_runtime::spawn_blocking(move || {
        crate::services::compute::sha256_file_streaming(std::path::Path::new(&fp))
    }).await.map_err(|e| errors::internal(e.to_string()))??;

    let file_name = path.file_name().unwrap_or_default().to_string_lossy().to_string();

    let fp2 = file_path.clone();
    let jar_metadata = tauri::async_runtime::spawn_blocking(move || {
        crate::services::jar_analyzer::analyze_jar(std::path::Path::new(&fp2)).ok()
    }).await.map_err(|e| errors::internal(e.to_string()))?;

    let mod_id = jar_metadata.as_ref().map(|m| m.mod_id.clone()).unwrap_or_default();

    let client = reqwest::Client::new();

    let modrinth_match = if !mod_id.is_empty() {
        match try_modrinth_match(&client, &mod_id).await { Ok(m) => Some(m), Err(_) => None }
    } else { None };

    let curseforge_match = if !mod_id.is_empty() {
        match try_curseforge_fingerprint_match(&client, &sha256).await { Ok(m) => Some(m), Err(_) => None }
    } else { None };

    let merged_metadata = if let Some(ref mr_match) = modrinth_match {
        let mut merged = jar_metadata.clone().unwrap_or_else(|| ModJarMetadata {
            mod_id: mod_id.clone(), name: mr_match.name.clone(), version: String::new(),
            description: mr_match.description.clone(), authors: None,
            mod_loader: "unknown".to_string(), entry_class: None, mixins: None,
            dependencies: None, icon_path: None, license: None, homepage: None,
            source_url: None, issue_tracker_url: None, security_risk: None,
            sha256: Some(sha256.clone()), obfuscation_mappings: None, class_entries: None,
            network_access: false, file_access: false, reflection_access: false,
        });
        if merged.name.is_empty() || merged.name == "Unknown Mod" { merged.name = mr_match.name.clone(); }
        if merged.description.is_none() { merged.description = mr_match.description.clone(); }
        if merged.homepage.is_none() { merged.homepage = mr_match.project_url.clone(); }
        Some(merged)
    } else { jar_metadata };

    Ok(ModEnhancedMetadata {
        mod_id, file_name, sha256, curseforge_match, modrinth_match, merged_metadata,
    })
}

async fn try_modrinth_match(client: &reqwest::Client, mod_id: &str) -> Result<ModrinthMatch, AppError> {
    let resp = client.get(format!("https://api.modrinth.com/v2/project/{}", mod_id))
        .header("User-Agent", "BonjourMinecraftLauncher/1.0.0")
        .send().await.map_err(|e| errors::internal(e.to_string()))?;
    if !resp.status().is_success() { return Err(errors::internal(format!("Modrinth API error: {}", resp.status()))); }
    let data: serde_json::Value = resp.json().await.map_err(|e| errors::internal(e.to_string()))?;
    Ok(ModrinthMatch {
        id: data.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        name: data.get("title").and_then(|v| v.as_str()).unwrap_or("").to_string(),
        description: data.get("description").and_then(|v| v.as_str()).map(|s| s.to_string()),
        downloads: data.get("downloads").and_then(|v| v.as_u64()),
        icon_url: data.get("icon_url").and_then(|v| v.as_str()).map(|s| s.to_string()),
        project_url: Some(format!("https://modrinth.com/mod/{}", data.get("slug").and_then(|v| v.as_str()).unwrap_or(""))),
    })
}

async fn try_curseforge_fingerprint_match(client: &reqwest::Client, sha256_hash: &str) -> Result<CurseForgeMatch, AppError> {
    let api_key = std::env::var("CURSEFORGE_API_KEY").unwrap_or_default();
    if api_key.is_empty() { return Err(errors::internal("No API key".to_string())); }

    let fingerprint = sha256_hash.chars().take(16).fold(0u64, |acc, c| acc.wrapping_mul(31).wrapping_add(c as u64));

    let resp = client.post("https://api.curseforge.com/v1/fingerprints")
        .header("x-api-key", &api_key).header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "fingerprints": [fingerprint] }))
        .send().await.map_err(|e| errors::internal(e.to_string()))?;

    if !resp.status().is_success() { return Err(errors::internal(format!("CurseForge API error: {}", resp.status()))); }

    let data: serde_json::Value = resp.json().await.map_err(|e| errors::internal(e.to_string()))?;
    let matches = data.get("data").and_then(|d| d.get("exactMatches")).and_then(|m| m.as_array());

    if let Some(matches) = matches {
        if let Some(first_match) = matches.first() {
            return Ok(CurseForgeMatch {
                id: first_match.get("file").and_then(|f| f.get("modId")).and_then(|v| v.as_u64()).unwrap_or(0),
                name: first_match.get("file").and_then(|f| f.get("displayName")).and_then(|v| v.as_str()).unwrap_or("").to_string(),
                summary: None, download_count: None, rating: None,
            });
        }
    }

    Err(errors::internal("No match found".to_string()))
}
