use serde::{Deserialize, Serialize};
use std::collections::HashMap;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModJarMetadata {
    pub mod_id: String,
    pub name: String,
    pub version: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    pub mod_loader: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub entry_class: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mixins: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dependencies: Option<Vec<ModDependencyInfo>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub license: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub homepage: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub issue_tracker_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub security_risk: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub obfuscation_mappings: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub class_entries: Option<Vec<String>>,
    #[serde(default)]
    pub network_access: bool,
    #[serde(default)]
    pub file_access: bool,
    #[serde(default)]
    pub reflection_access: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModDependencyInfo {
    pub mod_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version_range: Option<String>,
    #[serde(default)]
    pub required: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub side: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct LocalMod {
    pub id: String,
    pub name: String,
    pub file_name: String,
    pub file_path: String,
    pub file_size: u64,
    pub is_enabled: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_versions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_loader: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sha256: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<ModJarMetadata>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub install_date: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub config_path: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModConflict {
    pub mod_a_id: String,
    pub mod_a_name: String,
    pub mod_b_id: String,
    pub mod_b_name: String,
    pub reason: String,
    pub severity: String,
    pub conflict_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub detail: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub suggestion: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModSearchResult {
    pub mods: Vec<ModSearchItem>,
    pub total: usize,
    pub sources: ModSearchSources,
    pub search_time_ms: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModSearchItem {
    pub id: String,
    pub name: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub authors: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloads: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub game_versions: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub mod_loader: Option<String>,
    pub source: String,
    pub source_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub categories: Option<Vec<String>>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub last_updated: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModSearchSources {
    pub modrinth: ModSourceInfo,
    pub curseforge: ModSourceInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct ModSourceInfo {
    pub total: usize,
    pub latency_ms: u64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct BatchInstallTask {
    pub id: String,
    pub mod_id: String,
    pub mod_name: String,
    pub download_url: String,
    pub target_path: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_name: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub expected_hash: Option<String>,
    pub status: String,
    pub progress: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModUpdateInfo {
    pub mod_id: String,
    pub mod_name: String,
    pub current_version: String,
    pub latest_version: String,
    pub update_strategy: String,
    pub is_safe_update: bool,
    pub safety_level: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub changelog: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub file_size: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub version_diff: Option<ModVersionDiff>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModVersionDiff {
    pub major_changed: bool,
    pub minor_changed: bool,
    pub patch_changed: bool,
    pub is_downgrade: bool,
    pub distance: i32,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModRatingAggregation {
    pub mod_id: String,
    pub score: f64,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub curseforge_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modrinth_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub community_score: Option<f64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub time_decay_score: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModPerformanceRating {
    pub mod_id: String,
    pub impact: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub fps_impact: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub startup_impact: Option<i32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub memory_impact: Option<i32>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigMigrationInfo {
    pub mod_id: String,
    pub mod_name: String,
    pub old_version: String,
    pub new_version: String,
    pub old_config_path: String,
    pub new_config_path: String,
    pub changes: Vec<ConfigChangeInfo>,
    pub auto_migratable: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ConfigChangeInfo {
    pub key: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub old_value: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_value: Option<String>,
    pub status: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub new_key: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub migration_note: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModShareInfo {
    pub mod_id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub chinese_name: Option<String>,
    pub version: String,
    pub description: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    pub source: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub share_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub qr_code_data: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModEnhancedMetadata {
    pub mod_id: String,
    pub file_name: String,
    pub sha256: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub curseforge_match: Option<CurseForgeMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub modrinth_match: Option<ModrinthMatch>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merged_metadata: Option<ModJarMetadata>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CurseForgeMatch {
    pub id: u64,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub summary: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub download_count: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub rating: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ModrinthMatch {
    pub id: String,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub downloads: Option<u64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub icon_url: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub project_url: Option<String>,
}

pub static KNOWN_MOD_CONFLICTS: &[(&str, &str, &str, &str)] = &[
    ("optifine", "sodium", "OptiFine 与 Sodium 不兼容，两者都是渲染优化模组", "known-incompat"),
    ("optifine", "iris", "OptiFine 与 Iris 不兼容，Iris 需要 Sodium", "known-incompat"),
    ("sodium", "rubidium", "Sodium 和 Rubidium 不兼容，两者都是渲染优化", "known-incompat"),
    ("iris", "oculus", "Iris 和 Oculus 不兼容，分别是 Fabric/Forge 光影加载器", "known-incompat"),
    ("lithium", "carpet", "Lithium 可能与 Carpet Mod 的某些规则冲突", "known-incompat"),
    ("sodium", "phosphor", "Sodium 已内置 Phosphor 的功能，无需同时安装", "known-incompat"),
    ("indium", "rubidium", "Indium 是 Sodium 的补充，不兼容 Rubidium", "known-incompat"),
    ("betterend", "betterend-reforged", "Better End 和 Better End Reforged 是同一模组的不同版本", "id-conflict"),
    ("bclib", "bclib-reforged", "BCLib 和 BCLib Reforged 是同一模组的不同版本", "id-conflict"),
];

pub static KNOWN_CLASS_CONFLICTS: &[(&str, &str, &str)] = &[
    ("net/optifine/shaders/Shaders", "net/coderbot/iris/shaders/ShaderSet", "OptiFine 和 Iris 都修改了着色器渲染管线"),
    ("me/jellysquid/mods/lithium/common/LithiumMod", "carpet", "Lithium 的某些优化可能与 Carpet 规则冲突"),
];

pub static KNOWN_MIXIN_CONFLICTS: &[(&str, &str, &str)] = &[
    ("mixins.sodium.json", "mixins.optifine.json", "Sodium 和 OptiFine 的 MixIn 都修改了渲染引擎"),
    ("mixins.lithium.json", "mixins.carpet.json", "Lithium 和 Carpet 的 MixIn 可能修改相同的游戏逻辑"),
];

pub static LOADER_INCOMPATIBLE_PAIRS: &[(&str, &str)] = &[
    ("forge", "fabric"),
    ("forge", "quilt"),
    ("fabric", "neoforge"),
    ("neoforge", "quilt"),
];

pub static DANGEROUS_CLASS_PATTERNS: &[(&str, &str)] = &[
    ("java/lang/Runtime.exec", "执行系统命令"),
    ("java/lang/ProcessBuilder", "创建子进程"),
    ("java/net/Socket", "网络连接"),
    ("java/net/URL", "网络请求"),
    ("java/io/File.delete", "删除文件"),
    ("java/lang/reflect/Field.setAccessible", "反射访问私有字段"),
];

lazy_static::lazy_static! {
    pub static ref MOD_CHINESE_NAMES: HashMap<String, String> = {
        let mut m = HashMap::new();
        m.insert("sodium".into(), "钠（渲染优化）".into());
        m.insert("lithium".into(), "锂（逻辑优化）".into());
        m.insert("phosphor".into(), "磷（光照优化）".into());
        m.insert("iris".into(), "鸢尾（光影加载）".into());
        m.insert("optifine".into(), "高清修复".into());
        m.insert("fabric-api".into(), "Fabric API".into());
        m.insert("jei".into(), "Just Enough Items（物品管理）".into());
        m.insert("rei".into(), "Roughly Enough Items（物品管理）".into());
        m.insert("emi".into(), "EMI（物品管理）".into());
        m.insert("create".into(), "机械动力".into());
        m.insert("applied-energistics-2".into(), "应用能源2".into());
        m.insert("mekanism".into(), "通用机械".into());
        m.insert("thermal-expansion".into(), "热力膨胀".into());
        m.insert("botania".into(), "植物魔法".into());
        m.insert("thaumcraft".into(), "神秘时代".into());
        m.insert("blood-magic".into(), "血魔法".into());
        m.insert("twilight-forest".into(), "暮色森林".into());
        m.insert("tinkers-construct".into(), "匠魂".into());
        m.insert("ender-io".into(), "末影IO".into());
        m.insert("industrial-craft".into(), "工业时代".into());
        m.insert("forestry".into(), "林业".into());
        m.insert("biomes-o-plenty".into(), "超多生物群系".into());
        m.insert("terralith".into(), "Terralith（地形生成）".into());
        m.insert("xaeros-minimap".into(), "Xaero的小地图".into());
        m.insert("xaeros-world-map".into(), "Xaero的世界地图".into());
        m.insert("journeymap".into(), "旅行地图".into());
        m.insert("waystones".into(), "传送石碑".into());
        m.insert("appleskin".into(), "苹果皮（食物显示）".into());
        m.insert("wthit".into(), "WTHIT（方块显示）".into());
        m.insert("mouse-tweaks".into(), "鼠标调整".into());
        m.insert("chisel".into(), "凿子".into());
        m.insert("worldedit".into(), "世界编辑".into());
        m.insert("carpet".into(), "Carpet Mod（技术工具）".into());
        m.insert("litematica".into(), "投影".into());
        m.insert("minihud".into(), "迷你HUD".into());
        m.insert("modmenu".into(), "模组菜单".into());
        m.insert("architectury".into(), "Architectury API".into());
        m.insert("cloth-config".into(), "Cloth Config".into());
        m.insert("indium".into(), "铟（Sodium补充）".into());
        m.insert("ferritecore".into(), "铁芯（内存优化）".into());
        m.insert("modernfix".into(), "ModernFix（综合优化）".into());
        m.insert("entityculling".into(), "实体剔除".into());
        m.insert("noisium".into(), "Noisium（地形优化）".into());
        m.insert("starlight".into(), "星光（光照优化）".into());
        m.insert("dashloader".into(), "DashLoader（启动加速）".into());
        m.insert("continuity".into(), "Continuity（连接纹理）".into());
        m.insert("sodium-extra".into(), "Sodium Extra".into());
        m.insert("lambdynamiclights".into(), "Lamb动态光源".into());
        m.insert("rubidium".into(), "铷（Forge渲染优化）".into());
        m.insert("embeddium".into(), "Embeddium（Forge渲染优化）".into());
        m.insert("oculus".into(), "Oculus（Forge光影）".into());
        m.insert("geckolib".into(), "GeckoLib（动画库）".into());
        m.insert("curios".into(), "Curios（饰品栏）".into());
        m.insert("patchouli".into(), "Patchouli（书本系统）".into());
        m.insert("kubejs".into(), "KubeJS".into());
        m.insert("crafttweaker".into(), "CraftTweaker".into());
        m.insert("quark".into(), "Quark（奇趣模组）".into());
        m.insert("supplementaries".into(), "补充物品".into());
        m.insert("debugify".into(), "Debugify".into());
        m.insert("no-chat-reports".into(), "No Chat Reports".into());
        m.insert("language-reload".into(), "语言重载".into());
        m.insert("smooth-boot".into(), "Smooth Boot".into());
        m.insert("immediatelyfast".into(), "ImmediatelyFast".into());
        m.insert("nvidium".into(), "Nvidium".into());
        m.insert("better-fps-render-distance".into(), "更好FPS渲染距离".into());
        m.insert("badoptimizations".into(), "BadOptimizations".into());
        m.insert("forgetmechunk".into(), "ForgetMeChunk".into());
        m
    };

    pub static ref MOD_PERFORMANCE_RATINGS: HashMap<String, String> = {
        let mut m = HashMap::new();
        m.insert("sodium".into(), "none".into());
        m.insert("lithium".into(), "none".into());
        m.insert("phosphor".into(), "none".into());
        m.insert("starlight".into(), "none".into());
        m.insert("ferritecore".into(), "none".into());
        m.insert("modernfix".into(), "none".into());
        m.insert("entityculling".into(), "none".into());
        m.insert("noisium".into(), "none".into());
        m.insert("dashloader".into(), "none".into());
        m.insert("indium".into(), "none".into());
        m.insert("sodium-extra".into(), "none".into());
        m.insert("moreculling".into(), "none".into());
        m.insert("immediatelyfast".into(), "none".into());
        m.insert("nvidium".into(), "none".into());
        m.insert("badoptimizations".into(), "none".into());
        m.insert("continuity".into(), "low".into());
        m.insert("lambdynamiclights".into(), "low".into());
        m.insert("animatica".into(), "low".into());
        m.insert("iris".into(), "low".into());
        m.insert("modmenu".into(), "none".into());
        m.insert("appleskin".into(), "none".into());
        m.insert("wthit".into(), "none".into());
        m.insert("mouse-tweaks".into(), "none".into());
        m.insert("xaeros-minimap".into(), "low".into());
        m.insert("xaeros-world-map".into(), "low".into());
        m.insert("journeymap".into(), "medium".into());
        m.insert("optifine".into(), "low".into());
        m.insert("create".into(), "medium".into());
        m.insert("applied-energistics-2".into(), "medium".into());
        m.insert("mekanism".into(), "medium".into());
        m.insert("botania".into(), "medium".into());
        m.insert("thaumcraft".into(), "medium".into());
        m.insert("twilight-forest".into(), "high".into());
        m.insert("biomes-o-plenty".into(), "medium".into());
        m.insert("terralith".into(), "low".into());
        m.insert("worldedit".into(), "low".into());
        m.insert("litematica".into(), "medium".into());
        m.insert("tinkers-construct".into(), "high".into());
        m.insert("thermal-expansion".into(), "medium".into());
        m.insert("ender-io".into(), "high".into());
        m.insert("forestry".into(), "medium".into());
        m.insert("blood-magic".into(), "medium".into());
        m.insert("carpet".into(), "none".into());
        m.insert("rubidium".into(), "none".into());
        m.insert("embeddium".into(), "none".into());
        m.insert("oculus".into(), "low".into());
        m.insert("geckolib".into(), "low".into());
        m.insert("curios".into(), "low".into());
        m.insert("patchouli".into(), "low".into());
        m.insert("quark".into(), "medium".into());
        m.insert("supplementaries".into(), "low".into());
        m.insert("kubejs".into(), "low".into());
        m.insert("debugify".into(), "none".into());
        m.insert("no-chat-reports".into(), "none".into());
        m.insert("smooth-boot".into(), "none".into());
        m.insert("better-fps-render-distance".into(), "none".into());
        m
    };

    pub static ref MOD_PERFORMANCE_DETAILS: HashMap<String, (i32, i32, i32)> = {
        let mut m = HashMap::new();
        m.insert("sodium".into(), (50, -2, -50));
        m.insert("lithium".into(), (5, -1, 0));
        m.insert("iris".into(), (-15, 3, 200));
        m.insert("optifine".into(), (20, 5, 100));
        m.insert("create".into(), (-10, 15, 300));
        m.insert("twilight-forest".into(), (-25, 20, 500));
        m.insert("journeymap".into(), (-8, 10, 400));
        m.insert("ferritecore".into(), (0, -3, -200));
        m.insert("modernfix".into(), (3, -10, -100));
        m.insert("entityculling".into(), (15, 0, 0));
        m
    };

    pub static ref MOD_ASSOCIATIONS: HashMap<String, Vec<(String, u32)>> = {
        let mut m = HashMap::new();
        m.insert("sodium".into(), vec![
            ("lithium".into(), 92), ("phosphor".into(), 45),
            ("iris".into(), 78), ("ferritecore".into(), 65), ("modmenu".into(), 88),
        ]);
        m.insert("create".into(), vec![
            ("jei".into(), 95), ("create-additions".into(), 60), ("curios".into(), 55),
        ]);
        m.insert("optifine".into(), vec![
            ("jei".into(), 70), ("xaeros-minimap".into(), 65),
        ]);
        m.insert("fabric-api".into(), vec![
            ("sodium".into(), 80), ("modmenu".into(), 85), ("cloth-config".into(), 60),
        ]);
        m.insert("jei".into(), vec![
            ("appleskin".into(), 75), ("mouse-tweaks".into(), 70),
        ]);
        m.insert("mekanism".into(), vec![
            ("jei".into(), 98), ("curios".into(), 50),
        ]);
        m.insert("botania".into(), vec![
            ("patchouli".into(), 99), ("curios".into(), 80),
        ]);
        m.insert("xaeros-minimap".into(), vec![
            ("xaeros-world-map".into(), 85),
        ]);
        m
    };
}
