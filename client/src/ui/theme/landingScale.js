// Landing type & spacing scale. Single source for the home page —
// no new magic numbers in section markup, compose from these tokens.
// Rule of thumb: max 3 visible type sizes per viewport.

export const TYPE = {
  // H1 only — one per page.
  displayXl: {
    fontSize: 'clamp(44px, 6vw, 76px)',
    lineHeight: 1.02,
    letterSpacing: '-0.04em',
    fontWeight: 700,
  },
  // Section H2.
  displayL: {
    fontSize: 'clamp(32px, 4vw, 52px)',
    lineHeight: 1.08,
    letterSpacing: '-0.03em',
    fontWeight: 700,
  },
  titleM: {
    fontSize: 'clamp(20px, 2.5vw, 26px)',
    lineHeight: 1.2,
    letterSpacing: '-0.02em',
    fontWeight: 600,
  },
  // Hero sub / section intro.
  bodyL: { fontSize: 18, lineHeight: 1.6 },
  // General copy.
  bodyM: { fontSize: 15, lineHeight: 1.6 },
  // Kickers / eyebrows.
  label: {
    fontSize: 12,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    fontWeight: 600,
  },
}

export const SPACE = {
  // Vertical rhythm between sections: 140 desktop → 64 mobile.
  sectionY: 'clamp(64px, 10vw, 140px)',
  gutter: 'clamp(20px, 4vw, 32px)',
  gapS: 24,
  gapM: 32,
  gapL: 48,
  maxText: 640,
  maxSection: 1200,
}

// The purple accent is allowed ONLY on: primary CTA, input focus, and at
// most one highlighted datum per section. Never on backgrounds, default
// borders or shadows.
export const ACCENT = '#7C3AED'
