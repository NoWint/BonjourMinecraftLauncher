import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type {
  Account, LaunchOptions, LauncherSettings, VersionManifest,
  InstalledVersion, VersionInstance, InstanceSettings, ShaderPack,
  MicrosoftAuthResult, HardwareInfo, JavaVersionInfo, PreCheckResult,
  MigrationSource, DownloadSourceInfo, NetworkStatus, PerformanceProfile, RegionInfo
} from '../types'
import type { LocalMod, ModDependency } from '../types/mod'
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

export const minecraftAPI = {
  getVersionManifest: () => invoke<VersionManifest>('get_version_manifest'),
  getInstalledVersions: () => invoke<InstalledVersion[]>('get_installed_versions'),
  installVersion: (versionId: string) => invoke<boolean>('install_version', { version_id: versionId }),
  scanGameDir: (gameDir: string) => invoke<InstalledVersion[]>('scan_game_dir', { game_dir: gameDir }),

  checkJava: () => invoke<{ available: boolean; path: string | null; version: string | null; majorVersion: number; isCompatible: boolean }>('check_java'),
  downloadJava: () => invoke<{ success: boolean; path?: string; message?: string }>('download_java'),

  getAccounts: () => invoke<Account[]>('get_accounts'),
  saveAccounts: (accounts: Account[]) => invoke<boolean>('save_accounts', { accounts }),
  addOfflineAccount: (username: string) => invoke<Account>('add_offline_account', { username }),
  deleteAccount: (accountId: string) => invoke<boolean>('delete_account', { account_id: accountId }),

  getSettings: () => invoke<LauncherSettings>('get_settings'),
  saveSettings: (settings: LauncherSettings) => invoke<boolean>('save_settings', { settings }),

  launchGame: (options: LaunchOptions) => invoke<boolean>('launch_game', { options }),
  launchInstance: (instanceId: string, account: Account) => invoke<boolean>('launch_instance', { instance_id: instanceId, account }),
  warmupLaunchCache: (gameDir: string, version: string) => invoke<boolean>('warmup_launch_cache', { game_dir: gameDir, version }),

  selectJavaPath: () => invoke<string | null>('select_java_path'),
  selectGameDir: () => invoke<{ path: string; versions: InstalledVersion[] } | null>('select_game_dir'),

  getSystemInfo: () => invoke<{ platform: string; arch: string; totalMemory: number; freeMemory: number; cpus: number }>('get_system_info'),
  openExternal: (url: string) => invoke<void>('open_external', { url }),

  scanLocalMods: (modsDir: string) => invoke<LocalMod[]>('scan_local_mods', { mods_dir: modsDir }),
  toggleMod: (modPath: string, enabled: boolean) => invoke<void>('toggle_mod', { mod_path: modPath, enabled }),
  deleteMod: (modPath: string) => invoke<void>('delete_mod', { mod_path: modPath }),
  installMod: (downloadUrl: string, targetPath: string, options?: { expectedHash?: string }) =>
    invoke<void>('install_mod', { download_url: downloadUrl, target_path: targetPath, options }),
  analyzeModJar: (filePath: string) => invoke<any>('analyze_mod_jar', { file_path: filePath }),
  computeModHash: (filePath: string) => invoke<string | null>('compute_mod_hash', { file_path: filePath }),

  getWorlds: (savesDir: string) => invoke<WorldInfo[]>('get_worlds', { saves_dir: savesDir }),
  getWorldInfo: (worldPath: string) => invoke<WorldInfo>('get_world_info', { world_path: worldPath }),
  backupWorld: (worldPath: string, backupDir: string, description?: string) =>
    invoke<WorldBackup>('backup_world', { world_path: worldPath, backup_dir: backupDir, description }),
  getBackups: (backupDir: string) => invoke<WorldBackup[]>('get_backups', { backup_dir: backupDir }),
  restoreBackup: (backupPath: string, targetPath: string) => invoke<void>('restore_backup', { backup_path: backupPath, target_path: targetPath }),
  deleteBackup: (backupPath: string) => invoke<void>('delete_backup', { backup_path: backupPath }),
  exportWorld: (options: WorldExportOptions) => invoke<void>('export_world', { options }),
  importWorld: (options: WorldImportOptions) => invoke<WorldInfo>('import_world', { options }),
  deleteWorld: (worldPath: string) => invoke<void>('delete_world', { world_path: worldPath }),
  renameWorld: (worldPath: string, newName: string) => invoke<void>('rename_world', { world_path: worldPath, new_name: newName }),
  copyWorld: (sourcePath: string, targetPath: string, newName?: string) =>
    invoke<WorldInfo>('copy_world', { source_path: sourcePath, target_path: targetPath, new_name: newName }),
  getWorldIcon: (worldPath: string) => invoke<string | null>('get_world_icon', { world_path: worldPath }),

  checkWorldHealth: (worldPath: string) => invoke<WorldHealthReport>('check_world_health', { world_path: worldPath }),
  fixWorldHealthIssue: (worldPath: string, itemId: string) => invoke<boolean>('fix_world_health_issue', { world_path: worldPath, item_id: itemId }),
  fixAllWorldHealthIssues: (worldPath: string) => invoke<WorldHealthReport>('fix_all_world_health_issues', { world_path: worldPath }),
  getWorldTimeline: (worldPath: string) => invoke<WorldTimeline>('get_world_timeline', { world_path: worldPath }),
  createTimelineEntry: (worldPath: string, label: string) => invoke<WorldTimelineEntry>('create_timeline_entry', { world_path: worldPath, label }),
  restoreTimelineEntry: (worldPath: string, entryId: string) => invoke<boolean>('restore_timeline_entry', { world_path: worldPath, entry_id: entryId }),
  getWorldMapOverview: (worldPath: string) => invoke<WorldMapOverview>('get_world_map_overview', { world_path: worldPath }),
  renderWorldMap: (worldPath: string, dimension: MapDimension, zoom?: number) =>
    invoke<WorldMapRender>('render_world_map', { world_path: worldPath, dimension, zoom }),
  getWorldStatistics: (worldPath: string) => invoke<WorldStatistics>('get_world_statistics', { world_path: worldPath }),
  convertWorldFormat: (options: WorldConversionOptions) => invoke<WorldConversionResult>('convert_world_format', { options }),
  getWorldMigrationPlan: (worldPath: string, targetVersion: string) =>
    invoke<WorldMigrationPlan>('get_world_migration_plan', { world_path: worldPath, target_version: targetVersion }),
  executeWorldMigration: (worldPath: string, plan: WorldMigrationPlan) =>
    invoke<WorldConversionResult>('execute_world_migration', { world_path: worldPath, plan }),
  previewSeed: (seed: string, gameVersion?: string) => invoke<SeedPreviewResult>('preview_seed', { seed, game_version: gameVersion }),
  getWorldSyncInfo: (worldPath: string) => invoke<WorldSyncInfo>('get_world_sync_info', { world_path: worldPath }),
  syncWorld: (worldPath: string) => invoke<WorldSyncResult>('sync_world', { world_path: worldPath }),
  resolveSyncConflict: (worldPath: string, filePath: string, useLocal: boolean) =>
    invoke<boolean>('resolve_sync_conflict', { world_path: worldPath, file_path: filePath, use_local: useLocal }),
  analyzeWorldSlim: (worldPath: string) => invoke<WorldSlimPlan>('analyze_world_slim', { world_path: worldPath }),
  executeWorldSlim: (worldPath: string, plan: WorldSlimPlan) => invoke<WorldSlimResult>('execute_world_slim', { world_path: worldPath, plan }),
  getWorldDiary: (worldPath: string) => invoke<WorldDiary>('get_world_diary', { world_path: worldPath }),
  generateDiaryEntry: (worldPath: string, date: string) => invoke<WorldDiaryEntry>('generate_diary_entry', { world_path: worldPath, date }),
  exportStructure: (options: StructureExportOptions) => invoke<StructureInfo>('export_structure', { options }),
  importStructure: (worldPath: string, structurePath: string, x: number, y: number, z: number) =>
    invoke<boolean>('import_structure', { world_path: worldPath, structure_path: structurePath, x, y, z }),
  shareBlueprint: (structurePath: string) => invoke<BlueprintShareResult>('share_blueprint', { structure_path: structurePath }),
  getWorldStructures: (worldPath: string) => invoke<StructureInfo[]>('get_world_structures', { world_path: worldPath }),

  downloadFile: (url: string, targetPath: string, options?: DownloadOptions) =>
    invoke<void>('download_file', { url, target_path: targetPath, options }),
  pauseDownload: (taskId: string) => invoke<void>('pause_download', { task_id: taskId }),
  resumeDownload: (taskId: string) => invoke<void>('resume_download', { task_id: taskId }),
  cancelDownload: (taskId: string) => invoke<void>('cancel_download', { task_id: taskId }),

  getInstances: () => invoke<VersionInstance[]>('get_instances'),
  createInstance: (data: { name: string; gameVersion: string; modLoader?: string; modLoaderVersion?: string }) =>
    invoke<VersionInstance>('create_instance', { data }),
  deleteInstance: (instanceId: string) => invoke<boolean>('delete_instance', { instance_id: instanceId }),
  updateInstance: (instanceId: string, updates: Partial<VersionInstance>) =>
    invoke<VersionInstance>('update_instance', { instance_id: instanceId, updates }),
  updateInstanceSettings: (instanceId: string, settings: InstanceSettings) =>
    invoke<VersionInstance>('update_instance_settings', { instance_id: instanceId, settings }),
  getInstance: (instanceId: string) => invoke<VersionInstance | null>('get_instance', { instance_id: instanceId }),
  getInstanceByVersion: (versionId: string) => invoke<VersionInstance | null>('get_instance_by_version', { version_id: versionId }),
  ensureInstancesForVersions: (versionIds: string[]) => invoke<boolean>('ensure_instances_for_versions', { version_ids: versionIds }),

  scanInstanceMods: (instanceId: string) => invoke<LocalMod[]>('scan_instance_mods', { instance_id: instanceId }),
  addModToInstance: (instanceId: string, sourcePath: string, fileName?: string) =>
    invoke<boolean>('add_mod_to_instance', { instance_id: instanceId, source_path: sourcePath, file_name: fileName }),
  toggleInstanceMod: (instanceId: string, modPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_instance_mod', { instance_id: instanceId, mod_path: modPath, enabled }),
  deleteInstanceMod: (instanceId: string, modPath: string) => invoke<boolean>('delete_instance_mod', { instance_id: instanceId, mod_path: modPath }),
  checkModCompatibility: (instanceId: string, modGameVersions: string[], modLoader: string) =>
    invoke<{ compatible: boolean; versionMatch: boolean; loaderMatch: boolean; reason: string }>('check_mod_compatibility', { instance_id: instanceId, mod_game_versions: modGameVersions, mod_loader: modLoader }),
  getModLoaderVersions: (gameVersion: string) => invoke<{
    forge: Array<{ version: string; mcversion?: string; type: string }>;
    fabric: Array<{ version: string; type: string }>;
    quilt: Array<{ version: string; type: string }>;
    neoforge: Array<{ version: string; type: string }>;
  }>('get_mod_loader_versions', { game_version: gameVersion }),
  installModLoader: (instanceId: string, loaderType: string, loaderVersion: string) =>
    invoke<VersionInstance>('install_mod_loader', { instance_id: instanceId, loader_type: loaderType, loader_version: loaderVersion }),

  searchModsGlobal: (query: string, gameVersion?: string, modLoader?: string, category?: string, sortBy?: string, limit?: number, offset?: number) =>
    invoke<any>('search_mods_global', { query, game_version: gameVersion, mod_loader: modLoader, category, sort_by: sortBy, limit, offset }),
  batchInstallMods: (tasks: any[]) =>
    invoke<any[]>('batch_install_mods', { tasks }),
  getModRecommendations: (modIds: string[]) =>
    invoke<any>('get_mod_recommendations', { mod_ids: modIds }),
  checkModConflicts: (mods: any[]) =>
    invoke<any[]>('check_mod_conflicts', { mods }),
  checkModUpdatesRust: (mods: any[], gameVersion: string, modLoader: string) =>
    invoke<any[]>('check_mod_updates_rust', { mods, game_version: gameVersion, mod_loader: modLoader }),
  aggregateModRatings: (modIds: string[]) =>
    invoke<any[]>('aggregate_mod_ratings', { mod_ids: modIds }),
  getModPerformanceRatings: (modIds: string[]) =>
    invoke<any[]>('get_mod_performance_ratings', { mod_ids: modIds }),
  estimateInstancePerformance: (mods: any[], totalMemoryMb: number) =>
    invoke<any>('estimate_instance_performance', { mods, total_memory_mb: totalMemoryMb }),
  checkConfigMigration: (modId: string, modName: string, oldVersion: string, newVersion: string, configPath: string) =>
    invoke<any>('check_config_migration', { mod_id: modId, mod_name: modName, old_version: oldVersion, new_version: newVersion, config_path: configPath }),
  generateModShareInfo: (modId: string, name: string, chineseName: string | undefined, version: string, description: string, iconUrl: string | undefined, source: string, downloadUrl: string | undefined, projectUrl: string | undefined) =>
    invoke<any>('generate_mod_share_info', { mod_id: modId, name, chinese_name: chineseName, version, description, icon_url: iconUrl, source, download_url: downloadUrl, project_url: projectUrl }),
  enhanceModMetadata: (filePath: string) =>
    invoke<any>('enhance_mod_metadata', { file_path: filePath }),
  detectModLoaderFromJar: (filePath: string) =>
    invoke<any>('detect_mod_loader_from_jar', { file_path: filePath }),
  getModChineseName: (modId: string) =>
    invoke<string | null>('get_mod_chinese_name', { mod_id: modId }),
  getModAssociations: (modId: string) =>
    invoke<any[]>('get_mod_associations', { mod_id: modId }),
  onBatchInstallProgress: (callback: (data: { taskId: string; status: string; progress: number; current: number; total: number }) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<any>('batch-install-progress', (event) => callback(event.payload))
      .then(fn => { if (!disposed) unlisten = fn })
      .catch(err => console.warn('Failed to listen batch-install-progress:', err))
    return () => { disposed = true; unlisten?.() }
  },

  scanInstanceShaders: (instanceId: string) => invoke<ShaderPack[]>('scan_instance_shaders', { instance_id: instanceId }),
  addShaderPack: (instanceId: string, sourcePath: string) => invoke<boolean>('add_shader_pack', { instance_id: instanceId, source_path: sourcePath }),
  toggleShaderPack: (instanceId: string, shaderPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_shader_pack', { instance_id: instanceId, shader_path: shaderPath, enabled }),
  deleteShaderPack: (instanceId: string, shaderPath: string) => invoke<boolean>('delete_shader_pack', { instance_id: instanceId, shader_path: shaderPath }),
  reorderShaderPacks: (instanceId: string, shaderIds: string[]) => invoke<VersionInstance>('reorder_shader_packs', { instance_id: instanceId, shader_ids: shaderIds }),

  scanInstanceResourcePacks: (instanceId: string) => invoke<ResourcePack[]>('scan_instance_resource_packs', { instance_id: instanceId }),
  addResourcePack: (instanceId: string, sourcePath: string) => invoke<boolean>('add_resource_pack', { instance_id: instanceId, source_path: sourcePath }),
  toggleResourcePack: (instanceId: string, resourcePackPath: string, enabled: boolean) =>
    invoke<boolean>('toggle_resource_pack', { instance_id: instanceId, resource_pack_path: resourcePackPath, enabled }),
  deleteResourcePack: (instanceId: string, resourcePackPath: string) =>
    invoke<boolean>('delete_resource_pack', { instance_id: instanceId, resource_pack_path: resourcePackPath }),
  reorderResourcePacks: (instanceId: string, resourcePackIds: string[]) =>
    invoke<VersionInstance>('reorder_resource_packs', { instance_id: instanceId, resource_pack_ids: resourcePackIds }),
  selectResourcePackFile: () => invoke<string | null>('select_resource_pack_file'),

  createTextureProject: (name: string, description: string, packFormat: number) =>
    invoke<any>('create_texture_project', { name, description, pack_format: packFormat }),
  saveTextureProject: (project: any) => invoke<boolean>('save_texture_project', { project }),
  exportTextureProject: (projectId: string) => invoke<string | null>('export_texture_project', { project_id: projectId }),
  getTextureProjects: () => invoke<any[]>('get_texture_projects'),

  getResourceSubscriptions: () => invoke<any[]>('get_resource_subscriptions'),
  addResourceSubscription: (sub: any) => invoke<any>('add_resource_subscription', { sub }),
  removeResourceSubscription: (subId: string) => invoke<boolean>('remove_resource_subscription', { sub_id: subId }),
  checkResourceSubscriptionUpdates: () => invoke<any[]>('check_resource_subscription_updates'),
  getResourceSubscriptionNotifications: () => invoke<any[]>('get_resource_subscription_notifications'),
  markResourceNotificationRead: (notifId: string) => invoke<boolean>('mark_resource_notification_read', { notif_id: notifId }),

  getResourceCollections: () => invoke<any[]>('get_resource_collections'),
  createResourceCollection: (collection: any) => invoke<any>('create_resource_collection', { collection }),
  updateResourceCollection: (collectionId: string, updates: any) => invoke<any>('update_resource_collection', { collection_id: collectionId, updates }),
  deleteResourceCollection: (collectionId: string) => invoke<boolean>('delete_resource_collection', { collection_id: collectionId }),
  installResourceCollection: (collectionId: string, instanceId: string) => invoke<any>('install_resource_collection', { collection_id: collectionId, instance_id: instanceId }),

  scanInstanceDatapacks: (instanceId: string, worldName?: string) => invoke<Datapack[]>('scan_instance_datapacks', { instance_id: instanceId, world_name: worldName }),
  toggleInstanceDatapack: (instanceId: string, datapackPath: string, enabled: boolean, worldName?: string) =>
    invoke<boolean>('toggle_instance_datapack', { instance_id: instanceId, datapack_path: datapackPath, enabled, world_name: worldName }),
  deleteInstanceDatapack: (instanceId: string, datapackPath: string, worldName?: string) =>
    invoke<boolean>('delete_instance_datapack', { instance_id: instanceId, datapack_path: datapackPath, world_name: worldName }),
  addInstanceDatapack: (instanceId: string, sourcePath: string, worldName?: string) =>
    invoke<boolean>('add_instance_datapack', { instance_id: instanceId, source_path: sourcePath, world_name: worldName }),
  selectDatapackFile: () => invoke<string | null>('select_datapack_file'),

  scanInstanceStructures: (instanceId: string) => invoke<StructureFile[]>('scan_instance_structures', { instance_id: instanceId }),
  importInstanceStructure: (instanceId: string, sourcePath: string) =>
    invoke<boolean>('import_instance_structure', { instance_id: instanceId, source_path: sourcePath }),
  exportInstanceStructure: (instanceId: string, structureId: string, targetPath: string) =>
    invoke<boolean>('export_instance_structure', { instance_id: instanceId, structure_id: structureId, target_path: targetPath }),
  deleteInstanceStructure: (instanceId: string, structurePath: string) =>
    invoke<boolean>('delete_instance_structure', { instance_id: instanceId, structure_path: structurePath }),
  getStructurePreview: (instanceId: string, structurePath: string) => invoke<any>('get_structure_preview', { instance_id: instanceId, structure_path: structurePath }),
  selectStructureFile: () => invoke<string | null>('select_structure_file'),

  buildGlobalResourceIndex: () => invoke<GlobalResourceIndex[]>('build_global_resource_index'),

  selectShaderFile: () => invoke<string | null>('select_shader_file'),
  selectModFile: () => invoke<string[] | null>('select_mod_file'),
  selectImageFile: () => invoke<string | null>('select_image_file'),
  selectSkinFile: () => invoke<string | null>('select_skin_file'),

  microsoftLoginStart: () => invoke<MicrosoftAuthResult>('microsoft_login_start'),
  microsoftLoginPoll: (deviceCode: string) => invoke<MicrosoftAuthResult>('microsoft_login_poll', { device_code: deviceCode }),
  microsoftLoginRefresh: (refreshToken: string) => invoke<{
    success: boolean; accessToken?: string; refreshToken?: string; expiresAt?: number; profile?: any; error?: string
  }>('microsoft_login_refresh', { refresh_token: refreshToken }),

  uploadSkin: (accessToken: string, skinPath: string, skinModel: 'classic' | 'slim') =>
    invoke<{ success: boolean; error?: string }>('upload_skin', { access_token: accessToken, skin_path: skinPath, skin_model: skinModel }),
  uploadAvatar: (accountId: string, imagePath: string) =>
    invoke<{ success: boolean; avatarUrl?: string; error?: string }>('upload_avatar', { account_id: accountId, image_path: imagePath }),

  littleskinLogin: (serverUrl: string, email: string, password: string) =>
    invoke<{ success: boolean; account?: Account; error?: string }>('littleskin_login', { server_url: serverUrl, email, password }),
  littleskinGetPlayers: (serverUrl: string, accessToken: string) =>
    invoke<{ success: boolean; players?: any[]; error?: string }>('littleskin_get_players', { server_url: serverUrl, access_token: accessToken }),
  littleskinUploadSkin: (serverUrl: string, accessToken: string, skinPath: string, playerName: string) =>
    invoke<{ success: boolean; error?: string }>('littleskin_upload_skin', { server_url: serverUrl, access_token: accessToken, skin_path: skinPath, player_name: playerName }),

  installModpack: (filePath: string, instanceName?: string) => invoke<any>('install_modpack', { file_path: filePath, instance_name: instanceName }),
  createModpack: (instanceId: string, packName: string, packVersion: string, packAuthor: string, packDescription: string, format: string) =>
    invoke<any>('create_modpack', { instance_id: instanceId, pack_name: packName, pack_version: packVersion, pack_author: packAuthor, pack_description: packDescription, format }),
  exportModpack: (instanceId: string, packName: string, packVersion: string, packAuthor: string, packDescription: string) =>
    invoke<string | null>('export_modpack', { instance_id: instanceId, pack_name: packName, pack_version: packVersion, pack_author: packAuthor, pack_description: packDescription }),
  getInstalledModpacks: () => invoke<any[]>('get_installed_modpacks'),
  deleteModpack: (modpackId: string) => invoke<boolean>('delete_modpack', { modpack_id: modpackId }),
  checkModpackUpdate: (instanceId: string) => invoke<any>('check_modpack_update', { instance_id: instanceId }),
  updateModpack: (modpackId: string) => invoke<any>('update_modpack', { modpack_id: modpackId }),
  diffModpackVersions: (currentMods: any[], newMods: any[]) => invoke<any>('diff_modpack_versions', { current_mods: currentMods, new_mods: newMods }),
  applyModpackUpdate: (options: any) => invoke<any>('apply_modpack_update', { options }),
  getModpackForks: () => invoke<any[]>('get_modpack_forks'),
  createModpackFork: (originalPackId: string, originalPackName: string, originalVersion: string, instanceId: string, forkName: string) =>
    invoke<any>('fork_modpack', { original_pack_id: originalPackId, original_pack_name: originalPackName, original_version: originalVersion, instance_id: instanceId, fork_name: forkName }),
  checkForkUpstreamUpdate: (forkId: string) => invoke<any>('check_fork_upstream_update', { fork_id: forkId }),
  mergeForkWithUpstream: (forkId: string, upstreamDiff: any, forkAddedMods: string[], forkRemovedMods: string[]) =>
    invoke<any>('merge_fork_with_upstream', { fork_id: forkId, upstream_diff: upstreamDiff, fork_added_mods: forkAddedMods, fork_removed_mods: forkRemovedMods }),
  runModpackTest: (gameVersion: string, modLoader: string, modList: any[]) =>
    invoke<any>('run_modpack_test', { game_version: gameVersion, mod_loader: modLoader, mod_list: modList }),
  testModpackCompatibility: (modpackId: string, gameVersion: string) =>
    invoke<any>('test_modpack_compatibility', { modpack_id: modpackId, game_version: gameVersion }),
  getModpackPerformance: (modpackId: string, modpackName: string, modCount: number) =>
    invoke<any>('get_modpack_performance', { modpack_id: modpackId, modpack_name: modpackName, mod_count: modCount }),
  createSyncRoom: (hostName: string, modpackName: string, modpackVersion: string, gameVersion: string, modLoader: string, modCount: number) =>
    invoke<any>('create_sync_room', { host_name: hostName, modpack_name: modpackName, modpack_version: modpackVersion, game_version: gameVersion, mod_loader: modLoader, mod_count: modCount }),
  joinSyncRoom: (roomCode: string, participantName: string) =>
    invoke<any>('join_sync_room', { room_code: roomCode, participant_name: participantName }),
  getSyncRooms: () => invoke<any[]>('get_sync_rooms'),
  getModpackRecommendations: (userPlayedModpacks: string[], limit: number) =>
    invoke<any[]>('get_modpack_recommendations', { user_played_modpacks: userPlayedModpacks, limit }),
  getModpackRating: (modpackId: string) => invoke<any>('get_modpack_rating', { modpack_id: modpackId }),

  getHardwareInfo: () => invoke<HardwareInfo>('get_hardware_info'),
  getAllJavaVersions: () => invoke<JavaVersionInfo[]>('get_all_java_versions'),
  getJavaForVersion: (gameVersion: string) => invoke<string | null>('get_java_for_version', { game_version: gameVersion }),
  downloadJavaVersion: (majorVersion: number) => invoke<{ success: boolean; path?: string; message?: string }>('download_java_version', { major_version: majorVersion }),
  downloadJavaWithProgress: (majorVersion: number) => invoke<{ success: boolean; path?: string; message?: string }>('download_java_with_progress', { major_version: majorVersion }),
  runPreCheck: (instanceId?: string, gameVersion?: string) => invoke<PreCheckResult[]>('run_pre_check', { instance_id: instanceId, game_version: gameVersion }),
  completeSetup: (settings: Partial<LauncherSettings>) => invoke<LauncherSettings>('complete_setup', { settings }),
  autoSetup: () => invoke<{ gameDir: string; javaPath: string; needsJavaDownload: boolean; settings: LauncherSettings }>('auto_setup'),
  isFirstLaunch: () => invoke<boolean>('is_first_launch'),

  overlayOpen: (opacity?: number, position?: string) => invoke<boolean>('overlay_open', { opacity, position }),
  overlayClose: () => invoke<boolean>('overlay_close'),
  overlayToggle: () => invoke<boolean>('overlay_toggle'),
  overlayGetData: () => invoke<any>('overlay_get_data'),
  overlaySetGamePid: (pid: number) => invoke<void>('overlay_set_game_pid', { pid }),
  overlayStartLogWatcher: (gameDir: string) => invoke<void>('overlay_start_log_watcher', { game_dir: gameDir }),
  overlayStopLogWatcher: () => invoke<void>('overlay_stop_log_watcher'),
  overlaySetCollapsed: (collapsed: boolean) => invoke<void>('overlay_set_collapsed', { collapsed }),

  findJavaInstallations: () => invoke<Array<{ majorVersion: number; path: string; version: string; source: string }>>('find_java_installations'),
  findGameDirectories: () => invoke<Array<{ path: string; label: string; isDefault: boolean }>>('find_game_directories'),

  detectLaunchers: () => invoke<MigrationSource[]>('detect_launchers'),
  migrateLauncherData: (source: MigrationSource, selectedInstances: number[]) =>
    invoke<{ name: string; success: boolean; error?: string }[]>('migrate_launcher_data', { source, selected_instances: selectedInstances }),

  detectDownloadSource: () => invoke<DownloadSourceInfo[]>('detect_download_source'),
  getOptimalDownloadUrl: (originalUrl: string) => invoke<string>('get_optimal_download_url', { original_url: originalUrl }),

  checkForUpdates: () => invoke<{
    hasUpdate: boolean; currentVersion: string; latestVersion: string;
    releaseNotes?: string; downloadUrl?: string; error?: string
  }>('check_for_updates'),
  checkNetworkStatus: () => invoke<NetworkStatus>('check_network_status'),
  detectRegion: () => invoke<RegionInfo>('detect_region'),
  getPerformanceTier: () => invoke<PerformanceProfile>('get_performance_tier'),

  launchEngineStart: (version: string, accountName: string, instanceId?: string) =>
    invoke<string>('launch_engine_start', { version, account_name: accountName, instance_id: instanceId }),
  launchEnginePhase: (sessionId: string, phaseId: string) => invoke<boolean>('launch_engine_phase', { session_id: sessionId, phase_id: phaseId }),
  launchEngineLog: (sessionId: string, type: string, message: string, phaseId: string) =>
    invoke<boolean>('launch_engine_log', { session_id: sessionId, type, message, phase_id: phaseId }),
  launchEngineComplete: (sessionId: string, pid: number) => invoke<boolean>('launch_engine_complete', { session_id: sessionId, pid }),
  launchEngineExit: (sessionId: string, exitCode: number) => invoke<boolean>('launch_engine_exit', { session_id: sessionId, exit_code: exitCode }),

  getJVMProfiles: () => invoke<any[]>('get_jvm_profiles'),
  recommendJVMProfile: (totalMemoryMB: number, javaMajorVersion: number, modCount: number) =>
    invoke<{ profileId: string; maxMemory: number; minMemory: number; warnings: string[] }>('recommend_jvm_profile', { total_memory_mb: totalMemoryMB, java_major_version: javaMajorVersion, mod_count: modCount }),

  createCrashReport: (version: string, exitCode: number, rawLog: string, instanceId?: string) =>
    invoke<any>('create_crash_report', { version, exit_code: exitCode, raw_log: rawLog, instance_id: instanceId }),
  getCrashReports: (limit?: number) => invoke<any[]>('get_crash_reports', { limit }),

  verifyLocalFile: (filePath: string, expectedHash?: string, expectedSize?: number) => invoke<any>('verify_local_file', { file_path: filePath, expected_hash: expectedHash, expected_size: expectedSize }),
  incrementalSync: (gameDir: string, versionJson: any, concurrency?: number) => invoke<any>('incremental_sync', { game_dir: gameDir, version_json: versionJson, concurrency }),
  repairVersionFiles: (versionId: string) => invoke<any>('repair_version_files', { version_id: versionId }),
  getLaunchBenchmarks: (version: string, limit?: number) => invoke<any[]>('get_launch_benchmarks', { version, limit }),
  getBenchmarkSummary: (version: string) => invoke<any>('get_benchmark_summary', { version }),
  saveBenchmark: (record: any) => invoke<any>('save_benchmark', { record }),
  getRunningGameProcesses: () => invoke<any[]>('get_running_game_processes'),
  killGameProcess: (pid: number) => invoke<boolean>('kill_game_process', { pid }),

  getServers: () => invoke<any[]>('get_servers'),
  addServer: (name: string, address: string) => invoke<any>('add_server', { name, address }),
  deleteServer: (serverId: string) => invoke<boolean>('delete_server', { server_id: serverId }),
  updateServer: (serverId: string, updates: any) => invoke<any>('update_server', { server_id: serverId, updates }),
  getServerGroups: () => invoke<any[]>('get_server_groups'),
  createServerGroup: (name: string, color?: string, icon?: string) => invoke<any>('create_server_group', { name, color, icon }),
  deleteServerGroup: (groupId: string) => invoke<boolean>('delete_server_group', { group_id: groupId }),
  pingServer: (address: string, port: number) => invoke<any>('ping_server', { address, port }),
  joinServer: (address: string, port: number) => invoke<boolean>('join_server', { address, port }),
  getLocalServers: () => invoke<any[]>('get_local_servers'),
  createLocalServer: (config: any) => invoke<any>('create_local_server', { config }),
  startLocalServer: (serverId: string) => invoke<boolean>('start_local_server', { server_id: serverId }),
  stopLocalServer: (serverId: string) => invoke<boolean>('stop_local_server', { server_id: serverId }),
  scanLANWorlds: () => invoke<any[]>('scan_lan_worlds'),
  createFriendLobby: (playerName: string) => invoke<any>('create_friend_lobby', { player_name: playerName }),
  joinFriendLobby: (code: string, playerName: string) => invoke<any>('join_friend_lobby', { code, player_name: playerName }),
  leaveFriendLobby: () => invoke<boolean>('leave_friend_lobby'),
  getFriendLobbies: () => invoke<any[]>('get_friend_lobbies'),
  getFriendLobbyStatus: () => invoke<any>('get_friend_lobby_status'),
  getCommunityServers: () => invoke<any[]>('get_community_servers'),
  getServerNotifications: () => invoke<any[]>('get_server_notifications'),
  syncServerResourcePack: (serverId: string, url: string, hash?: string) =>
    invoke<any>('sync_server_resource_pack', { server_id: serverId, url, hash }),
  syncModsToServer: (instanceId: string, serverDir: string) =>
    invoke<any>('sync_mods_to_server', { instance_id: instanceId, server_dir: serverDir }),
  checkServerStatusForNotifications: (serverId: string, serverName: string, address: string, port: number) =>
    invoke<void>('check_server_status_for_notifications', { server_id: serverId, server_name: serverName, address, port }),
  getServerPortalEntries: () => invoke<any[]>('get_server_portal_entries'),
  addServerPortalEntry: (name: string, address: string, port: number, shortcutKey?: string) =>
    invoke<any>('add_server_portal_entry', { name, address, port, shortcut_key: shortcutKey }),
  deleteServerPortalEntry: (entryId: string) => invoke<boolean>('delete_server_portal_entry', { entry_id: entryId }),
  updateServerNotificationConfig: (serverId: string, config: any) =>
    invoke<any>('update_server_notification_config', { server_id: serverId, config }),
  markServerNotificationRead: (timestamp: number, serverId: string) =>
    invoke<boolean>('mark_server_notification_read', { timestamp, server_id: serverId }),
  markAllNotificationsRead: () => invoke<boolean>('mark_all_notifications_read'),

  setupTray: (defaultVersion?: string) => invoke<boolean>('setup_tray', { default_version: defaultVersion }),
  updateTrayMenu: (versions: string[], defaultVersion?: string) =>
    invoke<boolean>('update_tray_menu', { versions, default_version: defaultVersion }),

  getConfigCategories: () => invoke<any[]>('get_config_categories'),
  classifyConfigChange: (filePath: string) =>
    invoke<{ category: string; canHotReload: boolean; requiresRestart: boolean } | null>('classify_config_change', { file_path: filePath }),

  launchMultipleInstances: (instanceIds: string[], account: Account) =>
    invoke<{ instanceId: string; success: boolean; error?: string }[]>('launch_multiple_instances', { instance_ids: instanceIds, account }),

  getInstanceGroups: () => invoke<any>('get_instance_groups'),
  saveInstanceGroups: (config: any) => invoke<void>('save_instance_groups', { config }),
  createInstanceGroup: (name: string, parentId: string | null, icon?: string, color?: string) =>
    invoke<any>('create_instance_group', { name, parent_id: parentId, icon, color }),
  updateInstanceGroup: (groupId: string, updates: any) => invoke<any>('update_instance_group', { group_id: groupId, updates }),
  deleteInstanceGroup: (groupId: string) => invoke<boolean>('delete_instance_group', { group_id: groupId }),
  assignInstanceToGroup: (instanceId: string, groupId: string) => invoke<void>('assign_instance_to_group', { instance_id: instanceId, group_id: groupId }),
  createInstanceTag: (name: string, color: string) => invoke<any>('create_instance_tag', { name, color }),
  deleteInstanceTag: (tagId: string) => invoke<boolean>('delete_instance_tag', { tag_id: tagId }),
  assignTagToInstance: (instanceId: string, tagId: string) => invoke<void>('assign_tag_to_instance', { instance_id: instanceId, tag_id: tagId }),
  removeTagFromInstance: (instanceId: string, tagId: string) => invoke<void>('remove_tag_from_instance', { instance_id: instanceId, tag_id: tagId }),
  searchInstancesByTags: (tagIds: string[], matchAll: boolean) => invoke<string[]>('search_instances_by_tags', { tag_ids: tagIds, match_all: matchAll }),
  batchAssignTag: (instanceIds: string[], tagId: string) => invoke<number>('batch_assign_tag', { instance_ids: instanceIds, tag_id: tagId }),
  batchMoveToGroup: (instanceIds: string[], groupId: string) => invoke<number>('batch_move_to_group', { instance_ids: instanceIds, group_id: groupId }),

  getInstanceTemplates: () => invoke<any[]>('get_instance_templates'),
  saveInstanceTemplates: (templates: any[]) => invoke<void>('save_instance_templates', { templates }),
  createInstanceTemplate: (name: string, description: string, gameVersion: string, modLoader: string | undefined, modLoaderVersion: string | undefined, settings: any, mods: any[], shaders: any[], sourceInstanceId?: string, tags?: string[]) =>
    invoke<any>('create_instance_template', { name, description, game_version: gameVersion, mod_loader: modLoader, mod_loader_version: modLoaderVersion, settings, mods, shaders, source_instance_id: sourceInstanceId, tags }),
  deleteInstanceTemplate: (templateId: string) => invoke<boolean>('delete_instance_template', { template_id: templateId }),
  cloneInstanceFromTemplate: (templateId: string, newInstanceName: string) =>
    invoke<VersionInstance | null>('clone_instance_from_template', { template_id: templateId, new_instance_name: newInstanceName }),
  searchInstanceTemplates: (query: string, gameVersion?: string, modLoader?: string, tags?: string[]) =>
    invoke<any[]>('search_instance_templates', { query, game_version: gameVersion, mod_loader: modLoader, tags }),

  getVersionCompatibility: (version: string) => invoke<any>('get_version_compatibility', { version }),
  batchGetVersionCompatibilities: (versions: string[]) => invoke<any[]>('batch_get_version_compatibilities', { versions }),
  getVersionDiff: (fromVersion: string, toVersion: string) => invoke<any>('get_version_diff', { from_version: fromVersion, to_version: toVersion }),
  createInstanceSnapshot: (instanceId: string, name: string, description: string) =>
    invoke<any>('create_instance_snapshot', { instance_id: instanceId, name, description }),
  listInstanceSnapshots: (instanceId: string) => invoke<any[]>('list_instance_snapshots', { instance_id: instanceId }),
  deleteInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<boolean>('delete_instance_snapshot', { instance_id: instanceId, snapshot_id: snapshotId }),
  rollbackInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<any>('restore_instance_snapshot', { instance_id: instanceId, snapshot_id: snapshotId }),
  diffInstanceSnapshot: (instanceId: string, snapshotId: string) => invoke<any>('diff_instance_snapshot', { instance_id: instanceId, snapshot_id: snapshotId }),
  exportInstancePkg: (instanceId: string, author: string) => invoke<any>('export_instance', { instance_dir: instanceId, name: instanceId, description: '', game_version: '', author, mod_loader: null, mod_loader_version: null, source_instance_id: null, tags: [] }),
  exportInstanceAsZip: (instanceDir: string, name: string, description: string, gameVersion: string | null, author: string, modLoader: string | null, modLoaderVersion: string | null, sourceInstanceId: string | null, tags: string[]) =>
    invoke<string>('export_instance_as_zip', { instance_dir: instanceDir, name, description, game_version: gameVersion, author, mod_loader: modLoader, mod_loader_version: modLoaderVersion, source_instance_id: sourceInstanceId, tags }),
  importInstancePkg: (pkgJson: string, targetDir: string) => invoke<any>('import_instance', { pkg: JSON.parse(pkgJson), target_dir: targetDir }),
  importInstanceFromZip: (zipPath: string, targetDir: string) => invoke<any>('import_instance_from_zip', { zip_path: zipPath, target_dir: targetDir }),
  analyzeInstanceStorage: (instanceId: string) => invoke<any>('analyze_instance_storage', { instance_dir: instanceId, instance_id: instanceId }),
  cleanInstanceStorage: (instanceId: string, categories: string[]) => invoke<any>('clean_instance_storage', { instance_id: instanceId, categories }),
  getInstanceDashboard: (instanceId: string) => invoke<any>('get_instance_dashboard', { instance_dir: instanceId, instance_id: instanceId }),
  recordPlayTime: (instanceId: string, durationMs: number) => invoke<void>('record_play_time', { instance_id: instanceId, duration_ms: durationMs }),
  recordModChange: (instanceId: string, action: string, modName: string, fileName: string) => invoke<void>('record_mod_change', { instance_id: instanceId, action, mod_name: modName, file_name: fileName }),
  getVersionMigrationGuide: (currentVersion: string, targetVersion: string, currentModCount: number) =>
    invoke<any>('get_version_migration_guide', { current_version: currentVersion, target_version: targetVersion, current_mod_count: currentModCount }),
  runHealthCheck: () => invoke<any>('run_health_check'),
  checkInstanceHealth: (gameDir: string) => invoke<any>('check_instance_health', { game_dir: gameDir }),
  autoFixHealthIssues: (gameDir: string, issueIds?: string[]) => invoke<any>('auto_fix_health_issues', { game_dir: gameDir, issue_ids: issueIds }),
  getLaunchDependencies: () => invoke<any[]>('get_launch_dependencies'),
  setLaunchDependency: (instanceId: string, dependsOnInstanceId: string, delayMs: number, required: boolean) =>
    invoke<any>('set_launch_dependency', { instance_id: instanceId, depends_on_instance_id: dependsOnInstanceId, delay_ms: delayMs, required }),
  removeLaunchDependency: (dependencyId: string) => invoke<boolean>('remove_launch_dependency', { dependency_id: dependencyId }),
  getInstanceLaunchOrder: (instanceId: string) => invoke<any[]>('get_instance_launch_order', { instance_id: instanceId }),
  launchDependentInstances: (instanceId: string, account: any) =>
    invoke<any[]>('launch_dependent_instances', { instance_id: instanceId, account }),

  getVersionAnnotations: (version: string) => invoke<any>('get_version_annotations', { version }),
  addVersionAnnotation: (version: string, userId: string, username: string, content: string, rating: number, tags: string[]) =>
    invoke<any>('add_version_annotation', { version, user_id: userId, username, content, rating, tags }),
  likeVersionAnnotation: (annotationId: string) => invoke<any>('like_version_annotation', { annotation_id: annotationId }),
  deleteVersionAnnotation: (annotationId: string, userId: string) => invoke<boolean>('delete_version_annotation', { annotation_id: annotationId, user_id: userId }),

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
    onLaunchLogDiagnosed: (callback: (data: { sessionId: string; log: any }) => void) =>
      listen<{ sessionId: string; log: any }>('launch-log-diagnosed', (event) => callback(event.payload)),
    onLaunchRunning: (callback: (data: { sessionId: string; pid: number; timestamp: number }) => void) =>
      listen<{ sessionId: string; pid: number; timestamp: number }>('launch-running', (event) => callback(event.payload)),
    onLaunchExit: (callback: (data: { sessionId: string; exitCode: number; timestamp: number }) => void) =>
      listen<{ sessionId: string; exitCode: number; timestamp: number }>('launch-exit', (event) => callback(event.payload)),
    onLaunchCrashRecovery: (callback: (data: { sessionId: string; exitCode: number; recoveryOptions: any[]; timestamp: number }) => void) =>
      listen<{ sessionId: string; exitCode: number; recoveryOptions: any[]; timestamp: number }>('launch-crash-recovery', (event) => callback(event.payload)),
    onRepairProgress: (callback: (data: { file: string; downloaded: number; total: number }) => void) =>
      listen<{ file: string; downloaded: number; total: number }>('repair-progress', (event) => callback(event.payload)),
    onQuickLaunch: (callback: () => void) =>
      listen<void>('quick-launch', () => callback()),
    onQuickLaunchVersion: (callback: (version: string) => void) =>
      listen<string>('quick-launch-version', (event) => callback(event.payload)),
  }
}
