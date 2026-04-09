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
import { useAuth } from '../auth/AuthContext'

// Advertiser dashboard suite
import AdvertiserLayout from '../ui/pages/dashboard/advertiser/AdvertiserLayout'
import OverviewPage     from '../ui/pages/dashboard/advertiser/OverviewPage'
import ExplorePage      from '../ui/pages/dashboard/advertiser/ExplorePage'
import AutoBuyPage      from '../ui/pages/dashboard/advertiser/AutoBuyPage'
import AdsPage          from '../ui/pages/dashboard/advertiser/AdsPage'
import CampaignsPage    from '../ui/pages/dashboard/advertiser/CampaignsPage'
import FinancesPage     from '../ui/pages/dashboard/advertiser/FinancesPage'
import SettingsPage     from '../ui/pages/dashboard/advertiser/SettingsPage'
import ReferralsPage   from '../ui/pages/dashboard/advertiser/ReferralsPage'

// Creator dashboard suite
import CreatorLayout        from '../ui/pages/dashboard/creator/CreatorLayout'
import CreatorOverviewPage  from '../ui/pages/dashboard/creator/CreatorOverviewPage'
import CreatorChannelsPage  from '../ui/pages/dashboard/creator/CreatorChannelsPage'
import CreatorRequestsPage  from '../ui/pages/dashboard/creator/CreatorRequestsPage'
import CreatorEarningsPage  from '../ui/pages/dashboard/creator/CreatorEarningsPage'
import CreatorSettingsPage  from '../ui/pages/dashboard/creator/CreatorSettingsPage'
import RegisterChannelPage  from '../ui/pages/dashboard/creator/RegisterChannelPage'
import CreatorReferralsPage from '../ui/pages/dashboard/creator/CreatorReferralsPage'

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
import ForgotPasswordPage from '../ui/pages/auth/ForgotPasswordPage'
import ForChannelsPage from '../ui/pages/landing/ForChannelsPage'
import ForBrandsPage from '../ui/pages/landing/ForBrandsPage'
import BlogIndex from '../ui/pages/blog/BlogIndex'
import BlogPost from '../ui/pages/blog/BlogPost'

// Guard for full-access-only pages — shows Coming Soon for limited users
function FullAccessOnly({ children, feature }) {
  const { isFullAccess } = useAuth()
  if (isFullAccess) return children
  return <ComingSoon feature={feature} />
}

export default function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* ── Public / landing routes ────────────────────── */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="marketplace" element={<MarketplacePage />} /> {/* Public browsing allowed */}
        <Route path="channel/:id" element={<ChannelExplorerPage />} /> {/* Public channel intelligence */}
        <Route
          path="auth"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <Navigate to="/auth/login" replace />}
        />
        <Route
          path="auth/login"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
        />
        <Route
          path="auth/register"
          element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
        />
        <Route path="auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="verificar-email/:token" element={<VerifyEmailPage />} />
        <Route path="privacidad" element={<PrivacyPage />} />
        <Route path="terminos" element={<TermsPage />} />
        <Route path="sobre-nosotros" element={<AboutPage />} />
        <Route path="soporte" element={<SupportPage />} />
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
        <Route path="ads"      element={<FullAccessOnly feature="Anuncios"><AdsPage /></FullAccessOnly>} />
        <Route path="finances" element={<FullAccessOnly feature="Finanzas"><FinancesPage /></FullAccessOnly>} />
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
        <Route path="requests" element={<FullAccessOnly feature="Solicitudes"><CreatorRequestsPage /></FullAccessOnly>} />
        <Route path="earnings" element={<FullAccessOnly feature="Ganancias"><CreatorEarningsPage /></FullAccessOnly>} />
        <Route path="referrals" element={<CreatorReferralsPage />} />
        <Route path="disputes" element={<FullAccessOnly feature="Disputas"><DisputesPage /></FullAccessOnly>} />
        <Route path="notifications" element={<NotificationsPage />} />
        <Route path="settings" element={<CreatorSettingsPage />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
