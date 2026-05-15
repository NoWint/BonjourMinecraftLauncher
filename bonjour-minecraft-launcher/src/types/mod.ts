export type ModLoaderType = 'forge' | 'fabric' | 'quilt' | 'neoforge' | 'liteloader' | 'unknown'

export type ModSource = 'curseforge' | 'modrinth' | 'github' | 'local'

export type ModUpdateStrategy = 'safe' | 'same-major' | 'latest'

export type PerformanceImpact = 'none' | 'low' | 'medium' | 'high'

export type ModPlayStyle = 'tech' | 'magic' | 'adventure' | 'building' | 'casual' | 'optimization' | 'utility' | 'library'

export type ConflictType = 'id-conflict' | 'known-incompat' | 'loader-mismatch' | 'version-mismatch' | 'class-conflict' | 'mixin-conflict' | 'event-bus-conflict'

export type SecurityRisk = 'none' | 'low' | 'medium' | 'high'

export type ReleaseType = 'release' | 'beta' | 'alpha'

export interface ModInfo {
  id: string
  name: string
  description: string
  version: string
  authors: string[]
  license?: string
  iconUrl?: string
  projectUrl?: string
  gameVersions: string[]
  modLoader: ModLoaderType
  dependencies: ModDependency[]
  fileName?: string
  fileSize?: number
  downloadUrl?: string
  fileId?: string
  source: ModSource
  sourceId: string
  isInstalled?: boolean
  isEnabled?: boolean
  installPath?: string
  downloads?: number
  rating?: ModRating
  chineseName?: string
  chineseTags?: string[]
  performanceImpact?: PerformanceImpact
  performanceDetail?: PerformanceDetail
  updateStrategy?: ModUpdateStrategy
  latestVersion?: string
  latestVersionId?: string
  categories?: string[]
  lastUpdated?: string
  githubRepo?: string
}

export interface ModDependency {
  modId: string
  name: string
  required: boolean
  versionRange?: string
  source?: ModSource
  resolvedMod?: ModInfo
}

export interface ModConflict {
  modA: ModInfo | LocalMod
  modB: ModInfo | LocalMod
  reason: string
  severity: 'warning' | 'error'
  type: ConflictType
  detail?: string
  suggestion?: string
}

export interface ModSearchOptions {
  query?: string
  gameVersion?: string
  modLoader?: ModLoaderType
  category?: string
  sortBy?: 'relevance' | 'downloads' | 'updated' | 'newest'
  offset?: number
  limit?: number
  sources?: ModSource[]
}

export interface ModSearchResult {
  mods: ModInfo[]
  total: number
  offset: number
  limit: number
  sources: {
    modrinth: SourceSearchInfo
    curseforge: SourceSearchInfo
    github?: SourceSearchInfo
  }
  searchTime: number
}

export interface SourceSearchInfo {
  total: number
  latency: number
  error?: string
}

export interface ModCategory {
  id: string
  name: string
  iconUrl?: string
}

export interface ModFile {
  id: string
  version: string
  gameVersions: string[]
  modLoader: ModLoaderType
  downloadUrl: string
  fileSize: number
  releaseType: ReleaseType
  uploadDate: string
  downloads: number
  changelog?: string
  dependencies?: ModDependency[]
  parentProjectId?: string
  hashes?: { sha1?: string; sha512?: string }
  filename?: string
}

export interface LocalMod extends ModInfo {
  filePath: string
  fileSize: number
  sha256?: string
  installDate: string
  isEnabled: boolean
  metadata?: ModJarMetadata
  configPath?: string
  configMigrated?: boolean
}

export interface ModJarMetadata {
  modId: string
  name: string
  version: string
  description?: string
  authors?: string[]
  modLoader: ModLoaderType
  entryClass?: string
  mixins?: string[]
  dependencies?: ModDependency[]
  iconPath?: string
  license?: string
  homepage?: string
  sourceUrl?: string
  issueTrackerUrl?: string
  securityRisk?: SecurityRisk
  sha256?: string
  obfuscationMappings?: string[]
  classEntries?: string[]
  networkAccess?: boolean
  fileAccess?: boolean
  reflectionAccess?: boolean
}

