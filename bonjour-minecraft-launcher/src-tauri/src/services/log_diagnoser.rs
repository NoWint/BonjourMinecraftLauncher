use regex::Regex;
use std::sync::LazyLock;
use crate::models::launch::*;

struct LogRule {
    id: &'static str,
    pattern: Regex,
    title: &'static str,
    description: &'static str,
    solution: &'static str,
    severity: DiagnosisSeverity,
}

static LOG_RULES: LazyLock<Vec<LogRule>> = LazyLock::new(|| {
    vec![
        LogRule {
            id: "java_version_mismatch",
            pattern: Regex::new(r"(?i)UnsupportedClassVersionError|class file version.*unsupported|has been compiled by a more recent version of the Java Runtime").unwrap(),
            title: "Java 版本不兼容",
            description: "游戏或模组需要更高版本的 Java，当前 Java 版本太旧",
            solution: "请更新 Java 到 17 或更高版本，可在设置中配置 Java 路径",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "java_launch_failed",
            pattern: Regex::new(r"(?i)java\.lang\.IllegalArgumentException|Could not create the Java Virtual Machine").unwrap(),
            title: "Java 启动失败",
            description: "JVM 无法创建，可能是参数配置错误或 Java 版本不兼容",
            solution: "检查 JVM 参数设置，尝试恢复默认参数；确保使用 Java 17+",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "optifine_sodium_conflict",
            pattern: Regex::new(r"(?i)OptiFine.*Sodium|Sodium.*OptiFine|mixins\.sodium.*optifine").unwrap(),
            title: "OptiFine 与 Sodium 冲突",
            description: "OptiFine 和 Sodium 不能同时使用，它们会互相冲突",
            solution: "移除其中一个。推荐保留 Sodium（性能更好），移除 OptiFine",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "mod_missing_dependency",
            pattern: Regex::new(r"(?i)Missing dependency|requires.*which is missing|UnsatisfiedDependencyException").unwrap(),
            title: "模组缺少依赖",
            description: "某个模组需要的前置模组未安装",
            solution: "查看日志中提到的缺失模组名称，下载并安装对应的前置模组",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "mod_duplicate",
            pattern: Regex::new(r"(?i)Duplicate mod|Found duplicate|already registered").unwrap(),
            title: "模组重复安装",
            description: "检测到重复的模组文件，可能导致冲突",
            solution: "检查 mods 文件夹，删除重复的模组 jar 文件",
            severity: DiagnosisSeverity::Warning,
        },
        LogRule {
            id: "memory_out_of",
            pattern: Regex::new(r"(?i)OutOfMemoryError|Java heap space|Could not reserve enough space").unwrap(),
            title: "内存不足",
            description: "分配给游戏的内存不够，JVM 内存溢出",
            solution: "增加最大内存分配（建议 4GB 以上），或减少安装的模组数量",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "gpu_driver_old",
            pattern: Regex::new(r"(?i)GLFW error|OpenGL.*not supported|pixel format|GLX.*failed|driver.*outdated").unwrap(),
            title: "显卡驱动问题",
            description: "显卡驱动过旧或不支持所需的 OpenGL 版本",
            solution: "更新显卡驱动到最新版本；如果使用集成显卡，请安装专用驱动",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "asset_download_fail",
            pattern: Regex::new(r"(?i)Failed to download|Unable to download|connection.*timed? ?out|Connection refused").unwrap(),
            title: "下载失败",
            description: "游戏资源下载失败，可能是网络问题",
            solution: "检查网络连接；尝试切换下载源；使用增量修复功能重新下载缺失文件",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "forge_version_mismatch",
            pattern: Regex::new(r"(?i)Forge.*version.*mismatch|forge.*incompatible|net\.minecraftforge.*error").unwrap(),
            title: "Forge 版本不匹配",
            description: "Forge 版本与 Minecraft 版本不兼容",
            solution: "重新安装正确版本的 Forge，确保与游戏版本匹配",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "fabric_loader_error",
            pattern: Regex::new(r"(?i)FabricLoader.*error|fabric.*mixin.*error|net\.fabricmc.*crash").unwrap(),
            title: "Fabric 加载器错误",
            description: "Fabric 加载器遇到错误，可能是模组不兼容",
            solution: "更新 Fabric Loader 到最新版本；检查模组是否与当前版本兼容",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "mixin_error",
            pattern: Regex::new(r"(?i)Mixin.*error|MixinApplyError|mixin.*failed").unwrap(),
            title: "Mixin 注入失败",
            description: "模组的 Mixin 注入失败，通常是模组间冲突导致",
            solution: "查看日志中具体冲突的模组，尝试移除或更新相关模组",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "security_manager",
            pattern: Regex::new(r"(?i)SecurityManager|security.*exception|access denied").unwrap(),
            title: "安全限制错误",
            description: "Java 安全管理器阻止了某些操作",
            solution: "在 JVM 参数中添加 --add-opens 相关参数，或检查 Java 安全配置",
            severity: DiagnosisSeverity::Warning,
        },
        LogRule {
            id: "log4j_vulnerability",
            pattern: Regex::new(r"(?i)log4j.*vulnerable|Log4Shell|JNDI.*lookup").unwrap(),
            title: "Log4j 安全漏洞",
            description: "检测到 Log4j 安全漏洞风险",
            solution: "在 JVM 参数中添加 -Dlog4j2.formatMsgNoLookups=true；更新到最新游戏版本",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "world_corruption",
            pattern: Regex::new(r"(?i)Corrupted.*chunk|NBT.*error|level\.dat.*corrupt|Exception reading.*region").unwrap(),
            title: "存档损坏",
            description: "游戏存档数据损坏",
            solution: "尝试使用存档修复功能；从备份恢复存档",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "shader_error",
            pattern: Regex::new(r"(?i)shader.*error|GLSL.*compile|shaderpack.*failed|Iris.*error").unwrap(),
            title: "光影包错误",
            description: "光影包加载失败或与当前配置不兼容",
            solution: "更新光影包；检查光影包是否与当前 Minecraft 版本和模组加载器兼容",
            severity: DiagnosisSeverity::Warning,
        },
        LogRule {
            id: "exit_code_1",
            pattern: Regex::new(r"(?i)Process exited with code 1|exit code.*1$").unwrap(),
            title: "游戏异常退出 (Exit Code 1)",
            description: "游戏以错误代码 1 退出，通常表示启动过程中出现了致命错误",
            solution: "查看上方日志中的错误信息；尝试移除最近添加的模组；检查 Java 和显卡驱动",
            severity: DiagnosisSeverity::Error,
        },
        LogRule {
            id: "exit_code_neg1",
            pattern: Regex::new(r"(?i)Process exited with code -1|exit code.*-1$").unwrap(),
            title: "游戏崩溃 (Exit Code -1)",
            description: "游戏因 JVM 崩溃退出，可能是模组或驱动问题",
            solution: "检查显卡驱动是否最新；减少内存分配；移除可能导致崩溃的模组",
            severity: DiagnosisSeverity::Critical,
        },
        LogRule {
            id: "port_in_use",
            pattern: Regex::new(r"(?i)Address already in use|port.*occupied|Bind.*failed").unwrap(),
            title: "端口被占用",
            description: "游戏服务器端口已被其他程序占用",
            solution: "关闭占用端口的程序，或在设置中更换端口号",
            severity: DiagnosisSeverity::Warning,
        },
    ]
});

