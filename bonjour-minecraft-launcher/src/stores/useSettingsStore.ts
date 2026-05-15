import { create } from 'zustand'
import type { LauncherSettings } from '../types'
import { DEFAULT_LAUNCHER_SETTINGS } from '../types'
import { minecraftAPI } from '../api/tauri-bridge'

interface SettingsState {
  settings: LauncherSettings
  isLoading: boolean

  loadSettings: () => Promise<void>
  saveSettings: (settings: LauncherSettings) => Promise<void>
  updateSetting: <K extends keyof LauncherSettings>(key: K, value: LauncherSettings[K]) => Promise<void>
  completeSetup: (partial: Partial<LauncherSettings>) => Promise<LauncherSettings>
  autoSetup: () => Promise<{ gameDir: string; javaPath: string; needsJavaDownload: boolean; settings: LauncherSettings }>
  isFirstLaunch: () => Promise<boolean>
}

export const useSettingsStore = create<SettingsState>()((set, get) => ({
  settings: DEFAULT_LAUNCHER_SETTINGS,
  isLoading: false,

  loadSettings: async () => {
    set({ isLoading: true })
    try {
      const settings = await minecraftAPI.getSettings()
      set({ settings, isLoading: false })
    } catch {
      set({ isLoading: false })
    }
  },

  saveSettings: async (settings) => {
    await minecraftAPI.saveSettings(settings)
    set({ settings })
  },

  updateSetting: async (key, value) => {
    const settings = { ...get().settings, [key]: value }
    await get().saveSettings(settings)
  },

  completeSetup: async (partial) => {
    const result = await minecraftAPI.completeSetup(partial)
    set({ settings: result })
    return result
  },

  autoSetup: async () => {
    const result = await minecraftAPI.autoSetup()
    set({ settings: result.settings })
    return result
  },

  isFirstLaunch: async () => {
    return minecraftAPI.isFirstLaunch()
  },
}))
