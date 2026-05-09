import { useState, useEffect } from 'react'
import { X, HardDrive, Trash2, Folder, FileText, Image, Box, AlertTriangle } from 'lucide-react'
import { motion } from 'framer-motion'

interface StorageBreakdown {
  instanceId: string
  totalSize: number
  mods: number
  saves: number
  logs: number
  config: number
  resourcepacks: number
  shaderpacks: number
  other: number
  safeToClean: { path: string; size: number; category: string; description: string; safeToDelete: boolean }[]
}

interface InstanceStorageAnalyzerProps {
  instanceId: string
  onClose: () => void
}

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
}

const CATEGORY_CONFIG = [
  { key: 'mods', label: '模组', icon: Box, color: '#8b5cf6' },
  { key: 'saves', label: '存档', icon: Folder, color: '#22c55e' },
  { key: 'resourcepacks', label: '资源包', icon: Image, color: '#3b82f6' },
  { key: 'shaderpacks', label: '光影包', icon: Image, color: '#f59e0b' },
  { key: 'config', label: '配置', icon: FileText, color: '#06b6d4' },
  { key: 'logs', label: '日志', icon: FileText, color: '#6b7280' },
  { key: 'other', label: '其他', icon: Folder, color: '#9ca3af' },
]

export default function InstanceStorageAnalyzer({ instanceId, onClose }: InstanceStorageAnalyzerProps) {
  const [storage, setStorage] = useState<StorageBreakdown | null>(null)

  useEffect(() => {
    window.minecraftAPI?.analyzeInstanceStorage(instanceId).then((s: StorageBreakdown) => {
      setStorage(s)
    })
  }, [instanceId])

  if (!storage) return null

  const cleanableSize = storage.safeToClean.reduce((s, item) => s + item.size, 0)

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
        className="glass-strong rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 flex items-center justify-center">
              <HardDrive className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">存储分析</h3>
              <p className="text-sm text-white/40">总占用 {formatSize(storage.totalSize)}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="space-y-2">
            {CATEGORY_CONFIG.map(cat => {
              const size = (storage as any)[cat.key] || 0
              const percent = storage.totalSize > 0 ? (size / storage.totalSize) * 100 : 0
              const Icon = cat.icon
              return (
                <div key={cat.key} className="flex items-center gap-3">
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: cat.color }} />
                  <span className="text-sm text-white/60 w-16">{cat.label}</span>
                  <div className="flex-1 h-2 rounded-full bg-white/5 overflow-hidden">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${percent}%` }}
                      transition={{ duration: 0.5 }}
                      className="h-full rounded-full"
                      style={{ backgroundColor: cat.color }}
                    />
                  </div>
                  <span className="text-xs font-mono text-white/40 w-20 text-right">{formatSize(size)}</span>
                </div>
              )
            })}
          </div>

          {storage.safeToClean.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-yellow-400" />
                <span className="text-sm font-medium text-white/60">可清理 ({formatSize(cleanableSize)})</span>
              </div>
              {storage.safeToClean.map((item, i) => (
                <div key={i} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/[0.02]">
                  <Trash2 className="w-3.5 h-3.5 text-white/20" />
                  <span className="flex-1 text-xs text-white/40">{item.description}</span>
                  <span className="text-xs font-mono text-white/20">{formatSize(item.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
