import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  FileText, Download, Calendar, FileSpreadsheet, FileBarChart,
  Wallet, Radio, TrendingUp, Activity, CheckCircle2,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, BLUE } from '../../../theme/tokens'
import { ErrorBanner } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha

const REPORT_TYPES = [
  {
    id: 'earnings',
    title: 'Reporte de ingresos',
    description: 'Histórico de cobros, retenciones, retiros y comisiones',
    icon: Wallet,
    color: ACCENT,
    fields: ['Fecha', 'Campaña', 'Anunciante', 'Bruto', 'Comisión', 'Neto', 'Estado'],
  },
  {
    id: 'channels',
    title: 'Reporte de canales',
    description: 'Métricas de cada canal: CAS, CPM, audiencia, engagement',
    icon: Radio,
    color: BLUE,
    fields: ['Canal', 'Plataforma', 'Audiencia', 'CAS', 'CPM', 'Confianza', 'Estado'],
  },
  {
    id: 'campaigns',
    title: 'Reporte de campañas',
    description: 'Detalle de cada campaña ejecutada con sus KPIs',
    icon: TrendingUp,
    color: '#8B5CF6',
    fields: ['Fecha', 'Canal', 'Anunciante', 'Vistas', 'Clicks', 'CTR', 'Importe', 'Rating'],
  },
  {
    id: 'performance',
    title: 'Reporte de rendimiento',
    description: 'Tu CAS evolution, ratings, deadlines cumplidos',
    icon: Activity,
    color: '#f59e0b',
    fields: ['Periodo', 'Campañas', 'CAS medio', 'Rating medio', 'Deadlines OK', 'Disputas'],
  },
  {
    id: 'tax',
    title: 'Reporte fiscal',
    description: 'Resumen anual para tu declaración. IVA, IRPF y bruto facturado',
    icon: FileBarChart,
    color: '#ec4899',
    fields: ['Mes', 'Bruto facturado', 'IVA repercutido', 'IRPF retenido', 'Comisión Channelad'],
  },
]

const FORMATS = [
  { id: 'csv',  label: 'CSV',  icon: FileSpreadsheet, description: 'Excel / Google Sheets' },
  { id: 'json', label: 'JSON', icon: FileText,        description: 'Datos crudos para integrar' },
  { id: 'pdf',  label: 'PDF',  icon: FileBarChart,    description: 'Listo para enviar / archivar' },
]

