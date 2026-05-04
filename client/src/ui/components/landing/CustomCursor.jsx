import React, { useEffect, useState } from 'react'
import { motion, useMotionValue, useSpring } from 'framer-motion'

export default function CustomCursor() {
  const x = useMotionValue(-100)
  const y = useMotionValue(-100)
  const sx = useSpring(x, { stiffness: 500, damping: 35, mass: 0.5 })
  const sy = useSpring(y, { stiffness: 500, damping: 35, mass: 0.5 })
  const ringSx = useSpring(x, { stiffness: 120, damping: 18, mass: 0.6 })
  const ringSy = useSpring(y, { stiffness: 120, damping: 18, mass: 0.6 })

  const [variant, setVariant] = useState('default') // default | hover | text | hidden
  const [enabled, setEnabled] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    // Disable on touch / coarse pointer
    const isCoarse = window.matchMedia('(pointer: coarse)').matches
    if (isCoarse) return
    setEnabled(true)

    const onMove = (e) => {
      x.set(e.clientX)
      y.set(e.clientY)
    }
    const onOver = (e) => {
      const t = e.target
      if (!t || t.nodeType !== 1) return
      const tag = t.tagName?.toLowerCase()
      const role = t.getAttribute('role')
      const cursor = getComputedStyle(t).cursor
      if (tag === 'a' || tag === 'button' || role === 'button' || cursor === 'pointer') {
        setVariant('hover')
      } else if (tag === 'input' || tag === 'textarea' || t.isContentEditable) {
        setVariant('text')
      } else {
        setVariant('default')
      }
    }
    const onLeave = () => setVariant('hidden')
    const onEnter = () => setVariant('default')

    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseover', onOver)
    document.addEventListener('mouseleave', onLeave)
    document.addEventListener('mouseenter', onEnter)
    document.documentElement.style.cursor = 'none'

    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseover', onOver)
      document.removeEventListener('mouseleave', onLeave)
      document.removeEventListener('mouseenter', onEnter)
      document.documentElement.style.cursor = ''
    }
  }, [x, y])

  if (!enabled) return null

  const isHover = variant === 'hover'
  const isText = variant === 'text'
  const isHidden = variant === 'hidden'

  return (
    <>
      {/* Inner dot */}
      <motion.div
        animate={{
          opacity: isHidden ? 0 : 1,
          scale: isHover ? 0.4 : isText ? 0.6 : 1,
        }}
        style={{
          position: 'fixed', top: 0, left: 0,
          x: sx, y: sy,
          translateX: '-50%', translateY: '-50%',
          width: 8, height: 8, borderRadius: '50%',
          background: '#7C3AED',
          pointerEvents: 'none',
          zIndex: 9999,
          mixBlendMode: 'difference',
        }}
      />
      {/* Outer ring */}
      <motion.div
        animate={{
          opacity: isHidden ? 0 : 1,
          width: isHover ? 48 : isText ? 4 : 32,
          height: isHover ? 48 : isText ? 22 : 32,
          borderRadius: isText ? 2 : '50%',
          background: isHover ? 'rgba(124,58,237,0.12)' : isText ? '#7C3AED' : 'transparent',
          borderColor: isHover ? 'rgba(124,58,237,0.5)' : 'rgba(124,58,237,0.35)',
        }}
        transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
        style={{
          position: 'fixed', top: 0, left: 0,
          x: ringSx, y: ringSy,
          translateX: '-50%', translateY: '-50%',
          border: '1.5px solid',
          pointerEvents: 'none',
          zIndex: 9998,
        }}
      />
    </>
  )
}
