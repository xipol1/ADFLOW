import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ui/routing/ProtectedRoute'
import AppLayout from '../ui/layouts/AppLayout'
import ProGate from '../ui/components/ProGate'
import FeatureGate from '../ui/components/FeatureGate'
import { useAuth } from '../auth/AuthContext'

// ── Eagerly loaded (used on first paint or critical path) ──────────
import ForBrandsPage from '../ui/pages/landing/ForBrandsPage'

// ── Lazy-loaded pages ──────────────────────────────────────────────
const LoginPage = lazyWithRetry(() => import('../ui/pages/auth/LoginPage'))
const RegisterPage = lazyWithRetry(() => import('../ui/pages/auth/RegisterPage'))
const VerifyEmailPage = lazyWithRetry(() => import('../ui/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazyWithRetry(() => import('../ui/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazyWithRetry(() => import('../ui/pages/auth/ResetPasswordPage'))

const DashboardPage = lazyWithRetry(() => import('../ui/pages/dashboard/DashboardPage'))
const MarketplacePage = lazyWithRetry(() => import('../ui/pages/marketplace/MarketplacePage'))
const ChannelExplorerPage = lazyWithRetry(() => import('../ui/pages/channel/ChannelExplorerPage'))
const NicheIntelligencePage = lazyWithRetry(() => import('../ui/pages/niche/NicheIntelligencePage'))
const RankingsPage = lazyWithRetry(() => import('../ui/pages/rankings/RankingsPage'))
const CandidatesReviewPage = lazyWithRetry(() => import('../ui/pages/admin/CandidatesReviewPage'))
const ClaimChannelPage = lazyWithRetry(() => import('../ui/pages/claim/ClaimChannelPage'))
const ChannelDetailPage = lazyWithRetry(() => import('../ui/pages/marketplace/ChannelDetailPage'))

const ForChannelsPage = lazyWithRetry(() => import('../ui/pages/landing/ForChannelsPage'))
const ForCreatorsEN = lazyWithRetry(() => import('../ui/pages/landing/ForCreatorsEN'))
const ForAdvertisersEN = lazyWithRetry(() => import('../ui/pages/landing/ForAdvertisersEN'))
const WhatsAppPage = lazyWithRetry(() => import('../ui/pages/landing/WhatsAppPage'))
const BenchmarkPage = lazyWithRetry(() => import('../ui/pages/landing/BenchmarkPage'))
const FoundingPage = lazyWithRetry(() => import('../ui/pages/landing/FoundingPage'))
const AuditPage = lazyWithRetry(() => import('../ui/pages/landing/AuditPage'))
const HerramientasPage = lazyWithRetry(() => import('../ui/pages/landing/HerramientasPage'))
const PricingPage = lazyWithRetry(() => import('../ui/pages/pricing/PricingPage'))
const BillingPage = lazyWithRetry(() => import('../ui/pages/account/BillingPage'))
const QueEsChanneladPage = lazyWithRetry(() => import('../ui/pages/landing/QueEsChanneladPage'))
const BlogIndex = lazyWithRetry(() => import('../ui/pages/blog/BlogIndex'))
const BlogPost = lazyWithRetry(() => import('../ui/pages/blog/BlogPost'))

const PrivacyPage = lazyWithRetry(() => import('../ui/pages/legal/PrivacyPage'))
const TermsPage = lazyWithRetry(() => import('../ui/pages/legal/TermsPage'))
const AboutPage = lazyWithRetry(() => import('../ui/pages/legal/AboutPage'))
const SupportPage = lazyWithRetry(() => import('../ui/pages/legal/SupportPage'))
const DataProcessingPage = lazyWithRetry(() => import('../ui/pages/legal/DataProcessingPage'))

const NotFoundPage = lazyWithRetry(() => import('../ui/pages/NotFoundPage'))
const PublicCreatorProfilePage = lazyWithRetry(() => import('../ui/pages/public/PublicCreatorProfilePage'))

// Advertiser dashboard suite
const AdvertiserLayout = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AdvertiserLayout'))
const OverviewPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/OverviewPage'))
const ExplorePage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/ExplorePage'))
const NewCampaignPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/NewCampaignPage'))
const AutoBuyPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AutoBuyPage'))
const AdsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AdsPage'))
const CampaignsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/CampaignsPage'))
const FinancesPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/FinancesPage'))
const InboxPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/InboxPage'))
const TrackingSetupPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/TrackingSetupPage'))
const SettingsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/SettingsPage'))
const ReferralsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/ReferralsPage'))
const AdvertiserAnalyticsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AdvertiserAnalyticsPage'))
const CampaignAnalyticsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/CampaignAnalyticsPage'))
const AnalyzeChannelPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AnalyzeChannelPage'))
const AnalyzeAdPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AnalyzeAdPage'))
const CompareChannelsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/CompareChannelsPage'))
const NicheHeatmapPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/NicheHeatmapPage'))
const ForecastROIPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/ForecastROIPage'))
const LookalikeChannelsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/LookalikeChannelsPage'))
const AuditChannelsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AuditChannelsPage'))
const CampaignCalendarPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/CampaignCalendarPage'))
const RealtimeMonitorPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/RealtimeMonitorPage'))
const FunnelAnalyzerPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/FunnelAnalyzerPage'))
const CohortAnalysisPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/CohortAnalysisPage'))
const PositionTrackerPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/PositionTrackerPage'))
const AudienceOverlapPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AudienceOverlapPage'))
const ABTestLabPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/ABTestLabPage'))
const BulkLauncherPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/BulkLauncherPage'))
const TopicResearchPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/TopicResearchPage'))
const AudienceInsightsPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/AudienceInsightsPage'))
const ReportStudioPage = lazyWithRetry(() => import('../ui/pages/dashboard/advertiser/ReportStudioPage'))

// Creator dashboard suite
const CreatorLayout = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorLayout'))
const CreatorOverviewPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorOverviewPage'))
const CreatorChannelsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorChannelsPage'))
const CreatorRequestsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorRequestsPage'))
const CreatorEarningsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorEarningsPage'))
const CreatorSettingsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorSettingsPage'))
const RegisterChannelPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/RegisterChannelPage'))
const CreatorReferralsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorReferralsPage'))
const CreatorAnalyticsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorAnalyticsPage'))
const PricingOptimizerPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/PricingOptimizerPage'))
const CreatorReportsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorReportsPage'))
const CreatorABTestPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorABTestPage'))
const CreatorAudiencePage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorAudiencePage'))
const CreatorComparePage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorComparePage'))
const CreatorProfilePage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorProfilePage'))
const CreatorInboxPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorInboxPage'))
const CreatorDiscoverPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorDiscoverPage'))
const CreatorCalendarPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorCalendarPage'))
const CreatorBrandsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorBrandsPage'))
const CreatorNotificationsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorNotificationsPage'))
const CreatorContentStudioPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorContentStudioPage'))
const CreatorToolsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorToolsPage'))
const CreatorActivityPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorActivityPage'))
const CreatorBillingPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorBillingPage'))
const CreatorSwapsPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorSwapsPage'))
const CreatorLinksPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/CreatorLinksPage'))
const LinkWhatsAppPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/LinkWhatsAppPage'))
const WhatsAppAuditLogPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/WhatsAppAuditLogPage'))
const VerifyWhatsAppAdminPage = lazyWithRetry(() => import('../ui/pages/dashboard/creator/VerifyWhatsAppAdminPage'))

// Admin dashboard suite
const AdminLayout = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminLayout'))
const AdminOverviewPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminOverviewPage'))
const AdminUsersPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminUsersPage'))
const AdminChannelsPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminChannelsPage'))
const AdminCampaignsPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminCampaignsPage'))
const AdminDisputesPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminDisputesPage'))
const AdminFinancesPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminFinancesPage'))
const AdminScoringPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminScoringPage'))
const AdminErrorsPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminErrorsPage'))
const AdminFoundersPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminFoundersPage'))
const AdminPayoutsPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminPayoutsPage'))
const AdminSubscriptionsPage = lazyWithRetry(() => import('../ui/pages/dashboard/admin/AdminSubscriptionsPage'))

// Shared pages
const DisputesPage = lazyWithRetry(() => import('../ui/pages/dashboard/DisputesPage'))
const NotificationsPage = lazyWithRetry(() => import('../ui/pages/dashboard/NotificationsPage'))
const ComingSoon = lazyWithRetry(() => import('../ui/components/ComingSoon'))

// Onboarding flow — account creation happens in /auth/register. This flow
// covers channel creation, channel verification, and the success state.
const OnboardingLayout = lazyWithRetry(() => import('../ui/pages/onboarding/OnboardingLayout'))
const ChannelStep = lazyWithRetry(() => import('../ui/pages/onboarding/ChannelStep'))
const VerifyStep = lazyWithRetry(() => import('../ui/pages/onboarding/VerifyStep'))
const SuccessStep = lazyWithRetry(() => import('../ui/pages/onboarding/SuccessStep'))

function RouteFallback() {
  return <div style={{ minHeight: '100vh', background: 'var(--bg)' }} />
}

// Wraps React.lazy so a failed dynamic import — which happens when a
// client holds a stale index.html pointing at chunk hashes that a newer
// deploy has removed — triggers exactly one hard reload to fetch the
// fresh index.html. A sessionStorage guard prevents an infinite reload
// loop if the chunk is genuinely broken.
const CHUNK_RELOAD_KEY = 'channelad:chunk-reload'
function lazyWithRetry(importer) {
  return lazy(() =>
    importer()
      .then((mod) => {
        try { window.sessionStorage.removeItem(CHUNK_RELOAD_KEY) } catch { /* storage unavailable */ }
        return mod
      })
      .catch((err) => {
        let alreadyReloaded = false
        try { alreadyReloaded = window.sessionStorage.getItem(CHUNK_RELOAD_KEY) === '1' } catch { /* storage unavailable */ }
        if (!alreadyReloaded) {
          try { window.sessionStorage.setItem(CHUNK_RELOAD_KEY, '1') } catch { /* storage unavailable */ }
          window.location.reload()
          return new Promise(() => {}) // hold Suspense until the reload happens
        }
        throw err
      })
  )
}

function FullAccessOnly({ children, feature }) {
  const { isFullAccess } = useAuth()
  if (isFullAccess) return children
  return (
    <Suspense fallback={<RouteFallback />}>
      <ComingSoon feature={feature} />
    </Suspense>
  )
}

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Public / landing routes ────────────────────── */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={<ForBrandsPage />} />
          <Route path="marketplace" element={<MarketplacePage />} />
          <Route path="marketplace/:channelId" element={<ChannelDetailPage />} />
          <Route path="channel/:id" element={<ChannelExplorerPage />} />
          <Route path="niche/:nicho" element={<NicheIntelligencePage />} />
          <Route path="rankings" element={<RankingsPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="claim/:id" element={<ClaimChannelPage />} />
          <Route path="c/:slug" element={<PublicCreatorProfilePage />} />
          <Route
            path="auth"
            element={isAuthenticated && user?.emailVerificado !== false ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />}
          />
          <Route
            path="auth/login"
            element={isAuthenticated && user?.emailVerificado !== false ? <Navigate to="/dashboard" replace /> : <LoginPage />}
          />
          <Route
            path="auth/register"
            element={isAuthenticated && user?.emailVerificado !== false ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
          />
          <Route path="auth/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="auth/reset-password/:token" element={<ResetPasswordPage />} />
          <Route path="verificar-email/:token" element={<VerifyEmailPage />} />
          <Route path="privacidad" element={<PrivacyPage />} />
          <Route path="terminos" element={<TermsPage />} />
          <Route path="sobre-nosotros" element={<AboutPage />} />
          <Route path="que-es-channelad" element={<QueEsChanneladPage />} />
          <Route path="soporte" element={<SupportPage />} />
          <Route path="politica-acceso-whatsapp" element={<DataProcessingPage />} />
          <Route path="para-canales" element={<ForChannelsPage />} />
          <Route path="para-anunciantes" element={<ForBrandsPage />} />
          <Route path="whatsapp" element={<WhatsAppPage />} />
          <Route path="benchmark" element={<BenchmarkPage />} />
          <Route path="founding" element={<FoundingPage />} />
          {/* Channel One was merged into the founding cohort — keep the old URL alive. */}
          <Route path="channel-one" element={<Navigate to="/founding" replace />} />
          <Route path="audit" element={<AuditPage />} />
          <Route path="herramientas" element={<HerramientasPage />} />
          <Route path="pricing" element={<PricingPage />} />
          <Route path="precios" element={<PricingPage />} />
          <Route
            path="account/billing"
            element={
              <ProtectedRoute>
                <BillingPage />
              </ProtectedRoute>
            }
          />
          <Route path="blog" element={<BlogIndex />} />
          <Route path="blog/:slug" element={<BlogPost />} />

          <Route
            path="dashboard"
            element={
              <ProtectedRoute>
                <DashboardPage />
              </ProtectedRoute>
            }
          />
          <Route
            path="admin/candidates"
            element={
              <ProtectedRoute>
                <CandidatesReviewPage />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* ── Advertiser dashboard — own sidebar layout ─── */}
        <Route
          path="/advertiser"
          element={
            <ProtectedRoute requireBeta>
              <AdvertiserLayout />
            </ProtectedRoute>
          }
        >
          <Route index        element={<OverviewPage />} />
          <Route path="explore"  element={<FullAccessOnly feature="Marketplace"><ExplorePage /></FullAccessOnly>} />
          <Route path="autobuy"  element={<ProGate feature="bulkLauncher" label="Autobuy / Bulk Launcher"><FullAccessOnly feature="Auto-compra"><AutoBuyPage /></FullAccessOnly></ProGate>} />
          <Route path="campaigns" element={<FullAccessOnly feature="Campanas"><CampaignsPage /></FullAccessOnly>} />
          <Route path="campaigns/new" element={<FullAccessOnly feature="Campanas"><NewCampaignPage /></FullAccessOnly>} />
          <Route path="campaigns/:id/analytics" element={<FullAccessOnly feature="Campanas"><CampaignAnalyticsPage /></FullAccessOnly>} />
          <Route path="ads"      element={<Navigate to="/advertiser/campaigns?tab=solicitudes" replace />} />
          <Route path="finances" element={<FullAccessOnly feature="Finanzas"><FinancesPage /></FullAccessOnly>} />
          <Route path="inbox"    element={<InboxPage />} />
          <Route path="tracking-setup" element={<TrackingSetupPage />} />
          <Route path="analytics" element={<Navigate to="/advertiser/finances" replace />} />
          <Route path="analyze/channel"   element={<FullAccessOnly feature="Análisis de canal"><AnalyzeChannelPage /></FullAccessOnly>} />
          <Route path="analyze/compare"   element={<ProGate feature="lookalike" label="Comparar canales"><FullAccessOnly feature="Comparar canales"><CompareChannelsPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/lookalike" element={<ProGate feature="lookalike" label="Canales similares"><FullAccessOnly feature="Canales similares"><LookalikeChannelsPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/audit"     element={<ProGate feature="bulkLauncher" label="Auditoría bulk de canales"><FullAccessOnly feature="Auditoría bulk"><AuditChannelsPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/niches"    element={<ProGate feature="nicheHeatmap" label="Heatmap de nichos"><FullAccessOnly feature="Heatmap de nichos"><NicheHeatmapPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/ad"        element={<FullAccessOnly feature="Análisis de anuncio"><AnalyzeAdPage /></FullAccessOnly>} />
          <Route path="analyze/forecast"  element={<ProGate feature="forecastRoi" label="Forecaster ROI"><FullAccessOnly feature="Forecaster ROI"><ForecastROIPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/realtime"  element={<ProGate feature="realtimeMonitor" label="Monitor en tiempo real"><FullAccessOnly feature="Monitor en tiempo real"><RealtimeMonitorPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/funnel"    element={<ProGate feature="forecastRoi" label="Funnel Analyzer"><FullAccessOnly feature="Funnel Analyzer"><FunnelAnalyzerPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/cohorts"   element={<ProGate feature="audienceInsights" label="Análisis por cohortes"><FullAccessOnly feature="Análisis por cohortes"><CohortAnalysisPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/watchlist" element={<ProGate feature="realtimeMonitor" label="Watchlist de canales"><FullAccessOnly feature="Watchlist de canales"><PositionTrackerPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/overlap"   element={<ProGate feature="audienceInsights" label="Solapamiento de audiencias"><FullAccessOnly feature="Solapamiento de audiencias"><AudienceOverlapPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/abtest"    element={<ProGate feature="abTestLab" label="A/B Test Lab"><FullAccessOnly feature="A/B Test Lab"><ABTestLabPage /></FullAccessOnly></ProGate>} />
          <Route path="campaigns/bulk"    element={<ProGate feature="bulkLauncher" label="Bulk Launcher"><FullAccessOnly feature="Bulk Launcher"><BulkLauncherPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/topics"    element={<ProGate feature="forecastRoi" label="Topic Research"><FullAccessOnly feature="Topic Research"><TopicResearchPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/audience"  element={<ProGate feature="audienceInsights" label="Audience Insights"><FullAccessOnly feature="Audience Insights"><AudienceInsightsPage /></FullAccessOnly></ProGate>} />
          <Route path="analyze/reports"   element={<ProGate feature="forecastRoi" label="Report Studio"><FullAccessOnly feature="Report Studio"><ReportStudioPage /></FullAccessOnly></ProGate>} />
          <Route path="campaigns/calendar" element={<FullAccessOnly feature="Calendario de campañas"><CampaignCalendarPage /></FullAccessOnly>} />
          <Route path="analyze/calendar"  element={<FullAccessOnly feature="Calendario de campañas"><CampaignCalendarPage /></FullAccessOnly>} />
          <Route path="referrals" element={<ReferralsPage />} />
          <Route path="disputes" element={<FullAccessOnly feature="Disputas"><DisputesPage /></FullAccessOnly>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<SettingsPage />} />
        </Route>

        {/* ── Creator dashboard — own sidebar layout ── */}
        <Route
          path="/creator"
          element={
            <ProtectedRoute requireBeta>
              <CreatorLayout />
            </ProtectedRoute>
          }
        >
          <Route index         element={<CreatorOverviewPage />} />
          <Route path="channels" element={<CreatorChannelsPage />} />
          <Route path="channels/new" element={<RegisterChannelPage />} />
          <Route path="channels/link-whatsapp" element={<FeatureGate feature="whatsapp"><LinkWhatsAppPage /></FeatureGate>} />
          <Route path="channels/:canalId/verify-wa-admin" element={<FeatureGate feature="whatsapp"><VerifyWhatsAppAdminPage /></FeatureGate>} />
          <Route path="whatsapp-audit" element={<WhatsAppAuditLogPage />} />
          <Route path="requests" element={<FullAccessOnly feature="Solicitudes"><CreatorRequestsPage /></FullAccessOnly>} />
          <Route path="earnings" element={<FullAccessOnly feature="Ganancias"><CreatorEarningsPage /></FullAccessOnly>} />
          <Route path="analytics" element={<ProGate feature="advancedAnalytics" label="Analytics avanzados"><FullAccessOnly feature="Analytics"><CreatorAnalyticsPage /></FullAccessOnly></ProGate>} />
          <Route path="pricing" element={<ProGate feature="advancedAnalytics" label="Pricing Optimizer"><FullAccessOnly feature="Pricing Optimizer"><PricingOptimizerPage /></FullAccessOnly></ProGate>} />
          <Route path="reports" element={<ProGate feature="advancedAnalytics" label="Reports Studio"><FullAccessOnly feature="Reports Studio"><CreatorReportsPage /></FullAccessOnly></ProGate>} />
          <Route path="abtest" element={<ProGate feature="advancedAnalytics" label="A/B Testing"><FullAccessOnly feature="A/B Testing"><CreatorABTestPage /></FullAccessOnly></ProGate>} />
          <Route path="audience" element={<ProGate feature="advancedAnalytics" label="Audience Insights"><FullAccessOnly feature="Audience Insights"><CreatorAudiencePage /></FullAccessOnly></ProGate>} />
          <Route path="compare" element={<ProGate feature="advancedAnalytics" label="Comparativa de canales"><FullAccessOnly feature="Comparativa"><CreatorComparePage /></FullAccessOnly></ProGate>} />
          <Route path="profile" element={<CreatorProfilePage />} />
          <Route path="inbox" element={<FullAccessOnly feature="Inbox"><CreatorInboxPage /></FullAccessOnly>} />
          <Route path="discover" element={<ProGate feature="advancedAnalytics" label="Discover de oportunidades"><FullAccessOnly feature="Discover"><CreatorDiscoverPage /></FullAccessOnly></ProGate>} />
          <Route path="calendar" element={<FullAccessOnly feature="Calendario"><CreatorCalendarPage /></FullAccessOnly>} />
          <Route path="brands"   element={<ProGate feature="advancedAnalytics" label="Brands CRM"><FullAccessOnly feature="Brands CRM"><CreatorBrandsPage /></FullAccessOnly></ProGate>} />
          <Route path="notifications" element={<CreatorNotificationsPage />} />
          <Route path="content"  element={<ProGate feature="advancedAnalytics" label="Content Studio"><FullAccessOnly feature="Content Studio"><CreatorContentStudioPage /></FullAccessOnly></ProGate>} />
          <Route path="tools"    element={<ProGate feature="apiAccess" label="Tools y API personal"><FullAccessOnly feature="Tools"><CreatorToolsPage /></FullAccessOnly></ProGate>} />
          <Route path="activity" element={<FullAccessOnly feature="Actividad"><CreatorActivityPage /></FullAccessOnly>} />
          <Route path="billing"  element={<FullAccessOnly feature="Billing"><CreatorBillingPage /></FullAccessOnly>} />
          <Route path="swaps"    element={<FullAccessOnly feature="Colaboraciones"><CreatorSwapsPage /></FullAccessOnly>} />
          <Route path="links"    element={<CreatorLinksPage />} />
          <Route path="referrals" element={<CreatorReferralsPage />} />
          <Route path="disputes" element={<FullAccessOnly feature="Disputas"><DisputesPage /></FullAccessOnly>} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="settings" element={<CreatorSettingsPage />} />
        </Route>

        {/* ── Admin dashboard — own sidebar layout ── */}
        <Route
          path="/admin"
          element={
            <ProtectedRoute allowedRoles={['admin']}>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index          element={<AdminOverviewPage />} />
          <Route path="users"      element={<AdminUsersPage />} />
          <Route path="channels"   element={<AdminChannelsPage />} />
          <Route path="campaigns"  element={<AdminCampaignsPage />} />
          <Route path="disputes"   element={<AdminDisputesPage />} />
          <Route path="finances"   element={<AdminFinancesPage />} />
          <Route path="scoring"    element={<AdminScoringPage />} />
          <Route path="errors"     element={<AdminErrorsPage />} />
          <Route path="founders"   element={<AdminFoundersPage />} />
          <Route path="payouts"    element={<AdminPayoutsPage />} />
          <Route path="subscriptions" element={<AdminSubscriptionsPage />} />
          <Route path="settings"   element={<SettingsPage />} />
        </Route>

        {/* ── Onboarding flow (self-contained layout) ──────
            ProtectedRoute enforces auth + email verification. Account
            creation lives in /auth/register; this flow only handles
            channel onboarding for verified creators. */}
        <Route
          path="/onboarding"
          element={
            <ProtectedRoute>
              <OnboardingLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="channel" replace />} />
          <Route path="channel" element={<ChannelStep />} />
          <Route path="verify" element={<VerifyStep />} />
          <Route path="success" element={<SuccessStep />} />
        </Route>

        {/* ── English landing (standalone, own EN header/footer) ── */}
        <Route path="/en/for-creators" element={<ForCreatorsEN />} />
        <Route path="/en/for-advertisers" element={<ForAdvertisersEN />} />

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
