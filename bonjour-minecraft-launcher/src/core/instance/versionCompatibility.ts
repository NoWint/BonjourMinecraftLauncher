import type { VersionCompatibilityCard, VersionDiff } from '../../types/instance'

export async function getCompatibilityCard(version: string): Promise<VersionCompatibilityCard> {
  return await window.minecraftAPI.getVersionCompatibility(version) as VersionCompatibilityCard
}

export async function batchGetCompatibilityCards(versions: string[]): Promise<VersionCompatibilityCard[]> {
  return await window.minecraftAPI.batchGetVersionCompatibilities(versions) as VersionCompatibilityCard[]
}

export async function getVersionDiff(fromVersion: string, toVersion: string): Promise<VersionDiff | null> {
  try {
    return await window.minecraftAPI.getVersionDiff(fromVersion, toVersion) as VersionDiff
  } catch {
    return null
  }
}
