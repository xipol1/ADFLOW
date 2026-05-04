import React from 'react'
import { motion } from 'framer-motion'

/* ── 01 Discover — magnifier scanning channels ──────────────── */
export function DiscoverIcon({ color = '#3b82f6', active }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Channel cards in background */}
      {[0, 1, 2].map(i => (
        <motion.rect
          key={i}
          x={8 + i * 4} y={14 + i * 4}
          width={28} height={6} rx={2}
          fill={color}
          animate={active
            ? { opacity: [0.15, 0.4, 0.15] }
            : { opacity: 0.2 }
          }
          transition={{ duration: 1.6, repeat: Infinity, delay: i * 0.2 }}
        />
      ))}
      {/* Magnifier */}
      <motion.g
        animate={active
          ? { x: [-4, 8, -4], y: [-2, 6, -2] }
          : { x: 0, y: 0 }
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
      >
        <circle cx="32" cy="28" r="9" stroke={color} strokeWidth="2.5" fill="white" />
        <line x1="39" y1="35" x2="44" y2="40" stroke={color} strokeWidth="2.5" strokeLinecap="round" />
      </motion.g>
    </svg>
  )
}

/* ── 02 Pay — coin going into shield ───────────────────────── */
export function PayIcon({ color = '#8b5cf6', active }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Shield */}
      <motion.path
        d="M28 16 L40 20 L40 32 Q40 40 28 44 Q16 40 16 32 L16 20 Z"
        fill={`${color}15`}
        stroke={color}
        strokeWidth="2"
        strokeLinejoin="round"
        animate={active
          ? { scale: [1, 1.04, 1] }
          : { scale: 1 }
        }
        transition={{ duration: 1.8, repeat: Infinity }}
        style={{ transformOrigin: '28px 30px' }}
      />
      {/* Coin falling */}
      <motion.g
        animate={active
          ? { y: [-22, 4, 4], opacity: [0, 1, 0] }
          : { y: 0, opacity: 0 }
        }
        transition={{ duration: 2, repeat: Infinity, ease: 'easeIn', times: [0, 0.6, 1] }}
      >
        <circle cx="28" cy="28" r="5" fill="#fbbf24" stroke="#f59e0b" strokeWidth="1.5" />
        <text x="28" y="31" textAnchor="middle" fontSize="7" fontWeight="700" fill="#fff">€</text>
      </motion.g>
      {/* Lock */}
      <motion.g
        animate={active ? { opacity: [0, 0, 1, 1] } : { opacity: 1 }}
        transition={{ duration: 2, repeat: Infinity, times: [0, 0.6, 0.7, 1] }}
      >
        <rect x="25" y="29" width="6" height="5" rx="1" fill={color} />
        <path d="M26 29 L26 27 Q26 25 28 25 Q30 25 30 27 L30 29" stroke={color} strokeWidth="1.5" fill="none" />
      </motion.g>
    </svg>
  )
}

/* ── 03 Publish — paper airplane sending message ───────────── */
export function PublishIcon({ color = '#10b981', active }) {
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Trail */}
      <motion.path
        d="M10 38 Q20 32 30 28"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeDasharray="3 4"
        fill="none"
        animate={active
          ? { strokeDashoffset: [0, -14] }
          : {}
        }
        transition={{ duration: 1.4, repeat: Infinity, ease: 'linear' }}
        opacity={0.5}
      />
      {/* Airplane */}
      <motion.g
        animate={active
          ? { x: [-10, 10, -10], y: [4, -4, 4] }
          : { x: 0, y: 0 }
        }
        transition={{ duration: 3, repeat: Infinity, ease: 'easeInOut' }}
      >
        <path
          d="M28 18 L42 28 L28 28 L24 38 L22 30 L18 26 Z"
          fill={color}
          stroke={color}
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </motion.g>
      {/* Receiver dot */}
      <motion.circle
        cx="44" cy="36" r="3"
        fill={color}
        animate={active
          ? { scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }
          : { scale: 1, opacity: 0.5 }
        }
        transition={{ duration: 1.4, repeat: Infinity }}
      />
    </svg>
  )
}

/* ── 04 Results — bars rising ──────────────────────────────── */
export function ResultsIcon({ color = '#f59e0b', active }) {
  const bars = [
    { x: 14, h: 14 },
    { x: 22, h: 20 },
    { x: 30, h: 28 },
    { x: 38, h: 22 },
  ]
  return (
    <svg width="56" height="56" viewBox="0 0 56 56" fill="none">
      {/* Baseline */}
      <line x1="10" y1="42" x2="46" y2="42" stroke={color} strokeWidth="1.5" opacity="0.3" />
      {/* Bars */}
      {bars.map((b, i) => (
        <motion.rect
          key={i}
          x={b.x} width={6} rx={1.5}
          fill={color}
          animate={active
            ? { y: [42, 42 - b.h, 42 - b.h], height: [0, b.h, b.h] }
            : { y: 42 - b.h, height: b.h }
          }
          transition={{
            duration: 1.6,
            repeat: Infinity,
            repeatDelay: 0.8,
            delay: i * 0.12,
            ease: [0.22, 1, 0.36, 1],
          }}
        />
      ))}
      {/* Trend arrow */}
      <motion.path
        d="M14 32 L22 26 L30 20 L38 14"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={active
          ? { pathLength: [0, 1, 1], opacity: [0, 1, 0] }
          : { pathLength: 1, opacity: 0.6 }
        }
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.4 }}
      />
      <motion.path
        d="M34 14 L38 14 L38 18"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
        animate={active
          ? { opacity: [0, 1, 0] }
          : { opacity: 0.6 }
        }
        transition={{ duration: 2.4, repeat: Infinity, repeatDelay: 0.4, delay: 0.5 }}
      />
    </svg>
  )
}

export const FLOW_ICONS = [DiscoverIcon, PayIcon, PublishIcon, ResultsIcon]