export default function CreatorReportsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [selectedReport, setSelectedReport] = useState('earnings')
  const [format, setFormat] = useState('csv')
  const [periodFrom, setPeriodFrom] = useState(() => {
    const d = new Date()
    d.setMonth(d.getMonth() - 3)
    return d.toISOString().slice(0, 10)
  })
  const [periodTo, setPeriodTo] = useState(() => new Date().toISOString().slice(0, 10))

  const [channels, setChannels] = useState([])
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [exportStatus, setExportStatus] = useState(null) // 'generating' | 'done' | null
  const [history, setHistory] = useState(() => {
    try { return JSON.parse(localStorage.getItem('channelad-reports-history') || '[]') }
    catch { return [] }
  })
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    const load = async () => {
      setLoading(true)
      setLoadError(false)
      try {
        let anyOk = false
        let anyFail = false
        const [chRes, cmpRes] = await Promise.all([
          apiService.getMyChannels().catch(() => { anyFail = true; return null }),
          apiService.getCreatorCampaigns?.().catch(() => { anyFail = true; return null }),
        ])
        if (!mounted) return
        if (chRes?.success) { setChannels(Array.isArray(chRes.data) ? chRes.data : chRes.data?.items || []); anyOk = true }
        else if (chRes !== null) anyFail = true
        if (cmpRes?.success && Array.isArray(cmpRes.data)) { setCampaigns(cmpRes.data); anyOk = true }
        if (anyFail && !anyOk) setLoadError(true)
      } catch (err) {
        if (mounted) setLoadError(true)
      }
      if (mounted) setLoading(false)
    }
    load()
    return () => { mounted = false }
  }, [retryKey])

  const reportConfig = REPORT_TYPES.find(r => r.id === selectedReport)
  const formatConfig = FORMATS.find(f => f.id === format)

  // Build the data preview based on selected report
  const previewData = useMemo(() => {
    const from = new Date(periodFrom)
    const to = new Date(periodTo)
    to.setHours(23, 59, 59, 999)

    if (selectedReport === 'earnings') {
      return campaigns
        .filter(c => c.status === 'COMPLETED')
        .filter(c => {
          const d = new Date(c.completedAt || c.createdAt)
          return d >= from && d <= to
        })
        .slice(0, 8)
        .map(c => ({
          'Fecha': new Date(c.completedAt || c.createdAt).toLocaleDateString('es'),
          'Campaña': c.title || '—',
          'Anunciante': c.advertiserName || c.advertiser?.nombre || '—',
          'Bruto': `€${(c.price || 0).toFixed(2)}`,
          'Comisión': `€${((c.price || 0) - (c.netAmount || 0)).toFixed(2)}`,
          'Neto': `€${(c.netAmount || 0).toFixed(2)}`,
          'Estado': 'Pagada',
        }))
    }
    if (selectedReport === 'channels') {
      return channels.slice(0, 8).map(ch => ({
        'Canal': ch.nombreCanal || ch.nombre || '—',
        'Plataforma': ch.plataforma || '—',
        'Audiencia': (ch.estadisticas?.seguidores || 0).toLocaleString('es'),
        'CAS': ch.CAS ? Math.round(ch.CAS) : '—',
        'CPM': ch.CPMDinamico ? `€${ch.CPMDinamico}` : '—',
        'Confianza': ch.verificacion?.confianzaScore != null ? `${ch.verificacion.confianzaScore}%` : '—',
        'Estado': ch.estado || ch.status || '—',
      }))
    }
    if (selectedReport === 'campaigns') {
      return campaigns
        .filter(c => {
          const d = new Date(c.completedAt || c.createdAt)
          return d >= from && d <= to
        })
        .slice(0, 8)
        .map(c => {
          const views = c.tracking?.impressions || 0
          const clicks = c.tracking?.clicks || 0
          const ctr = views > 0 ? `${((clicks / views) * 100).toFixed(2)}%` : '—'
          return {
            'Fecha': new Date(c.completedAt || c.createdAt).toLocaleDateString('es'),
            'Canal': typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel || '—',
            'Anunciante': c.advertiserName || '—',
            'Vistas': views.toLocaleString('es'),
            'Clicks': clicks.toLocaleString('es'),
            'CTR': ctr,
            'Importe': `€${(c.netAmount || 0).toFixed(2)}`,
            'Rating': c.rating ? `${c.rating}★` : '—',
          }
        })
    }
    if (selectedReport === 'performance') {
      const months = []
      for (let i = 5; i >= 0; i--) {
        const d = new Date()
        d.setMonth(d.getMonth() - i)
        const monthLabel = d.toLocaleDateString('es', { month: 'short', year: '2-digit' })
        const inMonth = campaigns.filter(c => {
          const cd = new Date(c.completedAt || c.createdAt)
          return cd.getMonth() === d.getMonth() && cd.getFullYear() === d.getFullYear()
        })
        const completed = inMonth.filter(c => c.status === 'COMPLETED').length
        const ratings = inMonth.filter(c => c.rating).map(c => Number(c.rating))
        const avgRating = ratings.length ? (ratings.reduce((s, r) => s + r, 0) / ratings.length).toFixed(1) : '—'
        months.push({
          'Periodo': monthLabel,
          'Campañas': inMonth.length,
          'CAS medio': '—',
          'Rating medio': avgRating !== '—' ? `${avgRating}★` : '—',
          'Deadlines OK': `${completed}/${inMonth.length}`,
          'Disputas': '0',
        })
      }
      return months
    }
    if (selectedReport === 'tax') {
      const months = {}
      campaigns.filter(c => c.status === 'COMPLETED').forEach(c => {
        const d = new Date(c.completedAt || c.createdAt)
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        if (!months[key]) months[key] = { bruto: 0, neto: 0 }
        months[key].bruto += (c.price || 0)
        months[key].neto += (c.netAmount || 0)
      })
      return Object.entries(months).slice(-12).map(([key, m]) => ({
        'Mes': key,
        'Bruto facturado': `€${m.bruto.toFixed(2)}`,
        'IVA repercutido (21%)': `€${(m.bruto * 0.21 / 1.21).toFixed(2)}`,
        'IRPF retenido (15%)': `€${(m.bruto * 0.15).toFixed(2)}`,
        'Comisión Channelad': `€${(m.bruto - m.neto).toFixed(2)}`,
      }))
    }
    return []
  }, [selectedReport, campaigns, channels, periodFrom, periodTo])

  const handleExport = async () => {
    setExportStatus('generating')
    await new Promise(r => setTimeout(r, 600))
    const filename = `channelad-${selectedReport}-${periodFrom}-${periodTo}.${format}`
    let content = ''

    if (format === 'csv') {
      if (previewData.length === 0) content = ''
      else {
        const headers = Object.keys(previewData[0])
        content = headers.join(',') + '\n' + previewData.map(row =>
          headers.map(h => `"${String(row[h] ?? '').replace(/"/g, '""')}"`).join(',')
        ).join('\n')
      }
      downloadBlob(content, filename, 'text/csv')
    } else if (format === 'json') {
      content = JSON.stringify({
        reportType: selectedReport,
        periodFrom, periodTo,
        generatedAt: new Date().toISOString(),
        creator: user?.email,
        rows: previewData,
      }, null, 2)
      downloadBlob(content, filename, 'application/json')
    } else if (format === 'pdf') {
      content = buildPdfText(reportConfig.title, periodFrom, periodTo, previewData)
      downloadBlob(content, filename.replace('.pdf', '.txt'), 'text/plain')
    }

    const entry = {
      id: Date.now(),
      type: selectedReport,
      title: reportConfig.title,
      format,
      periodFrom, periodTo,
      rows: previewData.length,
      at: new Date().toISOString(),
    }
    const next = [entry, ...history].slice(0, 10)
    setHistory(next)
    try { localStorage.setItem('channelad-reports-history', JSON.stringify(next)) } catch {}
    setExportStatus('done')
    setTimeout(() => setExportStatus(null), 2500)
  }

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>
      {loadError && (
        <ErrorBanner
          message="No se pudieron cargar tus datos. Los reportes pueden estar incompletos."
          onRetry={() => setRetryKey(k => k + 1)}
        />
      )}
      <div>
        <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: 6 }}>
          Reports Studio
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)' }}>
          Genera y exporta reportes detallados de tus canales, ingresos y rendimiento.
        </p>
      </div>

      {/* Type picker */}
      <div>
        <SectionLabel>1. Tipo de reporte</SectionLabel>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10, marginTop: 10 }}>
          {REPORT_TYPES.map(r => {
            const Icon = r.icon
            const active = r.id === selectedReport
            return (
              <button key={r.id} onClick={() => setSelectedReport(r.id)} style={{
                background: active ? `${r.color}10` : 'var(--surface)',
                border: `1px solid ${active ? r.color : 'var(--border)'}`,
                borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left',
                display: 'flex', alignItems: 'flex-start', gap: 11, fontFamily: F,
                transition: 'border-color .15s, background .15s',
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10, flexShrink: 0,
                  background: `${r.color}15`, border: `1px solid ${r.color}30`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}>
                  <Icon size={16} color={r.color} strokeWidth={2} />
                </div>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>
                    {r.title}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                    {r.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Period + format */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
        <div>
          <SectionLabel>2. Periodo</SectionLabel>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginTop: 10 }}>
            <Calendar size={14} color="var(--muted)" />
            <input type="date" value={periodFrom} onChange={e => setPeriodFrom(e.target.value)} style={inputStyle} />
            <span style={{ fontSize: 13, color: 'var(--muted)' }}>—</span>
            <input type="date" value={periodTo} onChange={e => setPeriodTo(e.target.value)} style={inputStyle} />
          </div>
          <div style={{ display: 'flex', gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            {[
              { label: '7d',  days: 7 },
              { label: '30d', days: 30 },
              { label: '90d', days: 90 },
              { label: 'Año', days: 365 },
            ].map(p => (
              <button key={p.days} onClick={() => {
                const to = new Date()
                const from = new Date()
                from.setDate(from.getDate() - p.days)
                setPeriodFrom(from.toISOString().slice(0, 10))
                setPeriodTo(to.toISOString().slice(0, 10))
              }} style={pillBtnStyle}>{p.label}</button>
            ))}
          </div>
        </div>

        <div>
          <SectionLabel>3. Formato</SectionLabel>
          <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
            {FORMATS.map(f => {
              const Icon = f.icon
              const active = f.id === format
              return (
                <button key={f.id} onClick={() => setFormat(f.id)} style={{
                  background: active ? ga(0.1) : 'var(--surface)',
                  border: `1px solid ${active ? ACCENT : 'var(--border)'}`,
                  borderRadius: 10, padding: '10px 14px', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 7, fontFamily: F,
                  fontSize: 13, fontWeight: 600, color: active ? ACCENT : 'var(--text)',
                  flexShrink: 0,
                }}>
                  <Icon size={13} />
                  {f.label}
                </button>
              )
            })}
          </div>
          {formatConfig && (
            <div style={{ fontSize: 11.5, color: 'var(--muted)', marginTop: 6 }}>
              {formatConfig.description}
            </div>
          )}
        </div>
      </div>

      {/* Preview */}
      <div>
        <SectionLabel>4. Vista previa ({previewData.length} {previewData.length === 1 ? 'fila' : 'filas'})</SectionLabel>
        <div style={{
          background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12,
          marginTop: 10, overflow: 'hidden',
        }}>
          {previewData.length === 0 ? (
            <div style={{ padding: 28, textAlign: 'center' }}>
              <FileText size={28} color="var(--muted2)" style={{ margin: '0 auto 10px' }} />
              <div style={{ fontSize: 13, color: 'var(--muted)' }}>
                {loading ? 'Cargando datos...' : 'No hay datos en este periodo. Ajusta las fechas o el tipo de reporte.'}
              </div>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                <thead>
                  <tr style={{ background: 'var(--bg2)', borderBottom: '1px solid var(--border)' }}>
                    {Object.keys(previewData[0]).map(h => (
                      <th key={h} style={{ textAlign: 'left', padding: '10px 14px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewData.map((row, i) => (
                    <tr key={i} style={{ borderBottom: i < previewData.length - 1 ? '1px solid var(--border)' : 'none' }}>
                      {Object.values(row).map((v, j) => (
                        <td key={j} style={{ padding: '10px 14px', color: 'var(--text)', whiteSpace: 'nowrap' }}>
                          {String(v)}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Export action */}
      <div style={{
        background: ga(0.06), border: `1px solid ${ga(0.2)}`, borderRadius: 12,
        padding: 16, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 200 }}>
          <Download size={18} color={ACCENT} />
          <div>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)' }}>
              {reportConfig?.title} · {format.toUpperCase()}
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--muted)' }}>
              {periodFrom} → {periodTo} · {previewData.length} {previewData.length === 1 ? 'fila' : 'filas'}
            </div>
          </div>
        </div>
        <button onClick={handleExport} disabled={previewData.length === 0 || exportStatus === 'generating'} style={{
          background: previewData.length === 0 ? 'var(--muted2)' : ACCENT,
          color: '#fff', border: 'none', borderRadius: 10,
          padding: '10px 22px', fontSize: 13, fontWeight: 700,
          cursor: previewData.length === 0 ? 'not-allowed' : 'pointer',
          fontFamily: F, display: 'flex', alignItems: 'center', gap: 7,
          boxShadow: previewData.length > 0 ? `0 4px 14px ${ga(0.35)}` : 'none',
        }}>
          {exportStatus === 'generating' ? 'Generando...' :
           exportStatus === 'done' ? <><CheckCircle2 size={14} /> Listo</> :
           <><Download size={14} /> Exportar</>}
        </button>
      </div>

      {/* History */}
      {history.length > 0 && (
        <div>
          <SectionLabel>Historial reciente</SectionLabel>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, marginTop: 10, overflow: 'hidden' }}>
            {history.map((h, i) => (
              <div key={h.id} style={{
                padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10,
                borderBottom: i < history.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <FileText size={13} color="var(--muted)" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--text)' }}>
                    {h.title} · {h.format.toUpperCase()}
                  </div>
                  <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                    {h.periodFrom} → {h.periodTo} · {h.rows} filas · {new Date(h.at).toLocaleString('es')}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}

function SectionLabel({ children }) {
  return (
    <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
      {children}
    </div>
  )
}

const inputStyle = {
  background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '7px 10px', fontSize: 13, fontFamily: F, outline: 'none',
}

const pillBtnStyle = {
  background: 'var(--surface)', color: 'var(--muted)', border: '1px solid var(--border)',
  borderRadius: 20, padding: '4px 11px', fontSize: 11.5, fontFamily: F, cursor: 'pointer',
}

function downloadBlob(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}

function buildPdfText(title, from, to, rows) {
  const lines = [
    `═══════════════════════════════════════════════════════`,
    `  ${title}`,
    `═══════════════════════════════════════════════════════`,
    ``,
    `Periodo: ${from} → ${to}`,
    `Generado: ${new Date().toLocaleString('es')}`,
    `Filas: ${rows.length}`,
    ``,
    `───────────────────────────────────────────────────────`,
    ``,
  ]
  if (rows.length > 0) {
    const headers = Object.keys(rows[0])
    lines.push(headers.join(' | '))
    lines.push(headers.map(() => '─'.repeat(12)).join('─┼─'))
    rows.forEach(r => lines.push(headers.map(h => String(r[h] ?? '')).join(' | ')))
  }
  lines.push('', '───────────────────────────────────────────────────────', '', 'Channelad · Reporte generado automáticamente')
  return lines.join('\n')
}
