use crate::errors::{self, AppError};
use crate::models::mod_info::{ModJarMetadata, ModDependencyInfo};
use std::path::{Path, PathBuf};

pub fn analyze_jar(file_path: &Path) -> Result<ModJarMetadata, AppError> {
    let file = std::fs::File::open(file_path)
        .map_err(|e| errors::file_read_error(file_path, e.to_string()))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| errors::mod_analysis_error(file_path.display().to_string(), e.to_string()))?;

    let fabric_meta = try_parse_fabric_mod(&mut archive);
    let forge_meta = try_parse_forge_mod(&mut archive);
    let neo_meta = try_parse_neoforge_mod(&mut archive);
    let quilt_meta = try_parse_quilt_mod(&mut archive);

    let meta = fabric_meta
        .or(forge_meta)
        .or(neo_meta)
        .or(quilt_meta)
        .unwrap_or_else(|| ModJarMetadata {
            mod_id: file_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string(),
            name: file_path.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("Unknown Mod")
                .to_string(),
            version: "unknown".to_string(),
            description: None,
            authors: None,
            mod_loader: "unknown".to_string(),
            entry_class: None,
            mixins: None,
            dependencies: None,
            icon_path: None,
            license: None,
            homepage: None,
            source_url: None,
            issue_tracker_url: None,
            security_risk: None,
            sha256: None,
            obfuscation_mappings: None,
            class_entries: None,
            network_access: false,
            file_access: false,
            reflection_access: false,
        });

    Ok(meta)
}

