import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Server, Terminal, Wifi, WifiOff, Users, Globe, Activity, Bell,
  RefreshCw, Heart, Search, SortAsc, SortDesc, Signal, Plus, Info,
  Play, Trash2, Clock, Gamepad2, Star, X, Check,
  Sword, Compass, Zap, Wrench, Eye, Map, Wand2,
} from 'lucide-react'
import type {
  ServerEntry, ServerStatus, ServerGroup, LocalServerConfig,
  LANWorld, FriendLobby, CommunityServer, ServerStatusNotification,
  ServerPerformanceHistory,
} from '../types/server'

type ServerTab = 'my-servers' | 'local' | 'lan' | 'friends' | 'community' | 'monitor' | 'notifications'

interface AddServerForm {
  name: string
  address: string
  port: number
  tags: string[]
}

interface CreateServerForm {
  name: string
  gameVersion: string
  serverType: LocalServerConfig['serverType']
  port: number
  maxPlayers: number
  difficulty: LocalServerConfig['difficulty']
  gameMode: LocalServerConfig['gameMode']
  motd: string
  onlineMode: boolean
  pvpEnabled: boolean
  spawnAnimals: boolean
  spawnMonsters: boolean
  autoConnectClient: boolean
}

const SERVER_TABS: { key: ServerTab; label: string; icon: typeof Server; desc: string }[] = [
  { key: 'my-servers', label: '我的服务器', icon: Server, desc: '管理已保存的服务器' },
  { key: 'local', label: '本地开服', icon: Terminal, desc: '一键启动本地服务器' },
  { key: 'lan', label: '局域网', icon: Wifi, desc: '发现局域网世界' },
  { key: 'friends', label: '好友联机', icon: Users, desc: '创建或加入好友房间' },
  { key: 'community', label: '社区推荐', icon: Globe, desc: '探索社区热门服务器' },
  { key: 'monitor', label: '性能监控', icon: Activity, desc: '实时监控服务器性能' },
  { key: 'notifications', label: '通知中心', icon: Bell, desc: '服务器状态推送' },
]

const GRADIENTS = [
  'from-emerald-400/20 to-green-500/20', 'from-blue-400/20 to-cyan-500/20',
  'from-amber-400/20 to-yellow-500/20', 'from-purple-400/20 to-violet-500/20',
  'from-rose-400/20 to-pink-500/20', 'from-teal-400/20 to-emerald-500/20',
  'from-orange-400/20 to-red-500/20', 'from-indigo-400/20 to-blue-500/20',
]

function getServerGradient(name: string) {
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return GRADIENTS[Math.abs(hash) % GRADIENTS.length]
}

function getStatusColor(status: string) {
  switch (status) {
    case 'online': case 'running': case 'connected': return { bg: 'bg-green-400', text: 'text-green-400', glow: 'shadow-green-400/50' }
    case 'starting': case 'connecting': return { bg: 'bg-amber-400', text: 'text-amber-400', glow: 'shadow-amber-400/50' }
    case 'offline': case 'stopped': case 'disconnected': return { bg: 'bg-red-400', text: 'text-red-400', glow: 'shadow-red-400/50' }
    case 'stopping': return { bg: 'bg-orange-400', text: 'text-orange-400', glow: 'shadow-orange-400/50' }
    default: return { bg: 'bg-gray-400', text: 'text-gray-400', glow: 'shadow-gray-400/50' }
  }
}

function StatusDot({ status, pulse = true }: { status: string; pulse?: boolean }) {
  const colors = getStatusColor(status)
  const shouldPulse = pulse && ['online', 'running', 'connected'].includes(status)
  return (
    <span className="relative flex h-2.5 w-2.5">
      {shouldPulse && <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.bg} opacity-75`} />}
      <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors.bg} ${shouldPulse ? `shadow-lg ${colors.glow}` : ''}`} />
    </span>
  )
}

function PingBar({ ping }: { ping: number }) {
  let bars = 1
  let color = 'bg-red-400'
  if (ping <= 50) { bars = 4; color = 'bg-green-400' }
  else if (ping <= 100) { bars = 3; color = 'bg-green-400' }
  else if (ping <= 200) { bars = 2; color = 'bg-amber-400' }
  else if (ping <= 300) { bars = 1; color = 'bg-orange-400' }
  return (
    <div className="flex items-end gap-0.5 h-3">
      {[1, 2, 3, 4].map(i => (
        <div key={i} className={`w-1 rounded-sm transition-all duration-300 ${i <= bars ? color : 'bg-white/10'}`} style={{ height: `${i * 3}px` }} />
      ))}
    </div>
  )
}

function MiniLineChart({ data, color = '#4ade80' }: { data: number[]; color?: string }) {
  if (!data.length) return <div className="h-8 w-full bg-white/5 rounded" />
  const max = Math.max(...data, 1)
  const min = Math.min(...data, 0)
  const range = max - min || 1
  const points = data.map((v, i) => `${(i / (data.length - 1 || 1)) * 100},${100 - ((v - min) / range) * 100}`).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="h-8 w-full">
      <polyline points={points} fill="none" stroke={color} strokeWidth="2" vectorEffect="non-scaling-stroke" opacity="0.8" />
      <polygon points={`0,100 ${points} 100,100`} fill={color} opacity="0.1" />
    </svg>
  )
}

function getGameModeIcon(mode: string) {
  switch (mode) {
    case 'survival': return <Sword className="w-3.5 h-3.5" />
    case 'creative': return <Wand2 className="w-3.5 h-3.5" />
    case 'adventure': return <Map className="w-3.5 h-3.5" />
    case 'spectator': return <Eye className="w-3.5 h-3.5" />
    default: return <Gamepad2 className="w-3.5 h-3.5" />
  }
}

const DEFAULT_CREATE_FORM: CreateServerForm = {
  name: '', gameVersion: '1.21.4', serverType: 'vanilla',
  port: 25565, maxPlayers: 20, difficulty: 'normal',
  gameMode: 'survival', motd: 'A Minecraft Server',
  onlineMode: true, pvpEnabled: true,
  spawnAnimals: true, spawnMonsters: true, autoConnectClient: false,
}

