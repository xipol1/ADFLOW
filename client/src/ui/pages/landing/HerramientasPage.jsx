import React from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { ArrowLeft } from 'lucide-react'
import SEO from '../../components/SEO'
import LazyMount from '../../components/utils/LazyMount'
import Hero3D from '../../components/landing/Hero3D'
import DashboardShowcase from '../../components/landing/DashboardShowcase'
import RealDataSection from '../../components/landing/RealDataSection'
import SubscriptionTiers3D from '../../components/landing/SubscriptionTiers3D'
import {
  PURPLE as A,
  purpleAlpha as AG,
  FONT_BODY,
  MAX_W,
} from '../../theme/tokens'

const F = FONT_BODY

// Re-uses three components from the legacy main landing (Hero3D 3D dashboard
// mockup, DashboardShowcase 4-category tab grid, RealDataSection numbers +
// trust badges). Wrapped in LazyMount so the 3D mockup and showcase only
// initialize once they scroll into view.

export default function HerramientasPage() {
  return (
    <main
      data-testid="herramientas-page"
      style={{
        fontFamily: F,
        color: 'var(--text)',
        background: 'var(--bg)',
        position: 'relative',
        minHeight: '100vh',
      }}
    >
      <SEO
        title="Herramientas para anunciantes"
        description="+30 herramientas en una plataforma: descubrir canales, analizar audiencia, optimizar ROI y ejecutar campañas en comunidades privadas. Todas incluidas en la comisión."
        path="/herramientas"
        type="website"
      />

      {/* Back-to-landing chip — sits above Hero3D's own internal layout */}
      <div
        style={{
          maxWidth: MAX_W,
          margin: '0 auto',
          padding: 'clamp(28px, 5vw, 48px) clamp(16px, 4vw, 32px) 0',
          position: 'relative',
          zIndex: 5,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              padding: '7px 14px',
              borderRadius: 999,
              background: AG(0.08),
              border: `1px solid ${AG(0.20)}`,
              color: A,
              fontSize: 13,
              fontWeight: 600,
              textDecoration: 'none',
              transition: 'background .2s, transform .2s',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = AG(0.14)
              e.currentTarget.style.transform = 'translateX(-2px)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = AG(0.08)
              e.currentTarget.style.transform = 'none'
            }}
          >
            <ArrowLeft size={14} strokeWidth={2.4} />
            Para marcas
          </Link>
        </motion.div>
      </div>

      {/* Hero — 3D dashboard mockup with mouse parallax + scroll narrative.
         Self-contained: includes its own headline, subtitle and signup form. */}
      <Hero3D />

      {/* +30 herramientas en 4 categorías con tabs interactivos */}
      <LazyMount placeholder={<div style={{ minHeight: 720 }} />}>
        <DashboardShowcase />
      </LazyMount>

      {/* Métricas verificables + badges de seguridad */}
      <LazyMount placeholder={<div style={{ minHeight: 560 }} />}>
        <RealDataSection />
      </LazyMount>

      {/* Subscription tiers — 4 cards 3D (Free creator + Pro/Agency/Enterprise advertiser) */}
      <LazyMount placeholder={<div style={{ minHeight: 720 }} />}>
        <SubscriptionTiers3D />
      </LazyMount>
    </main>
  )
}
