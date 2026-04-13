import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { Clock, TrendingUp, TrendingDown, AlertTriangle, Radio, RefreshCw, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceDot,
} from 'recharts'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D } from '../../../theme/tokens'
import { BenchmarkBar } from '../../../components/scoring'
import { Sparkline, ErrorBanner, Ring } from '../shared/DashComponents'

// ─── CPM formula (replicated from config/nicheBenchmarks.js) ─────────────────
const CPM_BASE = {
  whatsapp: 20, newsletter: 28, instagram: 22, telegram: 14,
  facebook: 13, discord: 9, blog: 8,
}
const calcCPM = (plat, cas) => {
  const base = CPM_BASE[plat] || 14
  if (!cas || cas <= 0) return base
  return base * Math.pow(cas / 50, 1.3)
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const fmtDate = (d) => {
  if (!d) return ''
  const dt = new Date(d)
  if (Number.isNaN(dt.getTime())) return String(d)
  return dt.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })
}

const PERIODS = [
  { key: '7d',  label: '7 días',  days: 7 },
  { key: '30d', label: '30 días', days: 30 },
  { key: '90d', label: '90 días', days: 90 },
]

// ─── Reusable section card ───────────────────────────────────────────────────
function SectionCard({ title, subtitle, children, action }) {
  return (
    <div
      style={{
        background: 'var(--surface)',
        border: `1px solid ${'var(--border)'}`,
        borderRadius: 16,
        padding: 24,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: 20,
          gap: 12,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h3 style={{ color: 'var(--text)', fontSize: 15, fontWeight: 700, margin: 0, fontFamily: D }}>
            {title}
          </h3>
          {subtitle && (
            <div style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 3 }}>{subtitle}</div>
          )}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

// ─── Period selector ─────────────────────────────────────────────────────────
function PeriodTabs({ period, onChange }) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 2,
        background: 'var(--bg3)',
        borderRadius: 10,
        padding: 3,
      }}
    >
      {PERIODS.map((p) => {
        const active = period === p.key
        return (
          <button
            key={p.key}
            onClick={() => onChange(p.key)}
            className="font-mono"
            style={{
              background: active ? 'var(--accent-dim)' : 'transparent',
              color: active ? 'var(--accent)' : 'var(--muted2)',
              border: active ? `1px solid ${'var(--accent)'}44` : '1px solid transparent',
              borderRadius: 8,
              padding: '6px 14px',
              fontSize: 12,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 150ms',
            }}
          >
            {p.label}
          </button>
        )
      })}
    </div>
  )
}

// ─── Custom chart tooltip ────────────────────────────────────────────────────
function ChartTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null
  return (
    <div
      style={{
        background: 'var(--bg3)',
        border: `1px solid ${'var(--border-med)'}`,
        borderRadius: 8,
        padding: 12,
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: 12,
      }}
    >
      <div style={{ color: 'var(--text-secondary)', marginBottom: 6 }}>{fmtDate(label)}</div>
      {payload.map((p) => (
        <div
          key={p.dataKey}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 16,
            color: p.color,
          }}
        >
          <span>{p.name || p.dataKey}</span>
          <span style={{ fontWeight: 600 }}>{Math.round(p.value)}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Factor definitions for Score Overview ─────────────────────────────────
const FACTORS = [
  { key: 'CAF', name: 'Atencion', weight: 15, color: 'var(--accent)' },
  { key: 'CTF', name: 'Confianza', weight: 25, color: '#10b981' },
  { key: 'CER', name: 'Engagement', weight: 20, color: '#3b82f6' },
  { key: 'CVS', name: 'Velocidad', weight: 10, color: '#f59e0b' },
  { key: 'CAP', name: 'Rendimiento', weight: 30, color: '#ef4444' },
]

// ─── Score Overview Section ─────────────────────────────────────────────────
function ScoreOverviewSection({ channel, scores, scoreData, onRecalculate, loading }) {
  const cas = scores?.CAS ?? scoreData?.score ?? null
  const recommendedPrice = scoreData?.recommendedPrice || (scores?.CPMDinamico ? `€${Math.round(scores.CPMDinamico * 10)}–${Math.round(scores.CPMDinamico * 25)}` : null)
  const lastCalc = scoreData?.calculatedAt || scoreData?.updatedAt || null

  return (
    <SectionCard
      title="Resumen del Score"
      subtitle="CAS Score actual con desglose de factores"
      action={
        <button
          onClick={onRecalculate}
          disabled={loading}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'var(--accent-dim)', color: 'var(--accent)',
            border: '1px solid var(--accent)44', borderRadius: 10,
            padding: '8px 16px', fontSize: 12, fontWeight: 600,
            cursor: loading ? 'wait' : 'pointer', fontFamily: F,
            opacity: loading ? 0.6 : 1, transition: 'opacity .15s',
          }}
        >
          <RefreshCw size={13} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
          Recalcular ahora
        </button>
      }
    >
      {/* CAS ring + recommended price */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 24, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: 100, height: 100, flexShrink: 0 }}>
          <Ring pct={cas ?? 0} color="var(--accent)" size={100} />
          <div style={{
            position: 'absolute', top: 0, left: 0, width: 100, height: 100,
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          }}>
            <span className="font-mono" style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', lineHeight: 1 }}>
              {cas != null ? Math.round(cas) : '--'}
            </span>
            <span style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 2 }}>de 100</span>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, color: 'var(--muted2)', marginBottom: 4 }}>Precio recomendado</div>
          <div className="font-mono" style={{ fontSize: 20, fontWeight: 700, color: 'var(--accent)' }}>
            {recommendedPrice || '—'}
          </div>
          {lastCalc && (
            <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 6 }}>
              Ultimo calculo: {new Date(lastCalc).toLocaleString('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </div>
          )}
        </div>
      </div>

      {/* 5-factor breakdown grid */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
        gap: 12, marginBottom: 20,
      }}>
        {FACTORS.map((f) => {
          const val = scores?.[f.key] ?? scoreData?.components?.[f.key] ?? null
          return (
            <div key={f.key} style={{
              background: 'var(--bg)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '14px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <span className="font-mono" style={{ fontSize: 12, fontWeight: 700, color: f.color }}>{f.key}</span>
                <span style={{ fontSize: 10, color: 'var(--muted2)' }}>{f.weight}%</span>
              </div>
              <div style={{ fontSize: 10, color: 'var(--muted2)', marginBottom: 8 }}>{f.name}</div>
              <div className="font-mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                {val != null ? Math.round(val) : '--'}
              </div>
              <div style={{
                height: 4, background: 'var(--border)', borderRadius: 999, overflow: 'hidden',
              }}>
                <div style={{
                  width: `${Math.max(0, Math.min(100, val ?? 0))}%`,
                  height: '100%', background: f.color, borderRadius: 999,
                  transition: 'width 400ms',
                }} />
              </div>
            </div>
          )
        })}
      </div>

      {/* Key metrics grid */}
      {scoreData?.metrics && (
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: 10, padding: '16px 0', borderTop: '1px solid var(--border)',
        }}>
          {Object.entries(scoreData.metrics).map(([key, val]) => (
            <div key={key} style={{ padding: '4px 0' }}>
              <div style={{ fontSize: 10, color: 'var(--muted2)', textTransform: 'capitalize', marginBottom: 2 }}>
                {key.replace(/([A-Z])/g, ' $1').trim()}
              </div>
              <div className="font-mono" style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>
                {typeof val === 'number' ? val.toLocaleString('es-ES') : val}
              </div>
            </div>
          ))}
        </div>
      )}
    </SectionCard>
  )
}

