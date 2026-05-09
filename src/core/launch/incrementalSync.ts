import type { IncrementalSyncResult } from '../../types/launch'

export async function verifyLocalFile(
  filePath: string,
  expectedHash?: string,
  expectedSize?: number
): Promise<'ok' | 'missing' | 'corrupted' | 'size_mismatch'> {
  const result = await window.minecraftAPI.verifyLocalFile(filePath, expectedHash, expectedSize) as { status: string }
  return result.status as 'ok' | 'missing' | 'corrupted' | 'size_mismatch'
}

export async function incrementalSync(
  gameDir: string,
  versionJson: any,
  onProgress?: (info: { phase: string; current: number; total: number; file: string }) => void,
  concurrency: number = 8
): Promise<IncrementalSyncResult> {
  return await window.minecraftAPI.incrementalSync(gameDir, versionJson, concurrency) as IncrementalSyncResult
}

export async function repairVersion(
  gameDir: string,
  versionId: string,
  onProgress?: (info: { phase: string; current: number; total: number; file: string }) => void
): Promise<IncrementalSyncResult> {
  return await window.minecraftAPI.repairVersionFiles(versionId) as IncrementalSyncResult
}
