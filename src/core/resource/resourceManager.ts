import { modrinthAPI } from '../../api/modrinth'
import { curseforgeAPI } from '../../api/curseforge'
import type {
  ResourcePack, ShaderPackEnhanced, Datapack, StructureFile,
  GlobalResourceIndex, ResourceSearchResult, ResourceType, ContentSource,
  ShaderPerformanceTier, CollectionItem, CollectionItemType,
} from '../../types/resource'
import {
  KNOWN_SHADER_PACKS, SHADER_PERFORMANCE_PROFILES, RESOURCE_TYPE_LABELS,
} from '../../types/resource'
import type { ModInfo, ModSearchOptions, ModSearchResult, ModFile, ModLoaderType } from '../../types/mod'

export class ResourceManager {
  private static instance: ResourceManager
  private indexCache: GlobalResourceIndex[] = []
  private indexLastBuilt: number = 0
  private readonly INDEX_TTL = 300000
  private searchCache = new Map<string, { result: ResourceSearchResult; timestamp: number }>()
  private readonly SEARCH_CACHE_TTL = 60000

  private constructor() {}

  static getInstance(): ResourceManager {
    if (!ResourceManager.instance) ResourceManager.instance = new ResourceManager()
    return ResourceManager.instance
  }

  // ===== #71 资源包管理 =====
  async scanResourcePacks(instanceId: string): Promise<ResourcePack[]> {
    return window.minecraftAPI.scanInstanceResourcePacks(instanceId)
  }

  async addResourcePack(instanceId: string, sourcePath: string): Promise<boolean> {
    return window.minecraftAPI.addResourcePack(instanceId, sourcePath)
  }

  async toggleResourcePack(instanceId: string, resourcePackPath: string, enabled: boolean): Promise<boolean> {
    return window.minecraftAPI.toggleResourcePack(instanceId, resourcePackPath, enabled)
  }

  async deleteResourcePack(instanceId: string, resourcePackPath: string): Promise<boolean> {
    return window.minecraftAPI.deleteResourcePack(instanceId, resourcePackPath)
  }

  async reorderResourcePacks(instanceId: string, resourcePackIds: string[]): Promise<any> {
    return window.minecraftAPI.reorderResourcePacks(instanceId, resourcePackIds)
  }

  async selectResourcePackFile(): Promise<string | null> {
    return window.minecraftAPI.selectResourcePackFile()
  }

  async searchResourcePacks(options: {
    query?: string
    gameVersion?: string
    sortBy?: 'relevance' | 'downloads' | 'updated'
    offset?: number
    limit?: number
  }): Promise<ModSearchResult> {
    const searchOptions: ModSearchOptions = {
      ...options,
      sources: ['modrinth', 'curseforge'],
    }
    const modrinthPromise = this.searchModrinthResourcePacks(searchOptions).catch(() => ({
      mods: [], total: 0, offset: 0, limit: 0,
      sources: { modrinth: { total: 0, latency: 0 }, curseforge: { total: 0, latency: 0 } },
      searchTime: 0,
    }))
    const curseforgePromise = this.searchCurseForgeResourcePacks(searchOptions).catch(() => ({
      mods: [], total: 0, offset: 0, limit: 0,
      sources: { modrinth: { total: 0, latency: 0 }, curseforge: { total: 0, latency: 0 } },
      searchTime: 0,
    }))
    const [modrinthResult, curseforgeResult] = await Promise.all([modrinthPromise, curseforgePromise])
    const allMods = [...modrinthResult.mods, ...curseforgeResult.mods]
    const deduped = this.deduplicateResults(allMods)
    return {
      mods: deduped.slice(0, options.limit || 20),
      total: (modrinthResult.sources.modrinth?.total || 0) + (curseforgeResult.sources.curseforge?.total || 0),
      offset: options.offset || 0,
      limit: options.limit || 20,
      sources: {
        modrinth: modrinthResult.sources.modrinth || { total: 0, latency: 0 },
        curseforge: curseforgeResult.sources.curseforge || { total: 0, latency: 0 },
      },
      searchTime: Math.max(modrinthResult.searchTime, curseforgeResult.searchTime),
    }
  }

