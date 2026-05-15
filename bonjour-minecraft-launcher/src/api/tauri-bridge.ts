import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  Account, LaunchOptions, LauncherSettings, VersionManifest,
  InstalledVersion, VersionInstance, InstanceSettings, ShaderPack,
  MicrosoftAuthResult, HardwareInfo, JavaVersionInfo, PreCheckResult,
  MigrationSource, DownloadSourceInfo, NetworkStatus, PerformanceProfile, RegionInfo
} from '../types'
import type { LocalMod } from '../types/mod'
import type {
  WorldInfo, WorldBackup, WorldImportOptions, WorldExportOptions,
  WorldHealthReport, WorldTimeline, WorldTimelineEntry, WorldMapRender,
  WorldMapOverview, MapDimension, WorldStatistics, WorldConversionOptions,
  WorldConversionResult, WorldMigrationPlan, SeedPreviewResult,
  WorldSyncInfo, WorldSyncResult, WorldSlimPlan, WorldSlimResult,
  WorldDiary, WorldDiaryEntry, StructureExportOptions, StructureInfo,
  BlueprintShareResult
} from '../types/world'
import type { DownloadOptions } from '../types/download'
import type { ResourcePack, Datapack, StructureFile, GlobalResourceIndex } from '../types/resource'
import type {
  ModSearchResult, BatchInstallTask, BatchInstallResult,
  ModRecommendation, ModConflict, ModUpdateInfo,
  ModRating, ModPerformanceRating, InstancePerformanceEstimate,
  ConfigMigrationCheck, ModShareInfo, ModMetadataEnhancement,
  ModLoaderDetection, ModAssociation,
  TextureProject, ResourceSubscription, ResourceSubscriptionUpdate,
  ResourceSubscriptionNotification, ResourceCollection,
  ModpackInfo, ModpackUpdateCheck, ModpackVersionDiff,
  ModpackUpdateOptions, ModpackFork, ModpackTestResult,
  ModpackPerformance, SyncRoom, ModpackRecommendation,
  ModpackRating, OverlayData, CrashReport,
  FileVerificationResult, IncrementalSyncResult,
  RepairResult, LaunchBenchmark, BenchmarkSummary,
  GameProcessInfo, ServerEntry, ServerGroup, ServerPingResult,
  LocalServerInfo, LANWorldInfo, FriendLobby, CommunityServer,
  ServerNotification, ServerPortalEntry, ServerNotificationConfig,
  JVMProfile, ConfigCategory, InstanceGroup, InstanceTag,
  InstanceTemplate, VersionCompatibility, VersionDiff,
  InstanceSnapshot, InstanceSnapshotDiff, InstanceStorageAnalysis,
  InstanceDashboard, VersionMigrationGuide, HealthCheckResult,
  LaunchDependency, VersionAnnotation, StructurePreview,
  MicrosoftLoginRefreshResult, LittleskinPlayer,
  BatchInstallProgressData
} from '../types/bridge'

