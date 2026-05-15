// Minecraft Launcher Types

export * from './launch'
export * from './instance'
export * from './modpack'
export * from './mod'
export * from './resource'
export * from './server'

export interface Account {
  id: string;
  type: 'microsoft' | 'offline' | 'littleskin';
  username: string;
  uuid: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  skinUrl?: string;
  avatarUrl?: string;
  littleskinServerUrl?: string;
  littleskinAccessToken?: string;
}

export interface GameVersion {
  id: string;
  type: 'release' | 'snapshot' | 'old_alpha' | 'old_beta';
  url: string;
  time: string;
  releaseTime: string;
}

export interface InstalledVersion {
  id: string;
  type: string;
  installedAt: string;
  path: string;
  modLoader?: ModLoaderType;
  modLoaderVersion?: string;
}

export type ModLoaderType = 'forge' | 'fabric' | 'quilt' | 'neoforge';

export interface ModLoader {
  type: ModLoaderType;
  version: string;
  gameVersion: string;
  installed: boolean;
}

export interface VersionInstance {
  id: string;
  name: string;
  gameVersion: string;
  modLoader?: ModLoaderType;
  modLoaderVersion?: string;
  createdAt: string;
  lastPlayedAt?: string;
  totalTime: number;
  iconUrl?: string;
  instanceDir: string;
  settings: InstanceSettings;
  shaderPacks: ShaderPack[];
}

export interface InstanceSettings {
  javaPath: string;
  maxMemory: number;
  minMemory: number;
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  jvmArgs: string[];
  gameDir: string;
  launchServer: string;
  closeAfterLaunch: boolean;
  useInstanceSettings: boolean;
}

export interface ShaderPack {
  id: string;
  name: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  isEnabled: boolean;
  priority: number;
  addedAt: string;
  description?: string;
  previewUrl?: string;
  source: 'local' | 'download';
}

export interface MicrosoftAuthResult {
  success: boolean;
  account?: Account;
  error?: string;
  userCode?: string;
  deviceCode?: string;
  verificationUrl?: string;
  expiresIn?: number;
  interval?: number;
}

export interface MicrosoftAuthStatus {
  status: 'idle' | 'getting_code' | 'waiting_for_user' | 'polling' | 'completing' | 'done' | 'error';
  userCode?: string;
  verificationUrl?: string;
  message?: string;
  account?: Account;
}

export interface SkinUploadResult {
  success: boolean;
  message?: string;
  skinUrl?: string;
}

export interface LittleskinProfile {
  id: number;
  name: string;
  email?: string;
  avatarUrl?: string;
  skinUrl?: string;
  skinModel?: 'classic' | 'slim';
}

export interface LaunchOptions {
  version: string;
  account: Account;
  javaPath?: string;
  maxMemory: number;
  minMemory: number;
  gameDir: string;
  width?: number;
  height?: number;
  fullscreen?: boolean;
  server?: string;
  jvmArgs?: string[];
  instanceId?: string;
}

export interface LauncherSettings {
  gameDir: string;
  javaPath: string;
  maxMemory: number;
  minMemory: number;
  windowWidth: number;
  windowHeight: number;
  fullscreen: boolean;
  launchServer: string;
  closeAfterLaunch: boolean;
  setupCompleted: boolean;
  downloadSource: 'auto' | 'bmclapi' | 'mojang' | 'modrinth';
  region: string;
  lastUpdateCheck: number;
  updateChannel: 'stable' | 'beta';
  theme: string;
  themePreset: string;
  customAccent: string;
  language: string;
  backgroundVariant: string;
  backgroundIntensity: string;
  soundEnabled: boolean;
  soundVolume: number;
  reduceMotion: boolean;
  highContrast: boolean;
  largeText: boolean;
  launchAnimationStyle: string;
  windowPosition: string;
  skipPreCheck: boolean;
  overlayEnabled: boolean;
  overlayOpacity: number;
  overlayPosition: string;
}

export interface HardwareInfo {
  cpu: string;
  cpuCores: number;
  gpu: string;
  gpuDriver: string;
  totalMemoryMB: number;
  freeMemoryMB: number;
  os: string;
  arch: string;
  osVersion: string;
  diskFreeGB: number;
  diskTotalGB: number;
  webviewVersion: string;
}

export interface JavaVersionInfo {
  majorVersion: number;
  path: string;
  version: string;
  source: 'system' | 'bundled' | 'user';
}

export type PreCheckCategory = 'java' | 'version' | 'memory' | 'disk' | 'gpu' | 'account' | 'mod' | 'config' | 'network'

export interface PreCheckResult {
  id: string
  name: string
  category: PreCheckCategory
  status: 'pass' | 'warning' | 'block'
  message: string
  detail?: string
  fixAction?: string
  fixLabel?: string
  fixData?: Record<string, any>
}

export interface MigrationSource {
  type: 'pcl2' | 'hmcl' | 'prism' | 'official';
  name: string;
  path: string;
  instances: MigratedInstance[];
  id?: string;
}

