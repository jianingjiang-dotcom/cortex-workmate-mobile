import { useCallback, useRef } from 'react'

interface LongPressOptions {
  /** Hold duration before firing, in ms. */
  delay?: number
  /** Movement (px) that cancels the press — lets list scrolling win. */
  moveTolerance?: number
  /** Tap handler; skipped when a long-press just fired. */
  onClick?: () => void
}

/**
 * Press-and-hold detection for touch + mouse via pointer events.
 * - Cancels if the pointer moves past `moveTolerance` (so scrolling doesn't trigger it).
 * - Suppresses the trailing `click` after a long-press fires, so the row's tap action
 *   (e.g. navigation) doesn't also run.
 * Spread the returned handlers onto the pressable element.
 */
export function useLongPress(onLongPress: () => void, options: LongPressOptions = {}) {
  const { delay = 420, moveTolerance = 10, onClick } = options
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const fired = useRef(false)
  const origin = useRef<{ x: number; y: number } | null>(null)

  const cancel = useCallback(() => {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }, [])

  const onPointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (e.button !== 0) return // ignore right/middle click; desktop right-click handled by onContextMenu
      fired.current = false
      origin.current = { x: e.clientX, y: e.clientY }
      cancel()
      timer.current = setTimeout(() => {
        fired.current = true
        timer.current = null
        try {
          navigator.vibrate?.(15)
        } catch {
          /* vibration unsupported / blocked — ignore */
        }
        onLongPress()
      }, delay)
    },
    [cancel, delay, onLongPress],
  )

  const onPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!origin.current || !timer.current) return
      const dx = Math.abs(e.clientX - origin.current.x)
      const dy = Math.abs(e.clientY - origin.current.y)
      if (dx > moveTolerance || dy > moveTolerance) cancel()
    },
    [cancel, moveTolerance],
  )

  const end = useCallback(() => {
    cancel()
    origin.current = null
  }, [cancel])

  const onClickHandler = useCallback(
    (e: React.MouseEvent) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
        return
      }
      onClick?.()
    },
    [onClick],
  )

  const onContextMenu = useCallback((e: React.MouseEvent) => {
    // stop the native context menu / text-selection callout on hold
    e.preventDefault()
  }, [])

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerLeave: end,
    onPointerCancel: end,
    onClick: onClickHandler,
    onContextMenu,
  }
}
