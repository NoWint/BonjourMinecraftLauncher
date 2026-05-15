import { Sun, Moon, Monitor } from 'lucide-react'
import { motion } from 'framer-motion'
import { useTheme } from '../hooks/useTheme'

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()

  const options = [
    { value: 'light' as const, icon: Sun, label: '浅色' },
    { value: 'dark' as const, icon: Moon, label: '深色' },
    { value: 'system' as const, icon: Monitor, label: '跟随系统' },
  ]

  return (
    <div className="glass rounded-full p-1 flex items-center gap-0.5">
      {options.map((option) => {
        const Icon = option.icon
        const isActive = theme === option.value
        return (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
              isActive
                ? 'text-theme-primary'
                : 'text-theme-muted hover:text-theme-secondary'
            }`}
            title={option.label}
          >
            {isActive && (
              <motion.div
                layoutId="themeIndicator"
                className="absolute inset-0 bg-black/10 dark:bg-white/15 rounded-full"
                transition={{ type: 'spring', stiffness: 500, damping: 30 }}
              />
            )}
            <Icon className="w-3.5 h-3.5 relative z-10" />
            <span className="relative z-10 hidden sm:inline">{option.label}</span>
          </button>
        )
      })}
    </div>
  )
}