export interface MigratedInstance {
  name: string;
  gameVersion: string;
  modLoader?: string;
  modLoaderVersion?: string;
  savesCount: number;
  modsCount: number;
  sourcePath: string;
}

export interface DownloadSourceInfo {
  id: string;
  name: string;
  region: string;
  baseUrl: string;
  latency: number;
  available: boolean;
}

export interface NetworkStatus {
  online: boolean;
  source: string;
  lastChecked: number;
  latencyMs?: number;
  details?: Record<string, { available: boolean; latency: number }>;
  offlineCapabilities?: {
    launchInstalled: boolean;
    manageMods: boolean;
    viewWorlds: boolean;
    downloadVersions: boolean;
    onlineAuth: boolean;
    modSearch: boolean;
    serverList: boolean;
    updateCheck: boolean;
  };
}

export interface PerformanceProfile {
  tier: 'high' | 'medium' | 'low';
  label: string;
  totalMemoryMB: number;
  cpuCores: number;
  gpu: string;
  recommendations: {
    maxMemory: number;
    animations: boolean;
    particles: boolean;
    autoDetect: boolean;
  };
}

export interface RegionInfo {
  region: string;
  recommendedSource: string;
  latencies: {
    bmclapi: number | null;
    mojang: number | null;
  };
  isChinaMainland: boolean;
}

export interface VersionManifest {
  latest: {
    release: string;
    snapshot: string;
  };
  versions: GameVersion[];
}

export interface AuthState {
  isAuthenticated: boolean;
  account?: Account;
  error?: string;
}

export interface DownloadProgress {
  id: string;
  name: string;
  progress: number;
  total: number;
  speed: number;
  status: 'pending' | 'downloading' | 'completed' | 'error';
}

export const DEFAULT_INSTANCE_SETTINGS: InstanceSettings = {
  javaPath: '',
  maxMemory: 4096,
  minMemory: 512,
  windowWidth: 1280,
  windowHeight: 720,
  fullscreen: false,
  jvmArgs: [],
  gameDir: '',
  launchServer: '',
  closeAfterLaunch: false,
  useInstanceSettings: false,
};

export const DEFAULT_LAUNCHER_SETTINGS: LauncherSettings = {
  gameDir: '',
  javaPath: '',
  maxMemory: 4096,
  minMemory: 512,
  windowWidth: 1280,
  windowHeight: 720,
  fullscreen: false,
  launchServer: '',
  closeAfterLaunch: false,
  setupCompleted: false,
  downloadSource: 'auto',
  region: '',
  lastUpdateCheck: 0,
  updateChannel: 'stable',
  theme: 'system',
  themePreset: 'minecraft',
  customAccent: '',
  language: 'zh-CN',
  backgroundVariant: 'mesh',
  backgroundIntensity: 'subtle',
  soundEnabled: true,
  soundVolume: 0.5,
  reduceMotion: false,
  highContrast: false,
  largeText: false,
  launchAnimationStyle: 'default',
  windowPosition: 'center',
  skipPreCheck: false,
  overlayEnabled: true,
  overlayOpacity: 0.85,
  overlayPosition: 'top-right',
};

export const JAVA_VERSION_MAP: Record<string, number> = {
  '1.16.5': 8,
  '1.17': 16,
  '1.17.1': 16,
  '1.18': 17,
  '1.18.1': 17,
  '1.18.2': 17,
  '1.19': 17,
  '1.19.1': 17,
  '1.19.2': 17,
  '1.19.3': 17,
  '1.19.4': 17,
  '1.20': 17,
  '1.20.1': 17,
  '1.20.2': 17,
  '1.20.3': 17,
  '1.20.4': 17,
  '1.20.5': 21,
  '1.20.6': 21,
  '1.21': 21,
  '1.21.1': 21,
  '1.21.2': 21,
  '1.21.3': 21,
  '1.21.4': 21,
  '1.21.5': 21,
};

export function getRequiredJavaVersion(gameVersion: string): number {
  const minor = parseInt(gameVersion.split('.')[1] || '0')
  const patch = parseInt(gameVersion.split('.')[2] || '0')
  const key = `${gameVersion.split('.').slice(0, 3).join('.')}`
  if (JAVA_VERSION_MAP[key]) return JAVA_VERSION_MAP[key]
  if (minor >= 21) return 21
  if (minor >= 20 && patch >= 5) return 21
  if (minor >= 18) return 17
  if (minor >= 17) return 16
  return 8
}

export interface GameSession {
  versionId: string
  startTime: number
  endTime: number
  duration: number // minutes
}

export interface WindowAPI {
  toggleFullscreen?: () => Promise<void>
  getDisplays?: () => Promise<Array<{
    id: string
    name: string
    bounds: { x: number; y: number; width: number; height: number }
    isPrimary: boolean
    scaleFactor: number
  }>>
  moveToDisplay?: (displayId: string) => Promise<void>
  saveWindowPlacement?: () => Promise<void>
  restoreWindowPlacement?: () => Promise<void>
}
