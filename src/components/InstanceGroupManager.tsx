import { useState, useEffect } from 'react'
import { X, FolderPlus, Tag, Plus, Trash2, ChevronRight, ChevronDown, Folder, Palette } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface InstanceGroup {
  id: string
  name: string
  parentId: string | null
  icon?: string
  color?: string
  sortOrder: number
  collapsed: boolean
}

interface InstanceTag {
  id: string
  name: string
  color: string
  createdAt: number
}

interface GroupConfig {
  groups: InstanceGroup[]
  tags: InstanceTag[]
  instanceGroups: Record<string, string[]>
  instanceTags: Record<string, string[]>
}

interface InstanceGroupManagerProps {
  onClose: () => void
  onAssignGroup?: (instanceId: string, groupId: string) => void
  onAssignTag?: (instanceId: string, tagId: string) => void
  selectedInstanceId?: string
}

const TAG_COLORS = [
  '#ef4444', '#f97316', '#f59e0b', '#84cc16', '#22c55e',
  '#14b8a6', '#06b6d4', '#3b82f6', '#8b5cf6', '#ec4899',
]

export default function InstanceGroupManager({ onClose, onAssignGroup, onAssignTag, selectedInstanceId }: InstanceGroupManagerProps) {
  const [config, setConfig] = useState<GroupConfig | null>(null)
  const [activeTab, setActiveTab] = useState<'groups' | 'tags'>('groups')
  const [showNewGroup, setShowNewGroup] = useState(false)
  const [showNewTag, setShowNewTag] = useState(false)
  const [newGroupName, setNewGroupName] = useState('')
  const [newTagName, setNewTagName] = useState('')
  const [newTagColor, setNewTagColor] = useState(TAG_COLORS[0])
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set(['default']))

  useEffect(() => {
    window.minecraftAPI?.getInstanceGroups().then((c: GroupConfig) => {
      setConfig(c)
    })
  }, [])

  const handleCreateGroup = async () => {
    if (!newGroupName.trim()) return
    const group = await window.minecraftAPI?.createInstanceGroup(newGroupName, null)
    if (group && config) {
      setConfig({ ...config, groups: [...config.groups, group] })
    }
    setNewGroupName('')
    setShowNewGroup(false)
  }

  const handleDeleteGroup = async (groupId: string) => {
    await window.minecraftAPI?.deleteInstanceGroup(groupId)
    if (config) {
      setConfig({ ...config, groups: config.groups.filter(g => g.id !== groupId) })
    }
  }

  const handleCreateTag = async () => {
    if (!newTagName.trim()) return
    const tag = await window.minecraftAPI?.createInstanceTag(newTagName, newTagColor)
    if (tag && config) {
      setConfig({ ...config, tags: [...config.tags, tag] })
    }
    setNewTagName('')
    setShowNewTag(false)
  }

  const handleDeleteTag = async (tagId: string) => {
    await window.minecraftAPI?.deleteInstanceTag(tagId)
    if (config) {
      setConfig({ ...config, tags: config.tags.filter(t => t.id !== tagId) })
    }
  }

  const toggleGroup = (groupId: string) => {
    const next = new Set(expandedGroups)
    if (next.has(groupId)) next.delete(groupId)
    else next.add(groupId)
    setExpandedGroups(next)
  }

  const getChildren = (parentId: string) => config?.groups.filter(g => g.parentId === parentId) || []

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4"
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="glass-strong rounded-2xl w-full max-w-lg max-h-[80vh] overflow-auto"
      >
        <div className="flex items-center justify-between p-6 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
              <Folder className="w-5 h-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">分组与标签</h3>
              <p className="text-sm text-white/40">管理实例的组织方式</p>
            </div>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-xl flex items-center justify-center text-white/40 hover:text-white hover:bg-white/5 transition-all">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-white/5">
            <button
              onClick={() => setActiveTab('groups')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'groups' ? 'bg-white/10 text-white' : 'text-white/40'}`}
            >
              分组
            </button>
            <button
              onClick={() => setActiveTab('tags')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-colors ${activeTab === 'tags' ? 'bg-white/10 text-white' : 'text-white/40'}`}
            >
              标签
            </button>
          </div>

          {activeTab === 'groups' && (
            <div className="space-y-2">
              {config?.groups.map(group => {
                const children = getChildren(group.id)
                const isExpanded = expandedGroups.has(group.id)
                return (
                  <div key={group.id}>
                    <div className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
                      <button onClick={() => toggleGroup(group.id)} className="text-white/30">
                        {children.length > 0 ? (isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />) : <span className="w-4" />}
                      </button>
                      <Folder className="w-4 h-4" style={{ color: group.color || '#6b7280' }} />
                      <span className="flex-1 text-sm text-white/80">{group.name}</span>
                      {group.id !== 'default' && (
                        <button
                          onClick={() => handleDeleteGroup(group.id)}
                          className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <AnimatePresence>
                      {isExpanded && children.length > 0 && (
                        <motion.div initial={{ height: 0 }} animate={{ height: 'auto' }} exit={{ height: 0 }} className="ml-6 overflow-hidden">
                          {children.map(child => (
                            <div key={child.id} className="flex items-center gap-2 px-3 py-1.5 text-sm text-white/50 hover:text-white/70">
                              <Folder className="w-3.5 h-3.5" style={{ color: child.color || '#6b7280' }} />
                              <span>{child.name}</span>
                            </div>
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )
              })}

              {showNewGroup ? (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-white/[0.02] border border-white/5">
                  <input
                    value={newGroupName}
                    onChange={e => setNewGroupName(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleCreateGroup()}
                    placeholder="分组名称"
                    className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                    autoFocus
                  />
                  <button onClick={handleCreateGroup} className="px-3 py-1 bg-mc-green/20 text-mc-green text-xs rounded-lg">创建</button>
                  <button onClick={() => setShowNewGroup(false)} className="px-3 py-1 text-white/30 text-xs">取消</button>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewGroup(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  <span>新建分组</span>
                </button>
              )}
            </div>
          )}

          {activeTab === 'tags' && (
            <div className="space-y-2">
              {config?.tags.map(tag => (
                <div key={tag.id} className="flex items-center gap-2 px-3 py-2 rounded-xl hover:bg-white/[0.02] transition-colors group">
                  <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: tag.color }} />
                  <span className="flex-1 text-sm text-white/80">{tag.name}</span>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="opacity-0 group-hover:opacity-100 text-white/20 hover:text-red-400 transition-all"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {showNewTag ? (
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      value={newTagName}
                      onChange={e => setNewTagName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleCreateTag()}
                      placeholder="标签名称"
                      className="flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/20"
                      autoFocus
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    {TAG_COLORS.map(color => (
                      <button
                        key={color}
                        onClick={() => setNewTagColor(color)}
                        className={`w-5 h-5 rounded-full transition-transform ${newTagColor === color ? 'scale-125 ring-2 ring-white/30' : ''}`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                  <div className="flex items-center gap-2">
                    <button onClick={handleCreateTag} className="px-3 py-1 bg-mc-green/20 text-mc-green text-xs rounded-lg">创建</button>
                    <button onClick={() => setShowNewTag(false)} className="px-3 py-1 text-white/30 text-xs">取消</button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowNewTag(true)}
                  className="flex items-center gap-2 px-3 py-2 text-sm text-white/30 hover:text-white/50 transition-colors"
                >
                  <Tag className="w-4 h-4" />
                  <span>新建标签</span>
                </button>
              )}
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}
