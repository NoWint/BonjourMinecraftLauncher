import { useState, useEffect, useCallback, useRef } from 'react'
import { invoke } from '@tauri-apps/api/core'
import { listen } from '@tauri-apps/api/event'
import {
  Activity, MapPin, MemoryStick, Wifi, ChevronDown,
  ChevronUp, X, AlertTriangle, Cpu, HardDrive
} from 'lucide-react'

interface OverlayData {
  fps: number
  frameTimeMs: number
  frameTimeHistory: number[]
  fpsStability: number
  bottleneck: string | null
  cpuUsage: number
  gpuUsage: number
  memoryUsedMb: number
  memoryTotalMb: number
  memoryHistory: number[]
  oomWarning: string | null
  coordX: number | null
  coordY: number | null
  coordZ: number | null
  dimension: string | null
  biome: string | null
  direction: string | null
  serverName: string | null
  serverPingMs: number | null
  pingHistory: number[]
}

const DEFAULT_DATA: OverlayData = {
  fps: 0,
  frameTimeMs: 0,
  frameTimeHistory: [],
  fpsStability: 100,
  bottleneck: null,
  cpuUsage: 0,
  gpuUsage: 0,
  memoryUsedMb: 0,
  memoryTotalMb: 0,
  memoryHistory: [],
  oomWarning: null,
  coordX: null,
  coordY: null,
  coordZ: null,
  dimension: null,
  biome: null,
  direction: null,
  serverName: null,
  serverPingMs: null,
  pingHistory: [],
}

function Sparkline({ data, width = 60, height = 20, color = '#4ade80' }: { data: number[]; width?: number; height?: number; color?: string }) {
  if (data.length < 2) return null
  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1
  const points = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width
    const y = height - ((v - min) / range) * height
    return `${x},${y}`
  }).join(' ')
  return (
    <svg width={width} height={height} className="inline-block">
      <polyline fill="none" stroke={color} strokeWidth="1.5" points={points} />
    </svg>
  )
}

