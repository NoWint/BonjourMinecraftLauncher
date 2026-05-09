import type { LogDiagnosis, CrashDiagnosis, CrashSolution, CrashReport, CrashSystemInfo } from '../../types/launch'

interface LogRule {
  id: string
  pattern: RegExp
  title: string
  description: string
  solution: string
  severity: LogDiagnosis['severity']
}

const LOG_RULES: LogRule[] = [
  {
    id: 'java_version_mismatch',
    pattern: /UnsupportedClassVersionError|class file version.*unsupported|has been compiled by a more recent version of the Java Runtime/i,
    title: 'Java 版本不兼容',
    description: '游戏或模组需要更高版本的 Java，当前 Java 版本太旧',
    solution: '请更新 Java 到 17 或更高版本，可在设置中配置 Java 路径',
    severity: 'critical',
  },
  {
    id: 'java_outdated_8',
    pattern: /java\.lang\.IllegalArgumentException|Could not create the Java Virtual Machine/i,
    title: 'Java 启动失败',
    description: 'JVM 无法创建，可能是参数配置错误或 Java 版本不兼容',
    solution: '检查 JVM 参数设置，尝试恢复默认参数；确保使用 Java 17+',
    severity: 'critical',
  },
  {
    id: 'optifine_sodium_conflict',
    pattern: /OptiFine.*Sodium|Sodium.*OptiFine|mixins\.sodium.*optifine/i,
    title: 'OptiFine 与 Sodium 冲突',
    description: 'OptiFine 和 Sodium 不能同时使用，它们会互相冲突',
    solution: '移除其中一个。推荐保留 Sodium（性能更好），移除 OptiFine',
    severity: 'critical',
  },
  {
    id: 'mod_missing_dependency',
    pattern: /Missing dependency|requires.*which is missing|UnsatisfiedDependencyException/i,
    title: '模组缺少依赖',
    description: '某个模组需要的前置模组未安装',
    solution: '查看日志中提到的缺失模组名称，下载并安装对应的前置模组',
    severity: 'error',
  },
  {
    id: 'mod_duplicate',
    pattern: /Duplicate mod|Found duplicate|already registered/i,
    title: '模组重复安装',
    description: '检测到重复的模组文件，可能导致冲突',
    solution: '检查 mods 文件夹，删除重复的模组 jar 文件',
    severity: 'warning',
  },
  {
    id: 'memory_out_of',
    pattern: /OutOfMemoryError|Java heap space|Could not reserve enough space/i,
    title: '内存不足',
    description: '分配给游戏的内存不够，JVM 内存溢出',
    solution: '增加最大内存分配（建议 4GB 以上），或减少安装的模组数量',
    severity: 'critical',
  },
  {
    id: 'gpu_driver_old',
    pattern: /GLFW error|OpenGL.*not supported|pixel format|GLX.*failed|driver.*outdated/i,
    title: '显卡驱动问题',
    description: '显卡驱动过旧或不支持所需的 OpenGL 版本',
    solution: '更新显卡驱动到最新版本；如果使用集成显卡，请安装专用驱动',
    severity: 'critical',
  },
  {
    id: 'asset_download_fail',
    pattern: /Failed to download|Unable to download|connection.*timed? ?out|Connection refused/i,
    title: '下载失败',
    description: '游戏资源下载失败，可能是网络问题',
    solution: '检查网络连接；尝试切换下载源；使用增量修复功能重新下载缺失文件',
    severity: 'error',
  },
  {
    id: 'forge_version_mismatch',
    pattern: /Forge.*version.*mismatch|forge.*incompatible|net\.minecraftforge.*error/i,
    title: 'Forge 版本不匹配',
    description: 'Forge 版本与 Minecraft 版本不兼容',
    solution: '重新安装正确版本的 Forge，确保与游戏版本匹配',
    severity: 'error',
  },
  {
    id: 'fabric_loader_error',
    pattern: /FabricLoader.*error|fabric.*mixin.*error|net\.fabricmc.*crash/i,
    title: 'Fabric 加载器错误',
    description: 'Fabric 加载器遇到错误，可能是模组不兼容',
    solution: '更新 Fabric Loader 到最新版本；检查模组是否与当前版本兼容',
    severity: 'error',
  },
  {
    id: 'mixin_error',
    pattern: /Mixin.*error|MixinApplyError|mixin.*failed/i,
    title: 'Mixin 注入失败',
    description: '模组的 Mixin 注入失败，通常是模组间冲突导致',
    solution: '查看日志中具体冲突的模组，尝试移除或更新相关模组',
    severity: 'error',
  },
  {
    id: 'security_manager',
    pattern: /SecurityManager|security.*exception|access denied/i,
    title: '安全限制错误',
    description: 'Java 安全管理器阻止了某些操作',
    solution: '在 JVM 参数中添加 --add-opens 相关参数，或检查 Java 安全配置',
    severity: 'warning',
  },
  {
    id: 'log4j_vulnerability',
    pattern: /log4j.*vulnerable|Log4Shell|JNDI.*lookup/i,
    title: 'Log4j 安全漏洞',
    description: '检测到 Log4j 安全漏洞风险',
    solution: '在 JVM 参数中添加 -Dlog4j2.formatMsgNoLookups=true；更新到最新游戏版本',
    severity: 'critical',
  },
  {
    id: 'world_corruption',
    pattern: /Corrupted.*chunk|NBT.*error|level\.dat.*corrupt|Exception reading.*region/i,
    title: '存档损坏',
    description: '游戏存档数据损坏',
    solution: '尝试使用存档修复功能；从备份恢复存档',
    severity: 'error',
  },
  {
    id: 'shader_error',
    pattern: /shader.*error|GLSL.*compile|shaderpack.*failed|Iris.*error/i,
    title: '光影包错误',
    description: '光影包加载失败或与当前配置不兼容',
    solution: '更新光影包；检查光影包是否与当前 Minecraft 版本和模组加载器兼容',
    severity: 'warning',
  },
  {
    id: 'exit_code_1',
    pattern: /Process exited with code 1|exit code.*1$/i,
    title: '游戏异常退出 (Exit Code 1)',
    description: '游戏以错误代码 1 退出，通常表示启动过程中出现了致命错误',
    solution: '查看上方日志中的错误信息；尝试移除最近添加的模组；检查 Java 和显卡驱动',
    severity: 'error',
  },
  {
    id: 'exit_code_neg1',
    pattern: /Process exited with code -1|exit code.*-1$/i,
    title: '游戏崩溃 (Exit Code -1)',
    description: '游戏因 JVM 崩溃退出，可能是模组或驱动问题',
    solution: '检查显卡驱动是否最新；减少内存分配；移除可能导致崩溃的模组',
    severity: 'critical',
  },
  {
    id: 'port_in_use',
    pattern: /Address already in use|port.*occupied|Bind.*failed/i,
    title: '端口被占用',
    description: '游戏服务器端口已被其他程序占用',
    solution: '关闭占用端口的程序，或在设置中更换端口号',
    severity: 'warning',
  },
]

