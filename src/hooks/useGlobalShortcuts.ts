import { useEffect, useRef } from 'react'

interface ShortcutConfig {
  key: string
  modifiers?: ('ctrl' | 'alt' | 'shift' | 'meta')[]
  action: () => void
  description: string
  preventDefault?: boolean
}

export function useGlobalShortcuts(shortcuts: ShortcutConfig[]) {
  const shortcutsRef = useRef(shortcuts)
  shortcutsRef.current = shortcuts

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      for (const shortcut of shortcutsRef.current) {
        const keyMatch = e.key.toLowerCase() === shortcut.key.toLowerCase()
        const modifiersMatch =
          !shortcut.modifiers ||
          shortcut.modifiers.every((mod) => {
            switch (mod) {
              case 'ctrl':
                return e.ctrlKey
              case 'alt':
                return e.altKey
              case 'shift':
                return e.shiftKey
              case 'meta':
                return e.metaKey
              default:
                return false
            }
          })

        if (keyMatch && modifiersMatch) {
          if (shortcut.preventDefault !== false) {
            e.preventDefault()
          }
          shortcut.action()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])
}
