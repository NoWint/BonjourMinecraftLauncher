import { useState, useMemo, useCallback, useEffect } from 'react'
import {
  Download, Play, Check, Search, Filter, Loader2, Plus,
  Package, Sun, ToggleLeft, ToggleRight, ArrowLeft, ChevronRight,
  Trash2, Settings, FileCode, Monitor, Layers, Wrench, Clock, HardDrive,
  ChevronDown
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import EmptyState from './EmptyState'
import type { GameVersion, InstalledVersion, VersionInstance, InstanceSettings, ShaderPack, Account } from '../types'
import type { LocalMod } from '../types/mod'

interface VersionsPageProps {
  versions: GameVersion[]
  installedVersions: InstalledVersion[]
  onInstall: (versionId: string) => Promise<void>
  onLaunch: (version: string) => void
  onLaunchInstance: (instanceId: string) => void
  selectedAccount: Account | null
}

type VersionFilter = 'all' | 'release' | 'snapshot' | 'old'
type ViewMode = 'library' | 'browse'
type InstanceTab = 'overview' | 'mods' | 'shaders' | 'loaders' | 'settings'

const getVersionBackground = (versionId: string) => {
  const gradients = [
    'from-emerald-600/30 to-emerald-900/60',
    'from-blue-600/30 to-blue-900/60',
    'from-purple-600/30 to-purple-900/60',
    'from-amber-600/30 to-amber-900/60',
    'from-rose-600/30 to-rose-900/60',
    'from-cyan-600/30 to-cyan-900/60',
  ]
  let hash = 0
  for (let i = 0; i < versionId.length; i++) {
    hash = versionId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

const getLoaderBadge = (loader?: string) => {
  const colors: Record<string, string> = {
    forge: 'text-orange-300 bg-orange-400/10 border-orange-400/20',
    fabric: 'text-blue-300 bg-blue-400/10 border-blue-400/20',
    quilt: 'text-purple-300 bg-purple-400/10 border-purple-400/20',
    neoforge: 'text-red-300 bg-red-400/10 border-red-400/20',
  }
  return colors[loader || ''] || 'text-gray-300 bg-gray-400/10 border-gray-400/20'
}

const getLoaderAccent = (loader?: string) => {
  const accents: Record<string, string> = {
    forge: 'text-orange-400',
    fabric: 'text-blue-400',
    quilt: 'text-purple-400',
    neoforge: 'text-red-400',
  }
  return accents[loader || ''] || 'text-gray-400'
}

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '未知'
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${bytes} B`
}

const formatPlayTime = (minutes: number) => {
  if (minutes < 60) return `${minutes} 分钟`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} 小时`
  return `${Math.floor(minutes / 1440)} 天`
}

export default function VersionsPage({
  versions, installedVersions, onInstall, onLaunch, onLaunchInstance, selectedAccount
}: VersionsPageProps) {
  const [filter, setFilter] = useState<VersionFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [installingId, setInstallingId] = useState<string | null>(null)
  const [selectedVersion, setSelectedVersion] = useState<string | null>(null)
  const [activeInstance, setActiveInstance] = useState<VersionInstance | null>(null)
  const [viewMode, setViewMode] = useState<ViewMode>('library')

  const installedIds = useMemo(() =>
    new Set(installedVersions.map((v) => v.id)),
    [installedVersions]
  )

  const filteredVersions = useMemo(() => {
    return versions.filter((version) => {
      if (filter === 'release' && version.type !== 'release') return false
      if (filter === 'snapshot' && version.type !== 'snapshot') return false
      if (filter === 'old' && !['old_alpha', 'old_beta'].includes(version.type)) return false
      if (searchQuery && !version.id.toLowerCase().includes(searchQuery.toLowerCase())) return false
      return true
    })
  }, [versions, filter, searchQuery])

  const handleInstall = async (versionId: string) => {
    setInstallingId(versionId)
    try { await onInstall(versionId) } finally { setInstallingId(null) }
  }

  const handleOpenInstance = async (versionId: string) => {
    try {
      const instance = await window.minecraftAPI.getInstanceByVersion(versionId)
      if (instance) setActiveInstance(instance)
    } catch (err) { console.error('Failed to load instance:', err) }
  }

  const getVersionTypeLabel = (type: string) => {
    switch (type) {
      case 'release': return { text: '正式版', color: 'text-emerald-400 bg-emerald-400/10 border-emerald-400/20' }
      case 'snapshot': return { text: '快照', color: 'text-amber-400 bg-amber-400/10 border-amber-400/20' }
      case 'old_alpha': return { text: 'Alpha', color: 'text-purple-400 bg-purple-400/10 border-purple-400/20' }
      case 'old_beta': return { text: 'Beta', color: 'text-blue-400 bg-blue-400/10 border-blue-400/20' }
      default: return { text: type, color: 'text-gray-400 bg-gray-400/10 border-gray-400/20' }
    }
  }

  if (activeInstance) {
    return (
      <InstanceDetailView
        instance={activeInstance}
        selectedAccount={selectedAccount}
        onBack={() => setActiveInstance(null)}
        onLaunch={() => onLaunchInstance(activeInstance.id)}
      />
    )
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="px-8 pt-8 pb-4 flex-shrink-0">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-bold text-white">版本管理</h2>
            <div className="flex items-center gap-1 p-1 glass rounded-full">
              <button
                onClick={() => setViewMode('library')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'library' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Layers className="w-4 h-4" />
                实例库
              </button>
              <button
                onClick={() => setViewMode('browse')}
                className={`flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                  viewMode === 'browse' ? 'bg-white/15 text-white' : 'text-white/40 hover:text-white/60'
                }`}
              >
                <Download className="w-4 h-4" />
                浏览版本
              </button>
            </div>
          </div>
        </div>

        <div className="flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/30" />
            <input
              type="text"
              placeholder={viewMode === 'library' ? '搜索已安装版本...' : '搜索所有版本...'}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 glass rounded-xl text-white placeholder-white/30 focus:outline-none focus:border-white/20 transition-all"
            />
          </div>

          {viewMode === 'browse' && (
            <div className="flex gap-2">
              {(['all', 'release', 'snapshot', 'old'] as VersionFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl font-medium text-sm transition-all ${
                    filter === f
                      ? 'bg-white/15 text-white border border-white/20'
                      : 'text-white/40 hover:text-white/60 hover:bg-white/5'
                  }`}
                >
                  {f === 'all' ? '全部' : f === 'release' ? '正式版' : f === 'snapshot' ? '快照' : '旧版本'}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto px-8 pb-8">
        {viewMode === 'library' ? (
          <LibraryView
            installedVersions={installedVersions}
            onLaunch={onLaunch}
            onOpenInstance={handleOpenInstance}
          />
        ) : (
          <BrowseView
            installedVersions={installedVersions}
            filteredVersions={filteredVersions}
            installedIds={installedIds}
            installingId={installingId}
            selectedVersion={selectedVersion}
            onInstall={handleInstall}
            onLaunch={onLaunch}
            onOpenInstance={handleOpenInstance}
            onSelectVersion={setSelectedVersion}
            getVersionTypeLabel={getVersionTypeLabel}
          />
        )}
      </div>
    </div>
  )
}

// ========== Library View ==========
function LibraryView({
  installedVersions,
  onLaunch,
  onOpenInstance,
}: {
  installedVersions: InstalledVersion[]
  onLaunch: (version: string) => void
  onOpenInstance: (versionId: string) => void
}) {
  if (installedVersions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <EmptyState
          icon={Layers}
          title="还没有安装任何版本"
          description="切换到「浏览版本」来安装你的第一个 Minecraft"
        />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">已安装版本</h3>
        <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">{installedVersions.length}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {installedVersions.map((version) => (
          <motion.div
            key={version.id}
            layout
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4, transition: { duration: 0.2 } }}
            className="glass rounded-2xl overflow-hidden cursor-pointer group relative"
            onClick={() => onOpenInstance(version.id)}
          >
            {/* Card Header with gradient */}
            <div className={`h-28 bg-gradient-to-br ${getVersionBackground(version.id)} relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/20" />
              <div className="absolute top-3 left-3">
                <span className="px-2 py-1 text-xs rounded-lg bg-black/40 text-white/80 backdrop-blur-sm border border-white/10">
                  {version.modLoader || '原版'}
                </span>
              </div>
              <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
                <h4 className="text-2xl font-bold text-white">{version.id}</h4>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onLaunch(version.id)
                  }}
                  className="w-10 h-10 rounded-full bg-mc-green flex items-center justify-center text-black hover:bg-mc-green/90 transition-colors shadow-lg"
                >
                  <Play className="w-4 h-4 ml-0.5" fill="black" />
                </button>
              </div>
            </div>

            {/* Card Body */}
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 text-white/40 text-xs">
                    <Clock className="w-3.5 h-3.5" />
                    <span>{new Date(version.installedAt).toLocaleDateString('zh-CN')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-1 text-white/30 text-xs">
                  <HardDrive className="w-3.5 h-3.5" />
                  <span>已安装</span>
                </div>
              </div>

              {/* Quick actions row */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onOpenInstance(version.id)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/60 hover:text-white text-xs"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  管理
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    onLaunch(version.id)
                  }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-mc-green/10 hover:bg-mc-green/20 transition-colors text-mc-green text-xs font-medium"
                >
                  <Play className="w-3.5 h-3.5" fill="currentColor" />
                  启动
                </button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}

// ========== Browse View ==========
function BrowseView({
  installedVersions,
  filteredVersions,
  installedIds,
  installingId,
  selectedVersion,
  onInstall,
  onLaunch,
  onOpenInstance,
  onSelectVersion,
  getVersionTypeLabel,
}: {
  installedVersions: InstalledVersion[]
  filteredVersions: GameVersion[]
  installedIds: Set<string>
  installingId: string | null
  selectedVersion: string | null
  onInstall: (versionId: string) => void
  onLaunch: (version: string) => void
  onOpenInstance: (versionId: string) => void
  onSelectVersion: (v: string | null) => void
  getVersionTypeLabel: (type: string) => { text: string; color: string }
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-sm font-medium text-white/40 uppercase tracking-wider">所有版本</h3>
        <span className="text-xs text-white/30 px-2 py-0.5 rounded-full bg-white/5">{filteredVersions.length}</span>
      </div>

      {filteredVersions.slice(0, 80).map((version) => {
        const isInstalled = installedIds.has(version.id)
        const isInstalling = installingId === version.id
        const typeInfo = getVersionTypeLabel(version.type)
        const isSelected = selectedVersion === version.id
        const installedInfo = installedVersions.find(v => v.id === version.id)

        return (
          <motion.div
            key={version.id}
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className={`glass rounded-xl overflow-hidden transition-all ${
              isSelected ? 'border-white/20 bg-white/10' : 'hover:bg-white/5'
            }`}
          >
            {/* Main row */}
            <div
              className="p-4 flex items-center gap-4 cursor-pointer"
              onClick={() => onSelectVersion(isSelected ? null : version.id)}
            >
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${getVersionBackground(version.id)} flex items-center justify-center flex-shrink-0`}>
                <span className="text-lg font-bold text-white/80">{version.id.charAt(0)}</span>
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="text-base font-semibold text-white">{version.id}</h3>
                  <span className={`px-2 py-0.5 text-xs rounded-lg border ${typeInfo.color}`}>
                    {typeInfo.text}
                  </span>
                  {isInstalled && (
                    <span className="px-2 py-0.5 text-xs rounded-lg text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 flex items-center gap-1">
                      <Check className="w-3 h-3" />
                      已安装
                    </span>
                  )}
                  {installedInfo?.modLoader && (
                    <span className={`px-2 py-0.5 text-xs rounded-lg border ${getLoaderBadge(installedInfo.modLoader)}`}>
                      {installedInfo.modLoader}
                    </span>
                  )}
                </div>
                <p className="text-sm text-white/40">
                  {new Date(version.releaseTime).toLocaleDateString('zh-CN')}
                </p>
              </div>

              <div className="flex items-center gap-2">
                {isInstalled ? (
                  <>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onOpenInstance(version.id)
                      }}
                      className="px-3 py-2 rounded-xl glass text-white/60 hover:text-white hover:bg-white/10 transition-colors text-sm"
                    >
                      管理
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onLaunch(version.id)
                      }}
                      className="w-10 h-10 rounded-full bg-mc-green flex items-center justify-center text-black hover:bg-mc-green/90 transition-colors"
                    >
                      <Play className="w-4 h-4 ml-0.5" fill="black" />
                    </button>
                  </>
                ) : (
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onInstall(version.id)
                    }}
                    disabled={isInstalling}
                    className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green text-sm font-medium hover:bg-mc-green/25 transition-colors disabled:opacity-50"
                  >
                    {isInstalling ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    {isInstalling ? '安装中...' : '安装'}
                  </button>
                )}
                <ChevronDown className={`w-5 h-5 text-white/30 transition-transform ${isSelected ? 'rotate-180' : ''}`} />
              </div>
            </div>

            {/* Expanded detail */}
            <AnimatePresence>
              {isSelected && isInstalled && installedInfo && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="overflow-hidden"
                >
                  <div className="px-4 pb-4 pt-0">
                    <div className="border-t border-white/5 pt-3 flex items-center gap-3">
                      <button
                        onClick={() => onOpenInstance(version.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-white/70 hover:text-white text-sm"
                      >
                        <Wrench className="w-4 h-4" />
                        打开实例管理
                      </button>
                      <button
                        onClick={() => onLaunch(version.id)}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-mc-green/15 border border-mc-green/25 text-mc-green hover:bg-mc-green/25 transition-colors text-sm font-medium"
                      >
                        <Play className="w-4 h-4" fill="currentColor" />
                        启动游戏
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )
      })}

      {filteredVersions.length === 0 && (
        <EmptyState icon={Filter} title="没有找到匹配的版本" compact />
      )}
    </div>
  )
}

// ========== Instance Detail View ==========
function InstanceDetailView({
  instance, selectedAccount, onBack, onLaunch
}: {
  instance: VersionInstance
  selectedAccount: Account | null
  onBack: () => void
  onLaunch: () => void
}) {
  const [activeTab, setActiveTab] = useState<InstanceTab>('overview')
  const [currentInstance, setCurrentInstance] = useState(instance)

  const refreshCurrentInstance = useCallback(async () => {
    try {
      const updated = await window.minecraftAPI.getInstance(instance.id)
      if (updated) setCurrentInstance(updated)
    } catch (err) { console.error('Failed to refresh instance:', err) }
  }, [instance.id])

  const tabs = [
    { id: 'overview' as InstanceTab, label: '概览', icon: Layers },
    { id: 'mods' as InstanceTab, label: '模组', icon: Package },
    { id: 'shaders' as InstanceTab, label: '光影', icon: Sun },
    { id: 'loaders' as InstanceTab, label: '加载器', icon: Download },
    { id: 'settings' as InstanceTab, label: '设置', icon: Settings },
  ]

  return (
    <div className="h-full flex flex-col">
      {/* Hero Header */}
      <div className={`h-44 bg-gradient-to-br ${getVersionBackground(currentInstance.id)} relative flex-shrink-0 overflow-hidden`}>
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Back button */}
        <button
          onClick={onBack}
          className="absolute top-4 left-4 p-2.5 rounded-xl bg-black/20 hover:bg-black/40 backdrop-blur-sm transition-colors text-white/80 hover:text-white z-10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>

        {/* Content */}
        <div className="absolute bottom-0 left-0 right-0 p-6 z-10">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-3xl font-bold text-white mb-2">{currentInstance.name}</h2>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 text-xs rounded-lg bg-black/40 text-white/80 backdrop-blur-sm border border-white/10">
                  {currentInstance.gameVersion}
                </span>
                {currentInstance.modLoader && (
                  <span className={`px-2.5 py-1 text-xs rounded-lg border ${getLoaderBadge(currentInstance.modLoader)}`}>
                    {currentInstance.modLoader} {currentInstance.modLoaderVersion}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onLaunch}
              disabled={!selectedAccount}
              className="flex items-center gap-2 px-6 py-3 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors disabled:opacity-50 shadow-lg"
            >
              <Play className="w-5 h-5" fill="black" />
              启动游戏
            </button>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center gap-6 px-6 py-3 border-b border-white/5 flex-shrink-0 bg-white/[0.02]">
        <div className="flex items-center gap-2 text-sm">
          <Clock className="w-4 h-4 text-white/30" />
          <span className="text-white/40">游戏时长</span>
          <span className="text-white font-medium">{formatPlayTime(currentInstance.totalTime)}</span>
        </div>
        {currentInstance.lastPlayedAt && (
          <div className="flex items-center gap-2 text-sm">
            <CalendarIcon />
            <span className="text-white/40">上次游玩</span>
            <span className="text-white font-medium">{new Date(currentInstance.lastPlayedAt).toLocaleDateString('zh-CN')}</span>
          </div>
        )}
        <div className="flex items-center gap-2 text-sm">
          <HardDrive className="w-4 h-4 text-white/30" />
          <span className="text-white/40">路径</span>
          <span className="text-white/60 font-mono text-xs truncate max-w-[200px]">{currentInstance.instanceDir}</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-white/5 flex-shrink-0 px-6">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-medium transition-all relative ${
                activeTab === tab.id ? 'text-white' : 'text-white/40 hover:text-white/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="instanceTabIndicator" className="absolute bottom-0 left-4 right-4 h-0.5 bg-mc-green rounded-full" />
              )}
            </button>
          )
        })}
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-auto p-6">
        <AnimatePresence mode="wait">
          {activeTab === 'overview' && (
            <InstanceOverviewTab
              key="overview"
              instance={currentInstance}
              onRefresh={refreshCurrentInstance}
            />
          )}
          {activeTab === 'mods' && (
            <InstanceModsTab key="mods" instance={currentInstance} onRefresh={refreshCurrentInstance} />
          )}
          {activeTab === 'shaders' && (
            <InstanceShadersTab key="shaders" instance={currentInstance} onRefresh={refreshCurrentInstance} />
          )}
          {activeTab === 'loaders' && (
            <InstanceLoadersTab key="loaders" instance={currentInstance} onRefresh={refreshCurrentInstance} />
          )}
          {activeTab === 'settings' && (
            <InstanceSettingsTab key="settings" instance={currentInstance} onRefresh={refreshCurrentInstance} />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

function CalendarIcon() {
  return (
    <svg className="w-4 h-4 text-white/30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  )
}

// ========== Overview Tab ==========
function InstanceOverviewTab({ instance, onRefresh }: { instance: VersionInstance; onRefresh: () => void }) {
  const [modsCount, setModsCount] = useState(0)
  const [shadersCount, setShadersCount] = useState(0)

  useEffect(() => {
    const load = async () => {
      try {
        const [mods, shaders] = await Promise.all([
          window.minecraftAPI.scanInstanceMods(instance.id),
          window.minecraftAPI.scanInstanceShaders(instance.id),
        ])
        setModsCount(mods.length)
        setShadersCount(shaders.length)
      } catch (e) { /* ignore */ }
    }
    load()
  }, [instance.id])

  const stats = [
    { label: '模组', value: modsCount, icon: Package, color: 'text-mc-green bg-mc-green/10' },
    { label: '光影包', value: shadersCount, icon: Sun, color: 'text-amber-400 bg-amber-400/10' },
    { label: '游戏时长', value: formatPlayTime(instance.totalTime), icon: Clock, color: 'text-blue-400 bg-blue-400/10' },
    { label: '加载器', value: instance.modLoader || '原版', icon: Wrench, color: getLoaderAccent(instance.modLoader) + ' ' + (instance.modLoader ? getLoaderBadge(instance.modLoader).split(' ')[1] : 'bg-white/5') },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.label} className="glass rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${stat.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-xs text-white/40">{stat.label}</span>
              </div>
              <p className="text-xl font-bold text-white">{stat.value}</p>
            </div>
          )
        })}
      </div>

      {/* Info Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">版本信息</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">游戏版本</span>
              <span className="text-sm text-white font-medium">{instance.gameVersion}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">模组加载器</span>
              <span className="text-sm text-white font-medium">{instance.modLoader || '无'}</span>
            </div>
            {instance.modLoaderVersion && (
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/60">加载器版本</span>
                <span className="text-sm text-white font-medium">{instance.modLoaderVersion}</span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">创建时间</span>
              <span className="text-sm text-white/80">{new Date(instance.createdAt).toLocaleDateString('zh-CN')}</span>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4">实例设置</h4>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">最大内存</span>
              <span className="text-sm text-white font-medium">{instance.settings.maxMemory} MB</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">窗口大小</span>
              <span className="text-sm text-white font-medium">{instance.settings.windowWidth} x {instance.settings.windowHeight}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">全屏模式</span>
              <span className="text-sm text-white font-medium">{instance.settings.fullscreen ? '开启' : '关闭'}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-white/60">实例专属设置</span>
              <span className="text-sm text-white font-medium">{instance.settings.useInstanceSettings ? '启用' : '禁用'}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ========== Mods Tab ==========
function InstanceModsTab({ instance, onRefresh }: { instance: VersionInstance; onRefresh: () => void }) {
  const [mods, setMods] = useState<LocalMod[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadMods = useCallback(async () => {
    try {
      const data = await window.minecraftAPI.scanInstanceMods(instance.id)
      setMods(data)
    } catch (err) { console.error('Failed to scan mods:', err) }
    finally { setIsLoading(false) }
  }, [instance.id])

  useEffect(() => { loadMods() }, [loadMods])

  const handleToggle = async (mod: LocalMod) => {
    try {
      await window.minecraftAPI.toggleInstanceMod(instance.id, mod.filePath, !mod.isEnabled)
      await loadMods()
    } catch (err) { console.error('Toggle mod error:', err) }
  }

  const handleDelete = async (mod: LocalMod) => {
    if (!confirm(`确定要删除模组 "${mod.name}" 吗？`)) return
    try {
      await window.minecraftAPI.deleteInstanceMod(instance.id, mod.filePath)
      await loadMods()
    } catch (err) { console.error('Delete mod error:', err) }
  }

  const handleAddLocal = async () => {
    try {
      const files = await window.minecraftAPI.selectModFile()
      if (files && files.length > 0) {
        for (const file of files) {
          await window.minecraftAPI.addModToInstance(instance.id, file)
        }
        await loadMods()
      }
    } catch (err) { console.error('Add mod error:', err) }
  }

  const enabledCount = mods.filter(m => m.isEnabled).length

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">模组管理</h3>
          <p className="text-xs text-white/40 mt-0.5">{enabledCount} 已启用 / {mods.length} 总计</p>
        </div>
        <button onClick={handleAddLocal} className="flex items-center gap-2 px-4 py-2 bg-mc-green/15 border border-mc-green/25 text-mc-green rounded-xl text-sm font-medium hover:bg-mc-green/25 transition-colors">
          <Plus className="w-4 h-4" />
          添加模组
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : mods.length === 0 ? (
        <div className="text-center py-12">
          <Package className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">还没有安装任何模组</p>
          <button onClick={handleAddLocal} className="px-4 py-2 bg-mc-green/15 border border-mc-green/25 text-mc-green rounded-xl text-sm hover:bg-mc-green/25 transition-colors">
            添加模组文件
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {mods.map(mod => (
              <motion.div
                key={mod.filePath}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  mod.isEnabled ? 'bg-mc-green/10' : 'bg-white/5'
                }`}>
                  <Package className={`w-5 h-5 ${mod.isEnabled ? 'text-mc-green' : 'text-white/30'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium text-sm truncate ${mod.isEnabled ? 'text-white' : 'text-white/50'}`}>{mod.name}</h4>
                    <span className={`px-2 py-0.5 text-[10px] rounded-lg border ${getLoaderBadge(mod.modLoader)}`}>{mod.modLoader}</span>
                    {!mod.isEnabled && (
                      <span className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 text-white/40 border border-white/10">已禁用</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{mod.version} · {formatFileSize(mod.fileSize)}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(mod)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    {mod.isEnabled ? <ToggleRight className="w-5 h-5 text-mc-green" /> : <ToggleLeft className="w-5 h-5 text-white/30" />}
                  </button>
                  <button onClick={() => handleDelete(mod)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ========== Shaders Tab ==========
function InstanceShadersTab({ instance, onRefresh }: { instance: VersionInstance; onRefresh: () => void }) {
  const [shaders, setShaders] = useState<ShaderPack[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadShaders = useCallback(async () => {
    try {
      const data = await window.minecraftAPI.scanInstanceShaders(instance.id)
      setShaders(data)
    } catch (err) { console.error('Failed to scan shaders:', err) }
    finally { setIsLoading(false) }
  }, [instance.id])

  useEffect(() => { loadShaders() }, [loadShaders])

  const handleToggle = async (pack: ShaderPack) => {
    try {
      await window.minecraftAPI.toggleShaderPack(instance.id, pack.filePath, !pack.isEnabled)
      await loadShaders()
    } catch (err) { console.error('Toggle shader error:', err) }
  }

  const handleDelete = async (pack: ShaderPack) => {
    if (!confirm(`确定要删除光影包 "${pack.name}" 吗？`)) return
    try {
      await window.minecraftAPI.deleteShaderPack(instance.id, pack.filePath)
      await loadShaders()
    } catch (err) { console.error('Delete shader error:', err) }
  }

  const handleAdd = async () => {
    try {
      const filePath = await window.minecraftAPI.selectShaderFile()
      if (filePath) {
        await window.minecraftAPI.addShaderPack(instance.id, filePath)
        await loadShaders()
      }
    } catch (err) { console.error('Add shader error:', err) }
  }

  const moveShader = async (index: number, direction: 'up' | 'down') => {
    const newShaders = [...shaders]
    const targetIndex = direction === 'up' ? index - 1 : index + 1
    if (targetIndex < 0 || targetIndex >= newShaders.length) return
    ;[newShaders[index], newShaders[targetIndex]] = [newShaders[targetIndex], newShaders[index]]
    const ids = newShaders.map(s => s.id)
    try {
      await window.minecraftAPI.reorderShaderPacks(instance.id, ids)
      await loadShaders()
    } catch (err) { console.error('Reorder shaders error:', err) }
  }

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-lg font-semibold text-white">光影包管理</h3>
          <p className="text-xs text-white/40 mt-0.5">{shaders.filter(s => s.isEnabled).length} 已启用 / {shaders.length} 总计</p>
        </div>
        <button onClick={handleAdd} className="flex items-center gap-2 px-4 py-2 bg-mc-green/15 border border-mc-green/25 text-mc-green rounded-xl text-sm font-medium hover:bg-mc-green/25 transition-colors">
          <Plus className="w-4 h-4" />
          导入光影包
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12"><Loader2 className="w-6 h-6 text-white/30 animate-spin" /></div>
      ) : shaders.length === 0 ? (
        <div className="text-center py-12">
          <Sun className="w-10 h-10 text-white/20 mx-auto mb-3" />
          <p className="text-white/40 text-sm mb-4">还没有安装任何光影包</p>
          <button onClick={handleAdd} className="px-4 py-2 bg-mc-green/15 border border-mc-green/25 text-mc-green rounded-xl text-sm hover:bg-mc-green/25 transition-colors">
            导入光影包
          </button>
        </div>
      ) : (
        <div className="space-y-2">
          <AnimatePresence mode="popLayout">
            {shaders.map((pack, index) => (
              <motion.div
                key={pack.id}
                layout
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0, x: -20 }}
                className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/5 transition-colors"
                style={{ border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex flex-col gap-0.5">
                  <button onClick={() => moveShader(index, 'up')} disabled={index === 0} className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-20">
                    <ChevronRight className="w-3 h-3 text-white/40 -rotate-90" />
                  </button>
                  <button onClick={() => moveShader(index, 'down')} disabled={index === shaders.length - 1} className="p-1 rounded hover:bg-white/10 transition-colors disabled:opacity-20">
                    <ChevronRight className="w-3 h-3 text-white/40 rotate-90" />
                  </button>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  pack.isEnabled ? 'bg-amber-400/10' : 'bg-white/5'
                }`}>
                  <Sun className={`w-5 h-5 ${pack.isEnabled ? 'text-amber-400' : 'text-white/30'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className={`font-medium text-sm truncate ${pack.isEnabled ? 'text-white' : 'text-white/50'}`}>{pack.name}</h4>
                    {!pack.isEnabled && (
                      <span className="px-2 py-0.5 text-[10px] rounded-lg bg-white/5 text-white/40 border border-white/10">已禁用</span>
                    )}
                  </div>
                  <p className="text-xs text-white/40 mt-0.5">{formatFileSize(pack.fileSize)} · 优先级 {pack.priority + 1}</p>
                </div>
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button onClick={() => handleToggle(pack)} className="p-2 rounded-lg hover:bg-white/10 transition-colors">
                    {pack.isEnabled ? <ToggleRight className="w-5 h-5 text-amber-400" /> : <ToggleLeft className="w-5 h-5 text-white/30" />}
                  </button>
                  <button onClick={() => handleDelete(pack)} className="p-2 rounded-lg text-red-400 hover:bg-red-400/10 transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}
    </motion.div>
  )
}

// ========== Loaders Tab ==========
function InstanceLoadersTab({ instance, onRefresh }: { instance: VersionInstance; onRefresh: () => void }) {
  const [loaderVersions, setLoaderVersions] = useState<Record<string, { version: string }[]> | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [installing, setInstalling] = useState<string | null>(null)
  const [selectedLoader, setSelectedLoader] = useState<string>(instance.modLoader || 'fabric')
  const [selectedVersion, setSelectedVersion] = useState('')

  useEffect(() => {
    setIsLoading(true)
    window.minecraftAPI.getModLoaderVersions(instance.gameVersion).then(data => {
      setLoaderVersions(data)
      setIsLoading(false)
    }).catch(() => setIsLoading(false))
  }, [instance.gameVersion])

  const handleInstall = async (loaderType: string, version: string) => {
    setInstalling(loaderType)
    try {
      await window.minecraftAPI.installModLoader(instance.id, loaderType, version)
      onRefresh()
    } catch (err) { console.error('Install mod loader error:', err) }
    finally { setInstalling(null) }
  }

  const currentLoaderVersions = loaderVersions?.[selectedLoader] || []

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
      <h3 className="text-lg font-semibold text-white mb-4">模组加载器管理</h3>

      <div className="glass rounded-2xl p-5 mb-4">
        <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">当前加载器</h4>
        {instance.modLoader ? (
          <div className="flex items-center gap-3">
            <span className={`px-3 py-1.5 text-sm rounded-lg border ${getLoaderBadge(instance.modLoader)}`}>
              {instance.modLoader}
            </span>
            <span className="text-white/60 text-sm">{instance.modLoaderVersion || '未知版本'}</span>
          </div>
        ) : (
          <p className="text-white/40 text-sm">未安装模组加载器（原版）</p>
        )}
      </div>

      <div className="glass rounded-2xl p-5">
        <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-3">安装/切换加载器</h4>

        <div className="flex gap-2 mb-4">
          {['forge', 'fabric', 'quilt', 'neoforge'].map(loader => (
            <button
              key={loader}
              onClick={() => { setSelectedLoader(loader); setSelectedVersion('') }}
              className={`px-3 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedLoader === loader
                  ? 'bg-mc-green/15 text-mc-green border border-mc-green/25'
                  : 'glass text-white/50 hover:text-white/70'
              }`}
            >
              {loader}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="flex items-center gap-2 text-white/40 text-sm py-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            加载版本列表...
          </div>
        ) : currentLoaderVersions.length === 0 ? (
          <p className="text-white/40 text-sm py-4">该版本暂无 {selectedLoader} 可用版本</p>
        ) : (
          <div className="max-h-60 overflow-auto space-y-1">
            {currentLoaderVersions.slice(0, 20).map((v) => (
              <div key={v.version} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/5 transition-colors">
                <span className="text-sm text-white/70">{v.version}</span>
                <button
                  onClick={() => handleInstall(selectedLoader, v.version)}
                  disabled={installing === selectedLoader}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-mc-green/15 border border-mc-green/25 text-mc-green text-xs font-medium hover:bg-mc-green/25 transition-colors disabled:opacity-50"
                >
                  {installing === selectedLoader ? <Loader2 className="w-3 h-3 animate-spin" /> : <Download className="w-3 h-3" />}
                  {instance.modLoader === selectedLoader && instance.modLoaderVersion === v.version ? '已安装' : '安装'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}

// ========== Settings Tab ==========
function InstanceSettingsTab({ instance, onRefresh }: { instance: VersionInstance; onRefresh: () => void }) {
  const [settings, setSettings] = useState<InstanceSettings>(instance.settings)
  const [hasChanges, setHasChanges] = useState(false)

  const handleChange = (field: keyof InstanceSettings, value: unknown) => {
    setSettings(prev => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = async () => {
    try {
      await window.minecraftAPI.updateInstanceSettings(instance.id, settings)
      setHasChanges(false)
      onRefresh()
    } catch (err) { console.error('Save instance settings error:', err) }
  }

  const handleReset = () => {
    setSettings(instance.settings)
    setHasChanges(false)
  }

  const selectJavaPath = async () => {
    const path = await window.minecraftAPI.selectJavaPath()
    if (path) handleChange('javaPath', path)
  }

  return (
    <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.2 }}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white">实例设置</h3>
        {hasChanges && (
          <div className="flex gap-2">
            <button onClick={handleReset} className="px-3 py-1.5 rounded-xl text-white/60 hover:text-white hover:bg-white/10 transition-all text-sm">重置</button>
            <button onClick={handleSave} className="px-4 py-1.5 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors text-sm">保存</button>
          </div>
        )}
      </div>

      <div className="glass rounded-2xl p-5 mb-4">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider">使用实例专属设置</h4>
          <button
            onClick={() => handleChange('useInstanceSettings', !settings.useInstanceSettings)}
            className={`w-12 h-7 rounded-full transition-colors relative ${settings.useInstanceSettings ? 'bg-mc-green' : 'bg-white/10'}`}
          >
            <motion.div
              animate={{ x: settings.useInstanceSettings ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-white absolute top-1"
            />
          </button>
        </div>
        <p className="text-xs text-white/30">启用后，此实例将使用独立的游戏设置，不受全局设置影响</p>
      </div>

      <div className={`space-y-4 ${!settings.useInstanceSettings ? 'opacity-40 pointer-events-none' : ''}`}>
        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileCode className="w-4 h-4" /> Java
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">Java 路径</label>
              <button onClick={selectJavaPath} className="flex-1 max-w-xs px-3 py-2 glass rounded-lg text-white/60 text-sm text-right hover:text-white hover:bg-white/5 transition-all truncate ml-4">
                {settings.javaPath || '使用全局设置'}
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">最大内存 (MB)</label>
              <input type="number" value={settings.maxMemory} onChange={e => handleChange('maxMemory', parseInt(e.target.value) || 4096)}
                min={512} className="w-24 px-3 py-2 glass rounded-lg text-white text-sm text-right focus:outline-none focus:border-white/20" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">最小内存 (MB)</label>
              <input type="number" value={settings.minMemory} onChange={e => handleChange('minMemory', parseInt(e.target.value) || 512)}
                min={256} className="w-24 px-3 py-2 glass rounded-lg text-white text-sm text-right focus:outline-none focus:border-white/20" />
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Monitor className="w-4 h-4" /> 游戏
          </h4>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">窗口宽度</label>
              <input type="number" value={settings.windowWidth} onChange={e => handleChange('windowWidth', parseInt(e.target.value) || 1280)}
                min={640} className="w-24 px-3 py-2 glass rounded-lg text-white text-sm text-right focus:outline-none focus:border-white/20" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">窗口高度</label>
              <input type="number" value={settings.windowHeight} onChange={e => handleChange('windowHeight', parseInt(e.target.value) || 720)}
                min={480} className="w-24 px-3 py-2 glass rounded-lg text-white text-sm text-right focus:outline-none focus:border-white/20" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">全屏模式</label>
              <button onClick={() => handleChange('fullscreen', !settings.fullscreen)}
                className={`w-12 h-7 rounded-full transition-colors relative ${settings.fullscreen ? 'bg-mc-green' : 'bg-white/10'}`}>
                <motion.div animate={{ x: settings.fullscreen ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-white absolute top-1" />
              </button>
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">自动连接服务器</label>
              <input type="text" value={settings.launchServer} onChange={e => handleChange('launchServer', e.target.value)}
                placeholder="例如: mc.example.com:25565"
                className="flex-1 max-w-xs px-3 py-2 glass rounded-lg text-white text-sm text-right focus:outline-none focus:border-white/20 ml-4 placeholder-white/20" />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-white/60">启动后关闭启动器</label>
              <button onClick={() => handleChange('closeAfterLaunch', !settings.closeAfterLaunch)}
                className={`w-12 h-7 rounded-full transition-colors relative ${settings.closeAfterLaunch ? 'bg-mc-green' : 'bg-white/10'}`}>
                <motion.div animate={{ x: settings.closeAfterLaunch ? 20 : 2 }} transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-white absolute top-1" />
              </button>
            </div>
          </div>
        </div>

        <div className="glass rounded-2xl p-5">
          <h4 className="text-sm font-medium text-white/40 uppercase tracking-wider mb-4 flex items-center gap-2">
            <FileCode className="w-4 h-4" /> JVM 参数
          </h4>
          <div>
            <textarea
              value={settings.jvmArgs?.join('\n') || ''}
              onChange={e => handleChange('jvmArgs', e.target.value.split('\n').filter(Boolean))}
              placeholder="每行一个JVM参数&#10;例如: -XX:+UseG1GC"
              className="w-full px-4 py-3 glass rounded-xl text-white placeholder-white/20 focus:outline-none focus:border-white/20 text-sm font-mono h-32 resize-none"
            />
          </div>
        </div>
      </div>
    </motion.div>
  )
}
