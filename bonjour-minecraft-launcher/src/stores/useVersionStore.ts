import { create } from 'zustand'
import { toast } from 'sonner'
import type { GameVersion, InstalledVersion, VersionInstance } from '../types'
import { minecraftAPI } from '../api/tauri-bridge'

interface VersionState {
  versions: GameVersion[]
  installedVersions: InstalledVersion[]
  instances: VersionInstance[]
  globalSelectedVersion: string
  isLoading: boolean
  error: string | null

  loadVersions: () => Promise<void>
  loadInstalledVersions: () => Promise<void>
  loadInstances: () => Promise<void>
  setGlobalSelectedVersion: (version: string) => void
  installVersion: (versionId: string) => Promise<void>
  createInstance: (data: { name: string; gameVersion: string; modLoader?: string; modLoaderVersion?: string }) => Promise<VersionInstance>
  deleteInstance: (instanceId: string) => Promise<void>
  clearError: () => void
}

export const useVersionStore = create<VersionState>()((set, get) => ({
  versions: [],
  installedVersions: [],
  instances: [],
  globalSelectedVersion: (() => {
    try {
      return localStorage.getItem('bonjour-selected-version') || ''
    } catch {
      return ''
    }
  })(),
  isLoading: false,
  error: null,

  loadVersions: async () => {
    try {
      const manifest = await minecraftAPI.getVersionManifest()
      set({ versions: manifest.versions, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : '无法加载版本列表'
      set({ error: message })
      toast.error('加载版本列表失败', { description: message })
    }
  },

  loadInstalledVersions: async () => {
    try {
      const installedVersions = await minecraftAPI.getInstalledVersions()
      set({ installedVersions, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : '无法加载已安装版本'
      set({ error: message })
      toast.error('加载已安装版本失败', { description: message })
    }
  },

  loadInstances: async () => {
    try {
      const instances = await minecraftAPI.getInstances()
      set({ instances, error: null })
    } catch (err) {
      const message = err instanceof Error ? err.message : '无法加载实例列表'
      set({ error: message })
      toast.error('加载实例列表失败', { description: message })
    }
  },

  setGlobalSelectedVersion: (version) => {
    set({ globalSelectedVersion: version })
    try {
      localStorage.setItem('bonjour-selected-version', version)
    } catch {
      toast.error('无法保存版本选择')
    }
  },

  installVersion: async (versionId) => {
    try {
      await minecraftAPI.installVersion(versionId)
      await get().loadInstalledVersions()
      toast.success('版本安装完成', { description: `${versionId} 已成功安装` })
    } catch (err) {
      const message = err instanceof Error ? err.message : '安装失败'
      set({ error: message })
      toast.error('版本安装失败', { description: message })
      throw err
    }
  },

  createInstance: async (data) => {
    const instance = await minecraftAPI.createInstance(data)
    set((state) => ({ instances: [...state.instances, instance] }))
    return instance
  },

  deleteInstance: async (instanceId) => {
    await minecraftAPI.deleteInstance(instanceId)
    set((state) => ({
      instances: state.instances.filter((i) => i.id !== instanceId),
    }))
  },

  clearError: () => set({ error: null }),
}))
