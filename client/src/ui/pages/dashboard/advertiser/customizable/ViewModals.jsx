import React, { useState, useEffect, useRef } from 'react'
import { X, Layout, Copy, Check, Download, Upload, FileJson } from 'lucide-react'
import { PRESETS } from './useDashboardViews'
import { FONT_BODY, FONT_DISPLAY } from '../../../../theme/tokens'

const PURPLE = 'var(--accent, #8B5CF6)'
const pa = (o) => `rgba(139,92,246,${o})`

function ModalShell({ open, onClose, title, subtitle, maxWidth = 720, children }) {
  useEffect(() => {
    if (!open) return
    const handler = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handler)
    document.body.style.overflow = 'hidden'
    return () => {
      window.removeEventListener('keydown', handler)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
      style={{
        position: 'fixed', inset: 0, zIndex: 9999,
        background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(8px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: 24, animation: 'mShellIn .2s ease', fontFamily: FONT_BODY,
      }}>
      <style>{`
        @keyframes mShellIn { from { opacity:0 } to { opacity:1 } }
        @keyframes mShellSlide { from { opacity:0; transform: translateY(20px) } to { opacity:1; transform: translateY(0) } }
      `}</style>
      <div style={{
        background: 'var(--bg)', borderRadius: 20, width: '100%', maxWidth, maxHeight: '90vh',
        display: 'flex', flexDirection: 'column', overflow: 'hidden',
        border: '1px solid var(--border)', boxShadow: '0 24px 80px rgba(0,0,0,0.4)',
        animation: 'mShellSlide .25s ease',
      }}>
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16,
        }}>
          <div>
            <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: 20, fontWeight: 800, color: 'var(--text)', letterSpacing: '-0.03em', margin: 0 }}>
              {title}
            </h2>
            {subtitle && <p style={{ fontSize: 13, color: 'var(--muted)', margin: '4px 0 0 0' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{
            background: 'var(--bg2)', border: '1px solid var(--border)', borderRadius: 10,
            width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', color: 'var(--muted)',
          }}>
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}

// ─── New View Modal (with presets) ────────────────────────────────────────────
export function NewViewModal({ open, onClose, onCreate }) {
  const [name, setName] = useState('')
  const [selectedPreset, setSelectedPreset] = useState('default')

  useEffect(() => {
    if (open) {
      setName('')
      setSelectedPreset('default')
    }
  }, [open])

  const handleCreate = () => {
    const preset = PRESETS[selectedPreset]
    const finalName = (name.trim() || preset.name)
    onCreate(finalName, preset.items())
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title="Nueva vista de dashboard"
      subtitle="Crea una vista para un caso de uso específico (Marketing, Performance, Finanzas...)">

      <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
        {/* Name input */}
        <div style={{ marginBottom: 18 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 6 }}>
            Nombre de la vista
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ej: Marketing, Q4, Cliente Acme..."
            maxLength={60}
            autoFocus
            style={{
              width: '100%', padding: '11px 14px', borderRadius: 10,
              border: '1px solid var(--border)', background: 'var(--bg2)',
              color: 'var(--text)', fontSize: 14, outline: 'none', fontFamily: FONT_BODY,
            }}
            onFocus={(e) => e.currentTarget.style.borderColor = PURPLE}
            onBlur={(e) => e.currentTarget.style.borderColor = 'var(--border)'}
          />
        </div>

        {/* Preset picker */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'block', marginBottom: 8 }}>
            Plantilla de partida
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 10 }}>
            {Object.entries(PRESETS).map(([key, preset]) => {
              const sel = selectedPreset === key
              return (
                <button key={key}
                  onClick={() => setSelectedPreset(key)}
                  style={{
                    background: sel ? pa(0.08) : 'var(--surface)',
                    border: `1.5px solid ${sel ? pa(0.5) : 'var(--border)'}`,
                    borderRadius: 12, padding: 14, cursor: 'pointer',
                    textAlign: 'left', fontFamily: FONT_BODY, position: 'relative',
                    transition: 'border-color .15s, transform .15s',
                  }}
                >
                  {sel && (
                    <div style={{
                      position: 'absolute', top: 8, right: 8,
                      width: 18, height: 18, borderRadius: 9, background: PURPLE,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <Check size={11} color="#fff" strokeWidth={3} />
                    </div>
                  )}
                  <div style={{ fontSize: 22, marginBottom: 4 }}>{preset.icon}</div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2, fontFamily: FONT_DISPLAY }}>
                    {preset.name}
                  </div>
                  <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                    {preset.description}
                  </div>
                  <div style={{ fontSize: 10, color: 'var(--muted2)', marginTop: 6 }}>
                    {preset.items().length} widgets
                  </div>
                </button>
              )
            })}

            <button onClick={() => { onCreate(name.trim() || 'Nueva vista', []); onClose() }}
              style={{
                background: 'var(--surface)', border: '1.5px dashed var(--border)',
                borderRadius: 12, padding: 14, cursor: 'pointer', textAlign: 'left', fontFamily: FONT_BODY,
              }}
            >
              <div style={{ fontSize: 22, marginBottom: 4 }}>📭</div>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: 'var(--text)', marginBottom: 2, fontFamily: FONT_DISPLAY }}>
                Vista vacía
              </div>
              <div style={{ fontSize: 11.5, color: 'var(--muted)', lineHeight: 1.4 }}>
                Empieza desde cero y añade widgets manualmente
              </div>
            </button>
          </div>
        </div>
      </div>

      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, background: 'var(--bg2)',
      }}>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
          cursor: 'pointer', fontFamily: FONT_BODY,
        }}>
          Cancelar
        </button>
        <button onClick={handleCreate} style={{
          background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
          padding: '9px 18px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${pa(0.35)}`,
        }}>
          Crear vista
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Export Modal ────────────────────────────────────────────────────────────
export function ExportViewModal({ open, onClose, json, viewName }) {
  const [copied, setCopied] = useState(false)
  const textareaRef = useRef(null)

  useEffect(() => { if (!open) setCopied(false) }, [open])

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(json)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      textareaRef.current?.select()
      document.execCommand('copy')
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([json], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${(viewName || 'dashboard').replace(/[^a-z0-9]/gi, '_').toLowerCase()}_template.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title="Exportar template"
      subtitle={`Comparte el diseño "${viewName}" como template reutilizable`}
      maxWidth={640}>

      <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
        <textarea
          ref={textareaRef}
          value={json || ''}
          readOnly
          style={{
            width: '100%', minHeight: 280, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
            fontSize: 12, padding: 14, borderRadius: 10,
            border: '1px solid var(--border)', background: 'var(--bg2)',
            color: 'var(--text)', outline: 'none', resize: 'vertical',
          }}
        />
        <p style={{ fontSize: 12, color: 'var(--muted)', marginTop: 10, lineHeight: 1.5 }}>
          Copia este JSON y compártelo. Cualquier usuario podrá importarlo en su dashboard.
        </p>
      </div>

      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, background: 'var(--bg2)',
      }}>
        <button onClick={handleDownload} style={{
          background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 14px', fontSize: 12.5, fontWeight: 600, color: 'var(--text)',
          cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <Download size={13} /> Descargar .json
        </button>
        <button onClick={handleCopy} style={{
          background: copied ? '#10b981' : PURPLE, color: '#fff', border: 'none', borderRadius: 10,
          padding: '9px 18px', fontSize: 12.5, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY, display: 'flex', alignItems: 'center', gap: 6,
        }}>
          {copied ? <><Check size={13} strokeWidth={2.5} /> Copiado</> : <><Copy size={13} /> Copiar</>}
        </button>
      </div>
    </ModalShell>
  )
}

