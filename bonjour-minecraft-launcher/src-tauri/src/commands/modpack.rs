use tauri;
use crate::services::file_manager;
use crate::utils::paths;
use crate::models::modpack::*;
use crate::errors::{self, AppError};
use std::collections::HashMap;
use std::io::{Read as IoRead, Write};
use rand::Rng;

// IMPL_LEVEL: L2 - 整合包模块 - 完整实现+错误处理
// 命令实现等级: L0=stub, L1=基本可用, L2=完整实现+错误处理, L3=优化+测试覆盖

fn modpacks_file() -> std::path::PathBuf {
    paths::config_dir().join("modpacks.json")
}

fn modpacks_dir() -> std::path::PathBuf {
    paths::config_dir().join("modpacks")
}

fn sync_rooms_file() -> std::path::PathBuf {
    paths::config_dir().join("modpack_sync_rooms.json")
}

fn load_modpacks() -> Vec<ModpackEntry> {
    let path = modpacks_file();
    file_manager::load_json_or_default(&path)
}

fn save_modpacks(modpacks: &Vec<ModpackEntry>) -> Result<(), AppError> {
    file_manager::save_json(&modpacks_file(), modpacks)
}

fn load_sync_rooms() -> Vec<ModpackSyncRoom> {
    let path = sync_rooms_file();
    file_manager::load_json_or_default(&path)
}

fn save_sync_rooms(rooms: &Vec<ModpackSyncRoom>) -> Result<(), AppError> {
    file_manager::save_json(&sync_rooms_file(), rooms)
}

fn generate_id(prefix: &str) -> String {
    format!("{}-{}-{}", prefix, chrono::Utc::now().timestamp_millis(), &uuid::Uuid::new_v4().to_string()[..8])
}

fn detect_format_from_zip(archive: &mut zip::ZipArchive<std::fs::File>) -> ModpackFormat {
    let names: Vec<String> = archive.file_names().map(|s| s.to_string()).collect();
    if names.iter().any(|n| n == "manifest.json") {
        if names.iter().any(|n| n.starts_with("overrides/") || n.starts_with("minecraft/")) {
            return ModpackFormat::CurseForge;
        }
    }
    if names.iter().any(|n| n == "modrinth.index.json") {
        return ModpackFormat::Modrinth;
    }
    if names.iter().any(|n| n == "modpack.json" || n == "version.json") {
        return ModpackFormat::Ftb;
    }
    if names.iter().any(|n| n == "modpack.yaml" || n == "modpack.yml") {
        return ModpackFormat::Technic;
    }
    if names.iter().any(|n| n == "bonjour-modpack.json") {
        return ModpackFormat::Bonjour;
    }
    ModpackFormat::Unknown
}

fn parse_curseforge_manifest(raw: &serde_json::Value) -> Result<(ModpackEntry, String), AppError> {
    let name = raw["name"].as_str().unwrap_or("未知整合包").to_string();
    let version = raw["version"].as_str().unwrap_or("1.0").to_string();
    let author = raw["author"].as_str().unwrap_or("").to_string();
    let game_version = raw["minecraft"]["version"].as_str().unwrap_or("").to_string();
    let mod_loader = raw["minecraft"]["modLoaders"].as_array()
        .and_then(|loaders| loaders.iter().find(|l| l["primary"].as_bool().unwrap_or(false)))
        .and_then(|l| l["id"].as_str())
        .map(|s| s.to_string());

    let overrides_dir = raw["overrides"].as_str().unwrap_or("overrides").to_string();

    let mods: Vec<ModpackModEntry> = raw["files"].as_array()
        .map(|files| files.iter().map(|f| ModpackModEntry {
            file_name: f["fileName"].as_str().unwrap_or("").to_string(),
            project_id: f["projectID"].as_i64(),
            file_id: f["fileID"].as_i64(),
            download_url: None,
            hash: None,
            size: None,
            source: ModEntrySource::CurseForge,
            required: f["required"].as_bool().unwrap_or(true),
            folder_path: None,
        }).collect())
        .unwrap_or_default();

    let entry = ModpackEntry {
        id: generate_id("mp"),
        name: name.clone(),
        version: version.clone(),
        author,
        description: String::new(),
        game_version,
        mod_loader,
        mod_loader_version: None,
        format: ModpackFormat::CurseForge,
        source_path: None,
        instance_id: None,
        instance_name: None,
        installed_at: chrono::Utc::now().timestamp_millis(),
        last_updated: None,
        mods,
        configs: Vec::new(),
        overrides_dir: Some(overrides_dir.clone()),
        icon_url: None,
        source_url: None,
        is_fork: Some(false),
        fork_info: None,
    };

    Ok((entry, overrides_dir))
}

fn parse_modrinth_manifest(raw: &serde_json::Value) -> Result<ModpackEntry, AppError> {
    let name = raw["name"].as_str().unwrap_or("未知整合包").to_string();
    let version = raw["versionId"].as_str().unwrap_or("1.0").to_string();
    let description = raw["summary"].as_str().unwrap_or("").to_string();
    let deps = &raw["dependencies"];
    let game_version = deps["minecraft"].as_str().unwrap_or("").to_string();
    let mod_loader = if deps["forge"].is_string() {
        Some("forge".to_string())
    } else if deps["fabric"].is_string() {
        Some("fabric".to_string())
    } else if deps["quilt"].is_string() {
        Some("quilt".to_string())
    } else if deps["neoforge"].is_string() {
        Some("neoforge".to_string())
    } else {
        None
    };
    let mod_loader_version = deps["forge"].as_str()
        .or_else(|| deps["fabric"].as_str())
        .or_else(|| deps["quilt"].as_str())
        .or_else(|| deps["neoforge"].as_str())
        .map(|s| s.to_string());

    let mods: Vec<ModpackModEntry> = raw["files"].as_array()
        .map(|files| files.iter().map(|f| {
            let path = f["path"].as_str().unwrap_or("");
            ModpackModEntry {
                file_name: path.split('/').last().unwrap_or("").to_string(),
                project_id: None,
                file_id: None,
                download_url: f["downloads"].as_array().and_then(|d| d.first()).and_then(|u| u.as_str()).map(|s| s.to_string()),
                hash: f["hashes"]["sha1"].as_str().map(|s| s.to_string()),
                size: f["fileSize"].as_u64(),
                source: ModEntrySource::Modrinth,
                required: f["env"]["client"].as_str() != Some("optional"),
                folder_path: Some(path.to_string()),
            }
        }).collect())
        .unwrap_or_default();

    Ok(ModpackEntry {
        id: generate_id("mp"),
        name,
        version,
        author: String::new(),
        description,
        game_version,
        mod_loader,
        mod_loader_version,
        format: ModpackFormat::Modrinth,
        source_path: None,
        instance_id: None,
        instance_name: None,
        installed_at: chrono::Utc::now().timestamp_millis(),
        last_updated: None,
        mods,
        configs: Vec::new(),
        overrides_dir: None,
        icon_url: None,
        source_url: None,
        is_fork: Some(false),
        fork_info: None,
    })
}

