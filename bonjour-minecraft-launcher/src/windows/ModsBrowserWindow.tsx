import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import {
  Search, Download, Package, AlertCircle, X, Loader2, Grid3X3, List,
  ExternalLink, RefreshCw, Eye
} from 'lucide-react'
import { modManager } from '../core/mod/modManager'
import WindowFrame from './WindowFrame'
import type {
  ModInfo, ModLoaderType, ModFile,
} from '../types/mod'

const getModGradient = (modId: string) => {
  const gradients = [
    'from-emerald-400/20 to-teal-500/20', 'from-blue-400/20 to-indigo-500/20',
    'from-violet-400/20 to-purple-500/20', 'from-amber-400/20 to-orange-500/20',
    'from-rose-400/20 to-pink-500/20', 'from-cyan-400/20 to-sky-500/20',
  ]
  let hash = 0
  for (let i = 0; i < modId.length; i++) hash = modId.charCodeAt(i) + ((hash << 5) - hash)
  return gradients[Math.abs(hash) % gradients.length]
}

const formatNumber = (n: number) => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`
  return String(n)
}

export default function ModsBrowserWindow() {
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ModInfo[]>([])
  const [isSearching, setIsSearching] = useState(false)
  const [selectedMod, setSelectedMod] = useState<ModInfo | null>(null)
  const [gameVersion, setGameVersion] = useState<string>('')
  const [modLoader, setModLoader] = useState<ModLoaderType | ''>('')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [sortBy, setSortBy] = useState<'relevance' | 'downloads' | 'updated' | 'newest'>('relevance')
  const [installingMods, setInstallingMods] = useState<Set<string>>(new Set())
  const [category, setCategory] = useState<string>('')
  const searchInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const gv = params.get('gameVersion')
    const ml = params.get('modLoader')
    if (gv) setGameVersion(gv)
    if (ml) setModLoader(ml as ModLoaderType)
  }, [])

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await modManager.searchMods({
        query: searchQuery,
        gameVersion: gameVersion || undefined,
        modLoader: modLoader || undefined,
        category: category || undefined,
        sortBy,
        limit: 50,
      })
      setSearchResults(result.mods)
    } catch (err) {
      console.error('Search failed:', err)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }, [searchQuery, gameVersion, modLoader, category, sortBy])

  const handleInstall = useCallback(async (mod: ModInfo) => {
    setInstallingMods(prev => new Set(prev).add(mod.id))
    try {
      const files = await modManager.getModVersions(mod.id, gameVersion, modLoader || undefined)
      if (files && files.length > 0) {
        const latestFile = files[0]
        if (latestFile.downloadUrl && latestFile.filename) {
          await modManager.installMod(latestFile.downloadUrl, latestFile.filename)
        }
      }
    } catch (err) {
      console.error('Install failed:', err)
    } finally {
      setInstallingMods(prev => {
        const next = new Set(prev)
        next.delete(mod.id)
        return next
      })
    }
  }, [gameVersion, modLoader])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  return (
    <WindowFrame title="模组浏览" icon={<Package className="w-4 h-4" />}>
      <div className="flex h-full">
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="shrink-0 p-3 space-y-2 border-b border-white/5">
            <div className="flex items-center gap-2">
              <div className="flex-1 relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-white/30" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="搜索模组... (Ctrl+K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  className="w-full pl-8 pr-3 py-1.5 text-sm rounded-lg bg-white/5 border border-white/10 text-white/80 placeholder-white/30 focus:outline-none focus:border-white/20"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="px-3 py-1.5 text-sm rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30 disabled:opacity-50"
              >
                {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : '搜索'}
              </button>
              <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
                <button
                  onClick={() => setViewMode('grid')}
                  className={`p-1 rounded ${viewMode === 'grid' ? 'bg-white/10' : ''}`}
                >
                  <Grid3X3 className="w-3.5 h-3.5 text-white/60" />
                </button>
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-1 rounded ${viewMode === 'list' ? 'bg-white/10' : ''}`}
                >
                  <List className="w-3.5 h-3.5 text-white/60" />
                </button>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs">
              <select
                value={gameVersion}
                onChange={e => setGameVersion(e.target.value)}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-xs"
              >
                <option value="">全部版本</option>
                <option value="1.21">1.21</option>
                <option value="1.20.4">1.20.4</option>
                <option value="1.20.1">1.20.1</option>
                <option value="1.19.4">1.19.4</option>
                <option value="1.18.2">1.18.2</option>
                <option value="1.16.5">1.16.5</option>
                <option value="1.12.2">1.12.2</option>
              </select>
              <select
                value={modLoader}
                onChange={e => setModLoader(e.target.value as ModLoaderType | '')}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-xs"
              >
                <option value="">全部加载器</option>
                <option value="fabric">Fabric</option>
                <option value="forge">Forge</option>
                <option value="quilt">Quilt</option>
                <option value="neoforge">NeoForge</option>
              </select>
              <select
                value={sortBy}
                onChange={e => setSortBy(e.target.value as any)}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-xs"
              >
                <option value="relevance">相关性</option>
                <option value="downloads">下载量</option>
                <option value="updated">最近更新</option>
                <option value="newest">最新发布</option>
              </select>
              <select
                value={category}
                onChange={e => setCategory(e.target.value)}
                className="px-2 py-1 rounded bg-white/5 border border-white/10 text-white/60 text-xs"
              >
                <option value="">全部分类</option>
                <option value="optimization">优化</option>
                <option value="technology">科技</option>
                <option value="magic">魔法</option>
                <option value="adventure">冒险</option>
                <option value="building">建筑</option>
                <option value="utility">工具</option>
                <option value="library">前置库</option>
              </select>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-3">
            {isSearching && (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-white/30" />
              </div>
            )}

            {!isSearching && searchResults.length === 0 && searchQuery && (
              <div className="flex flex-col items-center justify-center py-12 text-white/30">
                <Package className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">未找到匹配的模组</p>
              </div>
            )}

            {!isSearching && searchResults.length === 0 && !searchQuery && (
              <div className="flex flex-col items-center justify-center py-12 text-white/30">
                <Search className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm">搜索并安装模组</p>
                <p className="text-xs mt-1 text-white/20">输入关键词开始搜索，或使用筛选器缩小范围</p>
              </div>
            )}

            {!isSearching && searchResults.length > 0 && (
              <div className={viewMode === 'grid'
                ? 'grid grid-cols-2 lg:grid-cols-3 gap-3'
                : 'space-y-2'
              }>
                {searchResults.map(mod => (
                  <div
                    key={mod.id}
                    className={`group rounded-xl border border-white/5 overflow-hidden cursor-pointer transition-colors hover:border-white/10 ${
                      selectedMod?.id === mod.id ? 'border-blue-500/30 bg-blue-500/5' : 'bg-white/[0.02]'
                    }`}
                    onClick={() => setSelectedMod(mod)}
                  >
                    {viewMode === 'grid' ? (
                      <div className="p-3">
                        <div className={`w-full h-20 rounded-lg bg-gradient-to-br ${getModGradient(mod.id)} mb-2 flex items-center justify-center`}>
                          {mod.iconUrl ? (
                            <img src={mod.iconUrl} alt="" className="w-12 h-12 rounded-lg" />
                          ) : (
                            <Package className="w-8 h-8 text-white/20" />
                          )}
                        </div>
                        <h3 className="text-sm font-medium text-white/80 truncate">{mod.name}</h3>
                        <p className="text-xs text-white/40 mt-0.5 line-clamp-2">{mod.description}</p>
                        <div className="flex items-center gap-2 mt-2 text-xs text-white/30">
                          <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{formatNumber(mod.downloads ?? 0)}</span>
                          {mod.modLoader && <span className="px-1 py-0.5 rounded bg-white/5">{mod.modLoader}</span>}
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3">
                        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getModGradient(mod.id)} flex items-center justify-center shrink-0`}>
                          {mod.iconUrl ? (
                            <img src={mod.iconUrl} alt="" className="w-8 h-8 rounded-lg" />
                          ) : (
                            <Package className="w-5 h-5 text-white/20" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-sm font-medium text-white/80 truncate">{mod.name}</h3>
                          <p className="text-xs text-white/40 truncate">{mod.description}</p>
                        </div>
                        <div className="flex items-center gap-2 text-xs text-white/30 shrink-0">
                          <span className="flex items-center gap-0.5"><Download className="w-3 h-3" />{formatNumber(mod.downloads ?? 0)}</span>
                          <button
                            onClick={e => { e.stopPropagation(); handleInstall(mod) }}
                            disabled={installingMods.has(mod.id)}
                            className="px-2 py-1 rounded bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50"
                          >
                            {installingMods.has(mod.id) ? <Loader2 className="w-3 h-3 animate-spin" /> : '安装'}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {selectedMod && (
          <div
            className="shrink-0 border-l border-white/5 overflow-y-auto"
            style={{ width: 320 }}
          >
              <div className="p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${getModGradient(selectedMod.id)} flex items-center justify-center`}>
                      {selectedMod.iconUrl ? (
                        <img src={selectedMod.iconUrl} alt="" className="w-8 h-8 rounded-lg" />
                      ) : (
                        <Package className="w-5 h-5 text-white/20" />
                      )}
                    </div>
                    <div>
                      <h3 className="text-sm font-medium text-white/90">{selectedMod.name}</h3>
                      <p className="text-xs text-white/40">by {selectedMod.authors?.join(', ') || '未知'}</p>
                    </div>
                  </div>
                  <button onClick={() => setSelectedMod(null)} className="p-1 hover:bg-white/5 rounded">
                    <X className="w-4 h-4 text-white/40" />
                  </button>
                </div>

                <p className="text-xs text-white/50 leading-relaxed">{selectedMod.description}</p>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-white/30 mb-0.5">下载量</div>
                    <div className="text-white/70">{formatNumber(selectedMod.downloads ?? 0)}</div>
                  </div>
                  <div className="p-2 rounded-lg bg-white/[0.03]">
                    <div className="text-white/30 mb-0.5">加载器</div>
                    <div className="text-white/70">{selectedMod.modLoader || '通用'}</div>
                  </div>
                </div>

                <button
                  onClick={() => handleInstall(selectedMod)}
                  disabled={installingMods.has(selectedMod.id)}
                  className="w-full py-2 rounded-lg bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                >
                  {installingMods.has(selectedMod.id) ? (
                    <><Loader2 className="w-4 h-4 animate-spin" />安装中...</>
                  ) : (
                    <><Download className="w-4 h-4" />安装模组</>
                  )}
                </button>

                {selectedMod.projectUrl && (
                  <a
                    href={selectedMod.projectUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs text-blue-400/70 hover:text-blue-400"
                  >
                    <ExternalLink className="w-3 h-3" />
                    在平台上查看
                  </a>
                )}
              </div>
            </div>
          )}
      </div>
    </WindowFrame>
  )
}
