import type {
  WorldInfo, WorldBackup, WorldImportOptions, WorldExportOptions,
  WorldHealthReport, WorldHealthCheckItem, HealthCheckSeverity,
  WorldTimeline, WorldTimelineEntry,
  WorldMapRender, WorldMapOverview, MapDimension,
  WorldStatistics,
  WorldConversionOptions, WorldConversionResult, WorldMigrationPlan,
  SeedPreviewResult,
  WorldSyncInfo, WorldSyncResult,
  WorldSlimPlan, WorldSlimResult,
  WorldDiary, WorldDiaryEntry,
  StructureExportOptions, StructureInfo, BlueprintShareResult,
} from '../../types/world';

export class WorldManager {
  private static instance: WorldManager;

  private constructor() {}

  static getInstance(): WorldManager {
    if (!WorldManager.instance) {
      WorldManager.instance = new WorldManager();
    }
    return WorldManager.instance;
  }

  async getWorlds(savesDir: string): Promise<WorldInfo[]> {
    return window.minecraftAPI.getWorlds(savesDir);
  }

  async getWorldInfo(worldPath: string): Promise<WorldInfo> {
    return window.minecraftAPI.getWorldInfo(worldPath);
  }

  async backupWorld(worldPath: string, backupDir: string, description?: string): Promise<WorldBackup> {
    return window.minecraftAPI.backupWorld(worldPath, backupDir, description);
  }

  async getBackups(backupDir: string): Promise<WorldBackup[]> {
    return window.minecraftAPI.getBackups(backupDir);
  }

  async restoreBackup(backupPath: string, targetPath: string): Promise<void> {
    return window.minecraftAPI.restoreBackup(backupPath, targetPath);
  }

  async deleteBackup(backupPath: string): Promise<void> {
    return window.minecraftAPI.deleteBackup(backupPath);
  }

  async exportWorld(options: WorldExportOptions): Promise<void> {
    return window.minecraftAPI.exportWorld(options);
  }

  async importWorld(options: WorldImportOptions): Promise<WorldInfo> {
    return window.minecraftAPI.importWorld(options);
  }

  async deleteWorld(worldPath: string): Promise<void> {
    return window.minecraftAPI.deleteWorld(worldPath);
  }

  async renameWorld(worldPath: string, newName: string): Promise<void> {
    return window.minecraftAPI.renameWorld(worldPath, newName);
  }

  async copyWorld(sourcePath: string, targetPath: string, newName?: string): Promise<WorldInfo> {
    return window.minecraftAPI.copyWorld(sourcePath, targetPath, newName);
  }

  async getWorldIcon(worldPath: string): Promise<string | null> {
    return window.minecraftAPI.getWorldIcon(worldPath);
  }

  // ========== #51 存档健康检查与修复 ==========

  async checkWorldHealth(worldPath: string): Promise<WorldHealthReport> {
    return window.minecraftAPI.checkWorldHealth(worldPath);
  }

  async fixWorldHealthIssue(worldPath: string, itemId: string): Promise<boolean> {
    return window.minecraftAPI.fixWorldHealthIssue(worldPath, itemId);
  }

  async fixAllWorldHealthIssues(worldPath: string): Promise<WorldHealthReport> {
    return window.minecraftAPI.fixAllWorldHealthIssues(worldPath);
  }

  // ========== #52 存档时间线回放 ==========

  async getWorldTimeline(worldPath: string): Promise<WorldTimeline> {
    return window.minecraftAPI.getWorldTimeline(worldPath);
  }

  async createTimelineEntry(worldPath: string, label: string): Promise<WorldTimelineEntry> {
    return window.minecraftAPI.createTimelineEntry(worldPath, label);
  }

  async restoreTimelineEntry(worldPath: string, entryId: string): Promise<boolean> {
    return window.minecraftAPI.restoreTimelineEntry(worldPath, entryId);
  }

  // ========== #53 存档世界地图生成 ==========

  async getWorldMapOverview(worldPath: string): Promise<WorldMapOverview> {
    return window.minecraftAPI.getWorldMapOverview(worldPath);
  }

  async renderWorldMap(worldPath: string, dimension: MapDimension, zoom?: number): Promise<WorldMapRender> {
    return window.minecraftAPI.renderWorldMap(worldPath, dimension, zoom);
  }

  // ========== #54 存档统计面板 ==========

  async getWorldStatistics(worldPath: string): Promise<WorldStatistics> {
    return window.minecraftAPI.getWorldStatistics(worldPath);
  }

