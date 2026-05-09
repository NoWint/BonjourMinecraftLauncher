export type LaunchPhaseId =
  | 'validating'
  | 'java_init'
  | 'downloading'
  | 'extracting'
  | 'class_loading'
  | 'resource_loading'
  | 'window_creating'

export interface LaunchPhase {
  id: LaunchPhaseId
  label: string
  status: 'pending' | 'active' | 'completed' | 'error'
  startedAt: number | null
  completedAt: number | null
  duration: number | null
  parallelTasks: number
  logs: LaunchLogEntry[]
}

export interface LaunchLogEntry {
  timestamp: number
  type: 'debug' | 'info' | 'warn' | 'error'
  message: string
  phase: LaunchPhaseId
  diagnosis?: LogDiagnosis
}

export interface LogDiagnosis {
  matched: boolean
  ruleId: string
  title: string
  description: string
  solution: string
  severity: 'info' | 'warning' | 'error' | 'critical'
}

export interface LaunchSession {
  id: string
  instanceId?: string
  version: string
  accountName: string
  startedAt: number
  completedAt: number | null
  exitCode: number | null
  phases: Record<LaunchPhaseId, LaunchPhase>
  status: 'preparing' | 'launching' | 'running' | 'exited' | 'crashed'
  pid: number | null
}

export interface LaunchBenchmarkRecord {
  id: string
  version: string
  instanceId?: string
  timestamp: number
  totalDuration: number
  phaseDurations: Record<LaunchPhaseId, number>
  javaVersion: string
  maxMemory: number
  modCount: number
  exitCode: number | null
}

export interface LaunchBenchmarkSummary {
  version: string
  averageDuration: number
  minDuration: number
  maxDuration: number
  sampleCount: number
  lastDuration: number
  deviation: number
  trend: 'improving' | 'stable' | 'degrading'
}

export interface CrashReport {
  id: string
  timestamp: number
  version: string
  instanceId?: string
  exitCode: number
  stackTrace: string
  systemInfo: CrashSystemInfo
  modList: string[]
  jvmArgs: string[]
  diagnosis: CrashDiagnosis | null
  rawLog: string
}

export interface CrashSystemInfo {
  os: string
  osVersion: string
  javaVersion: string
  totalMemory: number
  cpuModel: string
  gpuInfo: string
}

export interface CrashDiagnosis {
  category: string
  title: string
  description: string
  solutions: CrashSolution[]
  confidence: number
}

export interface CrashSolution {
  id: string
  title: string
  description: string
  action: 'update_driver' | 'remove_mod' | 'change_jvm_args' | 'update_java' | 'change_memory' | 'reinstall' | 'manual'
  target?: string
}

export interface JVMProfile {
  id: string
  name: string
  description: string
  level: 'beginner' | 'advanced' | 'expert'
  args: string[]
  recommendedMemory: number
  gcType: string
  notes: string
}

export interface JVMTuningResult {
  profile: JVMProfile
  args: string[]
  memoryConfig: { min: number; max: number }
  warnings: string[]
}

export interface IncrementalSyncResult {
  totalFiles: number
  existingFiles: number
  missingFiles: number
  corruptedFiles: number
  downloadedFiles: number
  skippedFiles: number
  failedFiles: number
  totalBytes: number
  downloadedBytes: number
  duration: number
}

export interface GameProcessInfo {
  pid: number
  instanceId?: string
  version: string
  startedAt: number
  status: 'running' | 'exited' | 'crashed'
  exitCode: number | null
  memoryUsage: number
  cpuUsage: number
}

export interface ProcessRecoveryOption {
  id: string
  label: string
  description: string
  action: 'restart' | 'view_log' | 'rollback_version' | 'quick_fix' | 'dismiss'
}

export interface HotConfigCategory {
  id: string
  name: string
  requiresRestart: boolean
  patterns: string[]
}

export interface HotConfigChange {
  filePath: string
  category: string
  canHotReload: boolean
  timestamp: number
}

export const LAUNCH_PHASES: { id: LaunchPhaseId; label: string }[] = [
  { id: 'validating', label: '验证' },
  { id: 'java_init', label: 'Java 初始化' },
  { id: 'downloading', label: '下载资源' },
  { id: 'extracting', label: '解压文件' },
  { id: 'class_loading', label: '类加载' },
  { id: 'resource_loading', label: '资源加载' },
  { id: 'window_creating', label: '窗口创建' },
]

export function createInitialPhases(): Record<LaunchPhaseId, LaunchPhase> {
  const phases = {} as Record<LaunchPhaseId, LaunchPhase>
  for (const p of LAUNCH_PHASES) {
    phases[p.id] = {
      id: p.id,
      label: p.label,
      status: 'pending',
      startedAt: null,
      completedAt: null,
      duration: null,
      parallelTasks: 0,
      logs: [],
    }
  }
  return phases
}
