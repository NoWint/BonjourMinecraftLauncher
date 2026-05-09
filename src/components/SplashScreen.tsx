import { useEffect, useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Gamepad2 } from 'lucide-react'

interface SplashScreenProps {
  onComplete: () => void
  isFirstLaunch?: boolean
}

export default function SplashScreen({ onComplete, isFirstLaunch }: SplashScreenProps) {
  const [phase, setPhase] = useState<'particles' | 'logo' | 'loading' | 'done'>('particles')

  const particles = useMemo(() =>
    Array.from({ length: 40 }, (_, i) => ({
      id: i,
      x: Math.random() * 100,
      y: Math.random() * 100,
      size: 4 + Math.random() * 8,
      delay: Math.random() * 0.8,
      duration: 1.2 + Math.random() * 0.6,
    })), [])

  useEffect(() => {
    if (isFirstLaunch) {
      const logoTimer = setTimeout(() => setPhase('logo'), 100)
      const loadingTimer = setTimeout(() => setPhase('loading'), 800)
      const doneTimer = setTimeout(() => setPhase('done'), 1200)
      const exitTimer = setTimeout(() => onComplete(), 1500)
      return () => { clearTimeout(logoTimer); clearTimeout(loadingTimer); clearTimeout(doneTimer); clearTimeout(exitTimer) }
    } else {
      const logoTimer = setTimeout(() => setPhase('loading'), 800)
      const doneTimer = setTimeout(() => setPhase('done'), 1500)
      const exitTimer = setTimeout(() => onComplete(), 2000)
      return () => { clearTimeout(logoTimer); clearTimeout(doneTimer); clearTimeout(exitTimer) }
    }
  }, [onComplete, isFirstLaunch])

  return (
    <motion.div
      className="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden"
      style={{ background: 'var(--bg-primary)' }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.5 }}
    >
      {isFirstLaunch && phase === 'particles' && (
        <div className="absolute inset-0">
          {particles.map((p) => (
            <motion.div
              key={p.id}
              className="absolute rounded-sm"
              style={{
                width: p.size,
                height: p.size,
                background: 'var(--accent)',
                left: `${p.x}%`,
                top: `${p.y}%`,
              }}
              initial={{ opacity: 0, scale: 0, x: 0, y: 0 }}
              animate={{
                opacity: [0, 1, 1, 0],
                scale: [0, 1, 1, 0.5],
                x: [0, 0, (50 - p.x) * 3],
                y: [0, 0, (50 - p.y) * 3],
              }}
              transition={{
                duration: p.duration,
                delay: p.delay,
                ease: [0.4, 0, 0.2, 1],
              }}
            />
          ))}
        </div>
      )}

      <div className="relative z-10">
        <AnimatePresence mode="wait">
          {(phase === 'particles' || phase === 'logo') && (
            <motion.div
              key="logo"
              initial={{ opacity: isFirstLaunch ? 0 : 0, scale: isFirstLaunch ? 0.3 : 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.1 }}
              transition={{ duration: 0.6, ease: [0.4, 0, 0.2, 1] }}
              className="flex flex-col items-center"
            >
              <motion.div
                className="w-24 h-24 rounded-3xl flex items-center justify-center mb-6"
                style={{
                  background: 'linear-gradient(135deg, var(--accent) 0%, rgba(74, 222, 128, 0.3) 100%)',
                }}
                animate={{
                  boxShadow: [
                    '0 0 0px rgba(74, 222, 128, 0)',
                    '0 0 60px rgba(74, 222, 128, 0.4)',
                    '0 0 0px rgba(74, 222, 128, 0)',
                  ],
                }}
                transition={{ duration: 2, repeat: Infinity }}
              >
                <Gamepad2 className="w-12 h-12 text-black" />
              </motion.div>
              <motion.h1
                className="text-4xl font-bold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Bonjour
              </motion.h1>
              <motion.p
                className="text-lg mt-1"
                style={{ color: 'var(--text-muted)' }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.5 }}
              >
                Minecraft Launcher
              </motion.p>
            </motion.div>
          )}

          {(phase === 'loading' || phase === 'done') && (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center"
            >
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-10 h-10 border-3 rounded-full mb-4"
                style={{
                  borderColor: 'var(--border-subtle)',
                  borderTopColor: 'var(--accent)',
                  borderWidth: '3px',
                }}
              />
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
                正在初始化...
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  )
}
