import React, { useEffect, useRef, useState } from 'react'

/**
 * LazyMount
 *
 * Defers mounting of children until the wrapper element scrolls into view
 * (within `rootMargin`). Useful for offscreen sections that import heavy
 * components — the import resolves during scroll, not on initial render.
 *
 * SSR-safe: when `window` or `IntersectionObserver` is unavailable, falls
 * back to mounting immediately. The `placeholder` reserves space to prevent
 * Cumulative Layout Shift.
 *
 * Usage:
 *   <LazyMount placeholder={<div style={{ minHeight: 600 }} />}>
 *     <HeavyComponent />
 *   </LazyMount>
 *
 * @param {object} props
 * @param {React.ReactNode} props.children     - content to mount when in view
 * @param {React.ReactNode} [props.placeholder]- shown until in view (default: empty 200px div)
 * @param {string} [props.rootMargin]          - IO root margin (default '200px')
 * @param {number} [props.threshold]           - IO threshold (default 0)
 */
export default function LazyMount({
  children,
  placeholder = null,
  rootMargin = '200px',
  threshold = 0,
}) {
  const [mounted, setMounted] = useState(false)
  const wrapperRef = useRef(null)

  useEffect(() => {
    if (typeof window === 'undefined') return undefined
    if (mounted) return undefined

    // Fallback: no IntersectionObserver -> mount immediately.
    if (typeof window.IntersectionObserver === 'undefined') {
      setMounted(true)
      return undefined
    }

    const node = wrapperRef.current
    if (!node) return undefined

    const observer = new window.IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setMounted(true)
            observer.disconnect()
            break
          }
        }
      },
      { rootMargin, threshold },
    )

    observer.observe(node)

    return () => observer.disconnect()
  }, [mounted, rootMargin, threshold])

  if (mounted) return children

  return (
    <div ref={wrapperRef} aria-hidden="true">
      {placeholder ?? <div style={{ minHeight: 200 }} />}
    </div>
  )
}
