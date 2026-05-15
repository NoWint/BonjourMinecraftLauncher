import type { ServerStatusNotification, ServerNotificationConfig } from '../../types/server'
import { DEFAULT_SERVER_NOTIFICATION_CONFIG } from '../../types/server'
import { minecraftAPI } from '../../api/tauri-bridge'

type NotificationCallback = (notification: ServerStatusNotification) => void

class ServerStatusPushService {
  private configs: Map<string, ServerNotificationConfig> = new Map()
  private listeners: Set<NotificationCallback> = new Set()
  private intervals: Map<string, ReturnType<typeof setInterval>> = new Map()
  private notifications: ServerStatusNotification[] = []

  onNotification(callback: NotificationCallback): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  configure(serverId: string, config: Partial<ServerNotificationConfig>): void {
    const existing = this.configs.get(serverId) || { ...DEFAULT_SERVER_NOTIFICATION_CONFIG, serverId }
    this.configs.set(serverId, { ...existing, ...config })
    minecraftAPI.updateServerNotificationConfig(serverId, { ...existing, ...config }).catch(() => {})
  }

  getConfig(serverId: string): ServerNotificationConfig {
    return this.configs.get(serverId) || { ...DEFAULT_SERVER_NOTIFICATION_CONFIG, serverId }
  }

  startWatching(serverId: string, serverName: string, address: string, port: number): void {
    if (this.intervals.has(serverId)) return

    const config = this.getConfig(serverId)
    const interval = setInterval(async () => {
      try {
        await minecraftAPI.checkServerStatusForNotifications(serverId, serverName, address, port)
        const allNotifs = await minecraftAPI.getServerNotifications()
        this.notifications = allNotifs.map(n => ({
          serverId: n.serverId ?? n.server_id,
          serverName: n.serverName ?? n.server_name,
          type: n.type ?? n.notificationType ?? n.notification_type,
          message: n.message,
          timestamp: n.timestamp,
          read: n.read,
        }))
        const newNotifs = this.notifications.filter(n => !n.read)
        for (const n of newNotifs) {
          for (const cb of this.listeners) {
            try { cb(n) } catch {}
          }
        }
      } catch {}
    }, config.checkIntervalMs)

    this.intervals.set(serverId, interval)
  }

  stopWatching(serverId: string): void {
    const interval = this.intervals.get(serverId)
    if (interval) {
      clearInterval(interval)
      this.intervals.delete(serverId)
    }
  }

  stopAll(): void {
    for (const [, interval] of this.intervals) {
      clearInterval(interval)
    }
    this.intervals.clear()
  }

  async getNotifications(limit: number = 50): Promise<ServerStatusNotification[]> {
    try {
      const allNotifs = await minecraftAPI.getServerNotifications()
      this.notifications = allNotifs.map(n => ({
        serverId: n.serverId ?? n.server_id,
        serverName: n.serverName ?? n.server_name,
        type: n.type ?? n.notificationType ?? n.notification_type,
        message: n.message,
        timestamp: n.timestamp,
        read: n.read,
      }))
      return this.notifications.slice(0, limit)
    } catch {
      return this.notifications.slice(0, limit)
    }
  }

  async markAsRead(timestamp: number, serverId: string): Promise<void> {
    await minecraftAPI.markServerNotificationRead(timestamp, serverId)
    const n = this.notifications.find(n => n.timestamp === timestamp && n.serverId === serverId)
    if (n) n.read = true
  }

  async markAllAsRead(): Promise<void> {
    await minecraftAPI.markAllNotificationsRead()
    for (const n of this.notifications) {
      n.read = true
    }
  }

  getUnreadCount(): number {
    return this.notifications.filter(n => !n.read).length
  }
}

export const serverStatusPush = new ServerStatusPushService()
