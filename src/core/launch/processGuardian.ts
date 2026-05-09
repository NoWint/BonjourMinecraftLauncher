import type { GameProcessInfo, ProcessRecoveryOption } from '../../types/launch'

interface RunningProcess {
  pid: number
  instanceId?: string
  version: string
  startedAt: number
  childProcess: any
}

const runningProcesses: Map<number, RunningProcess> = new Map()

export function registerProcess(pid: number, childProcess: any, version: string, instanceId?: string): void {
  runningProcesses.set(pid, {
    pid,
    instanceId,
    version,
    startedAt: Date.now(),
    childProcess,
  })
}

export function unregisterProcess(pid: number): void {
  runningProcesses.delete(pid)
}

export function getRunningProcesses(): GameProcessInfo[] {
  const processes: GameProcessInfo[] = []

  for (const [pid, proc] of runningProcesses) {
    let memoryUsage = 0
    let cpuUsage = 0

    try {
      if (proc.childProcess && typeof proc.childProcess.memoryUsage === 'function') {
        memoryUsage = proc.childProcess.memoryUsage().heapUsed || 0
      }
    } catch {
      // ignore
    }

    processes.push({
      pid,
      instanceId: proc.instanceId,
      version: proc.version,
      startedAt: proc.startedAt,
      status: 'running',
      exitCode: null,
      memoryUsage,
      cpuUsage,
    })
  }

  return processes
}

export function isProcessRunning(pid: number): boolean {
  return runningProcesses.has(pid)
}

export function getProcessByInstance(instanceId: string): GameProcessInfo | null {
  for (const [pid, proc] of runningProcesses) {
    if (proc.instanceId === instanceId) {
      return {
        pid,
        instanceId: proc.instanceId,
        version: proc.version,
        startedAt: proc.startedAt,
        status: 'running',
        exitCode: null,
        memoryUsage: 0,
        cpuUsage: 0,
      }
    }
  }
  return null
}

export function getRecoveryOptions(exitCode: number, version: string, instanceId?: string): ProcessRecoveryOption[] {
  const options: ProcessRecoveryOption[] = []

  options.push({
    id: 'restart',
    label: '重新启动游戏',
    description: '使用相同配置重新启动游戏',
    action: 'restart',
  })

  options.push({
    id: 'view_log',
    label: '查看日志',
    description: '查看完整的游戏启动日志',
    action: 'view_log',
  })

  if (exitCode === -1 || exitCode === 137) {
    options.push({
      id: 'quick_fix',
      label: '一键修复',
      description: '自动检测并修复常见启动问题',
      action: 'quick_fix',
    })
  }

  if (exitCode !== 0) {
    options.push({
      id: 'rollback',
      label: '回退版本',
      description: '回退到之前可以正常运行的版本',
      action: 'rollback_version',
    })
  }

  options.push({
    id: 'dismiss',
    label: '忽略',
    description: '关闭此通知',
    action: 'dismiss',
  })

  return options
}

export function analyzeExitCode(exitCode: number): { category: string; description: string; severity: 'info' | 'warning' | 'error' | 'critical' } {
  switch (exitCode) {
    case 0:
      return { category: 'normal', description: '游戏正常退出', severity: 'info' }
    case 1:
      return { category: 'error', description: '游戏因错误退出，通常是模组或配置问题', severity: 'error' }
    case -1:
      return { category: 'crash', description: 'JVM 崩溃，可能是内存不足或原生代码错误', severity: 'critical' }
    case 137:
      return { category: 'oom', description: '进程被系统杀死（OOM），内存不足', severity: 'critical' }
    case 130:
      return { category: 'interrupted', description: '游戏被用户中断', severity: 'info' }
    default:
      if (exitCode > 128) {
        return { category: 'signal', description: `进程收到信号 ${exitCode - 128} 终止`, severity: 'warning' }
      }
      return { category: 'unknown', description: `游戏以未知代码 ${exitCode} 退出`, severity: 'warning' }
  }
}
