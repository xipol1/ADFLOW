import React, { useState, useEffect } from 'react'
import { Code, Copy, Check, Server, Image as ImageIcon, Info, Zap, AlertCircle, GitBranch } from 'lucide-react'
import apiService from '../../../../services/api'
import { FONT_BODY, FONT_DISPLAY, OK, WARN, BLUE, PURPLE, purpleAlpha } from '../../../theme/tokens'

function CodeBlock({ code, language = 'html' }) {
  const [copied, setCopied] = useState(false)
  return (
    <div style={{ position: 'relative', background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10, padding: '14px 16px', fontFamily: 'Menlo, Monaco, "Courier New", monospace', fontSize: 12.5, color: 'var(--text)', whiteSpace: 'pre-wrap', wordBreak: 'break-all', lineHeight: 1.6 }}>
      <button onClick={async () => {
        try { await navigator.clipboard.writeText(code); setCopied(true); setTimeout(() => setCopied(false), 2000) } catch {}
      }} style={{
        position: 'absolute', top: 8, right: 8,
        background: copied ? OK : 'var(--surface)', color: copied ? '#fff' : 'var(--muted)',
        border: '1px solid var(--border)', borderRadius: 7,
        padding: '4px 10px', fontSize: 11, fontWeight: 600, cursor: 'pointer',
        display: 'flex', alignItems: 'center', gap: 4, fontFamily: FONT_BODY,
      }}>
        {copied ? <><Check size={11} /> Copiado</> : <><Copy size={11} /> Copiar</>}
      </button>
      {code}
    </div>
  )
}

