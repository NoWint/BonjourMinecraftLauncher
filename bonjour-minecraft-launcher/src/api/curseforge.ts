import { invoke } from '@tauri-apps/api/core'
import type { ModInfo, ModSearchOptions, ModSearchResult, ModFile, ModLoaderType } from '../types/mod'

const LOADER_MAP: Record<string, number> = {
  forge: 1,
  fabric: 4,
  quilt: 5,
  neoforge: 6,
}

const SORT_MAP: Record<string, string> = {
  relevance: '2',
  downloads: '6',
  updated: '3',
  newest: '1',
}

export class CurseForgeAPI {
  async searchMods(options: ModSearchOptions): Promise<ModSearchResult> {
    const start = Date.now()
    try {
      const params: Record<string, any> = {
        gameId: 432,
        classId: 6,
        index: options.offset || 0,
        pageSize: options.limit || 20,
        sortField: SORT_MAP[options.sortBy || 'relevance'] || '2',
      }

      if (options.query) params.searchFilter = options.query

      const modLoaderIds: number[] = []
      if (options.modLoader && LOADER_MAP[options.modLoader]) {
        modLoaderIds.push(LOADER_MAP[options.modLoader])
      }

      if (options.gameVersion) params.gameVersion = options.gameVersion
      if (modLoaderIds.length > 0) params.modLoaderType = modLoaderIds[0]

      const data = await invoke<any>('curseforge_search', { params })

      const mods = (data.data || []).map((mod: any) => this.mapToModInfo(mod))
      const latency = Date.now() - start
      const total = data.pagination?.totalCount || mods.length

      return {
        mods,
        total,
        offset: options.offset || 0,
        limit: options.limit || 20,
        sources: {
          curseforge: { total, latency },
          modrinth: { total: 0, latency: 0 },
        },
        searchTime: latency,
      }
    } catch (error: any) {
      const latency = Date.now() - start
      console.warn('CurseForge search failed:', error.message)
      return {
        mods: [],
        total: 0,
        offset: 0,
        limit: 0,
        sources: { curseforge: { total: 0, latency }, modrinth: { total: 0, latency: 0 } },
        searchTime: latency,
      }
    }
  }

  async getModDetails(modId: string): Promise<ModInfo> {
    const data = await invoke<any>('curseforge_get_mod_details', { mod_id: modId })
    return this.mapToModInfo(data)
  }

  async getModVersions(modId: string, gameVersion?: string, loader?: ModLoaderType): Promise<ModFile[]> {
    try {
      const params: Record<string, any> = {}
      if (gameVersion) params.gameVersion = gameVersion
      if (loader && LOADER_MAP[loader]) params.modLoaderType = LOADER_MAP[loader]

      const data = await invoke<any[]>('curseforge_get_mod_files', { mod_id: modId, params })
      return (data || []).map((f: any) => this.mapToModFile(f, modId))
    } catch {
      return []
    }
  }

  async getFingerprintMatches(fingerprints: number[]): Promise<any[]> {
    try {
      return await invoke<any[]>('curseforge_fingerprint_matches', { fingerprints })
    } catch {
      return []
    }
  }

  private mapToModInfo(mod: any): ModInfo {
    const latestFiles = mod.latestFilesIndexes || mod.latestFiles || []
    let modLoader: ModLoaderType = 'unknown'

    if (mod.categories) {
      for (const cat of mod.categories) {
        const name = (cat.name || cat.slug || '').toLowerCase()
        if (name.includes('forge') && !name.includes('neo')) { modLoader = 'forge'; break }
        if (name.includes('fabric')) { modLoader = 'fabric'; break }
        if (name.includes('quilt')) { modLoader = 'quilt'; break }
        if (name.includes('neoforge')) { modLoader = 'neoforge'; break }
      }
    }

    const latestFile = latestFiles[0]
    const primaryFile = mod.latestFiles?.[0]

    return {
      id: String(mod.id),
      name: mod.name || 'Unknown',
      description: mod.summary || '',
      version: latestFile?.gameVersion || primaryFile?.displayName || 'unknown',
      authors: mod.authors?.map((a: any) => a.name) || [],
      license: mod.license?.name,
      iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url,
      projectUrl: mod.links?.websiteUrl,
      gameVersions: latestFiles.map((f: any) => f.gameVersion).filter(Boolean) || [],
      modLoader,
      dependencies: [],
      downloads: mod.downloadCount,
      source: 'curseforge',
      sourceId: String(mod.id),
      categories: mod.categories?.map((c: any) => c.name || c.slug) || [],
    }
  }

  private mapToModFile(file: any, modId: string): ModFile {
    return {
      id: String(file.id),
      version: file.displayName || file.fileName,
      gameVersions: file.gameVersions || [],
      modLoader: 'unknown',
      downloadUrl: file.downloadUrl,
      fileSize: file.fileLength || 0,
      releaseType: file.releaseType === 1 ? 'release' : file.releaseType === 2 ? 'beta' : 'alpha',
      uploadDate: file.fileDate,
      downloads: file.downloadCount || 0,
      changelog: file.changelog?.text,
      dependencies: file.dependencies?.map((d: any) => ({
        modId: String(d.modId),
        name: String(d.modId),
        required: d.relationType === 3,
      })),
      parentProjectId: modId,
    }
  }
}

export const curseforgeAPI = new CurseForgeAPI()
