import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Palette, Sparkles, Paintbrush, Bell, FolderHeart, Database,
  Box, Search, Plus, Download, Trash2, ToggleLeft, ToggleRight,
  ChevronRight, Star, X, Upload, Eye, Settings, ArrowUpDown,
  Package, Layers, Grid3x3, FileBox, Globe, Filter,
} from 'lucide-react'
import { resourceManager } from '../core/resource'
import type {
  ResourcePack, ShaderPackEnhanced, Datapack, StructureFile,
  GlobalResourceIndex, ResourceSearchResult, ResourceType,
  ShaderPerformanceTier, ContentCollection, CollectionItem,
  ContentSubscription, ContentSubscriptionNotification,
} from '../types/resource'
import {
  SHADER_PERFORMANCE_PROFILES, SHADER_CONFIG_TEMPLATES,
  KNOWN_SHADER_PACKS, RESOURCE_TYPE_LABELS, COLLECTION_THEME_PRESETS,
} from '../types/resource'
import type { ModInfo, ModSearchResult } from '../types/mod'

type ResourceTab = 'resourcepack' | 'shader' | 'workshop' | 'subscription' | 'collection' | 'datapack' | 'structure' | 'global'

interface ResourcePageProps {
  selectedInstanceId?: string | null
}

const TAB_CONFIG: { id: ResourceTab; label: string; icon: any; desc: string }[] = [
  { id: 'resourcepack', label: '资源包', icon: Palette, desc: '材质、音效、模型' },
  { id: 'shader', label: '光影包', icon: Sparkles, desc: '光影渲染效果' },
  { id: 'workshop', label: '创作工坊', icon: Paintbrush, desc: '自制材质包' },
  { id: 'subscription', label: '更新订阅', icon: Bell, desc: '关注更新动态' },
  { id: 'collection', label: '内容合集', icon: FolderHeart, desc: '主题资源合集' },
  { id: 'datapack', label: '数据包', icon: Database, desc: '自定义游戏规则' },
  { id: 'structure', label: '结构文件', icon: Box, desc: '建筑蓝图' },
  { id: 'global', label: '全局搜索', icon: Search, desc: '搜索所有资源' },
]