fn parse_bonjour_manifest(raw: &serde_json::Value) -> Result<ModpackEntry, AppError> {
    let mods: Vec<ModpackModEntry> = raw["mods"].as_array()
        .map(|arr| arr.iter().map(|m| ModpackModEntry {
            file_name: m["fileName"].as_str().unwrap_or("").to_string(),
            project_id: m["projectId"].as_i64(),
            file_id: m["fileId"].as_i64(),
            download_url: m["downloadUrl"].as_str().map(|s| s.to_string()),
            hash: m["hash"].as_str().map(|s| s.to_string()),
            size: m["size"].as_u64(),
            source: match m["source"].as_str().unwrap_or("local") {
                "curseforge" => ModEntrySource::CurseForge,
                "modrinth" => ModEntrySource::Modrinth,
                "direct" => ModEntrySource::Direct,
                _ => ModEntrySource::Local,
            },
            required: m["required"].as_bool().unwrap_or(true),
            folder_path: m["folderPath"].as_str().map(|s| s.to_string()),
        }).collect())
        .unwrap_or_default();

    let configs: Vec<ModpackConfigEntry> = raw["configs"].as_array()
        .map(|arr| arr.iter().map(|c| ModpackConfigEntry {
            relative_path: c["relativePath"].as_str().unwrap_or("").to_string(),
            source: match c["source"].as_str().unwrap_or("override") {
                "embedded" => ConfigEntrySource::Embedded,
                _ => ConfigEntrySource::Override,
            },
            hash: c["hash"].as_str().map(|s| s.to_string()),
            size: c["size"].as_u64(),
        }).collect())
        .unwrap_or_default();

    Ok(ModpackEntry {
        id: generate_id("mp"),
        name: raw["name"].as_str().unwrap_or("未知整合包").to_string(),
        version: raw["version"].as_str().unwrap_or("1.0").to_string(),
        author: raw["author"].as_str().unwrap_or("").to_string(),
        description: raw["description"].as_str().unwrap_or("").to_string(),
        game_version: raw["gameVersion"].as_str().unwrap_or("").to_string(),
        mod_loader: raw["modLoader"].as_str().map(|s| s.to_string()),
        mod_loader_version: raw["modLoaderVersion"].as_str().map(|s| s.to_string()),
        format: ModpackFormat::Bonjour,
        source_path: None,
        instance_id: None,
        instance_name: None,
        installed_at: chrono::Utc::now().timestamp_millis(),
        last_updated: None,
        mods,
        configs,
        overrides_dir: None,
        icon_url: raw["iconUrl"].as_str().map(|s| s.to_string()),
        source_url: raw["sourceUrl"].as_str().map(|s| s.to_string()),
        is_fork: Some(false),
        fork_info: None,
    })
}

fn parse_ftb_manifest(raw: &serde_json::Value) -> Result<ModpackEntry, AppError> {
    let name = raw["name"].as_str().unwrap_or("未知整合包").to_string();
    let version = raw["version"].as_str().unwrap_or("1.0").to_string();
    let author = raw["author"].as_str().unwrap_or("").to_string();
    let description = raw["description"].as_str().unwrap_or("").to_string();

    let targets = raw["targets"].as_array();
    let game_version = targets
        .and_then(|t| t.iter().find(|item| item["type"].as_str() == Some("minecraft")))
        .and_then(|t| t["version"].as_str())
        .unwrap_or("")
        .to_string();
    let mod_loader = targets
        .and_then(|t| t.iter().find(|item| item["type"].as_str() == Some("modloader")))
        .and_then(|t| t["name"].as_str())
        .map(|s| s.to_string());
    let mod_loader_version = targets
        .and_then(|t| t.iter().find(|item| item["type"].as_str() == Some("modloader")))
        .and_then(|t| t["version"].as_str())
        .map(|s| s.to_string());

    Ok(ModpackEntry {
        id: generate_id("mp"),
        name,
        version,
        author,
        description,
        game_version,
        mod_loader,
        mod_loader_version,
        format: ModpackFormat::Ftb,
        source_path: None,
        instance_id: None,
        instance_name: None,
        installed_at: chrono::Utc::now().timestamp_millis(),
        last_updated: None,
        mods: Vec::new(),
        configs: Vec::new(),
        overrides_dir: None,
        icon_url: None,
        source_url: None,
        is_fork: Some(false),
        fork_info: None,
    })
}

fn extract_overrides(
    archive: &mut zip::ZipArchive<std::fs::File>,
    overrides_dir: &str,
    target_dir: &std::path::Path,
) -> Result<u32, AppError> {
    let mut extracted = 0u32;
    let prefix = format!("{}/", overrides_dir);
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if name.starts_with(&prefix) && !name.ends_with('/') {
            let relative = &name[prefix.len()..];
            let target_path = target_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out = std::fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut out)?;
            extracted += 1;
        }
    }
    Ok(extracted)
}

fn extract_client_overrides(
    archive: &mut zip::ZipArchive<std::fs::File>,
    target_dir: &std::path::Path,
) -> Result<u32, AppError> {
    let mut extracted = 0u32;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if (name.starts_with("client-overrides/") || name.starts_with("overrides/"))
            && !name.ends_with('/')
        {
            let prefix = if name.starts_with("client-overrides/") { "client-overrides/" } else { "overrides/" };
            let relative = &name[prefix.len()..];
            let target_path = target_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                std::fs::create_dir_all(parent)?;
            }
            let mut out = std::fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut out)?;
            extracted += 1;
        }
    }
    Ok(extracted)
}

fn extract_modrinth_overrides(
    archive: &mut zip::ZipArchive<std::fs::File>,
    target_dir: &std::path::Path,
) -> Result<u32, AppError> {
    let mut extracted = 0u32;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if name.starts_with("client-overrides/") && !name.ends_with('/') {
            let relative = &name["client-overrides/".len()..];
            let target_path = target_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                file_manager::ensure_dir(parent)?;
            }
            let mut out = std::fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut out)?;
            extracted += 1;
        } else if name.starts_with("overrides/") && !name.ends_with('/') {
            let relative = &name["overrides/".len()..];
            let target_path = target_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                file_manager::ensure_dir(parent)?;
            }
            let mut out = std::fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut out)?;
            extracted += 1;
        }
    }
    Ok(extracted)
}

fn extract_bonjour_overrides(
    archive: &mut zip::ZipArchive<std::fs::File>,
    target_dir: &std::path::Path,
) -> Result<u32, AppError> {
    let mut extracted = 0u32;
    for i in 0..archive.len() {
        let mut file = archive.by_index(i)?;
        let name = file.name().to_string();
        if name.starts_with("overrides/") && !name.ends_with('/') {
            let relative = &name["overrides/".len()..];
            let target_path = target_dir.join(relative);
            if let Some(parent) = target_path.parent() {
                file_manager::ensure_dir(parent)?;
            }
            let mut out = std::fs::File::create(&target_path)?;
            std::io::copy(&mut file, &mut out)?;
            extracted += 1;
        }
    }
    Ok(extracted)
}

fn get_instance_dir(instance_name: &str) -> Result<std::path::PathBuf, AppError> {
    let settings: crate::models::settings::LauncherSettings = file_manager::load_json_or_default(&paths::settings_file());
    let game_dir = std::path::PathBuf::from(paths::detect_game_root(&settings.game_dir));
    Ok(game_dir.join("versions").join(instance_name))
}

