import React, { useState, useEffect, useMemo } from 'react'
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion'

/**
 * RotatingWord — animated word swap inside an inline highlight pill.
 * Used in the hero H1 to cycle through marketplace platforms.
 *
 * Notes:
 *   - mode="wait" so the exiting word fully animates out before the next
 *     one enters. Without it the swap flickers.
 *   - The wrapper is inline-block with no width hint, so the highlighted
 *     pill resizes to whatever the longest word at any moment needs.
 *     This causes a subtle layout shift on each swap (acceptable for
 *     marketing copy — the reader notices the word change, not the shift).
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

  return (
    <span style={{ position: 'relative', display: 'inline-block' }}>
      <AnimatePresence mode="wait">
        <motion.span
          key={words[index]}
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -16 }}
          transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
          style={{
            display: 'inline-block',
            padding: '0 14px',
            borderRadius: 10,
            color: '#fff',
            background: gradient,
            whiteSpace: 'nowrap',
          }}
        >
          {words[index].split('\n').map((line, i, arr) => (
            <React.Fragment key={i}>
              {line}
              {i < arr.length - 1 && <br />}
            </React.Fragment>
          ))}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
