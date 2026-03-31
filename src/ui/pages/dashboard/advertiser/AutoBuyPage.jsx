import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Bot, Heart, MousePointer, CheckCircle, AlertCircle } from 'lucide-react'
import apiService from '../../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK,
} from '../../../theme/tokens'


const CATEGORIES = ['Tecnología', 'Negocios', 'Marketing', 'Ecommerce', 'Gaming', 'Fitness', 'Finanzas', 'Diseño', 'Gastronomía']

const calcEstimates = (budget) => {
  const cpc   = 0.16
  const clicks = Math.round(budget / cpc)
  const impr   = Math.round(clicks * 22)
  return { cpc, clicks, impr }
}

const ModeCard = ({ icon: Icon, label, desc, badge, selected, onClick }) => (
  <button onClick={onClick} style={{
    background: selected ? purpleAlpha(0.1) : 'var(--bg)',
    border: `1.5px solid ${selected ? PURPLE : 'var(--border)'}`,
    borderRadius: '14px', padding: '16px',
    cursor: 'pointer', textAlign: 'left', flex: 1,
    boxShadow: selected ? `0 0 0 1px ${PURPLE}` : 'none',
    transition: 'all .15s',
  }}
    onMouseEnter={e => { if (!selected) e.currentTarget.style.borderColor = purpleAlpha(0.4) }}
    onMouseLeave={e => { if (!selected) e.currentTarget.style.borderColor = 'var(--border)' }}
  >
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '8px' }}>
      <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: selected ? purpleAlpha(0.15) : 'var(--surface)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Icon size={18} color={selected ? PURPLE : 'var(--muted)'} />
      </div>
      {badge && <span style={{ background: 'rgba(16,185,129,0.12)', color: OK, border: `1px solid rgba(16,185,129,0.25)`, borderRadius: '6px', padding: '2px 8px', fontSize: '10px', fontWeight: 700 }}>{badge}</span>}
    </div>
    <div style={{ fontFamily: FONT_DISPLAY, fontSize: '13px', fontWeight: 700, color: selected ? PURPLE : 'var(--text)', marginBottom: '4px' }}>{label}</div>
    <div style={{ fontSize: '11px', color: 'var(--muted)', lineHeight: 1.4 }}>{desc}</div>
  </button>
)

