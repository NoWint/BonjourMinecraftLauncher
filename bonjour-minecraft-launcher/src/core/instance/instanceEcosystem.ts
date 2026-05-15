import type { BonjourPkg, StorageBreakdown, HealthCheckResult, InstanceDashboard, VersionMigrationGuide, LaunchDependency, LaunchDependencyGraph } from '../../types/instance'

export async function exportInstanceAsPkg(
  instanceDir: string,
  name: string,
  description: string,
  gameVersion: string | null,
  author: string,
  modLoader?: string | null,
  modLoaderVersion?: string | null,
  sourceInstanceId?: string | null,
  tags: string[] = []
): Promise<BonjourPkg> {
  const result = await window.minecraftAPI.exportInstancePkg(instanceDir, author)
  return result as BonjourPkg
}

export async function exportInstanceAsZip(
  instanceDir: string,
  name: string,
  description: string,
  gameVersion: string | null,
  author: string,
  modLoader?: string | null,
  modLoaderVersion?: string | null,
  sourceInstanceId?: string | null,
  tags: string[] = []
): Promise<string> {
  return await window.minecraftAPI.exportInstanceAsZip(instanceDir, name, description, gameVersion, author, modLoader ?? null, modLoaderVersion ?? null, sourceInstanceId ?? null, tags)
}

export async function importInstanceFromPkg(
  pkg: BonjourPkg,
  targetDir: string
): Promise<{ success: boolean; message: string; modsInstalled: number; configsRestored: number }> {
  return await window.minecraftAPI.importInstancePkg(JSON.stringify(pkg), targetDir) as { success: boolean; message: string; modsInstalled: number; configsRestored: number }
}

export async function importInstanceFromZip(
  zipPath: string,
  targetDir: string
): Promise<{ success: boolean; message: string; modsInstalled: number; configsRestored: number; shadersInstalled: number; metadata?: any }> {
  return await window.minecraftAPI.importInstanceFromZip(zipPath, targetDir)
}

export async function analyzeInstanceStorage(instanceDir: string, instanceId: string): Promise<StorageBreakdown> {
  return await window.minecraftAPI.analyzeInstanceStorage(instanceId) as StorageBreakdown
}

export async function cleanInstanceStorage(instanceId: string, categories: string[]): Promise<{ success: boolean; cleanedBytes: number; cleanedItems: number; message: string }> {
  return await window.minecraftAPI.cleanInstanceStorage(instanceId, categories)
}

export async function runHealthCheck(gameDir?: string): Promise<HealthCheckResult> {
  if (gameDir) {
    return await window.minecraftAPI.checkInstanceHealth(gameDir) as HealthCheckResult
  }
  return await window.minecraftAPI.runHealthCheck() as HealthCheckResult
}

export async function autoFixHealthIssues(gameDir: string, issueIds?: string[]): Promise<{ fixed: number; failed: number; message: string }> {
  return await window.minecraftAPI.autoFixHealthIssues(gameDir, issueIds)
}

export async function getInstanceDashboard(instanceDir: string, instanceId: string): Promise<InstanceDashboard> {
  return await window.minecraftAPI.getInstanceDashboard(instanceId) as InstanceDashboard
}

export async function recordPlayTime(instanceId: string, durationMs: number): Promise<void> {
  return await window.minecraftAPI.recordPlayTime(instanceId, durationMs)
}

export async function recordModChange(instanceId: string, action: string, modName: string, fileName: string): Promise<void> {
  return await window.minecraftAPI.recordModChange(instanceId, action, modName, fileName)
}

export async function getVersionMigrationGuide(
  currentVersion: string,
  targetVersion: string,
  currentModCount: number
): Promise<VersionMigrationGuide> {
  return await window.minecraftAPI.getVersionMigrationGuide(currentVersion, targetVersion, currentModCount) as VersionMigrationGuide
}

export function getLaunchDependencyGraph(
  dependencies: LaunchDependency[],
  instances: { id: string; name: string; gameVersion: string }[]
): LaunchDependencyGraph {
  const nodes = instances
    .filter(i => dependencies.some(d => d.instanceId === i.id || d.dependsOnInstanceId === i.id))
    .map(i => ({ instanceId: i.id, instanceName: i.name, gameVersion: i.gameVersion }))
  const edges = dependencies.map(d => ({
    from: d.dependsOnInstanceId,
    to: d.instanceId,
    delayMs: d.delayMs,
    required: d.required,
  }))
  return { nodes, edges }
}

export function resolveLaunchOrder(dependencies: LaunchDependency[]): string[] {
  const graph = new Map<string, Set<string>>()
  const inDegree = new Map<string, number>()
  const allIds = new Set<string>()

  for (const dep of dependencies) {
    allIds.add(dep.instanceId)
    allIds.add(dep.dependsOnInstanceId)
  }

  for (const id of allIds) {
    graph.set(id, new Set())
    inDegree.set(id, 0)
  }

  for (const dep of dependencies) {
    graph.get(dep.dependsOnInstanceId)!.add(dep.instanceId)
    inDegree.set(dep.instanceId, (inDegree.get(dep.instanceId) || 0) + 1)
  }

  const queue: string[] = []
  for (const [id, degree] of inDegree) {
    if (degree === 0) queue.push(id)
  }

  const result: string[] = []
  while (queue.length > 0) {
    const id = queue.shift()!
    result.push(id)
    for (const neighbor of graph.get(id) || []) {
      inDegree.set(neighbor, (inDegree.get(neighbor) || 0) - 1)
      if (inDegree.get(neighbor) === 0) {
        queue.push(neighbor)
      }
    }
  }

  return result
}
