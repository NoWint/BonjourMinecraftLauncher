import { useState, useEffect, useCallback } from 'react'
import {
  Globe, Search, Heart, Clock, Map, BarChart3, ArrowLeftRight,
  Sprout, Cloud, Scissors, BookOpen, Share2, RefreshCw, Plus,
  Trash2, Download, Upload, Copy, Edit3, ChevronRight, Loader2,
  AlertTriangle, CheckCircle2, XCircle, Info, X, Shield,
  Mountain, TreePine, Swords, Pickaxe, Hammer, Wheat,
  MapPin, Eye, Wrench, Archive, Calendar, HardDrive,
  Activity, FileText, ZoomIn, Layers
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from './EmptyState'
import { worldManager } from '../core/world/worldManager'
import type {
  WorldInfo, WorldHealthReport, WorldTimeline, WorldMapRender,
  WorldStatistics, WorldMigrationPlan, SeedPreviewResult,
  WorldSyncInfo, WorldSlimPlan, WorldDiary, StructureInfo,
  MapDimension, GameMode, HealthCheckSeverity,
} from '../types/world'

type WorldTab = 'worlds' | 'health' | 'timeline' | 'map' | 'stats' | 'convert' | 'seed' | 'sync' | 'slim' | 'diary' | 'blueprint'

const WORLD_TABS: { key: WorldTab; label: string; icon: any; desc: string }[] = [
  { key: 'worlds', label: '存档列表', icon: Globe, desc: '管理所有存档' },
  { key: 'health', label: '健康检查', icon: Heart, desc: '#51 存档健康检查与修复' },
  { key: 'timeline', label: '时间线', icon: Clock, desc: '#52 存档时间线回放' },
  { key: 'map', label: '世界地图', icon: Map, desc: '#53 存档世界地图生成' },
  { key: 'stats', label: '统计面板', icon: BarChart3, desc: '#54 存档统计面板' },
  { key: 'convert', label: '格式转换', icon: ArrowLeftRight, desc: '#55 存档格式转换与迁移' },
  { key: 'seed', label: '种子预览', icon: Sprout, desc: '#56 种子预览器' },
  { key: 'sync', label: '云端同步', icon: Cloud, desc: '#57 存档云端同步' },
  { key: 'slim', label: '存档瘦身', icon: Scissors, desc: '#58 存档瘦身工具' },
  { key: 'diary', label: '存档日记', icon: BookOpen, desc: '#59 存档日记' },
  { key: 'blueprint', label: '蓝图分享', icon: Share2, desc: '#60 存档蓝图分享' },
]

const getWorldGradient = (name: string) => {
  const gradients = [
    'from-emerald-400/20 to-green-500/20', 'from-blue-400/20 to-cyan-500/20',
    'from-amber-400/20 to-yellow-500/20', 'from-purple-400/20 to-violet-500/20',
    'from-rose-400/20 to-pink-500/20', 'from-teal-400/20 to-emerald-500/20',
  ]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

const getGameModeIcon = (mode: GameMode) => {
  switch (mode) {
    case 'survival': return <Swords className="w-3.5 h-3.5" />
    case 'creative': return <Hammer className="w-3.5 h-3.5" />
    case 'adventure': return <MapPin className="w-3.5 h-3.5" />
    case 'spectator': return <Eye className="w-3.5 h-3.5" />
  }
}

const getHealthBadge = (severity: HealthCheckSeverity) => {
  const config: Record<HealthCheckSeverity, { bg: string; text: string; label: string }> = {
    pass: { bg: 'bg-green-400/10', text: 'text-green-400', label: '通过' },
    warning: { bg: 'bg-amber-400/10', text: 'text-amber-400', label: '警告' },
    error: { bg: 'bg-red-400/10', text: 'text-red-400', label: '错误' },
    critical: { bg: 'bg-red-500/10', text: 'text-red-500', label: '严重' },
  }
  const c = config[severity]
  return <span className={`px-2 py-0.5 text-[10px] rounded-lg ${c.bg} ${c.text} border border-current/20`}>{c.label}</span>
}

export default function WorldsPage() {
  const [worlds, setWorlds] = useState<WorldInfo[]>([])
  const [selectedWorld, setSelectedWorld] = useState<WorldInfo | null>(null)
  const [activeTab, setActiveTab] = useState<WorldTab>('worlds')
  const [isLoading, setIsLoading] = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [error, setError] = useState<string | null>(null)

  const [healthReport, setHealthReport] = useState<WorldHealthReport | null>(null)
  const [timeline, setTimeline] = useState<WorldTimeline | null>(null)
  const [mapRender, setMapRender] = useState<WorldMapRender | null>(null)
  const [mapDimension, setMapDimension] = useState<MapDimension>('overworld')
  const [statistics, setStatistics] = useState<WorldStatistics | null>(null)
  const [seedInput, setSeedInput] = useState('')
  const [seedPreview, setSeedPreview] = useState<SeedPreviewResult | null>(null)
  const [syncInfo, setSyncInfo] = useState<WorldSyncInfo | null>(null)
  const [slimPlan, setSlimPlan] = useState<WorldSlimPlan | null>(null)
  const [diary, setDiary] = useState<WorldDiary | null>(null)
  const [structures, setStructures] = useState<StructureInfo[]>([])
  const [migrationPlan, setMigrationPlan] = useState<WorldMigrationPlan | null>(null)
  const [targetVersion, setTargetVersion] = useState('1.21')

  const loadWorlds = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const settings = await window.minecraftAPI.getSettings()
      const savesDir = `${settings.gameDir}/saves`
      const worldList = await worldManager.getWorlds(savesDir)
      for (const world of worldList) {
        try {
          world.iconDataUrl = await worldManager.getWorldIcon(world.path) || undefined
        } catch {}
      }
      setWorlds(worldList)
    } catch (err) {
      setError('加载存档列表失败')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => { loadWorlds() }, [loadWorlds])

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await loadWorlds()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  const selectWorld = (world: WorldInfo) => {
    setSelectedWorld(world)
    setHealthReport(null)
    setTimeline(null)
    setMapRender(null)
    setStatistics(null)
    setSyncInfo(null)
    setSlimPlan(null)
    setDiary(null)
    setStructures([])
    setMigrationPlan(null)
  }

  const loadHealthCheck = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const report = await worldManager.checkWorldHealth(selectedWorld.path)
      setHealthReport(report)
    } catch (err) {
      setError('健康检查失败')
    } finally {
      setIsLoading(false)
    }
  }

  const fixIssue = async (itemId: string) => {
    if (!selectedWorld) return
    try {
      await worldManager.fixWorldHealthIssue(selectedWorld.path, itemId)
      await loadHealthCheck()
    } catch {}
  }

  const fixAll = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const report = await worldManager.fixAllWorldHealthIssues(selectedWorld.path)
      setHealthReport(report)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadTimeline = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const tl = await worldManager.getWorldTimeline(selectedWorld.path)
      setTimeline(tl)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const createTimelineEntry = async () => {
    if (!selectedWorld) return
    try {
      await worldManager.createTimelineEntry(selectedWorld.path, `手动快照 ${new Date().toLocaleString('zh-CN')}`)
      await loadTimeline()
    } catch {}
  }

  const loadMap = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const render = await worldManager.renderWorldMap(selectedWorld.path, mapDimension)
      setMapRender(render)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadStats = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const stats = await worldManager.getWorldStatistics(selectedWorld.path)
      setStatistics(stats)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadMigrationPlan = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const plan = await worldManager.getWorldMigrationPlan(selectedWorld.path, targetVersion)
      setMigrationPlan(plan)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const previewSeed = async () => {
    if (!seedInput.trim()) return
    setIsLoading(true)
    try {
      const result = await worldManager.previewSeed(seedInput)
      setSeedPreview(result)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadSyncInfo = async () => {
    if (!selectedWorld) return
    try {
      const info = await worldManager.getWorldSyncInfo(selectedWorld.path)
      setSyncInfo(info)
    } catch {}
  }

  const loadSlimPlan = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const plan = await worldManager.analyzeWorldSlim(selectedWorld.path)
      setSlimPlan(plan)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadDiary = async () => {
    if (!selectedWorld) return
    setIsLoading(true)
    try {
      const d = await worldManager.getWorldDiary(selectedWorld.path)
      setDiary(d)
    } catch {} finally {
      setIsLoading(false)
    }
  }

  const loadStructures = async () => {
    if (!selectedWorld) return
    try {
      const s = await worldManager.getWorldStructures(selectedWorld.path)
      setStructures(s)
    } catch {}
  }

  const deleteWorld = async (world: WorldInfo) => {
    if (!confirm(`确定要删除存档 "${world.name}" 吗？此操作不可恢复！`)) return
    try {
      await worldManager.deleteWorld(world.path)
      setSelectedWorld(null)
      await loadWorlds()
    } catch {}
  }

  const backupWorld = async (world: WorldInfo) => {
    try {
      const settings = await window.minecraftAPI.getSettings()
      const backupDir = `${settings.gameDir}/backups`
      await worldManager.backupWorld(world.path, backupDir, '手动备份')
    } catch {}
  }

  const filteredWorlds = worlds.filter(w =>
    w.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  useEffect(() => {
    if (selectedWorld && activeTab === 'health' && !healthReport) loadHealthCheck()
    if (selectedWorld && activeTab === 'timeline' && !timeline) loadTimeline()
    if (selectedWorld && activeTab === 'map' && !mapRender) loadMap()
    if (selectedWorld && activeTab === 'stats' && !statistics) loadStats()
    if (selectedWorld && activeTab === 'sync' && !syncInfo) loadSyncInfo()
    if (selectedWorld && activeTab === 'slim' && !slimPlan) loadSlimPlan()
    if (selectedWorld && activeTab === 'diary' && !diary) loadDiary()
    if (selectedWorld && activeTab === 'blueprint' && structures.length === 0) loadStructures()
  }, [activeTab, selectedWorld])

  useEffect(() => {
    if (selectedWorld && activeTab === 'map') loadMap()
  }, [mapDimension])

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mc-green/10 flex items-center justify-center">
              <Globe className="w-5 h-5 text-mc-green" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">存档管理</h2>
              <p className="text-xs text-white/40 mt-0.5">{worlds.length} 个存档 · 10 项高级功能</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={handleRefresh} className={`p-2.5 rounded-xl glass hover:bg-white/5 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {WORLD_TABS.map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === key ? 'bg-mc-green/15 text-mc-green border border-mc-green/25' : 'glass text-white/50 hover:text-white/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>

        {activeTab === 'worlds' && (
          <div className="relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
            <input
              type="text" placeholder="搜索存档..." value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10">
                <X className="w-3.5 h-3.5 text-white/40" />
              </button>
            )}
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
              <AlertTriangle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-red-500/10"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'worlds' && (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-28 bg-white/5" />
                  <div className="p-4 space-y-3"><div className="h-4 bg-white/5 rounded w-3/4" /><div className="h-3 bg-white/5 rounded w-full" /></div>
                </div>
              ))}
            </div>
          ) : filteredWorlds.length === 0 ? (
            <EmptyState
              icon={Globe}
              title={searchQuery ? '未找到匹配的存档' : '还没有存档'}
              description="启动游戏创建新世界后，存档将自动出现在这里"
            />
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWorlds.map((world, index) => (
                <motion.div key={world.path} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => selectWorld(world)}
                  className={`glass rounded-2xl overflow-hidden cursor-pointer group ${
                    selectedWorld?.path === world.path ? 'ring-2 ring-mc-green/50' : ''
                  }`}
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className={`h-28 bg-gradient-to-br ${getWorldGradient(world.name)} relative overflow-hidden`}>
                    <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {world.iconDataUrl ? (
                        <img src={world.iconDataUrl} alt={world.name} className="w-20 h-20 rounded-xl object-cover shadow-lg" />
                      ) : (
                        <Globe className="w-10 h-10 text-white/20" />
                      )}
                    </div>
                    <div className="absolute top-2 right-2 flex gap-1">
                      <span className="px-2 py-0.5 text-[10px] rounded-lg bg-black/30 backdrop-blur text-white/70 flex items-center gap-1">
                        {getGameModeIcon(world.gameMode)}
                        {worldManager.getGameModeName(world.gameMode)}
                      </span>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white truncate text-sm">{world.name}</h3>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/40">
                      <HardDrive className="w-3 h-3" />
                      <span>{worldManager.formatWorldSize(world.size)}</span>
                      <Calendar className="w-3 h-3 ml-1" />
                      <span>{worldManager.formatDate(world.lastPlayed)}</span>
                    </div>
                    <div className="mt-3 flex gap-2">
                      <button onClick={e => { e.stopPropagation(); backupWorld(world) }}
                        className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green hover:bg-mc-green/25 transition-all text-xs font-semibold">
                        <Archive className="w-3.5 h-3.5" />备份
                      </button>
                      <button onClick={e => { e.stopPropagation(); deleteWorld(world) }}
                        className="p-2 rounded-xl bg-red-400/10 text-red-400 hover:bg-red-400/20 transition-all">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )
        )}

        {activeTab !== 'worlds' && !selectedWorld && activeTab !== 'seed' && (
          <EmptyState
            icon={Globe}
            title="请先选择一个存档"
            action={{ label: '返回存档列表', onClick: () => setActiveTab('worlds') }}
          />
        )}

        {activeTab === 'health' && selectedWorld && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Heart className="w-5 h-5 text-mc-green" />
                <h3 className="text-lg font-bold text-white">{selectedWorld.name} - 健康检查</h3>
              </div>
              <div className="flex gap-2">
                {healthReport && healthReport.items.some(i => i.autoFixable && i.severity !== 'pass') && (
                  <button onClick={fixAll} className="px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-xs font-semibold hover:bg-mc-green/25 transition-all flex items-center gap-1.5">
                    <Wrench className="w-3.5 h-3.5" />一键修复
                  </button>
                )}
                <button onClick={loadHealthCheck} className="p-2 rounded-xl glass hover:bg-white/5 transition-all">
                  <RefreshCw className="w-4 h-4 text-white/50" />
                </button>
              </div>
            </div>

            {healthReport && (
              <>
                <div className="glass rounded-2xl p-5">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-white/60">整体健康度</span>
                    <span className={`text-2xl font-bold ${healthReport.overallHealth >= 80 ? 'text-green-400' : healthReport.overallHealth >= 50 ? 'text-amber-400' : 'text-red-400'}`}>
                      {healthReport.overallHealth}%
                    </span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                    <div className="h-full rounded-full transition-all" style={{
                      width: `${healthReport.overallHealth}%`,
                      background: healthReport.overallHealth >= 80 ? '#4ade80' : healthReport.overallHealth >= 50 ? '#fbbf24' : '#f87171',
                    }} />
                  </div>
                  <div className="flex gap-4 mt-3 text-xs">
                    <span className="text-green-400">✓ {healthReport.summary.pass} 通过</span>
                    <span className="text-amber-400">⚠ {healthReport.summary.warning} 警告</span>
                    <span className="text-red-400">✕ {healthReport.summary.error + healthReport.summary.critical} 问题</span>
                  </div>
                </div>

                <div className="space-y-2">
                  {healthReport.items.map(item => (
                    <div key={item.id} className="glass rounded-xl p-4 flex items-center gap-4">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                        item.severity === 'pass' ? 'bg-green-400/10' :
                        item.severity === 'warning' ? 'bg-amber-400/10' : 'bg-red-400/10'
                      }`}>
                        {item.severity === 'pass' ? <CheckCircle2 className="w-4 h-4 text-green-400" /> :
                         item.severity === 'warning' ? <AlertTriangle className="w-4 h-4 text-amber-400" /> :
                         <XCircle className="w-4 h-4 text-red-400" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-white">{item.message}</span>
                          {getHealthBadge(item.severity)}
                        </div>
                        {item.detail && <p className="text-xs text-white/40 mt-0.5">{item.detail}</p>}
                      </div>
                      {item.autoFixable && item.severity !== 'pass' && (
                        <button onClick={() => fixIssue(item.id)}
                          className="px-3 py-1.5 rounded-lg bg-mc-green/10 text-mc-green text-xs font-medium hover:bg-mc-green/20 transition-all">
                          修复
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'timeline' && selectedWorld && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Clock className="w-5 h-5 text-mc-green" />时间线
              </h3>
              <button onClick={createTimelineEntry}
                className="px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-xs font-semibold hover:bg-mc-green/25 transition-all flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5" />创建快照
              </button>
            </div>

            {timeline && timeline.entries.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="暂无时间线记录"
                description="创建快照后，存档状态将记录在时间线上"
              />
            ) : timeline && (
              <div className="relative pl-8">
                <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-white/10" />
                {timeline.entries.map((entry, i) => (
                  <div key={entry.id} className="relative mb-4">
                    <div className="absolute -left-5 w-4 h-4 rounded-full bg-mc-green/30 border-2 border-mc-green" />
                    <div className="glass rounded-xl p-4">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-medium text-white">{entry.label}</span>
                        <span className="text-xs text-white/40">{new Date(entry.timestamp).toLocaleString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/40">
                        <span className="flex items-center gap-1"><HardDrive className="w-3 h-3" />{worldManager.formatWorldSize(entry.size)}</span>
                      </div>
                      <div className="flex gap-2 mt-3">
                        <button onClick={async () => {
                          if (!confirm('恢复此快照将覆盖当前存档，确定继续？')) return
                          try { await worldManager.restoreTimelineEntry(selectedWorld.path, entry.id); await loadWorlds() } catch {}
                        }} className="px-3 py-1.5 rounded-lg bg-mc-green/10 text-mc-green text-xs font-medium hover:bg-mc-green/20 transition-all flex items-center gap-1">
                          <Download className="w-3 h-3" />恢复
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'map' && selectedWorld && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <Map className="w-5 h-5 text-mc-green" />世界地图
              </h3>
              <div className="flex gap-1 glass rounded-xl p-1">
                {(['overworld', 'nether', 'end'] as MapDimension[]).map(dim => (
                  <button key={dim} onClick={() => setMapDimension(dim)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      mapDimension === dim ? 'bg-white/10 text-white' : 'text-white/40'
                    }`}>
                    {worldManager.getDimensionName(dim)}
                  </button>
                ))}
              </div>
            </div>

            {mapRender && mapRender.tiles.length > 0 ? (
              <div className="glass rounded-2xl p-4">
                <div className="relative w-full aspect-square max-w-lg mx-auto rounded-xl overflow-hidden bg-black/20">
                  <svg viewBox={`0 0 ${mapRender.width || 512} ${mapRender.height || 512}`} className="w-full h-full">
                    {mapRender.tiles.map((tile, i) => (
                      <rect key={i} x={tile.x * 16} y={tile.z * 16} width={16} height={16} fill={tile.color} />
                    ))}
                    {mapRender.structureMarkers?.map((marker, i) => (
                      <g key={`s-${i}`}>
                        <circle cx={marker.x} cy={marker.z} r={4} fill="#fbbf24" stroke="#000" strokeWidth={1} />
                        <text x={marker.x} y={marker.z - 6} textAnchor="middle" fill="#fbbf24" fontSize={6}>{marker.label}</text>
                      </g>
                    ))}
                  </svg>
                </div>
                <div className="flex items-center justify-between mt-3 text-xs text-white/40">
                  <span>{mapRender.tiles.length} 个区域 · 渲染耗时 {mapRender.renderTime}ms</span>
                  <span className="flex items-center gap-1"><ZoomIn className="w-3 h-3" />拖拽缩放</span>
                </div>
              </div>
            ) : (
              <div className="text-center py-16">
                <Map className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">暂无地图数据</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'stats' && selectedWorld && statistics && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-mc-green" />{selectedWorld.name} - 统计面板
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: '游戏天数', value: statistics.general.daysPlayed, icon: Calendar, color: 'text-blue-400' },
                { label: '跳跃次数', value: statistics.general.jumps, icon: Activity, color: 'text-green-400' },
                { label: '死亡次数', value: statistics.general.deaths, icon: XCircle, color: 'text-red-400' },
                { label: '击杀生物', value: statistics.combat.mobsKilled, icon: Swords, color: 'text-orange-400' },
                { label: '方块挖掘', value: statistics.mining.totalMined, icon: Pickaxe, color: 'text-amber-400' },
                { label: '方块放置', value: statistics.building.totalPlaced, icon: Hammer, color: 'text-cyan-400' },
                { label: '访问维度', value: statistics.exploration.dimensionsVisited.length, icon: Layers, color: 'text-purple-400' },
                { label: '动物繁殖', value: statistics.farming.animalsBred, icon: Wheat, color: 'text-lime-400' },
              ].map(stat => (
                <div key={stat.label} className="glass rounded-xl p-3">
                  <div className="flex items-center gap-2 text-white/40 text-xs mb-1">
                    <stat.icon className={`w-3.5 h-3.5 ${stat.color}`} />{stat.label}
                  </div>
                  <p className="text-white text-lg font-bold">{stat.value.toLocaleString()}</p>
                </div>
              ))}
            </div>

            {statistics.mining.topMined.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Pickaxe className="w-4 h-4" />挖掘排行
                </h4>
                <div className="space-y-2">
                  {statistics.mining.topMined.slice(0, 5).map((item, i) => (
                    <div key={item.item} className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-4">{i + 1}</span>
                      <span className="text-sm text-white flex-1 truncate">{item.item}</span>
                      <span className="text-xs text-white/40">{item.count.toLocaleString()}</span>
                      <div className="w-24 h-1.5 rounded-full bg-white/5 overflow-hidden">
                        <div className="h-full rounded-full bg-mc-green/60" style={{ width: `${(item.count / statistics.mining.topMined[0].count) * 100}%` }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {statistics.combat.topKills.length > 0 && (
              <div className="glass rounded-2xl p-4">
                <h4 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                  <Swords className="w-4 h-4" />击杀排行
                </h4>
                <div className="space-y-2">
                  {statistics.combat.topKills.slice(0, 5).map((item, i) => (
                    <div key={item.mob} className="flex items-center gap-3">
                      <span className="text-xs text-white/30 w-4">{i + 1}</span>
                      <span className="text-sm text-white flex-1 truncate">{item.mob}</span>
                      <span className="text-xs text-white/40">{item.count.toLocaleString()}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'convert' && selectedWorld && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <ArrowLeftRight className="w-5 h-5 text-mc-green" />格式转换与迁移
            </h3>

            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-2">目标版本</label>
                <input type="text" value={targetVersion} onChange={e => setTargetVersion(e.target.value)}
                  className="w-full px-4 py-2.5 glass rounded-xl text-white focus:outline-none text-sm" placeholder="例如 1.21" />
              </div>
              <button onClick={loadMigrationPlan}
                className="w-full px-4 py-3 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all">
                生成迁移计划
              </button>
            </div>

            {migrationPlan && (
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">总体风险</span>
                  <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                    migrationPlan.totalRisk === 'low' ? 'bg-green-400/10 text-green-400' :
                    migrationPlan.totalRisk === 'medium' ? 'bg-amber-400/10 text-amber-400' : 'bg-red-400/10 text-red-400'
                  }`}>
                    {migrationPlan.totalRisk === 'low' ? '低风险' : migrationPlan.totalRisk === 'medium' ? '中等风险' : '高风险'}
                  </span>
                </div>
                <div className="text-xs text-white/40">预计耗时：{migrationPlan.estimatedTime}</div>
                {migrationPlan.steps.map((step, i) => (
                  <div key={i} className="glass rounded-xl p-4">
                    <p className="text-sm text-white">{step.description}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-white/40">
                      <span>{step.fromVersion} → {step.toVersion}</span>
                      {step.backupRequired && <span className="text-amber-400">需要备份</span>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'seed' && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Sprout className="w-5 h-5 text-mc-green" />种子预览器
            </h3>

            <div className="glass rounded-2xl p-5 space-y-4">
              <div>
                <label className="text-xs text-white/40 block mb-2">输入种子</label>
                <div className="flex gap-2">
                  <input type="text" value={seedInput} onChange={e => setSeedInput(e.target.value)}
                    className="flex-1 px-4 py-2.5 glass rounded-xl text-white focus:outline-none text-sm" placeholder="输入数字或文字种子..." />
                  <button onClick={previewSeed} disabled={!seedInput.trim()}
                    className="px-6 py-2.5 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all disabled:opacity-50">
                    预览
                  </button>
                </div>
              </div>
            </div>

            {seedPreview && (
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-3">
                    <div className="text-xs text-white/40 mb-1">出生点生物群系</div>
                    <p className="text-white text-sm font-medium">{seedPreview.spawnBiome}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <div className="text-xs text-white/40 mb-1">出生点坐标</div>
                    <p className="text-white text-sm font-medium">X: {seedPreview.spawnX}, Z: {seedPreview.spawnZ}</p>
                  </div>
                </div>

                {seedPreview.structures.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">附近结构</h4>
                    <div className="space-y-2">
                      {seedPreview.structures.map((s, i) => (
                        <div key={i} className="glass rounded-xl p-3 flex items-center gap-3">
                          <MapPin className="w-4 h-4 text-amber-400" />
                          <span className="text-sm text-white flex-1">{s.name}</span>
                          <span className="text-xs text-white/40">X: {s.x}, Z: {s.z}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {seedPreview.biomes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-white/60 mb-2">生物群系分布</h4>
                    <div className="flex flex-wrap gap-2">
                      {seedPreview.biomes.map((b, i) => (
                        <span key={i} className="px-2 py-1 rounded-lg text-xs" style={{ background: b.color + '30', color: b.color }}>
                          {b.name}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'sync' && selectedWorld && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Cloud className="w-5 h-5 text-mc-green" />云端同步
            </h3>

            <div className="glass rounded-2xl p-5">
              {syncInfo ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-white/60">同步状态</span>
                    <span className={`px-3 py-1 rounded-lg text-xs font-medium ${
                      syncInfo.syncStatus === 'up_to_date' ? 'bg-green-400/10 text-green-400' :
                      syncInfo.syncStatus === 'syncing' ? 'bg-blue-400/10 text-blue-400' :
                      syncInfo.syncStatus === 'conflict' ? 'bg-amber-400/10 text-amber-400' :
                      syncInfo.syncStatus === 'error' ? 'bg-red-400/10 text-red-400' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {syncInfo.syncStatus === 'up_to_date' ? '已同步' :
                       syncInfo.syncStatus === 'syncing' ? '同步中' :
                       syncInfo.syncStatus === 'conflict' ? '有冲突' :
                       syncInfo.syncStatus === 'error' ? '同步错误' : '未同步'}
                    </span>
                  </div>
                  <div className="text-xs text-white/40">
                    <p>本地修改：{syncInfo.localModified ? new Date(syncInfo.localModified).toLocaleString('zh-CN') : '未知'}</p>
                  </div>
                  <button onClick={async () => { try { await worldManager.syncWorld(selectedWorld.path) } catch {} }}
                    className="w-full px-4 py-3 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all flex items-center justify-center gap-2">
                    <Cloud className="w-4 h-4" />立即同步
                  </button>
                  <p className="text-xs text-white/30 text-center">云端同步需要 Bonjour Plus 订阅</p>
                </div>
              ) : (
                <div className="text-center py-8">
                  <Cloud className="w-8 h-8 text-white/20 mx-auto mb-2" />
                  <p className="text-white/40 text-sm">加载同步信息中...</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'slim' && selectedWorld && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Scissors className="w-5 h-5 text-mc-green" />存档瘦身
            </h3>

            {slimPlan ? (
              <div className="glass rounded-2xl p-5 space-y-4">
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 mb-1">总大小</div>
                    <p className="text-white text-lg font-bold">{worldManager.formatWorldSize(slimPlan.totalSize)}</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 mb-1">可释放</div>
                    <p className="text-amber-400 text-lg font-bold">{worldManager.formatWorldSize(slimPlan.removeSize)}</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <div className="text-xs text-white/40 mb-1">节省比例</div>
                    <p className="text-mc-green text-lg font-bold">{slimPlan.savingsPercent}%</p>
                  </div>
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-white/60">
                    <span>区块统计</span>
                    <span>{slimPlan.chunks.total} 总计 · {slimPlan.chunks.remove} 可移除</span>
                  </div>
                  <div className="flex justify-between text-white/60">
                    <span>区域文件</span>
                    <span>{slimPlan.regions.total} 总计 · {slimPlan.regions.remove} 可移除</span>
                  </div>
                </div>

                <button onClick={async () => {
                  if (!confirm('瘦身操作将删除未访问的区块，建议先备份。确定继续？')) return
                  try { await worldManager.executeWorldSlim(selectedWorld.path, slimPlan); await loadSlimPlan() } catch {}
                }} className="w-full px-4 py-3 rounded-xl bg-amber-400/15 border border-amber-400/25 text-amber-400 text-sm font-semibold hover:bg-amber-400/25 transition-all flex items-center justify-center gap-2">
                  <Scissors className="w-4 h-4" />执行瘦身
                </button>
              </div>
            ) : (
              <div className="text-center py-8">
                <Loader2 className="w-6 h-6 text-white/20 animate-spin mx-auto" />
              </div>
            )}
          </div>
        )}

        {activeTab === 'diary' && selectedWorld && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-mc-green" />存档日记
            </h3>

            {diary && diary.entries.length > 0 ? (
              <div className="space-y-3">
                {diary.entries.map((entry, i) => (
                  <div key={i} className="glass rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="text-sm font-medium text-white">{entry.summary}</h4>
                        <span className="text-xs text-white/40">{entry.date} · 第 {entry.dayNumber} 天</span>
                      </div>
                    </div>
                    {entry.highlights.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        {entry.highlights.map((h, j) => (
                          <span key={j} className="px-2 py-0.5 text-[10px] rounded-lg bg-mc-green/10 text-mc-green">{h}</span>
                        ))}
                      </div>
                    )}
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="glass rounded-lg p-2 text-center">
                        <div className="text-white/40">挖掘</div>
                        <div className="text-white font-medium">{entry.stats.blocksMined}</div>
                      </div>
                      <div className="glass rounded-lg p-2 text-center">
                        <div className="text-white/40">放置</div>
                        <div className="text-white font-medium">{entry.stats.blocksPlaced}</div>
                      </div>
                      <div className="glass rounded-lg p-2 text-center">
                        <div className="text-white/40">击杀</div>
                        <div className="text-white font-medium">{entry.stats.mobsKilled}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-16">
                <BookOpen className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">暂无日记记录</p>
                <p className="text-xs text-white/30 mt-1">随着游戏进行，日记将自动记录你的冒险</p>
              </div>
            )}
          </div>
        )}

        {activeTab === 'blueprint' && selectedWorld && (
          <div className="space-y-4">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Share2 className="w-5 h-5 text-mc-green" />蓝图分享
            </h3>

            <div className="glass rounded-2xl p-5 space-y-4">
              <p className="text-sm text-white/60">选择存档中的区域导出为结构文件（.nbt），可分享给好友或导入到其他存档</p>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-white/40 block mb-1">起始 X</label>
                  <input type="number" defaultValue={0} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">起始 Y</label>
                  <input type="number" defaultValue={64} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">起始 Z</label>
                  <input type="number" defaultValue={0} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">结束 X</label>
                  <input type="number" defaultValue={16} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">结束 Y</label>
                  <input type="number" defaultValue={80} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-white/40 block mb-1">结束 Z</label>
                  <input type="number" defaultValue={16} className="w-full px-3 py-2 glass rounded-lg text-white text-sm focus:outline-none" />
                </div>
              </div>
              <button onClick={async () => {
                try {
                  await worldManager.exportStructure({
                    worldPath: selectedWorld.path, dimension: 'overworld',
                    startX: 0, startY: 64, startZ: 0, endX: 16, endY: 80, endZ: 16,
                    name: `${selectedWorld.name}_blueprint_${Date.now()}`, author: 'Bonjour', includeEntities: true,
                  })
                  await loadStructures()
                } catch {}
              }} className="w-full px-4 py-3 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all flex items-center justify-center gap-2">
                <Download className="w-4 h-4" />导出蓝图
              </button>
            </div>

            {structures.length > 0 && (
              <div>
                <h4 className="text-sm font-medium text-white/60 mb-2">已导出的蓝图</h4>
                <div className="space-y-2">
                  {structures.map((s, i) => (
                    <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
                      <div className="w-10 h-10 rounded-xl bg-mc-green/10 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-mc-green" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-medium text-white truncate">{s.name}</h4>
                        <p className="text-xs text-white/40">{s.sizeX}×{s.sizeY}×{s.sizeZ} · {s.blockCount} 方块</p>
                      </div>
                      <button onClick={async () => {
                        try { await worldManager.shareBlueprint(s.filePath) } catch {}
                      }} className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                        <Share2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