export default function ResourcePage({ selectedInstanceId }: ResourcePageProps) {
  const [activeTab, setActiveTab] = useState<ResourceTab>('resourcepack')
  const [instanceId, setInstanceId] = useState<string>('')

  useEffect(() => {
    if (selectedInstanceId) setInstanceId(selectedInstanceId)
  }, [selectedInstanceId])

  useEffect(() => {
    if (!instanceId) {
      window.minecraftAPI.getInstances().then(instances => {
        if (instances.length > 0) setInstanceId(instances[0].id)
      })
    }
  }, [instanceId])

  return (
    <div className="h-full flex flex-col overflow-hidden" style={{ color: 'var(--text-primary)' }}>
      <div className="px-6 pt-8 pb-4">
        <h1 className="text-2xl font-bold mb-1" style={{ color: 'var(--text-primary)' }}>资源与内容生态</h1>
        <p className="text-sm" style={{ color: 'var(--text-muted)' }}>管理资源包、光影、数据包、结构文件等所有内容资源</p>
      </div>

      <div className="px-6 pb-3">
        <div className="flex gap-1 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
          {TAB_CONFIG.map(tab => {
            const Icon = tab.icon
            const isActive = activeTab === tab.id
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all"
                style={{
                  background: isActive ? 'rgba(74, 222, 128, 0.15)' : 'transparent',
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-24">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === 'resourcepack' && <ResourcePackPanel instanceId={instanceId} />}
            {activeTab === 'shader' && <ShaderPackPanel instanceId={instanceId} />}
            {activeTab === 'workshop' && <TextureWorkshopPanel />}
            {activeTab === 'subscription' && <SubscriptionPanel />}
            {activeTab === 'collection' && <CollectionPanel instanceId={instanceId} />}
            {activeTab === 'datapack' && <DatapackPanel instanceId={instanceId} />}
            {activeTab === 'structure' && <StructurePanel instanceId={instanceId} />}
            {activeTab === 'global' && <GlobalSearchPanel />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
}

// ===== #71 资源包管理 =====
function ResourcePackPanel({ instanceId }: { instanceId: string }) {
  const [packs, setPacks] = useState<ResourcePack[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ModSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedPack, setSelectedPack] = useState<ResourcePack | null>(null)

  const loadPacks = useCallback(async () => {
    if (!instanceId) return
    try {
      const result = await resourceManager.scanResourcePacks(instanceId)
      setPacks(result)
    } catch {}
  }, [instanceId])

  useEffect(() => { loadPacks() }, [loadPacks])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await resourceManager.searchResourcePacks({ query: searchQuery, limit: 20 })
      setSearchResults(result)
    } catch {} finally { setIsSearching(false) }
  }

  const handleToggle = async (pack: ResourcePack) => {
    try {
      await resourceManager.toggleResourcePack(instanceId, pack.filePath, !pack.isEnabled)
      loadPacks()
    } catch {}
  }

  const handleDelete = async (pack: ResourcePack) => {
    try {
      await resourceManager.deleteResourcePack(instanceId, pack.filePath)
      loadPacks()
    } catch {}
  }

  const handleAddLocal = async () => {
    try {
      const filePath = await resourceManager.selectResourcePackFile()
      if (filePath) {
        await resourceManager.addResourcePack(instanceId, filePath)
        loadPacks()
      }
    } catch {}
  }

  const handleInstallFromSearch = async (mod: ModInfo) => {
    if (!mod.downloadUrl && !mod.sourceId) return
    try {
      const versions = await (mod.source === 'curseforge'
        ? (await import('../api/curseforge')).curseforgeAPI.getModVersions(mod.sourceId)
        : (await import('../api/modrinth')).modrinthAPI.getModVersions(mod.sourceId))
      if (versions.length > 0) {
        const version = versions.find(v => v.releaseType === 'release') || versions[0]
        if (version.downloadUrl) {
          const targetPath = `${instanceId}/resourcepacks/${version.filename || mod.id + '.zip'}`
          await window.minecraftAPI.downloadFile(version.downloadUrl, targetPath)
          loadPacks()
        }
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">资源包管理</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>可视化资源包管理 — 预览材质、拖拽排序、一键启用/禁用</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: showSearch ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-secondary)', color: showSearch ? 'var(--accent)' : 'var(--text-secondary)' }}
          >
            <Search className="w-3.5 h-3.5" /> 在线搜索
          </button>
          <button
            onClick={handleAddLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all"
            style={{ background: 'var(--accent)', color: '#000' }}
          >
            <Plus className="w-3.5 h-3.5" /> 添加本地
          </button>
        </div>
      </div>

      {showSearch && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} className="space-y-3">
          <div className="flex gap-2">
            <input
              type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索资源包..."
              className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }}
            />
            <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#000' }}>
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
          {searchResults && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.mods.map(mod => (
                <div key={mod.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                  {mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-8 h-8 rounded" />}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{mod.chineseName || mod.name}</p>
                    <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{mod.description?.slice(0, 60)}</p>
                  </div>
                  <button onClick={() => handleInstallFromSearch(mod)} className="p-1.5 rounded-lg" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              {searchResults.mods.length === 0 && <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>未找到结果</p>}
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-2">
        {packs.map((pack, index) => (
          <motion.div
            key={pack.id}
            layout
            className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
            style={{ background: 'var(--bg-secondary)', opacity: pack.isEnabled ? 1 : 0.5 }}
            onClick={() => setSelectedPack(selectedPack?.id === pack.id ? null : pack)}
          >
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(74, 222, 128, 0.1)' }}>
              <Palette className="w-5 h-5" style={{ color: 'var(--accent)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{pack.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {pack.packFormat && `格式 ${pack.packFormat} · `}{(pack.fileSize / 1024).toFixed(1)} KB
                {pack.compatibleVersions && ` · ${pack.compatibleVersions.join(', ')}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={e => { e.stopPropagation(); handleToggle(pack) }} className="p-1 rounded transition-colors">
                {pack.isEnabled ? <ToggleRight className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <ToggleLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
              </button>
              <button onClick={e => { e.stopPropagation(); handleDelete(pack) }} className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
              </button>
            </div>
          </motion.div>
        ))}
        {packs.length === 0 && (
          <div className="text-center py-12">
            <Palette className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无资源包</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>点击「添加本地」或「在线搜索」安装资源包</p>
          </div>
        )}
      </div>

      {selectedPack && (
        <ResourcePackDetailPanel pack={selectedPack} onClose={() => setSelectedPack(null)} onToggle={() => handleToggle(selectedPack)} />
      )}
    </div>
  )
}

function ResourcePackDetailPanel({ pack, onClose, onToggle }: { pack: ResourcePack; onClose: () => void; onToggle: () => void }) {
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
      className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{pack.name}</h3>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
      </div>
      {pack.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{pack.description}</p>}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div><span style={{ color: 'var(--text-muted)' }}>文件名：</span>{pack.fileName}</div>
        <div><span style={{ color: 'var(--text-muted)' }}>大小：</span>{(pack.fileSize / 1024).toFixed(1)} KB</div>
        {pack.packFormat && <div><span style={{ color: 'var(--text-muted)' }}>格式版本：</span>{pack.packFormat}</div>}
        <div><span style={{ color: 'var(--text-muted)' }}>状态：</span>{pack.isEnabled ? '已启用' : '已禁用'}</div>
      </div>
      <div className="flex gap-2">
        <button onClick={onToggle} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
          {pack.isEnabled ? '禁用' : '启用'}
        </button>
      </div>
    </motion.div>
  )
}

// ===== #72 光影包一站式体验 =====
function ShaderPackPanel({ instanceId }: { instanceId: string }) {
  const [shaders, setShaders] = useState<ShaderPackEnhanced[]>([])
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<ModSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)
  const [selectedShader, setSelectedShader] = useState<ShaderPackEnhanced | null>(null)
  const [showConfig, setShowConfig] = useState(false)

  const loadShaders = useCallback(async () => {
    if (!instanceId) return
    try {
      const result = await resourceManager.scanShaderPacks(instanceId)
      setShaders(result)
    } catch {}
  }, [instanceId])

  useEffect(() => { loadShaders() }, [loadShaders])

  const handleSearch = async () => {
    if (!searchQuery.trim()) return
    setIsSearching(true)
    try {
      const result = await resourceManager.searchShaderPacks({ query: searchQuery, limit: 20 })
      setSearchResults(result)
    } catch {} finally { setIsSearching(false) }
  }

  const handleToggle = async (shader: ShaderPackEnhanced) => {
    try {
      await window.minecraftAPI.toggleShaderPack(instanceId, shader.filePath, !shader.isEnabled)
      loadShaders()
    } catch {}
  }

  const handleDelete = async (shader: ShaderPackEnhanced) => {
    try {
      await window.minecraftAPI.deleteShaderPack(instanceId, shader.filePath)
      loadShaders()
    } catch {}
  }

  const handleAddLocal = async () => {
    try {
      const filePath = await window.minecraftAPI.selectShaderFile()
      if (filePath) {
        await window.minecraftAPI.addShaderPack(instanceId, filePath)
        loadShaders()
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">光影包一站式体验</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>内置光影市场、效果预览、性能评级、配置预设</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowSearch(!showSearch)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: showSearch ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-secondary)', color: showSearch ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <Search className="w-3.5 h-3.5" /> 光影市场
          </button>
          <button onClick={handleAddLocal}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /> 添加
          </button>
        </div>
      </div>

      {showSearch && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-3">
          <div className="flex gap-2">
            <input type="text" value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSearch()}
              placeholder="搜索光影包..." className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
              style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
            <button onClick={handleSearch} disabled={isSearching} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#000' }}>
              {isSearching ? '搜索中...' : '搜索'}
            </button>
          </div>
          {searchResults && (
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {searchResults.mods.map(mod => {
                const idNorm = mod.id.toLowerCase().replace(/[\s_-]/g, '')
                const knownInfo = Object.entries(KNOWN_SHADER_PACKS).find(([key]) => idNorm.includes(key.replace(/[\s_-]/g, '')))
                const tier = knownInfo ? knownInfo[1].performanceTier : 'medium'
                const profile = SHADER_PERFORMANCE_PROFILES[tier]
                return (
                  <div key={mod.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
                    {mod.iconUrl && <img src={mod.iconUrl} alt="" className="w-8 h-8 rounded" />}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <p className="text-sm font-medium truncate">{mod.chineseName || mod.name}</p>
                        <span className="text-xs px-1.5 py-0.5 rounded" style={{ background: `${profile.color}20`, color: profile.color }}>{profile.emoji} {profile.label}</span>
                      </div>
                      <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{knownInfo ? knownInfo[1].description : mod.description?.slice(0, 60)}</p>
                    </div>
                    <button className="p-1.5 rounded-lg" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </motion.div>
      )}

      <div className="space-y-2">
        {shaders.map(shader => {
          const profile = SHADER_PERFORMANCE_PROFILES[shader.performanceTier || 'medium']
          return (
            <motion.div key={shader.id} layout
              className="flex items-center gap-3 p-3 rounded-xl cursor-pointer group"
              style={{ background: 'var(--bg-secondary)', opacity: shader.isEnabled ? 1 : 0.5 }}
              onClick={() => setSelectedShader(selectedShader?.id === shader.id ? null : shader)}>
              <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: `${profile.color}15` }}>
                <Sparkles className="w-5 h-5" style={{ color: profile.color }} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{shader.name}</p>
                  <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: `${profile.color}20`, color: profile.color }}>
                    {profile.emoji} {profile.label}
                  </span>
                </div>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {shader.author && `${shader.author} · `}{(shader.fileSize / 1024).toFixed(1)} KB
                  {shader.compatibleRenderers && ` · ${shader.compatibleRenderers.join('/')}`}
                </p>
              </div>
              <div className="flex items-center gap-1">
                <button onClick={e => { e.stopPropagation(); setShowConfig(true) }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <Settings className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
                </button>
                <button onClick={e => { e.stopPropagation(); handleToggle(shader) }} className="p-1 rounded">
                  {shader.isEnabled ? <ToggleRight className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <ToggleLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
                </button>
                <button onClick={e => { e.stopPropagation(); handleDelete(shader) }}
                  className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
                </button>
              </div>
            </motion.div>
          )
        })}
        {shaders.length === 0 && (
          <div className="text-center py-12">
            <Sparkles className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无光影包</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>从光影市场下载或添加本地光影文件</p>
          </div>
        )}
      </div>

      {selectedShader && showConfig && (
        <ShaderConfigPanel shader={selectedShader} onClose={() => setShowConfig(false)} />
      )}

      {selectedShader && !showConfig && (
        <ShaderDetailPanel shader={selectedShader} onClose={() => setSelectedShader(null)} onToggle={() => handleToggle(selectedShader)} onShowConfig={() => setShowConfig(true)} />
      )}
    </div>
  )
}

function ShaderDetailPanel({ shader, onClose, onToggle, onShowConfig }: { shader: ShaderPackEnhanced; onClose: () => void; onToggle: () => void; onShowConfig: () => void }) {
  const profile = SHADER_PERFORMANCE_PROFILES[shader.performanceTier || 'medium']
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">{shader.name}</h3>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
      </div>
      {shader.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{shader.description}</p>}
      <div className="p-2.5 rounded-lg" style={{ background: `${profile.color}10` }}>
        <div className="flex items-center gap-2 mb-1">
          <span className="text-sm">{profile.emoji}</span>
          <span className="text-xs font-medium" style={{ color: profile.color }}>性能评级：{profile.label}</span>
        </div>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{profile.description}</p>
        <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>最低显卡：{profile.minGPU} · 预期FPS：{profile.expectedFPS.low}-{profile.expectedFPS.high}</p>
      </div>
      {shader.compatibleRenderers && (
        <div className="text-xs"><span style={{ color: 'var(--text-muted)' }}>兼容渲染器：</span>{shader.compatibleRenderers.join(', ')}</div>
      )}
      <div className="flex gap-2">
        <button onClick={onToggle} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
          {shader.isEnabled ? '禁用' : '启用'}
        </button>
        <button onClick={onShowConfig} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>
          <Settings className="w-3.5 h-3.5 inline mr-1" />配置预设
        </button>
      </div>
    </motion.div>
  )
}

function ShaderConfigPanel({ shader, onClose }: { shader: ShaderPackEnhanced; onClose: () => void }) {
  const [selectedPreset, setSelectedPreset] = useState<ShaderPerformanceTier>('medium')
  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
      className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">光影配置预设 — {shader.name}</h3>
        <button onClick={onClose}><X className="w-4 h-4" style={{ color: 'var(--text-muted)' }} /></button>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {Object.entries(SHADER_CONFIG_TEMPLATES).map(([key, template]) => {
          const profile = SHADER_PERFORMANCE_PROFILES[key as ShaderPerformanceTier]
          const isSelected = selectedPreset === key
          return (
            <button key={key} onClick={() => setSelectedPreset(key as ShaderPerformanceTier)}
              className="p-3 rounded-lg text-left transition-all"
              style={{
                background: isSelected ? `${profile.color}20` : 'var(--bg-tertiary)',
                border: isSelected ? `1px solid ${profile.color}` : '1px solid transparent',
              }}>
              <div className="flex items-center gap-1.5 mb-1">
                <span className="text-sm">{profile.emoji}</span>
                <span className="text-xs font-medium" style={{ color: isSelected ? profile.color : 'var(--text-primary)' }}>{template.label}</span>
              </div>
              <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{template.description}</p>
            </button>
          )
        })}
      </div>
      {SHADER_CONFIG_TEMPLATES[selectedPreset] && (
        <div className="space-y-1.5 p-3 rounded-lg" style={{ background: 'var(--bg-tertiary)' }}>
          <p className="text-xs font-medium mb-2">配置详情</p>
          {Object.entries(SHADER_CONFIG_TEMPLATES[selectedPreset].settings).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between text-xs">
              <span style={{ color: 'var(--text-muted)' }}>{key}</span>
              <span>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
      <button className="w-full px-3 py-2 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: '#000' }}>
        应用配置
      </button>
    </motion.div>
  )
}

// ===== #73 资源创作工坊 =====
function TextureWorkshopPanel() {
  const [projects, setProjects] = useState<any[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')

  useEffect(() => {
    resourceManager.getTextureProjects().then(setProjects).catch(() => setProjects([]))
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const project = await resourceManager.createTextureProject(newName, newDesc, 32)
      setProjects(prev => [...prev, project])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
    } catch {}
  }

  const handleExport = async (projectId: string) => {
    try {
      const path = await resourceManager.exportTextureProject(projectId)
      if (path) alert(`资源包已导出到: ${path}`)
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">资源创作工坊</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>内置轻量材质编辑器 — 选方块→拖入图案→实时预览→导出资源包</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--accent)', color: '#000' }}>
          <Plus className="w-3.5 h-3.5" /> 新建项目
        </button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold">创建材质包项目</h3>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="项目名称"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="项目描述" rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: '#000' }}>创建</button>
            <button onClick={() => setShowCreate(false)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>取消</button>
          </div>
        </motion.div>
      )}

      <div className="space-y-2">
        {projects.map(project => (
          <div key={project.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168, 85, 247, 0.1)' }}>
              <Paintbrush className="w-5 h-5" style={{ color: '#a855f7' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium">{project.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{project.description || '无描述'} · {project.textures?.length || 0} 个纹理</p>
            </div>
            <button onClick={() => handleExport(project.id)} className="p-1.5 rounded-lg" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
        {projects.length === 0 && (
          <div className="text-center py-12">
            <Paintbrush className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无创作项目</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>点击「新建项目」开始创作你的材质包</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== #74 内容更新订阅 =====
function SubscriptionPanel() {
  const [subscriptions, setSubscriptions] = useState<ContentSubscription[]>([])
  const [notifications, setNotifications] = useState<ContentSubscriptionNotification[]>([])
  const [showNotifs, setShowNotifs] = useState(false)

  useEffect(() => {
    resourceManager.getSubscriptions().then(s => setSubscriptions(s as any)).catch(() => {})
    resourceManager.getSubscriptionNotifications().then(n => setNotifications(n as any)).catch(() => {})
  }, [])

  const handleRemove = async (subId: string) => {
    try {
      await resourceManager.removeSubscription(subId)
      setSubscriptions(prev => prev.filter(s => s.id !== subId))
    } catch {}
  }

  const handleCheckUpdates = async () => {
    try {
      const updates = await resourceManager.checkSubscriptionUpdates()
      if (updates.length > 0) {
        resourceManager.getSubscriptionNotifications().then(n => setNotifications(n as any))
      }
    } catch {}
  }

  const unreadCount = notifications.filter(n => !n.read).length

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">内容更新订阅</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>订阅特定资源/模组/光影的更新通知，作者发布新版本时主动推送</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNotifs(!showNotifs)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium relative"
            style={{ background: showNotifs ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-secondary)', color: showNotifs ? 'var(--accent)' : 'var(--text-secondary)' }}>
            <Bell className="w-3.5 h-3.5" /> 通知
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[10px] flex items-center justify-center" style={{ background: '#ef4444', color: '#fff' }}>{unreadCount}</span>
            )}
          </button>
          <button onClick={handleCheckUpdates}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#000' }}>
            检查更新
          </button>
        </div>
      </div>

      {showNotifs && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="space-y-2 max-h-64 overflow-y-auto">
          {notifications.map(notif => (
            <div key={notif.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: notif.read ? 'var(--bg-secondary)' : 'rgba(74, 222, 128, 0.05)', borderLeft: notif.read ? 'none' : '3px solid var(--accent)' }}>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium">{notif.resourceName} 更新</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{notif.message}</p>
              </div>
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{new Date(notif.timestamp).toLocaleDateString()}</span>
            </div>
          ))}
          {notifications.length === 0 && <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>暂无通知</p>}
        </motion.div>
      )}

      <div className="space-y-2">
        {subscriptions.map(sub => (
          <div key={sub.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)' }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(234, 179, 8, 0.1)' }}>
              <Bell className="w-5 h-5" style={{ color: '#eab308' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{sub.resourceName}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {RESOURCE_TYPE_LABELS[sub.resourceType]?.label || sub.resourceType} · {sub.source} · 当前版本 {sub.currentVersion || '未知'}
              </p>
            </div>
            <button onClick={() => handleRemove(sub.id)} className="p-1 rounded">
              <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
            </button>
          </div>
        ))}
        {subscriptions.length === 0 && (
          <div className="text-center py-12">
            <Bell className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无订阅</p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>浏览资源时点击订阅按钮即可关注更新</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== #75 内容合集 =====
function CollectionPanel({ instanceId }: { instanceId: string }) {
  const [collections, setCollections] = useState<ContentCollection[]>([])
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedTheme, setSelectedTheme] = useState<string>('')

  useEffect(() => {
    resourceManager.getCollections().then(c => setCollections(c as any)).catch(() => {})
  }, [])

  const handleCreate = async () => {
    if (!newName.trim()) return
    try {
      const collection = await resourceManager.createCollection({
        name: newName, description: newDesc, tags: selectedTheme ? COLLECTION_THEME_PRESETS[selectedTheme]?.tags || [] : [],
        items: [], isPublic: false,
      })
      setCollections(prev => [...prev, collection as any])
      setShowCreate(false)
      setNewName('')
      setNewDesc('')
      setSelectedTheme('')
    } catch {}
  }

  const handleInstall = async (collectionId: string) => {
    if (!instanceId) return
    try {
      await resourceManager.installCollection(collectionId, instanceId)
    } catch {}
  }

  const handleDelete = async (collectionId: string) => {
    try {
      await resourceManager.deleteCollection(collectionId)
      setCollections(prev => prev.filter(c => c.id !== collectionId))
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">内容合集</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>创建主题合集 — 配套模组+资源包+光影一键安装</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--accent)', color: '#000' }}>
          <Plus className="w-3.5 h-3.5" /> 创建合集
        </button>
      </div>

      {showCreate && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl space-y-3" style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border-subtle)' }}>
          <h3 className="text-sm font-semibold">创建内容合集</h3>
          <input type="text" value={newName} onChange={e => setNewName(e.target.value)} placeholder="合集名称"
            className="w-full px-3 py-2 rounded-lg text-sm outline-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="合集描述" rows={2}
            className="w-full px-3 py-2 rounded-lg text-sm outline-none resize-none"
            style={{ background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
          <div>
            <p className="text-xs mb-2" style={{ color: 'var(--text-muted)' }}>选择主题模板</p>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(COLLECTION_THEME_PRESETS).map(([key, preset]) => (
                <button key={key} onClick={() => setSelectedTheme(key)}
                  className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
                  style={{ background: selectedTheme === key ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-tertiary)', color: selectedTheme === key ? 'var(--accent)' : 'var(--text-secondary)' }}>
                  {preset.icon} {preset.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--accent)', color: '#000' }}>创建</button>
            <button onClick={() => setShowCreate(false)} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-secondary)' }}>取消</button>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {collections.map(collection => (
          <div key={collection.id} className="p-3 rounded-xl space-y-2" style={{ background: 'var(--bg-secondary)' }}>
            <div className="flex items-center gap-2">
              <span className="text-lg">{collection.icon || '📁'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{collection.name}</p>
                <p className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{collection.items.length} 项 · {collection.tags.join(', ')}</p>
              </div>
            </div>
            {collection.description && <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{collection.description}</p>}
            <div className="flex gap-1.5">
              <button onClick={() => handleInstall(collection.id)} className="flex-1 px-2 py-1 rounded-lg text-[10px] font-medium" style={{ background: 'rgba(74, 222, 128, 0.15)', color: 'var(--accent)' }}>
                <Download className="w-3 h-3 inline mr-0.5" />安装
              </button>
              <button onClick={() => handleDelete(collection.id)} className="px-2 py-1 rounded-lg text-[10px]" style={{ color: '#ef4444' }}>
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
      {collections.length === 0 && (
        <div className="text-center py-12">
          <FolderHeart className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无内容合集</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>创建主题合集，将配套资源打包一键安装</p>
        </div>
      )}
    </div>
  )
}

// ===== #76 数据包管理 =====
function DatapackPanel({ instanceId }: { instanceId: string }) {
  const [datapacks, setDatapacks] = useState<Datapack[]>([])
  const [worldName, setWorldName] = useState<string | undefined>(undefined)
  const [showGlobal, setShowGlobal] = useState(true)

  const loadDatapacks = useCallback(async () => {
    if (!instanceId) return
    try {
      const result = await resourceManager.scanDatapacks(instanceId, showGlobal ? undefined : worldName)
      setDatapacks(result)
    } catch {}
  }, [instanceId, worldName, showGlobal])

  useEffect(() => { loadDatapacks() }, [loadDatapacks])

  const handleToggle = async (pack: Datapack) => {
    try {
      await resourceManager.toggleDatapack(instanceId, pack.filePath, !pack.isEnabled, pack.worldName)
      loadDatapacks()
    } catch {}
  }

  const handleDelete = async (pack: Datapack) => {
    try {
      await resourceManager.deleteDatapack(instanceId, pack.filePath, pack.worldName)
      loadDatapacks()
    } catch {}
  }

  const handleAdd = async () => {
    try {
      const filePath = await resourceManager.selectDatapackFile()
      if (filePath) {
        await resourceManager.addDatapack(instanceId, filePath, worldName)
        loadDatapacks()
      }
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">数据包管理</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>可视化管理数据包 — 世界级/全局级，启用/禁用，更新检测</p>
        </div>
        <div className="flex gap-2">
          <div className="flex rounded-lg overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
            <button onClick={() => setShowGlobal(true)} className="px-2 py-1 text-[10px]"
              style={{ background: showGlobal ? 'rgba(74, 222, 128, 0.15)' : 'transparent', color: showGlobal ? 'var(--accent)' : 'var(--text-muted)' }}>全局</button>
            <button onClick={() => setShowGlobal(false)} className="px-2 py-1 text-[10px]"
              style={{ background: !showGlobal ? 'rgba(74, 222, 128, 0.15)' : 'transparent', color: !showGlobal ? 'var(--accent)' : 'var(--text-muted)' }}>世界</button>
          </div>
          <button onClick={handleAdd}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
            style={{ background: 'var(--accent)', color: '#000' }}>
            <Plus className="w-3.5 h-3.5" /> 添加
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {datapacks.map(pack => (
          <div key={pack.id} className="flex items-center gap-3 p-3 rounded-xl" style={{ background: 'var(--bg-secondary)', opacity: pack.isEnabled ? 1 : 0.5 }}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(59, 130, 246, 0.1)' }}>
              <Database className="w-5 h-5" style={{ color: '#3b82f6' }} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-medium truncate">{pack.name}</p>
                <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: pack.scope === 'global' ? 'rgba(168, 85, 247, 0.15)' : 'rgba(59, 130, 246, 0.15)', color: pack.scope === 'global' ? '#a855f7' : '#3b82f6' }}>
                  {pack.scope === 'global' ? '全局' : '世界'}
                </span>
              </div>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {pack.packFormat && `格式 ${pack.packFormat} · `}{(pack.fileSize / 1024).toFixed(1)} KB
                {pack.worldName && ` · ${pack.worldName}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => handleToggle(pack)} className="p-1 rounded">
                {pack.isEnabled ? <ToggleRight className="w-5 h-5" style={{ color: 'var(--accent)' }} /> : <ToggleLeft className="w-5 h-5" style={{ color: 'var(--text-muted)' }} />}
              </button>
              <button onClick={() => handleDelete(pack)} className="p-1 rounded">
                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>
        ))}
        {datapacks.length === 0 && (
          <div className="text-center py-12">
            <Database className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无数据包</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== #77 存档结构文件管理 =====
function StructurePanel({ instanceId }: { instanceId: string }) {
  const [structures, setStructures] = useState<StructureFile[]>([])
  const [selectedStructure, setSelectedStructure] = useState<StructureFile | null>(null)

  const loadStructures = useCallback(async () => {
    if (!instanceId) return
    try {
      const result = await resourceManager.scanStructures(instanceId)
      setStructures(result)
    } catch {}
  }, [instanceId])

  useEffect(() => { loadStructures() }, [loadStructures])

  const handleImport = async () => {
    try {
      const filePath = await resourceManager.selectStructureFile()
      if (filePath) {
        await resourceManager.importStructure(instanceId, filePath)
        loadStructures()
      }
    } catch {}
  }

  const handleDelete = async (structure: StructureFile) => {
    try {
      await resourceManager.deleteStructure(instanceId, structure.filePath)
      loadStructures()
    } catch {}
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">结构文件管理</h2>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>管理 structures 文件夹中的结构文件，支持预览、分类、导入/导出</p>
        </div>
        <button onClick={handleImport}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
          style={{ background: 'var(--accent)', color: '#000' }}>
          <Upload className="w-3.5 h-3.5" /> 导入
        </button>
      </div>

      <div className="space-y-2">
        {structures.map(structure => (
          <div key={structure.id} className="flex items-center gap-3 p-3 rounded-xl cursor-pointer"
            style={{ background: 'var(--bg-secondary)' }}
            onClick={() => setSelectedStructure(selectedStructure?.id === structure.id ? null : structure)}>
            <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(249, 115, 22, 0.1)' }}>
              <Box className="w-5 h-5" style={{ color: '#f97316' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{structure.name}</p>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {(structure.fileSize / 1024).toFixed(1)} KB
                {structure.dimensions && ` · ${structure.dimensions.x}x${structure.dimensions.y}x${structure.dimensions.z}`}
                {structure.author && ` · ${structure.author}`}
              </p>
            </div>
            <div className="flex items-center gap-1">
              {structure.tags.length > 0 && structure.tags.map(tag => (
                <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--bg-tertiary)', color: 'var(--text-muted)' }}>{tag}</span>
              ))}
              <button onClick={e => { e.stopPropagation(); handleDelete(structure) }} className="p-1 rounded">
                <Trash2 className="w-4 h-4" style={{ color: '#ef4444' }} />
              </button>
            </div>
          </div>
        ))}
        {structures.length === 0 && (
          <div className="text-center py-12">
            <Box className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>暂无结构文件</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ===== #78 全局资源索引 =====
function GlobalSearchPanel() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<ResourceSearchResult | null>(null)
  const [isSearching, setIsSearching] = useState(false)
  const [selectedTypes, setSelectedTypes] = useState<ResourceType[]>([])
  const [indexSize, setIndexSize] = useState(0)

  useEffect(() => {
    resourceManager.buildGlobalIndex().then(index => setIndexSize(index.length)).catch(() => {})
  }, [])

  const handleSearch = async () => {
    setIsSearching(true)
    try {
      const result = await resourceManager.searchGlobalResources(query, {
        types: selectedTypes.length > 0 ? selectedTypes : undefined,
        limit: 50,
      })
      setResults(result)
    } catch {} finally { setIsSearching(false) }
  }

  const toggleType = (type: ResourceType) => {
    setSelectedTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">全局资源搜索</h2>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>跨实例搜索所有本地资源 — 模组、资源包、光影、存档、结构、数据包</p>
        <p className="text-[10px] mt-1" style={{ color: 'var(--text-muted)' }}>已索引 {indexSize} 个资源</p>
      </div>

      <div className="flex gap-2">
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSearch()}
          placeholder="搜索所有本地资源..." className="flex-1 px-3 py-2 rounded-lg text-sm outline-none"
          style={{ background: 'var(--bg-secondary)', color: 'var(--text-primary)', border: '1px solid var(--border-subtle)' }} />
        <button onClick={handleSearch} disabled={isSearching}
          className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--accent)', color: '#000' }}>
          {isSearching ? '搜索中...' : '搜索'}
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {Object.entries(RESOURCE_TYPE_LABELS).map(([type, config]) => (
          <button key={type} onClick={() => toggleType(type as ResourceType)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs"
            style={{
              background: selectedTypes.includes(type as ResourceType) ? 'rgba(74, 222, 128, 0.15)' : 'var(--bg-secondary)',
              color: selectedTypes.includes(type as ResourceType) ? 'var(--accent)' : 'var(--text-secondary)',
            }}>
            {config.icon} {config.label}
          </button>
        ))}
      </div>

      {results && (
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs" style={{ color: 'var(--text-muted)' }}>
            <span>找到 {results.total} 个结果 ({results.searchTime}ms)</span>
            <div className="flex gap-2">
              {Object.entries(results.facets).filter(([, count]) => count > 0).map(([type, count]) => (
                <span key={type}>{RESOURCE_TYPE_LABELS[type as ResourceType]?.icon} {count}</span>
              ))}
            </div>
          </div>
          {results.items.map(item => (
            <div key={item.id} className="flex items-center gap-3 p-2.5 rounded-lg" style={{ background: 'var(--bg-secondary)' }}>
              <span className="text-lg">{RESOURCE_TYPE_LABELS[item.type]?.icon}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {RESOURCE_TYPE_LABELS[item.type]?.label} · {item.instanceName} · {(item.fileSize / 1024).toFixed(1)} KB
                </p>
              </div>
              <ChevronRight className="w-4 h-4" style={{ color: 'var(--text-muted)' }} />
            </div>
          ))}
          {results.items.length === 0 && <p className="text-center text-xs py-4" style={{ color: 'var(--text-muted)' }}>未找到匹配的资源</p>}
        </div>
      )}

      {!results && (
        <div className="text-center py-12">
          <Globe className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--text-muted)', opacity: 0.3 }} />
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>输入关键词搜索所有本地资源</p>
          <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>支持按类型筛选，跨实例搜索</p>
        </div>
      )}
    </div>
  )
}
