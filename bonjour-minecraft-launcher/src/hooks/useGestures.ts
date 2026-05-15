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
  onPinch?: (scale: number, delta: number) => void
  onPinchStart?: (scale: number) => void
  onPinchEnd?: (scale: number) => void
  onDoubleTap?: () => void
  onScrollHorizontal?: (delta: number) => void
  onThreeFingerSwipe?: (direction: 'left' | 'right' | 'up' | 'down') => void
  onTwoFingerPan?: (dx: number, dy: number) => void
}

interface InertiaState {
  velocity: number
  position: number
  active: boolean
}

function getTouchDistance(touches: React.TouchList): number {
  const dx = touches[0].clientX - touches[1].clientX
  const dy = touches[0].clientY - touches[1].clientY
  return Math.sqrt(dx * dx + dy * dy)
}

function getTouchCenter(touches: React.TouchList): { x: number; y: number } {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  }
}

export function useGestures(
  handlers: GestureHandlers,
  config: GestureConfig = {}
) {
  const {
    swipeThreshold = 50,
    swipeVelocityThreshold = 0.3,
    pinchThreshold = 0.1,
    enableInertia = true,
    inertiaFriction = 0.95,
    enableHaptic = false,
  } = config

  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null)
  const lastTapRef = useRef<number>(0)
  const inertiaRef = useRef<InertiaState>({ velocity: 0, position: 0, active: false })
  const animFrameRef = useRef<number>()
  const pinchStartDistRef = useRef<number>(0)
  const pinchScaleRef = useRef<number>(1)
  const isPinchingRef = useRef<boolean>(false)
  const lastTwoFingerCenterRef = useRef<{ x: number; y: number } | null>(null)
  const threeFingerStartRef = useRef<{ x: number; y: number; time: number } | null>(null)

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

    if (e.touches.length === 2) {
      const dist = getTouchDistance(e.touches)
      pinchStartDistRef.current = dist
      pinchScaleRef.current = 1
      isPinchingRef.current = true
      lastTwoFingerCenterRef.current = getTouchCenter(e.touches)
      handlers.onPinchStart?.(1)
      return
    }

    if (e.touches.length === 3) {
      const t = e.touches[0]
      threeFingerStartRef.current = {
        x: t.clientX,
        y: t.clientY,
        time: Date.now(),
      }
      return
    }

    const touch = e.touches[0]
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    }
  }, [stopInertia, handlers])

  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && isPinchingRef.current) {
        const dist = getTouchDistance(e.touches)
        const startDist = pinchStartDistRef.current || dist
        const scale = dist / startDist
        const delta = scale - pinchScaleRef.current
        pinchScaleRef.current = scale

        if (Math.abs(scale - 1) > pinchThreshold || Math.abs(delta) > 0.001) {
          handlers.onPinch?.(scale, delta)
        }

        const center = getTouchCenter(e.touches)
        if (lastTwoFingerCenterRef.current) {
          const dx = center.x - lastTwoFingerCenterRef.current.x
          const dy = center.y - lastTwoFingerCenterRef.current.y
          if (Math.abs(dx) > 1 || Math.abs(dy) > 1) {
            handlers.onTwoFingerPan?.(dx, dy)
          }
        }
        lastTwoFingerCenterRef.current = center
        return
      }

      if (e.touches.length === 3 && threeFingerStartRef.current) {
        return
      }
    },
    [handlers, pinchThreshold]
  )

  const onTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      if (isPinchingRef.current && e.touches.length < 2) {
        handlers.onPinchEnd?.(pinchScaleRef.current)
        isPinchingRef.current = false
        pinchStartDistRef.current = 0
        lastTwoFingerCenterRef.current = null
      }

      if (e.touches.length === 0 && threeFingerStartRef.current) {
        const touch = e.changedTouches[0]
        const dx = touch.clientX - threeFingerStartRef.current.x
        const dy = touch.clientY - threeFingerStartRef.current.y
        const absDx = Math.abs(dx)
        const absDy = Math.abs(dy)

        if (Math.max(absDx, absDy) > swipeThreshold) {
          if (absDx > absDy) {
            handlers.onThreeFingerSwipe?.(dx > 0 ? 'right' : 'left')
          } else {
            handlers.onThreeFingerSwipe?.(dy > 0 ? 'down' : 'up')
          }
          triggerHaptic()
        }
        threeFingerStartRef.current = null
      }

      if (e.touches.length > 0 || !touchStartRef.current) return

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
      if (e.ctrlKey || e.metaKey) {
        const delta = e.deltaY > 0 ? -0.1 : 0.1
        handlers.onPinch?.(1 + delta, delta)
        e.preventDefault()
        return
      }
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