// ─── Platform Connection Section ────────────────────────────────────────────
const PLATFORM_FIELDS = {
  telegram: [
    { key: 'botToken', label: 'Bot Token', placeholder: '123456:ABC-DEF1234ghIkl' },
    { key: 'chatId', label: 'Chat ID', placeholder: '-1001234567890' },
  ],
  discord: [
    { key: 'botToken', label: 'Bot Token', placeholder: 'MTk1...' },
    { key: 'serverId', label: 'Server ID', placeholder: '123456789012345678' },
  ],
  whatsapp: [
    { key: 'accessToken', label: 'Access Token', placeholder: 'EAAG...' },
    { key: 'phoneNumberId', label: 'Phone Number ID', placeholder: '1234567890' },
  ],
  newsletter: [
    { key: 'provider', label: 'Proveedor', type: 'select', options: ['mailchimp', 'convertkit', 'beehiiv', 'substack', 'otro'] },
    { key: 'apiKey', label: 'API Key', placeholder: 'mc-xxxx...' },
    { key: 'subscribers', label: 'Suscriptores', placeholder: '5000', type: 'number' },
  ],
}

const inp = {
  width: '100%', boxSizing: 'border-box', background: 'var(--bg)',
  border: '1px solid var(--border)', borderRadius: '10px',
  padding: '10px 14px', fontSize: '14px', color: 'var(--text)',
  fontFamily: F, outline: 'none', transition: 'border-color .15s',
}

