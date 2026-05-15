import { useState, useEffect } from 'react'
import { Zap, Clock, TrendingUp, TrendingDown, Minus, BarChart3, Play, Star } from 'lucide-react'
import { motion } from 'framer-motion'

interface BenchmarkRecord {
  id: string
  version: string
  timestamp: number
  totalDuration: number
  phaseDurations: Record<string, number>
  javaVersion: string
  maxMemory: number
  modCount: number
  exitCode: number | null
}

interface BenchmarkSummary {
  version: string
  averageDuration: number
  minDuration: number
  maxDuration: number
  sampleCount: number
  lastDuration: number
  deviation: number
  trend: 'improving' | 'stable' | 'degrading'
}

interface LaunchBenchmarkPanelProps {
  version: string
  onQuickLaunch?: (version: string) => void
}

export default function LaunchBenchmarkPanel({ version, onQuickLaunch }: LaunchBenchmarkPanelProps) {
  const [summary, setSummary] = useState<BenchmarkSummary | null>(null)
  const [records, setRecords] = useState<BenchmarkRecord[]>([])
  const [defaultVersion, setDefaultVersion] = useState<string>(version)

  useEffect(() => {
    window.minecraftAPI?.getBenchmarkSummary?.(version).then((s) => {
      setSummary(s as BenchmarkSummary | null)
    })
    window.minecraftAPI?.getLaunchBenchmarks?.(version, 10).then((r) => {
      setRecords(r as BenchmarkRecord[])
    })
  }, [version])

  useEffect(() => {
    window.minecraftAPI?.setupTray?.(defaultVersion)
  }, [defaultVersion])

  const formatDuration = (ms: number) => {
    if (ms < 1000) return `${ms}ms`
    return `${(ms / 1000).toFixed(1)}s`
  }

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'improving': return <TrendingUp className="w-4 h-4 text-green-400" />
      case 'degrading': return <TrendingDown className="w-4 h-4 text-red-400" />
      default: return <Minus className="w-4 h-4 text-white/30" />
    }
  }

  const getTrendLabel = (trend: string) => {
    switch (trend) {
      case 'improving': return '改善中'
      case 'degrading': return '退化中'
      default: return '稳定'
    }
  }

  return (
    <div className="space-y-6">
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3"
        >
          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-4 h-4 text-mc-green" />
              <span className="text-xs text-white/40">平均启动时间</span>
            </div>
            <p className="text-xl font-bold text-white font-mono">{formatDuration(summary.averageDuration)}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-yellow-400" />
              <span className="text-xs text-white/40">最快启动</span>
            </div>
            <p className="text-xl font-bold text-white font-mono">{formatDuration(summary.minDuration)}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              <BarChart3 className="w-4 h-4 text-blue-400" />
              <span className="text-xs text-white/40">样本数</span>
            </div>
            <p className="text-xl font-bold text-white font-mono">{summary.sampleCount}</p>
          </div>

          <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
            <div className="flex items-center gap-2 mb-2">
              {getTrendIcon(summary.trend)}
              <span className="text-xs text-white/40">趋势</span>
            </div>
            <p className="text-xl font-bold text-white">{getTrendLabel(summary.trend)}</p>
          </div>
        </motion.div>
      )}

      <div className="rounded-xl border border-white/5 overflow-hidden">
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-yellow-400" />
            <span className="text-sm font-medium text-white/60">快速启动</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/30">默认版本:</span>
            <select
              value={defaultVersion}
              onChange={e => setDefaultVersion(e.target.value)}
              className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-sm text-white"
            >
              <option value={version}>{version}</option>
            </select>
          </div>
        </div>
        <div className="p-4">
          <button
            onClick={() => onQuickLaunch?.(defaultVersion)}
            className="w-full py-3 bg-mc-green/10 border border-mc-green/20 rounded-xl text-mc-green font-medium hover:bg-mc-green/20 transition-all flex items-center justify-center gap-2"
          >
            <Play className="w-4 h-4" />
            <span>快速启动 {defaultVersion}</span>
          </button>
        </div>
      </div>

      {records.length > 0 && (
        <div className="rounded-xl border border-white/5 overflow-hidden">
          <div className="p-4 border-b border-white/5">
            <span className="text-sm font-medium text-white/60">最近启动记录</span>
          </div>
          <div className="divide-y divide-white/5">
            {records.map(record => (
              <div key={record.id} className="px-4 py-3 flex items-center justify-between hover:bg-white/[0.02] transition-colors">
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${record.exitCode === 0 ? 'bg-green-400' : 'bg-red-400'}`} />
                  <div>
                    <p className="text-sm text-white/60">{new Date(record.timestamp).toLocaleString('zh-CN')}</p>
                    <p className="text-xs text-white/30">{record.modCount} 模组 · {record.maxMemory}MB</p>
                  </div>
                </div>
                <span className="text-sm font-mono text-white/40">{formatDuration(record.totalDuration)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {!summary && records.length === 0 && (
        <div className="text-center py-12">
          <BarChart3 className="w-12 h-12 text-white/10 mx-auto mb-4" />
          <p className="text-white/30">暂无启动基准数据</p>
          <p className="text-sm text-white/20 mt-1">启动游戏后将自动记录启动耗时</p>
        </div>
      )}
    </div>
  )
}
