import React from 'react'
import { Link } from 'react-router-dom'
import {
  h2Style, h3Style, pStyle, liStyle, linkStyle, strongStyle,
  imgStyle, captionStyle, quoteStyle,
  tableWrap, tableStyle, thStyle, tdStyle,
} from './styles'

export default function TelegramAdsFragment() {
  return (
    <div style={{ maxWidth: '720px', margin: '0 auto', padding: '0' }}>
      <p style={pStyle}>
        Desde 2024 Telegram comparte el 50% de los ingresos publicitarios con los canales que cumplen
        ciertos requisitos. El sistema se llama Ad Revenue Sharing y los pagos se hacen en TON (Toncoin),
        la criptomoneda nativa de la plataforma. Para creadores espanoles esto introduce dudas reales:
        cuanto se gana de verdad, como se cobra en euros, como se declara y si compensa frente a la
        publicidad directa con anunciantes.
      </p>
      <p style={pStyle}>
        Esta guia recoge todo lo que necesitas saber para usar Telegram Ads via Fragment desde Espana en
        2026: requisitos exactos, CPMs reales, paso a paso para activar el monedero, conversion de TON a
        euros, fiscalidad y cuando merece la pena frente a vender publicidad directa.
      </p>

      <img src="https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=720&q=80&auto=format" alt="Pagos en TON desde Telegram Ads y Fragment" style={imgStyle} loading="lazy" />
      <p style={captionStyle}>Telegram Ads via Fragment: ingresos pasivos en TON desde Espana — Foto: Unsplash</p>

      <h2 style={h2Style}>Que es Telegram Ads y como funciona Ad Revenue Sharing</h2>
      <p style={pStyle}>
        Telegram Ads es la plataforma oficial de publicidad de Telegram. Los anunciantes compran espacios y
        los anuncios aparecen como mensajes patrocinados de hasta 160 caracteres al final de los canales
        publicos con mas de 1.000 suscriptores.
      </p>
      <p style={pStyle}>
        Desde 2024 funciona el Ad Revenue Sharing: del precio que paga el anunciante, Telegram se queda el
        50% y el otro 50% lo reparte a los canales donde se mostro el anuncio. Los pagos se hacen
        mensualmente en TON y se gestionan a traves de Fragment, el ecosistema oficial de Telegram.
      </p>

      <h3 style={h3Style}>Requisitos para entrar en el programa</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>1.000+ suscriptores activos</span> segun la metrica interna de Telegram.</li>
        <li style={liStyle}><span style={strongStyle}>Canal publico</span> (los privados no pueden mostrar Telegram Ads).</li>
        <li style={liStyle}><span style={strongStyle}>Contenido conforme</span> con las politicas de Telegram.</li>
        <li style={liStyle}><span style={strongStyle}>Monedero TON</span> activado y verificado.</li>
        <li style={liStyle}><span style={strongStyle}>Antiguedad minima</span> del canal de unos 3 meses.</li>
      </ul>

      <h2 style={h2Style}>CPMs reales: cuanto paga Telegram en 2026</h2>
      <p style={pStyle}>Cifras oficiales en Fragment para canales en espanol durante 2026:</p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>Tipo de contenido</th><th style={thStyle}>CPM Telegram Ads</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Generalista</td><td style={tdStyle}>0,10 - 0,30 EUR</td></tr>
            <tr><td style={tdStyle}>Tecnologia / Marketing</td><td style={tdStyle}>0,20 - 0,50 EUR</td></tr>
            <tr><td style={tdStyle}>Finanzas / Inversion</td><td style={tdStyle}>0,30 - 0,70 EUR</td></tr>
            <tr><td style={tdStyle}>Cripto / Trading</td><td style={tdStyle}>0,40 - 0,90 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>Comparemos con la publicidad directa vendida a marcas:</p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>Tipo de contenido</th><th style={thStyle}>CPM publicidad directa</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>Generalista</td><td style={tdStyle}>1,5 - 3 EUR</td></tr>
            <tr><td style={tdStyle}>Tecnologia / Marketing</td><td style={tdStyle}>4 - 8 EUR</td></tr>
            <tr><td style={tdStyle}>Finanzas / Inversion</td><td style={tdStyle}>5 - 10 EUR</td></tr>
            <tr><td style={tdStyle}>Cripto / Trading</td><td style={tdStyle}>6 - 12 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <div style={quoteStyle}>
        La publicidad directa paga entre 8x y 15x mas por las mismas impresiones que Telegram Ads. Pero hay
        matices importantes.
      </div>

      <h2 style={h2Style}>Cuando merece la pena Telegram Ads (y cuando no)</h2>

      <h3 style={h3Style}>Casos donde Telegram Ads tiene sentido</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Canales generalistas</span> sin nicho claro donde es dificil cerrar deals con marcas concretas.</li>
        <li style={liStyle}><span style={strongStyle}>Canales recien iniciados</span> (1.000-3.000 subs) sin negociacion previa con anunciantes.</li>
        <li style={liStyle}><span style={strongStyle}>Canales con poco tiempo del creador</span> que prefieren ingresos pasivos a gestionar deals.</li>
        <li style={liStyle}><span style={strongStyle}>Ingreso complementario</span> mientras se cierran patrocinios directos.</li>
      </ul>

      <h3 style={h3Style}>Casos donde es mejor evitarlo o limitarlo</h3>
      <ul style={{ paddingLeft: '20px', marginBottom: '20px' }}>
        <li style={liStyle}><span style={strongStyle}>Canales de nicho premium</span> (finanzas, cripto, B2B) donde la publicidad directa multiplica los ingresos.</li>
        <li style={liStyle}><span style={strongStyle}>Canales con menos de 5.000 subs</span> porque el CPM bajo no compensa.</li>
        <li style={liStyle}><span style={strongStyle}>Canales con audiencia delicada</span> (educacion infantil, salud) donde anuncios automaticos pueden ser inapropiados.</li>
      </ul>

      <h2 style={h2Style}>Paso a paso: activar Telegram Ads en tu canal</h2>

      <h3 style={h3Style}>1. Crear y verificar tu monedero TON</h3>
      <p style={pStyle}>
        Descarga Tonkeeper o usa el wallet oficial de Telegram (boton de @wallet en la app). El wallet de
        Telegram es lo mas comodo para empezar porque ya esta integrado en la app.
      </p>

      <h3 style={h3Style}>2. Conectar el monedero a Fragment</h3>
      <p style={pStyle}>
        Entra en fragment.com, conecta tu cuenta de Telegram via QR y vincula el monedero. Fragment es el
        portal oficial donde gestionas usuarios, dominios, anonymous numbers y Ad Revenue.
      </p>

      <h3 style={h3Style}>3. Activar Ad Revenue en tu canal</h3>
      <p style={pStyle}>
        Desde el admin del canal en Telegram, ve a "Estadisticas" -&gt; "Monetizacion" -&gt; "Boost Ad
        Revenue Sharing". Si cumples los requisitos, aparece un boton para activar. Telegram empieza a
        mostrar anuncios automaticamente y a registrar tus impresiones.
      </p>

      <h3 style={h3Style}>4. Recibir los pagos mensuales</h3>
      <p style={pStyle}>
        Los pagos se acumulan durante el mes y se liquidan los primeros 5 dias del mes siguiente. Aparecen
        en tu monedero TON. Desde ahi puedes mantenerlos en TON, convertirlos a otras criptos o pasarlos a
        euros.
      </p>

      <h2 style={h2Style}>Como convertir TON a euros desde Espana</h2>

      <h3 style={h3Style}>Via 1: Exchange centralizado (la mas comun)</h3>
      <p style={pStyle}>
        Exchanges como OKX, Bybit o Bitget soportan TON con liquidez razonable. Transfieres TON desde tu
        wallet al exchange, vendes a EUR y haces SEPA a tu cuenta bancaria espanola. Comisiones tipicas:
        0,1-0,3% en compra/venta, 0-1 EUR fijo en retirada SEPA. Tiempo total: 1-3 dias laborables.
      </p>

      <h3 style={h3Style}>Via 2: P2P en Binance</h3>
      <p style={pStyle}>
        Binance retiro TON de su listing principal en 2023 pero el mercado P2P aun lo soporta. Vendes TON a
        un comprador particular en EUR y cobras en tu cuenta. Mejor tipo de cambio pero requiere atencion
        para detectar fraudes.
      </p>

      <h3 style={h3Style}>Via 3: Mantener en TON</h3>
      <p style={pStyle}>
        Si el ingreso es complementario, muchos creadores mantienen los TON en wallet como inversion
        especulativa. Implica riesgo de volatilidad pero ahorra comisiones de conversion.
      </p>

      <h2 style={h2Style}>Fiscalidad: como declarar Telegram Ads en Espana</h2>

      <h3 style={h3Style}>1. Los ingresos en TON son rendimientos tributables</h3>
      <p style={pStyle}>
        Hacienda los considera rendimientos de actividades economicas (si es ingreso recurrente) o
        ganancias patrimoniales (si es ocasional). Debes declarar el valor en euros del TON el dia que
        llega a tu wallet, no el dia que conviertes a euros.
      </p>

      <h3 style={h3Style}>2. La conversion TON -&gt; EUR genera otro hecho imponible</h3>
      <p style={pStyle}>
        Si los TON se revalorizan o devaluan entre el dia que los recibes y el dia que los vendes, esa
        diferencia es ganancia o perdida patrimonial. Hay que llevar registro fechado de ambos momentos.
      </p>

      <h3 style={h3Style}>3. Obligacion de alta en Hacienda</h3>
      <p style={pStyle}>
        Si recibes pagos de forma regular, necesitas alta en Hacienda (modelo 036 o 037) bajo el epigrafe
        844 - servicios de publicidad. Si superas el SMI anual con estos ingresos, alta tambien en
        autonomos. Para el detalle fiscal completo, mira la{' '}
        <Link to="/blog/impuestos-monetizar-canal-telegram-espana" style={linkStyle}>guia de impuestos
        para canales de Telegram en Espana</Link>.
      </p>

      <h2 style={h2Style}>Caso practico: ingresos esperados por tamano de canal</h2>
      <p style={pStyle}>
        Calculos con CPM medio realista de 0,30 EUR (nicho intermedio) y 4 impresiones al mes por
        suscriptor activo:
      </p>
      <div style={tableWrap}>
        <table style={tableStyle}>
          <thead>
            <tr><th style={thStyle}>Suscriptores activos</th><th style={thStyle}>Impresiones/mes</th><th style={thStyle}>Ingreso bruto/mes</th><th style={thStyle}>Despues impuestos</th></tr>
          </thead>
          <tbody>
            <tr><td style={tdStyle}>1.000</td><td style={tdStyle}>4.000</td><td style={tdStyle}>1,20 EUR</td><td style={tdStyle}>~0,85 EUR</td></tr>
            <tr><td style={tdStyle}>5.000</td><td style={tdStyle}>20.000</td><td style={tdStyle}>6 EUR</td><td style={tdStyle}>~4,25 EUR</td></tr>
            <tr><td style={tdStyle}>20.000</td><td style={tdStyle}>80.000</td><td style={tdStyle}>24 EUR</td><td style={tdStyle}>~17 EUR</td></tr>
            <tr><td style={tdStyle}>50.000</td><td style={tdStyle}>200.000</td><td style={tdStyle}>60 EUR</td><td style={tdStyle}>~42 EUR</td></tr>
            <tr><td style={tdStyle}>100.000</td><td style={tdStyle}>400.000</td><td style={tdStyle}>120 EUR</td><td style={tdStyle}>~85 EUR</td></tr>
          </tbody>
        </table>
      </div>
      <p style={pStyle}>
        Para canales por debajo de 20.000 suscriptores, los ingresos netos rondan los 5-20 EUR/mes. Para
        que merezca la pena la friccion fiscal y operativa, los ingresos deberian estar por encima de 30-50
        EUR/mes consistentes.
      </p>

      <h2 style={h2Style}>Errores tipicos al usar Telegram Ads</h2>

      <h3 style={h3Style}>1. No verificar el monedero correctamente</h3>
      <p style={pStyle}>
        Si el monedero no esta verificado, Fragment acumula los pagos pero no los libera. Verifica el
        wallet inmediatamente al activar Ad Revenue.
      </p>

      <h3 style={h3Style}>2. Mantener TON sin convertir y olvidar declarar</h3>
      <p style={pStyle}>
        El error fiscal mas comun: pensar que "como aun no he convertido a euros, no hay que declarar".
        Falso. El hecho imponible se produce cuando el TON llega al wallet.
      </p>

      <h3 style={h3Style}>3. No medir el coste de oportunidad</h3>
      <p style={pStyle}>
        Si Telegram Ads paga 10 EUR/mes pero perdiste un patrocinio directo de 200 EUR porque la marca vio
        anuncios automaticos en tu canal y considero que tu canal estaba "sobrecargado", pierdes mas que
        ganas. Equilibra.
      </p>

      <h3 style={h3Style}>4. Confiar la fiscalidad cripto a un asesor generalista</h3>
      <p style={pStyle}>
        Los pagos en TON desde Fragment son un caso poco habitual en Espana. Un asesor especializado en
        cripto-fiscalidad (no un asesor generalista) ahorra problemas con Hacienda.
      </p>

      <h2 style={h2Style}>Preguntas frecuentes</h2>

      <h3 style={h3Style}>Cuanto paga Telegram Ads en 2026 por 1.000 impresiones?</h3>
      <p style={pStyle}>
        El CPM medio en canales en espanol oscila entre 0,10 y 0,90 EUR segun nicho. Cripto y finanzas son
        los mas rentables (0,40-0,90 EUR). Generalista paga 0,10-0,30 EUR. Es 5-15x menos que la publicidad
        directa con marcas.
      </p>

      <h3 style={h3Style}>Cuando recibo los pagos de Telegram Ads?</h3>
      <p style={pStyle}>
        Los pagos se acumulan durante el mes y se liquidan los primeros 5 dias del mes siguiente. Si el
        balance es inferior al minimo (1 TON, aproximadamente 5 EUR a precios de 2026), se acumula al
        siguiente mes.
      </p>

      <h3 style={h3Style}>Puedo combinar Telegram Ads con publicidad directa?</h3>
      <p style={pStyle}>
        Si, pero con cuidado. Telegram inserta anuncios automaticos que pueden chocar visualmente con
        patrocinios directos. Muchos creadores limitan Telegram Ads a 2-3 anuncios al dia o lo desactivan
        durante semanas con campanas directas grandes.
      </p>

      <h3 style={h3Style}>Tengo que pagar impuestos en Espana por los TON que recibo?</h3>
      <p style={pStyle}>
        Si. Los TON son rendimientos tributables el dia que llegan a tu wallet, valorados en euros a ese
        precio. Adicionalmente, la diferencia entre el valor de recepcion y el de conversion es ganancia o
        perdida patrimonial separada.
      </p>

      <h3 style={h3Style}>Que pasa si TON cae mucho de precio entre recibirlo y convertirlo?</h3>
      <p style={pStyle}>
        La perdida es deducible como perdida patrimonial. Pero declaraste los TON al valor de recepcion,
        asi que pagaste IRPF sobre un importe superior al que finalmente cobraste. Es uno de los riesgos
        reales de cobrar en cripto.
      </p>

      <h2 style={h2Style}>Conclusion</h2>
      <p style={pStyle}>
        Telegram Ads via Fragment es un ingreso pasivo accesible para cualquier canal de 1.000+
        suscriptores, pero los CPMs son 5-15x menores que la publicidad directa con marcas. Tiene sentido
        como base para canales generalistas o nuevos, y como ingreso complementario mientras se cierran
        patrocinios directos. Para canales de nicho premium, la prioridad debe ser la publicidad directa.
      </p>
      <p style={pStyle}>
        Si quieres maximizar ingresos y cerrar patrocinios con marcas verificadas sin pasar semanas
        haciendo outreach, <Link to="/" style={linkStyle}>publica tu canal en Channelad</Link>. Pago en
        euros via <Link to="/blog/escrow-publicidad-digital" style={linkStyle}>escrow</Link>, metricas
        auditadas y zero friccion fiscal con TON. Compatible con Telegram Ads si quieres combinar las dos
        fuentes.
      </p>
    </div>
  )
}
