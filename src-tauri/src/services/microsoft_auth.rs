use crate::errors::AppError;
// Microsoft OAuth Device Code Flow
// Replaces the Electron main process Microsoft auth implementation

use reqwest::Client;
use serde::{Deserialize, Serialize};
use crate::models::account::Account;

fn get_client_id() -> String {
    std::env::var("MICROSOFT_CLIENT_ID")
        .ok()
        .filter(|s| !s.is_empty() && s != "00000000-0000-0000-0000-000000000000")
        .unwrap_or_else(|| "54471e9d-11cd-4bd0-9a5c-77a49e897239".to_string())
}
const DEVICE_CODE_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/devicecode";
const TOKEN_URL: &str = "https://login.microsoftonline.com/consumers/oauth2/v2.0/token";
const XBL_AUTH_URL: &str = "https://user.auth.xboxlive.com/user/authenticate";
const XSTS_AUTH_URL: &str = "https://xsts.auth.xboxlive.com/xsts/authorize";
const MC_AUTH_URL: &str = "https://api.minecraftservices.com/authentication/login_with_xbox";
const MC_PROFILE_URL: &str = "https://api.minecraftservices.com/minecraft/profile";

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct MicrosoftAuthResult {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub account: Option<Account>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub user_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub device_code: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub verification_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expires_in: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub interval: Option<u64>,
}

pub struct MicrosoftAuthService {
    client: Client,
}

impl MicrosoftAuthService {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
        }
    }

    pub async fn start_device_code_flow(&self) -> Result<MicrosoftAuthResult, AppError> {
        let resp = self.client
            .post(DEVICE_CODE_URL)
            .form(&[
                ("client_id", get_client_id()),
                ("scope", "XboxLive.signin offline_access".to_string()),
            ])
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("Device code request failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse device code response: {}", e)))?;

        Ok(MicrosoftAuthResult {
            success: true,
            user_code: data["user_code"].as_str().map(|s| s.to_string()),
            device_code: data["device_code"].as_str().map(|s| s.to_string()),
            verification_url: data["verification_uri"].as_str().map(|s| s.to_string()),
            expires_in: data["expires_in"].as_u64(),
            interval: data["interval"].as_u64().or(Some(5)),
            account: None,
            error: None,
        })
    }

    pub async fn poll_token(&self, device_code: &str) -> Result<MicrosoftAuthResult, AppError> {
        let resp = self.client
            .post(TOKEN_URL)
            .form(&[
                ("client_id", get_client_id()),
                ("grant_type", "urn:ietf:params:oauth:grant-type:device_code".to_string()),
                ("device_code", device_code.to_string()),
            ])
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("Token poll failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse token response: {}", e)))?;

        if let Some(error) = data["error"].as_str() {
            if error == "authorization_pending" {
                return Ok(MicrosoftAuthResult {
                    success: false,
                    error: Some("authorization_pending".to_string()),
                    account: None,
                    user_code: None,
                    device_code: None,
                    verification_url: None,
                    expires_in: None,
                    interval: None,
                });
            }
            return Ok(MicrosoftAuthResult {
                success: false,
                error: Some(data["error_description"].as_str().unwrap_or(error).to_string()),
                account: None,
                user_code: None,
                device_code: None,
                verification_url: None,
                expires_in: None,
                interval: None,
            });
        }

        let access_token = data["access_token"].as_str().unwrap_or("");
        let refresh_token = data["refresh_token"].as_str().unwrap_or("");

        let account = self.complete_minecraft_auth(access_token).await?;

        Ok(MicrosoftAuthResult {
            success: true,
            account: Some(Account {
                id: uuid::Uuid::new_v4().to_string(),
                account_type: "microsoft".to_string(),
                username: account.username.clone(),
                uuid: account.uuid.clone(),
                access_token: Some(access_token.to_string()),
                refresh_token: Some(refresh_token.to_string()),
                expires_at: data["expires_in"].as_u64().map(|d| chrono::Utc::now().timestamp() as u64 + d),
                skin_url: account.skin_url.clone(),
                avatar_url: None,
                littleskin_server_url: None,
                littleskin_access_token: None,
            }),
            error: None,
            user_code: None,
            device_code: None,
            verification_url: None,
            expires_in: None,
            interval: None,
        })
    }

    async fn complete_minecraft_auth(&self, ms_access_token: &str) -> Result<MinecraftProfile, AppError> {
        let xbl_token = self.authenticate_xbl(ms_access_token).await?;
        let xsts_token = self.authenticate_xsts(&xbl_token).await?;
        let mc_token = self.authenticate_minecraft(&xsts_token).await?;
        let profile = self.get_minecraft_profile(&mc_token).await?;
        Ok(profile)
    }

    async fn authenticate_xbl(&self, access_token: &str) -> Result<String, AppError> {
        let resp = self.client
            .post(XBL_AUTH_URL)
            .json(&serde_json::json!({
                "Properties": {
                    "AuthMethod": "RPS",
                    "SiteName": "user.auth.xboxlive.com",
                    "RpsTicket": format!("d={}", access_token)
                },
                "RelyingParty": "http://auth.xboxlive.com",
                "TokenType": "JWT"
            }))
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("XBL auth failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse XBL response: {}", e)))?;

        data["Token"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| crate::errors::internal("No XBL token in response"))
    }

    async fn authenticate_xsts(&self, xbl_token: &str) -> Result<String, AppError> {
        let resp = self.client
            .post(XSTS_AUTH_URL)
            .json(&serde_json::json!({
                "Properties": {
                    "SandboxId": "RETAIL",
                    "UserTokens": [xbl_token]
                },
                "RelyingParty": "rp://api.minecraftservices.com/",
                "TokenType": "JWT"
            }))
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("XSTS auth failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse XSTS response: {}", e)))?;

        data["Token"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| crate::errors::internal("No XSTS token in response"))
    }

    async fn authenticate_minecraft(&self, xsts_token: &str) -> Result<String, AppError> {
        let resp = self.client
            .post(MC_AUTH_URL)
            .json(&serde_json::json!({
                "identityToken": format!("XBL3.0 x={};", xsts_token)
            }))
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("MC auth failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse MC auth response: {}", e)))?;

        data["access_token"].as_str()
            .map(|s| s.to_string())
            .ok_or_else(|| crate::errors::internal("No MC access token in response"))
    }

    async fn get_minecraft_profile(&self, mc_token: &str) -> Result<MinecraftProfile, AppError> {
        let resp = self.client
            .get(MC_PROFILE_URL)
            .header("Authorization", format!("Bearer {}", mc_token))
            .send()
            .await
            .map_err(|e| crate::errors::internal(format!("MC profile request failed: {}", e)))?;

        let data: serde_json::Value = resp.json().await
            .map_err(|e| crate::errors::internal(format!("Failed to parse MC profile: {}", e)))?;

        Ok(MinecraftProfile {
            username: data["name"].as_str().unwrap_or("Unknown").to_string(),
            uuid: data["id"].as_str().unwrap_or("").to_string(),
            skin_url: data["skins"].as_array()
                .and_then(|skins| skins.first())
                .and_then(|skin| skin["url"].as_str())
                .map(|s| s.to_string()),
        })
    }
}

#[derive(Debug, Clone)]
struct MinecraftProfile {
    username: String,
    uuid: String,
    skin_url: Option<String>,
}
