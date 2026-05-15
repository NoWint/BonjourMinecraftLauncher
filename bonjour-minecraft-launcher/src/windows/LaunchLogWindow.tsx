import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import { X, Terminal, AlertCircle, Info, CheckCircle, Loader2, ChevronDown, ChevronRight, Zap, Activity, Shield, RotateCcw, Search, Pause, Play, ExternalLink } from 'lucide-react'
import { listen } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import WindowFrame from './WindowFrame'
import { Terminal as TerminalIcon } from 'lucide-react'
import type { LaunchPhaseId, LogDiagnosis } from '../types/launch'
import { LAUNCH_PHASES } from '../types/launch'
import { PHASE_META, classifyLogToPhase, diagnoseLog } from '../core/launch/launchPhases'

interface LaunchLogEntry {
  type: string
  message: string
  diagnosis?: LogDiagnosis
  phase?: LaunchPhaseId
  timestamp: number
}

const LOG_TYPE_STYLES: Record<string, string> = {
  error: 'text-red-400',
  warn: 'text-amber-400',
  warning: 'text-amber-400',
  info: 'text-blue-400',
  debug: 'text-white/40',
}

export default function LaunchLogWindow() {
  const [logs, setLogs] = useState<LaunchLogEntry[]>([])
  const [activeTab, setActiveTab] = useState<'dashboard' | 'logs'>('dashboard')
  const [expandedDiagnosis, setExpandedDiagnosis] = useState<number | null>(null)
  const [logFilter, setLogFilter] = useState('')
  const [autoScroll, setAutoScroll] = useState(true)
  const [sessionId, setSessionId] = useState<string>('')
  const [isGameRunning, setIsGameRunning] = useState(false)
  const logEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const sid = params.get('sessionId')
    if (sid) setSessionId(sid)
  }, [])

  useEffect(() => {
    const unlistenLog = listen<{ type: string; message: string }>('launch-log', (event) => {
      const entry: LaunchLogEntry = {
        ...event.payload,
        phase: classifyLogToPhase(event.payload.message),
        diagnosis: diagnoseLog(event.payload.message) ?? undefined,
        timestamp: Date.now(),
      }
      setLogs(prev => [...prev, entry])
    })

    const unlistenRunning = listen<{ sessionId: string; pid: number }>('launch-running', () => {
      setIsGameRunning(true)
    })

    const unlistenExit = listen<{ sessionId: string; exitCode: number }>('launch-exit', (event) => {
      setIsGameRunning(false)
      if (event.payload.exitCode === 0) {
        setTimeout(() => {
          getCurrentWindow().close().catch(() => {})
        }, 3000)
      }
    })

    return () => {
      unlistenLog.then(fn => fn())
      unlistenRunning.then(fn => fn())
      unlistenExit.then(fn => fn())
    }
  }, [])

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, autoScroll])

  const processedLogs = useMemo(() => logs.map((log, index) => ({
    ...log,
    index,
  })), [logs])

  const filteredLogs = useMemo(() => {
    if (!logFilter) return processedLogs
    return processedLogs.filter(l =>
      l.message.toLowerCase().includes(logFilter.toLowerCase()) ||
      l.type.toLowerCase().includes(logFilter.toLowerCase())
    )
  }, [processedLogs, logFilter])

  const phaseStatuses = useMemo(() => LAUNCH_PHASES.map(phase => {
    const phaseLogs = processedLogs.filter(l => l.phase === phase.id)
    const hasError = phaseLogs.some(l => l.type === 'error')
    const hasInfo = phaseLogs.some(l => l.type === 'info' || l.type === 'debug')
    const isActive = phaseLogs.length > 0 && !hasError && !hasInfo
    let status: 'pending' | 'active' | 'completed' | 'error' = 'pending'
    if (hasError) status = 'error'
    else if (isActive) status = 'active'
    else if (hasInfo) status = 'completed'
    return { ...phase, status, logCount: phaseLogs.length }
  }), [processedLogs])

  const diagnoses = useMemo(() =>
    processedLogs.filter(l => l.diagnosis).map((l, i) => ({ ...l, diagnosisIndex: i })),
    [processedLogs]
  )

  const getLogTypeColor = useCallback((type: string) => {
    return LOG_TYPE_STYLES[type.toLowerCase()] || 'text-white/60'
  }, [])

  return (
    <WindowFrame title={`启动日志${sessionId ? ` - ${sessionId.slice(0, 8)}` : ''}`} icon={<TerminalIcon className="w-4 h-4" />}>
      <div className="flex flex-col h-full">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'dashboard' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3 h-3 inline mr-1" />
            仪表盘
          </button>
          <button
            onClick={() => setActiveTab('logs')}
            className={`px-3 py-1 text-xs rounded-md transition-colors ${
              activeTab === 'logs' ? 'bg-white/10 text-white' : 'text-white/50 hover:bg-white/5'
            }`}
          >
            <Terminal className="w-3 h-3 inline mr-1" />
            日志 ({logs.length})
          </button>
          <div className="flex-1" />
          {isGameRunning && (
            <span className="flex items-center gap-1 text-xs text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              游戏运行中
            </span>
          )}
        </div>

        <div className="flex-1 overflow-hidden">
          {activeTab === 'dashboard' && (
            <div className="h-full overflow-y-auto p-3 space-y-4">
              <div className="space-y-1.5">
                {phaseStatuses.map(phase => (
                  <div key={phase.id} className="flex items-center gap-2">
                    {(() => { const Icon = PHASE_META[phase.id]?.icon; return Icon ? <Icon className="w-3.5 h-3.5" /> : null })()}
                    <span className="text-xs text-white/50 w-20">{PHASE_META[phase.id]?.label}</span>
                    <div className="flex-1 h-1.5 rounded-full bg-white/5 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          phase.status === 'error' ? 'bg-red-500' :
                          phase.status === 'completed' ? 'bg-emerald-500' :
                          phase.status === 'active' ? 'bg-blue-500' : 'bg-white/10'
                        }`}
                        style={{ width: phase.status === 'completed' || phase.status === 'error' ? '100%' : phase.status === 'active' ? '60%' : '0%' }}
                      />
                    </div>
                    <span className="text-xs text-white/30">{phase.logCount}</span>
                  </div>
                ))}
              </div>

              {diagnoses.length > 0 && (
                <div className="space-y-2">
                  <h3 className="text-xs font-medium text-white/50 flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    诊断结果
                  </h3>
                  {diagnoses.map((log, i) => (
                    <div key={i} className="rounded-lg border border-white/5 overflow-hidden">
                      <button
                        onClick={() => setExpandedDiagnosis(expandedDiagnosis === i ? null : i)}
                        className="w-full flex items-center gap-2 p-2 text-left hover:bg-white/[0.02]"
                      >
                        {expandedDiagnosis === i ? <ChevronDown className="w-3 h-3 text-white/30" /> : <ChevronRight className="w-3 h-3 text-white/30" />}
                        <AlertCircle className={`w-3.5 h-3.5 ${
                          log.diagnosis!.severity === 'critical' ? 'text-red-400' :
                          log.diagnosis!.severity === 'error' ? 'text-amber-400' : 'text-yellow-400'
                        }`} />
                        <span className="text-xs text-white/70">{log.diagnosis!.title}</span>
                      </button>
                      {expandedDiagnosis === i && (
                    <div className="overflow-hidden">
                      <div className="px-4 pb-2 space-y-1 text-xs">
                        <p className="text-white/50">{log.diagnosis!.description}</p>
                        <p className="text-emerald-400/80">💡 {log.diagnosis!.solution}</p>
                      </div>
                    </div>
                  )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'logs' && (
            <div className="flex flex-col h-full">
              <div className="shrink-0 px-3 py-1.5 flex items-center gap-2 border-b border-white/5">
                <div className="flex-1 relative">
                  <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-white/30" />
                  <input
                    type="text"
                    placeholder="过滤日志..."
                    value={logFilter}
                    onChange={e => setLogFilter(e.target.value)}
                    className="w-full pl-6 pr-2 py-1 text-xs rounded bg-white/5 border border-white/10 text-white/70 placeholder-white/30 focus:outline-none focus:border-white/20"
                  />
                </div>
                <button
                  onClick={() => setAutoScroll(!autoScroll)}
                  className={`p-1 rounded ${autoScroll ? 'bg-white/10' : ''}`}
                  title={autoScroll ? '暂停自动滚动' : '启用自动滚动'}
                >
                  {autoScroll ? <Pause className="w-3 h-3 text-white/50" /> : <Play className="w-3 h-3 text-white/50" />}
                </button>
              </div>
              <div className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-0.5">
                {filteredLogs.map((log, i) => (
                  <div key={i} className={`flex gap-2 px-1 py-0.5 rounded hover:bg-white/[0.02] ${getLogTypeColor(log.type)}`}>
                    <span className="text-white/20 shrink-0 w-16">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span className="shrink-0 w-10 uppercase text-[10px] opacity-60">[{log.type}]</span>
                    <span className="flex-1 break-all">{log.message}</span>
                  </div>
                ))}
                <div ref={logEndRef} />
              </div>
            </div>
          )}
        </div>
      </div>
    </WindowFrame>
  )
}
