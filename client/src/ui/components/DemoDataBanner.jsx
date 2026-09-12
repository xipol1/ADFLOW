import React from 'react'
import { FlaskConical } from 'lucide-react'
import { WARN, FONT_BODY as F } from '../theme/tokens'

/**
 * Marks a page whose numbers are not real yet.
 *
 * Three creator pages synthesise data client-side — the A/B test simulates
 * views and revenue with Math.random(), Discover generates brief timestamps,
 * and the Content Studio picks a random canned "AI" result. Unlabelled, a beta
 * tester can take a real decision from an invented number. Until each one is
 * wired to live data, say so on the page.
 *
 * @param {string} what - what exactly is simulated, in the page's own terms.
 */
export default function DemoDataBanner({ what }) {
  return (
    <div
      role="status"
      style={{
        display: 'flex', alignItems: 'flex-start', gap: 9,
        background: `${WARN}14`, border: `1px solid ${WARN}44`,
        borderRadius: 10, padding: '10px 14px', marginBottom: 16,
        fontFamily: F, fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.55,
      }}
    >
      <FlaskConical size={15} style={{ color: WARN, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
      <span>
        <strong style={{ color: 'var(--text)' }}>Datos de demostración.</strong>{' '}
        {what} No tomes decisiones a partir de estas cifras: todavía no salen de tus campañas reales.
      </span>
    </div>
  )
}
