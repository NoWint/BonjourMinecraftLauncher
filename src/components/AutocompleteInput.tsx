import { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Cpu, FolderOpen, ChevronRight } from 'lucide-react'

interface AutocompleteOption {
  value: string
  label: string
  detail?: string
  icon?: string
}

interface AutocompleteInputProps {
  value: string
  onChange: (value: string) => void
  onFetchOptions: (query: string) => Promise<AutocompleteOption[]>
  placeholder?: string
  icon?: 'java' | 'folder' | 'server'
  label?: string
}

export default function AutocompleteInput({
  value,
  onChange,
  onFetchOptions,
  placeholder = '输入或选择...',
  icon = 'folder',
  label,
}: AutocompleteInputProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<AutocompleteOption[]>([])
  const [loading, setLoading] = useState(false)
  const [highlightedIndex, setHighlightedIndex] = useState(-1)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const fetchOptions = useCallback(async (query: string) => {
    setLoading(true)
    try {
      const results = await onFetchOptions(query)
      setOptions(results)
      setHighlightedIndex(-1)
    } catch (e) {
      console.warn('Autocomplete fetch failed:', e)
      setOptions([])
    } finally {
      setLoading(false)
    }
  }, [onFetchOptions])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleInputChange = (newValue: string) => {
    onChange(newValue)
    setIsOpen(true)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => fetchOptions(newValue), 200)
  }

  const handleFocus = () => {
    setIsOpen(true)
    if (options.length === 0) fetchOptions(value)
  }

  const handleSelect = (option: AutocompleteOption) => {
    onChange(option.value)
    setIsOpen(false)
    inputRef.current?.blur()
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) return
    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setHighlightedIndex(prev => Math.min(prev + 1, options.length - 1))
        break
      case 'ArrowUp':
        e.preventDefault()
        setHighlightedIndex(prev => Math.max(prev - 1, -1))
        break
      case 'Enter':
        e.preventDefault()
        if (highlightedIndex >= 0 && highlightedIndex < options.length) {
          handleSelect(options[highlightedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        break
    }
  }

  const IconComponent = icon === 'java' ? Cpu : icon === 'folder' ? FolderOpen : Search

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <label className="text-xs font-medium mb-1 block" style={{ color: 'var(--text-muted)' }}>{label}</label>
      )}
      <div className="relative">
        <IconComponent className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5" style={{ color: 'var(--text-muted)' }} />
        <input
          ref={inputRef}
          type="text"
          value={value}
          onChange={e => handleInputChange(e.target.value)}
          onFocus={handleFocus}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-9 pr-3 py-2 rounded-lg text-sm outline-none transition-all"
          style={{
            background: 'var(--bg-hover)',
            color: 'var(--text-primary)',
            border: isOpen ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
          }}
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 0.8, repeat: Infinity, ease: 'linear' }}
              className="w-3.5 h-3.5 rounded-full"
              style={{ border: '1.5px solid var(--border-subtle)', borderTopColor: 'var(--accent)' }}
            />
          </div>
        )}
      </div>

      <AnimatePresence>
        {isOpen && options.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute z-50 w-full mt-1 py-1 rounded-xl overflow-hidden glass-strong"
            style={{
              border: '1px solid var(--border-subtle)',
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)',
              maxHeight: '240px',
              overflowY: 'auto',
            }}
          >
            {options.map((option, index) => (
              <button
                key={option.value}
                onClick={() => handleSelect(option)}
                onMouseEnter={() => setHighlightedIndex(index)}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-left transition-all"
                style={{
                  background: index === highlightedIndex ? 'var(--bg-hover)' : 'transparent',
                }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium truncate" style={{ color: 'var(--text-primary)' }}>
                    {option.label}
                  </p>
                  {option.detail && (
                    <p className="text-xs truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                      {option.detail}
                    </p>
                  )}
                </div>
                {index === highlightedIndex && (
                  <ChevronRight className="w-3 h-3 flex-shrink-0" style={{ color: 'var(--text-muted)' }} />
                )}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
