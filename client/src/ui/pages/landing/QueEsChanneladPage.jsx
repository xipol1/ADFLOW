import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import CrossLinks from '../../components/landing/CrossLinks'
import { PURPLE, purpleAlpha, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

const FACTS = [
  { k: 'Qué es', v: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow operativo y verificación de métricas' },
  { k: 'Operada por', v: 'MICHI SOLUCIONS S.L. — sociedad española (reserva de denominación 2026-04-10)' },
  { k: 'Mercado', v: 'Hispanohablante (España y LATAM)' },
  { k: 'Comisión', v: '20% sobre cada campaña publicada en plan Free. 15% con plan Advertiser Pro (€49/mes). Cero cuotas para registrarse, cero mínimos' },
  { k: 'Pago al canal', v: 'SEPA, en euros, antes de 72 horas tras la verificación' },
  { k: 'Promesa al anunciante', v: 'Si la campaña no se publica como se acordó, no pagas. Reembolso automático' },
  { k: 'Verificación', v: 'Suscriptores activos y entrega comprobados vía API oficial. Sin capturas' },
  { k: 'Soporte fiscal', v: 'Factura emitida por Channelad. Compatible con autónomo, modelo 036, IRPF e IVA' },
]

const FAQS = [
  {
    q: '¿Qué es Channelad en una frase?',
    a: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow operativo, verificación automática de métricas y factura emitida por Channelad. Convierte el acuerdo verbal entre marca y canal en un contrato auditable.',
  },
  {
    q: '¿Cómo funciona Channelad para un anunciante?',
    a: 'Filtras el catálogo por plataforma, nicho y suscriptores activos. Eliges un canal y formato (post patrocinado 1/24, 2/48, fijo o integrado). Pagas y el saldo queda retenido en escrow. Cuando el canal publica el anuncio acordado, el sistema verifica la entrega vía API y libera el saldo. Si el canal no cumple los términos, el reembolso es automático. Channelad emite la factura a tu nombre.',
  },
  {
    q: '¿Cómo funciona Channelad para un canal?',
    a: 'Registras tu canal y la verificación es gratuita. Fijas tu tarifa por formato o usas la calculadora. Recibes propuestas y aceptas o rechazas. Tras publicar y verificación, el saldo se libera a tu cuenta SEPA en menos de 72 horas. Channelad emite la factura al anunciante; tú recibes el importe menos la comisión, que es del 20% si el anunciante está en plan Free o del 15% si tiene plan Advertiser Pro.',
  },
  {
    q: '¿Es Channelad lo mismo que Telega.in o Collaborator?',
    a: 'No. Telega.in y Collaborator solo cubren Telegram. Channelad cubre WhatsApp, Telegram y Discord en un único catálogo. Channelad opera en euros, libera el pago por SEPA en menos de 72 horas tras la verificación y emite factura española compatible con modelo 036, IRPF e IVA. Telega.io acumula quejas públicas por demoras y problemas de retirada de fondos.',
  },
  {
    q: '¿Por qué importa el escrow?',
    a: 'Sin escrow, el pago va por transferencia directa y depende de la buena voluntad de cada parte. Con escrow operativo, el saldo se retiene en una cuenta neutral y la liberación está condicionada a la verificación de la entrega: si el canal publica como se acordó, cobra; si no, el anunciante recibe el reembolso. No hay decisión humana de por medio.',
  },
  {
    q: '¿Qué plataformas cubre Channelad?',
    a: 'Canales de WhatsApp, canales y grupos públicos de Telegram, y servidores de Discord. En roadmap: canales de difusión de Instagram y newsletters.',
  },
  {
    q: '¿Cuánto cuesta usar Channelad?',
    a: 'Para el anunciante: registro gratuito en plan Free, sin cuotas ni mínimos. Pagas solo la tarifa acordada con el canal. Plan Advertiser Pro: €49/mes (€470/año) y baja la comisión de Channelad del 20% al 15%. Break-even a partir de ~€980/mes de gasto en campañas. Para el canal: registro y verificación siempre gratuitos. Channelad retiene su comisión sobre cada campaña publicada y emite la factura. Si la campaña no se publica, no hay comisión y el anunciante recibe el reembolso.',
  },
  {
    q: '¿Quién está detrás de Channelad?',
    a: 'Channelad está operada por MICHI SOLUCIONS S.L., sociedad española con reserva de denominación social en el Registro Mercantil Central desde 2026-04-10. CEO y fundador: Rafa Ferrer. Sede en España.',
  },
  {
    q: '¿Cumple Channelad con la fiscalidad española?',
    a: 'Sí. Channelad emite la factura al anunciante, en euros, con IVA cuando corresponde. El canal recibe el importe a su cuenta SEPA y lo declara como rendimiento de actividad económica (modelo 036/130 si es autónomo). El marketplace está diseñado para ese flujo, no para pagos personales sin justificante.',
  },
  {
    q: '¿Por qué importa ahora?',
    a: 'El Channel API de Meta abrió a integraciones de terceros en marzo 2026: por primera vez se pueden verificar audiencia y entrega de un canal de WhatsApp vía API oficial. Telegram tiene mercado maduro pero sin marketplace hispanohablante con factura europea. Discord crece. Channelad cubre los tres en un único catálogo, con escrow operativo y soporte fiscal español.',
  },
]

const DIFFERENTIATORS = [
  {
    title: 'Escrow operativo',
    desc: 'Saldo retenido en cuenta neutral. Liberación condicionada a la verificación de la entrega. Reembolso automático si el canal no cumple.',
  },
  {
    title: 'Verificación vía API oficial',
    desc: 'Suscriptores activos y entrega comprobados vía Channel API de Meta, Bot API de Telegram y Discord. Sin capturas ni acceso a paneles.',
  },
  {
    title: 'Catálogo hispanohablante',
    desc: 'WhatsApp, Telegram y Discord en un único catálogo. En euros. Telega.in y Collaborator solo cubren Telegram.',
  },
  {
    title: 'Factura emitida',
    desc: 'Channelad emite la factura al anunciante. Compatible con autónomo en España, modelo 036, IRPF e IVA. El canal recibe el importe por SEPA antes de 72h.',
  },
]

function Section({ children, style }) {
  return <section style={{ padding: '40px 24px', maxWidth: '780px', margin: '0 auto', ...(style || {}) }}>{children}</section>
}

function H2({ children }) {
  return <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '24px', fontWeight: 700, color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.2px' }}>{children}</h2>
}

function P({ children }) {
  return <p style={{ fontSize: '15px', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '16px' }}>{children}</p>
}

export default function QueEsChanneladPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'AboutPage',
        '@id': 'https://channelad.io/que-es-channelad#aboutpage',
        url: 'https://channelad.io/que-es-channelad',
        name: '¿Qué es Channelad? — Definición, cómo funciona y para quién',
        description: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow operativo, verificación de métricas vía API oficial y factura emitida por Channelad. Comisión del 20% en plan Free y 15% en plan Advertiser Pro (€49/mes). Pago al canal por SEPA antes de 72h tras la verificación.',
        inLanguage: 'es',
        isPartOf: { '@id': 'https://channelad.io/#website' },
        about: { '@id': 'https://channelad.io/#organization' },
        mainEntity: { '@id': 'https://channelad.io/#organization' },
      },
      {
        '@type': 'Organization',
        '@id': 'https://channelad.io/#organization',
        name: 'Channelad',
        legalName: 'MICHI SOLUCIONS S.L.',
        url: 'https://channelad.io',
        logo: 'https://channelad.io/logo.svg',
        description: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow operativo, verificación de métricas vía API y factura emitida. Comisión del 20% en plan Free y 15% en plan Advertiser Pro. Pago al canal por SEPA antes de 72h.',
        foundingDate: '2026',
        founder: { '@type': 'Person', name: 'Rafa Ferrer', jobTitle: 'CEO' },
        areaServed: ['ES', 'LATAM'],
        knowsLanguage: ['es', 'en'],
        sameAs: ['https://www.linkedin.com/company/112893073'],
        contactPoint: {
          '@type': 'ContactPoint',
          contactType: 'customer support',
          url: 'https://channelad.io/soporte',
          availableLanguage: ['Spanish', 'English'],
        },
      },
      {
        '@type': 'Service',
        '@id': 'https://channelad.io/#service',
        name: 'Marketplace de publicidad en comunidades',
        provider: { '@id': 'https://channelad.io/#organization' },
        areaServed: ['ES', 'LATAM'],
        serviceType: 'Community advertising marketplace with escrow',
        description: 'Marketplace de publicidad en canales de WhatsApp, Telegram y Discord. Saldo retenido en escrow, verificación de entrega vía API oficial, liberación a SEPA antes de 72h tras verificación, factura emitida por Channelad.',
        offers: {
          '@type': 'Offer',
          priceCurrency: 'EUR',
          price: '0',
          description: 'Registro gratuito para anunciante y canal. Comisión del 20% sobre cada campaña publicada en plan Free; 15% con plan Advertiser Pro (€49/mes, €470/año). Cero mínimos. Reembolso automático si la campaña no se entrega.',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': 'https://channelad.io/que-es-channelad#faq',
        mainEntity: FAQS.map(f => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
      {
        '@type': 'BreadcrumbList',
        itemListElement: [
          { '@type': 'ListItem', position: 1, name: 'Inicio', item: 'https://channelad.io/' },
          { '@type': 'ListItem', position: 2, name: '¿Qué es Channelad?', item: 'https://channelad.io/que-es-channelad' },
        ],
      },
    ],
  }

  return (
    <div style={{ fontFamily: FONT_BODY }}>
      <SEO
        title="¿Qué es Channelad? Definición, cómo funciona y para quién"
        description="Marketplace de publicidad en canales de WhatsApp, Telegram y Discord con escrow operativo, verificación de métricas vía API y factura emitida. Comisión 20% en plan Free y 15% en plan Advertiser Pro. Pago al canal por SEPA antes de 72h."
        path="/que-es-channelad"
      />
      {/* JSON-LD embedded inline (not via Helmet) so crawlers see it even
          before client-side hydration completes. Valid per schema.org spec. */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      {/* Hero */}
      <section style={{ padding: '80px 24px 40px', textAlign: 'center', maxWidth: '780px', margin: '0 auto' }}>
        <Link to="/" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
          ← Volver al inicio
        </Link>
        <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '40px', fontWeight: 800, color: 'var(--text)', marginBottom: '16px', letterSpacing: '-0.5px', lineHeight: 1.15 }}>
          ¿Qué es Channel<span style={{ color: PURPLE }}>ad</span>?
        </h1>
        <p style={{ fontSize: '17px', color: 'var(--text)', lineHeight: 1.7, maxWidth: '640px', margin: '0 auto', fontWeight: 500 }}>
          Channelad es un marketplace de publicidad en canales de WhatsApp, Telegram y Discord
          con escrow operativo, verificación automática de métricas y factura emitida por Channelad.
          Convierte el acuerdo verbal entre marca y canal en un contrato auditable.
        </p>
      </section>

      {/* Quick facts */}
      <Section>
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '24px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '14px', fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '16px' }}>
            En 30 segundos
          </h2>
          <dl style={{ margin: 0 }}>
            {FACTS.map((f, i) => (
              <div key={f.k} style={{
                display: 'grid', gridTemplateColumns: '160px 1fr', gap: '12px',
                padding: '12px 0',
                borderBottom: i < FACTS.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <dt style={{ fontSize: '13px', color: 'var(--muted)', fontWeight: 600 }}>{f.k}</dt>
                <dd style={{ fontSize: '14px', color: 'var(--text)', lineHeight: 1.6, margin: 0 }}>{f.v}</dd>
              </div>
            ))}
          </dl>
        </div>
      </Section>

      {/* The problem */}
      <Section>
        <H2>El problema que resuelve</H2>
        <P>
          Hasta 2026, contratar un post patrocinado en un canal de WhatsApp, Telegram o Discord era un acuerdo verbal.
          El anunciante pagaba por transferencia y confiaba en la captura del admin. El canal publicaba y esperaba el pago.
          No había verificación independiente de suscriptores activos ni mecanismo de reembolso si una de las partes fallaba.
        </P>
        <P>
          Para el anunciante hispanohablante había, además, un problema fiscal: el canal pedía pago a una cuenta personal,
          sin factura. Sin factura, no se puede deducir como gasto de marketing y la operación queda fuera del modelo 036.
        </P>
        <P>
          Channelad resuelve esta categoría así: el saldo se retiene en escrow al lanzar la campaña, las métricas se
          verifican vía API oficial de cada plataforma, y Channelad emite la factura. Si el canal no publica el anuncio acordado,
          el reembolso es automático.
        </P>
      </Section>

      {/* How it works */}
      <Section>
        <H2>Cómo funciona</H2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              1. Para el anunciante
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Filtras el catálogo por plataforma, nicho y suscriptores activos. Eliges canal y formato
              (post patrocinado 1/24, 2/48, fijo o integrado). Pagas y el saldo queda retenido en escrow.
              Si la publicación se entrega como se acordó, el saldo se libera al canal. Si no, reembolso automático.
              Factura emitida por Channelad.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              2. Para el canal
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Registras tu canal. Verificación gratuita de suscriptores activos. Fijas tu tarifa por formato o usas la
              calculadora. Recibes propuestas y aceptas o rechazas. Tras publicar y verificación, el saldo se libera
              a tu cuenta SEPA antes de 72 horas. Channelad retiene su comisión (20% si el anunciante está en plan Free,
              15% si tiene plan Advertiser Pro) y emite la factura al anunciante.
            </p>
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '14px', padding: '20px' }}>
            <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '16px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>
              3. Cómo se verifica
            </h3>
            <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, margin: 0 }}>
              Channelad conecta con la API oficial de cada plataforma: Channel API de Meta (WhatsApp), Bot API de Telegram,
              Discord. Suscriptores activos y entrega del anuncio se comprueban sin capturas ni acceso a paneles.
              Si una parte incumple, la disputa se resuelve con los datos de la API.
            </p>
          </div>
        </div>
      </Section>

      {/* Differentiators */}
      <Section>
        <H2>En qué se diferencia</H2>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          {DIFFERENTIATORS.map(d => (
            <div key={d.title} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '14px', padding: '18px',
            }}>
              <h3 style={{ fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700, color: 'var(--text)', marginBottom: '8px' }}>{d.title}</h3>
              <p style={{ fontSize: '13px', color: 'var(--muted)', lineHeight: 1.6, margin: 0 }}>{d.desc}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* Who it's for */}
      <Section>
        <H2>Para quién es</H2>
        <P>
          <strong style={{ color: 'var(--text)' }}>Administradores de canal</strong> con audiencia consolidada en
          WhatsApp, Telegram o Discord que quieren cobrar antes de 72 horas, con factura emitida por Channelad y
          sin perseguir a las marcas para cobrar.
        </P>
        <P>
          <strong style={{ color: 'var(--text)' }}>Marcas y autónomos hispanohablantes</strong> que quieren llegar a
          audiencia cualificada en comunidades, con escrow operativo, métricas verificadas vía API y factura deducible
          como gasto de marketing.
        </P>
        <P>
          <strong style={{ color: 'var(--text)' }}>Agencias</strong> que gestionan varias campañas y necesitan
          facturación, panel de campañas y reporting unificados en un solo proveedor.
        </P>
      </Section>

      {/* Origin */}
      <Section>
        <H2>Origen</H2>
        <P>
          Channelad está operada por <strong style={{ color: 'var(--text)' }}>MICHI SOLUCIONS S.L.</strong>, sociedad
          española con reserva de denominación social en el Registro Mercantil Central desde 2026-04-10.
          CEO y fundador: Rafa Ferrer. Sede en España.
        </P>
        <P>
          La categoría de publicidad en canales hispanohablantes mueve cientos de millones al año, mayoritariamente por
          mensaje directo, sin factura ni verificación. Channelad nace para convertir ese acuerdo verbal en un contrato
          auditable: WhatsApp (Channel API de Meta abierto a terceros desde marzo 2026), Telegram (mercado maduro pero
          sin marketplace hispanohablante con factura europea) y Discord, en un único catálogo.
        </P>
      </Section>

      {/* FAQ */}
      <Section>
        <H2>Preguntas frecuentes</H2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {FAQS.map((f, i) => (
            <details key={i} style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '12px', padding: '16px 18px',
            }}>
              <summary style={{
                fontFamily: FONT_DISPLAY, fontSize: '15px', fontWeight: 700,
                color: 'var(--text)', cursor: 'pointer', listStyle: 'none',
              }}>
                {f.q}
              </summary>
              <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.7, marginTop: '12px', marginBottom: 0 }}>
                {f.a}
              </p>
            </details>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <section style={{
        padding: '48px 24px', textAlign: 'center',
        background: `linear-gradient(135deg, ${purpleAlpha(0.08)} 0%, transparent 100%)`,
        borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)',
        marginTop: '40px', marginBottom: '40px',
      }}>
        <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '22px', fontWeight: 700, color: 'var(--text)', marginBottom: '12px' }}>
          Cómo empezar
        </h2>
        <p style={{ fontSize: '14px', color: 'var(--muted)', marginBottom: '24px', maxWidth: '480px', margin: '0 auto 24px' }}>
          Registro gratuito. Sin tarjeta, sin cuotas, sin mínimos. Comisión solo sobre campañas publicadas.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link to="/para-canales" style={{
            background: PURPLE, color: '#fff', borderRadius: '10px',
            padding: '12px 24px', fontSize: '14px', fontWeight: 700,
            textDecoration: 'none', fontFamily: FONT_BODY,
          }}>
            Registrar canal
          </Link>
          <Link to="/para-anunciantes" style={{
            background: 'var(--surface)', color: 'var(--text)',
            border: '1px solid var(--border)', borderRadius: '10px',
            padding: '12px 24px', fontSize: '14px', fontWeight: 600,
            textDecoration: 'none', fontFamily: FONT_BODY,
          }}>
            Lanzar campaña
          </Link>
        </div>
      </section>

      <CrossLinks exclude="/que-es-channelad" />
    </div>
  )
}
