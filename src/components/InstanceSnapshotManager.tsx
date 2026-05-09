import { useState, useEffect } from 'react'
import { X, Camera, Clock, RotateCcw, Trash2, Plus, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface Snapshot {
  id: string
  instanceId: string
  name: string
  description: string
  timestamp: number
  modList: { fileName: string; enabled: boolean; hash: string; size: number }[]
  configFiles: { relativePath: string; hash: string; size: number }[]
  gameVersion: string
  modLoader?: string
  modLoaderVersion?: string
  sizeBytes: number
}

interface InstanceSnapshotManagerProps {
  instanceId: string
  onClose: () => void
}

export default function InstanceSnapshotManager({ instanceId, onClose }: InstanceSnapshotManagerProps) {
  const [snapshots, setSnapshots] = useState<Snapshot[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [rollingBack, setRollingBack] = useState<string | null>(null)

  useEffect(() => {
    window.minecraftAPI?.listInstanceSnapshots(instanceId).then((s: Snapshot[]) => {
      setSnapshots(s.sort((a, b) => b.timestamp - a.timestamp))
    })
  }, [instanceId])

  const handleCreate = async () => {
    if (!newName.trim()) return
    const snapshot = await window.minecraftAPI?.createInstanceSnapshot(instanceId, newName, newDesc)
    if (snapshot) {
      setSnapshots(prev => [snapshot, ...prev])
    }
    setNewName('')
    setNewDesc('')
    setShowCreate(false)
  }

  const handleDelete = async (snapshotId: string) => {
    await window.minecraftAPI?.deleteInstanceSnapshot(instanceId, snapshotId)
    setSnapshots(prev => prev.filter(s => s.id !== snapshotId))
  }

  const handleRollback = async (snapshotId: string) => {
    setRollingBack(snapshotId)
    try {
      const result = await window.minecraftAPI?.rollbackInstanceSnapshot(instanceId, snapshotId)
      if (result?.success) {
        alert(result.message)
      } else {
        alert(result?.message || '回滚失败')
      }
    } finally {
      setRollingBack(null)
    }
  }

  const formatDate = (ts: number) => new Date(ts).toLocaleString('zh-CN')
  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
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
        className="glass-strong rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
              <Camera className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">时间机器</h3>
              <p className="text-sm text-white/40">{snapshots.length} 个快照</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {showCreate ? (
            <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
              <input
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder="快照名称（如：安装OptiFine前）"
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-white/20 border-b border-white/5 pb-2"
                autoFocus
              />
              <input
                value={newDesc}
                onChange={e => setNewDesc(e.target.value)}
                placeholder="描述（可选）"
                className="w-full bg-transparent text-sm text-white/60 outline-none placeholder:text-white/20 border-b border-white/5 pb-2"
              />
              <div className="flex items-center gap-2">
                <button onClick={handleCreate} className="px-4 py-1.5 bg-mc-green/20 text-mc-green text-sm rounded-lg">创建快照</button>
                <button onClick={() => setShowCreate(false)} className="px-4 py-1.5 text-white/30 text-sm">取消</button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowCreate(true)}
              className="w-full py-3 bg-white/[0.02] border border-white/5 rounded-xl text-sm text-white/40 hover:text-white/60 hover:border-white/10 transition-all flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              <span>创建快照</span>
            </button>
          )}

          {snapshots.length === 0 ? (
            <div className="text-center py-12">
              <Camera className="w-12 h-12 text-white/10 mx-auto mb-4" />
              <p className="text-white/30">暂无快照</p>
              <p className="text-sm text-white/20 mt-1">创建快照以保存当前实例状态，随时可回滚</p>
            </div>
          ) : (
            <div className="space-y-2">
              {snapshots.map(snapshot => (
                <div key={snapshot.id} className="p-4 rounded-xl bg-white/[0.02] border border-white/5 hover:border-white/10 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">{snapshot.name}</span>
                        <span className="text-xs text-white/20 font-mono">{snapshot.gameVersion}</span>
                      </div>
                      {snapshot.description && (
                        <p className="text-xs text-white/30 mt-1">{snapshot.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-xs text-white/20">
                        <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(snapshot.timestamp)}</span>
                        <span>{snapshot.modList.length} 模组</span>
                        <span>{formatSize(snapshot.sizeBytes)}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleRollback(snapshot.id)}
                        disabled={rollingBack === snapshot.id}
                        className="px-3 py-1.5 text-xs rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all disabled:opacity-50 flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>{rollingBack === snapshot.id ? '回滚中...' : '回滚'}</span>
                      </button>
                      <button
                        onClick={() => handleDelete(snapshot.id)}
                        className="p-1.5 text-white/20 hover:text-red-400 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
