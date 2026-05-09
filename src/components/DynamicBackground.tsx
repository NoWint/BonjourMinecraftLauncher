import { useEffect, useRef, useMemo, useState } from 'react'
import { motion } from 'framer-motion'

export type BackgroundVariant = 'gradient' | 'particles' | 'mesh' | 'aurora' | 'waves' | 'none'
export type BackgroundIntensity = 'subtle' | 'normal' | 'strong'
export type PerformanceTier = 'high' | 'medium' | 'low'

interface DynamicBackgroundProps {
  versionId?: string
  variant?: BackgroundVariant
  intensity?: BackgroundIntensity
  customColors?: string[]
  performanceTier?: PerformanceTier
}

const VERSION_GRADIENTS: Record<string, string[]> = {
  '1.21': ['#1a5c3a', '#0d3320', '#000000'],
  '1.20': ['#5c3a1a', '#33200d', '#000000'],
  '1.19': ['#3a1a5c', '#200d33', '#000000'],
  '1.18': ['#1a3a5c', '#0d2033', '#000000'],
  '1.17': ['#5c5c1a', '#33330d', '#000000'],
  '1.16': ['#5c1a1a', '#330d0d', '#000000'],
}

function getVersionGradient(versionId: string): string[] {
  const major = versionId.split('.').slice(0, 2).join('.')
  return VERSION_GRADIENTS[major] || ['#1a1a2e', '#16213e', '#000000']
}

function hexToAlpha(hex: string, alpha: string): string {
  if (hex.startsWith('#') && hex.length === 7) {
    return hex + alpha
  }
  return hex
}

function detectPerformanceTier(): PerformanceTier {
  const canvas = document.createElement('canvas')
  const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl')
  if (!gl) return 'low'
  const debugInfo = (gl as WebGLRenderingContext).getExtension('WEBGL_debug_renderer_info')
  if (debugInfo) {
    const renderer = (gl as WebGLRenderingContext).getParameter(debugInfo.UNMASKED_RENDERER_WEBGL).toLowerCase()
    if (renderer.includes('intel') && renderer.includes('hd')) return 'low'
    if (renderer.includes('mali') || renderer.includes('adreno 3') || renderer.includes('adreno 4')) return 'low'
  }
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 2) return 'low'
  if (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) return 'medium'
  return 'high'
}

function MeshGradient({ colors, tier }: { colors: string[]; tier: PerformanceTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0
    const speed = tier === 'low' ? 0.002 : tier === 'medium' ? 0.003 : 0.005

    const resize = () => {
      const scale = tier === 'low' ? 0.5 : tier === 'medium' ? 0.75 : 1
      canvas.width = window.innerWidth * scale
      canvas.height = window.innerHeight * scale
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += speed
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const gradient = ctx.createRadialGradient(
        canvas.width * (0.3 + Math.sin(time) * 0.2),
        canvas.height * (0.3 + Math.cos(time * 0.7) * 0.2),
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.8
      )

      gradient.addColorStop(0, hexToAlpha(colors[0], '40'))
      gradient.addColorStop(0.5, hexToAlpha(colors[1], '20'))
      gradient.addColorStop(1, hexToAlpha(colors[2], '00'))

      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      const gradient2 = ctx.createRadialGradient(
        canvas.width * (0.7 + Math.cos(time * 0.8) * 0.2),
        canvas.height * (0.6 + Math.sin(time * 0.5) * 0.2),
        0,
        canvas.width * 0.5,
        canvas.height * 0.5,
        canvas.width * 0.6
      )

      gradient2.addColorStop(0, hexToAlpha(colors[1], '30'))
      gradient2.addColorStop(1, hexToAlpha(colors[2], '00'))

      ctx.fillStyle = gradient2
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [colors, tier])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

function ParticleField({ color, tier }: { color: string; tier: PerformanceTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const particleCount = tier === 'low' ? 15 : tier === 'medium' ? 30 : 50
  const connectionDistance = tier === 'low' ? 80 : 150

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number

    const particles = Array.from({ length: particleCount }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      size: Math.random() * 2 + 0.5,
      speedX: (Math.random() - 0.5) * 0.3,
      speedY: (Math.random() - 0.5) * 0.3,
      opacity: Math.random() * 0.5 + 0.1,
    }))

    const resize = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      particles.forEach((p) => {
        p.x += p.speedX
        p.y += p.speedY

        if (p.x < 0) p.x = canvas.width
        if (p.x > canvas.width) p.x = 0
        if (p.y < 0) p.y = canvas.height
        if (p.y > canvas.height) p.y = 0

        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fillStyle = hexToAlpha(color, Math.floor(p.opacity * 255).toString(16).padStart(2, '0'))
        ctx.fill()
      })

      if (tier !== 'low') {
        particles.forEach((p1, i) => {
          particles.slice(i + 1).forEach((p2) => {
            const dx = p1.x - p2.x
            const dy = p1.y - p2.y
            const dist = Math.sqrt(dx * dx + dy * dy)

            if (dist < connectionDistance) {
              ctx.beginPath()
              ctx.moveTo(p1.x, p1.y)
              ctx.lineTo(p2.x, p2.y)
              ctx.strokeStyle = hexToAlpha(color, Math.floor((1 - dist / connectionDistance) * 0.1 * 255).toString(16).padStart(2, '0'))
              ctx.lineWidth = 0.5
              ctx.stroke()
            }
          })
        })
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [color, tier, particleCount, connectionDistance])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.4 }}
    />
  )
}

