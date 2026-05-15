export interface InstanceGroup {
  id: string
  name: string
  parentId: string | null
  icon?: string
  color?: string
  sortOrder: number
  collapsed: boolean
}

export interface InstanceTag {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface InstanceGroupConfig {
  groups: InstanceGroup[]
  tags: InstanceTag[]
  instanceGroups: Record<string, string>
  instanceTags: Record<string, string[]>
  instanceSortOrder: Record<string, number>
}

export interface InstanceTemplate {
  id: string
  name: string
  description: string
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  settings: Record<string, any>
  modList: TemplateModEntry[]
  shaderPacks: TemplateShaderEntry[]
  createdAt: number
  sourceInstanceId?: string
  tags: string[]
}

export interface TemplateModEntry {
  fileId: number
  fileName: string
  downloadUrl: string
  source: 'curseforge' | 'modrinth' | 'local'
  modId?: string
  version?: string
}

export interface TemplateShaderEntry {
  name: string
  fileName: string
  downloadUrl: string
  source: 'local' | 'download'
}

export interface VersionCompatibilityCard {
  version: string
  dim: number
  server: number
  stable: number
  ready: number
  overall: number
  modCount: number
  serverCount: number
  knownBugs: number
  forge: boolean
  fabric: boolean
  quilt: boolean
  neoforge: boolean
  lastUpdated: number
}

export interface VersionDiff {
  from: string
  to: string
  newBlocks: string[]
  newMobs: string[]
  newItems: string[]
  mechanicChanges: string[]
  worldGenChanges: string[]
  breakingChanges: string[]
  summary: string
}

export interface InstanceSnapshot {
  id: string
  instanceId: string
  name: string
  description: string
  timestamp: number
  modList: SnapshotModEntry[]
  configFiles: SnapshotFileEntry[]
  settings: Record<string, any>
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  sizeBytes: number
}

export interface SnapshotModEntry {
  fileName: string
  filePath: string
  enabled: boolean
  hash: string
  size: number
}

export interface SnapshotFileEntry {
  relativePath: string
  hash: string
  size: number
}

export interface BonjourPkg {
  formatVersion: 1
  metadata: BonjourPkgMetadata
  mods: BonjourPkgMod[]
  configs: BonjourPkgConfig[]
  settings: Record<string, any>
}

export interface BonjourPkgMetadata {
  name: string
  description: string
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  author: string
  createdAt: number
  sourceInstanceId?: string
  tags: string[]
}

export interface BonjourPkgMod {
  fileName: string
  source: 'curseforge' | 'modrinth' | 'url' | 'embedded'
  downloadUrl?: string
  fileId?: number
  projectId?: number
  hash?: string
  size?: number
}

export interface BonjourPkgConfig {
  relativePath: string
  content: string
  hash: string
}

export interface StorageBreakdown {
  instanceId: string
  totalSize: number
  versions: number
  libraries: number
  assets: number
  mods: number
  saves: number
  logs: number
  config: number
  resourcepacks: number
  shaderpacks: number
  crashReports: number
  screenshots: number
  datapacks: number
  other: number
  cleanableSize: number
  safeToClean: StorageCleanItem[]
}

export interface StorageCleanItem {
  path: string
  size: number
  category: 'temp' | 'cache' | 'old_log' | 'crash_report' | 'orphan'
  description: string
  safeToDelete: boolean
}

export interface InstanceDashboard {
  instanceId: string
  totalPlayTime: number
  saveCount: number
  modCount: number
  screenshotCount: number
  crashCount: number
  serverVisitCount: number
  modChangeHistory: ModChangeEntry[]
  lastPlayedAt: string | null
  createdAt: string | null
  achievementsProgress: number
  deaths: number
}

export interface ModChangeEntry {
  timestamp: number
  action: 'added' | 'removed' | 'updated' | 'enabled' | 'disabled'
  modName: string
  fileName: string
}

export interface VersionMigrationGuide {
  currentVersion: string
  targetVersion: string
  modCoverage: number
  targetModCoverage: number
  migrationDifficulty: 'easy' | 'medium' | 'hard'
  steps: MigrationStep[]
  incompatibleMods: string[]
  missingMods: string[]
  estimatedTimeMinutes: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface MigrationStep {
  order: number
  title: string
  description: string
  action: 'backup' | 'update_loader' | 'remove_mod' | 'add_mod' | 'update_mod' | 'change_config' | 'test_launch'
}

export interface VersionAnnotation {
  id: string
  version: string
  userId: string
  username: string
  content: string
  rating: number
  tags: string[]
  createdAt: number
  likes: number
  official: boolean
}

export interface VersionAnnotationSummary {
  version: string
  averageRating: number
  totalAnnotations: number
  tags: Record<string, number>
  officialTags: string[]
  topAnnotation: VersionAnnotation | null
}

export interface HealthCheckResult {
  timestamp: number
  gameDir: string
  totalFiles: number
  totalSize: number
  issues: HealthIssue[]
  score: number
  errorCount: number
  warningCount: number
  autoFixableCount: number
}

export interface HealthIssue {
  id: string
  severity: 'info' | 'warning' | 'error' | 'critical'
  category: 'corrupted' | 'orphan' | 'oversized' | 'outdated' | 'missing' | 'conflict'
  path: string
  description: string
  suggestion: string
  autoFixable: boolean
  size?: number
}

export interface LaunchDependency {
  id: string
  instanceId: string
  dependsOnInstanceId: string
  delayMs: number
  required: boolean
}

export interface LaunchDependencyGraph {
  nodes: { instanceId: string; instanceName: string; gameVersion: string }[]
  edges: { from: string; to: string; delayMs: number; required: boolean }[]
}

export function createDefaultGroupConfig(): InstanceGroupConfig {
  return {
    groups: [
      { id: 'default', name: '全部', parentId: null, sortOrder: 0, collapsed: false },
    ],
    tags: [],
    instanceGroups: {},
    instanceTags: {},
    instanceSortOrder: {},
  }
}