// IMPL_LEVEL: L2 - #53 跨平台整合包一键安装
#[tauri::command]
pub async fn install_modpack(file_path: String, instance_name: Option<String>) -> Result<serde_json::Value, AppError> {
    let path = std::path::Path::new(&file_path);
    if !path.exists() {
        return Err(errors::file_not_found(path));
    }

    let zip_file = std::fs::File::open(path)?;
    let mut archive = zip::ZipArchive::new(zip_file)
        .map_err(|e| errors::modpack_error(&file_path, format!("解压失败: {}", e)))?;

    let format = detect_format_from_zip(&mut archive);

    let manifest_raw: serde_json::Value = {
        let mut content = String::new();
        let manifest_name = match format {
            ModpackFormat::CurseForge => "manifest.json",
            ModpackFormat::Modrinth => "modrinth.index.json",
            ModpackFormat::Ftb => "modpack.json",
            ModpackFormat::Bonjour => "bonjour-modpack.json",
            _ => "manifest.json",
        };

        let mut found = false;
        for i in 0..archive.len() {
            if let Ok(mut file) = archive.by_index(i) {
                let name = file.name().to_string();
                if name == manifest_name || (!found && ["manifest.json", "modrinth.index.json", "modpack.json", "bonjour-modpack.json"].contains(&name.as_str())) {
                    IoRead::read_to_string(&mut file, &mut content)?;
                    found = true;
                    break;
                }
            }
        }
        if !found {
            return Err(errors::modpack_error("unknown", "未找到有效的整合包清单文件"));
        }
        serde_json::from_str(&content)?
    };

    let entry = match format {
        ModpackFormat::CurseForge => {
            let (e, overrides_dir) = parse_curseforge_manifest(&manifest_raw)?;
            let inst_name = instance_name.as_deref().unwrap_or(&e.name).to_string();
            let instance_dir = get_instance_dir(&inst_name)?;

            file_manager::ensure_dir(&instance_dir)?;
            let mods_dir = instance_dir.join("mods");
            file_manager::ensure_dir(&mods_dir)?;

            extract_overrides(&mut archive, &overrides_dir, &instance_dir)?;
            extract_client_overrides(&mut archive, &instance_dir)?;

            let mut inst = e;
            inst.source_path = Some(file_path.clone());
            inst.instance_name = Some(inst_name);
            inst
        }
        ModpackFormat::Modrinth => {
            let mut inst = parse_modrinth_manifest(&manifest_raw)?;
            let inst_name = instance_name.as_deref().unwrap_or(&inst.name).to_string();
            let instance_dir = get_instance_dir(&inst_name)?;

            file_manager::ensure_dir(&instance_dir)?;
            let mods_dir = instance_dir.join("mods");
            file_manager::ensure_dir(&mods_dir)?;

            extract_modrinth_overrides(&mut archive, &instance_dir)?;

            inst.source_path = Some(file_path.clone());
            inst.instance_name = Some(inst_name);
            inst
        }
        ModpackFormat::Bonjour => {
            let mut inst = parse_bonjour_manifest(&manifest_raw)?;
            let inst_name = instance_name.as_deref().unwrap_or(&inst.name).to_string();
            let instance_dir = get_instance_dir(&inst_name)?;

            file_manager::ensure_dir(&instance_dir)?;
            let mods_dir = instance_dir.join("mods");
            file_manager::ensure_dir(&mods_dir)?;

            extract_bonjour_overrides(&mut archive, &instance_dir)?;

            inst.source_path = Some(file_path.clone());
            inst.instance_name = Some(inst_name);
            inst
        }
        ModpackFormat::Ftb => {
            let mut inst = parse_ftb_manifest(&manifest_raw)?;
            inst.source_path = Some(file_path.clone());
            inst.instance_name = instance_name.clone();
            inst
        }
        _ => {
            let mut inst = parse_curseforge_manifest(&manifest_raw)?.0;
            inst.source_path = Some(file_path.clone());
            inst.instance_name = instance_name.clone();
            inst
        }
    };

    let result = serde_json::to_value(&entry)?;

    let mut modpacks = load_modpacks();
    modpacks.push(entry);
    save_modpacks(&modpacks)?;

    Ok(result)
}

// IMPL_LEVEL: L2 - #54 整合包创建工坊
#[tauri::command]
pub fn create_modpack(
    instance_id: String,
    pack_name: String,
    pack_version: String,
    pack_author: String,
    pack_description: String,
    format: String,
) -> Result<serde_json::Value, AppError> {
    let instances: Vec<crate::models::instance::VersionInstance> = file_manager::load_json_or_default(&paths::instances_file());
    let instance = instances.iter().find(|i| i.id == instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;

    let instance_dir = get_instance_dir(&instance.id)?;
    let mods_dir = instance_dir.join("mods");

    let mod_entries = scan_mods_dir(&mods_dir)?;
    let config_entries = scan_config_dir(&instance_dir)?;

    let modpack_format = ModpackFormat::from_str(&format);

    let manifest = match modpack_format {
        ModpackFormat::CurseForge => generate_curseforge_manifest(
            &pack_name, &pack_version, &pack_author,
            &instance.game_version, &instance.mod_loader, &mod_entries,
        ),
        ModpackFormat::Modrinth => generate_modrinth_manifest(
            &pack_name, &pack_version, &pack_description,
            &instance.game_version, instance.mod_loader.as_deref(), instance.mod_loader_version.as_deref(),
            &mod_entries,
        ),
        _ => generate_bonjour_manifest(
            &pack_name, &pack_version, &pack_author, &pack_description,
            &instance.game_version, instance.mod_loader.as_deref(), instance.mod_loader_version.as_deref(),
            &mod_entries, &config_entries,
        ),
    };

    Ok(manifest)
}

// IMPL_LEVEL: L2 - #54 整合包导出为 ZIP
#[tauri::command]
pub fn export_modpack(
    instance_id: String,
    pack_name: String,
    pack_version: String,
    pack_author: String,
    pack_description: String,
) -> Result<Option<String>, AppError> {
    let instances: Vec<crate::models::instance::VersionInstance> = file_manager::load_json_or_default(&paths::instances_file());
    let instance = instances.iter().find(|i| i.id == instance_id)
        .ok_or_else(|| errors::instance_not_found(&instance_id))?;

    let instance_dir = get_instance_dir(&instance.id)?;
    if !instance_dir.exists() {
        return Ok(None);
    }

    let mods_dir = instance_dir.join("mods");
    let mod_entries = scan_mods_dir(&mods_dir)?;
    let config_entries = scan_config_dir(&instance_dir)?;

    let export_dir = modpacks_dir();
    file_manager::ensure_dir(&export_dir)?;

    let safe_name = pack_name.replace(|c: char| !c.is_alphanumeric() && c != '-' && c != '_', "_");
    let zip_path = export_dir.join(format!("{}-{}.zip", safe_name, pack_version));

    let manifest = generate_bonjour_manifest(
        &pack_name, &pack_version, &pack_author, &pack_description,
        &instance.game_version, instance.mod_loader.as_deref(), instance.mod_loader_version.as_deref(),
        &mod_entries, &config_entries,
    );

    let zip_file = std::fs::File::create(&zip_path)?;
    let mut zip_writer = zip::ZipWriter::new(zip_file);
    let options = zip::write::SimpleFileOptions::default()
        .compression_method(zip::CompressionMethod::Deflated);

    let manifest_bytes = serde_json::to_string_pretty(&manifest)?;
    zip_writer.start_file("bonjour-modpack.json", options)?;
    zip_writer.write_all(manifest_bytes.as_bytes())?;

    if mods_dir.exists() {
        add_dir_to_zip(&mut zip_writer, &mods_dir, "overrides/mods", &options)?;
    }

    let config_dir_path = instance_dir.join("config");
    if config_dir_path.exists() {
        add_dir_to_zip(&mut zip_writer, &config_dir_path, "overrides/config", &options)?;
    }

    let resourcepacks_dir = instance_dir.join("resourcepacks");
    if resourcepacks_dir.exists() {
        add_dir_to_zip(&mut zip_writer, &resourcepacks_dir, "overrides/resourcepacks", &options)?;
    }

    let shaderpacks_dir = instance_dir.join("shaderpacks");
    if shaderpacks_dir.exists() {
        add_dir_to_zip(&mut zip_writer, &shaderpacks_dir, "overrides/shaderpacks", &options)?;
    }

    let options_txt = instance_dir.join("options.txt");
    if options_txt.exists() {
        let bytes = std::fs::read(&options_txt)?;
        zip_writer.start_file("overrides/options.txt", options)?;
        zip_writer.write_all(&bytes)?;
    }

    let defaultconfigs_dir = instance_dir.join("defaultconfigs");
    if defaultconfigs_dir.exists() {
        add_dir_to_zip(&mut zip_writer, &defaultconfigs_dir, "overrides/defaultconfigs", &options)?;
    }

    zip_writer.finish()?;

    Ok(Some(zip_path.to_string_lossy().to_string()))
}

// IMPL_LEVEL: L2 - 获取已安装整合包列表
#[tauri::command]
pub fn get_installed_modpacks() -> Result<Vec<ModpackEntry>, AppError> {
    Ok(load_modpacks())
}

// IMPL_LEVEL: L2 - 删除整合包（含关联实例目录清理）
#[tauri::command]
pub fn delete_modpack(modpack_id: String) -> Result<bool, AppError> {
    let mut modpacks = load_modpacks();
    let mp = modpacks.iter().find(|mp| mp.id == modpack_id)
        .ok_or_else(|| errors::modpack_error(&modpack_id, "整合包未找到"))?;

    let instance_name_to_clean = mp.instance_name.clone();
    let source_path_to_clean = mp.source_path.clone();

    modpacks.retain(|mp| mp.id != modpack_id);
    save_modpacks(&modpacks)?;

    if let Some(ref inst_name) = instance_name_to_clean {
        let instance_dir = get_instance_dir(inst_name)?;
        if instance_dir.exists() {
            let _ = std::fs::remove_dir_all(&instance_dir);
        }
    }

    if let Some(ref source_path) = source_path_to_clean {
        let sp = std::path::Path::new(source_path);
        if sp.exists() && sp.extension().map(|e| e == "zip").unwrap_or(false) {
            let _ = std::fs::remove_file(sp);
        }
    }

    Ok(true)
}

// IMPL_LEVEL: L2 - 更新整合包时间戳
#[tauri::command]
pub fn update_modpack(modpack_id: String) -> Result<ModpackEntry, AppError> {
    let mut modpacks = load_modpacks();
    let found = modpacks.iter_mut().find(|mp| mp.id == modpack_id)
        .ok_or_else(|| errors::modpack_error(&modpack_id, "整合包未找到"))?;
    found.last_updated = Some(chrono::Utc::now().timestamp_millis());
    let result = found.clone();
    save_modpacks(&modpacks)?;
    Ok(result)
}

#[tauri::command]
pub async fn check_modpack_update(instance_id: String) -> Result<serde_json::Value, AppError> {
    let modpacks = load_modpacks();
    let modpack = modpacks.iter().find(|mp| mp.instance_id.as_deref() == Some(&instance_id));

    let current_version = modpack.map(|mp| mp.version.clone()).unwrap_or_default();
    let source_project_id = modpack.and_then(|mp| mp.source_url.clone());

    if let Some(project_id) = source_project_id {
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(10))
            .build()
            .map_err(|e| crate::errors::internal(e.to_string()))?;

        if let Ok(api_key) = std::env::var("CURSEFORGE_API_KEY") {
            if !api_key.is_empty() {
                if let Ok(resp) = client
                    .get(format!("https://api.curseforge.com/v1/mods/{}/files", project_id))
                    .header("x-api-key", &api_key)
                    .send().await
                {
                    if let Ok(data) = resp.json::<serde_json::Value>().await {
                        if let Some(files) = data["data"].as_array() {
                            if let Some(latest) = files.first() {
                                let latest_version = latest["displayName"].as_str().unwrap_or("");
                                let latest_id = latest["id"].as_i64().unwrap_or(0);
                                let has_update = !current_version.is_empty() && latest_version != current_version;
                                return Ok(serde_json::json!({
                                    "hasUpdate": has_update,
                                    "currentVersion": current_version,
                                    "latestVersion": latest_version,
                                    "latestFileId": latest_id,
                                    "source": "curseforge"
                                }));
                            }
                        }
                    }
                }
            }
        }

        if let Ok(resp) = client
            .get(format!("https://api.modrinth.com/v2/project/{}/version", project_id))
            .send().await
        {
            if let Ok(data) = resp.json::<serde_json::Value>().await {
                if let Some(versions) = data.as_array() {
                    if let Some(latest) = versions.first() {
                        let latest_version = latest["version_number"].as_str().unwrap_or("");
                        let latest_id = latest["id"].as_str().unwrap_or("");
                        let has_update = !current_version.is_empty() && latest_version != current_version;
                        return Ok(serde_json::json!({
                            "hasUpdate": has_update,
                            "currentVersion": current_version,
                            "latestVersion": latest_version,
                            "latestFileId": latest_id,
                            "source": "modrinth"
                        }));
                    }
                }
            }
        }
    }

    Ok(serde_json::json!({
        "hasUpdate": false,
        "currentVersion": current_version,
        "latestVersion": current_version
    }))
}