export interface BatchInstallTask {
  id: string
  mod: ModInfo
  status: 'pending' | 'resolving' | 'downloading' | 'installing' | 'done' | 'error' | 'conflict'
  progress: number
  error?: string
  dependencies?: BatchInstallTask[]
  resolvedVersion?: ModFile
}

export interface BatchInstallQueue {
  tasks: BatchInstallTask[]
  totalProgress: number
  conflicts: ModConflict[]
  isRunning: boolean
  startTime?: number
  endTime?: number
}

export interface ModRecommendation {
  playStyle: ModPlayStyle
  label: string
  description: string
  icon: string
  mods: ModInfo[]
  relatedMods?: Record<string, ModInfo[]>
}

export interface ModAssociation {
  modId: string
  coInstalledWith: { modId: string; percentage: number }[]
}

export interface ModUpdateInfo {
  modId: string
  modName?: string
  currentVersion: string
  latestVersion: string
  updateStrategy: ModUpdateStrategy
  isSafeUpdate: boolean
  safetyLevel: 'safe' | 'caution' | 'risky'
  changelog?: string
  downloadUrl?: string
  fileSize?: number
  versionDiff?: ModVersionDiff
}

export interface ModVersionDiff {
  majorChanged: boolean
  minorChanged: boolean
  patchChanged: boolean
  isDowngrade: boolean
  distance: number
}

export interface ModRating {
  score: number
  curseforgeScore?: number
  modrinthScore?: number
  communityScore?: number
  downloadCount?: number
  followerCount?: number
  timeDecayScore?: number
}

export interface PerformanceDetail {
  impact: PerformanceImpact
  fpsImpact?: number
  startupImpact?: number
  memoryImpact?: number
  testConfig?: string
  communityReports?: number
}

export interface ConfigMigration {
  modId: string
  modName: string
  oldVersion: string
  newVersion: string
  oldConfigPath: string
  newConfigPath: string
  changes: ConfigChange[]
  autoMigratable: boolean
}

export interface ConfigChange {
  key: string
  oldValue?: string
  newValue?: string
  status: 'kept' | 'renamed' | 'changed-type' | 'removed' | 'added'
  newKey?: string
  migrationNote?: string
}

export interface ModShareCard {
  modId: string
  name: string
  chineseName?: string
  version: string
  description: string
  iconUrl?: string
  source: ModSource
  downloadUrl?: string
  shareUrl?: string
  qrCodeData?: string
}

export interface ModpackImport {
  mods: ModInfo[]
  name: string
  gameVersion: string
  modLoader: ModLoaderType
  source: 'curseforge' | 'modrinth' | 'custom'
}

export const PERFORMANCE_LABELS: Record<PerformanceImpact, { label: string; emoji: string; color: string; fpsImpact: string }> = {
  none: { label: '几乎无影响', emoji: '🟢', color: '#22c55e', fpsImpact: '0-5%' },
  low: { label: '略有影响', emoji: '🟡', color: '#eab308', fpsImpact: '5-15%' },
  medium: { label: '明显影响', emoji: '🟠', color: '#f97316', fpsImpact: '15-40%' },
  high: { label: '严重影响', emoji: '🔴', color: '#ef4444', fpsImpact: '40%+' },
}

export const PLAY_STYLE_CONFIG: Record<ModPlayStyle, { label: string; icon: string; description: string }> = {
  tech: { label: '科技', icon: '⚙️', description: '工业自动化、红石机械、物流系统' },
  magic: { label: '魔法', icon: '✨', description: '魔法体系、神秘学、法术研究' },
  adventure: { label: '冒险', icon: '⚔️', description: '新维度、Boss战、地牢探索' },
  building: { label: '建筑', icon: '🏗️', description: '装饰方块、建筑工具、世界编辑' },
  casual: { label: '休闲', icon: '🌿', description: '农业、烹饪、宠物、装饰' },
  optimization: { label: '优化', icon: '🚀', description: '性能优化、渲染改进、启动加速' },
  utility: { label: '工具', icon: '🔧', description: '地图、信息显示、辅助工具' },
  library: { label: '库', icon: '📚', description: '其他模组的依赖库' },
}

