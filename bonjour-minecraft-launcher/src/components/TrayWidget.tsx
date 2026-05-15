import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Settings, X, Clock, Zap, ChevronRight, Bell, BellOff, Gamepad2, Activity } from 'lucide-react'

interface QuickVersion {
  id: string
  color: string
  lastPlayed?: number
}

interface TrayNotification {
  id: string
  message: string
  time: number
  read: boolean
}

export default function TrayWidget({
  onLaunch,
  onOpenSettings,
  onNavigate,
}: {
  onLaunch?: (versionId: string) => void
  onOpenSettings?: () => void
  onNavigate?: (page: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(false)
  const [quickVersions, setQuickVersions] = useState<QuickVersion[]>([])
  const [notifications, setNotifications] = useState<TrayNotification[]>([])
  const [currentTime, setCurrentTime] = useState(new Date())
  const [isGameRunning, setIsGameRunning] = useState(false)

  useEffect(() => {
    const loadVersions = () => {
      try {
        const saved = localStorage.getItem('quick-versions')
        if (saved) setQuickVersions(JSON.parse(saved))
      } catch {}
    }
    loadVersions()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const handleLaunch = useCallback((versionId: string) => {
    onLaunch?.(versionId)
    setIsGameRunning(true)
    setTimeout(() => setIsGameRunning(false), 3000)
  }, [onLaunch])

  const dismissNotification = useCallback((id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id))
  }, [])

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            className="absolute bottom-16 right-0 w-72 glass-strong rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="p-4 border-b border-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                    <Gamepad2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-theme-primary">Bonjour MC</p>
                    <p className="text-[10px] text-theme-muted">
                      {currentTime.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="p-1 rounded-lg hover:bg-white/10 transition-colors text-theme-muted"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="p-4 space-y-3">
              {isGameRunning && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="flex items-center gap-2 px-3 py-2 rounded-xl"
                  style={{ background: 'var(--accent-dim)' }}
                >
                  <Activity className="w-4 h-4 animate-pulse" style={{ color: 'var(--accent)' }} />
                  <span className="text-xs font-medium" style={{ color: 'var(--accent)' }}>游戏运行中</span>
                </motion.div>
              )}

              <div>
                <p className="text-xs text-theme-muted mb-2 flex items-center gap-1">
                  <Zap className="w-3 h-3" /> 快速启动
                </p>
                {quickVersions.length > 0 ? (
                  <div className="space-y-1">
                    {quickVersions.slice(0, 3).map(version => (
                      <button
                        key={version.id}
                        onClick={() => handleLaunch(version.id)}
                        className="w-full flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all group"
                      >
                        <div className="w-2 h-2 rounded-full" style={{ background: version.color }} />
                        <span className="text-sm text-theme-primary flex-1 text-left">{version.id}</span>
                        <Play className="w-3.5 h-3.5 text-theme-muted group-hover:text-theme-primary transition-colors" />
                      </button>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-theme-muted py-2">暂无快速启动版本</p>
                )}
              </div>

              {notifications.length > 0 && (
                <div>
                  <p className="text-xs text-theme-muted mb-2 flex items-center gap-1">
                    <Bell className="w-3 h-3" /> 通知
                  </p>
                  <div className="space-y-1">
                    {notifications.slice(0, 3).map(notif => (
                      <div
                        key={notif.id}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/5 transition-all"
                      >
                        <div className={`w-1.5 h-1.5 rounded-full ${notif.read ? 'bg-theme-muted' : 'bg-mc-green'}`} />
                        <span className="text-xs text-theme-secondary flex-1">{notif.message}</span>
                        <button
                          onClick={() => dismissNotification(notif.id)}
                          className="text-theme-muted hover:text-theme-primary"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2 border-t border-white/5">
                <button
                  onClick={() => { onNavigate?.('stats'); setIsExpanded(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-theme-muted hover:text-theme-primary hover:bg-white/5 transition-all"
                >
                  <Activity className="w-3.5 h-3.5" /> 统计
                </button>
                <button
                  onClick={() => { onOpenSettings?.(); setIsExpanded(false) }}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs text-theme-muted hover:text-theme-primary hover:bg-white/5 transition-all"
                >
                  <Settings className="w-3.5 h-3.5" /> 设置
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-12 h-12 rounded-full flex items-center justify-center shadow-lg relative"
        style={{ background: 'var(--accent)' }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {isExpanded ? (
          <X className="w-5 h-5" style={{ color: 'var(--accent-text)' }} />
        ) : (
          <Gamepad2 className="w-5 h-5" style={{ color: 'var(--accent-text)' }} />
        )}
        {unreadCount > 0 && !isExpanded && (
          <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-[10px] font-bold flex items-center justify-center">
            {unreadCount}
          </div>
        )}
      </motion.button>
    </div>
  )
}
