import { useState, useEffect, useCallback } from 'react'
import {
  Search, Download, Package, AlertCircle, X, Loader2, Grid3X3, List,
  Trash2, ToggleLeft, ToggleRight, ExternalLink, User, Calendar,
  Layers, ChevronRight, Star, TrendingUp,
  CheckCircle2, Clock, Hash, Monitor, XCircle, ArrowLeft,
  RefreshCw, SortAsc, HardDrive, AlertTriangle, Plus,
  ShoppingCart, Play, Sparkles, FileCode, Globe, Share2,
  Copy, Cpu, Database, Gauge, Link2, Eye,
  ChevronDown, Settings,
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { modManager } from '../core/mod/modManager'
import { downloadManager } from '../core/download/downloadManager'
import type {
  ModInfo, ModSearchOptions, ModLoaderType, LocalMod, ModFile,
  BatchInstallTask, ModPlayStyle, ModUpdateInfo, ModConflict, ModJarMetadata,
  PerformanceImpact, ModShareCard, ConfigMigration,
} from '../types/mod'
import {
  PLAY_STYLE_CONFIG, PERFORMANCE_LABELS, MOD_CHINESE_NAMES,
  LOADER_CONFIG, MOD_ASSOCIATIONS, MOD_RATINGS, MOD_PERFORMANCE_DETAILS,
  CHINESE_COMMUNITY_TAGS,
} from '../types/mod'

interface ModsPageProps {
  gameVersion?: string
  modLoader?: ModLoaderType
}

const getModGradient = (modId: string) => {
  const gradients = [
    'from-emerald-400/20 to-teal-500/20', 'from-blue-400/20 to-indigo-500/20',
    'from-violet-400/20 to-purple-500/20', 'from-amber-400/20 to-orange-500/20',
    'from-rose-400/20 to-pink-500/20', 'from-cyan-400/20 to-sky-500/20',
    'from-lime-400/20 to-green-500/20', 'from-fuchsia-400/20 to-pink-500/20',
  ]
  let hash = 0
  for (let i = 0; i < modId.length; i++) hash = modId.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

const formatDate = (dateStr: string) => {
  if (!dateStr) return '未知'
  const diffDays = Math.floor((Date.now() - new Date(dateStr).getTime()) / 86400000)
  if (diffDays < 1) return '今天'
  if (diffDays < 7) return `${diffDays} 天前`
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} 周前`
  if (diffDays < 365) return `${Math.floor(diffDays / 30)} 个月前`
  return `${Math.floor(diffDays / 365)} 年前`
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '未知'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

function PerformanceBadge({ impact }: { impact?: string }) {
  if (!impact || impact === 'none') return null
  const info = PERFORMANCE_LABELS[impact as keyof typeof PERFORMANCE_LABELS]
  if (!info) return null
  return (
    <span className="px-1.5 py-0.5 text-[10px] rounded-lg border" style={{
      background: `${info.color}15`, color: info.color, borderColor: `${info.color}30`,
    }}>
      {info.emoji} {info.label}
    </span>
  )
}

function SourceBadge({ source }: { source: string }) {
  const config: Record<string, { label: string; color: string }> = {
    modrinth: { label: 'Modrinth', color: '#1bd96a' },
    curseforge: { label: 'CurseForge', color: '#f16436' },
    local: { label: '本地', color: '#888' },
  }
  const info = config[source] || config.local
  return (
    <span className="px-1.5 py-0.5 text-[10px] rounded-lg" style={{ background: `${info.color}20`, color: info.color }}>
      {info.label}
    </span>
  )
}

function LoaderBadge({ loader }: { loader: ModLoaderType }) {
  const cfg = LOADER_CONFIG[loader] || LOADER_CONFIG.unknown
  return (
    <span className="px-2 py-0.5 text-[10px] rounded-lg border inline-flex items-center gap-1"
      style={{ background: cfg.bgColor, color: cfg.color, borderColor: cfg.borderColor }}>
      <span className="text-[9px]">{cfg.icon}</span>
      {cfg.label}
    </span>
  )
}

function StarRating({ score, size = 12 }: { score: number; size?: number }) {
  const full = Math.floor(score)
  const half = score - full >= 0.5
  const empty = 5 - full - (half ? 1 : 0)
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: full }).map((_, i) => (
        <Star key={`f${i}`} size={size} className="fill-amber-400 text-amber-400" />
      ))}
      {half && <Star key="h" size={size} className="fill-amber-400/50 text-amber-400" />}
      {Array.from({ length: empty }).map((_, i) => (
        <Star key={`e${i}`} size={size} className="text-white/20" />
      ))}
      <span className="text-[10px] text-white/40 ml-1">{score.toFixed(1)}</span>
    </span>
  )
}

function SafetyBadge({ level }: { level: 'safe' | 'caution' | 'risky' }) {
  const config = {
    safe: { label: '安全更新', color: '#22c55e', bg: 'rgba(34,197,94,0.1)', border: 'rgba(34,197,94,0.2)', icon: CheckCircle2 },
    caution: { label: '谨慎更新', color: '#eab308', bg: 'rgba(234,179,8,0.1)', border: 'rgba(234,179,8,0.2)', icon: AlertTriangle },
    risky: { label: '风险更新', color: '#ef4444', bg: 'rgba(239,68,68,0.1)', border: 'rgba(239,68,68,0.2)', icon: XCircle },
  }
  const c = config[level]
  const Icon = c.icon
  return (
    <span className="px-2 py-0.5 text-[10px] rounded-lg border inline-flex items-center gap-1"
      style={{ background: c.bg, color: c.color, borderColor: c.border }}>
      <Icon className="w-3 h-3" />{c.label}
    </span>
  )
}

function ConflictTypeBadge({ type }: { type: string }) {
  const config: Record<string, { label: string; color: string }> = {
    'id-conflict': { label: 'ID冲突', color: '#ef4444' },
    'known-incompat': { label: '已知不兼容', color: '#f97316' },
    'loader-mismatch': { label: '加载器冲突', color: '#eab308' },
    'version-mismatch': { label: '版本冲突', color: '#8b5cf6' },
    'class-conflict': { label: '类加载冲突', color: '#ec4899' },
    'mixin-conflict': { label: 'MixIn冲突', color: '#f43f5e' },
    'event-bus-conflict': { label: '事件总线冲突', color: '#a855f7' },
  }
  const c = config[type] || { label: type, color: '#6b7280' }
  return (
    <span className="px-1.5 py-0.5 text-[9px] rounded" style={{ background: `${c.color}20`, color: c.color }}>
      {c.label}
    </span>
  )
}

export default function ModsPage({ gameVersion = '1.20.1', modLoader = 'fabric' }: ModsPageProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [mods, setMods] = useState<ModInfo[]>([])
  const [localMods, setLocalMods] = useState<LocalMod[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [selectedMod, setSelectedMod] = useState<ModInfo | null>(null)
  const [selectedLocalMod, setSelectedLocalMod] = useState<LocalMod | null>(null)
  const [installingModId, setInstallingModId] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'search' | 'local' | 'recommend' | 'updates' | 'batch'>('search')
  const [sortBy, setSortBy] = useState<ModSearchOptions['sortBy']>('relevance')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [installProgress, setInstallProgress] = useState<{ modId: string; progress: number } | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [searchSources, setSearchSources] = useState<ModInfo['source'][]>(['modrinth', 'curseforge'])
  const [batchQueue, setBatchQueue] = useState<BatchInstallTask[]>([])
  const [recommendations, setRecommendations] = useState<{ playStyle: ModPlayStyle; mods: ModInfo[] }[]>([])
  const [modUpdates, setModUpdates] = useState<ModUpdateInfo[]>([])
  const [conflicts, setConflicts] = useState<ModConflict[]>([])
  const [selectedPlayStyle, setSelectedPlayStyle] = useState<ModPlayStyle>('optimization')
  const [analyzing, setAnalyzing] = useState<string | null>(null)
  const [jarMetadata, setJarMetadata] = useState<ModJarMetadata | null>(null)
  const [shareCard, setShareCard] = useState<ModShareCard | null>(null)
  const [performanceEstimate, setPerformanceEstimate] = useState<{
    estimatedFPSImpact: number; estimatedStartupImpact: number; estimatedMemoryMB: number;
    riskLevel: PerformanceImpact; recommendations: string[]
  } | null>(null)
  const [configMigration, setConfigMigration] = useState<ConfigMigration | null>(null)
  const [showPerformancePanel, setShowPerformancePanel] = useState(false)

  const searchMods = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      if (!searchQuery.trim()) {
        const recommended = await modManager.getRecommendedMods(gameVersion, modLoader)
        setMods(recommended)
      } else {
        const result = await modManager.searchMods({
          query: searchQuery, gameVersion, modLoader, sortBy, limit: 24, sources: searchSources as any,
        })
        setMods(result.mods)
      }
    } catch (err) {
      setError('搜索模组失败，请检查网络连接')
    } finally {
      setIsLoading(false)
    }
  }, [searchQuery, gameVersion, modLoader, sortBy, searchSources])

  const scanLocalMods = useCallback(async () => {
    try {
      const settings = await window.minecraftAPI.getSettings()
      const modsDir = `${settings.gameDir}/mods`
      const mods = await modManager.scanLocalMods(modsDir)
      for (const mod of mods) {
        mod.chineseName = MOD_CHINESE_NAMES[mod.id] || MOD_CHINESE_NAMES[mod.id.replace(/-/g, '')] || undefined
        const idNorm = mod.id.replace(/-/g, '')
        mod.rating = MOD_RATINGS[mod.id] || MOD_RATINGS[idNorm] || undefined
        mod.performanceDetail = MOD_PERFORMANCE_DETAILS[mod.id] || MOD_PERFORMANCE_DETAILS[idNorm] || undefined
        mod.chineseTags = CHINESE_COMMUNITY_TAGS[mod.id] || CHINESE_COMMUNITY_TAGS[idNorm] || undefined
      }
      setLocalMods(mods)
      const detectedConflicts = await modManager.checkConflicts(mods)
      setConflicts(detectedConflicts)

      const sysInfo = await window.minecraftAPI.getSystemInfo()
      const estimate = await modManager.estimatePerformanceImpact(mods, sysInfo.totalMemory)
      setPerformanceEstimate(estimate)
    } catch (err) {
      console.error('Scan local mods error:', err)
    }
  }, [])

  const loadRecommendations = useCallback(async () => {
    setIsLoading(true)
    try {
      const styles: ModPlayStyle[] = ['optimization', 'tech', 'magic', 'adventure', 'building', 'casual', 'utility']
      const results: { playStyle: ModPlayStyle; mods: ModInfo[] }[] = []
      for (const style of styles) {
        try {
          const rec = await modManager.getRecommendationsByPlayStyle(style, gameVersion, modLoader)
          results.push({ playStyle: style, mods: rec.mods })
        } catch {}
      }
      setRecommendations(results)
    } finally {
      setIsLoading(false)
    }
  }, [gameVersion, modLoader])

  const checkUpdates = useCallback(async () => {
    setIsLoading(true)
    try {
      const updates = await modManager.checkModUpdates(localMods, gameVersion, modLoader)
      setModUpdates(updates)
    } catch (err) {
      console.error('Check updates error:', err)
    } finally {
      setIsLoading(false)
    }
  }, [localMods, gameVersion, modLoader])

  const installMod = async (mod: ModInfo) => {
    setInstallingModId(mod.id)
    setInstallProgress({ modId: mod.id, progress: 0 })
    try {
      const versions = await modManager.getModVersions(mod.sourceId || mod.id, gameVersion, modLoader, mod.source)
      if (versions.length === 0) throw new Error('没有找到兼容的模组版本')
      const latestVersion = versions.find(v => v.releaseType === 'release') || versions[0]
      const settings = await window.minecraftAPI.getSettings()
      const targetPath = `${settings.gameDir}/mods/${mod.id}-${latestVersion.version}.jar`
      const progressInterval = setInterval(() => {
        setInstallProgress(prev => prev ? { ...prev, progress: Math.min(prev.progress + Math.random() * 12, 90) } : null)
      }, 300)
      await downloadManager.addTask(latestVersion.downloadUrl, targetPath, { expectedHash: latestVersion.id, threads: 4 })
      clearInterval(progressInterval)
      setInstallProgress({ modId: mod.id, progress: 100 })
      await scanLocalMods()
      setTimeout(() => setInstallProgress(null), 1200)
    } catch (err) {
      setError(`安装模组失败: ${err}`)
      setInstallProgress(null)
    } finally {
      setInstallingModId(null)
    }
  }

  const toggleMod = async (mod: LocalMod) => {
    try { await modManager.toggleMod(mod.filePath, !mod.isEnabled); await scanLocalMods() } catch {}
  }

  const deleteMod = async (mod: LocalMod) => {
    if (!confirm(`确定要删除模组 "${mod.name}" 吗？`)) return
    try { await modManager.deleteMod(mod.filePath); await scanLocalMods() } catch {}
  }

  const addToBatch = (mod: ModInfo) => {
    const task: BatchInstallTask = {
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      mod, status: 'pending', progress: 0,
    }
    setBatchQueue(prev => [...prev, task])
  }

  const executeBatchInstall = async () => {
    const settings = await window.minecraftAPI.getSettings()
    const modsDir = `${settings.gameDir}/mods`
    modManager.clearBatchQueue()
    modManager.addToBatchQueue(batchQueue.map(t => t.mod))
    await modManager.executeBatchInstall(modsDir, gameVersion, modLoader, (task) => {
      setBatchQueue(prev => prev.map(t => t.id === task.id ? { ...task } : t))
    })
    await scanLocalMods()
  }

  const analyzeJar = async (mod: LocalMod) => {
    setAnalyzing(mod.filePath)
    try {
      const metadata = await window.minecraftAPI.analyzeModJar(mod.filePath)
      setJarMetadata(metadata as any)
    } catch (err) {
      console.error('Analyze failed:', err)
    } finally {
      setAnalyzing(null)
    }
  }

  const handleShare = async (mod: ModInfo | LocalMod) => {
    const card = await modManager.generateShareCard(mod)
    setShareCard(card)
  }

  const handleCheckConfigMigration = async (mod: LocalMod, newVersion: string) => {
    const migration = await modManager.checkConfigMigration(mod, newVersion)
    setConfigMigration(migration)
  }

  const copyShareText = () => {
    if (!shareCard) return
    const text = `🎮 ${shareCard.chineseName || shareCard.name} v${shareCard.version}\n${shareCard.description}\n🔗 ${shareCard.shareUrl || shareCard.downloadUrl || ''}`
    navigator.clipboard.writeText(text)
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await scanLocalMods()
    setTimeout(() => setIsRefreshing(false), 500)
  }

  useEffect(() => { searchMods(); scanLocalMods() }, [])
  useEffect(() => {
    const timer = setTimeout(() => { if (activeTab === 'search') searchMods() }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery, sortBy, searchSources])
  useEffect(() => { if (activeTab === 'local') scanLocalMods() }, [activeTab])
  useEffect(() => { if (activeTab === 'recommend' && recommendations.length === 0) loadRecommendations() }, [activeTab])
  useEffect(() => { if (activeTab === 'updates' && modUpdates.length === 0) checkUpdates() }, [activeTab])

  const loaderCfg = LOADER_CONFIG[modLoader] || LOADER_CONFIG.unknown

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-mc-green/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-mc-green" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-white">模组管理</h2>
              <p className="text-xs text-white/40 mt-0.5 flex items-center gap-1.5">
                {gameVersion}
                <span className="px-1.5 py-0.5 text-[9px] rounded" style={{
                  background: loaderCfg.bgColor, color: loaderCfg.color, borderColor: loaderCfg.borderColor,
                  border: `1px solid ${loaderCfg.borderColor}`,
                }}>
                  {loaderCfg.icon} {loaderCfg.label}
                </span>
                · {localMods.filter(m => m.isEnabled).length}/{localMods.length} 已启用
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {conflicts.length > 0 && (
              <button
                onClick={() => setActiveTab('local')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-medium"
              >
                <AlertTriangle className="w-3.5 h-3.5" />
                {conflicts.length} 冲突
              </button>
            )}
            {performanceEstimate && performanceEstimate.riskLevel !== 'none' && (
              <button
                onClick={() => setShowPerformancePanel(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-medium"
              >
                <Gauge className="w-3.5 h-3.5" />
                性能评估
              </button>
            )}
            {batchQueue.length > 0 && (
              <button
                onClick={() => setActiveTab('batch')}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-mc-green/10 border border-mc-green/20 text-mc-green text-xs font-medium"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                {batchQueue.length}
              </button>
            )}
            <button onClick={handleRefresh} className={`p-2.5 rounded-xl glass hover:bg-white/5 transition-all ${isRefreshing ? 'animate-spin' : ''}`}>
              <RefreshCw className="w-4 h-4 text-white/50" />
            </button>
            <div className="glass rounded-xl p-1 flex items-center">
              <button onClick={() => setViewMode('grid')} className={`p-2 rounded-lg transition-all ${viewMode === 'grid' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button onClick={() => setViewMode('list')} className={`p-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-white/10 text-white' : 'text-white/40'}`}>
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 overflow-x-auto pb-1">
          {([
            { key: 'search', label: '搜索', icon: Search },
            { key: 'local', label: '已安装', icon: Package },
            { key: 'recommend', label: '推荐', icon: Sparkles },
            { key: 'updates', label: '更新', icon: Download },
            { key: 'batch', label: '队列', icon: ShoppingCart },
          ] as const).map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                activeTab === key ? 'bg-mc-green/15 text-mc-green border border-mc-green/25' : 'glass text-white/50 hover:text-white/70'
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
              {key === 'local' && <span className="text-xs opacity-60">({localMods.length})</span>}
              {key === 'batch' && batchQueue.length > 0 && <span className="text-xs opacity-60">({batchQueue.length})</span>}
              {key === 'updates' && modUpdates.length > 0 && <span className="text-xs opacity-60">({modUpdates.length})</span>}
            </button>
          ))}
        </div>

        {activeTab === 'search' && (
          <div className="flex gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
              <input
                type="text" placeholder="搜索模组（支持中文名）..." value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 text-sm"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="absolute right-3 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-white/10">
                  <X className="w-3.5 h-3.5 text-white/40" />
                </button>
              )}
            </div>
            <div className="flex items-center gap-1 glass rounded-xl p-1">
              {(['modrinth', 'curseforge'] as const).map(src => (
                <button
                  key={src}
                  onClick={() => setSearchSources(prev => prev.includes(src) ? prev.filter(s => s !== src) : [...prev, src])}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    searchSources.includes(src) ? 'bg-white/10 text-white' : 'text-white/30'
                  }`}
                >
                  {src === 'modrinth' ? 'Modrinth' : 'CurseForge'}
                </button>
              ))}
            </div>
            <div className="relative">
              <SortAsc className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30 pointer-events-none" />
              <select value={sortBy} onChange={e => setSortBy(e.target.value as any)}
                className="pl-9 pr-8 py-2.5 glass rounded-xl text-white focus:outline-none text-sm appearance-none cursor-pointer">
                <option value="relevance">相关度</option>
                <option value="downloads">下载量</option>
                <option value="updated">最近更新</option>
                <option value="newest">最新发布</option>
              </select>
            </div>
          </div>
        )}
      </div>

      <div className="flex-1 overflow-auto px-6 pb-6">
        <AnimatePresence>
          {error && (
            <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-center gap-3 text-red-400">
              <AlertCircle className="w-5 h-5 shrink-0" />
              <span className="text-sm">{error}</span>
              <button onClick={() => setError(null)} className="ml-auto p-1 rounded hover:bg-red-500/10"><X className="w-4 h-4" /></button>
            </motion.div>
          )}
        </AnimatePresence>

        {activeTab === 'search' && (
          isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="glass rounded-2xl overflow-hidden animate-pulse">
                  <div className="h-28 bg-white/5" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-white/5 rounded w-3/4" />
                    <div className="h-3 bg-white/5 rounded w-full" />
                  </div>
                </div>
              ))}
            </div>
          ) : mods.length === 0 ? (
            <div className="text-center py-20">
              <Search className="w-10 h-10 text-white/20 mx-auto mb-3" />
              <p className="text-white/40 text-sm">未找到模组</p>
            </div>
          ) : (
            <div className={viewMode === 'grid' ? 'grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4' : 'space-y-2'}>
              {mods.map((mod, index) => (
                <motion.div key={mod.id} layout initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.03 }}
                  whileHover={{ y: -4, transition: { duration: 0.2 } }}
                  onClick={() => setSelectedMod(mod)}
                  className="glass rounded-2xl overflow-hidden cursor-pointer group"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  {viewMode === 'grid' ? (
                    <>
                      <div className={`h-28 bg-gradient-to-br ${getModGradient(mod.id)} relative overflow-hidden`}>
                        <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
                        <div className="absolute inset-0 flex items-center justify-center">
                          {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-14 h-14 rounded-2xl object-cover shadow-lg" /> : <Package className="w-10 h-10 text-white/20" />}
                        </div>
                        <div className="absolute top-2 right-2 flex gap-1">
                          <SourceBadge source={mod.source} />
                          <PerformanceBadge impact={mod.performanceImpact} />
                        </div>
                      </div>
                      <div className="p-4">
                        <h3 className="font-semibold text-white truncate text-sm">{mod.chineseName || mod.name}</h3>
                        {mod.chineseName && mod.chineseName !== mod.name && (
                          <p className="text-xs text-white/30 truncate">{mod.name}</p>
                        )}
                        <p className="text-xs text-white/40 line-clamp-2 mt-1 h-8 leading-relaxed">{mod.description}</p>
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          <LoaderBadge loader={mod.modLoader} />
                          {mod.chineseTags?.slice(0, 2).map(tag => (
                            <span key={tag} className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 text-white/40">{tag}</span>
                          ))}
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          {mod.rating && <StarRating score={mod.rating.score} size={10} />}
                          {mod.downloads && <span className="text-[10px] text-white/30">{formatNumber(mod.downloads)} 下载</span>}
                        </div>
                        <div className="mt-3 flex gap-2">
                          <button onClick={e => { e.stopPropagation(); installMod(mod) }}
                            disabled={installingModId === mod.id}
                            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green hover:bg-mc-green/25 transition-all disabled:opacity-50 text-xs font-semibold">
                            {installingModId === mod.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                            安装
                          </button>
                          <button onClick={e => { e.stopPropagation(); addToBatch(mod) }}
                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={e => { e.stopPropagation(); handleShare(mod) }}
                            className="p-2 rounded-xl bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                            <Share2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="flex items-center gap-4 p-4">
                      <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getModGradient(mod.id)} flex items-center justify-center shrink-0`}>
                        {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-7 h-7 rounded object-cover" /> : <Package className="w-5 h-5 text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-white text-sm truncate">{mod.chineseName || mod.name}</h3>
                          <SourceBadge source={mod.source} />
                          <PerformanceBadge impact={mod.performanceImpact} />
                          {mod.rating && <StarRating score={mod.rating.score} size={10} />}
                        </div>
                        <p className="text-xs text-white/40 truncate">{mod.description}</p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button onClick={e => { e.stopPropagation(); handleShare(mod) }}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                          <Share2 className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); addToBatch(mod) }}
                          className="p-2 rounded-lg bg-white/5 text-white/40 hover:text-white hover:bg-white/10 transition-all">
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={e => { e.stopPropagation(); installMod(mod) }}
                          disabled={installingModId === mod.id}
                          className="w-8 h-8 rounded-lg bg-mc-green/15 flex items-center justify-center text-mc-green hover:bg-mc-green/25 transition-colors disabled:opacity-50">
                          {installingModId === mod.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )
        )}

        {activeTab === 'local' && (
          <div className="space-y-2">
            {performanceEstimate && (
              <div className="mb-4 glass rounded-2xl p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-medium text-white/60 flex items-center gap-2">
                    <Gauge className="w-4 h-4" /> 性能影响评估
                  </h3>
                  <button onClick={() => setShowPerformancePanel(!showPerformancePanel)}
                    className="text-xs text-white/30 hover:text-white/50 flex items-center gap-1">
                    <ChevronDown className={`w-3 h-3 transition-transform ${showPerformancePanel ? 'rotate-180' : ''}`} />
                    详情
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="glass rounded-xl p-3 text-center">
                    <Cpu className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{performanceEstimate.estimatedFPSImpact > 0 ? '+' : ''}{performanceEstimate.estimatedFPSImpact}%</p>
                    <p className="text-[10px] text-white/40">FPS 影响</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{performanceEstimate.estimatedStartupImpact > 0 ? '+' : ''}{performanceEstimate.estimatedStartupImpact}s</p>
                    <p className="text-[10px] text-white/40">启动影响</p>
                  </div>
                  <div className="glass rounded-xl p-3 text-center">
                    <Database className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                    <p className="text-lg font-bold text-white">{performanceEstimate.estimatedMemoryMB > 0 ? '+' : ''}{performanceEstimate.estimatedMemoryMB}MB</p>
                    <p className="text-[10px] text-white/40">内存影响</p>
                  </div>
                </div>
                {showPerformancePanel && performanceEstimate.recommendations.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {performanceEstimate.recommendations.map((rec, i) => (
                      <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-amber-500/5 border border-amber-500/10">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-300/80">{rec}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {conflicts.length > 0 && (
              <div className="mb-4 glass rounded-2xl p-4">
                <h3 className="text-sm font-medium text-amber-400 mb-3 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4" /> 检测到 {conflicts.length} 个冲突
                </h3>
                <div className="space-y-2">
                  {conflicts.map((c, i) => (
                    <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: c.severity === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(245,158,11,0.1)' }}>
                      {c.severity === 'error' ? <XCircle className="w-4 h-4 text-red-400" /> : <AlertTriangle className="w-4 h-4 text-amber-400" />}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <ConflictTypeBadge type={c.type} />
                          <span className="text-xs" style={{ color: c.severity === 'error' ? '#f87171' : '#fbbf24' }}>{c.reason}</span>
                        </div>
                        {c.detail && <p className="text-[10px] text-white/30 mt-0.5">{c.detail}</p>}
                      </div>
                      {c.suggestion && (
                        <span className="text-[10px] text-white/30 shrink-0">{c.suggestion}</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {localMods.length === 0 ? (
              <div className="text-center py-20">
                <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">还没有安装任何模组</p>
              </div>
            ) : (
              localMods.map(mod => (
                <motion.div key={mod.filePath} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  whileHover={{ x: 4 }} onClick={() => setSelectedLocalMod(mod)}
                  className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-all cursor-pointer group"
                  style={{ border: '1px solid rgba(255,255,255,0.06)' }}>
                  <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${getModGradient(mod.name)} flex items-center justify-center shrink-0`}>
                    {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-7 h-7 rounded object-cover" /> : <Package className="w-5 h-5 text-white/30" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-white text-sm">{mod.chineseName || mod.name}</h3>
                      <LoaderBadge loader={mod.modLoader} />
                      <PerformanceBadge impact={mod.performanceImpact} />
                      {mod.rating && <StarRating score={mod.rating.score} size={10} />}
                      {mod.isEnabled ? (
                        <span className="px-2 py-0.5 text-[10px] rounded-lg bg-mc-green/10 text-mc-green border border-mc-green/20">已启用</span>
                      ) : (
                        <span className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 text-white/40 border border-white/10">已禁用</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-white/40">{mod.version} · {formatFileSize(mod.fileSize)}</span>
                      {mod.sha256 && <span className="text-[9px] text-white/20 font-mono">SHA256:{mod.sha256.slice(0, 8)}...</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={e => { e.stopPropagation(); handleShare(mod) }}
                      className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="分享">
                      <Share2 className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); analyzeJar(mod) }}
                      className="p-2 rounded-lg text-white/30 hover:text-white hover:bg-white/10 transition-colors" title="分析JAR">
                      <FileCode className="w-4 h-4" />
                    </button>
                    <button onClick={e => { e.stopPropagation(); toggleMod(mod) }} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                      {mod.isEnabled ? <ToggleRight className="w-5 h-5 text-mc-green" /> : <ToggleLeft className="w-5 h-5 text-white/30" />}
                    </button>
                    <button onClick={e => { e.stopPropagation(); deleteMod(mod) }} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}

        {activeTab === 'recommend' && (
          isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>
          ) : (
            <div className="space-y-6">
              <div className="flex gap-2 overflow-x-auto pb-2">
                {Object.entries(PLAY_STYLE_CONFIG).map(([key, config]) => (
                  <button key={key}
                    onClick={() => setSelectedPlayStyle(key as ModPlayStyle)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm transition-all whitespace-nowrap ${
                      selectedPlayStyle === key ? 'bg-mc-green/15 text-mc-green border border-mc-green/25' : 'glass text-white/50 hover:text-white/70'
                    }`}>
                    <span>{config.icon}</span>
                    {config.label}
                  </button>
                ))}
              </div>
              {recommendations.filter(r => r.playStyle === selectedPlayStyle).map(rec => {
                const associations = MOD_ASSOCIATIONS
                return (
                  <div key={rec.playStyle}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{PLAY_STYLE_CONFIG[rec.playStyle].icon}</span>
                      <h3 className="text-lg font-bold text-white">{PLAY_STYLE_CONFIG[rec.playStyle].label}</h3>
                      <span className="text-xs text-white/40">{PLAY_STYLE_CONFIG[rec.playStyle].description}</span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rec.mods.map(mod => (
                        <div key={mod.id} className="glass rounded-xl p-4 hover:bg-white/5 transition-all cursor-pointer"
                          onClick={() => setSelectedMod(mod)}>
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${getModGradient(mod.id)} flex items-center justify-center shrink-0`}>
                              {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-6 h-6 rounded object-cover" /> : <Package className="w-4 h-4 text-white/30" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="text-sm font-medium text-white truncate">{mod.chineseName || mod.name}</h4>
                              <div className="flex items-center gap-2 mt-0.5">
                                <PerformanceBadge impact={mod.performanceImpact} />
                                {mod.rating && <StarRating score={mod.rating.score} size={10} />}
                                {mod.downloads && <span className="text-[10px] text-white/30">{formatNumber(mod.downloads)}</span>}
                              </div>
                            </div>
                            <button onClick={e => { e.stopPropagation(); addToBatch(mod) }}
                              className="p-1.5 rounded-lg bg-mc-green/10 text-mc-green hover:bg-mc-green/20 transition-all">
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {associations[mod.id] && (
                            <div className="mt-2 flex flex-wrap gap-1">
                              <span className="text-[9px] text-white/30">共装:</span>
                              {associations[mod.id].filter(a => a.percentage >= 70).slice(0, 3).map(a => (
                                <span key={a.modId} className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/40">
                                  {MOD_CHINESE_NAMES[a.modId] || a.modId} {a.percentage}%
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )
        )}

        {activeTab === 'updates' && (
          isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="w-8 h-8 text-white/20 animate-spin" /></div>
          ) : modUpdates.length === 0 ? (
            <div className="text-center py-20">
              <CheckCircle2 className="w-10 h-10 text-mc-green/40 mx-auto mb-3" />
              <p className="text-white/40 text-sm">所有模组已是最新版本</p>
            </div>
          ) : (
            <div className="space-y-2">
              {modUpdates.map(update => (
                <div key={update.modId} className="glass rounded-xl p-4 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-mc-green/10 flex items-center justify-center shrink-0">
                    <Download className="w-5 h-5 text-mc-green" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-medium text-white">{update.modName || update.modId}</h3>
                      <SafetyBadge level={update.safetyLevel} />
                    </div>
                    <p className="text-xs text-white/40">
                      {update.currentVersion} → {update.latestVersion}
                    </p>
                    {update.versionDiff && (
                      <div className="flex items-center gap-2 mt-1">
                        {update.versionDiff.majorChanged && <span className="px-1.5 py-0.5 text-[9px] rounded bg-red-400/10 text-red-400">主版本变更</span>}
                        {update.versionDiff.minorChanged && <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-400/10 text-amber-400">次版本变更</span>}
                        {update.versionDiff.patchChanged && <span className="px-1.5 py-0.5 text-[9px] rounded bg-green-400/10 text-green-400">补丁更新</span>}
                        {update.versionDiff.isDowngrade && <span className="px-1.5 py-0.5 text-[9px] rounded bg-red-400/10 text-red-400">降级</span>}
                      </div>
                    )}
                  </div>
                  <button className="px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-xs font-semibold hover:bg-mc-green/25 transition-all">
                    更新
                  </button>
                </div>
              ))}
            </div>
          )
        )}

        {activeTab === 'batch' && (
          <div className="space-y-4">
            {batchQueue.length === 0 ? (
              <div className="text-center py-20">
                <ShoppingCart className="w-10 h-10 text-white/20 mx-auto mb-3" />
                <p className="text-white/40 text-sm">安装队列为空</p>
                <p className="text-xs text-white/30 mt-1">在搜索结果中点击 + 添加模组到队列</p>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">{batchQueue.length} 个模组待安装</span>
                  <div className="flex gap-2">
                    <button onClick={() => setBatchQueue([])} className="px-3 py-1.5 rounded-lg text-xs text-white/40 hover:text-white hover:bg-white/5 transition-all">
                      清空
                    </button>
                    <button onClick={executeBatchInstall}
                      className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all">
                      <Play className="w-4 h-4" />
                      批量安装
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  {batchQueue.map(task => (
                    <div key={task.id} className="glass rounded-xl p-4 flex items-center gap-4">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                        task.status === 'done' ? 'bg-mc-green/10' : task.status === 'error' || task.status === 'conflict' ? 'bg-red-400/10' : 'bg-white/5'
                      }`}>
                        {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-mc-green" /> :
                         task.status === 'error' || task.status === 'conflict' ? <XCircle className="w-5 h-5 text-red-400" /> :
                         task.status === 'downloading' ? <Loader2 className="w-5 h-5 text-white/40 animate-spin" /> :
                         <Package className="w-5 h-5 text-white/30" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-medium text-white">{task.mod.chineseName || task.mod.name}</h3>
                        <p className="text-xs text-white/40">
                          {task.status === 'pending' && '等待安装'}
                          {task.status === 'resolving' && '解析依赖中...'}
                          {task.status === 'downloading' && `下载中 ${task.progress}%`}
                          {task.status === 'installing' && '安装中...'}
                          {task.status === 'done' && '安装完成'}
                          {task.status === 'error' && `失败: ${task.error}`}
                          {task.status === 'conflict' && `冲突: ${task.error}`}
                        </p>
                      </div>
                      <button onClick={() => setBatchQueue(prev => prev.filter(t => t.id !== task.id))}
                        className="p-1.5 rounded-lg text-white/30 hover:text-red-400 hover:bg-red-400/10 transition-all">
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedMod && (
          <ModDetailPanel mod={selectedMod} onClose={() => setSelectedMod(null)}
            gameVersion={gameVersion} modLoader={modLoader}
            onInstall={installMod} installingModId={installingModId} installProgress={installProgress}
            onAddToBatch={addToBatch} onShare={handleShare} />
        )}
        {selectedLocalMod && (
          <LocalModDetailPanel mod={selectedLocalMod} onClose={() => { setSelectedLocalMod(null); setJarMetadata(null); setConfigMigration(null) }}
            onToggle={toggleMod} onDelete={deleteMod}
            onAnalyze={analyzeJar} analyzing={analyzing === selectedLocalMod.filePath}
            jarMetadata={jarMetadata} onShare={handleShare}
            onCheckConfigMigration={handleCheckConfigMigration} configMigration={configMigration} />
        )}
        {shareCard && (
          <ShareCardModal card={shareCard} onClose={() => setShareCard(null)} onCopy={copyShareText} />
        )}
      </AnimatePresence>
    </div>
  )
}

function ShareCardModal({ card, onClose, onCopy }: { card: ModShareCard; onClose: () => void; onCopy: () => void }) {
  const [copied, setCopied] = useState(false)
  const handleCopy = () => {
    onCopy()
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }} onClick={e => e.stopPropagation()}
        className="glass-strong rounded-2xl w-full max-w-sm overflow-hidden"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-12 h-12 rounded-xl bg-mc-green/10 flex items-center justify-center">
              <Share2 className="w-6 h-6 text-mc-green" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">分享模组</h3>
              <p className="text-xs text-white/40">分享给好友</p>
            </div>
            <button onClick={onClose} className="ml-auto p-2 rounded-lg hover:bg-white/10 text-white/40">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="glass rounded-xl p-4 mb-4">
            <div className="flex items-center gap-3">
              <Package className="w-8 h-8 text-white/30" />
              <div>
                <h4 className="text-white font-medium">{card.chineseName || card.name}</h4>
                {card.chineseName && card.chineseName !== card.name && (
                  <p className="text-xs text-white/40">{card.name}</p>
                )}
                <p className="text-xs text-white/30 mt-0.5">v{card.version}</p>
              </div>
            </div>
            <p className="text-xs text-white/50 mt-3 line-clamp-2">{card.description}</p>
            {card.shareUrl && (
              <div className="mt-3 flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5">
                <Link2 className="w-3.5 h-3.5 text-white/30 shrink-0" />
                <span className="text-[10px] text-white/40 truncate flex-1">{card.shareUrl}</span>
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-semibold hover:bg-mc-green/25 transition-all">
              {copied ? <CheckCircle2 className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              {copied ? '已复制' : '复制分享文本'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ModDetailPanel({ mod, onClose, gameVersion, modLoader, onInstall, installingModId, installProgress, onAddToBatch, onShare }: {
  mod: ModInfo; onClose: () => void; gameVersion: string; modLoader: ModLoaderType
  onInstall: (mod: ModInfo) => void; installingModId: string | null
  installProgress: { modId: string; progress: number } | null; onAddToBatch: (mod: ModInfo) => void
  onShare: (mod: ModInfo) => void
}) {
  const [activeSection, setActiveSection] = useState<'overview' | 'versions' | 'dependencies' | 'associations'>('overview')
  const [modVersions, setModVersions] = useState<ModFile[]>([])
  const [isLoadingVersions, setIsLoadingVersions] = useState(false)

  useEffect(() => {
    if (activeSection === 'versions') {
      setIsLoadingVersions(true)
      modManager.getModVersions(mod.sourceId || mod.id, gameVersion, modLoader, mod.source)
        .then(setModVersions).catch(() => {}).finally(() => setIsLoadingVersions(false))
    }
  }, [activeSection, mod.sourceId, gameVersion, modLoader, mod.source])

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  const isInstalling = installingModId === mod.id
  const _currentProgress = installProgress?.modId === mod.id ? installProgress.progress : 0
  const associations = MOD_ASSOCIATIONS[mod.id] || MOD_ASSOCIATIONS[mod.id.replace(/-/g, '')]
  const rating = mod.rating || MOD_RATINGS[mod.id] || MOD_RATINGS[mod.id.replace(/-/g, '')]
  const perfDetail = mod.performanceDetail || MOD_PERFORMANCE_DETAILS[mod.id] || MOD_PERFORMANCE_DETAILS[mod.id.replace(/-/g, '')]

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}
        className="glass-strong rounded-3xl w-full max-w-2xl max-h-[85vh] overflow-hidden flex flex-col shadow-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className={`h-32 bg-gradient-to-br ${getModGradient(mod.id)} relative shrink-0`}>
          <div className="absolute inset-0 bg-black/20" />
          <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="absolute top-3 right-3 flex gap-1">
            <SourceBadge source={mod.source} />
            <PerformanceBadge impact={mod.performanceImpact} />
          </div>
          <div className="absolute bottom-4 left-6 right-6 flex items-end gap-4">
            <div className="w-16 h-16 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
              {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-12 h-12 rounded-xl object-cover" /> : <Package className="w-8 h-8 text-white/40" />}
            </div>
            <div className="flex-1 min-w-0 pb-1">
              <h2 className="text-xl font-bold text-white truncate">{mod.chineseName || mod.name}</h2>
              {mod.chineseName && mod.chineseName !== mod.name && <p className="text-xs text-white/50">{mod.name}</p>}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                <LoaderBadge loader={mod.modLoader} />
                {mod.chineseTags?.map(tag => <span key={tag} className="px-2 py-0.5 text-[10px] rounded-lg bg-white/10 text-white/50">{tag}</span>)}
              </div>
            </div>
          </div>
        </div>
        <div className="flex border-b border-white/5 shrink-0">
          {(['overview', 'versions', 'dependencies', 'associations'] as const).map(tab => (
            <button key={tab} onClick={() => setActiveSection(tab)}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-all relative ${activeSection === tab ? 'text-white' : 'text-white/40 hover:text-white/60'}`}>
              {tab === 'overview' && '概览'}{tab === 'versions' && '版本'}{tab === 'dependencies' && '依赖'}{tab === 'associations' && '关联'}
              {activeSection === tab && <motion.div layoutId="detailTab" className="absolute bottom-0 left-4 right-4 h-0.5 bg-mc-green rounded-full" />}
            </button>
          ))}
        </div>
        <div className="flex-1 overflow-auto p-6">
          <AnimatePresence mode="wait">
            {activeSection === 'overview' && (
              <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-6">
                <div>
                  <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-2">描述</h3>
                  <p className="text-white/70 text-sm leading-relaxed">{mod.description || '暂无描述'}</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><User className="w-3.5 h-3.5" />作者</div>
                    <p className="text-white text-sm font-medium truncate">{mod.authors?.join(', ') || '未知'}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Download className="w-3.5 h-3.5" />下载量</div>
                    <p className="text-white text-sm font-medium">{mod.downloads ? formatNumber(mod.downloads) : '未知'}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Monitor className="w-3.5 h-3.5" />游戏版本</div>
                    <p className="text-white text-sm font-medium truncate">{mod.gameVersions?.slice(0, 3).join(', ') || '未知'}</p>
                  </div>
                  <div className="glass rounded-xl p-3">
                    <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Globe className="w-3.5 h-3.5" />来源</div>
                    <p className="text-white text-sm font-medium capitalize">{mod.source}</p>
                  </div>
                </div>

                {rating && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Star className="w-4 h-4" />评分
                    </h3>
                    <div className="flex items-center gap-4 mb-3">
                      <StarRating score={rating.score} size={16} />
                      <span className="text-2xl font-bold text-white">{rating.score.toFixed(1)}</span>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      {rating.curseforgeScore && (
                        <div className="text-center">
                          <p className="text-xs text-white/40">CurseForge</p>
                          <p className="text-sm font-medium text-orange-400">{rating.curseforgeScore.toFixed(1)}</p>
                        </div>
                      )}
                      {rating.modrinthScore && (
                        <div className="text-center">
                          <p className="text-xs text-white/40">Modrinth</p>
                          <p className="text-sm font-medium text-green-400">{rating.modrinthScore.toFixed(1)}</p>
                        </div>
                      )}
                      {rating.downloadCount && (
                        <div className="text-center">
                          <p className="text-xs text-white/40">下载量</p>
                          <p className="text-sm font-medium text-blue-400">{formatNumber(rating.downloadCount)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {perfDetail && (
                  <div className="glass rounded-xl p-4">
                    <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <Gauge className="w-4 h-4" />性能详情
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                      <div className="text-center">
                        <Cpu className="w-4 h-4 text-blue-400 mx-auto mb-1" />
                        <p className="text-sm font-bold text-white">{perfDetail.fpsImpact! > 0 ? '+' : ''}{perfDetail.fpsImpact}%</p>
                        <p className="text-[10px] text-white/40">FPS 影响</p>
                      </div>
                      <div className="text-center">
                        <Clock className="w-4 h-4 text-amber-400 mx-auto mb-1" />
                        <p className="text-sm font-bold text-white">{perfDetail.startupImpact! > 0 ? '+' : ''}{perfDetail.startupImpact}s</p>
                        <p className="text-[10px] text-white/40">启动影响</p>
                      </div>
                      <div className="text-center">
                        <Database className="w-4 h-4 text-purple-400 mx-auto mb-1" />
                        <p className="text-sm font-bold text-white">{perfDetail.memoryImpact! > 0 ? '+' : ''}{perfDetail.memoryImpact}MB</p>
                        <p className="text-[10px] text-white/40">内存影响</p>
                      </div>
                    </div>
                    {perfDetail.communityReports && (
                      <p className="text-[10px] text-white/30 mt-2 text-center">基于 {perfDetail.communityReports} 份社区报告 ({perfDetail.testConfig})</p>
                    )}
                  </div>
                )}

                {mod.projectUrl && (
                  <a href={mod.projectUrl} target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-2 px-4 py-3 rounded-xl glass hover:bg-white/5 text-sm text-white/60 hover:text-white">
                    <ExternalLink className="w-4 h-4" />在 {mod.source === 'modrinth' ? 'Modrinth' : 'CurseForge'} 上查看
                    <ChevronRight className="w-4 h-4 ml-auto" />
                  </a>
                )}
                <div className="flex gap-3 pt-2">
                  <button onClick={() => onInstall(mod)} disabled={isInstalling}
                    className="flex-1 flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-mc-green/20 border border-mc-green/30 text-mc-green hover:bg-mc-green/30 transition-all disabled:opacity-50 text-sm font-semibold">
                    {isInstalling ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                    {isInstalling ? '安装中...' : '安装模组'}
                  </button>
                  <button onClick={() => onAddToBatch(mod)}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
                    <Plus className="w-4 h-4" />加入队列
                  </button>
                  <button onClick={() => onShare(mod)}
                    className="flex items-center justify-center gap-2 px-4 py-3.5 rounded-xl bg-white/5 border border-white/10 text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm font-medium">
                    <Share2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            )}
            {activeSection === 'versions' && (
              <motion.div key="versions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                {isLoadingVersions ? (
                  <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
                ) : modVersions.length === 0 ? (
                  <div className="text-center py-12"><Package className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">暂无版本信息</p></div>
                ) : modVersions.map(version => (
                  <div key={version.id} className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <div className="w-10 h-10 rounded-lg bg-white/5 flex items-center justify-center shrink-0"><Hash className="w-5 h-5 text-white/30" /></div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-medium text-sm">{version.version}</span>
                        <span className={`px-1.5 py-0.5 text-[10px] rounded border ${
                          version.releaseType === 'release' ? 'bg-green-400/10 text-green-400 border-green-400/20' :
                          version.releaseType === 'beta' ? 'bg-yellow-400/10 text-yellow-400 border-yellow-400/20' :
                          'bg-red-400/10 text-red-400 border-red-400/20'
                        }`}>{version.releaseType === 'release' ? '正式版' : version.releaseType === 'beta' ? '测试版' : '预览版'}</span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-white/40">
                        <span>{formatDate(version.uploadDate)}</span>
                        <span>{formatNumber(version.downloads)} 下载</span>
                        <span>{formatFileSize(version.fileSize)}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </motion.div>
            )}
            {activeSection === 'dependencies' && (
              <motion.div key="dependencies" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {mod.dependencies && mod.dependencies.length > 0 ? (
                  <div className="space-y-3">
                    {mod.dependencies.map(dep => (
                      <div key={dep.modId} className="glass rounded-xl p-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${dep.required ? 'bg-red-400/10' : 'bg-blue-400/10'}`}>
                          <Layers className={`w-5 h-5 ${dep.required ? 'text-red-400' : 'text-blue-400'}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm">{dep.name}</span>
                          <p className="text-xs text-white/40 mt-0.5">{dep.required ? '必需' : '可选'}{dep.versionRange && ` · ${dep.versionRange}`}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12"><CheckCircle2 className="w-10 h-10 text-mc-green/40 mx-auto mb-3" /><p className="text-white/40 text-sm">该模组没有依赖项</p></div>
                )}
              </motion.div>
            )}
            {activeSection === 'associations' && (
              <motion.div key="associations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {associations && associations.length > 0 ? (
                  <div className="space-y-3">
                    <p className="text-xs text-white/40 mb-2">安装了此模组的用户也安装了：</p>
                    {associations.map(a => (
                      <div key={a.modId} className="glass rounded-xl p-4 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-lg bg-mc-green/10 flex items-center justify-center shrink-0">
                          <TrendingUp className="w-5 h-5 text-mc-green" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <span className="text-white font-medium text-sm">{MOD_CHINESE_NAMES[a.modId] || a.modId}</span>
                          <p className="text-xs text-white/40 mt-0.5">共装率 {a.percentage}%</p>
                        </div>
                        <div className="w-16 h-2 rounded-full bg-white/5 overflow-hidden">
                          <div className="h-full rounded-full bg-mc-green/60" style={{ width: `${a.percentage}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12"><Eye className="w-10 h-10 text-white/20 mx-auto mb-3" /><p className="text-white/40 text-sm">暂无关联模组数据</p></div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}

function LocalModDetailPanel({ mod, onClose, onToggle, onDelete, onAnalyze, analyzing, jarMetadata, onShare, onCheckConfigMigration, configMigration }: {
  mod: LocalMod; onClose: () => void; onToggle: (mod: LocalMod) => void; onDelete: (mod: LocalMod) => void
  onAnalyze: (mod: LocalMod) => void; analyzing: boolean; jarMetadata: ModJarMetadata | null
  onShare: (mod: ModInfo | LocalMod) => void
  onCheckConfigMigration: (mod: LocalMod, newVersion: string) => void
  configMigration: ConfigMigration | null
}) {
  const rating = mod.rating || MOD_RATINGS[mod.id] || MOD_RATINGS[mod.id.replace(/-/g, '')]
  const perfDetail = mod.performanceDetail || MOD_PERFORMANCE_DETAILS[mod.id] || MOD_PERFORMANCE_DETAILS[mod.id.replace(/-/g, '')]
  const associations = MOD_ASSOCIATIONS[mod.id] || MOD_ASSOCIATIONS[mod.id.replace(/-/g, '')]

  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handleEsc)
    return () => window.removeEventListener('keydown', handleEsc)
  }, [onClose])

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }} onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }} onClick={e => e.stopPropagation()}
        className="glass-strong rounded-3xl w-full max-w-lg max-h-[85vh] overflow-auto shadow-2xl"
        style={{ border: '1px solid rgba(255,255,255,0.1)' }}>
        <div className={`h-28 bg-gradient-to-br ${getModGradient(mod.name)} relative`}>
          <div className="absolute inset-0 bg-black/20" />
          <button onClick={onClose} className="absolute top-4 left-4 p-2 rounded-xl bg-black/20 hover:bg-black/40 text-white/80 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="absolute -bottom-8 left-6">
            <div className="w-16 h-16 rounded-2xl bg-black/30 backdrop-blur-md flex items-center justify-center border border-white/10">
              {mod.iconUrl ? <img src={mod.iconUrl} alt={mod.name} className="w-12 h-12 rounded-xl object-cover" /> : <Package className="w-8 h-8 text-white/40" />}
            </div>
          </div>
        </div>
        <div className="pt-10 px-6 pb-6">
          <h2 className="text-xl font-bold text-white">{mod.chineseName || mod.name}</h2>
          {mod.chineseName && mod.chineseName !== mod.name && <p className="text-xs text-white/40">{mod.name}</p>}
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <LoaderBadge loader={mod.modLoader} />
            <span className="px-2 py-0.5 text-xs rounded-lg glass text-white/50">{mod.version}</span>
            <PerformanceBadge impact={mod.performanceImpact} />
            {mod.isEnabled ? (
              <span className="px-2 py-0.5 text-xs rounded-lg bg-mc-green/10 text-mc-green border border-mc-green/20 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3" />已启用
              </span>
            ) : (
              <span className="px-2 py-0.5 text-xs rounded-lg bg-white/5 text-white/40 border border-white/10 flex items-center gap-1">
                <XCircle className="w-3 h-3" />已禁用
              </span>
            )}
          </div>

          {rating && (
            <div className="mt-4 glass rounded-xl p-3">
              <div className="flex items-center gap-3">
                <StarRating score={rating.score} size={14} />
                <span className="text-lg font-bold text-white">{rating.score.toFixed(1)}</span>
                {rating.curseforgeScore && <span className="text-[10px] text-orange-400">CF: {rating.curseforgeScore}</span>}
                {rating.modrinthScore && <span className="text-[10px] text-green-400">MR: {rating.modrinthScore}</span>}
              </div>
            </div>
          )}

          {perfDetail && (
            <div className="mt-3 glass rounded-xl p-3">
              <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1"><Gauge className="w-3 h-3" />性能详情</h4>
              <div className="grid grid-cols-3 gap-2">
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{perfDetail.fpsImpact! > 0 ? '+' : ''}{perfDetail.fpsImpact}%</p>
                  <p className="text-[9px] text-white/30">FPS</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{perfDetail.startupImpact! > 0 ? '+' : ''}{perfDetail.startupImpact}s</p>
                  <p className="text-[9px] text-white/30">启动</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-bold text-white">{perfDetail.memoryImpact! > 0 ? '+' : ''}{perfDetail.memoryImpact}MB</p>
                  <p className="text-[9px] text-white/30">内存</p>
                </div>
              </div>
            </div>
          )}

          {associations && associations.length > 0 && (
            <div className="mt-3 glass rounded-xl p-3">
              <h4 className="text-xs text-white/40 mb-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" />共装模组</h4>
              <div className="flex flex-wrap gap-1.5">
                {associations.filter(a => a.percentage >= 60).slice(0, 5).map(a => (
                  <span key={a.modId} className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 text-white/50">
                    {MOD_CHINESE_NAMES[a.modId] || a.modId} {a.percentage}%
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 mt-4">
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><HardDrive className="w-3.5 h-3.5" />文件大小</div>
              <p className="text-white text-sm font-medium">{formatFileSize(mod.fileSize)}</p>
            </div>
            <div className="glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Calendar className="w-3.5 h-3.5" />安装时间</div>
              <p className="text-white text-sm font-medium">{formatDate(mod.installDate)}</p>
            </div>
          </div>

          {mod.sha256 && (
            <div className="mt-3 glass rounded-xl p-3">
              <div className="flex items-center gap-2 text-white/40 text-xs mb-1"><Hash className="w-3.5 h-3.5" />SHA-256</div>
              <p className="text-white/30 font-mono text-[10px] break-all">{mod.sha256}</p>
            </div>
          )}

          {jarMetadata && (
            <div className="mt-4 glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                <FileCode className="w-4 h-4" />JAR 分析结果
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-white/40">Mod ID</span><span className="text-white">{jarMetadata.modId}</span></div>
                <div className="flex justify-between"><span className="text-white/40">版本</span><span className="text-white">{jarMetadata.version}</span></div>
                <div className="flex justify-between"><span className="text-white/40">加载器</span><LoaderBadge loader={jarMetadata.modLoader} /></div>
                {jarMetadata.entryClass && <div className="flex justify-between"><span className="text-white/40">入口类</span><span className="text-white truncate ml-4 max-w-[200px]">{jarMetadata.entryClass}</span></div>}
                {jarMetadata.mixins && jarMetadata.mixins.length > 0 && (
                  <div>
                    <span className="text-white/40">MixIn: </span>
                    <span className="text-white">{jarMetadata.mixins.length} 个</span>
                    <div className="mt-1 flex flex-wrap gap-1">
                      {jarMetadata.mixins.slice(0, 5).map((m, i) => (
                        <span key={i} className="px-1.5 py-0.5 text-[9px] rounded bg-pink-400/10 text-pink-400">{m}</span>
                      ))}
                      {jarMetadata.mixins.length > 5 && <span className="px-1.5 py-0.5 text-[9px] rounded bg-white/5 text-white/30">+{jarMetadata.mixins.length - 5}</span>}
                    </div>
                  </div>
                )}
                {jarMetadata.dependencies && jarMetadata.dependencies.length > 0 && (
                  <div><span className="text-white/40">依赖: </span><span className="text-white">{jarMetadata.dependencies.filter(d => d.required).length} 必需, {jarMetadata.dependencies.filter(d => !d.required).length} 可选</span></div>
                )}
                {jarMetadata.classEntries && jarMetadata.classEntries.length > 0 && (
                  <div><span className="text-white/40">类数量: </span><span className="text-white">{jarMetadata.classEntries.length}</span></div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {jarMetadata.networkAccess && <span className="px-1.5 py-0.5 text-[9px] rounded bg-amber-400/10 text-amber-400">🌐 网络访问</span>}
                  {jarMetadata.fileAccess && <span className="px-1.5 py-0.5 text-[9px] rounded bg-red-400/10 text-red-400">📁 文件访问</span>}
                  {jarMetadata.reflectionAccess && <span className="px-1.5 py-0.5 text-[9px] rounded bg-purple-400/10 text-purple-400">🔮 反射访问</span>}
                </div>
                {jarMetadata.securityRisk && jarMetadata.securityRisk !== 'none' && (
                  <div className="flex justify-between">
                    <span className="text-white/40">安全风险</span>
                    <span className={jarMetadata.securityRisk === 'high' ? 'text-red-400' : jarMetadata.securityRisk === 'medium' ? 'text-amber-400' : 'text-white/60'}>
                      {jarMetadata.securityRisk === 'high' ? '🔴 高风险' : jarMetadata.securityRisk === 'medium' ? '🟡 中等' : '🟢 低'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {configMigration && (
            <div className="mt-4 glass rounded-xl p-4">
              <h3 className="text-sm font-medium text-white/60 mb-3 flex items-center gap-2">
                <Settings className="w-4 h-4" />配置迁移
              </h3>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between"><span className="text-white/40">版本变更</span><span className="text-white">{configMigration.oldVersion} → {configMigration.newVersion}</span></div>
                <div className="flex justify-between"><span className="text-white/40">自动迁移</span>
                  <span className={configMigration.autoMigratable ? 'text-green-400' : 'text-amber-400'}>
                    {configMigration.autoMigratable ? '✅ 可以' : '⚠️ 需手动'}
                  </span>
                </div>
                {configMigration.changes.map((change, i) => (
                  <div key={i} className="flex items-center gap-2 px-2 py-1 rounded bg-white/5">
                    <span className={`w-1.5 h-1.5 rounded-full ${
                      change.status === 'kept' ? 'bg-green-400' :
                      change.status === 'renamed' ? 'bg-blue-400' :
                      change.status === 'removed' ? 'bg-red-400' :
                      change.status === 'added' ? 'bg-amber-400' : 'bg-purple-400'
                    }`} />
                    <span className="text-white/50">{change.key}</span>
                    <span className="text-white/30 ml-auto">{change.status}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="mt-6 space-y-2">
            <button onClick={() => onAnalyze(mod)} disabled={analyzing}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-white disabled:opacity-50">
              {analyzing ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileCode className="w-4 h-4" />}
              {analyzing ? '分析中...' : '分析 JAR 文件'}
            </button>
            <button onClick={() => onShare(mod)}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-white">
              <Share2 className="w-4 h-4" />分享模组
            </button>
            <button onClick={() => { onToggle(mod); onClose() }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-sm font-medium text-white">
              {mod.isEnabled ? <><ToggleLeft className="w-4 h-4 text-white/40" />禁用模组</> : <><ToggleRight className="w-4 h-4 text-mc-green" />启用模组</>}
            </button>
            <button onClick={() => { onDelete(mod); onClose() }}
              className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-red-400/10 hover:bg-red-400/20 border border-red-400/20 transition-colors text-sm font-medium text-red-400">
              <Trash2 className="w-4 h-4" />删除模组
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
