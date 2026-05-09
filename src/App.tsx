import { useState, useEffect, useCallback, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
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
import { AccessibilityProvider } from './components/AccessibilityProvider'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useSound } from './hooks/useSound'
import { useGestures } from './hooks/useGestures'
import { ThemeProvider } from './hooks/themeContext'
import './i18n'
import type { Account, LauncherSettings, GameVersion, InstalledVersion, GameSession } from './types'

import type { Page } from './components/BottomNav'

const pageVariants = {
  initial: { opacity: 0, scale: 0.98 },
  animate: { opacity: 1, scale: 1 },
  exit: { opacity: 0, scale: 0.98 },
}

const pageTransition = {
  duration: 0.3,
  ease: [0.4, 0, 0.2, 1] as const,
}

const PAGE_ORDER: Page[] = ['home', 'versions', 'mods', 'modpack', 'servers', 'worlds', 'resources', 'accounts', 'settings', 'appearance', 'stats']

function AppContent() {
  const { t } = useTranslation()
  const [currentPage, setCurrentPage] = useState<Page>('home')
  const [accounts, setAccounts] = useState<Account[]>([])
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null)
  const [settings, setSettings] = useState<LauncherSettings | null>(null)
  const [versions, setVersions] = useState<GameVersion[]>([])
  const [installedVersions, setInstalledVersions] = useState<InstalledVersion[]>([])
  const [gameSessions, setGameSessions] = useState<GameSession[]>([])
  const [isLaunching, setIsLaunching] = useState(false)
  const [launchLogs, setLaunchLogs] = useState<{type: string; message: string}[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showSplash, setShowSplash] = useState(true)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const [showPreCheck, setShowPreCheck] = useState(false)
  const [preCheckTarget, setPreCheckTarget] = useState<{ instanceId?: string; gameVersion?: string }>({})
  const [pendingLaunch, setPendingLaunch] = useState<{ type: 'version' | 'instance'; id: string } | null>(null)
  const [showTrayWidget, setShowTrayWidget] = useState(true)
  const [launchVersionName, setLaunchVersionName] = useState('')
  const { play } = useSound()
  const mainRef = useRef<HTMLDivElement>(null)

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

    try {
      const settingsData = await window.minecraftAPI.getSettings()
      setSettings(settingsData)
      loadedSettings = settingsData
      if (!settingsData.setupCompleted) {
        setShowSetupWizard(true)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      settingsLoadFailed = true
    }

    try {
      const accountsData = await window.minecraftAPI.getAccounts()
      setAccounts(accountsData)
      if (accountsData.length > 0) {
        setSelectedAccount(accountsData[0])
      }
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }

    try {
      const manifest = await window.minecraftAPI.getVersionManifest()
      setVersions(manifest.versions)
    } catch (error) {
      console.error('Failed to load version manifest:', error)
    }

    try {
      const installed = await window.minecraftAPI.getInstalledVersions()
      setInstalledVersions(installed)
      if (loadedSettings?.gameDir && installed.length > 0) {
        window.minecraftAPI.warmupLaunchCache(loadedSettings.gameDir, installed[0].id).catch(() => {})
      }
    } catch (error) {
      console.error('Failed to load installed versions:', error)
    }

    try {
      const api = window.minecraftAPI as Record<string, unknown>
      const getGameSessions = api.getGameSessions as (() => Promise<GameSession[]>) | undefined
      if (getGameSessions) {
        const sessions = await getGameSessions()
        setGameSessions(sessions)
      }
    } catch {
    }

    try {
      const updateInfo = await window.minecraftAPI.checkForUpdates()
      if (updateInfo.hasUpdate) {
        console.log(`Update available: ${updateInfo.latestVersion}`)
      }
    } catch {}

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
      
      const installed = await window.minecraftAPI.getInstalledVersions()
      setInstalledVersions(installed)
    } catch (error) {
      console.error('Failed to complete setup:', error)
    }
  }

  const handleLaunch = async (version: string) => {
    if (!selectedAccount || !settings) return

    setLaunchVersionName(version)
    setPendingLaunch({ type: 'version', id: version })
    setIsLaunching(true)
    setLaunchLogs([])
    play('launch')

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

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      setLaunchLogs((prev) => [...prev, { type: 'error', message: String(error) }])
      play('error')
    }
    setPendingLaunch(null)
  }

  const handleLaunchInstance = async (instanceId: string) => {
    if (!selectedAccount || !settings) return

    setLaunchVersionName(instanceId)
    setPendingLaunch({ type: 'instance', id: instanceId })
    setIsLaunching(true)
    setLaunchLogs([])
    play('launch')

    try {
      await window.minecraftAPI.launchInstance(instanceId, selectedAccount)

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      setLaunchLogs((prev) => [...prev, { type: 'error', message: String(error) }])
      play('error')
    }
    setPendingLaunch(null)
  }

  const executeLaunch = async () => {
    if (!pendingLaunch || !selectedAccount || !settings) return

    setShowPreCheck(false)
    setIsLaunching(true)
    setLaunchLogs([])
    play('launch')

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

      if (settings.overlayEnabled) {
        window.minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          window.minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      setLaunchLogs((prev) => [...prev, { type: 'error', message: String(error) }])
      play('error')
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
      setLaunchLogs((prev) => [...prev, data])
    })

    const unsubscribeClose = window.minecraftAPI.onLaunchClose((code) => {
      setLaunchLogs((prev) => [...prev, { type: 'info', message: `Game exited with code ${code}` }])
      setTimeout(() => setIsLaunching(false), 500)

      if (settings?.overlayEnabled) {
        window.minecraftAPI.overlayClose().catch(() => {})
        window.minecraftAPI.overlayStopLogWatcher().catch(() => {})
      }

      const endTime = Date.now()
      const session: GameSession = {
        versionId: launchVersionName,
        startTime: endTime - 60000,
        endTime,
        duration: Math.round((endTime - (endTime - 60000)) / 60000),
      }
      setGameSessions((prev) => [...prev, session])
    })

    const unsubscribeError = window.minecraftAPI.onLaunchError((message) => {
      setLaunchLogs((prev) => [...prev, { type: 'error', message }])
    })

    return () => {
      unsubscribeLog()
      unsubscribeClose()
      unsubscribeError()
    }
  }, [isLaunching, launchVersionName])

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
    <div className="h-screen overflow-hidden relative flex flex-col" style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div className="absolute inset-0 z-0 pointer-events-none">
        <DynamicBackground
          versionId={installedVersions[0]?.id}
          variant={(localStorage.getItem('bg-variant') as any) || 'mesh'}
          intensity={(localStorage.getItem('bg-intensity') as any) || 'subtle'}
          performanceTier={(localStorage.getItem('bg-performance-tier') as any) || undefined}
        />
      </div>

      <NetworkStatusBar />
      <div ref={mainRef} className="flex-1 overflow-hidden relative z-10">
        <div className="absolute top-0 left-0 right-0 h-8 bg-transparent drag-region" />
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
                <ModsPage />
              )}

              {currentPage === 'modpack' && (
                <ModpacksPage />
              )}

              {currentPage === 'servers' && (
                <ServersPage />
              )}

              {currentPage === 'worlds' && (
                <WorldsPage />
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
                <SettingsPage
                  settings={settings}
                  onSave={handleSaveSettings}
                  onVersionsChange={(versions) => setInstalledVersions(versions)}
                  onResetSetup={handleResetSetup}
                />
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

      <BottomNav currentPage={currentPage} onPageChange={handlePageChange} />

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
        {isLaunching && (
          <LaunchOverlay
            logs={launchLogs}
            onClose={() => setIsLaunching(false)}
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
