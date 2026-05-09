import { createContext, useState, useEffect, useCallback, useMemo, useContext, useRef } from 'react'

export type ThemeMode = 'dark' | 'light' | 'system'

export interface ThemeColors {
  accent: string
  accentDim: string
  accentGlow: string
  accentText: string
  bgPrimary: string
  bgSecondary: string
  bgElevated: string
  bgElevatedStrong: string
  textPrimary: string
  textSecondary: string
  textMuted: string
  borderSubtle: string
}

export interface ThemePreset {
  id: string
  name: string
  mode: 'dark' | 'light'
  colors: ThemeColors
  isCustom?: boolean
  createdAt?: number
}

export interface ThemeTransition {
  enabled: boolean
  duration: number
}

export interface ThemeContextValue {
  theme: ThemeMode
  resolvedTheme: 'dark' | 'light'
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  currentPreset: ThemePreset
  setPreset: (presetId: string) => void
  presets: ThemePreset[]
  customAccent: string
  setCustomAccent: (color: string) => void
  isCustom: boolean
  createCustomPreset: (name: string, mode: 'dark' | 'light', colors: Partial<ThemeColors>, basePresetId?: string) => ThemePreset
  deleteCustomPreset: (presetId: string) => void
  exportTheme: (presetId: string) => string
  importTheme: (json: string) => ThemePreset | null
  transition: ThemeTransition
  setTransition: (t: ThemeTransition) => void
  isTransitioning: boolean
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}

function generateColorsFromAccent(accent: string, mode: 'dark' | 'light'): ThemeColors {
  if (mode === 'dark') {
    return {
      accent,
      accentDim: hexToRgba(accent, 0.15),
      accentGlow: hexToRgba(accent, 0.5),
      accentText: '#000000',
      bgPrimary: '#000000',
      bgSecondary: '#0a0a0a',
      bgElevated: 'rgba(20, 20, 20, 0.6)',
      bgElevatedStrong: 'rgba(20, 20, 20, 0.85)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
    }
  }
  return {
    accent,
    accentDim: hexToRgba(accent, 0.1),
    accentGlow: hexToRgba(accent, 0.3),
    accentText: '#ffffff',
    bgPrimary: '#f5f5f7',
    bgSecondary: '#ffffff',
    bgElevated: 'rgba(255, 255, 255, 0.8)',
    bgElevatedStrong: 'rgba(255, 255, 255, 0.95)',
    textPrimary: '#1a1a1a',
    textSecondary: 'rgba(0, 0, 0, 0.6)',
    textMuted: 'rgba(0, 0, 0, 0.4)',
    borderSubtle: 'rgba(0, 0, 0, 0.08)',
  }
}

