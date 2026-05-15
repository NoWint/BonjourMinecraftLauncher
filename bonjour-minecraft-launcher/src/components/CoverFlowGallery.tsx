import { useState, useRef, useCallback, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, ChevronLeft, ChevronRight, Clock, HardDrive, Info, X, FileText, Calendar, Tag } from 'lucide-react'
import type { InstalledVersion } from '../types'

interface CoverFlowGalleryProps {
  versions: InstalledVersion[]
  selectedVersion: string
  onSelectVersion: (versionId: string) => void
  onLaunch: (versionId: string) => void
}

const getVersionColor = (versionId: string): string => {
  const colors = [
    '#4ade80', '#38bdf8', '#fb923c', '#c084fc', '#f472b6',
    '#22d3ee', '#a3e635', '#fbbf24', '#f87171', '#818cf8'
  ]
  let hash = 0
  for (let i = 0; i < versionId.length; i++) {
    hash = versionId.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

const getVersionGradient = (versionId: string): string => {
  const color = getVersionColor(versionId)
  return `linear-gradient(135deg, ${color}20 0%, ${color}05 100%)`
}

const VERSION_CHANGELOGS: Record<string, string[]> = {
  '1.21': [
    '新增试炼密室结构',
    '新增旋风人生物',
    '新增重锤武器',
    '新增合成器方块',
    '优化渲染性能',
  ],
  '1.20': [
    '新增樱花树林生物群系',
    '新增盔甲纹饰系统',
    '新增陶片与饰纹陶罐',
    '新增悬挂告示牌',
    '改进考古系统',
  ],
  '1.19': [
    '新增深暗之域生物群系',
    '新增监守者生物',
    '新增蛙类与蛙明灯',
    '新增红树林沼泽',
    '新增回声与引导碎片',
  ],
  '1.18': [
    '世界生成全面重做',
    '新增洞穴与峡谷',
    '新增繁茂洞穴生物群系',
    '新增滴水石锥',
    '扩大世界高度限制',
  ],
}

function VersionDetailPanel({ version, onClose, onLaunch }: {
  version: InstalledVersion
  onClose: () => void
  onLaunch: (id: string) => void
}) {
  const color = getVersionColor(version.id)
  const majorVersion = version.id.split('.').slice(0, 2).join('.')
  const changelog = VERSION_CHANGELOGS[majorVersion] || ['暂无更新日志']

  return (
    <motion.div
      initial={{ opacity: 0, x: 40 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 40 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      className="absolute right-0 top-0 bottom-0 w-80 glass-strong rounded-2xl overflow-hidden z-30 flex flex-col"
    >
      <div className="p-4 flex items-center justify-between border-b border-white/5">
        <h3 className="text-lg font-bold text-theme-primary">版本详情</h3>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-theme-muted hover:text-theme-primary"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div className="flex items-center gap-3">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold"
            style={{
              background: `${color}20`,
              color: color,
              border: `2px solid ${color}40`,
            }}
          >
            {version.id.charAt(0)}
          </div>
          <div>
            <p className="text-lg font-bold text-theme-primary">{version.id}</p>
            {version.modLoader && (
              <span
                className="px-2 py-0.5 rounded-md text-xs font-medium"
                style={{ background: `${color}20`, color }}
              >
                {version.modLoader}
              </span>
            )}
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-theme-secondary">
            <Calendar className="w-4 h-4 text-theme-muted" />
            <span>安装日期：{new Date(version.installedAt).toLocaleDateString('zh-CN')}</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-theme-secondary">
            <HardDrive className="w-4 h-4 text-theme-muted" />
            <span>状态：已安装</span>
          </div>
          <div className="flex items-center gap-2 text-sm text-theme-secondary">
            <Tag className="w-4 h-4 text-theme-muted" />
            <span>版本类型：{version.id.includes('snapshot') ? '快照' : '正式版'}</span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm font-medium text-theme-primary">
            <FileText className="w-4 h-4" style={{ color }} />
            更新日志
          </div>
          <div className="space-y-1.5">
            {changelog.map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, x: 10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05 }}
                className="flex items-start gap-2 text-sm text-theme-secondary"
              >
                <div className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0" style={{ background: color }} />
                <span>{item}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </div>

      <div className="p-4 border-t border-white/5">
        <button
          onClick={() => onLaunch(version.id)}
          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
          style={{ background: color, color: '#000000' }}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          启动游戏
        </button>
      </div>
    </motion.div>
  )
}

export default function CoverFlowGallery({
  versions,
  selectedVersion,
  onSelectVersion,
  onLaunch,
}: CoverFlowGalleryProps) {
  const [_hoveredIndex, setHoveredIndex] = useState<number | null>(null)
  const [showDetail, setShowDetail] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const selectedIndex = versions.findIndex(v => v.id === selectedVersion)

  const handleScroll = useCallback((direction: 'left' | 'right') => {
    const newIndex = direction === 'left'
      ? Math.max(0, selectedIndex - 1)
      : Math.min(versions.length - 1, selectedIndex + 1)
    if (newIndex !== selectedIndex) {
      onSelectVersion(versions[newIndex].id)
    }
  }, [selectedIndex, versions, onSelectVersion])

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') handleScroll('left')
      if (e.key === 'ArrowRight') handleScroll('right')
      if (e.key === 'Enter' && selectedVersion) onLaunch(selectedVersion)
      if (e.key === 'Escape') setShowDetail(false)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [handleScroll, selectedVersion, onLaunch])

  if (versions.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-theme-muted">还没有安装任何版本</p>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      {versions.length > 1 && (
        <>
          <button
            onClick={() => handleScroll('left')}
            disabled={selectedIndex === 0}
            className="absolute left-4 z-20 p-3 rounded-full glass hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="上一个版本"
          >
            <ChevronLeft className="w-6 h-6 text-theme-primary" />
          </button>
          <button
            onClick={() => handleScroll('right')}
            disabled={selectedIndex === versions.length - 1}
            className="absolute right-4 z-20 p-3 rounded-full glass hover:bg-white/10 transition-all disabled:opacity-30 disabled:cursor-not-allowed"
            aria-label="下一个版本"
          >
            <ChevronRight className="w-6 h-6 text-theme-primary" />
          </button>
        </>
      )}

      <div
        ref={containerRef}
        className="relative flex items-center justify-center gap-4 px-20"
        style={{ perspective: '1200px' }}
      >
        <AnimatePresence mode="popLayout">
          {versions.map((version, index) => {
            const offset = index - selectedIndex
            const isSelected = index === selectedIndex
            const isVisible = Math.abs(offset) <= 3

            if (!isVisible) return null

            return (
              <motion.div
                key={version.id}
                layout
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: isSelected ? 1 : 0.5 + (1 - Math.abs(offset) * 0.15),
                  scale: isSelected ? 1 : 0.85 - Math.abs(offset) * 0.05,
                  x: offset * 280,
                  z: isSelected ? 0 : -Math.abs(offset) * 100,
                  rotateY: offset * -25,
                }}
                transition={{
                  type: 'spring',
                  stiffness: 300,
                  damping: 30,
                }}
                className="absolute cursor-pointer"
                style={{
                  transformStyle: 'preserve-3d',
                  width: '320px',
                }}
                onClick={() => onSelectVersion(version.id)}
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
                role="button"
                tabIndex={0}
                aria-label={`选择版本 ${version.id}`}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') onSelectVersion(version.id)
                }}
              >
                <div
                  className="relative rounded-3xl overflow-hidden border border-white/10 transition-shadow duration-300"
                  style={{
                    background: getVersionGradient(version.id),
                    boxShadow: isSelected
                      ? `0 25px 50px -12px ${getVersionColor(version.id)}40, 0 0 0 1px ${getVersionColor(version.id)}30`
                      : '0 10px 30px -10px rgba(0,0,0,0.5)',
                  }}
                >
                  <div
                    className="h-48 flex items-center justify-center relative"
                    style={{
                      background: `radial-gradient(circle at center, ${getVersionColor(version.id)}30 0%, transparent 70%)`,
                    }}
                  >
                    <motion.div
                      className="w-24 h-24 rounded-2xl flex items-center justify-center text-4xl font-bold"
                      style={{
                        background: `${getVersionColor(version.id)}20`,
                        color: getVersionColor(version.id),
                        border: `2px solid ${getVersionColor(version.id)}40`,
                      }}
                      whileHover={{ scale: 1.1, rotate: 5 }}
                      transition={{ type: 'spring', stiffness: 400 }}
                    >
                      {version.id.charAt(0)}
                    </motion.div>

                    {isSelected && (
                      <motion.div
                        className="absolute inset-0 rounded-3xl"
                        style={{
                          background: `radial-gradient(circle at center, ${getVersionColor(version.id)}20 0%, transparent 70%)`,
                        }}
                        animate={{
                          scale: [1, 1.1, 1],
                          opacity: [0.5, 0.8, 0.5],
                        }}
                        transition={{
                          duration: 3,
                          repeat: Infinity,
                          ease: 'easeInOut',
                        }}
                      />
                    )}
                  </div>

                  <div className="p-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xl font-bold text-theme-primary">
                        {version.id}
                      </h3>
                      <div className="flex items-center gap-1.5">
                        {isSelected && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowDetail(true)
                            }}
                            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-theme-muted hover:text-theme-primary"
                            aria-label="查看详情"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                        )}
                        {version.modLoader && (
                          <span
                            className="px-2 py-1 rounded-lg text-xs font-medium"
                            style={{
                              background: `${getVersionColor(version.id)}20`,
                              color: getVersionColor(version.id),
                            }}
                          >
                            {version.modLoader}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-xs text-theme-muted">
                      <div className="flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{new Date(version.installedAt).toLocaleDateString('zh-CN')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <HardDrive className="w-3.5 h-3.5" />
                        <span>已安装</span>
                      </div>
                    </div>

                    <AnimatePresence>
                      {isSelected && (
                        <motion.button
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 10 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            onLaunch(version.id)
                          }}
                          className="w-full flex items-center justify-center gap-2 py-3 rounded-xl font-semibold text-sm transition-all hover:scale-[1.02] active:scale-[0.98]"
                          style={{
                            background: getVersionColor(version.id),
                            color: '#000000',
                          }}
                        >
                          <Play className="w-4 h-4" fill="currentColor" />
                          启动游戏
                        </motion.button>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>

      {versions.length > 1 && (
        <div className="absolute bottom-8 flex items-center gap-2">
          {versions.map((version, index) => (
            <button
              key={version.id}
              onClick={() => onSelectVersion(version.id)}
              className="transition-all duration-300 rounded-full"
              style={{
                width: index === selectedIndex ? 24 : 8,
                height: 8,
                background: index === selectedIndex
                  ? getVersionColor(version.id)
                  : 'var(--text-muted)',
                opacity: index === selectedIndex ? 1 : 0.4,
              }}
              aria-label={`切换到 ${version.id}`}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {showDetail && selectedVersion && (
          <VersionDetailPanel
            version={versions[selectedIndex]}
            onClose={() => setShowDetail(false)}
            onLaunch={onLaunch}
          />
        )}
      </AnimatePresence>
    </div>
  )
}