pub fn diagnose_log(message: &str) -> Option<LogDiagnosis> {
    for rule in LOG_RULES.iter() {
        if rule.pattern.is_match(message) {
            return Some(LogDiagnosis {
                matched: true,
                rule_id: rule.id.to_string(),
                title: rule.title.to_string(),
                description: rule.description.to_string(),
                solution: rule.solution.to_string(),
                severity: rule.severity.clone(),
            });
        }
    }
    None
}

pub fn diagnose_crash_report(
    raw_log: &str,
    exit_code: i32,
    _system_info: &CrashSystemInfo,
    _mod_list: &[String],
    _jvm_args: &[String],
) -> Option<CrashDiagnosis> {
    let mut all_diagnoses: Vec<LogDiagnosis> = Vec::new();

    for line in raw_log.lines() {
        if let Some(d) = diagnose_log(line) {
            all_diagnoses.push(d);
        }
    }

    if exit_code == -1 && all_diagnoses.is_empty() {
        all_diagnoses.push(LogDiagnosis {
            matched: true,
            rule_id: "jvm_crash".to_string(),
            title: "JVM 崩溃".to_string(),
            description: "JVM 意外崩溃，可能是内存不足或原生代码错误".to_string(),
            solution: "减少内存分配；更新 Java 和显卡驱动；检查 hs_err_pid 日志文件".to_string(),
            severity: DiagnosisSeverity::Critical,
        });
    }

    if exit_code == 1 && all_diagnoses.is_empty() {
        all_diagnoses.push(LogDiagnosis {
            matched: true,
            rule_id: "unknown_exit_1".to_string(),
            title: "游戏异常退出".to_string(),
            description: "游戏以代码 1 退出，原因未知".to_string(),
            solution: "查看完整日志寻找错误线索；尝试移除最近添加的模组；重新安装游戏版本".to_string(),
            severity: DiagnosisSeverity::Error,
        });
    }

    if all_diagnoses.is_empty() {
        return None;
    }

    all_diagnoses.sort_by(|a, b| {
        let order = |s: &DiagnosisSeverity| match s {
            DiagnosisSeverity::Critical => 0,
            DiagnosisSeverity::Error => 1,
            DiagnosisSeverity::Warning => 2,
            DiagnosisSeverity::Info => 3,
        };
        order(&a.severity).cmp(&order(&b.severity))
    });

    let primary = &all_diagnoses[0];
    let confidence = match primary.severity {
        DiagnosisSeverity::Critical => 0.95,
        DiagnosisSeverity::Error => 0.85,
        DiagnosisSeverity::Warning => 0.7,
        DiagnosisSeverity::Info => 0.6,
    };

    let solutions: Vec<CrashSolution> = primary.solution.split('；').enumerate().map(|(i, s)| {
        let action = infer_action_from_solution(s);
        let title: String = s.chars().take(20).collect();
        CrashSolution {
            id: format!("{}_sol_{}", primary.rule_id, i),
            title: format!("{}...", title),
            description: s.to_string(),
            action,
            target: None,
        }
    }).collect();

    Some(CrashDiagnosis {
        category: primary.rule_id.clone(),
        title: primary.title.clone(),
        description: primary.description.clone(),
        solutions,
        confidence,
    })
}

