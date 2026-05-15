import { useState, useCallback, useEffect } from 'react'
import { X, Minus, Square, Copy } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

interface WindowFrameProps {
  title: string
  children: React.ReactNode
  icon?: React.ReactNode
}

export default function WindowFrame({ title, children, icon }: WindowFrameProps) {
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const win = getCurrentWindow()
    win.isMaximized().then(setIsMaximized).catch(() => {})
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized).catch(() => {})
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const handleMinimize = useCallback(() => {
    getCurrentWindow().minimize().catch(() => {})
  }, [])

  const handleMaximize = useCallback(async () => {
    const win = getCurrentWindow()
    try {
      if (await win.isMaximized()) {
        await win.unmaximize()
        setIsMaximized(false)
      } else {
        await win.maximize()
        setIsMaximized(true)
      }
    } catch {}
  }, [])

  const handleClose = useCallback(() => {
    getCurrentWindow().close().catch(() => {})
  }, [])

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden rounded-xl"
      style={{ background: 'var(--bg-primary)', color: 'var(--text-primary)' }}>
      <div
        data-tauri-drag-region
        className="flex items-center justify-between h-9 px-3 shrink-0 select-none rounded-t-xl"
        style={{ background: 'var(--surface-glass-strong)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div data-tauri-drag-region className="flex items-center gap-2 min-w-0">
          {icon && <span className="text-sm opacity-70 shrink-0">{icon}</span>}
          <span data-tauri-drag-region className="text-xs font-medium opacity-80 truncate">{title}</span>
        </div>
        <div className="flex items-center gap-0.5 shrink-0" onPointerDown={e => e.stopPropagation()}>
          <button
            onClick={handleMinimize}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors duration-150"
          >
            <Minus className="w-3.5 h-3.5 opacity-60" />
          </button>
          <button
            onClick={handleMaximize}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-white/10 transition-colors duration-150"
          >
            {isMaximized
              ? <Copy className="w-3 h-3 opacity-60" />
              : <Square className="w-3 h-3 opacity-60" />
            }
          </button>
          <button
            onClick={handleClose}
            className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-red-500/80 transition-colors duration-150"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
