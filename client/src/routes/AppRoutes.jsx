import React from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../ui/routing/ProtectedRoute'
import AppLayout from '../ui/layouts/AppLayout'
import LoginPage from '../ui/pages/auth/LoginPage'
import RegisterPage from '../ui/pages/auth/RegisterPage'
import VerifyEmailPage from '../ui/pages/auth/VerifyEmailPage'
import LandingPage from '../ui/pages/landing/LandingPage'
import DashboardPage from '../ui/pages/dashboard/DashboardPage'
import MarketplacePage from '../ui/pages/marketplace/MarketplacePage'
import ChannelExplorerPage from '../ui/pages/channel/ChannelExplorerPage'
import NicheIntelligencePage from '../ui/pages/niche/NicheIntelligencePage'
import RankingsPage from '../ui/pages/rankings/RankingsPage'
import CandidatesReviewPage from '../ui/pages/admin/CandidatesReviewPage'
import ClaimChannelPage from '../ui/pages/claim/ClaimChannelPage'
import { useAuth } from '../auth/AuthContext'

// Advertiser dashboard suite
import AdvertiserLayout from '../ui/pages/dashboard/advertiser/AdvertiserLayout'
import OverviewPage     from '../ui/pages/dashboard/advertiser/OverviewPage'
import ExplorePage      from '../ui/pages/dashboard/advertiser/ExplorePage'
import NewCampaignPage  from '../ui/pages/dashboard/advertiser/NewCampaignPage'
import AutoBuyPage      from '../ui/pages/dashboard/advertiser/AutoBuyPage'
import AdsPage          from '../ui/pages/dashboard/advertiser/AdsPage'
import CampaignsPage    from '../ui/pages/dashboard/advertiser/CampaignsPage'
import FinancesPage     from '../ui/pages/dashboard/advertiser/FinancesPage'
import SettingsPage     from '../ui/pages/dashboard/advertiser/SettingsPage'
import ReferralsPage   from '../ui/pages/dashboard/advertiser/ReferralsPage'
import AdvertiserAnalyticsPage from '../ui/pages/dashboard/advertiser/AdvertiserAnalyticsPage'
import CampaignAnalyticsPage from '../ui/pages/dashboard/advertiser/CampaignAnalyticsPage'

// Creator dashboard suite
import CreatorLayout        from '../ui/pages/dashboard/creator/CreatorLayout'
import CreatorOverviewPage  from '../ui/pages/dashboard/creator/CreatorOverviewPage'
import CreatorChannelsPage  from '../ui/pages/dashboard/creator/CreatorChannelsPage'
import CreatorRequestsPage  from '../ui/pages/dashboard/creator/CreatorRequestsPage'
import CreatorEarningsPage  from '../ui/pages/dashboard/creator/CreatorEarningsPage'
import CreatorSettingsPage  from '../ui/pages/dashboard/creator/CreatorSettingsPage'
import RegisterChannelPage  from '../ui/pages/dashboard/creator/RegisterChannelPage'
import CreatorReferralsPage from '../ui/pages/dashboard/creator/CreatorReferralsPage'
import CreatorAnalyticsPage from '../ui/pages/dashboard/creator/CreatorAnalyticsPage'

// Admin dashboard suite
import AdminLayout          from '../ui/pages/dashboard/admin/AdminLayout'
import AdminOverviewPage    from '../ui/pages/dashboard/admin/AdminOverviewPage'
import AdminUsersPage       from '../ui/pages/dashboard/admin/AdminUsersPage'
import AdminChannelsPage    from '../ui/pages/dashboard/admin/AdminChannelsPage'
import AdminCampaignsPage   from '../ui/pages/dashboard/admin/AdminCampaignsPage'
import AdminDisputesPage    from '../ui/pages/dashboard/admin/AdminDisputesPage'
import AdminFinancesPage    from '../ui/pages/dashboard/admin/AdminFinancesPage'
import AdminScoringPage     from '../ui/pages/dashboard/admin/AdminScoringPage'

// Shared pages
import DisputesPage from '../ui/pages/dashboard/DisputesPage'
import NotificationsPage from '../ui/pages/dashboard/NotificationsPage'

// Coming Soon gate
import ComingSoon from '../ui/components/ComingSoon'

