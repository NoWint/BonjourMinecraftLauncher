import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { ExternalLink } from 'lucide-react'
import { toast } from 'sonner'
import BottomNav from './components/BottomNav'
import HomePage from './components/HomePage'
import VersionsPage from './components/VersionsPage'
import AccountsPage from './components/AccountsPage'
import SettingsPage from './components/SettingsPage'
import ModsPage from './components/ModsPage'
import ModpacksPage from './components/ModpacksPage'
import ServersPage from './components/ServersPage'
import ResourcePage from './components/ResourcePage'
import WorldsPage from './components/WorldsPage'
import LaunchOverlay from './components/LaunchOverlay'
import SplashScreen from './components/SplashScreen'
import SetupWizard from './components/SetupWizard'
import PreCheckPanel from './components/PreCheckPanel'
import NetworkStatusBar from './components/NetworkStatusBar'
import AppearanceSettings from './components/AppearanceSettings'
import DynamicBackground from './components/DynamicBackground'
import LaunchAnimation from './components/LaunchAnimation'
import TrayWidget from './components/TrayWidget'
import StatsDashboard from './components/StatsDashboard'
import CommandPalette from './components/CommandPalette'
import WindowControls from './components/WindowControls'
import { AccessibilityProvider } from './components/AccessibilityProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import ThemeSwitchOverlay from './theme/ThemeSwitchOverlay'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useSound } from './hooks/useSound'
import { useGestures } from './hooks/useGestures'
import { ThemeProvider } from './hooks/themeContext'
import { useWindowManager } from './hooks/useWindowManager'
import { useLaunchStore } from './stores/useLaunchStore'
import { Toaster } from 'sonner'
import './i18n'
import type { Account, LauncherSettings, GameVersion, InstalledVersion } from './types'

import type { Page } from './components/BottomNav'

const pageVariants = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
}

const pageTransition = {
  duration: 0.15,
  ease: [0.4, 0, 0.2, 1] as const,
}

const PAGE_ORDER: Page[] = ['home', 'versions', 'mods', 'modpack', 'servers', 'worlds', 'resources', 'accounts', 'settings', 'appearance', 'stats']

const LAUNCH_TIMEOUT_MS = 60000