export const BUILT_IN_PRESETS: ThemePreset[] = [
  {
    id: 'minecraft',
    name: 'Minecraft 绿',
    mode: 'dark',
    colors: {
      accent: '#4ade80',
      accentDim: 'rgba(74, 222, 128, 0.15)',
      accentGlow: 'rgba(74, 222, 128, 0.5)',
      accentText: '#000000',
      bgPrimary: '#000000',
      bgSecondary: '#0a0a0a',
      bgElevated: 'rgba(20, 20, 20, 0.6)',
      bgElevatedStrong: 'rgba(20, 20, 20, 0.85)',
      textPrimary: '#ffffff',
      textSecondary: 'rgba(255, 255, 255, 0.7)',
      textMuted: 'rgba(255, 255, 255, 0.4)',
      borderSubtle: 'rgba(255, 255, 255, 0.08)',
    },
  },
  {
    id: 'ocean',
    name: '深海蓝',
    mode: 'dark',
    colors: {
      accent: '#38bdf8',
      accentDim: 'rgba(56, 189, 248, 0.15)',
      accentGlow: 'rgba(56, 189, 248, 0.5)',
      accentText: '#000000',
      bgPrimary: '#020617',
      bgSecondary: '#0f172a',
      bgElevated: 'rgba(15, 23, 42, 0.6)',
      bgElevatedStrong: 'rgba(15, 23, 42, 0.85)',
      textPrimary: '#f1f5f9',
      textSecondary: 'rgba(241, 245, 249, 0.7)',
      textMuted: 'rgba(241, 245, 249, 0.4)',
      borderSubtle: 'rgba(241, 245, 249, 0.08)',
    },
  },
  {
    id: 'sunset',
    name: '日落橙',
    mode: 'dark',
    colors: {
      accent: '#fb923c',
      accentDim: 'rgba(251, 146, 60, 0.15)',
      accentGlow: 'rgba(251, 146, 60, 0.5)',
      accentText: '#000000',
      bgPrimary: '#0c0a09',
      bgSecondary: '#1c1917',
      bgElevated: 'rgba(28, 25, 23, 0.6)',
      bgElevatedStrong: 'rgba(28, 25, 23, 0.85)',
      textPrimary: '#fafaf9',
      textSecondary: 'rgba(250, 250, 249, 0.7)',
      textMuted: 'rgba(250, 250, 249, 0.4)',
      borderSubtle: 'rgba(250, 250, 249, 0.08)',
    },
  },
  {
    id: 'lavender',
    name: '薰衣草紫',
    mode: 'dark',
    colors: {
      accent: '#c084fc',
      accentDim: 'rgba(192, 132, 252, 0.15)',
      accentGlow: 'rgba(192, 132, 252, 0.5)',
      accentText: '#000000',
      bgPrimary: '#0a0612',
      bgSecondary: '#1a1525',
      bgElevated: 'rgba(26, 21, 37, 0.6)',
      bgElevatedStrong: 'rgba(26, 21, 37, 0.85)',
      textPrimary: '#f5f3ff',
      textSecondary: 'rgba(245, 243, 255, 0.7)',
      textMuted: 'rgba(245, 243, 255, 0.4)',
      borderSubtle: 'rgba(245, 243, 255, 0.08)',
    },
  },
  {
    id: 'rose',
    name: '玫瑰粉',
    mode: 'dark',
    colors: {
      accent: '#f472b6',
      accentDim: 'rgba(244, 114, 182, 0.15)',
      accentGlow: 'rgba(244, 114, 182, 0.5)',
      accentText: '#000000',
      bgPrimary: '#12050b',
      bgSecondary: '#23141c',
      bgElevated: 'rgba(35, 20, 28, 0.6)',
      bgElevatedStrong: 'rgba(35, 20, 28, 0.85)',
      textPrimary: '#fdf2f8',
      textSecondary: 'rgba(253, 242, 248, 0.7)',
      textMuted: 'rgba(253, 242, 248, 0.4)',
      borderSubtle: 'rgba(253, 242, 248, 0.08)',
    },
  },
  {
    id: 'ember',
    name: '余烬红',
    mode: 'dark',
    colors: {
      accent: '#ef4444',
      accentDim: 'rgba(239, 68, 68, 0.15)',
      accentGlow: 'rgba(239, 68, 68, 0.5)',
      accentText: '#000000',
      bgPrimary: '#0a0505',
      bgSecondary: '#1a0f0f',
      bgElevated: 'rgba(26, 15, 15, 0.6)',
      bgElevatedStrong: 'rgba(26, 15, 15, 0.85)',
      textPrimary: '#fef2f2',
      textSecondary: 'rgba(254, 242, 242, 0.7)',
      textMuted: 'rgba(254, 242, 242, 0.4)',
      borderSubtle: 'rgba(254, 242, 242, 0.08)',
    },
  },
  {
    id: 'aurora',
    name: '极光青',
    mode: 'dark',
    colors: {
      accent: '#22d3ee',
      accentDim: 'rgba(34, 211, 238, 0.15)',
      accentGlow: 'rgba(34, 211, 238, 0.5)',
      accentText: '#000000',
      bgPrimary: '#030a0c',
      bgSecondary: '#0a1a1f',
      bgElevated: 'rgba(10, 26, 31, 0.6)',
      bgElevatedStrong: 'rgba(10, 26, 31, 0.85)',
      textPrimary: '#ecfeff',
      textSecondary: 'rgba(236, 254, 255, 0.7)',
      textMuted: 'rgba(236, 254, 255, 0.4)',
      borderSubtle: 'rgba(236, 254, 255, 0.08)',
    },
  },
  {
    id: 'gold',
    name: '末影金',
    mode: 'dark',
    colors: {
      accent: '#fbbf24',
      accentDim: 'rgba(251, 191, 36, 0.15)',
      accentGlow: 'rgba(251, 191, 36, 0.5)',
      accentText: '#000000',
      bgPrimary: '#0a0805',
      bgSecondary: '#1a1508',
      bgElevated: 'rgba(26, 21, 8, 0.6)',
      bgElevatedStrong: 'rgba(26, 21, 8, 0.85)',
      textPrimary: '#fffbeb',
      textSecondary: 'rgba(255, 251, 235, 0.7)',
      textMuted: 'rgba(255, 251, 235, 0.4)',
      borderSubtle: 'rgba(255, 251, 235, 0.08)',
    },
  },
  {
    id: 'light',
    name: '纯净白',
    mode: 'light',
    colors: {
      accent: '#16a34a',
      accentDim: 'rgba(22, 163, 74, 0.1)',
      accentGlow: 'rgba(22, 163, 74, 0.3)',
      accentText: '#ffffff',
      bgPrimary: '#f5f5f7',
      bgSecondary: '#ffffff',
      bgElevated: 'rgba(255, 255, 255, 0.8)',
      bgElevatedStrong: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#1a1a1a',
      textSecondary: 'rgba(0, 0, 0, 0.6)',
      textMuted: 'rgba(0, 0, 0, 0.4)',
      borderSubtle: 'rgba(0, 0, 0, 0.08)',
    },
  },
  {
    id: 'light-blue',
    name: '天空蓝',
    mode: 'light',
    colors: {
      accent: '#0284c7',
      accentDim: 'rgba(2, 132, 199, 0.1)',
      accentGlow: 'rgba(2, 132, 199, 0.3)',
      accentText: '#ffffff',
      bgPrimary: '#f0f9ff',
      bgSecondary: '#ffffff',
      bgElevated: 'rgba(255, 255, 255, 0.8)',
      bgElevatedStrong: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#0c4a6e',
      textSecondary: 'rgba(12, 74, 110, 0.6)',
      textMuted: 'rgba(12, 74, 110, 0.4)',
      borderSubtle: 'rgba(12, 74, 110, 0.08)',
    },
  },
  {
    id: 'light-warm',
    name: '暖阳橙',
    mode: 'light',
    colors: {
      accent: '#ea580c',
      accentDim: 'rgba(234, 88, 12, 0.1)',
      accentGlow: 'rgba(234, 88, 12, 0.3)',
      accentText: '#ffffff',
      bgPrimary: '#fffbeb',
      bgSecondary: '#ffffff',
      bgElevated: 'rgba(255, 255, 255, 0.8)',
      bgElevatedStrong: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#422006',
      textSecondary: 'rgba(66, 32, 6, 0.6)',
      textMuted: 'rgba(66, 32, 6, 0.4)',
      borderSubtle: 'rgba(66, 32, 6, 0.08)',
    },
  },
  {
    id: 'light-lavender',
    name: '薰衣草白',
    mode: 'light',
    colors: {
      accent: '#7c3aed',
      accentDim: 'rgba(124, 58, 237, 0.1)',
      accentGlow: 'rgba(124, 58, 237, 0.3)',
      accentText: '#ffffff',
      bgPrimary: '#faf5ff',
      bgSecondary: '#ffffff',
      bgElevated: 'rgba(255, 255, 255, 0.8)',
      bgElevatedStrong: 'rgba(255, 255, 255, 0.95)',
      textPrimary: '#3b0764',
      textSecondary: 'rgba(59, 7, 100, 0.6)',
      textMuted: 'rgba(59, 7, 100, 0.4)',
      borderSubtle: 'rgba(59, 7, 100, 0.08)',
    },
  },
]

