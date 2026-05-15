use reqwest::Client;
use serde_json::Value;
use std::env;
use crate::errors::{self, AppError};

const CURSEFORGE_API_BASE: &str = "https://api.curseforge.com/v1";

fn get_api_key() -> String {
    env::var("CURSEFORGE_API_KEY").unwrap_or_default()
}

fn build_client() -> Result<Client, AppError> {
    Client::builder()
        .timeout(std::time::Duration::from_secs(30))
        .build()
        .map_err(|e| errors::internal(format!("Failed to create HTTP client: {}", e)))
}

#[tauri::command]
pub async fn curseforge_search(params: Value) -> Result<Value, AppError> {
    let client = build_client()?;
    let api_key = get_api_key();
    if api_key.is_empty() {
        return Err(AppError::AuthError {
            provider: "curseforge".to_string(),
            reason: "API key not configured".to_string(),
            message_zh: "CurseForge API 密钥未配置".to_string(),
            message_en: "CurseForge API key not configured".to_string(),
            fix_action: "请设置 CURSEFORGE_API_KEY 环境变量".to_string(),
        });
    }

    let mut query_params = vec![];
    if let Some(game_id) = params.get("gameId").and_then(|v| v.as_i64()) {
        query_params.push(("gameId", game_id.to_string()));
    }
    if let Some(class_id) = params.get("classId").and_then(|v| v.as_i64()) {
        query_params.push(("classId", class_id.to_string()));
    }
    if let Some(index) = params.get("index").and_then(|v| v.as_i64()) {
        query_params.push(("index", index.to_string()));
    }
    if let Some(page_size) = params.get("pageSize").and_then(|v| v.as_i64()) {
        query_params.push(("pageSize", page_size.to_string()));
    }
    if let Some(sort_field) = params.get("sortField").and_then(|v| v.as_str()) {
        query_params.push(("sortField", sort_field.to_string()));
    }
    if let Some(search_filter) = params.get("searchFilter").and_then(|v| v.as_str()) {
        query_params.push(("searchFilter", search_filter.to_string()));
    }
    if let Some(game_version) = params.get("gameVersion").and_then(|v| v.as_str()) {
        query_params.push(("gameVersion", game_version.to_string()));
    }
    if let Some(mod_loader_type) = params.get("modLoaderType").and_then(|v| v.as_i64()) {
        query_params.push(("modLoaderType", mod_loader_type.to_string()));
    }

    let response = client
        .get(format!("{}/mods/search", CURSEFORGE_API_BASE))
        .header("x-api-key", &api_key)
        .header("Accept", "application/json")
        .query(&query_params)
        .send()
        .await
        .map_err(|e| errors::network_error(format!("{}/mods/search", CURSEFORGE_API_BASE), e.to_string()))?;

    if !response.status().is_success() {
        let status = response.status();
        let body = response.text().await.unwrap_or_default();
        return Err(errors::network_error(format!("{}/mods/search", CURSEFORGE_API_BASE), format!("HTTP {} - {}", status, body)));
    }

    response.json::<Value>().await.map_err(|e| errors::json_parse_error(e.to_string()))
}

#[tauri::command]
pub async fn curseforge_get_mod_details(mod_id: String) -> Result<Value, AppError> {
    let client = build_client()?;
    let api_key = get_api_key();
    if api_key.is_empty() {
        return Err(AppError::AuthError {
            provider: "curseforge".to_string(),
            reason: "API key not configured".to_string(),
            message_zh: "CurseForge API 密钥未配置".to_string(),
            message_en: "CurseForge API key not configured".to_string(),
            fix_action: "请设置 CURSEFORGE_API_KEY 环境变量".to_string(),
        });
    }

    let url = format!("{}/mods/{}", CURSEFORGE_API_BASE, mod_id);
    let response = client
        .get(&url)
        .header("x-api-key", &api_key)
        .header("Accept", "application/json")
        .send()
        .await
        .map_err(|e| errors::network_error(&url, e.to_string()))?;

    if !response.status().is_success() {
        return Err(errors::network_error(&url, format!("HTTP {}", response.status())));
    }

    let data: Value = response.json().await.map_err(|e| errors::json_parse_error(e.to_string()))?;
    Ok(data.get("data").cloned().unwrap_or(Value::Null))
}

#[tauri::command]
pub async fn curseforge_get_mod_files(mod_id: String, params: Value) -> Result<Vec<Value>, AppError> {
    let client = build_client()?;
    let api_key = get_api_key();
    if api_key.is_empty() {
        return Err(AppError::AuthError {
            provider: "curseforge".to_string(),
            reason: "API key not configured".to_string(),
            message_zh: "CurseForge API 密钥未配置".to_string(),
            message_en: "CurseForge API key not configured".to_string(),
            fix_action: "请设置 CURSEFORGE_API_KEY 环境变量".to_string(),
        });
    }

    let mut query_params = vec![];
    if let Some(game_version) = params.get("gameVersion").and_then(|v| v.as_str()) {
        query_params.push(("gameVersion", game_version.to_string()));
    }
    if let Some(mod_loader_type) = params.get("modLoaderType").and_then(|v| v.as_i64()) {
        query_params.push(("modLoaderType", mod_loader_type.to_string()));
    }

    let url = format!("{}/mods/{}/files", CURSEFORGE_API_BASE, mod_id);
    let response = client
        .get(&url)
        .header("x-api-key", &api_key)
        .header("Accept", "application/json")
        .query(&query_params)
        .send()
        .await
        .map_err(|e| errors::network_error(&url, e.to_string()))?;

    if !response.status().is_success() {
        return Err(errors::network_error(&url, format!("HTTP {}", response.status())));
    }

    let data: Value = response.json().await.map_err(|e| errors::json_parse_error(e.to_string()))?;
    Ok(data.get("data").and_then(|d| d.as_array()).cloned().unwrap_or_default())
}

#[tauri::command]
pub async fn curseforge_fingerprint_matches(fingerprints: Vec<u64>) -> Result<Vec<Value>, AppError> {
    let client = build_client()?;
    let api_key = get_api_key();
    if api_key.is_empty() {
        return Err(AppError::AuthError {
            provider: "curseforge".to_string(),
            reason: "API key not configured".to_string(),
            message_zh: "CurseForge API 密钥未配置".to_string(),
            message_en: "CurseForge API key not configured".to_string(),
            fix_action: "请设置 CURSEFORGE_API_KEY 环境变量".to_string(),
        });
    }

    let url = format!("{}/fingerprints", CURSEFORGE_API_BASE);
    let response = client
        .post(&url)
        .header("x-api-key", &api_key)
        .header("Accept", "application/json")
        .header("Content-Type", "application/json")
        .json(&serde_json::json!({ "fingerprints": fingerprints }))
        .send()
        .await
        .map_err(|e| errors::network_error(&url, e.to_string()))?;

    if !response.status().is_success() {
        return Err(errors::network_error(&url, format!("HTTP {}", response.status())));
    }

    let data: Value = response.json().await.map_err(|e| errors::json_parse_error(e.to_string()))?;
    Ok(data.get("data").and_then(|d| d.get("exactMatches")).and_then(|m| m.as_array()).cloned().unwrap_or_default())
}
