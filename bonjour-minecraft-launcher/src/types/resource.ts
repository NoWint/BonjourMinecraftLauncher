export type ResourceType = 'resourcepack' | 'shader' | 'datapack' | 'structure' | 'mod' | 'world'
export type ContentSource = 'curseforge' | 'modrinth' | 'local'
export type ShaderPerformanceTier = 'low' | 'medium' | 'high' | 'ultra'
export type ShaderConfigPreset = 'low' | 'medium' | 'high' | 'ultra'
export type SubscriptionEventType = 'update' | 'new-release' | 'compatibility-change'
export type CollectionItemType = 'mod' | 'resourcepack' | 'shader' | 'datapack' | 'structure' | 'world'
export type DatapackScope = 'global' | 'world'
export type ResourcePackFormat = 'standard' | 'programmer-art' | 'compatibility'

export interface ResourcePack {
  id: string
  name: string
  fileName: string
  filePath: string
  fileSize: number
  isEnabled: boolean
  priority: number
  addedAt: string
  format?: number
  description?: string
  previewImages?: string[]
  source: 'local' | 'download'
  packFormat?: number
  compatibleVersions?: string[]
}

export interface ShaderPackEnhanced {
  id: string
  name: string
  fileName: string
  filePath: string
  fileSize: number
  isEnabled: boolean
  priority: number
  addedAt: string
  description?: string
  previewUrl?: string
  previewImages?: string[]
  source: 'local' | 'download'
  performanceTier?: ShaderPerformanceTier
  configPresets?: ShaderConfigPreset[]
  compatibleRenderers?: string[]
  author?: string
  version?: string
  downloadCount?: number
  rating?: number
  sourceId?: string
  sourcePlatform?: ContentSource
}

export interface ShaderPerformanceProfile {
  tier: ShaderPerformanceTier
  label: string
  description: string
  minGPU: string
  recommendedVRAM: number
  expectedFPS: { low: number; high: number }
  emoji: string
  color: string
}

export interface ShaderConfigTemplate {
  preset: ShaderConfigPreset
  label: string
  description: string
  settings: Record<string, number | boolean | string>
}

export interface ContentSubscription {
  id: string
  resourceType: ResourceType
  resourceId: string
  resourceName: string
  resourceIcon?: string
  source: ContentSource
  currentVersion?: string
  events: SubscriptionEventType[]
  createdAt: string
  lastNotifiedAt?: string
  lastCheckedAt?: string
}

export interface ContentSubscriptionNotification {
  id: string
  subscriptionId: string
  eventType: SubscriptionEventType
  resourceName: string
  resourceType: ResourceType
  message: string
  newVersion?: string
  oldVersion?: string
  timestamp: string
  read: boolean
}

export interface ContentCollection {
  id: string
  name: string
  description: string
  icon?: string
  coverImage?: string
  tags: string[]
  items: CollectionItem[]
  createdAt: string
  updatedAt: string
  author?: string
  isPublic: boolean
  installCount?: number
  rating?: number
}

export interface CollectionItem {
  id: string
  type: CollectionItemType
  name: string
  description?: string
  iconUrl?: string
  sourceId?: string
  sourcePlatform?: ContentSource
  downloadUrl?: string
  fileName?: string
  fileSize?: number
  version?: string
  gameVersions?: string[]
  metadata?: Record<string, any>
}

export interface Datapack {
  id: string
  name: string
  fileName: string
  filePath: string
  fileSize: number
  isEnabled: boolean
  scope: DatapackScope
  worldName?: string
  addedAt: string
  description?: string
  packFormat?: number
  compatibleVersions?: string[]
  source: 'local' | 'download'
  dependencies?: string[]
}

export interface StructureFile {
  id: string
  name: string
  fileName: string
  filePath: string
  fileSize: number
  addedAt: string
  author?: string
  description?: string
  dimensions?: { x: number; y: number; z: number }
  blockCount?: number
  previewData?: any
  source: 'local' | 'download'
  tags: string[]
}

export interface GlobalResourceIndex {
  id: string
  name: string
  type: ResourceType
  fileName: string
  filePath: string
  fileSize: number
  instanceId: string
  instanceName: string
  sha256?: string
  source?: ContentSource
  sourceId?: string
  tags: string[]
  lastModified: string
  metadata?: Record<string, any>
}

