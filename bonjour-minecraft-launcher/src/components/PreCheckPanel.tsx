import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle, AlertCircle, AlertTriangle, X, RefreshCw,
  Download, Monitor, Cpu, HardDrive, MemoryStick, Wifi, WifiOff,
  Gamepad2, ChevronDown, ChevronUp, Wrench, Shield, Zap, User, FolderOpen
} from 'lucide-react'

interface PreCheckItem {
  id: string
  name: string
  category: string
  status: 'pass' | 'warning' | 'block'
  message: string
  detail?: string
  fixAction?: string
  fixLabel?: string
  fixData?: any
}

interface PreCheckPanelProps {
  instanceId?: string
  gameVersion?: string
  onLaunch?: () => void
  onClose?: () => void
  skipPreCheck?: boolean
}

const categoryMeta: Record<string, { label: string; icon: any; color: string }> = {
  java: { label: 'Java 运行时', icon: Cpu, color: '#f97316' },
  memory: { label: '内存', icon: MemoryStick, color: '#a78bfa' },
  disk: { label: '磁盘', icon: HardDrive, color: '#60a5fa' },
  gpu: { label: '显卡', icon: Monitor, color: '#f472b6' },
  network: { label: '网络', icon: Wifi, color: '#34d399' },
  version: { label: '版本', icon: Gamepad2, color: '#fbbf24' },
  account: { label: '账号', icon: User, color: '#818cf8' },
  config: { label: '配置', icon: Wrench, color: '#94a3b8' },
  mod: { label: '模组', icon: Download, color: '#fb923c' },
}

