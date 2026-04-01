import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Bot, Heart, MousePointer, CheckCircle, AlertCircle, ChevronDown, X, Users, Globe, Star, Package } from 'lucide-react'
import apiService from '../../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, TRANSITION, PLATFORM_BRAND,
} from '../../../theme/tokens'


const CATEGORIES = ['Tecnología', 'Negocios', 'Marketing', 'Ecommerce', 'Gaming', 'Fitness', 'Finanzas', 'Diseño', 'Gastronomía']

const calcEstimates = (budget) => {
  const cpc   = 0.16
  const clicks = Math.round(budget / cpc)
  const impr   = Math.round(clicks * 22)
  return { cpc, clicks, impr }
}

const F = FONT_BODY
const D = FONT_DISPLAY

const AUDIENCE_PACKS = [
  { id: 'ecom', name: 'Ecommerce Growth', desc: 'Pack ideal para tiendas online y dropshipping', icon: '\u{1F6D2}', channels: 5, reach: '245K', price: 890, originalPrice: 1200, badge: 'Popular', platforms: ['whatsapp','telegram','discord'], category: 'Ecommerce' },
  { id: 'tech', name: 'Tech Audience ES', desc: 'Audiencia tech hispanohablante de alto engagement', icon: '\u{1F4BB}', channels: 4, reach: '180K', price: 650, originalPrice: 850, badge: null, platforms: ['telegram','discord'], category: 'Tecnología' },
  { id: 'gaming', name: 'Gaming Bundle', desc: 'Gamers activos en Discord, YouTube y Twitch', icon: '\u{1F3AE}', channels: 6, reach: '320K', price: 1100, originalPrice: 1500, badge: 'Premium', platforms: ['discord'], category: 'Gaming' },
  { id: 'fitness', name: 'Fitness & Wellness', desc: 'Comunidades de salud, gym y nutricion', icon: '\u{1F4AA}', channels: 3, reach: '95K', price: 420, originalPrice: 550, badge: 'Nuevo', platforms: ['whatsapp','instagram'], category: 'Fitness' },
  { id: 'mktg', name: 'Marketing Pro', desc: 'Marketers, agencias y growth hackers', icon: '\u{1F4C8}', channels: 5, reach: '210K', price: 780, originalPrice: 1050, badge: 'Popular', platforms: ['telegram','whatsapp'], category: 'Marketing' },
  { id: 'fin', name: 'Finanzas & Crypto', desc: 'Traders, inversores y finanzas personales', icon: '\u{1F4B0}', channels: 4, reach: '150K', price: 580, originalPrice: 760, badge: null, platforms: ['telegram','discord'], category: 'Finanzas' },
]

