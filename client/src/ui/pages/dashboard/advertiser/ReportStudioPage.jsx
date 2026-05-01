import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  LayoutDashboard, Settings as SettingsIcon, Mail, Download, Plus,
  Eye, EyeOff, Save, AlertCircle, Sparkles, Check, Calendar,
  TrendingUp, TrendingDown, DollarSign, MousePointer, Target,
  Megaphone, Activity, BarChart3,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`

const STORAGE_KEY = 'channelad-report-config'

const fmtNum = (n) => n == null ? '—' : Number(n).toLocaleString('es')
const fmtMoney = (n) => `€${Math.round(n || 0).toLocaleString('es')}`
const fmtPct = (n) => n == null ? '—' : `${n.toFixed(2)}%`


// ─── Available widgets — id, label, icon, calculate fn from raw data ───────
const WIDGET_DEFS = [
  { id: 'spend',         label: 'Gasto total',           icon: DollarSign, color: PURPLE,  group: 'Financiero' },
  { id: 'campaigns',     label: 'Campañas totales',      icon: Megaphone,  color: BLUE,    group: 'Campañas' },
  { id: 'active',        label: 'Campañas activas',      icon: Activity,   color: OK,      group: 'Campañas' },
  { id: 'completed',     label: 'Campañas completadas',  icon: Check,      color: OK,      group: 'Campañas' },
  { id: 'avgPrice',      label: 'Coste medio por campaña', icon: DollarSign, color: WARN,  group: 'Financiero' },
  { id: 'impressions',   label: 'Impresiones totales',   icon: Eye,        color: BLUE,    group: 'Performance' },
  { id: 'clicks',        label: 'Clicks totales',        icon: MousePointer, color: PURPLE, group: 'Performance' },
  { id: 'conversions',   label: 'Conversiones totales',  icon: Target,     color: OK,      group: 'Performance' },
  { id: 'avgCtr',        label: 'CTR medio',             icon: TrendingUp, color: BLUE,    group: 'Performance' },
  { id: 'avgCpc',        label: 'CPC medio',             icon: DollarSign, color: WARN,    group: 'Financiero' },
  { id: 'completionRate',label: 'Tasa completitud',      icon: BarChart3,  color: OK,      group: 'Campañas' },
]

function calcMetrics(campaigns) {
  const live = campaigns.filter(c => ['PAID', 'PUBLISHED'].includes(c.status))
  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const billable = campaigns.filter(c => ['PAID', 'PUBLISHED', 'COMPLETED'].includes(c.status))
  const spend = billable.reduce((s, c) => s + (c.price || 0), 0)
  const imp = campaigns.reduce((s, c) => s + (c.tracking?.impressions || 0), 0)
  const clicks = campaigns.reduce((s, c) => s + (c.tracking?.clicks || 0), 0)
  const conv = campaigns.reduce((s, c) => s + (c.tracking?.conversions || 0), 0)
  return {
    spend,
    campaigns: campaigns.length,
    active: live.length,
    completed: completed.length,
    avgPrice: campaigns.length > 0 ? spend / Math.max(1, billable.length) : 0,
    impressions: imp,
    clicks,
    conversions: conv,
    avgCtr: imp > 0 ? (clicks / imp) * 100 : 0,
    avgCpc: clicks > 0 ? spend / clicks : 0,
    completionRate: campaigns.length > 0 ? (completed.length / campaigns.length) * 100 : 0,
  }
}

function formatValue(id, v) {
  if (id === 'spend' || id === 'avgPrice' || id === 'avgCpc') return fmtMoney(v)
  if (id === 'avgCtr' || id === 'completionRate') return fmtPct(v)
  return fmtNum(v)
}


// ─── Default config ────────────────────────────────────────────────────────
const DEFAULT_CONFIG = {
  enabledWidgets: ['spend', 'campaigns', 'active', 'avgCtr', 'clicks', 'conversions'],
  emailFrequency: 'off',  // off | daily | weekly | monthly
  emailRecipient: '',
}


// ─── Widget card ───────────────────────────────────────────────────────────
function WidgetCard({ def, value, onToggle, isEdit }) {
  const Icon = def.icon
  return (
    <div style={{
      background: 'var(--surface)', border: `1px solid ${isEdit ? purpleAlpha(0.3) : 'var(--border)'}`,
      borderRadius: 14, padding: 16,
      position: 'relative',
    }}>
      {isEdit && (
        <button onClick={onToggle}
          style={{
            position: 'absolute', top: 8, right: 8,
            background: 'var(--bg2)', border: '1px solid var(--border)',
            borderRadius: 6, padding: '4px 8px', cursor: 'pointer',
            color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4,
            fontSize: 10, fontWeight: 600, fontFamily: FONT_BODY,
          }}>
          <EyeOff size={10} /> Ocultar
        </button>
      )}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <Icon size={14} color={def.color} />
        <span style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
          {def.label}
        </span>
      </div>
      <div style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.02em' }}>
        {formatValue(def.id, value)}
      </div>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function ReportStudioPage() {
  const navigate = useNavigate()
  const [config, setConfig] = useState(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
      return stored || DEFAULT_CONFIG
    } catch { return DEFAULT_CONFIG }
  })
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [editMode, setEditMode] = useState(false)
  const [savedToast, setSavedToast] = useState(false)

  useEffect(() => {
    let cancelled = false
    apiService.getMyCampaigns().then(res => {
      if (cancelled) return
      if (res?.success) {
        setCampaigns(res.data?.items || res.data || [])
      }
      setLoading(false)
    }).catch(() => setLoading(false))
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config))
  }, [config])

  const metrics = useMemo(() => calcMetrics(campaigns), [campaigns])

  const enabledWidgets = WIDGET_DEFS.filter(w => config.enabledWidgets.includes(w.id))
  const disabledWidgets = WIDGET_DEFS.filter(w => !config.enabledWidgets.includes(w.id))

  const toggleWidget = (id) => {
    setConfig(prev => {
      const enabled = prev.enabledWidgets.includes(id)
        ? prev.enabledWidgets.filter(x => x !== id)
        : [...prev.enabledWidgets, id]
      return { ...prev, enabledWidgets: enabled }
    })
  }

  const exportCsv = () => {
    const headers = ['metric', 'label', 'value']
    const lines = [headers.join(',')]
    for (const w of enabledWidgets) {
      lines.push([w.id, `"${w.label}"`, metrics[w.id] || 0].join(','))
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/csv' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `report-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
  }

  const saveEmailSettings = () => {
    setSavedToast(true)
    setTimeout(() => setSavedToast(false), 2000)
    // (Backend endpoint for scheduling would go here)
  }

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
            <div style={{
              width: 40, height: 40, borderRadius: 12,
              background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <LayoutDashboard size={20} color={PURPLE} />
            </div>
            <h1 style={{
              fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
              color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
            }}>
              Report Studio
            </h1>
          </div>
          <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
            Construye tu propio dashboard de KPIs. Activa o desactiva widgets, exporta CSV y programa emails.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setEditMode(v => !v)}
            style={{
              background: editMode ? PURPLE : 'var(--surface)',
              color: editMode ? '#fff' : 'var(--text)',
              border: `1px solid ${editMode ? PURPLE : 'var(--border)'}`,
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
            }}>
            <SettingsIcon size={12} /> {editMode ? 'Hecho' : 'Personalizar'}
          </button>
          <button onClick={exportCsv}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 10, padding: '8px 14px', cursor: 'pointer', color: 'var(--text)',
              display: 'flex', alignItems: 'center', gap: 6,
              fontSize: 12, fontWeight: 600, fontFamily: FONT_BODY,
            }}>
            <Download size={12} /> CSV
          </button>
        </div>
      </div>

      {loading ? (
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, height: 240,
          animation: 'pulse 1.5s ease-in-out infinite',
        }} />
      ) : (
        <>
          {/* Active widgets grid */}
          {enabledWidgets.length > 0 ? (
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12,
            }}>
              {enabledWidgets.map(def => (
                <WidgetCard key={def.id} def={def} value={metrics[def.id]}
                  onToggle={() => toggleWidget(def.id)} isEdit={editMode} />
              ))}
            </div>
          ) : (
            <div style={{
              background: 'var(--surface)', border: '1px dashed var(--border)',
              borderRadius: 18, padding: '40px 24px', textAlign: 'center',
            }}>
              <Sparkles size={28} color={PURPLE} style={{ marginBottom: 12 }} />
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
                Tu dashboard está vacío
              </h3>
              <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>
                Activa widgets en el panel "Personalizar" para poblar tu dashboard.
              </p>
              <button onClick={() => setEditMode(true)}
                style={{
                  marginTop: 12, background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px 16px', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                }}>Personalizar</button>
            </div>
          )}

          {/* Edit panel — hidden widgets */}
          {editMode && disabledWidgets.length > 0 && (
            <div style={{
              background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.2)}`,
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ fontSize: 12, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 12 }}>
                Widgets disponibles para añadir
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {disabledWidgets.map(def => {
                  const Icon = def.icon
                  return (
                    <button key={def.id} onClick={() => toggleWidget(def.id)}
                      style={{
                        background: 'var(--bg2)', border: '1px solid var(--border)',
                        borderRadius: 10, padding: '8px 14px', cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 6,
                        fontSize: 12, fontWeight: 600, color: 'var(--text)', fontFamily: FONT_BODY,
                      }}
                      onMouseEnter={e => { e.currentTarget.style.borderColor = PURPLE; e.currentTarget.style.color = PURPLE }}
                      onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text)' }}
                    >
                      <Icon size={12} color={def.color} /> {def.label}
                      <Plus size={11} style={{ marginLeft: 2 }} />
                    </button>
                  )
                })}
              </div>
            </div>
          )}

          {/* Email scheduler */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
              <Mail size={16} color={PURPLE} />
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 14, fontWeight: 700, color: 'var(--text)', margin: 0 }}>
                Reportes por email
              </h3>
              <span style={{
                fontSize: 10, fontWeight: 700, color: WARN,
                background: `${WARN}15`, border: `1px solid ${WARN}30`,
                borderRadius: 6, padding: '2px 8px',
              }}>BETA</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, marginBottom: 12 }}>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Frecuencia
                </label>
                <select value={config.emailFrequency} onChange={e => setConfig(prev => ({ ...prev, emailFrequency: e.target.value }))}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                    fontFamily: FONT_BODY, cursor: 'pointer',
                  }}>
                  <option value="off">No enviar</option>
                  <option value="daily">Diario (lunes a viernes)</option>
                  <option value="weekly">Semanal (lunes 9:00)</option>
                  <option value="monthly">Mensual (día 1, 9:00)</option>
                </select>
              </div>
              <div>
                <label style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, display: 'block', marginBottom: 4 }}>
                  Email destinatario
                </label>
                <input type="email" value={config.emailRecipient}
                  onChange={e => setConfig(prev => ({ ...prev, emailRecipient: e.target.value }))}
                  placeholder="tu@email.com"
                  disabled={config.emailFrequency === 'off'}
                  style={{
                    width: '100%', background: 'var(--bg)', border: '1px solid var(--border)',
                    borderRadius: 8, padding: '8px 10px', fontSize: 13, color: 'var(--text)',
                    fontFamily: FONT_BODY, opacity: config.emailFrequency === 'off' ? 0.5 : 1,
                  }} />
              </div>
            </div>

            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <button onClick={saveEmailSettings} disabled={config.emailFrequency !== 'off' && !config.emailRecipient}
                style={{
                  background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
                  padding: '8px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', fontFamily: FONT_BODY,
                  display: 'flex', alignItems: 'center', gap: 6,
                  opacity: (config.emailFrequency !== 'off' && !config.emailRecipient) ? 0.5 : 1,
                }}>
                <Save size={12} /> Guardar
              </button>
              {savedToast && (
                <span style={{ fontSize: 12, color: OK, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Check size={12} /> Configuración guardada
                </span>
              )}
              {config.emailFrequency !== 'off' && config.emailRecipient && (
                <span style={{ fontSize: 11, color: 'var(--muted2)', display: 'flex', alignItems: 'center', gap: 4 }}>
                  <Calendar size={11} /> Próximo envío: {nextSendDate(config.emailFrequency)}
                </span>
              )}
            </div>
          </div>

          {/* Disclaimer */}
          <div style={{
            background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
            borderRadius: 10, padding: '10px 14px',
            fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
          }}>
            <AlertCircle size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Tu configuración se guarda localmente. Los emails programados son una funcionalidad en beta — la entrega
              real requiere activarse desde tu cuenta. Mientras tanto puedes exportar CSV cuando quieras.
            </span>
          </div>
        </>
      )}
    </div>
  )
}

// Compute next send date label for display
function nextSendDate(freq) {
  const now = new Date()
  const next = new Date(now)
  if (freq === 'daily') {
    next.setDate(now.getDate() + 1)
    next.setHours(9, 0, 0, 0)
  } else if (freq === 'weekly') {
    const daysUntilMonday = (8 - now.getDay()) % 7 || 7
    next.setDate(now.getDate() + daysUntilMonday)
    next.setHours(9, 0, 0, 0)
  } else if (freq === 'monthly') {
    next.setMonth(now.getMonth() + 1, 1)
    next.setHours(9, 0, 0, 0)
  } else return ''
  return next.toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
}