  private async searchModrinthResourcePacks(options: ModSearchOptions): Promise<ModSearchResult> {
    const start = Date.now()
    const facets: string[] = []
    if (options.gameVersion) facets.push(`["versions:${options.gameVersion}"]`)
    facets.push('["project_type:resourcepack"]')
    const params: Record<string, string | number> = {
      query: options.query || '',
      offset: options.offset || 0,
      limit: options.limit || 20,
      facets: `[${facets.join(',')}]`,
    }
    const sortMap: Record<string, string> = { relevance: 'relevance', downloads: 'downloads', updated: 'updated' }
    if (options.sortBy && sortMap[options.sortBy]) params.index = sortMap[options.sortBy]
    try {
      const response = await (modrinthAPI as any).client.get('/search', { params })
      const data = response.data
      const latency = Date.now() - start
      return {
        mods: data.hits.map((hit: any) => this.mapModrinthToModInfo(hit)),
        total: data.total_hits,
        offset: data.offset,
        limit: data.limit,
        sources: { modrinth: { total: data.total_hits, latency }, curseforge: { total: 0, latency: 0 } },
        searchTime: latency,
      }
    } catch {
      return {
        mods: [], total: 0, offset: 0, limit: 0,
        sources: { modrinth: { total: 0, latency: Date.now() - start }, curseforge: { total: 0, latency: 0 } },
        searchTime: Date.now() - start,
      }
    }
  }

  private async searchCurseForgeResourcePacks(options: ModSearchOptions): Promise<ModSearchResult> {
    const start = Date.now()
    try {
      const params: Record<string, any> = {
        gameId: 432,
        classId: 12,
        index: options.offset || 0,
        pageSize: options.limit || 20,
      }
      if (options.query) params.searchFilter = options.query
      if (options.gameVersion) params.gameVersion = options.gameVersion
      const response = await (curseforgeAPI as any).client.get('/mods/search', { params })
      const data = response.data.data || []
      const latency = Date.now() - start
      return {
        mods: data.map((mod: any) => this.mapCurseForgeToModInfo(mod)),
        total: response.data.pagination?.totalCount || data.length,
        offset: options.offset || 0,
        limit: options.limit || 20,
        sources: { curseforge: { total: response.data.pagination?.totalCount || data.length, latency }, modrinth: { total: 0, latency: 0 } },
        searchTime: latency,
      }
    } catch {
      return {
        mods: [], total: 0, offset: 0, limit: 0,
        sources: { curseforge: { total: 0, latency: Date.now() - start }, modrinth: { total: 0, latency: 0 } },
        searchTime: Date.now() - start,
      }
    }
  }

  private mapModrinthToModInfo(project: any): ModInfo {
    return {
      id: project.slug,
      name: project.title,
      description: project.description,
      version: project.versions?.[0] || 'unknown',
      authors: project.team ? [project.team] : [],
      license: project.license?.id,
      iconUrl: project.icon_url,
      projectUrl: `https://modrinth.com/resourcepack/${project.slug}`,
      gameVersions: project.game_versions || [],
      modLoader: 'unknown',
      dependencies: [],
      downloads: project.downloads,
      source: 'modrinth',
      sourceId: project.id,
      categories: project.categories || [],
    }
  }

  private mapCurseForgeToModInfo(mod: any): ModInfo {
    return {
      id: String(mod.id),
      name: mod.name || 'Unknown',
      description: mod.summary || '',
      version: mod.latestFilesIndexes?.[0]?.gameVersion || 'unknown',
      authors: mod.authors?.map((a: any) => a.name) || [],
      iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url,
      projectUrl: mod.links?.websiteUrl,
      gameVersions: mod.latestFilesIndexes?.map((f: any) => f.gameVersion).filter(Boolean) || [],
      modLoader: 'unknown',
      dependencies: [],
      downloads: mod.downloadCount,
      source: 'curseforge',
      sourceId: String(mod.id),
      categories: mod.categories?.map((c: any) => c.name || c.slug) || [],
    }
  }

  // ===== #72 光影包一站式体验 =====
  async scanShaderPacks(instanceId: string): Promise<ShaderPackEnhanced[]> {
    const rawShaders = await window.minecraftAPI.scanInstanceShaders(instanceId)
    return rawShaders.map(s => this.enhanceShaderPack(s))
  }

