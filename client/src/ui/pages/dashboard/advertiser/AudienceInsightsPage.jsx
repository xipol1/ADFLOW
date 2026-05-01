import React, { useState, useCallback, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  PieChart, Search, AlertTriangle, Sparkles, Info,
  Users, MapPin, Clock, Smartphone, Globe,
} from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, ERR, BLUE } from '../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const purpleAlpha = (o) => `var(--accent-dim, rgba(139,92,246,${o}))`


// ─── Demographic profiles per niche × platform ─────────────────────────────
// Heuristic distributions derived from public market reports + ad-platform data.
// Each profile sums to ~100% within its dimension.
const NICHE_PROFILES = {
  crypto: {
    age: { '18-24': 18, '25-34': 42, '35-44': 26, '45-54': 10, '55+': 4 },
    gender: { male: 78, female: 18, other: 4 },
    interests: ['Trading', 'Tech', 'Investing', 'Web3', 'Gaming'],
  },
  finanzas: {
    age: { '18-24': 9, '25-34': 32, '35-44': 33, '45-54': 18, '55+': 8 },
    gender: { male: 64, female: 33, other: 3 },
    interests: ['Inversión', 'Ahorro', 'Inmobiliaria', 'Empresa', 'Fiscal'],
  },
  tecnologia: {
    age: { '18-24': 22, '25-34': 38, '35-44': 24, '45-54': 11, '55+': 5 },
    gender: { male: 68, female: 28, other: 4 },
    interests: ['IA', 'SaaS', 'Programación', 'Productividad', 'Startups'],
  },
  marketing: {
    age: { '18-24': 14, '25-34': 41, '35-44': 28, '45-54': 13, '55+': 4 },
    gender: { male: 52, female: 44, other: 4 },
    interests: ['Growth', 'SEO', 'SaaS', 'E-commerce', 'Branding'],
  },
  ecommerce: {
    age: { '18-24': 18, '25-34': 36, '35-44': 26, '45-54': 14, '55+': 6 },
    gender: { male: 56, female: 40, other: 4 },
    interests: ['Shopify', 'Amazon', 'Logística', 'Productos', 'Conversión'],
  },
  salud: {
    age: { '18-24': 12, '25-34': 28, '35-44': 28, '45-54': 20, '55+': 12 },
    gender: { male: 38, female: 58, other: 4 },
    interests: ['Fitness', 'Nutrición', 'Bienestar', 'Suplementos', 'Mindfulness'],
  },
  educacion: {
    age: { '18-24': 36, '25-34': 32, '35-44': 18, '45-54': 10, '55+': 4 },
    gender: { male: 46, female: 50, other: 4 },
    interests: ['Cursos', 'Idiomas', 'Carrera', 'Certificaciones', 'Bootcamps'],
  },
  entretenimiento: {
    age: { '18-24': 32, '25-34': 35, '35-44': 18, '45-54': 10, '55+': 5 },
    gender: { male: 52, female: 44, other: 4 },
    interests: ['Streaming', 'Gaming', 'Cine', 'Series', 'Cultura pop'],
  },
  noticias: {
    age: { '18-24': 8, '25-34': 22, '35-44': 28, '45-54': 24, '55+': 18 },
    gender: { male: 56, female: 41, other: 3 },
    interests: ['Política', 'Economía', 'Internacional', 'Análisis', 'Opinión'],
  },
  deporte: {
    age: { '18-24': 22, '25-34': 34, '35-44': 24, '45-54': 14, '55+': 6 },
    gender: { male: 78, female: 19, other: 3 },
    interests: ['Fútbol', 'Apuestas', 'Fichajes', 'Estadísticas', 'Internacional'],
  },
  lifestyle: {
    age: { '18-24': 24, '25-34': 38, '35-44': 22, '45-54': 11, '55+': 5 },
    gender: { male: 38, female: 58, other: 4 },
    interests: ['Viajes', 'Hábitos', 'Productividad', 'Nómada digital', 'Hogar'],
  },
  otros: {
    age: { '18-24': 18, '25-34': 32, '35-44': 26, '45-54': 16, '55+': 8 },
    gender: { male: 52, female: 44, other: 4 },
    interests: ['Ofertas', 'Lifestyle', 'General'],
  },
}

