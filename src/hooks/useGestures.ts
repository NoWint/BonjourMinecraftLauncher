import { useCallback, useRef, useEffect } from 'react'

export interface GestureConfig {
  swipeThreshold?: number
  swipeVelocityThreshold?: number
  pinchThreshold?: number
  enableInertia?: boolean
  inertiaFriction?: number
  enableHaptic?: boolean
}

export interface SwipeDirection {
  direction: 'left' | 'right' | 'up' | 'down'
  velocity: number
  offset: number
}

export interface GestureHandlers {
  onSwipe?: (swipe: SwipeDirection) => void
  onPinch?: (scale: number) => void
  onDoubleTap?: () => void
  onScrollHorizontal?: (delta: number) => void
}

interface InertiaState {
  velocity: number
  position: number
  active: boolean
}

export function useGestures(
  handlers: GestureHandlers,
  config: GestureConfig = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    enableInertia = true,
    inertiaFriction = 0.95,
    enableHaptic = false,
  } = config

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  const inertiaRef = useRef<InertiaState>({ velocity: 0, position: 0, active: false })
  const animFrameRef = useRef<number>()

  const triggerHaptic = useCallback(() => {
    if (!enableHaptic) return
    if (navigator.vibrate) {
      navigator.vibrate(10)
    }
  }, [enableHaptic])

  const handleInertia = useCallback(
    (velocity: number, onMove: (delta: number) => void) => {
      if (!enableInertia) return

      inertiaRef.current = { velocity, position: 0, active: true }

      const animate = () => {
        const state = inertiaRef.current
        if (!state.active) return

        state.velocity *= inertiaFriction
        state.position += state.velocity

        if (Math.abs(state.velocity) > 0.5) {
          onMove(state.velocity)
          animFrameRef.current = requestAnimationFrame(animate)
        } else {
          state.active = false
        }
      }

      animFrameRef.current = requestAnimationFrame(animate)
    },
    [enableInertia, inertiaFriction]
  )

  const stopInertia = useCallback(() => {
    inertiaRef.current.active = false
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current)
    }
  }, [])

  useEffect(() => {
    return () => stopInertia()
  }, [stopInertia])

  const onTouchStart = useCallback((e: React.TouchEvent) => {
    stopInertia()
    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }, [stopInertia])

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (!touchStartRef.current) return

      const touch = e.changedTouches[0]
      const startX = touchStartRef.current.x
      const startY = touchStartRef.current.y
      const startTime = touchStartRef.current.time
      const endTime = Date.now()
      const duration = endTime - startTime

      const dx = touch.clientX - startX
      const dy = touch.clientY - startY
      const absDx = Math.abs(dx)
      const absDy = Math.abs(dy)

      const velocityX = dx / (duration || 1)
      const velocityY = dy / (duration || 1)

      if (absDx > swipeThreshold || absDy > swipeThreshold ||
          Math.abs(velocityX) > swipeVelocityThreshold ||
          Math.abs(velocityY) > swipeVelocityThreshold) {
        if (absDx > absDy) {
          const direction = dx > 0 ? 'right' : 'left'
          const velocity = Math.abs(velocityX)
          handlers.onSwipe?.({ direction, velocity, offset: absDx })
          triggerHaptic()

          if (handlers.onScrollHorizontal && enableInertia) {
            handleInertia(velocityX * 0.3, handlers.onScrollHorizontal)
          }
        } else {
          const direction = dy > 0 ? 'down' : 'up'
          const velocity = Math.abs(velocityY)
          handlers.onSwipe?.({ direction, velocity, offset: absDy })
          triggerHaptic()
        }
      }

      touchStartRef.current = null
    },
    [handlers, swipeThreshold, swipeVelocityThreshold, triggerHaptic, handleInertia, enableInertia]
  )

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        handlers.onPinch?.(1)
      }
    },
    [handlers]
  )

  const onClick = useCallback(
    (e: React.MouseEvent) => {
      const now = Date.now()
      if (now - lastTapRef.current < 300) {
        handlers.onDoubleTap?.()
        triggerHaptic()
      }
      lastTapRef.current = now
    },
    [handlers, triggerHaptic]
  )

  const onWheel = useCallback(
    (e: React.WheelEvent) => {
      if (Math.abs(e.deltaX) > Math.abs(e.deltaY)) {
        handlers.onScrollHorizontal?.(e.deltaX)
      }
    },
    [handlers]
  )

  return {
    onTouchStart,
    onTouchEnd,
    onTouchMove,
    onClick,
    onWheel,
    stopInertia,
  }
}
