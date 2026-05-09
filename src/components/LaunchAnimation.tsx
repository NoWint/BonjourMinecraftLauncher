import { useEffect, useState, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2, Check, Sparkles } from 'lucide-react'

export type LaunchAnimationStyle = 'default' | 'minimal' | 'cinematic' | 'retro'

interface LaunchAnimationProps {
  isLaunching: boolean
  versionName: string
  onComplete?: () => void
  style?: LaunchAnimationStyle
  showCelebration?: boolean
}

type AnimationPhase = 'idle' | 'shrink' | 'transition' | 'launch' | 'complete' | 'celebrate'

function CelebrationEffect() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = window.innerWidth
    canvas.height = window.innerHeight

    const particles = Array.from({ length: 60 }, () => ({
      x: canvas.width / 2 + (Math.random() - 0.5) * 100,
      y: canvas.height / 2,
      vx: (Math.random() - 0.5) * 12,
      vy: (Math.random() - 0.5) * 12 - 4,
      size: Math.random() * 6 + 2,
      color: ['#4ade80', '#38bdf8', '#fb923c', '#c084fc', '#fbbf24', '#f472b6'][
        Math.floor(Math.random() * 6)
      ],
      life: 1,
      decay: Math.random() * 0.015 + 0.008,
      rotation: Math.random() * 360,
      rotationSpeed: (Math.random() - 0.5) * 10,
    }))

    let animationId: number

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      let alive = false
      particles.forEach(p => {
        if (p.life <= 0) return
        alive = true

        p.x += p.vx
        p.y += p.vy
        p.vy += 0.15
        p.life -= p.decay
        p.rotation += p.rotationSpeed

        ctx.save()
        ctx.translate(p.x, p.y)
        ctx.rotate((p.rotation * Math.PI) / 180)
        ctx.globalAlpha = Math.max(0, p.life)
        ctx.fillStyle = p.color

        if (p.size > 4) {
          ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size)
        } else {
          ctx.beginPath()
          ctx.arc(0, 0, p.size, 0, Math.PI * 2)
          ctx.fill()
        }

        ctx.restore()
      })

      if (alive) {
        animationId = requestAnimationFrame(draw)
      }
    }

    draw()

    return () => cancelAnimationFrame(animationId)
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 z-[210] pointer-events-none"
    />
  )
}

function DefaultAnimation({ phase, versionName }: { phase: AnimationPhase; versionName: string }) {
  return (
    <div className="relative flex flex-col items-center gap-6">
      <motion.div
        className="w-20 h-20 rounded-3xl flex items-center justify-center"
        style={{
          background: 'linear-gradient(135deg, var(--accent) 0%, var(--accent-dim) 100%)',
        }}
        initial={{ scale: 1, opacity: 1 }}
        animate={{
          scale: phase === 'shrink' ? 0.8 : phase === 'transition' ? 1.2 : 1,
          opacity: phase === 'launch' ? [1, 0.5, 1] : 1,
        }}
        transition={{
          duration: phase === 'launch' ? 0.6 : 0.4,
          repeat: phase === 'launch' ? Infinity : 0,
        }}
      >
        <Gamepad2 className="w-10 h-10" style={{ color: 'var(--accent-text)' }} />
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 10 }}
        animate={{
          opacity: phase === 'transition' ? 1 : phase === 'launch' ? 0.8 : 0,
          y: phase === 'transition' ? 0 : -10,
        }}
        transition={{ duration: 0.3 }}
      >
        <p className="text-sm font-medium" style={{ color: 'var(--text-muted)' }}>正在启动</p>
        <p className="text-2xl font-bold mt-1" style={{ color: 'var(--text-primary)' }}>{versionName}</p>
      </motion.div>

      <motion.div
        className="w-48 h-1 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{
          opacity: phase === 'launch' ? 1 : 0,
          scaleX: phase === 'launch' ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          initial={{ width: '0%' }}
          animate={{ width: phase === 'launch' ? ['0%', '100%'] : '0%' }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}

