// Shared style tokens for blog post components.
// Single source of truth — edit here once, applies to all posts.

export const PURPLE = '#7C3AED'
export const FONT_INTER = "'Inter', system-ui, sans-serif"
export const FONT_SORA = "'Sora', system-ui, sans-serif"

export const h2Style = {
  fontFamily: FONT_SORA,
  fontSize: 'clamp(22px, 4vw, 28px)',
  fontWeight: 700,
  lineHeight: 1.3,
  letterSpacing: '-0.3px',
  marginTop: '48px',
  marginBottom: '16px',
  color: 'var(--text)',
}

export const h3Style = {
  fontFamily: FONT_SORA,
  fontSize: '18px',
  fontWeight: 600,
  marginTop: '24px',
  marginBottom: '8px',
  color: 'var(--text)',
}

export const pStyle = {
  fontFamily: FONT_INTER,
  fontSize: '16px',
  lineHeight: 1.75,
  color: 'var(--text)',
  marginBottom: '16px',
}

export const liStyle = {
  fontFamily: FONT_INTER,
  fontSize: '16px',
  lineHeight: 1.75,
  color: 'var(--text)',
  marginBottom: '8px',
}

export const linkStyle = {
  color: PURPLE,
  textDecoration: 'none',
  fontWeight: 600,
}

export const strongStyle = { fontWeight: 600 }

export const imgStyle = {
  width: '100%',
  height: 'auto',
  borderRadius: '12px',
  margin: '32px 0',
  objectFit: 'cover',
  maxHeight: '400px',
}

export const captionStyle = {
  fontSize: '13px',
  color: 'var(--muted)',
  textAlign: 'center',
  marginTop: '-24px',
  marginBottom: '28px',
  fontStyle: 'italic',
}

export const quoteStyle = {
  margin: '24px 0',
  padding: '20px 24px',
  borderLeft: `3px solid ${PURPLE}`,
  background: `${PURPLE}05`,
  borderRadius: '0 12px 12px 0',
  fontStyle: 'italic',
  fontSize: '15px',
  lineHeight: 1.7,
  color: 'var(--text)',
}

export const boxStyle = {
  background: `${PURPLE}08`,
  border: `1px solid ${PURPLE}20`,
  borderRadius: '12px',
  padding: '20px 24px',
  margin: '24px 0',
}

export const tableWrap = { overflowX: 'auto', margin: '24px 0' }

export const tableStyle = {
  width: '100%',
  borderCollapse: 'collapse',
  fontFamily: FONT_INTER,
  fontSize: '14px',
}

export const thStyle = {
  textAlign: 'left',
  padding: '12px 14px',
  borderBottom: `2px solid ${PURPLE}30`,
  fontWeight: 600,
  background: `${PURPLE}08`,
  color: 'var(--text)',
}

export const tdStyle = {
  padding: '12px 14px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--text)',
}
