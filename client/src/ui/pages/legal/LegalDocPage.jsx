import React from 'react'
import { Link, Navigate, useParams } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'
import { useLegalManifest } from '../../../services/legal'

/**
 * Canonical legal-document viewer. Renders the real HTML from
 * client/public/legal/<slug>.html (the document the user legally accepts) in an
 * iframe, with a light page chrome. The list of valid slugs + titles comes from
 * the build-generated manifest, so adding/finalising a document needs no code
 * change here.
 */
export default function LegalDocPage() {
  const { slug } = useParams()
  const manifest = useLegalManifest()

  if (!manifest) {
    return (
      <div style={{ fontFamily: FONT_BODY, padding: '60px 24px', maxWidth: 760, margin: '0 auto', color: 'var(--muted)' }}>
        Cargando documento…
      </div>
    )
  }

  const doc = manifest.documents?.[slug]
  // Unknown slug → fall back to the Terms route.
  if (!doc) return <Navigate to="/legal/terminos-condiciones" replace />

  return (
    <div style={{ fontFamily: FONT_BODY, padding: '40px 24px 60px', maxWidth: 920, margin: '0 auto' }}>
      <SEO title={doc.titulo} description={`${doc.titulo} — Channelad`} path={`/legal/${slug}`} />
      <Link
        to="/"
        style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '24px' }}
      >
        ← Volver al inicio
      </Link>

      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '30px', fontWeight: 800, color: 'var(--text)', marginBottom: '6px', letterSpacing: '-0.5px' }}>
        {doc.titulo}
      </h1>
      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '24px' }}>
        Versión {doc.version} ·{' '}
        <a href={doc.url} target="_blank" rel="noopener noreferrer" style={{ color: PURPLE }}>
          abrir en una pestaña nueva
        </a>
      </p>

      <iframe
        title={doc.titulo}
        src={doc.url}
        style={{ width: '100%', height: '80vh', border: '1px solid var(--border)', borderRadius: '12px', background: '#fff' }}
      />
    </div>
  )
}
