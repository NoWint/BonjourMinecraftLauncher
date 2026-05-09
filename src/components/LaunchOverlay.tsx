import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { X, Terminal, AlertCircle, Info, CheckCircle, Loader2, ChevronDown, ChevronRight, Zap, Activity, Shield, RotateCcw } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { LaunchPhaseId, LogDiagnosis } from '../types/launch'
import { LAUNCH_PHASES } from '../types/launch'

interface LaunchLogEntry {
  type: string
  message: string
  diagnosis?: LogDiagnosis
  phase?: LaunchPhaseId
}

interface LaunchOverlayProps {
  logs: { type: string; message: string }[]
  onClose: () => void
  sessionId?: string
}

const PHASE_META: Record<LaunchPhaseId, { icon: string; label: string; color: string }> = {
  validating: { icon: '🔍', label: '验证', color: '#94a3b8' },
  java_init: { icon: '☕', label: 'Java 初始化', color: '#f97316' },
  downloading: { icon: '📥', label: '下载资源', color: '#60a5fa' },
  extracting: { icon: '📦', label: '解压文件', color: '#a78bfa' },
  class_loading: { icon: '⚙️', label: '加载类', color: '#fbbf24' },
  resource_loading: { icon: '🎨', label: '加载资源', color: '#f472b6' },
  window_creating: { icon: '🪟', label: '创建窗口', color: '#4ade80' },
}

function classifyLogToPhase(message: string): LaunchPhaseId {
  const lower = message.toLowerCase()
  if (lower.includes('validating') || lower.includes('checking') || lower.includes('verifying')) return 'validating'
  if (lower.includes('java') || lower.includes('jvm') || lower.includes('launching') || lower.includes('main')) return 'java_init'
  if (lower.includes('download') || lower.includes('fetching') || lower.includes('progress')) return 'downloading'
  if (lower.includes('extract') || lower.includes('unzip') || lower.includes('decompress')) return 'extracting'
  if (lower.includes('class') || lower.includes('loading') || lower.includes('init') || lower.includes('forge') || lower.includes('fabric') || lower.includes('mod')) return 'class_loading'
  if (lower.includes('resource') || lower.includes('asset') || lower.includes('texture') || lower.includes('sound')) return 'resource_loading'
  if (lower.includes('window') || lower.includes('display') || lower.includes('opengl') || lower.includes('render')) return 'window_creating'
  return 'class_loading'
}

function diagnoseLog(message: string): LogDiagnosis | null {
  const rules = [
    { pattern: /UnsupportedClassVersionError|class file version.*unsupported/i, title: 'Java 版本不兼容', description: '游戏或模组需要更高版本的 Java', solution: '请更新 Java 到 17 或更高版本', severity: 'critical' as const },
    { pattern: /OptiFine.*Sodium|Sodium.*OptiFine/i, title: 'OptiFine 与 Sodium 冲突', description: 'OptiFine 和 Sodium 不能同时使用', solution: '移除其中一个，推荐保留 Sodium', severity: 'critical' as const },
    { pattern: /OutOfMemoryError|Java heap space/i, title: '内存不足', description: '分配给游戏的内存不够', solution: '增加最大内存分配或减少模组数量', severity: 'critical' as const },
    { pattern: /GLFW error|OpenGL.*not supported/i, title: '显卡驱动问题', description: '显卡驱动过旧或不支持所需 OpenGL 版本', solution: '更新显卡驱动到最新版本', severity: 'critical' as const },
    { pattern: /Missing dependency|requires.*which is missing/i, title: '模组缺少依赖', description: '某个模组需要的前置模组未安装', solution: '下载并安装对应的前置模组', severity: 'error' as const },
    { pattern: /Mixin.*error|MixinApplyError/i, title: 'Mixin 注入失败', description: '模组的 Mixin 注入失败，通常是模组间冲突', solution: '查看日志中具体冲突的模组，尝试移除或更新', severity: 'error' as const },
    { pattern: /Failed to download|Unable to download/i, title: '下载失败', description: '游戏资源下载失败', solution: '检查网络连接；尝试切换下载源', severity: 'error' as const },
    { pattern: /Duplicate mod|Found duplicate/i, title: '模组重复安装', description: '检测到重复的模组文件', solution: '检查 mods 文件夹，删除重复的模组 jar 文件', severity: 'warning' as const },
    { pattern: /shader.*error|GLSL.*compile/i, title: '光影包错误', description: '光影包加载失败', solution: '更新光影包或检查兼容性', severity: 'warning' as const },
  ]
  for (const rule of rules) {
    if (rule.pattern.test(message)) {
      return { matched: true, ruleId: rule.title, title: rule.title, description: rule.description, solution: rule.solution, severity: rule.severity }
    }
  }
  return null
}

export default function LaunchOverlay({ logs, onClose, sessionId }: LaunchOverlayProps) {
  const logEndRef = useRef<HTMLDivElement>(null)
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard')
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(null)

  const processedLogs = useMemo(() => logs.map((log, index) => ({
    ...log,
    phase: classifyLogToPhase(log.message),
    diagnosis: diagnoseLog(log.message),
    index,
  })), [logs])

  const phaseStatuses = useMemo(() => LAUNCH_PHASES.map(phase => {
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
  }), [processedLogs])

  const currentPhaseIndex = phaseStatuses.findIndex(p => p.status === 'active' || p.status === 'error')
  const completedPhases = phaseStatuses.filter(p => p.status === 'completed').length
  const progressPercent = Math.round((completedPhases / LAUNCH_PHASES.length) * 100)

  const diagnoses = processedLogs.filter(l => l.diagnosis)

  useEffect(() => {
    if (activeTab === 'logs') {
      logEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, activeTab])

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
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>启动引擎</h3>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>
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
                    <span className="text-[10px] font-medium" style={{ color: 'var(--text-muted)' }}>启动进度</span>
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
                        <span className="text-sm flex-shrink-0">{meta.icon}</span>
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
                className="h-full overflow-auto p-4 font-mono text-[10px]"
              >
                {logs.length === 0 ? (
                  <div className="flex items-center justify-center h-full">
                    <div className="text-center">
                      <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
                        className="w-5 h-5 rounded-full mx-auto mb-2"
                        style={{ border: '2px solid var(--border-subtle)', borderTopColor: 'var(--accent)' }}
                      />
                      <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>等待日志...</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-px">
                    {logs.map((log, index) => (
                      <div
                        key={index}
                        className={`flex items-start gap-1.5 ${log.type === 'error' ? 'text-red-400' : ''}`}
                        style={{ color: log.type === 'debug' ? 'var(--text-disabled)' : 'var(--text-muted)' }}
                      >
                        {getLogIcon(log.type)}
                        <span className="break-all leading-relaxed">{log.message}</span>
                      </div>
                    ))}
                    <div ref={logEndRef} />
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="px-4 py-2.5 flex items-center justify-between" style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <p className="text-[10px]" style={{ color: 'var(--text-disabled)' }}>
              {logs.length} 条日志
            </p>
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
