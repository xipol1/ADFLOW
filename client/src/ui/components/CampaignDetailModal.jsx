import React, { useEffect } from 'react'
import {
  X, ExternalLink, Eye, MousePointerClick, DollarSign, Calendar,
  Megaphone, Activity, Send, ArrowRight,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, PURPLE, purpleAlpha } from '../theme/tokens'

const STATUS_CFG = {
  DRAFT:      { color: WARN, label: 'Borrador'   },
  PAID:       { color: BLUE, label: 'Pagada'     },
  PUBLISHED:  { color: OK,   label: 'Activa'     },
  COMPLETED:  { color: '#94a3b8', label: 'Completada' },
  CANCELLED:  { color: ERR,  label: 'Cancelada'  },
  EXPIRED:    { color: '#94a3b8', label: 'Expirada' },
  DISPUTED:   { color: ERR,  label: 'En disputa' },
}

/**
 * CampaignDetailModal — Hootsuite-style side panel for in-context drill-down.
 *
 * Slides in from the right (desktop) or full-screen (mobile). Shows the
 * campaign's full details, KPIs and channel info without leaving the
 * dashboard. Two CTAs at the bottom let the user jump to the full
 * campaigns page or the channel page if they need more context.
 *
 * Props:
 *   campaign    the campaign object (must have at least { _id|id, title, ... })
 *   onClose     close handler
 *   navigate    react-router navigate fn (for the "Ver completa" CTA)
 */