fn try_parse_fabric_mod(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<ModJarMetadata> {
    let mut file = archive.by_name("fabric.mod.json").ok()?;
    let mut content = String::new();
    std::io::Read::read_to_string(&mut file, &mut content).ok()?;
    let v: serde_json::Value = serde_json::from_str(&content).ok()?;

    let mod_id = v.get("id")?.as_str()?.to_string();
    let name = v.get("name").and_then(|n| n.as_str()).unwrap_or(&mod_id).to_string();
    let version = v.get("version").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();
    let description = v.get("description").and_then(|d| d.as_str()).map(|s| s.to_string());
    let authors = v.get("authors").and_then(|a| a.as_array()).map(|arr| {
        arr.iter().filter_map(|a| {
            if a.is_string() { a.as_str().map(|s| s.to_string()) }
            else { a.get("name").and_then(|n| n.as_str()).map(|s| s.to_string()) }
        }).collect::<Vec<_>>()
    });
    let entry_class = v.get("entrypoints").and_then(|e| e.get("main")).and_then(|m| {
        if m.is_array() { m.as_array().and_then(|arr| arr.first()).and_then(|s| s.as_str()).map(|s| s.to_string()) }
        else if m.is_string() { m.as_str().map(|s| s.to_string()) }
        else { None }
    });
    let icon_path = v.get("icon").and_then(|i| i.as_str()).map(|s| s.to_string());
    let license = v.get("license").and_then(|l| {
        if l.is_array() { l.as_array()?.first()?.as_str().map(|s| s.to_string()) }
        else if l.is_string() { l.as_str().map(|s| s.to_string()) }
        else { None }
    });
    let homepage = v.get("contact").and_then(|c| c.get("homepage")).and_then(|h| h.as_str()).map(|s| s.to_string());
    let source_url = v.get("contact").and_then(|c| c.get("sources")).and_then(|s| s.as_str()).map(|s| s.to_string());
    let issue_tracker_url = v.get("contact").and_then(|c| c.get("issues")).and_then(|i| i.as_str()).map(|s| s.to_string());

    let mut dependencies = Vec::new();
    if let Some(deps) = v.get("depends").and_then(|d| d.as_object()) {
        for (k, ver) in deps {
            dependencies.push(ModDependencyInfo {
                mod_id: k.clone(),
                version_range: ver.as_str().map(|s| s.to_string()),
                required: true,
                side: None,
            });
        }
    }
    if let Some(sug_deps) = v.get("recommends").and_then(|d| d.as_object()) {
        for (k, ver) in sug_deps {
            dependencies.push(ModDependencyInfo {
                mod_id: k.clone(),
                version_range: ver.as_str().map(|s| s.to_string()),
                required: false,
                side: None,
            });
        }
    }

    let mixins = v.get("mixins").and_then(|m| m.as_array()).map(|arr| {
        arr.iter().filter_map(|s| s.as_str().map(|s| s.to_string())).collect::<Vec<_>>()
    });

    Some(ModJarMetadata {
        mod_id,
        name,
        version,
        description,
        authors,
        mod_loader: "fabric".to_string(),
        entry_class,
        mixins,
        dependencies: if dependencies.is_empty() { None } else { Some(dependencies) },
        icon_path,
        license,
        homepage,
        source_url,
        issue_tracker_url,
        security_risk: None,
        sha256: None,
        obfuscation_mappings: None,
        class_entries: None,
        network_access: false,
        file_access: false,
        reflection_access: false,
    })
}

fn try_parse_forge_mod(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<ModJarMetadata> {
    let mut file = archive.by_name("META-INF/mods.toml").ok()?;
    let mut content = String::new();
    std::io::Read::read_to_string(&mut file, &mut content).ok()?;

    let mod_id = extract_toml_value(&content, "modId").unwrap_or_else(|| "unknown".to_string());
    let name = extract_toml_value(&content, "displayName").unwrap_or_else(|| mod_id.clone());
    let version_raw = extract_toml_value(&content, "version").unwrap_or_else(|| "unknown".to_string());
    let version = if version_raw.starts_with('$') || version_raw.starts_with("${") {
        String::new()
    } else {
        version_raw
    };
    let description = extract_toml_value(&content, "description");
    let authors = extract_toml_value(&content, "authors").map(|a| vec![a]);
    let homepage = extract_toml_value(&content, "displayURL");
    let license = extract_toml_value(&content, "license");
    let issue_tracker_url = extract_toml_value(&content, "issueTrackerURL");
    let icon_path = extract_toml_value(&content, "logoFile");

    Some(ModJarMetadata {
        mod_id,
        name,
        version,
        description,
        authors,
        mod_loader: "forge".to_string(),
        entry_class: None,
        mixins: None,
        dependencies: None,
        icon_path,
        license,
        homepage,
        source_url: None,
        issue_tracker_url,
        security_risk: None,
        sha256: None,
        obfuscation_mappings: None,
        class_entries: None,
        network_access: false,
        file_access: false,
        reflection_access: false,
    })
}

fn try_parse_neoforge_mod(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<ModJarMetadata> {
    let mut file = archive.by_name("META-INF/neoforge.mods.toml").ok()?;
    let mut content = String::new();
    std::io::Read::read_to_string(&mut file, &mut content).ok()?;

    let mod_id = extract_toml_value(&content, "modId").unwrap_or_else(|| "unknown".to_string());
    let name = extract_toml_value(&content, "displayName").unwrap_or_else(|| mod_id.clone());
    let version_raw = extract_toml_value(&content, "version").unwrap_or_else(|| "unknown".to_string());
    let version = if version_raw.starts_with('$') || version_raw.starts_with("${") {
        String::new()
    } else {
        version_raw
    };
    let description = extract_toml_value(&content, "description");

    Some(ModJarMetadata {
        mod_id,
        name,
        version,
        description,
        authors: None,
        mod_loader: "neoforge".to_string(),
        entry_class: None,
        mixins: None,
        dependencies: None,
        icon_path: None,
        license: None,
        homepage: None,
        source_url: None,
        issue_tracker_url: None,
        security_risk: None,
        sha256: None,
        obfuscation_mappings: None,
        class_entries: None,
        network_access: false,
        file_access: false,
        reflection_access: false,
    })
}

fn try_parse_quilt_mod(archive: &mut zip::ZipArchive<std::fs::File>) -> Option<ModJarMetadata> {
    let mut file = archive.by_name("quilt.mod.json").ok()?;
    let mut content = String::new();
    std::io::Read::read_to_string(&mut file, &mut content).ok()?;
    let v: serde_json::Value = serde_json::from_str(&content).ok()?;

    let loader = v.get("quilt_loader").or(v.get("loader"))?;
    let mod_id = loader.get("id")?.as_str()?.to_string();
    let version = loader.get("version").and_then(|v| v.as_str()).unwrap_or("unknown").to_string();

    let quilt_metadata = v.get("quilt_metadata").or_else(|| v.get("metadata"));
    let name = quilt_metadata
        .and_then(|m| m.get("name")).and_then(|n| n.as_str())
        .unwrap_or(&mod_id).to_string();
    let description = quilt_metadata
        .and_then(|m| m.get("description")).and_then(|d| d.as_str()).map(|s| s.to_string());
    let authors = quilt_metadata
        .and_then(|m| m.get("contributors")).and_then(|c| c.as_object())
        .map(|obj| obj.keys().cloned().collect::<Vec<_>>());

    let mut dependencies = Vec::new();
    if let Some(dep_list) = loader.get("depends").and_then(|v| v.as_array()) {
        for dep in dep_list {
            if let Some(dep_id) = dep.as_str() {
                dependencies.push(ModDependencyInfo {
                    mod_id: dep_id.to_string(),
                    version_range: None,
                    required: true,
                    side: None,
                });
            } else if let Some(dep_obj) = dep.as_object() {
                dependencies.push(ModDependencyInfo {
                    mod_id: dep_obj.get("id").and_then(|v| v.as_str()).unwrap_or("").to_string(),
                    version_range: dep_obj.get("version").and_then(|v| v.as_str()).map(|s| s.to_string()),
                    required: !dep_obj.get("optional").and_then(|v| v.as_bool()).unwrap_or(false),
                    side: dep_obj.get("side").and_then(|v| v.as_str()).map(|s| s.to_string()),
                });
            }
        }
    }

    let icon_path = v.get("icon").and_then(|i| i.as_str()).map(|s| s.to_string());

    Some(ModJarMetadata {
        mod_id,
        name,
        version,
        description,
        authors,
        mod_loader: "quilt".to_string(),
        entry_class: None,
        mixins: None,
        dependencies: if dependencies.is_empty() { None } else { Some(dependencies) },
        icon_path,
        license: None,
        homepage: None,
        source_url: None,
        issue_tracker_url: None,
        security_risk: None,
        sha256: None,
        obfuscation_mappings: None,
        class_entries: None,
        network_access: false,
        file_access: false,
        reflection_access: false,
    })
}

fn extract_toml_value(content: &str, key: &str) -> Option<String> {
    let re = regex::Regex::new(&format!(r#"{}\s*=\s*"([^"]*)""#, key)).ok()?;
    if let Some(caps) = re.captures(content) {
        if let Some(m) = caps.get(1) {
            let v = m.as_str().to_string();
            if !v.is_empty() { return Some(v); }
        }
    }
    let re2 = regex::Regex::new(&format!(r#"{}\s*=\s*'([^']*)'"#, key)).ok()?;
    if let Some(caps) = re2.captures(content) {
        if let Some(m) = caps.get(1) {
            let v = m.as_str().to_string();
            if !v.is_empty() { return Some(v); }
        }
    }
    None
}

const NETWORK_PATTERNS: &[&str] = &[
    "java/net/Socket", "java/net/URL", "java/net/HttpURLConnection",
    "java/net/URI", "javax/net/ssl", "okhttp3", "org/apache/http",
    "java/net/http/HttpClient",
];

const FILE_PATTERNS: &[&str] = &[
    "java/io/File", "java/nio/file/", "java/io/FileOutputStream",
    "java/io/FileInputStream", "java/io/RandomAccessFile",
];

const REFLECTION_PATTERNS: &[&str] = &[
    "java/lang/reflect/Field", "java/lang/reflect/Method",
    "java/lang/reflect/Constructor", "java/lang/Class",
    "java/lang/invoke/MethodHandle",
];

const DANGEROUS_PATTERNS: &[&str] = &[
    "java/lang/Runtime", "java/lang/ProcessBuilder",
    "java/lang/System.exit", "java/lang/System.loadLibrary",
    "java/lang/System.load",
];

pub fn scan_jar_security(file_path: &Path) -> Result<serde_json::Value, AppError> {
    let file = std::fs::File::open(file_path)
        .map_err(|e| errors::file_read_error(file_path, e.to_string()))?;
    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| errors::mod_analysis_error(file_path.display().to_string(), e.to_string()))?;

    let mut network_access = false;
    let mut file_access = false;
    let mut reflection_access = false;
    let mut dangerous_classes: Vec<String> = Vec::new();
    let mut total_classes = 0u32;
    let mut mixin_refs: Vec<String> = Vec::new();
    let mut class_entries: Vec<String> = Vec::new();

    for i in 0..archive.len() {
        let mut entry = archive.by_index(i).map_err(|e| errors::mod_analysis_error(
            file_path.display().to_string(), e.to_string()
        ))?;
        let name = entry.name().to_string();

        if name.ends_with(".class") {
            total_classes += 1;

            let class_name = name.trim_end_matches(".class").replace('/', ".");
            if class_entries.len() < 500 {
                class_entries.push(class_name);
            }

            let mut buf = Vec::new();
            if std::io::Read::read_to_end(&mut entry, &mut buf).is_ok() {
                let refs = extract_class_references(&buf);
                for r in &refs {
                    let r_path = r.replace('.', "/");
                    for pat in NETWORK_PATTERNS {
                        if r_path.contains(pat) { network_access = true; break; }
                    }
                    for pat in FILE_PATTERNS {
                        if r_path.contains(pat) { file_access = true; break; }
                    }
                    for pat in REFLECTION_PATTERNS {
                        if r_path.contains(pat) { reflection_access = true; break; }
                    }
                    for pat in DANGEROUS_PATTERNS {
                        if r_path.contains(pat) {
                            if !dangerous_classes.contains(&r.to_string()) {
                                dangerous_classes.push(r.to_string());
                            }
                            break;
                        }
                    }
                }
            }
        } else if name.ends_with(".json") && name.contains("mixin") {
            mixin_refs.push(name);
        }
    }

    let risk_count = [network_access, file_access, reflection_access].iter().filter(|&&x| x).count();
    let risk_level = if !dangerous_classes.is_empty() || risk_count >= 3 {
        "high"
    } else if reflection_access || risk_count >= 2 {
        "medium"
    } else if network_access || file_access {
        "low"
    } else {
        "none"
    };

    Ok(serde_json::json!({
        "totalClasses": total_classes,
        "networkAccess": network_access,
        "fileAccess": file_access,
        "reflectionAccess": reflection_access,
        "dangerousClasses": dangerous_classes,
        "mixinRefs": mixin_refs,
        "classEntries": class_entries,
        "riskLevel": risk_level
    }))
}

fn extract_class_references(class_bytes: &[u8]) -> Vec<String> {
    let mut refs = Vec::new();
    if class_bytes.len() < 10 { return refs; }

    let magic = u32::from_be_bytes([class_bytes[0], class_bytes[1], class_bytes[2], class_bytes[3]]);
    if magic != 0xCAFEBABE { return refs; }

    let minor = u16::from_be_bytes([class_bytes[4], class_bytes[5]]);
    let major = u16::from_be_bytes([class_bytes[6], class_bytes[7]]);
    let _ = (minor, major);

    let cp_count = u16::from_be_bytes([class_bytes[8], class_bytes[9]]) as usize;
    if cp_count == 0 || cp_count > 65535 { return refs; }

    let mut pos: usize = 10;
    let mut utf8_entries: std::collections::HashMap<usize, String> = std::collections::HashMap::new();

    for i in 1..cp_count {
        if pos + 1 > class_bytes.len() { break; }
        let tag = class_bytes[pos];
        pos += 1;

        match tag {
            1 => {
                if pos + 2 > class_bytes.len() { break; }
                let len = u16::from_be_bytes([class_bytes[pos], class_bytes[pos + 1]]) as usize;
                pos += 2;
                if pos + len > class_bytes.len() { break; }
                let s = String::from_utf8_lossy(&class_bytes[pos..pos + len]).to_string();
                utf8_entries.insert(i, s);
                pos += len;
            }
            7 => {
                if pos + 2 > class_bytes.len() { break; }
                pos += 2;
            }
            9 | 10 | 11 => {
                pos += 4;
            }
            8 => {
                pos += 2;
            }
            3 | 4 => {
                pos += 4;
            }
            5 | 6 => {
                pos += 8;
                if i + 1 < cp_count { let _ = i + 1; }
            }
            12 => {
                pos += 4;
            }
            15 => {
                pos += 3;
            }
            16 => {
                pos += 2;
            }
            17 | 18 => {
                pos += 4;
            }
            19 | 20 => {
                pos += 2;
            }
            _ => { break; }
        }
    }

    let mut class_refs = Vec::new();
    pos = 10;
    let mut i = 1;
    while i < cp_count {
        if pos + 1 > class_bytes.len() { break; }
        let tag = class_bytes[pos];
        pos += 1;

        match tag {
            1 => {
                if pos + 2 > class_bytes.len() { break; }
                let len = u16::from_be_bytes([class_bytes[pos], class_bytes[pos + 1]]) as usize;
                pos += 2 + len;
            }
            7 => {
                if pos + 2 > class_bytes.len() { break; }
                let name_idx = u16::from_be_bytes([class_bytes[pos], class_bytes[pos + 1]]) as usize;
                pos += 2;
                if let Some(name) = utf8_entries.get(&name_idx) {
                    let name_str = name.replace('/', ".");
                    if !name_str.starts_with("java.lang.") && !name_str.starts_with('[') {
                        class_refs.push(name_str);
                    }
                }
            }
            9 | 10 | 11 => { pos += 4; }
            8 => { pos += 2; }
            3 | 4 => { pos += 4; }
            5 | 6 => { pos += 8; i += 1; }
            12 => { pos += 4; }
            15 => { pos += 3; }
            16 => { pos += 2; }
            17 | 18 => { pos += 4; }
            19 | 20 => { pos += 2; }
            _ => { break; }
        }
        i += 1;
    }

    let mut seen = std::collections::HashSet::new();
    for r in class_refs {
        if seen.insert(r.clone()) {
            refs.push(r);
        }
    }

    refs
}

#[tauri::command]
pub async fn jar_analyze_mod(file_path: String) -> Result<ModJarMetadata, AppError> {
    let path = PathBuf::from(&file_path);
    tauri::async_runtime::spawn_blocking(move || analyze_jar(&path)).await
        .map_err(|e| errors::internal(format!("spawn_blocking failed: {}", e)))?
}

#[tauri::command]
pub async fn jar_scan_security(file_path: String) -> Result<serde_json::Value, AppError> {
    let path = PathBuf::from(&file_path);
    tauri::async_runtime::spawn_blocking(move || scan_jar_security(&path)).await
        .map_err(|e| errors::internal(format!("spawn_blocking failed: {}", e)))?
}
