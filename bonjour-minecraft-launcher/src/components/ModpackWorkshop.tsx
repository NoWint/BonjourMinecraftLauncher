import { useState, useEffect } from 'react'
import {
  Package, FlaskConical, BarChart3, GitFork, Users, Star,
  ChevronRight, Loader2, CheckCircle, AlertCircle, Play, Download,
  Wrench, Zap, Clock, MemoryStick, ArrowLeft,
  Copy, Share2, RefreshCw, Sparkles, TrendingUp, Activity
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModpackTestCheck {
  id: string
  name: string
  category: string
  status: 'pass' | 'warn' | 'fail'
  message: string
  details?: string
}

interface ModpackTestResult {
  passed: boolean
  checks: ModpackTestCheck[]
  overallScore: number
  estimatedStartupTime: number
  estimatedFps: number
  warnings: string[]
}

interface ModpackPerformance {
  modpackName: string
  modCount: number
  minRam: number
  recommendedRam: number
  startupTimeMin: number
  startupTimeMax: number
  fpsMin: number
  fpsAvg: number
  fpsMax: number
}

interface ModpackWorkshopProps {
  instanceId?: string
  instanceName?: string
  gameVersion?: string
  modLoader?: string
  modCount?: number
  onClose: () => void
}

type TabId = 'create' | 'test' | 'performance' | 'fork' | 'sync' | 'discover'

interface TabItem {
  id: TabId
  label: string
  icon: React.ElementType
  desc: string
}

const tabs: TabItem[] = [
  { id: 'create', label: '创建', icon: Package, desc: '导出整合包' },
  { id: 'test', label: '测试', icon: FlaskConical, desc: '兼容性检测' },
  { id: 'performance', label: '性能', icon: BarChart3, desc: '资源分析' },
  { id: 'fork', label: '分身', icon: GitFork, desc: '版本分支' },
  { id: 'sync', label: '同步', icon: Users, desc: '多人同步' },
  { id: 'discover', label: '发现', icon: Star, desc: '推荐探索' },
]

const pageVariants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] as const } },
  exit: { opacity: 0, y: -8, transition: { duration: 0.2 } },
}

