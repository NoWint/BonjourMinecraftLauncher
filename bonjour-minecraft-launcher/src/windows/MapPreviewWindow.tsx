import { useState, useEffect, useCallback, useRef } from 'react'
import { Map, ZoomIn, ZoomOut, RotateCcw, Loader2, Eye } from 'lucide-react'
import { invoke } from '@tauri-apps/api/core'
import WindowFrame from './WindowFrame'
import { Map as MapIcon } from 'lucide-react'
import type { WorldMapOverview, WorldMapRender, MapDimension, WorldMapTile } from '../types/world'

const BIOME_COLORS: Record<string, string> = {
  'ocean': '#1452a0', 'deep_ocean': '#0e3d7a', 'river': '#1a6fb5',
  'beach': '#e8d9a0', 'plains': '#6db33f', 'desert': '#d4b93c',
  'forest': '#2d6a1e', 'dark_forest': '#1a4a0e', 'birch_forest': '#4a8c2a',
  'taiga': '#2d5a3e', 'swamp': '#4a6b3a', 'jungle': '#1e7a1e',
  'savanna': '#a0a030', 'badlands': '#b55830', 'mountains': '#808080',
  'snowy_plains': '#e0e8f0', 'snowy_taiga': '#6080a0', 'ice_spikes': '#a0c0e0',
  'mushroom_fields': '#8040a0', 'flower_forest': '#3a8c2a',
  'sunflower_plains': '#7ac33f', 'meadow': '#5a9a3a',
}

function getTileColor(tile: WorldMapTile): string {
  if (tile.color) return tile.color
  if (tile.biomeName) return BIOME_COLORS[tile.biomeName] || '#4a7a3a'
  return '#4a7a3a'
}

