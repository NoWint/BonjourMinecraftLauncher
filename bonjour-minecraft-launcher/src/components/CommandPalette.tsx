import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Gamepad2, Package, Settings, User, Boxes, Server, Globe, Palette, Home, Terminal, ArrowRight, Play, Download, Cpu, Monitor, Wrench, BarChart3, Sparkles, Shield, HardDrive, Zap } from 'lucide-react'

interface CommandItem {
  id: string
  label: string
  description?: string
  icon: React.ComponentType<{ className?: string }>
  keywords: string[]
  action: () => void
  section: string
  shortcut?: string
}

export type Page = 'home' | 'versions' | 'mods' | 'modpack' | 'servers' | 'worlds' | 'resources' | 'accounts' | 'settings' | 'appearance' | 'stats'

interface CommandPaletteProps {
  onNavigate: (page: Page) => void
  onLaunch?: () => void
  onInstallVersion?: () => void
}

export default function CommandPalette({ onNavigate, onLaunch, onInstallVersion }: CommandPaletteProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [recentCommands, setRecentCommands] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('cmd-recent') || '[]')
    } catch { return [] }
  })
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const commands = useMemo<CommandItem[]>(() => [
    { id: 'nav-home', label: '主页', description: '返回仪表板', icon: Home, keywords: ['主页', '首页', 'dashboard', 'home'], action: () => onNavigate('home'), section: '导航', shortcut: '⌥1' },
    { id: 'nav-versions', label: '游戏版本', description: '版本管理与安装', icon: Gamepad2, keywords: ['版本', '游戏', '安装', '启动', 'version'], action: () => onNavigate('versions'), section: '导航', shortcut: '⌥2' },
    { id: 'nav-mods', label: '模组管理', description: '浏览和管理模组', icon: Package, keywords: ['模组', 'mod', '插件', 'mods'], action: () => onNavigate('mods'), section: '导航', shortcut: '⌥3' },
    { id: 'nav-modpack', label: '整合包', description: '安装和管理整合包', icon: Boxes, keywords: ['整合包', 'modpack', '包', '整合'], action: () => onNavigate('modpack'), section: '导航' },
    { id: 'nav-servers', label: '服务器', description: '多人游戏服务器', icon: Server, keywords: ['服务器', 'server', '多人', '联机'], action: () => onNavigate('servers'), section: '导航' },
    { id: 'nav-worlds', label: '存档管理', description: '管理游戏存档', icon: Globe, keywords: ['存档', '世界', 'world', '备份', '地图'], action: () => onNavigate('worlds'), section: '导航' },
    { id: 'nav-resources', label: '资源管理', description: '资源包/光影/数据包', icon: Palette, keywords: ['资源', '材质', '光影', 'shader', '材质包'], action: () => onNavigate('resources'), section: '导航' },
    { id: 'nav-accounts', label: '账户管理', description: '登录与账户设置', icon: User, keywords: ['账户', '登录', '正版', '账号', 'account', 'microsoft'], action: () => onNavigate('accounts'), section: '导航' },
    { id: 'nav-settings', label: '设置', description: '启动器配置', icon: Settings, keywords: ['设置', '配置', '选项', 'settings', 'java', '内存'], action: () => onNavigate('settings'), section: '导航', shortcut: '⌥6' },
    { id: 'nav-appearance', label: '外观设置', description: '主题与背景', icon: Monitor, keywords: ['外观', '主题', '背景', '皮肤', 'theme', 'dark', 'light'], action: () => onNavigate('appearance'), section: '导航' },
    { id: 'nav-stats', label: '游戏统计', description: '查看游戏数据', icon: BarChart3, keywords: ['统计', '数据', '时长', 'stats'], action: () => onNavigate('stats'), section: '导航' },
    { id: 'action-launch', label: '启动游戏', description: '启动当前选中的游戏版本', icon: Play, keywords: ['启动', '开始', 'play', 'launch', '运行'], action: () => onLaunch?.(), section: '操作', shortcut: '⌃⇧L' },
    { id: 'action-install', label: '安装新版本', description: '浏览并安装 Minecraft 版本', icon: Download, keywords: ['安装', '下载', 'install', 'download', '新版本'], action: () => onInstallVersion?.(), section: '操作' },
    { id: 'action-java', label: '检查 Java', description: '检测系统中的 Java 环境', icon: Cpu, keywords: ['java', 'jvm', '环境', '检测', 'jdk'], action: () => onNavigate('settings'), section: '操作' },
    { id: 'action-mod-search', label: '搜索模组', description: '在模组库中搜索', icon: Sparkles, keywords: ['搜索', '模组', 'search', 'mod', '查找'], action: () => onNavigate('mods'), section: '操作' },
    { id: 'action-security', label: '安全检查', description: '扫描模组安全性', icon: Shield, keywords: ['安全', '扫描', '病毒', 'security', 'scan'], action: () => onNavigate('mods'), section: '操作' },
    { id: 'action-storage', label: '存储分析', description: '查看磁盘空间使用情况', icon: HardDrive, keywords: ['存储', '空间', '磁盘', 'storage', 'disk', '清理'], action: () => onNavigate('settings'), section: '操作' },
    { id: 'action-optimize', label: '性能优化', description: 'JVM 参数调优向导', icon: Zap, keywords: ['优化', '性能', 'jvm', '调优', 'fps', 'optimize'], action: () => onNavigate('settings'), section: '操作' },
    { id: 'help-shortcuts', label: '键盘快捷键', description: '查看所有快捷键', icon: Wrench, keywords: ['快捷键', '键盘', 'shortcut', 'key', '帮助'], action: () => {}, section: '帮助' },
  ], [onNavigate, onLaunch, onInstallVersion])

  const filteredCommands = useMemo(() => {
    if (!query.trim()) {
      if (recentCommands.length > 0) {
        const recent = recentCommands
          .map(id => commands.find(c => c.id === id))
          .filter(Boolean) as CommandItem[]
        return [...recent.slice(0, 3), ...commands.filter(c => !recentCommands.includes(c.id)).slice(0, 7)]
      }
      return commands.slice(0, 8)
    }
    const q = query.toLowerCase()
    const scored = commands
      .map(cmd => {
        let score = 0
        if (cmd.label.toLowerCase().includes(q)) score += 10
        if (cmd.label.toLowerCase().startsWith(q)) score += 5
        if (cmd.keywords.some(k => k.toLowerCase().startsWith(q))) score += 3
        if (cmd.keywords.some(k => k.toLowerCase().includes(q))) score += 2
        if (cmd.description?.toLowerCase().includes(q)) score += 1
        if (cmd.section.toLowerCase().includes(q)) score += 1
        return { cmd, score }
      })
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ cmd }) => cmd)
    return scored.length > 0 ? scored : commands.slice(0, 8)
  }, [query, commands, recentCommands])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setIsOpen(prev => !prev)
        setQuery('')
        setSelectedIndex(0)
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false)
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [isOpen])

  useEffect(() => {
    setSelectedIndex(0)
  }, [query])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (filteredCommands[selectedIndex]) {
        executeCommand(filteredCommands[selectedIndex])
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const executeCommand = useCallback((cmd: CommandItem) => {
    cmd.action()
    setIsOpen(false)
    setRecentCommands(prev => {
      const next = [cmd.id, ...prev.filter(id => id !== cmd.id)].slice(0, 5)
      localStorage.setItem('cmd-recent', JSON.stringify(next))
      return next
    })
  }, [])

  const groupedCommands = useMemo(() => {
    const groups: Record<string, CommandItem[]> = {}
    filteredCommands.forEach(cmd => {
      if (!groups[cmd.section]) groups[cmd.section] = []
      groups[cmd.section].push(cmd)
    })
    return groups
  }, [filteredCommands])

  let flatIndex = -1

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.15 }}
          className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]"
          style={{ background: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(4px)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setIsOpen(false) }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            transition={{ duration: 0.2, ease: [0.4, 0, 0.2, 1] }}
            className="w-full max-w-xl rounded-2xl overflow-hidden"
            style={{
              background: 'var(--surface-glass-strong)',
              backdropFilter: 'blur(40px) saturate(180%)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-lg)',
            }}
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <Search className="w-5 h-5 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="搜索页面、功能、操作..."
                className="flex-1 bg-transparent outline-none text-base"
                style={{ color: 'var(--text-primary)' }}
                aria-label="搜索命令"
                role="combobox"
                aria-expanded="true"
                aria-controls="command-list"
              />
              <kbd className="text-xs px-2 py-0.5 rounded" style={{ background: 'var(--surface-elevated)', color: 'var(--text-muted)' }}>
                esc
              </kbd>
            </div>

            <div ref={listRef} id="command-list" role="listbox" className="max-h-80 overflow-y-auto p-2">
              {filteredCommands.length === 0 ? (
                <div className="px-4 py-8 text-center" style={{ color: 'var(--text-muted)' }}>
                  <Terminal className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">未找到匹配结果</p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-disabled)' }}>试试其他关键词</p>
                </div>
              ) : (
                Object.entries(groupedCommands).map(([section, cmds]) => (
                  <div key={section}>
                    <div className="px-3 py-1.5">
                      <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-disabled)' }}>
                        {section}
                      </span>
                    </div>
                    {cmds.map((cmd) => {
                      flatIndex++
                      const currentIndex = flatIndex
                      const isSelected = currentIndex === selectedIndex

                      return (
                        <button
                          key={cmd.id}
                          role="option"
                          aria-selected={isSelected}
                          onClick={() => executeCommand(cmd)}
                          onMouseEnter={() => setSelectedIndex(currentIndex)}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all duration-150"
                          style={{
                            background: isSelected ? 'var(--surface-hover)' : 'transparent',
                            color: 'var(--text-primary)',
                          }}
                        >
                          <div
                            className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{
                              background: isSelected ? 'var(--accent-dim)' : 'var(--surface-field)',
                              color: isSelected ? 'var(--accent)' : 'var(--text-secondary)',
                            }}
                          >
                            <cmd.icon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium truncate">{cmd.label}</div>
                            {cmd.description && (
                              <div className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>
                                {cmd.description}
                              </div>
                            )}
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0">
                            {cmd.shortcut && (
                              <kbd className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: 'var(--surface-field)', color: 'var(--text-disabled)' }}>
                                {cmd.shortcut}
                              </kbd>
                            )}
                            <ArrowRight className="w-3.5 h-3.5" style={{ color: isSelected ? 'var(--accent)' : 'var(--text-disabled)' }} />
                          </div>
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            <div
              className="flex items-center gap-4 px-4 py-2.5 text-xs border-t"
              style={{ borderColor: 'var(--border-subtle)', color: 'var(--text-muted)' }}
            >
              <span>↑↓ 导航</span>
              <span>↵ 选择</span>
              <span>esc 关闭</span>
              <span className="ml-auto">⌘K 打开</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
