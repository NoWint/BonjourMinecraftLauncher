import type { LogDiagnosis, CrashDiagnosis, CrashSolution, CrashReport, CrashSystemInfo } from '../../types/launch'
import { diagnoseLog } from './launchPhases'

export function diagnoseCrashReport(
  rawLog: string,
  exitCode: number,
  systemInfo: CrashSystemInfo,
  modList: string[],
  jvmArgs: string[]
): CrashDiagnosis | null {
  const allDiagnoses: LogDiagnosis[] = []

  const lines = rawLog.split('\n')
  for (const line of lines) {
    const d = diagnoseLog(line)
    if (d) allDiagnoses.push(d)
  }

  if (exitCode === -1 && allDiagnoses.length === 0) {
    allDiagnoses.push({
      matched: true,
      ruleId: 'jvm_crash',
      title: 'JVM 崩溃',
      description: 'JVM 意外崩溃，可能是内存不足或原生代码错误',
      solution: '减少内存分配；更新 Java 和显卡驱动；检查 hs_err_pid 日志文件',
      severity: 'critical',
    })
  }

  if (exitCode === 1 && allDiagnoses.length === 0) {
    allDiagnoses.push({
      matched: true,
      ruleId: 'unknown_exit_1',
      title: '游戏异常退出',
      description: '游戏以代码 1 退出，原因未知',
      solution: '查看完整日志寻找错误线索；尝试移除最近添加的模组；重新安装游戏版本',
      severity: 'error',
    })
  }

  if (allDiagnoses.length === 0) return null

  const sorted = allDiagnoses.sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  const primary = sorted[0]

  const solutions: CrashSolution[] = primary.solution.split('；').map((s, i) => ({
    id: `${primary.ruleId}_sol_${i}`,
    title: s.substring(0, 20) + '...',
    description: s,
    action: inferActionFromSolution(s),
  }))

  return {
    category: primary.ruleId,
    title: primary.title,
    description: primary.description,
    solutions,
    confidence: primary.severity === 'critical' ? 0.95 : primary.severity === 'error' ? 0.85 : 0.7,
  }
}

function inferActionFromSolution(solution: string): CrashSolution['action'] {
  if (solution.includes('更新') && solution.includes('驱动')) return 'update_driver'
  if (solution.includes('移除') || solution.includes('删除')) return 'remove_mod'
  if (solution.includes('JVM') || solution.includes('参数')) return 'change_jvm_args'
  if (solution.includes('Java')) return 'update_java'
  if (solution.includes('内存')) return 'change_memory'
  if (solution.includes('重新安装')) return 'reinstall'
  return 'manual'
}

export function createCrashReport(
  version: string,
  exitCode: number,
  rawLog: string,
  systemInfo: CrashSystemInfo,
  modList: string[],
  jvmArgs: string[],
  instanceId?: string
): CrashReport {
  const diagnosis = diagnoseCrashReport(rawLog, exitCode, systemInfo, modList, jvmArgs)

  return {
    id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    version,
    instanceId,
    exitCode,
    stackTrace: extractStackTrace(rawLog),
    systemInfo,
    modList,
    jvmArgs,
    diagnosis,
    rawLog,
  }
}

function extractStackTrace(log: string): string {
  const lines = log.split('\n')
  const stackStart = lines.findIndex(l => l.includes('Exception') || l.includes('Error') || l.includes('at '))
  if (stackStart === -1) return ''

  const stackLines: string[] = []
  for (let i = stackStart; i < Math.min(lines.length, stackStart + 30); i++) {
    const line = lines[i].trim()
    if (line.startsWith('at ') || line.includes('Exception') || line.includes('Error') || line.startsWith('Caused by')) {
      stackLines.push(line)
    } else if (stackLines.length > 0 && line === '') {
      break
    }
  }

  return stackLines.join('\n')
}
