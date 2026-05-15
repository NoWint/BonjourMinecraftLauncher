import { useState, useEffect, useCallback } from 'react'
import { Folder, FileCode, Monitor, Download, Sun, Zap, RefreshCw, Settings, CheckCircle, AlertCircle } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import WindowFrame from './WindowFrame'
import type { LauncherSettings, JavaVersionInfo, DownloadSourceInfo } from '../types'

export default function SettingsWindow() {
  const [settings, setSettings] = useState<LauncherSettings | null>(null)
  const [formData, setFormData] = useState<LauncherSettings | null>(null)
  const [hasChanges, setHasChanges] = useState(false)
  const [expandedSection, setExpandedSection] = useState<string>('game')
  const [javaVersions, setJavaVersions] = useState<JavaVersionInfo[]>([])
  const [downloadSources, setDownloadSources] = useState<DownloadSourceInfo[]>([])
  const [detectingSources, setDetectingSources] = useState(false)
  const [isDownloadingJava, setIsDownloadingJava] = useState(false)

  useEffect(() => {
    invoke<LauncherSettings>('get_settings').then(s => {
      setSettings(s)
      setFormData(s)
    }).catch(console.error)

    invoke<JavaVersionInfo[]>('get_all_java_versions')
      .then(setJavaVersions).catch(console.error)

    invoke<DownloadSourceInfo[]>('detect_download_source')
      .then(setDownloadSources).catch(console.error)

    const params = new URLSearchParams(window.location.search)
    const section = params.get('section')
    if (section) setExpandedSection(section)

    const unlisten = listen('navigate-section', (event: any) => {
      if (event.payload?.section) {
        setExpandedSection(event.payload.section)
      }
    })

    return () => { unlisten.then(fn => fn()) }
  }, [])

  const handleSave = useCallback(() => {
    if (!formData) return
    invoke('save_settings', { settings: formData }).then(() => {
      setSettings(formData)
      setHasChanges(false)
    }).catch(console.error)
  }, [formData])

  const handleChange = useCallback((key: keyof LauncherSettings, value: any) => {
    if (!formData) return
    const updated = { ...formData, [key]: value }
    setFormData(updated)
    setHasChanges(JSON.stringify(updated) !== JSON.stringify(settings))
  }, [formData, settings])

  const sections = [
    { id: 'game', title: '游戏', icon: Monitor },
    { id: 'java', title: 'Java', icon: FileCode },
    { id: 'download', title: '下载', icon: Download },
    { id: 'appearance', title: '外观', icon: Sun },
    { id: 'advanced', title: '高级', icon: Zap },
  ]

  if (!formData) {
    return (
      <WindowFrame title="设置" icon={<Settings className="w-4 h-4" />}>
        <div className="flex items-center justify-center h-full">
          <div className="animate-spin w-6 h-6 border-2 border-white/20 border-t-white/80 rounded-full" />
        </div>
      </WindowFrame>
    )
  }

  return (
    <WindowFrame title="设置" icon={<Settings className="w-4 h-4" />}>
      <div className="flex h-full">
        <div className="w-48 shrink-0 border-r border-white/5 p-2 overflow-y-auto">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setExpandedSection(section.id)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-xs transition-colors ${
                expandedSection === section.id
                  ? 'bg-white/10 text-white'
                  : 'text-white/60 hover:bg-white/5 hover:text-white/80'
              }`}
            >
              <section.icon className="w-3.5 h-3.5" />
              {section.title}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {expandedSection === 'game' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Monitor className="w-5 h-5 text-white/60" />
                <h2 className="text-base font-medium text-white/90">游戏</h2>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">窗口宽度</label>
                <input type="number" value={formData.windowWidth} onChange={e => handleChange('windowWidth', Number(e.target.value))} min={640} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">窗口高度</label>
                <input type="number" value={formData.windowHeight} onChange={e => handleChange('windowHeight', Number(e.target.value))} min={480} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">全屏启动</label>
                <button onClick={() => handleChange('fullscreen', !formData.fullscreen)} className={`w-10 h-5 rounded-full transition-colors ${formData.fullscreen ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.fullscreen ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          {expandedSection === 'java' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <FileCode className="w-5 h-5 text-white/60" />
                <h2 className="text-base font-medium text-white/90">Java</h2>
              </div>
              {javaVersions.length > 0 && (
                <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <CheckCircle className="w-4 h-4 text-emerald-400" />
                    <span className="text-emerald-300">已检测到 {javaVersions.length} 个 Java 版本</span>
                  </div>
                  <div className="mt-2 space-y-1">
                    {javaVersions.map((jv, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/50">
                        <span>Java {jv.majorVersion} ({jv.version})</span>
                        <span className="text-white/30">- {jv.path}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {javaVersions.length === 0 && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 mb-4">
                  <div className="flex items-center gap-2 text-sm">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300">未检测到 Java</span>
                  </div>
                  <button onClick={async () => { setIsDownloadingJava(true); try { await invoke('download_java') } catch (e) { console.error(e) } finally { setIsDownloadingJava(false) } }} disabled={isDownloadingJava} className="mt-2 px-3 py-1 text-xs bg-blue-500/20 text-blue-300 rounded-md hover:bg-blue-500/30 disabled:opacity-50">
                    {isDownloadingJava ? '下载中...' : '自动下载 Java'}
                  </button>
                </div>
              )}
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">Java 路径</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={formData.javaPath} onChange={e => handleChange('javaPath', e.target.value)} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
                  <button onClick={async () => { try { const { open } = await import('@tauri-apps/plugin-dialog'); const selected = await open({ directory: false, filters: [{ name: 'Java', extensions: ['exe', 'bin', ''] }] }); if (selected) handleChange('javaPath', selected as string) } catch (err) { console.error(err) } }} className="px-2 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10">
                    <Folder className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">最大内存 (MB)</label>
                <input type="number" value={formData.maxMemory} onChange={e => handleChange('maxMemory', Number(e.target.value))} min={512} max={65536} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">最小内存 (MB)</label>
                <input type="number" value={formData.minMemory} onChange={e => handleChange('minMemory', Number(e.target.value))} min={128} max={65536} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
              </div>
            </div>
          )}

          {expandedSection === 'download' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Download className="w-5 h-5 text-white/60" />
                <h2 className="text-base font-medium text-white/90">下载</h2>
              </div>
              <div className="mb-4">
                <button onClick={async () => { setDetectingSources(true); try { const sources = await invoke<DownloadSourceInfo[]>('detect_download_source'); setDownloadSources(sources) } catch (err) { console.error(err) } finally { setDetectingSources(false) } }} disabled={detectingSources} className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-white/5 rounded-md hover:bg-white/10 disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${detectingSources ? 'animate-spin' : ''}`} />
                  检测下载源
                </button>
                {downloadSources.length > 0 && (
                  <div className="mt-2 space-y-1">
                    {downloadSources.map((source, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-white/60">
                        <span>{source.name}</span>
                        <span className={`${source.latency < 100 ? 'text-emerald-400' : source.latency < 300 ? 'text-amber-400' : 'text-red-400'}`}>
                          {source.latency}ms
                        </span>
                        {!source.available && <span className="text-red-400">不可用</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">下载源</label>
                <select value={formData.downloadSource} onChange={e => handleChange('downloadSource', e.target.value)} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80">
                  <option value="auto">自动</option>
                  <option value="bmclapi">BMCLAPI</option>
                  <option value="mojang">Mojang</option>
                  <option value="modrinth">Modrinth</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">游戏目录</label>
                <div className="flex items-center gap-2">
                  <input type="text" value={formData.gameDir} onChange={e => handleChange('gameDir', e.target.value)} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80 focus:outline-none focus:border-white/20" />
                  <button onClick={async () => { try { const { open } = await import('@tauri-apps/plugin-dialog'); const selected = await open({ directory: true }); if (selected) handleChange('gameDir', selected as string) } catch (err) { console.error(err) } }} className="px-2 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10">
                    <Folder className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {expandedSection === 'appearance' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Sun className="w-5 h-5 text-white/60" />
                <h2 className="text-base font-medium text-white/90">外观</h2>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">语言</label>
                <select value={formData.language} onChange={e => handleChange('language', e.target.value)} className="w-48 px-2 py-1 text-xs rounded-md bg-white/5 border border-white/10 text-white/80">
                  <option value="zh-CN">简体中文</option>
                  <option value="zh-TW">繁體中文</option>
                  <option value="en">English</option>
                  <option value="ja">日本語</option>
                </select>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">高对比度</label>
                <button onClick={() => handleChange('highContrast', !formData.highContrast)} className={`w-10 h-5 rounded-full transition-colors ${formData.highContrast ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.highContrast ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">大字体</label>
                <button onClick={() => handleChange('largeText', !formData.largeText)} className={`w-10 h-5 rounded-full transition-colors ${formData.largeText ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.largeText ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
            </div>
          )}

          {expandedSection === 'advanced' && (
            <div className="space-y-4">
              <div className="flex items-center gap-2 mb-4">
                <Zap className="w-5 h-5 text-white/60" />
                <h2 className="text-base font-medium text-white/90">高级</h2>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">启动后关闭启动器</label>
                <button onClick={() => handleChange('closeAfterLaunch', !formData.closeAfterLaunch)} className={`w-10 h-5 rounded-full transition-colors ${formData.closeAfterLaunch ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.closeAfterLaunch ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">跳过启动前检查</label>
                <button onClick={() => handleChange('skipPreCheck', !formData.skipPreCheck)} className={`w-10 h-5 rounded-full transition-colors ${formData.skipPreCheck ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.skipPreCheck ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">启用游戏内 Overlay</label>
                <button onClick={() => handleChange('overlayEnabled', !formData.overlayEnabled)} className={`w-10 h-5 rounded-full transition-colors ${formData.overlayEnabled ? 'bg-emerald-500' : 'bg-white/10'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-sm transform transition-transform ${formData.overlayEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-white/5">
                <label className="text-sm text-white/70">Overlay 透明度</label>
                <input type="range" min={0.1} max={1} step={0.1} value={formData.overlayOpacity} onChange={e => handleChange('overlayOpacity', Number(e.target.value))} className="w-48" />
              </div>
            </div>
          )}

          {hasChanges && (
            <div className="sticky bottom-0 flex justify-end gap-2 pt-4 pb-2 bg-gradient-to-t from-[var(--bg-primary)] via-[var(--bg-primary)] to-transparent">
              <button onClick={() => { setFormData(settings); setHasChanges(false) }} className="px-4 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white/60">
                取消
              </button>
              <button onClick={handleSave} className="px-4 py-1.5 text-sm rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300">
                保存设置
              </button>
            </div>
          )}
        </div>
      </div>
    </WindowFrame>
  )
}
