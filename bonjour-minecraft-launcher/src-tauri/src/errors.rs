use serde::{Deserialize, Serialize};
use thiserror::Error;

macro_rules! access_message_fields {
    ($self:expr, $variant:ident, $field:ident) => {
        match $self {
            AppError::FileNotFound { $field, .. } => $field,
            AppError::FileReadError { $field, .. } => $field,
            AppError::FileWriteError { $field, .. } => $field,
            AppError::DirCreateError { $field, .. } => $field,
            AppError::JsonParseError { $field, .. } => $field,
            AppError::JsonSerializeError { $field, .. } => $field,
            AppError::NetworkError { $field, .. } => $field,
            AppError::DownloadError { $field, .. } => $field,
            AppError::InstanceNotFound { $field, .. } => $field,
            AppError::VersionNotFound { $field, .. } => $field,
            AppError::JavaNotFound { $field, .. } => $field,
            AppError::JavaExecutionError { $field, .. } => $field,
            AppError::LaunchFailed { $field, .. } => $field,
            AppError::AuthError { $field, .. } => $field,
            AppError::AccountNotFound { $field, .. } => $field,
            AppError::ModError { $field, .. } => $field,
            AppError::ModAnalysisError { $field, .. } => $field,
            AppError::WorldError { $field, .. } => $field,
            AppError::NbtParseError { $field, .. } => $field,
            AppError::ModpackError { $field, .. } => $field,
            AppError::ServerError { $field, .. } => $field,
            AppError::ResourceError { $field, .. } => $field,
            AppError::DatabaseError { $field, .. } => $field,
            AppError::DatabaseMigrationError { $field, .. } => $field,
            AppError::InvalidParam { $field, .. } => $field,
            AppError::Unsupported { $field, .. } => $field,
            AppError::ConcurrencyConflict { $field, .. } => $field,
            AppError::HashMismatch { $field, .. } => $field,
            AppError::ProcessError { $field, .. } => $field,
            AppError::Internal { $field, .. } => $field,
        }
    };
}