export function diagnoseLog(message: string): LogDiagnosis | null {
  for (const rule of LOG_RULES) {
    if (rule.pattern.test(message)) {
      return {
        matched: true,
        ruleId: rule.id,
        title: rule.title,
        description: rule.description,
        solution: rule.solution,
        severity: rule.severity,
      }
    }
  }
  return null
}

export function diagnoseCrashReport(
  rawLog: string,
  exitCode: number,
  systemInfo: CrashSystemInfo,
  modList: string[],
  jvmArgs: string[]
): CrashDiagnosis | null {
  const allDiagnoses: LogDiagnosis[] = []

  const lines = rawLog.split('\n')
  for (const line of lines) {
    const d = diagnoseLog(line)
    if (d) allDiagnoses.push(d)
  }

  if (exitCode === -1 && allDiagnoses.length === 0) {
    allDiagnoses.push({
      matched: true,
      ruleId: 'jvm_crash',
      title: 'JVM 崩溃',
      description: 'JVM 意外崩溃，可能是内存不足或原生代码错误',
      solution: '减少内存分配；更新 Java 和显卡驱动；检查 hs_err_pid 日志文件',
      severity: 'critical',
    })
  }

  if (exitCode === 1 && allDiagnoses.length === 0) {
    allDiagnoses.push({
      matched: true,
      ruleId: 'unknown_exit_1',
      title: '游戏异常退出',
      description: '游戏以代码 1 退出，原因未知',
      solution: '查看完整日志寻找错误线索；尝试移除最近添加的模组；重新安装游戏版本',
      severity: 'error',
    })
  }

  if (allDiagnoses.length === 0) return null

  const sorted = allDiagnoses.sort((a, b) => {
    const severityOrder = { critical: 0, error: 1, warning: 2, info: 3 }
    return severityOrder[a.severity] - severityOrder[b.severity]
  })

  const primary = sorted[0]

  const solutions: CrashSolution[] = primary.solution.split('；').map((s, i) => ({
    id: `${primary.ruleId}_sol_${i}`,
    title: s.substring(0, 20) + '...',
    description: s,
    action: inferActionFromSolution(s),
  }))

  return {
    category: primary.ruleId,
    title: primary.title,
    description: primary.description,
    solutions,
    confidence: primary.severity === 'critical' ? 0.95 : primary.severity === 'error' ? 0.85 : 0.7,
  }
}

function inferActionFromSolution(solution: string): CrashSolution['action'] {
  if (solution.includes('更新') && solution.includes('驱动')) return 'update_driver'
  if (solution.includes('移除') || solution.includes('删除')) return 'remove_mod'
  if (solution.includes('JVM') || solution.includes('参数')) return 'change_jvm_args'
  if (solution.includes('Java')) return 'update_java'
  if (solution.includes('内存')) return 'change_memory'
  if (solution.includes('重新安装')) return 'reinstall'
  return 'manual'
}

export function createCrashReport(
  version: string,
  exitCode: number,
  rawLog: string,
  systemInfo: CrashSystemInfo,
  modList: string[],
  jvmArgs: string[],
  instanceId?: string
): CrashReport {
  const diagnosis = diagnoseCrashReport(rawLog, exitCode, systemInfo, modList, jvmArgs)

  return {
    id: `crash-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    timestamp: Date.now(),
    version,
    instanceId,
    exitCode,
    stackTrace: extractStackTrace(rawLog),
    systemInfo,
    modList,
    jvmArgs,
    diagnosis,
    rawLog,
  }
}

function extractStackTrace(log: string): string {
  const lines = log.split('\n')
  const stackStart = lines.findIndex(l => l.includes('Exception') || l.includes('Error') || l.includes('at '))
  if (stackStart === -1) return ''

  const stackLines: string[] = []
  for (let i = stackStart; i < Math.min(lines.length, stackStart + 30); i++) {
    const line = lines[i].trim()
    if (line.startsWith('at ') || line.includes('Exception') || line.includes('Error') || line.startsWith('Caused by')) {
      stackLines.push(line)
    } else if (stackLines.length > 0 && line === '') {
      break
    }
  }

  return stackLines.join('\n')
}

export { LOG_RULES }
