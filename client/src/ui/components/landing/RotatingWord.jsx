import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * RotatingWord — animated word swap inside an inline highlight pill.
 * Used in the hero H1 to cycle through marketplace platforms.
 *
 * Notes:
 *   - mode="wait" so the exiting word fully animates out before the next
 *     one enters. Without it the swap flickers.
 *   - The wrapper reserves the box of the WIDEST/TALLEST word (every word is
 *     rendered invisibly, stacked in a single inline-grid cell). The visible
 *     pill then swaps inside that fixed box, so the heading never re-wraps and
 *     nothing below it moves — this is what keeps CLS ~0. The pill keeps its
 *     exact look; the word is centred within the reserved width.
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
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => clearInterval(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wordsKey, interval, reducedMotion])

  if (!words || words.length === 0) return null

  const renderLines = (w) => w.split('\n').map((line, i, arr) => (
    <React.Fragment key={i}>
      {line}
      {i < arr.length - 1 && <br />}
    </React.Fragment>
  ))

  return (
    <span style={{ display: 'inline-grid', verticalAlign: 'baseline' }}>
      {/* Invisible sizers — one per word, all stacked in the same grid cell so
          the cell (and therefore the pill) is sized to the widest/tallest word.
          Never painted; purely reserves layout so swaps don't reflow the H1. */}
      {words.map((w, i) => (
        <span
          key={`sizer-${i}`}
          aria-hidden="true"
          style={{
            gridArea: '1 / 1',
            visibility: 'hidden',
            padding: '0 14px',
            whiteSpace: 'nowrap',
          }}
        >
          {renderLines(w)}
        </span>
      ))}

      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            gridArea: '1 / 1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '0 14px',
            borderRadius: 10,
            color: '#fff',
            background: gradient,
            whiteSpace: 'nowrap',
          }}
        >
          {renderLines(words[index])}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
