import type { ServerPerformanceData, ServerPerformanceHistory } from '../../types/server'

type MonitorCallback = (data: ServerPerformanceData) => void

class ServerMonitorService {
  private histories: Map<string, ServerPerformanceHistory> = new Map()
  private listeners: Map<string, Set<MonitorCallback>> = new Map()
  private intervals: Map<string, NodeJS.Timeout> = new Map()

  onData(serverId: string, callback: MonitorCallback): () => void {
    if (!this.listeners.has(serverId)) {
      this.listeners.set(serverId, new Set())
    }
    this.listeners.get(serverId)!.add(callback)
    return () => this.listeners.get(serverId)?.delete(callback)
  }

  startMonitoring(serverId: string, rconPort: number = 25575, rconPassword: string = ''): void {
    if (this.intervals.has(serverId)) return

    const interval = setInterval(() => {
      const data = this.collectData(serverId)
      this.pushData(serverId, data)
    }, 2000)

    this.intervals.set(serverId, interval)
  }

  stopMonitoring(serverId: string): void {
    const interval = this.intervals.get(serverId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(serverId)
    }
  }

  stopAll(): void {
    for (const [id, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  getHistory(serverId: string): ServerPerformanceHistory | null {
    return this.histories.get(serverId) || null
  }

  pushData(serverId: string, data: ServerPerformanceData): void {
    let history = this.histories.get(serverId)
    if (!history) {
      history = {
        serverId,
        dataPoints: [],
        averageTps: 20,
        averageMemoryUsage: 0,
        peakPlayerCount: 0,
        lastUpdated: Date.now(),
      }
      this.histories.set(serverId, history)
    }

    history.dataPoints.push(data)
    if (history.dataPoints.length > 300) {
      history.dataPoints = history.dataPoints.slice(-300)
    }

    const recentPoints = history.dataPoints.slice(-60)
    history.averageTps = recentPoints.reduce((s, d) => s + d.tps, 0) / recentPoints.length
    history.averageMemoryUsage = recentPoints.reduce((s, d) => s + (d.memoryUsedMB / d.memoryTotalMB) * 100, 0) / recentPoints.length
    history.peakPlayerCount = Math.max(history.peakPlayerCount, data.playerCount)
    history.lastUpdated = Date.now()

    const cbs = this.listeners.get(serverId)
    if (cbs) {
      for (const cb of cbs) {
        try { cb(data) } catch {}
      }
    }
  }

  private collectData(serverId: string): ServerPerformanceData {
    return {
      tps: 20,
      memoryUsedMB: 0,
      memoryTotalMB: 0,
      playerCount: 0,
      entityCount: 0,
      chunkCount: 0,
      cpuUsage: 0,
      timestamp: Date.now(),
    }
  }
}

export const serverMonitor = new ServerMonitorService()
