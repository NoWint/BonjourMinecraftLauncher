use crate::models::launch::*;
use std::sync::LazyLock;

static JVM_PROFILES: LazyLock<Vec<JVMProfile>> = LazyLock::new(|| {
    vec![
        JVMProfile {
            id: "balanced".to_string(),
            name: "均衡模式".to_string(),
            description: "适合大多数玩家，自动选择最优参数".to_string(),
            level: JVMProfileLevel::Beginner,
            args: vec![
                "-XX:+UseG1GC",
                "-XX:+ParallelRefProcEnabled",
                "-XX:MaxGCPauseMillis=200",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:+DisableExplicitGC",
                "-XX:+AlwaysPreTouch",
                "-XX:G1NewSizePercent=30",
                "-XX:G1MaxNewSizePercent=40",
                "-XX:G1HeapRegionSize=8M",
                "-XX:G1ReservePercent=20",
                "-XX:G1HeapWastePercent=5",
                "-XX:G1MixedGCCountTarget=4",
                "-XX:InitiatingHeapOccupancyPercent=15",
                "-XX:G1MixedGCLiveThresholdPercent=90",
                "-XX:G1RSetUpdatingPauseTimePercent=5",
                "-XX:SurvivorRatio=32",
                "-XX:+PerfDisableSharedMem",
                "-XX:MaxTenuringThreshold=1",
            ].iter().map(|s| s.to_string()).collect(),
            recommended_memory: 4096,
            gc_type: "G1GC".to_string(),
            notes: "G1GC 均衡配置，适合 4-8GB 内存分配".to_string(),
        },
        JVMProfile {
            id: "performance".to_string(),
            name: "高性能模式".to_string(),
            description: "最大化游戏性能，适合高配电脑".to_string(),
            level: JVMProfileLevel::Advanced,
            args: vec![
                "-XX:+UseG1GC",
                "-XX:+ParallelRefProcEnabled",
                "-XX:MaxGCPauseMillis=130",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:+DisableExplicitGC",
                "-XX:+AlwaysPreTouch",
                "-XX:G1NewSizePercent=28",
                "-XX:G1MaxNewSizePercent=40",
                "-XX:G1HeapRegionSize=16M",
                "-XX:G1ReservePercent=15",
                "-XX:G1HeapWastePercent=5",
                "-XX:G1MixedGCCountTarget=4",
                "-XX:InitiatingHeapOccupancyPercent=10",
                "-XX:G1MixedGCLiveThresholdPercent=85",
                "-XX:G1RSetUpdatingPauseTimePercent=5",
                "-XX:SurvivorRatio=32",
                "-XX:+PerfDisableSharedMem",
                "-XX:MaxTenuringThreshold=1",
                "-XX:-UseBiasedLocking",
                "-XX:+UseStringDeduplication",
            ].iter().map(|s| s.to_string()).collect(),
            recommended_memory: 6144,
            gc_type: "G1GC".to_string(),
            notes: "G1GC 高性能配置，16M Region 适合 6GB+ 内存".to_string(),
        },
        JVMProfile {
            id: "low_memory".to_string(),
            name: "低内存模式".to_string(),
            description: "适合内存较小的电脑，减少 GC 暂停".to_string(),
            level: JVMProfileLevel::Beginner,
            args: vec![
                "-XX:+UseG1GC",
                "-XX:+ParallelRefProcEnabled",
                "-XX:MaxGCPauseMillis=50",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:+DisableExplicitGC",
                "-XX:G1NewSizePercent=20",
                "-XX:G1MaxNewSizePercent=30",
                "-XX:G1HeapRegionSize=4M",
                "-XX:G1ReservePercent=25",
                "-XX:G1HeapWastePercent=5",
                "-XX:G1MixedGCCountTarget=2",
                "-XX:InitiatingHeapOccupancyPercent=20",
                "-XX:SurvivorRatio=16",
                "-XX:+PerfDisableSharedMem",
                "-XX:MaxTenuringThreshold=2",
            ].iter().map(|s| s.to_string()).collect(),
            recommended_memory: 2048,
            gc_type: "G1GC".to_string(),
            notes: "G1GC 低内存配置，4M Region 适合 2-4GB 内存".to_string(),
        },
        JVMProfile {
            id: "zgc".to_string(),
            name: "ZGC 模式".to_string(),
            description: "超低延迟 GC，需要 Java 15+".to_string(),
            level: JVMProfileLevel::Expert,
            args: vec![
                "-XX:+UseZGC",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:+DisableExplicitGC",
                "-XX:+AlwaysPreTouch",
                "-XX:ZAllocationSpikeTolerance=2",
                "-XX:+UseStringDeduplication",
            ].iter().map(|s| s.to_string()).collect(),
            recommended_memory: 8192,
            gc_type: "ZGC".to_string(),
            notes: "ZGC 超低延迟，需要 Java 15+，适合 8GB+ 内存".to_string(),
        },
        JVMProfile {
            id: "aion".to_string(),
            name: "Aion 优化".to_string(),
            description: "社区流行的 Aion 启动参数".to_string(),
            level: JVMProfileLevel::Advanced,
            args: vec![
                "-XX:+UseG1GC",
                "-XX:+UnlockExperimentalVMOptions",
                "-XX:G1NewSizePercent=20",
                "-XX:G1ReservePercent=20",
                "-XX:MaxGCPauseMillis=50",
                "-XX:G1HeapRegionSize=32M",
                "-XX:InitiatingHeapOccupancyPercent=15",
                "-XX:G1MixedGCCountTarget=4",
                "-XX:G1MixedGCLiveThresholdPercent=90",
                "-XX:+ParallelRefProcEnabled",
                "-XX:+DisableExplicitGC",
                "-XX:+AlwaysPreTouch",
                "-XX:SurvivorRatio=32",
                "-XX:MaxTenuringThreshold=1",
                "-XX:-UseBiasedLocking",
                "-XX:+UseStringDeduplication",
                "-XX:+PerfDisableSharedMem",
            ].iter().map(|s| s.to_string()).collect(),
            recommended_memory: 6144,
            gc_type: "G1GC".to_string(),
            notes: "Aion 社区优化配置，32M Region 适合大内存".to_string(),
        },
    ]
});

