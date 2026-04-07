import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FONT_DISPLAY, FONT_BODY, PURPLE, purpleAlpha } from '../../theme/tokens'

const FAQS = [
  {
    q: 'Como funciona la publicidad en comunidades de WhatsApp, Telegram y Discord?',
    a: 'Channelad conecta anunciantes con canales verificados de WhatsApp, Telegram y Discord. El anunciante elige un canal, envia su anuncio y el pago se retiene en custodia hasta que el canal publica. Las metricas se verifican automaticamente.',
  },
  {
    q: 'Cuanto cuesta anunciarse en canales de Telegram y WhatsApp?',
    a: 'Los precios los fija cada canal. Encontraras opciones desde 50 euros hasta mas de 1.000 euros por publicacion segun el tamano de la audiencia y el nicho. No hay costes fijos, suscripciones ni minimos de gasto.',
  },
  {
    q: 'Es seguro pagar por publicidad en comunidades?',
    a: 'Si. Channelad usa un sistema de pago custodiado (escrow). El dinero se retiene de forma segura y solo se libera al creador cuando se confirma la publicacion del anuncio segun los terminos acordados. Si el canal no cumple, el pago se devuelve automaticamente.',
  },
  {
    q: 'Como puedo monetizar mi canal de Telegram, WhatsApp o Discord?',
    a: 'Registra tu canal gratis en Channelad, completa la verificacion automatica y fija tus tarifas. Los anunciantes te encontraran en el marketplace. Solo se cobra una comision del 10% por campana completada. No hay costes fijos.',
  },
  {
    q: 'Que alternativas existen a Collaborator y Telega para publicidad en Telegram?',
    a: 'Channelad es la alternativa en espanol que cubre WhatsApp, Telegram y Discord en un solo marketplace. A diferencia de Collaborator o Telega.in, Channelad ofrece pagos custodiados, verificacion automatica de metricas y soporte para comunidades en espanol.',
  },
]

const spring = [0.22, 1, 0.36, 1]

export default function FAQSection() {
  const [open, setOpen] = useState(null)

  return (
    <section style={{ padding: 'clamp(60px,8vw,100px) clamp(16px,4vw,24px)', background: 'var(--bg)' }}>
      <div style={{ maxWidth: '720px', margin: '0 auto' }}>
        <motion.h2
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.6, ease: spring }}
          style={{
            fontFamily: FONT_DISPLAY, fontWeight: 700,
            fontSize: 'clamp(24px, 4vw, 36px)',
            letterSpacing: '-0.03em', textAlign: 'center',
            color: 'var(--text)', marginBottom: '48px',
          }}
        >
          Preguntas frecuentes
        </motion.h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
          {FAQS.map((faq, i) => {
            const isOpen = open === i
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-40px' }}
                transition={{ duration: 0.4, delay: i * 0.06, ease: spring }}
              >
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left',
                    background: isOpen ? purpleAlpha(0.04) : 'transparent',
                    border: 'none', cursor: 'pointer',
                    padding: '20px 24px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    gap: '16px', transition: 'background 0.2s',
                  }}
                  onMouseEnter={e => { if (!isOpen) e.currentTarget.style.background = 'var(--bg2)' }}
                  onMouseLeave={e => { if (!isOpen) e.currentTarget.style.background = 'transparent' }}
                >
                  <span style={{
                    fontFamily: FONT_BODY, fontSize: '15px', fontWeight: 600,
                    color: isOpen ? PURPLE : 'var(--text)', lineHeight: 1.4,
                    transition: 'color 0.2s',
                  }}>
                    {faq.q}
                  </span>
                  <span style={{
                    fontSize: '20px', fontWeight: 300, color: 'var(--muted)',
                    transform: isOpen ? 'rotate(45deg)' : 'rotate(0deg)',
                    transition: 'transform 0.3s ease',
                    flexShrink: 0,
                  }}>
                    +
                  </span>
                </button>

                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: [0.25, 0.46, 0.45, 0.94] }}
                      style={{ overflow: 'hidden' }}
                    >
                      <p style={{
                        fontFamily: FONT_BODY, fontSize: '14px', lineHeight: 1.7,
                        color: 'var(--muted)', padding: '4px 24px 20px',
                        margin: 0,
                      }}>
                        {faq.a}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )
          })}
        </div>
      </div>
    </section>
  )
}