fn infer_action_from_solution(solution: &str) -> CrashSolutionAction {
    if solution.contains("更新") && solution.contains("驱动") {
        return CrashSolutionAction::UpdateDriver;
    }
    if solution.contains("移除") || solution.contains("删除") {
        return CrashSolutionAction::RemoveMod;
    }
    if solution.contains("JVM") || solution.contains("参数") {
        return CrashSolutionAction::ChangeJvmArgs;
    }
    if solution.contains("Java") {
        return CrashSolutionAction::UpdateJava;
    }
    if solution.contains("内存") {
        return CrashSolutionAction::ChangeMemory;
    }
    if solution.contains("重新安装") {
        return CrashSolutionAction::Reinstall;
    }
    CrashSolutionAction::Manual
}

pub fn extract_stack_trace(log: &str) -> String {
    let lines: Vec<&str> = log.lines().collect();
    let stack_start = lines.iter().position(|l| l.contains("Exception") || l.contains("Error") || l.contains("at "));

    match stack_start {
        Some(start) => {
            let mut stack_lines: Vec<String> = Vec::new();
            for i in start..std::cmp::min(lines.len(), start + 30) {
                let line = lines[i].trim();
                if line.starts_with("at ") || line.contains("Exception") || line.contains("Error") || line.starts_with("Caused by") {
                    stack_lines.push(line.to_string());
                } else if !stack_lines.is_empty() && line.is_empty() {
                    break;
                }
            }
            stack_lines.join("\n")
        }
        None => String::new(),
    }
}
