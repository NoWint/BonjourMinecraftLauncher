import { describe, it, expect } from 'vitest'

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`
  const seconds = Math.floor(ms / 1000)
  if (seconds < 60) return `${seconds}s`
  const minutes = Math.floor(seconds / 60)
  const remainingSeconds = seconds % 60
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  return `${hours}h ${remainingMinutes}m`
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function getExitCodeSeverity(code: number): 'normal' | 'warning' | 'error' | 'critical' {
  if (code === 0) return 'normal'
  if (code === 1) return 'error'
  if (code === -1 || code === 137) return 'critical'
  if (code === 130) return 'normal'
  return 'warning'
}

function validateVersion(version: string): boolean {
  return /^\d+\.\d+(\.\d+)?(-[\w.-]+)?$/.test(version)
}

describe('formatDuration', () => {
  it('formats milliseconds', () => {
    expect(formatDuration(500)).toBe('500ms')
  })

  it('formats seconds', () => {
    expect(formatDuration(5000)).toBe('5s')
  })

  it('formats minutes and seconds', () => {
    expect(formatDuration(125000)).toBe('2m 5s')
  })

  it('formats hours', () => {
    expect(formatDuration(7200000)).toBe('2h 0m')
  })
})

describe('formatBytes', () => {
  it('formats zero bytes', () => {
    expect(formatBytes(0)).toBe('0 B')
  })

  it('formats bytes', () => {
    expect(formatBytes(500)).toBe('500.0 B')
  })

  it('formats KB', () => {
    expect(formatBytes(2048)).toBe('2.0 KB')
  })

  it('formats MB', () => {
    expect(formatBytes(10485760)).toBe('10.0 MB')
  })

  it('formats GB', () => {
    expect(formatBytes(2147483648)).toBe('2.0 GB')
  })
})

describe('getExitCodeSeverity', () => {
  it('returns normal for exit code 0', () => {
    expect(getExitCodeSeverity(0)).toBe('normal')
  })

  it('returns error for exit code 1', () => {
    expect(getExitCodeSeverity(1)).toBe('error')
  })

  it('returns critical for exit code -1', () => {
    expect(getExitCodeSeverity(-1)).toBe('critical')
  })

  it('returns critical for exit code 137', () => {
    expect(getExitCodeSeverity(137)).toBe('critical')
  })

  it('returns normal for exit code 130', () => {
    expect(getExitCodeSeverity(130)).toBe('normal')
  })

  it('returns warning for unknown codes', () => {
    expect(getExitCodeSeverity(100)).toBe('warning')
  })
})

describe('validateVersion', () => {
  it('validates release version', () => {
    expect(validateVersion('1.21')).toBe(true)
  })

  it('validates snapshot version', () => {
    expect(validateVersion('1.21.1-rc1')).toBe(true)
  })

  it('validates pre-release', () => {
    expect(validateVersion('1.21-pre4')).toBe(true)
  })

  it('rejects invalid version', () => {
    expect(validateVersion('abc')).toBe(false)
  })

  it('rejects empty string', () => {
    expect(validateVersion('')).toBe(false)
  })

  it('validates Forge format', () => {
    expect(validateVersion('1.21.1-forge-51.0.1')).toBe(true)
  })
})