export default function MapPreviewWindow() {
  const [worldPath, setWorldPath] = useState('')
  const [worldName, setWorldName] = useState('')
  const [mapOverview, setMapOverview] = useState<WorldMapOverview | null>(null)
  const [mapRender, setMapRender] = useState<WorldMapRender | null>(null)
  const [selectedDimension, setSelectedDimension] = useState<MapDimension>('overworld')
  const [zoom, setZoom] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const wp = params.get('worldPath')
    const wn = params.get('worldName')
    if (wp) setWorldPath(decodeURIComponent(wp))
    if (wn) setWorldName(decodeURIComponent(wn))
  }, [])

  useEffect(() => {
    if (!worldPath) return
    setIsLoading(true)
    setError(null)
    invoke<WorldMapOverview>('get_world_map_overview', { world_path: worldPath })
      .then(overview => {
        setMapOverview(overview)
      })
      .catch(err => {
        setError(String(err))
      })
      .finally(() => setIsLoading(false))
  }, [worldPath])

  const loadMapRender = useCallback(async (dimension: MapDimension, zoomLevel: number) => {
    if (!worldPath) return
    setIsLoading(true)
    setError(null)
    try {
      const render = await invoke<WorldMapRender>('render_world_map', {
        world_path: worldPath,
        dimension,
        zoom: zoomLevel,
      })
      setMapRender(render)
    } catch (err) {
      setError(String(err))
    } finally {
      setIsLoading(false)
    }
  }, [worldPath])

  useEffect(() => {
    if (worldPath) {
      loadMapRender(selectedDimension, zoom)
    }
  }, [worldPath, selectedDimension, zoom, loadMapRender])

  useEffect(() => {
    if (!mapRender?.tiles || !canvasRef.current) return
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const tileSize = 4
    const canvasWidth = mapRender.width * tileSize
    const canvasHeight = mapRender.height * tileSize
    canvas.width = canvasWidth
    canvas.height = canvasHeight

    ctx.fillStyle = '#1a1a2e'
    ctx.fillRect(0, 0, canvasWidth, canvasHeight)

    for (const tile of mapRender.tiles) {
      const x = (tile.x - Math.min(...mapRender.tiles.map(t => t.x))) * tileSize
      const z = (tile.z - Math.min(...mapRender.tiles.map(t => t.z))) * tileSize
      ctx.fillStyle = getTileColor(tile)
      ctx.fillRect(x, z, tileSize, tileSize)

      if (tile.hasStructure && tile.structureType) {
        ctx.fillStyle = '#ff4444'
        ctx.fillRect(x + 1, z + 1, tileSize - 2, tileSize - 2)
      }
    }

    if (mapRender.playerPositions) {
      for (const player of mapRender.playerPositions) {
        const px = (player.x - Math.min(...mapRender.tiles.map(t => t.x))) * tileSize
        const pz = (player.z - Math.min(...mapRender.tiles.map(t => t.z))) * tileSize
        ctx.fillStyle = '#00ff00'
        ctx.beginPath()
        ctx.arc(px + tileSize / 2, pz + tileSize / 2, tileSize, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const spawnX = (mapRender.spawnX - Math.min(...mapRender.tiles.map(t => t.x))) * tileSize
    const spawnZ = (mapRender.spawnZ - Math.min(...mapRender.tiles.map(t => t.z))) * tileSize
    ctx.fillStyle = '#ffff00'
    ctx.beginPath()
    ctx.arc(spawnX + tileSize / 2, spawnZ + tileSize / 2, tileSize * 1.5, 0, Math.PI * 2)
    ctx.fill()
  }, [mapRender])

  const handleZoomIn = useCallback(() => {
    setZoom(prev => Math.min(prev * 2, 16))
  }, [])

  const handleZoomOut = useCallback(() => {
    setZoom(prev => Math.max(prev / 2, 0.25))
  }, [])

  const handleResetZoom = useCallback(() => {
    setZoom(1)
  }, [])

  const dimensionInfo = mapOverview?.dimensions.find(d => d.dimension === selectedDimension)

  return (
    <WindowFrame title={`地图预览 - ${worldName || '未知世界'}`} icon={<MapIcon className="w-4 h-4" />}>
      <div className="flex flex-col h-full">
        <div className="shrink-0 flex items-center gap-2 px-3 py-2 border-b border-white/5">
          <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5">
            {(['overworld', 'nether', 'end'] as MapDimension[]).map(dim => (
              <button
                key={dim}
                onClick={() => setSelectedDimension(dim)}
                className={`px-2 py-1 text-xs rounded-md transition-colors ${
                  selectedDimension === dim
                    ? 'bg-white/10 text-white'
                    : 'text-white/50 hover:bg-white/5'
                }`}
              >
                {dim === 'overworld' ? '🌍 主世界' : dim === 'nether' ? '🔥 下界' : '🌌 末地'}
              </button>
            ))}
          </div>

          <div className="flex items-center gap-1 ml-auto">
            <button
              onClick={handleZoomOut}
              className="p-1.5 rounded-md hover:bg-white/5 text-white/50"
              title="缩小"
            >
              <ZoomOut className="w-3.5 h-3.5" />
            </button>
            <span className="text-xs text-white/40 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={handleZoomIn}
              className="p-1.5 rounded-md hover:bg-white/5 text-white/50"
              title="放大"
            >
              <ZoomIn className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 rounded-md hover:bg-white/5 text-white/50"
              title="重置缩放"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex-1 relative overflow-hidden bg-black/50">
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center z-10 bg-black/30">
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="w-6 h-6 animate-spin text-white/40" />
                <span className="text-xs text-white/40">正在渲染地图...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="absolute inset-0 flex items-center justify-center z-10">
              <div className="flex flex-col items-center gap-2 text-center px-8">
                <Eye className="w-8 h-8 text-red-400/50" />
                <p className="text-sm text-red-400/80">地图渲染失败</p>
                <p className="text-xs text-white/30">{error}</p>
                <button
                  onClick={() => loadMapRender(selectedDimension, zoom)}
                  className="mt-2 px-3 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10 text-white/50"
                >
                  重试
                </button>
              </div>
            </div>
          )}

          {!isLoading && !error && !mapRender && worldPath && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Map className="w-8 h-8 text-white/20" />
                <p className="text-xs text-white/30">点击加载地图</p>
                <button
                  onClick={() => loadMapRender(selectedDimension, zoom)}
                  className="px-3 py-1 text-xs bg-white/5 rounded-md hover:bg-white/10 text-white/50"
                >
                  加载地图
                </button>
              </div>
            </div>
          )}

          {!worldPath && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="flex flex-col items-center gap-2">
                <Map className="w-8 h-8 text-white/20" />
                <p className="text-xs text-white/30">未指定世界路径</p>
              </div>
            </div>
          )}

          <div className="w-full h-full flex items-center justify-center overflow-auto">
            <canvas
              ref={canvasRef}
              className="max-w-full max-h-full"
              style={{ imageRendering: 'pixelated' }}
            />
          </div>
        </div>

        {mapOverview && (
          <div className="shrink-0 flex items-center gap-4 px-3 py-1.5 border-t border-white/5 text-xs text-white/40">
            {dimensionInfo && (
              <>
                <span>区域: {dimensionInfo.regionCount}</span>
                <span>区块: {dimensionInfo.totalChunks}</span>
                <span>已探索: {(dimensionInfo.exploredArea / 1000).toFixed(1)}K m²</span>
              </>
            )}
          </div>
        )}
      </div>
    </WindowFrame>
  )
}