export default function ModpackWorkshop({
  instanceId = '',
  instanceName = '',
  gameVersion = '',
  modLoader = '',
  modCount = 0,
  onClose,
}: ModpackWorkshopProps) {
  const [activeTab, setActiveTab] = useState<TabId>('create')
  const [testResult, setTestResult] = useState<ModpackTestResult | null>(null)
  const [testing, setTesting] = useState(false)
  const [performance, setPerformance] = useState<ModpackPerformance | null>(null)
  const [packName, setPackName] = useState(instanceName)
  const [packVersion, setPackVersion] = useState('1.0.0')
  const [packAuthor, setPackAuthor] = useState('')
  const [packDescription, setPackDescription] = useState('')
  const [exportFormat, setExportFormat] = useState('bonjour')
  const [creating, setCreating] = useState(false)
  const [forkName, setForkName] = useState('')
  const [syncRoom, setSyncRoom] = useState<any>(null)
  const [recommendations, setRecommendations] = useState<any[]>([])
  const [loadingRecs, setLoadingRecs] = useState(false)

  const handleTest = async () => {
    setTesting(true)
    try {
      const result = await window.minecraftAPI?.runModpackTest(
        gameVersion,
        modLoader,
        Array(modCount).fill({ fileName: 'mod.jar' })
      )
      setTestResult(result as any)
    } finally {
      setTesting(false)
    }
  }

  const handleLoadPerformance = async () => {
    const result = await window.minecraftAPI?.getModpackPerformance(
      instanceId,
      instanceName,
      modCount
    )
    setPerformance(result as any)
  }

  const handleCreate = async () => {
    setCreating(true)
    try {
      const exportPath = await window.minecraftAPI?.exportModpack(
        instanceId,
        packName,
        packVersion,
        packAuthor,
        packDescription
      )
      if (exportPath) {
        console.log('Modpack exported to:', exportPath)
      }
    } finally {
      setCreating(false)
    }
  }

  const handleCreateFork = async () => {
    if (!forkName.trim()) return
    await window.minecraftAPI?.createModpackFork(
      instanceId,
      instanceName,
      '1.0',
      instanceId,
      forkName
    )
    setForkName('')
  }

  const handleCreateSyncRoom = async () => {
    const room = await window.minecraftAPI?.createSyncRoom(
      'Player',
      instanceName,
      packVersion,
      gameVersion,
      modLoader,
      modCount
    )
    setSyncRoom(room)
  }

  const handleLoadRecommendations = async () => {
    setLoadingRecs(true)
    try {
      const recs = await window.minecraftAPI?.getModpackRecommendations([], 8)
      setRecommendations(recs || [])
    } finally {
      setLoadingRecs(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'performance') handleLoadPerformance()
    if (activeTab === 'discover') handleLoadRecommendations()
  }, [activeTab])

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pass':
        return 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
      case 'warn':
        return 'text-amber-400 bg-amber-500/10 border-amber-500/20'
      case 'fail':
        return 'text-red-400 bg-red-500/10 border-red-500/20'
      default:
        return 'text-white/40 bg-white/5 border-white/5'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pass':
        return <CheckCircle className="w-4 h-4 text-emerald-400" />
      case 'warn':
        return <AlertCircle className="w-4 h-4 text-amber-400" />
      case 'fail':
        return <AlertCircle className="w-4 h-4 text-red-400" />
      default:
        return null
    }
  }

  // Instance info header component
  const InstanceHeader = () => (
    <div className="flex items-center gap-4 px-6 py-4 border-b border-white/5">
      <button
        onClick={onClose}
        className="flex items-center gap-1.5 text-sm text-white/40 hover:text-white/70 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        返回
      </button>
      <div className="h-4 w-px bg-white/10" />
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-500/10 flex items-center justify-center">
          <Package className="w-4 h-4 text-emerald-400" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-white">{instanceName}</h3>
          <p className="text-xs text-white/40">
            {gameVersion} {modLoader && `· ${modLoader}`} {modCount > 0 && `· ${modCount} 个模组`}
          </p>
        </div>
      </div>
    </div>
  )

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex z-50"
    >
      {/* Left Sidebar - Steam Style */}
      <div className="w-64 flex-shrink-0 bg-[#0a0a0a] border-r border-white/5 flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-white/5">
          <div className="flex items-center gap-2.5 mb-1">
            <Wrench className="w-5 h-5 text-emerald-400" />
            <h2 className="text-base font-bold text-white">整合包工坊</h2>
          </div>
          <p className="text-xs text-white/30">{instanceName}</p>
        </div>

        {/* Tab Navigation */}
        <nav className="flex-1 py-3 px-3 space-y-0.5">
          {tabs.map((tab) => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-200 group ${
                  isActive
                    ? 'bg-emerald-500/10 text-emerald-400'
                    : 'text-white/40 hover:text-white/70 hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-400' : 'text-white/30 group-hover:text-white/50'}`} />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium block">{tab.label}</span>
                  <span className={`text-[11px] block ${isActive ? 'text-emerald-400/60' : 'text-white/20'}`}>
                    {tab.desc}
                  </span>
                </div>
                {isActive && (
                  <motion.div
                    layoutId="activeWorkshopTab"
                    className="w-1 h-5 rounded-full bg-emerald-400"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}
              </button>
            )
          })}
        </nav>

        {/* Instance Info Footer */}
        <div className="p-4 border-t border-white/5">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">游戏版本</span>
              <span className="text-white/60">{gameVersion}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">模组加载器</span>
              <span className="text-white/60">{modLoader || '原版'}</span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-white/30">模组数量</span>
              <span className="text-white/60">{modCount}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col bg-black/40">
        <InstanceHeader />

        <div className="flex-1 overflow-auto p-6">
          <div className="max-w-3xl mx-auto">
            <AnimatePresence mode="wait">
              {activeTab === 'create' && (
                <motion.div
                  key="create"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  {/* Hero Section */}
                  <div className="glass rounded-2xl p-6 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-48 h-48 bg-emerald-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                    <div className="relative z-10">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
                          <Package className="w-5 h-5 text-emerald-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">导出整合包</h3>
                          <p className="text-sm text-white/40">将当前实例打包为可分享的整合包</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Form Fields */}
                  <div className="glass rounded-2xl p-6 space-y-4">
                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">整合包名称</label>
                      <input
                        value={packName}
                        onChange={(e) => setPackName(e.target.value)}
                        placeholder="输入整合包名称"
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-colors"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">版本号</label>
                        <input
                          value={packVersion}
                          onChange={(e) => setPackVersion(e.target.value)}
                          placeholder="1.0.0"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">作者</label>
                        <input
                          value={packAuthor}
                          onChange={(e) => setPackAuthor(e.target.value)}
                          placeholder="你的名字"
                          className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-2 block">描述</label>
                      <textarea
                        value={packDescription}
                        onChange={(e) => setPackDescription(e.target.value)}
                        placeholder="描述一下这个整合包..."
                        rows={3}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-emerald-500/30 transition-colors resize-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs text-white/40 uppercase tracking-wider mb-3 block">导出格式</label>
                      <div className="flex gap-2">
                        {[
                          { id: 'bonjour', label: 'Bonjour', desc: '原生格式' },
                          { id: 'curseforge', label: 'CurseForge', desc: '通用格式' },
                          { id: 'modrinth', label: 'Modrinth', desc: '社区格式' },
                        ].map((fmt) => (
                          <button
                            key={fmt.id}
                            onClick={() => setExportFormat(fmt.id)}
                            className={`flex-1 p-3 rounded-xl border text-left transition-all ${
                              exportFormat === fmt.id
                                ? 'bg-emerald-500/10 border-emerald-500/30'
                                : 'bg-white/5 border-white/10 hover:border-white/20'
                            }`}
                          >
                            <p className={`text-sm font-medium ${exportFormat === fmt.id ? 'text-emerald-400' : 'text-white/70'}`}>
                              {fmt.label}
                            </p>
                            <p className="text-[11px] text-white/30 mt-0.5">{fmt.desc}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    <button
                      onClick={handleCreate}
                      disabled={creating || !packName}
                      className="w-full py-3.5 bg-emerald-500 text-black font-semibold rounded-xl hover:bg-emerald-400 transition-all text-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {creating ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          导出中...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          导出整合包
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              )}

              {activeTab === 'test' && (
                <motion.div
                  key="test"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                          <FlaskConical className="w-5 h-5 text-purple-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">兼容性测试</h3>
                          <p className="text-sm text-white/40">检测模组冲突和兼容性问题</p>
                        </div>
                      </div>
                      <button
                        onClick={handleTest}
                        disabled={testing}
                        className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 hover:bg-purple-500/20 transition-all text-sm disabled:opacity-50"
                      >
                        {testing ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Play className="w-4 h-4" />
                        )}
                        {testing ? '测试中...' : '开始测试'}
                      </button>
                    </div>
                  </div>

                  {testResult && (
                    <div className="space-y-4">
                      {/* Score Card */}
                      <div className="glass rounded-2xl p-6">
                        <div className="flex items-center gap-6">
                          <div className="relative w-20 h-20">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                              <path
                                className="text-white/5"
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                              />
                              <path
                                className={testResult.overallScore >= 80 ? 'text-emerald-400' : testResult.overallScore >= 60 ? 'text-amber-400' : 'text-red-400'}
                                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="3"
                                strokeDasharray={`${testResult.overallScore}, 100`}
                              />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <span className="text-xl font-bold text-white">{testResult.overallScore}</span>
                            </div>
                          </div>
                          <div>
                            <p className="text-lg font-semibold text-white">
                              {testResult.passed ? '测试通过' : '发现问题'}
                            </p>
                            <p className="text-sm text-white/40">
                              预估启动 {testResult.estimatedStartupTime}s · 预估 FPS {testResult.estimatedFps}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Check List */}
                      <div className="space-y-2">
                        {testResult.checks.map((check: any) => (
                          <div
                            key={check.id}
                            className={`flex items-center gap-3 px-4 py-3 rounded-xl border ${getStatusColor(check.status)}`}
                          >
                            {getStatusIcon(check.status)}
                            <span className="text-sm flex-1">{check.name}</span>
                            <span className="text-xs text-white/40">{check.message}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'performance' && (
                <motion.div
                  key="performance"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <BarChart3 className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">性能分析</h3>
                        <p className="text-sm text-white/40">预估整合包运行性能</p>
                      </div>
                    </div>
                  </div>

                  {performance ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="glass rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <MemoryStick className="w-4 h-4 text-blue-400" />
                          <span className="text-xs text-white/40 uppercase tracking-wider">最低内存</span>
                        </div>
                        <p className="text-2xl font-bold text-white font-mono">{(performance.minRam / 1024).toFixed(1)} GB</p>
                      </div>
                      <div className="glass rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Zap className="w-4 h-4 text-emerald-400" />
                          <span className="text-xs text-white/40 uppercase tracking-wider">推荐内存</span>
                        </div>
                        <p className="text-2xl font-bold text-emerald-400 font-mono">{(performance.recommendedRam / 1024).toFixed(1)} GB</p>
                      </div>
                      <div className="glass rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Clock className="w-4 h-4 text-amber-400" />
                          <span className="text-xs text-white/40 uppercase tracking-wider">启动时间</span>
                        </div>
                        <p className="text-2xl font-bold text-white font-mono">{performance.startupTimeMin}-{performance.startupTimeMax}s</p>
                      </div>
                      <div className="glass rounded-2xl p-5">
                        <div className="flex items-center gap-2 mb-3">
                          <Activity className="w-4 h-4 text-purple-400" />
                          <span className="text-xs text-white/40 uppercase tracking-wider">FPS 范围</span>
                        </div>
                        <p className="text-2xl font-bold text-white font-mono">{performance.fpsMin}-{performance.fpsMax}</p>
                        <p className="text-xs text-white/30 mt-1">平均 {performance.fpsAvg}</p>
                      </div>
                    </div>
                  ) : (
                    <div className="glass rounded-2xl p-12 text-center">
                      <BarChart3 className="w-10 h-10 text-white/20 mx-auto mb-3" />
                      <p className="text-sm text-white/40">暂无性能数据</p>
                    </div>
                  )}
                </motion.div>
              )}

              {activeTab === 'fork' && (
                <motion.div
                  key="fork"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                        <GitFork className="w-5 h-5 text-orange-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">创建分身</h3>
                        <p className="text-sm text-white/40">基于当前实例创建独立分支</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4">
                      <p className="text-sm text-white/60">
                        整合包分身允许你在原始整合包基础上创建自定义版本，同时追踪上游更新。
                        分身与原始实例相互独立，修改不会影响原版本。
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <input
                        value={forkName}
                        onChange={(e) => setForkName(e.target.value)}
                        placeholder="输入分身名称"
                        className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-orange-500/30 transition-colors"
                      />
                      <button
                        onClick={handleCreateFork}
                        disabled={!forkName.trim()}
                        className="px-6 py-3 bg-orange-500/10 border border-orange-500/20 text-orange-400 rounded-xl hover:bg-orange-500/20 transition-all text-sm disabled:opacity-50"
                      >
                        创建
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeTab === 'sync' && (
                <motion.div
                  key="sync"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-400" />
                      </div>
                      <div>
                        <h3 className="text-lg font-bold text-white">同步房间</h3>
                        <p className="text-sm text-white/40">与好友同步整合包配置</p>
                      </div>
                    </div>

                    <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 mb-4">
                      <p className="text-sm text-white/60">
                        创建同步房间后，好友可以通过房间码快速安装相同的整合包配置，
                        确保所有人使用完全一致的游戏环境。
                      </p>
                    </div>

                    {syncRoom ? (
                      <div className="p-6 rounded-xl bg-emerald-500/5 border border-emerald-500/20 text-center">
                        <p className="text-sm text-emerald-400 mb-2">房间已创建</p>
                        <p className="text-4xl font-bold font-mono text-white tracking-wider">{syncRoom.code}</p>
                        <p className="text-xs text-white/30 mt-2">将此房间码分享给好友</p>
                        <div className="flex justify-center gap-2 mt-4">
                          <button
                            onClick={() => navigator.clipboard?.writeText(syncRoom.code)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs"
                          >
                            <Copy className="w-3.5 h-3.5" />
                            复制
                          </button>
                          <button
                            onClick={() => setSyncRoom(null)}
                            className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs"
                          >
                            <RefreshCw className="w-3.5 h-3.5" />
                            重新创建
                          </button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={handleCreateSyncRoom}
                        className="w-full py-3.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 rounded-xl hover:bg-blue-500/20 transition-all text-sm flex items-center justify-center gap-2"
                      >
                        <Share2 className="w-4 h-4" />
                        创建同步房间
                      </button>
                    )}
                  </div>
                </motion.div>
              )}

              {activeTab === 'discover' && (
                <motion.div
                  key="discover"
                  variants={pageVariants}
                  initial="initial"
                  animate="animate"
                  exit="exit"
                  className="space-y-6"
                >
                  <div className="glass rounded-2xl p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-yellow-500/10 flex items-center justify-center">
                          <Sparkles className="w-5 h-5 text-yellow-400" />
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-white">推荐发现</h3>
                          <p className="text-sm text-white/40">基于你的游戏习惯推荐整合包</p>
                        </div>
                      </div>
                      <button
                        onClick={handleLoadRecommendations}
                        disabled={loadingRecs}
                        className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
                      >
                        <RefreshCw className={`w-4 h-4 text-white/40 ${loadingRecs ? 'animate-spin' : ''}`} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {recommendations.length > 0 ? (
                      recommendations.map((rec: any) => (
                        <div
                          key={rec.modpackId}
                          className="glass rounded-xl p-4 flex items-center gap-4 hover:bg-white/[0.02] transition-all group"
                        >
                          <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Package className="w-6 h-6 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-white group-hover:text-emerald-400 transition-colors">
                              {rec.name}
                            </p>
                            <p className="text-xs text-white/30 mt-0.5">{rec.reason}</p>
                            <div className="flex gap-1 mt-1.5">
                              {rec.tags?.map((tag: string) => (
                                <span
                                  key={tag}
                                  className="px-1.5 py-0.5 rounded text-[10px] bg-white/5 text-white/30"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            <div className="flex items-center gap-1">
                              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                              <span className="text-xs font-mono text-emerald-400">{rec.score}</span>
                            </div>
                            <ChevronRight className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors" />
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="glass rounded-2xl p-12 text-center">
                        <Star className="w-10 h-10 text-white/20 mx-auto mb-3" />
                        <p className="text-sm text-white/40">暂无推荐数据</p>
                        <button
                          onClick={handleLoadRecommendations}
                          className="mt-3 px-4 py-2 rounded-lg bg-white/5 text-white/60 hover:text-white hover:bg-white/10 transition-all text-xs"
                        >
                          获取推荐
                        </button>
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
