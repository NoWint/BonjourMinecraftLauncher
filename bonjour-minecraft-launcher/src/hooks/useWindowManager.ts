import { useCallback, useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'

export interface WindowInfo {
  label: string
  isOpen: boolean
}

export function useWindowManager() {
  const [openWindows, setOpenWindows] = useState<WindowInfo[]>([])

  useEffect(() => {
    refreshWindowList()
  }, [])

  const refreshWindowList = useCallback(async () => {
    try {
      const labels = await invoke<string[]>('window_list')
      const infos: WindowInfo[] = await Promise.all(
        labels.map(async label => ({
          label,
          isOpen: await invoke<boolean>('window_is_open', { label }),
        }))
      )
      setOpenWindows(infos)
    } catch (err) {
      console.warn('Failed to refresh window list:', err)
    }
  }, [])

  const openSettingsWindow = useCallback(async (section?: string) => {
    try {
      await invoke('window_open_settings', { section: section || null })
    } catch (err) {
      console.error('Failed to open settings window:', err)
    }
  }, [])

  const openModsBrowserWindow = useCallback(async (gameVersion?: string, modLoader?: string) => {
    try {
      await invoke('window_open_mods_browser', {
        gameVersion: gameVersion || null,
        modLoader: modLoader || null,
      })
    } catch (err) {
      console.error('Failed to open mods browser window:', err)
    }
  }, [])

  const openLaunchLogWindow = useCallback(async (sessionId: string) => {
    try {
      await invoke('window_open_launch_log', { sessionId })
    } catch (err) {
      console.error('Failed to open launch log window:', err)
    }
  }, [])

  const openMapPreviewWindow = useCallback(async (worldPath: string, worldName: string) => {
    try {
      await invoke('window_open_map_preview', { worldPath, worldName })
    } catch (err) {
      console.error('Failed to open map preview window:', err)
    }
  }, [])

  const openCrashReportWindow = useCallback(async (reportId: string) => {
    try {
      await invoke('window_open_crash_report', { reportId })
    } catch (err) {
      console.error('Failed to open crash report window:', err)
    }
  }, [])

  const closeWindow = useCallback(async (label: string) => {
    try {
      await invoke('window_close', { label })
      await refreshWindowList()
    } catch (err) {
      console.error('Failed to close window:', err)
    }
  }, [refreshWindowList])

  const focusWindow = useCallback(async (label: string) => {
    try {
      await invoke('window_focus', { label })
    } catch (err) {
      console.error('Failed to focus window:', err)
    }
  }, [])

  const isWindowOpen = useCallback(async (label: string): Promise<boolean> => {
    try {
      return await invoke<boolean>('window_is_open', { label })
    } catch {
      return false
    }
  }, [])

  const emitToWindow = useCallback(async (label: string, event: string, payload: any) => {
    try {
      await invoke('window_emit_to', { label, event, payload })
    } catch (err) {
      console.error('Failed to emit to window:', err)
    }
  }, [])

  const onWindowEvent = useCallback(<T = any>(event: string, callback: (data: T) => void) => {
    let unlisten: UnlistenFn | undefined
    let disposed = false
    listen<T>(event, (e) => {
      if (!disposed) callback(e.payload)
    }).then(fn => { if (!disposed) unlisten = fn })
    return () => { disposed = true; unlisten?.() }
  }, [])

  return {
    openWindows,
    refreshWindowList,
    openSettingsWindow,
    openModsBrowserWindow,
    openLaunchLogWindow,
    openMapPreviewWindow,
    openCrashReportWindow,
    closeWindow,
    focusWindow,
    isWindowOpen,
    emitToWindow,
    onWindowEvent,
  }
}
