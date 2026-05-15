import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeStore, ThemeId } from './useThemeStore'

type Phase = 'shutdown' | 'midpoint' | 'reveal' | 'idle'

export default function ThemeSwitchOverlay() {
  const { isSwitching, setSwitching, activeTheme } = useThemeStore()
  const [phase, setPhase] = useState<Phase>('idle')
  const [fromTheme, setFromTheme] = useState<ThemeId>('cassette')

  useEffect(() => {
    if (!isSwitching) return

    const previous = activeTheme === 'cassette' ? 'wabi-sabi' : 'cassette'
    setFromTheme(previous)

    setPhase('shutdown')
    const t1 = setTimeout(() => setPhase('midpoint'), 400)
    const t2 = setTimeout(() => setPhase('reveal'), 700)
    const t3 = setTimeout(() => {
      setPhase('idle')
      setSwitching(false)
    }, 1200)

    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [isSwitching])

  const toWabiSabi = fromTheme === 'cassette' && activeTheme === 'wabi-sabi'
  const toCassette = fromTheme === 'wabi-sabi' && activeTheme === 'cassette'

  return (
    <AnimatePresence>
      {phase !== 'idle' && (
        <motion.div
          className="fixed inset-0 z-[200] pointer-events-none"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
        >
          {phase === 'shutdown' && toWabiSabi && (
            <motion.div
              className="absolute inset-0"
              style={{ background: '#0D0E0A' }}
              initial={{ clipPath: 'inset(0 0 0 0)' }}
              animate={{ clipPath: 'inset(49.5% 0 49.5% 0)' }}
              transition={{ duration: 0.4, ease: 'easeIn' }}
            >
              <motion.div
                className="absolute left-0 right-0"
                style={{
                  top: '50%',
                  height: 2,
                  background: '#E8C547',
                  boxShadow: '0 0 20px #E8C547',
                }}
                initial={{ opacity: 1 }}
                animate={{ opacity: 0 }}
                transition={{ duration: 0.15, delay: 0.25 }}
              />
            </motion.div>
          )}

          {phase === 'shutdown' && toCassette && (
            <div className="absolute inset-0 flex">
              <motion.div
                className="flex-1"
                style={{ background: '#F5F0E8' }}
                initial={{ x: 0 }}
                animate={{ x: '-50%' }}
                transition={{ duration: 0.4, ease: 'easeIn' }}
              />
              <motion.div
                className="flex-1"
                style={{ background: '#F5F0E8' }}
                initial={{ x: 0 }}
                animate={{ x: '50%' }}
                transition={{ duration: 0.4, ease: 'easeIn' }}
              />
            </div>
          )}

          {phase === 'midpoint' && (
            <motion.div
              className="absolute inset-0 flex items-center justify-center"
              style={{ background: '#000000' }}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              {toWabiSabi && (
                <div
                  style={{
                    width: 4,
                    height: 40,
                    background: '#F5F0E8',
                    boxShadow: '0 0 12px rgba(245,240,232,0.6)',
                  }}
                />
              )}
              {toCassette && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    background: '#E8C547',
                    borderRadius: '50%',
                    boxShadow: '0 0 24px rgba(232,197,71,0.8)',
                  }}
                />
              )}
            </motion.div>
          )}

          {phase === 'reveal' && toWabiSabi && (
            <div className="absolute inset-0 flex">
              <motion.div
                className="flex-1"
                style={{ background: '#F5F0E8' }}
                initial={{ x: '-50%' }}
                animate={{ x: '-100%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
              <motion.div
                className="flex-1"
                style={{ background: '#F5F0E8' }}
                initial={{ x: '50%' }}
                animate={{ x: '100%' }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
              />
            </div>
          )}

          {phase === 'reveal' && toCassette && (
            <motion.div
              className="absolute inset-0"
              style={{ background: '#0D0E0A' }}
              initial={{ clipPath: 'inset(0 0 100% 0)' }}
              animate={{ clipPath: 'inset(0 0 0 0)' }}
              transition={{ duration: 0.5, ease: 'easeOut' }}
            >
              <motion.div
                className="absolute left-0 right-0 h-1"
                style={{ background: 'rgba(232,197,71,0.4)', top: 0 }}
                initial={{ top: '0%' }}
                animate={{ top: '100%' }}
                transition={{ duration: 0.5, ease: 'linear' }}
              />
            </motion.div>
          )}
        </motion.div>
      )}
    </AnimatePresence>
  )
}