function MinimalAnimation({ phase, versionName }: { phase: AnimationPhase; versionName: string }) {
  return (
    <div className="relative flex flex-col items-center gap-4">
      <motion.div
        className="flex items-center gap-3"
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'transition' || phase === 'launch' ? 1 : 0 }}
      >
        <motion.div
          className="w-2 h-2 rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{
            scale: phase === 'launch' ? [1, 1.5, 1] : 1,
            opacity: phase === 'launch' ? [1, 0.5, 1] : 1,
          }}
          transition={{ duration: 0.8, repeat: Infinity }}
        />
        <p className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          正在启动 {versionName}...
        </p>
      </motion.div>

      <motion.div
        className="w-32 h-0.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
        initial={{ opacity: 0 }}
        animate={{ opacity: phase === 'launch' ? 1 : 0 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'var(--accent)' }}
          animate={{ width: phase === 'launch' ? ['0%', '100%'] : '0%' }}
          transition={{ duration: 1.2, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}

function CinematicAnimation({ phase, versionName }: { phase: AnimationPhase; versionName: string }) {
  return (
    <div className="relative flex flex-col items-center gap-8">
      <motion.div
        className="relative"
        initial={{ scale: 0, rotate: -180 }}
        animate={{
          scale: phase === 'shrink' ? 0.5 : phase === 'transition' ? [0.5, 1.5] : phase === 'launch' ? 1 : 0,
          rotate: phase === 'transition' ? [-180, 0] : 0,
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      >
        <div
          className="w-28 h-28 rounded-full flex items-center justify-center"
          style={{
            background: 'radial-gradient(circle, var(--accent) 0%, var(--accent-dim) 60%, transparent 100%)',
          }}
        >
          <Gamepad2 className="w-12 h-12" style={{ color: 'var(--accent-text)' }} />
        </div>

        {phase === 'launch' && (
          <motion.div
            className="absolute inset-0 rounded-full"
            style={{ border: '2px solid var(--accent)' }}
            animate={{
              scale: [1, 2],
              opacity: [0.5, 0],
            }}
            transition={{ duration: 1.5, repeat: Infinity }}
          />
        )}
      </motion.div>

      <motion.div
        className="text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{
          opacity: phase === 'transition' ? 1 : phase === 'launch' ? 1 : 0,
          y: phase === 'transition' ? 0 : 20,
        }}
        transition={{ duration: 0.5 }}
      >
        <p className="text-xs uppercase tracking-[0.3em] mb-2" style={{ color: 'var(--accent)' }}>
          正在启动
        </p>
        <p className="text-3xl font-bold" style={{ color: 'var(--text-primary)' }}>
          {versionName}
        </p>
      </motion.div>

      <motion.div
        className="w-64 h-1.5 rounded-full overflow-hidden"
        style={{ background: 'var(--bg-elevated)' }}
        initial={{ opacity: 0, scaleX: 0 }}
        animate={{
          opacity: phase === 'launch' ? 1 : 0,
          scaleX: phase === 'launch' ? 1 : 0,
        }}
        transition={{ duration: 0.3 }}
      >
        <motion.div
          className="h-full rounded-full"
          style={{ background: 'linear-gradient(90deg, var(--accent-dim), var(--accent))' }}
          initial={{ width: '0%' }}
          animate={{ width: phase === 'launch' ? ['0%', '100%'] : '0%' }}
          transition={{ duration: 1.5, ease: 'easeInOut' }}
        />
      </motion.div>
    </div>
  )
}

function RetroAnimation({ phase, versionName }: { phase: AnimationPhase; versionName: string }) {
  return (
    <div className="relative flex flex-col items-center gap-4 font-mono">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: phase !== 'idle' ? 1 : 0 }}
        className="text-center space-y-2"
      >
        <p className="text-xs" style={{ color: 'var(--accent)' }}>{'>'} BONJOUR_MINECRAFT_LAUNCHER</p>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{'>'} Loading {versionName}...</p>
        <div className="flex items-center gap-1">
          <motion.span
            className="text-xs"
            style={{ color: 'var(--accent)' }}
            animate={{ opacity: [1, 0] }}
            transition={{ duration: 0.5, repeat: Infinity }}
          >
            ▌
          </motion.span>
        </div>
      </motion.div>

      {phase === 'launch' && (
        <motion.div
          className="w-48 h-3 border"
          style={{ borderColor: 'var(--accent)' }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <motion.div
            className="h-full"
            style={{ background: 'var(--accent)' }}
            initial={{ width: '0%' }}
            animate={{ width: '100%' }}
            transition={{ duration: 1.2, ease: 'linear' }}
          />
        </motion.div>
      )}
    </div>
  )
}

export default function LaunchAnimation({
  isLaunching,
  versionName,
  onComplete,
  style = 'default',
  showCelebration = true,
}: LaunchAnimationProps) {
  const [phase, setPhase] = useState<AnimationPhase>('idle')
  const [celebrating, setCelebrating] = useState(false)

  useEffect(() => {
    if (isLaunching && phase === 'idle') {
      setPhase('shrink')
      const timers = [
        setTimeout(() => setPhase('transition'), 150),
        setTimeout(() => setPhase('launch'), 300),
        setTimeout(() => {
          if (showCelebration) {
            setCelebrating(true)
            setTimeout(() => setCelebrating(false), 800)
          }
          setPhase('complete')
          onComplete?.()
        }, 800),
      ]
      return () => timers.forEach(clearTimeout)
    } else if (!isLaunching) {
      setPhase('idle')
    }
  }, [isLaunching, phase, onComplete, showCelebration])

  const AnimationComponent = {
    default: DefaultAnimation,
    minimal: MinimalAnimation,
    cinematic: CinematicAnimation,
    retro: RetroAnimation,
  }[style]

  return (
    <>
      <AnimatePresence>
        {phase !== 'idle' && phase !== 'complete' && (
          <motion.div
            className="fixed inset-0 z-[200] flex items-center justify-center pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            <motion.div
              className="absolute inset-0"
              style={{ background: 'var(--bg-primary)' }}
              initial={{ opacity: 0 }}
              animate={{
                opacity: phase === 'shrink' ? 0.3 : phase === 'transition' ? 0.6 : 1,
              }}
              transition={{ duration: 0.4 }}
            />
            <AnimationComponent phase={phase} versionName={versionName} />
          </motion.div>
        )}
      </AnimatePresence>

      {celebrating && <CelebrationEffect />}
    </>
  )
}