export interface ResourceSearchResult {
  items: GlobalResourceIndex[]
  total: number
  query: string
  searchTime: number
  facets: Record<ResourceType, number>
}

export interface TextureEditProject {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  textures: TextureEntry[]
  targetPackFormat: number
}

export interface TextureEntry {
  blockId: string
  blockName: string
  texturePath: string
  originalData?: string
  currentData?: string
  isModified: boolean
  isCustom: boolean
}

export const SHADER_PERFORMANCE_PROFILES: Record<ShaderPerformanceTier, ShaderPerformanceProfile> = {
  low: {
    tier: 'low',
    label: '低配',
    description: '集成显卡或低端独显可运行',
    minGPU: 'Intel HD 630 / GTX 750',
    recommendedVRAM: 1,
    expectedFPS: { low: 30, high: 60 },
    emoji: '🟢',
    color: '#22c55e',
  },
  medium: {
    tier: 'medium',
    label: '中配',
    description: '中端独显流畅运行',
    minGPU: 'GTX 1060 / RX 580',
    recommendedVRAM: 4,
    expectedFPS: { low: 45, high: 80 },
    emoji: '🟡',
    color: '#eab308',
  },
  high: {
    tier: 'high',
    label: '高配',
    description: '需要高端独显',
    minGPU: 'RTX 3060 / RX 6700 XT',
    recommendedVRAM: 8,
    expectedFPS: { low: 30, high: 60 },
    emoji: '🟠',
    color: '#f97316',
  },
  ultra: {
    tier: 'ultra',
    label: '极致',
    description: '顶级显卡专属',
    minGPU: 'RTX 4070 / RX 7800 XT',
    recommendedVRAM: 12,
    expectedFPS: { low: 20, high: 45 },
    emoji: '🔴',
    color: '#ef4444',
  },
}

export const SHADER_CONFIG_TEMPLATES: Record<ShaderConfigPreset, ShaderConfigTemplate> = {
  low: {
    preset: 'low',
    label: '低画质',
    description: '最低画质，保证流畅帧率',
    settings: {
      shadowResolution: 512,
      shadowDistance: 64,
      waterQuality: 'low',
      reflectionQuality: 'low',
      volumetricLighting: false,
      bloom: false,
      dof: false,
      motionBlur: false,
      taa: true,
    },
  },
  medium: {
    preset: 'medium',
    label: '中画质',
    description: '平衡画质与性能',
    settings: {
      shadowResolution: 1024,
      shadowDistance: 128,
      waterQuality: 'medium',
      reflectionQuality: 'medium',
      volumetricLighting: true,
      bloom: true,
      dof: false,
      motionBlur: false,
      taa: true,
    },
  },
  high: {
    preset: 'high',
    label: '高画质',
    description: '高质量光影效果',
    settings: {
      shadowResolution: 2048,
      shadowDistance: 192,
      waterQuality: 'high',
      reflectionQuality: 'high',
      volumetricLighting: true,
      bloom: true,
      dof: true,
      motionBlur: false,
      taa: true,
    },
  },
  ultra: {
    preset: 'ultra',
    label: '极致画质',
    description: '全特效开启，追求极致画面',
    settings: {
      shadowResolution: 4096,
      shadowDistance: 256,
      waterQuality: 'ultra',
      reflectionQuality: 'ultra',
      volumetricLighting: true,
      bloom: true,
      dof: true,
      motionBlur: true,
      taa: true,
    },
  },
}

