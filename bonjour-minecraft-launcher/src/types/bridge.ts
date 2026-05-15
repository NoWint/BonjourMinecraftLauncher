export interface ModSearchResult {
  id: string
  name: string
  chineseName?: string
  description: string
  iconUrl?: string
  downloadCount: number
  follows: number
  author: string
  gameVersions: string[]
  modLoaders: string[]
  categories: string[]
  source: 'curseforge' | 'modrinth'
  downloadUrl?: string
  projectUrl?: string
}

export interface BatchInstallTask {
  modId: string
  name: string
  downloadUrl: string
  targetPath: string
  gameVersion: string
  modLoader: string
  expectedHash?: string
}

export interface BatchInstallResult {
  modId: string
  success: boolean
  error?: string
  filePath?: string
}

export interface ModRecommendation {
  modId: string
  name: string
  reason: string
  score: number
  categories: string[]
}

export interface ModConflict {
  mod1Id: string
  mod1Name: string
  mod2Id: string
  mod2Name: string
  conflictType: 'incompatible' | 'overlapping' | 'dependency'
  description: string
  severity: 'error' | 'warning' | 'info'
}

export interface ModUpdateInfo {
  modId: string
  currentVersion: string
  latestVersion: string
  downloadUrl: string
  changelog?: string
  source: 'curseforge' | 'modrinth'
}

export interface ModRating {
  modId: string
  rating: number
  count: number
  categories: string[]
}

export interface ModPerformanceRating {
  modId: string
  performanceImpact: 'low' | 'medium' | 'high'
  memoryUsage: number
  loadTimeMs: number
}

export interface InstancePerformanceEstimate {
  estimatedStartupMs: number
  estimatedMemoryMB: number
  riskLevel: 'low' | 'medium' | 'high'
  warnings: string[]
}

export interface ConfigMigrationCheck {
  needsMigration: boolean
  changes: ConfigMigrationChange[]
  canAutoMigrate: boolean
}

export interface ConfigMigrationChange {
  key: string
  oldValue: string
  newValue: string
  breaking: boolean
}

export interface ModShareInfo {
  shareCode: string
  shareUrl?: string
  modId: string
  name: string
  version: string
  source: string
}

export interface ModMetadataEnhancement {
  modId: string
  name: string
  description: string
  version: string
  author: string
  dependencies: string[]
  iconUrl?: string
}

export interface ModLoaderDetection {
  loader: 'forge' | 'fabric' | 'quilt' | 'neoforge' | 'unknown'
  version?: string
}

export interface ModAssociation {
  modId: string
  associatedModId: string
  associationType: 'dependency' | 'optional' | 'conflict'
  name: string
}

export interface TextureProject {
  id: string
  name: string
  description: string
  packFormat: number
  createdAt: string
  updatedAt: string
  files: TextureProjectFile[]
}

export interface TextureProjectFile {
  path: string
  content: string
  modified: boolean
}

export interface ResourceSubscription {
  id: string
  name: string
  source: string
  resourceId: string
  resourceType: 'mod' | 'shader' | 'resourcepack' | 'modpack'
  currentVersion: string
  autoUpdate: boolean
  lastChecked: number
  instanceId?: string
}

export interface ResourceSubscriptionUpdate {
  subscriptionId: string
  currentVersion: string
  latestVersion: string
  hasUpdate: boolean
  downloadUrl?: string
}

export interface ResourceSubscriptionNotification {
  id: string
  subscriptionId: string
  message: string
  timestamp: number
  read: boolean
}

export interface ResourceCollection {
  id: string
  name: string
  description: string
  iconUrl?: string
  items: ResourceCollectionItem[]
  createdAt: string
}

export interface ResourceCollectionItem {
  resourceId: string
  resourceType: 'mod' | 'shader' | 'resourcepack' | 'modpack'
  name: string
  version: string
  source: string
}

export interface ModpackInfo {
  id: string
  name: string
  version: string
  author: string
  description: string
  gameVersion: string
  modLoader: string
  modLoaderVersion: string
  modCount: number
  instanceId?: string
  format: 'curseforge' | 'modrinth' | 'custom'
  installedAt?: string
}

export interface ModpackUpdateCheck {
  hasUpdate: boolean
  currentVersion: string
  latestVersion: string
  changelog?: string
  downloadUrl?: string
}

export interface ModpackVersionDiff {
  added: ModpackDiffEntry[]
  removed: ModpackDiffEntry[]
  updated: ModpackDiffEntry[]
  unchanged: ModpackDiffEntry[]
}

export interface ModpackDiffEntry {
  modId: string
  name: string
  oldVersion?: string
  newVersion?: string
}

