import React, { lazy, Suspense } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ui/routing/ProtectedRoute'
import AppLayout from '../ui/layouts/AppLayout'
import { useAuth } from '../auth/AuthContext'
import { getFeatureFlag } from '../flags/featureFlags'

// ── Eagerly loaded (used on first paint or critical path) ──────────
import LandingPage from '../ui/pages/landing/LandingPage'

// ── Lazy-loaded pages ──────────────────────────────────────────────
const LoginPage = lazy(() => import('../ui/pages/auth/LoginPage'))
const RegisterPage = lazy(() => import('../ui/pages/auth/RegisterPage'))
const VerifyEmailPage = lazy(() => import('../ui/pages/auth/VerifyEmailPage'))
const ForgotPasswordPage = lazy(() => import('../ui/pages/auth/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('../ui/pages/auth/ResetPasswordPage'))

const DashboardPage = lazy(() => import('../ui/pages/dashboard/DashboardPage'))
const MarketplacePage = lazy(() => import('../ui/pages/marketplace/MarketplacePage'))
const ChannelExplorerPage = lazy(() => import('../ui/pages/channel/ChannelExplorerPage'))
const NicheIntelligencePage = lazy(() => import('../ui/pages/niche/NicheIntelligencePage'))
const RankingsPage = lazy(() => import('../ui/pages/rankings/RankingsPage'))
const CandidatesReviewPage = lazy(() => import('../ui/pages/admin/CandidatesReviewPage'))
const ClaimChannelPage = lazy(() => import('../ui/pages/claim/ClaimChannelPage'))
const ChannelDetailPage = lazy(() => import('../ui/pages/marketplace/ChannelDetailPage'))

const ForChannelsPage = lazy(() => import('../ui/pages/landing/ForChannelsPage'))
const ForBrandsPage = lazy(() => import('../ui/pages/landing/ForBrandsPage'))
const HerramientasPage = lazy(() => import('../ui/pages/landing/HerramientasPage'))
const QueEsChanneladPage = lazy(() => import('../ui/pages/landing/QueEsChanneladPage'))
const BlogIndex = lazy(() => import('../ui/pages/blog/BlogIndex'))
const BlogPost = lazy(() => import('../ui/pages/blog/BlogPost'))

const PrivacyPage = lazy(() => import('../ui/pages/legal/PrivacyPage'))
const TermsPage = lazy(() => import('../ui/pages/legal/TermsPage'))
const AboutPage = lazy(() => import('../ui/pages/legal/AboutPage'))
const SupportPage = lazy(() => import('../ui/pages/legal/SupportPage'))
const DataProcessingPage = lazy(() => import('../ui/pages/legal/DataProcessingPage'))

const NotFoundPage = lazy(() => import('../ui/pages/NotFoundPage'))
const PublicCreatorProfilePage = lazy(() => import('../ui/pages/public/PublicCreatorProfilePage'))

// Advertiser dashboard suite
const AdvertiserLayout = lazy(() => import('../ui/pages/dashboard/advertiser/AdvertiserLayout'))
const OverviewPage = lazy(() => import('../ui/pages/dashboard/advertiser/OverviewPage'))
const ExplorePage = lazy(() => import('../ui/pages/dashboard/advertiser/ExplorePage'))
const NewCampaignPage = lazy(() => import('../ui/pages/dashboard/advertiser/NewCampaignPage'))
const AutoBuyPage = lazy(() => import('../ui/pages/dashboard/advertiser/AutoBuyPage'))
const AdsPage = lazy(() => import('../ui/pages/dashboard/advertiser/AdsPage'))
const CampaignsPage = lazy(() => import('../ui/pages/dashboard/advertiser/CampaignsPage'))
const FinancesPage = lazy(() => import('../ui/pages/dashboard/advertiser/FinancesPage'))
const InboxPage = lazy(() => import('../ui/pages/dashboard/advertiser/InboxPage'))
const TrackingSetupPage = lazy(() => import('../ui/pages/dashboard/advertiser/TrackingSetupPage'))
const SettingsPage = lazy(() => import('../ui/pages/dashboard/advertiser/SettingsPage'))
const ReferralsPage = lazy(() => import('../ui/pages/dashboard/advertiser/ReferralsPage'))
const AdvertiserAnalyticsPage = lazy(() => import('../ui/pages/dashboard/advertiser/AdvertiserAnalyticsPage'))
const CampaignAnalyticsPage = lazy(() => import('../ui/pages/dashboard/advertiser/CampaignAnalyticsPage'))
const AnalyzeChannelPage = lazy(() => import('../ui/pages/dashboard/advertiser/AnalyzeChannelPage'))
const AnalyzeAdPage = lazy(() => import('../ui/pages/dashboard/advertiser/AnalyzeAdPage'))
const CompareChannelsPage = lazy(() => import('../ui/pages/dashboard/advertiser/CompareChannelsPage'))
const NicheHeatmapPage = lazy(() => import('../ui/pages/dashboard/advertiser/NicheHeatmapPage'))
const ForecastROIPage = lazy(() => import('../ui/pages/dashboard/advertiser/ForecastROIPage'))
const LookalikeChannelsPage = lazy(() => import('../ui/pages/dashboard/advertiser/LookalikeChannelsPage'))
const AuditChannelsPage = lazy(() => import('../ui/pages/dashboard/advertiser/AuditChannelsPage'))
const CampaignCalendarPage = lazy(() => import('../ui/pages/dashboard/advertiser/CampaignCalendarPage'))
const RealtimeMonitorPage = lazy(() => import('../ui/pages/dashboard/advertiser/RealtimeMonitorPage'))
const FunnelAnalyzerPage = lazy(() => import('../ui/pages/dashboard/advertiser/FunnelAnalyzerPage'))
const CohortAnalysisPage = lazy(() => import('../ui/pages/dashboard/advertiser/CohortAnalysisPage'))
const PositionTrackerPage = lazy(() => import('../ui/pages/dashboard/advertiser/PositionTrackerPage'))
const AudienceOverlapPage = lazy(() => import('../ui/pages/dashboard/advertiser/AudienceOverlapPage'))
const ABTestLabPage = lazy(() => import('../ui/pages/dashboard/advertiser/ABTestLabPage'))
const BulkLauncherPage = lazy(() => import('../ui/pages/dashboard/advertiser/BulkLauncherPage'))
const TopicResearchPage = lazy(() => import('../ui/pages/dashboard/advertiser/TopicResearchPage'))
const AudienceInsightsPage = lazy(() => import('../ui/pages/dashboard/advertiser/AudienceInsightsPage'))
const ReportStudioPage = lazy(() => import('../ui/pages/dashboard/advertiser/ReportStudioPage'))

// Creator dashboard suite
const CreatorLayout = lazy(() => import('../ui/pages/dashboard/creator/CreatorLayout'))
const CreatorOverviewPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorOverviewPage'))
const CreatorChannelsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorChannelsPage'))
const CreatorRequestsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorRequestsPage'))
const CreatorEarningsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorEarningsPage'))
const CreatorSettingsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorSettingsPage'))
const RegisterChannelPage = lazy(() => import('../ui/pages/dashboard/creator/RegisterChannelPage'))
const CreatorReferralsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorReferralsPage'))
const CreatorAnalyticsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorAnalyticsPage'))
const PricingOptimizerPage = lazy(() => import('../ui/pages/dashboard/creator/PricingOptimizerPage'))
const CreatorReportsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorReportsPage'))
const CreatorABTestPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorABTestPage'))
const CreatorAudiencePage = lazy(() => import('../ui/pages/dashboard/creator/CreatorAudiencePage'))
const CreatorComparePage = lazy(() => import('../ui/pages/dashboard/creator/CreatorComparePage'))
const CreatorProfilePage = lazy(() => import('../ui/pages/dashboard/creator/CreatorProfilePage'))
const CreatorInboxPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorInboxPage'))
const CreatorDiscoverPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorDiscoverPage'))
const CreatorCalendarPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorCalendarPage'))
const CreatorBrandsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorBrandsPage'))
const CreatorNotificationsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorNotificationsPage'))
const CreatorContentStudioPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorContentStudioPage'))
const CreatorToolsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorToolsPage'))
const CreatorActivityPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorActivityPage'))
const CreatorBillingPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorBillingPage'))
const CreatorSwapsPage = lazy(() => import('../ui/pages/dashboard/creator/CreatorSwapsPage'))
const LinkWhatsAppPage = lazy(() => import('../ui/pages/dashboard/creator/LinkWhatsAppPage'))
const WhatsAppAuditLogPage = lazy(() => import('../ui/pages/dashboard/creator/WhatsAppAuditLogPage'))
const VerifyWhatsAppAdminPage = lazy(() => import('../ui/pages/dashboard/creator/VerifyWhatsAppAdminPage'))

// Admin dashboard suite
const AdminLayout = lazy(() => import('../ui/pages/dashboard/admin/AdminLayout'))
const AdminOverviewPage = lazy(() => import('../ui/pages/dashboard/admin/AdminOverviewPage'))
const AdminUsersPage = lazy(() => import('../ui/pages/dashboard/admin/AdminUsersPage'))
const AdminChannelsPage = lazy(() => import('../ui/pages/dashboard/admin/AdminChannelsPage'))
const AdminCampaignsPage = lazy(() => import('../ui/pages/dashboard/admin/AdminCampaignsPage'))
const AdminDisputesPage = lazy(() => import('../ui/pages/dashboard/admin/AdminDisputesPage'))
const AdminFinancesPage = lazy(() => import('../ui/pages/dashboard/admin/AdminFinancesPage'))
const AdminScoringPage = lazy(() => import('../ui/pages/dashboard/admin/AdminScoringPage'))

// Shared pages
const DisputesPage = lazy(() => import('../ui/pages/dashboard/DisputesPage'))
const NotificationsPage = lazy(() => import('../ui/pages/dashboard/NotificationsPage'))
const ComingSoon = lazy(() => import('../ui/components/ComingSoon'))

// Onboarding flow
const OnboardingLayout = lazy(() => import('../ui/pages/onboarding/OnboardingLayout'))
const RegisterStep = lazy(() => import('../ui/pages/onboarding/RegisterStep'))
const VerifyStep = lazy(() => import('../ui/pages/onboarding/VerifyStep'))
const ChannelStep = lazy(() => import('../ui/pages/onboarding/ChannelStep'))
const SuccessStep = lazy(() => import('../ui/pages/onboarding/SuccessStep'))

function RouteFallback() {
  return <div style={{ minHeight: '100vh' }} />
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
  const landingUnificationEnabled = getFeatureFlag('landingUnification')

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        {/* ── Public / landing routes ────────────────────── */}
        <Route path="/" element={<AppLayout />}>
          <Route index element={landingUnificationEnabled ? <ForBrandsPage /> : <LandingPage />} />
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
          <Route path="herramientas" element={<HerramientasPage />} />
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
          <Route path="autobuy"  element={<FullAccessOnly feature="Auto-compra"><AutoBuyPage /></FullAccessOnly>} />
          <Route path="campaigns" element={<FullAccessOnly feature="Campanas"><CampaignsPage /></FullAccessOnly>} />
          <Route path="campaigns/new" element={<FullAccessOnly feature="Campanas"><NewCampaignPage /></FullAccessOnly>} />
          <Route path="campaigns/:id/analytics" element={<FullAccessOnly feature="Campanas"><CampaignAnalyticsPage /></FullAccessOnly>} />
          <Route path="ads"      element={<Navigate to="/advertiser/campaigns?tab=solicitudes" replace />} />
          <Route path="finances" element={<FullAccessOnly feature="Finanzas"><FinancesPage /></FullAccessOnly>} />
          <Route path="inbox"    element={<InboxPage />} />
          <Route path="tracking-setup" element={<TrackingSetupPage />} />
          <Route path="analytics" element={<Navigate to="/advertiser/finances" replace />} />
          <Route path="analyze/channel"   element={<FullAccessOnly feature="Análisis de canal"><AnalyzeChannelPage /></FullAccessOnly>} />
          <Route path="analyze/compare"   element={<FullAccessOnly feature="Comparar canales"><CompareChannelsPage /></FullAccessOnly>} />
          <Route path="analyze/lookalike" element={<FullAccessOnly feature="Canales similares"><LookalikeChannelsPage /></FullAccessOnly>} />
          <Route path="analyze/audit"     element={<FullAccessOnly feature="Auditoría bulk"><AuditChannelsPage /></FullAccessOnly>} />
          <Route path="analyze/niches"    element={<FullAccessOnly feature="Heatmap de nichos"><NicheHeatmapPage /></FullAccessOnly>} />
          <Route path="analyze/ad"        element={<FullAccessOnly feature="Análisis de anuncio"><AnalyzeAdPage /></FullAccessOnly>} />
          <Route path="analyze/forecast"  element={<FullAccessOnly feature="Forecaster ROI"><ForecastROIPage /></FullAccessOnly>} />
          <Route path="analyze/realtime"  element={<FullAccessOnly feature="Monitor en tiempo real"><RealtimeMonitorPage /></FullAccessOnly>} />
          <Route path="analyze/funnel"    element={<FullAccessOnly feature="Funnel Analyzer"><FunnelAnalyzerPage /></FullAccessOnly>} />
          <Route path="analyze/cohorts"   element={<FullAccessOnly feature="Análisis por cohortes"><CohortAnalysisPage /></FullAccessOnly>} />
          <Route path="analyze/watchlist" element={<FullAccessOnly feature="Watchlist de canales"><PositionTrackerPage /></FullAccessOnly>} />
          <Route path="analyze/overlap"   element={<FullAccessOnly feature="Solapamiento de audiencias"><AudienceOverlapPage /></FullAccessOnly>} />
          <Route path="analyze/abtest"    element={<FullAccessOnly feature="A/B Test Lab"><ABTestLabPage /></FullAccessOnly>} />
          <Route path="campaigns/bulk"    element={<FullAccessOnly feature="Bulk Launcher"><BulkLauncherPage /></FullAccessOnly>} />
          <Route path="analyze/topics"    element={<FullAccessOnly feature="Topic Research"><TopicResearchPage /></FullAccessOnly>} />
          <Route path="analyze/audience"  element={<FullAccessOnly feature="Audience Insights"><AudienceInsightsPage /></FullAccessOnly>} />
          <Route path="analyze/reports"   element={<FullAccessOnly feature="Report Studio"><ReportStudioPage /></FullAccessOnly>} />
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
          <Route path="channels/link-whatsapp" element={<LinkWhatsAppPage />} />
          <Route path="channels/:canalId/verify-wa-admin" element={<VerifyWhatsAppAdminPage />} />
          <Route path="whatsapp-audit" element={<WhatsAppAuditLogPage />} />
          <Route path="requests" element={<FullAccessOnly feature="Solicitudes"><CreatorRequestsPage /></FullAccessOnly>} />
          <Route path="earnings" element={<FullAccessOnly feature="Ganancias"><CreatorEarningsPage /></FullAccessOnly>} />
          <Route path="analytics" element={<FullAccessOnly feature="Analytics"><CreatorAnalyticsPage /></FullAccessOnly>} />
          <Route path="pricing" element={<FullAccessOnly feature="Pricing Optimizer"><PricingOptimizerPage /></FullAccessOnly>} />
          <Route path="reports" element={<FullAccessOnly feature="Reports Studio"><CreatorReportsPage /></FullAccessOnly>} />
          <Route path="abtest" element={<FullAccessOnly feature="A/B Testing"><CreatorABTestPage /></FullAccessOnly>} />
          <Route path="audience" element={<FullAccessOnly feature="Audience Insights"><CreatorAudiencePage /></FullAccessOnly>} />
          <Route path="compare" element={<FullAccessOnly feature="Comparativa"><CreatorComparePage /></FullAccessOnly>} />
          <Route path="profile" element={<CreatorProfilePage />} />
          <Route path="inbox" element={<FullAccessOnly feature="Inbox"><CreatorInboxPage /></FullAccessOnly>} />
          <Route path="discover" element={<FullAccessOnly feature="Discover"><CreatorDiscoverPage /></FullAccessOnly>} />
          <Route path="calendar" element={<FullAccessOnly feature="Calendario"><CreatorCalendarPage /></FullAccessOnly>} />
          <Route path="brands"   element={<FullAccessOnly feature="Brands CRM"><CreatorBrandsPage /></FullAccessOnly>} />
          <Route path="notifications" element={<CreatorNotificationsPage />} />
          <Route path="content"  element={<FullAccessOnly feature="Content Studio"><CreatorContentStudioPage /></FullAccessOnly>} />
          <Route path="tools"    element={<FullAccessOnly feature="Tools"><CreatorToolsPage /></FullAccessOnly>} />
          <Route path="activity" element={<FullAccessOnly feature="Actividad"><CreatorActivityPage /></FullAccessOnly>} />
          <Route path="billing"  element={<FullAccessOnly feature="Billing"><CreatorBillingPage /></FullAccessOnly>} />
          <Route path="swaps"    element={<FullAccessOnly feature="Colaboraciones"><CreatorSwapsPage /></FullAccessOnly>} />
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
          <Route path="settings"   element={<SettingsPage />} />
        </Route>

        {/* ── Onboarding flow (self-contained layout) ────── */}
        <Route path="/onboarding" element={<OnboardingLayout />}>
          <Route index element={<Navigate to="register" replace />} />
          <Route path="register" element={<RegisterStep />} />
          <Route path="verify" element={<VerifyStep />} />
          <Route path="channel" element={<ChannelStep />} />
          <Route path="success" element={<SuccessStep />} />
        </Route>

        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  )
}
