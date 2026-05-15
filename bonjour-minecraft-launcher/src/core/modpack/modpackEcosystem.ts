import type { ModpackTestResult, ModpackTestCheck, ModpackRating, ModpackReview, ModpackRecommendation, ModpackSyncRoom, ModpackSyncParticipant, ModpackPerformanceBenchmark } from '../../types/modpack'

export function runModpackTests(
  gameVersion: string,
  modLoader: string,
  modList: { fileName: string; hash?: string }[],
  totalModSize: number
): ModpackTestResult {
  const checks: ModpackTestCheck[] = []

  if (!gameVersion) {
    checks.push({ id: 'game_version', name: '游戏版本', category: 'compatibility', status: 'fail', message: '未指定游戏版本' })
  } else {
    checks.push({ id: 'game_version', name: '游戏版本', category: 'compatibility', status: 'pass', message: `游戏版本: ${gameVersion}` })
  }

  if (!modLoader) {
    checks.push({ id: 'mod_loader', name: '模组加载器', category: 'dependency', status: 'fail', message: '未指定模组加载器' })
  } else {
    checks.push({ id: 'mod_loader', name: '模组加载器', category: 'dependency', status: 'pass', message: `加载器: ${modLoader}` })
  }

  const optifineMods = modList.filter(m => m.fileName.toLowerCase().includes('optifine'))
  const sodiumMods = modList.filter(m => m.fileName.toLowerCase().includes('sodium'))
  if (optifineMods.length > 0 && sodiumMods.length > 0) {
    checks.push({ id: 'optifine_sodium', name: 'OptiFine/Sodium 冲突', category: 'conflict', status: 'fail', message: 'OptiFine 和 Sodium 不能同时使用', details: '这两个模组会互相冲突，请移除其中一个' })
  } else {
    checks.push({ id: 'optifine_sodium', name: 'OptiFine/Sodium 冲突', category: 'conflict', status: 'pass', message: '未检测到 OptiFine/Sodium 冲突' })
  }

  const duplicateMods = modList.filter((m, i) => modList.findIndex(m2 => m2.fileName === m.fileName) !== i)
  if (duplicateMods.length > 0) {
    checks.push({ id: 'duplicate_mods', name: '重复模组', category: 'conflict', status: 'warn', message: `检测到 ${duplicateMods.length} 个重复模组` })
  } else {
    checks.push({ id: 'duplicate_mods', name: '重复模组', category: 'conflict', status: 'pass', message: '无重复模组' })
  }

  if (modList.length > 200) {
    checks.push({ id: 'mod_count', name: '模组数量', category: 'performance', status: 'warn', message: `${modList.length} 个模组，可能影响性能`, details: '建议分配 6GB+ 内存' })
  } else if (modList.length > 100) {
    checks.push({ id: 'mod_count', name: '模组数量', category: 'performance', status: 'pass', message: `${modList.length} 个模组，建议分配 4GB+ 内存` })
  } else {
    checks.push({ id: 'mod_count', name: '模组数量', category: 'performance', status: 'pass', message: `${modList.length} 个模组` })
  }

  if (totalModSize > 2 * 1024 * 1024 * 1024) {
    checks.push({ id: 'total_size', name: '总大小', category: 'resource', status: 'warn', message: `模组总大小超过 2GB，下载可能较慢` })
  } else {
    checks.push({ id: 'total_size', name: '总大小', category: 'resource', status: 'pass', message: '模组总大小合理' })
  }

  const failCount = checks.filter(c => c.status === 'fail').length
  const warnCount = checks.filter(c => c.status === 'warn').length
  const passed = failCount === 0
  let overallScore = 100 - failCount * 25 - warnCount * 5
  overallScore = Math.max(0, Math.min(100, overallScore))

  const estimatedStartupTime = 10 + modList.length * 0.1
  const estimatedFps = Math.max(15, 144 - modList.length * 0.5)

  const warnings = checks.filter(c => c.status === 'warn').map(c => c.message)

  return {
    passed,
    checks,
    overallScore,
    estimatedStartupTime: Math.round(estimatedStartupTime),
    estimatedFps: Math.round(estimatedFps),
    warnings,
  }
}