  enhanceShaderPack(shader: any): ShaderPackEnhanced {
    const enhanced: ShaderPackEnhanced = { ...shader }
    const idNorm = shader.name?.toLowerCase().replace(/[\s_-]/g, '').replace(/shaders?$/i, '') || ''
    for (const [key, info] of Object.entries(KNOWN_SHADER_PACKS)) {
      const keyNorm = key.replace(/[\s_-]/g, '')
      if (idNorm.includes(keyNorm) || keyNorm.includes(idNorm) || shader.fileName?.toLowerCase().includes(key)) {
        enhanced.performanceTier = info.performanceTier
        enhanced.compatibleRenderers = info.renderers
        enhanced.description = info.description
        enhanced.author = info.author
        enhanced.name = info.name
        break
      }
    }
    if (!enhanced.performanceTier) {
      enhanced.performanceTier = 'medium'
    }
    if (!enhanced.compatibleRenderers) {
      enhanced.compatibleRenderers = ['optifine', 'iris']
    }
    enhanced.configPresets = ['low', 'medium', 'high', 'ultra']
    return enhanced
  }

  async searchShaderPacks(options: {
    query?: string
    gameVersion?: string
    sortBy?: 'relevance' | 'downloads' | 'updated'
    offset?: number
    limit?: number
  }): Promise<ModSearchResult> {
    const modrinthPromise = this.searchModrinthShaderPacks(options).catch(() => ({
      mods: [], total: 0, offset: 0, limit: 0,
      sources: { modrinth: { total: 0, latency: 0 }, curseforge: { total: 0, latency: 0 } },
      searchTime: 0,
    }))
    const curseforgePromise = this.searchCurseForgeShaderPacks(options).catch(() => ({
      mods: [], total: 0, offset: 0, limit: 0,
      sources: { modrinth: { total: 0, latency: 0 }, curseforge: { total: 0, latency: 0 } },
      searchTime: 0,
    }))
    const [modrinthResult, curseforgeResult] = await Promise.all([modrinthPromise, curseforgePromise])
    const allMods = [...modrinthResult.mods, ...curseforgeResult.mods]
    const deduped = this.deduplicateResults(allMods)
    for (const mod of deduped) {
      const idNorm = mod.id.toLowerCase().replace(/[\s_-]/g, '')
      for (const [key, info] of Object.entries(KNOWN_SHADER_PACKS)) {
        const keyNorm = key.replace(/[\s_-]/g, '')
        if (idNorm.includes(keyNorm) || keyNorm.includes(idNorm)) {
          mod.chineseName = info.name
          break
        }
      }
    }
    return {
      mods: deduped.slice(0, options.limit || 20),
      total: (modrinthResult.sources.modrinth?.total || 0) + (curseforgeResult.sources.curseforge?.total || 0),
      offset: options.offset || 0,
      limit: options.limit || 20,
      sources: {
        modrinth: modrinthResult.sources.modrinth || { total: 0, latency: 0 },
        curseforge: curseforgeResult.sources.curseforge || { total: 0, latency: 0 },
      },
      searchTime: Math.max(modrinthResult.searchTime, curseforgeResult.searchTime),
    }
  }

  private async searchModrinthShaderPacks(options: any): Promise<ModSearchResult> {
    const start = Date.now()
    const facets: string[] = []
    if (options.gameVersion) facets.push(`["versions:${options.gameVersion}"]`)
    facets.push('["project_type:shader"]')
    const params: Record<string, string | number> = {
      query: options.query || '',
      offset: options.offset || 0,
      limit: options.limit || 20,
      facets: `[${facets.join(',')}]`,
    }
    const sortMap: Record<string, string> = { relevance: 'relevance', downloads: 'downloads', updated: 'updated' }
    if (options.sortBy && sortMap[options.sortBy]) params.index = sortMap[options.sortBy]
    try {
      const response = await (modrinthAPI as any).client.get('/search', { params })
      const data = response.data
      const latency = Date.now() - start
      return {
        mods: data.hits.map((hit: any) => ({
          id: hit.slug, name: hit.title, description: hit.description,
          version: hit.versions?.[0] || 'unknown', authors: [], iconUrl: hit.icon_url,
          projectUrl: `https://modrinth.com/shader/${hit.slug}`,
          gameVersions: hit.game_versions || [], modLoader: 'unknown' as ModLoaderType,
          dependencies: [], downloads: hit.downloads, source: 'modrinth' as const,
          sourceId: hit.id, categories: hit.categories || [],
        })),
        total: data.total_hits, offset: data.offset, limit: data.limit,
        sources: { modrinth: { total: data.total_hits, latency }, curseforge: { total: 0, latency: 0 } },
        searchTime: latency,
      }
    } catch {
      return {
        mods: [], total: 0, offset: 0, limit: 0,
        sources: { modrinth: { total: 0, latency: Date.now() - start }, curseforge: { total: 0, latency: 0 } },
        searchTime: Date.now() - start,
      }
    }
  }

