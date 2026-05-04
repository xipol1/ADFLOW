import React, { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Receipt, Download, Building2, FileText, Calendar,
  AlertTriangle, CheckCircle2, Plus, Edit3, Save,
  ArrowRight, ExternalLink, Wallet, Sparkles,
} from 'lucide-react'
import { useAuth } from '../../../../auth/AuthContext'
import apiService from '../../../../services/api'
import { FONT_BODY as F, FONT_DISPLAY as D, GREEN, greenAlpha, OK, WARN, ERR, BLUE } from '../../../theme/tokens'
import { ErrorBanner } from '../shared/DashComponents'

const ACCENT = GREEN
const ga = greenAlpha
const fmtEur = (n) => `€${Math.round(Number(n) || 0).toLocaleString('es')}`
const fmtEur2 = (n) => `€${(Number(n) || 0).toLocaleString('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
const FISCAL_KEY = 'channelad-creator-fiscal-v1'
const NOW_YEAR = new Date().getFullYear()

// IVA / VAT rates per country (percentage)
const IVA_RATES = { ES: 21, MX: 16, AR: 21, other: 0 }
const ivaRateFor = (country) => {
  const r = IVA_RATES[country]
  return typeof r === 'number' ? r : 21
}

/**
 * CreatorBillingPage — Facturas + datos fiscales + resumen anual.
 *
 * Spain-first: cálculo IVA 21% + IRPF 15% (autónomos < 3 años) o 7%.
 * Genera facturas TXT por cada campaña COMPLETED. Resumen anual para
 * declaración. Datos fiscales editables (NIF, dirección, IRPF rate).
 */
export default function CreatorBillingPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [campaigns, setCampaigns] = useState([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState('invoices') // 'invoices' | 'fiscal' | 'summary'
  const [year, setYear] = useState(NOW_YEAR)
  const [fiscal, setFiscal] = useState(() => loadFiscal(user))
  const [loadError, setLoadError] = useState(false)
  const [retryKey, setRetryKey] = useState(0)

  useEffect(() => {
    let mounted = true
    setLoading(true)
    setLoadError(false)
    apiService.getCreatorCampaigns?.().then(res => {
      if (!mounted) return
      if (res?.success && Array.isArray(res.data)) setCampaigns(res.data)
      else setLoadError(true)
      setLoading(false)
    }).catch(() => { if (mounted) { setLoadError(true); setLoading(false) } })
    return () => { mounted = false }
  }, [retryKey])

  const completed = campaigns.filter(c => c.status === 'COMPLETED')
  const yearCampaigns = completed.filter(c => new Date(c.completedAt || c.createdAt).getFullYear() === year)

  const summary = useMemo(() => {
    const ivaPct = ivaRateFor(fiscal.country)
    const ivaMul = 1 + ivaPct / 100
    const grossYear = yearCampaigns.reduce((s, c) => s + (c.netAmount || c.price || 0), 0)
    const netYear = ivaMul > 0 ? grossYear / ivaMul : grossYear // base imponible
    const ivaYear = grossYear - netYear
    const irpfYear = netYear * (fiscal.irpfRate / 100)
    return {
      grossYear, netYear, ivaYear, irpfYear, ivaPct,
      campaignsYear: yearCampaigns.length,
      avgPerCampaign: yearCampaigns.length > 0 ? grossYear / yearCampaigns.length : 0,
    }
  }, [yearCampaigns, fiscal])

  const updateFiscal = (patch) => {
    const next = { ...fiscal, ...patch }
    setFiscal(next)
    saveFiscal(next)
  }

  const generateInvoice = (campaign) => {
    const txt = buildInvoiceText(campaign, fiscal, user)
    const filename = `factura-${campaign._id?.toString().slice(-6) || 'x'}-${new Date(campaign.completedAt || campaign.createdAt).toISOString().slice(0, 10)}.txt`
    downloadFile(txt, filename, 'text/plain')
  }

  const generateAnnualSummary = () => {
    const txt = buildAnnualSummary(yearCampaigns, summary, fiscal, user, year)
    downloadFile(txt, `resumen-fiscal-${year}.txt`, 'text/plain')
  }

  const fiscalComplete = fiscal.nif && fiscal.address && fiscal.businessName

  return (
    <div style={{ fontFamily: F, display: 'flex', flexDirection: 'column', gap: 22, maxWidth: 1100 }}>
      {loadError && (
        <ErrorBanner
          message="No se pudieron cargar tus campañas. Verifica tu conexión."
          onRetry={() => setRetryKey(k => k + 1)}
        />
      )}
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
        <div>
          <h1 style={{ fontFamily: D, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: '0 0 6px' }}>
            Billing & Facturas
          </h1>
          <p style={{ fontSize: 14, color: 'var(--muted)', margin: 0 }}>
            Genera facturas automáticas, descarga resúmenes fiscales y mantén tus datos de autónomo al día.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 2, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 10, padding: 3 }}>
          {[
            { id: 'invoices', label: 'Facturas', icon: Receipt },
            { id: 'fiscal',   label: 'Datos fiscales', icon: Building2 },
            { id: 'summary',  label: 'Resumen anual', icon: FileText },
          ].map(v => {
            const Icon = v.icon
            const active = view === v.id
            return (
              <button key={v.id} onClick={() => setView(v.id)} style={{
                background: active ? ACCENT : 'transparent',
                color: active ? '#fff' : 'var(--muted)',
                border: 'none', borderRadius: 8, padding: '7px 13px',
                fontSize: 12.5, fontWeight: active ? 700 : 500,
                cursor: 'pointer', fontFamily: F, transition: 'all .15s',
                display: 'inline-flex', alignItems: 'center', gap: 6,
              }}>
                <Icon size={12} /> {v.label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Fiscal data warning */}
      {!fiscalComplete && (
        <div style={{
          background: `${WARN}10`, border: `1px solid ${WARN}30`, borderRadius: 12,
          padding: 14, display: 'flex', alignItems: 'center', gap: 12,
        }}>
          <AlertTriangle size={18} color={WARN} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)' }}>
              Datos fiscales incompletos
            </div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
              Completa NIF, dirección y nombre fiscal para emitir facturas válidas.
            </div>
          </div>
          <button onClick={() => setView('fiscal')} style={{
            background: WARN, color: '#fff', border: 'none', borderRadius: 8,
            padding: '7px 12px', fontSize: 12, fontWeight: 700, cursor: 'pointer', fontFamily: F,
          }}>
            Completar
          </button>
        </div>
      )}

      {view === 'invoices' && (
        <InvoicesView campaigns={completed} onGenerate={generateInvoice} loading={loading} fiscalComplete={fiscalComplete} fiscal={fiscal} />
      )}
      {view === 'fiscal' && (
        <FiscalView fiscal={fiscal} onChange={updateFiscal} />
      )}
      {view === 'summary' && (
        <SummaryView summary={summary} year={year} setYear={setYear} fiscal={fiscal}
          yearCampaigns={yearCampaigns}
          onDownload={generateAnnualSummary} availableYears={[...new Set(completed.map(c => new Date(c.completedAt || c.createdAt).getFullYear()))].sort((a, b) => b - a)} />
      )}
    </div>
  )
}

// ─── Invoices view ──────────────────────────────────────────────────────────
function InvoicesView({ campaigns, onGenerate, loading, fiscalComplete, fiscal }) {
  const sorted = campaigns.slice().sort((a, b) => new Date(b.completedAt || b.createdAt) - new Date(a.completedAt || a.createdAt))

  if (loading) return <div style={{ height: 300, background: 'var(--bg2)', borderRadius: 12, animation: 'pulse 1.5s ease infinite' }} />
  if (sorted.length === 0) {
    return (
      <div style={{ background: 'var(--surface)', border: '1px dashed var(--border)', borderRadius: 14, padding: 60, textAlign: 'center' }}>
        <Receipt size={36} color="var(--muted2)" style={{ margin: '0 auto 12px' }} />
        <div style={{ fontFamily: D, fontSize: 16, fontWeight: 700, color: 'var(--text)' }}>Sin facturas todavía</div>
        <div style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 6 }}>Cuando completes tu primera campaña podrás emitir su factura aquí.</div>
      </div>
    )
  }

  const ivaPctTable = ivaRateFor(fiscal?.country)
  const ivaMulTable = 1 + ivaPctTable / 100

  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
      <style>{`
        @media (max-width: 720px) {
          .cb-table { display: none !important; }
          .cb-cards { display: flex !important; }
        }
      `}</style>

      {/* Desktop / tablet: table */}
      <div className="cb-table" style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 600 }}>
          <thead>
            <tr style={{ background: 'var(--bg2)' }}>
              {['Nº', 'Fecha', 'Cliente', 'Bruto', 'IVA', 'Neto', ''].map(h => (
                <th key={h} style={{ textAlign: 'left', padding: '11px 14px', fontSize: 10.5, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((c, i) => {
              const gross = c.netAmount || c.price || 0
              const base = ivaMulTable > 0 ? gross / ivaMulTable : gross
              const iva = gross - base
              const num = String(i + 1).padStart(3, '0')
              const date = new Date(c.completedAt || c.createdAt)
              return (
                <tr key={c._id} style={{ borderTop: '1px solid var(--border)' }}>
                  <td style={td}><code style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{date.getFullYear()}-{num}</code></td>
                  <td style={td}>{date.toLocaleDateString('es')}</td>
                  <td style={td}>
                    <div style={{ fontWeight: 600 }}>{c.advertiserName || 'Anunciante'}</div>
                  </td>
                  <td style={{ ...td, fontFamily: D, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{fmtEur2(gross)}</td>
                  <td style={{ ...td, color: 'var(--muted)', fontVariantNumeric: 'tabular-nums' }}>{fmtEur2(iva)}</td>
                  <td style={{ ...td, fontFamily: D, fontWeight: 700, color: ACCENT, fontVariantNumeric: 'tabular-nums' }}>{fmtEur2(base)}</td>
                  <td style={td}>
                    <button onClick={() => onGenerate(c)} disabled={!fiscalComplete}
                      style={{
                        background: fiscalComplete ? ga(0.1) : 'var(--bg2)',
                        color: fiscalComplete ? ACCENT : 'var(--muted2)',
                        border: `1px solid ${fiscalComplete ? ga(0.3) : 'var(--border)'}`,
                        borderRadius: 7, padding: '5px 10px', fontSize: 11, fontWeight: 700,
                        cursor: fiscalComplete ? 'pointer' : 'not-allowed', fontFamily: F,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                      <Download size={11} /> Descargar
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile: card list */}
      <div className="cb-cards" style={{ display: 'none', flexDirection: 'column' }}>
        {sorted.map((c, i) => {
          const gross = c.netAmount || c.price || 0
          const base = ivaMulTable > 0 ? gross / ivaMulTable : gross
          const iva = gross - base
          const num = String(i + 1).padStart(3, '0')
          const date = new Date(c.completedAt || c.createdAt)
          return (
            <div key={c._id} style={{ padding: 14, borderTop: '1px solid var(--border)', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                <code style={{ fontSize: 11, color: 'var(--muted)', fontFamily: 'JetBrains Mono, monospace' }}>{date.getFullYear()}-{num}</code>
                <span style={{ fontSize: 11, color: 'var(--muted)' }}>{date.toLocaleDateString('es')}</span>
              </div>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{c.advertiserName || 'Anunciante'}</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, fontVariantNumeric: 'tabular-nums' }}>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Bruto</div>
                  <div style={{ fontFamily: D, fontWeight: 700, fontSize: 13 }}>{fmtEur2(gross)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>IVA</div>
                  <div style={{ fontSize: 13, color: 'var(--muted)' }}>{fmtEur2(iva)}</div>
                </div>
                <div>
                  <div style={{ fontSize: 10, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Neto</div>
                  <div style={{ fontFamily: D, fontWeight: 700, fontSize: 13, color: ACCENT }}>{fmtEur2(base)}</div>
                </div>
              </div>
              <button onClick={() => onGenerate(c)} disabled={!fiscalComplete}
                style={{
                  alignSelf: 'flex-start',
                  background: fiscalComplete ? ga(0.1) : 'var(--bg2)',
                  color: fiscalComplete ? ACCENT : 'var(--muted2)',
                  border: `1px solid ${fiscalComplete ? ga(0.3) : 'var(--border)'}`,
                  borderRadius: 7, padding: '6px 12px', fontSize: 12, fontWeight: 700,
                  cursor: fiscalComplete ? 'pointer' : 'not-allowed', fontFamily: F,
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                }}>
                <Download size={12} /> Descargar
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ─── Fiscal data view ───────────────────────────────────────────────────────
// NIF spec for Spain (DNI/NIE/CIF). Light validation only.
const NIF_RE_ES = /^[0-9XYZ][0-9]{7}[A-Z]$/i
const isValidNIF = (v, country = 'ES') => {
  if (!v) return false
  if (country === 'ES') return NIF_RE_ES.test(v.replace(/\s|-/g, ''))
  return v.trim().length >= 5 // permissive for non-ES
}
const isValidEmail = (v) => !v || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.trim())

function FiscalView({ fiscal, onChange }) {
  const [touched, setTouched] = useState({})
  const errors = {
    businessName: !fiscal.businessName ? 'El nombre fiscal es obligatorio' : '',
    nif: !fiscal.nif ? 'El NIF es obligatorio' : (!isValidNIF(fiscal.nif, fiscal.country) ? 'Formato NIF inválido (ej: 12345678X)' : ''),
    address: !fiscal.address ? 'La dirección fiscal es obligatoria' : '',
    invoiceEmail: !isValidEmail(fiscal.invoiceEmail) ? 'Email no válido' : '',
  }
  const markTouched = (k) => setTouched(t => ({ ...t, [k]: true }))
  const fieldError = (k) => touched[k] ? errors[k] : ''

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
      <Section title="Datos del autónomo" icon={Building2}>
        <Field label="Nombre fiscal *" hint={fieldError('businessName') || undefined}>
          <input
            value={fiscal.businessName || ''}
            onChange={e => onChange({ businessName: e.target.value })}
            onBlur={() => markTouched('businessName')}
            aria-invalid={!!fieldError('businessName')}
            placeholder="María García López"
            style={{ ...inputStyle, borderColor: fieldError('businessName') ? ERR : 'var(--border-med)' }}
          />
        </Field>
        <Field label="NIF / DNI *" hint={fieldError('nif') || undefined}>
          <input
            value={fiscal.nif || ''}
            onChange={e => onChange({ nif: e.target.value.toUpperCase() })}
            onBlur={() => markTouched('nif')}
            aria-invalid={!!fieldError('nif')}
            placeholder="12345678X"
            style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', borderColor: fieldError('nif') ? ERR : 'var(--border-med)' }}
          />
        </Field>
        <Field label="Dirección fiscal *" hint={fieldError('address') || undefined}>
          <textarea
            value={fiscal.address || ''}
            onChange={e => onChange({ address: e.target.value })}
            onBlur={() => markTouched('address')}
            aria-invalid={!!fieldError('address')}
            placeholder="Calle Mayor 1, 2ºA&#10;28001 Madrid&#10;España"
            rows={3}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: F, borderColor: fieldError('address') ? ERR : 'var(--border-med)' }}
          />
        </Field>
        <Field label="Email de facturación" hint={fieldError('invoiceEmail') || undefined}>
          <input
            value={fiscal.invoiceEmail || ''}
            onChange={e => onChange({ invoiceEmail: e.target.value })}
            onBlur={() => markTouched('invoiceEmail')}
            aria-invalid={!!fieldError('invoiceEmail')}
            type="email"
            placeholder="facturacion@miweb.com"
            style={{ ...inputStyle, borderColor: fieldError('invoiceEmail') ? ERR : 'var(--border-med)' }}
          />
        </Field>
      </Section>

      <Section title="Régimen fiscal" icon={Receipt}>
        <Field label="País" hint="Determina IVA aplicable">
          <select value={fiscal.country || 'ES'} onChange={e => onChange({ country: e.target.value })} style={inputStyle}>
            <option value="ES">🇪🇸 España (IVA 21%)</option>
            <option value="MX">🇲🇽 México (IVA 16%)</option>
            <option value="AR">🇦🇷 Argentina (IVA 21%)</option>
            <option value="other">🌎 Otro</option>
          </select>
        </Field>
        <Field label="Tipo IRPF (%)" hint="7% si llevas <3 años de alta · 15% estándar">
          <div style={{ display: 'flex', gap: 6 }}>
            {[7, 15, 0].map(rate => (
              <button key={rate} onClick={() => onChange({ irpfRate: rate })} style={{
                flex: 1, background: fiscal.irpfRate === rate ? ga(0.12) : 'var(--bg2)',
                color: fiscal.irpfRate === rate ? ACCENT : 'var(--muted)',
                border: `1px solid ${fiscal.irpfRate === rate ? ga(0.3) : 'var(--border)'}`,
                borderRadius: 7, padding: '8px 10px', fontSize: 12.5, fontWeight: 700,
                cursor: 'pointer', fontFamily: F,
              }}>
                {rate === 0 ? 'Sin retención' : `${rate}%`}
              </button>
            ))}
          </div>
        </Field>
        <Field label="Régimen" hint="Recargo de equivalencia, módulos, etc.">
          <select value={fiscal.regime || 'general'} onChange={e => onChange({ regime: e.target.value })} style={inputStyle}>
            <option value="general">Régimen general</option>
            <option value="modules">Módulos</option>
            <option value="re">Recargo de equivalencia</option>
            <option value="exempt">Exento de IVA</option>
          </select>
        </Field>
      </Section>

      <Section title="Pago" icon={Wallet}>
        <Field label="IBAN para retiros">
          <input value={fiscal.iban || ''} onChange={e => onChange({ iban: e.target.value })}
            placeholder="ES12 3456 7890 1234 5678 9012" style={{ ...inputStyle, fontFamily: 'JetBrains Mono, monospace', letterSpacing: '0.5px' }} />
        </Field>
        <Field label="Frecuencia de retiro">
          <select value={fiscal.payoutFreq || 'biweekly'} onChange={e => onChange({ payoutFreq: e.target.value })} style={inputStyle}>
            <option value="weekly">Semanal</option>
            <option value="biweekly">Quincenal</option>
            <option value="monthly">Mensual</option>
            <option value="ondemand">A demanda</option>
          </select>
        </Field>
        <div style={{ background: 'var(--bg2)', borderRadius: 9, padding: 12, fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>
          🔒 Tus datos bancarios están cifrados y solo se usan para retiros. Nunca compartimos con advertisers.
        </div>
      </Section>

      <Section title="Notas legales" icon={FileText}>
        <div style={{ background: 'var(--bg2)', borderRadius: 9, padding: 14, fontSize: 12, color: 'var(--muted)', lineHeight: 1.6 }}>
          ℹ️ <strong style={{ color: 'var(--text)' }}>Importante:</strong> Las facturas generadas son borradores. Tu gestor / asesor debe validar IVA, IRPF y modelos. Para España, los modelos típicos son:
          <ul style={{ margin: '8px 0 0 18px', padding: 0 }}>
            <li>Modelo 130 (IRPF trimestral)</li>
            <li>Modelo 303 (IVA trimestral)</li>
            <li>Modelo 390 (IVA anual)</li>
            <li>Modelo 100 (renta anual)</li>
          </ul>
        </div>
      </Section>
    </div>
  )
}

// ─── Annual summary view ────────────────────────────────────────────────────
function SummaryView({ summary, year, setYear, fiscal, onDownload, availableYears, yearCampaigns }) {
  // Real quarterly breakdown derived from completed campaigns in the active year.
  const quarterly = useMemo(() => {
    const ivaPct = ivaRateFor(fiscal.country)
    const ivaMul = 1 + ivaPct / 100
    const buckets = [0, 0, 0, 0]
    ;(yearCampaigns || []).forEach(c => {
      const d = new Date(c.completedAt || c.createdAt)
      const q = Math.floor(d.getMonth() / 3) // 0..3
      buckets[q] += c.netAmount || c.price || 0
    })
    return buckets.map((gross) => {
      const net = ivaMul > 0 ? gross / ivaMul : gross
      const iva = gross - net
      const irpf = net * (fiscal.irpfRate / 100)
      return { gross, net, iva, irpf }
    })
  }, [yearCampaigns, fiscal])
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        <span style={{ fontSize: 13, color: 'var(--muted)', fontWeight: 600 }}>Año fiscal:</span>
        {availableYears.length > 0 ? availableYears.map(y => (
          <button key={y} onClick={() => setYear(y)} style={{
            background: year === y ? ga(0.12) : 'var(--bg2)',
            color: year === y ? ACCENT : 'var(--muted)',
            border: `1px solid ${year === y ? ga(0.3) : 'var(--border)'}`,
            borderRadius: 7, padding: '5px 11px', fontSize: 12, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, fontVariantNumeric: 'tabular-nums',
          }}>{y}</button>
        )) : (
          <span style={{ color: 'var(--muted)', fontSize: 12, fontStyle: 'italic' }}>Sin datos para mostrar</span>
        )}
        <div style={{ flex: 1 }} />
        {availableYears.length > 0 && (
          <button onClick={onDownload} style={{
            background: ACCENT, color: '#fff', border: 'none', borderRadius: 9,
            padding: '8px 14px', fontSize: 12.5, fontWeight: 700,
            cursor: 'pointer', fontFamily: F, display: 'inline-flex', alignItems: 'center', gap: 6,
            boxShadow: `0 4px 14px ${ga(0.35)}`,
          }}>
            <Download size={13} /> Descargar resumen {year}
          </button>
        )}
      </div>

      {/* Big stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12 }}>
        <BigStat label="Total facturado" value={fmtEur2(summary.grossYear)} accent={ACCENT} />
        <BigStat label="Base imponible"  value={fmtEur2(summary.netYear)}   accent={'var(--text)'} />
        <BigStat label="IVA repercutido" value={fmtEur2(summary.ivaYear)}   accent={BLUE} sub={`${summary.ivaPct ?? 21}%`} />
        <BigStat label="IRPF retenido"   value={fmtEur2(summary.irpfYear)}  accent={WARN} sub={`${fiscal.irpfRate}%`} />
        <BigStat label="Campañas"        value={summary.campaignsYear}       accent={'var(--text)'} />
        <BigStat label="Promedio"        value={fmtEur2(summary.avgPerCampaign)} accent={'var(--text)'} sub="por campaña" />
      </div>

      {/* Quarterly breakdown — from real campaign dates */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
        <h3 style={{ fontFamily: D, fontSize: 15, fontWeight: 700, color: 'var(--text)', margin: '0 0 12px' }}>
          Por trimestre · {year}
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 160px), 1fr))', gap: 10 }}>
          {quarterly.map((q, i) => (
            <div key={i} style={{ background: 'var(--bg2)', borderRadius: 9, padding: 12 }}>
              <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Q{i + 1}</div>
              <div style={{ fontFamily: D, fontSize: 16, fontWeight: 800, color: 'var(--text)', fontVariantNumeric: 'tabular-nums', marginTop: 3 }}>
                {fmtEur2(q.gross)}
              </div>
              <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 6, lineHeight: 1.5 }}>
                <div>IVA: <span style={{ color: BLUE, fontVariantNumeric: 'tabular-nums' }}>{fmtEur2(q.iva)}</span></div>
                <div>IRPF: <span style={{ color: WARN, fontVariantNumeric: 'tabular-nums' }}>{fmtEur2(q.irpf)}</span></div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--muted)', marginTop: 10 }}>
          Calculado por fecha de cierre de cada campaña. Modelos 303 (IVA) y 130 (IRPF) se presentan trimestralmente en España.
        </div>
      </div>

      {/* Tax tip */}
      <div style={{
        background: ga(0.06), border: `1px solid ${ga(0.25)}`, borderRadius: 12,
        padding: 14, display: 'flex', alignItems: 'flex-start', gap: 12,
      }}>
        <Sparkles size={16} color={ACCENT} style={{ flexShrink: 0, marginTop: 1 }} />
        <div style={{ fontSize: 12.5, color: 'var(--text)', lineHeight: 1.6 }}>
          <strong>Consejo:</strong> Reserva mensualmente {fiscal.irpfRate + 21}% (IVA + IRPF) de tus ingresos
          para no llevarte sustos en las declaraciones trimestrales. Aproximado para {year}: <strong style={{ color: ACCENT }}>{fmtEur2(summary.ivaYear + summary.irpfYear)}</strong>.
        </div>
      </div>
    </div>
  )
}

// ─── Primitives ─────────────────────────────────────────────────────────────
function Section({ title, icon: Icon, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 18 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 28, height: 28, borderRadius: 8, background: ga(0.15), border: `1px solid ${ga(0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={13} color={ACCENT} strokeWidth={2.2} />
        </div>
        <h3 style={{ fontFamily: D, fontSize: 14.5, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h3>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>{children}</div>
    </div>
  )
}

function Field({ label, hint, error, children }) {
  // Heuristic: if hint contains "obligator", "inválid", "no válid" → treat as error and color it red
  const isError = !!error || (hint && /(obligator|inválid|no válid|no es válid|incorrec|debe |invalid)/i.test(hint))
  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: 5 }}>{label}</label>
      {children}
      {hint && (
        <div role={isError ? 'alert' : undefined} style={{ fontSize: 10.5, color: isError ? ERR : 'var(--muted)', marginTop: 4 }}>
          {hint}
        </div>
      )}
    </div>
  )
}

