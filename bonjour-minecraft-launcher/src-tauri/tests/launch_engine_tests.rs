use bonjour_minecraft_launcher_lib::services::launch_engine::{LaunchEngine, classify_log_to_phase};
use bonjour_minecraft_launcher_lib::models::launch::LaunchPhaseId;

#[test]
fn test_launch_engine_new() {
    let engine = LaunchEngine::new();
    assert!(engine.get_session("nonexistent").is_none());
}

#[test]
fn test_start_session_creates_entry() {
    let engine = LaunchEngine::new();
    let session = engine.start_session("1.21".to_string(), "Player".to_string(), None);
    assert!(!session.id.is_empty());
    assert_eq!(session.version, "1.21");
    assert_eq!(session.account_name, "Player");
    assert!(!session.phases.is_empty());
    assert!(session.phases.len() >= 5, "Should have at least 5 launch phases");
}

#[test]
fn test_sessions_are_unique() {
    let engine = LaunchEngine::new();
    let s1 = engine.start_session("1.21".to_string(), "Player".to_string(), None);
    let s2 = engine.start_session("1.20".to_string(), "Steve".to_string(), Some("inst-1".to_string()));
    assert_ne!(s1.id, s2.id);
    assert_eq!(s2.instance_id, Some("inst-1".to_string()));
}

#[test]
fn test_get_phase_progress() {
    let engine = LaunchEngine::new();
    let session = engine.start_session("1.21".to_string(), "Player".to_string(), None);

    let progress = engine.get_phase_progress(&session.id);
    assert!(progress.is_some());
    let (completed, total, _pct) = progress.unwrap();
    assert_eq!(completed, 0);
    assert!(total > 0);
}

#[test]
fn test_remove_session() {
    let engine = LaunchEngine::new();
    let session = engine.start_session("1.21".to_string(), "Player".to_string(), None);
    let sid = session.id.clone();
    assert!(engine.get_session(&sid).is_some());
    engine.remove_session(&sid);
    assert!(engine.get_session(&sid).is_none());
}

#[test]
fn test_classify_log_to_phase_downloading() {
    let phase = classify_log_to_phase("Downloading library: net.minecraft:client:1.21");
    assert_eq!(phase, LaunchPhaseId::Downloading);
}

#[test]
fn test_classify_log_to_phase_extracting() {
    let phase = classify_log_to_phase("Extracting native libraries...");
    assert_eq!(phase, LaunchPhaseId::Extracting);
}

#[test]
fn test_classify_log_to_phase_java_init() {
    let phase = classify_log_to_phase("JVM launch args: -Xmx4096M -Xms2048M");
    assert_eq!(phase, LaunchPhaseId::JavaInit);
}

#[test]
fn test_classify_log_to_phase_resource_loading() {
    let phase = classify_log_to_phase("Loading texture atlas...");
    assert_eq!(phase, LaunchPhaseId::ResourceLoading);
}

#[test]
fn test_classify_log_to_phase_window_creating() {
    let phase = classify_log_to_phase("Created OpenGL 4.6 window 1920x1080");
    assert_eq!(phase, LaunchPhaseId::WindowCreating);
}

#[test]
fn test_classify_log_to_phase_class_loading() {
    let phase = classify_log_to_phase("Loading class net.minecraft.client.main.Main");
    assert_eq!(phase, LaunchPhaseId::ClassLoading);
}

#[test]
fn test_classify_log_to_phase_fabric_mods() {
    let phase = classify_log_to_phase("[FabricLoader] Loading 42 mods...");
    assert_eq!(phase, LaunchPhaseId::ClassLoading);
}

#[test]
fn test_classify_log_to_phase_forge_mods() {
    let phase = classify_log_to_phase("[ForgeModLoader] Initializing mods...");
    assert_eq!(phase, LaunchPhaseId::ClassLoading);
}

#[test]
fn test_classify_log_to_phase_general_default() {
    let phase = classify_log_to_phase("Some random log message without keywords");
    assert_eq!(phase, LaunchPhaseId::General);
}

#[test]
fn test_classify_log_to_phase_validating() {
    let phase = classify_log_to_phase("Verifying file hashes...");
    assert_eq!(phase, LaunchPhaseId::Validating);
}

#[test]
fn test_cleanup_old_sessions() {
    let engine = LaunchEngine::new();
    let session = engine.start_session("1.21".to_string(), "Player".to_string(), None);
    let sid = session.id.clone();
    engine.cleanup_old_sessions(0);
    let retrieved = engine.get_session(&sid);
    assert!(retrieved.is_none(), "Old non-running session should be cleaned up");
}

#[test]
fn test_phase_id_all_contains_all() {
    let all = LaunchPhaseId::all();
    assert_eq!(all.len(), 8);
}

#[test]
fn test_phase_id_from_str_roundtrip() {
    for phase in LaunchPhaseId::all() {
        let id_str = phase.id_str();
        let parsed = LaunchPhaseId::from_str(id_str);
        assert_eq!(parsed, Some(phase));
    }
}

#[test]
fn test_phase_id_labels_not_empty() {
    for phase in LaunchPhaseId::all() {
        let label = phase.label();
        assert!(!label.is_empty(), "Phase {:?} should have a label", phase);
    }
}
