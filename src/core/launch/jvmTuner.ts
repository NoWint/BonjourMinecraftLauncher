import type { JVMProfile, JVMTuningResult } from '../../types/launch'

const JVM_PROFILES: JVMProfile[] = [
  {
    id: 'balanced',
    name: '均衡模式',
    description: '适合大多数玩家，自动选择最优参数',
    level: 'beginner',
    args: [
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=200',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:G1NewSizePercent=30',
      '-XX:G1MaxNewSizePercent=40',
      '-XX:G1HeapRegionSize=8M',
      '-XX:G1ReservePercent=20',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      '-XX:InitiatingHeapOccupancyPercent=15',
      '-XX:G1MixedGCLiveThresholdPercent=90',
      '-XX:G1RSetUpdatingPauseTimePercent=5',
      '-XX:SurvivorRatio=32',
      '-XX:+PerfDisableSharedMem',
      '-XX:MaxTenuringThreshold=1',
    ],
    recommendedMemory: 4096,
    gcType: 'G1GC',
    notes: 'G1GC 均衡配置，适合 4-8GB 内存分配',
  },
  {
    id: 'performance',
    name: '高性能模式',
    description: '最大化游戏性能，适合高配电脑',
    level: 'advanced',
    args: [
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=130',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:G1NewSizePercent=28',
      '-XX:G1MaxNewSizePercent=40',
      '-XX:G1HeapRegionSize=16M',
      '-XX:G1ReservePercent=15',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=4',
      '-XX:InitiatingHeapOccupancyPercent=10',
      '-XX:G1MixedGCLiveThresholdPercent=85',
      '-XX:G1RSetUpdatingPauseTimePercent=5',
      '-XX:SurvivorRatio=32',
      '-XX:+PerfDisableSharedMem',
      '-XX:MaxTenuringThreshold=1',
      '-XX:-UseBiasedLocking',
      '-XX:+UseStringDeduplication',
    ],
    recommendedMemory: 6144,
    gcType: 'G1GC',
    notes: 'G1GC 高性能配置，16M Region 适合 6GB+ 内存',
  },
  {
    id: 'low_memory',
    name: '低内存模式',
    description: '适合内存较小的电脑，减少 GC 暂停',
    level: 'beginner',
    args: [
      '-XX:+UseG1GC',
      '-XX:+ParallelRefProcEnabled',
      '-XX:MaxGCPauseMillis=50',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:G1NewSizePercent=20',
      '-XX:G1MaxNewSizePercent=30',
      '-XX:G1HeapRegionSize=4M',
      '-XX:G1ReservePercent=25',
      '-XX:G1HeapWastePercent=5',
      '-XX:G1MixedGCCountTarget=2',
      '-XX:InitiatingHeapOccupancyPercent=20',
      '-XX:SurvivorRatio=16',
      '-XX:+PerfDisableSharedMem',
      '-XX:MaxTenuringThreshold=2',
    ],
    recommendedMemory: 2048,
    gcType: 'G1GC',
    notes: 'G1GC 低内存配置，4M Region 适合 2-4GB 内存',
  },
  {
    id: 'zgc',
    name: 'ZGC 模式',
    description: '超低延迟 GC，需要 Java 15+',
    level: 'expert',
    args: [
      '-XX:+UseZGC',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:ZAllocationSpikeTolerance=2',
      '-XX:+UseStringDeduplication',
    ],
    recommendedMemory: 8192,
    gcType: 'ZGC',
    notes: 'ZGC 超低延迟，需要 Java 15+，适合 8GB+ 内存',
  },
  {
    id: 'aion',
    name: 'Aion 优化',
    description: '社区流行的 Aion 启动参数',
    level: 'advanced',
    args: [
      '-XX:+UseG1GC',
      '-XX:+UnlockExperimentalVMOptions',
      '-XX:G1NewSizePercent=20',
      '-XX:G1ReservePercent=20',
      '-XX:MaxGCPauseMillis=50',
      '-XX:G1HeapRegionSize=32M',
      '-XX:InitiatingHeapOccupancyPercent=15',
      '-XX:G1MixedGCCountTarget=4',
      '-XX:G1MixedGCLiveThresholdPercent=90',
      '-XX:+ParallelRefProcEnabled',
      '-XX:+DisableExplicitGC',
      '-XX:+AlwaysPreTouch',
      '-XX:SurvivorRatio=32',
      '-XX:MaxTenuringThreshold=1',
      '-XX:-UseBiasedLocking',
      '-XX:+UseStringDeduplication',
      '-XX:+PerfDisableSharedMem',
    ],
    recommendedMemory: 6144,
    gcType: 'G1GC',
    notes: 'Aion 社区优化配置，32M Region 适合大内存',
  },
]

