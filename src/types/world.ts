export type GameMode = 'survival' | 'creative' | 'adventure' | 'spectator';

export interface WorldInfo {
  name: string;
  path: string;
  size: number;
  gameVersion: string;
  gameMode: GameMode;
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard';
  cheatsEnabled: boolean;
  lastPlayed: number;
  lastPlayedDate: string;
  totalTime: number;
  seed?: string;
  spawnX?: number;
  spawnY?: number;
  spawnZ?: number;
  dayTime?: number;
  rainTime?: number;
  thunderTime?: number;
  dataVersion?: number;
  iconPath?: string;
  iconDataUrl?: string;
}

export interface WorldBackup {
  id: string;
  worldName: string;
  worldPath: string;
  backupPath: string;
  backupDate: string;
  size: number;
  description?: string;
}

export interface WorldImportOptions {
  sourcePath: string;
  targetVersion?: string;
  worldName?: string;
  overwrite?: boolean;
}

export interface WorldExportOptions {
  worldPath: string;
  targetPath: string;
  format: 'zip' | 'folder';
  includeIcon?: boolean;
}

// ========== #51 存档健康检查与修复 ==========

export type HealthCheckSeverity = 'pass' | 'warning' | 'error' | 'critical';

export interface WorldHealthCheckItem {
  id: string;
  category: 'level_dat' | 'region' | 'player_data' | 'session' | 'structure' | 'advancement' | 'stats';
  severity: HealthCheckSeverity;
  message: string;
  detail?: string;
  autoFixable: boolean;
  fixed?: boolean;
}

export interface WorldHealthReport {
  worldPath: string;
  worldName: string;
  checkTime: string;
  items: WorldHealthCheckItem[];
  summary: {
    total: number;
    pass: number;
    warning: number;
    error: number;
    critical: number;
  };
  overallHealth: number;
}

// ========== #52 存档时间线回放 ==========

export interface WorldTimelineEntry {
  id: string;
  worldPath: string;
  timestamp: string;
  label: string;
  backupId?: string;
  thumbnailDataUrl?: string;
  size: number;
  metadata?: {
    dayTime?: number;
    gameMode?: GameMode;
    playerCount?: number;
  };
}

export interface WorldTimeline {
  worldPath: string;
  entries: WorldTimelineEntry[];
  earliestDate: string;
  latestDate: string;
}

// ========== #53 存档世界地图生成 ==========

export type MapDimension = 'overworld' | 'nether' | 'end';

export interface WorldMapTile {
  x: number;
  z: number;
  dimension: MapDimension;
  color: string;
  biomeName?: string;
  hasStructure?: boolean;
  structureType?: string;
}

export interface WorldMapRender {
  worldPath: string;
  dimension: MapDimension;
  tiles: WorldMapTile[];
  width: number;
  height: number;
  spawnX: number;
  spawnZ: number;
  playerPositions?: { name: string; x: number; z: number }[];
  structureMarkers?: { type: string; x: number; z: number; label: string }[];
  renderTime: number;
}

export interface WorldMapOverview {
  worldPath: string;
  dimensions: {
    dimension: MapDimension;
    regionCount: number;
    totalChunks: number;
    exploredArea: number;
  }[];
}

// ========== #54 存档统计面板 ==========

export interface WorldStatistics {
  worldPath: string;
  worldName: string;
  general: {
    totalPlayTime: number;
    daysPlayed: number;
    distanceWalked: number;
    distanceSprinted: number;
    distanceCrouched: number;
    distanceFallen: number;
    jumps: number;
    deaths: number;
    damageTaken: number;
    damageDealt: number;
  };
  mining: {
    totalMined: number;
    topMined: { item: string; count: number }[];
    oreMined: { item: string; count: number }[];
  };
  building: {
    totalPlaced: number;
    topPlaced: { item: string; count: number }[];
  };
  combat: {
    mobsKilled: number;
    topKills: { mob: string; count: number }[];
    deathsByMob: { mob: string; count: number }[];
  };
  exploration: {
    biomesVisited: number;
    totalBiomes: number;
    dimensionsVisited: string[];
    portalsUsed: number;
  };
  crafting: {
    itemsCrafted: number;
    topCrafted: { item: string; count: number }[];
    itemsSmelted: number;
    itemsEnchanted: number;
  };
  farming: {
    animalsBred: number;
    cropsHarvested: number;
    fishCaught: number;
  };
  trading: {
    totalTrades: number;
    villagerTrades: number;
  };
}

