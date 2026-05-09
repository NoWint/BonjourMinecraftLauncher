import type { LaunchPhaseId, LaunchPhase, LaunchSession, LaunchLogEntry } from '../../types/launch'
import { createInitialPhases, LAUNCH_PHASES } from '../../types/launch'

const PHASE_ORDER: LaunchPhaseId[] = [
  'validating',
  'java_init',
  'downloading',
  'extracting',
  'class_loading',
  'resource_loading',
  'window_creating',
]

export class LaunchEngine {
  private session: LaunchSession | null = null
  private currentPhaseIndex = 0
  private onSessionUpdate?: (session: LaunchSession) => void

  constructor(onUpdate?: (session: LaunchSession) => void) {
    this.onSessionUpdate = onUpdate
  }

  startSession(version: string, accountName: string, instanceId?: string): LaunchSession {
    this.session = {
      id: `launch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      instanceId,
      version,
      accountName,
      startedAt: Date.now(),
      completedAt: null,
      exitCode: null,
      phases: createInitialPhases(),
      status: 'preparing',
      pid: null,
    }
    this.currentPhaseIndex = 0
    this.notifyUpdate()
    return this.session
  }

  advanceToPhase(phaseId: LaunchPhaseId): void {
    if (!this.session) return

    const now = Date.now()

    for (let i = 0; i < this.currentPhaseIndex && i < PHASE_ORDER.length; i++) {
      const prevPhase = this.session.phases[PHASE_ORDER[i]]
      if (prevPhase.status === 'active') {
        prevPhase.status = 'completed'
        prevPhase.completedAt = now
        prevPhase.duration = now - (prevPhase.startedAt || now)
      }
    }

    const phase = this.session.phases[phaseId]
    if (phase && phase.status === 'pending') {
      phase.status = 'active'
      phase.startedAt = now
    }

    this.currentPhaseIndex = PHASE_ORDER.indexOf(phaseId)
    if (this.session.status === 'preparing') {
      this.session.status = 'launching'
    }
    this.notifyUpdate()
  }

  addLog(phaseId: LaunchPhaseId, type: LaunchLogEntry['type'], message: string): void {
    if (!this.session) return

    const entry: LaunchLogEntry = {
      timestamp: Date.now(),
      type,
      message,
      phase: phaseId,
    }

    this.session.phases[phaseId].logs.push(entry)

    if (type === 'error' && this.session.phases[phaseId].status === 'active') {
      this.session.phases[phaseId].status = 'error'
    }

    this.notifyUpdate()
  }

  setPhaseParallelTasks(phaseId: LaunchPhaseId, count: number): void {
    if (!this.session) return
    this.session.phases[phaseId].parallelTasks = count
    this.notifyUpdate()
  }

  completePhase(phaseId: LaunchPhaseId): void {
    if (!this.session) return
    const phase = this.session.phases[phaseId]
    if (phase.status === 'active') {
      const now = Date.now()
      phase.status = 'completed'
      phase.completedAt = now
      phase.duration = now - (phase.startedAt || now)
    }
    this.notifyUpdate()
  }

  markRunning(pid: number): void {
    if (!this.session) return
    this.session.pid = pid
    this.session.status = 'running'

    for (const phaseId of PHASE_ORDER) {
      const phase = this.session.phases[phaseId]
      if (phase.status === 'active') {
        phase.status = 'completed'
        const now = Date.now()
        phase.completedAt = now
        phase.duration = now - (phase.startedAt || now)
      }
    }

    this.notifyUpdate()
  }

  markExited(exitCode: number): void {
    if (!this.session) return
    this.session.exitCode = exitCode
    this.session.completedAt = Date.now()
    this.session.status = exitCode === 0 ? 'exited' : 'crashed'

    for (const phaseId of PHASE_ORDER) {
      const phase = this.session.phases[phaseId]
      if (phase.status === 'active') {
        phase.status = exitCode === 0 ? 'completed' : 'error'
        const now = Date.now()
        phase.completedAt = now
        phase.duration = now - (phase.startedAt || now)
      }
    }

    this.notifyUpdate()
  }

  getSession(): LaunchSession | null {
    return this.session
  }

  getPhaseProgress(): { completed: number; total: number; percentage: number } {
    if (!this.session) return { completed: 0, total: PHASE_ORDER.length, percentage: 0 }

    let completed = 0
    for (const phaseId of PHASE_ORDER) {
      if (this.session.phases[phaseId].status === 'completed') {
        completed++
      }
    }

    return {
      completed,
      total: PHASE_ORDER.length,
      percentage: Math.round((completed / PHASE_ORDER.length) * 100),
    }
  }

  getCurrentPhase(): LaunchPhaseId | null {
    if (!this.session) return null
    return PHASE_ORDER[this.currentPhaseIndex] || null
  }

  reset(): void {
    this.session = null
    this.currentPhaseIndex = 0
  }

  private notifyUpdate(): void {
    if (this.session && this.onSessionUpdate) {
      this.onSessionUpdate({ ...this.session, phases: { ...this.session.phases } })
    }
  }
}

export function classifyLogToPhase(message: string): LaunchPhaseId {
  const lower = message.toLowerCase()

  if (lower.includes('validating') || lower.includes('checking') || lower.includes('verifying')) {
    return 'validating'
  }
  if (lower.includes('java') || lower.includes('jvm') || lower.includes('launching') || lower.includes('main')) {
    return 'java_init'
  }
  if (lower.includes('download') || lower.includes('fetching') || lower.includes('progress')) {
    return 'downloading'
  }
  if (lower.includes('extract') || lower.includes('unzip') || lower.includes('decompress')) {
    return 'extracting'
  }
  if (lower.includes('class') || lower.includes('loading') || lower.includes('init') || lower.includes('forge') || lower.includes('fabric') || lower.includes('mod')) {
    return 'class_loading'
  }
  if (lower.includes('resource') || lower.includes('asset') || lower.includes('texture') || lower.includes('sound')) {
    return 'resource_loading'
  }
  if (lower.includes('window') || lower.includes('display') || lower.includes('opengl') || lower.includes('render')) {
    return 'window_creating'
  }

  return 'class_loading'
}

export { PHASE_ORDER, LAUNCH_PHASES }
