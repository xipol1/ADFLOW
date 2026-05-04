import React, { lazy, Suspense } from 'react'
import SEO from '../../components/SEO'
import {
  AnnouncementBar,
  Hero3D,
  SocialProofStrip,
  StickyHeader,
} from '../../components/landing'

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
      <Hero3D />
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

      <Suspense fallback={<NullFallback />}>
        <SupportChat />
      </Suspense>

      <Suspense fallback={<NullFallback />}>
        <ExitIntentModal />
      </Suspense>

      <Suspense fallback={<NullFallback />}>
        <CustomCursor />
      </Suspense>
    </main>
  )
}
