import { useState, useEffect } from 'react'
import { X, AlertTriangle, FileText, Clock, ChevronRight, ChevronDown, Bug, Cpu, Monitor, MemoryStick, Wrench, Trash2 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface CrashReport {
  id: string
  timestamp: number
  version: string
  instanceId?: string
  exitCode: number
  stackTrace: string
  systemInfo: {
    os: string
    osVersion: string
    javaVersion: string
    totalMemory: number
    cpuModel: string
    gpuInfo: string
  }
  modList: string[]
  jvmArgs: string[]
  diagnosis: {
    category: string
    title: string
    description: string
    solutions: { id: string; title: string; description: string; action: string }[]
    confidence: number
  } | null
  rawLog: string
}

interface CrashReportViewerProps {
  onClose: () => void
  initialReport?: CrashReport | null
}

export default function CrashReportViewer({ onClose, initialReport }: CrashReportViewerProps) {
  const [reports, setReports] = useState<CrashReport[]>([])
  const [selectedReport, setSelectedReport] = useState<CrashReport | null>(initialReport || null)
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['diagnosis']))

  useEffect(() => {
    window.minecraftAPI?.getCrashReports?.(20).then((r: CrashReport[]) => {
      setReports(r)
      if (!selectedReport && r.length > 0) {
        setSelectedReport(r[0])
      }
    })
  }, [])

  const toggleSection = (section: string) => {
    const next = new Set(expandedSections)
    if (next.has(section)) next.delete(section)
    else next.add(section)
    setExpandedSections(next)
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN')

  const getConfidenceColor = (c: number) => {
    if (c >= 0.9) return 'text-green-400'
    if (c >= 0.7) return 'text-yellow-400'
    return 'text-orange-400'
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-strong rounded-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 flex items-center justify-center">
              <Bug className="w-5 h-5 text-red-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">崩溃报告分析</h3>
              <p className="text-sm text-white/40">{reports.length} 份报告</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-hidden flex">
          {reports.length > 0 && (
            <div className="w-64 border-r border-white/5 overflow-auto p-3 space-y-1">
              {reports.map(report => (
                <button
                  key={report.id}
                  onClick={() => setSelectedReport(report)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedReport?.id === report.id
                      ? 'bg-white/5 border border-white/10'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <AlertTriangle className={`w-3.5 h-3.5 ${report.exitCode === -1 ? 'text-red-400' : 'text-orange-400'}`} />
                    <span className="text-sm font-medium text-white truncate">{report.version}</span>
                  </div>
                  <p className="text-xs text-white/30 mt-1">{formatDate(report.timestamp)}</p>
                  <p className="text-xs text-white/20 mt-0.5">Exit Code: {report.exitCode}</p>
                </button>
              ))}
            </div>
          )}

          <div className="flex-1 overflow-auto p-6 space-y-4">
            {selectedReport ? (
              <>
                {selectedReport.diagnosis && (
                  <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-400" />
                        <span className="font-medium text-white">{selectedReport.diagnosis.title}</span>
                      </div>
                      <span className={`text-xs font-mono ${getConfidenceColor(selectedReport.diagnosis.confidence)}`}>
                        置信度 {Math.round(selectedReport.diagnosis.confidence * 100)}%
                      </span>
                    </div>
                    <p className="text-sm text-white/60">{selectedReport.diagnosis.description}</p>

                    {selectedReport.diagnosis.solutions.length > 0 && (
                      <div className="space-y-2 pt-2 border-t border-white/5">
                        <span className="text-xs text-white/40">建议解决方案</span>
                        {selectedReport.diagnosis.solutions.map((sol, i) => (
                          <div key={sol.id} className="flex items-start gap-2 p-2 rounded-lg bg-white/5">
                            <Wrench className="w-4 h-4 text-mc-green mt-0.5 flex-shrink-0" />
                            <div>
                              <p className="text-sm text-white/80">{sol.title}</p>
                              <p className="text-xs text-white/40">{sol.description}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <button
                    onClick={() => toggleSection('system')}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <Monitor className="w-4 h-4 text-blue-400" />
                      <span className="text-sm font-medium text-white/60">系统信息</span>
                    </div>
                    {expandedSections.has('system') ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.has('system') && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <div className="px-4 pb-4 space-y-2 text-sm">
                          <div className="flex items-center gap-2"><Cpu className="w-3.5 h-3.5 text-white/30" /><span className="text-white/40">CPU:</span><span className="text-white/60">{selectedReport.systemInfo.cpuModel}</span></div>
                          <div className="flex items-center gap-2"><MemoryStick className="w-3.5 h-3.5 text-white/30" /><span className="text-white/40">内存:</span><span className="text-white/60">{selectedReport.systemInfo.totalMemory} MB</span></div>
                          <div className="flex items-center gap-2"><Monitor className="w-3.5 h-3.5 text-white/30" /><span className="text-white/40">GPU:</span><span className="text-white/60">{selectedReport.systemInfo.gpuInfo}</span></div>
                          <div className="flex items-center gap-2"><span className="w-3.5 text-center text-white/30 text-xs">OS</span><span className="text-white/40">系统:</span><span className="text-white/60">{selectedReport.systemInfo.os}</span></div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {selectedReport.modList.length > 0 && (
                  <div className="rounded-xl border border-white/5 overflow-hidden">
                    <button
                      onClick={() => toggleSection('mods')}
                      className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-orange-400" />
                        <span className="text-sm font-medium text-white/60">模组列表 ({selectedReport.modList.length})</span>
                      </div>
                      {expandedSections.has('mods') ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                    </button>
                    <AnimatePresence>
                      {expandedSections.has('mods') && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                          <div className="px-4 pb-4 max-h-40 overflow-auto space-y-1">
                            {selectedReport.modList.map((mod, i) => (
                              <p key={i} className="text-xs text-white/40 font-mono">{mod}</p>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}

                <div className="rounded-xl border border-white/5 overflow-hidden">
                  <button
                    onClick={() => toggleSection('rawlog')}
                    className="w-full flex items-center justify-between p-4 hover:bg-white/[0.02] transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-white/40" />
                      <span className="text-sm font-medium text-white/60">原始日志</span>
                    </div>
                    {expandedSections.has('rawlog') ? <ChevronDown className="w-4 h-4 text-white/30" /> : <ChevronRight className="w-4 h-4 text-white/30" />}
                  </button>
                  <AnimatePresence>
                    {expandedSections.has('rawlog') && (
                      <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="overflow-hidden">
                        <pre className="px-4 pb-4 text-xs text-white/30 font-mono max-h-60 overflow-auto whitespace-pre-wrap">
                          {selectedReport.rawLog.slice(0, 5000)}
                        </pre>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <Bug className="w-12 h-12 text-white/10 mx-auto mb-4" />
                  <p className="text-white/30">暂无崩溃报告</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