export const LOADER_CONFIG: Record<ModLoaderType, { label: string; color: string; bgColor: string; borderColor: string; icon: string }> = {
  forge: { label: 'Forge', color: '#f97316', bgColor: 'rgba(249,115,22,0.1)', borderColor: 'rgba(249,115,22,0.2)', icon: '🔨' },
  fabric: { label: 'Fabric', color: '#3b82f6', bgColor: 'rgba(59,130,246,0.1)', borderColor: 'rgba(59,130,246,0.2)', icon: '🧵' },
  quilt: { label: 'Quilt', color: '#8b5cf6', bgColor: 'rgba(139,92,246,0.1)', borderColor: 'rgba(139,92,246,0.2)', icon: '🪡' },
  neoforge: { label: 'NeoForge', color: '#ef4444', bgColor: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', icon: '⚒️' },
  liteloader: { label: 'LiteLoader', color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.2)', icon: '🪶' },
  unknown: { label: '未知', color: '#6b7280', bgColor: 'rgba(107,114,128,0.1)', borderColor: 'rgba(107,114,128,0.2)', icon: '❓' },
}

export const KNOWN_MOD_CONFLICTS: [string, string, string, ConflictType][] = [
  ['optifine', 'sodium', 'OptiFine 与 Sodium 不兼容，两者都是渲染优化模组', 'known-incompat'],
  ['optifine', 'iris', 'OptiFine 与 Iris 不兼容，Iris 需要 Sodium', 'known-incompat'],
  ['optifine', 'rubidium', 'OptiFine 与 Rubidium 不兼容', 'known-incompat'],
  ['sodium', 'optifine', 'Sodium 与 OptiFine 不兼容', 'known-incompat'],
  ['iris', 'optifine', 'Iris 与 OptiFine 不兼容', 'known-incompat'],
  ['lithium', 'carpet', 'Lithium 可能与 Carpet Mod 的某些规则冲突', 'known-incompat'],
  ['forge', 'fabric', 'Forge 和 Fabric 模组不能混用', 'loader-mismatch'],
  ['forge', 'quilt', 'Forge 和 Quilt 模组不能混用', 'loader-mismatch'],
  ['fabric', 'neoforge', 'Fabric 和 NeoForge 模组不能混用', 'loader-mismatch'],
  ['sodium', 'phosphor', 'Sodium 已内置 Phosphor 的功能，无需同时安装', 'known-incompat'],
  ['indium', 'rubidium', 'Indium 是 Sodium 的补充，不兼容 Rubidium', 'known-incompat'],
  ['betterend', 'betterend-reforged', 'Better End 和 Better End Reforged 是同一模组的不同版本', 'id-conflict'],
  ['bclib', 'bclib-reforged', 'BCLib 和 BCLib Reforged 是同一模组的不同版本', 'id-conflict'],
]

export const KNOWN_CLASS_CONFLICTS: [string, string, string][] = [
  ['net.optifine.shaders.Shaders', 'net.coderbot.iris.shaders.ShaderSet', 'OptiFine 和 Iris 都修改了着色器渲染管线'],
  ['me.jellysquid.mods.lithium.common.LithiumMod', 'carpet', 'Lithium 的某些优化可能与 Carpet 规则冲突'],
]

export const KNOWN_MIXIN_CONFLICTS: [string, string, string][] = [
  ['mixins.sodium.json', 'mixins.optifine.json', 'Sodium 和 OptiFine 的 MixIn 都修改了渲染引擎'],
  ['mixins.lithium.json', 'mixins.carpet.json', 'Lithium 和 Carpet 的 MixIn 可能修改相同的游戏逻辑'],
]

export const MOD_CHINESE_NAMES: Record<string, string> = {
  'sodium': '钠（渲染优化）', 'lithium': '锂（逻辑优化）', 'phosphor': '磷（光照优化）',
  'iris': '鸢尾（光影加载）', 'optifine': '高清修复', 'fabric-api': 'Fabric API',
  'jei': 'Just Enough Items（物品管理）', 'rei': 'Roughly Enough Items（物品管理）',
  'emi': 'EMI（物品管理）', 'create': '机械动力', 'applied-energistics-2': '应用能源2',
  'mekanism': '通用机械', 'thermal-expansion': '热力膨胀', 'botania': '植物魔法',
  'thaumcraft': '神秘时代', 'blood-magic': '血魔法', 'twilight-forest': '暮色森林',
  'the-abyss': '深渊国度', 'tinkers-construct': '匠魂', 'ender-io': '末影IO',
  'industrial-craft': '工业时代', 'forestry': '林业', 'biomes-o-plenty': '超多生物群系',
  'terralith': 'Terralith（地形生成）', 'xaeros-minimap': 'Xaero的小地图',
  'xaeros-world-map': 'Xaero的世界地图', 'journeymap': '旅行地图',
  'waystones': '传送石碑', 'appleskin': '苹果皮（食物显示）',
  'wthit': 'WTHIT（方块显示）', 'hwyla': 'WAILA（方块显示）',
  'mouse-tweaks': '鼠标调整', 'inventory-tweaks': '物品栏调整',
  'chisel': '凿子', 'chisels-bits': '凿子与比特', 'worldedit': '世界编辑',
  'carpet': 'Carpet Mod（技术工具）', 'litematica': '投影', 'minihud': '迷你HUD',
  'tweakeroo': 'Tweakeroo', 'item-scroller': '物品滚动', 'modmenu': '模组菜单',
  'architectury': 'Architectury API', 'cloth-config': 'Cloth Config',
  'indium': '铟（Sodium补充）', 'ferritecore': '铁芯（内存优化）',
  'modernfix': 'ModernFix（综合优化）', 'entityculling': '实体剔除',
  'noisium': 'Noisium（地形优化）', 'starlight': '星光（光照优化）',
  'faster-random': '更快随机', 'dashloader': 'DashLoader（启动加速）',
  'not-enough-animations': '更多动画', '3dskin-layers': '3D皮肤层',
  'custom-crosshair-mod': '自定义准星', 'better-third-person': '更好的第三人称',
  'presence-footsteps': '真实脚步声', 'sound-physics-remastered': '声音物理',
  'continuity': 'Continuity（连接纹理）', 'sodium-extra': 'Sodium Extra',
  'reeses-sodium-options': 'Sodium 选项界面', 'lambdynamiclights': 'Lamb动态光源',
  'animatica': 'Animatica（动画优化）', 'entitytexturefeatures': '实体纹理特性',
  'moreculling': '更多剔除', 'rubidium': '铷（Forge渲染优化）',
  'embeddium': 'Embeddium（Forge渲染优化）', 'oculus': 'Oculus（Forge光影）',
  'geckolib': 'GeckoLib（动画库）', 'curios': 'Curios（饰品栏）',
  'patchouli': 'Patchouli（书本系统）', 'autoreglib': 'AutoRegLib',
  'jei-tweaker': 'JEI Tweaker', 'crafttweaker': 'CraftTweaker',
  'kubejs': 'KubeJS', 'rhino': 'Rhino', 'architects-palette': '建筑师调色板',
  'supplementaries': '补充物品', 'quark': 'Quark（奇趣模组）',
  'zeta': 'Zeta', 'mixin-in-heaven': 'Mixin in Heaven',
  'sodium-shadowy-pathways': 'Sodium Shadowy Pathways',
  'immediatelyfast': 'ImmediatelyFast', 'nvidium': 'Nvidium',
  'better-fps-render-distance': '更好FPS渲染距离',
  'debugify': 'Debugify', 'no-chat-reports': 'No Chat Reports',
  'language-reload': '语言重载', 'badoptimizations': 'BadOptimizations',
  'forgetmechunk': 'ForgetMeChunk', 'smooth-boot': 'Smooth Boot',
  'smooth-boot-reloaded': 'Smooth Boot Reloaded',
}

export const MOD_PERFORMANCE_RATINGS: Record<string, PerformanceImpact> = {
  'sodium': 'none', 'lithium': 'none', 'phosphor': 'none', 'starlight': 'none',
  'ferritecore': 'none', 'modernfix': 'none', 'entityculling': 'none',
  'noisium': 'none', 'faster-random': 'none', 'dashloader': 'none',
  'indium': 'none', 'sodium-extra': 'none', 'moreculling': 'none',
  'immediatelyfast': 'none', 'nvidium': 'none', 'badoptimizations': 'none',
  'continuity': 'low', 'lambdynamiclights': 'low', 'animatica': 'low',
  'iris': 'low', 'modmenu': 'none', 'appleskin': 'none', 'wthit': 'none',
  'mouse-tweaks': 'none', 'xaeros-minimap': 'low', 'xaeros-world-map': 'low',
  'journeymap': 'medium', 'optifine': 'low', 'create': 'medium',
  'applied-energistics-2': 'medium', 'mekanism': 'medium', 'botania': 'medium',
  'thaumcraft': 'medium', 'twilight-forest': 'high', 'biomes-o-plenty': 'medium',
  'terralith': 'low', 'chisel': 'low', 'worldedit': 'low', 'litematica': 'medium',
  '3dskin-layers': 'low', 'presence-footsteps': 'low',
  'sound-physics-remastered': 'medium', 'cloth-config': 'none',
  'architectury': 'none', 'fabric-api': 'none', 'jei': 'low', 'rei': 'low',
  'emi': 'low', 'waystones': 'none', 'tinkers-construct': 'high',
  'thermal-expansion': 'medium', 'ender-io': 'high', 'forestry': 'medium',
  'blood-magic': 'medium', 'carpet': 'none', 'rubidium': 'none',
  'embeddium': 'none', 'oculus': 'low', 'geckolib': 'low',
  'curios': 'low', 'patchouli': 'low', 'quark': 'medium',
  'supplementaries': 'low', 'kubejs': 'low', 'crafttweaker': 'low',
  'debugify': 'none', 'no-chat-reports': 'none', 'language-reload': 'none',
  'smooth-boot': 'none', 'smooth-boot-reloaded': 'none',
  'forgetmechunk': 'none', 'better-fps-render-distance': 'none',
}

export const MOD_PERFORMANCE_DETAILS: Record<string, PerformanceDetail> = {
  'sodium': { impact: 'none', fpsImpact: 50, startupImpact: -2, memoryImpact: -50, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 500 },
  'lithium': { impact: 'none', fpsImpact: 5, startupImpact: -1, memoryImpact: 0, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 300 },
  'iris': { impact: 'low', fpsImpact: -15, startupImpact: 3, memoryImpact: 200, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 400 },
  'optifine': { impact: 'low', fpsImpact: 20, startupImpact: 5, memoryImpact: 100, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 1000 },
  'create': { impact: 'medium', fpsImpact: -10, startupImpact: 15, memoryImpact: 300, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 200 },
  'twilight-forest': { impact: 'high', fpsImpact: -25, startupImpact: 20, memoryImpact: 500, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 150 },
  'journeymap': { impact: 'medium', fpsImpact: -8, startupImpact: 10, memoryImpact: 400, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 250 },
  'ferritecore': { impact: 'none', fpsImpact: 0, startupImpact: -3, memoryImpact: -200, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 200 },
  'modernfix': { impact: 'none', fpsImpact: 3, startupImpact: -10, memoryImpact: -100, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 180 },
  'entityculling': { impact: 'none', fpsImpact: 15, startupImpact: 0, memoryImpact: 0, testConfig: 'Ryzen 5 5600X / RTX 3060 / 16GB', communityReports: 300 },
}

export const MOD_ASSOCIATIONS: Record<string, { modId: string; percentage: number }[]> = {
  'sodium': [{ modId: 'lithium', percentage: 92 }, { modId: 'phosphor', percentage: 45 }, { modId: 'iris', percentage: 78 }, { modId: 'ferritecore', percentage: 65 }, { modId: 'modmenu', percentage: 88 }],
  'create': [{ modId: 'jei', percentage: 95 }, { modId: 'create-additions', percentage: 60 }, { modId: 'curios', percentage: 55 }],
  'optifine': [{ modId: 'jei', percentage: 70 }, { modId: 'xaeros-minimap', percentage: 65 }],
  'fabric-api': [{ modId: 'sodium', percentage: 80 }, { modId: 'modmenu', percentage: 85 }, { modId: 'cloth-config', percentage: 60 }],
  'jei': [{ modId: 'appleskin', percentage: 75 }, { modId: 'mouse-tweaks', percentage: 70 }],
  'mekanism': [{ modId: 'jei', percentage: 98 }, { modId: 'curios', percentage: 50 }],
  'botania': [{ modId: 'patchouli', percentage: 99 }, { modId: 'curios', percentage: 80 }],
  'xaeros-minimap': [{ modId: 'xaeros-world-map', percentage: 85 }],
}

export const MOD_RATINGS: Record<string, ModRating> = {
  'sodium': { score: 4.9, curseforgeScore: 4.8, modrinthScore: 5.0, downloadCount: 50000000, followerCount: 200000, timeDecayScore: 4.9 },
  'lithium': { score: 4.8, modrinthScore: 5.0, downloadCount: 30000000, followerCount: 150000, timeDecayScore: 4.8 },
  'create': { score: 4.9, curseforgeScore: 4.9, modrinthScore: 5.0, downloadCount: 40000000, followerCount: 180000, timeDecayScore: 4.9 },
  'optifine': { score: 4.5, curseforgeScore: 4.5, downloadCount: 200000000, followerCount: 500000, timeDecayScore: 4.3 },
  'iris': { score: 4.7, modrinthScore: 4.8, downloadCount: 25000000, followerCount: 120000, timeDecayScore: 4.7 },
  'jei': { score: 4.8, curseforgeScore: 4.8, downloadCount: 300000000, followerCount: 400000, timeDecayScore: 4.7 },
  'fabric-api': { score: 4.5, modrinthScore: 4.5, downloadCount: 100000000, followerCount: 300000, timeDecayScore: 4.5 },
  'mekanism': { score: 4.6, curseforgeScore: 4.6, downloadCount: 60000000, followerCount: 200000, timeDecayScore: 4.5 },
  'botania': { score: 4.7, curseforgeScore: 4.7, downloadCount: 50000000, followerCount: 180000, timeDecayScore: 4.6 },
  'twilight-forest': { score: 4.6, curseforgeScore: 4.6, downloadCount: 80000000, followerCount: 250000, timeDecayScore: 4.5 },
  'appleskin': { score: 4.5, modrinthScore: 4.5, downloadCount: 20000000, followerCount: 80000, timeDecayScore: 4.5 },
  'xaeros-minimap': { score: 4.6, curseforgeScore: 4.6, downloadCount: 40000000, followerCount: 150000, timeDecayScore: 4.5 },
  'journeymap': { score: 4.5, curseforgeScore: 4.5, downloadCount: 70000000, followerCount: 200000, timeDecayScore: 4.4 },
  'waystones': { score: 4.4, curseforgeScore: 4.4, downloadCount: 30000000, followerCount: 120000, timeDecayScore: 4.3 },
  'modmenu': { score: 4.3, modrinthScore: 4.3, downloadCount: 40000000, followerCount: 100000, timeDecayScore: 4.3 },
  'ferritecore': { score: 4.6, modrinthScore: 4.7, downloadCount: 15000000, followerCount: 60000, timeDecayScore: 4.6 },
  'modernfix': { score: 4.7, modrinthScore: 4.8, downloadCount: 10000000, followerCount: 50000, timeDecayScore: 4.7 },
  'entityculling': { score: 4.5, modrinthScore: 4.6, downloadCount: 12000000, followerCount: 45000, timeDecayScore: 4.5 },
}

export const CHINESE_COMMUNITY_TAGS: Record<string, string[]> = {
  'sodium': ['必装', '优化', '轻量', '稳定'],
  'lithium': ['必装', '优化', '轻量'],
  'iris': ['光影', '必装', '轻量'],
  'optifine': ['光影', '经典', '吃配置'],
  'create': ['必装', '科技', '创意', '大型'],
  'jei': ['必装', '工具', '轻量'],
  'fabric-api': ['必装', '库'],
  'mekanism': ['科技', '大型', '吃配置'],
  'botania': ['魔法', '必装', '创意'],
  'twilight-forest': ['冒险', '经典', '大型', '吃配置'],
  'journeymap': ['工具', '吃配置'],
  'ferritecore': ['必装', '优化', '轻量'],
  'modernfix': ['必装', '优化', '轻量'],
  'entityculling': ['优化', '轻量'],
  'xaeros-minimap': ['工具', '轻量'],
  'waystones': ['休闲', '轻量', '稳定'],
  'appleskin': ['必装', '轻量'],
  'modmenu': ['必装', '轻量'],
}