// ========== #55 存档格式转换与迁移 ==========

export type WorldFormat = 'java' | 'bedrock';

export interface WorldConversionOptions {
  sourcePath: string;
  sourceFormat: WorldFormat;
  targetFormat: WorldFormat;
  targetPath: string;
  backupOriginal: boolean;
}

export interface WorldConversionResult {
  success: boolean;
  sourceFormat: WorldFormat;
  targetFormat: WorldFormat;
  targetPath: string;
  warnings: string[];
  errors: string[];
}

export interface WorldMigrationStep {
  fromVersion: string;
  toVersion: string;
  description: string;
  riskLevel: 'low' | 'medium' | 'high';
  backupRequired: boolean;
}

export interface WorldMigrationPlan {
  worldPath: string;
  currentVersion: string;
  targetVersion: string;
  steps: WorldMigrationStep[];
  totalRisk: 'low' | 'medium' | 'high';
  estimatedTime: string;
}

// ========== #56 种子预览器 ==========

export interface SeedPreviewBiome {
  name: string;
  color: string;
  x: number;
  z: number;
  radius: number;
}

export interface SeedPreviewStructure {
  type: string;
  name: string;
  x: number;
  z: number;
  dimension: MapDimension;
}

export interface SeedPreviewResult {
  seed: string;
  spawnBiome: string;
  spawnX: number;
  spawnZ: number;
  biomes: SeedPreviewBiome[];
  structures: SeedPreviewStructure[];
  renderDataUrl?: string;
  generateTime: number;
}

// ========== #57 存档云端同步 ==========

export type SyncStatus = 'idle' | 'syncing' | 'conflict' | 'error' | 'up_to_date';

export interface WorldSyncInfo {
  worldPath: string;
  worldName: string;
  localModified: string;
  remoteModified: string;
  syncStatus: SyncStatus;
  lastSyncTime?: string;
  remoteSize?: number;
  conflictFiles?: string[];
}

export interface WorldSyncConflict {
  worldName: string;
  filePath: string;
  localModified: string;
  remoteModified: string;
  localSize: number;
  remoteSize: number;
}

export interface WorldSyncResult {
  success: boolean;
  worldName: string;
  uploadedFiles: number;
  downloadedFiles: number;
  conflicts: WorldSyncConflict[];
  error?: string;
}

// ========== #58 存档瘦身工具 ==========

export interface ChunkHeatInfo {
  x: number;
  z: number;
  heat: number;
  dimension: MapDimension;
  regionFile: string;
  lastAccessed?: string;
}

export interface WorldSlimPlan {
  worldPath: string;
  worldName: string;
  totalSize: number;
  keepSize: number;
  removeSize: number;
  savingsPercent: number;
  chunks: {
    total: number;
    keep: number;
    remove: number;
  };
  regions: {
    total: number;
    keep: number;
    remove: number;
  };
  heatMap?: ChunkHeatInfo[];
}

export interface WorldSlimResult {
  success: boolean;
  originalSize: number;
  newSize: number;
  savedSize: number;
  savedPercent: number;
  chunksRemoved: number;
  regionsRemoved: number;
}

// ========== #59 存档日记 ==========

export interface WorldDiaryEntry {
  date: string;
  worldName: string;
  dayNumber: number;
  summary: string;
  highlights: string[];
  stats: {
    blocksPlaced: number;
    blocksMined: number;
    mobsKilled: number;
    distanceTraveled: number;
    itemsCrafted: number;
    deaths: number;
  };
  screenshotDataUrl?: string;
}

export interface WorldDiary {
  worldPath: string;
  worldName: string;
  entries: WorldDiaryEntry[];
  totalDays: number;
  startDate: string;
  lastDate: string;
}

// ========== #60 存档蓝图分享 ==========

export interface StructureExportOptions {
  worldPath: string;
  dimension: MapDimension;
  startX: number;
  startY: number;
  startZ: number;
  endX: number;
  endY: number;
  endZ: number;
  name: string;
  author: string;
  includeEntities: boolean;
}

export interface StructureInfo {
  name: string;
  author: string;
  filePath: string;
  sizeX: number;
  sizeY: number;
  sizeZ: number;
  blockCount: number;
  createdDate: string;
  previewDataUrl?: string;
  tags?: string[];
}

export interface BlueprintShareResult {
  success: boolean;
  structureName: string;
  filePath: string;
  fileSize: number;
  shareUrl?: string;
  qrCodeDataUrl?: string;
}