function AuroraEffect({ colors, tier }: { colors: string[]; tier: PerformanceTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0
    const speed = tier === 'low' ? 0.003 : 0.008
    const bands = tier === 'low' ? 2 : 4

    const resize = () => {
      const scale = tier === 'low' ? 0.5 : 0.75
      canvas.width = window.innerWidth * scale
      canvas.height = window.innerHeight * scale
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += speed
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let i = 0; i < bands; i++) {
        const yOffset = canvas.height * (0.2 + i * 0.15)
        const amplitude = canvas.height * 0.08
        const frequency = 0.003 + i * 0.001
        const colorIdx = i % colors.length

        ctx.beginPath()
        ctx.moveTo(0, yOffset)

        for (let x = 0; x <= canvas.width; x += 4) {
          const y = yOffset + Math.sin(x * frequency + time + i * 1.5) * amplitude
            + Math.sin(x * frequency * 0.5 + time * 0.7) * amplitude * 0.5
          ctx.lineTo(x, y)
        }

        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()

        const gradient = ctx.createLinearGradient(0, yOffset - amplitude, 0, yOffset + amplitude * 3)
        gradient.addColorStop(0, hexToAlpha(colors[colorIdx], '00'))
        gradient.addColorStop(0.3, hexToAlpha(colors[colorIdx], '15'))
        gradient.addColorStop(0.6, hexToAlpha(colors[colorIdx], '08'))
        gradient.addColorStop(1, hexToAlpha(colors[colorIdx], '00'))

        ctx.fillStyle = gradient
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [colors, tier])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.5 }}
    />
  )
}

function WavesEffect({ colors, tier }: { colors: string[]; tier: PerformanceTier }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let animationId: number
    let time = 0
    const speed = tier === 'low' ? 0.01 : 0.02
    const waveCount = tier === 'low' ? 3 : 5

    const resize = () => {
      const scale = tier === 'low' ? 0.5 : 0.75
      canvas.width = window.innerWidth * scale
      canvas.height = window.innerHeight * scale
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      time += speed
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      for (let w = 0; w < waveCount; w++) {
        const baseY = canvas.height * (0.5 + w * 0.08)
        const amplitude = 20 + w * 5
        const frequency = 0.01 - w * 0.001
        const colorIdx = w % colors.length

        ctx.beginPath()
        ctx.moveTo(0, baseY)

        for (let x = 0; x <= canvas.width; x += 2) {
          const y = baseY + Math.sin(x * frequency + time + w * 0.8) * amplitude
            + Math.sin(x * frequency * 2 + time * 1.3) * amplitude * 0.3
          ctx.lineTo(x, y)
        }

        ctx.lineTo(canvas.width, canvas.height)
        ctx.lineTo(0, canvas.height)
        ctx.closePath()

        ctx.fillStyle = hexToAlpha(colors[colorIdx], '0a')
        ctx.fill()
      }

      animationId = requestAnimationFrame(draw)
    }

    draw()

    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', resize)
    }
  }, [colors, tier])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full pointer-events-none"
      style={{ opacity: 0.6 }}
    />
  )
}

export default function DynamicBackground({
  versionId,
  variant = 'mesh',
  intensity = 'subtle',
  customColors,
  performanceTier: externalTier,
}: DynamicBackgroundProps) {
  const [detectedTier] = useState<PerformanceTier>(() => {
    const saved = localStorage.getItem('bg-performance-tier')
    if (saved === 'high' || saved === 'medium' || saved === 'low') return saved
    return detectPerformanceTier()
  })

  const tier = externalTier || detectedTier

  const colors = useMemo(() => {
    return customColors || (versionId ? getVersionGradient(versionId) : ['#1a1a2e', '#16213e', '#000000'])
  }, [versionId, customColors])

  const opacityMap: Record<BackgroundIntensity, number> = {
    subtle: 0.3,
    normal: 0.6,
    strong: 1,
  }

  if (variant === 'none') return null

  const effectiveVariant = tier === 'low' && (variant === 'particles' || variant === 'aurora' || variant === 'waves')
    ? 'gradient'
    : variant

  return (
    <div
      className="absolute inset-0 overflow-hidden"
      style={{ opacity: opacityMap[intensity] }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse at 20% 50%, ${colors[0]}40 0%, transparent 50%),
                       radial-gradient(ellipse at 80% 20%, ${colors[1]}30 0%, transparent 50%),
                       radial-gradient(ellipse at 50% 80%, ${colors[0]}20 0%, transparent 50%),
                       linear-gradient(180deg, ${colors[2]} 0%, ${colors[0]}10 100%)`,
        }}
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%'],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          repeatType: 'reverse',
        }}
      />

      {effectiveVariant === 'particles' && <ParticleField color={colors[0]} tier={tier} />}
      {effectiveVariant === 'mesh' && <MeshGradient colors={colors} tier={tier} />}
      {effectiveVariant === 'aurora' && <AuroraEffect colors={colors} tier={tier} />}
      {effectiveVariant === 'waves' && <WavesEffect colors={colors} tier={tier} />}

      <div
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  )
}

export { detectPerformanceTier }
