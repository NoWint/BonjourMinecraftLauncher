import { useState, useRef } from 'react'
import { X, Package, Upload, FileArchive, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ModpackInstallResult {
  success: boolean
  instanceId?: string
  instanceName: string
  modsInstalled: number
  configsRestored: number
  errors: string[]
}

interface ModpackInstallerProps {
  onClose: () => void
  onInstalled?: (instanceId: string) => void
}

type InstallPhase = 'select' | 'installing' | 'complete'

export default function ModpackInstaller({ onClose, onInstalled }: ModpackInstallerProps) {
  const [phase, setPhase] = useState<InstallPhase>('select')
  const [filePath, setFilePath] = useState('')
  const [instanceName, setInstanceName] = useState('')
  const [result, setResult] = useState<ModpackInstallResult | null>(null)
  const [progress, setProgress] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleSelectFile = async () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.zip,.mrpack'
    input.onchange = (e: Event) => {
      const target = e.target as HTMLInputElement
      const file = target.files?.[0]
      if (file) {
        setFilePath((file as any).path || file.name)
        const name = file.name.replace(/\.(zip|mrpack)$/, '') || 'New Instance'
        setInstanceName(name)
      }
    }
    input.click()
  }

  const handleInstall = async () => {
    if (!filePath) return
    setPhase('installing')
    setProgress(0)

    const progressInterval = setInterval(() => {
      setProgress(prev => Math.min(prev + Math.random() * 15, 90))
    }, 500)

    try {
      const res = await window.minecraftAPI?.installModpack(filePath, instanceName || undefined) as ModpackInstallResult
      clearInterval(progressInterval)
      setProgress(100)
      setResult(res)
      setPhase('complete')
      if (res?.success && res.instanceId && onInstalled) {
        onInstalled(res.instanceId)
      }
    } catch (err: any) {
      clearInterval(progressInterval)
      setResult({ success: false, instanceName, modsInstalled: 0, configsRestored: 0, errors: [err.message] })
      setPhase('complete')
    }
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
        className="glass-strong rounded-2xl w-full max-w-lg"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Package className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">安装整合包</h3>
              <p className="text-sm text-white/40">支持 CurseForge / Modrinth / Bonjour 格式</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <AnimatePresence mode="wait">
            {phase === 'select' && (
              <motion.div key="select" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <button
                  onClick={handleSelectFile}
                  className="w-full py-12 border-2 border-dashed border-white/10 rounded-xl hover:border-white/20 transition-all flex flex-col items-center gap-3"
                >
                  <FileArchive className="w-10 h-10 text-white/20" />
                  <span className="text-sm text-white/40">
                    {filePath ? filePath.split('/').pop() : '点击选择整合包文件'}
                  </span>
                  <span className="text-xs text-white/20">支持 .zip / .mrpack 格式</span>
                </button>

                {filePath && (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                    <input
                      value={instanceName}
                      onChange={e => setInstanceName(e.target.value)}
                      placeholder="实例名称"
                      className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-mc-green/30 transition-colors"
                    />
                    <button
                      onClick={handleInstall}
                      className="w-full py-3 bg-mc-green text-black font-medium rounded-xl hover:bg-mc-green/90 transition-all text-sm"
                    >
                      开始安装
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}

            {phase === 'installing' && (
              <motion.div key="installing" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="py-8 flex flex-col items-center gap-4">
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  className="w-12 h-12 border-2 border-white/10 border-t-mc-green rounded-full"
                />
                <p className="text-white/60">正在安装整合包...</p>
                <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-mc-green"
                    animate={{ width: `${progress}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
                <p className="text-xs text-white/20">{Math.round(progress)}%</p>
              </motion.div>
            )}

            {phase === 'complete' && result && (
              <motion.div key="complete" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
                <div className={`flex items-center gap-3 p-4 rounded-xl ${result.success ? 'bg-green-500/10 border border-green-500/20' : 'bg-red-500/10 border border-red-500/20'}`}>
                  {result.success ? (
                    <CheckCircle className="w-6 h-6 text-green-400" />
                  ) : (
                    <AlertCircle className="w-6 h-6 text-red-400" />
                  )}
                  <div>
                    <p className={`font-medium ${result.success ? 'text-green-400' : 'text-red-400'}`}>
                      {result.success ? '安装完成' : '安装失败'}
                    </p>
                    {result.success && (
                      <p className="text-sm text-white/40">{result.modsInstalled} 个模组已记录</p>
                    )}
                  </div>
                </div>

                {result.errors.length > 0 && (
                  <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5">
                    {result.errors.map((err, i) => (
                      <p key={i} className="text-xs text-white/40">{err}</p>
                    ))}
                  </div>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-3 glass rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm"
                >
                  关闭
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </motion.div>
  )
}