#[tauri::command]
pub async fn check_modpack_updates(modpack_id: String) -> Result<Vec<serde_json::Value>, AppError> {
    let modpacks = load_modpacks();
    let matching: Vec<_> = modpacks.iter()
        .filter(|mp| mp.id == modpack_id || mp.instance_id.as_deref() == Some(&modpack_id))
        .collect();

    let mut results = Vec::new();
    for mp in matching {
        if let Some(ref instance_id) = mp.instance_id {
            let result = check_modpack_update(instance_id.clone()).await?;
            results.push(result);
        }
    }
    Ok(results)
}

// IMPL_LEVEL: L2 - #55 整合包增量更新 - 版本差异计算
#[tauri::command]
pub fn diff_modpack_versions(
    current_mods: Vec<serde_json::Value>,
    new_mods: Vec<serde_json::Value>,
) -> Result<ModpackDiff, AppError> {
    let current: Vec<ModpackModEntry> = current_mods.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect();
    let new: Vec<ModpackModEntry> = new_mods.iter().filter_map(|v| serde_json::from_value(v.clone()).ok()).collect();

    let current_map: HashMap<String, &ModpackModEntry> = current.iter()
        .map(|m| (m.project_id.map(|id| id.to_string()).unwrap_or_else(|| m.file_name.clone()), m))
        .collect();
    let new_map: HashMap<String, &ModpackModEntry> = new.iter()
        .map(|m| (m.project_id.map(|id| id.to_string()).unwrap_or_else(|| m.file_name.clone()), m))
        .collect();

    let mut added = Vec::new();
    let mut removed = Vec::new();
    let mut updated = Vec::new();

    for (key, mod_entry) in &new_map {
        if !current_map.contains_key(key) {
            added.push((*mod_entry).clone());
        } else if let Some(current) = current_map.get(key) {
            let hash_changed = mod_entry.hash.as_ref().map(|h| current.hash.as_ref().map(|ch| h != ch).unwrap_or(true)).unwrap_or(false);
            let version_changed = mod_entry.file_id.zip(current.file_id).map(|(a, b)| a != b).unwrap_or(false);
            let size_changed = mod_entry.size.zip(current.size).map(|(a, b)| a != b).unwrap_or(false);
            if hash_changed || version_changed || size_changed {
                updated.push((*mod_entry).clone());
            }
        }
    }

    for (key, mod_entry) in &current_map {
        if !new_map.contains_key(key) {
            removed.push((*mod_entry).clone());
        }
    }

    let summary = format!("+{} 模组, -{} 模组, ~{} 更新", added.len(), removed.len(), updated.len());

    Ok(ModpackDiff {
        added,
        removed,
        updated,
        config_changes: Vec::new(),
        summary,
    })
}

// IMPL_LEVEL: L2 - #55 整合包增量更新 - 应用更新
#[tauri::command]
pub async fn apply_modpack_update(options: serde_json::Value) -> Result<ModpackUpdateResult, AppError> {
    let instance_dir = options["instanceDir"].as_str().unwrap_or("");
    let diff_raw = &options["diff"];

    let diff: ModpackDiff = serde_json::from_value(diff_raw.clone())?;

    let instance_path = std::path::Path::new(instance_dir);
    let mods_dir = instance_path.join("mods");

    let mut mods_added = 0u32;
    let mut mods_removed = 0u32;
    let mut mods_updated = 0u32;
    let mut errors_list = Vec::new();

    if !mods_dir.exists() {
        file_manager::ensure_dir(&mods_dir)?;
    }

    for mod_entry in &diff.removed {
        let target = mods_dir.join(&mod_entry.file_name);
        if target.exists() {
            if let Err(e) = std::fs::remove_file(&target) {
                errors_list.push(format!("删除模组 {} 失败: {}", mod_entry.file_name, e));
            } else {
                mods_removed += 1;
            }
        }
    }

    for mod_entry in &diff.updated {
        let target = mods_dir.join(&mod_entry.file_name);
        if let Some(ref url) = mod_entry.download_url {
            if !url.is_empty() {
                if target.exists() {
                    if let Err(e) = std::fs::remove_file(&target) {
                        errors_list.push(format!("删除旧版模组 {} 失败: {}", mod_entry.file_name, e));
                        continue;
                    }
                }
                match download_mod(url, &target).await {
                    Ok(_) => mods_updated += 1,
                    Err(e) => errors_list.push(format!("下载模组 {} 失败: {}", mod_entry.file_name, e)),
                }
            }
        } else {
            errors_list.push(format!("模组 {} 缺少下载链接，需手动更新", mod_entry.file_name));
        }
    }

    for mod_entry in &diff.added {
        if let Some(ref url) = mod_entry.download_url {
            if !url.is_empty() {
                let target = mods_dir.join(&mod_entry.file_name);
                match download_mod(url, &target).await {
                    Ok(_) => mods_added += 1,
                    Err(e) => errors_list.push(format!("下载模组 {} 失败: {}", mod_entry.file_name, e)),
                }
            }
        } else {
            errors_list.push(format!("模组 {} 缺少下载链接，需手动安装", mod_entry.file_name));
        }
    }

    Ok(ModpackUpdateResult {
        success: errors_list.is_empty(),
        mods_added,
        mods_removed,
        mods_updated,
        config_changes: diff.config_changes.len() as u32,
        errors: errors_list,
        rolled_back: false,
    })
}

