import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { MessageCircle, X, Send, Clock, CheckCheck } from 'lucide-react'
import { FONT_DISPLAY, FONT_BODY } from '../../theme/tokens'

const QUICK_QUESTIONS = [
  '¿Como funciona el escrow?',
  '¿Cuando abre el marketplace?',
  '¿Cual es la comision?',
  'Quiero hablar con ventas',
]

export default function SupportChat() {
  const [open, setOpen] = useState(false)
  const [showPulse, setShowPulse] = useState(false)
  const [messages, setMessages] = useState([
    {
      from: 'agent',
      author: 'Rafa · Soporte',
      text: '¡Hola! 👋 Soy Rafa del equipo. ¿En que puedo ayudarte? Respondemos en menos de 24h (normalmente <2h).',
      time: 'Ahora',
    },
  ])
  const [input, setInput] = useState('')

  useEffect(() => {
    const t = setTimeout(() => setShowPulse(true), 8000)
    return () => clearTimeout(t)
  }, [])

  const send = (text) => {
    if (!text?.trim()) return
    setMessages(m => [...m, { from: 'user', text: text.trim(), time: 'Ahora' }])
    setInput('')
    setTimeout(() => {
      setMessages(m => [...m, {
        from: 'agent',
        author: 'Rafa · Soporte',
        text: 'Te respondo por email en breve. Mientras, deja tu correo y un colega humano te contactara hoy mismo.',
        time: 'Ahora',
      }])
    }, 1200)
  }

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
            className="support-chat-panel"
            style={{
              position: 'fixed', bottom: 90, right: 24,
              width: 360, maxWidth: 'calc(100vw - 32px)',
              maxHeight: 540,
              background: '#fff',
              borderRadius: 18,
              boxShadow: '0 24px 60px rgba(15,23,42,0.18), 0 0 0 1px rgba(15,23,42,0.06)',
              zIndex: 90,
              overflow: 'hidden',
              display: 'flex', flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div style={{
              background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
              padding: '18px 18px 22px',
              color: '#fff',
              position: 'relative',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                <div style={{
                  display: 'inline-flex', alignItems: 'center', gap: 6,
                  background: 'rgba(255,255,255,0.18)',
                  fontSize: 11, fontWeight: 600,
                  padding: '3px 10px', borderRadius: 999,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%', background: '#22c55e',
                    boxShadow: '0 0 6px #22c55e',
                  }} />
                  Online ahora
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Cerrar chat"
                  style={{
                    background: 'rgba(255,255,255,0.15)',
                    border: 'none', borderRadius: 8,
                    width: 28, height: 28,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: '#fff', cursor: 'pointer',
                  }}
                ><X size={14} /></button>
              </div>
              <h3 style={{
                fontFamily: FONT_DISPLAY, fontSize: 18, fontWeight: 700,
                margin: '4px 0 4px', letterSpacing: '-0.02em',
              }}>Hablamos contigo</h3>
              <p style={{ fontSize: 12, margin: 0, opacity: 0.85 }}>
                <Clock size={11} style={{ display: 'inline', verticalAlign: -1, marginRight: 3 }} />
                Respuesta humana en menos de 24h
              </p>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#fafafa' }}>
              {messages.map((m, i) => (
                <div key={i} style={{
                  display: 'flex',
                  justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
                  marginBottom: 10,
                }}>
                  <div style={{ maxWidth: '85%' }}>
                    {m.author && (
                      <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 3, fontWeight: 600 }}>
                        {m.author}
                      </div>
                    )}
                    <div style={{
                      background: m.from === 'user' ? '#7C3AED' : '#fff',
                      color: m.from === 'user' ? '#fff' : 'var(--text)',
                      padding: '10px 13px',
                      borderRadius: 14,
                      fontSize: 13, lineHeight: 1.5,
                      border: m.from === 'agent' ? '1px solid rgba(15,23,42,0.06)' : 'none',
                      boxShadow: '0 1px 2px rgba(15,23,42,0.04)',
                    }}>
                      {m.text}
                    </div>
                    <div style={{
                      fontSize: 10, color: 'var(--muted)', marginTop: 3,
                      textAlign: m.from === 'user' ? 'right' : 'left',
                      display: 'flex', alignItems: 'center', gap: 3,
                      justifyContent: m.from === 'user' ? 'flex-end' : 'flex-start',
                    }}>
                      {m.time}
                      {m.from === 'user' && <CheckCheck size={11} style={{ color: '#22c55e' }} />}
                    </div>
                  </div>
                </div>
              ))}

              {messages.length === 1 && (
                <div style={{ marginTop: 14 }}>
                  <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, fontWeight: 600 }}>
                    Preguntas rapidas
                  </div>
                  {QUICK_QUESTIONS.map((q, i) => (
                    <button
                      key={i}
                      onClick={() => send(q)}
                      style={{
                        display: 'block', width: '100%',
                        textAlign: 'left',
                        background: '#fff',
                        border: '1px solid rgba(15,23,42,0.08)',
                        borderRadius: 10,
                        padding: '8px 12px',
                        marginBottom: 6,
                        fontSize: 12, color: 'var(--text)',
                        cursor: 'pointer',
                        transition: 'border-color 0.2s, background 0.2s',
                      }}
                      onMouseEnter={e => {
                        e.currentTarget.style.borderColor = '#7C3AED'
                        e.currentTarget.style.background = 'rgba(124,58,237,0.04)'
                      }}
                      onMouseLeave={e => {
                        e.currentTarget.style.borderColor = 'rgba(15,23,42,0.08)'
                        e.currentTarget.style.background = '#fff'
                      }}
                    >{q}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => { e.preventDefault(); send(input) }}
              style={{
                borderTop: '1px solid rgba(15,23,42,0.06)',
                padding: 12, display: 'flex', gap: 8, background: '#fff',
              }}
            >
              <input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder="Escribe tu mensaje..."
                style={{
                  flex: 1, padding: '10px 14px',
                  border: '1px solid rgba(15,23,42,0.1)',
                  borderRadius: 10, fontSize: 13,
                  outline: 'none', fontFamily: FONT_BODY,
                }}
              />
              <button
                type="submit"
                disabled={!input.trim()}
                style={{
                  width: 40, height: 40,
                  background: input.trim() ? '#7C3AED' : 'rgba(15,23,42,0.06)',
                  color: '#fff', border: 'none',
                  borderRadius: 10, cursor: input.trim() ? 'pointer' : 'not-allowed',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'background 0.2s',
                }}
              ><Send size={15} /></button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => { setOpen(o => !o); setShowPulse(false) }}
        aria-label="Abrir chat de soporte"
        whileHover={{ scale: 1.06 }}
        whileTap={{ scale: 0.94 }}
        style={{
          position: 'fixed', bottom: 24, right: 24,
          width: 56, height: 56, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED, #A855F7)',
          border: 'none',
          boxShadow: '0 12px 28px rgba(124,58,237,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', cursor: 'pointer',
          zIndex: 95,
        }}
      >
        <AnimatePresence mode="wait">
          {open
            ? <motion.div key="x" initial={{ rotate: -90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: 90, opacity: 0 }}><X size={22} /></motion.div>
            : <motion.div key="m" initial={{ rotate: 90, opacity: 0 }} animate={{ rotate: 0, opacity: 1 }} exit={{ rotate: -90, opacity: 0 }}><MessageCircle size={22} /></motion.div>
          }
        </AnimatePresence>

        {showPulse && !open && (
          <>
            <motion.span
              animate={{ scale: [1, 1.6], opacity: [0.6, 0] }}
              transition={{ duration: 1.6, repeat: Infinity }}
              style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: '#7C3AED', pointerEvents: 'none',
              }}
            />
            <span style={{
              position: 'absolute', top: 4, right: 4,
              width: 10, height: 10, borderRadius: '50%',
              background: '#22c55e', border: '2px solid #fff',
            }} />
          </>
        )}
      </motion.button>
    </>
  )
}
