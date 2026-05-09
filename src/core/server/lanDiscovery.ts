import type { LANWorld } from '../../types/server'
import { minecraftAPI } from '../../api/tauri-bridge'

type LANDiscoveryCallback = (worlds: LANWorld[]) => void

class LANDiscoveryService {
  private worlds: Map<string, LANWorld> = new Map()
  private listeners: Set<LANDiscoveryCallback> = new Set()
  private scanning = false
  private scanInterval: ReturnType<typeof setInterval> | null = null

  onWorldsUpdate(callback: LANDiscoveryCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  async startScan(): Promise<void> {
    this.scanning = true
    this.worlds.clear()
    this.notifyListeners()

    try {
      const results = await minecraftAPI.scanLANWorlds()
      for (const w of results) {
        const key = `${w.host}:${w.port}`
        this.worlds.set(key, {
          host: w.host,
          port: w.port,
          worldName: w.worldName ?? w.motd ?? '',
          gameMode: w.gameMode ?? 'survival',
          playerCount: w.playerCount ?? 1,
          discoveredAt: w.discoveredAt ?? Date.now(),
          motd: w.motd,
        })
      }
      this.notifyListeners()
    } catch {
      this.scanning = false
    }

    this.scanInterval = setInterval(async () => {
      if (!this.scanning) return
      try {
        const results = await minecraftAPI.scanLANWorlds()
        this.worlds.clear()
        for (const w of results) {
          const key = `${w.host}:${w.port}`
          this.worlds.set(key, {
            host: w.host,
            port: w.port,
            worldName: w.worldName ?? w.motd ?? '',
            gameMode: w.gameMode ?? 'survival',
            playerCount: w.playerCount ?? 1,
            discoveredAt: w.discoveredAt ?? Date.now(),
            motd: w.motd,
          })
        }
        this.removeStaleWorlds()
        this.notifyListeners()
      } catch {}
    }, 10000)
  }

  stopScan(): void {
    this.scanning = false
    if (this.scanInterval) {
      clearInterval(this.scanInterval)
      this.scanInterval = null
    }
  }

  isScanning(): boolean {
    return this.scanning
  }

  getWorlds(): LANWorld[] {
    return Array.from(this.worlds.values()).sort((a, b) => b.discoveredAt - a.discoveredAt)
  }

  addDiscoveredWorld(host: string, port: number, worldName: string, gameMode: string, playerCount: number, motd?: string): void {
    const key = `${host}:${port}`
    const existing = this.worlds.get(key)
    if (existing) {
      existing.worldName = worldName
      existing.gameMode = gameMode
      existing.playerCount = playerCount
      existing.motd = motd
    } else {
      this.worlds.set(key, {
        host,
        port,
        worldName,
        gameMode,
        playerCount,
        discoveredAt: Date.now(),
        motd,
      })
    }
    this.notifyListeners()
  }

  removeStaleWorlds(maxAgeMs: number = 30000): void {
    const now = Date.now()
    let changed = false
    for (const [key, world] of this.worlds) {
      if (now - world.discoveredAt > maxAgeMs) {
        this.worlds.delete(key)
        changed = true
      }
    }
    if (changed) this.notifyListeners()
  }

  private notifyListeners(): void {
    const worlds = this.getWorlds()
    for (const cb of this.listeners) {
      try { cb(worlds) } catch {}
    }
  }
}

export const lanDiscovery = new LANDiscoveryService()