const PLATFORM_PROFILES = {
  telegram: {
    age: { '18-24': 22, '25-34': 38, '35-44': 26, '45-54': 10, '55+': 4 },
    devices: { mobile: 88, desktop: 12 },
    activeHour: '20:00–23:00',
    geoBias: 'Europa, LatAm',
  },
  whatsapp: {
    age: { '18-24': 18, '25-34': 30, '35-44': 26, '45-54': 16, '55+': 10 },
    devices: { mobile: 94, desktop: 6 },
    activeHour: '08:00–10:00 + 19:00–22:00',
    geoBias: 'LatAm, España',
  },
  instagram: {
    age: { '18-24': 30, '25-34': 32, '35-44': 22, '45-54': 12, '55+': 4 },
    devices: { mobile: 92, desktop: 8 },
    activeHour: '12:00–14:00 + 21:00–23:00',
    geoBias: 'Global',
  },
  newsletter: {
    age: { '18-24': 8, '25-34': 28, '35-44': 32, '45-54': 22, '55+': 10 },
    devices: { mobile: 60, desktop: 40 },
    activeHour: '07:00–09:00 (al abrir email)',
    geoBias: 'Europa, US',
  },
  discord: {
    age: { '18-24': 38, '25-34': 36, '35-44': 18, '45-54': 6, '55+': 2 },
    devices: { mobile: 55, desktop: 45 },
    activeHour: '18:00–02:00',
    geoBias: 'Global, US',
  },
  facebook: {
    age: { '18-24': 8, '25-34': 22, '35-44': 28, '45-54': 24, '55+': 18 },
    devices: { mobile: 86, desktop: 14 },
    activeHour: '12:00–14:00 + 20:00–22:00',
    geoBias: 'Global',
  },
}


// ─── Bar component for percentages ─────────────────────────────────────────
function PctBar({ label, value, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: 'var(--text)', marginBottom: 3 }}>
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ fontFamily: FONT_DISPLAY, fontWeight: 700, color }}>{value}%</span>
      </div>
      <div style={{ height: 8, background: 'var(--bg2)', borderRadius: 4, overflow: 'hidden' }}>
        <div style={{
          height: '100%', width: `${value}%`,
          background: `linear-gradient(90deg, ${color}80, ${color})`,
          borderRadius: 4, transition: 'width .5s ease',
        }} />
      </div>
    </div>
  )
}


