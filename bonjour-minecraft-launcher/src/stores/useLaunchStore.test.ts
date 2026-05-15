import { describe, it, expect, beforeEach } from 'vitest'
import { useLaunchStore } from './useLaunchStore'

describe('useLaunchStore', () => {
  beforeEach(() => {
    useLaunchStore.setState({
      isLaunching: false,
      launchLogs: [],
      launchVersionName: '',
      gameSessions: [],
      launchStartTime: 0,
    })
  })

  it('should start with default values', () => {
    const state = useLaunchStore.getState()
    expect(state.isLaunching).toBe(false)
    expect(state.launchLogs).toEqual([])
    expect(state.launchVersionName).toBe('')
    expect(state.gameSessions).toEqual([])
    expect(state.launchStartTime).toBe(0)
  })

  it('should start launch and record start time', () => {
    const before = Date.now()
    useLaunchStore.getState().startLaunch('1.21.4')
    const after = Date.now()

    const state = useLaunchStore.getState()
    expect(state.isLaunching).toBe(true)
    expect(state.launchVersionName).toBe('1.21.4')
    expect(state.launchLogs).toEqual([])
    expect(state.launchStartTime).toBeGreaterThanOrEqual(before)
    expect(state.launchStartTime).toBeLessThanOrEqual(after)
  })

  it('should add logs', () => {
    useLaunchStore.getState().startLaunch('1.21.4')
    useLaunchStore.getState().addLog({ type: 'info', message: 'Starting game...' })
    useLaunchStore.getState().addLog({ type: 'error', message: 'Something went wrong' })

    const state = useLaunchStore.getState()
    expect(state.launchLogs).toHaveLength(2)
    expect(state.launchLogs[0].type).toBe('info')
    expect(state.launchLogs[1].type).toBe('error')
  })

  it('should end launch and create game session', () => {
    useLaunchStore.getState().startLaunch('1.21.4')
    const startTime = useLaunchStore.getState().launchStartTime

    useLaunchStore.getState().endLaunch()

    const state = useLaunchStore.getState()
    expect(state.isLaunching).toBe(false)
    expect(state.gameSessions).toHaveLength(1)
    expect(state.gameSessions[0].versionId).toBe('1.21.4')
    expect(state.gameSessions[0].startTime).toBe(startTime)
    expect(state.gameSessions[0].endTime).toBeGreaterThanOrEqual(startTime)
    expect(state.gameSessions[0].duration).toBeGreaterThanOrEqual(0)
  })

  it('should clear logs', () => {
    useLaunchStore.getState().startLaunch('1.21.4')
    useLaunchStore.getState().addLog({ type: 'info', message: 'test' })
    useLaunchStore.getState().clearLogs()

    expect(useLaunchStore.getState().launchLogs).toEqual([])
  })

  it('should add game session manually', () => {
    const session = {
      versionId: '1.20.4',
      startTime: Date.now() - 60000,
      endTime: Date.now(),
      duration: 1,
    }
    useLaunchStore.getState().addGameSession(session)

    const state = useLaunchStore.getState()
    expect(state.gameSessions).toHaveLength(1)
    expect(state.gameSessions[0].versionId).toBe('1.20.4')
  })

  it('should accumulate multiple game sessions', () => {
    useLaunchStore.getState().startLaunch('1.21.4')
    useLaunchStore.getState().endLaunch()

    useLaunchStore.getState().startLaunch('1.20.4')
    useLaunchStore.getState().endLaunch()

    expect(useLaunchStore.getState().gameSessions).toHaveLength(2)
  })
})
