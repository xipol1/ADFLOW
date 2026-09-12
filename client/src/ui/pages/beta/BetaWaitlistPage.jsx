import React, { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Clock, Radio, Compass, Calculator, Users, Copy, Check,
  ArrowRight, Sparkles, AlertCircle,
} from 'lucide-react'
import { useAuth } from '../../../auth/AuthContext'
import apiService from '../../../services/api'
import {
  PURPLE, purpleAlpha, GREEN, greenAlpha, ERR,
  FONT_BODY as F, FONT_DISPLAY as D,
} from '../../theme/tokens'

/**
 * The waiting room for a signed-in user who does not have beta access yet.
 *
 * This replaces the old beta banner on /dashboard, whose every call to action
 * pointed at a route behind the same gate that had just bounced the user —
 * clicking any of them landed them back on the banner. Everything linked from
 * here is either public or writes to the waitlist, so no link is a loop.
 */

const NICHOS = [
  { id: 'finanzas', label: 'Finanzas e inversión' },
  { id: 'marketing', label: 'Marketing & growth' },
  { id: 'tech', label: 'Tecnología & SaaS' },
  { id: 'cripto', label: 'Cripto & web3' },
  { id: 'emprendimiento', label: 'Emprendimiento' },
  { id: 'noticias', label: 'Noticias & actualidad' },
  { id: 'lifestyle', label: 'Lifestyle & ocio' },
  { id: 'gaming', label: 'Gaming & esports' },
  { id: 'deporte', label: 'Deporte' },
  { id: 'humor', label: 'Humor & memes' },
  { id: 'educacion', label: 'Educación & cultura' },
  { id: 'otros', label: 'Otros' },
]
const TAMANOS = [
  { id: 'lt5k', label: 'Menos de 5.000 miembros' },
  { id: '5k_50k', label: 'Entre 5.000 y 50.000' },
  { id: 'gt50k', label: 'Más de 50.000' },
]
const PLATAFORMAS = [
  { id: 'telegram', label: 'Telegram' },
  { id: 'whatsapp', label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram broadcast' },
  { id: 'discord', label: 'Discord' },
  { id: 'other', label: 'Otra' },
]

export default function BetaWaitlistPage() {
  const { user } = useAuth()
  const esCreador = user?.rol === 'creator' || user?.role === 'creator'

  const [estado, setEstado] = useState(null)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState('')

  const cargar = useCallback(async () => {
    setCargando(true)
    const res = await apiService.getBetaStatus()
    if (res?.success) {
      setEstado(res.data)
      setError('')
    } else {
      setError(res?.message || 'No se pudo cargar tu estado')
    }
    setCargando(false)
  }, [])

  useEffect(() => { cargar() }, [cargar])

  const enLista = Boolean(estado?.waitlist)

  return (
    <main style={{
      fontFamily: F, color: 'var(--text)', minHeight: '70vh',
      padding: '48px 20px',
      background: 'radial-gradient(ellipse 70% 40% at 50% 0%, rgba(124,58,237,0.06) 0%, transparent 60%), var(--bg)',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

        <Cabecera nombre={user?.nombre || user?.email?.split('@')[0]} esCreador={esCreador} />

        {error && (
          <div role="alert" style={avisoStyle(ERR)}>
            <AlertCircle size={15} aria-hidden="true" /> {error}
          </div>
        )}

        {cargando
          ? <Cargando />
          : enLista
            ? <TarjetaPosicion estado={estado} />
            : <FormularioLista esCreador={esCreador} onListo={cargar} />}

        <MientrasTanto esCreador={esCreador} />
      </div>
    </main>
  )
}

// ─── Cabecera ───────────────────────────────────────────────────────────────
function Cabecera({ nombre, esCreador }) {
  return (
    <header>
      <span style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.3)}`,
        borderRadius: 20, padding: '4px 12px', fontSize: 11.5, fontWeight: 700,
        color: PURPLE, letterSpacing: '0.04em', textTransform: 'uppercase',
        marginBottom: 14,
      }}>
        <Clock size={12} aria-hidden="true" /> Acceso anticipado
      </span>
      <h1 style={{
        fontFamily: D, fontSize: 30, fontWeight: 900, letterSpacing: '-0.03em',
        margin: '0 0 10px', color: 'var(--text)',
      }}>
        Hola {nombre}, aún no te toca
      </h1>
      <p style={{ fontSize: 16, color: 'var(--muted)', lineHeight: 1.6, margin: 0, maxWidth: 600 }}>
        Channelad está en beta cerrada y abrimos por tandas para poder acompañar
        a cada {esCreador ? 'canal' : 'anunciante'} de uno en uno. Te avisamos por
        email en cuanto entres — no hace falta que vuelvas a mirar.
      </p>
    </header>
  )
}

function Cargando() {
  return (
    <div style={{ ...tarjetaStyle(), color: 'var(--muted)', fontSize: 14 }}>
      Cargando tu estado…
    </div>
  )
}

// ─── Ya está en la lista: posición real ─────────────────────────────────────
function TarjetaPosicion({ estado }) {
  const { waitlist, cohorte } = estado
  const [copiado, setCopiado] = useState(false)

  const enlace = `${window.location.origin}/founding?ref=${waitlist.referralToken}`
  const copiar = async () => {
    try {
      await navigator.clipboard.writeText(enlace)
      setCopiado(true)
      setTimeout(() => setCopiado(false), 2000)
    } catch { /* portapapeles no disponible */ }
  }

  return (
    <section style={tarjetaStyle(greenAlpha(0.28))}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24, alignItems: 'baseline' }}>
        <div>
          <div style={etiquetaStyle}>Tu posición</div>
          <div style={{ fontFamily: D, fontSize: 40, fontWeight: 900, color: GREEN, lineHeight: 1 }}>
            {waitlist.queuePosition ? `#${waitlist.queuePosition}` : '—'}
          </div>
        </div>
        <div>
          <div style={etiquetaStyle}>Nicho</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{waitlist.nichoLabel}</div>
        </div>
        <div>
          <div style={etiquetaStyle}>Canal</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>{waitlist.handle}</div>
        </div>
        <div>
          <div style={etiquetaStyle}>Plazas del cohorte</div>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--text)' }}>
            {cohorte.displayed} / {cohorte.cap}
          </div>
        </div>
      </div>

      <div style={{ height: 1, background: 'var(--border)', margin: '22px 0' }} />

      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, marginBottom: 14 }}>
        <Users size={16} style={{ color: GREEN, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
        <p style={{ margin: 0, fontSize: 14, color: 'var(--muted)', lineHeight: 1.6 }}>
          Has traído <strong style={{ color: 'var(--text)' }}>{waitlist.referralCount}</strong> {waitlist.referralCount === 1 ? 'canal' : 'canales'} con
          tu enlace. Cuantos más canales de tu nicho entren, antes abrimos esa vertical.
        </p>
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <code style={{
          flex: 1, minWidth: 220, background: 'var(--bg2)', border: '1px solid var(--border)',
          borderRadius: 9, padding: '10px 12px', fontSize: 12.5, color: 'var(--muted)',
          overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
        }}>{enlace}</code>
        <button type="button" onClick={copiar} style={botonSecundario(GREEN)}>
          {copiado ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
          {copiado ? 'Copiado' : 'Copiar'}
        </button>
      </div>
    </section>
  )
}

// ─── Todavía no está en la lista ────────────────────────────────────────────
function FormularioLista({ esCreador, onListo }) {
  const [handle, setHandle] = useState('')
  const [platform, setPlatform] = useState('telegram')
  const [nicho, setNicho] = useState('')
  const [size, setSize] = useState('')
  const [enviando, setEnviando] = useState(false)
  const [error, setError] = useState('')

  const enviar = async (e) => {
    e.preventDefault()
    setError('')
    if (!handle.trim() || !nicho || !size) {
      setError('Rellena el canal, el nicho y el tamaño.')
      return
    }
    setEnviando(true)
    const res = await apiService.joinBetaWaitlist({ handle: handle.trim(), platform, nicho, size })
    setEnviando(false)
    if (res?.success) onListo()
    else setError(res?.message || 'No se pudo guardar. Inténtalo de nuevo.')
  }

  return (
    <section style={tarjetaStyle()}>
      <h2 style={{ fontFamily: D, fontSize: 19, fontWeight: 800, margin: '0 0 6px', color: 'var(--text)' }}>
        Cuéntanos tu canal y te ponemos en la cola
      </h2>
      <p style={{ fontSize: 14, color: 'var(--muted)', lineHeight: 1.6, margin: '0 0 20px' }}>
        {esCreador
          ? 'Abrimos por nichos. Saber cuál es el tuyo y su tamaño es lo que nos dice cuándo te toca.'
          : 'Abrimos por nichos, según haya canales suficientes en cada uno. Dinos en cuál quieres anunciarte.'}
      </p>

      {error && (
        <div role="alert" style={{ ...avisoStyle(ERR), marginBottom: 16 }}>
          <AlertCircle size={15} aria-hidden="true" /> {error}
        </div>
      )}

      <form onSubmit={enviar} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <Campo etiqueta={esCreador ? 'Handle o enlace de tu canal' : 'Tu marca o web'}>
          <input
            value={handle}
            onChange={(e) => setHandle(e.target.value)}
            placeholder={esCreador ? '@micanal o t.me/micanal' : 'mimarca.com'}
            maxLength={120}
            style={inputStyle}
          />
        </Campo>

        {esCreador && (
          <Campo etiqueta="Plataforma">
            <select value={platform} onChange={(e) => setPlatform(e.target.value)} style={inputStyle}>
              {PLATAFORMAS.map((p) => <option key={p.id} value={p.id}>{p.label}</option>)}
            </select>
          </Campo>
        )}

        <Campo etiqueta="Nicho">
          <select value={nicho} onChange={(e) => setNicho(e.target.value)} style={inputStyle}>
            <option value="">Elige un nicho…</option>
            {NICHOS.map((n) => <option key={n.id} value={n.id}>{n.label}</option>)}
          </select>
        </Campo>

        <Campo etiqueta={esCreador ? 'Tamaño de tu audiencia' : 'Tamaño de canal que buscas'}>
          <select value={size} onChange={(e) => setSize(e.target.value)} style={inputStyle}>
            <option value="">Elige un tamaño…</option>
            {TAMANOS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Campo>

        <button type="submit" disabled={enviando} style={{ ...botonPrimario, opacity: enviando ? 0.6 : 1, marginTop: 4 }}>
          {enviando ? 'Guardando…' : 'Ponerme en la cola'}
          {!enviando && <ArrowRight size={15} aria-hidden="true" />}
        </button>
      </form>
    </section>
  )
}

// ─── Qué puede hacer mientras espera (todo público, sin bucles) ─────────────
function MientrasTanto({ esCreador }) {
  const enlaces = esCreador
    ? [
        { to: '/herramientas', icon: Calculator, titulo: 'Calcula lo que vale tu canal', desc: 'Precio por publicación según alcance, nicho y engagement.' },
        { to: '/marketplace', icon: Compass, titulo: 'Mira canales ya publicados', desc: 'Qué tarifas tienen otros canales de tu tamaño.' },
        { to: '/founding', icon: Sparkles, titulo: 'Programa founding', desc: 'Comisión del 18% vitalicia para los primeros canales.' },
        { to: '/para-canales', icon: Radio, titulo: 'Cómo funciona para creadores', desc: 'Del alta al cobro, paso a paso.' },
      ]
    : [
        { to: '/marketplace', icon: Compass, titulo: 'Explora el marketplace', desc: 'Canales verificados por plataforma, nicho y audiencia.' },
        { to: '/herramientas', icon: Calculator, titulo: 'Estima tu campaña', desc: 'Cuánto alcance compras con tu presupuesto.' },
        { to: '/pricing', icon: Sparkles, titulo: 'Precios y comisiones', desc: 'Qué cuesta y qué te llevas.' },
        { to: '/para-anunciantes', icon: Radio, titulo: 'Cómo funciona para marcas', desc: 'Del brief al ROI verificado.' },
      ]

  return (
    <section>
      <h2 style={{ fontFamily: D, fontSize: 15, fontWeight: 800, color: 'var(--text)', margin: '8px 0 12px' }}>
        Mientras tanto
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {enlaces.map(({ to, icon: Icon, titulo, desc }) => (
          <Link key={to} to={to} style={{
            display: 'flex', gap: 12, alignItems: 'flex-start', textDecoration: 'none',
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: 16, transition: 'border-color .15s',
          }}>
            <Icon size={17} style={{ color: PURPLE, flexShrink: 0, marginTop: 2 }} aria-hidden="true" />
            <span>
              <span style={{ display: 'block', fontSize: 14, fontWeight: 700, color: 'var(--text)', marginBottom: 3 }}>{titulo}</span>
              <span style={{ display: 'block', fontSize: 12.5, color: 'var(--muted)', lineHeight: 1.5 }}>{desc}</span>
            </span>
          </Link>
        ))}
      </div>
      <p style={{ fontSize: 12.5, color: 'var(--muted)', marginTop: 16, lineHeight: 1.6 }}>
        ¿Crees que deberías tener acceso ya? Escríbenos desde <Link to="/soporte" style={{ color: PURPLE }}>soporte</Link> y
        lo miramos.
      </p>
    </section>
  )
}

// ─── Piezas de estilo ───────────────────────────────────────────────────────
function Campo({ etiqueta, children }) {
  return (
    <label style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <span style={etiquetaStyle}>{etiqueta}</span>
      {children}
    </label>
  )
}

const etiquetaStyle = {
  fontSize: 11, fontWeight: 700, color: 'var(--muted)',
  textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4,
}

const inputStyle = {
  width: '100%', background: 'var(--bg2)', border: '1px solid var(--border)',
  borderRadius: 9, padding: '10px 12px', fontSize: 14, color: 'var(--text)',
  fontFamily: F, outline: 'none',
}

const botonPrimario = {
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7,
  background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
  padding: '12px 22px', fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: F,
}

function botonSecundario(color) {
  return {
    display: 'inline-flex', alignItems: 'center', gap: 6,
    background: 'transparent', color, border: `1px solid ${color}`,
    borderRadius: 9, padding: '10px 16px', fontSize: 13, fontWeight: 700,
    cursor: 'pointer', fontFamily: F,
  }
}

function tarjetaStyle(borde) {
  return {
    background: 'var(--surface)',
    border: `1px solid ${borde || 'var(--border)'}`,
    borderRadius: 16, padding: 24,
  }
}

function avisoStyle(color) {
  return {
    display: 'flex', alignItems: 'center', gap: 8,
    background: `${color}14`, border: `1px solid ${color}44`,
    borderRadius: 10, padding: '10px 14px', fontSize: 13, color,
  }
}
