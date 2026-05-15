use reqwest::Client;
use tauri::Emitter;
use crate::models::version::VersionManifest;
use crate::errors::{self, AppError};

pub struct NetworkService {
    client: Client,
}

impl NetworkService {
    pub fn new() -> Self {
        let client = Client::builder()
            .timeout(std::time::Duration::from_secs(300))
            .build()
            .expect("Failed to create HTTP client");
        Self { client }
    }

    async fn retry_request<F, T>(&self, f: F, max_retries: u32) -> Result<T, AppError>
    where
        F: Fn(&Client) -> std::pin::Pin<Box<dyn std::future::Future<Output = Result<T, AppError>> + Send + '_>>,
    {
        let mut last_error: Option<AppError> = None;
        let mut attempt = 0;

        while attempt <= max_retries {
            if attempt > 0 {
                let delay = std::time::Duration::from_secs(1 << (attempt - 1));
                tracing::info!(attempt, delay_ms = delay.as_millis() as u64, "Retrying request");
                tokio::time::sleep(delay).await;
            }

            match f(&self.client).await {
                Ok(result) => return Ok(result),
                Err(e) => {
                    tracing::warn!(attempt, error = %e, "Request failed");
                    last_error = Some(e);
                }
            }
            attempt += 1;
        }

        Err(last_error.unwrap_or_else(|| errors::network_error("retry", "All retries exhausted")))
    }

    pub async fn get_version_manifest(&self) -> Result<VersionManifest, AppError> {
        let urls = vec![
            "https://bmclapi2.bangbang93.com/mc/game/version_manifest.json".to_string(),
            "https://launchermeta.mojang.com/mc/game/version_manifest.json".to_string(),
        ];

        self.retry_request(move |client| {
            let urls = urls.clone();
            Box::pin(async move {
                for url in &urls {
                    match client.get(url).send().await {
                        Ok(resp) if resp.status().is_success() => {
                            match resp.json::<VersionManifest>().await {
                                Ok(manifest) => return Ok(manifest),
                                Err(e) => {
                                    tracing::warn!(url, error = %e, "Failed to parse version manifest");
                                    continue;
                                }
                            }
                        }
                        Ok(resp) => {
                            tracing::warn!(url, status = %resp.status(), "HTTP error");
                            continue;
                        }
                        Err(e) => {
                            tracing::warn!(url, error = %e, "Request failed");
                            continue;
                        }
                    }
                }
                Err(errors::network_error("version_manifest", "All sources failed"))
            })
        }, 3).await
    }

    pub async fn download_file(&self, url: &str, target_path: &str) -> Result<(), AppError> {
        let url = url.to_string();
        let target_path = target_path.to_string();

        self.retry_request(move |client| {
            let url = url.clone();
            let target_path = target_path.clone();
            Box::pin(async move {
                let resp = client.get(&url).send().await
                    .map_err(|e| errors::download_error(&url, e.to_string()))?;

                if !resp.status().is_success() {
                    return Err(errors::download_error(&url, format!("HTTP {}", resp.status())));
                }

                let bytes = resp.bytes().await
                    .map_err(|e| errors::download_error(&url, e.to_string()))?;

                let target = std::path::Path::new(&target_path);
                if let Some(parent) = target.parent() {
                    std::fs::create_dir_all(parent)
                        .map_err(|e| errors::dir_create_error(parent, e.to_string()))?;
                }

                std::fs::write(target, &bytes)
                    .map_err(|e| errors::file_write_error(target, e.to_string()))?;

                Ok(())
            })
        }, 3).await
    }

    #[allow(dead_code)]
    pub async fn download_file_with_progress(
        &self,
        url: &str,
        target_path: &str,
        app: &tauri::AppHandle,
        task_id: &str,
    ) -> Result<(), AppError> {
        let resp = self.client.get(url).send().await
            .map_err(|e| errors::download_error(url, e.to_string()))?;

        if !resp.status().is_success() {
            return Err(errors::download_error(url, format!("HTTP {}", resp.status())));
        }

        let total = resp.content_length().unwrap_or(0);
        let target = std::path::Path::new(target_path);
        if let Some(parent) = target.parent() {
            std::fs::create_dir_all(parent)
                .map_err(|e| errors::dir_create_error(parent, e.to_string()))?;
        }

        let mut file = std::fs::File::create(target)
            .map_err(|e| errors::file_write_error(target, e.to_string()))?;

        let mut downloaded: u64 = 0;
        let start = std::time::Instant::now();
        let mut last_emit = std::time::Instant::now();

        use std::io::Write;
        let mut stream = resp.bytes_stream();
        use futures_util::StreamExt;

        while let Some(chunk) = stream.next().await {
            let chunk = chunk.map_err(|e| errors::download_error(url, e.to_string()))?;
            file.write_all(&chunk).map_err(|e| errors::file_write_error(target, e.to_string()))?;
            downloaded += chunk.len() as u64;

            if last_emit.elapsed() >= std::time::Duration::from_millis(100) {
                let elapsed = start.elapsed().as_secs_f64();
                let speed = if elapsed > 0.0 { (downloaded as f64 / elapsed) as u64 } else { 0 };
                let _ = app.emit("download-progress", serde_json::json!({
                    "taskId": task_id,
                    "downloaded": downloaded,
                    "total": total,
                    "speed": speed
                }));
                last_emit = std::time::Instant::now();
            }
        }

        let _ = app.emit("download-progress", serde_json::json!({
            "taskId": task_id,
            "downloaded": downloaded,
            "total": total,
            "speed": 0
        }));

        Ok(())
    }
}