export function getJVMProfiles(): JVMProfile[] {
  return JVM_PROFILES
}

export function getJVMProfileById(id: string): JVMProfile | undefined {
  return JVM_PROFILES.find(p => p.id === id)
}

export function recommendProfile(
  totalMemoryMB: number,
  javaMajorVersion: number,
  modCount: number
): JVMTuningResult {
  const warnings: string[] = []

  let profile: JVMProfile
  let maxMemory: number

  if (totalMemoryMB < 4096) {
    profile = JVM_PROFILES.find(p => p.id === 'low_memory')!
    maxMemory = Math.min(2048, Math.floor(totalMemoryMB * 0.5))
    warnings.push('系统内存较少，建议关闭其他程序以释放内存')
  } else if (totalMemoryMB >= 16384 && javaMajorVersion >= 15) {
    profile = JVM_PROFILES.find(p => p.id === 'zgc')!
    maxMemory = Math.min(8192, Math.floor(totalMemoryMB * 0.5))
  } else if (modCount > 100 || totalMemoryMB >= 12288) {
    profile = JVM_PROFILES.find(p => p.id === 'performance')!
    maxMemory = Math.min(8192, Math.floor(totalMemoryMB * 0.5))
  } else {
    profile = JVM_PROFILES.find(p => p.id === 'balanced')!
    maxMemory = Math.min(4096, Math.floor(totalMemoryMB * 0.5))
  }

  if (profile.id === 'zgc' && javaMajorVersion < 15) {
    warnings.push('ZGC 需要 Java 15 或更高版本，已自动切换到均衡模式')
    profile = JVM_PROFILES.find(p => p.id === 'balanced')!
  }

  if (maxMemory < 1024) {
    warnings.push('分配内存低于 1GB，游戏可能无法正常启动')
  }

  if (modCount > 200 && maxMemory < 6144) {
    warnings.push('模组数量较多，建议增加内存分配到 6GB 以上')
  }

  const minMemory = Math.min(512, Math.floor(maxMemory * 0.125))

  return {
    profile,
    args: [...profile.args],
    memoryConfig: { min: minMemory, max: maxMemory },
    warnings,
  }
}

export function buildJVMArgs(
  profile: JVMProfile,
  maxMemory: number,
  minMemory: number,
  gameVersion: string,
  javaMajorVersion: number,
  platform: string,
  customArgs: string[] = []
): string[] {
  const args: string[] = []

  if (platform === 'darwin') {
    args.push('-XstartOnFirstThread')
  }

  args.push(`-Xmx${maxMemory}M`)
  args.push(`-Xms${minMemory}M`)

  args.push(...profile.args)

  args.push(
    '--add-opens=java.base/java.lang=ALL-UNNAMED',
    '--add-opens=java.base/java.lang.invoke=ALL-UNNAMED',
    '--add-opens=java.base/java.util=ALL-UNNAMED',
    '--add-opens=java.base/java.io=ALL-UNNAMED',
    '--add-opens=java.base/sun.nio.ch=ALL-UNNAMED',
    '--add-opens=java.base/jdk.internal.ref=ALL-UNNAMED',
    '--add-opens=java.base/java.nio=ALL-UNNAMED',
    '--add-opens=java.base/jdk.internal.misc=ALL-UNNAMED'
  )

  if (javaMajorVersion >= 18) {
    args.push('--enable-native-access=ALL-UNNAMED')
  }

  const majorVersion = parseInt(gameVersion.split('.')[1] || '0')
  if (majorVersion >= 21) {
    args.push('-Dlog4j2.formatMsgNoLookups=true')
  }

  args.push(...customArgs)

  return args
}
