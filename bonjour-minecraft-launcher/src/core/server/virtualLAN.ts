import type { FriendLobby, FriendLobbyParticipant } from '../../types/server'
import { minecraftAPI } from '../../api/tauri-bridge'

type LobbyEventCallback = (lobby: FriendLobby) => void

class VirtualLANService {
  private currentLobby: FriendLobby | null = null
  private listeners: Map<string, Set<LobbyEventCallback>> = new Map()

  on(event: string, callback: LobbyEventCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set())
    }
    this.listeners.get(event)!.add(callback)
    return () => this.listeners.get(event)?.delete(callback)
  }

  async createLobby(hostName: string): Promise<FriendLobby> {
    const result = await minecraftAPI.createFriendLobby(hostName)
    const lobby: FriendLobby = {
      id: result.id,
      code: result.code,
      hostName: result.hostName,
      hostAddress: result.hostAddress,
      port: result.port,
      participants: result.participants ?? [],
      status: result.status,
      createdAt: result.createdAt,
      connectionType: result.connectionType ?? 'relay',
    }
    this.currentLobby = lobby
    this.emit('created', lobby)
    return lobby
  }

  async joinLobby(code: string, playerName: string): Promise<FriendLobby> {
    const result = await minecraftAPI.joinFriendLobby(code, playerName)
    const lobby: FriendLobby = {
      id: result.id,
      code: result.code,
      hostName: result.hostName,
      hostAddress: result.hostAddress,
      port: result.port,
      participants: result.participants ?? [],
      status: result.status,
      createdAt: result.createdAt,
      connectionType: result.connectionType ?? 'relay',
    }
    this.currentLobby = lobby
    this.emit('joined', lobby)
    return lobby
  }

  async leaveLobby(): Promise<void> {
    if (this.currentLobby) {
      this.currentLobby.status = 'disconnected'
      this.emit('left', this.currentLobby)
      this.currentLobby = null
    }
    await minecraftAPI.leaveFriendLobby()
  }

  async refreshStatus(): Promise<FriendLobby | null> {
    const result = await minecraftAPI.getFriendLobbyStatus()
    if (result && result.id) {
      const lobby: FriendLobby = {
        id: result.id,
        code: result.code,
        hostName: result.hostName,
        hostAddress: result.hostAddress,
        port: result.port,
        participants: result.participants ?? [],
        status: result.status,
        createdAt: result.createdAt,
        connectionType: result.connectionType ?? 'relay',
      }
      this.currentLobby = lobby
      return lobby
    }
    return null
  }

  getCurrentLobby(): FriendLobby | null {
    return this.currentLobby
  }

  getLobbyCode(): string | null {
    return this.currentLobby?.code || null
  }

  getVirtualAddress(): string | null {
    if (!this.currentLobby) return null
    return this.currentLobby.hostAddress || '127.0.0.1'
  }

  getVirtualPort(): number {
    return this.currentLobby?.port || 25565
  }

  updateParticipantStatus(participantId: string, status: FriendLobbyParticipant['status']): void {
    if (!this.currentLobby) return
    const participant = this.currentLobby.participants.find(p => p.id === participantId)
    if (participant) {
      participant.status = status
      this.emit('participant_update', this.currentLobby)
    }
  }

  private emit(event: string, lobby: FriendLobby): void {
    const cbs = this.listeners.get(event)
    if (cbs) {
      for (const cb of cbs) {
        try { cb(lobby) } catch {}
      }
    }
  }
}

export const virtualLAN = new VirtualLANService()
