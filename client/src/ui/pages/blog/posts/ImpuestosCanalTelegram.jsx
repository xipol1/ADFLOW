import React from 'react'
import { Link } from 'react-router-dom'

const PURPLE = '#7C3AED'
const F = "'Inter', system-ui, sans-serif"
const D = "'Sora', system-ui, sans-serif"

const h2Style = { fontFamily: D, fontSize: 'clamp(22px, 4vw, 28px)', fontWeight: 700, lineHeight: 1.3, letterSpacing: '-0.3px', marginTop: '48px', marginBottom: '16px', color: 'var(--text)' }
const h3Style = { fontFamily: D, fontSize: '18px', fontWeight: 600, marginTop: '24px', marginBottom: '8px', color: 'var(--text)' }
const pStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '16px' }
const liStyle = { fontFamily: F, fontSize: '16px', lineHeight: 1.75, color: 'var(--text)', marginBottom: '8px' }
const linkStyle = { color: PURPLE, textDecoration: 'none', fontWeight: 600 }
const strongStyle = { fontWeight: 600 }
const imgStyle = { width: '100%', height: 'auto', borderRadius: '12px', margin: '32px 0', objectFit: 'cover', maxHeight: '400px' }
const captionStyle = { fontSize: '13px', color: 'var(--muted)', textAlign: 'center', marginTop: '-24px', marginBottom: '28px', fontStyle: 'italic' }
const quoteStyle = { margin: '24px 0', padding: '20px 24px', borderLeft: `3px solid ${PURPLE}`, background: `${PURPLE}05`, borderRadius: '0 12px 12px 0', fontStyle: 'italic', fontSize: '15px', lineHeight: 1.7, color: 'var(--text)' }
const boxStyle = { background: `${PURPLE}08`, border: `1px solid ${PURPLE}20`, borderRadius: '12px', padding: '20px 24px', margin: '24px 0' }
const warnStyle = { background: '#FEF3C7', border: '1px solid #F59E0B40', borderRadius: '12px', padding: '14px 18px', margin: '20px 0', fontSize: '14px', color: '#92400E' }