export interface ModpackUpdateOptions {
  modpackId: string
  targetVersion: string
  keepUserMods: boolean
  backupBeforeUpdate: boolean
}

export interface ModpackFork {
  id: string
  originalPackId: string
  originalPackName: string
  originalVersion: string
  forkName: string
  instanceId: string
  createdAt: string
  lastSyncedAt?: string
}

export interface ModpackTestResult {
  success: boolean
  errors: string[]
  warnings: string[]
  loadTimeMs: number
  memoryUsageMB: number
}

export interface ModpackPerformance {
  modpackId: string
  modpackName: string
  modCount: number
  estimatedStartupMs: number
  estimatedMemoryMB: number
  riskLevel: 'low' | 'medium' | 'high'
}

export interface SyncRoom {
  id: string
  code: string
  hostName: string
  modpackName: string
  modpackVersion: string
  gameVersion: string
  modLoader: string
  modCount: number
  participants: SyncRoomParticipant[]
  createdAt: string
}

export interface SyncRoomParticipant {
  name: string
  joinedAt: string
  isHost: boolean
}

export interface ModpackRecommendation {
  modpackId: string
  name: string
  description: string
  score: number
  categories: string[]
}

export interface ModpackRating {
  modpackId: string
  rating: number
  count: number
}

export interface OverlayData {
  fps: number
  memoryUsed: number
  memoryMax: number
  cpuUsage: number
  gameTime: string
  isCollapsed: boolean
}

export interface CrashReport {
  id: string
  version: string
  exitCode: number
  rawLog: string
  analysis: CrashAnalysis
  instanceId?: string
  createdAt: string
  timestamp: number
  stackTrace: string
  systemInfo: Record<string, unknown>
  modList: string[]
  javaVersion: string
  gameVersion: string
}

export interface CrashAnalysis {
  cause: string
  suggestions: string[]
  relatedMods: string[]
}

export interface FileVerificationResult {
  valid: boolean
  hashMatch: boolean
  sizeMatch: boolean
  actualHash?: string
  expectedHash?: string
  actualSize?: number
  expectedSize?: number
}

export interface IncrementalSyncResult {
  synced: number
  skipped: number
  failed: number
  details: IncrementalSyncDetail[]
}

export interface IncrementalSyncDetail {
  file: string
  status: 'synced' | 'skipped' | 'failed'
  reason?: string
}

export interface RepairResult {
  repaired: number
  failed: number
  details: RepairDetail[]
}

export interface RepairDetail {
  file: string
  status: 'repaired' | 'failed'
  reason?: string
}

export interface LaunchBenchmark {
  id: string
  version: string
  totalTimeMs: number
  phases: LaunchBenchmarkPhase[]
  timestamp: number
}

export interface LaunchBenchmarkPhase {
  phaseId: string
  durationMs: number
}

export interface BenchmarkSummary {
  version: string
  avgTotalTimeMs: number
  minTotalTimeMs: number
  maxTotalTimeMs: number
  sampleCount: number
}

export interface GameProcessInfo {
  pid: number
  instanceId?: string
  version: string
  startedAt: number
  status: 'running' | 'exited'
  exitCode?: number
  memoryUsage: number
  cpuUsage: number
}

export interface ServerEntry {
  id: string
  name: string
  address: string
  port: number
  groupId?: string
  iconUrl?: string
  playerCount?: number
  maxPlayers?: number
  motd?: string
  ping?: number
  lastPlayedAt?: string
  isFavorite: boolean
}

export interface ServerGroup {
  id: string
  name: string
  color?: string
  icon?: string
  sortOrder: number
}

export interface ServerPingResult {
  online: boolean
  playerCount: number
  maxPlayers: number
  motd: string
  ping: number
  version: string
  players: string[]
}

export interface LocalServerInfo {
  id: string
  name: string
  address: string
  port: number
  status: 'stopped' | 'starting' | 'running'
  gameVersion: string
  playerCount: number
  maxPlayers: number
}

export interface LANWorldInfo {
  host: string
  port: number
  motd: string
  worldName: string
  gameVersion: string
}

export interface FriendLobby {
  id: string
  code: string
  hostName: string
  participants: FriendLobbyParticipant[]
  gameVersion: string
  address: string
  port: number
  createdAt: string
}

export interface FriendLobbyParticipant {
  name: string
  isHost: boolean
  joinedAt: string
}

export interface CommunityServer {
  id: string
  name: string
  address: string
  port: number
  description: string
  playerCount: number
  maxPlayers: number
  tags: string[]
}

