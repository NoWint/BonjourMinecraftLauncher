import { create } from 'zustand'
import type { GameSession } from '../types'
import type { LaunchSession, LaunchLogEntry } from '../types/launch'
import { LaunchEngine } from '../core/launch/launchEngine'
import { classifyLogToPhase } from '../core/launch/launchPhases'

const MAX_LOG_ENTRIES = 500
const LOG_THROTTLE_MS = 100

interface LaunchState {
  isLaunching: boolean
  launchLogs: { type: string; message: string }[]
  launchVersionName: string
  gameSessions: GameSession[]
  launchStartTime: number
  overlayVisible: boolean
  session: LaunchSession | null

  startLaunch: (versionName: string) => void
  endLaunch: (success?: boolean) => void
  addLog: (log: { type: string; message: string }) => void
  clearLogs: () => void
  addGameSession: (session: GameSession) => void
  resetLaunch: () => void
  setLaunching: (value: boolean) => void
  setOverlayVisible: (visible: boolean) => void
}

let engine: LaunchEngine | null = null
let pendingLogs: { type: string; message: string }[] = []
let throttleTimer: ReturnType<typeof setTimeout> | null = null

function getEngine(): LaunchEngine {
  if (!engine) {
    engine = new LaunchEngine()
  }
  return engine
}

function flushPendingLogs(set: (fn: (state: LaunchState) => Partial<LaunchState>) => void) {
  if (pendingLogs.length === 0) return

  const logs = pendingLogs.splice(0)
  const eng = getEngine()

  for (const log of logs) {
    const phaseId = classifyLogToPhase(log.message)
    eng.addLog(phaseId, log.type as LaunchLogEntry['type'], log.message)
  }

  const session = eng.getSession()
  set(() => ({ session: session ? { ...session, phases: { ...session.phases } } : null }))
}

export const useLaunchStore = create<LaunchState>()((set) => ({
  isLaunching: false,
  launchLogs: [],
  launchVersionName: '',
  gameSessions: [],
  launchStartTime: 0,
  overlayVisible: false,
  session: null,

  startLaunch: (versionName) => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    pendingLogs = []

    const eng = getEngine()
    eng.reset()
    const session = eng.startSession(versionName, '', undefined)

    set({
      isLaunching: true,
      launchVersionName: versionName,
      launchLogs: [],
      launchStartTime: Date.now(),
      overlayVisible: true,
      session,
    })
  },

  endLaunch: (success?: boolean) => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    flushPendingLogs(set)
    pendingLogs = []

    const eng = getEngine()
    if (success) {
      eng.markRunning(0)
    }

    set((state) => {
      const endTime = Date.now()
      const startTime = state.launchStartTime || endTime
      const durationMs = endTime - startTime
      const session: GameSession = {
        versionId: state.launchVersionName,
        startTime,
        endTime,
        duration: Math.round(durationMs / 60000),
      }
      const finalSession = eng.getSession()
      return {
        isLaunching: false,
        overlayVisible: false,
        gameSessions: [...state.gameSessions, session],
        launchStartTime: 0,
        session: finalSession ? { ...finalSession, phases: { ...finalSession.phases } } : null,
      }
    })
  },

  addLog: (log) => {
    pendingLogs.push(log)

    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null
        useLaunchStore.setState((state) => {
          if (pendingLogs.length === 0) return {}

          const logsToAdd = pendingLogs.splice(0)
          const eng = getEngine()

          for (const l of logsToAdd) {
            const phaseId = classifyLogToPhase(l.message)
            eng.addLog(phaseId, l.type as LaunchLogEntry['type'], l.message)
          }

          const combined = [...state.launchLogs, ...logsToAdd]
          const capped = combined.length > MAX_LOG_ENTRIES
            ? combined.slice(combined.length - MAX_LOG_ENTRIES)
            : combined

          const session = eng.getSession()
          return {
            launchLogs: capped,
            session: session ? { ...session, phases: { ...session.phases } } : null,
          }
        })
      }, LOG_THROTTLE_MS)
    }
  },

  clearLogs: () => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    pendingLogs = []
    set({ launchLogs: [] })
  },

  addGameSession: (session) => {
    set((state) => ({
      gameSessions: [...state.gameSessions, session],
    }))
  },

  resetLaunch: () => {
    if (throttleTimer) {
      clearTimeout(throttleTimer)
      throttleTimer = null
    }
    pendingLogs = []
    const eng = getEngine()
    eng.reset()
    set({
      isLaunching: false,
      launchLogs: [],
      launchVersionName: '',
      launchStartTime: 0,
      overlayVisible: false,
      session: null,
    })
  },

  setLaunching: (value) => {
    set({ isLaunching: value })
  },

  setOverlayVisible: (visible) => {
    set({ overlayVisible: visible })
  },
}))
