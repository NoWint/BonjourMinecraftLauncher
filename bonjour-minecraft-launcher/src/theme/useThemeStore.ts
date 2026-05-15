import { create } from 'zustand'

export type ThemeId = 'cassette' | 'wabi-sabi'

interface ThemeState {
  activeTheme: ThemeId
  isSwitching: boolean
  switchTheme: (target: ThemeId) => void
  setSwitching: (v: boolean) => void
  toggle: () => void
  init: () => void
}

function loadTheme(): ThemeId {
  try {
    const stored = localStorage.getItem('bonjour-theme-id')
    if (stored === 'cassette' || stored === 'wabi-sabi') return stored
  } catch { /* ignore */ }
  return 'cassette'
}

function saveTheme(id: ThemeId) {
  try { localStorage.setItem('bonjour-theme-id', id) } catch { /* ignore */ }
}

export const useThemeStore = create<ThemeState>()((set, get) => ({
  activeTheme: 'cassette',
  isSwitching: false,

  switchTheme: (target) => {
    const current = get().activeTheme
    if (current === target || get().isSwitching) return
    set({ isSwitching: true, activeTheme: target })
    saveTheme(target)
    document.documentElement.setAttribute('data-theme', target)
    if (target === 'cassette') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },

  setSwitching: (v) => set({ isSwitching: v }),

  toggle: () => {
    const next = get().activeTheme === 'cassette' ? 'wabi-sabi' : 'cassette'
    get().switchTheme(next)
  },

  init: () => {
    const theme = loadTheme()
    set({ activeTheme: theme })
    document.documentElement.setAttribute('data-theme', theme)
    if (theme === 'cassette') {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  },
}))