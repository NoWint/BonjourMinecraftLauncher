import type { LaunchBenchmarkRecord, LaunchBenchmarkSummary, LaunchPhaseId } from '../../types/launch'

export async function recordBenchmark(
  dataDir: string,
  version: string,
  totalDuration: number,
  phaseDurations: Record<LaunchPhaseId, number>,
  javaVersion: string,
  maxMemory: number,
  modCount: number,
  exitCode: number | null,
  instanceId?: string
): Promise<LaunchBenchmarkRecord> {
  return await window.minecraftAPI.saveBenchmark({
    version, totalDuration, phaseDurations, javaVersion, maxMemory, modCount, exitCode, instanceId
  }) as unknown as LaunchBenchmarkRecord
}

export async function getBenchmarkSummary(dataDir: string, version: string): Promise<LaunchBenchmarkSummary | null> {
  return await window.minecraftAPI.getBenchmarkSummary(version) as LaunchBenchmarkSummary | null
}

export async function getBenchmarkHistory(dataDir: string, version: string, limit = 50): Promise<LaunchBenchmarkRecord[]> {
  return await window.minecraftAPI.getLaunchBenchmarks(version, limit) as LaunchBenchmarkRecord[]
}

export async function detectSlowMod(
  dataDir: string,
  version: string,
  currentModCount: number
): Promise<string | null> {
  const records = await getBenchmarkHistory(dataDir, version)
  const validRecords = records.filter(r => r.exitCode === 0).sort((a, b) => a.timestamp - b.timestamp)

  if (validRecords.length < 2) return null

  const last = validRecords[validRecords.length - 1]
  const prev = validRecords[validRecords.length - 2]

  const diff = last.totalDuration - prev.totalDuration
  const relativeDiff = diff / prev.totalDuration

  if (relativeDiff > 0.2 && currentModCount > prev.modCount) {
    return `本次启动比上次慢了 ${Math.round(diff / 1000)} 秒，新增了 ${currentModCount - prev.modCount} 个模组，可能是新增模组导致的`
  }

  return null
}