  private async searchCurseForgeShaderPacks(options: any): Promise<ModSearchResult> {
    const start = Date.now()
    try {
      const params: Record<string, any> = {
        gameId: 432, classId: 655, index: options.offset || 0, pageSize: options.limit || 20,
      }
      if (options.query) params.searchFilter = options.query
      if (options.gameVersion) params.gameVersion = options.gameVersion
      const response = await (curseforgeAPI as any).client.get('/mods/search', { params })
      const data = response.data.data || []
      const latency = Date.now() - start
      return {
        mods: data.map((mod: any) => ({
          id: String(mod.id), name: mod.name || 'Unknown', description: mod.summary || '',
          version: 'unknown', authors: mod.authors?.map((a: any) => a.name) || [],
          iconUrl: mod.logo?.thumbnailUrl || mod.logo?.url,
          projectUrl: mod.links?.websiteUrl,
          gameVersions: [], modLoader: 'unknown' as ModLoaderType, dependencies: [],
          downloads: mod.downloadCount, source: 'curseforge' as const,
          sourceId: String(mod.id), categories: mod.categories?.map((c: any) => c.name || c.slug) || [],
        })),
        total: response.data.pagination?.totalCount || data.length,
        offset: options.offset || 0, limit: options.limit || 20,
        sources: { curseforge: { total: response.data.pagination?.totalCount || data.length, latency }, modrinth: { total: 0, latency: 0 } },
        searchTime: latency,
      }
    } catch {
      return {
        mods: [], total: 0, offset: 0, limit: 0,
        sources: { curseforge: { total: 0, latency: Date.now() - start }, modrinth: { total: 0, latency: 0 } },
        searchTime: Date.now() - start,
      }
    }
  }

  getShaderPerformanceProfile(tier: ShaderPerformanceTier) {
    return SHADER_PERFORMANCE_PROFILES[tier]
  }

  // ===== #73 资源创作工坊 =====
  async createTextureProject(name: string, description: string, packFormat: number): Promise<any> {
    return window.minecraftAPI.createTextureProject(name, description, packFormat)
  }

  async saveTextureProject(project: any): Promise<boolean> {
    return window.minecraftAPI.saveTextureProject(project)
  }

  async exportTextureProject(projectId: string): Promise<string | null> {
    return window.minecraftAPI.exportTextureProject(projectId)
  }

  async getTextureProjects(): Promise<any[]> {
    return window.minecraftAPI.getTextureProjects()
  }

  // ===== #74 内容更新订阅 =====
  async getSubscriptions(): Promise<any[]> {
    return window.minecraftAPI.getResourceSubscriptions()
  }

  async addSubscription(sub: any): Promise<any> {
    return window.minecraftAPI.addResourceSubscription(sub)
  }

  async removeSubscription(subId: string): Promise<boolean> {
    return window.minecraftAPI.removeResourceSubscription(subId)
  }

  async checkSubscriptionUpdates(): Promise<any[]> {
    return window.minecraftAPI.checkResourceSubscriptionUpdates()
  }

  async getSubscriptionNotifications(): Promise<any[]> {
    return window.minecraftAPI.getResourceSubscriptionNotifications()
  }

  async markNotificationRead(notifId: string): Promise<boolean> {
    return window.minecraftAPI.markResourceNotificationRead(notifId)
  }

  // ===== #75 内容合集 =====
  async getCollections(): Promise<any[]> {
    return window.minecraftAPI.getResourceCollections()
  }

  async createCollection(collection: any): Promise<any> {
    return window.minecraftAPI.createResourceCollection(collection)
  }

  async updateCollection(collectionId: string, updates: any): Promise<any> {
    return window.minecraftAPI.updateResourceCollection(collectionId, updates)
  }

  async deleteCollection(collectionId: string): Promise<boolean> {
    return window.minecraftAPI.deleteResourceCollection(collectionId)
  }

  async installCollection(collectionId: string, instanceId: string): Promise<any> {
    return window.minecraftAPI.installResourceCollection(collectionId, instanceId)
  }

  // ===== #76 数据包管理 =====
  async scanDatapacks(instanceId: string, worldName?: string): Promise<Datapack[]> {
    return window.minecraftAPI.scanInstanceDatapacks(instanceId, worldName)
  }

  async toggleDatapack(instanceId: string, datapackPath: string, enabled: boolean, worldName?: string): Promise<boolean> {
    return window.minecraftAPI.toggleInstanceDatapack(instanceId, datapackPath, enabled, worldName)
  }

