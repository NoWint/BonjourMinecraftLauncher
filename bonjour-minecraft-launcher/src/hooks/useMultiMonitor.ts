import { useState, useCallback, useEffect } from 'react'

export interface DisplayInfo {
  name: string
  width: number
  height: number
  scaleFactor: number
  isPrimary: boolean
  x: number
  y: number
}

interface WindowPosition {
  x: number
  y: number
  width: number
  height: number
  displayIndex: number
}

export function useMultiMonitor() {
  const [displays, setDisplays] = useState<DisplayInfo[]>([])
  const [currentDisplay, setCurrentDisplay] = useState<number>(0)
  const [savedPosition, setSavedPosition] = useState<WindowPosition | null>(null)

  useEffect(() => {
    const saved = localStorage.getItem('window-position-data')
    if (saved) {
      try {
        setSavedPosition(JSON.parse(saved))
      } catch {}
    }
  }, [])

  const refreshDisplays = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const info = await invoke('get_display_info') as any
      if (info?.displays && Array.isArray(info.displays)) {
        setDisplays(info.displays)
        setCurrentDisplay(info.currentDisplayIndex || 0)
      }
    } catch {
      setDisplays([{
        name: '主显示器',
        width: window.screen.width,
        height: window.screen.height,
        scaleFactor: window.devicePixelRatio || 1,
        isPrimary: true,
        x: 0,
        y: 0,
      }])
    }
  }, [])

  useEffect(() => {
    refreshDisplays()
  }, [refreshDisplays])

  const moveToDisplay = useCallback(async (displayIndex: number) => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('move_window_to_display', { displayIndex })
      setCurrentDisplay(displayIndex)
    } catch {}
  }, [])

  const saveWindowPosition = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('save_window_position')
    } catch {}
  }, [])

  const restoreWindowPosition = useCallback(async () => {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('restore_window_position')
    } catch {}
  }, [])

  const getDpiScale = useCallback((): number => {
    if (displays.length === 0) return window.devicePixelRatio || 1
    return displays[currentDisplay]?.scaleFactor || window.devicePixelRatio || 1
  }, [displays, currentDisplay])

  return {
    displays,
    currentDisplay,
    moveToDisplay,
    saveWindowPosition,
    restoreWindowPosition,
    refreshDisplays,
    getDpiScale,
    savedPosition,
  }
}
