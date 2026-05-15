import { useEffect, useCallback, useRef } from 'react'
import { useAuthStore } from '../stores/useAuthStore'
import { useSettingsStore } from '../stores/useSettingsStore'
import { useLaunchStore } from '../stores/useLaunchStore'
import { minecraftAPI } from '../api/tauri-bridge'
import { useSound } from './useSound'

interface LaunchFlowResult {
  isLaunching: boolean
  launchLogs: { type: string; message: string }[]
  launchVersionName: string
  handleLaunch: (version: string) => Promise<void>
  handleLaunchInstance: (instanceId: string) => Promise<void>
  executeLaunch: () => Promise<void>
  showPreCheck: boolean
  setShowPreCheck: (show: boolean) => void
  preCheckTarget: { instanceId?: string; gameVersion?: string }
  setPreCheckTarget: (target: { instanceId?: string; gameVersion?: string }) => void
  pendingLaunch: { type: 'version' | 'instance'; id: string } | null
  setPendingLaunch: (launch: { type: 'version' | 'instance'; id: string } | null) => void
}

export function useLaunchFlow(): LaunchFlowResult {
  const { getSelectedAccount } = useAuthStore()
  const { settings } = useSettingsStore()
  const {
    isLaunching,
    launchLogs,
    launchVersionName,
    startLaunch,
    endLaunch,
    addLog,
  } = useLaunchStore()
  const { play } = useSound()

  const [showPreCheck, setShowPreCheck] = [false, (_: boolean) => {}]
  const [preCheckTarget, setPreCheckTarget] = [{}, (_: { instanceId?: string; gameVersion?: string }) => {}]
  const [pendingLaunch, setPendingLaunch] = [null, (_: { type: 'version' | 'instance'; id: string } | null) => {}]

  useEffect(() => {
    if (!isLaunching) return

    const unsubscribeLog = minecraftAPI.onLaunchLog((data) => {
      addLog(data)
    })

    const unsubscribeClose = minecraftAPI.onLaunchClose((code) => {
      addLog({ type: 'info', message: `Game exited with code ${code}` })
      setTimeout(() => endLaunch(), 500)

      if (settings?.overlayEnabled) {
        minecraftAPI.overlayClose().catch(() => {})
        minecraftAPI.overlayStopLogWatcher().catch(() => {})
      }
    })

    const unsubscribeError = minecraftAPI.onLaunchError((message) => {
      addLog({ type: 'error', message })
    })

    return () => {
      unsubscribeLog()
      unsubscribeClose()
      unsubscribeError()
    }
  }, [isLaunching, settings?.overlayEnabled, addLog, endLaunch])

  const handleLaunch = useCallback(async (version: string) => {
    const selectedAccount = getSelectedAccount()
    if (!selectedAccount || !settings) return

    startLaunch(version)
    play('launch')

    try {
      await minecraftAPI.launchGame({
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
        minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
    }
  }, [getSelectedAccount, settings, startLaunch, addLog, play])

  const handleLaunchInstance = useCallback(async (instanceId: string) => {
    const selectedAccount = getSelectedAccount()
    if (!selectedAccount || !settings) return

    startLaunch(instanceId)
    play('launch')

    try {
      await minecraftAPI.launchInstance(instanceId, selectedAccount)

      if (settings.overlayEnabled) {
        minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
    }
  }, [getSelectedAccount, settings, startLaunch, addLog, play])

  const executeLaunch = useCallback(async () => {
    const selectedAccount = getSelectedAccount()
    if (!pendingLaunch || !selectedAccount || !settings) return

    setShowPreCheck(false)
    startLaunch(pendingLaunch.id)
    play('launch')

    try {
      if (pendingLaunch.type === 'version') {
        await minecraftAPI.launchGame({
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
        await minecraftAPI.launchInstance(pendingLaunch.id, selectedAccount)
      }

      if (settings.overlayEnabled) {
        minecraftAPI.overlayOpen(settings.overlayOpacity, settings.overlayPosition).catch(() => {})
        if (settings.gameDir) {
          minecraftAPI.overlayStartLogWatcher(settings.gameDir).catch(() => {})
        }
      }
    } catch (error) {
      console.error('Launch failed:', error)
      addLog({ type: 'error', message: String(error) })
      play('error')
    }
    setPendingLaunch(null)
  }, [pendingLaunch, getSelectedAccount, settings, startLaunch, addLog, play])

  return {
    isLaunching,
    launchLogs,
    launchVersionName,
    handleLaunch,
    handleLaunchInstance,
    executeLaunch,
    showPreCheck,
    setShowPreCheck,
    preCheckTarget,
    setPreCheckTarget,
    pendingLaunch,
    setPendingLaunch,
  }
}
