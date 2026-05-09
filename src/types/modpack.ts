export type ModpackFormat = 'curseforge' | 'modrinth' | 'ftb' | 'technic' | 'bonjour' | 'unknown'

export type ModEntrySource = 'curseforge' | 'modrinth' | 'direct' | 'local'
export type ConfigEntrySource = 'override' | 'embedded'
export type TestCheckCategory = 'dependency' | 'conflict' | 'resource' | 'compatibility' | 'performance'
export type TestCheckStatus = 'pass' | 'warn' | 'fail'
export type ForkConflictType = 'mod_added_upstream' | 'mod_removed_upstream' | 'mod_version_conflict' | 'config_conflict'
export type ForkConflictResolution = 'keep_fork' | 'keep_upstream' | 'merge'
export type SyncRoomStatus = 'waiting' | 'syncing' | 'complete'
export type SyncParticipantStatus = 'waiting' | 'downloading' | 'installing' | 'complete' | 'error'
export type ConfigChangeType = 'added' | 'modified' | 'removed'

export interface ModpackEntry {
  id: string
  name: string
  version: string
  author: string
  description: string
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  format: ModpackFormat
  sourcePath?: string
  instanceId?: string
  instanceName?: string
  installedAt: number
  lastUpdatedAt?: number
  mods: ModpackModEntry[]
  configs: ModpackConfigEntry[]
  overridesDir?: string
  iconUrl?: string
  sourceUrl?: string
  isFork?: boolean
  forkInfo?: ModpackForkInfo
}

export interface ModpackForkInfo {
  originalPackId: string
  originalPackName: string
  originalVersion: string
  forkCreatedAt: number
  addedMods: string[]
  removedMods: string[]
  modifiedConfigs: string[]
  lastSyncedVersion: string
  hasUpstreamUpdate: boolean
}

export interface ModpackManifest {
  format: ModpackFormat
  name: string
  version: string
  author: string
  description: string
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  mods: ModpackModEntry[]
  configs: ModpackConfigEntry[]
  overridesDir?: string
  sourceUrl?: string
  iconUrl?: string
}

export interface ModpackModEntry {
  fileName: string
  projectId?: number
  fileId?: number
  downloadUrl?: string
  hash?: string
  size?: number
  source: ModEntrySource
  required: boolean
  folderPath?: string
}

export interface ModpackConfigEntry {
  relativePath: string
  source: ConfigEntrySource
  hash?: string
  size?: number
}

export interface ModpackInstallProgress {
  phase: 'parsing' | 'downloading' | 'configuring' | 'verifying' | 'complete'
  current: number
  total: number
  currentItem: string
  bytesDownloaded: number
  bytesTotal: number
}

export interface ModpackInstallResult {
  success: boolean
  instanceId?: string
  instanceName: string
  modsInstalled: number
  configsRestored: number
  errors: string[]
}

export interface ModpackCreateSession {
  id: string
  name: string
  version: string
  author: string
  description: string
  gameVersion: string
  modLoader: string
  modLoaderVersion: string
  mods: ModpackCreateMod[]
  configs: ModpackCreateConfig[]
  overrides: string[]
  sourceInstanceId?: string
  createdAt: number
}

export interface ModpackCreateMod {
  fileName: string
  filePath: string
  source: ModEntrySource
  projectId?: number
  fileId?: number
  downloadUrl?: string
  hash?: string
  required: boolean
}

export interface ModpackCreateConfig {
  relativePath: string
  content: string
  included: boolean
}

export interface ModpackDiff {
  added: ModpackModEntry[]
  removed: ModpackModEntry[]
  updated: ModpackModEntry[]
  configChanges: ModpackConfigChange[]
  summary: string
}

export interface ModpackConfigChange {
  path: string
  changeType: ConfigChangeType
}

export interface ModpackUpdateResult {
  success: boolean
  modsAdded: number
  modsRemoved: number
  modsUpdated: number
  configChanges: number
  errors: string[]
  rolledBack: boolean
}

export interface ModpackForkMergeResult {
  success: boolean
  conflicts: ModpackForkConflict[]
  autoResolved: number
  manualRequired: number
}

export interface ModpackForkConflict {
  modFileName: string
  conflictType: ForkConflictType
  upstreamAction: string
  forkAction: string
  resolution?: ForkConflictResolution
}

export interface ModpackRating {
  modpackId: string
  completeness: number
  stability: number
  performance: number
  difficulty: number
  innovation: number
  overall: number
  reviewCount: number
}

export interface ModpackReview {
  id: string
  modpackId: string
  userId: string
  username: string
  rating: number
  completeness: number
  stability: number
  performance: number
  difficulty: number
  innovation: number
  content: string
  createdAt: number
  likes: number
}

export interface ModpackRecommendation {
  modpackId: string
  name: string
  score: number
  reason: string
  tags: string[]
}

export interface ModpackTestResult {
  passed: boolean
  checks: ModpackTestCheck[]
  overallScore: number
  estimatedStartupTime: number
  estimatedFps: number
  warnings: string[]
}

export interface ModpackTestCheck {
  id: string
  name: string
  category: TestCheckCategory
  status: TestCheckStatus
  message: string
  details?: string
}

export interface ModpackSyncRoom {
  id: string
  code: string
  hostId: string
  hostName: string
  modpackName: string
  modpackVersion: string
  gameVersion: string
  modLoader: string
  modCount: number
  participants: ModpackSyncParticipant[]
  createdAt: number
  status: SyncRoomStatus
}

export interface ModpackSyncParticipant {
  id: string
  name: string
  status: SyncParticipantStatus
  progress: number
  joinedAt: number
}

export interface ModpackPerformanceBenchmark {
  modpackId: string
  modpackName: string
  modCount: number
  minRam: number
  recommendedRam: number
  startupTimeMin: number
  startupTimeMax: number
  fpsMin: number
  fpsAvg: number
  fpsMax: number
  testConfig: string
  sampleCount: number
  lastUpdated: number
}

export function createEmptyModpackCreateSession(): ModpackCreateSession {
  return {
    id: `mpc-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: '',
    version: '1.0.0',
    author: '',
    description: '',
    gameVersion: '',
    modLoader: 'forge',
    modLoaderVersion: '',
    mods: [],
    configs: [],
    overrides: [],
    createdAt: Date.now(),
  }
}
