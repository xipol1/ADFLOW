import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  AlertTriangle, CheckCircle2, MessageSquare, Sparkles, Wallet, Inbox,
  Radio, Plus, ArrowRight, Compass, User as UserIcon,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { OK, WARN, BLUE, GREEN, greenAlpha, FONT_BODY, FONT_DISPLAY } from '../../../theme/tokens'
import CreatorCustomizableDashboard from './customizable/CreatorCustomizableDashboard'
import CreatorOnboardingChecklist from '../../../components/CreatorOnboardingChecklist'

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

  // First-run experience: when no channels yet, show a focused welcome
  // instead of the full customisable dashboard with empty widgets.
  if (!loading && channels.length === 0) {
    return (
      <FirstRunWelcome
        userName={dashboardData.userName}
        navigate={navigate}
        channels={channels}
        campaigns={creatorCampaigns}
        requests={requests}
      />
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
      <CreatorOnboardingChecklist
        channels={channels}
        campaigns={creatorCampaigns}
        requests={requests}
        variant="banner"
      />
      <CreatorCustomizableDashboard data={dashboardData} />
    </div>
  )
}

// ─── First-run welcome (no channels yet) ────────────────────────────────────
function FirstRunWelcome({ userName, navigate, channels, campaigns, requests }) {
  const ga = greenAlpha
  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>
      {/* Hero */}
      <div style={{
        background: `linear-gradient(135deg, var(--surface) 0%, ${ga(0.08)} 100%)`,
        border: `1px solid ${ga(0.25)}`, borderRadius: 18,
        padding: 32,
      }}>
        <h1 style={{
          fontFamily: FONT_DISPLAY, fontSize: 32, fontWeight: 900, color: 'var(--text)',
          letterSpacing: '-0.03em', margin: '0 0 8px',
        }}>
          Hola, {userName} 👋
        </h1>
        <p style={{ fontSize: 16, color: 'var(--muted)', margin: '0 0 22px', lineHeight: 1.55, maxWidth: 600 }}>
          Bienvenido a Channelad. Sigue los pasos para empezar a recibir propuestas
          de advertisers y monetizar tus canales en pocos minutos.
        </p>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button onClick={() => navigate('/creator/channels/new')} style={{
            background: GREEN, color: '#fff', border: 'none', borderRadius: 11,
            padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: FONT_BODY,
            display: 'inline-flex', alignItems: 'center', gap: 7, boxShadow: `0 6px 20px ${ga(0.4)}`,
          }}>
            <Plus size={15} strokeWidth={2.5} /> Registrar primer canal
          </button>
          <button onClick={() => navigate('/creator/profile')} style={{
            background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
            borderRadius: 11, padding: '12px 18px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            fontFamily: FONT_BODY, display: 'inline-flex', alignItems: 'center', gap: 7,
          }}>
            <UserIcon size={15} /> Configurar perfil
          </button>
        </div>
      </div>

      {/* Onboarding checklist — shows progress already (mostly 0%) */}
      <CreatorOnboardingChecklist
        channels={channels}
        campaigns={campaigns}
        requests={requests}
        variant="banner"
      />

      {/* Tips */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 24,
      }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em', margin: '0 0 14px' }}>
          ¿Cómo funciona Channelad para creators?
        </h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14 }}>
          {[
            { n: '1', icon: Radio,    title: 'Registra tu canal', desc: 'Telegram, WhatsApp, Discord, Instagram. Verifica con OAuth en 2 clicks.' },
            { n: '2', icon: Sparkles, title: 'Obtén tu CAS Score', desc: 'Tu autoridad como creator — calculada automáticamente. Lo que advertisers buscan.' },
            { n: '3', icon: Inbox,    title: 'Recibe propuestas', desc: 'Los advertisers verán tu perfil y te contactarán con campañas pagadas.' },
            { n: '4', icon: Wallet,   title: 'Cobra en escrow', desc: 'Pago garantizado: el advertiser deposita antes, tú cobras al publicar.' },
          ].map(t => {
            const Icon = t.icon
            return (
              <div key={t.n} style={{
                background: 'var(--bg2)', borderRadius: 12, padding: 16,
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                  <div style={{
                    width: 32, height: 32, borderRadius: 9, flexShrink: 0,
                    background: ga(0.15), border: `1px solid ${ga(0.3)}`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    <Icon size={14} color={GREEN} strokeWidth={2.2} />
                  </div>
                  <div style={{ fontSize: 13.5, fontWeight: 800, color: 'var(--text)' }}>
                    {t.n}. {t.title}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                  {t.desc}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Discover teaser */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14,
        padding: 18, display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{
          width: 48, height: 48, borderRadius: 12, flexShrink: 0,
          background: ga(0.12), border: `1px solid ${ga(0.25)}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Compass size={20} color={GREEN} />
        </div>
        <div style={{ flex: 1, minWidth: 200 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
            Mientras tanto: explora briefs abiertos
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>
            Mira qué tipo de campañas están buscando los advertisers ahora mismo.
            Inspira la elección de canal y nicho.
          </div>
        </div>
        <button onClick={() => navigate('/creator/discover')} style={{
          background: 'transparent', color: GREEN, border: `1px solid ${ga(0.4)}`,
          borderRadius: 9, padding: '9px 14px', fontSize: 13, fontWeight: 700,
          cursor: 'pointer', fontFamily: FONT_BODY, display: 'inline-flex', alignItems: 'center', gap: 5,
        }}>
          Ver Discover <ArrowRight size={13} />
        </button>
      </div>
    </div>
  )
}