export default function ImpuestosCanalTelegram() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Ganar dinero con tu canal de Telegram, servidor de Discord o canal de WhatsApp suena bien hasta que
        llega el momento de declarar. Y la mayoria de creadores espanoles llega tarde a Hacienda porque
        asumen que "como son ingresos pequenos no hace falta" o que "como me pagan en TON o por PayPal no
        se ve". Ambas asunciones son falsas y caras: las sanciones por no declarar ingresos digitales
        empiezan en 200 EUR y pueden superar los 6.000 EUR.
      </p>
      <p style={pStyle}>
        Esta guia recoge todo lo que necesitas saber sobre impuestos para canales y comunidades en Espana
        en 2026: cuando hacerse autonomo, como declarar IRPF e IVA en publicidad, como tratar los pagos en
        TON o cripto, paso a paso para alta en Hacienda y los errores que mas dinero cuestan.
      </p>
      <div style={warnStyle}>
        <span style={{ fontWeight: 700 }}>Aviso legal:</span> esta guia es informativa. Las decisiones
        fiscales finales deberian validarse con un asesor especializado en creadores digitales. La
        normativa puede cambiar y cada caso tiene matices.
      </div>

      <img src="https://images.unsplash.com/photo-1554224155-6726b3ff858f?w=720&q=80&auto=format" alt="Fiscalidad para creadores que monetizan canales en España" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Impuestos para creadores espanoles que monetizan canales y comunidades — Foto: Unsplash</p>

      <h2 style={h2Style}>La regla basica: todo ingreso debe declararse</h2>
      <p style={pStyle}>
        Hacienda considera tributable cualquier ingreso, ya sea en euros, en TON, en USDT, en gift cards o
        en barter. Los tres mitos mas frecuentes que se hunden la primera vez que se cruza un dato:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>"PayPal extranjero no se ve"</span>: PayPal Espana reporta a Hacienda. Stripe, Wise, Revolut y Binance tambien.</li>
        <li style={liStyle}><span style={strongStyle}>"Cripto no cuenta hasta convertir a euros"</span>: el hecho imponible se produce el dia que recibes el cripto, valorado en euros a ese precio.</li>
        <li style={liStyle}><span style={strongStyle}>"Si gano menos del SMI no declaro"</span>: el limite del SMI afecta a la obligacion de alta en autonomos, no a la obligacion de declarar IRPF.</li>
      </ul>

      <h2 style={h2Style}>Cuando hay que darse de alta en Hacienda</h2>

      <h3 style={h3Style}>Modelo 036 / 037: alta como actividad economica</h3>
      <p style={pStyle}>
        <span style={strongStyle}>Obligatorio siempre que monetices de forma regular</span>, incluso con
        ingresos pequenos. El alta es gratis y se hace online en la sede de la AEAT. Tarda 15-20 minutos.
        No genera ninguna cuota mensual ni anual.
      </p>
      <p style={pStyle}>Epigrafes recomendados para creadores:</p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>844 - Servicios de publicidad</span>, relaciones publicas y similares (el mas habitual para creadores que cobran patrocinios).</li>
        <li style={liStyle}><span style={strongStyle}>499.1 - Comercio al por menor por internet</span> (si vendes productos digitales propios).</li>
        <li style={liStyle}><span style={strongStyle}>846 - Servicios profesionales independientes</span> (si das consultoria a partir del canal).</li>
      </ul>

      <h3 style={h3Style}>Alta en RETA (autonomos)</h3>
      <p style={pStyle}>
        <span style={strongStyle}>No es obligatoria por debajo del SMI</span>. La Seguridad Social aplica
        el criterio de habitualidad: si tus ingresos anuales son inferiores al SMI (en 2026 estimado en
        16.500 EUR), puedes ejercer la actividad sin estar de alta como autonomo, pero{' '}
        <span style={strongStyle}>debes mantener el alta en Hacienda (modelo 036/037)</span>.
      </p>
      <p style={pStyle}>
        Si superas el SMI, alta inmediata. Tarifa plana de autonomos en 2026: 80 EUR/mes durante los
        primeros 12 meses.
      </p>

      <h2 style={h2Style}>Como declarar IRPF: rendimientos por publicidad</h2>
      <p style={pStyle}>
        Los ingresos por publicidad son rendimientos de actividades economicas en el IRPF. Se declaran en
        el Modelo 100 (renta anual).
      </p>

      <h3 style={h3Style}>Estimacion directa simplificada</h3>
      <p style={pStyle}>Aplicable si tus ingresos anuales son inferiores a 600.000 EUR:</p>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '4px', fontWeight: 600 }}>Rendimiento neto = Ingresos - Gastos deducibles</p>
        <p style={{ ...pStyle, marginBottom: 0, fontWeight: 600 }}>Cuota IRPF = Rendimiento neto x Tipo marginal (19-47%)</p>
      </div>

      <h3 style={h3Style}>Gastos deducibles habituales para creadores</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Material:</span> ordenador, microfono, camara, software (proporcional al uso profesional).</li>
        <li style={liStyle}><span style={strongStyle}>Internet y telefono:</span> hasta 30% sin justificacion exhaustiva.</li>
        <li style={liStyle}><span style={strongStyle}>Cuota de autonomos:</span> 100% deducible.</li>
        <li style={liStyle}><span style={strongStyle}>Asesoria fiscal:</span> 100% deducible.</li>
        <li style={liStyle}><span style={strongStyle}>Suscripciones:</span> Notion, Canva, Adobe, hosting, dominio.</li>
        <li style={liStyle}><span style={strongStyle}>Formacion</span> relacionada con tu nicho.</li>
        <li style={liStyle}><span style={strongStyle}>Comisiones de plataformas</span> (Channelad, Fragment, marketplaces).</li>
      </ul>

      <h3 style={h3Style}>Retencion del 15% al emitir facturas</h3>
      <p style={pStyle}>
        Cuando facturas a una empresa espanola por publicidad, debes incluir una retencion del 15% sobre la
        base imponible. El cliente la ingresa a Hacienda en tu nombre.
      </p>
      <div style={quoteStyle}>
        Las facturas a personas fisicas o empresas extranjeras no llevan retencion. Por eso muchos
        creadores que cobran via marketplace o de marcas extranjeras no ven retencion, pero igual deben
        declarar los ingresos.
      </div>

      <h2 style={h2Style}>IVA en publicidad: 21% (con matices)</h2>

      <h3 style={h3Style}>Regla general</h3>
      <p style={pStyle}>
        La publicidad en canales digitales se considera prestacion de servicios sujeta a IVA al{' '}
        <span style={strongStyle}>21%</span>.
      </p>
      <div style={boxStyle}>
        <p style={{ ...pStyle, marginBottom: '4px', fontWeight: 600 }}>Factura tipo (cliente empresa espanola):</p>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={{ ...liStyle, fontSize: '14px' }}>Base imponible: 200 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>IVA 21%: 42 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Total factura: 242 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Retencion 15%: -30 EUR</li>
          <li style={{ ...liStyle, fontSize: '14px' }}>Total a cobrar: 212 EUR</li>
        </ul>
      </div>
      <p style={pStyle}>
        Trimestralmente declaras el IVA cobrado (Modelo 303) y anualmente el resumen (Modelo 390).
      </p>

      <h3 style={h3Style}>Excepcion: cliente fuera de la UE</h3>
      <p style={pStyle}>
        Si tu cliente es una empresa fuera de la Union Europea (USA, Suiza, Reino Unido), la factura{' '}
        <span style={strongStyle}>no lleva IVA</span> (inversion del sujeto pasivo). Debes indicarlo
        explicitamente: "Operacion no sujeta. Articulo 69.Uno LIVA".
      </p>

      <h3 style={h3Style}>Excepcion: cliente empresa en otro pais de la UE</h3>
      <p style={pStyle}>
        Si facturas a una empresa con NIF-IVA intracomunitario valido (verificable en VIES), tampoco
        aplicas IVA pero debes declarar la operacion en el Modelo 349 trimestralmente.
      </p>

      <h2 style={h2Style}>Tratamiento fiscal especifico del cripto (TON, USDT, etc.)</h2>

      <h3 style={h3Style}>Regla 1: declara el cripto el dia que lo recibes</h3>
      <p style={pStyle}>
        Si Fragment te paga 50 TON el 5 de junio y ese dia 1 TON vale 4,80 EUR, debes declarar 240 EUR
        como ingreso ese dia. No el dia que conviertes a euros.
      </p>

      <h3 style={h3Style}>Regla 2: la conversion genera ganancia/perdida patrimonial separada</h3>
      <p style={pStyle}>
        Si vendes esos 50 TON un mes despues cuando 1 TON vale 5,50 EUR, has ganado 35 EUR adicionales (50
        x (5,50 - 4,80)). Esos 35 EUR son ganancia patrimonial, tributan en la base del ahorro al 19-26%.
      </p>

      <h3 style={h3Style}>Regla 3: Modelo 721 si tu saldo cripto supera 50.000 EUR</h3>
      <p style={pStyle}>
        Obligacion informativa anual si el saldo total en exchanges extranjeros o en custodia fuera de
        Espana supera 50.000 EUR al cierre del 31 de diciembre. La sancion por no presentarlo puede llegar
        a 10.000 EUR.
      </p>
      <p style={pStyle}>
        Para el detalle especifico de Telegram Ads y conversion de TON, mira la{' '}
        <Link to="/blog/telegram-ads-fragment-guia-espana" style={linkStyle}>guia de Telegram Ads y
        Fragment desde Espana</Link>.
      </p>

      <h2 style={h2Style}>Como facturar a un marketplace como Channelad</h2>
      <p style={pStyle}>
        Cuando cobras via marketplace, tu factura se emite al marketplace (no al anunciante final). El
        marketplace actua como mediador. Ventajas fiscales:
      </p>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Una sola factura mensual</span>: en lugar de 10 facturas a 10 anunciantes distintos, una agregada al marketplace.</li>
        <li style={liStyle}><span style={strongStyle}>Sin retencion</span> de IVA ni de IRPF si el marketplace es no residente.</li>
        <li style={liStyle}><span style={strongStyle}>Modelo 720/721 simplificado</span> porque los pagos llegan a tu cuenta nacional, no a wallet extranjero.</li>
      </ul>
      <p style={pStyle}>
        Para creadores que prefieren simplicidad fiscal,{' '}
        <Link to="/" style={linkStyle}>trabajar a traves de Channelad</Link> elimina mucha de la
        complejidad operativa.
      </p>

      <h2 style={h2Style}>Caso practico: ingresos de 8.000 EUR/ano</h2>
      <p style={pStyle}>
        Creadora con canal de finanzas que genera 8.000 EUR brutos al ano por publicidad directa. Esta por
        debajo del SMI: no obligada a autonomos, si a alta en Hacienda (modelo 037).
      </p>

      <h3 style={h3Style}>Calculo IRPF</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}>Ingresos: 8.000 EUR</li>
        <li style={liStyle}>Gastos deducibles (hosting, software, internet, asesoria): 1.200 EUR</li>
        <li style={liStyle}>Rendimiento neto: 6.800 EUR</li>
        <li style={liStyle}>Tipo marginal aproximado: 24%</li>
        <li style={liStyle}><span style={strongStyle}>IRPF estimado: 1.632 EUR</span></li>
      </ul>

      <h3 style={h3Style}>IVA</h3>
      <p style={pStyle}>
        Si todos los clientes son espanoles: 8.000 EUR x 21% = 1.680 EUR a ingresar trimestralmente. Ese
        IVA no es perdida: lo paga el cliente, tu solo lo recoges y lo entregas a Hacienda.
      </p>

      <h3 style={h3Style}>Resultado neto</h3>
      <p style={pStyle}>
        Sin asesoria ni planificacion, muchos creadores acaban pagando 1.000-2.000 EUR adicionales por
        gastos no deducidos correctamente.
      </p>

      <h2 style={h2Style}>Errores fiscales que mas dinero cuestan</h2>

      <h3 style={h3Style}>1. No darse de alta esperando "ser invisible"</h3>
      <p style={pStyle}>
        Hacienda detecta ingresos via cruces con bancos, PayPal, Stripe, exchanges cripto y plataformas
        extranjeras. Una notificacion paralela puede llegar 1-3 anos despues del ingreso. La sancion por
        no declarar empieza en 200 EUR y crece con intereses.
      </p>

      <h3 style={h3Style}>2. No emitir factura a marcas internacionales</h3>
      <p style={pStyle}>
        Pensar que "como esta fuera de Espana no hay que facturar". Falso: cualquier ingreso requiere
        factura emitida desde tu actividad economica.
      </p>

      <h3 style={h3Style}>3. Mezclar gastos personales con profesionales</h3>
      <p style={pStyle}>
        Deducir el portatil al 100% cuando lo usas tambien para juegos personales puede provocar
        regularizaciones. Aplica un porcentaje realista (60-70% suele aceptarse para creadores).
      </p>

      <h3 style={h3Style}>4. No declarar cripto</h3>
      <p style={pStyle}>
        Los exchanges centralizados ya reportan a Hacienda en 2026. Si tienes saldos en OKX, Bybit, Bitget
        o Binance, asume que Hacienda los conoce.
      </p>

      <h3 style={h3Style}>5. Pagar IRPF sobre ingresos brutos</h3>
      <p style={pStyle}>
        Hacienda calcula IRPF sobre el rendimiento neto (ingresos menos gastos), no sobre los brutos. No
        deducir gastos basicos como cuota de autonomos, software o asesoria es regalar dinero. Lleva una
        hoja de gastos desde el primer mes.
      </p>

      <h2 style={h2Style}>Checklist fiscal para creadores en 2026</h2>
      <div style={boxStyle}>
        <ul style={{ paddingLeft: '20px', margin: 0 }}>
          <li style={liStyle}>Alta en Hacienda (modelo 036 o 037) con epigrafe 844 si monetizas regularmente.</li>
          <li style={liStyle}>Alta en RETA (autonomos) si superas el SMI.</li>
          <li style={liStyle}>Sistema para emitir facturas (FacturaDirecta, Holded, Quaderno).</li>
          <li style={liStyle}>Cuenta bancaria separada para ingresos de la actividad.</li>
          <li style={liStyle}>Hoja de gastos actualizada mensualmente.</li>
          <li style={liStyle}>Declaraciones trimestrales: 130 (IRPF) y 303 (IVA).</li>
          <li style={liStyle}>Declaracion anual: 100 (Renta), 390 (Resumen IVA), 720/721 si aplica.</li>
          <li style={liStyle}>Asesoria fiscal especializada en creadores digitales o cripto.</li>
          <li style={liStyle}>Registro fechado de cualquier ingreso en cripto.</li>
        </ul>
      </div>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Tengo que declarar los ingresos aunque sean pocos euros?</h3>
      <p style={pStyle}>
        Si. Todos los ingresos deben declararse en IRPF independientemente de la cantidad. Lo que cambia es
        la obligacion de alta en RETA (autonomos), que solo es obligatoria si superas el SMI anual. La
        obligacion de declarar IRPF e IVA aplica desde el primer euro.
      </p>

      <h3 style={h3Style}>Diferencia entre alta en Hacienda y alta como autonomo?</h3>
      <p style={pStyle}>
        Alta en Hacienda (036/037) declara que ejerces actividad economica. Gratuita y sin cuotas. Alta
        como autonomo (RETA) es Seguridad Social y genera la cuota mensual (80 EUR el primer ano con
        tarifa plana). Puedes estar en Hacienda sin estar en autonomos si tus ingresos son inferiores al
        SMI.
      </p>

      <h3 style={h3Style}>Como declaro los pagos en TON de Telegram Ads?</h3>
      <p style={pStyle}>
        Como rendimientos de actividad economica, valorados en euros al precio del dia que llegan al
        wallet. Si despues conviertes el TON a euros, la diferencia es ganancia o perdida patrimonial
        separada. Lleva registro fechado de ambos momentos.
      </p>

      <h3 style={h3Style}>Puedo deducir mi ordenador y mi suscripcion a Notion como gastos?</h3>
      <p style={pStyle}>
        Si, proporcionalmente al uso profesional. Hacienda suele aceptar un 60-80% del coste de equipos y
        un 100% de software especifico (Canva, Notion, Adobe). Guarda siempre las facturas a tu nombre con
        tu NIF.
      </p>

      <h3 style={h3Style}>Si cobro de Channelad necesito facturar a cada anunciante por separado?</h3>
      <p style={pStyle}>
        No. Cuando trabajas via marketplace, emites una sola factura al marketplace por el total cobrado en
        el periodo. El marketplace actua como cliente intermedio y simplifica enormemente la operativa
        fiscal frente a facturar a cada anunciante individual.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Monetizar un canal o servidor en Espana sin friccion fiscal es perfectamente posible si haces los
        deberes desde el principio: alta en Hacienda con el epigrafe correcto, facturas siempre, registro
        de gastos deducibles, declaraciones trimestrales puntuales y atencion especial al cripto. Cuesta
        una hora al mes y ahorra problemas mucho mas caros.
      </p>
      <p style={pStyle}>
        Si quieres simplificar al maximo la parte operativa y fiscal cobrando todo desde un solo canal con
        facturas agregadas, <Link to="/" style={linkStyle}>publica tu canal en Channelad</Link>. Una
        factura mensual al marketplace en lugar de docenas a anunciantes diversos, pago en euros via{' '}
        <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link> y compatibilidad con tu
        asesoria fiscal habitual.
      </p>
    </div>
  )
}
