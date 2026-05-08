import React, { useRef } from 'react'
import { motion, useInView } from 'framer-motion'

// Reusable framer-motion variants for landing sections.
// Co-located with MotionSection because everything that uses these lives in
// the landing layer; importing from a separate animations.js would just add
// hops without buying anything.
export const fadeUp = {
  hidden: { opacity: 0, y: 40 },
  visible: (i = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: i * 0.1, ease: [0.25, 0.46, 0.45, 0.94] },
  }),
}

export const staggerContainer = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1, delayChildren: 0.15 } },
}

export const staggerItem = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export const scaleIn = {
  hidden: { opacity: 0, scale: 0.92 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export const slideFromLeft = {
  hidden: { opacity: 0, x: -50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

export const slideFromRight = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] } },
}

/**
 * MotionSection — animated landing section wrapper.
 *
 * Children mount with the staggerContainer variant; descendants using
 * staggerItem / fadeUp / scaleIn etc. inherit the orchestrated entry.
 * Animation triggers once when the section enters the viewport.
 */
export default function MotionSection({ children, style, id, className, margin = '-60px' }) {
  const ref = useRef(null)
  const isInView = useInView(ref, { once: true, margin })
  return (
    <motion.section
      ref={ref}
      id={id}
      className={className}
      style={style}
      initial="hidden"
      animate={isInView ? 'visible' : 'hidden'}
      variants={staggerContainer}
    >
      {children}
    </motion.section>
  )
}
