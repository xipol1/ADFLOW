import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Measures its own DOM container and returns { width, height, ref }.
 * Used by widgets to auto-fit content (e.g. show fewer rows when shorter,
 * pick a more compact variant when narrower) instead of scrolling.
 *
 * Avoids reading the bounding box on every paint by debouncing resize events
 * through requestAnimationFrame.
 */
export default function useWidgetSize() {
  const ref = useRef(null)
  const [size, setSize] = useState({ width: 0, height: 0 })
  const rafRef = useRef(null)

  const measure = useCallback(() => {
    const el = ref.current
    if (!el) return
    const w = el.offsetWidth
    const h = el.offsetHeight
    setSize(prev => (prev.width === w && prev.height === h) ? prev : { width: w, height: h })
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    measure()

    if (typeof ResizeObserver === 'undefined') return

    const ro = new ResizeObserver(() => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null
        measure()
      })
    })
    ro.observe(el)
    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current)
      ro.disconnect()
    }
  }, [measure])

  return { ref, width: size.width, height: size.height }
}

/**
 * Given an available content height and a per-row height, return how many
 * rows fit (minimum 1). Accounts for an optional fixed header/footer.
 */
export function rowsThatFit(availableHeight, rowHeight, reserved = 0) {
  if (!availableHeight || availableHeight < rowHeight) return 1
  const usable = Math.max(0, availableHeight - reserved)
  return Math.max(1, Math.floor(usable / rowHeight))
}
