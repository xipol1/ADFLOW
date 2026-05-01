import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Zap, Bot, Heart, MousePointer, CheckCircle, AlertCircle, ChevronDown, X, Users, Globe, Star, Package, TrendingUp } from 'lucide-react'
import apiService from '../../../../services/api'
import {
  PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY, OK, WARN, TRANSITION, PLATFORM_BRAND,
} from '../../../theme/tokens'
import { PACKS, getPackDiscount, getLaunchUrgency, getPricingBreakdown, getAutoBuyCommissionRate } from '../../../theme/pricing'


const CATEGORIES = ['Tecnología', 'Negocios', 'Marketing', 'Ecommerce', 'Gaming', 'Fitness', 'Finanzas', 'Diseño', 'Gastronomía']

const calcEstimates = (budget) => {
  const cpc   = 0.16
  const clicks = Math.round(budget / cpc)
  const impr   = Math.round(clicks * 22)
  return { cpc, clicks, impr }
}

const F = FONT_BODY
const D = FONT_DISPLAY


// Recommended channels — fetched from API on mount
const RECOMMENDED_CHANNELS_FALLBACK = []

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

  // Favorites lists — fetched from API, fallback to localStorage
  const [favLists, setFavLists] = useState(() => JSON.parse(localStorage.getItem('channelad-fav-lists') || '[]'))
  const [selectedListId, setSelectedListId] = useState('')
  const [favChannelDetails, setFavChannelDetails] = useState([])

  const reloadLists = useCallback(async () => {
    try {
      const res = await apiService.getMyLists()
      if (res?.success) {
        const items = Array.isArray(res.data) ? res.data : res.data?.items || []
        setFavLists(items.map(l => ({
          id: l._id || l.id,
          name: l.name || l.nombre || 'Lista',
          icon: l.icon || '',
          channels: l.channels || [],
        })))
        setSelectedListId(prev => prev || (items[0] && (items[0]._id || items[0].id)) || '')
      }
    } catch (err) { console.error('AutoBuyPage.fetchLists failed:', err) }
  }, [])

  useEffect(() => { reloadLists() }, [reloadLists])

  // Fetch channel details for the selected list (so we can render names instead of IDs)
  useEffect(() => {
    let cancelled = false
    const list = favLists.find(l => l.id === selectedListId)
    const channelIds = list?.channels || []
    if (channelIds.length === 0) { setFavChannelDetails([]); return }
    // Channels in the list may be either ObjectId strings or already-populated objects
    const ids = channelIds.map(c => (typeof c === 'object' ? (c._id || c.id) : c)).filter(Boolean)
    Promise.all(ids.map(id => apiService.getChannelById(id).catch(() => null)))
      .then(results => {
        if (cancelled) return
        const details = results
          .map(r => r?.data || null)
          .filter(Boolean)
        setFavChannelDetails(details)
      })
    return () => { cancelled = true }
  }, [selectedListId, favLists])

  const handleDeleteList = async () => {
    if (!selectedListId) return
    if (!window.confirm('¿Eliminar esta lista? No se pueden recuperar los canales guardados (los canales en sí no se borran).')) return
    try {
      const res = await apiService.deleteList(selectedListId)
      if (res?.success) {
        setSelectedListId('')
        await reloadLists()
      } else {
        setError(res?.message || 'No se pudo eliminar la lista')
      }
    } catch (err) {
      setError(err?.message || 'Error eliminando la lista')
    }
  }

  const handleRemoveFromList = async (channelId) => {
    if (!selectedListId) return
    try {
      const res = await apiService.removeChannelFromList(selectedListId, channelId)
      if (res?.success) await reloadLists()
    } catch (err) { console.error('removeChannelFromList failed:', err) }
  }

  // Manual mode
  const [showRecommended, setShowRecommended] = useState(false)
  const [manualChannels, setManualChannels] = useState(() => JSON.parse(localStorage.getItem('channelad-autobuy-channels') || '[]'))

  // Pack selection
  const [selectedPack, setSelectedPack] = useState(null)

  // Recommended channels from API
  const [recommendedChannels, setRecommendedChannels] = useState(RECOMMENDED_CHANNELS_FALLBACK)
  const [loadingRec, setLoadingRec] = useState(false)

  useEffect(() => {
    let cancelled = false
    const fetchRecommended = async () => {
      setLoadingRec(true)
      try {
        const params = { limit: 20, status: 'activo' }
        if (category) params.category = category
        const res = await apiService.searchChannels(params)
        if (cancelled) return
        if (res?.success) {
          const items = Array.isArray(res.data) ? res.data : res.data?.items || []
          setRecommendedChannels(items.map(ch => ({
            id: ch._id || ch.id,
            name: ch.nombreCanal || ch.nombre || ch.name || 'Canal',
            platform: ch.plataforma || ch.platform || 'Telegram',
            audience: ch.estadisticas?.seguidores || ch.audience || 0,
            audienceLabel: (ch.estadisticas?.seguidores || ch.audience || 0).toLocaleString('es'),
            price: ch.precio || ch.price || 0,
            category: ch.categoria || ch.category || '',
          })))
        }
      } catch (err) { console.error('AutoBuyPage.fetchRecommended failed:', err) /* keep empty fallback */ }
      if (!cancelled) setLoadingRec(false)
    }
    fetchRecommended()
    return () => { cancelled = true }
  }, [category])

  const urgency = getLaunchUrgency()
  const draftRestored = React.useRef(false)

  // Restore draft on mount (MUST run before save effect)
  useEffect(() => {
    const saved = localStorage.getItem('channelad-autobuy-draft')
    if (saved) {
      try {
        const d = JSON.parse(saved)
        if (d.budget) setBudget(d.budget)
        if (d.category) setCategory(d.category)
        if (d.mode) setMode(d.mode)
        if (d.adText) setAdText(d.adText)
        if (d.url) setUrl(d.url)
      } catch (err) { console.error('AutoBuyPage.restoreDraft parse failed:', err) }
    }
    draftRestored.current = true
  }, [])

  // Persist form draft (skip initial render to avoid overwriting restored draft)
  useEffect(() => {
    if (!draftRestored.current) return
    const draft = { budget, category, mode, adText, url }
    localStorage.setItem('channelad-autobuy-draft', JSON.stringify(draft))
  }, [budget, category, mode, adText, url])

  // Simulate budget distribution across available channels (mirrors backend logic)
  const previewAllocation = useMemo(() => {
    if (recommendedChannels.length === 0) return { channels: [], totalSpent: 0, remaining: budget }
    const sorted = [...recommendedChannels]
      .filter(ch => ch.price > 0)
      .sort((a, b) => (b.audience || 0) - (a.audience || 0))
    let remaining = budget
    const selected = []
    for (const ch of sorted) {
      if (ch.price > remaining) continue
      selected.push({ ...ch, allocated: true })
      remaining -= ch.price
      if (remaining <= 0) break
    }
    return { channels: selected, totalSpent: budget - remaining, remaining }
  }, [budget, recommendedChannels])

  const est = calcEstimates(budget)
  const commissionRate = getAutoBuyCommissionRate(mode === 'auto' ? 'autobuy_optimized' : 'autobuy_basic')
  const commissionAmount = Math.round(budget * commissionRate * 100) / 100
  const netBudget = budget - commissionAmount

  const handleLaunch = async () => {
    // Step 1 validation: ensure channels exist for fav/manual modes
    if (mode === 'fav') {
      const list = favLists.find(l => l.id === selectedListId)
      if (!list?.channels?.length) {
        setError('Selecciona una lista con canales antes de lanzar.')
        return
      }
    }
    if (mode === 'manual' && manualChannels.length === 0) {
      setError('Selecciona al menos un canal en modo manual.')
      return
    }

    setLaunching(true)
    setError('')
    try {
      const payload = {
        budget,
        category,
        mode,
        content: adText.trim(),
        targetUrl: url.trim(),
      }
      // Include channel data based on mode
      if (mode === 'manual' && manualChannels.length > 0) {
        payload.channels = manualChannels.map(ch => ch.id)
      }
      if (mode === 'fav' && selectedListId) {
        payload.listId = selectedListId
      }

      const res = await apiService.launchAutoCampaign(payload)
      if (res?.success && res.data) {
        setLaunchResult(res.data)
        // Auto-pay each campaign in the batch
        const campaigns = res.data.campaigns || []
        const payErrors = []
        for (const c of campaigns) {
          const cId = c._id || c.id
          if (cId) {
            const payRes = await apiService.payCampaign(cId)
            if (payRes && !payRes.success) {
              payErrors.push(c.channel?.nombreCanal || `Canal ${cId}`)
            }
          }
        }
        setLaunched(true)
        if (payErrors.length > 0) {
          setError(`Campañas creadas, pero el pago falló para: ${payErrors.join(', ')}. Puedes reintentar desde "Mis campañas".`)
        }
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

      {/* Launch urgency banner */}
      {urgency.active && (
        <div style={{
          background: urgency.severity === 'critical'
            ? 'linear-gradient(135deg, rgba(239,68,68,0.12) 0%, rgba(239,68,68,0.04) 100%)'
            : urgency.severity === 'warning'
              ? 'linear-gradient(135deg, rgba(245,158,11,0.12) 0%, rgba(245,158,11,0.04) 100%)'
              : `linear-gradient(135deg, ${purpleAlpha(0.10)} 0%, ${purpleAlpha(0.03)} 100%)`,
          border: `1px solid ${urgency.severity === 'critical' ? 'rgba(239,68,68,0.2)' : urgency.severity === 'warning' ? 'rgba(245,158,11,0.2)' : purpleAlpha(0.15)}`,
          borderRadius: '12px', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          marginBottom: '24px', fontSize: '13px', fontWeight: 600,
          color: urgency.severity === 'critical' ? '#ef4444' : urgency.severity === 'warning' ? '#f59e0b' : PURPLE,
          fontFamily: F,
        }}>
          <span style={{ fontSize: '15px' }}>{urgency.severity === 'critical' ? '\u{1F525}' : urgency.severity === 'warning' ? '\u23F0' : '\u{1F680}'}</span>
          {urgency.message}
        </div>
      )}

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
                  <input type="number" value={budget} min={50} max={5000} onChange={e => setBudget(Math.min(5000, Math.max(50, Number(e.target.value))))}
                    style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: `1px solid ${purpleAlpha(0.3)}`, borderRadius: '10px', padding: '11px 14px 11px 30px', fontSize: '18px', fontWeight: 700, color: 'var(--text)', fontFamily: FONT_DISPLAY, outline: 'none' }} />
                </div>
                <div style={{ background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: '12px', padding: '12px 16px', minWidth: '200px' }}>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px' }}>Estimación</div>
                  <div style={{ fontSize: '14px', fontWeight: 700, color: PURPLE, fontFamily: FONT_DISPLAY }}>~{est.clicks.toLocaleString('es')} clicks</div>
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '2px' }}>CPC estimado: €{est.cpc} · ~{est.impr.toLocaleString('es')} impresiones</div>
                </div>
              </div>
              <input type="range" min={50} max={5000} step={50} value={Math.min(budget, 5000)} onChange={e => setBudget(Number(e.target.value))}
                style={{ width: '100%', accentColor: PURPLE }} />
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted2)', marginTop: '4px' }}>
                <span>€50</span><span>€5.000</span>
              </div>
            </div>

            {/* Channel preview based on budget */}
            {mode === 'auto' && (
              <div style={{ background: 'var(--bg)', borderRadius: '14px', border: '1px solid var(--border)', padding: '18px' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ width: '28px', height: '28px', borderRadius: '8px', background: purpleAlpha(0.12), display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <TrendingUp size={14} color={PURPLE} />
                    </div>
                    <div>
                      <div style={{ fontFamily: FONT_DISPLAY, fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        Canales recomendados
                      </div>
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                        Asignacion estimada para tu presupuesto
                      </div>
                    </div>
                  </div>
                  {previewAllocation.channels.length > 0 && (
                    <span style={{ fontSize: '12px', fontWeight: 700, color: PURPLE, background: purpleAlpha(0.08), borderRadius: '8px', padding: '4px 10px' }}>
                      {previewAllocation.channels.length} canal{previewAllocation.channels.length !== 1 ? 'es' : ''}
                    </span>
                  )}
                </div>

                {loadingRec ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '13px' }}>
                    Buscando los mejores canales...
                  </div>
                ) : previewAllocation.channels.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '16px', color: 'var(--muted)', fontSize: '13px' }}>
                    {recommendedChannels.length === 0
                      ? 'No hay canales disponibles en esta categoria'
                      : 'Presupuesto insuficiente para los canales disponibles. Aumenta el presupuesto.'}
                  </div>
                ) : (
                  <>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {previewAllocation.channels.map((ch, i) => {
                        const brand = PLATFORM_BRAND[ch.platform.toLowerCase()] || {}
                        return (
                          <div key={ch.id} style={{
                            display: 'flex', alignItems: 'center', gap: '10px',
                            padding: '10px 12px', background: 'var(--surface)',
                            borderRadius: '10px', border: '1px solid var(--border)',
                            transition: 'all .15s',
                          }}>
                            <div style={{
                              width: '34px', height: '34px', borderRadius: '9px', flexShrink: 0,
                              background: brand.bg || purpleAlpha(0.1),
                              display: 'flex', alignItems: 'center', justifyContent: 'center',
                              fontSize: '12px', fontWeight: 700,
                              color: brand.color || PURPLE,
                            }}>
                              {ch.name.slice(0, 2).toUpperCase()}
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {ch.name}
                              </div>
                              <div style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                                <span style={{ color: brand.color || 'var(--muted)', fontWeight: 600 }}>{brand.label || ch.platform}</span>
                                <span>{'\u00B7'}</span>
                                <span>{ch.audienceLabel} subs</span>
                              </div>
                            </div>
                            <div style={{ textAlign: 'right', flexShrink: 0 }}>
                              <div style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 700, color: 'var(--text)' }}>{'\u20AC'}{ch.price}</div>
                            </div>
                          </div>
                        )
                      })}
                    </div>

                    {/* Allocation summary */}
                    <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ fontSize: '12px', color: 'var(--muted)' }}>
                        Presupuesto asignado: <strong style={{ color: 'var(--text)' }}>{'\u20AC'}{previewAllocation.totalSpent}</strong>
                        {previewAllocation.remaining > 0 && (
                          <span> · {'\u20AC'}{previewAllocation.remaining} sin asignar</span>
                        )}
                      </div>
                      <div style={{ fontSize: '11px', color: OK, fontWeight: 600 }}>
                        Alcance est. ~{previewAllocation.channels.reduce((s, c) => s + (c.audience || 0), 0).toLocaleString('es')}
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

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
                  {favLists.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '24px 12px' }}>
                      <div style={{ fontSize: '13px', color: 'var(--text)', fontWeight: 600, marginBottom: '6px' }}>
                        Aún no tienes listas guardadas
                      </div>
                      <p style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px', lineHeight: 1.5 }}>
                        Ve al explorador y guarda tus canales favoritos en una lista para reutilizarlos aquí.
                      </p>
                      <button onClick={() => navigate('/advertiser/explore')} style={{
                        background: PURPLE, color: '#fff', border: 'none', borderRadius: '8px',
                        padding: '8px 16px', fontSize: '12px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
                      }}>Ir al explorador</button>
                    </div>
                  ) : (
                    <>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)' }}>Seleccionar lista</span>
                        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                          <select value={selectedListId} onChange={e => setSelectedListId(e.target.value)} style={{
                            background: 'var(--surface)', color: 'var(--text)', border: '1px solid var(--border)',
                            borderRadius: '8px', padding: '6px 10px', fontSize: '12px', fontFamily: F,
                          }}>
                            {favLists.map(l => (
                              <option key={l.id} value={l.id}>{l.icon} {l.name} ({l.channels.length})</option>
                            ))}
                          </select>
                          {selectedListId && (
                            <button onClick={handleDeleteList}
                              title="Eliminar lista"
                              style={{
                                background: 'rgba(239,68,68,0.08)', color: '#ef4444',
                                border: '1px solid rgba(239,68,68,0.25)', borderRadius: '8px',
                                padding: '6px 10px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                fontFamily: F,
                              }}>
                              Eliminar
                            </button>
                          )}
                        </div>
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
                            }}>Añadir canales</button>
                          </div>
                        )
                        return (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {channelIds.map(rawId => {
                              const id = typeof rawId === 'object' ? (rawId._id || rawId.id) : rawId
                              const detail = favChannelDetails.find(d => (d.id || d._id) === id) || (typeof rawId === 'object' ? rawId : null)
                              const name = detail?.nombreCanal || detail?.nombre || detail?.identificadorCanal || `Canal #${String(id).slice(-4)}`
                              const platform = detail?.plataforma
                              const subs = detail?.audiencia ?? detail?.seguidores
                              const cas = detail?.CAS
                              return (
                                <div key={id} style={{
                                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                  padding: '10px 12px', background: 'var(--surface)', borderRadius: '8px',
                                  border: '1px solid var(--border)', fontSize: '13px',
                                }}>
                                  <div style={{ minWidth: 0, flex: 1 }}>
                                    <div style={{ color: 'var(--text)', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                      {name}
                                    </div>
                                    <div style={{ display: 'flex', gap: '8px', marginTop: '2px', fontSize: '11px', color: 'var(--muted)' }}>
                                      {platform && <span>{platform}</span>}
                                      {subs != null && <span>· {subs >= 1000 ? `${(subs/1000).toFixed(1)}K` : subs} subs</span>}
                                      {cas != null && <span>· CAS {cas}</span>}
                                    </div>
                                  </div>
                                  <button onClick={() => handleRemoveFromList(id)}
                                    title="Quitar de la lista"
                                    style={{
                                      background: 'none', border: 'none', color: 'var(--muted)',
                                      cursor: 'pointer', fontSize: '16px', padding: '4px 8px',
                                      lineHeight: 1, marginLeft: '8px',
                                    }}>×</button>
                                </div>
                              )
                            })}
                            <div style={{ fontSize: '11px', color: 'var(--muted)', marginTop: '4px' }}>
                              {channelIds.length} canal{channelIds.length !== 1 ? 'es' : ''} en la lista
                            </div>
                          </div>
                        )
                      })()}
                    </>
                  )}
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
                style={{ width: '100%', boxSizing: 'border-box', background: 'var(--bg)', border: `1px solid ${url && !url.startsWith('https://') ? '#ef4444' : 'var(--border-med)'}`, borderRadius: '10px', padding: '11px 14px', fontSize: '14px', color: 'var(--text)', fontFamily: FONT_BODY, outline: 'none' }} />
              {url && !url.startsWith('https://') && <div style={{ fontSize: '12px', color: '#ef4444', marginTop: '4px' }}>La URL debe comenzar con https://</div>}
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
              ? <button onClick={() => {
                  if (mode === 'fav') {
                    const list = favLists.find(l => l.id === selectedListId)
                    if (!list?.channels?.length) { setError('Selecciona una lista con canales antes de continuar.'); return }
                  }
                  if (mode === 'manual' && manualChannels.length === 0) { setError('Selecciona al menos un canal en modo manual.'); return }
                  setError('')
                  setStep(2)
                }} style={{ background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px', padding: '11px 24px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: FONT_BODY }}>Siguiente →</button>
              : <button onClick={handleLaunch} disabled={!adText || !url.startsWith('https://') || launching} style={{
                  background: adText && url.startsWith('https://') && !launching ? PURPLE : 'var(--muted2)', color: '#fff', border: 'none', borderRadius: '10px',
                  padding: '11px 24px', fontSize: '13px', fontWeight: 600,
                  cursor: adText && url.startsWith('https://') && !launching ? 'pointer' : 'not-allowed',
                  fontFamily: FONT_BODY, boxShadow: adText && url.startsWith('https://') && !launching ? `0 4px 14px ${purpleAlpha(0.35)}` : 'none',
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
              { label: `Comisión (${Math.round(commissionRate * 100)}%)`, val: `€${commissionAmount}` },
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

      {/* ── Pricing Packs — Premium Design ── */}
      {!launched && (
        <div style={{ marginTop: '56px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
          {/* Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <h2 style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px', marginBottom: '10px' }}>
              Selecciona tu inversion
            </h2>
            <p style={{ fontSize: '15px', color: 'var(--muted)', maxWidth: '460px', margin: '0 auto', lineHeight: 1.7 }}>
              Accede a precios optimizados gracias a la automatizacion de ChannelAd
            </p>
          </div>

          {/* Row 1: Starter / Growth / Pro (highlight) / Scale */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '16px' }}>
            {PACKS.filter(p => p.row === 1).map(pack => {
              const discount = getPackDiscount(pack)
              const isSelected = selectedPack === pack.id
              const isHighlight = pack.highlight

              return (
                <div key={pack.id} style={{
                  position: 'relative',
                  background: isHighlight
                    ? `linear-gradient(180deg, ${purpleAlpha(0.06)} 0%, var(--surface) 100%)`
                    : 'var(--surface)',
                  border: `${isHighlight ? '2px' : '1px'} solid ${isSelected ? PURPLE : isHighlight ? purpleAlpha(0.4) : 'var(--border)'}`,
                  borderRadius: '20px',
                  padding: isHighlight ? '28px 24px' : '24px',
                  cursor: 'pointer',
                  transition: 'all 250ms cubic-bezier(.4,0,.2,1)',
                  boxShadow: isSelected
                    ? `0 0 0 1px ${PURPLE}, 0 16px 40px ${purpleAlpha(0.2)}`
                    : isHighlight
                      ? `0 8px 32px ${purpleAlpha(0.12)}, 0 0 80px ${purpleAlpha(0.06)}`
                      : 'none',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
                  onClick={() => {
                    setSelectedPack(isSelected ? null : pack.id)
                    if (!isSelected) setBudget(pack.finalPrice)
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-4px)'
                      e.currentTarget.style.boxShadow = isHighlight
                        ? `0 16px 48px ${purpleAlpha(0.2)}, 0 0 100px ${purpleAlpha(0.08)}`
                        : `0 12px 36px rgba(0,0,0,0.15)`
                      e.currentTarget.style.borderColor = isHighlight ? PURPLE : 'var(--border-med)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = isHighlight
                        ? `0 8px 32px ${purpleAlpha(0.12)}, 0 0 80px ${purpleAlpha(0.06)}`
                        : 'none'
                      e.currentTarget.style.borderColor = isHighlight ? purpleAlpha(0.4) : 'var(--border)'
                    }
                  }}
                >
                  {/* Badge */}
                  {pack.badge && (
                    <div style={{
                      position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                      background: `linear-gradient(135deg, ${PURPLE} 0%, #a78bfa 100%)`,
                      color: '#fff', borderRadius: '20px', padding: '4px 16px',
                      fontSize: '11px', fontWeight: 700, letterSpacing: '0.03em',
                      boxShadow: `0 4px 12px ${purpleAlpha(0.3)}`,
                      whiteSpace: 'nowrap',
                    }}>
                      {pack.badge}
                    </div>
                  )}

                  {/* Pack name */}
                  <h3 style={{
                    fontFamily: D, fontSize: '18px', fontWeight: 700,
                    color: 'var(--text)', marginBottom: '16px',
                    marginTop: pack.badge ? '8px' : '0',
                  }}>
                    {pack.name}
                  </h3>

                  {/* Market price label */}
                  <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '4px', fontWeight: 500 }}>
                    Precio medio de mercado
                  </div>

                  {/* Prices */}
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px', marginBottom: '6px' }}>
                    <span style={{
                      fontFamily: D, fontSize: '36px', fontWeight: 800,
                      color: 'var(--text)', letterSpacing: '-1px', lineHeight: 1,
                    }}>
                      {'\u20AC'}{pack.finalPrice}
                    </span>
                    <span style={{
                      fontSize: '16px', color: 'var(--muted2)',
                      textDecoration: 'line-through', fontWeight: 500,
                    }}>
                      {'\u20AC'}{pack.marketPrice}
                    </span>
                  </div>

                  {/* Discount badge */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: '4px',
                    background: 'rgba(16,185,129,0.1)', color: '#10b981',
                    borderRadius: '6px', padding: '3px 8px',
                    fontSize: '12px', fontWeight: 700, marginBottom: '20px',
                  }}>
                    -{discount}%
                  </div>

                  {/* Features */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
                    {pack.features.map(f => (
                      <div key={f} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--muted)' }}>
                        <span style={{ color: '#10b981', fontSize: '14px', flexShrink: 0 }}>{'\u2713'}</span>
                        {f}
                      </div>
                    ))}
                  </div>

                  {/* Reach + channels */}
                  <div style={{
                    fontSize: '12px', color: 'var(--muted)', marginBottom: '16px',
                    display: 'flex', gap: '12px',
                  }}>
                    <span>{pack.channels} canales</span>
                    <span>{pack.reach} alcance</span>
                  </div>

                  {/* CTA */}
                  <button style={{
                    width: '100%',
                    background: isSelected ? PURPLE : isHighlight ? PURPLE : 'transparent',
                    color: isSelected ? '#fff' : isHighlight ? '#fff' : 'var(--text)',
                    border: `1px solid ${isSelected || isHighlight ? PURPLE : 'var(--border)'}`,
                    borderRadius: '12px', padding: '12px', fontSize: '14px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: F,
                    transition: 'all 200ms cubic-bezier(.4,0,.2,1)',
                  }}>
                    {isSelected ? '\u2713 Seleccionado' : 'Seleccionar'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Row 2: Performance / Dominance */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '24px' }}>
            {PACKS.filter(p => p.row === 2).map(pack => {
              const discount = getPackDiscount(pack)
              const isSelected = selectedPack === pack.id

              return (
                <div key={pack.id} style={{
                  background: 'var(--surface)', border: `1px solid ${isSelected ? PURPLE : 'var(--border)'}`,
                  borderRadius: '20px', padding: '24px',
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  cursor: 'pointer', transition: 'all 250ms cubic-bezier(.4,0,.2,1)',
                  boxShadow: isSelected ? `0 0 0 1px ${PURPLE}, 0 12px 32px ${purpleAlpha(0.15)}` : 'none',
                  transform: isSelected ? 'translateY(-2px)' : 'none',
                }}
                  onClick={() => {
                    setSelectedPack(isSelected ? null : pack.id)
                    if (!isSelected) setBudget(pack.finalPrice)
                  }}
                  onMouseEnter={e => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'translateY(-2px)'
                      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0,0,0,0.12)'
                      e.currentTarget.style.borderColor = 'var(--border-med)'
                    }
                  }}
                  onMouseLeave={e => {
                    if (!isSelected) {
                      e.currentTarget.style.transform = 'none'
                      e.currentTarget.style.boxShadow = 'none'
                      e.currentTarget.style.borderColor = 'var(--border)'
                    }
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <h3 style={{ fontFamily: D, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '4px' }}>
                      {pack.name}
                    </h3>
                    <div style={{ fontSize: '12px', color: 'var(--muted)', marginBottom: '12px' }}>
                      {pack.channels} canales {'\u00B7'} {pack.reach} alcance
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {pack.features.map(f => (
                        <span key={f} style={{ fontSize: '11px', color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <span style={{ color: '#10b981' }}>{'\u2713'}</span> {f}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div style={{ textAlign: 'right', marginLeft: '24px', flexShrink: 0 }}>
                    <div style={{ fontSize: '11px', color: 'var(--muted)', marginBottom: '2px' }}>Precio medio de mercado</div>
                    <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', justifyContent: 'flex-end' }}>
                      <span style={{ fontFamily: D, fontSize: '28px', fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.5px' }}>{'\u20AC'}{pack.finalPrice.toLocaleString()}</span>
                      <span style={{ fontSize: '14px', color: 'var(--muted2)', textDecoration: 'line-through' }}>{'\u20AC'}{pack.marketPrice.toLocaleString()}</span>
                    </div>
                    <span style={{
                      display: 'inline-flex', background: 'rgba(16,185,129,0.1)', color: '#10b981',
                      borderRadius: '6px', padding: '2px 8px', fontSize: '11px', fontWeight: 700, marginTop: '4px',
                    }}>-{discount}%</span>
                  </div>

                  <button style={{
                    marginLeft: '20px',
                    background: isSelected ? PURPLE : 'transparent',
                    color: isSelected ? '#fff' : 'var(--text)',
                    border: `1px solid ${isSelected ? PURPLE : 'var(--border)'}`,
                    borderRadius: '12px', padding: '10px 20px', fontSize: '13px', fontWeight: 600,
                    cursor: 'pointer', fontFamily: F, flexShrink: 0,
                    transition: 'all 200ms ease',
                  }}>
                    {isSelected ? '\u2713' : 'Seleccionar'}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Launch notice */}
          {urgency.active && (
            <p style={{
              textAlign: 'center', fontSize: '12px', color: 'var(--muted)',
              fontStyle: 'italic', marginTop: '8px',
            }}>
              Precios de lanzamiento {'\u2014'} sujetos a actualizacion segun demanda
            </p>
          )}
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
              {loadingRec ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>Cargando canales...</div>
              ) : recommendedChannels.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '20px', color: 'var(--muted)', fontSize: '13px' }}>No hay canales disponibles en esta categoría</div>
              ) : null}
              {recommendedChannels.filter(c => !category || c.category === category || category === 'Todas').slice(0, 4).map(ch => {
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
                      <div style={{ fontSize: '11px', color: 'var(--muted)' }}>{ch.platform}{ch.audience ? ` \u00B7 ${ch.audience} seguidores` : ''}</div>
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
                localStorage.setItem('channelad-autobuy-channels', JSON.stringify(manualChannels))
                setShowRecommended(false)
              }} style={{
                flex: 1, background: PURPLE, color: '#fff', border: 'none', borderRadius: '10px',
                padding: '12px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', fontFamily: F,
              }}>
                Seleccionar ({manualChannels.length})
              </button>
              <button onClick={() => {
                localStorage.setItem('channelad-autobuy-channels', JSON.stringify(manualChannels))
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
