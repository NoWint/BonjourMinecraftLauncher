import { useState, useEffect } from 'react'
import { X, Shield, BarChart3, Server, CheckCircle, AlertTriangle, TrendingUp } from 'lucide-react'
import { motion } from 'framer-motion'

interface CompatibilityCard {
  version: string
  dim: number
  server: number
  stable: number
  ready: number
  overall: number
  modCount: number
  serverCount: number
  knownBugs: number
}

interface VersionCompatibilityCardProps {
  version: string
  onClose?: () => void
  compact?: boolean
}

function ScoreBar({ value, label, color }: { value: number; label: string; color: string }) {
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-xs text-white/40">{label}</span>
        <span className="text-xs font-mono" style={{ color }}>{value}</span>
      </div>
      <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  )
}

function getScoreColor(score: number): string {
  if (score >= 95) return '#22c55e'
  if (score >= 85) return '#84cc16'
  if (score >= 70) return '#f59e0b'
  return '#ef4444'
}

function getScoreLabel(score: number): string {
  if (score >= 95) return '极佳'
  if (score >= 85) return '良好'
  if (score >= 70) return '一般'
  return '较差'
}

export default function VersionCompatibilityCardView({ version, onClose, compact }: VersionCompatibilityCardProps) {
  const [card, setCard] = useState<CompatibilityCard | null>(null)

  useEffect(() => {
    window.minecraftAPI?.getVersionCompatibility(version).then((c: CompatibilityCard) => {
      setCard(c)
    })
  }, [version])

  if (!card) return null

  const content = (
    <div className={compact ? 'space-y-3' : 'space-y-4'}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: getScoreColor(card.overall) }} />
          <span className="text-sm font-medium text-white/60">兼容性评分</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-2xl font-bold font-mono" style={{ color: getScoreColor(card.overall) }}>
            {card.overall}
          </span>
          <span className="text-xs text-white/30">{getScoreLabel(card.overall)}</span>
        </div>
      </div>

      <div className="space-y-2.5">
        <ScoreBar value={card.dim} label="DIM 生态丰富度" color={getScoreColor(card.dim)} />
        <ScoreBar value={card.server} label="Server 服务端支持" color={getScoreColor(card.server)} />
        <ScoreBar value={card.stable} label="Stable 稳定性" color={getScoreColor(card.stable)} />
        <ScoreBar value={card.ready} label="Ready 就绪度" color={getScoreColor(card.ready)} />
      </div>

      <div className="grid grid-cols-3 gap-2 pt-2">
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-bold font-mono text-white/60">{card.modCount.toLocaleString()}</p>
          <p className="text-xs text-white/20">模组数</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-bold font-mono text-white/60">{card.serverCount.toLocaleString()}</p>
          <p className="text-xs text-white/20">服务端</p>
        </div>
        <div className="text-center p-2 rounded-lg bg-white/[0.02]">
          <p className="text-lg font-bold font-mono text-white/60">{card.knownBugs}</p>
          <p className="text-xs text-white/20">已知问题</p>
        </div>
      </div>
    </div>
  )

  if (compact) return content

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
        className="glass-strong rounded-2xl w-full max-w-md"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-500/10 flex items-center justify-center">
              <Shield className="w-5 h-5 text-green-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">版本兼容性评分</h3>
              <p className="text-sm text-white/40">{version}</p>
            </div>
          </div>
          {onClose && (
            <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>
        <div className="p-6">{content}</div>
      </motion.div>
    </motion.div>
  )
}