function AppContent() {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [settings, setSettings] = useState<LauncherSettings | null>(null)
  const [versions, setVersions] = useState<GameVersion[]>([])
  const [installedVersions, setInstalledVersions] = useState<InstalledVersion[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [showPreCheck, setShowPreCheck] = useState(false)
  const [preCheckTarget, setPreCheckTarget] = useState<{ instanceId?: string; gameVersion?: string }>({})
  const [pendingLaunch, setPendingLaunch] = useState<{ type: 'version' | 'instance'; id: string } | null>(null)
  const [showTrayWidget, _setShowTrayWidget] = useState(true)
  const [globalSelectedVersion] = useState<string>(() => {
    try { return localStorage.getItem('bonjour-selected-version') || '' } catch { return '' }
  })
  const { play } = useSound()
  const mainRef = useRef<HTMLDivElement>(null)
  const windowManager = useWindowManager()
  const launchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isLaunching = useLaunchStore((s) => s.isLaunching)
  const launchVersionName = useLaunchStore((s) => s.launchVersionName)
  const launchLogs = useLaunchStore((s) => s.launchLogs)
  const overlayVisible = useLaunchStore((s) => s.overlayVisible)
  const startLaunch = useLaunchStore((s) => s.startLaunch)
  const endLaunch = useLaunchStore((s) => s.endLaunch)
  const addLog = useLaunchStore((s) => s.addLog)
  const resetLaunch = useLaunchStore((s) => s.resetLaunch)
  const setOverlayVisible = useLaunchStore((s) => s.setOverlayVisible)

  useGestures({
    onSwipe: (swipe) => {
      const currentIndex = PAGE_ORDER.indexOf(currentPage)
      if (swipe.direction === 'left' && currentIndex < PAGE_ORDER.length - 1) {
        setCurrentPage(PAGE_ORDER[currentIndex + 1])
        play('switch')
      } else if (swipe.direction === 'right' && currentIndex > 0) {
        setCurrentPage(PAGE_ORDER[currentIndex - 1])
        play('switch')
      }
    },
  })

  useGlobalShortcuts([
    {
      key: '1',
      modifiers: ['alt'],
      action: () => { setCurrentPage('home'); play('switch') },
      description: t('nav.home'),
    },
    {
      key: '2',
      modifiers: ['alt'],
      action: () => { setCurrentPage('versions'); play('switch') },
      description: t('nav.versions'),
    },
    {
      key: '3',
      modifiers: ['alt'],
      action: () => { setCurrentPage('mods'); play('switch') },
      description: t('nav.mods'),
    },
    {
      key: '4',
      modifiers: ['alt'],
      action: () => { setCurrentPage('modpack'); play('switch') },
      description: t('nav.modpacks'),
    },
    {
      key: '5',
      modifiers: ['alt'],
      action: () => { setCurrentPage('accounts'); play('switch') },
      description: t('nav.accounts'),
    },
    {
      key: '6',
      modifiers: ['alt'],
      action: () => { setCurrentPage('settings'); play('switch') },
      description: t('nav.settings'),
    },
    {
      key: 'l',
      modifiers: ['ctrl', 'shift'],
      action: () => {
        if (installedVersions.length > 0) {
          handleLaunch(installedVersions[0].id)
        }
      },
      description: t('home.launch'),
    },
    {
      key: 'f11',
      action: () => {
        if (window.windowAPI?.toggleFullscreen) {
          window.windowAPI.toggleFullscreen()
        }
      },
      description: '切换全屏',
      preventDefault: true,
    },
  ])

  useEffect(() => {
    loadInitialData()
  }, [])

  const loadInitialData = async () => {
    let settingsLoadFailed = false
    let loadedSettings: LauncherSettings | null = null

    await Promise.allSettled([
      window.minecraftAPI.getSettings().then((settingsData) => {
        setSettings(settingsData)
        loadedSettings = settingsData
        if (!settingsData.setupCompleted) {
          setShowSetupWizard(true)
        }
      }).catch((error) => {
        console.error('Failed to load settings:', error)
        settingsLoadFailed = true
      }),
      window.minecraftAPI.getAccounts().then((accountsData) => {
        setAccounts(accountsData)
        if (accountsData.length > 0) {
          setSelectedAccount(accountsData[0])
        }
      }).catch((error) => {
        console.error('Failed to load accounts:', error)
      }),
      window.minecraftAPI.getVersionManifest().then((manifest) => {
        setVersions(manifest.versions)
      }).catch((error) => {
        console.error('Failed to load version manifest:', error)
      }),
      window.minecraftAPI.getInstalledVersions().then((installed) => {
        setInstalledVersions(installed)
        if (loadedSettings?.gameDir && installed.length > 0) {
          window.minecraftAPI.warmupLaunchCache(loadedSettings.gameDir, installed[0].id).catch(() => {})
        }
      }).catch((error) => {
        console.error('Failed to load installed versions:', error)
      }),
      (async () => {
        const api = window.minecraftAPI as Record<string, unknown>
        const getGameSessions = api.getGameSessions as (() => Promise<import('./types').GameSession[]>) | undefined
        if (getGameSessions) {
          await getGameSessions()
        }
      })().catch(() => {}),
      window.minecraftAPI.checkForUpdates().then((updateInfo) => {
        if (updateInfo.hasUpdate) {
          console.log(`Update available: ${updateInfo.latestVersion}`)
        }
      }).catch(() => {}),
    ])

    if (settingsLoadFailed) {
      setSettings({
        gameDir: '',
        maxMemory: 4096,
        minMemory: 512,
        javaPath: '',
        windowWidth: 1280,
        windowHeight: 720,
        fullscreen: false,
        setupCompleted: false,
        launchServer: '',
        closeAfterLaunch: false,
        downloadSource: 'auto',
        region: '',
        lastUpdateCheck: 0,
        updateChannel: 'stable',
        theme: 'system',
        themePreset: 'minecraft',
        customAccent: '',
        language: 'zh-CN',
        backgroundVariant: 'mesh',
        backgroundIntensity: 'subtle',
        soundEnabled: true,
        soundVolume: 0.5,
        reduceMotion: false,
        highContrast: false,
        largeText: false,
        launchAnimationStyle: 'default',
        windowPosition: 'center',
        skipPreCheck: true,
        overlayEnabled: true,
        overlayOpacity: 0.85,
        overlayPosition: 'top-right',
      })
    }
    setIsLoading(false)
  }

  const handleSetupComplete = async (setupSettings: Partial<LauncherSettings>) => {
    try {
      const updated = await window.minecraftAPI.completeSetup(setupSettings)
      setSettings(updated)
    } catch (error) {
      console.error('Failed to complete setup:', error)
    }
    setShowSetupWizard(false)

    if (accounts.length === 0) {
      try {
        const account = await window.minecraftAPI.addOfflineAccount('Player')
        setAccounts([account])
        setSelectedAccount(account)
      } catch (e) {
        console.error('Failed to create default offline account:', e)
      }
    }

    try {
      const installed = await window.minecraftAPI.getInstalledVersions()
      setInstalledVersions(installed)
    } catch (e) {
      console.error('Failed to get installed versions:', e)
    }
  }

  const clearLaunchTimeout = () => {
    if (launchTimeoutRef.current) {
      clearTimeout(launchTimeoutRef.current)
      launchTimeoutRef.current = null
    }
  }

  const startLaunchTimeout = () => {
    clearLaunchTimeout()
    launchTimeoutRef.current = setTimeout(() => {
      if (useLaunchStore.getState().isLaunching) {
        addLog({ type: 'error', message: '启动超时（60秒），自动终止' })
        resetLaunch()
        toast.error('启动超时', { description: '游戏进程在60秒内没有响应，已自动终止' })
      }
    }, LAUNCH_TIMEOUT_MS)
  }

  useEffect(() => {
    return () => clearLaunchTimeout()
  }, [])

  const handleLaunch = async (version: string) => {
    if (!selectedAccount || !settings) return

    if (!settings.skipPreCheck) {
      setShowPreCheck(true)
      setPreCheckTarget({ gameVersion: version })
      setPendingLaunch({ type: 'version', id: version })
      return
    }

    setPendingLaunch({ type: 'version', id: version })
    startLaunch(version)
    play('launch')
    startLaunchTimeout()

    try {
      await window.minecraftAPI.launchGame({
        version,
        account: selectedAccount,
        maxMemory: settings.maxMemory,
        minMemory: settings.minMemory,
        gameDir: settings.gameDir,
        width: settings.windowWidth,
        height: settings.windowHeight,
        fullscreen: settings.fullscreen,
        server: settings.launchServer || undefined,
      })

      clearLaunchTimeout()
      toast.success('游戏已启动', { description: `${version} 正在运行中` })

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
      clearLaunchTimeout()
      toast.error('启动失败', {
        description: String(error),
        action: {
          label: '重试',
          onClick: () => handleLaunch(version),
        },
      })
    }
    setPendingLaunch(null)
  }

  const handleLaunchInstance = async (instanceId: string) => {
    if (!selectedAccount || !settings) return

    setPendingLaunch({ type: 'instance', id: instanceId })
    startLaunch(instanceId)
    play('launch')
    startLaunchTimeout()

    try {
      await window.minecraftAPI.launchInstance(instanceId, selectedAccount)

      clearLaunchTimeout()
      toast.success('游戏已启动', { description: `${instanceId} 正在运行中` })

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
      clearLaunchTimeout()
      toast.error('启动失败', {
        description: String(error),
        action: {
          label: '重试',
          onClick: () => handleLaunchInstance(instanceId),
        },
      })
    }
    setPendingLaunch(null)
  }

  const executeLaunch = async () => {
    if (!pendingLaunch || !selectedAccount || !settings) return

    setShowPreCheck(false)
    startLaunch(pendingLaunch.id)
    play('launch')
    startLaunchTimeout()

    try {
      if (pendingLaunch.type === 'version') {
        await window.minecraftAPI.launchGame({
          version: pendingLaunch.id,
          account: selectedAccount,
          maxMemory: settings.maxMemory,
          minMemory: settings.minMemory,
          gameDir: settings.gameDir,
          width: settings.windowWidth,
          height: settings.windowHeight,
          fullscreen: settings.fullscreen,
          server: settings.launchServer || undefined,
        })
      } else {
        await window.minecraftAPI.launchInstance(pendingLaunch.id, selectedAccount)
      }

      clearLaunchTimeout()
      toast.success('游戏已启动', { description: `${pendingLaunch.id} 正在运行中` })

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
      clearLaunchTimeout()
      toast.error('启动失败', {
        description: String(error),
        action: {
          label: '重试',
          onClick: () => executeLaunch(),
        },
      })
    }
    setPendingLaunch(null)
  }

  const handleAddAccount = async (username: string) => {
    try {
      const account = await window.minecraftAPI.addOfflineAccount(username)
      const updatedAccounts = [...accounts, account]
      setAccounts(updatedAccounts)
      if (!selectedAccount) {
        setSelectedAccount(account)
      }
      play('success')
      return account
    } catch (error) {
      console.error('Failed to add account:', error)
      play('error')
      throw error
    }
  }

  const handleDeleteAccount = async (accountId: string) => {
    try {
      await window.minecraftAPI.deleteAccount(accountId)
      const updatedAccounts = accounts.filter((a) => a.id !== accountId)
      setAccounts(updatedAccounts)
      if (selectedAccount?.id === accountId) {
        setSelectedAccount(updatedAccounts[0] || null)
      }
      play('success')
    } catch (error) {
      console.error('Failed to delete account:', error)
      play('error')
    }
  }

  const handleAccountsChange = useCallback(async () => {
    try {
      const accountsData = await window.minecraftAPI.getAccounts()
      setAccounts(accountsData)
      if (selectedAccount) {
        const updated = accountsData.find((a) => a.id === selectedAccount.id)
        if (updated) setSelectedAccount(updated)
      }
    } catch (error) {
      console.error('Failed to reload accounts:', error)
    }
  }, [selectedAccount])

  const handleSaveSettings = async (newSettings: LauncherSettings) => {
    try {
      await window.minecraftAPI.saveSettings(newSettings)
      setSettings(newSettings)
      play('success')
    } catch (error) {
      console.error('Failed to save settings:', error)
      play('error')
    }
  }

  const handleResetSetup = () => {
    setShowSetupWizard(true)
  }

  const handleInstallVersion = async (versionId: string) => {
    try {
      await window.minecraftAPI.installVersion(versionId)
      const installed = await window.minecraftAPI.getInstalledVersions()
      setInstalledVersions(installed)
      play('install')
    } catch (error) {
      console.error('Failed to install version:', error)
      play('error')
      throw error
    }
  }

  useEffect(() => {
    if (!isLaunching) return

    const unsubscribeLog = window.minecraftAPI.onLaunchLog((data) => {
      addLog(data)
    })

    const unsubscribeClose = window.minecraftAPI.onLaunchClose((code) => {
      addLog({ type: 'info', message: `Game exited with code ${code}` })
      clearLaunchTimeout()
      setTimeout(() => endLaunch(false), 500)

      if (settings?.overlayEnabled) {
        window.minecraftAPI.overlayClose().catch(() => {})
        window.minecraftAPI.overlayStopLogWatcher().catch(() => {})
      }
    })

    const unsubscribeError = window.minecraftAPI.onLaunchError((message) => {
      addLog({ type: 'error', message })
      clearLaunchTimeout()
      toast.error('启动错误', {
        description: message,
      })
    })

    return () => {
      unsubscribeLog()
      unsubscribeClose()
      unsubscribeError()
    }
  }, [isLaunching])

  const handleSplashComplete = useCallback(() => {
    setShowSplash(false)
  }, [])

  const handlePageChange = useCallback((page: Page) => {
    setCurrentPage(page)
    play('switch')
  }, [play])

  if (showSplash) {
    return (
      <AnimatePresence>
        <SplashScreen key="splash" onComplete={handleSplashComplete} isFirstLaunch={settings ? !settings.setupCompleted : false} />
      </AnimatePresence>
    )
  }

  if (showSetupWizard) {
    return <SetupWizard onComplete={handleSetupComplete} />
  }

  if (isLoading || !settings) {
    return (
      <div className="flex items-center justify-center h-screen" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 rounded-full mx-auto mb-4"
            style={{
              borderColor: 'var(--border-subtle)',
              borderTopColor: 'var(--accent)',
            }}
          />
          <p style={{ color: 'var(--text-muted)' }} className="text-sm">{t('common.loading')}</p>
        </motion.div>
      </div>
    )
  }

  return (
    <div className="h-screen overflow-hidden relative flex flex-col" style={{ background: 'transparent', color: 'var(--text-primary)' }}>
      <div
        data-tauri-drag-region
        className="absolute top-0 left-0 right-0 z-50 h-[38px]"
      >
        <div
          className="no-drag flex items-center justify-center"
          style={{ position: 'absolute', top: 0, right: 0, width: 50, height: 38 } as React.CSSProperties}
        >
          <WindowControls />
        </div>
      </div>

      <div className="absolute inset-0 z-0 pointer-events-none">
        <DynamicBackground />
      </div>

      <NetworkStatusBar />
      <div ref={mainRef} className="flex-1 overflow-hidden relative z-10">
        <main className="h-full pb-20">
          <AnimatePresence mode="wait">
            <motion.div
              key={currentPage}
              variants={pageVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={pageTransition}
              className="h-full"
            >
              {currentPage === 'home' && (
                <HomePage
                  selectedAccount={selectedAccount}
                  installedVersions={installedVersions}
                  settings={settings}
                  onLaunch={handleLaunch}
                  onChangePage={handlePageChange}
                />
              )}

              {currentPage === 'versions' && (
                <VersionsPage
                  versions={versions}
                  installedVersions={installedVersions}
                  onInstall={handleInstallVersion}
                  onLaunch={handleLaunch}
                  onLaunchInstance={handleLaunchInstance}
                  selectedAccount={selectedAccount}
                />
              )}

              {currentPage === 'mods' && (
                <div className="relative h-full">
                  <button
                    onClick={() => windowManager.openModsBrowserWindow()}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="在新窗口中打开模组浏览"
                  >
                    <ExternalLink className="w-4 h-4 text-white/50" />
                  </button>
                  <ModsPage />
                </div>
              )}

              {currentPage === 'modpack' && (
                <ModpacksPage />
              )}

              {currentPage === 'servers' && (
                <ServersPage />
              )}

              {currentPage === 'worlds' && (
                <div className="relative h-full">
                  <button
                    onClick={() => windowManager.openMapPreviewWindow('', 'World')}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="在新窗口中打开地图预览"
                  >
                    <ExternalLink className="w-4 h-4 text-white/50" />
                  </button>
                  <WorldsPage />
                </div>
              )}

              {currentPage === 'resources' && (
                <ResourcePage />
              )}

              {currentPage === 'accounts' && (
                <AccountsPage
                  accounts={accounts}
                  selectedAccount={selectedAccount}
                  onSelect={setSelectedAccount}
                  onAdd={handleAddAccount}
                  onDelete={handleDeleteAccount}
                  onAccountsChange={handleAccountsChange}
                />
              )}

              {currentPage === 'settings' && (
                <div className="relative h-full">
                  <button
                    onClick={() => windowManager.openSettingsWindow()}
                    className="absolute top-3 right-3 z-10 p-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 transition-colors"
                    title="在新窗口中打开设置"
                  >
                    <ExternalLink className="w-4 h-4 text-white/50" />
                  </button>
                  <SettingsPage
                    settings={settings}
                    onSave={handleSaveSettings}
                    onVersionsChange={(versions) => setInstalledVersions(versions)}
                    onResetSetup={handleResetSetup}
                  />
                </div>
              )}

              {currentPage === 'appearance' && (
                <AppearanceSettings />
              )}

              {currentPage === 'stats' && (
                <div className="h-full overflow-y-auto p-6">
                  <h1 className="text-2xl font-bold text-theme-primary mb-6">{t('settings.title')}</h1>
                  <StatsDashboard />
                </div>
              )}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>

      <BottomNav
        currentPage={currentPage}
        onPageChange={handlePageChange}
        isLaunching={isLaunching}
        onOpenLauncher={() => setOverlayVisible(true)}
      />

      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: 'var(--surface-glass)',
            color: 'var(--text-primary)',
            border: '1px solid var(--border-subtle)',
            backdropFilter: 'blur(12px)',
          },
        }}
      />

      <CommandPalette
        onNavigate={(page) => handlePageChange(page as any)}
        onLaunch={() => handleLaunch(globalSelectedVersion)}
        onInstallVersion={() => handlePageChange('versions')}
      />

      <LaunchAnimation
        isLaunching={isLaunching}
        versionName={launchVersionName}
      />

      <AnimatePresence>
        {showTrayWidget && (
          <TrayWidget
            onLaunch={handleLaunch}
            onOpenSettings={() => handlePageChange('settings')}
            onNavigate={(page) => handlePageChange(page as any)}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {overlayVisible && (
          <LaunchOverlay
            logs={launchLogs}
            versionName={launchVersionName}
            launchStartTime={useLaunchStore.getState().launchStartTime}
            onClose={() => setOverlayVisible(false)}
            onPopOut={() => {
              const sessionId = useLaunchStore.getState().session?.id || `launch-${Date.now()}`
              windowManager.openLaunchLogWindow(sessionId)
            }}
          />
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showPreCheck && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-md mx-4"
            >
              <PreCheckPanel
                instanceId={preCheckTarget.instanceId}
                gameVersion={preCheckTarget.gameVersion}
                onLaunch={executeLaunch}
                onClose={() => { setShowPreCheck(false); setPendingLaunch(null) }}
                skipPreCheck={settings?.skipPreCheck}
              />
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <ThemeSwitchOverlay />
    </div>
  )
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <AccessibilityProvider>
          <AppContent />
        </AccessibilityProvider>
      </ThemeProvider>
    </ErrorBoundary>
  )
}

export default App