#[derive(Debug, Clone, Error, Serialize, Deserialize)]
#[serde(tag = "code", content = "details")]
pub enum AppError {
    #[error("文件未找到: {path}")]
    FileNotFound { path: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("文件读取失败: {path}")]
    FileReadError { path: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("文件写入失败: {path}")]
    FileWriteError { path: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("目录创建失败: {path}")]
    DirCreateError { path: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("JSON 解析失败")]
    JsonParseError { reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("JSON 序列化失败")]
    JsonSerializeError { reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("网络请求失败: {url}")]
    NetworkError { url: String, reason: String, status_code: Option<u16>, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("下载失败: {url}")]
    DownloadError { url: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("实例未找到: {instance_id}")]
    InstanceNotFound { instance_id: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("版本未找到: {version_id}")]
    VersionNotFound { version_id: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("Java 未找到")]
    JavaNotFound { searched_paths: Vec<String>, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("Java 执行失败")]
    JavaExecutionError { reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("游戏启动失败")]
    LaunchFailed { reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("认证失败")]
    AuthError { provider: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("账户未找到: {identifier}")]
    AccountNotFound { identifier: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("模组操作失败")]
    ModError { mod_name: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("模组分析失败: {file_path}")]
    ModAnalysisError { file_path: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("存档操作失败")]
    WorldError { world_name: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("NBT 解析失败")]
    NbtParseError { file_path: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("整合包操作失败")]
    ModpackError { modpack_name: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("服务器操作失败")]
    ServerError { server_name: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("资源操作失败")]
    ResourceError { resource_name: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("数据库操作失败")]
    DatabaseError { operation: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("数据库迁移失败")]
    DatabaseMigrationError { version: u32, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("参数无效: {param}")]
    InvalidParam { param: String, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("操作不支持")]
    Unsupported { feature: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("并发冲突")]
    ConcurrencyConflict { resource: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("哈希校验失败")]
    HashMismatch { file_path: String, expected: String, actual: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("进程操作失败")]
    ProcessError { pid: Option<u32>, reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
    #[error("内部错误")]
    Internal { reason: String, #[serde(skip)] message_zh: String, #[serde(skip)] message_en: String, #[serde(skip)] fix_action: String },
}

impl AppError {
    pub fn error_code(&self) -> &'static str {
        match self {
            AppError::FileNotFound { .. } => "FILE_001",
            AppError::FileReadError { .. } => "FILE_002",
            AppError::FileWriteError { .. } => "FILE_003",
            AppError::DirCreateError { .. } => "FILE_004",
            AppError::JsonParseError { .. } => "JSON_001",
            AppError::JsonSerializeError { .. } => "JSON_002",
            AppError::NetworkError { .. } => "NET_001",
            AppError::DownloadError { .. } => "NET_002",
            AppError::InstanceNotFound { .. } => "INSTANCE_001",
            AppError::VersionNotFound { .. } => "VERSION_001",
            AppError::JavaNotFound { .. } => "JAVA_001",
            AppError::JavaExecutionError { .. } => "JAVA_002",
            AppError::LaunchFailed { .. } => "LAUNCH_001",
            AppError::AuthError { .. } => "AUTH_001",
            AppError::AccountNotFound { .. } => "AUTH_002",
            AppError::ModError { .. } => "MOD_001",
            AppError::ModAnalysisError { .. } => "MOD_002",
            AppError::WorldError { .. } => "WORLD_001",
            AppError::NbtParseError { .. } => "WORLD_002",
            AppError::ModpackError { .. } => "MODPACK_001",
            AppError::ServerError { .. } => "SERVER_001",
            AppError::ResourceError { .. } => "RESOURCE_001",
            AppError::DatabaseError { .. } => "DB_001",
            AppError::DatabaseMigrationError { .. } => "DB_002",
            AppError::InvalidParam { .. } => "PARAM_001",
            AppError::Unsupported { .. } => "UNSUPPORTED_001",
            AppError::ConcurrencyConflict { .. } => "CONFLICT_001",
            AppError::HashMismatch { .. } => "HASH_001",
            AppError::ProcessError { .. } => "PROCESS_001",
            AppError::Internal { .. } => "INTERNAL_001",
        }
    }

    pub fn message_zh(&self) -> &str {
        access_message_fields!(self, AppError, message_zh)
    }

    pub fn message_en(&self) -> &str {
        access_message_fields!(self, AppError, message_en)
    }

    pub fn fix_action(&self) -> &str {
        access_message_fields!(self, AppError, fix_action)
    }

    pub fn to_error_response(&self) -> ErrorResponse {
        ErrorResponse {
            code: self.error_code().to_string(),
            message: self.to_string(),
            message_zh: self.message_zh().to_string(),
            message_en: self.message_en().to_string(),
            fix_action: self.fix_action().to_string(),
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ErrorResponse {
    pub code: String,
    pub message: String,
    pub message_zh: String,
    pub message_en: String,
    pub fix_action: String,
}

impl From<AppError> for String {
    fn from(err: AppError) -> String {
        let response = err.to_error_response();
        serde_json::to_string(&response).unwrap_or_else(|_| err.to_string())
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(err: rusqlite::Error) -> Self {
        AppError::DatabaseError {
            operation: "rusqlite".to_string(),
            reason: err.to_string(),
            message_zh: "数据库操作失败".to_string(),
            message_en: "Database operation failed".to_string(),
            fix_action: "请重启启动器，如果问题持续请删除数据库文件重新初始化".to_string(),
        }
    }
}

impl From<std::io::Error> for AppError {
    fn from(err: std::io::Error) -> Self {
        AppError::Internal {
            reason: err.to_string(),
            message_zh: "内部 I/O 错误".to_string(),
            message_en: "Internal I/O error".to_string(),
            fix_action: "请重试操作，如果问题持续请联系支持".to_string(),
        }
    }
}

impl From<serde_json::Error> for AppError {
    fn from(err: serde_json::Error) -> Self {
        AppError::JsonParseError {
            reason: err.to_string(),
            message_zh: "数据格式错误".to_string(),
            message_en: "Data format error".to_string(),
            fix_action: "请检查数据文件是否损坏".to_string(),
        }
    }
}

impl From<reqwest::Error> for AppError {
    fn from(err: reqwest::Error) -> Self {
        let url = err.url().map(|u| u.to_string()).unwrap_or_default();
        let status = err.status().map(|s| s.as_u16());
        AppError::NetworkError {
            url,
            reason: err.to_string(),
            status_code: status,
            message_zh: "网络请求失败".to_string(),
            message_en: "Network request failed".to_string(),
            fix_action: "请检查网络连接后重试".to_string(),
        }
    }
}

impl From<zip::result::ZipError> for AppError {
    fn from(err: zip::result::ZipError) -> Self {
        AppError::FileReadError {
            path: String::new(),
            reason: err.to_string(),
            message_zh: "ZIP 文件操作失败".to_string(),
            message_en: "ZIP file operation failed".to_string(),
            fix_action: "请检查文件是否完整且格式正确".to_string(),
        }
    }
}

impl From<String> for AppError {
    fn from(err: String) -> Self {
        AppError::Internal {
            reason: err.clone(),
            message_zh: "内部错误".to_string(),
            message_en: "Internal error".to_string(),
            fix_action: "请重试操作，如果问题持续请联系支持".to_string(),
        }
    }
}

pub fn file_not_found(path: impl AsRef<std::path::Path>) -> AppError {
    let p = path.as_ref().display().to_string();
    AppError::FileNotFound {
        path: p.clone(),
        message_zh: format!("文件未找到: {}", p),
        message_en: format!("File not found: {}", p),
        fix_action: "请确认文件路径是否正确".to_string(),
    }
}

pub fn file_read_error(path: impl AsRef<std::path::Path>, reason: impl Into<String>) -> AppError {
    let p = path.as_ref().display().to_string();
    let r = reason.into();
    AppError::FileReadError {
        path: p.clone(),
        reason: r.clone(),
        message_zh: format!("读取文件失败: {}", p),
        message_en: format!("Failed to read file: {}", p),
        fix_action: "请确认文件是否存在且有读取权限".to_string(),
    }
}

pub fn file_write_error(path: impl AsRef<std::path::Path>, reason: impl Into<String>) -> AppError {
    let p = path.as_ref().display().to_string();
    let r = reason.into();
    AppError::FileWriteError {
        path: p.clone(),
        reason: r.clone(),
        message_zh: format!("写入文件失败: {}", p),
        message_en: format!("Failed to write file: {}", p),
        fix_action: "请确认磁盘空间充足且有写入权限".to_string(),
    }
}

pub fn dir_create_error(path: impl AsRef<std::path::Path>, reason: impl Into<String>) -> AppError {
    let p = path.as_ref().display().to_string();
    let r = reason.into();
    AppError::DirCreateError {
        path: p.clone(),
        reason: r.clone(),
        message_zh: format!("创建目录失败: {}", p),
        message_en: format!("Failed to create directory: {}", p),
        fix_action: "请确认路径有效且有写入权限".to_string(),
    }
}

pub fn json_parse_error(reason: impl Into<String>) -> AppError {
    AppError::JsonParseError {
        reason: reason.into(),
        message_zh: "数据格式解析失败".to_string(),
        message_en: "Failed to parse data format".to_string(),
        fix_action: "请检查数据文件是否损坏".to_string(),
    }
}

pub fn instance_not_found(id: impl Into<String>) -> AppError {
    let i = id.into();
    AppError::InstanceNotFound {
        instance_id: i.clone(),
        message_zh: format!("实例未找到: {}", i),
        message_en: format!("Instance not found: {}", i),
        fix_action: "请确认实例ID是否正确".to_string(),
    }
}

pub fn version_not_found(id: impl Into<String>) -> AppError {
    let i = id.into();
    AppError::VersionNotFound {
        version_id: i.clone(),
        message_zh: format!("版本未找到: {}", i),
        message_en: format!("Version not found: {}", i),
        fix_action: "请确认版本是否已安装".to_string(),
    }
}

pub fn java_not_found() -> AppError {
    AppError::JavaNotFound {
        searched_paths: Vec::new(),
        message_zh: "未找到 Java 运行时".to_string(),
        message_en: "Java runtime not found".to_string(),
        fix_action: "请在设置中指定 Java 路径，或使用自动下载功能".to_string(),
    }
}

pub fn launch_failed(reason: impl Into<String>) -> AppError {
    let r = reason.into();
    AppError::LaunchFailed {
        reason: r.clone(),
        message_zh: format!("游戏启动失败: {}", r),
        message_en: format!("Game launch failed: {}", r),
        fix_action: "请检查 Java 路径和版本配置是否正确".to_string(),
    }
}

pub fn network_error(url: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::NetworkError {
        url: url.into(),
        reason: reason.into(),
        status_code: None,
        message_zh: "网络请求失败".to_string(),
        message_en: "Network request failed".to_string(),
        fix_action: "请检查网络连接后重试".to_string(),
    }
}

pub fn download_error(url: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::DownloadError {
        url: url.into(),
        reason: reason.into(),
        message_zh: "文件下载失败".to_string(),
        message_en: "File download failed".to_string(),
        fix_action: "请检查网络连接和磁盘空间后重试".to_string(),
    }
}

pub fn mod_error(name: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::ModError {
        mod_name: name.into(),
        reason: reason.into(),
        message_zh: "模组操作失败".to_string(),
        message_en: "Mod operation failed".to_string(),
        fix_action: "请检查模组文件是否完整".to_string(),
    }
}

pub fn mod_analysis_error(path: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::ModAnalysisError {
        file_path: path.into(),
        reason: reason.into(),
        message_zh: "模组分析失败".to_string(),
        message_en: "Mod analysis failed".to_string(),
        fix_action: "请确认模组文件是有效的 JAR 文件".to_string(),
    }
}

pub fn world_error(name: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::WorldError {
        world_name: name.into(),
        reason: reason.into(),
        message_zh: "存档操作失败".to_string(),
        message_en: "World operation failed".to_string(),
        fix_action: "请确认存档文件完整且未被占用".to_string(),
    }
}

pub fn window_error(label: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::Internal {
        reason: format!("Window error [{}]: {}", label.into(), reason.into()),
        message_zh: "窗口操作失败".to_string(),
        message_en: "Window operation failed".to_string(),
        fix_action: "请重试或重启启动器".to_string(),
    }
}

pub fn nbt_parse_error(path: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::NbtParseError {
        file_path: path.into(),
        reason: reason.into(),
        message_zh: "NBT 数据解析失败".to_string(),
        message_en: "NBT data parse failed".to_string(),
        fix_action: "请确认存档文件未损坏".to_string(),
    }
}

pub fn database_error(operation: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::DatabaseError {
        operation: operation.into(),
        reason: reason.into(),
        message_zh: "数据库操作失败".to_string(),
        message_en: "Database operation failed".to_string(),
        fix_action: "请重启启动器，如果问题持续请删除数据库文件重新初始化".to_string(),
    }
}

pub fn hash_mismatch(path: impl Into<String>, expected: impl Into<String>, actual: impl Into<String>) -> AppError {
    AppError::HashMismatch {
        file_path: path.into(),
        expected: expected.into(),
        actual: actual.into(),
        message_zh: "文件校验失败，文件可能已损坏".to_string(),
        message_en: "File hash mismatch, file may be corrupted".to_string(),
        fix_action: "请重新下载该文件".to_string(),
    }
}

pub fn resource_error(name: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::ResourceError {
        resource_name: name.into(),
        reason: reason.into(),
        message_zh: "资源操作失败".to_string(),
        message_en: "Resource operation failed".to_string(),
        fix_action: "请确认资源文件完整且未被占用".to_string(),
    }
}

pub fn modpack_error(name: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::ModpackError {
        modpack_name: name.into(),
        reason: reason.into(),
        message_zh: "整合包操作失败".to_string(),
        message_en: "Modpack operation failed".to_string(),
        fix_action: "请检查整合包文件是否完整且格式正确".to_string(),
    }
}

pub fn unsupported(feature: impl Into<String>) -> AppError {
    AppError::Unsupported {
        feature: feature.into(),
        message_zh: "该功能暂不支持".to_string(),
        message_en: "This feature is not supported yet".to_string(),
        fix_action: "请关注后续版本更新".to_string(),
    }
}

pub fn internal(reason: impl Into<String>) -> AppError {
    AppError::Internal {
        reason: reason.into(),
        message_zh: "内部错误".to_string(),
        message_en: "Internal error".to_string(),
        fix_action: "请重试操作，如果问题持续请联系支持".to_string(),
    }
}

pub fn server_error(server_name: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::ServerError {
        server_name: server_name.into(),
        reason: reason.into(),
        message_zh: "服务器操作失败".to_string(),
        message_en: "Server operation failed".to_string(),
        fix_action: "请检查服务器地址和配置是否正确".to_string(),
    }
}

pub fn process_error(pid: Option<u32>, reason: impl Into<String>) -> AppError {
    AppError::ProcessError {
        pid,
        reason: reason.into(),
        message_zh: "进程操作失败".to_string(),
        message_en: "Process operation failed".to_string(),
        fix_action: "请检查进程是否仍在运行".to_string(),
    }
}

pub fn invalid_param(param: impl Into<String>, reason: impl Into<String>) -> AppError {
    AppError::InvalidParam {
        param: param.into(),
        reason: reason.into(),
        message_zh: "参数无效".to_string(),
        message_en: "Invalid parameter".to_string(),
        fix_action: "请检查输入参数是否正确".to_string(),
    }
}
