use bonjour_minecraft_launcher_lib::services::crash_analyzer;
use bonjour_minecraft_launcher_lib::models::launch::{ExitCodeSeverity, ProcessRecoveryAction};

#[test]
fn test_exit_code_0_is_normal() {
    let analysis = crash_analyzer::analyze_exit_code(0);
    assert_eq!(analysis.category, "normal");
    assert_eq!(analysis.severity, ExitCodeSeverity::Info);
    assert!(analysis.description.contains("正常"));
}

#[test]
fn test_exit_code_1_is_error() {
    let analysis = crash_analyzer::analyze_exit_code(1);
    assert_eq!(analysis.category, "error");
    assert_eq!(analysis.severity, ExitCodeSeverity::Error);
}

#[test]
fn test_exit_code_negative_1_is_critical() {
    let analysis = crash_analyzer::analyze_exit_code(-1);
    assert_eq!(analysis.category, "crash");
    assert_eq!(analysis.severity, ExitCodeSeverity::Critical);
    assert!(analysis.description.contains("JVM"));
}

#[test]
fn test_exit_code_137_is_oom() {
    let analysis = crash_analyzer::analyze_exit_code(137);
    assert_eq!(analysis.category, "oom");
    assert_eq!(analysis.severity, ExitCodeSeverity::Critical);
    assert!(analysis.description.contains("OOM") || analysis.description.contains("内存"));
}

#[test]
fn test_exit_code_130_is_interrupted() {
    let analysis = crash_analyzer::analyze_exit_code(130);
    assert_eq!(analysis.category, "interrupted");
    assert_eq!(analysis.severity, ExitCodeSeverity::Info);
}

#[test]
fn test_signal_exit_codes() {
    let analysis = crash_analyzer::analyze_exit_code(139);
    assert_eq!(analysis.category, "signal");
    assert_eq!(analysis.severity, ExitCodeSeverity::Warning);
}

#[test]
fn test_unknown_exit_code() {
    let analysis = crash_analyzer::analyze_exit_code(42);
    assert_eq!(analysis.category, "unknown");
    assert_eq!(analysis.severity, ExitCodeSeverity::Warning);
}

#[test]
fn test_recovery_options_for_normal_exit() {
    let options = crash_analyzer::get_recovery_options(0, "1.21", None);
    let ids: Vec<&str> = options.iter().map(|o| o.id.as_str()).collect();
    assert!(ids.contains(&"restart"));
    assert!(ids.contains(&"view_log"));
    assert!(ids.contains(&"dismiss"));
}

#[test]
fn test_recovery_options_for_crash_includes_quick_fix() {
    let options = crash_analyzer::get_recovery_options(-1, "1.21", None);
    let ids: Vec<&str> = options.iter().map(|o| o.id.as_str()).collect();
    assert!(ids.contains(&"quick_fix"), "Crash recovery should include quick_fix");
}

#[test]
fn test_recovery_options_for_oom_includes_quick_fix() {
    let options = crash_analyzer::get_recovery_options(137, "1.21", None);
    let ids: Vec<&str> = options.iter().map(|o| o.id.as_str()).collect();
    assert!(ids.contains(&"quick_fix"), "OOM recovery should include quick_fix");
}

#[test]
fn test_recovery_options_action_types() {
    let options = crash_analyzer::get_recovery_options(1, "1.21", Some("test-instance"));
    let has_rollback = options.iter().any(|o| o.action == ProcessRecoveryAction::RollbackVersion);
    assert!(has_rollback, "Error exit should include rollback option");
}

#[test]
fn test_create_crash_report_structure() {
    let report = crash_analyzer::create_crash_report(
        "1.21",
        1,
        "java.lang.NullPointerException\n    at com.example.Mod.init(Mod.java:42)\n    at net.minecraft.init.Bootstrap.main(Bootstrap.java:500)",
        Some("test-instance"),
        &["mod-a.jar".to_string(), "mod-b.jar".to_string()],
        &["-Xmx4096M".to_string(), "-Xms2048M".to_string()],
    );
    assert!(!report.id.is_empty());
    assert_eq!(report.version, "1.21");
    assert_eq!(report.exit_code, 1);
    assert_eq!(report.mod_list.len(), 2);
    assert_eq!(report.jvm_args.len(), 2);
    assert!(report.timestamp > 0);
}