function PlatformConnectionSection({ channel, connectForm, setConnectForm }) {
  const [connecting, setConnecting] = useState(false)
  const [connectResult, setConnectResult] = useState(null)
  const [platformData, setPlatformData] = useState(null)

  const plat = channel?.plataforma || ''
  const isOAuth = ['instagram', 'facebook', 'linkedin'].includes(plat)
  const isConnected = channel?.connected || channel?.plataformaConectada || false
  const fields = PLATFORM_FIELDS[plat] || []
  const channelId = channel?._id || channel?.id

  const handleConnect = async () => {
    if (!channelId) return
    setConnecting(true)
    setConnectResult(null)
    try {
      let res
      if (plat === 'telegram') {
        res = await apiService.connectTelegram({ botToken: connectForm.botToken, chatId: connectForm.chatId })
      } else if (plat === 'discord') {
        res = await apiService.connectDiscord({ botToken: connectForm.botToken, serverId: connectForm.serverId })
      } else if (plat === 'whatsapp') {
        res = await apiService.connectWhatsAppManual({ accessToken: connectForm.accessToken, phoneNumberId: connectForm.phoneNumberId })
      } else if (plat === 'newsletter') {
        res = await apiService.connectNewsletter({ apiKey: connectForm.apiKey, provider: connectForm.provider, subscribers: Number(connectForm.subscribers) || 0 })
      } else {
        res = await apiService.connectPlatform(channelId, connectForm)
      }
      if (res?.success) {
        setConnectResult({ ok: true, msg: 'Plataforma conectada correctamente' })
        if (res.data?.stats) setPlatformData(res.data.stats)
      } else {
        setConnectResult({ ok: false, msg: res?.error || 'Error al conectar' })
      }
    } catch (err) {
      setConnectResult({ ok: false, msg: err.message || 'Error de conexion' })
    } finally {
      setConnecting(false)
    }
  }

  const handleOAuth = async (platform) => {
    try {
      if (platform === 'linkedin') {
        const res = await apiService.getLinkedinAuthUrl()
        if (res?.success && res.data?.url) window.open(res.data.url, '_blank')
      } else {
        // Meta OAuth placeholder — connectPlatform handles redirect
        const res = await apiService.connectPlatform(channelId, { platform })
        if (res?.success && res.data?.url) window.open(res.data.url, '_blank')
      }
    } catch { /* silent */ }
  }

  return (
    <SectionCard
      title="Conexion de plataforma"
      subtitle="Conecta tu canal para obtener datos automaticos"
    >
      {/* Connection status */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: 8, marginBottom: 20,
        padding: '10px 16px', borderRadius: 10,
        background: isConnected ? '#10b98112' : '#f59e0b12',
        border: `1px solid ${isConnected ? '#10b98133' : '#f59e0b33'}`,
      }}>
        {isConnected
          ? <CheckCircle size={16} color="#10b981" />
          : <AlertCircle size={16} color="#f59e0b" />
        }
        <span style={{ fontSize: 13, fontWeight: 600, color: isConnected ? '#10b981' : '#f59e0b' }}>
          {isConnected ? 'Plataforma conectada' : 'Sin conexion directa'}
        </span>
      </div>

      {/* OAuth platforms */}
      {isOAuth && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 16 }}>
          {(plat === 'instagram' || plat === 'facebook') && (
            <button
              onClick={() => handleOAuth(plat)}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#1877f2', color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}
            >
              <ExternalLink size={14} />
              Conectar con Meta
            </button>
          )}
          {plat === 'linkedin' && (
            <button
              onClick={() => handleOAuth('linkedin')}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                background: '#0a66c2', color: '#fff', border: 'none', borderRadius: 10,
                padding: '12px 20px', fontSize: 14, fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}
            >
              <ExternalLink size={14} />
              Conectar con LinkedIn
            </button>
          )}
        </div>
      )}

      {/* Credential fields for non-OAuth platforms */}
      {!isOAuth && fields.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {fields.map((field) => (
            <div key={field.key}>
              <label style={{ display: 'block', fontSize: 12, color: 'var(--muted2)', marginBottom: 4, fontWeight: 600 }}>
                {field.label}
              </label>
              {field.type === 'select' ? (
                <select
                  value={connectForm[field.key] || ''}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  style={inp}
                >
                  <option value="">Seleccionar...</option>
                  {field.options.map((opt) => (
                    <option key={opt} value={opt}>{opt.charAt(0).toUpperCase() + opt.slice(1)}</option>
                  ))}
                </select>
              ) : (
                <input
                  type={field.type || 'text'}
                  value={connectForm[field.key] || ''}
                  onChange={(e) => setConnectForm((prev) => ({ ...prev, [field.key]: e.target.value }))}
                  placeholder={field.placeholder || ''}
                  style={inp}
                />
              )}
            </div>
          ))}
          <button
            onClick={handleConnect}
            disabled={connecting}
            style={{
              background: 'var(--accent)', color: 'var(--bg)',
              border: 'none', borderRadius: 10, padding: '12px 20px',
              fontSize: 14, fontWeight: 700, cursor: connecting ? 'wait' : 'pointer',
              fontFamily: F, opacity: connecting ? 0.6 : 1, transition: 'opacity .15s',
              marginTop: 4,
            }}
          >
            {connecting ? 'Conectando...' : 'Conectar y obtener datos'}
          </button>
        </div>
      )}

      {/* Connection result */}
      {connectResult && (
        <div style={{
          padding: '10px 14px', borderRadius: 10, fontSize: 13, marginBottom: 16,
          background: connectResult.ok ? '#10b98112' : '#ef444412',
          border: `1px solid ${connectResult.ok ? '#10b98133' : '#ef444433'}`,
          color: connectResult.ok ? '#10b981' : '#ef4444',
        }}>
          {connectResult.msg}
        </div>
      )}

      {/* Platform data preview */}
      {(platformData || (isConnected && channel)) && (
        <div style={{
          background: 'var(--bg)', border: '1px solid var(--border)',
          borderRadius: 12, padding: 16, marginBottom: 16,
        }}>
          <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 12 }}>
            Datos de la plataforma
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', gap: 12 }}>
            {[
              { label: 'Seguidores', val: platformData?.followers ?? channel?.seguidores },
              { label: 'Views/post', val: platformData?.viewsPerPost ?? channel?.viewsPorPost },
              { label: 'Reacciones', val: platformData?.reactions ?? channel?.reacciones },
              { label: 'Posts', val: platformData?.posts ?? channel?.totalPosts },
            ].filter(d => d.val != null).map((d) => (
              <div key={d.label}>
                <div style={{ fontSize: 10, color: 'var(--muted2)', marginBottom: 2 }}>{d.label}</div>
                <div className="font-mono" style={{ fontSize: 15, fontWeight: 600, color: 'var(--text)' }}>
                  {typeof d.val === 'number' ? d.val.toLocaleString('es-ES') : d.val}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Scoring formula explanation */}
      <div style={{
        background: 'var(--bg)', border: '1px solid var(--border)',
        borderRadius: 12, padding: 16,
      }}>
        <div style={{ fontSize: 11, color: 'var(--muted2)', textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600, marginBottom: 10 }}>
          Formula de scoring
        </div>
        <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.7 }}>
          <div style={{ marginBottom: 6 }}>
            <strong style={{ color: 'var(--text)' }}>CAS = </strong>
            {FACTORS.map((f, i) => (
              <span key={f.key}>
                <span style={{ color: f.color, fontWeight: 600 }}>{f.key}</span>
                <span style={{ color: 'var(--muted2)' }}>×{f.weight / 100}</span>
                {i < FACTORS.length - 1 && <span style={{ color: 'var(--muted2)' }}> + </span>}
              </span>
            ))}
          </div>
          <div style={{ fontSize: 11, color: 'var(--muted2)', lineHeight: 1.6 }}>
            Cada factor mide un aspecto diferente del rendimiento de tu canal.
            El CAS Score se actualiza diariamente y determina tu CPM dinamico.
          </div>
        </div>
      </div>
    </SectionCard>
  )
}

