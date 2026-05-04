import React, { lazy, Suspense, useEffect, useState } from 'react'
import SEO from '../../components/SEO'
import {
  AnnouncementBar,
  SocialProofStrip,
  StickyHeader,
} from '../../components/landing'

const Hero3D = lazy(() => import('../../components/landing/Hero3D'))
const ROICalculator = lazy(() => import('../../components/landing/ROICalculator'))
const ComparisonSection = lazy(() => import('../../components/landing/ComparisonSection'))
const EscrowFlowAnimation = lazy(() => import('../../components/landing/EscrowFlowAnimation'))
const DashboardShowcase = lazy(() => import('../../components/landing/DashboardShowcase'))
const CampaignFlow = lazy(() => import('../../components/landing/CampaignFlow'))
const RealDataSection = lazy(() => import('../../components/landing/RealDataSection'))
const BenefitsBento = lazy(() => import('../../components/landing/BenefitsBento'))
const Testimonials = lazy(() => import('../../components/landing/Testimonials'))
const PricingComparison = lazy(() => import('../../components/landing/PricingComparison'))
const FAQSection = lazy(() => import('../../components/landing/FAQSection'))
const FinalCTA = lazy(() => import('../../components/landing/FinalCTA'))
const LandingFooter = lazy(() => import('../../components/landing/LandingFooter'))
const ExitIntentModal = lazy(() => import('../../components/landing/ExitIntentModal'))
const SupportChat = lazy(() => import('../../components/landing/SupportChat'))
const CustomCursor = lazy(() => import('../../components/landing/CustomCursor'))

function SectionFallback() {
  return <div style={{ minHeight: '200px' }} />
}
function NullFallback() { return null }

// Keeps hero space reserved while it streams in (prevents CLS)
function HeroFallback() {
  return (
    <div style={{
      minHeight: '92vh',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: 'clamp(100px, 16vw, 140px) 20px',
    }}>
      <div style={{
        width: 56, height: 56, borderRadius: 14,
        background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
        boxShadow: '0 12px 28px rgba(124,58,237,0.3)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: '#fff', fontWeight: 700, fontSize: 22,
        fontFamily: "'Sora', sans-serif",
        animation: 'heroPulse 1.4s ease-in-out infinite',
      }}>C</div>
      <style>{`@keyframes heroPulse { 0%,100% { transform: scale(1); opacity: 1 } 50% { transform: scale(1.05); opacity: 0.7 } }`}</style>
    </div>
  )
}

// Defers mounting until browser idle to avoid blocking initial render
function DeferredMount({ children, delay = 0 }) {
  const [ready, setReady] = useState(false)
  useEffect(() => {
    if (typeof window === 'undefined') return
    const ric = window.requestIdleCallback || ((cb) => setTimeout(cb, 1))
    const cancel = window.cancelIdleCallback || clearTimeout
    const id = ric(() => setReady(true), { timeout: 2000 + delay })
    return () => cancel(id)
  }, [delay])
  return ready ? children : null
}

export default function LandingPage() {
  return (
    <main style={{ minHeight: '100vh' }}>
      <SEO
        title={null}
        description="Channelad es el marketplace de publicidad en comunidades reales. Dashboard con +30 herramientas, calculadora de ROI, escrow Stripe y metricas verificadas con tracking links."
        path="/"
      />
      <StickyHeader />
      <AnnouncementBar />

      <Suspense fallback={<HeroFallback />}>
        <Hero3D />
      </Suspense>

      <SocialProofStrip />

      <Suspense fallback={<SectionFallback />}>
        <ROICalculator />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <ComparisonSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <DashboardShowcase />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <CampaignFlow />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <EscrowFlowAnimation />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <RealDataSection />
      </Suspense>

      <Suspense fallback={<SectionFallback />}>
        <BenefitsBento />
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

      <DeferredMount delay={500}>
        <Suspense fallback={<NullFallback />}>
          <SupportChat />
        </Suspense>
      </DeferredMount>

      <DeferredMount delay={1000}>
        <Suspense fallback={<NullFallback />}>
          <ExitIntentModal />
        </Suspense>
      </DeferredMount>

      <DeferredMount delay={1500}>
        <Suspense fallback={<NullFallback />}>
          <CustomCursor />
        </Suspense>
      </DeferredMount>
    </main>
  )
}
