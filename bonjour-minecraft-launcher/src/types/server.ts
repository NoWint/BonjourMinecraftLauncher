export interface ServerEntry {
  id: string
  name: string
  address: string
  port: number
  groupId?: string
  tags: string[]
  addedAt: number
  lastPlayedAt?: number
  playCount: number
  isFavorite: boolean
  iconUrl?: string
  notes?: string
}

export interface ServerStatus {
  online: boolean
  host: string
  port: number
  version: string
  protocol: number
  playersOnline: number
  playersMax: number
  playerList: string[]
  motd: string
  motdHtml?: string
  pingMs: number
  iconB64?: string
  modInfo?: ServerModInfo
  resourcePackUrl?: string
  resourcePackHash?: string
  lastChecked: number
}

export interface ServerModInfo {
  type: 'forge' | 'fabric' | 'quilt' | 'neoforge' | 'vanilla'
  modList?: string[]
}

export interface ServerGroup {
  id: string
  name: string
  color?: string
  icon?: string
  sortOrder: number
  collapsed: boolean
}

export interface LocalServerConfig {
  id: string
  name: string
  gameVersion: string
  serverType: 'vanilla' | 'paper' | 'spigot' | 'forge' | 'fabric' | 'neoforge'
  port: number
  maxPlayers: number
  difficulty: 'peaceful' | 'easy' | 'normal' | 'hard'
  gameMode: 'survival' | 'creative' | 'adventure' | 'spectator'
  seed?: string
  motd: string
  onlineMode: boolean
  pvpEnabled: boolean
  spawnAnimals: boolean
  spawnMonsters: boolean
  serverDir: string
  pid?: number
  status: 'stopped' | 'starting' | 'running' | 'stopping'
  startedAt?: number
  autoConnectClient: boolean
}

export interface LANWorld {
  host: string
  port: number
  worldName: string
  gameMode: string
  playerCount: number
  discoveredAt: number
  motd?: string
}

export interface FriendLobby {
  id: string
  code: string
  hostName: string
  hostAddress: string
  port: number
  participants: FriendLobbyParticipant[]
  status: 'waiting' | 'connecting' | 'connected' | 'disconnected'
  createdAt: number
  connectionType: 'p2p' | 'relay'
  relayLatencyMs?: number
}

export interface FriendLobbyParticipant {
  id: string
  name: string
  status: 'pending' | 'connected' | 'disconnected'
  address?: string
  joinedAt: number
}

export interface ServerPerformanceData {
  tps: number
  memoryUsedMB: number
  memoryTotalMB: number
  playerCount: number
  entityCount: number
  chunkCount: number
  cpuUsage: number
  timestamp: number
}

export interface ServerPerformanceHistory {
  serverId: string
  dataPoints: ServerPerformanceData[]
  averageTps: number
  averageMemoryUsage: number
  peakPlayerCount: number
  lastUpdated: number
}

export interface ServerResourcePackInfo {
  url: string
  hash?: string
  fileName: string
  fileSize: number
  downloaded: boolean
  localPath?: string
  lastSynced?: number
}

export interface ServerModSyncResult {
  serverId: string
  totalMods: number
  syncedMods: number
  skippedClientOnly: number
  skippedServerOnly: number
  errors: string[]
  timestamp: number
}

export interface ServerPortalEntry {
  id: string
  name: string
  address: string
  port: number
  shortcutKey?: string
  lastUsed?: number
}

export interface CommunityServer {
  id: string
  name: string
  address: string
  port: number
  description: string
  tags: string[]
  rating: number
  ratingCount: number
  playerCount: number
  maxPlayers: number
  version: string
  iconUrl?: string
  submittedAt: number
  submittedBy: string
  featured: boolean
  online: boolean
}

export interface ServerStatusNotification {
  serverId: string
  serverName: string
  type: 'online' | 'offline' | 'version_change' | 'player_peak' | 'maintenance'
  message: string
  timestamp: number
  read: boolean
}

export interface ServerNotificationConfig {
  serverId: string
  notifyOnline: boolean
  notifyOffline: boolean
  notifyVersionChange: boolean
  notifyPlayerPeak: boolean
  notifyMaintenance: boolean
  playerPeakThreshold: number
  checkIntervalMs: number
}

export const DEFAULT_SERVER_NOTIFICATION_CONFIG: ServerNotificationConfig = {
  serverId: '',
  notifyOnline: true,
  notifyOffline: true,
  notifyVersionChange: true,
  notifyPlayerPeak: false,
  notifyMaintenance: true,
  playerPeakThreshold: 50,
  checkIntervalMs: 60000,
}
