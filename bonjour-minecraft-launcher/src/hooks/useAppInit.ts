import { useState, useCallback } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useVersionStore } from '../stores/useVersionStore'
import { useGameSessionStore } from '../stores/useGameSessionStore'
import { minecraftAPI } from '../api/tauri-bridge'
import type { LauncherSettings, GameSession } from '../types'
import { DEFAULT_LAUNCHER_SETTINGS } from '../types'

interface AppInitResult {
  isLoading: boolean
  settings: LauncherSettings | null
  showSetupWizard: boolean
  setShowSetupWizard: (show: boolean) => void
  handleSetupComplete: (setupSettings: Partial<LauncherSettings>) => Promise<void>
  handleResetSetup: () => void
}

export function useAppInit(): AppInitResult {
  const [isLoading, setIsLoading] = useState(true)
  const [showSetupWizard, setShowSetupWizard] = useState(false)
  const { loadAccounts, addOfflineAccount, accounts } = useAuthStore()
  const { settings, loadSettings, completeSetup } = useSettingsStore()
  const { loadVersions, loadInstalledVersions } = useVersionStore()
  const { addSession } = useGameSessionStore()

  const loadInitialData = useCallback(async () => {
    let settingsLoadFailed = false
    let loadedSettings: LauncherSettings | null = null

    try {
      await loadSettings()
      loadedSettings = useSettingsStore.getState().settings
      if (!loadedSettings.setupCompleted) {
        setShowSetupWizard(true)
      }
    } catch (error) {
      console.error('Failed to load settings:', error)
      settingsLoadFailed = true
    }

    try {
      await loadAccounts()
    } catch (error) {
      console.error('Failed to load accounts:', error)
    }

    try {
      await loadVersions()
    } catch (error) {
      console.error('Failed to load version manifest:', error)
    }

    try {
      await loadInstalledVersions()
      const installed = useVersionStore.getState().installedVersions
      if (loadedSettings?.gameDir && installed.length > 0) {
        minecraftAPI.warmupLaunchCache(loadedSettings.gameDir, installed[0].id).catch(() => {})
      }
    } catch (error) {
      console.error('Failed to load installed versions:', error)
    }

    try {
      const api = minecraftAPI as Record<string, unknown>
      const getGameSessions = api.getGameSessions as (() => Promise<GameSession[]>) | undefined
      if (getGameSessions) {
        const sessions = await getGameSessions()
        sessions.forEach((s) => addSession(s))
      }
    } catch {
      // silent
    }

    try {
      const updateInfo = await minecraftAPI.checkForUpdates()
      if (updateInfo.hasUpdate) {
        console.log(`Update available: ${updateInfo.latestVersion}`)
      }
    } catch {
      // silent
    }

    if (settingsLoadFailed) {
      useSettingsStore.getState().saveSettings(DEFAULT_LAUNCHER_SETTINGS)
    }
    setIsLoading(false)
  }, [loadAccounts, loadSettings, loadVersions, loadInstalledVersions, addSession])

  const handleSetupComplete = useCallback(async (setupSettings: Partial<LauncherSettings>) => {
    try {
      await completeSetup(setupSettings)
    } catch (error) {
      console.error('Failed to complete setup:', error)
    }
    setShowSetupWizard(false)

    if (useAuthStore.getState().accounts.length === 0) {
      try {
        await addOfflineAccount('Player')
      } catch (e) {
        console.error('Failed to create default offline account:', e)
      }
    }

    try {
      await loadInstalledVersions()
    } catch (e) {
      console.error('Failed to get installed versions:', e)
    }
  }, [completeSetup, addOfflineAccount, loadInstalledVersions])

  const handleResetSetup = useCallback(() => {
    setShowSetupWizard(true)
  }, [])

  return {
    isLoading,
    settings,
    showSetupWizard,
    setShowSetupWizard,
    handleSetupComplete,
    handleResetSetup,
    loadInitialData,
  }
}
