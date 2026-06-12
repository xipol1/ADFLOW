import React, { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { fadeUp } from './MotionSection'
import { FONT_DISPLAY, FONT_BODY } from '../../theme/tokens'
import { TYPE, SPACE, ACCENT } from '../../theme/landingScale'

/**
 * StickyScrollTour — scroll-driven product tour.
 *
 * Desktop: a text column with one block per step and a sticky visual panel
 * that cross-fades between product screens as each step crosses the middle
 * of the viewport. Active step is tracked with an IntersectionObserver
 * (no scroll-linked transforms → no layout thrash, works on iOS Safari).
 * Screens stack in the same grid cell and only toggle opacity/visibility.
 *
 * Mobile (≤900px): degrades to a vertical stack — each step followed by
 * its screen. No sticky, no observer.
 *
 * Deliberately no AnimatePresence mode="wait" (stalls multi-step renders,
 * see feedback_framer_motion_animate_presence).
 */
export default function StickyScrollTour({
  sectionId = 'how-it-works',
  eyebrow,
  title,
  subtitle,
  steps,
  screens,
}) {
  const [active, setActive] = useState(0)
  const [isMobile, setIsMobile] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 900px)').matches
  )
  const stepRefs = useRef([])

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 900px)')
    const onChange = (e) => setIsMobile(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    if (isMobile) return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.step))
        })
      },
      // A narrow horizontal band around the viewport middle: a step becomes
      // active when it crosses it. Keeps exactly one step active at a time.
      { rootMargin: '-45% 0px -45% 0px' }
    )
    stepRefs.current.forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [isMobile, steps.length])

  return (
    <section id={sectionId} style={{ padding: `${SPACE.sectionY} ${SPACE.gutter}` }}>
      <div style={{ maxWidth: SPACE.maxSection, margin: '0 auto' }}>
        <motion.div
          variants={fadeUp}
          style={{ textAlign: 'center', maxWidth: SPACE.maxText, margin: `0 auto ${SPACE.gapL}px` }}
        >
          <p style={{ ...TYPE.label, color: ACCENT, margin: '0 0 12px' }}>{eyebrow}</p>
          <h2 style={{ ...TYPE.displayL, fontFamily: FONT_DISPLAY, color: 'var(--text)', margin: 0 }}>
            {title}
          </h2>
          {subtitle && (
            <p style={{ ...TYPE.bodyL, fontFamily: FONT_BODY, color: 'var(--muted)', margin: '16px 0 0' }}>
              {subtitle}
            </p>
          )}
        </motion.div>

        {isMobile ? (
          /* ── Mobile: plain vertical stack ── */
          <div style={{ display: 'flex', flexDirection: 'column', gap: SPACE.gapL }}>
            {steps.map((step, i) => (
              <div key={step.title} style={{ display: 'flex', flexDirection: 'column', gap: SPACE.gapS }}>
                <StepBlock step={step} index={i} active />
                <div>{screens[i]}</div>
              </div>
            ))}
          </div>
        ) : (
          /* ── Desktop: text rail + sticky visual ── */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '0.8fr 1.2fr',
              gap: SPACE.gapL,
              // No alignItems:start here — the right column must stretch to
              // the full row height or the sticky panel has no room to travel.
            }}
          >
            <div>
              {steps.map((step, i) => (
                <div
                  key={step.title}
                  data-step={i}
                  ref={(el) => { stepRefs.current[i] = el }}
                  style={{
                    minHeight: '62vh',
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  <StepBlock step={step} index={i} active={active === i} />
                </div>
              ))}
            </div>

            {/* Full-height wrapper: the sticky panel travels inside it. */}
            <div>
              <div style={{ position: 'sticky', top: '16vh', display: 'grid' }}>
                {screens.map((screen, i) => (
                  <div
                    key={i}
                    aria-hidden={active !== i}
                    style={{
                      gridArea: '1 / 1',
                      opacity: active === i ? 1 : 0,
                      visibility: active === i ? 'visible' : 'hidden',
                      transition: 'opacity .35s ease, visibility .35s',
                      pointerEvents: active === i ? 'auto' : 'none',
                    }}
                  >
                    {screen}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

function StepBlock({ step, index, active }) {
  return (
    <div
      style={{
        opacity: active ? 1 : 0.35,
        transition: 'opacity .3s ease',
        maxWidth: 420,
      }}
    >
      <p style={{ ...TYPE.label, color: active ? ACCENT : 'var(--muted)', margin: '0 0 10px', transition: 'color .3s' }}>
        {String(index + 1).padStart(2, '0')} · {step.kicker}
      </p>
      <h3 style={{ ...TYPE.titleM, fontFamily: FONT_DISPLAY, color: 'var(--text)', margin: '0 0 12px' }}>
        {step.title}
      </h3>
      <p style={{ ...TYPE.bodyM, fontFamily: FONT_BODY, color: 'var(--muted)', margin: 0 }}>
        {step.desc}
      </p>
    </div>
  )
}
