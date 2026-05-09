import { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Palette, Plus, Download, Upload, Trash2, Check, Sun, Moon, Monitor, Sparkles, Eye, Copy } from 'lucide-react'
import { useTheme, type ThemePreset, type ThemeColors, BUILT_IN_PRESETS } from '../hooks/themeContext'

export default function ThemeEditor() {
  const {
    theme, setTheme, currentPreset, setPreset, presets,
    customAccent, setCustomAccent, isCustom,
    createCustomPreset, deleteCustomPreset, exportTheme, importTheme,
    transition, setTransition,
  } = useTheme()

  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showImportDialog, setShowImportDialog] = useState(false)
  const [importText, setImportText] = useState('')
  const [importError, setImportError] = useState('')
  const [newThemeName, setNewThemeName] = useState('')
  const [newThemeMode, setNewThemeMode] = useState<'dark' | 'light'>('dark')
  const [newThemeAccent, setNewThemeAccent] = useState('#4ade80')
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const darkPresets = presets.filter(p => p.mode === 'dark')
  const lightPresets = presets.filter(p => p.mode === 'light')

  const handleCreateTheme = useCallback(() => {
    if (!newThemeName.trim()) return
    const preset = createCustomPreset(newThemeName.trim(), newThemeMode, { accent: newThemeAccent })
    setPreset(preset.id)
    setShowCreateDialog(false)
    setNewThemeName('')
    setNewThemeAccent('#4ade80')
  }, [newThemeName, newThemeMode, newThemeAccent, createCustomPreset, setPreset])

  const handleExport = useCallback((presetId: string) => {
    const json = exportTheme(presetId)
    if (!json) return
    navigator.clipboard.writeText(json).then(() => {
      setCopiedId(presetId)
      setTimeout(() => setCopiedId(null), 2000)
    })
  }, [exportTheme])

  const handleImport = useCallback(() => {
    setImportError('')
    const result = importTheme(importText)
    if (result) {
      setPreset(result.id)
      setShowImportDialog(false)
      setImportText('')
    } else {
      setImportError('无效的主题文件格式')
    }
  }, [importText, importTheme, setPreset])

  return (
    <div className="space-y-6">
      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4" />
          外观模式
        </h3>
        <div className="flex items-center gap-2">
          {([
            { mode: 'light' as const, icon: Sun, label: '浅色' },
            { mode: 'dark' as const, icon: Moon, label: '深色' },
            { mode: 'system' as const, icon: Monitor, label: '跟随系统' },
          ]).map(({ mode, icon: Icon, label }) => (
            <button
              key={mode}
              onClick={() => setTheme(mode)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                theme === mode ? 'bg-black/10 dark:bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-medium text-theme-muted uppercase tracking-wider flex items-center gap-2">
            <Palette className="w-4 h-4" />
            深色主题
          </h3>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setShowCreateDialog(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-theme-muted hover:text-theme-primary"
              title="创建主题"
            >
              <Plus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setShowImportDialog(true)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-theme-muted hover:text-theme-primary"
              title="导入主题"
            >
              <Upload className="w-4 h-4" />
            </button>
          </div>
        </div>
        <div className="grid grid-cols-4 gap-2">
          {darkPresets.map(preset => (
            <ThemeCard
              key={preset.id}
              preset={preset}
              isActive={currentPreset.id === preset.id && !isCustom}
              onSelect={() => { setPreset(preset.id); setCustomAccent('') }}
              onExport={() => handleExport(preset.id)}
              onDelete={preset.isCustom ? () => deleteCustomPreset(preset.id) : undefined}
              copied={copiedId === preset.id}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Sun className="w-4 h-4" />
          浅色主题
        </h3>
        <div className="grid grid-cols-4 gap-2">
          {lightPresets.map(preset => (
            <ThemeCard
              key={preset.id}
              preset={preset}
              isActive={currentPreset.id === preset.id && !isCustom}
              onSelect={() => { setPreset(preset.id); setCustomAccent('') }}
              onExport={() => handleExport(preset.id)}
              onDelete={preset.isCustom ? () => deleteCustomPreset(preset.id) : undefined}
              copied={copiedId === preset.id}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Sparkles className="w-4 h-4" />
          自定义强调色
        </h3>
        <div className="flex items-center gap-3">
          <div className="relative">
            <input
              type="color"
              value={customAccent || currentPreset.colors.accent}
              onChange={(e) => setCustomAccent(e.target.value)}
              className="w-10 h-10 rounded-lg cursor-pointer border border-white/10"
              style={{ background: customAccent || currentPreset.colors.accent }}
            />
          </div>
          <div className="flex-1">
            <input
              type="text"
              value={customAccent || currentPreset.colors.accent}
              onChange={(e) => {
                const v = e.target.value
                if (/^#[0-9a-fA-F]{6}$/.test(v)) setCustomAccent(v)
              }}
              placeholder="#4ade80"
              className="w-full px-3 py-2 glass rounded-lg text-theme-primary text-sm focus:outline-none focus:border-white/20"
            />
          </div>
          {isCustom && (
            <button
              onClick={() => setCustomAccent('')}
              className="px-3 py-2 rounded-lg text-xs text-theme-muted hover:text-theme-primary hover:bg-white/5 transition-all"
            >
              重置
            </button>
          )}
        </div>
        <div className="flex gap-1.5 mt-3">
          {['#4ade80', '#38bdf8', '#fb923c', '#c084fc', '#f472b6', '#ef4444', '#22d3ee', '#fbbf24', '#a3e635', '#818cf8'].map(color => (
            <button
              key={color}
              onClick={() => setCustomAccent(color)}
              className="w-7 h-7 rounded-lg border-2 transition-transform hover:scale-110"
              style={{
                background: color,
                borderColor: (customAccent || currentPreset.colors.accent) === color ? 'var(--text-primary)' : 'transparent',
              }}
            />
          ))}
        </div>
      </div>

      <div className="glass rounded-2xl p-4">
        <h3 className="text-sm font-medium text-theme-muted mb-3 uppercase tracking-wider flex items-center gap-2">
          <Eye className="w-4 h-4" />
          切换动画
        </h3>
        <div className="flex items-center justify-between">
          <span className="text-sm text-theme-secondary">启用主题切换过渡</span>
          <button
            onClick={() => setTransition({ ...transition, enabled: !transition.enabled })}
            className={`w-12 h-7 rounded-full transition-colors relative ${
              transition.enabled ? 'bg-mc-green' : 'bg-black/10 dark:bg-white/10'
            }`}
          >
            <motion.div
              animate={{ x: transition.enabled ? 20 : 2 }}
              transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              className="w-5 h-5 rounded-full bg-theme-primary absolute top-1"
            />
          </button>
        </div>
        {transition.enabled && (
          <div className="mt-3 flex items-center gap-3">
            <span className="text-xs text-theme-muted">速度</span>
            <input
              type="range"
              min={100}
              max={800}
              step={50}
              value={transition.duration}
              onChange={(e) => setTransition({ ...transition, duration: parseInt(e.target.value) })}
              className="flex-1 accent-mc-green"
            />
            <span className="text-xs text-theme-muted w-16 text-right">{transition.duration}ms</span>
          </div>
        )}
      </div>

      <AnimatePresence>
        {showCreateDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowCreateDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-theme-primary mb-4">创建自定义主题</h3>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-theme-secondary mb-1 block">主题名称</label>
                  <input
                    type="text"
                    value={newThemeName}
                    onChange={e => setNewThemeName(e.target.value)}
                    placeholder="我的主题"
                    className="w-full px-3 py-2 glass rounded-lg text-theme-primary text-sm focus:outline-none focus:border-white/20"
                  />
                </div>
                <div>
                  <label className="text-sm text-theme-secondary mb-1 block">模式</label>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setNewThemeMode('dark')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        newThemeMode === 'dark' ? 'bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
                      }`}
                    >
                      <Moon className="w-4 h-4" /> 深色
                    </button>
                    <button
                      onClick={() => setNewThemeMode('light')}
                      className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                        newThemeMode === 'light' ? 'bg-white/15 text-theme-primary' : 'text-theme-muted hover:text-theme-secondary'
                      }`}
                    >
                      <Sun className="w-4 h-4" /> 浅色
                    </button>
                  </div>
                </div>
                <div>
                  <label className="text-sm text-theme-secondary mb-1 block">强调色</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      value={newThemeAccent}
                      onChange={e => setNewThemeAccent(e.target.value)}
                      className="w-10 h-10 rounded-lg cursor-pointer border border-white/10"
                    />
                    <input
                      type="text"
                      value={newThemeAccent}
                      onChange={e => { if (/^#[0-9a-fA-F]{0,6}$/.test(e.target.value)) setNewThemeAccent(e.target.value) }}
                      className="flex-1 px-3 py-2 glass rounded-lg text-theme-primary text-sm focus:outline-none"
                    />
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => setShowCreateDialog(false)}
                    className="flex-1 px-4 py-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-white/5 transition-all text-sm"
                  >
                    取消
                  </button>
                  <button
                    onClick={handleCreateTheme}
                    disabled={!newThemeName.trim() || !/^#[0-9a-fA-F]{6}$/.test(newThemeAccent)}
                    className="flex-1 px-4 py-2 bg-mc-green text-accent-text font-semibold rounded-xl hover:bg-mc-green/90 transition-colors text-sm disabled:opacity-50"
                  >
                    创建
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showImportDialog && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(8px)' }}
            onClick={() => setShowImportDialog(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass-strong rounded-2xl p-6 w-full max-w-sm mx-4"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-lg font-semibold text-theme-primary mb-4">导入主题</h3>
              <textarea
                value={importText}
                onChange={e => { setImportText(e.target.value); setImportError('') }}
                placeholder="粘贴主题 JSON..."
                rows={6}
                className="w-full px-3 py-2 glass rounded-lg text-theme-primary text-sm focus:outline-none resize-none font-mono"
              />
              {importError && <p className="text-red-400 text-xs mt-2">{importError}</p>}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => setShowImportDialog(false)}
                  className="flex-1 px-4 py-2 rounded-xl text-theme-muted hover:text-theme-primary hover:bg-white/5 transition-all text-sm"
                >
                  取消
                </button>
                <button
                  onClick={handleImport}
                  disabled={!importText.trim()}
                  className="flex-1 px-4 py-2 bg-mc-green text-accent-text font-semibold rounded-xl hover:bg-mc-green/90 transition-colors text-sm disabled:opacity-50"
                >
                  导入
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function ThemeCard({
  preset, isActive, onSelect, onExport, onDelete, copied,
}: {
  preset: ThemePreset
  isActive: boolean
  onSelect: () => void
  onExport: () => void
  onDelete?: () => void
  copied: boolean
}) {
  return (
    <motion.button
      onClick={onSelect}
      className="relative group rounded-xl overflow-hidden border-2 transition-all"
      style={{ borderColor: isActive ? preset.colors.accent : 'transparent' }}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <div className="h-16 relative" style={{ background: preset.colors.bgPrimary }}>
        <div className="absolute inset-0 flex items-center justify-center gap-1">
          <div className="w-6 h-6 rounded-full" style={{ background: preset.colors.accent }} />
          <div className="flex flex-col gap-0.5">
            <div className="w-8 h-1.5 rounded" style={{ background: preset.colors.textPrimary }} />
            <div className="w-6 h-1 rounded" style={{ background: preset.colors.textMuted }} />
          </div>
        </div>
      </div>
      <div className="px-2 py-1.5 text-center" style={{ background: preset.colors.bgSecondary }}>
        <span className="text-[10px] font-medium truncate block" style={{ color: preset.colors.textPrimary }}>
          {preset.name}
        </span>
      </div>
      {isActive && (
        <div className="absolute top-1 right-1 w-4 h-4 rounded-full flex items-center justify-center" style={{ background: preset.colors.accent }}>
          <Check className="w-2.5 h-2.5" style={{ color: preset.colors.accentText }} />
        </div>
      )}
      <div className="absolute top-1 left-1 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={e => { e.stopPropagation(); onExport() }}
          className="w-5 h-5 rounded flex items-center justify-center"
          style={{ background: preset.colors.bgElevatedStrong }}
          title="导出"
        >
          {copied ? <Check className="w-3 h-3" style={{ color: preset.colors.accent }} /> : <Copy className="w-3 h-3" style={{ color: preset.colors.textMuted }} />}
        </button>
        {onDelete && (
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            className="w-5 h-5 rounded flex items-center justify-center"
            style={{ background: preset.colors.bgElevatedStrong }}
            title="删除"
          >
            <Trash2 className="w-3 h-3" style={{ color: '#ef4444' }} />
          </button>
        )}
      </div>
    </motion.button>
  )
}