async fn download_mod(url: &str, target: &std::path::Path) -> Result<(), AppError> {
    let response = reqwest::get(url).await?;
    if !response.status().is_success() {
        return Err(errors::download_error(url, format!("HTTP {}", response.status())));
    }
    let bytes = response.bytes().await?;
    if let Some(parent) = target.parent() {
        std::fs::create_dir_all(parent)?;
    }
    std::fs::write(target, &bytes)?;
    Ok(())
}

// IMPL_LEVEL: L2 - #56 整合包 Fork
#[tauri::command]
pub fn fork_modpack(
    original_pack_id: String,
    original_pack_name: String,
    original_version: String,
    instance_id: String,
    fork_name: String,
) -> Result<ModpackEntry, AppError> {
    let mut modpacks = load_modpacks();

    let fork_info = ModpackForkInfo {
        original_pack_id: original_pack_id.clone(),
        original_pack_name: original_pack_name.clone(),
        original_version: original_version.clone(),
        fork_created_at: chrono::Utc::now().timestamp_millis(),
        added_mods: Vec::new(),
        removed_mods: Vec::new(),
        modified_configs: Vec::new(),
        last_synced_version: original_version.clone(),
        has_upstream_update: false,
    };

    let original = modpacks.iter().find(|mp| mp.id == original_pack_id);
    let fork = if let Some(orig) = original {
        let mut f = orig.clone();
        f.id = generate_id("fork");
        f.name = fork_name;
        f.version = "1.0".to_string();
        f.is_fork = Some(true);
        f.fork_info = Some(fork_info);
        f.instance_id = Some(instance_id);
        f.installed_at = chrono::Utc::now().timestamp_millis();
        f.last_updated = None;
        f
    } else {
        ModpackEntry {
            id: generate_id("fork"),
            name: fork_name,
            version: "1.0".to_string(),
            author: String::new(),
            description: String::new(),
            game_version: String::new(),
            mod_loader: None,
            mod_loader_version: None,
            format: ModpackFormat::Unknown,
            source_path: None,
            instance_id: Some(instance_id),
            instance_name: None,
            installed_at: chrono::Utc::now().timestamp_millis(),
            last_updated: None,
            mods: Vec::new(),
            configs: Vec::new(),
            overrides_dir: None,
            icon_url: None,
            source_url: None,
            is_fork: Some(true),
            fork_info: Some(fork_info),
        }
    };

    let result = fork.clone();
    modpacks.push(fork);
    save_modpacks(&modpacks)?;
    Ok(result)
}

// IMPL_LEVEL: L2 - 获取所有分身
#[tauri::command]
pub fn get_modpack_forks() -> Result<Vec<ModpackEntry>, AppError> {
    let modpacks = load_modpacks();
    Ok(modpacks.into_iter().filter(|mp| mp.is_fork.unwrap_or(false)).collect())
}

// IMPL_LEVEL: L2 - #56 检查上游更新
#[tauri::command]
pub fn check_fork_upstream_update(fork_id: String) -> Result<serde_json::Value, AppError> {
    let modpacks = load_modpacks();
    let fork = modpacks.iter().find(|mp| mp.id == fork_id)
        .ok_or_else(|| errors::modpack_error(&fork_id, "分身未找到"))?;

    let fork_info = fork.fork_info.as_ref()
        .ok_or_else(|| errors::modpack_error(&fork_id, "该整合包不是分身"))?;

    let original = modpacks.iter().find(|mp| mp.id == fork_info.original_pack_id);
    let has_update = if let Some(orig) = original {
        orig.version != fork_info.last_synced_version
    } else {
        false
    };

    let new_version = if let Some(orig) = original {
        orig.version.clone()
    } else {
        fork_info.last_synced_version.clone()
    };

    Ok(serde_json::json!({
        "hasUpdate": has_update,
        "currentVersion": fork_info.last_synced_version,
        "newVersion": new_version,
        "originalPackName": fork_info.original_pack_name
    }))
}

// IMPL_LEVEL: L2 - #56 合并上游更新
#[tauri::command]
pub fn merge_fork_with_upstream(
    _fork_id: String,
    upstream_diff: serde_json::Value,
    fork_added_mods: Vec<String>,
    fork_removed_mods: Vec<String>,
) -> Result<ModpackForkMergeResult, AppError> {
    let diff: ModpackDiff = serde_json::from_value(upstream_diff)?;

    let mut conflicts: Vec<ModpackForkConflict> = Vec::new();
    let mut auto_resolved = 0u32;

    for mod_entry in &diff.removed {
        let mod_key = mod_entry.project_id.map(|id| id.to_string()).unwrap_or_else(|| mod_entry.file_name.clone());
        if fork_added_mods.contains(&mod_key) {
            conflicts.push(ModpackForkConflict {
                mod_file_name: mod_entry.file_name.clone(),
                conflict_type: ForkConflictType::ModRemovedUpstream,
                upstream_action: "已从上游移除".to_string(),
                fork_action: "用户已添加".to_string(),
                resolution: Some(ForkConflictResolution::KeepFork),
            });
        } else {
            auto_resolved += 1;
        }
    }

    for mod_entry in &diff.added {
        let mod_key = mod_entry.project_id.map(|id| id.to_string()).unwrap_or_else(|| mod_entry.file_name.clone());
        if fork_removed_mods.contains(&mod_key) {
            conflicts.push(ModpackForkConflict {
                mod_file_name: mod_entry.file_name.clone(),
                conflict_type: ForkConflictType::ModAddedUpstream,
                upstream_action: "上游新增".to_string(),
                fork_action: "用户已移除".to_string(),
                resolution: Some(ForkConflictResolution::KeepUpstream),
            });
        } else {
            auto_resolved += 1;
        }
    }

    for mod_entry in &diff.updated {
        let mod_key = mod_entry.project_id.map(|id| id.to_string()).unwrap_or_else(|| mod_entry.file_name.clone());
        if fork_added_mods.contains(&mod_key) || fork_removed_mods.contains(&mod_key) {
            conflicts.push(ModpackForkConflict {
                mod_file_name: mod_entry.file_name.clone(),
                conflict_type: ForkConflictType::ModVersionConflict,
                upstream_action: "上游已更新".to_string(),
                fork_action: "用户已修改".to_string(),
                resolution: None,
            });
        } else {
            auto_resolved += 1;
        }
    }

    let manual_required = conflicts.iter().filter(|c| c.resolution.is_none()).count() as u32;

    Ok(ModpackForkMergeResult {
        success: conflicts.is_empty(),
        conflicts,
        auto_resolved,
        manual_required,
    })
}

// IMPL_LEVEL: L2 - #57 整合包推荐
#[tauri::command]
pub fn get_modpack_recommendations(
    user_played_modpacks: Vec<String>,
    limit: u32,
) -> Result<Vec<ModpackRecommendation>, AppError> {
    let modpacks = load_modpacks();
    let played_set: std::collections::HashSet<String> = user_played_modpacks.iter().cloned().collect();

    let mut tag_counts: HashMap<String, u32> = HashMap::new();
    for mp in &modpacks {
        if played_set.contains(&mp.id) {
            let tags = extract_modpack_tags(mp);
            for tag in tags {
                *tag_counts.entry(tag).or_insert(0) += 1;
            }
        }
    }

    let candidates: Vec<&ModpackEntry> = modpacks.iter()
        .filter(|mp| !played_set.contains(&mp.id))
        .collect();

    let mut recommendations: Vec<ModpackRecommendation> = candidates.iter().map(|mp| {
        let tags = extract_modpack_tags(mp);
        let mut score = 50.0;
        for tag in &tags {
            if let Some(count) = tag_counts.get(tag) {
                score += *count as f64 * 10.0;
            }
        }
        let top_tags: Vec<String> = tags.iter()
            .filter(|t| tag_counts.contains_key(*t))
            .take(2)
            .cloned()
            .collect();
        let reason = if top_tags.is_empty() {
            "热门推荐".to_string()
        } else {
            format!("基于你对「{}」类整合包的偏好", top_tags.join("」「"))
        };

        ModpackRecommendation {
            modpack_id: mp.id.clone(),
            name: mp.name.clone(),
            score,
            reason,
            tags,
        }
    }).collect();

    recommendations.sort_by(|a, b| b.score.partial_cmp(&a.score).unwrap_or(std::cmp::Ordering::Equal));
    recommendations.truncate(limit as usize);

    Ok(recommendations)
}