pub fn get_jvm_profiles() -> Vec<JVMProfile> {
    JVM_PROFILES.clone()
}

pub fn get_jvm_profile_by_id(id: &str) -> Option<JVMProfile> {
    JVM_PROFILES.iter().find(|p| p.id == id).cloned()
}

pub fn recommend_profile(
    total_memory_mb: u64,
    java_major_version: u32,
    mod_count: u32,
) -> JVMTuningResult {
    let mut warnings: Vec<String> = Vec::new();

    let (profile, max_memory) = if total_memory_mb < 4096 {
        let max_mem = std::cmp::min(2048, (total_memory_mb as f64 * 0.5) as u64);
        warnings.push("系统内存较少，建议关闭其他程序以释放内存".to_string());
        (get_jvm_profile_by_id("low_memory").unwrap(), max_mem)
    } else if total_memory_mb >= 16384 && java_major_version >= 15 {
        let max_mem = std::cmp::min(8192, (total_memory_mb as f64 * 0.5) as u64);
        (get_jvm_profile_by_id("zgc").unwrap(), max_mem)
    } else if mod_count > 100 || total_memory_mb >= 12288 {
        let max_mem = std::cmp::min(8192, (total_memory_mb as f64 * 0.5) as u64);
        (get_jvm_profile_by_id("performance").unwrap(), max_mem)
    } else {
        let max_mem = std::cmp::min(4096, (total_memory_mb as f64 * 0.5) as u64);
        (get_jvm_profile_by_id("balanced").unwrap(), max_mem)
    };

    let mut profile = profile;

    if profile.id == "zgc" && java_major_version < 15 {
        warnings.push("ZGC 需要 Java 15 或更高版本，已自动切换到均衡模式".to_string());
        profile = get_jvm_profile_by_id("balanced").unwrap();
    }

    if max_memory < 1024 {
        warnings.push("分配内存低于 1GB，游戏可能无法正常启动".to_string());
    }

    if mod_count > 200 && max_memory < 6144 {
        warnings.push("模组数量较多，建议增加内存分配到 6GB 以上".to_string());
    }

    let min_memory = std::cmp::min(512, max_memory / 8);

    let args = build_jvm_args(&profile, max_memory, min_memory, "", java_major_version, &[]);

    JVMTuningResult {
        profile,
        args,
        memory_config: JVMMemoryConfig {
            min: min_memory,
            max: max_memory,
        },
        warnings,
    }
}

pub fn build_jvm_args(
    profile: &JVMProfile,
    max_memory: u64,
    min_memory: u64,
    game_version: &str,
    java_major_version: u32,
    custom_args: &[String],
) -> Vec<String> {
    let mut args: Vec<String> = Vec::new();

    if cfg!(target_os = "macos") {
        args.push("-XstartOnFirstThread".to_string());
    }

    args.push(format!("-Xmx{}M", max_memory));
    args.push(format!("-Xms{}M", min_memory));

    args.extend(profile.args.iter().filter(|a| {
        if java_major_version >= 18 && a.as_str() == "-XX:-UseBiasedLocking" {
            false
        } else {
            true
        }
    }).cloned());

    args.extend(
        vec![
            "--add-opens=java.base/java.lang=ALL-UNNAMED",
            "--add-opens=java.base/java.lang.invoke=ALL-UNNAMED",
            "--add-opens=java.base/java.util=ALL-UNNAMED",
            "--add-opens=java.base/java.io=ALL-UNNAMED",
            "--add-opens=java.base/sun.nio.ch=ALL-UNNAMED",
            "--add-opens=java.base/jdk.internal.ref=ALL-UNNAMED",
            "--add-opens=java.base/java.nio=ALL-UNNAMED",
            "--add-opens=java.base/jdk.internal.misc=ALL-UNNAMED",
        ].iter().map(|s| s.to_string())
    );

    if java_major_version >= 18 {
        args.push("--enable-native-access=ALL-UNNAMED".to_string());
    }

    if let Some(major_str) = game_version.split('.').nth(1) {
        if let Ok(major) = major_str.parse::<u32>() {
            if major >= 21 {
                args.push("-Dlog4j2.formatMsgNoLookups=true".to_string());
            }
        }
    }

    args.extend(custom_args.iter().cloned());

    args
}

pub fn get_system_memory_mb() -> u64 {
    let mut sys = sysinfo::System::new();
    sys.refresh_memory();
    sys.total_memory() / 1024 / 1024
}
