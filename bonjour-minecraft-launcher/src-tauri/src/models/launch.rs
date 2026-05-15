use serde::{Deserialize, Serialize};
use crate::models::account::Account;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchOptions {
    pub version: String,
    pub account: Account,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub java_path: Option<String>,
    pub max_memory: u64,
    pub min_memory: u64,
    pub game_dir: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub height: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fullscreen: Option<bool>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub server: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub jvm_args: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub instance_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchSession {
    pub id: String,
    pub version: String,
    pub account_name: String,
    pub instance_id: Option<String>,
    pub start_time: i64,
    pub phases: Vec<LaunchPhaseData>,
    pub logs: Vec<LaunchLogEntry>,
    pub status: LaunchSessionStatus,
    pub pid: Option<u32>,
    pub exit_code: Option<i32>,
    pub completed_at: Option<i64>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "camelCase")]
pub enum LaunchSessionStatus {
    Preparing,
    Launching,
    Running,
    Exited,
    Crashed,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Hash, Eq)]
#[serde(rename_all = "snake_case")]
pub enum LaunchPhaseId {
    Validating,
    JavaInit,
    Downloading,
    Extracting,
    ClassLoading,
    ResourceLoading,
    WindowCreating,
    General,
}

impl LaunchPhaseId {
    pub fn label(&self) -> &str {
        match self {
            LaunchPhaseId::Validating => "验证",
            LaunchPhaseId::JavaInit => "Java 初始化",
            LaunchPhaseId::Downloading => "下载资源",
            LaunchPhaseId::Extracting => "解压文件",
            LaunchPhaseId::ClassLoading => "类加载",
            LaunchPhaseId::ResourceLoading => "资源加载",
            LaunchPhaseId::WindowCreating => "窗口创建",
            LaunchPhaseId::General => "通用",
        }
    }

    pub fn id_str(&self) -> &str {
        match self {
            LaunchPhaseId::Validating => "validating",
            LaunchPhaseId::JavaInit => "java_init",
            LaunchPhaseId::Downloading => "downloading",
            LaunchPhaseId::Extracting => "extracting",
            LaunchPhaseId::ClassLoading => "class_loading",
            LaunchPhaseId::ResourceLoading => "resource_loading",
            LaunchPhaseId::WindowCreating => "window_creating",
            LaunchPhaseId::General => "general",
        }
    }

    pub fn all() -> Vec<LaunchPhaseId> {
        vec![
            LaunchPhaseId::Validating,
            LaunchPhaseId::JavaInit,
            LaunchPhaseId::Downloading,
            LaunchPhaseId::Extracting,
            LaunchPhaseId::ClassLoading,
            LaunchPhaseId::ResourceLoading,
            LaunchPhaseId::WindowCreating,
            LaunchPhaseId::General,
        ]
    }

