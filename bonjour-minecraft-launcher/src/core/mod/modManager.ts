import { modrinthAPI } from '../../api/modrinth'
import { curseforgeAPI } from '../../api/curseforge'
import type {
  ModInfo, LocalMod, ModSearchOptions, ModSearchResult, ModDependency,
  ModConflict, ModFile, ModLoaderType, BatchInstallTask, ModRecommendation,
  ModPlayStyle, ModUpdateInfo, ModUpdateStrategy, PerformanceImpact,
  ModJarMetadata, ModShareCard, ConfigMigration, ConfigChange,
  ModAssociation, ModVersionDiff, ModRating, SourceSearchInfo, PerformanceDetail,
} from '../../types/mod'
import {
  MOD_CHINESE_NAMES as CN_NAMES, MOD_PERFORMANCE_RATINGS as PERF_RATINGS,
  MOD_PERFORMANCE_DETAILS as PERF_DETAILS, MOD_RATINGS as RATINGS,
  MOD_ASSOCIATIONS as ASSOCIATIONS, CHINESE_COMMUNITY_TAGS as CN_TAGS,
  KNOWN_MOD_CONFLICTS as CONFLICTS, KNOWN_CLASS_CONFLICTS as CLASS_CONFLICTS,
  KNOWN_MIXIN_CONFLICTS as MIXIN_CONFLICTS, PLAY_STYLE_CONFIG,
  PERFORMANCE_LABELS, LOADER_CONFIG,
} from '../../types/mod'

export class ModManager {
  private static instance: ModManager
  private batchQueue: BatchInstallTask[] = []
  private batchRunning = false
  private searchCache = new Map<string, { result: ModSearchResult; timestamp: number }>()
  private readonly CACHE_TTL = 60000

  private constructor() {}

  static getInstance(): ModManager {
    if (!ModManager.instance) ModManager.instance = new ModManager()
    return ModManager.instance
  }

  // ===== #41 全局模组搜索引擎 =====
  async searchMods(options: ModSearchOptions): Promise<ModSearchResult> {
    const cacheKey = JSON.stringify(options)
    const cached = this.searchCache.get(cacheKey)
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) return cached.result

    try {
      const rustResult = await window.minecraftAPI.searchModsGlobal(
        options.query || '',
        options.gameVersion,
        options.modLoader,
        options.category,
        options.sortBy,
        options.limit,
        options.offset,
      )
      if (rustResult && rustResult.mods && rustResult.mods.length > 0) {
        const mods: ModInfo[] = rustResult.mods.map((m: any) => this.rustSearchItemToModInfo(m))
        mods.forEach(m => this.enrichModInfo(m))
        const result: ModSearchResult = {
          mods,
          total: rustResult.total,
          offset: options.offset || 0,
          limit: options.limit || 20,
          sources: {
            modrinth: { total: rustResult.sources?.modrinth?.total || 0, latency: rustResult.sources?.modrinth?.latencyMs || 0, error: rustResult.sources?.modrinth?.error },
            curseforge: { total: rustResult.sources?.curseforge?.total || 0, latency: rustResult.sources?.curseforge?.latencyMs || 0, error: rustResult.sources?.curseforge?.error },
          },
          searchTime: rustResult.searchTimeMs || 0,
        }
        this.searchCache.set(cacheKey, { result, timestamp: Date.now() })
        return result
      }
    } catch {}

    const startTime = Date.now()
    const sources = options.sources || ['modrinth', 'curseforge']
    const promises: Promise<{ mods: ModInfo[]; info: SourceSearchInfo }>[] = []

    if (sources.includes('modrinth')) {
      promises.push(modrinthAPI.searchMods(options)
        .then(r => ({ mods: r.mods, info: r.sources.modrinth }))
        .catch((e: any) => ({ mods: [], info: { total: 0, latency: 0, error: e.message } })))
    }
    if (sources.includes('curseforge')) {
      promises.push(curseforgeAPI.searchMods(options)
        .then(r => ({ mods: r.mods, info: r.sources.curseforge }))
        .catch((e: any) => ({ mods: [], info: { total: 0, latency: 0, error: e.message } })))
    }

    const results = await Promise.all(promises)
    const allMods: ModInfo[] = []
    let modrinthInfo: SourceSearchInfo = { total: 0, latency: 0 }
    let curseforgeInfo: SourceSearchInfo = { total: 0, latency: 0 }

    for (const result of results) {
      for (const mod of result.mods) {
        this.enrichModInfo(mod)
      }
      allMods.push(...result.mods)
      if (result.info.latency > 0 && !result.info.error) {
        if (modrinthInfo.latency === 0) modrinthInfo = result.info
        else curseforgeInfo = result.info
      }
    }

    const deduped = this.deduplicateMods(allMods)
    deduped.sort((a, b) => {
      const aScore = this.computeSearchScore(a, options.query)
      const bScore = this.computeSearchScore(b, options.query)
      return bScore - aScore
    })

    const searchTime = Date.now() - startTime
    const result: ModSearchResult = {
      mods: deduped.slice(0, options.limit || 20),
      total: modrinthInfo.total + curseforgeInfo.total,
      offset: options.offset || 0,
      limit: options.limit || 20,
      sources: { modrinth: modrinthInfo, curseforge: curseforgeInfo },
      searchTime,
    }