function FpsCard({ data }: { data: OverlayData }) {
  const fpsColor = data.fps >= 55 ? '#4ade80' : data.fps >= 30 ? '#fbbf24' : '#ef4444'
  return (
    <div className="overlay-card">
      <div className="card-header">
        <Activity className="w-3.5 h-3.5" style={{ color: fpsColor }} />
        <span className="card-title">FPS</span>
        {data.bottleneck && (
          <span className="bottleneck-tag">{data.bottleneck}</span>
        )}
      </div>
      <div className="card-body">
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold" style={{ color: fpsColor }}>{data.fps}</span>
          <span className="text-xs text-white/40">fps</span>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <span className="text-xs text-white/50">{data.frameTimeMs.toFixed(1)}ms</span>
          <Sparkline data={data.frameTimeHistory.slice(-30)} width={50} height={14} color={fpsColor} />
        </div>
        <div className="flex items-center gap-1 mt-1">
          <div className="stability-bar">
            <div className="stability-fill" style={{ width: `${data.fpsStability}%`, background: fpsColor }} />
          </div>
          <span className="text-xs text-white/40">{data.fpsStability.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

function CoordsCard({ data }: { data: OverlayData }) {
  const hasCoords = data.coordX !== null
  return (
    <div className="overlay-card">
      <div className="card-header">
        <MapPin className="w-3.5 h-3.5 text-blue-400" />
        <span className="card-title">坐标</span>
        {data.dimension && <span className="dimension-tag">{data.dimension}</span>}
      </div>
      <div className="card-body">
        {hasCoords ? (
          <>
            <div className="coords-grid">
              <span className="coord-label">X</span>
              <span className="coord-value">{data.coordX!.toFixed(1)}</span>
              <span className="coord-label">Y</span>
              <span className="coord-value">{data.coordY!.toFixed(1)}</span>
              <span className="coord-label">Z</span>
              <span className="coord-value">{data.coordZ!.toFixed(1)}</span>
            </div>
            {data.biome && (
              <div className="text-xs text-white/50 mt-1">🌳 {data.biome}</div>
            )}
          </>
        ) : (
          <div className="text-xs text-white/30">等待坐标数据...</div>
        )}
      </div>
    </div>
  )
}

function MemoryCard({ data }: { data: OverlayData }) {
  const ratio = data.memoryTotalMb > 0 ? data.memoryUsedMb / data.memoryTotalMb : 0
  const memColor = ratio < 0.7 ? '#4ade80' : ratio < 0.85 ? '#fbbf24' : '#ef4444'
  const usedGb = (data.memoryUsedMb / 1024).toFixed(1)
  const totalGb = (data.memoryTotalMb / 1024).toFixed(1)

  return (
    <div className="overlay-card">
      <div className="card-header">
        <MemoryStick className="w-3.5 h-3.5" style={{ color: memColor }} />
        <span className="card-title">内存</span>
      </div>
      <div className="card-body">
        <div className="flex items-baseline gap-1">
          <span className="text-lg font-bold" style={{ color: memColor }}>{usedGb}</span>
          <span className="text-xs text-white/40">/ {totalGb} GB</span>
        </div>
        <div className="mem-bar mt-1">
          <div className="mem-fill" style={{ width: `${ratio * 100}%`, background: memColor }} />
        </div>
        {data.oomWarning && (
          <div className="oom-warning">
            <AlertTriangle className="w-3 h-3 flex-shrink-0" />
            <span>{data.oomWarning}</span>
          </div>
        )}
        <Sparkline data={data.memoryHistory.slice(-30)} width={50} height={14} color={memColor} />
      </div>
    </div>
  )
}

function ServerCard({ data }: { data: OverlayData }) {
  const pingColor = !data.serverPingMs ? '#9ca3af' : data.serverPingMs < 50 ? '#4ade80' : data.serverPingMs < 100 ? '#fbbf24' : '#ef4444'
  return (
    <div className="overlay-card">
      <div className="card-header">
        <Wifi className="w-3.5 h-3.5" style={{ color: pingColor }} />
        <span className="card-title">服务器</span>
      </div>
      <div className="card-body">
        {data.serverName ? (
          <>
            <div className="text-sm text-white/80 truncate">{data.serverName}</div>
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm font-bold" style={{ color: pingColor }}>
                {data.serverPingMs ?? '—'}ms
              </span>
              <Sparkline data={data.pingHistory.slice(-20)} width={40} height={12} color={pingColor} />
            </div>
          </>
        ) : (
          <div className="text-xs text-white/30">未连接服务器</div>
        )}
      </div>
    </div>
  )
}

function SystemCard({ data }: { data: OverlayData }) {
  return (
    <div className="overlay-card">
      <div className="card-header">
        <Cpu className="w-3.5 h-3.5 text-purple-400" />
        <span className="card-title">系统</span>
      </div>
      <div className="card-body">
        <div className="sys-grid">
          <HardDrive className="w-3 h-3 text-purple-400" />
          <span className="text-xs text-white/50">CPU</span>
          <span className="text-xs font-bold text-white/80">{data.cpuUsage.toFixed(0)}%</span>
        </div>
        <div className="sys-grid mt-0.5">
          <Activity className="w-3 h-3 text-blue-400" />
          <span className="text-xs text-white/50">GPU</span>
          <span className="text-xs font-bold text-white/80">{data.gpuUsage.toFixed(0)}%</span>
        </div>
      </div>
    </div>
  )
}

export default function GameOverlay() {
  const [data, setData] = useState<OverlayData>(DEFAULT_DATA)
  const [collapsed, setCollapsed] = useState(false)
  const [position, setPosition] = useState('top-right')
  const [opacity, setOpacity] = useState(0.85)
  const [isDragging, setIsDragging] = useState(false)
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 })
  const [windowPos, setWindowPos] = useState({ x: 0, y: 0 })
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const unlistenRef = useRef<(() => void) | null>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const pos = params.get('position') || 'top-right'
    const op = parseFloat(params.get('opacity') || '0.85')
    setPosition(pos)
    setOpacity(op)
  }, [])

  useEffect(() => {
    const setupListener = async () => {
      const unlisten = await listen<OverlayData>('overlay-data', (event) => {
        setData(event.payload)
      })
      unlistenRef.current = unlisten
    }
    setupListener()

    intervalRef.current = setInterval(async () => {
      try {
        const result = await invoke<OverlayData>('overlay_get_data')
        setData(result)
      } catch (e) {
        console.warn('Failed to get overlay data:', e)
      }
    }, 1000)

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (unlistenRef.current) unlistenRef.current()
    }
  }, [])

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest('.overlay-card, button')) return
    setIsDragging(true)
    setDragOffset({ x: e.clientX - windowPos.x, y: e.clientY - windowPos.y })
  }, [windowPos])

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isDragging) return
    setWindowPos({ x: e.clientX - dragOffset.x, y: e.clientY - dragOffset.y })
  }, [isDragging, dragOffset])

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleClose = async () => {
    try {
      await invoke('overlay_close')
    } catch (e) {
      console.warn('Failed to close overlay:', e)
    }
  }

  const handleToggleCollapse = async () => {
    const newCollapsed = !collapsed
    setCollapsed(newCollapsed)
    try {
      await invoke('overlay_set_collapsed', { collapsed: newCollapsed })
    } catch (e) {
      console.warn('Failed to set collapsed:', e)
    }
  }

  const posClass = position.includes('top') ? 'top-4' : 'bottom-4'
  const posHClass = position.includes('left') ? 'left-4' : 'right-4'

  return (
    <div
      className="fixed inset-0 select-none"
      style={{ background: 'transparent' }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      <div
        className={`fixed ${posClass} ${posHClass}`}
        style={{
          transform: isDragging ? `translate(${windowPos.x}px, ${windowPos.y}px)` : undefined,
          transition: isDragging ? 'none' : 'transform 0.2s ease',
          zIndex: 9999,
        }}
      >
        <div
          className="overlay-container"
          style={{
            background: `rgba(15, 15, 20, ${opacity})`,
            backdropFilter: 'blur(20px) saturate(1.5)',
          }}
        >
          <div className="overlay-titlebar">
            <div className="flex items-center gap-1.5">
              <div className="w-2 h-2 rounded-full bg-mc-green animate-pulse" />
              <span className="text-xs font-medium text-white/60">Bonjour Overlay</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={handleToggleCollapse}
                className="titlebar-btn"
              >
                {collapsed ? <ChevronDown className="w-3 h-3" /> : <ChevronUp className="w-3 h-3" />}
              </button>
              <button
                onClick={handleClose}
                className="titlebar-btn close"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>

          {!collapsed && (
            <div className="overlay-content">
              <div className="grid grid-cols-2 gap-2">
                <FpsCard data={data} />
                <CoordsCard data={data} />
                <MemoryCard data={data} />
                <ServerCard data={data} />
              </div>
              <SystemCard data={data} />
            </div>
          )}

          {collapsed && (
            <div className="collapsed-bar">
              <span className="text-xs font-bold" style={{
                color: data.fps >= 55 ? '#4ade80' : data.fps >= 30 ? '#fbbf24' : '#ef4444'
              }}>
                {data.fps} FPS
              </span>
              {data.coordX !== null && (
                <span className="text-xs text-white/50">
                  {data.coordX.toFixed(0)}, {data.coordY!.toFixed(0)}, {data.coordZ!.toFixed(0)}
                </span>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
