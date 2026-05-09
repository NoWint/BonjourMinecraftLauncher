import { useState, useEffect } from 'react'
import { X, Cpu, MemoryStick, Zap, ChevronRight, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface JVMProfile {
  id: string
  name: string
  description: string
  level: 'beginner' | 'advanced' | 'expert'
  gcType: string
  recommendedMemory: number
  notes: string
  args: string[]
}

interface JVMTuningWizardProps {
  onClose: () => void
  onApply: (profile: JVMProfile, maxMemory: number, minMemory: number) => void
  currentMaxMemory?: number
  currentMinMemory?: number
  currentProfileId?: string
}

const LEVEL_LABELS = {
  beginner: { label: '入门', color: 'bg-green-500/20 text-green-400' },
  advanced: { label: '进阶', color: 'bg-blue-500/20 text-blue-400' },
  expert: { label: '专家', color: 'bg-purple-500/20 text-purple-400' },
}

export default function JVMTuningWizard({
  onClose,
  onApply,
  currentMaxMemory = 4096,
  currentMinMemory = 512,
  currentProfileId = 'balanced',
}: JVMTuningWizardProps) {
  const [profiles, setProfiles] = useState<JVMProfile[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>(currentProfileId)
  const [maxMemory, setMaxMemory] = useState(currentMaxMemory)
  const [recommendation, setRecommendation] = useState<{
    profileId: string
    maxMemory: number
    minMemory: number
    warnings: string[]
  } | null>(null)
  const [step, setStep] = useState<'select' | 'customize' | 'apply'>('select')

  useEffect(() => {
    if (window.minecraftAPI?.getJVMProfiles) {
      window.minecraftAPI.getJVMProfiles().then((p: JVMProfile[]) => {
        setProfiles(p)
      })
    }
  }, [])

  useEffect(() => {
    if (window.minecraftAPI?.recommendJVMProfile) {
      window.minecraftAPI.recommendJVMProfile(16384, 17, 50).then((rec: any) => {
        setRecommendation(rec)
      })
    }
  }, [])

  const selected = profiles.find(p => p.id === selectedProfile)
  const minMemory = Math.min(512, Math.floor(maxMemory * 0.125))

  const handleApply = () => {
    if (selected) {
      onApply(selected, maxMemory, minMemory)
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
        className="glass-strong rounded-2xl w-full max-w-2xl max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 flex items-center justify-center">
              <Cpu className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">JVM 参数调优向导</h3>
              <p className="text-sm text-white/40">选择适合你的优化方案</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {recommendation && recommendation.warnings.length > 0 && (
            <div className="p-4 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
              {recommendation.warnings.map((w, i) => (
                <div key={i} className="flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <p className="text-sm text-yellow-400">{w}</p>
                </div>
              ))}
            </div>
          )}

          <div className="space-y-3">
            <h4 className="text-sm font-medium text-white/60">选择优化方案</h4>
            {profiles.map(profile => (
              <button
                key={profile.id}
                onClick={() => setSelectedProfile(profile.id)}
                className={`w-full text-left p-4 rounded-xl border transition-all ${
                  selectedProfile === profile.id
                    ? 'border-mc-green/30 bg-mc-green/5'
                    : 'border-white/5 bg-white/[0.02] hover:border-white/10'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-medium ${LEVEL_LABELS[profile.level].color}`}>
                      {LEVEL_LABELS[profile.level].label}
                    </span>
                    <span className="font-medium text-white">{profile.name}</span>
                  </div>
                  {selectedProfile === profile.id && (
                    <CheckCircle className="w-5 h-5 text-mc-green" />
                  )}
                </div>
                <p className="text-sm text-white/40 mt-2">{profile.description}</p>
                <div className="flex items-center gap-4 mt-2 text-xs text-white/30">
                  <span>GC: {profile.gcType}</span>
                  <span>推荐内存: {profile.recommendedMemory}MB</span>
                </div>
              </button>
            ))}
          </div>

          {selected && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5">
                <div className="flex items-center gap-2 mb-2">
                  <Info className="w-4 h-4 text-blue-400" />
                  <span className="text-sm font-medium text-white/60">方案说明</span>
                </div>
                <p className="text-sm text-white/40">{selected.notes}</p>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white/60">最大内存分配</span>
                  <span className="text-sm font-mono text-mc-green">{maxMemory} MB</span>
                </div>
                <input
                  type="range"
                  min={1024}
                  max={16384}
                  step={512}
                  value={maxMemory}
                  onChange={e => setMaxMemory(Number(e.target.value))}
                  className="w-full accent-mc-green"
                />
                <div className="flex justify-between text-xs text-white/20">
                  <span>1 GB</span>
                  <span>16 GB</span>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        <div className="p-6 border-t border-white/5 flex items-center justify-between">
          <div className="text-sm text-white/30">
            {selected && `将应用 ${selected.name} 配置`}
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 glass rounded-xl text-white/60 hover:text-white hover:bg-white/5 transition-all text-sm"
            >
              取消
            </button>
            <button
              onClick={handleApply}
              disabled={!selected}
              className="px-6 py-2 bg-mc-green text-black font-medium rounded-xl hover:bg-mc-green/90 transition-all text-sm disabled:opacity-50"
            >
              应用配置
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}
