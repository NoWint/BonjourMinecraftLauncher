import { useState, useCallback } from 'react'
import { X } from 'lucide-react'
import { getCurrentWindow } from '@tauri-apps/api/window'

export default function WindowCloseButton() {
  const [isHovered, setIsHovered] = useState(false)

  const handleClick = useCallback(async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    try {
      await getCurrentWindow().close()
    } catch (err) {
      console.error('Failed to close window:', err)
    }
  }, [])

  return (
    <button
      onClick={handleClick}
      onMouseDown={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onMouseUp={e => {
        e.preventDefault()
        e.stopPropagation()
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      className="fixed flex items-center justify-center no-drag"
      style={{
        top: 10,
        right: 14,
        width: 16,
        height: 16,
        borderRadius: '50%',
        background: isHovered ? '#ff5f57' : 'rgba(255,95,87,0.6)',
        border: 'none',
        cursor: 'pointer',
        padding: 0,
        zIndex: 99999,
        WebkitAppRegion: 'no-drag' as any,
        appRegion: 'no-drag' as any,
      }}
      aria-label="关闭窗口"
    >
      {isHovered && (
        <X style={{ width: 9, height: 9, color: '#4a0000', strokeWidth: 2.5 }} />
      )}
    </button>
  )
}
