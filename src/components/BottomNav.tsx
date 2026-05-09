import { useState, useRef, useEffect } from 'react'
import { Home, Gamepad2, Package, Settings, User, Boxes, Globe, Palette, Server, Grid3X3 } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export type Page = 'home' | 'versions' | 'mods' | 'modpack' | 'servers' | 'worlds' | 'resources' | 'accounts' | 'settings' | 'appearance' | 'stats'

interface BottomNavProps {
  currentPage: Page
  onPageChange: (page: Page) => void
}

const mainNavItems = [
  { id: 'home' as Page, label: '主页', icon: Home },
  { id: 'versions' as Page, label: '游戏', icon: Gamepad2 },
  { id: 'mods' as Page, label: '模组', icon: Package },
  { id: 'accounts' as Page, label: '账户', icon: User },
  { id: 'settings' as Page, label: '设置', icon: Settings },
]

const moreNavItems = [
  { id: 'modpack' as Page, label: '整合包', icon: Boxes },
  { id: 'servers' as Page, label: '服务器', icon: Server },
  { id: 'worlds' as Page, label: '存档', icon: Globe },
  { id: 'resources' as Page, label: '资源', icon: Palette },
  { id: 'appearance' as Page, label: '外观', icon: Palette },
]

export default function BottomNav({ currentPage, onPageChange }: BottomNavProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const isMoreActive = moreNavItems.some(item => item.id === currentPage)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsExpanded(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleMoreItemClick = (page: Page) => {
    onPageChange(page)
    setIsExpanded(false)
  }

  return (
    <nav className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50" ref={containerRef}>
      <div
        className="absolute -inset-x-32 -inset-y-20 pointer-events-none nav-fade-gradient"
        style={{
          maskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 0%, black 50%, transparent 100%)',
          filter: 'blur(20px)',
        }}
      />

      <div className="relative">
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.9 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 20, scale: 0.9 }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-3 px-2 py-2 rounded-2xl"
              style={{
                backdropFilter: 'blur(24px) saturate(150%)',
                WebkitBackdropFilter: 'blur(24px) saturate(150%)',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(128, 128, 128, 0.08) inset',
                background: 'rgba(30, 30, 30, 0.8)',
              }}
            >
              <div className="flex items-center gap-1">
                {moreNavItems.map((item) => {
                  const Icon = item.icon
                  const isActive = currentPage === item.id

                  return (
                    <button
                      key={item.id}
                      onClick={() => handleMoreItemClick(item.id)}
                      className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
                      style={{
                        opacity: isActive ? 1 : 0.6,
                        color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                      }}
                    >
                      {isActive && (
                        <motion.div
                          layoutId="activeMoreNavBg"
                          className="absolute inset-0 rounded-xl"
                          style={{
                            background: 'rgba(74, 222, 128, 0.15)',
                          }}
                          transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                        />
                      )}

                      <motion.div
                        whileTap={{ scale: 0.85 }}
                        className="relative z-10"
                      >
                        <Icon className="w-5 h-5" />
                      </motion.div>

                      <span className="relative z-10 text-[11px] font-medium">
                        {item.label}
                      </span>
                    </button>
                  )
                })}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div
          className="relative flex items-center gap-1 px-3 py-2.5 rounded-2xl nav-container"
          style={{
            backdropFilter: 'blur(24px) saturate(150%)',
            WebkitBackdropFilter: 'blur(24px) saturate(150%)',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.15), 0 0 0 1px rgba(128, 128, 128, 0.08) inset',
          }}
        >
          {mainNavItems.map((item) => {
            const Icon = item.icon
            const isActive = currentPage === item.id

            return (
              <button
                key={item.id}
                onClick={() => onPageChange(item.id)}
                className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
                style={{
                  opacity: isActive ? 1 : 0.5,
                  color: isActive ? 'var(--accent)' : 'var(--text-secondary)',
                }}
              >
                {isActive && (
                  <motion.div
                    layoutId="activeNavBg"
                    className="absolute inset-0 rounded-xl"
                    style={{
                      background: 'rgba(74, 222, 128, 0.15)',
                    }}
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                  />
                )}

                <motion.div
                  whileTap={{ scale: 0.85 }}
                  className="relative z-10"
                >
                  <Icon className="w-5 h-5" />
                </motion.div>

                <motion.span
                  className="relative z-10 text-[11px] font-medium"
                  initial={false}
                  animate={{
                    opacity: isActive ? 1 : 0,
                    height: isActive ? 'auto' : 0,
                  }}
                  transition={{ duration: 0.2 }}
                >
                  {item.label}
                </motion.span>
              </button>
            )
          })}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="relative flex flex-col items-center gap-1 px-4 py-2 rounded-xl transition-all duration-200"
            style={{
              opacity: isMoreActive || isExpanded ? 1 : 0.5,
              color: isMoreActive || isExpanded ? 'var(--accent)' : 'var(--text-secondary)',
            }}
          >
            {(isMoreActive || isExpanded) && (
              <motion.div
                layoutId="activeNavBg"
                className="absolute inset-0 rounded-xl"
                style={{
                  background: 'rgba(74, 222, 128, 0.15)',
                }}
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}

            <motion.div
              whileTap={{ scale: 0.85 }}
              className="relative z-10"
              animate={{ rotate: isExpanded ? 45 : 0 }}
              transition={{ duration: 0.2 }}
            >
              <Grid3X3 className="w-5 h-5" />
            </motion.div>

            <motion.span
              className="relative z-10 text-[11px] font-medium"
              initial={false}
              animate={{
                opacity: isExpanded ? 1 : 0,
                height: isExpanded ? 'auto' : 0,
              }}
              transition={{ duration: 0.2 }}
            >
              更多
            </motion.span>
          </button>
        </div>
      </div>
    </nav>
  )
}