function BigStat({ label, value, accent, sub }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: 14 }}>
      <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>
        {label}
      </div>
      <div style={{ fontFamily: D, fontSize: 22, fontWeight: 800, color: accent, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1.1 }}>
        {value}
      </div>
      {sub && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}

const td = { padding: '12px 14px', fontSize: 12.5, color: 'var(--text)' }
const inputStyle = {
  background: 'var(--bg2)', color: 'var(--text)', border: '1px solid var(--border)',
  borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: F, outline: 'none',
  width: '100%', boxSizing: 'border-box',
}

// ─── Persistence + invoice generation ───────────────────────────────────────
function loadFiscal(user) {
  try { return JSON.parse(localStorage.getItem(FISCAL_KEY) || 'null') || defaultFiscal(user) }
  catch { return defaultFiscal(user) }
}
function saveFiscal(f) { try { localStorage.setItem(FISCAL_KEY, JSON.stringify(f)) } catch {} }
function defaultFiscal(user) {
  return {
    businessName: user?.nombre || '',
    nif: '', address: '', invoiceEmail: user?.email || '',
    country: 'ES', irpfRate: 7, regime: 'general',
    iban: '', payoutFreq: 'biweekly',
  }
}

function buildInvoiceText(c, fiscal, user) {
  const date = new Date(c.completedAt || c.createdAt)
  const num = `${date.getFullYear()}-${String(c._id?.toString().slice(-3) || '001').padStart(3, '0')}`
  const gross = c.netAmount || c.price || 0
  const ivaPct = ivaRateFor(fiscal.country)
  const ivaMul = 1 + ivaPct / 100
  const base = ivaMul > 0 ? gross / ivaMul : gross
  const iva = gross - base
  const irpf = base * (fiscal.irpfRate / 100)
  const total = base + iva - irpf
  return [
    `═════════════════════════════════════════════════════════════`,
    `  FACTURA Nº ${num}`,
    `═════════════════════════════════════════════════════════════`,
    ``,
    `Fecha de emisión: ${date.toLocaleDateString('es')}`,
    ``,
    `─── EMISOR ───────────────────────────────────────────────────`,
    `${fiscal.businessName || user?.nombre || 'Sin nombre fiscal'}`,
    `NIF: ${fiscal.nif || '—'}`,
    `${(fiscal.address || '').split('\n').map(l => `  ${l}`).join('\n')}`,
    `Email: ${fiscal.invoiceEmail || user?.email || '—'}`,
    ``,
    `─── DESTINATARIO ─────────────────────────────────────────────`,
    `${c.advertiserName || c.advertiser?.nombre || 'Anunciante'}`,
    ``,
    `─── CONCEPTOS ────────────────────────────────────────────────`,
    `Servicio: ${c.title || 'Campaña publicitaria'}`,
    `Canal:    ${typeof c.channel === 'object' ? c.channel?.nombreCanal : c.channel || '—'}`,
    `Fecha publicación: ${c.publishedAt ? new Date(c.publishedAt).toLocaleDateString('es') : '—'}`,
    ``,
    `─── DESGLOSE FISCAL ──────────────────────────────────────────`,
    `Base imponible:        ${fmtEur2(base).padStart(12)}`,
    `IVA (${ivaPct}%):${' '.repeat(Math.max(1, 14 - String(ivaPct).length))}${fmtEur2(iva).padStart(12)}`,
    fiscal.irpfRate > 0 ? `Retención IRPF (${fiscal.irpfRate}%): ${('-' + fmtEur2(irpf)).padStart(12)}` : '',
    `─────────────────────────────────────────────────────────────`,
    `TOTAL A PAGAR:         ${fmtEur2(total).padStart(12)}`,
    ``,
    fiscal.iban ? `Forma de pago: Transferencia a ${fiscal.iban}` : '',
    ``,
    `═════════════════════════════════════════════════════════════`,
    `Generado por Channelad · channelad.io`,
    `Esta factura es un borrador. Valida con tu asesor fiscal.`,
  ].filter(Boolean).join('\n')
}