export default function CampaignDetailModal({ campaign, onClose, navigate }) {
  // Close on Escape + lock body scroll while open
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!campaign) return null

  const st = STATUS_CFG[campaign.status] || { color: '#94a3b8', label: campaign.status || '—' }
  const channelName = typeof campaign.channel === 'object'
    ? (campaign.channel?.nombreCanal || campaign.channel?.identificadorCanal)
    : campaign.channel
  const channelPlatform = typeof campaign.channel === 'object' ? campaign.channel?.plataforma : ''

  const views = campaign.tracking?.impressions || campaign.views || 0
  const clicks = campaign.tracking?.clicks || campaign.clicks || 0
  const ctr = views > 0 ? ((clicks / views) * 100).toFixed(1) : null
  const spent = campaign.price || campaign.spent || campaign.budget || 0
  const id = campaign._id || campaign.id

  const handleBackdropClick = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div
      onClick={handleBackdropClick}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
        display: 'flex', justifyContent: 'flex-end',
        animation: 'cdmFadeIn .18s ease',
        fontFamily: FONT_BODY,
      }}
    >
      <style>{`
        @keyframes cdmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes cdmSlideIn { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }
        @media (max-width: 640px) {
          .cdm-panel { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div
        className="cdm-panel"
        style={{
          width: 460, maxWidth: '100%', height: '100%',
          background: 'var(--bg)', borderLeft: '1px solid var(--border)',
          boxShadow: '-12px 0 36px rgba(0,0,0,0.25)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          animation: 'cdmSlideIn .22s cubic-bezier(.22,1,.36,1)',
        }}>

        {/* ── Header ── */}
        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Megaphone size={15} color={PURPLE} strokeWidth={2} />
              </div>
              <span style={{
                background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}35`,
                borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
              }}>{st.label}</span>
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.02em', margin: 0,
              wordBreak: 'break-word',
            }}>
              {campaign.title || (campaign.content?.slice(0, 60) + (campaign.content?.length > 60 ? '…' : '')) || 'Campaña'}
            </h2>
            {channelName && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4 }}>
                📢 {channelName}{channelPlatform ? ` · ${channelPlatform}` : ''}
              </div>
            )}
          </div>
          <button onClick={onClose}
            style={{
              background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9,
              width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
              cursor: 'pointer', color: 'var(--muted)', flexShrink: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* ── Body ── */}
        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>

          {/* KPIs grid */}
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
            marginBottom: 18,
          }}>
            <KpiTile icon={DollarSign} label="Importe" value={`€${spent}`} accent={PURPLE} />
            <KpiTile icon={Eye} label="Vistas" value={views.toLocaleString('es')} accent={BLUE} />
            <KpiTile icon={MousePointerClick} label="Clicks" value={clicks.toLocaleString('es')} accent="#ec4899" />
            {ctr !== null && (
              <KpiTile icon={Activity} label="CTR" value={`${ctr}%`} accent={Number(ctr) > 4 ? OK : '#f59e0b'} />
            )}
          </div>

          {/* Content */}
          {campaign.content && (
            <Section title="Contenido del anuncio">
              <div style={{
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                background: 'var(--bg2)', borderRadius: 10, padding: 14,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 200, overflow: 'auto',
              }}>
                {campaign.content}
              </div>
            </Section>
          )}

          {/* Target URL */}
          {campaign.targetUrl && (
            <Section title="URL de destino">
              <a href={campaign.targetUrl} target="_blank" rel="noopener noreferrer"
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  fontSize: 12.5, color: PURPLE, fontWeight: 600,
                  textDecoration: 'none',
                  background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.2)}`,
                  borderRadius: 8, padding: '6px 10px',
                }}
              >
                {campaign.targetUrl.length > 50 ? campaign.targetUrl.slice(0, 50) + '…' : campaign.targetUrl}
                <ExternalLink size={12} />
              </a>
            </Section>
          )}

          {/* Tracking link */}
          {campaign.trackingUrl && (
            <Section title="Link de tracking">
              <code style={{
                display: 'block', fontSize: 11.5, color: 'var(--muted)',
                background: 'var(--bg2)', borderRadius: 8, padding: '8px 10px',
                fontFamily: 'Menlo, Monaco, "Courier New", monospace',
                wordBreak: 'break-all',
              }}>
                {campaign.trackingUrl}
              </code>
            </Section>
          )}

          {/* Timeline */}
          <Section title="Cronología">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {campaign.createdAt && <TimelineRow icon={Calendar} label="Creada" value={fmtDate(campaign.createdAt)} />}
              {campaign.publishedAt && <TimelineRow icon={Send} label="Publicada" value={fmtDate(campaign.publishedAt)} accent={OK} />}
              {campaign.completedAt && <TimelineRow icon={Activity} label="Completada" value={fmtDate(campaign.completedAt)} />}
              {campaign.cancelledAt && <TimelineRow icon={X} label="Cancelada" value={fmtDate(campaign.cancelledAt)} accent={ERR} />}
              {campaign.deadline && <TimelineRow icon={Calendar} label="Deadline" value={fmtDate(campaign.deadline)} accent={WARN} />}
            </div>
          </Section>
        </div>

        {/* ── Footer actions ── */}
        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          background: 'var(--bg2)',
          display: 'flex', gap: 8,
        }}>
          <button onClick={onClose}
            style={{
              background: 'transparent', border: '1px solid var(--border)', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
              cursor: 'pointer', fontFamily: FONT_BODY,
            }}
          >
            Cerrar
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => { onClose(); navigate(`/advertiser/campaigns?campaign=${id}`) }}
            style={{
              background: PURPLE, color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${purpleAlpha(0.35)}`,
            }}
          >
            Ver en campañas <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Mini KPI tile (used in the modal grid) ──────────────────────────────────
function KpiTile({ icon: Icon, label, value, accent }) {
  return (
    <div style={{
      background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
      padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 4, minHeight: 0,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon size={11} color={accent} strokeWidth={2.2} />
        <span style={{ fontSize: 10.5, color: 'var(--muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: 18, fontWeight: 800, color: 'var(--text)', fontFamily: FONT_DISPLAY, letterSpacing: '-0.02em' }}>
        {value}
      </div>
    </div>
  )
}

// ─── Section wrapper ────────────────────────────────────────────────────────
function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>
        {title}
      </div>
      {children}
    </div>
  )
}

// ─── Timeline row ───────────────────────────────────────────────────────────
function TimelineRow({ icon: Icon, label, value, accent = 'var(--muted)' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12.5, color: 'var(--text)' }}>
      <Icon size={12} color={accent} />
      <span style={{ color: 'var(--muted)' }}>{label}:</span>
      <span style={{ fontWeight: 600 }}>{value}</span>
    </div>
  )
}

function fmtDate(d) {
  const date = new Date(d)
  if (isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
