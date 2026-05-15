import { useState, useCallback, useEffect } from 'react'
import { getCurrentWindow } from '@tauri-apps/api/window'

export default function WindowControls() {
  const [hovered, setHovered] = useState<string | null>(null)
  const [isMaximized, setIsMaximized] = useState(false)

  useEffect(() => {
    const win = getCurrentWindow()
    win.isMaximized().then(setIsMaximized).catch(() => {})
    const unlisten = win.onResized(() => {
      win.isMaximized().then(setIsMaximized).catch(() => {})
    })
    return () => { unlisten.then(fn => fn()) }
  }, [])

  const handleClose = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await getCurrentWindow().close()
    } catch {
      /* window may already be closing */
    }
  }, [])

  const handleMinimize = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    getCurrentWindow().minimize().catch(() => {})
  }, [])

  const handleMaximize = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    const win = getCurrentWindow()
    try {
      if (await win.isMaximized()) {
        await win.unmaximize()
        setIsMaximized(false)
      } else {
        await win.maximize()
        setIsMaximized(true)
      }
    } catch {
      /* window may not support maximize */
    }
  }, [])

  const stopMouse = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const buttonBase: React.CSSProperties = {
    width: 44,
    height: 44,
    borderRadius: '50%',
    border: 'none',
    cursor: 'pointer',
    padding: 0,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: 'transparent',
    WebkitAppRegion: 'no-drag' as any,
    appRegion: 'no-drag' as any,
  }

  const dotBase: React.CSSProperties = {
    width: 14,
    height: 14,
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.15s ease',
  }

  const redBg = (hovered === 'close') ? '#ff5f57' : 'rgba(255,95,87,0.55)'
  const yellowBg = (hovered === 'minimize') ? '#febc2e' : 'rgba(254,188,46,0.55)'
  const greenBg = (hovered === 'maximize') ? '#28c840' : 'rgba(40,200,64,0.55)'

  return (
    <div
      className="fixed flex items-center no-drag"
      style={{
        top: 8,
        left: 10,
        gap: 6,
        zIndex: 99999,
      }}
    >
      <button
        onClick={handleClose}
        onMouseDown={stopMouse}
        onMouseUp={stopMouse}
        onMouseEnter={() => setHovered('close')}
        onMouseLeave={() => setHovered(null)}
        style={buttonBase}
        aria-label="关闭窗口"
        data-tauri-drag-region={undefined}
      >
        <div style={{ ...dotBase, background: redBg }}>
          {hovered === 'close' && (
            <svg width={8} height={8} viewBox="0 0 8 8">
              <line x1={1} y1={1} x2={7} y2={7} stroke="#4a0000" strokeWidth={2} />
              <line x1={7} y1={1} x2={1} y2={7} stroke="#4a0000" strokeWidth={2} />
            </svg>
          )}
        </div>
      </button>

      <button
        onClick={handleMinimize}
        onMouseDown={stopMouse}
        onMouseUp={stopMouse}
        onMouseEnter={() => setHovered('minimize')}
        onMouseLeave={() => setHovered(null)}
        style={buttonBase}
        aria-label="最小化窗口"
        data-tauri-drag-region={undefined}
      >
        <div style={{ ...dotBase, background: yellowBg }}>
          {hovered === 'minimize' && (
            <svg width={8} height={8} viewBox="0 0 8 8">
              <line x1={1} y1={4} x2={7} y2={4} stroke="#5a3e00" strokeWidth={2} />
            </svg>
          )}
        </div>
      </button>

      <button
        onClick={handleMaximize}
        onMouseDown={stopMouse}
        onMouseUp={stopMouse}
        onMouseEnter={() => setHovered('maximize')}
        onMouseLeave={() => setHovered(null)}
        style={buttonBase}
        aria-label={isMaximized ? '还原窗口' : '最大化窗口'}
        data-tauri-drag-region={undefined}
      >
        <div style={{ ...dotBase, background: greenBg }}>
          {hovered === 'maximize' && (
            isMaximized
              ? (
                <svg width={8} height={8} viewBox="0 0 8 8">
                  <rect x={1} y={0} width={5} height={5} stroke="#003a0a" strokeWidth={1.5} fill="none" />
                  <rect x={2} y={1} width={5} height={5} stroke="#003a0a" strokeWidth={1.5} fill="none" />
                </svg>
              )
              : (
                <svg width={8} height={8} viewBox="0 0 8 8">
                  <rect x={1} y={1} width={6} height={6} stroke="#003a0a" strokeWidth={1.5} fill="none" />
                </svg>
              )
          )}
        </div>
      </button>
    </div>
  )
}