import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { X, Terminal, AlertCircle, Info, CheckCircle, Loader2, ChevronDown, ChevronRight, Zap, Activity, Shield, RotateCcw, Search, Pause, Play, ExternalLink, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { LAUNCH_PHASES } from '../types/launch'
import { PHASE_META, classifyLogToPhase, diagnoseLog } from '../core/launch/launchPhases'
import { useLaunchStore } from '../stores/useLaunchStore'

interface LaunchOverlayProps {
  logs: { type: string; message: string }[]
  onClose: () => void
  versionName: string
  launchStartTime: number
  onPopOut?: () => void
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(totalSeconds / 60)
  const seconds = totalSeconds % 60
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
}

export default function LaunchOverlay({ logs, onClose, versionName, launchStartTime, onPopOut }: LaunchOverlayProps) {
  const logEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard')
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(null)
  const [logFilter, setLogFilter] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [elapsedMs, setElapsedMs] = useState(0)

  const session = useLaunchStore((s) => s.session)
  const storeIsLaunching = useLaunchStore((s) => s.isLaunching)

  useEffect(() => {
    if (launchStartTime <= 0) return

    const tick = () => {
      setElapsedMs(Date.now() - launchStartTime)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [launchStartTime])

  useEffect(() => {
    if (!storeIsLaunching) {
      setElapsedMs(0)
    }
  }, [storeIsLaunching])

  const processedLogs = useMemo(() => logs.map((log, index) => ({
    ...log,
    phase: classifyLogToPhase(log.message),
    diagnosis: diagnoseLog(log.message),
    index,
  })), [logs])

  const phaseStatuses = useMemo(() => {
    if (session) {
      return LAUNCH_PHASES.map(phase => {
        const sp = session.phases[phase.id]
        if (!sp) return { ...phase, status: 'pending' as const, logCount: 0 }
        return {
          ...phase,
          status: sp.status,
          logCount: sp.logs.length,
        }
      })
    }

    return LAUNCH_PHASES.map(phase => {
      const phaseLogs = processedLogs.filter(l => l.phase === phase.id)
      const hasError = phaseLogs.some(l => l.type === 'error')
      const hasInfo = phaseLogs.some(l => l.type === 'info' || l.type === 'debug')
      let status: 'pending' | 'active' | 'completed' | 'error' = 'pending'
      if (hasError) status = 'error'
      else if (hasInfo) status = 'active'

      const laterPhasesHaveLogs = LAUNCH_PHASES.slice(LAUNCH_PHASES.findIndex(p => p.id === phase.id) + 1)
        .some(p => processedLogs.some(l => l.phase === p.id))
      if (status === 'active' && laterPhasesHaveLogs) status = 'completed'

      return { ...phase, status, logCount: phaseLogs.length }
    })
  }, [processedLogs, session])

  const currentPhaseIndex = phaseStatuses.findIndex(p => p.status === 'active' || p.status === 'error')
  const completedPhases = phaseStatuses.filter(p => p.status === 'completed').length
  const progressPercent = Math.round((completedPhases / LAUNCH_PHASES.length) * 100)

  const diagnoses = processedLogs.filter(l => l.diagnosis)

  useEffect(() => {
    if (activeTab === 'logs' && autoScroll) {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab, autoScroll])

  const filteredLogs = useMemo(() => {
    if (!logFilter.trim()) return logs
    const q = logFilter.toLowerCase()
    return logs.filter(log => log.message.toLowerCase().includes(q) || log.type.toLowerCase().includes(q))
  }, [logs, logFilter])

  const getLogIcon = useCallback((type: string) => {
    switch (type) {
      case 'error': return <AlertCircle className="w-3 h-3 text-red-400 flex-shrink-0" />
      case 'debug': return <Terminal className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-disabled)' }} />
      default: return <Info className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--accent)' }} />
    }
  }, [])

  const getSeverityStyle = useCallback((severity: string) => {
    switch (severity) {
      case 'critical': return { bg: 'rgba(239,68,68,0.08)', border: 'rgba(239,68,68,0.2)', badge: 'rgba(239,68,68,0.15)', text: '#ef4444', label: '严重' }
      case 'error': return { bg: 'rgba(249,115,22,0.08)', border: 'rgba(249,115,22,0.2)', badge: 'rgba(249,115,22,0.15)', text: '#f97316', label: '错误' }
      case 'warning': return { bg: 'rgba(251,191,36,0.08)', border: 'rgba(251,191,36,0.2)', badge: 'rgba(251,191,36,0.15)', text: '#fbbf24', label: '警告' }
      default: return { bg: 'rgba(96,165,250,0.08)', border: 'rgba(96,165,250,0.2)', badge: 'rgba(96,165,250,0.15)', text: '#60a5fa', label: '信息' }
    }
  }, [])

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.15 }}
      className="fixed inset-0 flex items-center justify-center z-50 p-6"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(12px) saturate(1.2)' }}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.98, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.98, y: 10 }}
        transition={{ type: 'spring', stiffness: 500, damping: 35 }}
        className="glass-strong rounded-2xl w-full max-w-3xl h-full max-h-[75vh] flex flex-col"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center justify-between px-4 py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center"
              style={{ background: 'var(--accent-dim)' }}>
              <Zap className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>启动引擎</h3>
                {launchStartTime > 0 && (
                  <span className="flex items-center gap-1 text-xs font-mono" style={{ color: 'var(--accent)' }}>
                    <Clock className="w-3 h-3" />
                    {formatElapsed(elapsedMs)}
                  </span>
                )}
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
                {versionName && <span>{versionName} · </span>}
                {logs.length > 0 ? `${progressPercent}% · ${phaseStatuses[currentPhaseIndex]?.label || '处理中'}` : '准备启动...'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-0.5 p-0.5 rounded-md" style={{ background: 'var(--bg-hover)' }}>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                style={{
                  background: activeTab === 'dashboard' ? 'var(--bg-active)' : 'transparent',
                  color: activeTab === 'dashboard' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <div className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  <span>仪表盘</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('logs')}
                className="px-2.5 py-1 rounded text-[10px] font-medium transition-all"
                style={{
                  background: activeTab === 'logs' ? 'var(--bg-active)' : 'transparent',
                  color: activeTab === 'logs' ? 'var(--text-primary)' : 'var(--text-muted)',
                }}
              >
                <div className="flex items-center gap-1">
                  <Terminal className="w-3 h-3" />
                  <span>日志</span>
                  {logs.length > 0 && (
                    <span style={{ color: 'var(--text-disabled)' }}>{logs.length}</span>
                  )}
                </div>
              </button>
            </div>

            {onPopOut && (
              <button
                onClick={onPopOut}
                className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
                style={{ background: 'var(--bg-hover)' }}
                title="在新窗口中打开日志"
              >
                <ExternalLink className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
              </button>
            )}

            <button
              onClick={onClose}
              className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
              style={{ background: 'var(--bg-hover)' }}
            >
              <X className="w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-hidden">
          <AnimatePresence mode="wait">
            {activeTab === 'dashboard' ? (
              <motion.div
                key="dashboard"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full overflow-auto p-4 space-y-4"
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>启动进度</span>
                      {launchStartTime > 0 && (
                        <span className="text-xs font-mono" style={{ color: 'var(--accent)' }}>
                          已用 {formatElapsed(elapsedMs)}
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] font-mono font-bold" style={{ color: 'var(--accent)' }}>{progressPercent}%</span>
                  </div>
                  <div className="h-1 rounded-full overflow-hidden" style={{ background: 'var(--bg-hover)' }}>
                    <motion.div
                      className="h-full rounded-full"
                      style={{ background: 'linear-gradient(90deg, var(--accent), color-mix(in srgb, var(--accent) 70%, #fff))' }}
                      initial={{ width: 0 }}
                      animate={{ width: `${progressPercent}%` }}
                      transition={{ duration: 0.3, ease: 'easeOut' }}
                    />
                  </div>
                </div>

                <div className="space-y-0.5">
                  {phaseStatuses.map((phase) => {
                    const meta = PHASE_META[phase.id]
                    const isActive = phase.status === 'active'
                    const isError = phase.status === 'error'
                    const isCompleted = phase.status === 'completed'

                    return (
                      <div
                        key={phase.id}
                        className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg transition-all"
                        style={{
                          background: isActive ? 'var(--accent-dim)' : isError ? 'rgba(239,68,68,0.08)' : 'transparent',
                        }}
                      >
                        {(() => { const Icon = meta.icon; return <Icon className="w-3.5 h-3.5 flex-shrink-0" /> })()}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] font-medium"
                              style={{ color: isActive ? 'var(--accent)' : isError ? '#ef4444' : isCompleted ? 'var(--text-secondary)' : 'var(--text-disabled)' }}>
                              {phase.label}
                            </span>
                            {isActive && (
                              <Loader2 className="w-3 h-3 animate-spin" style={{ color: 'var(--accent)' }} />
                            )}
                            {isCompleted && (
                              <CheckCircle className="w-3 h-3" style={{ color: 'var(--accent)', opacity: 0.6 }} />
                            )}
                            {isError && (
                              <AlertCircle className="w-3 h-3 text-red-400" />
                            )}
                            {session && session.phases[phase.id]?.duration != null && (
                              <span className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>
                                {Math.round(session.phases[phase.id].duration! / 1000)}s
                              </span>
                            )}
                          </div>
                        </div>
                        {phase.logCount > 0 && (
                          <span className="text-[10px] font-mono" style={{ color: 'var(--text-disabled)' }}>{phase.logCount}</span>
                        )}
                      </div>
                    )
                  })}
                </div>

                {diagnoses.length > 0 && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-1.5">
                      <Shield className="w-3 h-3" style={{ color: '#f97316' }} />
                      <span className="text-[10px] font-medium" style={{ color: 'var(--text-secondary)' }}>智能诊断</span>
                    </div>
                    {diagnoses.map((log, index) => {
                      if (!log.diagnosis) return null
                      const sevStyle = getSeverityStyle(log.diagnosis.severity)
                      return (
                        <div
                          key={index}
                          className="rounded-lg p-2.5"
                          style={{ background: sevStyle.bg, border: `1px solid ${sevStyle.border}` }}
                        >
                          <button
                            onClick={() => setExpandedDiagnosis(expandedDiagnosis === index ? null : index)}
                            className="w-full flex items-center justify-between"
                          >
                            <div className="flex items-center gap-1.5">
                              <span className="px-1 py-0.5 rounded text-[10px] font-medium"
                                style={{ background: sevStyle.badge, color: sevStyle.text }}>
                                {sevStyle.label}
                              </span>
                              <span className="text-[11px] font-medium" style={{ color: 'var(--text-primary)' }}>{log.diagnosis.title}</span>
                            </div>
                            {expandedDiagnosis === index ? (
                              <ChevronDown className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                            ) : (
                              <ChevronRight className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                            )}
                          </button>
                          <AnimatePresence>
                            {expandedDiagnosis === index && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.15 }}
                                className="overflow-hidden"
                              >
                                <div className="mt-2 pt-2 space-y-1" style={{ borderTop: '1px solid var(--border-subtle)' }}>
                                  <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{log.diagnosis.description}</p>
                                  <div className="flex items-start gap-1.5 p-1.5 rounded-md" style={{ background: 'var(--accent-dim)' }}>
                                    <RotateCcw className="w-3 h-3 mt-0.5 flex-shrink-0" style={{ color: 'var(--accent)' }} />
                                    <p className="text-[10px]" style={{ color: 'var(--accent)' }}>{log.diagnosis.solution}</p>
                                  </div>
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      )
                    })}
                  </div>
                )}

                {logs.length === 0 && (
                  <div className="flex items-center justify-center h-32">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-6 h-6 rounded-full mx-auto mb-2"
                        style={{ border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)' }}
                      />
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>正在初始化启动引擎...</p>
                    </div>
                  </div>
                )}
              </motion.div>
            ) : (
              <motion.div
                key="logs"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.1 }}
                className="h-full flex flex-col"
              >
                <div className="flex items-center gap-2 px-4 py-2 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="flex-1 flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs" style={{ background: 'var(--surface-field)' }}>
                    <Search className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      value={logFilter}
                      onChange={(e) => setLogFilter(e.target.value)}
                      placeholder="搜索日志..."
                      className="flex-1 bg-transparent outline-none text-[10px]"
                      style={{ color: 'var(--text-primary)' }}
                      aria-label="搜索日志"
                    />
                    {logFilter && (
                      <button onClick={() => setLogFilter('')} className="flex-shrink-0">
                        <X className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                      </button>
                    )}
                  </div>
                  <button
                    onClick={() => setAutoScroll(!autoScroll)}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-all"
                    style={{ background: autoScroll ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
                    title={autoScroll ? '自动滚动中' : '已暂停滚动'}
                    aria-label={autoScroll ? '暂停自动滚动' : '恢复自动滚动'}
                  >
                    {autoScroll ? (
                      <Pause className="w-3 h-3" style={{ color: 'var(--accent)' }} />
                    ) : (
                      <Play className="w-3 h-3" style={{ color: 'var(--text-muted)' }} />
                    )}
                  </button>
                </div>
                <div className="flex-1 overflow-auto p-4 font-mono text-[10px]">
                  {filteredLogs.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        {logs.length === 0 ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                              className="w-5 h-5 rounded-full mx-auto mb-2"
                              style={{ border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)' }}
                            />
                            <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>等待日志...</p>
                          </>
                        ) : (
                          <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>无匹配日志</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-px">
                      {filteredLogs.map((log, index) => {
                        const logColor = log.type === 'error' ? '#ef4444' :
                          log.type === 'warning' ? '#fbbf24' :
                          log.type === 'info' ? '#60a5fa' :
                          'var(--text-muted)'
                        const logBg = log.type === 'error' ? 'rgba(239,68,68,0.06)' :
                          log.type === 'warning' ? 'rgba(251,191,36,0.04)' : 'transparent'

                        return (
                          <div
                            key={index}
                            className="flex items-start gap-1.5 px-1 py-0.5 rounded"
                            style={{ color: logColor, background: logBg }}
                          >
                            {getLogIcon(log.type)}
                            <span className="break-all leading-relaxed">{log.message}</span>
                          </div>
                        )
                      })}
                      <div ref={logEndRef} />
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
              {logs.length} 条日志
            </p>
            {launchStartTime > 0 && (
              <p className="text-[10px] font-mono" style={{ color: 'var(--accent)' }}>
                {formatElapsed(elapsedMs)}
              </p>
            )}
            {diagnoses.length > 0 && (
              <p className="text-[10px]" style={{ color: '#f97316' }}>
                {diagnoses.length} 个诊断
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-[10px] font-medium transition-all"
            style={{ background: 'var(--bg-hover)', color: 'var(--text-muted)' }}
          >
            隐藏窗口
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}
