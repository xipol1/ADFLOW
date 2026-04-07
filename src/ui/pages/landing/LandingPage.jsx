import React, { lazy, Suspense, useEffect } from 'react'
import SEO from '../../components/SEO'
import {
  AnnouncementBar,
  HeroSection,
  SocialProofStrip,
} from '../../components/landing'

// Lazy-load below-the-fold sections
const PlatformExplainer = lazy(() => import('../../components/landing/PlatformExplainer'))
const BenefitsBento = lazy(() => import('../../components/landing/BenefitsBento'))
const TrustSection = lazy(() => import('../../components/landing/TrustSection'))
const HowItWorks = lazy(() => import('../../components/landing/HowItWorks'))
const Testimonials = lazy(() => import('../../components/landing/Testimonials'))
const PricingComparison = lazy(() => import('../../components/landing/PricingComparison'))
const FinalCTA = lazy(() => import('../../components/landing/FinalCTA'))
const FAQSection = lazy(() => import('../../components/landing/FAQSection'))
const LandingFooter = lazy(() => import('../../components/landing/LandingFooter'))

function SectionFallback() {
  return <div style={{ minHeight: '200px' }} />
}

// Color shift: toggle accent between purple and green every 30s
function useColorShift() {
  useEffect(() => {
    let isGreen = false
    const interval = setInterval(() => {
      isGreen = !isGreen
      document.documentElement.dataset.accent = isGreen ? 'green' : ''
    }, 30000)
    return () => {
      clearInterval(interval)
      delete document.documentElement.dataset.accent
    }
  }, [])
}

export default function LandingPage() {
  useColorShift()

  return (
    <div style={{ minHeight: '100vh' }}>
      <SEO
        title={null}
        description="Channelad es el marketplace de publicidad en comunidades reales. Conecta anunciantes con canales verificados de WhatsApp, Telegram y Discord. Pagos custodiados y metricas en tiempo real."
        path="/"
      />
      <AnnouncementBar />
      <HeroSection />
      <SocialProofStrip />

      <Suspense fallback={<SectionFallback />}>
        <PlatformExplainer />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <BenefitsBento />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <TrustSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <HowItWorks />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <Testimonials />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <PricingComparison />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <FAQSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <FinalCTA />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <LandingFooter />
      </Suspense>
    </div>
  )
}