    pub fn from_str(s: &str) -> Option<Self> {
        match s {
            "validating" => Some(LaunchPhaseId::Validating),
            "java_init" => Some(LaunchPhaseId::JavaInit),
            "downloading" => Some(LaunchPhaseId::Downloading),
            "extracting" => Some(LaunchPhaseId::Extracting),
            "class_loading" => Some(LaunchPhaseId::ClassLoading),
            "resource_loading" => Some(LaunchPhaseId::ResourceLoading),
            "window_creating" => Some(LaunchPhaseId::WindowCreating),
            "general" => Some(LaunchPhaseId::General),
            _ => None,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchPhaseData {
    pub id: LaunchPhaseId,
    pub label: String,
    pub status: LaunchPhaseStatus,
    pub started_at: Option<i64>,
    pub completed_at: Option<i64>,
    pub duration_ms: Option<u64>,
    pub parallel_tasks: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum LaunchPhaseStatus {
    Pending,
    Active,
    Completed,
    Error,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchLogEntry {
    #[serde(rename = "type")]
    pub log_type: String,
    pub message: String,
    pub phase_id: Option<String>,
    pub timestamp: i64,
    pub diagnosis: Option<LogDiagnosis>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LogDiagnosis {
    pub matched: bool,
    pub rule_id: String,
    pub title: String,
    pub description: String,
    pub solution: String,
    pub severity: DiagnosisSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum DiagnosisSeverity {
    Info,
    Warning,
    Error,
    Critical,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashReport {
    pub id: String,
    pub timestamp: i64,
    pub version: String,
    pub instance_id: Option<String>,
    pub exit_code: i32,
    pub stack_trace: String,
    pub system_info: CrashSystemInfo,
    pub mod_list: Vec<String>,
    pub jvm_args: Vec<String>,
    pub diagnosis: Option<CrashDiagnosis>,
    pub raw_log: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashSystemInfo {
    pub os: String,
    pub os_version: String,
    pub java_version: String,
    pub total_memory_mb: u64,
    pub cpu_model: String,
    pub gpu_info: String,
    pub disk_free_gb: f64,
    pub process_count: u32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashDiagnosis {
    pub category: String,
    pub title: String,
    pub description: String,
    pub solutions: Vec<CrashSolution>,
    pub confidence: f64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CrashSolution {
    pub id: String,
    pub title: String,
    pub description: String,
    pub action: CrashSolutionAction,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub target: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum CrashSolutionAction {
    UpdateDriver,
    RemoveMod,
    ChangeJvmArgs,
    UpdateJava,
    ChangeMemory,
    Reinstall,
    Manual,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JVMProfile {
    pub id: String,
    pub name: String,
    pub description: String,
    pub level: JVMProfileLevel,
    pub args: Vec<String>,
    pub recommended_memory: u64,
    pub gc_type: String,
    pub notes: String,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum JVMProfileLevel {
    Beginner,
    Advanced,
    Expert,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JVMTuningResult {
    pub profile: JVMProfile,
    pub args: Vec<String>,
    pub memory_config: JVMMemoryConfig,
    pub warnings: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct JVMMemoryConfig {
    pub min: u64,
    pub max: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct GameProcessInfo {
    pub pid: u32,
    pub instance_id: Option<String>,
    pub version: String,
    pub started_at: i64,
    pub status: GameProcessStatus,
    pub exit_code: Option<i32>,
    pub memory_usage: u64,
    pub cpu_usage: f32,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum GameProcessStatus {
    Running,
    Exited,
    Crashed,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProcessRecoveryOption {
    pub id: String,
    pub label: String,
    pub description: String,
    pub action: ProcessRecoveryAction,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ProcessRecoveryAction {
    Restart,
    ViewLog,
    RollbackVersion,
    QuickFix,
    Dismiss,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotConfigCategory {
    pub id: String,
    pub name: String,
    pub requires_restart: bool,
    pub patterns: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct HotConfigChange {
    pub file_path: String,
    pub category: String,
    pub can_hot_reload: bool,
    pub timestamp: i64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct IncrementalSyncResult {
    pub total_files: u32,
    pub existing_files: u32,
    pub missing_files: u32,
    pub corrupted_files: u32,
    pub downloaded_files: u32,
    pub skipped_files: u32,
    pub failed_files: u32,
    pub total_bytes: u64,
    pub downloaded_bytes: u64,
    pub duration_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchBenchmarkRecord {
    pub id: String,
    pub version: String,
    pub instance_id: Option<String>,
    pub timestamp: i64,
    pub total_duration_ms: u64,
    pub phase_durations_ms: std::collections::HashMap<String, u64>,
    pub java_version: String,
    pub max_memory: u64,
    pub mod_count: u32,
    pub exit_code: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LaunchBenchmarkSummary {
    pub version: String,
    pub average_duration_ms: u64,
    pub min_duration_ms: u64,
    pub max_duration_ms: u64,
    pub sample_count: u32,
    pub last_duration_ms: u64,
    pub deviation: f64,
    pub trend: BenchmarkTrend,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum BenchmarkTrend {
    Improving,
    Stable,
    Degrading,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ExitCodeAnalysis {
    pub category: String,
    pub description: String,
    pub severity: ExitCodeSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(rename_all = "snake_case")]
pub enum ExitCodeSeverity {
    Info,
    Warning,
    Error,
    Critical,
}
