import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, MessageSquare, Sparkles, Wallet, Inbox,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { OK, WARN, BLUE } from '../../../theme/tokens'
import CreatorCustomizableDashboard from './customizable/CreatorCustomizableDashboard'

const ACCENT = 'var(--accent, #22c55e)'

/**
 * CreatorOverviewPage — landing page for creators.
 *
 * Loads channels, requests, campaigns and computes a single data context,
 * then hands it to CreatorCustomizableDashboard which renders the user's
 * chosen widgets. The "classic" non-customisable rendering lives in
 * CreatorOverviewPage.classic.jsx for reference.
 */
export default function CreatorOverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [channels, setChannels] = useState([])
  const [requests, setRequests] = useState([])
  const [creatorCampaigns, setCreatorCampaigns] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [chRes, adsRes, cmpRes] = await Promise.all([
          apiService.getMyChannels().catch(() => null),
          apiService.getAdsForCreator?.().catch(() => null),
          apiService.getCreatorCampaigns?.().catch(() => null),
        ])
        if (!mounted) return
        if (chRes?.success) {
          setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || [])
        }
        if (adsRes?.success && Array.isArray(adsRes.data)) setRequests(adsRes.data)
        if (cmpRes?.success && Array.isArray(cmpRes.data)) setCreatorCampaigns(cmpRes.data)
      } catch (err) {
        console.error('CreatorOverviewPage.load failed:', err)
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // ─── Build the data context passed to all widgets ────────────────────────────
  const dashboardData = useMemo(() => {
    const now = new Date()
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

    const completedCampaigns = creatorCampaigns.filter(c => c.status === 'COMPLETED')
    const thisMonthEarnings = completedCampaigns
      .filter(c => new Date(c.completedAt || c.createdAt) >= thisMonthStart)
      .reduce((s, c) => s + (c.netAmount || c.price || 0), 0)
    const lastMonthEarnings = completedCampaigns
      .filter(c => {
        const d = new Date(c.completedAt || c.createdAt)
        return d >= lastMonthStart && d < thisMonthStart
      })
      .reduce((s, c) => s + (c.netAmount || c.price || 0), 0)

    const earningsDelta = lastMonthEarnings > 0
      ? Math.round(((thisMonthEarnings - lastMonthEarnings) / lastMonthEarnings) * 100)
      : undefined

    const earningsSeries = (() => {
      const result = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
        const label = d.toLocaleDateString('es', { month: 'short' })
        const value = Math.round(completedCampaigns.reduce((s, c) => {
          const cd = new Date(c.completedAt || c.createdAt)
          return (cd.getFullYear() === d.getFullYear() && cd.getMonth() === d.getMonth())
            ? s + (c.netAmount || c.price || 0) : s
        }, 0))
        result.push({ label, value })
      }
      return result
    })()
    const earningsSpark = earningsSeries.map(s => s.value)

    const activeChannels = channels.filter(c => c.estado === 'activo' || c.estado === 'verificado' || c.status === 'activo').length || channels.length
    const pendingFromRequests = requests.filter(r => r.status === 'pendiente').length
    const pendingFromCampaigns = creatorCampaigns.filter(c => c.status === 'PAID').length
    const pendingRequests = pendingFromRequests + pendingFromCampaigns

    const validCAS = channels.filter(c => Number(c.CAS) > 0)
    const avgCAS = validCAS.length ? validCAS.reduce((s, c) => s + c.CAS, 0) / validCAS.length : 0

    // Rating from campaigns (if available)
    const ratings = creatorCampaigns.filter(c => Number(c.rating) > 0).map(c => Number(c.rating))
    const avgRating = ratings.length ? ratings.reduce((s, r) => s + r, 0) / ratings.length : 0

    // Action items — dimensions of "needs attention" specific to creators
    const actionItems = []
    if (pendingFromRequests > 0) {
      actionItems.push({
        icon: Inbox, color: WARN, count: pendingFromRequests,
        title: 'Solicitudes sin responder',
        description: `Tienes ${pendingFromRequests} ${pendingFromRequests === 1 ? 'propuesta nueva' : 'propuestas nuevas'} esperando tu respuesta.`,
        ctaLabel: 'Revisar', onClick: () => navigate('/creator/requests'),
      })
    }
    if (pendingFromCampaigns > 0) {
      actionItems.push({
        icon: CheckCircle2, color: OK, count: pendingFromCampaigns,
        title: 'Listas para publicar',
        description: `${pendingFromCampaigns} ${pendingFromCampaigns === 1 ? 'campaña pagada' : 'campañas pagadas'} esperando que las publiques en tu canal.`,
        ctaLabel: 'Publicar', onClick: () => navigate('/creator/requests'),
      })
    }
    if (channels.length === 0) {
      actionItems.push({
        icon: Sparkles, color: ACCENT, count: 0,
        title: 'Registra tu primer canal',
        description: 'Empieza a recibir propuestas dando de alta tu canal de Telegram, WhatsApp, Discord, etc.',
        ctaLabel: 'Empezar', onClick: () => navigate('/creator/channels/new'),
      })
    }

    return {
      userName: user?.nombre || user?.name || 'Creador',
      channels,
      activeChannels,
      totalChannels: channels.length,
      requests,
      creatorCampaigns,
      monthlyEarnings: thisMonthEarnings,
      earningsDelta,
      earningsSeries,
      earningsSpark,
      pendingRequests,
      totalRequests: requests.length,
      avgRating,
      ratingCount: ratings.length,
      completedCampaigns: completedCampaigns.length,
      avgCAS,
      actionItems,
      loading,
    }
  }, [user, channels, requests, creatorCampaigns, loading, navigate])

  return <CreatorCustomizableDashboard data={dashboardData} />
}