  async deleteDatapack(instanceId: string, datapackPath: string, worldName?: string): Promise<boolean> {
    return window.minecraftAPI.deleteInstanceDatapack(instanceId, datapackPath, worldName)
  }

  async addDatapack(instanceId: string, sourcePath: string, worldName?: string): Promise<boolean> {
    return window.minecraftAPI.addInstanceDatapack(instanceId, sourcePath, worldName)
  }

  async selectDatapackFile(): Promise<string | null> {
    return window.minecraftAPI.selectDatapackFile()
  }

  // ===== #77 存档结构文件管理 =====
  async scanStructures(instanceId: string): Promise<StructureFile[]> {
    return window.minecraftAPI.scanInstanceStructures(instanceId)
  }

  async importStructure(instanceId: string, sourcePath: string): Promise<boolean> {
    return window.minecraftAPI.importInstanceStructure(instanceId, sourcePath)
  }

  async exportStructure(instanceId: string, structureId: string, targetPath: string): Promise<boolean> {
    return window.minecraftAPI.exportInstanceStructure(instanceId, structureId, targetPath)
  }

  async deleteStructure(instanceId: string, structurePath: string): Promise<boolean> {
    return window.minecraftAPI.deleteInstanceStructure(instanceId, structurePath)
  }

  async getStructurePreview(instanceId: string, structurePath: string): Promise<any> {
    return window.minecraftAPI.getStructurePreview(instanceId, structurePath)
  }

  async selectStructureFile(): Promise<string | null> {
    return window.minecraftAPI.selectStructureFile()
  }

  // ===== #78 全局资源索引 =====
  async buildGlobalIndex(): Promise<GlobalResourceIndex[]> {
    const now = Date.now()
    if (this.indexCache.length > 0 && now - this.indexLastBuilt < this.INDEX_TTL) {
      return this.indexCache
    }
    const index = await window.minecraftAPI.buildGlobalResourceIndex()
    this.indexCache = index
    this.indexLastBuilt = now
    return index
  }

  async searchGlobalResources(query: string, filters?: {
    types?: ResourceType[]
    instanceId?: string
    limit?: number
  }): Promise<ResourceSearchResult> {
    const cacheKey = `${query}:${JSON.stringify(filters || {})}`
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.SEARCH_CACHE_TTL) return cached.result

    const start = Date.now()
    const index = await this.buildGlobalIndex()
    let results = index

    if (filters?.types && filters.types.length > 0) {
      results = results.filter(r => filters.types!.includes(r.type))
    }
    if (filters?.instanceId) {
      results = results.filter(r => r.instanceId === filters.instanceId)
    }
    if (query.trim()) {
      const q = query.toLowerCase()
      results = results.filter(r =>
        r.name.toLowerCase().includes(q) ||
        r.fileName.toLowerCase().includes(q) ||
        r.tags.some(t => t.toLowerCase().includes(q))
      )
    }

    const facets: Record<ResourceType, number> = {
      resourcepack: 0, shader: 0, datapack: 0, structure: 0, mod: 0, world: 0,
    }
    for (const r of results) facets[r.type]++

    const searchResult: ResourceSearchResult = {
      items: results.slice(0, filters?.limit || 50),
      total: results.length,
      query,
      searchTime: Date.now() - start,
      facets,
    }

    this.searchCache.set(cacheKey, { result: searchResult, timestamp: Date.now() })
    return searchResult
  }

  async getResourceLocation(resourceId: string): Promise<GlobalResourceIndex | null> {
    const index = await this.buildGlobalIndex()
    return index.find(r => r.id === resourceId) || null
  }

  invalidateIndex() {
    this.indexCache = []
    this.indexLastBuilt = 0
    this.searchCache.clear()
  }

  // ===== Helpers =====
  private deduplicateResults(mods: ModInfo[]): ModInfo[] {
    const seen = new Map<string, ModInfo>()
    for (const mod of mods) {
      const keys = [mod.id.toLowerCase(), mod.id.toLowerCase().replace(/-/g, '')]
      let found = false
      for (const key of keys) {
        if (seen.has(key)) {
          const existing = seen.get(key)!
          if ((mod.downloads || 0) > (existing.downloads || 0)) seen.set(key, mod)
          found = true
          break
        }
      }
      if (!found) seen.set(mod.id.toLowerCase(), mod)
    }
    return Array.from(seen.values())
  }
}

export const resourceManager = ResourceManager.getInstance()