export default function AutoBuyPage() {
  const navigate = useNavigate()
  const [step, setStep] = useState(1)
  const [budget, setBudget] = useState(300)
  const [category, setCategory] = useState('Tecnología')
  const [mode, setMode] = useState('auto')
  const [adText, setAdText] = useState('')
  const [url, setUrl] = useState('')
  const [launching, setLaunching] = useState(false)
  const [launched, setLaunched] = useState(false)
  const [launchResult, setLaunchResult] = useState(null)
  const [error, setError] = useState('')

  const est = calcEstimates(budget)
  const commissionRate = 0.25
  const commissionAmount = Math.round(budget * commissionRate * 100) / 100
  const netBudget = budget - commissionAmount

  const handleLaunch = async () => {
    setLaunching(true)
    setError('')
    try {
      const res = await apiService.launchAutoCampaign({
        budget,
        category,
        mode,
        content: adText.trim(),
        targetUrl: url.trim(),
      })
      if (res?.success && res.data) {
        setLaunchResult(res.data)
        // Auto-pay the batch
        if (res.data.batchId) {
          await apiService.payBatch(res.data.batchId).catch(() => {})
        }
        setLaunched(true)
      } else {
        setError(res?.message || 'No se pudo lanzar la campaña. Inténtalo de nuevo.')
      }
    } catch {
      setError('Error de conexión. Comprueba tu conexión a internet.')
    } finally {
      setLaunching(false)
    }
  }

  if (launched && launchResult) return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '50vh', flexDirection: 'column', gap: '20px', textAlign: 'center', fontFamily: FONT_BODY }}>
      <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '36px' }}>
        <CheckCircle size={40} color={OK} />
      </div>
      <div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
          ¡Campaña Auto-Buy lanzada!
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', maxWidth: '500px', lineHeight: 1.6 }}>
          Se han creado <strong style={{ color: 'var(--text)' }}>{launchResult.channelCount} campañas</strong> con
          un presupuesto total de <strong style={{ color: PURPLE }}>€{launchResult.totalBudget}</strong>.
          Los canales seleccionados recibirán tu anuncio para publicación.
        </p>
      </div>

      {/* Campaign summary */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', width: '100%', maxWidth: '520px', textAlign: 'left' }}>
        <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 600, color: 'var(--text)', marginBottom: '14px' }}>Canales asignados</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {(launchResult.campaigns || []).map((c, i) => (
            <div key={c._id || i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '10px 12px', background: 'var(--bg)', borderRadius: '10px', border: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>
                  {c.channel?.nombreCanal || c.channel?.plataforma || `Canal ${i + 1}`}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                  {c.channel?.plataforma} · {c.channel?.categoria || category}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: PURPLE }}>€{c.price}</div>
                <div style={{ fontSize: '10px', color: 'var(--muted)' }}>{c.status}</div>
              </div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
          <span style={{ color: 'var(--muted)' }}>Comisión plataforma ({Math.round(launchResult.commissionRate * 100)}%)</span>
          <span style={{ fontWeight: 700, color: 'var(--text)' }}>€{Math.round(launchResult.totalBudget * launchResult.commissionRate)}</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: '10px' }}>
        <button onClick={() => { setLaunched(false); setLaunchResult(null); setStep(1); setAdText(''); setUrl('') }}
          style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '12px 24px', fontSize: '14px', cursor: 'pointer', color: 'var(--text)', fontFamily: FONT_BODY }}>
          Nueva campaña
        </button>
        <button onClick={() => navigate('/advertiser/campaigns')}
          style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: '12px', padding: '12px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>
          Ver mis campañas
        </button>
      </div>
    </div>
  )

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '1100px' }}>

      {/* Header */}
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '26px', fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Zap size={24} color={PURPLE} /> Auto-Buy
        </h1>
        <p style={{ fontSize: '14px', color: 'var(--muted)' }}>La IA selecciona los mejores canales y optimiza tu presupuesto automáticamente</p>
      </div>

      {/* Stepper */}
      <div style={{ display: 'flex', gap: '12px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '16px 20px', alignItems: 'center' }}>
        {['Configuración', 'Contenido del anuncio'].map((s, i) => (
          <React.Fragment key={i}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }} onClick={() => setStep(i + 1)}>
              <div style={{
                width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0,
                background: step > i ? PURPLE : step === i + 1 ? purpleAlpha(0.15) : 'var(--bg2)',
                border: `2px solid ${step >= i + 1 ? PURPLE : 'var(--border)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '12px', fontWeight: 700, color: step > i ? '#fff' : step === i + 1 ? PURPLE : 'var(--muted)',
              }}>{step > i ? <CheckCircle size={14} /> : i + 1}</div>
              <span style={{ fontSize: '13px', fontWeight: step === i + 1 ? 600 : 400, color: step === i + 1 ? 'var(--text)' : 'var(--muted)' }}>{s}</span>
            </div>
            {i < 1 && <div style={{ flex: 1, height: '2px', background: step > 1 ? PURPLE : 'var(--border)', borderRadius: '1px' }} />}
          </React.Fragment>
        ))}
      </div>

      {/* Main layout */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) 300px', gap: '20px', alignItems: 'start' }}>

        {/* Form */}
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '28px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

          {step === 1 && <>
            {/* Budget */}
            <div>
              <label style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '12px' }}>Presupuesto total</label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '12px' }}>
                <div style={{ position: 'relative', flex: 1 }}>
                  <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)', fontSize: '16px' }}>€</span>
                  <input type="number" value={budget} onChange={e => setBudget(Math.max(50, Number(e.target.value)))}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.3)}`, borderRadius: '10px', padding: '11px 14px 11px 30px', fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY, outline: 'none' }} />
                </div>
                <div style={{ background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '12px', padding: '12px 16px', minWidth: '200px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Estimación</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: PURPLE, fontFamily: FONT_DISPLAY }}>~{est.clicks.toLocaleString('es')} clicks</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>CPC estimado: €{est.cpc} · ~{est.impr.toLocaleString('es')} impresiones</div>
                </div>
              </div>
              <input type="range" min={50} max={2000} step={50} value={budget} onChange={e => setBudget(Number(e.target.value))}
                style={{ width: '100%', accentColor: PURPLE }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>
                <span>€50</span><span>€2.000</span>
              </div>
            </div>

            {/* Category */}
            <div>
              <label style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '10px' }}>Categoría del producto</label>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {CATEGORIES.map(c => (
                  <button key={c} onClick={() => setCategory(c)} style={{
                    background: category === c ? PURPLE : 'var(--bg)',
                    border: `1px solid ${category === c ? PURPLE : 'var(--border)'}`,
                    borderRadius: '20px', padding: '7px 14px', fontSize: '13px', fontWeight: category === c ? 600 : 400,
                    color: category === c ? '#fff' : 'var(--muted)', cursor: 'pointer', fontFamily: FONT_BODY, transition: 'all .15s',
                  }}>{c}</button>
                ))}
              </div>
            </div>

            {/* Mode */}
            <div>
              <label style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '10px' }}>Modo de distribución</label>
              <div style={{ display: 'flex', gap: '10px' }}>
                <ModeCard icon={Bot} label="Automático" desc="La IA elige los mejores canales para maximizar tu ROI" badge="Recomendado" selected={mode === 'auto'} onClick={() => setMode('auto')} />
                <ModeCard icon={Heart} label="Mis favoritos" desc="Distribuye entre canales que has marcado como favoritos" selected={mode === 'fav'} onClick={() => setMode('fav')} />
                <ModeCard icon={MousePointer} label="Manual" desc="Elige tú mismo los canales desde el explorador" selected={mode === 'manual'} onClick={() => setMode('manual')} />
              </div>
            </div>
          </>}

          {step === 2 && <>
            <div>
              <label style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>
                Texto del anuncio <span style={{ fontSize: '12px', color: 'var(--muted)', fontWeight: 400 }}>({adText.length}/500 caracteres)</span>
              </label>
              <textarea value={adText} onChange={e => setAdText(e.target.value.slice(0, 500))} placeholder="Escribe el mensaje que se publicará en los canales. Incluye una llamada a la acción clara..." rows={6}
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: '1px solid var(--border-med)', borderRadius: '12px', padding: '14px', fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none', resize: 'none', lineHeight: 1.6 }} />
            </div>

            <div>
              <label style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)', display: 'block', marginBottom: '8px' }}>URL de destino</label>
              <input value={url} onChange={e => setUrl(e.target.value)} placeholder="https://tu-web.com/landing"
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: `1px solid ${url && !url.startsWith('http') ? '#ef4444' : 'var(--border-med)'}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none' }} />
              {url && !url.startsWith('http') && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>La URL debe comenzar con https://</div>}
            </div>

            {/* Preview */}
            {adText && (
              <div>
                <div style={{ fontSize: '12px', fontWeight: 600, color: 'var(--muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Preview del mensaje</div>
                <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '16px', borderLeft: `4px solid ${purpleAlpha(0.6)}` }}>
                  <div style={{ fontSize: '13px', color: 'var(--text)', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>{adText}</div>
                  {url && <div style={{ marginTop: '8px', fontSize: '12px', color: PURPLE, textDecoration: 'underline' }}>{url}</div>}
                </div>
              </div>
            )}
          </>}

          {/* Error message */}
          {error && (
            <div style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.22)', color: '#ef4444', borderRadius: '10px', padding: '12px 14px', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertCircle size={16} /> {error}
            </div>
          )}

          {/* Nav buttons */}
          <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: '8px', borderTop: '1px solid var(--border)' }}>
            <button onClick={() => step > 1 && setStep(1)} style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '10px', padding: '11px 22px', fontSize: '13px', cursor: step > 1 ? 'pointer' : 'default', color: step > 1 ? 'var(--text)' : 'var(--muted2)', fontFamily: FONT_BODY, opacity: step === 1 ? 0.4 : 1 }} disabled={step === 1}>
              ← Anterior
            </button>
            {step === 1
              ? <button onClick={() => setStep(2)} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>Siguiente →</button>
              : <button onClick={handleLaunch} disabled={!adText || !url.startsWith('http') || launching} style={{
                  background: adText && url.startsWith('http') && !launching ? PURPLE : 'var(--muted2)', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '11px 24px', fontSize: '13px', fontWeight: 600,
                  cursor: adText && url.startsWith('http') && !launching ? 'pointer' : 'not-allowed',
                  fontFamily: FONT_BODY, boxShadow: adText && url.startsWith('http') && !launching ? `0 4px 14px ${purpleAlpha(0.35)}` : 'none',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}>
                  {launching ? 'Lanzando...' : <><Zap size={14} /> Lanzar campaña</>}
                </button>
            }
          </div>
        </div>

        {/* Summary panel */}
        <div style={{ position: 'sticky', top: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '20px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 600, color: 'var(--text)' }}>Resumen</h3>
            {[
              { label: 'Presupuesto total', val: `€${budget.toLocaleString('es')}` },
              { label: 'Comisión (25%)', val: `€${commissionAmount}` },
              { label: 'Presupuesto neto', val: `€${netBudget}` },
              { label: 'Clicks esperados', val: `~${est.clicks.toLocaleString('es')}` },
              { label: 'Impresiones', val: `~${est.impr.toLocaleString('es')}` },
              { label: 'CPC estimado', val: `€${est.cpc}` },
            ].map(({ label, val }) => (
              <div key={label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '13px', color: 'var(--muted)' }}>{label}</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY }}>{val}</span>
              </div>
            ))}
          </div>

          {/* Info card */}
          <div style={{ background: purpleAlpha(0.06), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '16px', padding: '18px' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '13px', fontWeight: 600, color: PURPLE, marginBottom: '8px' }}>¿Cómo funciona?</h3>
            <div style={{ fontSize: '12px', color: 'var(--muted)', lineHeight: 1.6, display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <div>1. Seleccionamos los canales con mejor rendimiento para tu categoría</div>
              <div>2. Distribuimos el presupuesto proporcionalmente</div>
              <div>3. Creamos campañas individuales en cada canal</div>
              <div>4. El pago queda en escrow hasta que se confirme la publicación</div>
              <div>5. Tras la publicación, el creador recibe el pago</div>
            </div>
          </div>

          {/* Category + mode summary */}
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '16px', padding: '18px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Categoría</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>{category}</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: 'var(--muted)' }}>Modo</span>
              <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text)' }}>
                {mode === 'auto' ? 'Automático (IA)' : mode === 'fav' ? 'Favoritos' : 'Manual'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
