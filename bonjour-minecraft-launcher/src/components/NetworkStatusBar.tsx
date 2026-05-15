import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Wifi, WifiOff, CloudOff, Download, Users, Search, RefreshCw } from 'lucide-react'
import type { NetworkStatus } from '../types'

export default function NetworkStatusBar() {
  const [networkStatus, setNetworkStatus] = useState<NetworkStatus | null>(null)
  const [checking, setChecking] = useState(false)
  const [showDetails, setShowDetails] = useState(false)

  const checkNetwork = async () => {
    setChecking(true)
    try {
      const status = await window.minecraftAPI.checkNetworkStatus()
      setNetworkStatus(status)
    } catch (error) {
      console.error('Failed to check network:', error)
      setNetworkStatus({
        online: false,
        source: 'error',
        lastChecked: Date.now(),
      })
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkNetwork()
    const interval = setInterval(checkNetwork, 30000)
    const handleOnline = () => checkNetwork()
    const handleOffline = () => {
      setNetworkStatus(prev => prev ? { ...prev, online: false } : null)
    }
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    return () => {
      clearInterval(interval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  if (!networkStatus || networkStatus.online) return null

  const capabilities = networkStatus.offlineCapabilities || {
    launchInstalled: true,
    manageMods: true,
    viewWorlds: true,
    downloadVersions: false,
    onlineAuth: false,
    modSearch: false,
    serverList: false,
    updateCheck: false,
  }

  const offlineFeatures = [
    { label: '启动已安装版本', available: capabilities.launchInstalled, icon: Wifi },
    { label: '管理模组', available: capabilities.manageMods, icon: Download },
    { label: '查看存档', available: capabilities.viewWorlds, icon: CloudOff },
    { label: '下载新版本', available: capabilities.downloadVersions, icon: Download },
    { label: '在线登录', available: capabilities.onlineAuth, icon: Users },
    { label: '搜索模组', available: capabilities.modSearch, icon: Search },
  ]

  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      exit={{ y: -40, opacity: 0 }}
      className="fixed top-0 left-0 right-0 z-[150]"
    >
      <div className="mx-auto max-w-2xl">
        <button
          onClick={() => setShowDetails(!showDetails)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium transition-all"
          style={{ background: 'rgba(245, 158, 11, 0.9)', color: 'white' }}
        >
          <WifiOff className="w-4 h-4" />
          <span>离线模式</span>
          {networkStatus.latencyMs !== undefined && (
            <span className="text-xs opacity-75">
              (上次在线延迟: {networkStatus.latencyMs}ms)
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); checkNetwork() }}
            className="ml-2 p-1 rounded transition-all hover:bg-white/20"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${checking ? 'animate-spin' : ''}`} />
          </button>
        </button>

        <AnimatePresence>
          {showDetails && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
              style={{ background: 'rgba(245, 158, 11, 0.1)', borderBottom: '1px solid rgba(245, 158, 11, 0.3)' }}
            >
              <div className="p-4 max-w-md mx-auto">
                <p className="text-xs font-medium mb-3" style={{ color: 'var(--text-secondary)' }}>
                  离线模式下可用功能
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {offlineFeatures.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs px-2 py-1.5 rounded-lg"
                      style={{ background: feature.available ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)' }}>
                      <div className={`w-1.5 h-1.5 rounded-full ${feature.available ? 'bg-green-500' : 'bg-red-400'}`} />
                      <span style={{ color: feature.available ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                        {feature.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