export function calculateModpackRating(reviews: ModpackReview[]): ModpackRating {
  if (reviews.length === 0) {
    return { modpackId: '', completeness: 0, stability: 0, performance: 0, difficulty: 0, innovation: 0, overall: 0, reviewCount: 0 }
  }

  const avg = (fn: (r: ModpackReview) => number) => reviews.reduce((s, r) => s + fn(r), 0) / reviews.length

  const completeness = Math.round(avg(r => r.completeness))
  const stability = Math.round(avg(r => r.stability))
  const performance = Math.round(avg(r => r.performance))
  const difficulty = Math.round(avg(r => r.difficulty))
  const innovation = Math.round(avg(r => r.innovation))
  const overall = Math.round((completeness + stability + performance + innovation) / 4)

  return {
    modpackId: reviews[0].modpackId,
    completeness,
    stability,
    performance,
    difficulty,
    innovation,
    overall,
    reviewCount: reviews.length,
  }
}

export function getModpackRecommendations(
  userPlayedModpacks: string[],
  allModpacks: { id: string; name: string; tags: string[]; rating: number }[],
  limit: number = 10
): ModpackRecommendation[] {
  const playedSet = new Set(userPlayedModpacks)
  const candidates = allModpacks.filter(m => !playedSet.has(m.id))

  const userTags: Record<string, number> = {}
  for (const pack of allModpacks.filter(m => playedSet.has(m.id))) {
    for (const tag of pack.tags) {
      userTags[tag] = (userTags[tag] || 0) + 1
    }
  }

  const scored = candidates.map(pack => {
    let score = pack.rating
    for (const tag of pack.tags) {
      if (userTags[tag]) score += userTags[tag] * 2
    }
    const topTags = pack.tags.filter(t => userTags[t]).slice(0, 2)
    const reason = topTags.length > 0 ? `基于你对「${topTags.join('」「')}」类整合包的偏好` : '热门推荐'
    return { modpackId: pack.id, name: pack.name, score, reason, tags: pack.tags }
  })

  return scored.sort((a, b) => b.score - a.score).slice(0, limit)
}

export function createSyncRoom(
  hostId: string,
  hostName: string,
  modpackName: string,
  modpackVersion: string,
  gameVersion: string,
  modLoader: string,
  modCount: number
): ModpackSyncRoom {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase()
  return {
    id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    code,
    hostId,
    hostName,
    modpackName,
    modpackVersion,
    gameVersion,
    modLoader,
    modCount,
    participants: [{ id: hostId, name: hostName, status: 'complete', progress: 100, joinedAt: Date.now() }],
    createdAt: Date.now(),
    status: 'waiting',
  }
}

export function joinSyncRoom(room: ModpackSyncRoom, participantId: string, participantName: string): ModpackSyncRoom {
  const participant: ModpackSyncParticipant = {
    id: participantId,
    name: participantName,
    status: 'waiting',
    progress: 0,
    joinedAt: Date.now(),
  }
  return {
    ...room,
    participants: [...room.participants, participant],
  }
}

export function getPerformanceBenchmark(
  modpackId: string,
  modpackName: string,
  modCount: number
): ModpackPerformanceBenchmark {
  const minRam = modCount > 150 ? 6144 : modCount > 80 ? 4096 : 2048
  const recommendedRam = modCount > 150 ? 8192 : modCount > 80 ? 6144 : 4096
  const startupMin = Math.round(15 + modCount * 0.15)
  const startupMax = Math.round(startupMin * 1.5)
  const fpsMin = Math.max(10, Math.round(60 - modCount * 0.3))
  const fpsAvg = Math.max(20, Math.round(100 - modCount * 0.4))
  const fpsMax = Math.max(30, Math.round(144 - modCount * 0.3))

  return {
    modpackId,
    modpackName,
    modCount,
    minRam,
    recommendedRam,
    startupTimeMin: startupMin,
    startupTimeMax: startupMax,
    fpsMin,
    fpsAvg,
    fpsMax,
    testConfig: '模拟估算',
    sampleCount: 0,
    lastUpdated: Date.now(),
  }
}