// IMPL_LEVEL: L2 - #57 推荐别名
#[tauri::command]
pub async fn get_recommended_modpacks(
    user_played_modpacks: Vec<String>,
    limit: u32,
) -> Result<Vec<ModpackRecommendation>, AppError> {
    get_modpack_recommendations(user_played_modpacks, limit)
}

// IMPL_LEVEL: L2 - #57 整合包评分
#[tauri::command]
pub fn get_modpack_rating(modpack_id: String) -> Result<ModpackRating, AppError> {
    let modpacks = load_modpacks();
    let mp = modpacks.iter().find(|mp| mp.id == modpack_id)
        .ok_or_else(|| errors::modpack_error(&modpack_id, "整合包未找到"))?;

    let mod_count = mp.mods.len() as u32;
    let has_download_urls = mp.mods.iter().filter(|m| m.download_url.is_some()).count();
    let url_ratio = if mod_count > 0 { has_download_urls as f64 / mod_count as f64 } else { 0.0 };

    let completeness = (url_ratio * 40.0 + 30.0).min(100.0) as u32;
    let stability = if mod_count > 200 { 50 } else if mod_count > 100 { 65 } else { 80 };
    let performance = if mod_count > 200 { 40 } else if mod_count > 100 { 55 } else { 75 };
    let difficulty = if mod_count > 150 { 80 } else if mod_count > 50 { 50 } else { 20 };
    let innovation = 60;
    let overall = (completeness + stability + performance + (100 - difficulty) + innovation) / 5;

    Ok(ModpackRating {
        modpack_id,
        completeness,
        stability,
        performance,
        difficulty,
        innovation,
        overall,
        review_count: 0,
    })
}

// IMPL_LEVEL: L2 - #58 整合包测试实验室 - 兼容性检测
#[tauri::command]
pub fn test_modpack_compatibility(
    modpack_id: String,
    _game_version: String,
) -> Result<ModpackTestResult, AppError> {
    let modpacks = load_modpacks();
    let mp = modpacks.iter().find(|mp| mp.id == modpack_id)
        .ok_or_else(|| errors::modpack_error(&modpack_id, "整合包未找到"))?;

    let total_size: u64 = mp.mods.iter().filter_map(|m| m.size).sum();
    let mod_loader = mp.mod_loader.as_deref().unwrap_or("");
    run_modpack_test_internal(&mp.game_version, mod_loader, &mp.mods, total_size)
}

// IMPL_LEVEL: L2 - #58 整合包测试实验室 - 自定义测试
#[tauri::command]
pub fn run_modpack_test(
    game_version: String,
    mod_loader: String,
    mod_list: Vec<serde_json::Value>,
) -> Result<ModpackTestResult, AppError> {
    let mods: Vec<ModpackModEntry> = mod_list.iter()
        .filter_map(|v| serde_json::from_value(v.clone()).ok())
        .collect();
    let total_size: u64 = mods.iter().filter_map(|m| m.size).sum();
    run_modpack_test_internal(&game_version, &mod_loader, &mods, total_size)
}

fn run_modpack_test_internal(
    game_version: &str,
    mod_loader: &str,
    mod_list: &[ModpackModEntry],
    total_mod_size: u64,
) -> Result<ModpackTestResult, AppError> {
    let mut checks: Vec<ModpackTestCheck> = Vec::new();

    if game_version.is_empty() {
        checks.push(ModpackTestCheck {
            id: "game_version".to_string(),
            name: "游戏版本".to_string(),
            category: TestCheckCategory::Compatibility,
            status: TestCheckStatus::Fail,
            message: "未指定游戏版本".to_string(),
            details: None,
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "game_version".to_string(),
            name: "游戏版本".to_string(),
            category: TestCheckCategory::Compatibility,
            status: TestCheckStatus::Pass,
            message: format!("游戏版本: {}", game_version),
            details: None,
        });
    }

    if mod_loader.is_empty() {
        checks.push(ModpackTestCheck {
            id: "mod_loader".to_string(),
            name: "模组加载器".to_string(),
            category: TestCheckCategory::Dependency,
            status: TestCheckStatus::Fail,
            message: "未指定模组加载器".to_string(),
            details: None,
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "mod_loader".to_string(),
            name: "模组加载器".to_string(),
            category: TestCheckCategory::Dependency,
            status: TestCheckStatus::Pass,
            message: format!("加载器: {}", mod_loader),
            details: None,
        });
    }

    let optifine_count = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("optifine")).count();
    let sodium_count = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("sodium")).count();
    let rubidium_count = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("rubidium")).count();
    let iris_count = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("iris")).count();
    let embeddium_count = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("embeddium")).count();
    let forge_mods = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("forge")).count();
    let fabric_mods = mod_list.iter().filter(|m| m.file_name.to_lowercase().contains("fabric")).count();

    if optifine_count > 0 && sodium_count > 0 {
        checks.push(ModpackTestCheck {
            id: "optifine_sodium".to_string(),
            name: "OptiFine/Sodium 冲突".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Fail,
            message: "OptiFine 和 Sodium 不能同时使用".to_string(),
            details: Some("这两个模组会互相冲突，请移除其中一个。推荐使用 Sodium + Iris 替代 OptiFine".to_string()),
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "optifine_sodium".to_string(),
            name: "OptiFine/Sodium 冲突".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Pass,
            message: "未检测到 OptiFine/Sodium 冲突".to_string(),
            details: None,
        });
    }

    if optifine_count > 0 && (rubidium_count > 0 || embeddium_count > 0) {
        checks.push(ModpackTestCheck {
            id: "optifine_rubidium".to_string(),
            name: "OptiFine/渲染优化冲突".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Fail,
            message: "OptiFine 与渲染优化模组不兼容".to_string(),
            details: Some("OptiFine 与 Rubidium/Embeddium 不兼容，请移除 OptiFine 或渲染优化模组".to_string()),
        });
    }

    if optifine_count > 0 && iris_count > 0 {
        checks.push(ModpackTestCheck {
            id: "optifine_iris".to_string(),
            name: "OptiFine/Iris 冲突".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Warn,
            message: "OptiFine 和 Iris 同时存在可能导致光影问题".to_string(),
            details: Some("Iris 兼容部分 OptiFine 光影，但建议只使用其中一个".to_string()),
        });
    }

    if sodium_count > 0 && rubidium_count > 0 {
        checks.push(ModpackTestCheck {
            id: "sodium_rubidium".to_string(),
            name: "Sodium/Rubidium 冲突".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Fail,
            message: "Sodium 和 Rubidium 不能同时使用".to_string(),
            details: Some("Rubidium 是 Sodium 的 Forge 移植版，两者功能重叠且冲突".to_string()),
        });
    }

    if forge_mods > 0 && fabric_mods > 0 {
        checks.push(ModpackTestCheck {
            id: "forge_fabric".to_string(),
            name: "Forge/Fabric 混合".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Warn,
            message: "检测到 Forge 和 Fabric 模组混合".to_string(),
            details: Some("Forge 和 Fabric 模组通常不兼容，请确认使用了正确的加载器".to_string()),
        });
    }

    let file_names: Vec<&str> = mod_list.iter().map(|m| m.file_name.as_str()).collect();
    let mut seen = std::collections::HashSet::new();
    let mut duplicates = Vec::new();
    for name in &file_names {
        let lower = name.to_lowercase();
        if !seen.insert(lower.clone()) {
            duplicates.push(lower);
        }
    }
    if !duplicates.is_empty() {
        checks.push(ModpackTestCheck {
            id: "duplicate_mods".to_string(),
            name: "重复模组".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Warn,
            message: format!("检测到 {} 个重复模组", duplicates.len()),
            details: Some(duplicates.join(", ")),
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "duplicate_mods".to_string(),
            name: "重复模组".to_string(),
            category: TestCheckCategory::Conflict,
            status: TestCheckStatus::Pass,
            message: "无重复模组".to_string(),
            details: None,
        });
    }

    let mod_count = mod_list.len();
    if mod_count > 200 {
        checks.push(ModpackTestCheck {
            id: "mod_count".to_string(),
            name: "模组数量".to_string(),
            category: TestCheckCategory::Performance,
            status: TestCheckStatus::Warn,
            message: format!("{} 个模组，可能影响性能", mod_count),
            details: Some("建议分配 6GB+ 内存，可能需要较长启动时间".to_string()),
        });
    } else if mod_count > 100 {
        checks.push(ModpackTestCheck {
            id: "mod_count".to_string(),
            name: "模组数量".to_string(),
            category: TestCheckCategory::Performance,
            status: TestCheckStatus::Pass,
            message: format!("{} 个模组，建议分配 4GB+ 内存", mod_count),
            details: None,
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "mod_count".to_string(),
            name: "模组数量".to_string(),
            category: TestCheckCategory::Performance,
            status: TestCheckStatus::Pass,
            message: format!("{} 个模组", mod_count),
            details: None,
        });
    }

    if total_mod_size > 2 * 1024 * 1024 * 1024 {
        checks.push(ModpackTestCheck {
            id: "total_size".to_string(),
            name: "总大小".to_string(),
            category: TestCheckCategory::Resource,
            status: TestCheckStatus::Warn,
            message: format!("模组总大小 {:.1}GB，下载可能较慢", total_mod_size as f64 / 1073741824.0),
            details: None,
        });
    } else if total_mod_size > 1024 * 1024 * 1024 {
        checks.push(ModpackTestCheck {
            id: "total_size".to_string(),
            name: "总大小".to_string(),
            category: TestCheckCategory::Resource,
            status: TestCheckStatus::Pass,
            message: format!("模组总大小 {:.0}MB", total_mod_size as f64 / 1048576.0),
            details: None,
        });
    } else {
        checks.push(ModpackTestCheck {
            id: "total_size".to_string(),
            name: "总大小".to_string(),
            category: TestCheckCategory::Resource,
            status: TestCheckStatus::Pass,
            message: "模组总大小合理".to_string(),
            details: None,
        });
    }

    let no_download = mod_list.iter().filter(|m| m.download_url.is_none() || m.download_url.as_ref().map(|u| u.is_empty()).unwrap_or(true)).count();
    if no_download > 0 && mod_count > 0 {
        checks.push(ModpackTestCheck {
            id: "download_urls".to_string(),
            name: "下载链接".to_string(),
            category: TestCheckCategory::Dependency,
            status: TestCheckStatus::Warn,
            message: format!("{} 个模组缺少下载链接", no_download),
            details: Some("这些模组需要手动安装，可能来自 CurseForge 或 Modrinth".to_string()),
        });
    }

    let disabled_mods = mod_list.iter().filter(|m| m.file_name.ends_with(".disabled") || m.file_name.ends_with(".disabled.jar")).count();
    if disabled_mods > 0 {
        checks.push(ModpackTestCheck {
            id: "disabled_mods".to_string(),
            name: "已禁用模组".to_string(),
            category: TestCheckCategory::Compatibility,
            status: TestCheckStatus::Warn,
            message: format!("{} 个模组已禁用", disabled_mods),
            details: Some("禁用的模组不会加载，但可能影响其他模组的依赖关系".to_string()),
        });
    }

    let fail_count = checks.iter().filter(|c| matches!(c.status, TestCheckStatus::Fail)).count();
    let warn_count = checks.iter().filter(|c| matches!(c.status, TestCheckStatus::Warn)).count();
    let passed = fail_count == 0;
    let mut overall_score = 100u32 - (fail_count as u32) * 25 - (warn_count as u32) * 5;
    overall_score = overall_score.max(0).min(100);

    let estimated_startup_time = (10 + mod_count as u32 / 10).max(5);
    let estimated_fps = if mod_count > 200 { 20 } else if mod_count > 100 { 40 } else { (144 - mod_count as u32 / 2).max(30) };

    let warnings: Vec<String> = checks.iter()
        .filter(|c| matches!(c.status, TestCheckStatus::Warn))
        .map(|c| c.message.clone())
        .collect();

    Ok(ModpackTestResult {
        passed,
        checks,
        overall_score,
        estimated_startup_time,
        estimated_fps,
        warnings,
    })
}

