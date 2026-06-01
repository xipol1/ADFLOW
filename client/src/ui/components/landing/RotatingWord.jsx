import React, { useState, useEffect, useMemo } from 'react'
// `m` keeps the hero rotating word on the LazyMotion runtime (provider in
// App.jsx). Aliased to `motion` so the JSX (motion.span) is unchanged.
import { AnimatePresence, m as motion, useReducedMotion } from 'framer-motion'

/**
 * RotatingWord — animated word swap inside an inline highlight pill.
 * Used in the hero H1 to cycle through marketplace platforms.
 *
 * CLS-safe by construction:
 *   - All candidate words are rendered as invisible "sizers" stacked in a
 *     single CSS-grid cell (grid-area 1/1). The grid track therefore sizes to
 *     the WIDEST + TALLEST word and never changes, so neither the pill nor the
 *     surrounding H1 ever reflows when the word swaps. This was the main cause
 *     of layout shift on the landing (the pill used to resize per word).
 *   - The visible word is layered in the same cell and only animates opacity +
 *     translateY (GPU-composited transforms → no layout, no CLS).
 *   - No `mode="wait"`: with mode="wait" the cell briefly emptied between words,
 *     collapsing and re-expanding the H1 (two big shifts per cycle). The
 *     overlapping cross-fade keeps a word painted at all times.
 *   - The interval pauses while the tab is hidden, so we don't burn the main
 *     thread (TBT) animating off-screen.
 */
// gradient: CSS background. Default = purple (advertiser). Override for
// creator surfaces with `gradient="linear-gradient(135deg, #16a34a 0%, #25d366 100%)"`.
export default function RotatingWord({
  words,
  interval = 2500,
  gradient = 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
}) {
  const [index, setIndex] = useState(0)
  const reducedMotion = useReducedMotion()

  // Stable key derived from words content. Callers often pass an inline array,
  // which would be a new reference every render and reset the interval before
  // it ever fires. Joining once gives us a primitive that only changes when
  // the actual word list changes.
  const wordsKey = useMemo(() => (words || []).join('|'), [words])

  useEffect(() => {
    if (!words || words.length <= 1 || reducedMotion) return
    let timer = null
    const start = () => {
      if (timer == null) {
        timer = setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
      }
    }
    const stop = () => {
      if (timer != null) {
        clearInterval(timer)
        timer = null
      }
    }
    const onVisibility = () => {
      if (typeof document !== 'undefined' && document.hidden) stop()
      else start()
    }
    start()
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibility)
    }
    return () => {
      stop()
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVisibility)
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, interval, reducedMotion])

  if (!words || words.length === 0) return null

  // Shared pill look. Reused by the visible word and the invisible sizers so
  // the reserved box matches the painted pill exactly.
  const pillStyle = {
    padding: '0 14px',
    borderRadius: 10,
    color: '#fff',
    background: gradient,
    whiteSpace: 'nowrap',
  }

  const renderWord = (word) =>
    word.split('\n').map((line, i, arr) => (
      <React.Fragment key={i}>
        {line}
        {i < arr.length - 1 && <br />}
      </React.Fragment>
    ))

  // Reduced motion: no rotation, no timer, no animation — just the first word.
  if (reducedMotion) {
    return (
      <span style={{ display: 'inline-block', ...pillStyle }}>
        {renderWord(words[index])}
      </span>
    )
  }

  return (
    <span
      style={{
        display: 'inline-grid',
        verticalAlign: 'baseline',
        textAlign: 'left',
      }}
    >
      {/* Invisible sizers: every word stacked in the same cell reserves the
          max width AND height so the box never changes size → zero CLS. */}
      {words.map((word, i) => (
        <span
          key={`sizer-${i}`}
          aria-hidden="true"
          style={{
            ...pillStyle,
            gridArea: '1 / 1',
            justifySelf: 'start',
            visibility: 'hidden',
            pointerEvents: 'none',
          }}
        >
          {renderWord(word)}
        </span>
      ))}
      {/* Visible word, layered in the same cell. Only opacity + transform
          animate, so swaps are composited and never shift layout. */}
      <AnimatePresence initial={false}>
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            ...pillStyle,
            gridArea: '1 / 1',
            justifySelf: 'start',
          }}
        >
          {renderWord(words[index])}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
