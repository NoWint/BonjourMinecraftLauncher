import { useCallback, useRef, useState } from 'react'

export type SoundType = 'click' | 'hover' | 'launch' | 'success' | 'error' | 'install' | 'notification' | 'switch'
export type SoundPack = 'default' | 'soft' | 'retro' | 'minecraft'

interface SoundConfig {
  enabled: boolean
  volume: number
  pack: SoundPack
}

interface SoundPackConfig {
  click: number[]
  hover: number[]
  launch: number[]
  success: number[]
  error: number[]
  install: number[]
  notification: number[]
  switch: number[]
}

const SOUND_PACKS: Record<SoundPack, SoundPackConfig> = {
  default: {
    click: [800],
    hover: [1200],
    launch: [440, 554, 659],
    success: [523, 659, 784],
    error: [440, 349],
    install: [659, 784],
    notification: [880, 1047],
    switch: [600],
  },
  soft: {
    click: [500],
    hover: [700],
    launch: [330, 415, 494],
    success: [392, 494, 587],
    error: [330, 262],
    install: [494, 587],
    notification: [659, 784],
    switch: [400],
  },
  retro: {
    click: [1000],
    hover: [1500],
    launch: [523, 659, 784, 1047],
    success: [784, 988, 1175],
    error: [523, 392],
    install: [659, 784, 988],
    notification: [1047, 1319],
    switch: [800],
  },
  minecraft: {
    click: [600, 800],
    hover: [1000],
    launch: [262, 330, 392, 523],
    success: [523, 659, 784, 1047],
    error: [262, 196],
    install: [392, 523, 659],
    notification: [784, 988, 1175],
    switch: [500, 700],
  },
}

const DURATION_MAP: Record<SoundType, number> = {
  click: 0.05,
  hover: 0.03,
  launch: 0.4,
  success: 0.3,
  error: 0.2,
  install: 0.2,
  notification: 0.3,
  switch: 0.05,
}

const WAVE_MAP: Record<SoundType, OscillatorType> = {
  click: 'sine',
  hover: 'sine',
  launch: 'triangle',
  success: 'sine',
  error: 'sawtooth',
  install: 'sine',
  notification: 'sine',
  switch: 'sine',
}

function getStoredConfig(): SoundConfig {
  try {
    const saved = localStorage.getItem('sound-config')
    if (saved) return JSON.parse(saved)
  } catch {}
  return { enabled: true, volume: 0.5, pack: 'default' }
}

export function useSound() {
  const [config, setConfigState] = useState<SoundConfig>(getStoredConfig)
  const audioCtxRef = useRef<AudioContext | null>(null)

  const getAudioContext = useCallback(() => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext()
    }
    return audioCtxRef.current
  }, [])

  const play = useCallback((type: SoundType) => {
    if (!config.enabled) return

    try {
      const ctx = getAudioContext()
      if (ctx.state === 'suspended') ctx.resume()

      const frequencies = SOUND_PACKS[config.pack][type]
      const duration = DURATION_MAP[type]
      const waveType = WAVE_MAP[type]
      const now = ctx.currentTime

      const masterGain = ctx.createGain()
      masterGain.gain.setValueAtTime(config.volume * 0.3, now)
      masterGain.connect(ctx.destination)

      frequencies.forEach((freq, i) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        osc.type = waveType
        osc.frequency.setValueAtTime(freq, now)

        gain.gain.setValueAtTime(0, now + i * 0.05)
        gain.gain.linearRampToValueAtTime(config.volume * 0.3, now + i * 0.05 + 0.01)
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.05 + duration)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start(now + i * 0.05)
        osc.stop(now + i * 0.05 + duration + 0.01)
      })
    } catch {}
  }, [config, getAudioContext])

  const setEnabled = useCallback((enabled: boolean) => {
    setConfigState(prev => {
      const next = { ...prev, enabled }
      localStorage.setItem('sound-config', JSON.stringify(next))
      return next
    })
  }, [])

  const setVolume = useCallback((volume: number) => {
    setConfigState(prev => {
      const next = { ...prev, volume }
      localStorage.setItem('sound-config', JSON.stringify(next))
      return next
    })
  }, [])

  const setPack = useCallback((pack: SoundPack) => {
    setConfigState(prev => {
      const next = { ...prev, pack }
      localStorage.setItem('sound-config', JSON.stringify(next))
      return next
    })
  }, [])

  return {
    play,
    config,
    setEnabled,
    setVolume,
    setPack,
    availablePacks: Object.keys(SOUND_PACKS) as SoundPack[],
  }
}