function Section({ icon: Icon, title, children }) {
  return (
    <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 20, fontFamily: FONT_BODY }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
        <div style={{ width: 36, height: 36, borderRadius: 10, background: purpleAlpha(0.12), border: `1px solid ${purpleAlpha(0.25)}`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={PURPLE} strokeWidth={2} />
        </div>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 17, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.02em', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </div>
  )
}

function AttributionSettings() {
  const [model, setModel] = useState('last_touch')
  const [lookback, setLookback] = useState(30)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState(null)

  useEffect(() => {
    let mounted = true
    apiService.getAttributionSettings?.().then(res => {
      if (!mounted || !res?.success) return
      setModel(res.data.attributionModel || 'last_touch')
      setLookback(res.data.attributionLookbackDays || 30)
    }).finally(() => { if (mounted) setLoading(false) })
    return () => { mounted = false }
  }, [])

  const save = async (next) => {
    setSaving(true)
    const payload = next || { model, lookbackDays: lookback }
    const res = await apiService.setAttributionSettings(payload).catch(() => null)
    if (res?.success) { setSavedAt(new Date()); if (next?.model) setModel(next.model); if (next?.lookbackDays) setLookback(next.lookbackDays) }
    setSaving(false)
  }

  if (loading) return <div style={{ fontSize: 12, color: 'var(--muted)' }}>Cargando configuración...</div>

  const models = [
    { key: 'last_touch', label: 'Last touch',  desc: '100% del crédito al click justo antes de la conversión. Lo más simple.' },
    { key: 'linear',     label: 'Linear',      desc: 'Reparte el crédito por igual entre todos los clicks de la misma persona en la ventana.' },
    { key: 'time_decay', label: 'Time decay',  desc: 'Los clicks más recientes pesan más (half-life: 7 días). Útil para ciclos de compra largos.' },
  ]

  return (
    <div>
      <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 14, lineHeight: 1.6 }}>
        Cuando un usuario hace click en varios anuncios tuyos antes de convertir, ¿cómo repartimos el crédito? Cambia el modelo y verás el ROI recalculado en tiempo real.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {models.map(m => {
          const sel = model === m.key
          return (
            <div key={m.key} onClick={() => save({ model: m.key, lookbackDays: lookback })}
              style={{
                display: 'flex', alignItems: 'flex-start', gap: 12, padding: 12, borderRadius: 10,
                background: sel ? purpleAlpha(0.08) : 'var(--bg2)',
                border: `1.5px solid ${sel ? purpleAlpha(0.4) : 'var(--border)'}`,
                cursor: 'pointer', transition: 'all .15s',
              }}>
              <div style={{
                width: 18, height: 18, borderRadius: 9, flexShrink: 0, marginTop: 1,
                border: `2px solid ${sel ? PURPLE : 'var(--border-med, var(--border))'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                {sel && <div style={{ width: 9, height: 9, borderRadius: 5, background: PURPLE }} />}
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 2 }}>{m.label}</div>
                <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.5 }}>{m.desc}</div>
              </div>
            </div>
          )
        })}
      </div>
      <div style={{ marginTop: 16, padding: 12, background: 'var(--bg2)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>Ventana de atribución</div>
          <div style={{ fontSize: 11, color: 'var(--muted)' }}>Días hacia atrás considerados al fan-out de clicks</div>
        </div>
        <select
          value={lookback}
          onChange={e => save({ model, lookbackDays: Number(e.target.value) })}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid var(--border)', background: 'var(--bg)', color: 'var(--text)', fontSize: 13, fontFamily: FONT_BODY }}
        >
          {[7, 14, 30, 60, 90].map(d => <option key={d} value={d}>{d} días</option>)}
        </select>
      </div>
      {(saving || savedAt) && (
        <div style={{ marginTop: 8, fontSize: 11, color: saving ? 'var(--muted)' : OK, textAlign: 'right' }}>
          {saving ? 'Guardando...' : <><Check size={11} style={{ display: 'inline', verticalAlign: 'middle' }} /> Guardado</>}
        </div>
      )}
    </div>
  )
}

export default function TrackingSetupPage() {
  const apiBase = (typeof window !== 'undefined' ? window.location.origin : 'https://channelad.io')

  const pixelSnippet = `<!-- Pega justo antes de </body> en tu página de "Gracias por tu compra" -->
<img src="${apiBase}/api/track/conversion?type=purchase&v=ORDER_TOTAL&eid=ORDER_ID"
     width="1" height="1" style="display:none" alt="" />`

  const serverSnippet = `# En tu backend, tras confirmar la conversión:
curl -X POST "${apiBase}/api/conversions" \\
  -H "Content-Type: application/json" \\
  -d '{
    "clickId": "abc123def456",
    "type": "purchase",
    "value": 49.99,
    "currency": "EUR",
    "externalId": "ORDER-2026-001",
    "metadata": { "product": "Premium Plan" }
  }'`

  const nodeSnippet = `// Node.js / Express
app.post('/checkout/success', async (req, res) => {
  const clickId = req.cookies['_chad_cid'] || req.query.cid;

  if (clickId) {
    await fetch('${apiBase}/api/conversions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        clickId,
        type: 'purchase',
        value: order.total,
        currency: order.currency,
        externalId: order.id,
      }),
    });
  }
  // ... resto de tu lógica
});`

  return (
    <div style={{ fontFamily: FONT_BODY, maxWidth: 920, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Header */}
      <div>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: 26, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0, display: 'flex', alignItems: 'center', gap: 10 }}>
          <Code size={24} color={PURPLE} /> Tracking de conversiones
        </h1>
        <p style={{ fontSize: 14, color: 'var(--muted)', margin: '6px 0 0 0', lineHeight: 1.6 }}>
          Conecta tus ventas reales a tus campañas de Channelad. Sin esto, mostramos un ROI estimado basado en CPM —
          con tracking, verás el <strong style={{ color: 'var(--text)' }}>ROI real</strong> en tus dashboards.
        </p>
      </div>

      {/* How it works */}
      <Section icon={Info} title="Cómo funciona">
        <ol style={{ paddingLeft: 22, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.8, margin: 0 }}>
          <li>Un usuario hace click en tu anuncio en un canal de Telegram/WhatsApp/Discord</li>
          <li>Channelad lo redirige a tu URL de destino añadiendo <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>?cid=XXX</code> y dejando una cookie <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>_chad_cid</code></li>
          <li>El usuario completa una compra/signup en tu sitio</li>
          <li>Tú avisas a Channelad usando uno de los métodos de abajo (pixel o server-to-server)</li>
          <li>Channelad asocia esa conversión a su click original y calcula tu ROI real</li>
        </ol>
      </Section>

      {/* Method 1: Pixel */}
      <Section icon={ImageIcon} title="Opción A — Pixel (más rápido, frontend)">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
          La forma más simple. Pega esta línea en tu página de "gracias", reemplazando <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>ORDER_TOTAL</code> y <code style={{ background: 'var(--bg2)', padding: '1px 5px', borderRadius: 4, fontSize: 12 }}>ORDER_ID</code> con tus datos reales.
        </p>
        <CodeBlock code={pixelSnippet} />
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, marginTop: 12, padding: '10px 12px', background: `${WARN}10`, border: `1px solid ${WARN}30`, borderRadius: 8 }}>
          <AlertCircle size={14} color={WARN} style={{ marginTop: 2, flexShrink: 0 }} />
          <span style={{ fontSize: 12, color: 'var(--text)', lineHeight: 1.5 }}>
            <strong>Limitación:</strong> el pixel depende de cookies cross-site. En navegadores con tracking-protection (Safari, Brave, Firefox strict mode) puede fallar. Para máxima fiabilidad, usa la opción server-to-server.
          </span>
        </div>
      </Section>

      {/* Method 2: Server-to-Server */}
      <Section icon={Server} title="Opción B — Server-to-server (recomendado)">
        <p style={{ fontSize: 13, color: 'var(--muted)', marginTop: 0, marginBottom: 12, lineHeight: 1.6 }}>
          Llama a este endpoint desde tu backend cuando confirmes una venta. Es 100% fiable (no depende de cookies), idempotente (puedes reintentar sin duplicar) y soporta refunds.
        </p>

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>cURL</div>
        <CodeBlock code={serverSnippet} />

        <div style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginTop: 16, marginBottom: 6 }}>Node.js</div>
        <CodeBlock code={nodeSnippet} />

        <div style={{ marginTop: 14 }}>
          <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>Parámetros</div>
          <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse' }}>
            <tbody>
              {[
                ['clickId',    'string',   'recomendado', 'El cid que añadimos a la URL de destino o leído del cookie _chad_cid'],
                ['campaignId', 'string',   'alternativa', 'Úsalo si no tienes clickId. La conversión se atribuye a la campaña sin click específico.'],
                ['type',       'string',   'opcional',    "purchase | signup | lead | subscription | install | custom"],
                ['value',      'number',   'opcional',    'Importe monetario de la conversión'],
                ['currency',   'string',   'opcional',    "EUR por defecto"],
                ['externalId', 'string',   'recomendado', 'Tu ID de pedido. Garantiza idempotencia (no se cuenta dos veces).'],
                ['metadata',   'object',   'opcional',    "Cualquier dato extra: productos, email hash, etc."],
              ].map(([name, type, req, desc]) => (
                <tr key={name} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '8px 0', verticalAlign: 'top', fontFamily: 'Menlo, monospace' }}><code>{name}</code></td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'top', color: 'var(--muted)', whiteSpace: 'nowrap' }}>{type}</td>
                  <td style={{ padding: '8px 8px', verticalAlign: 'top' }}>
                    <span style={{ fontSize: 10, fontWeight: 700, color: req === 'recomendado' ? OK : req === 'alternativa' ? BLUE : 'var(--muted)', background: req === 'recomendado' ? `${OK}15` : req === 'alternativa' ? `${BLUE}15` : 'var(--bg2)', borderRadius: 6, padding: '2px 6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                      {req}
                    </span>
                  </td>
                  <td style={{ padding: '8px 0 8px 8px', color: 'var(--text)', lineHeight: 1.5 }}>{desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Section>

      {/* Multi-touch attribution settings */}
      <Section icon={GitBranch} title="Modelo de atribución multi-touch">
        <AttributionSettings />
      </Section>

      {/* Verification */}
      <Section icon={Zap} title="Verificar que funciona">
        <ol style={{ paddingLeft: 22, fontSize: 13.5, color: 'var(--text)', lineHeight: 1.8, margin: 0 }}>
          <li>Abre una de tus campañas activas, copia el tracking link y ábrelo en una pestaña incógnita</li>
          <li>Completa una conversión real (o de prueba) en tu sitio</li>
          <li>Vuelve al dashboard — el widget de ROI debería pasar de "ROI estimado" a <strong>"ROI real"</strong> con un badge morado</li>
          <li>En la página de la campaña verás el listado de conversiones en tiempo real</li>
        </ol>
      </Section>
    </div>
  )
}