// Legal & info pages
import PrivacyPage from '../ui/pages/legal/PrivacyPage'
import TermsPage from '../ui/pages/legal/TermsPage'
import AboutPage from '../ui/pages/legal/AboutPage'
import SupportPage from '../ui/pages/legal/SupportPage'
import DataProcessingPage from '../ui/pages/legal/DataProcessingPage'
import ForgotPasswordPage from '../ui/pages/auth/ForgotPasswordPage'
import ForChannelsPage from '../ui/pages/landing/ForChannelsPage'
import ForBrandsPage from '../ui/pages/landing/ForBrandsPage'
import BlogIndex from '../ui/pages/blog/BlogIndex'
import BlogPost from '../ui/pages/blog/BlogPost'

// WhatsApp linking
import LinkWhatsAppPage from '../ui/pages/dashboard/creator/LinkWhatsAppPage'
import WhatsAppAuditLogPage from '../ui/pages/dashboard/creator/WhatsAppAuditLogPage'

// Rescued pages (404, password reset, channel detail, onboarding flow)
import NotFoundPage from '../ui/pages/NotFoundPage'
import ResetPasswordPage from '../ui/pages/auth/ResetPasswordPage'
import ChannelDetailPage from '../ui/pages/marketplace/ChannelDetailPage'
import OnboardingLayout from '../ui/pages/onboarding/OnboardingLayout'
import RegisterStep from '../ui/pages/onboarding/RegisterStep'
import VerifyStep from '../ui/pages/onboarding/VerifyStep'
import ChannelStep from '../ui/pages/onboarding/ChannelStep'
import SuccessStep from '../ui/pages/onboarding/SuccessStep'

// Guard for full-access-only pages — shows Coming Soon for limited users
function FullAccessOnly({ children, feature }) {
  const { isFullAccess } = useAuth()
  if (isFullAccess) return children
  return <ComingSoon feature={feature} />
}

export default function AppRoutes() {
  const { isAuthenticated, user } = useAuth()

  return (
    <Routes>
      {/* ── Public / landing routes ────────────────────── */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="marketplace" element={<MarketplacePage />} /> {/* Public browsing allowed */}
        <Route path="marketplace/:channelId" element={<ChannelDetailPage />} /> {/* Marketplace channel detail (purchase-oriented view) */}
        <Route path="channel/:id" element={<ChannelExplorerPage />} /> {/* Public channel intelligence (by ID or username) */}
        <Route path="niche/:nicho" element={<NicheIntelligencePage />} /> {/* Public niche market intelligence */}
        <Route path="rankings" element={<RankingsPage />} /> {/* Public channel rankings */}
        <Route path="explore" element={<ExplorePage />} /> {/* Public explore directory */}
        <Route path="claim/:id" element={<ClaimChannelPage />} /> {/* Claim channel ownership */}
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
        <Route path="soporte" element={<SupportPage />} />
        <Route path="politica-acceso-whatsapp" element={<DataProcessingPage />} />
        <Route path="para-canales" element={<ForChannelsPage />} />
        <Route path="para-anunciantes" element={<ForBrandsPage />} />
        <Route path="blog" element={<BlogIndex />} />
        <Route path="blog/:slug" element={<BlogPost />} />

        {/* Creator / Admin dashboard (uses public NavBar layout) */}
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
        <Route path="ads"      element={<FullAccessOnly feature="Anuncios"><AdsPage /></FullAccessOnly>} />
        <Route path="finances" element={<FullAccessOnly feature="Finanzas"><FinancesPage /></FullAccessOnly>} />
        <Route path="analytics" element={<FullAccessOnly feature="Analytics"><AdvertiserAnalyticsPage /></FullAccessOnly>} />
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
        <Route path="whatsapp-audit" element={<WhatsAppAuditLogPage />} />
        <Route path="requests" element={<FullAccessOnly feature="Solicitudes"><CreatorRequestsPage /></FullAccessOnly>} />
        <Route path="earnings" element={<FullAccessOnly feature="Ganancias"><CreatorEarningsPage /></FullAccessOnly>} />
        <Route path="analytics" element={<FullAccessOnly feature="Analytics"><CreatorAnalyticsPage /></FullAccessOnly>} />
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
  )
}