export default function PreCheckPanel({ instanceId, gameVersion, onLaunch, onClose, skipPreCheck }: PreCheckPanelProps) {
  const [results, setResults] = useState<PreCheckItem[]>([])
  const [loading, setLoading] = useState(false)
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(new Set())
  const [fixing, setFixing] = useState<string | null>(null)
  const [forceSkip, setForceSkip] = useState(false)
  const [quickLaunch, setQuickLaunch] = useState(false)

  const runCheck = async () => {
    setLoading(true)
    try {
      const items = await window.minecraftAPI.runPreCheck(instanceId, gameVersion)
      setResults(items)
      const problemCategories = new Set(
        items.filter((i: PreCheckItem) => i.status !== 'pass').map((i: PreCheckItem) => i.category)
      )
      setExpandedCategories(problemCategories)
    } catch (error) {
      console.error('Pre-check failed:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (skipPreCheck) {
      setQuickLaunch(true)
      return
    }
    runCheck()
  }, [instanceId, gameVersion, skipPreCheck])

  const grouped = results.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = []
    acc[item.category].push(item)
    return acc
  }, {} as Record<string, PreCheckItem[]>)

  const passCount = results.filter(i => i.status === 'pass').length
  const warningCount = results.filter(i => i.status === 'warning').length
  const blockCount = results.filter(i => i.status === 'block').length
  const canLaunch = blockCount === 0 || forceSkip || skipPreCheck || quickLaunch
  const totalCount = results.length
  const healthPercent = totalCount > 0 ? Math.round((passCount / totalCount) * 100) : 0

  const toggleCategory = (cat: string) => {
    setExpandedCategories(prev => {
      const next = new Set(prev)
      if (next.has(cat)) next.delete(cat)
      else next.add(cat)
      return next
    })
  }

  const handleFix = async (item: PreCheckItem) => {
    setFixing(item.id)
    try {
      switch (item.fixAction) {
        case 'downloadJava':
          await window.minecraftAPI.downloadJavaVersion(21)
          break
        case 'downloadJavaVersion':
          if (item.fixData?.majorVersion) {
            await window.minecraftAPI.downloadJavaVersion(item.fixData.majorVersion)
          }
          break
        case 'installVersion':
          if (item.fixData?.gameVersion) {
            await window.minecraftAPI.installVersion(item.fixData.gameVersion)
          }
          break
        case 'addAccount':
          break
        case 'installWebView2':
          await window.minecraftAPI.openExternal('https://developer.microsoft.com/en-us/microsoft-edge/webview2/')
          break
      }
      await runCheck()
    } catch (error) {
      console.error('Fix failed:', error)
    } finally {
      setFixing(null)
    }
  }

  const statusRing = (status: string, size = 'sm') => {
    const s = size === 'sm' ? 'w-5 h-5' : 'w-8 h-8'
    const iconS = size === 'sm' ? 'w-3 h-3' : 'w-5 h-5'
    switch (status) {
      case 'pass': return (
        <div className={`${s} rounded-full bg-green-500/15 flex items-center justify-center`}>
          <CheckCircle className={`${iconS} text-green-500`} />
        </div>
      )
      case 'warning': return (
        <div className={`${s} rounded-full bg-amber-500/15 flex items-center justify-center`}>
          <AlertTriangle className={`${iconS} text-amber-500`} />
        </div>
      )
      case 'block': return (
        <div className={`${s} rounded-full bg-red-500/15 flex items-center justify-center`}>
          <AlertCircle className={`${iconS} text-red-500`} />
        </div>
      )
      default: return null
    }
  }

  const healthColor = healthPercent >= 80 ? '#4ade80' : healthPercent >= 50 ? '#fbbf24' : '#ef4444'

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 20, scale: 0.98 }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      className="glass-strong rounded-2xl overflow-hidden"
      style={{ maxWidth: '560px', width: '100%', border: '1px solid var(--border-subtle)' }}
    >
      <div className="p-6 pb-4">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}>
              <Shield className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
                启动前检查
              </h3>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {loading ? '正在扫描系统环境...' : `${totalCount} 项检查完成`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={runCheck} disabled={loading}
              className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-hover)' }}>
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} style={{ color: 'var(--text-muted)' }} />
            </button>
            {onClose && (
              <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-hover)' }}>
                <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}
          </div>
        </div>

        {loading ? (
          <div className="flex flex-col items-center py-10">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }}
              className="w-10 h-10 rounded-full mb-4"
              style={{
                border: '2px solid var(--border-subtle)',
                borderTopColor: 'var(--accent)',
              }}
            />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>正在检查系统环境...</p>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-4 mb-5 p-3 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
              <div className="relative w-14 h-14 flex-shrink-0">
                <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="24" fill="none" stroke="var(--border-subtle)" strokeWidth="4" />
                  <motion.circle
                    cx="28" cy="28" r="24" fill="none"
                    stroke={healthColor}
                    strokeWidth="4"
                    strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 24}`}
                    initial={{ strokeDashoffset: 2 * Math.PI * 24 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 24 * (1 - healthPercent / 100) }}
                    transition={{ duration: 0.8, ease: 'easeOut' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-sm font-bold" style={{ color: healthColor }}>{healthPercent}%</span>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1.5">
                  <div className="flex items-center gap-1">
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                    <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{passCount}</span>
                  </div>
                  {warningCount > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{warningCount}</span>
                    </div>
                  )}
                  {blockCount > 0 && (
                    <div className="flex items-center gap-1">
                      <AlertCircle className="w-3.5 h-3.5 text-red-500" />
                      <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{blockCount}</span>
                    </div>
                  )}
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {blockCount > 0 ? `${blockCount} 个阻断问题需要解决` :
                   warningCount > 0 ? `${warningCount} 个警告，可以启动` : '所有检查已通过，可以启动'}
                </p>
              </div>
            </div>

            <div className="space-y-1.5 max-h-72 overflow-auto pr-1" style={{ scrollbarWidth: 'thin' }}>
              {Object.entries(grouped).map(([category, items]) => {
                const meta = categoryMeta[category] || { label: category, icon: Monitor, color: '#94a3b8' }
                const CatIcon = meta.icon
                const catHasBlock = items.some(i => i.status === 'block')
                const catHasWarning = items.some(i => i.status === 'warning')
                const catAllPass = !catHasBlock && !catHasWarning
                const isExpanded = expandedCategories.has(category)

                return (
                  <div key={category} className="rounded-xl overflow-hidden transition-all"
                    style={{ background: isExpanded ? 'var(--bg-hover)' : 'transparent' }}>
                    <button
                      onClick={() => toggleCategory(category)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-xl transition-all"
                      style={{ background: !isExpanded ? 'transparent' : undefined }}
                    >
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: `${meta.color}15` }}>
                        <CatIcon className="w-3.5 h-3.5" style={{ color: meta.color }} />
                      </div>
                      <span className="text-sm font-medium flex-1 text-left" style={{ color: 'var(--text-primary)' }}>
                        {meta.label}
                      </span>
                      {catHasBlock ? statusRing('block') :
                       catHasWarning ? statusRing('warning') :
                       statusRing('pass')}
                      <motion.div
                        animate={{ rotate: isExpanded ? 180 : 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ChevronDown className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
                      </motion.div>
                    </button>

                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.2 }}
                          className="overflow-hidden"
                        >
                          <div className="px-3 pb-2 space-y-1">
                            {items.map(item => (
                              <div key={item.id}
                                className="flex items-start gap-2.5 px-3 py-2 rounded-lg"
                                style={{ background: 'var(--bg-primary)' }}>
                                <div className="mt-0.5 flex-shrink-0">
                                  {item.status === 'pass' ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> :
                                   item.status === 'warning' ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> :
                                   <AlertCircle className="w-3.5 h-3.5 text-red-500" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium" style={{ color: 'var(--text-primary)' }}>{item.name}</p>
                                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{item.message}</p>
                                  {item.detail && (
                                    <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--text-muted)', opacity: 0.6 }}>{item.detail}</p>
                                  )}
                                </div>
                                {item.fixAction && item.fixLabel && (
                                  <button
                                    onClick={() => handleFix(item)}
                                    disabled={fixing === item.id}
                                    className="shrink-0 text-xs px-2.5 py-1 rounded-lg font-medium transition-all flex items-center gap-1"
                                    style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
                                  >
                                    {fixing === item.id ? (
                                      <motion.div animate={{ rotate: 360 }} transition={{ duration: 0.6, repeat: Infinity, ease: 'linear' }}>
                                        <RefreshCw className="w-3 h-3" />
                                      </motion.div>
                                    ) : null}
                                    {fixing === item.id ? '处理中' : item.fixLabel}
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </div>

      {onLaunch && (
        <div className="px-6 py-4 flex items-center justify-between"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            {!quickLaunch && !skipPreCheck && (
              <button
                onClick={() => setQuickLaunch(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{ background: 'var(--accent-dim)', color: 'var(--accent)' }}
              >
                <Zap className="w-3 h-3" />
                快速启动
              </button>
            )}
            {blockCount > 0 && !forceSkip && !skipPreCheck && !quickLaunch && (
              <button
                onClick={() => setForceSkip(true)}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all flex items-center gap-1"
                style={{ background: 'rgba(239, 68, 68, 0.08)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.15)' }}
              >
                <Zap className="w-3 h-3" />
                跳过自检
              </button>
            )}
            {(forceSkip || skipPreCheck || quickLaunch) && blockCount > 0 && (
              <button
                onClick={() => { setForceSkip(false); setQuickLaunch(false) }}
                className="text-xs px-3 py-1.5 rounded-lg font-medium transition-all"
                style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
              >
                恢复自检
              </button>
            )}
            {!blockCount && !warningCount && !quickLaunch && (
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <CheckCircle className="w-3 h-3" />
                所有检查已通过
              </p>
            )}
            {quickLaunch && (
              <p className="text-xs flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                <Zap className="w-3 h-3" />
                快速启动模式
              </p>
            )}
          </div>
          <motion.button
            onClick={onLaunch}
            disabled={!canLaunch || loading}
            whileHover={canLaunch ? { scale: 1.02 } : {}}
            whileTap={canLaunch ? { scale: 0.98 } : {}}
            className="px-6 py-2.5 rounded-xl text-sm font-semibold transition-all disabled:opacity-30 flex items-center gap-2"
            style={{
              background: blockCount > 0 && canLaunch
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 80%, #000))',
              color: blockCount > 0 && canLaunch ? 'white' : 'var(--accent-text)',
              boxShadow: canLaunch ? `0 4px 12px ${blockCount > 0 ? 'rgba(239,68,68,0.3)' : 'rgba(74,222,128,0.3)'}` : 'none',
            }}
          >
            <Zap className="w-4 h-4" />
            启动游戏
          </motion.button>
        </div>
      )}
    </motion.div>
  )
}
