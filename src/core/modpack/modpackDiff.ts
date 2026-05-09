import type { ModpackDiff, ModpackUpdateResult, ModpackForkInfo, ModpackForkConflict, ModpackForkMergeResult } from '../../types/modpack'

export function diffModpackVersions(
  currentMods: { fileName: string; hash?: string; projectId?: number; fileId?: number }[],
  newMods: { fileName: string; hash?: string; projectId?: number; fileId?: number }[]
): ModpackDiff {
  const currentMap = new Map(currentMods.map(m => [m.projectId ? `${m.projectId}` : m.fileName, m]))
  const newMap = new Map(newMods.map(m => [m.projectId ? `${m.projectId}` : m.fileName, m]))

  const added: any[] = []
  const removed: any[] = []
  const updated: any[] = []

  for (const [key, mod] of newMap) {
    if (!currentMap.has(key)) {
      added.push(mod)
    } else {
      const current = currentMap.get(key)!
      if (mod.hash && current.hash && mod.hash !== current.hash) {
        updated.push(mod)
      } else if (mod.fileId && current.fileId && mod.fileId !== current.fileId) {
        updated.push(mod)
      }
    }
  }

  for (const [key, mod] of currentMap) {
    if (!newMap.has(key)) {
      removed.push(mod)
    }
  }

  const summary = `+${added.length} 模组, -${removed.length} 模组, ~${updated.length} 更新`

  return { added, removed, updated, configChanges: [], summary }
}

export async function applyIncrementalUpdate(
  instanceDir: string,
  diff: ModpackDiff,
  downloadFn: (url: string, target: string) => Promise<boolean>
): Promise<ModpackUpdateResult> {
  return await window.minecraftAPI.applyModpackUpdate({ instanceDir, diff }) as ModpackUpdateResult
}

export function createFork(
  originalPackId: string,
  originalPackName: string,
  originalVersion: string,
  instanceId: string,
  forkName: string
): ModpackForkInfo {
  return {
    originalPackId,
    originalPackName,
    originalVersion,
    forkCreatedAt: Date.now(),
    addedMods: [],
    removedMods: [],
    modifiedConfigs: [],
    lastSyncedVersion: originalVersion,
    hasUpstreamUpdate: false,
  }
}

export function mergeForkWithUpstream(
  fork: ModpackForkInfo,
  upstreamDiff: ModpackDiff,
  forkAddedMods: string[],
  forkRemovedMods: string[]
): ModpackForkMergeResult {
  const conflicts: ModpackForkConflict[] = []
  let autoResolved = 0

  for (const mod of upstreamDiff.removed) {
    const modKey = mod.projectId ? `${mod.projectId}` : mod.fileName
    if (forkAddedMods.includes(modKey)) {
      conflicts.push({
        modFileName: mod.fileName,
        conflictType: 'mod_removed_upstream',
        upstreamAction: '已从上游移除',
        forkAction: '用户已添加',
        resolution: 'keep_fork',
      })
    } else {
      autoResolved++
    }
  }

  for (const mod of upstreamDiff.added) {
    const modKey = mod.projectId ? `${mod.projectId}` : mod.fileName
    if (forkRemovedMods.includes(modKey)) {
      conflicts.push({
        modFileName: mod.fileName,
        conflictType: 'mod_added_upstream',
        upstreamAction: '上游新增',
        forkAction: '用户已移除',
        resolution: 'keep_fork',
      })
    } else {
      autoResolved++
    }
  }

  for (const mod of upstreamDiff.updated) {
    autoResolved++
  }

  return {
    success: conflicts.length === 0,
    conflicts,
    autoResolved,
    manualRequired: conflicts.filter(c => !c.resolution).length,
  }
}

export function checkUpstreamUpdate(
  fork: ModpackForkInfo,
  currentUpstreamVersion: string
): { hasUpdate: boolean; newVersion: string; changes: string } {
  if (currentUpstreamVersion !== fork.lastSyncedVersion) {
    return { hasUpdate: true, newVersion: currentUpstreamVersion, changes: `上游已从 ${fork.lastSyncedVersion} 更新到 ${currentUpstreamVersion}` }
  }
  return { hasUpdate: false, newVersion: fork.lastSyncedVersion, changes: '' }
}
