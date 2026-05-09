import { createContext, useState, useEffect, useCallback, useContext, useMemo } from 'react'

interface AccessibilityContextValue {
  highContrast: boolean
  setHighContrast: (v: boolean) => void
  reduceMotion: boolean
  setReduceMotion: (v: boolean) => void
  largeText: boolean
  setLargeText: (v: boolean) => void
  screenReaderOptimized: boolean
  setScreenReaderOptimized: (v: boolean) => void
  keyboardFocusVisible: boolean
  setKeyboardFocusVisible: (v: boolean) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
}

export const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) {
    throw new Error('useAccessibility must be used within an AccessibilityProvider')
  }
  return ctx
}

function getStoredValue(key: string, fallback: boolean): boolean {
  try {
    const saved = localStorage.getItem(`a11y-${key}`)
    if (saved !== null) return saved === 'true'
  } catch {}
  return fallback
}

export function AccessibilityProvider({ children }: { children: React.ReactNode }) {
  const [highContrast, setHighContrastState] = useState(() => getStoredValue('highContrast', false))
  const [reduceMotion, setReduceMotionState] = useState(() => {
    const stored = getStoredValue('reduceMotion', false)
    if (stored) return true
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })
  const [largeText, setLargeTextState] = useState(() => getStoredValue('largeText', false))
  const [screenReaderOptimized, setScreenReaderOptimizedState] = useState(() => {
    return getStoredValue('screenReaderOptimized', false)
  })
  const [keyboardFocusVisible, setKeyboardFocusVisibleState] = useState(() => getStoredValue('keyboardFocusVisible', true))

  useEffect(() => {
    const root = document.documentElement
    root.setAttribute('data-high-contrast', String(highContrast))
    root.setAttribute('data-reduce-motion', String(reduceMotion))
    root.setAttribute('data-large-text', String(largeText))
    root.setAttribute('data-screen-reader', String(screenReaderOptimized))
    root.setAttribute('data-keyboard-focus', String(keyboardFocusVisible))
  }, [highContrast, reduceMotion, largeText, screenReaderOptimized, keyboardFocusVisible])

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('a11y-reduceMotion')) {
        setReduceMotionState(e.matches)
      }
    }
    media.addEventListener('change', handler)
    return () => media.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    let isUsingKeyboard = false

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Tab') {
        isUsingKeyboard = true
        if (!keyboardFocusVisible) setKeyboardFocusVisibleState(true)
      }
    }

    const handleMouseDown = () => {
      if (isUsingKeyboard) {
        isUsingKeyboard = false
        setKeyboardFocusVisibleState(false)
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('mousedown', handleMouseDown)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('mousedown', handleMouseDown)
    }
  }, [keyboardFocusVisible])

  const setHighContrast = useCallback((v: boolean) => {
    setHighContrastState(v)
    localStorage.setItem('a11y-highContrast', String(v))
  }, [])

  const setReduceMotion = useCallback((v: boolean) => {
    setReduceMotionState(v)
    localStorage.setItem('a11y-reduceMotion', String(v))
  }, [])

  const setLargeText = useCallback((v: boolean) => {
    setLargeTextState(v)
    localStorage.setItem('a11y-largeText', String(v))
  }, [])

  const setScreenReaderOptimized = useCallback((v: boolean) => {
    setScreenReaderOptimizedState(v)
    localStorage.setItem('a11y-screenReaderOptimized', String(v))
  }, [])

  const setKeyboardFocusVisible = useCallback((v: boolean) => {
    setKeyboardFocusVisibleState(v)
    localStorage.setItem('a11y-keyboardFocusVisible', String(v))
  }, [])

  const announce = useCallback((message: string, priority: 'polite' | 'assertive' = 'polite') => {
    const el = document.createElement('div')
    el.setAttribute('role', 'status')
    el.setAttribute('aria-live', priority)
    el.setAttribute('aria-atomic', 'true')
    el.className = 'sr-only'
    el.textContent = message
    document.body.appendChild(el)
    setTimeout(() => document.body.removeChild(el), 1000)
  }, [])

  const value = useMemo(() => ({
    highContrast, setHighContrast,
    reduceMotion, setReduceMotion,
    largeText, setLargeText,
    screenReaderOptimized, setScreenReaderOptimized,
    keyboardFocusVisible, setKeyboardFocusVisible,
    announce,
  }), [highContrast, reduceMotion, largeText, screenReaderOptimized, keyboardFocusVisible, announce])

  return (
    <AccessibilityContext.Provider value={value}>
      {children}
    </AccessibilityContext.Provider>
  )
}