const CUSTOM_PRESETS_KEY = 'theme-custom-presets'
const THEME_TRANSITION_KEY = 'theme-transition'

function loadCustomPresets(): ThemePreset[] {
  try {
    const saved = localStorage.getItem(CUSTOM_PRESETS_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

function saveCustomPresets(presets: ThemePreset[]) {
  localStorage.setItem(CUSTOM_PRESETS_KEY, JSON.stringify(presets))
}

function getSystemTheme(): 'dark' | 'light' {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

function getResolvedTheme(theme: ThemeMode): 'dark' | 'light' {
  if (theme === 'system') return getSystemTheme()
  return theme
}

function applyThemeToDOM(preset: ThemePreset, customAccent?: string, transition?: ThemeTransition) {
  const root = document.documentElement
  const accent = customAccent || preset.colors.accent
  const accentDim = customAccent ? hexToRgba(customAccent, 0.15) : preset.colors.accentDim
  const accentGlow = customAccent ? hexToRgba(customAccent, 0.5) : preset.colors.accentGlow

  if (transition?.enabled) {
    root.style.setProperty('--theme-transition-duration', `${transition.duration}ms`)
    root.classList.add('theme-transitioning')
    setTimeout(() => root.classList.remove('theme-transitioning'), transition.duration + 50)
  }

  root.style.setProperty('--bg-primary', preset.colors.bgPrimary)
  root.style.setProperty('--bg-secondary', preset.colors.bgSecondary)
  root.style.setProperty('--bg-elevated', preset.colors.bgElevated)
  root.style.setProperty('--bg-elevated-strong', preset.colors.bgElevatedStrong)
  root.style.setProperty('--text-primary', preset.colors.textPrimary)
  root.style.setProperty('--text-secondary', preset.colors.textSecondary)
  root.style.setProperty('--text-muted', preset.colors.textMuted)
  root.style.setProperty('--border-subtle', preset.colors.borderSubtle)
  root.style.setProperty('--accent', accent)
  root.style.setProperty('--accent-dim', accentDim)
  root.style.setProperty('--accent-glow', accentGlow)
  root.style.setProperty('--accent-text', preset.colors.accentText)

  if (preset.mode === 'light') {
    root.setAttribute('data-theme', 'light')
  } else {
    root.removeAttribute('data-theme')
  }
}

export const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeMode>(() => {
    return (localStorage.getItem('theme') as ThemeMode) || 'system'
  })
  const [presetId, setPresetId] = useState<string>(() => {
    return localStorage.getItem('theme-preset') || 'minecraft'
  })
  const [customAccent, setCustomAccentState] = useState<string>(() => {
    return localStorage.getItem('theme-custom-accent') || ''
  })
  const [customPresets, setCustomPresets] = useState<ThemePreset[]>(loadCustomPresets)
  const [transition, setTransitionState] = useState<ThemeTransition>(() => {
    try {
      const saved = localStorage.getItem(THEME_TRANSITION_KEY)
      if (saved) return JSON.parse(saved)
    } catch {}
    return { enabled: true, duration: 300 }
  })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const transitionTimerRef = useRef<ReturnType<typeof setTimeout>>()

  const resolvedTheme = getResolvedTheme(theme)

  const allPresets = useMemo(() => {
    return [...BUILT_IN_PRESETS, ...customPresets]
  }, [customPresets])

  const currentPreset = useMemo(() => {
    return allPresets.find(p => p.id === presetId) || BUILT_IN_PRESETS[0]
  }, [presetId, allPresets])

  const isCustom = !!customAccent

  useEffect(() => {
    applyThemeToDOM(currentPreset, customAccent || undefined, transition)
  }, [currentPreset, customAccent, transition])

  useEffect(() => {
    if (theme !== 'system') return
    const media = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = () => {
      applyThemeToDOM(currentPreset, customAccent || undefined, transition)
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [theme, currentPreset, customAccent, transition])

  const setTheme = useCallback((newTheme: ThemeMode) => {
    setIsTransitioning(true)
    setThemeState(newTheme)
    localStorage.setItem('theme', newTheme)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), transition.duration + 50)
  }, [transition.duration])

  const toggleTheme = useCallback(() => {
    setIsTransitioning(true)
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark'
      localStorage.setItem('theme', next)
      return next
    })
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), transition.duration + 50)
  }, [transition.duration])

  const setPreset = useCallback((newPresetId: string) => {
    setIsTransitioning(true)
    setPresetId(newPresetId)
    localStorage.setItem('theme-preset', newPresetId)
    if (transitionTimerRef.current) clearTimeout(transitionTimerRef.current)
    transitionTimerRef.current = setTimeout(() => setIsTransitioning(false), transition.duration + 50)
  }, [transition.duration])

  const setCustomAccent = useCallback((color: string) => {
    setCustomAccentState(color)
    if (color) {
      localStorage.setItem('theme-custom-accent', color)
    } else {
      localStorage.removeItem('theme-custom-accent')
    }
  }, [])

  const createCustomPreset = useCallback((name: string, mode: 'dark' | 'light', colors: Partial<ThemeColors>, basePresetId?: string): ThemePreset => {
    const basePreset = basePresetId
      ? allPresets.find(p => p.id === basePresetId) || BUILT_IN_PRESETS[0]
      : BUILT_IN_PRESETS[0]

    const fullColors: ThemeColors = {
      ...generateColorsFromAccent(colors.accent || basePreset.colors.accent, mode),
      ...basePreset.colors,
      ...colors,
    }

    const newPreset: ThemePreset = {
      id: `custom-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      name,
      mode,
      colors: fullColors,
      isCustom: true,
      createdAt: Date.now(),
    }

    setCustomPresets(prev => {
      const updated = [...prev, newPreset]
      saveCustomPresets(updated)
      return updated
    })

    return newPreset
  }, [allPresets])

  const deleteCustomPreset = useCallback((presetIdToDelete: string) => {
    setCustomPresets(prev => {
      const updated = prev.filter(p => p.id !== presetIdToDelete)
      saveCustomPresets(updated)
      return updated
    })
    if (presetId === presetIdToDelete) {
      setPreset(BUILT_IN_PRESETS[0].id)
    }
  }, [presetId, setPreset])

  const exportTheme = useCallback((targetPresetId: string): string => {
    const preset = allPresets.find(p => p.id === targetPresetId)
    if (!preset) return ''
    return JSON.stringify({
      bonjourTheme: true,
      version: 1,
      preset: {
        name: preset.name,
        mode: preset.mode,
        colors: preset.colors,
      },
    }, null, 2)
  }, [allPresets])

  const importTheme = useCallback((json: string): ThemePreset | null => {
    try {
      const data = JSON.parse(json)
      if (!data.bonjourTheme || !data.preset) return null
      const { name, mode, colors } = data.preset
      if (!name || !mode || !colors?.accent) return null
      return createCustomPreset(name, mode, colors)
    } catch {
      return null
    }
  }, [createCustomPreset])

  const setTransition = useCallback((t: ThemeTransition) => {
    setTransitionState(t)
    localStorage.setItem(THEME_TRANSITION_KEY, JSON.stringify(t))
  }, [])

  const value = useMemo(() => ({
    theme,
    resolvedTheme,
    setTheme,
    toggleTheme,
    currentPreset,
    setPreset,
    presets: allPresets,
    customAccent,
    setCustomAccent,
    isCustom,
    createCustomPreset,
    deleteCustomPreset,
    exportTheme,
    importTheme,
    transition,
    setTransition,
    isTransitioning,
  }), [theme, resolvedTheme, setTheme, toggleTheme, currentPreset, setPreset, allPresets, customAccent, setCustomAccent, isCustom, createCustomPreset, deleteCustomPreset, exportTheme, importTheme, transition, setTransition, isTransitioning])

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) {
    throw new Error('useTheme must be used within a ThemeProvider')
  }
  return ctx
}