// ─── Import Modal ────────────────────────────────────────────────────────────
export function ImportViewModal({ open, onClose, onImport }) {
  const [text, setText] = useState('')
  const [error, setError] = useState(null)
  const fileRef = useRef(null)

  useEffect(() => { if (open) { setText(''); setError(null) } }, [open])

  const handleFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => setText(String(ev.target?.result || ''))
    reader.readAsText(file)
  }

  const handleImport = () => {
    if (!text.trim()) { setError('Pega un template JSON'); return }
    const result = onImport(text)
    if (result?.success) {
      onClose()
    } else {
      setError(result?.error || 'Error al importar')
    }
  }

  return (
    <ModalShell open={open} onClose={onClose}
      title="Importar template"
      subtitle="Pega el JSON de un template o selecciona un archivo"
      maxWidth={640}>

      <div style={{ padding: 20, overflow: 'auto', flex: 1 }}>
        <input
          ref={fileRef}
          type="file"
          accept="application/json,.json"
          onChange={handleFile}
          style={{ display: 'none' }}
        />
        <button onClick={() => fileRef.current?.click()}
          style={{
            width: '100%', padding: '14px 16px', borderRadius: 12,
            border: `1.5px dashed ${pa(0.4)}`, background: pa(0.04),
            color: PURPLE, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            fontFamily: FONT_BODY, marginBottom: 12,
          }}
        >
          <Upload size={14} /> Seleccionar archivo .json
        </button>

        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', top: -7, left: 14, padding: '0 8px',
            background: 'var(--bg)', fontSize: 10, color: 'var(--muted2)',
            textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600,
          }}>
            o pega JSON
          </span>
          <textarea
            value={text}
            onChange={(e) => { setText(e.target.value); setError(null) }}
            placeholder='{"__format":"channelad-dashboard-template", ...}'
            style={{
              width: '100%', minHeight: 220, fontFamily: 'Menlo, Monaco, "Courier New", monospace',
              fontSize: 12, padding: 14, borderRadius: 10,
              border: `1px solid ${error ? '#ef4444' : 'var(--border)'}`,
              background: 'var(--bg2)', color: 'var(--text)', outline: 'none', resize: 'vertical',
            }}
          />
        </div>

        {error && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8, background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#ef4444', fontSize: 12 }}>
            {error}
          </div>
        )}
      </div>

      <div style={{
        padding: '14px 20px', borderTop: '1px solid var(--border)',
        display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 8, background: 'var(--bg2)',
      }}>
        <button onClick={onClose} style={{
          background: 'transparent', border: '1px solid var(--border)', borderRadius: 10,
          padding: '9px 16px', fontSize: 13, fontWeight: 600, color: 'var(--text)',
          cursor: 'pointer', fontFamily: FONT_BODY,
        }}>
          Cancelar
        </button>
        <button onClick={handleImport} style={{
          background: PURPLE, color: '#fff', border: 'none', borderRadius: 10,
          padding: '9px 18px', fontSize: 13, fontWeight: 600,
          cursor: 'pointer', fontFamily: FONT_BODY, boxShadow: `0 4px 14px ${pa(0.35)}`,
          display: 'flex', alignItems: 'center', gap: 6,
        }}>
          <FileJson size={13} /> Importar
        </button>
      </div>
    </ModalShell>
  )
}