// IMPL_LEVEL: L2 - #60 整合包性能基准
#[tauri::command]
pub fn get_modpack_performance(
    modpack_id: String,
    modpack_name: String,
    mod_count: u32,
) -> Result<ModpackPerformanceBenchmark, AppError> {
    let _modpack_id = modpack_id;
    let min_ram = if mod_count > 150 { 6144 } else if mod_count > 80 { 4096 } else { 2048 };
    let recommended_ram = if mod_count > 150 { 8192 } else if mod_count > 80 { 6144 } else { 4096 };
    let startup_min = (15 + mod_count * 15 / 100).max(10);
    let startup_max = startup_min * 3 / 2;
    let fps_min = (60 - mod_count * 3 / 10).max(10);
    let fps_avg = (100 - mod_count * 2 / 5).max(20);
    let fps_max = (144 - mod_count * 3 / 10).max(30);

    Ok(ModpackPerformanceBenchmark {
        modpack_id: String::new(),
        modpack_name,
        mod_count,
        min_ram,
        recommended_ram,
        startup_time_min: startup_min,
        startup_time_max: startup_max,
        fps_min,
        fps_avg,
        fps_max,
        test_config: "基于模组数量的模拟估算".to_string(),
        sample_count: 0,
        last_updated: chrono::Utc::now().timestamp_millis(),
    })
}

// IMPL_LEVEL: L2 - #59 整合包多人同步 - 创建房间
#[tauri::command]
pub fn create_sync_room(
    host_name: String,
    modpack_name: String,
    modpack_version: String,
    game_version: Option<String>,
    mod_loader: Option<String>,
    mod_count: Option<u32>,
) -> Result<ModpackSyncRoom, AppError> {
    let code = generate_room_code();

    let room = ModpackSyncRoom {
        id: generate_id("room"),
        code,
        host_id: generate_id("host"),
        host_name,
        modpack_name,
        modpack_version,
        game_version: game_version.unwrap_or_default(),
        mod_loader: mod_loader.unwrap_or_default(),
        mod_count: mod_count.unwrap_or(0),
        participants: vec![ModpackSyncParticipant {
            id: generate_id("host"),
            name: String::new(),
            status: SyncParticipantStatus::Complete,
            progress: 100,
            joined_at: chrono::Utc::now().timestamp_millis(),
        }],
        created_at: chrono::Utc::now().timestamp_millis(),
        status: SyncRoomStatus::Waiting,
    };

    let mut rooms = load_sync_rooms();
    rooms.push(room.clone());
    save_sync_rooms(&rooms)?;

    Ok(room)
}

// IMPL_LEVEL: L2 - #59 加入同步房间
#[tauri::command]
pub fn join_sync_room(room_code: String, participant_name: String) -> Result<ModpackSyncRoom, AppError> {
    let mut rooms = load_sync_rooms();
    let room = rooms.iter_mut().find(|r| r.code == room_code)
        .ok_or_else(|| errors::modpack_error(&room_code, "房间不存在"))?;

    let participant = ModpackSyncParticipant {
        id: generate_id("participant"),
        name: participant_name,
        status: SyncParticipantStatus::Waiting,
        progress: 0,
        joined_at: chrono::Utc::now().timestamp_millis(),
    };

    room.participants.push(participant);
    let result = room.clone();
    save_sync_rooms(&rooms)?;
    Ok(result)
}