export const KNOWN_SHADER_PACKS: Record<string, {
  name: string
  performanceTier: ShaderPerformanceTier
  renderers: string[]
  description: string
  author: string
}> = {
  'bsl-shaders': { name: 'BSL Shaders', performanceTier: 'medium', renderers: ['iris', 'optifine'], description: '色彩鲜艳、光影柔和的经典光影包', author: 'capt_tatsu' },
  'complementary-shaders': { name: 'Complementary Shaders', performanceTier: 'medium', renderers: ['iris', 'optifine'], description: '基于BSL改进，性能更优', author: 'EminGT' },
  'seus-renewed': { name: 'SEUS Renewed', performanceTier: 'high', renderers: ['optifine'], description: '经典光影包的重制版', author: 'Sonic Ether' },
  'seus-ptgi': { name: 'SEUS PTGI', performanceTier: 'ultra', renderers: ['optifine'], description: '光线追踪光影，极致画面', author: 'Sonic Ether' },
  'sildurs-vibrant-shaders': { name: "Sildur's Vibrant Shaders", performanceTier: 'medium', renderers: ['optifine', 'iris'], description: '色彩鲜明、效果丰富', author: 'Sildur' },
  'sildurs-enhanced-default': { name: "Sildur's Enhanced Default", performanceTier: 'low', renderers: ['optifine', 'iris'], description: '增强默认外观，低配友好', author: 'Sildur' },
  'chocapic13-shaders': { name: 'Chocapic13 Shaders', performanceTier: 'high', renderers: ['optifine', 'iris'], description: '细节丰富的高品质光影', author: 'Chocapic13' },
  'kappa-shader': { name: 'Kappa Shader', performanceTier: 'low', renderers: ['optifine', 'iris'], description: '简约风格，性能优秀', author: 'Kappa' },
  'vanilla-plus-shaders': { name: 'Vanilla Plus Shaders', performanceTier: 'low', renderers: ['iris', 'optifine'], description: '保留原版风格，添加光影效果', author: 'RRe36' },
  'rethinking-voxels': { name: 'Rethinking Voxels', performanceTier: 'medium', renderers: ['iris'], description: '创新的体素光照系统', author: 'RRe36' },
  'makeup-ultra-fast-shaders': { name: 'MakeUp - Ultra Fast', performanceTier: 'low', renderers: ['optifine', 'iris'], description: '超快速度，美观效果', author: 'Xor0w' },
  'astralex-shader': { name: 'AstraLex Shader', performanceTier: 'high', renderers: ['optifine'], description: '梦幻风格，细节丰富', author: 'AstraLex' },
  'naelegos-cel-shaders': { name: "Naelego's Cel Shaders", performanceTier: 'low', renderers: ['optifine', 'iris'], description: '卡通渲染风格', author: 'Naelego' },
  'continuum-shaders': { name: 'Continuum Shaders', performanceTier: 'ultra', renderers: ['optifine'], description: '超写实光影，极致画面', author: 'Continuum' },
  'robin-shaders': { name: 'Robin Shaders', performanceTier: 'medium', renderers: ['iris'], description: 'Iris 专属优化光影', author: 'Robin' },
}

export const RESOURCE_TYPE_LABELS: Record<ResourceType, { label: string; icon: string; description: string }> = {
  resourcepack: { label: '资源包', icon: '🎨', description: '材质、音效、模型等资源' },
  shader: { label: '光影包', icon: '✨', description: '光影渲染效果' },
  datapack: { label: '数据包', icon: '📊', description: '自定义游戏规则和内容' },
  structure: { label: '结构文件', icon: '🏗️', description: '建筑蓝图和结构' },
  mod: { label: '模组', icon: '📦', description: '游戏修改和扩展' },
  world: { label: '存档', icon: '🌍', description: '游戏世界和地图' },
}

export const COLLECTION_THEME_PRESETS: Record<string, { label: string; icon: string; tags: string[] }> = {
  medieval: { label: '中世纪', icon: '🏰', tags: ['中世纪', '建筑', '装饰'] },
  scifi: { label: '科幻', icon: '🚀', tags: ['科技', '未来', '机械'] },
  fantasy: { label: '奇幻', icon: '🐉', tags: ['魔法', '冒险', '神话'] },
  nature: { label: '自然', icon: '🌿', tags: ['自然', '农业', '生态'] },
  vanilla_plus: { label: '原版增强', icon: '⬆️', tags: ['优化', '增强', '原版'] },
  pvp: { label: 'PvP竞技', icon: '⚔️', tags: ['竞技', '优化', '战斗'] },
  creative: { label: '创造', icon: '🎨', tags: ['建筑', '装饰', '创造'] },
  survival: { label: '生存', icon: '🏕️', tags: ['生存', '难度', '真实'] },
}
