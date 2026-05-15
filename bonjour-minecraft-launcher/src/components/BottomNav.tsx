import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useThemeStore } from '../theme/useThemeStore'
import ThemeIcon, { IconName } from '../theme/icons'

export type Page = 'home' | 'versions' | 'mods' | 'modpack' | 'servers' | 'worlds' | 'resources' | 'accounts' | 'settings' | 'appearance' | 'stats'

interface NavConfig {
  page: Page
  label: string
  icon: IconName
  cassetteLabel: string
  wabiLabel: string
}

interface BottomNavProps {
  currentPage: Page
  onPageChange: (page: Page) => void
  isLaunching?: boolean
  onOpenLauncher?: () => void
}

const NAV_CONFIGS: NavConfig[] = [
  { page: 'home', label: 'nav.home', icon: 'home', cassetteLabel: 'HOME', wabiLabel: '\u30DB\u30FC\u30E0' },
  { page: 'versions', label: 'nav.versions', icon: 'versions', cassetteLabel: 'VERS', wabiLabel: '\u30D0\u30FC\u30B8\u30E7\u30F3' },
  { page: 'mods', label: 'nav.mods', icon: 'mods', cassetteLabel: 'MODS', wabiLabel: 'MOD' },
  { page: 'modpack', label: 'nav.modpacks', icon: 'modpack', cassetteLabel: 'PACK', wabiLabel: '\u30D1\u30C3\u30AF' },
  { page: 'servers', label: 'nav.servers', icon: 'servers', cassetteLabel: 'SERV', wabiLabel: '\u30B5\u30FC\u30D0\u30FC' },
  { page: 'worlds', label: 'nav.worlds', icon: 'worlds', cassetteLabel: 'WRLD', wabiLabel: '\u30EF\u30FC\u30EB\u30C9' },
  { page: 'resources', label: 'nav.resources', icon: 'resources', cassetteLabel: 'RESC', wabiLabel: '\u30EA\u30BD\u30FC\u30B9' },
  { page: 'accounts', label: 'nav.accounts', icon: 'accounts', cassetteLabel: 'USER', wabiLabel: '\u30A2\u30AB\u30A6\u30F3\u30C8' },
  { page: 'settings', label: 'nav.settings', icon: 'settings', cassetteLabel: 'CONF', wabiLabel: '\u8A2D\u5B9A' },
  { page: 'appearance', label: 'nav.appearance', icon: 'appearance', cassetteLabel: 'LOOK', wabiLabel: '\u5916\u89B3' },
  { page: 'stats', label: 'nav.stats', icon: 'stats', cassetteLabel: 'STAT', wabiLabel: '\u7D71\u8A08' },
]

export default function BottomNav({ currentPage, onPageChange, isLaunching, onOpenLauncher }: BottomNavProps) {
  const { t } = useTranslation()
  const theme = useThemeStore((s) => s.activeTheme)
  const [showAllTabs, setShowAllTabs] = useState(false)
  const visibleConfigs = NAV_CONFIGS.slice(0, showAllTabs ? NAV_CONFIGS.length : 5)
  const isCassette = theme === 'cassette'

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 pt-2 pb-3 px-2"
      style={{
        background: isCassette
          ? 'linear-gradient(to top, var(--bg-primary), transparent)'
          : 'linear-gradient(to top, rgba(245,240,232,0.95), rgba(245,240,232,0.5) 60%, transparent)',
      }}
    >
      <div className="flex items-end justify-center gap-1.5">
        <div
          className="flex items-center gap-1 px-2 py-1.5"
          style={{
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            borderRadius: 'var(--radius-md)',
            boxShadow: isCassette ? 'none' : 'var(--shadow-sm)',
          }}
        >
          {visibleConfigs.map((config) => {
            const isActive = currentPage === config.page
            return (
              <button
                key={config.page}
                onClick={() => onPageChange(config.page)}
                className="relative flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[48px]"
                style={{
                  background: isActive ? 'var(--accent-dim)' : 'transparent',
                  border: isActive ? '1px solid var(--accent)' : '1px solid transparent',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: isActive && isCassette ? '0 0 8px var(--accent-glow)' : 'none',
                  color: isActive ? 'var(--accent)' : 'var(--text-muted)',
                  transition: 'all 100ms ease',
                  fontFamily: isCassette ? 'var(--font-family)' : 'var(--font-family-ui)',
                }}
                title={t(config.label)}
                aria-label={t(config.label)}
              >
                <ThemeIcon name={config.icon} size={18} />
                <span className="text-[9px] font-medium leading-none">
                  {isCassette ? config.cassetteLabel : config.wabiLabel}
                </span>
              </button>
            )
          })}

          {NAV_CONFIGS.length > 5 && (
            <button
              onClick={() => setShowAllTabs((v) => !v)}
              className="flex flex-col items-center justify-center gap-0.5 py-1 px-2 min-w-[36px]"
              style={{
                color: 'var(--text-muted)',
                background: 'transparent',
                border: '1px solid transparent',
                borderRadius: 'var(--radius-sm)',
                fontFamily: isCassette ? 'var(--font-family)' : 'var(--font-family-ui)',
                fontSize: 16,
                cursor: 'pointer',
                transition: 'color 100ms ease',
              }}
              title={showAllTabs ? t('nav.showLess') : t('nav.showMore')}
              aria-label={showAllTabs ? t('nav.showLess') : t('nav.showMore')}
            >
              {showAllTabs ? '[-]' : '[+]'}
            </button>
          )}

          {isLaunching && onOpenLauncher && (
            <>
              <div style={{ width: 1, height: 24, background: 'var(--border-subtle)', margin: '0 4px' }} />
              <button
                onClick={onOpenLauncher}
                className="flex flex-col items-center justify-center gap-0.5 py-1 px-3 min-w-[48px] relative"
                style={{
                  background: 'var(--accent-dim)',
                  border: '1px solid var(--accent)',
                  borderRadius: 'var(--radius-sm)',
                  boxShadow: isCassette ? '0 0 12px var(--accent-glow)' : 'none',
                  color: 'var(--accent)',
                  fontFamily: isCassette ? 'var(--font-family)' : 'var(--font-family-ui)',
                  cursor: 'pointer',
                  animation: isCassette ? 'pulse 2s ease-in-out infinite' : 'none',
                }}
                title={t('launch.status')}
                aria-label={t('launch.status')}
              >
                <span style={{ fontSize: 14 }}>{isCassette ? '\u25B6' : '\u25B6'}</span>
                <span style={{ fontSize: 9, fontWeight: 600 }}>
                  {isCassette ? 'RUN' : '\u8D77\u52D5'}
                </span>
              </button>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}