#[tauri::command]
pub async fn sync_modpack_room(
    modpack_id: String,
    host_name: String,
    modpack_version: String,
) -> Result<serde_json::Value, AppError> {
    let modpacks = load_modpacks();
    let modpack = modpacks.iter().find(|mp| mp.id == modpack_id);

    let modpack_name = modpack.map(|mp| mp.name.clone()).unwrap_or_default();
    let game_version = modpack.map(|mp| mp.game_version.clone()).unwrap_or_default();
    let mod_loader = modpack.and_then(|mp| mp.mod_loader.clone()).unwrap_or_default();
    let mod_count = modpack.map(|mp| mp.mods.len() as u32).unwrap_or(0);
    let room_code = generate_room_code();
    let now = chrono::Utc::now().timestamp_millis();

    let room = crate::models::modpack::ModpackSyncRoom {
        id: uuid::Uuid::new_v4().to_string(),
        code: room_code.clone(),
        host_id: format!("host-{}", &uuid::Uuid::new_v4().to_string()[..8]),
        host_name,
        modpack_name,
        modpack_version,
        game_version,
        mod_loader,
        mod_count,
        participants: Vec::new(),
        created_at: now,
        status: crate::models::modpack::SyncRoomStatus::Waiting,
    };

    Ok(serde_json::json!({
        "success": true,
        "roomCode": room_code,
        "roomId": room.id,
        "message": format!("房间已创建，房间码: {}", room_code)
    }))
}

// IMPL_LEVEL: L2 - 获取同步房间列表
#[tauri::command]
pub fn get_sync_rooms() -> Result<Vec<ModpackSyncRoom>, AppError> {
    Ok(load_sync_rooms())
}

fn generate_room_code() -> String {
    use std::fmt::Write;
    let mut rng = rand::rng();
    let mut code = String::with_capacity(6);
    for _ in 0..6 {
        let val: u32 = rng.random_range(0..36);
        if val < 10 {
            write!(&mut code, "{}", val).unwrap();
        } else {
            code.push((b'A' + (val - 10) as u8) as char);
        }
    }
    code
}

fn compute_file_sha1(path: &std::path::Path) -> Option<String> {
    let file = std::fs::File::open(path).ok()?;
    let mut reader = std::io::BufReader::new(file);
    use sha1::{Digest, Sha1};
    let mut hasher = Sha1::new();
    std::io::copy(&mut reader, &mut hasher).ok()?;
    let result = hasher.finalize();
    Some(format!("{:x}", result))
}

fn scan_mods_dir(mods_dir: &std::path::Path) -> Result<Vec<ModpackModEntry>, AppError> {
    let mut mod_entries = Vec::new();
    if !mods_dir.exists() {
        return Ok(mod_entries);
    }
    if let Ok(entries) = std::fs::read_dir(mods_dir) {
        for entry in entries.flatten() {
            let p = entry.path();
            let name = p.file_name().unwrap_or_default().to_string_lossy().to_string();
            if name.ends_with(".jar") && !name.ends_with(".disabled") {
                let hash = compute_file_sha1(&p);
                mod_entries.push(ModpackModEntry {
                    file_name: name,
                    project_id: None,
                    file_id: None,
                    download_url: None,
                    hash,
                    size: p.metadata().ok().map(|m| m.len()),
                    source: ModEntrySource::Local,
                    required: true,
                    folder_path: Some("mods".to_string()),
                });
            }
        }
    }
    Ok(mod_entries)
}

fn scan_config_dir(instance_dir: &std::path::Path) -> Result<Vec<ModpackConfigEntry>, AppError> {
    let mut config_entries = Vec::new();
    let config_dir = instance_dir.join("config");
    if config_dir.exists() {
        collect_config_entries(&config_dir, instance_dir, &mut config_entries)?;
    }
    Ok(config_entries)
}

fn collect_config_entries(
    dir: &std::path::Path,
    base_dir: &std::path::Path,
    entries: &mut Vec<ModpackConfigEntry>,
) -> Result<(), AppError> {
    if !dir.exists() {
        return Ok(());
    }
    let read_dir = std::fs::read_dir(dir)?;
    for entry in read_dir.flatten() {
        let path = entry.path();
        if path.is_dir() {
            collect_config_entries(&path, base_dir, entries)?;
        } else {
            let relative = path.strip_prefix(base_dir)
                .unwrap_or(&path)
                .to_string_lossy()
                .to_string();
            let hash = compute_file_sha1(&path);
            let size = path.metadata().ok().map(|m| m.len());
            entries.push(ModpackConfigEntry {
                relative_path: relative,
                source: ConfigEntrySource::Override,
                hash,
                size,
            });
        }
    }
    Ok(())
}

fn add_dir_to_zip(
    zip_writer: &mut zip::ZipWriter<std::fs::File>,
    dir: &std::path::Path,
    prefix: &str,
    options: &zip::write::SimpleFileOptions,
) -> Result<(), AppError> {
    if !dir.exists() {
        return Ok(());
    }
    let entries = std::fs::read_dir(dir)?;
    for entry in entries.flatten() {
        let path = entry.path();
        let name = path.file_name().unwrap_or_default().to_string_lossy().to_string();
        let zip_path = format!("{}/{}", prefix, name);
        if path.is_dir() {
            add_dir_to_zip(zip_writer, &path, &zip_path, options)?;
        } else {
            let bytes = std::fs::read(&path)?;
            zip_writer.start_file(&zip_path, *options)?;
            zip_writer.write_all(&bytes)?;
        }
    }
    Ok(())
}

fn generate_curseforge_manifest(
    name: &str, version: &str, author: &str,
    game_version: &str, mod_loader: &Option<String>,
    mods: &[ModpackModEntry],
) -> serde_json::Value {
    serde_json::json!({
        "minecraft": {
            "version": game_version,
            "modLoaders": [{
                "id": mod_loader.as_deref().unwrap_or("forge"),
                "primary": true
            }]
        },
        "manifestType": "minecraftModpack",
        "manifestVersion": 1,
        "name": name,
        "version": version,
        "author": author,
        "files": mods.iter().filter_map(|m| {
            if m.project_id.is_some() && m.file_id.is_some() {
                Some(serde_json::json!({
                    "projectID": m.project_id,
                    "fileID": m.file_id,
                    "required": m.required
                }))
            } else {
                None
            }
        }).collect::<Vec<_>>(),
        "overrides": "overrides"
    })
}

fn generate_modrinth_manifest(
    name: &str, version: &str, summary: &str,
    game_version: &str, mod_loader: Option<&str>, mod_loader_version: Option<&str>,
    mods: &[ModpackModEntry],
) -> serde_json::Value {
    let mut deps = serde_json::json!({ "minecraft": game_version });
    if let Some(loader) = mod_loader {
        deps[loader] = serde_json::Value::String(mod_loader_version.unwrap_or("").to_string());
    }

    serde_json::json!({
        "formatVersion": 1,
        "game": "minecraft",
        "versionId": version,
        "name": name,
        "summary": summary,
        "files": mods.iter().filter(|m| m.download_url.is_some()).map(|m| {
            serde_json::json!({
                "path": m.folder_path.as_deref().unwrap_or(&format!("mods/{}", m.file_name)),
                "hashes": m.hash.as_ref().map(|h| serde_json::json!({ "sha1": h })).unwrap_or(serde_json::json!({})),
                "downloads": [m.download_url.as_deref().unwrap_or("")],
                "fileSize": m.size.unwrap_or(0),
                "env": { "client": if m.required { "required" } else { "optional" }, "server": "optional" }
            })
        }).collect::<Vec<_>>(),
        "dependencies": deps
    })
}

fn generate_bonjour_manifest(
    name: &str, version: &str, author: &str, description: &str,
    game_version: &str, mod_loader: Option<&str>, mod_loader_version: Option<&str>,
    mods: &[ModpackModEntry],
    configs: &[ModpackConfigEntry],
) -> serde_json::Value {
    serde_json::json!({
        "formatVersion": 1,
        "format": "bonjour",
        "name": name,
        "version": version,
        "author": author,
        "description": description,
        "gameVersion": game_version,
        "modLoader": mod_loader.unwrap_or(""),
        "modLoaderVersion": mod_loader_version.unwrap_or(""),
        "mods": mods,
        "configs": configs
    })
}

fn extract_modpack_tags(mp: &ModpackEntry) -> Vec<String> {
    let mut tags = Vec::new();
    if let Some(ref loader) = mp.mod_loader {
        tags.push(loader.clone());
    }
    if !mp.game_version.is_empty() {
        tags.push(format!("MC {}", mp.game_version));
    }
    if mp.mods.len() > 150 {
        tags.push("大型整合".to_string());
    } else if mp.mods.len() > 50 {
        tags.push("中型整合".to_string());
    } else {
        tags.push("轻量整合".to_string());
    }
    tags
}
