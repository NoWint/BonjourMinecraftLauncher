import { useState, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Image, Volume2, Keyboard, Globe, Eye, Monitor, Cpu, Layers } from 'lucide-react'
import { useTheme } from '../hooks/themeContext'
import ThemeEditor from './ThemeEditor'
import DynamicBackground, { type BackgroundVariant, type BackgroundIntensity, type PerformanceTier } from './DynamicBackground'
import { useSound } from '../hooks/useSound'
import { useAccessibility } from './AccessibilityProvider'
import { useTranslation } from 'react-i18next'
import { LANGUAGE_OPTIONS } from '../i18n'

type AppearanceTab = 'theme' | 'background' | 'sound' | 'shortcuts' | 'language' | 'accessibility' | 'display'

export default function AppearanceSettings() {
  const [activeTab, setActiveTab] = useState<AppearanceTab>('theme')

  const tabs: { id: AppearanceTab; icon: React.ElementType; label: string }[] = [
    { id: 'theme', icon: Layers, label: '主题' },
    { id: 'background', icon: Image, label: '背景' },
    { id: 'sound', icon: Volume2, label: '音效' },
    { id: 'shortcuts', icon: Keyboard, label: '快捷键' },
    { id: 'language', icon: Globe, label: '语言' },
    { id: 'accessibility', icon: Eye, label: '无障碍' },
    { id: 'display', icon: Monitor, label: '显示' },
  ]

  return (
    <div className="h-full flex flex-col">
      <div className="px-6 pt-6 pb-2">
        <h2 className="text-2xl font-bold text-theme-primary">外观与体验</h2>
        <p className="text-sm text-theme-muted mt-1">自定义启动器的视觉风格和交互方式</p>
      </div>

      <div className="flex gap-1 px-6 py-2 overflow-x-auto">
        {tabs.map(tab => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-black/10 dark:bg-white/15 text-theme-primary'
                  : 'text-theme-muted hover:text-theme-secondary hover:bg-black/5 dark:hover:bg-white/5'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-y-auto px-6 pb-6">
        {activeTab === 'theme' && <ThemeEditor />}
        {activeTab === 'background' && <BackgroundSettings />}
        {activeTab === 'sound' && <SoundSettings />}
        {activeTab === 'shortcuts' && <ShortcutSettings />}
        {activeTab === 'language' && <LanguageSettings />}
        {activeTab === 'accessibility' && <AccessibilitySettings />}
        {activeTab === 'display' && <DisplaySettings />}
      </div>
    </div>
  )
}

function BackgroundSettings() {
  const [variant, setVariant] = useState<BackgroundVariant>(() => {
    return (localStorage.getItem('bg-variant') as BackgroundVariant) || 'mesh'
  })
  const [intensity, setIntensity] = useState<BackgroundIntensity>(() => {
    return (localStorage.getItem('bg-intensity') as BackgroundIntensity) || 'subtle'
  })
  const [performanceTier, setPerformanceTier] = useState<PerformanceTier>(() => {
    return (localStorage.getItem('bg-performance-tier') as PerformanceTier) || 'high'
  })

  const handleVariantChange = useCallback((v: BackgroundVariant) => {
    setVariant(v)
    localStorage.setItem('bg-variant', v)
  }, [])

  const handleIntensityChange = useCallback((i: BackgroundIntensity) => {
    setIntensity(i)
    localStorage.setItem('bg-intensity', i)
  }, [])

  const handleTierChange = useCallback((t: PerformanceTier) => {
    setPerformanceTier(t)
    localStorage.setItem('bg-performance-tier', t)
  }, [])

  const variants: { id: BackgroundVariant; name: string; desc: string }[] = [
    { id: 'gradient', name: '渐变', desc: '纯 CSS 渐变，最低性能消耗' },
    { id: 'mesh', name: '网格', desc: '流动的网格渐变效果' },
    { id: 'particles', name: '粒子', desc: '浮动粒子与连线效果' },
    { id: 'aurora', name: '极光', desc: '波浪状极光效果' },
    { id: 'waves', name: '波浪', desc: '层叠波浪效果' },
    { id: 'none', name: '无', desc: '纯色背景，最佳性能' },
  ]

  const intensities: { id: BackgroundIntensity; name: string }[] = [
    { id: 'subtle', name: '淡雅' },
    { id: 'normal', name: '标准' },
    { id: 'strong', name: '强烈' },
  ]

  const tiers: { id: PerformanceTier; name: string; desc: string }[] = [
    { id: 'high', name: '高性能', desc: '完整动画效果' },
    { id: 'medium', name: '平衡', desc: '适度降低画质' },
    { id: 'low', name: '省电', desc: '最低性能消耗' },
  ]

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">背景样式</h3>
        <div className="grid grid-cols-3 gap-2">
          {variants.map(v => (
            <button
              key={v.id}
              onClick={() => handleVariantChange(v.id)}
              className={`p-3 rounded-xl text-left transition-all ${
                variant === v.id ? 'border-2' : 'border border-transparent hover:border-white/10'
              }`}
              style={{
                borderColor: variant === v.id ? 'var(--accent)' : undefined,
                background: variant === v.id ? 'var(--accent-dim)' : 'var(--bg-hover)',
              }}
            >
              <p className="text-sm font-medium" style={{ color: variant === v.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                {v.name}
              </p>
              <p className="text-xs text-theme-muted mt-0.5">{v.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">背景强度</h3>
        <div className="flex gap-2">
          {intensities.map(i => (
            <button
              key={i.id}
              onClick={() => handleIntensityChange(i.id)}
              className={`flex-1 px-3 py-2 rounded-xl text-sm font-medium transition-all ${
                intensity === i.id ? 'text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
              }`}
              style={{ background: intensity === i.id ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
            >
              {i.name}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Cpu className="w-4 h-4" />
          性能模式
        </h3>
        <div className="space-y-2">
          {tiers.map(tier => (
            <button
              key={tier.id}
              onClick={() => handleTierChange(tier.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: performanceTier === tier.id ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: performanceTier === tier.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {tier.name}
                </p>
                <p className="text-xs text-theme-muted">{tier.desc}</p>
              </div>
              {performanceTier === tier.id && (
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">预览</h3>
        <div className="relative h-32 rounded-xl overflow-hidden">
          <DynamicBackground variant={variant} intensity={intensity} performanceTier={performanceTier} />
        </div>
      </div>
    </div>
  )
}

function SoundSettings() {
  const { play, setEnabled, setVolume, setPack, config } = useSound()
  const [volume, setVolumeState] = useState(config.volume)
  const [enabled, setEnabledState] = useState(config.enabled)

  const soundTypes = [
    { type: 'click' as const, name: '点击', desc: '按钮点击音效' },
    { type: 'hover' as const, name: '悬停', desc: '鼠标悬停音效' },
    { type: 'launch' as const, name: '启动', desc: '游戏启动音效' },
    { type: 'success' as const, name: '成功', desc: '操作成功音效' },
    { type: 'error' as const, name: '错误', desc: '错误提示音效' },
    { type: 'install' as const, name: '安装', desc: '安装完成音效' },
    { type: 'notification' as const, name: '通知', desc: '通知提示音效' },
    { type: 'switch' as const, name: '切换', desc: '页面切换音效' },
  ]

  const packNames: Record<string, string> = {
    default: '默认',
    soft: '柔和',
    retro: '复古',
    minecraft: 'Minecraft',
  }

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wider flex items-center gap-2">
            <Volume2 className="w-4 h-4" />
            音效开关
          </h3>
          <button
            onClick={() => { setEnabledState(!enabled); setEnabled(!enabled) }}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              enabled ? 'bg-mc-green' : 'bg-black/10 dark:bg-white/10'
            }`}
          >
            <motion.div
              animate={{ x: enabled ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-theme-primary absolute top-1"
            />
          </button>
        </div>
        {enabled && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-theme-muted">音量</span>
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={volume}
              onChange={e => {
                const v = parseFloat(e.target.value)
                setVolumeState(v)
                setVolume(v)
              }}
              className="flex-1 accent-mc-green"
            />
            <span className="text-xs text-theme-muted w-10 text-right">{Math.round(volume * 100)}%</span>
          </div>
        )}
      </div>

      {enabled && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">音效包</h3>
          <div className="grid grid-cols-2 gap-2">
            {(['default', 'soft', 'retro', 'minecraft'] as const).map(pack => (
              <button
                key={pack}
                onClick={() => setPack(pack)}
                className="px-3 py-2 rounded-xl text-sm font-medium transition-all"
                style={{
                  background: config.pack === pack ? 'var(--accent-dim)' : 'var(--bg-hover)',
                  color: config.pack === pack ? 'var(--accent)' : 'var(--text-primary)',
                }}
              >
                {packNames[pack]}
              </button>
            ))}
          </div>
        </div>
      )}

      {enabled && (
        <div className="glass rounded-2xl p-4">
          <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">音效预览</h3>
          <div className="grid grid-cols-2 gap-2">
            {soundTypes.map(s => (
              <button
                key={s.type}
                onClick={() => play(s.type)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-white/5 transition-all text-left"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--accent-dim)' }}>
                  <Volume2 className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                </div>
                <div>
                  <p className="text-sm font-medium text-theme-primary">{s.name}</p>
                  <p className="text-xs text-theme-muted">{s.desc}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function ShortcutSettings() {
  const shortcuts = [
    { keys: ['Alt', '1'], action: '主页' },
    { keys: ['Alt', '2'], action: '版本' },
    { keys: ['Alt', '3'], action: '模组' },
    { keys: ['Alt', '4'], action: '整合包' },
    { keys: ['Alt', '5'], action: '账户' },
    { keys: ['Alt', '6'], action: '设置' },
    { keys: ['Ctrl', 'Shift', 'L'], action: '快速启动' },
    { keys: ['F11'], action: '全屏切换' },
  ]

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Keyboard className="w-4 h-4" />
          快捷键列表
        </h3>
        <div className="space-y-2">
          {shortcuts.map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
              <span className="text-sm text-theme-secondary">{s.action}</span>
              <div className="flex items-center gap-1">
                {s.keys.map((key, j) => (
                  <span key={j} className="flex items-center gap-1">
                    <kbd>{key}</kbd>
                    {j < s.keys.length - 1 && <span className="text-theme-muted text-xs">+</span>}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-theme-muted">
          💡 全局快捷键（应用不在焦点时也可使用）需要通过 Rust 侧的 global-hotkey crate 实现，
          目前仅支持应用内快捷键。全局快捷键将在后续版本中支持。
        </p>
      </div>
    </div>
  )
}

function LanguageSettings() {
  const { i18n } = useTranslation()
  const [currentLang, setCurrentLang] = useState(i18n.language)

  const handleLanguageChange = useCallback((code: string) => {
    i18n.changeLanguage(code)
    setCurrentLang(code)
  }, [i18n])

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Globe className="w-4 h-4" />
          语言设置
        </h3>
        <div className="space-y-2">
          {LANGUAGE_OPTIONS.map(lang => (
            <button
              key={lang.code}
              onClick={() => handleLanguageChange(lang.code)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: currentLang === lang.code ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
            >
              <span className="text-lg lang-flag">{lang.flag}</span>
              <span className="text-sm font-medium" style={{ color: currentLang === lang.code ? 'var(--accent)' : 'var(--text-primary)' }}>
                {lang.name}
              </span>
              {currentLang === lang.code && (
                <div className="ml-auto w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <p className="text-xs text-theme-muted">
          💡 部分界面文本可能尚未翻译完成。如果你愿意帮助翻译，欢迎加入我们的社区。
        </p>
      </div>
    </div>
  )
}

function AccessibilitySettings() {
  const {
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    largeText, setLargeText,
    screenReaderOptimized, setScreenReaderOptimized,
  } = useAccessibility()

  const settings = [
    { key: 'highContrast', label: '高对比度', desc: '增强界面元素的边框和对比度', value: highContrast, onChange: setHighContrast },
    { key: 'reduceMotion', label: '减少动画', desc: '禁用或简化界面动画效果', value: reduceMotion, onChange: setReduceMotion },
    { key: 'largeText', label: '大字体', desc: '增大界面文字尺寸', value: largeText, onChange: setLargeText },
    { key: 'screenReader', label: '屏幕阅读器优化', desc: '增强 ARIA 标签和语义结构', value: screenReaderOptimized, onChange: setScreenReaderOptimized },
  ]

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" />
          无障碍设置
        </h3>
        <div className="space-y-4">
          {settings.map(s => (
            <div key={s.key} className="flex items-center justify-between">
              <div>
                <p className="text-sm text-theme-primary">{s.label}</p>
                <p className="text-xs text-theme-muted">{s.desc}</p>
              </div>
              <button
                onClick={() => s.onChange(!s.value)}
                className={`w-12 h-7 rounded-full transition-colors relative ${
                  s.value ? 'bg-mc-green' : 'bg-black/10 dark:bg-white/10'
                }`}
              >
                <motion.div
                  animate={{ x: s.value ? 20 : 2 }}
                  transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  className="w-5 h-5 rounded-full bg-theme-primary absolute top-1"
                />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">键盘导航</h3>
        <div className="space-y-2 text-xs text-theme-muted">
          <p>• <kbd>Tab</kbd> / <kbd>Shift+Tab</kbd> 在控件间移动焦点</p>
          <p>• <kbd>Enter</kbd> / <kbd>Space</kbd> 激活当前焦点元素</p>
          <p>• <kbd>Esc</kbd> 关闭弹窗/返回</p>
          <p>• <kbd>Alt+1~6</kbd> 快速切换页面</p>
        </div>
      </div>
    </div>
  )
}

function DisplaySettings() {
  const [windowPosition, setWindowPosition] = useState<'center' | 'last' | 'cursor'>(() => {
    return (localStorage.getItem('window-position') as 'center' | 'last' | 'cursor') || 'center'
  })

  const handlePositionChange = useCallback((pos: 'center' | 'last' | 'cursor') => {
    setWindowPosition(pos)
    localStorage.setItem('window-position', pos)
  }, [])

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Monitor className="w-4 h-4" />
          窗口位置
        </h3>
        <div className="space-y-2">
          {([
            { id: 'center' as const, name: '屏幕居中', desc: '每次启动居中显示' },
            { id: 'last' as const, name: '记住位置', desc: '恢复上次关闭时的位置' },
            { id: 'cursor' as const, name: '鼠标位置', desc: '在鼠标所在显示器打开' },
          ]).map(opt => (
            <button
              key={opt.id}
              onClick={() => handlePositionChange(opt.id)}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all"
              style={{ background: windowPosition === opt.id ? 'var(--accent-dim)' : 'var(--bg-hover)' }}
            >
              <div className="flex-1 text-left">
                <p className="text-sm font-medium" style={{ color: windowPosition === opt.id ? 'var(--accent)' : 'var(--text-primary)' }}>
                  {opt.name}
                </p>
                <p className="text-xs text-theme-muted">{opt.desc}</p>
              </div>
              {windowPosition === opt.id && (
                <div className="w-2 h-2 rounded-full" style={{ background: 'var(--accent)' }} />
              )}
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider">多显示器</h3>
        <p className="text-xs text-theme-muted">
          多显示器支持通过 Tauri 的 availableMonitors/currentMonitor API 实现。
          窗口位置记忆和显示器切换功能将在后续版本中完善。
        </p>
      </div>
    </div>
  )
}
