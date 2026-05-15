use argon2::{
    Argon2,
    password_hash::{PasswordHasher, SaltString},
};
use reqwest::Client;
use crate::models::account::Account;

const VALID_SERVER_PATTERNS: &[&str] = &[
    "https://littleskin.cn",
    "https://littleskin.cn/",
    "https://api.littleskin.cn",
    "https://api.littleskin.cn/",
];

fn validate_server_url(server_url: &str) -> Result<(), String> {
    let url = server_url.trim_end_matches('/');
    if !url.starts_with("https://") {
        return Err(format!(
            "服务器地址必须使用 HTTPS 协议: {}",
            server_url
        ));
    }
    if !VALID_SERVER_PATTERNS.contains(&server_url) && !VALID_SERVER_PATTERNS.iter().any(|p| {
        server_url.starts_with(p) || url == p.trim_end_matches('/')
    }) {
        return Err(format!(
            "不支持的 LittleSkin 服务器地址: {}。支持的地址: https://littleskin.cn 或 https://api.littleskin.cn",
            server_url
        ));
    }
    Ok(())
}

pub struct LittleskinAuthService {
    client: Client,
}

impl LittleskinAuthService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub fn with_client(client: Client) -> Self {
        Self { client }
    }

    pub async fn login(&self, server_url: &str, email: &str, password: &str) -> Result<(Account, String), String> {
        validate_server_url(server_url)?;

        let salt = SaltString::generate(&mut argon2::password_hash::rand_core::OsRng);
        let argon2 = Argon2::default();
        let password_hash = argon2
            .hash_password(password.as_bytes(), &salt)
            .map_err(|e| format!("密码哈希失败: {}", e))?
            .to_string();

        let resp = self.client
            .post(format!("{}/api/auth/login", server_url))
            .json(&serde_json::json!({
                "email": email,
                "password": password_hash
            }))
            .send()
            .await
            .map_err(|e| format!("Littleskin login failed: {}", e))?;

        if !resp.status().is_success() {
            return Err(format!("Login failed: HTTP {}", resp.status()));
        }

        let data: serde_json::Value = resp.json().await
            .map_err(|e| format!("Failed to parse Littleskin response: {}", e))?;

        let access_token = data["access_token"].as_str()
            .ok_or("No access token in response")?
            .to_string();

        let user_resp = self.client
            .get(format!("{}/api/user", server_url))
            .header("Authorization", format!("Bearer {}", &access_token))
            .send()
            .await
            .map_err(|e| format!("Failed to get user info: {}", e))?;

        let user_data: serde_json::Value = user_resp.json().await
            .map_err(|e| format!("Failed to parse user info: {}", e))?;

        let username = user_data["nickname"].as_str()
            .filter(|s| !s.is_empty())
            .ok_or("用户名缺失，无法创建账户")?
            .to_string();
        let uid = user_data["uid"].as_u64()
            .filter(|u| *u > 0)
            .ok_or("UID缺失，无法创建账户")?;

        let raw_uuid = user_data["uuid"].as_str()
            .map(|s| s.to_string())
            .unwrap_or_else(|| {
                let hex = format!("{:032x}", uid);
                format!("{}-{}-{}-{}-{}",
                    &hex[0..8], &hex[8..12], &hex[12..16], &hex[16..20], &hex[20..32])
            });

        Ok((
            Account {
                id: uuid::Uuid::new_v4().to_string(),
                account_type: "littleskin".to_string(),
                username: username.clone(),
                uuid: raw_uuid,
                access_token: Some(access_token.clone()),
                refresh_token: None,
                expires_at: None,
                skin_url: None,
                avatar_url: None,
                littleskin_server_url: Some(server_url.to_string()),
                littleskin_access_token: Some(access_token.clone()),
            },
            access_token,
        ))
    }
}