// ─── Main ──────────────────────────────────────────────────────────────────
export default function AudienceInsightsPage() {
  const navigate = useNavigate()
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [data, setData] = useState(null)

  const runSearch = useCallback(async () => {
    const raw = (query || '').trim()
    if (!raw) return
    setLoading(true); setError(''); setData(null)
    const cleaned = raw.replace(/^https?:\/\//i, '').replace(/^@/, '').replace(/^t\.me\//i, '').replace(/\/.*$/, '')
    try {
      let id = null
      if (/^[0-9a-fA-F]{24}$/.test(cleaned)) id = cleaned
      else {
        const lookup = await apiService.getChannelByUsername(cleaned).catch(() => null)
        if (lookup?.success && lookup.data?.id) id = lookup.data.id
        else {
          const search = await apiService.searchChannels({ busqueda: cleaned, limite: 1 }).catch(() => null)
          const items = search?.data?.canales || search?.data?.items || search?.data || []
          if (items[0]) id = items[0].id || items[0]._id
        }
      }
      if (!id) {
        setError(`No encontramos "${cleaned}".`); setLoading(false); return
      }
      const intel = await apiService.getChannelIntelligence(id)
      if (!intel?.success || !intel.data) {
        setError('No se pudo cargar el canal.'); setLoading(false); return
      }
      setData(intel.data)
    } catch (e) {
      setError(e.message || 'Error al cargar')
    }
    setLoading(false)
  }, [query])

  // Compose insights from niche + platform profiles
  const insights = useMemo(() => {
    if (!data) return null
    const nicho = (data.canal?.nicho || data.canal?.categoria || 'otros').toLowerCase()
    const plat = (data.canal?.plataforma || '').toLowerCase()
    const nProfile = NICHE_PROFILES[nicho] || NICHE_PROFILES.otros
    const pProfile = PLATFORM_PROFILES[plat] || PLATFORM_PROFILES.telegram

    // Blend niche + platform age distributions (weighted average)
    const blendAge = {}
    Object.keys(nProfile.age).forEach(k => {
      blendAge[k] = Math.round((nProfile.age[k] * 0.6 + (pProfile.age[k] || nProfile.age[k]) * 0.4))
    })

    return {
      age: blendAge,
      gender: nProfile.gender,
      interests: nProfile.interests,
      devices: pProfile.devices,
      activeHour: pProfile.activeHour,
      geoBias: pProfile.geoBias,
    }
  }, [data])

  return (
    <div style={{ fontFamily: FONT_BODY, display: 'flex', flexDirection: 'column', gap: 24, maxWidth: 1100 }}>

      {/* Header */}
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 12,
            background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <PieChart size={20} color={PURPLE} />
          </div>
          <h1 style={{
            fontFamily: FONT_DISPLAY, fontSize: 28, fontWeight: 800,
            color: 'var(--text)', letterSpacing: '-0.04em', lineHeight: 1.1, margin: 0,
          }}>
            Audience Insights
          </h1>
        </div>
        <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.5 }}>
          Demografía estimada (edad, género, dispositivo, horario) de la audiencia de un canal según su nicho y plataforma.
        </p>
      </div>

      {/* Search */}
      <form onSubmit={e => { e.preventDefault(); runSearch() }}
        style={{
          background: 'var(--surface)', border: `1px solid ${purpleAlpha(0.25)}`,
          borderRadius: 16, padding: 6,
          display: 'flex', alignItems: 'center', gap: 6,
          boxShadow: `0 4px 20px ${purpleAlpha(0.08)}`,
        }}>
        <Search size={18} color={PURPLE} style={{ marginLeft: 12 }} />
        <input type="text" value={query} onChange={e => setQuery(e.target.value)}
          placeholder="Pega un canal (ej: acrelianews)"
          style={{
            flex: 1, background: 'transparent', border: 'none', padding: '12px 8px',
            fontSize: 15, color: 'var(--text)', outline: 'none', fontFamily: FONT_BODY,
          }} disabled={loading} />
        <button type="submit" disabled={loading || !query.trim()}
          style={{
            background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
            padding: '10px 22px', fontSize: 14, fontWeight: 600,
            cursor: loading || !query.trim() ? 'not-allowed' : 'pointer',
            opacity: loading || !query.trim() ? 0.6 : 1, fontFamily: FONT_BODY,
          }}>
          {loading ? 'Cargando…' : 'Analizar'}
        </button>
      </form>

      {error && (
        <div role="alert" style={{
          background: `${ERR}10`, border: `1px solid ${ERR}30`, color: ERR,
          borderRadius: 10, padding: '10px 14px', fontSize: 13,
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {/* Empty */}
      {!data && !loading && !error && (
        <div style={{
          background: 'var(--surface)', border: '1px dashed var(--border)',
          borderRadius: 18, padding: '60px 28px', textAlign: 'center',
        }}>
          <div style={{
            width: 64, height: 64, borderRadius: 18,
            background: purpleAlpha(0.08), border: `1px solid ${purpleAlpha(0.18)}`,
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center', marginBottom: 16,
          }}>
            <Sparkles size={28} color={PURPLE} />
          </div>
          <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
            Busca un canal para ver su perfil de audiencia
          </h3>
          <p style={{ fontSize: 13, color: 'var(--muted)', maxWidth: 460, margin: '0 auto', lineHeight: 1.6 }}>
            Combinamos el nicho del canal y su plataforma con datos de mercado para estimar quién está al otro lado.
          </p>
        </div>
      )}

      {/* Insights */}
      {data && insights && !loading && (
        <>
          {/* Channel context */}
          <div style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 14, padding: 18,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}>
            <div style={{
              width: 48, height: 48, borderRadius: 12,
              background: purpleAlpha(0.12), color: PURPLE,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800,
            }}>{(data.canal?.nombre || '?')[0].toUpperCase()}</div>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 800, color: 'var(--text)' }}>
                {data.canal?.nombre || data.canal?.identificadorCanal}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {data.canal?.plataforma} · {data.canal?.nicho || data.canal?.categoria} · {data.canal?.seguidores ? `${data.canal.seguidores.toLocaleString('es')} subs` : ''}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 14 }}>

            {/* Age */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Users size={14} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Edad
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {Object.entries(insights.age).map(([range, pct]) => (
                  <PctBar key={range} label={range} value={pct} color={PURPLE} />
                ))}
              </div>
            </div>

            {/* Gender */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Users size={14} color={BLUE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Género
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PctBar label="Hombres"  value={insights.gender.male}   color={BLUE} />
                <PctBar label="Mujeres"  value={insights.gender.female} color={'#ec4899'} />
                <PctBar label="Otro / N.D." value={insights.gender.other} color={'var(--muted2)'} />
              </div>
            </div>

            {/* Devices */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Smartphone size={14} color={OK} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Dispositivo
                </h3>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <PctBar label="Móvil"    value={insights.devices.mobile}  color={OK} />
                <PctBar label="Desktop"  value={insights.devices.desktop} color={'var(--muted)'} />
              </div>
            </div>

            {/* Activity */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Clock size={14} color={WARN} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Horario óptimo
                </h3>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                {insights.activeHour}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                Ventana de mayor consumo en {data.canal?.plataforma}. Programa tus campañas para coincidir con este pico.
              </div>
            </div>

            {/* Geo */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Globe size={14} color={ERR} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Geografía
                </h3>
              </div>
              <div style={{ fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 800, color: 'var(--text)', marginBottom: 6 }}>
                {insights.geoBias}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)', lineHeight: 1.5 }}>
                Distribución típica de la plataforma. La audiencia real depende del idioma y temática del canal.
              </div>
            </div>

            {/* Interests */}
            <div style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 14, padding: 18,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
                <Sparkles size={14} color={PURPLE} />
                <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: 13, fontWeight: 700, color: 'var(--text)', margin: 0, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Intereses paralelos
                </h3>
              </div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {insights.interests.map((it, i) => (
                  <span key={i} style={{
                    background: purpleAlpha(0.08), color: PURPLE,
                    border: `1px solid ${purpleAlpha(0.2)}`, borderRadius: 6,
                    padding: '4px 10px', fontSize: 11, fontWeight: 600,
                  }}>{it}</span>
                ))}
              </div>
            </div>
          </div>

          <div style={{
            background: `${BLUE}08`, border: `1px solid ${BLUE}25`,
            borderRadius: 10, padding: '10px 14px',
            fontSize: 11, color: 'var(--muted)', display: 'flex', gap: 8, alignItems: 'flex-start', lineHeight: 1.5,
          }}>
            <Info size={12} color={BLUE} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              <strong style={{ color: 'var(--text)' }}>Estimación heurística.</strong> Los porcentajes son perfiles típicos de la combinación
              nicho × plataforma según informes de mercado, no medición directa de la audiencia del canal. Útil para diseño de copy y
              segmentación inicial; valida con un test antes de escalar inversión grande.
            </span>
          </div>
        </>
      )}
    </div>
  )
}
