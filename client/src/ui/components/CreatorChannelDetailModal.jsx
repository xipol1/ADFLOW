import React, { useEffect } from 'react'
import {
  X, ExternalLink, Users, Calendar, Radio, Activity, ArrowRight,
  Target, Wallet, TrendingUp, ShieldCheck,
} from 'lucide-react'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE, GREEN, greenAlpha, PLAT_COLORS } from '../theme/tokens'
import { CASBadge, ScoreGauge, CPMBadge, ConfianzaBadge } from './scoring'

const ACCENT = GREEN
const ga = greenAlpha

const STATUS_CFG = {
  activo:     { color: OK, label: 'Activo' },
  verificado: { color: OK, label: 'Verificado' },
  pendiente:  { color: WARN, label: 'Pendiente' },
  pausado:    { color: '#94a3b8', label: 'Pausado' },
}

/**
 * CreatorChannelDetailModal — drill-down for a single channel.
 * Equivalente al CampaignDetailModal del advertiser, slide-in lateral.
 */
export default function CreatorChannelDetailModal({ channel, onClose, navigate }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [onClose])

  if (!channel) return null

  const status = channel.estado || channel.status || 'pendiente'
  const st = STATUS_CFG[status] || { color: '#94a3b8', label: status }
  const platform = channel.plataforma || channel.platform || ''
  const platLabel = platform.charAt(0).toUpperCase() + platform.slice(1)
  const platColor = PLAT_COLORS[platLabel] || ACCENT
  const audience = channel.estadisticas?.seguidores || channel.seguidores || channel.audiencia || 0
  const id = channel._id || channel.id

  const handleBackdrop = (e) => { if (e.target === e.currentTarget) onClose() }

  return (
    <div onClick={handleBackdrop} style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', justifyContent: 'flex-end',
      animation: 'cdmFadeIn .18s ease', fontFamily: FONT_BODY,
    }}>
      <style>{`
        @keyframes cdmFadeIn { from { opacity:0 } to { opacity:1 } }
        @keyframes cdmSlideIn { from { transform: translateX(40px); opacity:0 } to { transform: translateX(0); opacity:1 } }
        @media (max-width: 640px) {
          .ccm-panel { width: 100% !important; max-width: 100% !important; }
        }
      `}</style>

      <div className="ccm-panel" style={{
        width: 460, maxWidth: '100%', height: '100%',
        background: 'var(--bg)', borderLeft: '1px solid var(--border)',
        boxShadow: '-12px 0 36px rgba(0,0,0,0.25)',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        animation: 'cdmSlideIn .22s cubic-bezier(.22,1,.36,1)',
      }}>

        <div style={{
          padding: '18px 22px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12,
        }}>
          <div style={{ minWidth: 0, flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8, flexWrap: 'wrap' }}>
              <div style={{
                width: 32, height: 32, borderRadius: 9,
                background: ga(0.12), border: `1px solid ${ga(0.25)}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <Radio size={15} color={ACCENT} strokeWidth={2} />
              </div>
              <span style={{
                background: `${st.color}14`, color: st.color, border: `1px solid ${st.color}35`,
                borderRadius: 20, padding: '2px 9px', fontSize: 11, fontWeight: 700,
              }}>{st.label}</span>
              {platLabel && (
                <span style={{
                  background: `${platColor}18`, color: platColor, border: `1px solid ${platColor}35`,
                  borderRadius: 6, padding: '2px 8px', fontSize: 11, fontWeight: 600,
                }}>{platLabel}</span>
              )}
              {Number(channel.CAS) > 0 && (
                <CASBadge CAS={channel.CAS} nivel={channel.nivel} size="xs" />
              )}
            </div>
            <h2 style={{
              fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.02em', margin: 0,
              wordBreak: 'break-word',
            }}>
              {channel.nombreCanal || channel.nombre || 'Canal'}
            </h2>
            {channel.identificadorCanal && (
              <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 4, fontFamily: 'JetBrains Mono, monospace' }}>
                {channel.identificadorCanal}
              </div>
            )}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 9,
            width: 32, height: 32, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)', flexShrink: 0,
          }}>
            <X size={16} />
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '18px 22px' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 8,
            marginBottom: 18,
          }}>
            <KpiTile icon={Users} label="Audiencia" value={Number(audience).toLocaleString('es')} accent={BLUE} />
            {Number(channel.CPMDinamico) > 0 && (
              <KpiTile icon={Target} label="CPM" value={`€${channel.CPMDinamico}`} accent="#ec4899" />
            )}
            {Number(channel.precio) > 0 && (
              <KpiTile icon={Wallet} label="Precio" value={`€${channel.precio}`} accent={ACCENT} />
            )}
            {Number(channel.CAS) > 0 && (
              <KpiTile icon={Activity} label="CAS" value={Math.round(channel.CAS)} accent="#8B5CF6" />
            )}
          </div>

          {Number(channel.CAS) > 0 && (
            <Section title="Channel Authority Score">
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 14 }}>
                <ScoreGauge CAS={channel.CAS} nivel={channel.nivel} showLabel height={6} />
                <div style={{ flex: 1, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                  {['CAF', 'CTF', 'CER', 'CVS', 'CAP'].map(f => {
                    const v = Math.round(channel[f] || 0)
                    const c = v >= 80 ? OK : v >= 50 ? '#f59e0b' : ERR
                    return (
                      <div key={f} style={{
                        background: `${c}12`, border: `1px solid ${c}30`, borderRadius: 6,
                        padding: '3px 7px', fontSize: 10, fontWeight: 700, color: c,
                        fontFamily: 'JetBrains Mono, monospace',
                      }}>{f} {v}</div>
                    )
                  })}
                </div>
              </div>
            </Section>
          )}

          {channel.verificacion?.confianzaScore != null && (
            <Section title="Confianza & Verificación">
              <div style={{ background: 'var(--bg2)', borderRadius: 10, padding: 14, display: 'flex', alignItems: 'center', gap: 12 }}>
                <ShieldCheck size={20} color={ACCENT} />
                <ConfianzaBadge score={channel.verificacion.confianzaScore} fuente={channel.verificacion.tipoAcceso} showScore />
                <div style={{ flex: 1, fontSize: 12, color: 'var(--muted)' }}>
                  {channel.verificacion.tipoAcceso === 'oauth'
                    ? 'Verificado vía OAuth — métricas en tiempo real'
                    : 'Verificación manual — considera conectar OAuth para mejorar tu score'}
                </div>
              </div>
            </Section>
          )}

          {channel.descripcion && (
            <Section title="Descripción">
              <div style={{
                fontSize: 13, color: 'var(--text)', lineHeight: 1.6,
                background: 'var(--bg2)', borderRadius: 10, padding: 14,
                whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                maxHeight: 160, overflow: 'auto',
              }}>
                {channel.descripcion}
              </div>
            </Section>
          )}

          <Section title="Métricas">
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {Number(channel.estadisticas?.engagement) > 0 && (
                <MetricRow label="Engagement" value={`${(channel.estadisticas.engagement * 100).toFixed(1)}%`} icon={TrendingUp} />
              )}
              {Number(channel.earningsThisMonth) > 0 && (
                <MetricRow label="Ingresos este mes" value={`€${channel.earningsThisMonth}`} icon={Wallet} accent={ACCENT} />
              )}
              {channel.createdAt && (
                <MetricRow label="Registrado" value={fmtDate(channel.createdAt)} icon={Calendar} />
              )}
              {channel.lastActiveAt && (
                <MetricRow label="Última actividad" value={fmtDate(channel.lastActiveAt)} icon={Activity} />
              )}
            </div>
          </Section>
        </div>

        <div style={{
          padding: '14px 22px', borderTop: '1px solid var(--border)',
          background: 'var(--bg2)', display: 'flex', gap: 8,
        }}>
          <button onClick={onClose} style={{
            background: 'transparent', border: '1px solid var(--border)', borderRadius: 9,
            padding: '9px 14px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
            cursor: 'pointer', fontFamily: FONT_BODY,
          }}>
            Cerrar
          </button>
          <div style={{ flex: 1 }} />
          <button onClick={() => { onClose(); navigate(`/creator/channels?canal=${id}`) }}
            style={{
              background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
              padding: '9px 14px', fontSize: 13, fontWeight: 600,
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${ga(0.35)}`,
            }}>
            Gestionar canal <ArrowRight size={13} />
          </button>
        </div>
      </div>
    </div>
  )
}

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

function Section({ title, children }) {
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{
        fontSize: 11, fontWeight: 700, color: 'var(--muted)',
        textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6,
      }}>{title}</div>
      {children}
    </div>
  )
}

function MetricRow({ icon: Icon, label, value, accent = 'var(--muted)' }) {
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
  return date.toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
}