  // ========== #55 存档格式转换与迁移 ==========

  async convertWorldFormat(options: WorldConversionOptions): Promise<WorldConversionResult> {
    return window.minecraftAPI.convertWorldFormat(options);
  }

  async getWorldMigrationPlan(worldPath: string, targetVersion: string): Promise<WorldMigrationPlan> {
    return window.minecraftAPI.getWorldMigrationPlan(worldPath, targetVersion);
  }

  async executeWorldMigration(worldPath: string, plan: WorldMigrationPlan): Promise<WorldConversionResult> {
    return window.minecraftAPI.executeWorldMigration(worldPath, plan);
  }

  // ========== #56 种子预览器 ==========

  async previewSeed(seed: string, gameVersion?: string): Promise<SeedPreviewResult> {
    return window.minecraftAPI.previewSeed(seed, gameVersion);
  }

  // ========== #57 存档云端同步 ==========

  async getWorldSyncInfo(worldPath: string): Promise<WorldSyncInfo> {
    return window.minecraftAPI.getWorldSyncInfo(worldPath);
  }

  async syncWorld(worldPath: string): Promise<WorldSyncResult> {
    return window.minecraftAPI.syncWorld(worldPath);
  }

  async resolveSyncConflict(worldPath: string, filePath: string, useLocal: boolean): Promise<boolean> {
    return window.minecraftAPI.resolveSyncConflict(worldPath, filePath, useLocal);
  }

  // ========== #58 存档瘦身工具 ==========

  async analyzeWorldSlim(worldPath: string): Promise<WorldSlimPlan> {
    return window.minecraftAPI.analyzeWorldSlim(worldPath);
  }

  async executeWorldSlim(worldPath: string, plan: WorldSlimPlan): Promise<WorldSlimResult> {
    return window.minecraftAPI.executeWorldSlim(worldPath, plan);
  }

  // ========== #59 存档日记 ==========

  async getWorldDiary(worldPath: string): Promise<WorldDiary> {
    return window.minecraftAPI.getWorldDiary(worldPath);
  }

  async generateDiaryEntry(worldPath: string, date: string): Promise<WorldDiaryEntry> {
    return window.minecraftAPI.generateDiaryEntry(worldPath, date);
  }

  // ========== #60 存档蓝图分享 ==========

  async exportStructure(options: StructureExportOptions): Promise<StructureInfo> {
    return window.minecraftAPI.exportStructure(options);
  }

  async importStructure(worldPath: string, structurePath: string, x: number, y: number, z: number): Promise<boolean> {
    return window.minecraftAPI.importStructure(worldPath, structurePath, x, y, z);
  }

  async shareBlueprint(structurePath: string): Promise<BlueprintShareResult> {
    return window.minecraftAPI.shareBlueprint(structurePath);
  }

  async getWorldStructures(worldPath: string): Promise<StructureInfo[]> {
    return window.minecraftAPI.getWorldStructures(worldPath);
  }

  // ========== 工具方法 ==========

  formatWorldSize(bytes: number): string {
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    return `${size.toFixed(2)} ${units[unitIndex]}`;
  }

  formatPlayTime(ticks: number): string {
    const seconds = Math.floor(ticks / 20);
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) return `${hours}小时 ${minutes}分钟`;
    return `${minutes}分钟`;
  }

  formatDate(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
      year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit',
    });
  }

  getGameModeName(mode: string): string {
    const names: Record<string, string> = {
      survival: '生存模式', creative: '创造模式', adventure: '冒险模式', spectator: '旁观模式',
    };
    return names[mode] || mode;
  }

  getDifficultyName(difficulty: string): string {
    const names: Record<string, string> = {
      peaceful: '和平', easy: '简单', normal: '普通', hard: '困难',
    };
    return names[difficulty] || difficulty;
  }

  getHealthSeverityColor(severity: HealthCheckSeverity): string {
    const colors: Record<HealthCheckSeverity, string> = {
      pass: '#4ade80', warning: '#fbbf24', error: '#f87171', critical: '#ef4444',
    };
    return colors[severity];
  }

  getHealthSeverityLabel(severity: HealthCheckSeverity): string {
    const labels: Record<HealthCheckSeverity, string> = {
      pass: '通过', warning: '警告', error: '错误', critical: '严重',
    };
    return labels[severity];
  }

  getDimensionName(dim: MapDimension): string {
    const names: Record<MapDimension, string> = {
      overworld: '主世界', nether: '下界', end: '末地',
    };
    return names[dim];
  }
}

export const worldManager = WorldManager.getInstance();