const RECOMMENDED_CHANNELS = [
  { id: 'rec-1', name: 'Ecom Growth Hub', platform: 'WhatsApp', audience: '12.4K', price: 320, category: 'Ecommerce' },
  { id: 'rec-2', name: 'Tech Audience ES', platform: 'Telegram', audience: '8.2K', price: 450, category: 'Tecnología' },
  { id: 'rec-3', name: 'Gaming Deals Hub', platform: 'Discord', audience: '15K', price: 280, category: 'Gaming' },
  { id: 'rec-4', name: 'Fitness Daily', platform: 'WhatsApp', audience: '6.5K', price: 200, category: 'Fitness' },
]

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

  // Favorites lists from localStorage
  const [favLists, setFavLists] = useState(() => JSON.parse(localStorage.getItem('adflow-fav-lists') || '[]'))
  const [selectedListId, setSelectedListId] = useState('all')
  const [favChannelDetails, setFavChannelDetails] = useState([])

  // Manual mode
  const [showRecommended, setShowRecommended] = useState(false)
  const [manualChannels, setManualChannels] = useState(() => JSON.parse(localStorage.getItem('adflow-autobuy-channels') || '[]'))

  // Pack selection
  const [selectedPack, setSelectedPack] = useState(null)

  // Persist form draft
  useEffect(() => {
    const draft = { budget, category, mode, adText, url }
    localStorage.setItem('adflow-autobuy-draft', JSON.stringify(draft))
  }, [budget, category, mode, adText, url])

  // Restore draft on mount
  useEffect(() => {
    const saved = localStorage.getItem('adflow-autobuy-draft')
    if (saved) {
      try {
        const d = JSON.parse(saved)
        if (d.budget) setBudget(d.budget)
        if (d.category) setCategory(d.category)
        if (d.mode) setMode(d.mode)
        if (d.adText) setAdText(d.adText)
        if (d.url) setUrl(d.url)
      } catch {}
    }
  }, [])

  const est = calcEstimates(budget)
  const commissionRate = 0.15
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
        // Auto-pay each campaign in the batch
        const campaigns = res.data.campaigns || []
        for (const c of campaigns) {
          const cId = c._id || c.id
          if (cId) await apiService.payCampaign(cId).catch(() => {})
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
                <ModeCard icon={MousePointer} label="Manual" desc="Elige tú mismo los canales desde el explorador" selected={mode === 'manual'} onClick={() => { setMode('manual'); setShowRecommended(true) }} />
              </div>

              {mode === 'fav' && (
                <div style={{ marginTop: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Seleccionar lista</span>
                    <select value={selectedListId} onChange={e => setSelectedListId(e.target.value)} style={{
                      background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                      borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontFamily: F,
                    }}>
                      {favLists.map(l => (
                        <option key={l.id} value={l.id}>{l.icon} {l.name} ({l.channels.length})</option>
                      ))}
                    </select>
                  </div>
                  {(() => {
                    const list = favLists.find(l => l.id === selectedListId)
                    const channelIds = list?.channels || []
                    if (channelIds.length === 0) return (
                      <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>
                        <p style={{ marginBottom: '8px' }}>No hay canales en esta lista.</p>
                        <button onClick={() => navigate('/advertiser/explore')} style={{
                          background: PURPLE, color: '#fff', border: 'none', borderRadius: '8px',
                          padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
                        }}>Ir al explorador</button>
                      </div>
                    )
                    return (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        {channelIds.map(id => (
                          <div key={id} style={{
                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                            padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px',
                            border: '1px solid var(--border)', fontSize: '13px',
                          }}>
                            <span style={{ color: 'var(--text)', fontWeight: 500 }}>Canal #{id.slice(-4)}</span>
                            <span style={{ color: 'var(--muted)', fontSize: '11px' }}>Incluido</span>
                          </div>
                        ))}
                        <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                          {channelIds.length} canal{channelIds.length !== 1 ? 'es' : ''} seleccionado{channelIds.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    )
                  })()}
                </div>
              )}

              {mode === 'manual' && manualChannels.length > 0 && (
                <div style={{ marginTop: '16px', background: 'var(--bg)', borderRadius: '12px', border: '1px solid var(--border)', padding: '16px' }}>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', marginBottom: '10px' }}>
                    Canales seleccionados ({manualChannels.length})
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                    {manualChannels.map(ch => (
                      <div key={ch.id} style={{
                        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                        padding: '8px 12px', background: 'var(--surface)', borderRadius: '8px',
                        border: '1px solid var(--border)', fontSize: '13px',
                      }}>
                        <div>
                          <span style={{ color: 'var(--text)', fontWeight: 500 }}>{ch.name}</span>
                          <span style={{ color: 'var(--muted)', fontSize: '11px', marginLeft: '8px' }}>{ch.platform}</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 600, fontSize: '12px' }}>{'\u20AC'}{ch.price}</span>
                          <button onClick={() => setManualChannels(prev => prev.filter(m => m.id !== ch.id))} style={{
                            background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '14px',
                          }}>{'\u00D7'}</button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <button onClick={() => navigate('/advertiser/explore?from=autobuy')} style={{
                    marginTop: '10px', background: 'transparent', color: PURPLE, border: `1px solid ${purpleAlpha(0.3)}`,
                    borderRadius: '8px', padding: '6px 14px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
                  }}>+ Agregar mas canales</button>
                </div>
              )}
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

      {/* ── Packs de Audiencias ── */}
      {!launched && (
        <div style={{ marginTop: '48px', paddingTop: '40px', borderTop: '1px solid var(--border)' }}>
          <div style={{ marginBottom: '24px' }}>
            <h2 style={{ fontFamily: D, fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '6px' }}>
              Packs de Audiencias
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--muted)' }}>
              Distribuye tu publicidad en multiples canales con un solo clic. Ahorra hasta un 26% vs contratacion individual.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            {AUDIENCE_PACKS.map(pack => {
              const isSelected = selectedPack === pack.id
              const discount = Math.round((1 - pack.price / pack.originalPrice) * 100)
              return (
                <div key={pack.id} style={{
                  background: 'var(--surface)', border: `1px solid ${isSelected ? PURPLE : 'var(--border)'}`,
                  borderRadius: '16px', padding: '24px', position: 'relative',
                  cursor: 'pointer', transition: 'all 200ms ease',
                  boxShadow: isSelected ? `0 0 0 1px ${PURPLE}, 0 8px 24px ${purpleAlpha(0.15)}` : 'none',
                }} onClick={() => {
                  setSelectedPack(isSelected ? null : pack.id)
                  if (!isSelected) {
                    setBudget(pack.price)
                    setCategory(pack.category)
                    setMode('auto')
                  }
                }}>
                  {/* Badge */}
                  {pack.badge && (
                    <span style={{
                      position: 'absolute', top: '-8px', right: '16px',
                      background: pack.badge === 'Popular' ? PURPLE
                        : pack.badge === 'Premium' ? WARN
                        : pack.badge === 'Nuevo' ? OK : 'var(--muted)',
                      color: '#fff', borderRadius: '6px', padding: '3px 10px',
                      fontSize: '10px', fontWeight: 700, textTransform: 'uppercase',
                      letterSpacing: '0.04em',
                    }}>{pack.badge}</span>
                  )}

                  {/* Icon + Name */}
                  <div style={{ fontSize: '28px', marginBottom: '10px' }}>{pack.icon}</div>
                  <h3 style={{ fontFamily: D, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                    {pack.name}
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '14px', lineHeight: 1.5 }}>
                    {pack.desc}
                  </p>

                  {/* Stats */}
                  <div style={{ display: 'flex', gap: '12px', marginBottom: '14px', fontSize: '12px' }}>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                      <span style={{ color: 'var(--muted)' }}>{pack.channels}</span> canales
                    </span>
                    <span style={{ color: 'var(--text)', fontWeight: 500 }}>
                      ~<span style={{ color: 'var(--muted)' }}>{pack.reach}</span> alcance
                    </span>
                  </div>

                  {/* Platform icons */}
                  <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                    {pack.platforms.map(p => {
                      const pb = PLATFORM_BRAND[p]
                      return pb ? (
                        <span key={p} style={{
                          background: pb.bg, color: pb.color, borderRadius: '4px',
                          padding: '2px 6px', fontSize: '10px', fontWeight: 600,
                        }}>{pb.label}</span>
                      ) : null
                    })}
                  </div>

                  {/* Price */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                    <span style={{ fontFamily: D, fontSize: '22px', fontWeight: 800, color: 'var(--text)' }}>{'\u20AC'}{pack.price}</span>
                    <span style={{ fontSize: '13px', color: 'var(--muted)', textDecoration: 'line-through' }}>{'\u20AC'}{pack.originalPrice}</span>
                    <span style={{
                      fontSize: '11px', fontWeight: 700, color: OK,
                      background: `${OK}18`, borderRadius: '4px', padding: '1px 6px',
                    }}>-{discount}%</span>
                  </div>

                  {/* CTA */}
                  <button style={{
                    width: '100%', marginTop: '16px',
                    background: isSelected ? PURPLE : 'transparent',
                    color: isSelected ? '#fff' : PURPLE,
                    border: `1px solid ${isSelected ? PURPLE : purpleAlpha(0.3)}`,
                    borderRadius: '10px', padding: '10px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: F, transition: 'all 150ms ease',
                  }}>
                    {isSelected ? '\u2713 Pack seleccionado' : 'Seleccionar pack'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Recommended channels modal ── */}
      {showRecommended && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', zIndex: 100,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px',
          backdropFilter: 'blur(4px)',
        }} onClick={() => setShowRecommended(false)}>
          <div onClick={e => e.stopPropagation()} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: '20px', padding: '32px', maxWidth: '520px', width: '100%',
            boxShadow: '0 24px 60px rgba(0,0,0,0.35)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <div>
                <h3 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', margin: 0 }}>Recomendados para ti</h3>
                <p style={{ fontSize: '13px', color: 'var(--muted)', marginTop: '4px' }}>Canales sugeridos para la categoria "{category}"</p>
              </div>
              <button onClick={() => setShowRecommended(false)} style={{
                background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', padding: '4px',
              }}><X size={18} /></button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
              {RECOMMENDED_CHANNELS.filter(c => !category || c.category === category || category === 'Todas').slice(0, 4).map(ch => {
                const selected = manualChannels.find(m => m.id === ch.id)
                return (
                  <div key={ch.id} onClick={() => {
                    if (selected) setManualChannels(prev => prev.filter(m => m.id !== ch.id))
                    else setManualChannels(prev => [...prev, ch])
                  }} style={{
                    display: 'flex', alignItems: 'center', gap: '12px',
                    padding: '12px 14px', background: selected ? purpleAlpha(0.06) : 'var(--bg)',
                    border: `1px solid ${selected ? purpleAlpha(0.25) : 'var(--border)'}`,
                    borderRadius: '10px', cursor: 'pointer', transition: 'all 150ms ease',
                  }}>
                    <div style={{
                      width: '36px', height: '36px', borderRadius: '10px',
                      background: (PLATFORM_BRAND[ch.platform.toLowerCase()] || {}).bg || purpleAlpha(0.1),
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '14px', fontWeight: 700,
                      color: (PLATFORM_BRAND[ch.platform.toLowerCase()] || {}).color || PURPLE,
                    }}>{ch.name.slice(0,2).toUpperCase()}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>{ch.name}</div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{ch.platform} {'\u00B7'} {ch.audience} seguidores</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{'\u20AC'}{ch.price}</div>
                      <div style={{ fontSize: '10px', color: 'var(--muted)' }}>/post</div>
                    </div>
                    <div style={{
                      width: '20px', height: '20px', borderRadius: '50%',
                      border: `2px solid ${selected ? PURPLE : 'var(--border)'}`,
                      background: selected ? PURPLE : 'transparent',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      {selected && <span style={{ color: '#fff', fontSize: '12px', fontWeight: 700 }}>{'\u2713'}</span>}
                    </div>
                  </div>
                )
              })}
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={() => {
                localStorage.setItem('adflow-autobuy-channels', JSON.stringify(manualChannels))
                setShowRecommended(false)
              }} style={{
                flex: 1, background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px',
                padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}>
                Seleccionar ({manualChannels.length})
              </button>
              <button onClick={() => {
                localStorage.setItem('adflow-autobuy-channels', JSON.stringify(manualChannels))
                setShowRecommended(false)
                navigate('/advertiser/explore?from=autobuy')
              }} style={{
                flex: 1, background: 'var(--bg)', color: 'var(--text)', border: '1px solid var(--border)',
                borderRadius: '10px', padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}>
                Ir al explorador
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
