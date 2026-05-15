import type { HotConfigCategory, HotConfigChange } from '../../types/launch'

const CONFIG_CATEGORIES: HotConfigCategory[] = [
  {
    id: 'resourcepack',
    name: '资源包',
    requiresRestart: false,
    patterns: ['resourcepacks/**', 'options.txt'],
  },
  {
    id: 'shaderpack',
    name: '光影包',
    requiresRestart: false,
    patterns: ['shaderpacks/**', 'optionsshaders.txt'],
  },
  {
    id: 'mod_config',
    name: '模组配置',
    requiresRestart: true,
    patterns: ['config/**/*.cfg', 'config/**/*.json', 'config/**/*.toml', 'config/**/*.yaml', 'config/**/*.yml'],
  },
  {
    id: 'mod_list',
    name: '模组列表',
    requiresRestart: true,
    patterns: ['mods/**/*.jar', 'mods/**/*.jar.disabled'],
  },
  {
    id: 'game_options',
    name: '游戏选项',
    requiresRestart: false,
    patterns: ['options.txt', 'optionsof.txt', 'servers.dat'],
  },
  {
    id: 'jvm_args',
    name: 'JVM 参数',
    requiresRestart: true,
    patterns: [],
  },
]

export function getConfigCategories(): HotConfigCategory[] {
  return CONFIG_CATEGORIES
}

export function classifyConfigChange(filePath: string): HotConfigCategory | null {
  const normalizedPath = filePath.replace(/\\/g, '/')

  for (const category of CONFIG_CATEGORIES) {
    for (const pattern of category.patterns) {
      const regexPattern = pattern
        .replace(/\*\*/g, '.*')
        .replace(/\*/g, '[^/]*')
        .replace(/\./g, '\\.')
      const regex = new RegExp(`(^|/)${regexPattern}$`)

      if (regex.test(normalizedPath)) {
        return category
      }
    }
  }

  return null
}

export function canHotReload(filePath: string): boolean {
  const category = classifyConfigChange(filePath)
  if (!category) return false
  return !category.requiresRestart
}

export function createConfigChange(filePath: string): HotConfigChange | null {
  const category = classifyConfigChange(filePath)
  if (!category) return null

  return {
    filePath,
    category: category.id,
    canHotReload: !category.requiresRestart,
    timestamp: Date.now(),
  }
}

export function getHotReloadableCategories(): HotConfigCategory[] {
  return CONFIG_CATEGORIES.filter(c => !c.requiresRestart)
}

export function getRestartRequiredCategories(): HotConfigCategory[] {
  return CONFIG_CATEGORIES.filter(c => c.requiresRestart)
}

export function generateHotReloadCommand(change: HotConfigChange): string | null {
  switch (change.category) {
    case 'resourcepack':
      return '/reload'
    case 'shaderpack':
      return '/shader reload'
    case 'game_options':
      return null
    default:
      return null
  }
}