    this.searchCache.set(cacheKey, { result, timestamp: Date.now() })
    return result
  }

  private rustSearchItemToModInfo(item: any): ModInfo {
    return {
      id: item.id || '',
      name: item.name || '',
      description: item.description || '',
      version: '',
      authors: item.authors || [],
      iconUrl: item.iconUrl || item.icon_url,
      gameVersions: item.gameVersions || item.game_versions || [],
      modLoader: (item.modLoader || item.mod_loader || 'unknown') as ModLoaderType,
      dependencies: [],
      source: item.source || 'modrinth',
      sourceId: item.sourceId || item.source_id || item.id,
      downloads: item.downloads,
      projectUrl: item.projectUrl || item.project_url,
      categories: item.categories || [],
      lastUpdated: item.lastUpdated || item.last_updated,
    }
  }

  private enrichModInfo(mod: ModInfo) {
    const idNorm = mod.id.replace(/-/g, '')
    mod.chineseName = CN_NAMES[mod.id] || CN_NAMES[idNorm] || undefined
    mod.performanceImpact = PERF_RATINGS[mod.id] || PERF_RATINGS[idNorm] || undefined
    mod.performanceDetail = PERF_DETAILS[mod.id] || PERF_DETAILS[idNorm] || undefined
    mod.rating = RATINGS[mod.id] || RATINGS[idNorm] || undefined
    mod.chineseTags = this.inferChineseTags(mod)
    mod.lastUpdated = mod.lastUpdated || undefined
  }

  private computeSearchScore(mod: ModInfo, query?: string): number {
    let score = 0
    const downloads = mod.downloads || 0
    score += Math.log10(downloads + 1) * 2
    if (mod.rating) score += mod.rating.score * 5
    if (query) {
      const q = query.toLowerCase()
      if (mod.name.toLowerCase().includes(q)) score += 50
      if (mod.chineseName?.toLowerCase().includes(q)) score += 60
      if (mod.description.toLowerCase().includes(q)) score += 10
      if (mod.chineseTags?.some(t => t.includes(q))) score += 30
    }
    if (mod.performanceImpact === 'none') score += 3
    if (mod.performanceImpact === 'low') score += 1
    return score
  }

  private deduplicateMods(mods: ModInfo[]): ModInfo[] {
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

  private inferChineseTags(mod: ModInfo): string[] {
    const tags: string[] = []
    const idNorm = mod.id.replace(/-/g, '')
    const communityTags = CN_TAGS[mod.id] || CN_TAGS[idNorm]
    if (communityTags) return communityTags

    const cats = (mod.categories || []).map(c => c.toLowerCase())
    if (cats.some(c => c.includes('optimization') || c.includes('performance'))) tags.push('优化')
    if (cats.some(c => c.includes('technology') || c.includes('tech'))) tags.push('科技')
    if (cats.some(c => c.includes('magic'))) tags.push('魔法')
    if (cats.some(c => c.includes('adventure') || c.includes('worldgen'))) tags.push('冒险')
    if (cats.some(c => c.includes('decoration') || c.includes('building'))) tags.push('建筑')
    if (cats.some(c => c.includes('food') || c.includes('agriculture'))) tags.push('休闲')
    if (mod.performanceImpact === 'none' || mod.performanceImpact === 'low') tags.push('轻量')
    if (mod.performanceImpact === 'high') tags.push('吃配置')
    if (mod.downloads && mod.downloads > 1000000) tags.push('热门')
    if (mod.downloads && mod.downloads > 10000000) tags.push('必装')
    if (mod.rating && mod.rating.score >= 4.5) tags.push('稳定')
    return tags
  }

  // ===== #42 模组批量安装队列 =====
  addToBatchQueue(mods: ModInfo[]): BatchInstallTask[] {
    const tasks: BatchInstallTask[] = mods.map(mod => ({
      id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
      mod, status: 'pending' as const, progress: 0,
    }))
    this.batchQueue.push(...tasks)
    return tasks
  }

  async executeBatchInstall(
    modsDir: string, gameVersion: string, loader: ModLoaderType,
    onProgress?: (task: BatchInstallTask) => void
  ): Promise<BatchInstallTask[]> {
    if (this.batchRunning) return this.batchQueue
    this.batchRunning = true

    const conflicts = this.checkConflicts(this.batchQueue.map(t => t.mod))
    for (const conflict of conflicts) {
      if (conflict.severity === 'error') {
        const task = this.batchQueue.find(t =>
          t.mod.id === (conflict.modA as ModInfo).id || t.mod.id === (conflict.modB as ModInfo).id
        )
        if (task) { task.status = 'conflict'; task.error = conflict.reason }
      }
    }

    try {
      const rustTasks = []
      for (const task of this.batchQueue) {
        if (task.status === 'conflict') continue
        try {
          task.status = 'resolving'
          task.progress = 5
          onProgress?.(task)

          const versions = await this.getModVersions(
            task.mod.sourceId || task.mod.id, gameVersion, loader, task.mod.source
          )
          if (versions.length === 0) throw new Error('没有找到兼容的模组版本')
          const latestVersion = versions.find(v => v.releaseType === 'release') || versions[0]
          task.resolvedVersion = latestVersion

          if (latestVersion.dependencies && latestVersion.dependencies.length > 0) {
            const missingDeps = latestVersion.dependencies.filter(d => d.required)
            for (const dep of missingDeps) {
              try {
                const depVersions = await this.getModVersions(dep.modId, gameVersion, loader)
                if (depVersions.length > 0) {
                  const depVersion = depVersions.find(v => v.releaseType === 'release') || depVersions[0]
                  const depTask: BatchInstallTask = {
                    id: `dep-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
                    mod: { id: dep.modId, name: dep.name, description: '', version: depVersion.version,
                      authors: [], gameVersions: [], modLoader: loader, dependencies: [],
                      source: task.mod.source, sourceId: dep.modId },
                    status: 'pending', progress: 0, resolvedVersion: depVersion,
                  }
                  this.batchQueue.push(depTask)
                }
              } catch {}
            }
          }

          const targetPath = `${modsDir}/${task.mod.id}-${latestVersion.version}.jar`
          rustTasks.push({
            id: task.id,
            modId: task.mod.id,
            modName: task.mod.name,
            downloadUrl: latestVersion.downloadUrl,
            targetPath,
            fileName: `${task.mod.id}-${latestVersion.version}.jar`,
            expectedHash: (latestVersion.hashes as any)?.sha256,
            status: 'pending',
            progress: 0,
          })
        } catch (error: any) {
          task.status = 'error'
          task.error = error.message
          onProgress?.(task)
        }
      }

      if (rustTasks.length > 0) {
        try {
          const unlisten = await window.minecraftAPI.onBatchInstallProgress((data) => {
            const task = this.batchQueue.find(t => t.id === data.taskId)
            if (task) {
              task.status = data.status as any
              task.progress = data.progress
              onProgress?.(task)
            }
          })

          const results = await window.minecraftAPI.batchInstallMods(rustTasks)
          unlisten()

          for (const rustResult of results) {
            const task = this.batchQueue.find(t => t.id === rustResult.id)
            if (task) {
              task.status = rustResult.status as any
              task.progress = rustResult.progress
              task.error = rustResult.error
              onProgress?.(task)
            }
          }
        } catch {
          for (const task of this.batchQueue) {
            if (task.status !== 'conflict' && task.status !== 'error') {
              try {
                task.status = 'downloading'
                task.progress = 30
                onProgress?.(task)
                const targetPath = `${modsDir}/${task.mod.id}-${task.resolvedVersion?.version || 'unknown'}.jar`
                await window.minecraftAPI.downloadFile(task.resolvedVersion?.downloadUrl || '', targetPath)
                task.status = 'done'
                task.progress = 100
              } catch (error: any) {
                task.status = 'error'
                task.error = error.message
              }
              onProgress?.(task)
            }
          }
        }
      }
    } finally {
      this.batchRunning = false
    }

    return this.batchQueue
  }

  clearBatchQueue() { this.batchQueue = []; this.batchRunning = false }
  getBatchQueue(): BatchInstallTask[] { return this.batchQueue }

  // ===== #43 版本组合推荐 =====
  async getRecommendationsByPlayStyle(
    playStyle: ModPlayStyle, gameVersion: string, loader: ModLoaderType
  ): Promise<ModRecommendation> {
    const config = PLAY_STYLE_CONFIG[playStyle]
    const categoryMap: Record<ModPlayStyle, string[]> = {
      tech: ['technology', 'automation', 'energy', 'storage', 'redstone'],
      magic: ['magic', 'adventure', 'worldgen'],
      adventure: ['adventure', 'worldgen', 'mobs', 'dimensions'],
      building: ['decoration', 'building', 'worldgen', 'utility'],
      casual: ['food', 'agriculture', 'decoration', 'utility'],
      optimization: ['optimization', 'performance', 'utility'],
      utility: ['utility', 'information', 'map'],
      library: ['library', 'api'],
    }

    const categories = categoryMap[playStyle] || []
    const mods: ModInfo[] = []
    for (const category of categories.slice(0, 3)) {
      try {
        const search = await this.searchMods({ gameVersion, modLoader: loader, category, sortBy: 'downloads', limit: 8 })
        mods.push(...search.mods)
      } catch {}
    }

    const deduped = this.deduplicateMods(mods)
    const relatedMods: Record<string, ModInfo[]> = {}
    for (const mod of deduped.slice(0, 5)) {
      try {
        const rustAssocs = await window.minecraftAPI.getModAssociations(mod.id)
        if (rustAssocs && rustAssocs.length > 0) {
          relatedMods[mod.id] = rustAssocs.map((a: any) => ({
            id: a.modId, name: a.name || CN_NAMES[a.modId] || a.modId,
            description: `${a.coInstallPercentage || a.co_install_percentage}% 共装率`,
            version: '', authors: [], gameVersions: [], modLoader: loader,
            dependencies: [], source: 'modrinth' as const, sourceId: a.modId,
          }))
        } else {
          const associations = ASSOCIATIONS[mod.id] || ASSOCIATIONS[mod.id.replace(/-/g, '')]
          if (associations) {
            relatedMods[mod.id] = associations
              .filter(a => a.percentage >= 50)
              .map(a => ({ id: a.modId, name: CN_NAMES[a.modId] || a.modId, description: `${a.percentage}% 共装率`, version: '', authors: [], gameVersions: [], modLoader: loader, dependencies: [], source: 'modrinth' as const, sourceId: a.modId }))
          }
        }
      } catch {
        const associations = ASSOCIATIONS[mod.id] || ASSOCIATIONS[mod.id.replace(/-/g, '')]
        if (associations) {
          relatedMods[mod.id] = associations
            .filter(a => a.percentage >= 50)
            .map(a => ({ id: a.modId, name: CN_NAMES[a.modId] || a.modId, description: `${a.percentage}% 共装率`, version: '', authors: [], gameVersions: [], modLoader: loader, dependencies: [], source: 'modrinth' as const, sourceId: a.modId }))
        }
      }
    }

    return { playStyle, label: config.label, description: config.description, icon: config.icon, mods: deduped, relatedMods }
  }

  async getRecommendedMods(gameVersion: string, loader: ModLoaderType): Promise<ModInfo[]> {
    const categories = ['optimization', 'utility', 'library']
    const results: ModInfo[] = []
    for (const category of categories) {
      try {
        const search = await this.searchMods({ gameVersion, modLoader: loader, category, sortBy: 'downloads', limit: 5 })
        results.push(...search.mods)
      } catch {}
    }
    return this.deduplicateMods(results)
  }

  // ===== #44 实时冲突检测沙箱 =====
  async checkConflicts(mods: (ModInfo | LocalMod)[]): Promise<ModConflict[]> {
    try {
      const rustMods = mods.map(m => ({
        id: m.id,
        name: m.name,
        modLoader: m.modLoader,
        ...('metadata' in m && m.metadata ? { metadata: m.metadata } : {}),
      }))
      const rustConflicts = await window.minecraftAPI.checkModConflicts(rustMods)
      if (rustConflicts && rustConflicts.length >= 0) {
        return rustConflicts.map((c: any) => {
          const modA = mods.find(m => m.id === c.modAId || m.id === c.mod_a_id) || mods[0]
          const modB = mods.find(m => m.id === c.modBId || m.id === c.mod_b_id) || mods[1]
          return {
            modA: modA || c.modAName || c.mod_a_name,
            modB: modB || c.modBName || c.mod_b_name,
            reason: c.reason,
            severity: c.severity,
            type: c.conflictType || c.conflict_type,
            detail: c.detail,
            suggestion: c.suggestion,
          } as ModConflict
        })
      }
    } catch {}

    return this.checkConflictsFallback(mods)
  }

  private checkConflictsFallback(mods: (ModInfo | LocalMod)[]): ModConflict[] {
    const conflicts: ModConflict[] = []
    for (let i = 0; i < mods.length; i++) {
      for (let j = i + 1; j < mods.length; j++) {
        const a = mods[i], b = mods[j]

        if (a.id === b.id) {
          conflicts.push({ modA: a, modB: b, reason: `重复的模组 ID: ${a.id}`, severity: 'error', type: 'id-conflict', suggestion: '删除其中一个重复的模组' })
        }

        const aLoader = a.modLoader, bLoader = b.modLoader
        if (aLoader !== 'unknown' && bLoader !== 'unknown') {
          const loaderConflicts: [string, string][] = [['forge', 'fabric'], ['forge', 'quilt'], ['fabric', 'neoforge'], ['neoforge', 'quilt']]
          for (const [l1, l2] of loaderConflicts) {
            if ((aLoader === l1 && bLoader === l2) || (aLoader === l2 && bLoader === l1)) {
              conflicts.push({ modA: a, modB: b, reason: `${LOADER_CONFIG[l1].label} 和 ${LOADER_CONFIG[l2].label} 模组不能混用`, severity: 'error', type: 'loader-mismatch', detail: `${a.name} 是 ${LOADER_CONFIG[l1].label} 模组，${b.name} 是 ${LOADER_CONFIG[l2].label} 模组`, suggestion: `将它们分别放在不同的实例中` })
            }
          }
        }

        for (const [c1, c2, reason, conflictType] of CONFLICTS) {
          const aId = a.id.toLowerCase().replace(/-/g, '')
          const bId = b.id.toLowerCase().replace(/-/g, '')
          if ((aId.includes(c1) && bId.includes(c2)) || (aId.includes(c2) && bId.includes(c1))) {
            if (!conflicts.some(c => c.reason === reason)) {
              conflicts.push({ modA: a, modB: b, reason, severity: 'warning', type: conflictType, suggestion: '选择其中一个安装' })
            }
          }
        }
      }
    }

    const localMods = mods.filter(m => 'metadata' in m && m.metadata) as LocalMod[]
    for (let i = 0; i < localMods.length; i++) {
      for (let j = i + 1; j < localMods.length; j++) {
        const a = localMods[i], b = localMods[j]
        const aMeta = a.metadata!, bMeta = b.metadata!

        if (aMeta.classEntries && bMeta.classEntries) {
          for (const [cls1, cls2, reason] of CLASS_CONFLICTS) {
            const aHasClass = aMeta.classEntries.some(c => c.includes(cls1) || c.includes(cls2))
            const bHasClass = bMeta.classEntries.some(c => c.includes(cls1) || c.includes(cls2))
            if (aHasClass && bHasClass) {
              conflicts.push({ modA: a, modB: b, reason, severity: 'warning', type: 'class-conflict', detail: `检测到类加载冲突: ${cls1}`, suggestion: '选择其中一个安装或测试兼容性' })
            }
          }
        }

        if (aMeta.mixins && aMeta.mixins.length > 0 && bMeta.mixins && bMeta.mixins.length > 0) {
          for (const [m1, m2, reason] of MIXIN_CONFLICTS) {
            const aHasMixin = aMeta.mixins.some(m => m.toLowerCase().includes(m1.split('.')[1]?.replace('.json', '') || ''))
            const bHasMixin = bMeta.mixins.some(m => m.toLowerCase().includes(m2.split('.')[1]?.replace('.json', '') || ''))
            if (aHasMixin && bHasMixin) {
              conflicts.push({ modA: a, modB: b, reason, severity: 'warning', type: 'mixin-conflict', detail: `MixIn 冲突: ${m1} vs ${m2}`, suggestion: '选择其中一个安装' })
            }
          }
        }
      }
    }

    return conflicts
  }

  // ===== #45 模组更新策略控制 =====
  async checkModUpdates(localMods: LocalMod[], gameVersion: string, loader: ModLoaderType): Promise<ModUpdateInfo[]> {
    try {
      const rustMods = localMods.filter(m => m.isEnabled).map(m => ({
        id: m.id,
        modId: m.metadata?.modId || m.sourceId || m.id,
        name: m.name,
        version: m.version,
        source: m.source || 'modrinth',
        sourceId: m.sourceId || m.id,
        updateStrategy: m.updateStrategy || 'same-major',
      }))
      const rustUpdates = await window.minecraftAPI.checkModUpdatesRust(rustMods, gameVersion, loader)
      if (rustUpdates && rustUpdates.length >= 0) {
        return rustUpdates.map((u: any) => ({
          modId: u.modId || u.mod_id,
          modName: u.modName || u.mod_name,
          currentVersion: u.currentVersion || u.current_version,
          latestVersion: u.latestVersion || u.latest_version,
          updateStrategy: u.updateStrategy || u.update_strategy,
          isSafeUpdate: u.isSafeUpdate ?? u.is_safe_update ?? true,
          safetyLevel: u.safetyLevel || u.safety_level || 'safe',
          changelog: u.changelog,
          downloadUrl: u.downloadUrl || u.download_url,
          fileSize: u.fileSize || u.file_size,
          versionDiff: u.versionDiff || u.version_diff,
        }))
      }
    } catch {}

    const updates: ModUpdateInfo[] = []
    for (const mod of localMods) {
      if (!mod.isEnabled) continue
      try {
        const versions = await this.getModVersions(mod.sourceId || mod.id, gameVersion, loader, mod.source)
        if (versions.length === 0) continue
        const latestRelease = versions.find(v => v.releaseType === 'release') || versions[0]
        if (!latestRelease || latestRelease.version === mod.version) continue

        const strategy: ModUpdateStrategy = mod.updateStrategy || 'same-major'
        const isSafe = this.isUpdateSafe(mod.version, latestRelease.version, strategy)
        const versionDiff = this.computeVersionDiff(mod.version, latestRelease.version)
        const safetyLevel = this.computeSafetyLevel(versionDiff, strategy)

        updates.push({
          modId: mod.id, modName: mod.chineseName || mod.name,
          currentVersion: mod.version, latestVersion: latestRelease.version,
          updateStrategy: strategy, isSafeUpdate: isSafe, safetyLevel,
          changelog: latestRelease.changelog, downloadUrl: latestRelease.downloadUrl,
          fileSize: latestRelease.fileSize, versionDiff,
        })
      } catch {}
    }
    return updates
  }

  isUpdateSafe(currentVersion: string, newVersion: string, strategy: ModUpdateStrategy): boolean {
    if (strategy === 'latest') return true
    const diff = this.computeVersionDiff(currentVersion, newVersion)
    if (strategy === 'safe') return !diff.majorChanged && !diff.minorChanged && diff.patchChanged
    if (strategy === 'same-major') return !diff.majorChanged
    return true
  }

  private computeVersionDiff(current: string, target: string): ModVersionDiff {
    const curParts = current.replace(/^v/, '').split('.').map(p => parseInt(p) || 0)
    const newParts = target.replace(/^v/, '').split('.').map(p => parseInt(p) || 0)
    const majorChanged = curParts[0] !== newParts[0]
    const minorChanged = (curParts[1] || 0) !== (newParts[1] || 0)
    const patchChanged = (curParts[2] || 0) !== (newParts[2] || 0)
    const isDowngrade = (newParts[0] < curParts[0]) ||
      (newParts[0] === curParts[0] && (newParts[1] || 0) < (curParts[1] || 0))
    const distance = Math.abs((newParts[0] - curParts[0]) * 100 + ((newParts[1] || 0) - (curParts[1] || 0)) * 10 + ((newParts[2] || 0) - (curParts[2] || 0)))
    return { majorChanged, minorChanged, patchChanged, isDowngrade, distance }
  }

  private computeSafetyLevel(diff: ModVersionDiff, strategy: ModUpdateStrategy): 'safe' | 'caution' | 'risky' {
    if (diff.isDowngrade) return 'risky'
    if (diff.majorChanged) return 'risky'
    if (diff.minorChanged) return strategy === 'safe' ? 'caution' : 'safe'
    return 'safe'
  }

  // ===== #46 模组社区评价聚合 =====
  async getAggregatedRating(modId: string): Promise<ModRating | undefined> {
    try {
      const rustRatings = await window.minecraftAPI.aggregateModRatings([modId])
      if (rustRatings && rustRatings.length > 0) {
        const r = rustRatings[0]
        return {
          curseforgeScore: r.curseforgeScore ?? r.curseforge_score,
          modrinthScore: r.modrinthScore ?? r.modrinth_score,
          communityScore: r.communityScore ?? r.community_score,
          downloadCount: r.downloadCount ?? r.download_count,
          score: r.score,
          timeDecayScore: r.timeDecayScore ?? r.time_decay_score,
        }
      }
    } catch {}
    return RATINGS[modId] || RATINGS[modId.replace(/-/g, '')]
  }

  computeTimeDecayScore(rating: ModRating): number {
    const weights: number[] = []
    const scores: number[] = []
    if (rating.curseforgeScore) { weights.push(0.4); scores.push(rating.curseforgeScore) }
    if (rating.modrinthScore) { weights.push(0.4); scores.push(rating.modrinthScore) }
    if (rating.communityScore) { weights.push(0.2); scores.push(rating.communityScore) }
    if (scores.length === 0) return 0
    const totalWeight = weights.reduce((a, b) => a + b, 0)
    const weightedAvg = scores.reduce((sum, s, i) => sum + s * weights[i], 0) / totalWeight
    const downloadFactor = Math.min(Math.log10((rating.downloadCount || 0) + 1) / 9, 1)
    return Math.round(weightedAvg * 0.7 + downloadFactor * 0.3 * 5 * 10) / 10
  }

  // ===== #47 性能影响评级 =====
  async getPerformanceDetail(modId: string): Promise<PerformanceDetail | undefined> {
    try {
      const rustRatings = await window.minecraftAPI.getModPerformanceRatings([modId])
      if (rustRatings && rustRatings.length > 0) {
        const r = rustRatings[0]
        return {
          impact: (r.impact || PERF_RATINGS[modId] || PERF_RATINGS[modId.replace(/-/g, '')] || 'unknown') as PerformanceImpact,
          fpsImpact: r.fpsImpact ?? r.fps_impact ?? 0,
          startupImpact: r.startupImpact ?? r.startup_impact ?? 0,
          memoryImpact: r.memoryImpact ?? r.memory_impact ?? 0,
        }
      }
    } catch {}
    return PERF_DETAILS[modId] || PERF_DETAILS[modId.replace(/-/g, '')]
  }

  async estimatePerformanceImpact(mods: LocalMod[], totalMemoryMB: number): Promise<{
    estimatedFPSImpact: number; estimatedStartupImpact: number; estimatedMemoryMB: number;
    riskLevel: PerformanceImpact; recommendations: string[]
  }> {
    try {
      const rustResult = await window.minecraftAPI.estimateInstancePerformance(
        mods.filter(m => m.isEnabled).map(m => ({ id: m.id, isEnabled: m.isEnabled })),
        totalMemoryMB,
      )
      if (rustResult) {
        return {
          estimatedFPSImpact: rustResult.estimatedFPSImpact ?? rustResult.estimated_fps_impact ?? 0,
          estimatedStartupImpact: rustResult.estimatedStartupImpact ?? rustResult.estimated_startup_impact ?? 0,
          estimatedMemoryMB: rustResult.estimatedMemoryMB ?? rustResult.estimated_memory_mb ?? 0,
          riskLevel: rustResult.riskLevel ?? rustResult.risk_level ?? 'none',
          recommendations: rustResult.recommendations || [],
        }
      }
    } catch {}

    let fpsImpact = 0, startupImpact = 0, memoryMB = 0
    let maxRisk: PerformanceImpact = 'none'
    const recommendations: string[] = []
    const riskOrder: PerformanceImpact[] = ['none', 'low', 'medium', 'high']

    for (const mod of mods) {
      if (!mod.isEnabled) continue
      const detail = PERF_DETAILS[mod.id] || PERF_DETAILS[mod.id.replace(/-/g, '')]
      if (detail) {
        fpsImpact += detail.fpsImpact || 0
        startupImpact += detail.startupImpact || 0
        memoryMB += detail.memoryImpact || 0
      }
      const impact = PERF_RATINGS[mod.id] || PERF_RATINGS[mod.id.replace(/-/g, '')] || 'none'
      if (riskOrder.indexOf(impact) > riskOrder.indexOf(maxRisk)) maxRisk = impact
    }

    if (memoryMB > totalMemoryMB * 0.5) recommendations.push('模组总内存占用超过系统内存的50%，建议减少模组数量或增加内存分配')
    if (fpsImpact < -30) recommendations.push('预计FPS影响较大，建议安装性能优化模组（Sodium/Lithium）')
    if (startupImpact > 60) recommendations.push('启动时间可能较长，建议安装 ModernFix/DashLoader')
    if (maxRisk === 'high') recommendations.push('包含高性能影响模组，建议降低渲染距离和关闭光影')

    return { estimatedFPSImpact: fpsImpact, estimatedStartupImpact: startupImpact, estimatedMemoryMB: memoryMB, riskLevel: maxRisk, recommendations }
  }

  // ===== #48 配置迁移工具 =====
  async checkConfigMigration(mod: LocalMod, newVersion: string): Promise<ConfigMigration | null> {
    if (!mod.configPath) return null
    try {
      const rustResult = await window.minecraftAPI.checkConfigMigration(
        mod.id, mod.chineseName || mod.name, mod.version, newVersion, mod.configPath,
      )
      if (rustResult) {
        return {
          modId: rustResult.modId ?? rustResult.mod_id,
          modName: rustResult.modName ?? rustResult.mod_name,
          oldVersion: rustResult.oldVersion ?? rustResult.old_version,
          newVersion: rustResult.newVersion ?? rustResult.new_version,
          oldConfigPath: rustResult.oldConfigPath ?? rustResult.old_config_path,
          newConfigPath: rustResult.newConfigPath ?? rustResult.new_config_path,
          changes: (rustResult.changes || []).map((c: any) => ({
            key: c.key,
            oldValue: c.oldValue ?? c.old_value,
            newValue: c.newValue ?? c.new_value,
            status: c.status,
            newKey: c.newKey ?? c.new_key,
            migrationNote: c.migrationNote ?? c.migration_note,
          })),
          autoMigratable: rustResult.autoMigratable ?? rustResult.auto_migratable ?? false,
        }
      }
    } catch {}

    try {
      const configDir = mod.configPath
      const oldVersion = mod.version
      const changes: ConfigChange[] = []

      const newVersionParts = newVersion.split('.').map(Number)
      const oldVersionParts = oldVersion.split('.').map(Number)
      const majorChanged = newVersionParts[0] !== oldVersionParts[0]
      const minorChanged = (newVersionParts[1] || 0) !== (oldVersionParts[1] || 0)

      if (majorChanged) {
        changes.push({ key: '*', status: 'changed-type', migrationNote: '大版本更新，配置文件格式可能已变更，建议重新配置' })
      } else if (minorChanged) {
        changes.push({ key: '*', status: 'kept', migrationNote: '小版本更新，大部分配置应该兼容' })
      }

      return {
        modId: mod.id, modName: mod.chineseName || mod.name,
        oldVersion, newVersion,
        oldConfigPath: configDir, newConfigPath: configDir,
        changes, autoMigratable: !majorChanged,
      }
    } catch { return null }
  }

  // ===== #49 模组文件分析器 =====
  async analyzeModJar(filePath: string): Promise<ModJarMetadata> {
    return window.minecraftAPI.analyzeModJar(filePath)
  }

  // ===== #50 模组分享链接 =====
  async generateShareCard(mod: ModInfo): Promise<ModShareCard> {
    try {
      const rustResult = await window.minecraftAPI.generateModShareInfo(
        mod.id, mod.name, mod.chineseName, mod.version,
        mod.description.slice(0, 100), mod.iconUrl, mod.source,
        mod.projectUrl, mod.projectUrl,
      )
      if (rustResult) {
        return {
          modId: rustResult.modId ?? rustResult.mod_id,
          name: rustResult.name,
          chineseName: rustResult.chineseName ?? rustResult.chinese_name,
          version: rustResult.version,
          description: rustResult.description,
          iconUrl: rustResult.iconUrl ?? rustResult.icon_url,
          source: rustResult.source,
          downloadUrl: rustResult.downloadUrl ?? rustResult.download_url,
          shareUrl: rustResult.shareUrl ?? rustResult.share_url,
          qrCodeData: rustResult.qrCodeData ?? rustResult.qr_code_data,
        }
      }
    } catch {}

    const card: ModShareCard = {
      modId: mod.id, name: mod.name, chineseName: mod.chineseName,
      version: mod.version, description: mod.description.slice(0, 100),
      iconUrl: mod.iconUrl, source: mod.source,
      downloadUrl: mod.projectUrl,
      shareUrl: mod.projectUrl,
      qrCodeData: mod.projectUrl || `bonjour://mod/${mod.source}/${mod.sourceId || mod.id}`,
    }
    return card
  }

  // ===== #51 多模组加载器实例共存 =====
  generateInstanceName(gameVersion: string, loader: ModLoaderType): string {
    if (loader === 'unknown') return `Minecraft ${gameVersion}`
    return `Minecraft ${gameVersion} (${LOADER_CONFIG[loader].label})`
  }

  getLoaderIcon(loader: ModLoaderType): string {
    return LOADER_CONFIG[loader]?.icon || '❓'
  }

  async detectModLoaderFromJar(filePath: string): Promise<{ modId: string; modLoader: string; version: string; name: string }> {
    try {
      return await window.minecraftAPI.detectModLoaderFromJar(filePath)
    } catch {
      return { modId: '', modLoader: this.detectModLoader(filePath), version: '', name: '' }
    }
  }

  async getModChineseName(modId: string): Promise<string | null> {
    try {
      return await window.minecraftAPI.getModChineseName(modId)
    } catch {
      return CN_NAMES[modId] || CN_NAMES[modId.replace(/-/g, '')] || null
    }
  }

  // ===== #52 模组元数据云端增强 =====
  async enhanceLocalModMetadata(localMod: LocalMod): Promise<LocalMod> {
    const idNorm = localMod.id.replace(/-/g, '')
    const baseEnhance = {
      ...localMod,
      chineseName: CN_NAMES[localMod.id] || CN_NAMES[idNorm] || undefined,
      performanceImpact: PERF_RATINGS[localMod.id] || PERF_RATINGS[idNorm] || localMod.performanceImpact,
      performanceDetail: PERF_DETAILS[localMod.id] || PERF_DETAILS[idNorm] || localMod.performanceDetail,
      rating: RATINGS[localMod.id] || RATINGS[idNorm] || localMod.rating,
      chineseTags: CN_TAGS[localMod.id] || CN_TAGS[idNorm] || localMod.chineseTags,
    }

    try {
      const rustResult = await window.minecraftAPI.enhanceModMetadata(localMod.filePath)
      if (rustResult && rustResult.mergedMetadata) {
        const meta = rustResult.mergedMetadata
        return {
          ...baseEnhance,
          name: meta.name || localMod.name,
          description: meta.description || localMod.description,
          version: meta.version || localMod.version,
          modLoader: (meta.modLoader || localMod.modLoader) as ModLoaderType,
          metadata: meta,
          sha256: meta.sha256 || localMod.sha256,
          authors: meta.authors || localMod.authors,
          iconUrl: meta.iconPath ? undefined : localMod.iconUrl,
        }
      }
    } catch {}

    if (localMod.sha256 || localMod.metadata?.modId) {
      try {
        const searchId = localMod.metadata?.modId || localMod.sourceId || localMod.id
        const details = await modrinthAPI.getModDetails(searchId)
        if (details) {
          return {
            ...baseEnhance,
            name: details.name !== localMod.name ? details.name : localMod.name,
            description: details.description || localMod.description,
            authors: details.authors?.length > 0 ? details.authors : localMod.authors,
            iconUrl: details.iconUrl || localMod.iconUrl,
            projectUrl: details.projectUrl || localMod.projectUrl,
            downloads: details.downloads,
            categories: details.categories,
            lastUpdated: details.lastUpdated,
          }
        }
      } catch {}
    }

    return baseEnhance
  }

  // ===== Common helpers =====
  async getModDetails(modId: string, source?: string): Promise<ModInfo> {
    if (source === 'curseforge') return curseforgeAPI.getModDetails(modId)
    return modrinthAPI.getModDetails(modId)
  }

  async getModVersions(modId: string, gameVersion?: string, loader?: ModLoaderType, source?: string): Promise<ModFile[]> {
    if (source === 'curseforge') return curseforgeAPI.getModVersions(modId, gameVersion, loader)
    return modrinthAPI.getModVersions(modId, gameVersion, loader)
  }

  async scanLocalMods(modsDir: string): Promise<LocalMod[]> {
    return window.minecraftAPI.scanLocalMods(modsDir)
  }

  checkDependencies(mod: ModInfo, installedMods: LocalMod[]): {
    satisfied: ModDependency[]; missing: ModDependency[]; optional: ModDependency[]
  } {
    const satisfied: ModDependency[] = [], missing: ModDependency[] = [], optional: ModDependency[] = []
    for (const dep of mod.dependencies || []) {
      if (!dep.required) { optional.push(dep); continue }
      const installed = installedMods.find(m => m.id === dep.modId || m.name === dep.name || m.metadata?.modId === dep.modId)
      if (installed) {
        if (this.checkVersionRange(installed.version, dep.versionRange)) satisfied.push(dep)
        else missing.push(dep)
      } else { missing.push(dep) }
    }
    return { satisfied, missing, optional }
  }

  detectModLoader(fileName: string): ModLoaderType {
    const n = fileName.toLowerCase()
    if (n.includes('neoforge')) return 'neoforge'
    if (n.includes('forge') || n.includes('fml')) return 'forge'
    if (n.includes('fabric')) return 'fabric'
    if (n.includes('quilt')) return 'quilt'
    if (n.includes('liteloader')) return 'liteloader'
    return 'unknown'
  }

  async toggleMod(modPath: string, enabled: boolean): Promise<void> {
    return window.minecraftAPI.toggleMod(modPath, enabled)
  }

  async deleteMod(modPath: string): Promise<void> {
    return window.minecraftAPI.deleteMod(modPath)
  }

  async installMod(downloadUrl: string, targetPath: string, options?: { expectedHash?: string; dependencies?: ModDependency[] }): Promise<void> {
    await window.minecraftAPI.downloadFile(downloadUrl, targetPath, options)
  }

  private checkVersionRange(version: string, range?: string): boolean {
    if (!range) return true
    if (range.startsWith('>=')) return version >= range.slice(2)
    if (range.startsWith('>')) return version > range.slice(1)
    if (range.startsWith('<=')) return version <= range.slice(2)
    if (range.startsWith('<')) return version < range.slice(1)
    return version === range
  }
}

export const modManager = ModManager.getInstance()