export default function ServersPage() {
  const [activeTab, setActiveTab] = useState<ServerTab>('my-servers')
  const [servers, setServers] = useState<ServerEntry[]>([])
  const [serverStatuses, setServerStatuses] = useState<Record<string, ServerStatus>>({})
  const [groups, setGroups] = useState<ServerGroup[]>([])
  const [localServers, setLocalServers] = useState<LocalServerConfig[]>([])
  const [lanWorlds, setLanWorlds] = useState<LANWorld[]>([])
  const [friendLobbies, setFriendLobbies] = useState<FriendLobby[]>([])
  const [communityServers, setCommunityServers] = useState<CommunityServer[]>([])
  const [notifications, setNotifications] = useState<ServerStatusNotification[]>([])
  const [performanceHistory, setPerformanceHistory] = useState<Record<string, ServerPerformanceHistory>>({})

  const [searchQuery, setSearchQuery] = useState('')
  const [selectedServer, setSelectedServer] = useState<ServerEntry | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showCreateLocalModal, setShowCreateLocalModal] = useState(false)
  const [showServerDetail, setShowServerDetail] = useState(false)
  const [sortBy, setSortBy] = useState<'name' | 'ping' | 'players' | 'lastPlayed'>('lastPlayed')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterStatus, setFilterStatus] = useState<'all' | 'online' | 'offline' | 'favorite'>('all')
  const [refreshing, setRefreshing] = useState(false)

  const [addForm, setAddForm] = useState<AddServerForm>({ name: '', address: '', port: 25565, tags: [] })
  const [createForm, setCreateForm] = useState<CreateServerForm>({ ...DEFAULT_CREATE_FORM })
  const [createStep, setCreateStep] = useState(1)
  const [lobbyCode, setLobbyCode] = useState('')
  const [creatingLobby, setCreatingLobby] = useState(false)

  const refreshIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const loadServers = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.getServers()
      setServers(list)
      const grps = await window.minecraftAPI.getServerGroups()
      setGroups(grps)
    } catch (e) { console.error('Failed to load servers:', e) }
  }, [])

  const loadLocalServers = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.getLocalServers()
      setLocalServers(list)
    } catch (e) { console.error('Failed to load local servers:', e) }
  }, [])

  const loadLANWorlds = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.scanLANWorlds()
      setLanWorlds(list)
    } catch (e) { console.error('Failed to scan LAN:', e) }
  }, [])

  const loadFriendLobbies = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.getFriendLobbies()
      setFriendLobbies(list)
    } catch (e) { console.error('Failed to load lobbies:', e) }
  }, [])

  const loadCommunityServers = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.getCommunityServers()
      setCommunityServers(list)
    } catch (e) { console.error('Failed to load community servers:', e) }
  }, [])

  const loadNotifications = useCallback(async () => {
    try {
      const list = await window.minecraftAPI.getServerNotifications()
      setNotifications(list)
    } catch (e) { console.error('Failed to load notifications:', e) }
  }, [])

  const checkServerStatus = useCallback(async (server: ServerEntry) => {
    try {
      const status = await window.minecraftAPI.pingServer(server.address, server.port)
      setServerStatuses(prev => ({ ...prev, [server.id]: status }))
    } catch (e) {
      setServerStatuses(prev => ({
        ...prev,
        [server.id]: {
          online: false, host: server.address, port: server.port,
          version: '', protocol: 0, playersOnline: 0, playersMax: 0,
          playerList: [], motd: '无法连接', pingMs: -1, lastChecked: Date.now(),
        }
      }))
    }
  }, [])

  const refreshAllStatuses = useCallback(async () => {
    setRefreshing(true)
    await Promise.all(servers.map(s => checkServerStatus(s)))
    setRefreshing(false)
  }, [servers, checkServerStatus])

  useEffect(() => {
    loadServers()
    loadLocalServers()
    loadLANWorlds()
    loadFriendLobbies()
    loadCommunityServers()
    loadNotifications()
  }, [loadServers, loadLocalServers, loadLANWorlds, loadFriendLobbies, loadCommunityServers, loadNotifications])

  useEffect(() => {
    if (servers.length > 0) servers.forEach(s => checkServerStatus(s))
  }, [servers, checkServerStatus])

  useEffect(() => {
    refreshIntervalRef.current = setInterval(() => {
      if (servers.length > 0) servers.forEach(s => checkServerStatus(s))
      loadLocalServers()
      loadLANWorlds()
    }, 30000)
    return () => { if (refreshIntervalRef.current) clearInterval(refreshIntervalRef.current) }
  }, [servers, checkServerStatus, loadLocalServers, loadLANWorlds])

  const handleAddServer = async () => {
    if (!addForm.name || !addForm.address) return
    try {
      const fullAddress = addForm.port === 25565 ? addForm.address : `${addForm.address}:${addForm.port}`
      await window.minecraftAPI.addServer(addForm.name, fullAddress)
      setShowAddModal(false)
      setAddForm({ name: '', address: '', port: 25565, tags: [] })
      loadServers()
    } catch (e) { console.error('Failed to add server:', e) }
  }

  const handleDeleteServer = async (id: string) => {
    try {
      await window.minecraftAPI.deleteServer(id)
      loadServers()
    } catch (e) { console.error('Failed to remove server:', e) }
  }

  const handleToggleFavorite = async (id: string) => {
    try {
      const srv = servers.find(s => s.id === id)
      if (srv) await window.minecraftAPI.updateServer(id, { isFavorite: !srv.isFavorite })
      loadServers()
    } catch (e) { console.error('Failed to toggle favorite:', e) }
  }

  const handleCreateLocalServer = async () => {
    if (!createForm.name) return
    try {
      await window.minecraftAPI.createLocalServer(createForm)
      setShowCreateLocalModal(false)
      setCreateStep(1)
      setCreateForm({ ...DEFAULT_CREATE_FORM })
      loadLocalServers()
    } catch (e) { console.error('Failed to create local server:', e) }
  }

  const handleStartLocalServer = async (id: string) => {
    try {
      await window.minecraftAPI.startLocalServer(id)
      setTimeout(() => loadLocalServers(), 1000)
    } catch (e) { console.error('Failed to start server:', e) }
  }

  const handleStopLocalServer = async (id: string) => {
    try {
      await window.minecraftAPI.stopLocalServer(id)
      setTimeout(() => loadLocalServers(), 2000)
    } catch (e) { console.error('Failed to stop server:', e) }
  }

  const handleJoinLANWorld = async (world: LANWorld) => {
    try {
      await window.minecraftAPI.joinServer(world.host, world.port)
    } catch (e) { console.error('Failed to join LAN world:', e) }
  }

  const handleCreateFriendLobby = async () => {
    setCreatingLobby(true)
    try {
      const lobby = await window.minecraftAPI.createFriendLobby('Player')
      setFriendLobbies(prev => [...prev, lobby])
    } catch (e) { console.error('Failed to create lobby:', e) }
    finally { setCreatingLobby(false) }
  }

  const handleJoinFriendLobby = async () => {
    if (!lobbyCode) return
    try {
      const lobby = await window.minecraftAPI.joinFriendLobby(lobbyCode, 'Player')
      setFriendLobbies(prev => [...prev, lobby])
      setLobbyCode('')
    } catch (e) { console.error('Failed to join lobby:', e) }
  }

  const handleConnectToServer = async (server: ServerEntry) => {
    try {
      await window.minecraftAPI.joinServer(server.address, server.port)
    } catch (e) { console.error('Failed to connect:', e) }
  }

  const filteredServers = servers
    .filter(s => {
      if (filterStatus === 'online') return serverStatuses[s.id]?.online
      if (filterStatus === 'offline') return serverStatuses[s.id] && !serverStatuses[s.id].online
      if (filterStatus === 'favorite') return s.isFavorite
      return true
    })
    .filter(s =>
      searchQuery === '' ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase()))
    )
    .sort((a, b) => {
      let cmp = 0
      switch (sortBy) {
        case 'name': cmp = a.name.localeCompare(b.name); break
        case 'ping': cmp = (serverStatuses[a.id]?.pingMs ?? Infinity) - (serverStatuses[b.id]?.pingMs ?? Infinity); break
        case 'players': cmp = (serverStatuses[b.id]?.playersOnline ?? 0) - (serverStatuses[a.id]?.playersOnline ?? 0); break
        case 'lastPlayed': cmp = (b.lastPlayedAt ?? 0) - (a.lastPlayedAt ?? 0); break
      }
      return sortOrder === 'asc' ? cmp : -cmp
    })

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="h-full flex flex-col">
      <div className="flex items-center justify-between px-6 py-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-green-400/20 to-emerald-500/20 border border-green-400/20 flex items-center justify-center">
            <Server className="w-5 h-5 text-green-400" />
          </div>
          <div>
            <h1 className="text-lg font-semibold text-white">服务器中心</h1>
            <p className="text-xs text-white/40">管理、监控与联机</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={refreshAllStatuses} className={`p-2 rounded-lg hover:bg-white/5 transition-colors ${refreshing ? 'animate-spin' : ''}`} title="刷新状态">
            <RefreshCw className="w-4 h-4 text-white/60" />
          </button>
          <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors" title="通知设置">
            <Bell className="w-4 h-4 text-white/60" />
            {unreadCount > 0 && <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-400 rounded-full text-[9px] flex items-center justify-center text-white font-medium">{unreadCount}</span>}
          </button>
        </div>
      </div>

      <div className="px-6 py-3 border-b border-white/5">
        <div className="flex gap-1 overflow-x-auto scrollbar-hide">
          {SERVER_TABS.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.key
            return (
              <button key={tab.key} onClick={() => setActiveTab(tab.key)}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${isActive ? 'text-green-400 bg-green-400/10' : 'text-white/50 hover:text-white/80 hover:bg-white/5'}`}>
                <Icon className="w-4 h-4" />
                <span>{tab.label}</span>
                {tab.key === 'notifications' && unreadCount > 0 && (
                  <span className="w-4 h-4 bg-red-400/20 text-red-400 rounded-full text-[9px] flex items-center justify-center">{unreadCount}</span>
                )}
                {isActive && <motion.div layoutId="server-tab-indicator" className="absolute bottom-0 left-2 right-2 h-0.5 bg-green-400 rounded-full" transition={{ type: 'spring', stiffness: 500, damping: 30 }} />}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <AnimatePresence mode="wait">
          {activeTab === 'my-servers' && <MyServersTab key="my-servers" servers={filteredServers} serverStatuses={serverStatuses} searchQuery={searchQuery} setSearchQuery={setSearchQuery} filterStatus={filterStatus} setFilterStatus={setFilterStatus} sortBy={sortBy} setSortBy={setSortBy} sortOrder={sortOrder} setSortOrder={setSortOrder} onAddServer={() => setShowAddModal(true)} onDeleteServer={handleDeleteServer} onToggleFavorite={handleToggleFavorite} onConnect={handleConnectToServer} onSelectServer={s => { setSelectedServer(s); setShowServerDetail(true) }} />}
          {activeTab === 'local' && <LocalServerTab key="local" localServers={localServers} onCreate={() => setShowCreateLocalModal(true)} onStart={handleStartLocalServer} onStop={handleStopLocalServer} />}
          {activeTab === 'lan' && <LanWorldsTab key="lan" lanWorlds={lanWorlds} onRefresh={loadLANWorlds} onJoin={handleJoinLANWorld} />}
          {activeTab === 'friends' && <FriendLobbyTab key="friends" lobbies={friendLobbies} onCreate={handleCreateFriendLobby} onJoin={handleJoinFriendLobby} lobbyCode={lobbyCode} setLobbyCode={setLobbyCode} creatingLobby={creatingLobby} />}
          {activeTab === 'community' && <CommunityTab key="community" servers={communityServers} onRefresh={loadCommunityServers} />}
          {activeTab === 'monitor' && <MonitorTab key="monitor" localServers={localServers} performanceHistory={performanceHistory} />}
          {activeTab === 'notifications' && <NotificationsTab key="notifications" notifications={notifications} onRefresh={loadNotifications} />}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {showAddModal && <AddServerModal onClose={() => setShowAddModal(false)} onAdd={handleAddServer} form={addForm} setForm={setAddForm} />}
        {showCreateLocalModal && <CreateLocalServerModal onClose={() => { setShowCreateLocalModal(false); setCreateStep(1) }} onCreate={handleCreateLocalServer} step={createStep} setStep={setCreateStep} form={createForm} setForm={setCreateForm} />}
        {showServerDetail && selectedServer && <ServerDetailModal server={selectedServer} status={serverStatuses[selectedServer.id]} onClose={() => { setShowServerDetail(false); setSelectedServer(null) }} onConnect={() => handleConnectToServer(selectedServer)} onToggleFavorite={() => handleToggleFavorite(selectedServer.id)} onDelete={() => { handleDeleteServer(selectedServer.id); setShowServerDetail(false) }} />}
      </AnimatePresence>
    </motion.div>
  )
}

function MyServersTab({ servers, serverStatuses, searchQuery, setSearchQuery, filterStatus, setFilterStatus, sortBy, setSortBy, sortOrder, setSortOrder, onAddServer, onDeleteServer, onToggleFavorite, onConnect, onSelectServer }: {
  servers: ServerEntry[]
  serverStatuses: Record<string, ServerStatus>
  searchQuery: string
  setSearchQuery: (s: string) => void
  filterStatus: string
  setFilterStatus: (s: any) => void
  sortBy: string
  setSortBy: (s: any) => void
  sortOrder: 'asc' | 'desc'
  setSortOrder: (s: 'asc' | 'desc') => void
  onAddServer: () => void
  onDeleteServer: (id: string) => void
  onToggleFavorite: (id: string) => void
  onConnect: (s: ServerEntry) => void
  onSelectServer: (s: ServerEntry) => void
}) {
  const onlineCount = servers.filter(s => serverStatuses[s.id]?.online).length
  const totalPlayers = servers.reduce((sum, s) => sum + (serverStatuses[s.id]?.playersOnline || 0), 0)

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="grid grid-cols-4 gap-3">
        {[
          { icon: Server, label: '总服务器', value: servers.length, color: 'text-blue-400' },
          { icon: Wifi, label: '在线', value: onlineCount, color: 'text-green-400' },
          { icon: Users, label: '总玩家', value: totalPlayers, color: 'text-amber-400' },
          { icon: Heart, label: '收藏', value: servers.filter(s => s.isFavorite).length, color: 'text-rose-400' },
        ].map(stat => (
          <div key={stat.label} className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1">
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
              <span className="text-xs text-white/50">{stat.label}</span>
            </div>
            <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} placeholder="搜索服务器名称、地址或标签..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" />
        </div>
        <div className="flex items-center gap-1 bg-white/5 rounded-lg p-1 border border-white/10">
          {[{ key: 'all', label: '全部' }, { key: 'online', label: '在线' }, { key: 'offline', label: '离线' }, { key: 'favorite', label: '收藏' }].map(f => (
            <button key={f.key} onClick={() => setFilterStatus(f.key)} className={`px-3 py-1.5 rounded-md text-xs font-medium transition-colors ${filterStatus === f.key ? 'bg-green-400/20 text-green-400' : 'text-white/50 hover:text-white/80'}`}>{f.label}</button>
          ))}
        </div>
        <div className="flex items-center gap-1">
          <button onClick={() => setSortBy('name')} className={`p-2 rounded-lg border border-white/10 ${sortBy === 'name' ? 'bg-white/10 text-white' : 'text-white/40'}`} title="按名称"><SortAsc className="w-3.5 h-3.5" /></button>
          <button onClick={() => setSortBy('ping')} className={`p-2 rounded-lg border border-white/10 ${sortBy === 'ping' ? 'bg-white/10 text-white' : 'text-white/40'}`} title="按延迟"><Signal className="w-3.5 h-3.5" /></button>
          <button onClick={() => setSortBy('players')} className={`p-2 rounded-lg border border-white/10 ${sortBy === 'players' ? 'bg-white/10 text-white' : 'text-white/40'}`} title="按玩家数"><Users className="w-3.5 h-3.5" /></button>
          <button onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')} className="p-2 rounded-lg border border-white/10 text-white/40 hover:text-white/80" title={sortOrder === 'asc' ? '升序' : '降序'}>
            {sortOrder === 'asc' ? <SortAsc className="w-3.5 h-3.5" /> : <SortDesc className="w-3.5 h-3.5" />}
          </button>
        </div>
        <button onClick={onAddServer} className="flex items-center gap-2 px-4 py-2 bg-green-400/20 text-green-400 rounded-lg text-sm font-medium hover:bg-green-400/30 transition-colors border border-green-400/20">
          <Plus className="w-4 h-4" />添加服务器
        </button>
      </div>

      {servers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Server className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">还没有添加服务器</p>
          <button onClick={onAddServer} className="mt-4 px-4 py-2 bg-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors">添加第一个服务器</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {servers.map((server, index) => {
            const status = serverStatuses[server.id]
            const isOnline = status?.online
            return (
              <motion.div key={server.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className="group relative bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
                <div className={`absolute inset-0 bg-gradient-to-br ${getServerGradient(server.name)} opacity-0 group-hover:opacity-100 transition-opacity`} />
                <div className="relative p-4">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      {status?.iconB64 ? <img src={status.iconB64} alt="" className="w-10 h-10 rounded-lg" /> : (
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getServerGradient(server.name)} flex items-center justify-center`}>
                          <Server className="w-5 h-5 text-white/60" />
                        </div>
                      )}
                      <div>
                        <h3 className="text-sm font-semibold text-white group-hover:text-green-400 transition-colors">{server.name}</h3>
                        <p className="text-xs text-white/40">{server.address}:{server.port}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusDot status={isOnline ? 'online' : 'offline'} />
                      <button onClick={() => onToggleFavorite(server.id)} className={`p-1.5 rounded-lg transition-colors ${server.isFavorite ? 'text-rose-400' : 'text-white/20 hover:text-white/60'}`}>
                        <Heart className={`w-4 h-4 ${server.isFavorite ? 'fill-current' : ''}`} />
                      </button>
                    </div>
                  </div>
                  {isOnline && status ? (
                    <div className="space-y-2">
                      <p className="text-xs text-white/60 line-clamp-1">{status.motd}</p>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex items-center gap-1 text-xs text-white/50"><Users className="w-3 h-3" />{status.playersOnline}/{status.playersMax}</span>
                          <span className="flex items-center gap-1 text-xs text-white/50"><Clock className="w-3 h-3" />{status.pingMs}ms</span>
                          <PingBar ping={status.pingMs} />
                        </div>
                        <span className="text-[10px] text-white/30">{status.version}</span>
                      </div>
                      {status.playerList.length > 0 && (
                        <div className="flex items-center gap-1">
                          {status.playerList.slice(0, 8).map((player, i) => (
                            <div key={i} className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400/30 to-blue-400/30 flex items-center justify-center text-[8px] text-white/80 border border-white/10" title={player}>{player[0]?.toUpperCase()}</div>
                          ))}
                          {status.playerList.length > 8 && <span className="text-[10px] text-white/30">+{status.playerList.length - 8}</span>}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-xs text-white/30"><WifiOff className="w-3.5 h-3.5" /><span>离线或无法连接</span></div>
                  )}
                  <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                    <button onClick={() => onSelectServer(server)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 hover:text-white transition-colors"><Info className="w-3.5 h-3.5" />详情</button>
                    <button onClick={() => onConnect(server)} className="flex-1 flex items-center justify-center gap-1.5 py-1.5 bg-green-400/20 rounded-lg text-xs text-green-400 hover:bg-green-400/30 transition-colors"><Play className="w-3.5 h-3.5" />连接</button>
                    <button onClick={() => onDeleteServer(server.id)} className="p-1.5 rounded-lg text-white/20 hover:text-red-400 hover:bg-red-400/10 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function LocalServerTab({ localServers, onCreate, onStart, onStop }: {
  localServers: LocalServerConfig[]
  onCreate: () => void
  onStart: (id: string) => void
  onStop: (id: string) => void
}) {
  const runningCount = localServers.filter(s => s.status === 'running').length

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1"><Terminal className="w-4 h-4 text-green-400" /><span className="text-xs text-white/50">运行中</span></div>
            <p className="text-2xl font-bold text-white">{runningCount}</p>
          </div>
          <div className="bg-white/5 rounded-xl p-3 border border-white/5">
            <div className="flex items-center gap-2 mb-1"><Server className="w-4 h-4 text-blue-400" /><span className="text-xs text-white/50">总服务器</span></div>
            <p className="text-2xl font-bold text-white">{localServers.length}</p>
          </div>
        </div>
        <button onClick={onCreate} className="flex items-center gap-2 px-4 py-2.5 bg-green-400/20 text-green-400 rounded-xl text-sm font-medium hover:bg-green-400/30 transition-colors border border-green-400/20">
          <Plus className="w-4 h-4" />创建服务器
        </button>
      </div>

      {localServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Terminal className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">还没有本地服务器</p>
          <p className="text-xs mt-1">创建你的第一个 Minecraft 服务器</p>
          <button onClick={onCreate} className="mt-4 px-4 py-2 bg-white/5 rounded-lg text-sm hover:bg-white/10 transition-colors">立即创建</button>
        </div>
      ) : (
        <div className="space-y-3">
          {localServers.map((server, index) => (
            <motion.div key={server.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${server.status === 'running' ? 'bg-green-400/20 text-green-400' : server.status === 'starting' ? 'bg-amber-400/20 text-amber-400' : 'bg-white/10 text-white/40'}`}>
                    <Server className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{server.name}</h3>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/40">{server.gameVersion}</span>
                      <span className="text-xs text-white/30">·</span>
                      <span className="text-xs text-white/40">{server.serverType}</span>
                      <span className="text-xs text-white/30">·</span>
                      <span className="text-xs text-white/40">端口 {server.port}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <StatusDot status={server.status === 'running' ? 'running' : server.status === 'starting' ? 'starting' : 'stopped'} />
                  {server.status === 'running' ? (
                    <button onClick={() => onStop(server.id)} className="px-3 py-1.5 bg-red-400/20 text-red-400 rounded-lg text-xs hover:bg-red-400/30 transition-colors">停止</button>
                  ) : (
                    <button onClick={() => onStart(server.id)} className="px-3 py-1.5 bg-green-400/20 text-green-400 rounded-lg text-xs hover:bg-green-400/30 transition-colors">启动</button>
                  )}
                </div>
              </div>
              {server.status === 'running' && (
                <div className="mt-3 pt-3 border-t border-white/5 flex items-center gap-4 text-xs text-white/40">
                  <span className="flex items-center gap-1"><Users className="w-3 h-3" />{server.maxPlayers} 最大玩家</span>
                  <span className="flex items-center gap-1"><Sword className="w-3 h-3" />{server.pvpEnabled ? 'PVP开启' : 'PVP关闭'}</span>
                  <span className="flex items-center gap-1"><Compass className="w-3 h-3" />{server.difficulty}</span>
                  <span className="flex items-center gap-1">{getGameModeIcon(server.gameMode)}{server.gameMode}</span>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function LanWorldsTab({ lanWorlds, onRefresh, onJoin }: { lanWorlds: LANWorld[]; onRefresh: () => void; onJoin: (w: LANWorld) => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-white">局域网世界</h2>
          <p className="text-xs text-white/40 mt-0.5">自动发现同一网络下的 Minecraft 世界</p>
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors"><RefreshCw className="w-3.5 h-3.5" />刷新</button>
      </div>
      {lanWorlds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Wifi className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">未发现局域网世界</p>
          <p className="text-xs mt-1">确保你的 Minecraft 世界已开启局域网</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {lanWorlds.map((world, index) => (
            <motion.div key={`${world.host}:${world.port}`} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl border border-white/5 hover:border-green-400/30 transition-all p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-green-400/20 to-emerald-500/20 flex items-center justify-center"><Wifi className="w-5 h-5 text-green-400" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{world.worldName}</h3>
                    <p className="text-xs text-white/40">{world.host}:{world.port}</p>
                  </div>
                </div>
                <StatusDot status="online" />
              </div>
              <div className="flex items-center gap-3 text-xs text-white/40 mb-3">
                <span className="flex items-center gap-1"><Users className="w-3 h-3" />{world.playerCount} 玩家</span>
                <span className="flex items-center gap-1"><Gamepad2 className="w-3 h-3" />{world.gameMode}</span>
              </div>
              <button onClick={() => onJoin(world)} className="w-full flex items-center justify-center gap-2 py-2 bg-green-400/20 text-green-400 rounded-lg text-xs hover:bg-green-400/30 transition-colors"><Play className="w-3.5 h-3.5" />加入世界</button>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function FriendLobbyTab({ lobbies, onCreate, onJoin, lobbyCode, setLobbyCode, creatingLobby }: {
  lobbies: FriendLobby[]
  onCreate: () => void
  onJoin: () => void
  lobbyCode: string
  setLobbyCode: (s: string) => void
  creatingLobby: boolean
}) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white/5 rounded-xl border border-white/5 p-4">
          <h3 className="text-sm font-semibold text-white mb-1">创建房间</h3>
          <p className="text-xs text-white/40 mb-3">创建一个好友联机房间</p>
          <button onClick={onCreate} disabled={creatingLobby} className="w-full flex items-center justify-center gap-2 py-2 bg-green-400/20 text-green-400 rounded-lg text-xs hover:bg-green-400/30 transition-colors disabled:opacity-50">
            {creatingLobby ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}{creatingLobby ? '创建中...' : '创建房间'}
          </button>
        </div>
        <div className="bg-white/5 rounded-xl border border-white/5 p-4">
          <h3 className="text-sm font-semibold text-white mb-1">加入房间</h3>
          <p className="text-xs text-white/40 mb-3">输入房间代码加入好友</p>
          <div className="flex gap-2">
            <input type="text" value={lobbyCode} onChange={e => setLobbyCode(e.target.value.toUpperCase())} placeholder="输入代码" className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-xs text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" />
            <button onClick={onJoin} disabled={!lobbyCode} className="px-4 py-2 bg-blue-400/20 text-blue-400 rounded-lg text-xs hover:bg-blue-400/30 transition-colors disabled:opacity-50">加入</button>
          </div>
        </div>
      </div>
      {lobbies.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-white/30">
          <Users className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">没有活跃的房间</p>
          <p className="text-xs mt-1">创建或加入一个房间开始联机</p>
        </div>
      ) : (
        <div className="space-y-3">
          {lobbies.map((lobby, index) => (
            <motion.div key={lobby.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              className="bg-white/5 rounded-xl border border-white/5 p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-400/20 to-purple-500/20 flex items-center justify-center"><Users className="w-5 h-5 text-blue-400" /></div>
                  <div>
                    <h3 className="text-sm font-semibold text-white">{lobby.hostName} 的房间</h3>
                    <p className="text-xs text-white/40">代码: {lobby.code}</p>
                  </div>
                </div>
                <StatusDot status={lobby.status === 'connected' ? 'connected' : lobby.status === 'connecting' ? 'connecting' : 'waiting'} />
              </div>
              <div className="flex items-center gap-2 mb-3">
                {lobby.participants.map(p => (
                  <div key={p.id} className={`px-2 py-1 rounded-lg text-xs border ${p.status === 'connected' ? 'bg-green-400/10 text-green-400 border-green-400/20' : p.status === 'pending' ? 'bg-amber-400/10 text-amber-400 border-amber-400/20' : 'bg-white/5 text-white/40 border-white/10'}`}>{p.name}</div>
                ))}
              </div>
              <div className="flex items-center gap-3 text-xs text-white/30">
                <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(lobby.createdAt).toLocaleTimeString()}</span>
                <span className="flex items-center gap-1"><Wifi className="w-3 h-3" />{lobby.connectionType === 'p2p' ? 'P2P直连' : '中继'}</span>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function CommunityTab({ servers, onRefresh }: { servers: CommunityServer[]; onRefresh: () => void }) {
  const [search, setSearch] = useState('')
  const filtered = servers.filter(s => search === '' || s.name.toLowerCase().includes(search.toLowerCase()) || s.tags.some(t => t.toLowerCase().includes(search.toLowerCase())))

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="搜索社区服务器..." className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" />
        </div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors ml-3"><RefreshCw className="w-3.5 h-3.5" />刷新</button>
      </div>
      <div className="flex flex-wrap gap-2">
        {['生存', '创造', 'PVP', '小游戏', 'RPG', '模组', '原版', '1.21', '1.20'].map(tag => (
          <button key={tag} onClick={() => setSearch(tag)} className="px-3 py-1 bg-white/5 rounded-full text-xs text-white/50 hover:bg-white/10 hover:text-white/80 transition-colors border border-white/5">{tag}</button>
        ))}
      </div>
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30"><Globe className="w-16 h-16 mb-4 opacity-20" /><p className="text-sm">没有找到服务器</p></div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {filtered.map((server, index) => (
            <motion.div key={server.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
              className="group bg-white/5 rounded-xl border border-white/5 hover:border-white/10 transition-all overflow-hidden">
              <div className={`h-20 bg-gradient-to-br ${getServerGradient(server.name)} relative`}>
                {server.featured && <div className="absolute top-2 right-2 px-2 py-0.5 bg-amber-400/20 text-amber-400 rounded-full text-[10px] font-medium border border-amber-400/20">推荐</div>}
              </div>
              <div className="p-4">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="text-sm font-semibold text-white">{server.name}</h3>
                    <p className="text-xs text-white/40">{server.address}:{server.port}</p>
                  </div>
                  <div className="flex items-center gap-1"><Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400" /><span className="text-xs text-white/60">{server.rating.toFixed(1)}</span></div>
                </div>
                <p className="text-xs text-white/50 line-clamp-2 mb-3">{server.description}</p>
                <div className="flex items-center gap-2 mb-3">
                  {server.tags.slice(0, 4).map(tag => <span key={tag} className="px-2 py-0.5 bg-white/5 rounded text-[10px] text-white/40 border border-white/5">{tag}</span>)}
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-white/40">
                    <span className="flex items-center gap-1"><Users className="w-3 h-3" />{server.playerCount}/{server.maxPlayers}</span>
                    <span>{server.version}</span>
                  </div>
                  <button className="px-3 py-1.5 bg-green-400/20 text-green-400 rounded-lg text-xs hover:bg-green-400/30 transition-colors">收藏</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function MonitorTab({ localServers, performanceHistory }: { localServers: LocalServerConfig[]; performanceHistory: Record<string, ServerPerformanceHistory> }) {
  const runningServers = localServers.filter(s => s.status === 'running')

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      {runningServers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30">
          <Activity className="w-16 h-16 mb-4 opacity-20" />
          <p className="text-sm">没有运行中的服务器</p>
          <p className="text-xs mt-1">启动本地服务器以查看性能监控</p>
        </div>
      ) : (
        <div className="space-y-4">
          {runningServers.map((server, index) => {
            const hist = performanceHistory[server.id]
            const tpsData = hist?.dataPoints?.length ? hist.dataPoints.map(d => d.tps) : Array.from({ length: 20 }, () => 18 + Math.random() * 2)
            const currentTps = tpsData[tpsData.length - 1] || 20
            return (
              <motion.div key={server.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.05 }}
                className="bg-white/5 rounded-xl border border-white/5 p-4">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-green-400/20 flex items-center justify-center"><Activity className="w-4 h-4 text-green-400" /></div>
                    <div><h3 className="text-sm font-semibold text-white">{server.name}</h3><p className="text-xs text-white/40">实时监控</p></div>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className={`w-2 h-2 rounded-full ${currentTps >= 19 ? 'bg-green-400' : currentTps >= 15 ? 'bg-amber-400' : 'bg-red-400'}`} />
                    <span className="text-xs text-white/60">{currentTps.toFixed(1)} TPS</span>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-3 mb-4">
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-white/40">TPS</p><p className={`text-sm font-bold ${currentTps >= 19 ? 'text-green-400' : currentTps >= 15 ? 'text-amber-400' : 'text-red-400'}`}>{currentTps.toFixed(1)}</p></div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-white/40">内存</p><p className="text-sm font-bold text-white">{hist?.averageMemoryUsage?.toFixed(0) || '512'} MB</p></div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-white/40">玩家</p><p className="text-sm font-bold text-white">{hist?.peakPlayerCount || 0}</p></div>
                  <div className="bg-white/5 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-white/40">在线</p><p className="text-sm font-bold text-green-400">{Math.floor((Date.now() - (server.startedAt || Date.now())) / 60000)}m</p></div>
                </div>
                <div className="bg-white/5 rounded-lg p-2 border border-white/5"><p className="text-[10px] text-white/40 mb-1">TPS 历史</p><MiniLineChart data={tpsData} color={currentTps >= 19 ? '#4ade80' : currentTps >= 15 ? '#fbbf24' : '#f87171'} /></div>
              </motion.div>
            )
          })}
        </div>
      )}
    </motion.div>
  )
}

function NotificationsTab({ notifications, onRefresh }: { notifications: ServerStatusNotification[]; onRefresh: () => void }) {
  const getNotifIcon = (type: string) => {
    switch (type) {
      case 'online': return <Wifi className="w-4 h-4 text-green-400" />
      case 'offline': return <WifiOff className="w-4 h-4 text-red-400" />
      case 'version_change': return <RefreshCw className="w-4 h-4 text-blue-400" />
      case 'player_peak': return <Users className="w-4 h-4 text-amber-400" />
      case 'maintenance': return <Wrench className="w-4 h-4 text-orange-400" />
      default: return <Bell className="w-4 h-4 text-white/40" />
    }
  }
  const getNotifColor = (type: string) => {
    switch (type) {
      case 'online': return 'border-green-400/20 bg-green-400/5'
      case 'offline': return 'border-red-400/20 bg-red-400/5'
      case 'version_change': return 'border-blue-400/20 bg-blue-400/5'
      case 'player_peak': return 'border-amber-400/20 bg-amber-400/5'
      case 'maintenance': return 'border-orange-400/20 bg-orange-400/5'
      default: return 'border-white/5 bg-white/5'
    }
  }

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div><h2 className="text-sm font-semibold text-white">通知中心</h2><p className="text-xs text-white/40 mt-0.5">{notifications.filter(n => !n.read).length} 条未读</p></div>
        <button onClick={onRefresh} className="flex items-center gap-2 px-3 py-2 bg-white/5 rounded-lg text-xs text-white/60 hover:bg-white/10 transition-colors"><RefreshCw className="w-3.5 h-3.5" />刷新</button>
      </div>
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-white/30"><Bell className="w-16 h-16 mb-4 opacity-20" /><p className="text-sm">没有通知</p></div>
      ) : (
        <div className="space-y-2">
          {notifications.map((notif, index) => (
            <motion.div key={notif.serverId + notif.timestamp} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: index * 0.03 }}
              className={`flex items-start gap-3 p-3 rounded-xl border transition-all cursor-pointer ${notif.read ? 'border-white/5 bg-white/5 opacity-60' : getNotifColor(notif.type)}`}>
              <div className="mt-0.5">{getNotifIcon(notif.type)}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-medium text-white">{notif.serverName}</span>
                  {!notif.read && <span className="w-2 h-2 bg-blue-400 rounded-full" />}
                </div>
                <p className="text-xs text-white/60">{notif.message}</p>
                <p className="text-[10px] text-white/30 mt-1">{new Date(notif.timestamp).toLocaleString()}</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  )
}

function AddServerModal({ onClose, onAdd, form, setForm }: { onClose: () => void; onAdd: () => void; form: AddServerForm; setForm: (f: AddServerForm) => void }) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">添加服务器</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/40"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-white/50 mb-1 block">服务器名称</label>
            <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="我的服务器" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">地址</label>
            <input type="text" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} placeholder="mc.example.com" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" />
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">端口</label>
            <input type="number" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 25565 })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50" />
          </div>
        </div>
        <div className="flex gap-2 mt-6">
          <button onClick={onClose} className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors">取消</button>
          <button onClick={onAdd} className="flex-1 py-2 bg-green-400/20 text-green-400 rounded-lg text-sm hover:bg-green-400/30 transition-colors">添加</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function CreateLocalServerModal({ onClose, onCreate, step, setStep, form, setForm }: { onClose: () => void; onCreate: () => void; step: number; setStep: (s: number) => void; form: CreateServerForm; setForm: (f: CreateServerForm) => void }) {
  const steps = [{ label: '基础配置', desc: '设置服务器名称和版本' }, { label: '高级选项', desc: '配置游戏模式和难度' }, { label: '确认', desc: '检查并创建服务器' }]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-lg mx-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">创建本地服务器</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/40"><X className="w-5 h-5" /></button>
        </div>
        <div className="flex items-center gap-2 mb-6">
          {steps.map((s, i) => (
            <div key={i} className="flex items-center gap-2 flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium ${i + 1 === step ? 'bg-green-400/20 text-green-400' : i + 1 < step ? 'bg-green-400/10 text-green-400' : 'bg-white/5 text-white/30'}`}>
                {i + 1 < step ? <Check className="w-4 h-4" /> : i + 1}
              </div>
              <div className="flex-1"><p className={`text-xs font-medium ${i + 1 === step ? 'text-white' : 'text-white/30'}`}>{s.label}</p></div>
              {i < steps.length - 1 && <div className="w-8 h-px bg-white/10" />}
            </div>
          ))}
        </div>
        <div className="space-y-3">
          {step === 1 && (
            <>
              <div><label className="text-xs text-white/50 mb-1 block">服务器名称</label><input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="我的 Minecraft 服务器" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" /></div>
              <div><label className="text-xs text-white/50 mb-1 block">游戏版本</label><select value={form.gameVersion} onChange={e => setForm({ ...form, gameVersion: e.target.value })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50"><option value="1.21.4">1.21.4</option><option value="1.21.3">1.21.3</option><option value="1.21.1">1.21.1</option><option value="1.20.6">1.20.6</option><option value="1.20.4">1.20.4</option><option value="1.19.4">1.19.4</option></select></div>
              <div><label className="text-xs text-white/50 mb-1 block">服务器类型</label><select value={form.serverType} onChange={e => setForm({ ...form, serverType: e.target.value as CreateServerForm['serverType'] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50"><option value="vanilla">原版 (Vanilla)</option><option value="paper">Paper</option><option value="spigot">Spigot</option><option value="forge">Forge</option><option value="fabric">Fabric</option><option value="neoforge">NeoForge</option></select></div>
              <div><label className="text-xs text-white/50 mb-1 block">端口</label><input type="number" value={form.port} onChange={e => setForm({ ...form, port: parseInt(e.target.value) || 25565 })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50" /></div>
            </>
          )}
          {step === 2 && (
            <>
              <div><label className="text-xs text-white/50 mb-1 block">游戏模式</label><select value={form.gameMode} onChange={e => setForm({ ...form, gameMode: e.target.value as CreateServerForm['gameMode'] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50"><option value="survival">生存</option><option value="creative">创造</option><option value="adventure">冒险</option><option value="spectator">旁观</option></select></div>
              <div><label className="text-xs text-white/50 mb-1 block">难度</label><select value={form.difficulty} onChange={e => setForm({ ...form, difficulty: e.target.value as CreateServerForm['difficulty'] })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50"><option value="peaceful">和平</option><option value="easy">简单</option><option value="normal">普通</option><option value="hard">困难</option></select></div>
              <div><label className="text-xs text-white/50 mb-1 block">最大玩家数</label><input type="number" value={form.maxPlayers} onChange={e => setForm({ ...form, maxPlayers: parseInt(e.target.value) || 20 })} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-green-400/50" /></div>
              <div><label className="text-xs text-white/50 mb-1 block">MOTD</label><input type="text" value={form.motd} onChange={e => setForm({ ...form, motd: e.target.value })} placeholder="A Minecraft Server" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-green-400/50" /></div>
            </>
          )}
          {step === 3 && (
            <div className="bg-white/5 rounded-xl p-4 space-y-2 border border-white/5">
              <h3 className="text-sm font-medium text-white mb-3">配置预览</h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <span className="text-white/40">名称</span><span className="text-white">{form.name}</span>
                <span className="text-white/40">版本</span><span className="text-white">{form.gameVersion}</span>
                <span className="text-white/40">类型</span><span className="text-white">{form.serverType}</span>
                <span className="text-white/40">端口</span><span className="text-white">{form.port}</span>
                <span className="text-white/40">游戏模式</span><span className="text-white">{form.gameMode}</span>
                <span className="text-white/40">难度</span><span className="text-white">{form.difficulty}</span>
                <span className="text-white/40">最大玩家</span><span className="text-white">{form.maxPlayers}</span>
              </div>
            </div>
          )}
        </div>
        <div className="flex gap-2 mt-6">
          {step > 1 && <button onClick={() => setStep(step - 1)} className="flex-1 py-2 bg-white/5 text-white/60 rounded-lg text-sm hover:bg-white/10 transition-colors">上一步</button>}
          {step < 3 ? (
            <button onClick={() => setStep(step + 1)} className="flex-1 py-2 bg-green-400/20 text-green-400 rounded-lg text-sm hover:bg-green-400/30 transition-colors">下一步</button>
          ) : (
            <button onClick={onCreate} className="flex-1 py-2 bg-green-400/20 text-green-400 rounded-lg text-sm hover:bg-green-400/30 transition-colors">创建服务器</button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

function ServerDetailModal({ server, status, onClose, onConnect, onToggleFavorite, onDelete }: {
  server: ServerEntry
  status?: ServerStatus
  onClose: () => void
  onConnect: () => void
  onToggleFavorite: () => void
  onDelete: () => void
}) {
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }} onClick={e => e.stopPropagation()} className="bg-[#1a1a1a] border border-white/10 rounded-2xl p-6 w-full max-w-md mx-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {status?.iconB64 ? <img src={status.iconB64} alt="" className="w-12 h-12 rounded-xl" /> : (
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getServerGradient(server.name)} flex items-center justify-center`}><Server className="w-6 h-6 text-white/60" /></div>
            )}
            <div><h2 className="text-lg font-semibold text-white">{server.name}</h2><p className="text-xs text-white/40">{server.address}:{server.port}</p></div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-white/5 text-white/40"><X className="w-5 h-5" /></button>
        </div>
        {status?.online ? (
          <div className="space-y-3">
            <div className="bg-white/5 rounded-xl p-3 border border-white/5"><p className="text-xs text-white/40 mb-1">MOTD</p><p className="text-sm text-white">{status.motd}</p></div>
            <div className="grid grid-cols-3 gap-2">
              <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center"><p className="text-[10px] text-white/40">玩家</p><p className="text-sm font-bold text-white">{status.playersOnline}/{status.playersMax}</p></div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center"><p className="text-[10px] text-white/40">延迟</p><p className="text-sm font-bold text-white">{status.pingMs}ms</p></div>
              <div className="bg-white/5 rounded-lg p-2 border border-white/5 text-center"><p className="text-[10px] text-white/40">版本</p><p className="text-sm font-bold text-white">{status.version}</p></div>
            </div>
            {status.playerList.length > 0 && (
              <div className="bg-white/5 rounded-xl p-3 border border-white/5">
                <p className="text-xs text-white/40 mb-2">在线玩家 ({status.playerList.length})</p>
                <div className="flex flex-wrap gap-1">
                  {status.playerList.map((player, i) => <span key={i} className="px-2 py-1 bg-white/5 rounded-lg text-xs text-white/60 border border-white/5">{player}</span>)}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center py-8 text-white/30"><WifiOff className="w-12 h-12 mb-2" /><p className="text-sm">服务器离线或无法连接</p></div>
        )}
        <div className="flex gap-2 mt-6">
          <button onClick={onToggleFavorite} className={`flex-1 py-2 rounded-lg text-sm transition-colors ${server.isFavorite ? 'bg-rose-400/20 text-rose-400 hover:bg-rose-400/30' : 'bg-white/5 text-white/60 hover:bg-white/10'}`}>{server.isFavorite ? '取消收藏' : '收藏'}</button>
          <button onClick={onConnect} className="flex-1 py-2 bg-green-400/20 text-green-400 rounded-lg text-sm hover:bg-green-400/30 transition-colors">连接</button>
          <button onClick={onDelete} className="px-4 py-2 bg-red-400/20 text-red-400 rounded-lg text-sm hover:bg-red-400/30 transition-colors"><Trash2 className="w-4 h-4" /></button>
        </div>
      </motion.div>
    </motion.div>
  )
}
