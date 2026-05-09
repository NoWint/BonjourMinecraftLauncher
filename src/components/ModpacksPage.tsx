import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Download, Wrench, ArrowLeft, Boxes, Layers, ChevronRight, Loader2 } from 'lucide-react'
import ModpackInstaller from './ModpackInstaller'
import ModpackWorkshop from './ModpackWorkshop'
import type { VersionInstance } from '../types'

type ModpackView = 'main' | 'install' | 'instance-select' | 'workshop'

export default function ModpacksPage() {
  const [view, setView] = useState<ModpackView>('main')
  const [instances, setInstances] = useState<VersionInstance[]>([])
  const [loadingInstances, setLoadingInstances] = useState(false)
  const [selectedInstance, setSelectedInstance] = useState<VersionInstance | null>(null)
  const [selectedModCount, setSelectedModCount] = useState(0)
  const [showWorkshop, setShowWorkshop] = useState(false)

  const loadInstances = async () => {
    setLoadingInstances(true)
    try {
      const data = await window.minecraftAPI?.getInstances()
      if (data) setInstances(data)
    } catch (err) {
      console.error('Failed to load instances:', err)
    } finally {
      setLoadingInstances(false)
    }
  }

  useEffect(() => {
    if (view === 'instance-select') {
      loadInstances()
    }
  }, [view])

  const handleEnterWorkshop = async (instance: VersionInstance) => {
    setSelectedInstance(instance)
    let modCount = 0
    try {
      const mods = await window.minecraftAPI?.scanInstanceMods(instance.id)
      modCount = mods?.length || 0
    } catch (err) {
      console.error('Failed to scan mods:', err)
    }
    setSelectedModCount(modCount)
    setShowWorkshop(true)
  }

  const handleCloseWorkshop = () => {
    setShowWorkshop(false)
    setSelectedInstance(null)
    setSelectedModCount(0)
    setView('main')
  }

  const handleCloseInstaller = () => {
    setView('main')
    loadInstances()
  }

  return (
    <div className="h-full flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      {/* Header */}
      <div className="flex items-center gap-3 px-6 pt-6 pb-4">
        <AnimatePresence mode="wait">
          {view !== 'main' ? (
            <motion.button
              key="back"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              onClick={() => setView('main')}
              className="flex items-center gap-1 text-sm"
              style={{ color: 'var(--accent)' }}
            >
              <ArrowLeft className="w-4 h-4" />
              返回
            </motion.button>
          ) : (
            <motion.div
              key="title"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex items-center gap-2"
            >
              <Boxes className="w-5 h-5" style={{ color: 'var(--accent)' }} />
              <h1 className="text-lg font-semibold">整合包</h1>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 pb-6">
        <AnimatePresence mode="wait">
          {view === 'main' && (
            <motion.div
              key="main"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 max-w-md mx-auto mt-8"
            >
              <div
                className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setView('install')}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(74, 222, 128, 0.15)' }}
                  >
                    <Download className="w-6 h-6" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">安装整合包</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      从 .zip / .mrpack / .rar 文件安装整合包
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-6 rounded-2xl cursor-pointer transition-all duration-200 hover:scale-[1.02]"
                style={{
                  background: 'var(--bg-secondary)',
                  border: '1px solid var(--border-subtle)',
                }}
                onClick={() => setView('instance-select')}
              >
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-xl flex items-center justify-center"
                    style={{ background: 'rgba(59, 130, 246, 0.15)' }}
                  >
                    <Wrench className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-medium">整合包工坊</h3>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      选择实例，进行创建、测试、fork 和发布
                    </p>
                  </div>
                </div>
              </div>

              <div
                className="p-4 rounded-xl mt-6"
                style={{
                  background: 'var(--bg-tertiary)',
                  border: '1px solid var(--border-subtle)',
                }}
              >
                <h4 className="text-sm font-medium mb-2" style={{ color: 'var(--text-secondary)' }}>
                  支持的格式
                </h4>
                <div className="flex flex-wrap gap-2">
                  {['CurseForge', 'Modrinth', 'FTB', 'Technic', 'Bonjour'].map((format) => (
                    <span
                      key={format}
                      className="px-2.5 py-1 rounded-lg text-xs font-medium"
                      style={{
                        background: 'var(--bg-secondary)',
                        color: 'var(--text-muted)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      {format}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {view === 'install' && (
            <motion.div
              key="install"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="h-full"
            >
              <ModpackInstaller
                onClose={handleCloseInstaller}
                onInstalled={(instanceId) => {
                  console.log('Modpack installed:', instanceId)
                  handleCloseInstaller()
                }}
              />
            </motion.div>
          )}

          {view === 'instance-select' && (
            <motion.div
              key="instance-select"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="max-w-lg mx-auto mt-4"
            >
              <h2 className="text-base font-medium mb-1">选择实例</h2>
              <p className="text-sm mb-4" style={{ color: 'var(--text-muted)' }}>
                选择一个实例进入整合包工坊
              </p>

              {loadingInstances ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-6 h-6 animate-spin" style={{ color: 'var(--text-muted)' }} />
                </div>
              ) : instances.length === 0 ? (
                <div
                  className="p-8 rounded-2xl text-center"
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-subtle)',
                  }}
                >
                  <Layers className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--text-muted)' }} />
                  <p className="text-sm font-medium">暂无实例</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    先在「游戏」页面安装一个版本
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {instances.map((instance) => (
                    <button
                      key={instance.id}
                      onClick={() => handleEnterWorkshop(instance)}
                      className="w-full flex items-center gap-4 p-4 rounded-xl transition-all duration-200 text-left hover:scale-[1.01]"
                      style={{
                        background: 'var(--bg-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }}
                    >
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'rgba(74, 222, 128, 0.1)' }}
                      >
                        <Layers className="w-5 h-5" style={{ color: 'var(--accent)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{instance.name}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                          {instance.gameVersion}
                          {instance.modLoader && ` · ${instance.modLoader}`}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Workshop Modal */}
      <AnimatePresence>
        {showWorkshop && selectedInstance && (
          <ModpackWorkshop
            instanceId={selectedInstance.id}
            instanceName={selectedInstance.name}
            gameVersion={selectedInstance.gameVersion}
            modLoader={selectedInstance.modLoader || ''}
            modCount={selectedModCount}
            onClose={handleCloseWorkshop}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