// ─── Section 1: CAS Evolution ────────────────────────────────────────────────
function CASEvolutionSection({ historial, period, onPeriodChange, campaignDates }) {
  const periodDays = PERIODS.find((p) => p.key === period)?.days || 30

  const data = useMemo(() => {
    if (!Array.isArray(historial) || historial.length === 0) return []
    const sorted = historial
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
    const cutoff = new Date(Date.now() - periodDays * 86400000)
    return sorted.filter((d) => new Date(d.fecha) >= cutoff)
  }, [historial, periodDays])

  // Delta computation
  const delta = useMemo(() => {
    if (data.length < 2) return null
    return data[data.length - 1].CAS - data[0].CAS
  }, [data])

  // Campaign completion dots
  const campaignDots = useMemo(() => {
    if (!campaignDates?.length || !data.length) return []
    return data.filter((d) => {
      const dDate = new Date(d.fecha).toDateString()
      return campaignDates.some((cd) => new Date(cd).toDateString() === dDate)
    })
  }, [data, campaignDates])

  if (!Array.isArray(historial) || historial.length < 2) {
    return (
      <SectionCard title="Evolución CAS" action={<PeriodTabs period={period} onChange={onPeriodChange} />}>
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: 200,
            color: 'var(--muted2)',
            gap: 8,
          }}
        >
          <Clock size={22} />
          <span style={{ fontSize: 12 }}>Historial disponible desde mañana</span>
        </div>
      </SectionCard>
    )
  }

  return (
    <SectionCard title="Evolución CAS" action={<PeriodTabs period={period} onChange={onPeriodChange} />}>
      <ResponsiveContainer width="100%" height={320}>
        <LineChart data={data} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
          <CartesianGrid stroke={'var(--border)'} strokeDasharray="3 3" />
          <XAxis
            dataKey="fecha"
            tickFormatter={fmtDate}
            stroke={'var(--muted2)'}
            tick={{ fontSize: 11, fill: 'var(--muted2)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <YAxis
            domain={[0, 100]}
            ticks={[0, 25, 50, 75, 100]}
            stroke={'var(--muted2)'}
            tick={{ fontSize: 11, fill: 'var(--muted2)' }}
            tickLine={false}
            axisLine={{ stroke: 'var(--border)' }}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ stroke: 'var(--border-med)' }} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 12, color: 'var(--text-secondary)' }} />
          <Line type="monotone" dataKey="CAS" stroke={'var(--accent)'} strokeWidth={2.5} dot={false} activeDot={{ r: 4, fill: 'var(--accent)' }} name="CAS Total" />
          <Line type="monotone" dataKey="CTF" stroke={'#10b981'} strokeWidth={2} strokeDasharray="4 2" dot={false} name="Confianza" />
          <Line type="monotone" dataKey="CAP" stroke={'#f59e0b'} strokeWidth={2} strokeDasharray="2 2" dot={false} name="Rendimiento" />
          {campaignDots.map((d, i) => (
            <ReferenceDot
              key={i}
              x={d.fecha}
              y={d.CAS}
              r={5}
              fill={'var(--gold)'}
              stroke={'var(--bg)'}
              strokeWidth={2}
            />
          ))}
        </LineChart>
      </ResponsiveContainer>

      {/* Delta summary */}
      {delta !== null && (
        <div
          className="font-mono"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 16,
            fontSize: 13,
          }}
        >
          {delta > 0 ? (
            <TrendingUp size={14} color={'var(--accent)'} />
          ) : delta < 0 ? (
            <TrendingDown size={14} color={'var(--red)'} />
          ) : null}
          <span style={{ color: delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--red)' : 'var(--text-secondary)', fontWeight: 600 }}>
            CAS {delta > 0 ? '+' : ''}{delta}
          </span>
          <span style={{ color: 'var(--muted2)' }}>vs hace {periodDays} días</span>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Section 2: Score Decomposition ──────────────────────────────────────────
const COMPONENTS = [
  { key: 'CAF', label: 'CAF', desc: 'Channel Attention Flow', hasHistory: true },
  { key: 'CTF', label: 'CTF', desc: 'Channel Trust Flow', hasHistory: true },
  { key: 'CER', label: 'CER', desc: 'Channel Engagement Rate', hasHistory: true },
  { key: 'CVS', label: 'CVS', desc: 'Channel Velocity Score', hasHistory: true },
  { key: 'CAP', label: 'CAP', desc: 'Channel Ad Performance', hasHistory: true },
]

function ScoreDecompositionSection({ scores, historial }) {
  if (!scores) {
    return (
      <SectionCard title="Composición del score" subtitle="Desglose de los 5 componentes">
        <div style={{ color: 'var(--muted2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Datos insuficientes — publica tu primer canal para ver tu puntuación
        </div>
      </SectionCard>
    )
  }

  const sorted = useMemo(() => {
    if (!Array.isArray(historial) || historial.length === 0) return []
    return historial
      .slice()
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha))
      .slice(-30)
  }, [historial])

  return (
    <SectionCard title="Composición del score" subtitle="Desglose de los 5 componentes con tendencia de 30 días">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        {COMPONENTS.map((comp) => {
          const current = scores[comp.key] ?? null
          const sparkData = comp.hasHistory && sorted.length >= 2
            ? sorted.map((s) => s[comp.key] ?? 0)
            : null
          const delta =
            sparkData && sparkData.length >= 2
              ? sparkData[sparkData.length - 1] - sparkData[0]
              : null
          const alert = delta !== null && delta <= -10

          return (
            <div key={comp.key}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 0',
                  flexWrap: 'wrap',
                }}
              >
                {/* Label */}
                <span
                  className="font-mono"
                  title={comp.desc}
                  style={{
                    color: 'var(--text-secondary)',
                    fontSize: 12,
                    fontWeight: 600,
                    width: 32,
                    flexShrink: 0,
                    cursor: 'help',
                  }}
                >
                  {comp.label}
                </span>

                {/* Bar */}
                <div
                  style={{
                    flex: 1,
                    height: 6,
                    background: 'var(--border)',
                    borderRadius: 999,
                    overflow: 'hidden',
                  }}
                >
                  <div
                    style={{
                      width: `${Math.max(0, Math.min(100, current ?? 0))}%`,
                      height: '100%',
                      background: 'var(--accent)',
                      borderRadius: 999,
                      transition: 'width 400ms',
                    }}
                  />
                </div>

                {/* Current value */}
                <span
                  className="font-mono"
                  style={{ color: 'var(--text)', fontSize: 12, fontWeight: 600, width: 28, textAlign: 'right', flexShrink: 0 }}
                >
                  {current != null ? Math.round(current) : '--'}
                </span>

                {/* Sparkline or placeholder */}
                <div style={{ width: 84, flexShrink: 0, display: 'flex', justifyContent: 'center' }}>
                  {sparkData ? (
                    <Sparkline data={sparkData} color={'var(--accent)'} w={84} h={28} />
                  ) : (
                    <span
                      className="font-mono"
                      style={{ color: 'var(--muted2)', fontSize: 10 }}
                      title="Historial detallado disponible próximamente"
                    >
                      —
                    </span>
                  )}
                </div>

                {/* Delta badge */}
                <span
                  className="font-mono"
                  style={{
                    color: delta == null ? 'var(--muted2)' : delta > 0 ? 'var(--accent)' : delta < 0 ? 'var(--red)' : 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    width: 40,
                    textAlign: 'right',
                    flexShrink: 0,
                  }}
                >
                  {delta != null ? `${delta > 0 ? '+' : ''}${delta}` : '—'}
                </span>
              </div>

              {/* Alert */}
              {alert && (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    color: 'var(--gold)',
                    fontSize: 11,
                    marginLeft: 44,
                    marginTop: 2,
                  }}
                >
                  <AlertTriangle size={12} />
                  <span>
                    {comp.label} bajó {Math.abs(delta)} puntos — revisa tu {comp.desc.toLowerCase()}
                  </span>
                </div>
              )}
            </div>
          )
        })}
      </div>
    </SectionCard>
  )
}

