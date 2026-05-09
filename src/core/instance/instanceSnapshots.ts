import type { InstanceSnapshot } from '../../types/instance'

export async function createSnapshot(
  dataDir: string,
  instanceId: string,
  name: string,
  description: string,
  instanceDir?: string,
  gameVersion?: string,
  modLoader?: string,
  modLoaderVersion?: string,
  settings?: Record<string, any>
): Promise<InstanceSnapshot> {
  return await window.minecraftAPI.createInstanceSnapshot(instanceId, name, description) as InstanceSnapshot
}

export async function getSnapshots(dataDir: string, instanceId: string): Promise<InstanceSnapshot[]> {
  return await window.minecraftAPI.listInstanceSnapshots(instanceId) as InstanceSnapshot[]
}

export async function getSnapshotById(dataDir: string, instanceId: string, snapshotId: string): Promise<InstanceSnapshot | null> {
  const snapshots = await getSnapshots(dataDir, instanceId)
  return snapshots.find(s => s.id === snapshotId) || null
}

export async function deleteSnapshot(dataDir: string, instanceId: string, snapshotId: string): Promise<boolean> {
  return await window.minecraftAPI.deleteInstanceSnapshot(instanceId, snapshotId)
}

export async function rollbackToSnapshot(
  dataDir: string,
  instanceId: string,
  snapshotId: string,
  instanceDir?: string
): Promise<{ success: boolean; message: string }> {
  return await window.minecraftAPI.rollbackInstanceSnapshot(instanceId, snapshotId) as { success: boolean; message: string }
}