export const minecraftAPI = {
  getVersionManifest: () => invoke<VersionManifest>('get_version_manifest'),
  getInstalledVersions: () => invoke<InstalledVersion[]>('get_installed_versions'),
  installVersion: (versionId: string) => invoke<boolean>('install_version', { versionId }),
  scanGameDir: (gameDir: string) => invoke<InstalledVersion[]>('scan_game_dir', { gameDir }),

  checkJava: () => invoke<{ available: boolean; path: string | null; version: string | null; majorVersion: number; isCompatible: boolean }>('check_java'),
  downloadJava: () => invoke<{ success: boolean; path?: string; message?: string }>('download_java'),

  getAccounts: () => invoke<Account[]>('get_accounts'),
  saveAccounts: (accounts: Account[]) => invoke<boolean>('save_accounts', { accounts }),
  addOfflineAccount: (username: string) => invoke<Account>('add_offline_account', { username }),
  deleteAccount: (accountId: string) => invoke<boolean>('delete_account', { accountId }),

  getSettings: () => invoke<LauncherSettings>('get_settings'),
  saveSettings: (settings: LauncherSettings) => invoke<boolean>('save_settings', { settings }),

  launchGame: (options: LaunchOptions) => invoke<boolean>('launch_game', { options }),
  launchInstance: (instanceId: string, account: Account) => invoke<boolean>('launch_instance', { instanceId, account }),
  warmupLaunchCache: (gameDir: string, version: string) => invoke<boolean>('warmup_launch_cache', { gameDir, version }),

  selectJavaPath: () => invoke<string | null>('select_java_path'),
  selectGameDir: () => invoke<{ path: string; versions: InstalledVersion[] } | null>('select_game_dir'),

  getSystemInfo: () => invoke<{ platform: string; arch: string; totalMemory: number; freeMemory: number; cpus: number }>('get_system_info'),
  openExternal: (url: string) => {
    try {
      const parsed = new URL(url)
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return Promise.reject(new Error('不允许打开非 HTTP/HTTPS 链接'))
      }
    } catch {
      return Promise.reject(new Error('无效的 URL'))
    }
    return invoke<void>('open_external', { url })
  },

  scanLocalMods: (modsDir: string) => invoke<LocalMod[]>('scan_local_mods', { modsDir }),
  toggleMod: (modPath: string, enabled: boolean) => invoke<void>('toggle_mod', { modPath, enabled }),
  deleteMod: (modPath: string) => invoke<void>('delete_mod', { modPath }),
  installMod: (downloadUrl: string, targetPath: string, options?: { expectedHash?: string }) =>
    invoke<void>('install_mod', { downloadUrl, targetPath, options }),
  analyzeModJar: (filePath: string) => invoke<ModMetadataEnhancement>('analyze_mod_jar', { filePath }),
  computeModHash: (filePath: string) => invoke<string | null>('compute_mod_hash', { filePath }),

  getWorlds: (savesDir: string) => invoke<WorldInfo[]>('get_worlds', { savesDir }),
  getWorldInfo: (worldPath: string) => invoke<WorldInfo>('get_world_info', { worldPath }),
  backupWorld: (worldPath: string, backupDir: string, description?: string) =>
    invoke<WorldBackup>('backup_world', { worldPath, backupDir, description }),
  getBackups: (backupDir: string) => invoke<WorldBackup[]>('get_backups', { backupDir }),
  restoreBackup: (backupPath: string, targetPath: string) => invoke<void>('restore_backup', { backupPath, targetPath }),
  deleteBackup: (backupPath: string) => invoke<void>('delete_backup', { backupPath }),
  exportWorld: (options: WorldExportOptions) => invoke<void>('export_world', { options }),
  importWorld: (options: WorldImportOptions) => invoke<WorldInfo>('import_world', { options }),
  deleteWorld: (worldPath: string) => invoke<void>('delete_world', { worldPath }),
  renameWorld: (worldPath: string, newName: string) => invoke<void>('rename_world', { worldPath, newName }),
  copyWorld: (sourcePath: string, targetPath: string, newName?: string) =>
    invoke<WorldInfo>('copy_world', { sourcePath, targetPath, newName }),
  getWorldIcon: (worldPath: string) => invoke<string | null>('get_world_icon', { worldPath }),

  checkWorldHealth: (worldPath: string) => invoke<WorldHealthReport>('check_world_health', { worldPath }),
  fixWorldHealthIssue: (worldPath: string, itemId: string) => invoke<boolean>('fix_world_health_issue', { worldPath, itemId }),
  fixAllWorldHealthIssues: (worldPath: string) => invoke<WorldHealthReport>('fix_all_world_health_issues', { worldPath }),
  getWorldTimeline: (worldPath: string) => invoke<WorldTimeline>('get_world_timeline', { worldPath }),
  createTimelineEntry: (worldPath: string, label: string) => invoke<WorldTimelineEntry>('create_timeline_entry', { worldPath, label }),
  restoreTimelineEntry: (worldPath: string, entryId: string) => invoke<boolean>('restore_timeline_entry', { worldPath, entryId }),
  getWorldMapOverview: (worldPath: string) => invoke<WorldMapOverview>('get_world_map_overview', { worldPath }),
  renderWorldMap: (worldPath: string, dimension: MapDimension, zoom?: number) =>
    invoke<WorldMapRender>('render_world_map', { worldPath, dimension, zoom }),
  getWorldStatistics: (worldPath: string) => invoke<WorldStatistics>('get_world_statistics', { worldPath }),
  convertWorldFormat: (options: WorldConversionOptions) => invoke<WorldConversionResult>('convert_world_format', { options }),
  getWorldMigrationPlan: (worldPath: string, targetVersion: string) =>
    invoke<WorldMigrationPlan>('get_world_migration_plan', { worldPath, targetVersion }),
  executeWorldMigration: (worldPath: string, plan: WorldMigrationPlan) =>
    invoke<WorldConversionResult>('execute_world_migration', { worldPath, plan }),
  previewSeed: (seed: string, gameVersion?: string) => invoke<SeedPreviewResult>('preview_seed', { seed, gameVersion }),
  getWorldSyncInfo: (worldPath: string) => invoke<WorldSyncInfo>('get_world_sync_info', { worldPath }),
  syncWorld: (worldPath: string) => invoke<WorldSyncResult>('sync_world', { worldPath }),
  resolveSyncConflict: (worldPath: string, filePath: string, useLocal: boolean) =>
    invoke<boolean>('resolve_sync_conflict', { worldPath, filePath, useLocal }),
  analyzeWorldSlim: (worldPath: string) => invoke<WorldSlimPlan>('analyze_world_slim', { worldPath }),
  executeWorldSlim: (worldPath: string, plan: WorldSlimPlan) => invoke<WorldSlimResult>('execute_world_slim', { worldPath, plan }),
  getWorldDiary: (worldPath: string) => invoke<WorldDiary>('get_world_diary', { worldPath }),
  generateDiaryEntry: (worldPath: string, date: string) => invoke<WorldDiaryEntry>('generate_diary_entry', { worldPath, date }),
  exportStructure: (options: StructureExportOptions) => invoke<StructureInfo>('export_structure', { options }),
  importStructure: (worldPath: string, structurePath: string, x: number, y: number, z: number) =>
    invoke<boolean>('import_structure', { worldPath, structurePath, x, y, z }),
  shareBlueprint: (structurePath: string) => invoke<BlueprintShareResult>('share_blueprint', { structurePath }),
  getWorldStructures: (worldPath: string) => invoke<StructureInfo[]>('get_world_structures', { worldPath }),

  downloadFile: (url: string, targetPath: string, options?: DownloadOptions) =>
    invoke<void>('download_file', { url, targetPath, options }),
  pauseDownload: (taskId: string) => invoke<void>('pause_download', { taskId }),
  resumeDownload: (taskId: string) => invoke<void>('resume_download', { taskId }),
  cancelDownload: (taskId: string) => invoke<void>('cancel_download', { taskId }),

  getInstances: () => invoke<VersionInstance[]>('get_instances'),
  createInstance: (data: { name: string; gameVersion: string; modLoader?: string; modLoaderVersion?: string }) =>
    invoke<VersionInstance>('create_instance', { data }),
  deleteInstance: (instanceId: string) => invoke<boolean>('delete_instance', { instanceId }),
  updateInstance: (instanceId: string, updates: Partial<VersionInstance>) =>
    invoke<VersionInstance>('update_instance', { instanceId, updates }),
  updateInstanceSettings: (instanceId: string, settings: InstanceSettings) =>
    invoke<VersionInstance>('update_instance_settings', { instanceId, settings }),
  getInstance: (instanceId: string) => invoke<VersionInstance | null>('get_instance', { instanceId }),
  getInstanceByVersion: (versionId: string) => invoke<VersionInstance | null>('get_instance_by_version', { versionId }),
  ensureInstancesForVersions: (versionIds: string[]) => invoke<boolean>('ensure_instances_for_versions', { versionIds }),

  scanInstanceMods: (instanceId: string) => invoke<LocalMod[]>('scan_instance_mods', { instanceId }),
  addModToInstance: (instanceId: string, sourcePath: string, fileName?: string) =>
    invoke<boolean>('add_mod_to_instance', { instanceId, sourcePath, fileName }),
  toggleInstanceMod: (instanceId: string, modPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_instance_mod', { instanceId, modPath, enabled }),
  deleteInstanceMod: (instanceId: string, modPath: string) => invoke<boolean>('delete_instance_mod', { instanceId, modPath }),
  checkModCompatibility: (instanceId: string, modGameVersions: string[], modLoader: string) =>
    invoke<{ compatible: boolean; versionMatch: boolean; loaderMatch: boolean; reason: string }>('check_mod_compatibility', { instanceId, modGameVersions, modLoader }),
  getModLoaderVersions: (gameVersion: string) => invoke<{
    forge: Array<{ version: string; mcversion?: string; type: string }>;
    fabric: Array<{ version: string; type: string }>;
    quilt: Array<{ version: string; type: string }>;
    neoforge: Array<{ version: string; type: string }>;
  }>('get_mod_loader_versions', { gameVersion }),
  installModLoader: (instanceId: string, loaderType: string, loaderVersion: string) =>
    invoke<VersionInstance>('install_mod_loader', { instanceId, loaderType, loaderVersion }),

  searchModsGlobal: (query: string, gameVersion?: string, modLoader?: string, category?: string, sortBy?: string, limit?: number, offset?: number) =>
    invoke<ModSearchResult>('search_mods_global', { query, gameVersion, modLoader, category, sortBy, limit, offset }),
  batchInstallMods: (tasks: BatchInstallTask[]) =>
    invoke<BatchInstallResult[]>('batch_install_mods', { tasks }),
  getModRecommendations: (modIds: string[]) =>
    invoke<ModRecommendation>('get_mod_recommendations', { modIds }),
  checkModConflicts: (mods: LocalMod[]) =>
    invoke<ModConflict[]>('check_mod_conflicts', { mods }),
  checkModUpdatesRust: (mods: LocalMod[], gameVersion: string, modLoader: string) =>
    invoke<ModUpdateInfo[]>('check_mod_updates_rust', { mods, gameVersion, modLoader }),
  aggregateModRatings: (modIds: string[]) =>
    invoke<ModRating[]>('aggregate_mod_ratings', { modIds }),
  getModPerformanceRatings: (modIds: string[]) =>
    invoke<ModPerformanceRating[]>('get_mod_performance_ratings', { modIds }),
  estimateInstancePerformance: (mods: LocalMod[], totalMemoryMb: number) =>
    invoke<InstancePerformanceEstimate>('estimate_instance_performance', { mods, totalMemoryMb }),
  checkConfigMigration: (modId: string, modName: string, oldVersion: string, newVersion: string, configPath: string) =>
    invoke<ConfigMigrationCheck>('check_config_migration', { modId, modName, oldVersion, newVersion, configPath }),
  generateModShareInfo: (modId: string, name: string, chineseName: string | undefined, version: string, description: string, iconUrl: string | undefined, source: string, downloadUrl: string | undefined, projectUrl: string | undefined) =>
    invoke<ModShareInfo>('generate_mod_share_info', { modId, name, chineseName, version, description, iconUrl, source, downloadUrl, projectUrl }),
  enhanceModMetadata: (filePath: string) =>
    invoke<ModMetadataEnhancement>('enhance_mod_metadata', { filePath }),
  detectModLoaderFromJar: (filePath: string) =>
    invoke<ModLoaderDetection>('detect_mod_loader_from_jar', { filePath }),
  getModChineseName: (modId: string) =>
    invoke<string | null>('get_mod_chinese_name', { modId }),
  getModAssociations: (modId: string) =>
    invoke<ModAssociation[]>('get_mod_associations', { modId }),
  onBatchInstallProgress: (callback: (data: BatchInstallProgressData) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<BatchInstallProgressData>('batch-install-progress', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen batch-install-progress:', err))
    return () => { disposed = true; unlisten?.() }
  },

  scanInstanceShaders: (instanceId: string) => invoke<ShaderPack[]>('scan_instance_shaders', { instanceId }),
  addShaderPack: (instanceId: string, sourcePath: string) => invoke<boolean>('add_shader_pack', { instanceId, sourcePath }),
  toggleShaderPack: (instanceId: string, shaderPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_shader_pack', { instanceId, shaderPath, enabled }),
  deleteShaderPack: (instanceId: string, shaderPath: string) => invoke<boolean>('delete_shader_pack', { instanceId, shaderPath }),
  reorderShaderPacks: (instanceId: string, shaderIds: string[]) => invoke<VersionInstance>('reorder_shader_packs', { instanceId, shaderIds }),

  scanInstanceResourcePacks: (instanceId: string) => invoke<ResourcePack[]>('scan_instance_resource_packs', { instanceId }),
  addResourcePack: (instanceId: string, sourcePath: string) => invoke<boolean>('add_resource_pack', { instanceId, sourcePath }),
  toggleResourcePack: (instanceId: string, resourcePackPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_resource_pack', { instanceId, resourcePackPath, enabled }),
  deleteResourcePack: (instanceId: string, resourcePackPath: string) =>
    invoke<boolean>('delete_resource_pack', { instanceId, resourcePackPath }),
  reorderResourcePacks: (instanceId: string, resourcePackIds: string[]) =>
    invoke<VersionInstance>('reorder_resource_packs', { instanceId, resourcePackIds }),
  selectResourcePackFile: () => invoke<string | null>('select_resource_pack_file'),

  createTextureProject: (name: string, description: string, packFormat: number) =>
    invoke<TextureProject>('create_texture_project', { name, description, packFormat }),
  saveTextureProject: (project: TextureProject) => invoke<boolean>('save_texture_project', { project }),
  exportTextureProject: (projectId: string) => invoke<string | null>('export_texture_project', { projectId }),
  getTextureProjects: () => invoke<TextureProject[]>('get_texture_projects'),

  getResourceSubscriptions: () => invoke<ResourceSubscription[]>('get_resource_subscriptions'),
  addResourceSubscription: (sub: Omit<ResourceSubscription, 'id'>) => invoke<ResourceSubscription>('add_resource_subscription', { sub }),
  removeResourceSubscription: (subId: string) => invoke<boolean>('remove_resource_subscription', { subId }),
  checkResourceSubscriptionUpdates: () => invoke<ResourceSubscriptionUpdate[]>('check_resource_subscription_updates'),
  getResourceSubscriptionNotifications: () => invoke<ResourceSubscriptionNotification[]>('get_resource_subscription_notifications'),
  markResourceNotificationRead: (notifId: string) => invoke<boolean>('mark_resource_notification_read', { notifId }),

  getResourceCollections: () => invoke<ResourceCollection[]>('get_resource_collections'),
  createResourceCollection: (collection: Omit<ResourceCollection, 'id' | 'createdAt'>) => invoke<ResourceCollection>('create_resource_collection', { collection }),
  updateResourceCollection: (collectionId: string, updates: Partial<ResourceCollection>) => invoke<ResourceCollection>('update_resource_collection', { collectionId, updates }),
  deleteResourceCollection: (collectionId: string) => invoke<boolean>('delete_resource_collection', { collectionId }),
  installResourceCollection: (collectionId: string, instanceId: string) => invoke<BatchInstallResult[]>('install_resource_collection', { collectionId, instanceId }),

  scanInstanceDatapacks: (instanceId: string, worldName?: string) => invoke<Datapack[]>('scan_instance_datapacks', { instanceId, worldName }),
  toggleInstanceDatapack: (instanceId: string, datapackPath: string, enabled: boolean, worldName?: string) =>
    invoke<boolean>('toggle_instance_datapack', { instanceId, datapackPath, enabled, worldName }),
  deleteInstanceDatapack: (instanceId: string, datapackPath: string, worldName?: string) =>
    invoke<boolean>('delete_instance_datapack', { instanceId, datapackPath, worldName }),
  addInstanceDatapack: (instanceId: string, sourcePath: string, worldName?: string) =>
    invoke<boolean>('add_instance_datapack', { instanceId, sourcePath, worldName }),
  selectDatapackFile: () => invoke<string | null>('select_datapack_file'),

  scanInstanceStructures: (instanceId: string) => invoke<StructureFile[]>('scan_instance_structures', { instanceId }),
  importInstanceStructure: (instanceId: string, sourcePath: string) =>
    invoke<boolean>('import_instance_structure', { instanceId, sourcePath }),
  exportInstanceStructure: (instanceId: string, structureId: string, targetPath: string) =>
    invoke<boolean>('export_instance_structure', { instanceId, structureId, targetPath }),
  deleteInstanceStructure: (instanceId: string, structurePath: string) =>
    invoke<boolean>('delete_instance_structure', { instanceId, structurePath }),
  getStructurePreview: (instanceId: string, structurePath: string) => invoke<StructurePreview>('get_structure_preview', { instanceId, structurePath }),
  selectStructureFile: () => invoke<string | null>('select_structure_file'),

  buildGlobalResourceIndex: () => invoke<GlobalResourceIndex[]>('build_global_resource_index'),

  selectShaderFile: () => invoke<string | null>('select_shader_file'),
  selectModFile: () => invoke<string[] | null>('select_mod_file'),
  selectImageFile: () => invoke<string | null>('select_image_file'),
  selectSkinFile: () => invoke<string | null>('select_skin_file'),

  microsoftLoginStart: () => invoke<MicrosoftAuthResult>('microsoft_login_start'),
  microsoftLoginPoll: (deviceCode: string) => invoke<MicrosoftAuthResult>('microsoft_login_poll', { deviceCode }),
  microsoftLoginRefresh: (refreshToken: string) => invoke<MicrosoftLoginRefreshResult>('microsoft_login_refresh', { refreshToken }),

  uploadSkin: (accessToken: string, skinPath: string, skinModel: 'classic' | 'slim') =>
    invoke<{ success: boolean; error?: string }>('upload_skin', { accessToken, skinPath, skinModel }),
  uploadAvatar: (accountId: string, imagePath: string) =>
    invoke<{ success: boolean; avatarUrl?: string; error?: string }>('upload_avatar', { accountId, imagePath }),

  littleskinLogin: (serverUrl: string, email: string, password: string) =>
    invoke<{ success: boolean; account?: Account; error?: string }>('littleskin_login', { serverUrl, email, password }),
  littleskinGetPlayers: (serverUrl: string, accessToken: string) =>
    invoke<{ success: boolean; players?: LittleskinPlayer[]; error?: string }>('littleskin_get_players', { serverUrl, accessToken }),
  littleskinUploadSkin: (serverUrl: string, accessToken: string, skinPath: string, playerName: string) =>
    invoke<{ success: boolean; error?: string }>('littleskin_upload_skin', { serverUrl, accessToken, skinPath, playerName }),

  installModpack: (filePath: string, instanceName?: string) => invoke<ModpackInfo>('install_modpack', { filePath, instanceName }),
  createModpack: (instanceId: string, packName: string, packVersion: string, packAuthor: string, packDescription: string, format: string) =>
    invoke<ModpackInfo>('create_modpack', { instanceId, packName, packVersion, packAuthor, packDescription, format }),
  exportModpack: (instanceId: string, packName: string, packVersion: string, packAuthor: string, packDescription: string) =>
    invoke<string | null>('export_modpack', { instanceId, packName, packVersion, packAuthor, packDescription }),
  getInstalledModpacks: () => invoke<ModpackInfo[]>('get_installed_modpacks'),
  deleteModpack: (modpackId: string) => invoke<boolean>('delete_modpack', { modpackId }),
  checkModpackUpdate: (instanceId: string) => invoke<ModpackUpdateCheck>('check_modpack_update', { instanceId }),
  updateModpack: (modpackId: string) => invoke<ModpackInfo>('update_modpack', { modpackId }),
  diffModpackVersions: (currentMods: LocalMod[], newMods: LocalMod[]) => invoke<ModpackVersionDiff>('diff_modpack_versions', { currentMods, newMods }),
  applyModpackUpdate: (options: ModpackUpdateOptions) => invoke<ModpackInfo>('apply_modpack_update', { options }),
  getModpackForks: () => invoke<ModpackFork[]>('get_modpack_forks'),
  createModpackFork: (originalPackId: string, originalPackName: string, originalVersion: string, instanceId: string, forkName: string) =>
    invoke<ModpackFork>('fork_modpack', { originalPackId, originalPackName, originalVersion, instanceId, forkName }),
  checkForkUpstreamUpdate: (forkId: string) => invoke<ModpackUpdateCheck>('check_fork_upstream_update', { forkId }),
  mergeForkWithUpstream: (forkId: string, upstreamDiff: ModpackVersionDiff, forkAddedMods: string[], forkRemovedMods: string[]) =>
    invoke<ModpackInfo>('merge_fork_with_upstream', { forkId, upstreamDiff, forkAddedMods, forkRemovedMods }),
  runModpackTest: (gameVersion: string, modLoader: string, modList: LocalMod[]) =>
    invoke<ModpackTestResult>('run_modpack_test', { gameVersion, modLoader, modList }),
  testModpackCompatibility: (modpackId: string, gameVersion: string) =>
    invoke<ModpackTestResult>('test_modpack_compatibility', { modpackId, gameVersion }),
  getModpackPerformance: (modpackId: string, modpackName: string, modCount: number) =>
    invoke<ModpackPerformance>('get_modpack_performance', { modpackId, modpackName, modCount }),
  createSyncRoom: (hostName: string, modpackName: string, modpackVersion: string, gameVersion: string, modLoader: string, modCount: number) =>
    invoke<SyncRoom>('create_sync_room', { hostName, modpackName, modpackVersion, gameVersion, modLoader, modCount }),
  joinSyncRoom: (roomCode: string, participantName: string) =>
    invoke<SyncRoom>('join_sync_room', { roomCode, participantName }),
  getSyncRooms: () => invoke<SyncRoom[]>('get_sync_rooms'),
  getModpackRecommendations: (userPlayedModpacks: string[], limit: number) =>
    invoke<ModpackRecommendation[]>('get_modpack_recommendations', { userPlayedModpacks, limit }),
  getModpackRating: (modpackId: string) => invoke<ModpackRating>('get_modpack_rating', { modpackId }),

  getHardwareInfo: () => invoke<HardwareInfo>('get_hardware_info'),
  getAllJavaVersions: () => invoke<JavaVersionInfo[]>('get_all_java_versions'),
  getJavaForVersion: (gameVersion: string) => invoke<string | null>('get_java_for_version', { gameVersion }),
  downloadJavaVersion: (majorVersion: number) => invoke<{ success: boolean; path?: string; message?: string }>('download_java_version', { majorVersion }),
  downloadJavaWithProgress: (majorVersion: number) => invoke<{ success: boolean; path?: string; message?: string }>('download_java_with_progress', { majorVersion }),
  runPreCheck: (instanceId?: string, gameVersion?: string) => invoke<PreCheckResult[]>('run_pre_check', { instanceId, gameVersion }),
  completeSetup: (settings: Partial<LauncherSettings>) => invoke<LauncherSettings>('complete_setup', { settings }),
  autoSetup: () => invoke<{ gameDir: string; javaPath: string; needsJavaDownload: boolean; settings: LauncherSettings }>('auto_setup'),
  isFirstLaunch: () => invoke<boolean>('is_first_launch'),

  overlayOpen: (opacity?: number, position?: string) => invoke<boolean>('overlay_open', { opacity, position }),
  overlayClose: () => invoke<boolean>('overlay_close'),
  overlayToggle: () => invoke<boolean>('overlay_toggle'),
  overlayGetData: () => invoke<OverlayData>('overlay_get_data'),
  overlaySetGamePid: (pid: number) => invoke<void>('overlay_set_game_pid', { pid }),
  overlayStartLogWatcher: (gameDir: string) => invoke<void>('overlay_start_log_watcher', { gameDir }),
  overlayStopLogWatcher: () => invoke<void>('overlay_stop_log_watcher'),
  overlaySetCollapsed: (collapsed: boolean) => invoke<void>('overlay_set_collapsed', { collapsed }),

  findJavaInstallations: () => invoke<Array<{ majorVersion: number; path: string; version: string; source: string }>>('find_java_installations'),
  findGameDirectories: () => invoke<Array<{ path: string; label: string; isDefault: boolean }>>('find_game_directories'),

  detectLaunchers: () => invoke<MigrationSource[]>('detect_launchers'),
  migrateLauncherData: (source: MigrationSource, selectedInstances: number[]) =>
    invoke<{ name: string; success: boolean; error?: string }[]>('migrate_launcher_data', { source, selectedInstances }),

  detectDownloadSource: () => invoke<DownloadSourceInfo[]>('detect_download_source'),
  getOptimalDownloadUrl: (originalUrl: string) => invoke<string>('get_optimal_download_url', { originalUrl }),

  checkForUpdates: () => invoke<{
    hasUpdate: boolean; currentVersion: string; latestVersion: string;
    releaseNotes?: string; downloadUrl?: string; error?: string
  }>('check_for_updates'),
  checkNetworkStatus: () => invoke<NetworkStatus>('check_network_status'),
  detectRegion: () => invoke<RegionInfo>('detect_region'),
  getPerformanceTier: () => invoke<PerformanceProfile>('get_performance_tier'),

  launchEngineStart: (version: string, accountName: string, instanceId?: string) =>
    invoke<string>('launch_engine_start', { version, accountName, instanceId }),
  launchEnginePhase: (sessionId: string, phaseId: string) => invoke<boolean>('launch_engine_phase', { sessionId, phaseId }),
  launchEngineLog: (sessionId: string, type: string, message: string, phaseId: string) =>
    invoke<boolean>('launch_engine_log', { sessionId, type, message, phaseId }),
  launchEngineComplete: (sessionId: string, pid: number) => invoke<boolean>('launch_engine_complete', { sessionId, pid }),
  launchEngineExit: (sessionId: string, exitCode: number) => invoke<boolean>('launch_engine_exit', { sessionId, exitCode }),

  getJVMProfiles: () => invoke<JVMProfile[]>('get_jvm_profiles'),
  recommendJVMProfile: (totalMemoryMB: number, javaMajorVersion: number, modCount: number) =>
    invoke<{ profileId: string; maxMemory: number; minMemory: number; warnings: string[] }>('recommend_jvm_profile', { totalMemoryMb: totalMemoryMB, javaMajorVersion, modCount }),

  createCrashReport: (version: string, exitCode: number, rawLog: string, instanceId?: string) =>
    invoke<CrashReport>('create_crash_report', { version, exitCode, rawLog, instanceId }),
  getCrashReports: (limit?: number) => invoke<CrashReport[]>('get_crash_reports', { limit }),

  verifyLocalFile: (filePath: string, expectedHash?: string, expectedSize?: number) => invoke<FileVerificationResult>('verify_local_file', { filePath, expectedHash, expectedSize }),
  incrementalSync: (gameDir: string, versionJson: Record<string, unknown>, concurrency?: number) => invoke<IncrementalSyncResult>('incremental_sync', { gameDir, versionJson, concurrency }),
  repairVersionFiles: (versionId: string) => invoke<RepairResult>('repair_version_files', { versionId }),
  getLaunchBenchmarks: (version: string, limit?: number) => invoke<LaunchBenchmark[]>('get_launch_benchmarks', { version, limit }),
  getBenchmarkSummary: (version: string) => invoke<BenchmarkSummary>('get_benchmark_summary', { version }),
  saveBenchmark: (record: Omit<LaunchBenchmark, 'id'>) => invoke<LaunchBenchmark>('save_benchmark', { record }),
  getRunningGameProcesses: () => invoke<GameProcessInfo[]>('get_running_game_processes'),
  killGameProcess: (pid: number) => invoke<boolean>('kill_game_process', { pid }),

  getServers: () => invoke<ServerEntry[]>('get_servers'),
  addServer: (name: string, address: string) => invoke<ServerEntry>('add_server', { name, address }),
  deleteServer: (serverId: string) => invoke<boolean>('delete_server', { serverId }),
  updateServer: (serverId: string, updates: Partial<ServerEntry>) => invoke<ServerEntry>('update_server', { serverId, updates }),
  getServerGroups: () => invoke<ServerGroup[]>('get_server_groups'),
  createServerGroup: (name: string, color?: string, icon?: string) => invoke<ServerGroup>('create_server_group', { name, color, icon }),
  deleteServerGroup: (groupId: string) => invoke<boolean>('delete_server_group', { groupId }),
  pingServer: (address: string, port: number) => invoke<ServerPingResult>('ping_server', { address, port }),
  joinServer: (address: string, port: number) => invoke<boolean>('join_server', { address, port }),
  getLocalServers: () => invoke<LocalServerInfo[]>('get_local_servers'),
  createLocalServer: (config: Omit<LocalServerInfo, 'id' | 'status' | 'playerCount'>) => invoke<LocalServerInfo>('create_local_server', { config }),
  startLocalServer: (serverId: string) => invoke<boolean>('start_local_server', { serverId }),
  stopLocalServer: (serverId: string) => invoke<boolean>('stop_local_server', { serverId }),
  sendServerCommand: (serverId: string, command: string) => invoke<boolean>('send_server_command', { serverId, command }),
  scanLANWorlds: () => invoke<LANWorldInfo[]>('scan_lan_worlds'),
  createFriendLobby: (playerName: string) => invoke<FriendLobby>('create_friend_lobby', { playerName }),
  joinFriendLobby: (code: string, playerName: string) => invoke<FriendLobby>('join_friend_lobby', { code, playerName }),
  leaveFriendLobby: () => invoke<boolean>('leave_friend_lobby'),
  getFriendLobbies: () => invoke<FriendLobby[]>('get_friend_lobbies'),
  getFriendLobbyStatus: () => invoke<FriendLobby | null>('get_friend_lobby_status'),
  getCommunityServers: () => invoke<CommunityServer[]>('get_community_servers'),
  getServerNotifications: () => invoke<ServerNotification[]>('get_server_notifications'),
  syncServerResourcePack: (serverId: string, url: string, hash?: string) =>
    invoke<boolean>('sync_server_resource_pack', { serverId, url, hash }),
  syncModsToServer: (instanceId: string, serverDir: string) =>
    invoke<number>('sync_mods_to_server', { instanceId, serverDir }),
  checkServerStatusForNotifications: (serverId: string, serverName: string, address: string, port: number) =>
    invoke<void>('check_server_status_for_notifications', { serverId, serverName, address, port }),
  getServerPortalEntries: () => invoke<ServerPortalEntry[]>('get_server_portal_entries'),
  addServerPortalEntry: (name: string, address: string, port: number, shortcutKey?: string) =>
    invoke<ServerPortalEntry>('add_server_portal_entry', { name, address, port, shortcutKey }),
  deleteServerPortalEntry: (entryId: string) => invoke<boolean>('delete_server_portal_entry', { entryId }),
  updateServerNotificationConfig: (serverId: string, config: ServerNotificationConfig) =>
    invoke<ServerNotificationConfig>('update_server_notification_config', { serverId, config }),
  markServerNotificationRead: (timestamp: number, serverId: string) =>
    invoke<boolean>('mark_server_notification_read', { timestamp, serverId }),
  markAllNotificationsRead: () => invoke<boolean>('mark_all_notifications_read'),

  setupTray: (defaultVersion?: string) => invoke<boolean>('setup_tray', { defaultVersion }),
  updateTrayMenu: (versions: string[], defaultVersion?: string) =>
    invoke<boolean>('update_tray_menu', { versions, defaultVersion }),

  getConfigCategories: () => invoke<ConfigCategory[]>('get_config_categories'),
  classifyConfigChange: (filePath: string) =>
    invoke<{ category: string; canHotReload: boolean; requiresRestart: boolean } | null>('classify_config_change', { filePath }),

  launchMultipleInstances: (instanceIds: string[], account: Account) =>
    invoke<{ instanceId: string; success: boolean; error?: string }[]>('launch_multiple_instances', { instanceIds, account }),

  getInstanceGroups: () => invoke<InstanceGroup[]>('get_instance_groups'),
  saveInstanceGroups: (config: InstanceGroup[]) => invoke<void>('save_instance_groups', { config }),
  createInstanceGroup: (name: string, parentId: string | null, icon?: string, color?: string) =>
    invoke<InstanceGroup>('create_instance_group', { name, parentId, icon, color }),
  updateInstanceGroup: (groupId: string, updates: Partial<InstanceGroup>) => invoke<InstanceGroup>('update_instance_group', { groupId, updates }),
  deleteInstanceGroup: (groupId: string) => invoke<boolean>('delete_instance_group', { groupId }),
  assignInstanceToGroup: (instanceId: string, groupId: string) => invoke<void>('assign_instance_to_group', { instanceId, groupId }),
  createInstanceTag: (name: string, color: string) => invoke<InstanceTag>('create_instance_tag', { name, color }),
  deleteInstanceTag: (tagId: string) => invoke<boolean>('delete_instance_tag', { tagId }),
  assignTagToInstance: (instanceId: string, tagId: string) => invoke<void>('assign_tag_to_instance', { instanceId, tagId }),
  removeTagFromInstance: (instanceId: string, tagId: string) => invoke<void>('remove_tag_from_instance', { instanceId, tagId }),
  searchInstancesByTags: (tagIds: string[], matchAll: boolean) => invoke<string[]>('search_instances_by_tags', { tagIds, matchAll }),
  batchAssignTag: (instanceIds: string[], tagId: string) => invoke<number>('batch_assign_tag', { instanceIds, tagId }),
  batchMoveToGroup: (instanceIds: string[], groupId: string) => invoke<number>('batch_move_to_group', { instanceIds, groupId }),

  getInstanceTemplates: () => invoke<InstanceTemplate[]>('get_instance_templates'),
  saveInstanceTemplates: (templates: InstanceTemplate[]) => invoke<void>('save_instance_templates', { templates }),
  createInstanceTemplate: (name: string, description: string, gameVersion: string, modLoader: string | undefined, modLoaderVersion: string | undefined, settings: Record<string, unknown>, mods: InstanceTemplate['mods'], shaders: InstanceTemplate['shaders'], sourceInstanceId?: string, tags?: string[]) =>
    invoke<InstanceTemplate>('create_instance_template', { name, description, gameVersion, modLoader, modLoaderVersion, settings, mods, shaders, sourceInstanceId, tags }),
  deleteInstanceTemplate: (templateId: string) => invoke<boolean>('delete_instance_template', { templateId }),
  cloneInstanceFromTemplate: (templateId: string, newInstanceName: string) =>
    invoke<VersionInstance | null>('clone_instance_from_template', { templateId, newInstanceName }),
  searchInstanceTemplates: (query: string, gameVersion?: string, modLoader?: string, tags?: string[]) =>
    invoke<InstanceTemplate[]>('search_instance_templates', { query, gameVersion, modLoader, tags }),

  getVersionCompatibility: (version: string) => invoke<VersionCompatibility>('get_version_compatibility', { version }),
  batchGetVersionCompatibilities: (versions: string[]) => invoke<VersionCompatibility[]>('batch_get_version_compatibilities', { versions }),
  getVersionDiff: (fromVersion: string, toVersion: string) => invoke<VersionDiff>('get_version_diff', { fromVersion, toVersion }),
  createInstanceSnapshot: (instanceId: string, name: string, description: string) =>
    invoke<InstanceSnapshot>('create_instance_snapshot', { instanceId, name, description }),
  listInstanceSnapshots: (instanceId: string) => invoke<InstanceSnapshot[]>('list_instance_snapshots', { instanceId }),
  deleteInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<boolean>('delete_instance_snapshot', { instanceId, snapshotId }),
  rollbackInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<InstanceSnapshot>('restore_instance_snapshot', { instanceId, snapshotId }),
  diffInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<InstanceSnapshotDiff>('diff_instance_snapshot', { instanceId, snapshotId }),
  exportInstancePkg: (instanceId: string, author: string) => invoke<Record<string, unknown>>('export_instance', { instanceDir: instanceId, name: instanceId, description: '', gameVersion: '', author, modLoader: null, modLoaderVersion: null, sourceInstanceId: null, tags: [] }),
  exportInstanceAsZip: (instanceDir: string, name: string, description: string, gameVersion: string | null, author: string, modLoader: string | null, modLoaderVersion: string | null, sourceInstanceId: string | null, tags: string[]) =>
    invoke<string>('export_instance_as_zip', { instanceDir, name, description, gameVersion, author, modLoader, modLoaderVersion, sourceInstanceId, tags }),
  importInstancePkg: (pkgJson: string, targetDir: string) => invoke<VersionInstance>('import_instance', { pkg: JSON.parse(pkgJson), targetDir }),
  importInstanceFromZip: (zipPath: string, targetDir: string) => invoke<VersionInstance>('import_instance_from_zip', { zipPath, targetDir }),
  analyzeInstanceStorage: (instanceId: string) => invoke<InstanceStorageAnalysis>('analyze_instance_storage', { instanceDir: instanceId, instanceId }),
  cleanInstanceStorage: (instanceId: string, categories: string[]) => invoke<InstanceStorageAnalysis>('clean_instance_storage', { instanceId, categories }),
  getInstanceDashboard: (instanceId: string) => invoke<InstanceDashboard>('get_instance_dashboard', { instanceDir: instanceId, instanceId }),
  recordPlayTime: (instanceId: string, durationMs: number) => invoke<void>('record_play_time', { instanceId, durationMs }),
  recordModChange: (instanceId: string, action: string, modName: string, fileName: string) => invoke<void>('record_mod_change', { instanceId, action, modName, fileName }),
  getVersionMigrationGuide: (currentVersion: string, targetVersion: string, currentModCount: number) =>
    invoke<VersionMigrationGuide>('get_version_migration_guide', { currentVersion, targetVersion, currentModCount }),
  runHealthCheck: () => invoke<HealthCheckResult>('run_health_check'),
  checkInstanceHealth: (gameDir: string) => invoke<HealthCheckResult>('check_instance_health', { gameDir }),
  autoFixHealthIssues: (gameDir: string, issueIds?: string[]) => invoke<HealthCheckResult>('auto_fix_health_issues', { gameDir, issueIds }),
  getLaunchDependencies: () => invoke<LaunchDependency[]>('get_launch_dependencies'),
  setLaunchDependency: (instanceId: string, dependsOnInstanceId: string, delayMs: number, required: boolean) =>
    invoke<LaunchDependency>('set_launch_dependency', { instanceId, dependsOnInstanceId, delayMs, required }),
  removeLaunchDependency: (dependencyId: string) => invoke<boolean>('remove_launch_dependency', { dependencyId }),
  getInstanceLaunchOrder: (instanceId: string) => invoke<LaunchDependency[]>('get_instance_launch_order', { instanceId }),
  launchDependentInstances: (instanceId: string, account: Account) =>
    invoke<{ instanceId: string; success: boolean; error?: string }[]>('launch_dependent_instances', { instanceId, account }),

  getVersionAnnotations: (version: string) => invoke<VersionAnnotation[]>('get_version_annotations', { version }),
  addVersionAnnotation: (version: string, userId: string, username: string, content: string, rating: number, tags: string[]) =>
    invoke<VersionAnnotation>('add_version_annotation', { version, userId, username, content, rating, tags }),
  likeVersionAnnotation: (annotationId: string) => invoke<VersionAnnotation>('like_version_annotation', { annotationId }),
  deleteVersionAnnotation: (annotationId: string, userId: string) => invoke<boolean>('delete_version_annotation', { annotationId, userId }),

  onLaunchLog: (callback: (data: { type: string; message: string }) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<{ type: string; message: string }>('launch-log', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen launch-log:', err))
    return () => {
      disposed = true
      unlisten?.()
    }
  },
  onLaunchClose: (callback: (code: number) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<number>('launch-close', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen launch-close:', err))
    return () => {
      disposed = true
      unlisten?.()
    }
  },
  onLaunchError: (callback: (message: string) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<string>('launch-error', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen launch-error:', err))
    return () => {
      disposed = true
      unlisten?.()
    }
  },
  onDownloadProgress: (callback: (data: { taskId: string; downloaded: number; total: number; speed: number }) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<{ taskId: string; downloaded: number; total: number; speed: number }>('download-progress', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen download-progress:', err))
    return () => {
      disposed = true
      unlisten?.()
    }
  },
  onJavaDownloadProgress: (callback: (data: { stage: string; message: string; progress: number; downloaded?: number; total?: number; path?: string }) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<{ stage: string; message: string; progress: number; downloaded?: number; total?: number; path?: string }>('java-download-progress', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen java-download-progress:', err))
    return () => {
      disposed = true
      unlisten?.()
    }
  },
}

export const windowAPI = {
  toggleFullscreen: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    const isFullscreen = await appWindow.isFullscreen()
    await appWindow.setFullscreen(!isFullscreen)
  },
  getDisplays: async () => {
    const { availableMonitors, currentMonitor } = await import('@tauri-apps/api/window')
    const monitors = await availableMonitors()
    const current = await currentMonitor()
    return monitors.map(m => ({
      id: String(m.name || ''),
      name: m.name || '',
      bounds: { x: m.position.x, y: m.position.y, width: m.size.width, height: m.size.height },
      isPrimary: current?.name === m.name,
      scaleFactor: m.scaleFactor,
    }))
  },
  moveToDisplay: async (_displayId: string) => {
  },
  saveWindowPlacement: async () => {
    const { getCurrentWindow } = await import('@tauri-apps/api/window')
    const appWindow = getCurrentWindow()
    const pos = await appWindow.outerPosition()
    const size = await appWindow.innerSize()
    localStorage.setItem('window_placement', JSON.stringify({ x: pos.x, y: pos.y, width: size.width, height: size.height }))
  },
  restoreWindowPlacement: async () => {
    const saved = localStorage.getItem('window_placement')
    if (saved) {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const appWindow = getCurrentWindow()
      const placement = JSON.parse(saved)
      await appWindow.setPosition(new (await import('@tauri-apps/api/dpi')).LogicalPosition(placement.x, placement.y))
    }
  },
  openSettingsWindow: (section?: string) => invoke<boolean>('window_open_settings', { section: section || null }),
  openModsBrowserWindow: (gameVersion?: string, modLoader?: string) => invoke<boolean>('window_open_mods_browser', { gameVersion: gameVersion || null, modLoader: modLoader || null }),
  openLaunchLogWindow: (sessionId: string) => invoke<boolean>('window_open_launch_log', { sessionId }),
  openMapPreviewWindow: (worldPath: string, worldName: string) => invoke<boolean>('window_open_map_preview', { worldPath, worldName }),
  openCrashReportWindow: (reportId: string) => invoke<boolean>('window_open_crash_report', { reportId }),
  closeWindow: (label: string) => invoke<boolean>('window_close', { label }),
  focusWindow: (label: string) => invoke<void>('window_focus', { label }),
  isWindowOpen: (label: string) => invoke<boolean>('window_is_open', { label }),
  listWindows: () => invoke<string[]>('window_list'),
  emitToWindow: (label: string, event: string, payload: Record<string, unknown>) => invoke<void>('window_emit_to', { label, event, payload }),
}

export function setupEventListeners() {
  return {
    onLaunchLog: (callback: (data: { type: string; message: string }) => void) =>
      listen<{ type: string; message: string }>('launch-log', (event) => callback(event.payload)),
    onLaunchClose: (callback: (code: number) => void) =>
      listen<number>('launch-close', (event) => callback(event.payload)),
    onLaunchError: (callback: (message: string) => void) =>
      listen<string>('launch-error', (event) => callback(event.payload)),
    onDownloadProgress: (callback: (data: { taskId: string; downloaded: number; total: number; speed: number }) => void) =>
      listen<{ taskId: string; downloaded: number; total: number; speed: number }>('download-progress', (event) => callback(event.payload)),
    onLaunchPhaseUpdate: (callback: (data: { sessionId: string; phaseId: string; timestamp: number }) => void) =>
      listen<{ sessionId: string; phaseId: string; timestamp: number }>('launch-phase-update', (event) => callback(event.payload)),
    onLaunchLogDiagnosed: (callback: (data: { sessionId: string; log: Record<string, unknown> }) => void) =>
      listen<{ sessionId: string; log: Record<string, unknown> }>('launch-log-diagnosed', (event) => callback(event.payload)),
    onLaunchRunning: (callback: (data: { sessionId: string; pid: number; timestamp: number }) => void) =>
      listen<{ sessionId: string; pid: number; timestamp: number }>('launch-running', (event) => callback(event.payload)),
    onLaunchExit: (callback: (data: { sessionId: string; exitCode: number; timestamp: number }) => void) =>
      listen<{ sessionId: string; exitCode: number; timestamp: number }>('launch-exit', (event) => callback(event.payload)),
    onLaunchCrashRecovery: (callback: (data: { sessionId: string; exitCode: number; recoveryOptions: Record<string, unknown>[]; timestamp: number }) => void) =>
      listen<{ sessionId: string; exitCode: number; recoveryOptions: Record<string, unknown>[]; timestamp: number }>('launch-crash-recovery', (event) => callback(event.payload)),
    onRepairProgress: (callback: (data: { file: string; downloaded: number; total: number }) => void) =>
      listen<{ file: string; downloaded: number; total: number }>('repair-progress', (event) => callback(event.payload)),
    onQuickLaunch: (callback: () => void) =>
      listen<void>('quick-launch', () => callback()),
    onQuickLaunchVersion: (callback: (version: string) => void) =>
      listen<string>('quick-launch-version', (event) => callback(event.payload)),
  }
}