export interface ServerNotification {
  id: string
  serverId: string
  serverName: string
  type: 'online' | 'offline' | 'player_join' | 'player_leave'
  message: string
  timestamp: number
  read: boolean
}

export interface ServerPortalEntry {
  id: string
  name: string
  address: string
  port: number
  shortcutKey?: string
  lastUsedAt?: string
}

export interface ServerNotificationConfig {
  serverId: string
  notifyOnline: boolean
  notifyOffline: boolean
  notifyPlayerJoin: boolean
  notifyPlayerLeave: boolean
}

export interface JVMProfile {
  id: string
  name: string
  description: string
  maxMemory: number
  minMemory: number
  jvmArgs: string[]
  suitableFor: string[]
}

export interface ConfigCategory {
  id: string
  name: string
  description: string
  canHotReload: boolean
  requiresRestart: boolean
}

export interface InstanceGroup {
  id: string
  name: string
  parentId: string | null
  icon?: string
  color?: string
  sortOrder: number
  children: string[]
  instances: string[]
  collapsed: boolean
}

export interface InstanceTag {
  id: string
  name: string
  color: string
  instanceCount: number
  createdAt: string
}

export interface InstanceTemplate {
  id: string
  name: string
  description: string
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  settings: Record<string, unknown>
  mods: TemplateModEntry[]
  shaders: TemplateShaderEntry[]
  sourceInstanceId?: string
  tags: string[]
  createdAt: string
}

export interface TemplateModEntry {
  modId: string
  name: string
  version: string
  source: string
  downloadUrl?: string
}

export interface TemplateShaderEntry {
  name: string
  version: string
  source: string
  downloadUrl?: string
}

export interface VersionCompatibility {
  version: string
  javaMin: number
  javaMax: number
  modLoaderSupport: string[]
  isStable: boolean
}

export interface VersionDiff {
  addedFiles: string[]
  removedFiles: string[]
  modifiedFiles: string[]
  totalSizeChange: number
}

export interface InstanceSnapshot {
  id: string
  instanceId: string
  name: string
  description: string
  createdAt: string
  modCount: number
  totalSize: number
  timestamp: number
  modList: string[]
  configFiles: string[]
  gameVersion: string
  sizeBytes: number
}

export interface InstanceSnapshotDiff {
  added: SnapshotDiffEntry[]
  removed: SnapshotDiffEntry[]
  modified: SnapshotDiffEntry[]
}

export interface SnapshotDiffEntry {
  path: string
  type: 'file' | 'directory'
  oldHash?: string
  newHash?: string
}

export interface InstanceStorageAnalysis {
  totalSize: number
  categories: InstanceStorageCategory[]
}

export interface InstanceStorageCategory {
  name: string
  size: number
  fileCount: number
  canClean: boolean
}

export interface InstanceDashboard {
  instanceId: string
  totalPlayTime: number
  lastPlayedAt?: string
  modCount: number
  worldCount: number
  recentModChanges: InstanceModChange[]
  recentPlaySessions: InstancePlaySession[]
}

export interface InstanceModChange {
  action: 'add' | 'remove' | 'update'
  modName: string
  fileName: string
  timestamp: number
}

export interface InstancePlaySession {
  startTime: number
  endTime: number
  durationMs: number
}

export interface VersionMigrationGuide {
  currentVersion: string
  targetVersion: string
  steps: MigrationStep[]
  risks: string[]
  estimatedTime: string
}

export interface MigrationStep {
  order: number
  description: string
  action: string
  required: boolean
}

export interface HealthCheckResult {
  overall: 'healthy' | 'warning' | 'error'
  checks: HealthCheckItem[]
}

export interface HealthCheckItem {
  id: string
  name: string
  status: 'pass' | 'warning' | 'error'
  message: string
  fixAction?: string
  fixLabel?: string
}

export interface LaunchDependency {
  id: string
  instanceId: string
  dependsOnInstanceId: string
  delayMs: number
  required: boolean
  dependsOnName: string
}

export interface VersionAnnotation {
  id: string
  version: string
  userId: string
  username: string
  content: string
  rating: number
  tags: string[]
  likes: number
  createdAt: string
}

export interface StructurePreview {
  blocks: number
  size: { x: number; y: number; z: number }
  palette: string[]
}

export interface MicrosoftLoginRefreshResult {
  success: boolean
  accessToken?: string
  refreshToken?: string
  expiresAt?: number
  profile?: { id: string; name: string; skinUrl?: string }
  error?: string
}

export interface LittleskinPlayer {
  id: number
  name: string
  skinUrl?: string
  skinModel?: 'classic' | 'slim'
}

export interface BatchInstallProgressData {
  taskId: string
  status: string
  progress: number
  current: number
  total: number
}