// ─── Section 3: Benchmark Matrix ─────────────────────────────────────────────
function BenchmarkMatrixSection({ scores, benchmark, plataforma }) {
  if (!scores || !benchmark) {
    return (
      <SectionCard title="Benchmark vs nicho">
        <div style={{ color: 'var(--muted2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Necesitamos más datos para comparar tu canal con el nicho
        </div>
      </SectionCard>
    )
  }

  const { nichoMediaCTR, posicionNicho } = benchmark
  const currentCPM = scores.CPMDinamico || 0
  const benchmarkCPM = calcCPM(plataforma, 50) // CAS=50 = niche median CPM

  // Implied CTR from benchmark data
  const parseDelta = (str) => {
    if (!str) return null
    const m = String(str).match(/([+-]?)(\d+)/)
    if (!m) return null
    return (m[1] === '-' ? -1 : 1) * Number(m[2])
  }
  const ctrDelta = parseDelta(benchmark.canalCTRRatio)
  const canalCTR =
    nichoMediaCTR != null && ctrDelta != null
      ? Number(((1 + ctrDelta / 100) * nichoMediaCTR).toFixed(3))
      : null

  return (
    <SectionCard title="Benchmark vs nicho">
      {/* Position badge */}
      {posicionNicho && (
        <div
          className="font-mono"
          style={{
            background: 'var(--accent-dim)',
            color: 'var(--accent)',
            border: `1px solid ${'var(--accent)'}33`,
            borderRadius: 999,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 600,
            textAlign: 'center',
            marginBottom: 20,
          }}
        >
          Tu canal está en el {posicionNicho}
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {/* CTR */}
        {canalCTR != null && nichoMediaCTR != null && (
          <BenchmarkBar
            label="CTR"
            valor={Number(canalCTR.toFixed(2))}
            benchmark={Number(nichoMediaCTR.toFixed(2))}
            unidad="%"
          />
        )}

        {/* CPM (invertido) */}
        {currentCPM > 0 && (
          <BenchmarkBar
            label="CPM"
            valor={Number(currentCPM.toFixed(1))}
            benchmark={Number(benchmarkCPM.toFixed(1))}
            unidad="€"
            invertido
          />
        )}

        {/* CAS vs median */}
        {scores.CAS != null && (
          <BenchmarkBar
            label="CAS Score"
            valor={Math.round(scores.CAS)}
            benchmark={50}
          />
        )}

        {/* Engagement */}
        {scores.CER != null && (
          <BenchmarkBar
            label="Engagement"
            valor={Math.round(scores.CER)}
            benchmark={50}
          />
        )}
      </div>
    </SectionCard>
  )
}

// ─── Section 4: CPM Simulator ────────────────────────────────────────────────
function CPMSimulatorSection({ currentCAS, currentCPM, plataforma }) {
  const [targetCAS, setTargetCAS] = useState(currentCAS || 50)

  const estimatedCPM = calcCPM(plataforma, targetCAS)
  const deltaCPM = currentCPM ? estimatedCPM - currentCPM : 0
  const deltaPct = currentCPM && currentCPM > 0
    ? Math.round(((estimatedCPM - currentCPM) / currentCPM) * 100)
    : 0

  if (!currentCAS && currentCAS !== 0) {
    return (
      <SectionCard title="Simulador de CPM">
        <div style={{ color: 'var(--muted2)', fontSize: 12, textAlign: 'center', padding: '24px 0' }}>
          Registra un canal para simular tu CPM
        </div>
      </SectionCard>
    )
  }

  const showSummary = targetCAS !== currentCAS

  return (
    <SectionCard
      title="Simulador de CPM"
      subtitle="Simula cómo tu CPM cambia al mejorar tu CAS Score"
    >
      {/* Slider */}
      <div style={{ marginBottom: 24 }}>
        <div
          className="font-mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginBottom: 8,
            fontSize: 12,
            color: 'var(--text-secondary)',
          }}
        >
          <span>CAS objetivo</span>
          <span style={{ color: 'var(--accent)', fontWeight: 700, fontSize: 16 }}>{targetCAS}</span>
        </div>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={targetCAS}
          onChange={(e) => setTargetCAS(Number(e.target.value))}
          style={{ width: '100%', accentColor: 'var(--accent)' }}
        />
        <div
          className="font-mono"
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 4,
            fontSize: 10,
            color: 'var(--muted2)',
          }}
        >
          <span>0</span>
          <span>50</span>
          <span>100</span>
        </div>
      </div>

      {/* Current vs Estimated */}
      <div
        style={{
          display: 'flex',
          gap: 16,
          marginBottom: 20,
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            flex: 1,
            background: 'var(--bg3)',
            borderRadius: 12,
            padding: 16,
            minWidth: 140,
          }}
        >
          <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 6 }}>CPM actual</div>
          <div
            className="font-mono"
            style={{ color: 'var(--text-secondary)', fontSize: 24, fontWeight: 700 }}
          >
            €{(currentCPM || 0).toFixed(1)}
          </div>
          <div className="font-mono" style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 4 }}>
            CAS {currentCAS}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            background: 'var(--bg3)',
            borderRadius: 12,
            padding: 16,
            border: showSummary ? `1px solid ${'var(--accent)'}44` : `1px solid transparent`,
            minWidth: 140,
          }}
        >
          <div style={{ color: 'var(--muted2)', fontSize: 11, marginBottom: 6 }}>CPM estimado</div>
          <div
            className="font-mono"
            style={{ color: 'var(--accent)', fontSize: 24, fontWeight: 700 }}
          >
            €{estimatedCPM.toFixed(1)}
          </div>
          <div className="font-mono" style={{ color: 'var(--muted2)', fontSize: 11, marginTop: 4 }}>
            CAS {targetCAS}
          </div>
        </div>
      </div>

      {/* Summary sentence */}
      {showSummary && (
        <div
          style={{
            background: deltaCPM > 0 ? 'var(--accent-dim)' : 'var(--gold-dim)',
            border: `1px solid ${deltaCPM > 0 ? `${'var(--accent)'}44` : `${'var(--gold)'}44`}`,
            borderRadius: 12,
            padding: '12px 16px',
            fontSize: 13,
            lineHeight: 1.6,
            color: deltaCPM > 0 ? 'var(--accent)' : 'var(--gold)',
          }}
        >
          Si tu CAS {targetCAS > currentCAS ? 'sube' : 'baja'} de{' '}
          <strong>{currentCAS}</strong> a <strong>{targetCAS}</strong>, tu CPM{' '}
          {deltaCPM > 0 ? 'sube' : 'baja'} de{' '}
          <strong>€{(currentCPM || 0).toFixed(1)}</strong> a{' '}
          <strong>€{estimatedCPM.toFixed(1)}</strong>
          {deltaPct !== 0 && (
            <span> ({deltaPct > 0 ? '+' : ''}{deltaPct}%)</span>
          )}
          {deltaCPM > 0 && (
            <span> — ganarás más por publicación</span>
          )}
        </div>
      )}

      {/* Auto-pricing recommendation */}
      {currentCAS > 0 && currentCPM > 0 && (
        <div
          style={{
            marginTop: 16,
            background: 'var(--bg3)',
            border: `1px solid ${'var(--border-med)'}`,
            borderRadius: 12,
            padding: '14px 16px',
          }}
        >
          <div style={{ color: 'var(--muted2)', fontSize: 10, textTransform: 'uppercase', letterSpacing: '0.1em', fontWeight: 600, marginBottom: 8 }}>
            💡 Precio recomendado por publicación
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span className="font-mono" style={{ color: 'var(--accent)', fontSize: 22, fontWeight: 700 }}>
              €{Math.round(currentCPM * 10)}–{Math.round(currentCPM * 25)}
            </span>
            <span style={{ color: 'var(--muted2)', fontSize: 11 }}>
              basado en tu CPM €{currentCPM.toFixed(1)} × 10K–25K impresiones esperadas
            </span>
          </div>
          <div style={{ color: 'var(--text-secondary)', fontSize: 11, marginTop: 6, lineHeight: 1.5 }}>
            Este rango maximiza competitividad frente a canales similares en tu nicho.
            Ajusta según la exclusividad y el formato del anuncio.
          </div>
        </div>
      )}
    </SectionCard>
  )
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function CreatorAnalyticsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [channels, setChannels] = useState([])
  const [selectedChannelId, setSelectedChannelId] = useState(null)
  const [intelligence, setIntelligence] = useState(null)
  const [campaigns, setCampaigns] = useState([])
  const [period, setPeriod] = useState('30d')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [retryKey, setRetryKey] = useState(0)
  const [scoreData, setScoreData] = useState(null)
  const [scoreLoading, setScoreLoading] = useState(false)
  const [connectForm, setConnectForm] = useState({})

  // 1. Load channels list
  useEffect(() => {
    let mounted = true
    const load = async () => {
      try {
        const res = await apiService.getMyChannels()
        if (!mounted) return
        const items = res?.success
          ? Array.isArray(res.data) ? res.data : res.data?.items || []
          : []
        setChannels(items)
        if (items.length > 0 && !selectedChannelId) {
          // Check URL for ?channel= parameter
          const urlParams = new URLSearchParams(window.location.search)
          const urlChannel = urlParams.get('channel')
          if (urlChannel && items.some(c => (c._id || c.id) === urlChannel)) {
            setSelectedChannelId(urlChannel)
          } else {
            // Default: highest CAS
            const best = items.slice().sort((a, b) => (b.CAS || 0) - (a.CAS || 0))
            setSelectedChannelId(best[0]._id || best[0].id)
          }
        }
      } catch (err) {
        if (mounted) setError('No se pudieron cargar los canales')
      }
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  // 2. Load intelligence for selected channel
  useEffect(() => {
    if (!selectedChannelId) {
      setIntelligence(null)
      setLoading(false)
      return
    }
    let mounted = true
    setLoading(true)
    const load = async () => {
      try {
        const [intRes, cmpRes] = await Promise.all([
          apiService.getChannelIntelligence(selectedChannelId).catch(() => null),
          apiService.getCreatorAnalytics({ period }).catch(() => null),
        ])
        if (!mounted) return
        if (intRes?.success && intRes.data) {
          setIntelligence(intRes.data)
        } else {
          setIntelligence(null)
        }
        // Extract campaign completion dates for chart annotations
        if (cmpRes?.success) {
          const timeline = cmpRes.data?.campaignsTimeline || cmpRes.data?.campaigns || []
          const completedDates = Array.isArray(timeline)
            ? timeline
                .filter((c) => c.status === 'COMPLETED' && c.completedAt)
                .map((c) => c.completedAt)
            : []
          setCampaigns(completedDates)
        }
      } catch {
        if (mounted) setError('Error al cargar las analíticas')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [selectedChannelId, retryKey, period])

  // 3. Load score data for selected channel
  useEffect(() => {
    if (!selectedChannelId) { setScoreData(null); return }
    let mounted = true
    const loadScore = async () => {
      try {
        const res = await apiService.getChannelScore(selectedChannelId)
        if (!mounted) return
        if (res?.success && res.data) setScoreData(res.data)
        else setScoreData(null)
      } catch {
        if (mounted) setScoreData(null)
      }
    }
    loadScore()
    return () => { mounted = false }
  }, [selectedChannelId, retryKey])

  const handleRecalculate = async () => {
    if (!selectedChannelId) return
    setScoreLoading(true)
    try {
      const res = await apiService.recalculateScore(selectedChannelId)
      if (res?.success && res.data) setScoreData(res.data)
    } catch { /* silent */ }
    finally { setScoreLoading(false) }
  }

  // ── Derived data ──────────────────────────────────────────────────────
  const scores = intelligence?.scores || null
  const historial = intelligence?.historial || []
  const benchmark = intelligence?.benchmark || null
  const plataforma = intelligence?.canal?.plataforma || channels.find(c => (c._id || c.id) === selectedChannelId)?.plataforma || 'telegram'
  const selectedChannel = channels.find(c => (c._id || c.id) === selectedChannelId) || null

  // ── No channels → CTA ─────────────────────────────────────────────────
  if (!loading && channels.length === 0) {
    return (
      <div
        style={{
          fontFamily: F,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '50vh',
          gap: 16,
          padding: 40,
          textAlign: 'center',
        }}
      >
        <Radio size={36} color={'var(--muted2)'} />
        <h2 style={{ color: 'var(--text)', fontSize: 20, fontWeight: 700, fontFamily: D, margin: 0 }}>
          Registra tu primer canal para ver analytics
        </h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14, maxWidth: 400 }}>
          Una vez que tu canal esté verificado, podrás ver tu CAS Score, benchmarks
          del nicho y simular tu CPM óptimo.
        </p>
        <button
          onClick={() => navigate('/creator/channels/new')}
          style={{
            background: 'var(--accent)',
            color: 'var(--bg)',
            border: 'none',
            borderRadius: 10,
            padding: '12px 24px',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: F,
          }}
        >
          Registrar canal →
        </button>
      </div>
    )
  }

  // ── Loading skeleton ──────────────────────────────────────────────────
  if (loading && !intelligence) {
    return (
      <div
        className="animate-pulse"
        style={{
          fontFamily: F,
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
          maxWidth: 960,
        }}
      >
        {[360, 240, 200, 180].map((h, i) => (
          <div
            key={i}
            style={{
              height: h,
              background: 'var(--bg3)',
              borderRadius: 16,
            }}
          />
        ))}
      </div>
    )
  }

  return (
    <div
      style={{
        fontFamily: F,
        display: 'flex',
        flexDirection: 'column',
        gap: 20,
        maxWidth: 960,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <div>
          <h1
            style={{
              fontFamily: D,
              fontSize: 24,
              fontWeight: 800,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              marginBottom: 4,
            }}
          >
            Analytics
          </h1>
          <p style={{ fontSize: 13, color: 'var(--muted)' }}>
            Evolución, composición y benchmark de tu canal
          </p>
        </div>

        {/* Channel selector */}
        {channels.length === 1 && (
          <div
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontFamily: F,
              color: 'var(--text)',
              fontWeight: 600,
            }}
          >
            {channels[0].nombreCanal || 'Canal'} · {channels[0].plataforma || ''}
          </div>
        )}
        {channels.length > 1 && (
          <select
            value={selectedChannelId || ''}
            onChange={(e) => setSelectedChannelId(e.target.value)}
            style={{
              background: 'var(--surface)',
              color: 'var(--text)',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '8px 14px',
              fontSize: 13,
              fontFamily: F,
              outline: 'none',
              cursor: 'pointer',
            }}
          >
            {channels.map((ch) => (
              <option key={ch._id || ch.id} value={ch._id || ch.id}>
                {ch.nombreCanal || 'Canal'} · {ch.plataforma || ''}
              </option>
            ))}
          </select>
        )}
      </div>

      {error && (
        <ErrorBanner
          message={error}
          onRetry={() => {
            setError(null)
            setRetryKey((k) => k + 1)
          }}
        />
      )}

      {/* Score Overview */}
      <ScoreOverviewSection
        channel={selectedChannel}
        scores={scores}
        scoreData={scoreData}
        onRecalculate={handleRecalculate}
        loading={scoreLoading}
      />

      {/* CAS Evolution */}
      <CASEvolutionSection
        historial={historial}
        period={period}
        onPeriodChange={setPeriod}
        campaignDates={campaigns}
      />

      {/* Score Decomposition */}
      <ScoreDecompositionSection scores={scores} historial={historial} />

      {/* Platform Connection */}
      <PlatformConnectionSection
        channel={selectedChannel}
        connectForm={connectForm}
        setConnectForm={setConnectForm}
      />

      {/* Benchmark */}
      <BenchmarkMatrixSection
        scores={scores}
        benchmark={benchmark}
        plataforma={plataforma}
      />

      {/* CPM Simulator */}
      <CPMSimulatorSection
        currentCAS={scores?.CAS}
        currentCPM={scores?.CPMDinamico}
        plataforma={plataforma}
      />
    </div>
  )
}
