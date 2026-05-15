import type { ModpackManifest, ModpackFormat, ModpackModEntry } from '../../types/modpack'

export function detectModpackFormat(zipEntries: string[]): ModpackFormat {
  if (zipEntries.some(e => e === 'manifest.json')) {
    const hasMinecraft = zipEntries.some(e => e.includes('minecraft') || e.includes('overrides'))
    if (hasMinecraft) return 'curseforge'
  }
  if (zipEntries.some(e => e === 'modrinth.index.json')) return 'modrinth'
  if (zipEntries.some(e => e === 'modpack.json' || e === 'version.json')) return 'ftb'
  if (zipEntries.some(e => e === 'modpack.yaml' || e === 'modpack.yml')) return 'technic'
  if (zipEntries.some(e => e === 'bonjour-modpack.json')) return 'bonjour'
  return 'unknown'
}

export function parseCurseForgeManifest(raw: any): ModpackManifest {
  const manifest = typeof raw === 'string' ? JSON.parse(raw) : raw
  const mods: ModpackModEntry[] = (manifest.files || []).map((f: any) => ({
    fileId: f.fileID,
    projectId: f.projectID,
    fileName: '',
    source: 'curseforge' as const,
    required: f.required !== false,
  }))

  return {
    format: 'curseforge',
    name: manifest.name || 'Unknown',
    version: manifest.version || '1.0',
    author: manifest.author || '',
    description: '',
    gameVersion: manifest.minecraft?.version || '',
    modLoader: manifest.minecraft?.modLoaders?.find((l: any) => l.primary)?.id || '',
    modLoaderVersion: manifest.minecraft?.modLoaders?.find((l: any) => l.primary)?.id || '',
    mods,
    configs: [],
    overridesDir: manifest.overrides || 'overrides',
  }
}

export function parseModrinthManifest(raw: any): ModpackManifest {
  const manifest = typeof raw === 'string' ? JSON.parse(raw) : raw
  const mods: ModpackModEntry[] = (manifest.files || []).map((f: any) => ({
    fileName: f.path?.split('/').pop() || '',
    downloadUrl: f.downloads?.[0] || '',
    hash: f.hashes?.sha1 || f.hashes?.sha512,
    size: f.fileSize,
    source: 'modrinth' as const,
    required: f.env?.client !== 'optional',
    folderPath: f.path,
  }))

  const dep = manifest.dependencies || {}

  return {
    format: 'modrinth',
    name: manifest.name || 'Unknown',
    version: manifest.versionId || '1.0',
    author: '',
    description: manifest.summary || '',
    gameVersion: dep.minecraft || '',
    modLoader: dep.forge ? 'forge' : dep.fabric ? 'fabric' : dep.quilt ? 'quilt' : dep.neoforge ? 'neoforge' : '',
    modLoaderVersion: dep.forge || dep.fabric || dep.quilt || dep.neoforge || '',
    mods,
    configs: [],
  }
}

export function parseFTBManifest(raw: any): ModpackManifest {
  const manifest = typeof raw === 'string' ? JSON.parse(raw) : raw
  const mods: ModpackModEntry[] = []

  return {
    format: 'ftb',
    name: manifest.name || 'Unknown',
    version: manifest.version || '1.0',
    author: manifest.author || '',
    description: manifest.description || '',
    gameVersion: manifest.targets?.find((t: any) => t.type === 'minecraft')?.version || '',
    modLoader: manifest.targets?.find((t: any) => t.type === 'modloader')?.name || '',
    modLoaderVersion: manifest.targets?.find((t: any) => t.type === 'modloader')?.version || '',
    mods,
    configs: [],
  }
}

export function parseBonjourManifest(raw: any): ModpackManifest {
  const manifest = typeof raw === 'string' ? JSON.parse(raw) : raw
  return {
    format: 'bonjour',
    name: manifest.name || 'Unknown',
    version: manifest.version || '1.0',
    author: manifest.author || '',
    description: manifest.description || '',
    gameVersion: manifest.gameVersion || '',
    modLoader: manifest.modLoader || '',
    modLoaderVersion: manifest.modLoaderVersion || '',
    mods: manifest.mods || [],
    configs: manifest.configs || [],
    iconUrl: manifest.iconUrl,
  }
}

export function parseModpackManifest(raw: any, format: ModpackFormat): ModpackManifest {
  switch (format) {
    case 'curseforge': return parseCurseForgeManifest(raw)
    case 'modrinth': return parseModrinthManifest(raw)
    case 'ftb': return parseFTBManifest(raw)
    case 'bonjour': return parseBonjourManifest(raw)
    default: return parseCurseForgeManifest(raw)
  }
}

export function generateCurseForgeManifest(pack: ModpackManifest): any {
  return {
    minecraft: {
      version: pack.gameVersion,
      modLoaders: [{ id: pack.modLoader, primary: true }],
    },
    manifestType: 'minecraftModpack',
    manifestVersion: 1,
    name: pack.name,
    version: pack.version,
    author: pack.author,
    files: pack.mods.filter(m => m.projectId && m.fileId).map(m => ({
      projectID: m.projectId,
      fileID: m.fileId,
      required: m.required,
    })),
    overrides: 'overrides',
  }
}

export function generateModrinthManifest(pack: ModpackManifest): any {
  const loader = pack.modLoader || 'forge'
  const deps: Record<string, string> = { minecraft: pack.gameVersion }
  if (pack.modLoaderVersion) {
    deps[loader] = pack.modLoaderVersion
  }

  return {
    formatVersion: 1,
    game: 'minecraft',
    versionId: pack.version,
    name: pack.name,
    summary: pack.description,
    files: pack.mods.filter(m => m.downloadUrl).map(m => ({
      path: m.folderPath || `mods/${m.fileName}`,
      hashes: m.hash ? { sha1: m.hash } : {},
      downloads: [m.downloadUrl],
      fileSize: m.size || 0,
      env: { client: m.required ? 'required' : 'optional', server: 'optional' },
    })),
    dependencies: deps,
  }
}

export function generateBonjourManifest(pack: ModpackManifest): any {
  return {
    formatVersion: 1,
    format: 'bonjour',
    name: pack.name,
    version: pack.version,
    author: pack.author,
    description: pack.description,
    gameVersion: pack.gameVersion,
    modLoader: pack.modLoader || '',
    modLoaderVersion: pack.modLoaderVersion || '',
    mods: pack.mods,
    configs: pack.configs,
    iconUrl: pack.iconUrl,
  }
}
