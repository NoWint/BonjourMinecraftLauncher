import { useState, useEffect } from 'react'
import { Folder, FileCode, Monitor, ChevronRight, Download, CheckCircle, AlertCircle, Sun, Moon, Globe, RefreshCw, Zap, PlayCircle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'
import AutocompleteInput from './AutocompleteInput'
import type { LauncherSettings, JavaVersionInfo, DownloadSourceInfo } from '../types'

interface SettingsPageProps {
  settings: LauncherSettings
  onSave: (settings: LauncherSettings) => void
  onVersionsChange?: (versions: any[]) => void
  onResetSetup?: () => void
}

interface SettingSection {
  id: string
  title: string
  icon: React.ElementType
  settings: {
    key: keyof LauncherSettings
    label: string
    type: 'text' | 'number' | 'checkbox' | 'path'
    min?: number
    max?: number
  }[]
}

export default function SettingsPage({ settings, onSave, onVersionsChange, onResetSetup }: SettingsPageProps) {
  const [formData, setFormData] = useState<LauncherSettings>(settings)
  const [systemInfo, setSystemInfo] = useState<{
    platform: string
    arch: string
    totalMemory: number
    cpus: number
  } | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string | null>('game')
  const { theme, setTheme } = useTheme()
  const [javaStatus, setJavaStatus] = useState<{
    available: boolean
    path: string | null
    version: string | null
    majorVersion: number
    isCompatible: boolean
  } | null>(null)
  const [isDownloadingJava, setIsDownloadingJava] = useState(false)
  const [javaDownloadProgress, setJavaDownloadProgress] = useState<string>('')
  const [javaVersions, setJavaVersions] = useState<JavaVersionInfo[]>([])
  const [downloadSources, setDownloadSources] = useState<DownloadSourceInfo[]>([])
  const [detectingSources, setDetectingSources] = useState(false)

  useEffect(() => {
    loadSystemInfo()
    checkJava()
    loadJavaVersions()
  }, [])

  const loadJavaVersions = async () => {
    try {
      const versions = await window.minecraftAPI.getAllJavaVersions()
      setJavaVersions(versions)
    } catch (error) {
      console.error('Failed to load Java versions:', error)
    }
  }

  const loadSystemInfo = async () => {
    try {
      const info = await window.minecraftAPI.getSystemInfo()
      setSystemInfo(info)
    } catch (error) {
      console.error('Failed to load system info:', error)
    }
  }

  const checkJava = async () => {
    try {
      const status = await window.minecraftAPI.checkJava()
      setJavaStatus(status as any)
    } catch {
      setJavaStatus({ available: false, path: null, version: null, majorVersion: 0, isCompatible: false })
    }
  }

  const handleChange = (field: keyof LauncherSettings, value: unknown) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setHasChanges(true)
  }

  const handleSave = () => {
    onSave(formData)
    setHasChanges(false)
  }

  const handleReset = () => {
    setFormData(settings)
    setHasChanges(false)
  }

  const selectGameDir = async () => {
    const result = await window.minecraftAPI.selectGameDir()
    if (result) {
      handleChange('gameDir', result.path)
      if (result.versions && result.versions.length > 0 && onVersionsChange) {
        onVersionsChange(result.versions)
      }
    }
  }

  const selectJavaPath = async () => {
    const path = await window.minecraftAPI.selectJavaPath()
    if (path) {
      handleChange('javaPath', path)
      setTimeout(checkJava, 100)
    }
  }

  const handleDownloadJava = async () => {
    setIsDownloadingJava(true)
    setJavaDownloadProgress('正在下载 Java...')
    try {
      const result = await window.minecraftAPI.downloadJava()
      if (result.success) {
        setJavaDownloadProgress('Java 下载完成！')
        await checkJava()
      } else {
        setJavaDownloadProgress(result.message || '下载失败')
      }
    } catch (error) {
      setJavaDownloadProgress(`下载失败: ${error}`)
    } finally {
      setIsDownloadingJava(false)
    }
  }

  const sections: SettingSection[] = [
    {
      id: 'game',
      title: '游戏',
      icon: Monitor,
      settings: [
        { key: 'windowWidth', label: '窗口宽度', type: 'number', min: 640 },
        { key: 'windowHeight', label: '窗口高度', type: 'number', min: 480 },
        { key: 'fullscreen', label: '全屏模式', type: 'checkbox' },
      ],
    },
    {
      id: 'java',
      title: 'Java',
      icon: FileCode,
      settings: [
        { key: 'javaPath', label: 'Java 路径', type: 'autocomplete-java' as any },
        { key: 'maxMemory', label: '最大内存 (MB)', type: 'number', min: 512, max: systemInfo?.totalMemory || 32768 },
        { key: 'minMemory', label: '最小内存 (MB)', type: 'number', min: 256 },
      ],
    },
    {
      id: 'paths',
      title: '路径',
      icon: Folder,
      settings: [
        { key: 'gameDir', label: '游戏目录', type: 'autocomplete-dir' as any },
        { key: 'launchServer', label: '自动连接服务器', type: 'text' },
      ],
    },
    {
      id: 'launch',
      title: '启动',
      icon: Zap,
      settings: [
        { key: 'skipPreCheck', label: '跳过启动前自检', type: 'checkbox' },
        { key: 'closeAfterLaunch', label: '启动后关闭启动器', type: 'checkbox' },
      ],
    },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-8 pb-4">
        <div className="flex items-center justify-between">
          <h2 className="text-3xl font-bold text-theme-primary">设置</h2>
          {hasChanges && (
            <div className="flex gap-2">
              <button
                onClick={handleReset}
                className="px-4 py-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all text-sm"
              >
                重置
              </button>
              <button
                onClick={handleSave}
                className="px-4 py-2 bg-mc-green text-accent-text font-semibold rounded-xl hover:bg-mc-green/90 transition-colors text-sm"
              >
                保存
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-auto px-8 pb-8">
        <div className="max-w-lg mx-auto space-y-4">
          <div className={`glass rounded-2xl p-4 ${javaStatus?.available ? 'border-green-500/20' : 'border-yellow-500/20'}`}>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wider">Java 状态</h3>
              {javaStatus?.available ? (
                <CheckCircle className="w-4 h-4 text-green-500" />
              ) : (
                <AlertCircle className="w-4 h-4 text-yellow-500" />
              )}
            </div>

            {javaStatus?.available ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-theme-muted">状态</span>
                  <span className="text-green-400">已找到</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-muted">路径</span>
                  <span className="text-theme-secondary truncate max-w-[200px]" title={javaStatus.path || ''}>{javaStatus.path}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-theme-muted">版本</span>
                  <span className={javaStatus.isCompatible ? 'text-green-400' : 'text-yellow-400'}>
                    {javaStatus.version} {javaStatus.isCompatible ? '' : '(建议 Java 17+)'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-yellow-500">未找到 Java，Minecraft 需要 Java 17 或更高版本才能运行。</p>
                <div className="flex gap-2">
                  <button
                    onClick={selectJavaPath}
                    className="flex-1 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-theme-secondary hover:text-theme-primary hover:bg-black/5 dark:hover:bg-white/10 transition-all text-sm"
                  >
                    手动选择
                  </button>
                  <button
                    onClick={handleDownloadJava}
                    disabled={isDownloadingJava}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-mc-green/20 border border-mc-green/30 text-mc-green hover:bg-mc-green/30 transition-all text-sm disabled:opacity-50"
                  >
                    <Download className="w-4 h-4" />
                    {isDownloadingJava ? '下载中...' : '自动下载'}
                  </button>
                </div>
                {javaDownloadProgress && (
                  <p className="text-xs text-theme-muted">{javaDownloadProgress}</p>
                )}
              </div>
            )}
          </div>

          {sections.map((section) => {
            const Icon = section.icon
            const isExpanded = expandedSection === section.id

            return (
              <motion.div
                key={section.id}
                layout
                className="glass rounded-2xl overflow-hidden"
              >
                <button
                  onClick={() => setExpandedSection(isExpanded ? null : section.id)}
                  className="w-full flex items-center gap-4 p-4 hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-black/5 dark:bg-white/5 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-theme-secondary" />
                  </div>
                  <span className="flex-1 text-left font-semibold text-theme-primary">{section.title}</span>
                  <motion.div
                    animate={{ rotate: isExpanded ? 90 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronRight className="w-5 h-5 text-theme-muted" />
                  </motion.div>
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <div className="p-4 pt-0 space-y-4">
                        {section.settings.map((setting) => (
                          <div key={setting.key} className="flex items-center justify-between">
                            <label className="text-sm text-theme-secondary">{setting.label}</label>
                            
                            {setting.type === 'checkbox' && (
                              <button
                                onClick={() => handleChange(setting.key, !formData[setting.key])}
                                className={`w-12 h-7 rounded-full transition-colors relative ${
                                  formData[setting.key] ? 'bg-mc-green' : 'bg-black/10 dark:bg-white/10'
                                }`}
                              >
                                <motion.div
                                  animate={{ x: formData[setting.key] ? 20 : 2 }}
                                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                                  className="w-5 h-5 rounded-full bg-theme-primary absolute top-1"
                                />
                              </button>
                            )}

                            {setting.type === 'number' && (
                              <input
                                type="number"
                                value={formData[setting.key] as number}
                                onChange={(e) => handleChange(setting.key, parseInt(e.target.value) || 0)}
                                min={setting.min}
                                max={setting.max}
                                className="w-24 px-3 py-2 glass rounded-lg text-theme-primary text-sm text-right focus:outline-none focus:border-black/20 dark:focus:border-white/20"
                              />
                            )}

                            {setting.type === 'text' && (
                              <input
                                type="text"
                                value={formData[setting.key] as string}
                                onChange={(e) => handleChange(setting.key, e.target.value)}
                                className="flex-1 max-w-xs px-3 py-2 glass rounded-lg text-theme-primary text-sm text-right focus:outline-none focus:border-black/20 dark:focus:border-white/20 ml-4"
                              />
                            )}

                            {setting.type === 'path' && (
                              <button
                                onClick={() => setting.key === 'gameDir' ? selectGameDir() : selectJavaPath()}
                                className="flex-1 max-w-xs px-3 py-2 glass rounded-lg text-theme-secondary text-sm text-right hover:text-theme-primary hover:bg-black/5 dark:hover:bg-white/5 transition-all truncate ml-4"
                              >
                                {formData[setting.key] || '选择路径...'}
                              </button>
                            )}

                            {setting.type === 'autocomplete-java' && (
                              <div className="flex-1 max-w-xs ml-4">
                                <AutocompleteInput
                                  value={formData[setting.key] as string}
                                  onChange={(val) => { handleChange(setting.key, val); setTimeout(checkJava, 200) }}
                                  onFetchOptions={async (query) => {
                                    try {
                                      const javas = await window.minecraftAPI.findJavaInstallations()
                                      return javas
                                        .filter(j => !query || j.path.toLowerCase().includes(query.toLowerCase()) || j.version.toLowerCase().includes(query.toLowerCase()))
                                        .map(j => ({
                                          value: j.path,
                                          label: `Java ${j.version}`,
                                          detail: j.path,
                                        }))
                                    } catch { return [] }
                                  }}
                                  placeholder="搜索或选择 Java..."
                                  icon="java"
                                />
                              </div>
                            )}

                            {setting.type === 'autocomplete-dir' && (
                              <div className="flex-1 max-w-xs ml-4">
                                <AutocompleteInput
                                  value={formData[setting.key] as string}
                                  onChange={(val) => handleChange(setting.key, val)}
                                  onFetchOptions={async (query) => {
                                    try {
                                      const dirs = await window.minecraftAPI.findGameDirectories()
                                      const results = dirs
                                        .filter(d => !query || d.path.toLowerCase().includes(query.toLowerCase()) || d.label.toLowerCase().includes(query.toLowerCase()))
                                        .map(d => ({
                                          value: d.path,
                                          label: d.label,
                                          detail: d.path,
                                        }))
                                      results.push({
                                        value: query || '',
                                        label: query ? `使用自定义路径: ${query}` : '手动输入路径...',
                                        detail: '点击浏览按钮选择其他目录',
                                      })
                                      return results
                                    } catch { return [] }
                                  }}
                                  placeholder="搜索或选择游戏目录..."
                                  icon="folder"
                                />
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">主题</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-theme-secondary">外观</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setTheme('light')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === 'light' ? 'bg-black/10 dark:bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>浅色</span>
                </button>
                <button
                  onClick={() => setTheme('dark')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === 'dark' ? 'bg-black/10 dark:bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>深色</span>
                </button>
                <button
                  onClick={() => setTheme('system')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    theme === 'system' ? 'bg-black/10 dark:bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
                  }`}
                >
                  <Monitor className="w-3.5 h-3.5" />
                  <span>跟随系统</span>
                </button>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">Java 版本管理</h3>
            {javaVersions.length > 0 ? (
              <div className="space-y-2">
                {javaVersions.map((jv, i) => (
                  <div key={i} className="flex items-center gap-3 px-3 py-2 rounded-xl" style={{ background: 'var(--bg-hover)' }}>
                    <FileCode className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-theme-primary">Java {jv.majorVersion}</p>
                      <p className="text-xs text-theme-muted truncate">{jv.path}</p>
                    </div>
                    <span className="text-xs px-2 py-0.5 rounded-lg" style={{
                      background: jv.source === 'bundled' ? 'var(--accent-dim)' : 'var(--bg-hover)',
                      color: jv.source === 'bundled' ? 'var(--accent)' : 'var(--text-muted)',
                    }}>
                      {jv.source === 'system' ? '系统' : jv.source === 'bundled' ? '已下载' : '手动'}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-theme-muted">未检测到 Java 版本</p>
            )}
            <div className="flex gap-2 mt-3">
              <button
                onClick={async () => {
                  setIsDownloadingJava(true)
                  setJavaDownloadProgress('正在下载 Java 21...')
                  try {
                    const result = await window.minecraftAPI.downloadJavaVersion(21)
                    setJavaDownloadProgress(result.success ? 'Java 21 下载完成！' : result.message || '下载失败')
                    await loadJavaVersions()
                    await checkJava()
                  } catch (error) {
                    setJavaDownloadProgress(`下载失败: ${error}`)
                  } finally {
                    setIsDownloadingJava(false)
                  }
                }}
                disabled={isDownloadingJava}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-mc-green/20 border border-mc-green/30 text-mc-green hover:bg-mc-green/30 transition-all text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Java 21
              </button>
              <button
                onClick={async () => {
                  setIsDownloadingJava(true)
                  setJavaDownloadProgress('正在下载 Java 17...')
                  try {
                    const result = await window.minecraftAPI.downloadJavaVersion(17)
                    setJavaDownloadProgress(result.success ? 'Java 17 下载完成！' : result.message || '下载失败')
                    await loadJavaVersions()
                    await checkJava()
                  } catch (error) {
                    setJavaDownloadProgress(`下载失败: ${error}`)
                  } finally {
                    setIsDownloadingJava(false)
                  }
                }}
                disabled={isDownloadingJava}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-theme-secondary hover:text-theme-primary transition-all text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Java 17
              </button>
              <button
                onClick={async () => {
                  setIsDownloadingJava(true)
                  setJavaDownloadProgress('正在下载 Java 8...')
                  try {
                    const result = await window.minecraftAPI.downloadJavaVersion(8)
                    setJavaDownloadProgress(result.success ? 'Java 8 下载完成！' : result.message || '下载失败')
                    await loadJavaVersions()
                    await checkJava()
                  } catch (error) {
                    setJavaDownloadProgress(`下载失败: ${error}`)
                  } finally {
                    setIsDownloadingJava(false)
                  }
                }}
                disabled={isDownloadingJava}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-theme-secondary hover:text-theme-primary transition-all text-sm disabled:opacity-50"
              >
                <Download className="w-4 h-4" />
                Java 8
              </button>
            </div>
            {javaDownloadProgress && (
              <p className="text-xs text-theme-muted mt-2">{javaDownloadProgress}</p>
            )}
          </div>

          <div className="glass rounded-2xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wider">下载源</h3>
              <button
                onClick={async () => {
                  setDetectingSources(true)
                  try {
                    const sources = await window.minecraftAPI.detectDownloadSource()
                    setDownloadSources(sources)
                  } catch (error) {
                    console.error('Failed to detect sources:', error)
                  } finally {
                    setDetectingSources(false)
                  }
                }}
                disabled={detectingSources}
                className="p-1.5 rounded-lg hover:bg-white/5 transition-all"
              >
                <RefreshCw className={`w-4 h-4 text-theme-muted ${detectingSources ? 'animate-spin' : ''}`} />
              </button>
            </div>
            <div className="space-y-2">
              {(['auto', 'bmclapi', 'mojang', 'modrinth'] as const).map((source) => {
                const labels: Record<string, { name: string; desc: string }> = {
                  auto: { name: '自动选择', desc: '根据网络状况自动选择最快的下载源' },
                  bmclapi: { name: 'BMCLAPI', desc: '中国镜像，国内用户推荐' },
                  mojang: { name: 'Mojang 官方', desc: '全球通用，海外用户推荐' },
                  modrinth: { name: 'Modrinth CDN', desc: '全球 CDN 加速' },
                }
                const info = labels[source]
                const detected = downloadSources.find(s => s.id === source)
                return (
                  <button
                    key={source}
                    onClick={() => {
                      handleChange('downloadSource' as keyof LauncherSettings, source)
                      setHasChanges(true)
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
                    style={{ background: formData.downloadSource === source ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
                  >
                    <Globe className="w-4 h-4" style={{ color: formData.downloadSource === source ? 'var(--accent)' : 'var(--text-muted)' }} />
                    <div className="flex-1 text-left">
                      <p className="text-sm font-medium" style={{ color: formData.downloadSource === source ? 'var(--accent)' : 'var(--text-primary)' }}>
                        {info.name}
                      </p>
                      <p className="text-xs text-theme-muted">{info.desc}</p>
                    </div>
                    {detected && (
                      <span className="text-xs text-theme-muted">{detected.latency}ms</span>
                    )}
                    {formData.downloadSource === source && (
                      <CheckCircle className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">游戏内悬浮面板</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm text-theme-secondary">启用悬浮面板</label>
                  <p className="text-xs text-theme-muted mt-0.5">游戏运行时显示性能监控覆盖层</p>
                </div>
                <button
                  onClick={() => handleChange('overlayEnabled', !formData.overlayEnabled)}
                  className={`w-12 h-7 rounded-full transition-colors relative ${
                    formData.overlayEnabled ? 'bg-mc-green' : 'bg-black/10 dark:bg-white/10'
                  }`}
                >
                  <motion.div
                    animate={{ x: formData.overlayEnabled ? 20 : 2 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    className="w-5 h-5 rounded-full bg-theme-primary absolute top-1"
                  />
                </button>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-theme-secondary">面板透明度</label>
                <div className="flex items-center gap-2">
                  <input
                    type="range"
                    min="0.3"
                    max="1"
                    step="0.05"
                    value={formData.overlayOpacity}
                    onChange={(e) => handleChange('overlayOpacity', parseFloat(e.target.value))}
                    className="w-24 accent-mc-green"
                  />
                  <span className="text-xs text-theme-muted w-8 text-right">{Math.round(formData.overlayOpacity * 100)}%</span>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <label className="text-sm text-theme-secondary">面板位置</label>
                <div className="flex gap-1">
                  {(['top-left', 'top-right', 'bottom-left', 'bottom-right'] as const).map((pos) => {
                    const labels: Record<string, string> = {
                      'top-left': '左上',
                      'top-right': '右上',
                      'bottom-left': '左下',
                      'bottom-right': '右下',
                    }
                    return (
                      <button
                        key={pos}
                        onClick={() => handleChange('overlayPosition', pos)}
                        className={`px-2 py-1 rounded-lg text-xs transition-all ${
                          formData.overlayPosition === pos
                            ? 'bg-mc-green/20 text-mc-green border border-mc-green/30'
                            : 'bg-black/5 dark:bg-white/5 text-theme-muted border border-transparent'
                        }`}
                      >
                        {labels[pos]}
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          </div>

          <div className="glass rounded-2xl p-4">
            <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">关于</h3>
            <div className="space-y-1.5 text-xs text-theme-muted">
              <p>感谢你的使用ovo！</p>
              <p>作为一个vibecoding产品还是有很多不足，敬请建议。</p>
              <p>你可以通过以下方式联系我。</p>
              <p className="text-theme-secondary/70">Bilibili: 1279796225</p>
              <p className="text-theme-secondary/70">QQ群: 1016641691</p>
            </div>
            <button
              onClick={() => window.open('https://qun.qq.com/universal-share/share?ac=1&authKey=J8%2FvyGr7e%2FVjIIQXgAZp7e59TKTYJpKgv%2BxsuJMfxHMxBO2QAzQPk48lLwFODueg&busi_data=eyJncm91cENvZGUiOiIxMDE2NjQxNjkxIiwidG9rZW4iOiJuQXp6TWx2ei9PL0l5em1ZemYrWnBwWlNWbEdFWlJIMDc3TG1OYkV1YlZuR1VzYVk2STdpdGp3R1BLVUYxMUErIiwidWluIjoiNjc0MDAwMjQ5In0%3D&data=ZMou1uI7iomYSk9YAT9cm2Z8lHPxeqCsg1t8ubZVN7-oTyy-foAXNE7cTUOUw5wfOg_bxOGo-DpNDnWTjKETjg&svctype=4&tempid=h5_group_info', '_blank')}
              className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-mc-green/20 border border-mc-green/30 text-mc-green hover:bg-mc-green/30 transition-all text-sm"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
              </svg>
              加入 QQ 群
            </button>
            {onResetSetup && (
              <button
                onClick={onResetSetup}
                className="mt-2 w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl bg-theme-accent/10 border border-theme-accent/20 text-theme-accent hover:bg-theme-accent/20 transition-all text-sm"
              >
                <PlayCircle className="w-4 h-4" />
                重新显示首次使用向导
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
