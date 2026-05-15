import { create } from 'zustand'
import type { GameSession } from '../types'

interface GameSessionState {
  gameSessions: GameSession[]
  addSession: (session: GameSession) => void
  clearSessions: () => void
}

export const useGameSessionStore = create<GameSessionState>()((set) => ({
  gameSessions: [],

  addSession: (session) => {
    set((state) => ({
      gameSessions: [...state.gameSessions, session],
    }))
  },

  clearSessions: () => {
    set({ gameSessions: [] })
  },
}))
