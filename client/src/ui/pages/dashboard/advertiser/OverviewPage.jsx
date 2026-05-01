import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, MessageSquare, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { OK, WARN, BLUE } from '../../../theme/tokens'
import CustomizableDashboard from './customizable/CustomizableDashboard'

const PURPLE = 'var(--accent, #8B5CF6)'

export default function OverviewPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [monthlySpend, setMonthlySpend] = useState([])
  const [unreadMessages, setUnreadMessages] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const [campsRes, txRes] = await Promise.all([
          apiService.getMyCampaigns().catch(() => null),
          apiService.getMyTransactions().catch(() => null),
        ])
        if (!mounted) return
        if (campsRes?.success) {
          const items = Array.isArray(campsRes.data) ? campsRes.data : Array.isArray(campsRes.data?.items) ? campsRes.data.items : []
          setCampaigns(items)
          const unread = items.reduce((s, c) => s + (c.unreadMessages || c.unreadCount || 0), 0)
          setUnreadMessages(unread)
        }
        if (txRes?.success) {
          const txItems = Array.isArray(txRes.data) ? txRes.data : Array.isArray(txRes.data?.items) ? txRes.data.items : []
          const labels = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']
          const buckets = {}
          txItems.forEach(tx => {
            const d = new Date(tx.paidAt || tx.createdAt)
            if (isNaN(d.getTime())) return
            const key = `${d.getFullYear()}-${d.getMonth()}`
            if (!buckets[key]) buckets[key] = { label: labels[d.getMonth()], value: 0, ts: d.getTime() }
            buckets[key].value += Math.abs(tx.amount || 0)
          })
          const sorted = Object.values(buckets).sort((a, b) => a.ts - b.ts).slice(-6)
          if (sorted.length > 0) setMonthlySpend(sorted)
        }
      } catch (err) {
        console.error('OverviewPage.load failed:', err)
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [])

  // ─── Build the data context passed to all widgets ────────────────────────────
  const dashboardData = useMemo(() => {
    const totalSpend = campaigns
      .filter(c => c.status !== 'DRAFT' && c.status !== 'CANCELLED')
      .reduce((s, c) => s + (c.price || c.spent || 0), 0)
    const activeAds = campaigns.filter(c => c.status === 'PUBLISHED' || c.status === 'PAID').length
    const totalViews = campaigns.reduce((s, c) => s + (c.tracking?.impressions || c.views || 0), 0)
    const totalClicks = campaigns.reduce((s, c) => s + (c.tracking?.clicks || c.clicks || 0), 0)
    const avgCtr = totalViews > 0 ? ((totalClicks / totalViews) * 100).toFixed(1) : '0.0'

    const spendDelta = (() => {
      if (monthlySpend.length < 2) return undefined
      const cur = monthlySpend[monthlySpend.length - 1].value
      const prev = monthlySpend[monthlySpend.length - 2].value
      if (prev === 0) return undefined
      return Math.round(((cur - prev) / prev) * 100)
    })()

    const draftsCount = campaigns.filter(c => c.status === 'DRAFT').length
    const publishedCount = campaigns.filter(c => c.status === 'PUBLISHED').length
    const actionItems = []
    if (draftsCount > 0) {
      actionItems.push({
        icon: AlertTriangle, color: WARN, count: draftsCount,
        title: 'Campañas pendientes de pago',
        description: `Activa el escrow para que ${draftsCount === 1 ? 'tu campaña pase' : 'tus campañas pasen'} a publicación.`,
        ctaLabel: 'Pagar', onClick: () => navigate('/advertiser/campaigns?tab=borrador'),
      })
    }
    if (publishedCount > 0) {
      actionItems.push({
        icon: CheckCircle2, color: OK, count: publishedCount,
        title: 'Campañas listas para liberar',
        description: `${publishedCount === 1 ? 'Una campaña ha sido publicada' : `${publishedCount} campañas han sido publicadas`} y esperan tu confirmación.`,
        ctaLabel: 'Revisar', onClick: () => navigate('/advertiser/campaigns?tab=publicada'),
      })
    }
    if (unreadMessages > 0) {
      actionItems.push({
        icon: MessageSquare, color: BLUE, count: unreadMessages,
        title: 'Mensajes sin leer',
        description: `Tienes ${unreadMessages} ${unreadMessages === 1 ? 'mensaje nuevo' : 'mensajes nuevos'} de creadores.`,
        ctaLabel: 'Ver chat', onClick: () => navigate('/advertiser/campaigns'),
      })
    }
    if (campaigns.length === 0) {
      actionItems.push({
        icon: Sparkles, color: PURPLE, count: 0,
        title: 'Lanza tu primera campaña',
        description: 'Empieza explorando nuestros canales o usa Auto-Buy para que la IA encuentre los mejores para ti.',
        ctaLabel: 'Empezar', onClick: () => navigate('/advertiser/explore'),
      })
    }

    return {
      userName: user?.nombre || user?.name || 'Usuario',
      campaigns,
      monthlySpend,
      totalSpend,
      activeAds,
      totalCampaigns: campaigns.length,
      totalViews,
      totalClicks,
      avgCtr,
      spendDelta,
      unreadMessages,
      actionItems,
      loading,
    }
  }, [user, campaigns, monthlySpend, unreadMessages, loading, navigate])

  return <CustomizableDashboard data={dashboardData} />
}