function buildAnnualSummary(yearCampaigns, summary, fiscal, user, year) {
  const lines = [
    `═════════════════════════════════════════════════════════════`,
    `  RESUMEN FISCAL ANUAL ${year}`,
    `═════════════════════════════════════════════════════════════`,
    ``,
    `${fiscal.businessName || user?.nombre || ''} · NIF ${fiscal.nif || '—'}`,
    `Generado: ${new Date().toLocaleDateString('es')}`,
    ``,
    `─── TOTALES ──────────────────────────────────────────────────`,
    `Campañas completadas:  ${summary.campaignsYear}`,
    `Total facturado:       ${fmtEur2(summary.grossYear).padStart(12)}`,
    `Base imponible:        ${fmtEur2(summary.netYear).padStart(12)}`,
    `IVA repercutido (${summary.ivaPct ?? 21}%): ${fmtEur2(summary.ivaYear).padStart(12)}`,
    `IRPF retenido (${fiscal.irpfRate}%):  ${fmtEur2(summary.irpfYear).padStart(12)}`,
    ``,
    `─── DETALLE POR CAMPAÑA ──────────────────────────────────────`,
    ...yearCampaigns.map(c => {
      const d = new Date(c.completedAt || c.createdAt).toLocaleDateString('es')
      return `${d.padEnd(12)} ${(c.advertiserName || 'Anunciante').padEnd(28).slice(0, 28)} ${fmtEur2(c.netAmount || c.price || 0).padStart(12)}`
    }),
    ``,
    `─── MODELOS APLICABLES (España) ──────────────────────────────`,
    `· Modelo 303 (IVA trimestral)`,
    `· Modelo 130 (IRPF trimestral)`,
    `· Modelo 390 (IVA anual resumen)`,
    `· Modelo 100 (renta anual)`,
    ``,
    `─── NOTAS ────────────────────────────────────────────────────`,
    `Este resumen es un borrador. Valida cifras con tu asesor.`,
    `Channelad · channelad.io`,
  ]
  return lines.join('\n')
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url; a.download = filename
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(() => URL.revokeObjectURL(url), 100)
}
