import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'

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
export default function RotatingWord({ words, interval = 2500 }) {
  const [index, setIndex] = useState(0)

  useEffect(() => {
    if (!words || words.length <= 1) return
    const id = setInterval(() => setIndex((i) => (i + 1) % words.length), interval)
    return () => clearInterval(id)
  }, [words, interval])

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
            background: 'linear-gradient(135deg, #7C3AED 0%, #A855F7 100%)',
            whiteSpace: 'nowrap',
          }}
        >
          {words[index]}
        </motion.span>
      </AnimatePresence>
    </span>
  )
}
