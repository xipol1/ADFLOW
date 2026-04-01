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

// Shared dispute page
import DisputesPage from '../ui/pages/dashboard/DisputesPage'

// Legal & info pages
import PrivacyPage from '../ui/pages/legal/PrivacyPage'
import TermsPage from '../ui/pages/legal/TermsPage'
import AboutPage from '../ui/pages/legal/AboutPage'
import SupportPage from '../ui/pages/legal/SupportPage'
import ForgotPasswordPage from '../ui/pages/auth/ForgotPasswordPage'
import ResetPasswordPage from '../ui/pages/auth/ResetPasswordPage'
import ChannelDetailPage from '../ui/pages/marketplace/ChannelDetailPage'
import NotFoundPage from '../ui/pages/NotFoundPage'

// Admin dashboard suite
import AdminLayout from '../ui/pages/dashboard/admin/AdminLayout'
import AdminOverviewPage from '../ui/pages/dashboard/admin/AdminOverviewPage'
import AdminUsersPage from '../ui/pages/dashboard/admin/AdminUsersPage'
import AdminChannelsPage from '../ui/pages/dashboard/admin/AdminChannelsPage'
import AdminDisputesPage from '../ui/pages/dashboard/admin/AdminDisputesPage'

export default function AppRoutes() {
  const { isAuthenticated } = useAuth()

  return (
    <Routes>
      {/* ── Public / landing routes ────────────────────── */}
      <Route path="/" element={<AppLayout />}>
        <Route index element={<LandingPage />} />
        <Route path="marketplace" element={<MarketplacePage />} />
        <Route path="marketplace/:channelId" element={<ChannelDetailPage />} />
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
        <Route path="auth/reset-password/:token" element={<ResetPasswordPage />} />
        <Route path="verificar-email/:token" element={<VerifyEmailPage />} />
        <Route path="privacidad" element={<PrivacyPage />} />
        <Route path="terminos" element={<TermsPage />} />
        <Route path="sobre-nosotros" element={<AboutPage />} />
        <Route path="soporte" element={<SupportPage />} />

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
          <ProtectedRoute>
            <AdvertiserLayout />
          </ProtectedRoute>
        }
      >
        <Route index        element={<OverviewPage />} />
        <Route path="explore"  element={<ExplorePage />} />
        <Route path="autobuy"  element={<AutoBuyPage />} />
        <Route path="campaigns" element={<CampaignsPage />} />
        <Route path="ads"      element={<AdsPage />} />
        <Route path="finances" element={<FinancesPage />} />
        <Route path="referrals" element={<ReferralsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>

      {/* ── Creator dashboard — own sidebar layout ── */}
      <Route
        path="/creator"
        element={
          <ProtectedRoute>
            <CreatorLayout />
          </ProtectedRoute>
        }
      >
        <Route index         element={<CreatorOverviewPage />} />
        <Route path="channels" element={<CreatorChannelsPage />} />
        <Route path="channels/new" element={<RegisterChannelPage />} />
        <Route path="requests" element={<CreatorRequestsPage />} />
        <Route path="earnings" element={<CreatorEarningsPage />} />
        <Route path="referrals" element={<CreatorReferralsPage />} />
        <Route path="disputes" element={<DisputesPage />} />
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
        <Route path="users"   element={<AdminUsersPage />} />
        <Route path="channels" element={<AdminChannelsPage />} />
        <Route path="disputes" element={<AdminDisputesPage />} />
      </Route>

      <Route path="*" element={<AppLayout />}>
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  )
}
