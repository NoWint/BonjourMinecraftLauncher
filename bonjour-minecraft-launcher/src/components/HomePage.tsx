import { Play, User, Download, Settings, AlertCircle, ChevronDown, LayoutDashboard, MonitorPlay, Clock, HardDrive, Gamepad2, Zap, Sparkles, ArrowLeft } from 'lucide-react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Account, InstalledVersion, LauncherSettings } from '../types'

type Page = 'home' | 'versions' | 'mods' | 'accounts' | 'settings'
type HomeMode = 'dashboard' | 'cinematic'
type SlideDirection = 'next' | 'prev' | null

interface HomePageProps {
  selectedAccount: Account | null
  installedVersions: InstalledVersion[]
  settings: LauncherSettings | null
  onLaunch: (version: string) => void
  onChangePage: (page: Page) => void
}

// Animation constants for cinematic mode transition
const TRANSITION_DURATION = 1.0
const TRANSITION_EASE = [0.65, 0, 0.35, 1] as const // Custom cinematic bezier

// Page slide animation constants
const SLIDE_DURATION = 0.7
const SLIDE_EASE = [0.22, 1, 0.36, 1] as const // ease-out cubic bezier (fast start, slow end)

// Dashboard exit animation: shrink, darken, blur
const dashboardVariants = {
  initial: {
    opacity: 0,
    scale: 0.75,
    filter: 'blur(12px) brightness(0.3)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px) brightness(1)',
    transition: {
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    scale: 0.75,
    filter: 'blur(12px) brightness(0.3)',
    transition: {
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
    },
  },
}

// Cinematic enter animation: start oversized, blurred, transparent
const cinematicVariants = {
  initial: {
    opacity: 0,
    scale: 1.5,
    filter: 'blur(16px) brightness(1.3)',
  },
  animate: {
    opacity: 1,
    scale: 1,
    filter: 'blur(0px) brightness(1)',
    transition: {
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
    },
  },
  exit: {
    opacity: 0,
    scale: 1.5,
    filter: 'blur(16px) brightness(1.3)',
    transition: {
      duration: TRANSITION_DURATION,
      ease: TRANSITION_EASE,
    },
  },
}

// Background gradients for cinematic mode
const getVersionBackground = (versionId: string) => {
  const gradients = [
    'from-emerald-900/60 via-black/80 to-black',
    'from-blue-900/60 via-black/80 to-black',
    'from-purple-900/60 via-black/80 to-black',
    'from-amber-900/60 via-black/80 to-black',
    'from-rose-900/60 via-black/80 to-black',
  ]
  let hash = 0
  for (let i = 0; i < versionId.length; i++) {
    hash = versionId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return gradients[Math.abs(hash) % gradients.length]
}

export default function HomePage({ selectedAccount, installedVersions, settings, onLaunch, onChangePage }: HomePageProps) {
  const [mode, setMode] = useState<HomeMode>('dashboard')
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [selectedVersion, setSelectedVersion] = useState<string>(() => {
    if (installedVersions.length > 0) return installedVersions[0].id
    return ''
  })
  const [isLaunching, setIsLaunching] = useState(false)
  const [javaStatus, setJavaStatus] = useState<{available: boolean; version: string | null; majorVersion: number; isCompatible: boolean} | null>(null)
  const [lastPlayed, setLastPlayed] = useState<string>('从未游玩')
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 })

  useEffect(() => {
    if (installedVersions.length > 0 && !selectedVersion) {
      setSelectedVersion(installedVersions[0].id)
    }
  }, [installedVersions, selectedVersion])

  useEffect(() => {
    const checkJava = async () => {
      try {
        const status = await window.minecraftAPI.checkJava()
        setJavaStatus(status as {available: boolean; version: string | null; majorVersion: number; isCompatible: boolean})
      } catch {
        setJavaStatus({ available: false, version: null, majorVersion: 0, isCompatible: false })
      }
    }
    checkJava()
  }, [])

  useEffect(() => {
    if (installedVersions.length === 0) {
      setLastPlayed('从未游玩')
      return
    }
    const sorted = [...installedVersions].sort((a, b) => {
      return new Date(b.installedAt).getTime() - new Date(a.installedAt).getTime()
    })
    const latest = sorted[0]
    const date = new Date(latest.installedAt)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffMins = Math.floor(diffMs / (1000 * 60))

    if (diffMins < 1) setLastPlayed('刚刚')
    else if (diffMins < 60) setLastPlayed(`${diffMins} 分钟前`)
    else if (diffHours < 24) setLastPlayed(`${diffHours} 小时前`)
    else if (diffDays < 7) setLastPlayed(`${diffDays} 天前`)
    else setLastPlayed(date.toLocaleDateString('zh-CN'))
  }, [installedVersions])

  // Mouse parallax for cinematic mode
  useEffect(() => {
    if (mode !== 'cinematic') return
    const handleMouseMove = (e: MouseEvent) => {
      setMousePosition({
        x: (e.clientX / window.innerWidth - 0.5) * 20,
        y: (e.clientY / window.innerHeight - 0.5) * 20,
      })
    }
    window.addEventListener('mousemove', handleMouseMove)
    return () => window.removeEventListener('mousemove', handleMouseMove)
  }, [mode])

  // Handle mode switch with transition lock to prevent spamming
  const handleModeSwitch = useCallback((newMode: HomeMode) => {
    if (isTransitioning || mode === newMode) return
    setIsTransitioning(true)
    setMode(newMode)
    // Unlock after transition completes
    setTimeout(() => setIsTransitioning(false), TRANSITION_DURATION * 1000)
  }, [isTransitioning, mode])

  // Keyboard shortcut: ESC to return to dashboard from cinematic mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'cinematic' && !isTransitioning) {
        handleModeSwitch('dashboard')
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [mode, isTransitioning, handleModeSwitch])

  const handleLaunch = () => {
    if (!selectedVersion || !selectedAccount) return
    if (!javaStatus?.available) {
      alert('未找到 Java，请先安装 Java')
      return
    }
    setIsLaunching(true)
    onLaunch(selectedVersion)
    setTimeout(() => setIsLaunching(false), 10000)
  }

  const formatMemory = (mb: number) => {
    if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`
    return `${mb} MB`
  }

  return (
    <div className="h-full flex flex-col relative overflow-hidden">
      {/* Mode Toggle Switch - Fixed at top with draggable spring slider */}
      <div className="absolute top-6 left-1/2 -translate-x-1/2 z-30">
        <div className="glass rounded-full p-1 flex items-center relative select-none">
          {/* Sliding background pill - draggable */}
          <motion.div
            className="absolute top-1 bottom-1 rounded-full bg-white/15 shadow-lg cursor-grab active:cursor-grabbing touch-none"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.5}
            dragMomentum={false}
            onDragEnd={(_, info) => {
              if (info.offset.x > 20 && mode === 'dashboard') {
                handleModeSwitch('cinematic')
              } else if (info.offset.x < -20 && mode === 'cinematic') {
                handleModeSwitch('dashboard')
              }
            }}
            animate={{
              x: mode === 'dashboard' ? 0 : '100%',
            }}
            transition={{
              type: 'spring',
              stiffness: 400,
              damping: 25,
            }}
            style={{
              zIndex: 1,
              width: 'calc(50% - 4px)',
              left: 4,
            }}
            whileTap={{ scale: 0.95 }}
          />
          <motion.button
            onClick={() => handleModeSwitch('dashboard')}
            disabled={isTransitioning}
            animate={{
              scale: mode === 'dashboard' ? 1.05 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 20,
            }}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              mode === 'dashboard'
                ? 'text-white'
                : 'text-white/40 hover:text-white/60'
            } ${isTransitioning ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>控制台</span>
          </motion.button>
          <motion.button
            onClick={() => handleModeSwitch('cinematic')}
            disabled={isTransitioning}
            animate={{
              scale: mode === 'cinematic' ? 1.05 : 1,
            }}
            transition={{
              type: 'spring',
              stiffness: 500,
              damping: 20,
            }}
            className={`relative z-10 flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              mode === 'cinematic'
                ? 'text-mc-green'
                : 'text-white/40 hover:text-white/60'
            } ${isTransitioning ? 'cursor-not-allowed opacity-60' : ''}`}
          >
            <MonitorPlay className="w-4 h-4" />
            <span>沉浸</span>
          </motion.button>
        </div>
      </div>

      {/* Account & Settings - Top Right (hidden in cinematic mode via z-index and pointer-events) */}
      <motion.div
        className="absolute top-6 right-6 flex items-center gap-3 z-30"
        animate={{
          opacity: mode === 'dashboard' ? 1 : 0,
          y: mode === 'dashboard' ? 0 : -10,
        }}
        transition={{ duration: 0.4, ease: TRANSITION_EASE }}
        style={{ pointerEvents: mode === 'dashboard' ? 'auto' : 'none' }}
      >
        {selectedAccount ? (
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full glass">
            <img
              src={selectedAccount.skinUrl || '/steve.png'}
              alt={selectedAccount.username}
              className="w-6 h-6 rounded"
            />
            <span className="text-sm text-white/80">{selectedAccount.username}</span>
          </div>
        ) : (
          <button
            onClick={() => onChangePage('accounts')}
            className="flex items-center gap-2 px-3 py-1.5 rounded-full glass hover:bg-white/10 transition-colors"
          >
            <User className="w-4 h-4 text-white/60" />
            <span className="text-sm text-white/60">添加账户</span>
          </button>
        )}
        <button
          onClick={() => onChangePage('settings')}
          className="p-2 rounded-full glass hover:bg-white/10 transition-colors"
        >
          <Settings className="w-4 h-4 text-white/60" />
        </button>
      </motion.div>

      {/* Content Area with Cinematic Transitions */}
      <div className="relative h-full will-change-transform">
        <AnimatePresence mode="sync" initial={false}>
          {mode === 'dashboard' ? (
            <DashboardView
              key="dashboard"
              variants={dashboardVariants}
              selectedAccount={selectedAccount}
              installedVersions={installedVersions}
              settings={settings}
              selectedVersion={selectedVersion}
              setSelectedVersion={setSelectedVersion}
              isLaunching={isLaunching}
              javaStatus={javaStatus}
              lastPlayed={lastPlayed}
              onLaunch={handleLaunch}
              onChangePage={onChangePage}
              formatMemory={formatMemory}
            />
          ) : (
            <CinematicView
              key="cinematic"
              variants={cinematicVariants}
              selectedAccount={selectedAccount}
              installedVersions={installedVersions}
              selectedVersion={selectedVersion}
              setSelectedVersion={setSelectedVersion}
              isLaunching={isLaunching}
              javaStatus={javaStatus}
              mousePosition={mousePosition}
              onLaunch={handleLaunch}
              onChangePage={onChangePage}
              onBackToDashboard={() => handleModeSwitch('dashboard')}
            />
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}

// Dashboard View - Information dense, functional
function DashboardView({
  variants,
  selectedAccount,
  installedVersions,
  settings,
  selectedVersion,
  setSelectedVersion,
  isLaunching,
  javaStatus,
  lastPlayed,
  onLaunch,
  onChangePage,
  formatMemory,
}: {
  variants: typeof dashboardVariants
  selectedAccount: Account | null
  installedVersions: InstalledVersion[]
  settings: LauncherSettings | null
  selectedVersion: string
  setSelectedVersion: (v: string) => void
  isLaunching: boolean
  javaStatus: {available: boolean; version: string | null; majorVersion: number; isCompatible: boolean} | null
  lastPlayed: string
  onLaunch: () => void
  onChangePage: (page: Page) => void
  formatMemory: (mb: number) => string
}) {
  const [showVersionDropdown, setShowVersionDropdown] = useState(false)

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full flex flex-col pt-20 px-6 absolute inset-0 will-change-[transform,opacity,filter]"
    >
      {/* Main Content Grid */}
      <div className="flex-1 grid grid-cols-12 gap-4 max-w-6xl mx-auto w-full">
        {/* Left Column - Launch Area */}
        <div className="col-span-7 flex flex-col gap-4">
          {/* Hero Card */}
          <div className="glass rounded-3xl p-8 flex-1 flex flex-col justify-center relative overflow-hidden">
            {/* Decorative gradient */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-mc-green/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />

            <div className="relative z-10">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-2xl bg-mc-green/10 flex items-center justify-center">
                  <Gamepad2 className="w-6 h-6 text-mc-green" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">准备开始</h2>
                  <p className="text-sm text-white/40">选择版本并启动游戏</p>
                </div>
              </div>

              {installedVersions.length > 0 ? (
                <div className="space-y-6">
                  {/* Version Selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowVersionDropdown(!showVersionDropdown)}
                      className="w-full flex items-center justify-between px-5 py-4 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-mc-green/20 to-mc-green/5 flex items-center justify-center">
                          <span className="text-lg font-bold text-mc-green">{selectedVersion.charAt(0)}</span>
                        </div>
                        <div className="text-left">
                          <p className="text-lg font-semibold text-white">{selectedVersion}</p>
                          <p className="text-sm text-white/40">
                            {installedVersions.find(v => v.id === selectedVersion)?.modLoader || '原版'}
                          </p>
                        </div>
                      </div>
                      <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${showVersionDropdown ? 'rotate-180' : ''}`} />
                    </button>

                    {/* Dropdown */}
                    <AnimatePresence>
                      {showVersionDropdown && (
                        <motion.div
                          initial={{ opacity: 0, y: -10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          className="absolute top-full left-0 right-0 mt-2 py-2 rounded-2xl glass-strong z-30"
                        >
                          {installedVersions.map((version) => (
                            <button
                              key={version.id}
                              onClick={() => {
                                setSelectedVersion(version.id)
                                setShowVersionDropdown(false)
                              }}
                              className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors flex items-center gap-3 ${
                                selectedVersion === version.id ? 'text-mc-green' : 'text-white/60'
                              }`}
                            >
                              <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold ${
                                selectedVersion === version.id ? 'bg-mc-green/10 text-mc-green' : 'bg-white/5 text-white/40'
                              }`}>
                                {version.id.charAt(0)}
                              </div>
                              <span className="text-sm">{version.id}</span>
                              {version.modLoader && (
                                <span className="text-xs text-white/30 ml-auto">{version.modLoader}</span>
                              )}
                            </button>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>

                  {/* Launch Button */}
                  <div className="flex items-center gap-4">
                    <motion.button
                      onClick={onLaunch}
                      disabled={!selectedVersion || !selectedAccount || isLaunching}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      className="flex-1 flex items-center justify-center gap-3 px-8 py-4 rounded-2xl bg-mc-green text-black font-bold text-lg hover:bg-mc-green/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLaunching ? (
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          className="w-6 h-6 border-2 border-black/30 border-t-black rounded-full"
                        />
                      ) : (
                        <>
                          <Play className="w-6 h-6 fill-black" />
                          <span>启动游戏</span>
                        </>
                      )}
                    </motion.button>
                  </div>

                  {/* Java Warnings */}
                  {javaStatus && !javaStatus.available && (
                    <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
                      <AlertCircle className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                      <span className="text-sm text-yellow-500">未找到 Java，请在设置中配置</span>
                      <button
                        onClick={() => onChangePage('settings')}
                        className="text-sm text-yellow-500 underline ml-auto"
                      >
                        去设置
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <Download className="w-8 h-8 text-white/30" />
                  </div>
                  <p className="text-white/40 mb-4">未安装任何游戏版本</p>
                  <button
                    onClick={() => onChangePage('versions')}
                    className="px-6 py-3 rounded-xl bg-mc-green/20 border border-mc-green/30 text-mc-green hover:bg-mc-green/30 transition-colors"
                  >
                    安装游戏
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Quick Stats Row */}
          <div className="grid grid-cols-3 gap-4">
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                  <HardDrive className="w-4 h-4 text-blue-400" />
                </div>
                <span className="text-xs text-white/40">已安装</span>
              </div>
              <p className="text-2xl font-bold text-white">{installedVersions.length}</p>
              <p className="text-xs text-white/30 mt-1">个版本</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-purple-400" />
                </div>
                <span className="text-xs text-white/40">上次游玩</span>
              </div>
              <p className="text-lg font-bold text-white truncate">{lastPlayed}</p>
            </div>
            <div className="glass rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-orange-400" />
                </div>
                <span className="text-xs text-white/40">内存</span>
              </div>
              <p className="text-lg font-bold text-white">
                {settings ? formatMemory(settings.maxMemory) : '未设置'}
              </p>
            </div>
          </div>
        </div>

        {/* Right Column - Info & Quick Actions */}
        <div className="col-span-5 flex flex-col gap-4">
          {/* Account Card */}
          <div className="glass rounded-3xl p-6">
            <h3 className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider">当前账户</h3>
            {selectedAccount ? (
              <div className="flex items-center gap-4">
                <img
                  src={selectedAccount.skinUrl || '/steve.png'}
                  alt={selectedAccount.username}
                  className="w-16 h-16 rounded-2xl bg-white/5"
                />
                <div>
                  <p className="text-xl font-bold text-white">{selectedAccount.username}</p>
                  <p className="text-sm text-white/40">
                    {selectedAccount.type === 'microsoft' ? 'Microsoft 账户' : '离线账户'}
                  </p>
                </div>
              </div>
            ) : (
              <button
                onClick={() => onChangePage('accounts')}
                className="w-full py-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors text-white/60"
              >
                添加账户
              </button>
            )}
          </div>

          {/* Quick Actions */}
          <div className="glass rounded-3xl p-6 flex-1">
            <h3 className="text-sm font-medium text-white/40 mb-4 uppercase tracking-wider">快速操作</h3>
            <div className="space-y-2">
              <button
                onClick={() => onChangePage('versions')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Download className="w-5 h-5 text-blue-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">版本管理</p>
                  <p className="text-xs text-white/40">安装或删除游戏版本</p>
                </div>
              </button>
              <button
                onClick={() => onChangePage('mods')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-purple-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">模组管理</p>
                  <p className="text-xs text-white/40">浏览和管理模组</p>
                </div>
              </button>
              <button
                onClick={() => onChangePage('settings')}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors text-left"
              >
                <div className="w-10 h-10 rounded-xl bg-orange-500/10 flex items-center justify-center">
                  <Settings className="w-5 h-5 text-orange-400" />
                </div>
                <div>
                  <p className="text-sm font-medium text-white">设置</p>
                  <p className="text-xs text-white/40">配置启动器和游戏选项</p>
                </div>
              </button>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// Slide variants for version switching with blur + brightness transition
const getSlideVariants = (direction: SlideDirection) => {
  const isNext = direction === 'next'
  const xOffset = isNext ? '-100%' : '100%'
  const enterXOffset = isNext ? '100%' : '-100%'

  return {
    initial: {
      x: enterXOffset,
      opacity: 0,
      filter: 'blur(12px) brightness(0.4)',
    },
    animate: {
      x: 0,
      opacity: 1,
      filter: 'blur(0px) brightness(1)',
      transition: {
        duration: SLIDE_DURATION,
        ease: SLIDE_EASE,
      },
    },
    exit: {
      x: xOffset,
      opacity: 0,
      filter: 'blur(12px) brightness(0.4)',
      transition: {
        duration: SLIDE_DURATION,
        ease: SLIDE_EASE,
      },
    },
  }
}

// Cinematic View - Epic/Apple TV level immersion
function CinematicView({
  variants,
  selectedAccount,
  installedVersions,
  selectedVersion,
  setSelectedVersion,
  isLaunching,
  javaStatus,
  mousePosition,
  onLaunch,
  onChangePage,
  onBackToDashboard,
}: {
  variants: typeof cinematicVariants
  selectedAccount: Account | null
  installedVersions: InstalledVersion[]
  selectedVersion: string
  setSelectedVersion: (v: string) => void
  isLaunching: boolean
  javaStatus: {available: boolean; version: string | null; majorVersion: number; isCompatible: boolean} | null
  mousePosition: { x: number; y: number }
  onLaunch: () => void
  onChangePage: (page: Page) => void
  onBackToDashboard: () => void
}) {
  const currentVersion = installedVersions.find(v => v.id === selectedVersion)
  const currentIndex = installedVersions.findIndex(v => v.id === selectedVersion)
  const [slideDirection, setSlideDirection] = useState<SlideDirection>(null)
  const [isSliding, setIsSliding] = useState(false)
  const slideTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handlePrev = () => {
    if (isSliding || installedVersions.length <= 1) return
    const newIndex = currentIndex > 0 ? currentIndex - 1 : installedVersions.length - 1
    const newVersion = installedVersions[newIndex].id
    setIsSliding(true)
    setSlideDirection('prev')
    setSelectedVersion(newVersion)
    if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current)
    slideTimeoutRef.current = setTimeout(() => {
      setIsSliding(false)
      setSlideDirection(null)
    }, SLIDE_DURATION * 1000)
  }

  const handleNext = () => {
    if (isSliding || installedVersions.length <= 1) return
    const newIndex = currentIndex < installedVersions.length - 1 ? currentIndex + 1 : 0
    const newVersion = installedVersions[newIndex].id
    setIsSliding(true)
    setSlideDirection('next')
    setSelectedVersion(newVersion)
    if (slideTimeoutRef.current) clearTimeout(slideTimeoutRef.current)
    slideTimeoutRef.current = setTimeout(() => {
      setIsSliding(false)
      setSlideDirection(null)
    }, SLIDE_DURATION * 1000)
  }

  if (installedVersions.length === 0) {
    return (
      <motion.div
        variants={variants}
        initial="initial"
        animate="animate"
        exit="exit"
        className="h-full flex items-center justify-center absolute inset-0 will-change-[transform,opacity,filter]"
      >
        <div className="text-center">
          <div className="w-24 h-24 rounded-3xl glass flex items-center justify-center mx-auto mb-6">
            <Download className="w-10 h-10 text-white/30" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">还没有安装游戏</h2>
          <p className="text-white/50 mb-6">安装你的第一个 Minecraft 版本开始冒险</p>
          <button
            onClick={() => onChangePage('versions')}
            className="px-6 py-3 bg-mc-green text-black font-semibold rounded-xl hover:bg-mc-green/90 transition-colors"
          >
            去安装
          </button>
        </div>
      </motion.div>
    )
  }

  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      className="h-full relative overflow-hidden absolute inset-0 will-change-[transform,opacity,filter]"
    >
      {/* Dynamic Background */}
      <AnimatePresence mode="wait">
        <motion.div
          key={currentVersion?.id || 'empty'}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.7 }}
          className={`absolute inset-0 bg-gradient-to-b ${currentVersion ? getVersionBackground(currentVersion.id) : 'from-gray-900 to-black'}`}
          style={{
            transform: `translate(${mousePosition.x}px, ${mousePosition.y}px) scale(1.1)`,
          }}
        />
      </AnimatePresence>

      {/* Dark overlay */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Back button for returning to dashboard */}
      <motion.button
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: TRANSITION_DURATION * 0.6, duration: 0.4, ease: TRANSITION_EASE }}
        onClick={onBackToDashboard}
        className="absolute top-6 left-6 z-20 flex items-center gap-2 px-4 py-2 rounded-full glass hover:bg-white/10 transition-colors text-white/60 hover:text-white"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="text-sm">返回控制台</span>
      </motion.button>

      {/* ESC hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: TRANSITION_DURATION * 0.8, duration: 0.4 }}
        className="absolute bottom-28 left-1/2 -translate-x-1/2 z-20"
      >
        <span className="text-xs text-white/20">按 ESC 返回控制台</span>
      </motion.div>

      {/* Content */}
      <div className="relative h-full flex flex-col items-center justify-center px-8 pb-20 overflow-hidden">
        <AnimatePresence mode="sync" initial={false} custom={slideDirection}>
          {currentVersion && (
            <motion.div
              key={currentVersion.id}
              custom={slideDirection}
              variants={getSlideVariants(slideDirection)}
              initial="initial"
              animate="animate"
              exit="exit"
              className="w-full max-w-lg absolute"
            >
              {/* Version Card */}
              <div className="glass rounded-3xl p-8 md:p-10 text-center">
                {/* Version Info */}
                <motion.h1
                  className="text-5xl md:text-6xl font-bold text-white mb-2 tracking-tight"
                  layoutId="versionTitle"
                >
                  {currentVersion.id}
                </motion.h1>

                {currentVersion.modLoader && (
                  <p className="text-xl text-white/60 mb-6">
                    {currentVersion.modLoader} {currentVersion.modLoaderVersion}
                  </p>
                )}

                {/* Stats */}
                <div className="flex items-center justify-center gap-6 mb-8 text-white/50">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm">上次游玩 2小时前</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4" />
                    <span className="text-sm">1.2 GB</span>
                  </div>
                </div>

                {/* Account Warning */}
                {!selectedAccount && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm text-yellow-500">请先添加一个账号</p>
                    <button
                      onClick={() => onChangePage('accounts')}
                      className="text-sm text-yellow-400 hover:text-yellow-300 underline"
                    >
                      去添加
                    </button>
                  </motion.div>
                )}

                {/* Java Warning */}
                {javaStatus && !javaStatus.available && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    className="mb-6 p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center gap-3"
                  >
                    <AlertCircle className="w-5 h-5 text-yellow-500 flex-shrink-0" />
                    <p className="text-sm text-yellow-500">未找到 Java，请在设置中配置</p>
                  </motion.div>
                )}

                {/* Play Button */}
                <div className="flex justify-center">
                  <motion.button
                    onClick={onLaunch}
                    disabled={!selectedAccount || isLaunching || !javaStatus?.available}
                    className="play-btn disabled:opacity-40 disabled:cursor-not-allowed"
                    whileHover={selectedAccount && javaStatus?.available ? { scale: 1.1 } : {}}
                    whileTap={selectedAccount && javaStatus?.available ? { scale: 0.95 } : {}}
                  >
                    {isLaunching ? (
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                        className="w-8 h-8 border-2 border-white/30 border-t-white rounded-full"
                      />
                    ) : (
                      <Play className="w-8 h-8 text-white ml-1" fill="white" />
                    )}
                  </motion.button>
                </div>

                <p className="mt-4 text-white/40 text-sm">
                  {isLaunching ? '正在启动...' : '点击启动游戏'}
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation Arrows */}
        {installedVersions.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              disabled={isSliding}
              className={`absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all z-10 ${isSliding ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <ChevronDown className="w-6 h-6 rotate-90" />
            </button>
            <button
              onClick={handleNext}
              disabled={isSliding}
              className={`absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full glass flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 transition-all z-10 ${isSliding ? 'opacity-40 cursor-not-allowed' : ''}`}
            >
              <ChevronDown className="w-6 h-6 -rotate-90" />
            </button>
          </>
        )}

        {/* Version Indicators */}
        {installedVersions.length > 1 && (
          <div className="absolute bottom-24 left-1/2 -translate-x-1/2 flex gap-2 z-10">
            {installedVersions.map((version) => (
              <button
                key={version.id}
                onClick={() => {
                  if (isSliding || version.id === selectedVersion) return
                  const versionIndex = installedVersions.findIndex(v => v.id === version.id)
                  const currentIdx = installedVersions.findIndex(v => v.id === selectedVersion)
                  if (versionIndex > currentIdx) {
                    handleNext()
                  } else {
                    handlePrev()
                  }
                }}
                className={`h-2 rounded-full transition-all ${
                  version.id === selectedVersion
                    ? 'w-8 bg-mc-green'
                    : 'w-2 bg-white/30 hover:bg-white/50'
                } ${isSliding ? 'cursor-not-allowed' : ''}`}
              />
            ))}
          </div>
        )}
      </div>
    </motion.div>
  )
}
