import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function PrivacyPage() {
  return (
    <div style={{ fontFamily: FONT_BODY, padding: '60px 24px 80px', maxWidth: '760px', margin: '0 auto' }}>
      <SEO title="Politica de Privacidad" description="Politica de privacidad de Channelad. Como protegemos tus datos personales y gestionamos la informacion de anunciantes y creadores." path="/privacidad" />
      <Link to="/" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
        ← Volver al inicio
      </Link>

      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
        Politica de Privacidad
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '40px' }}>Ultima actualizacion: 8 de abril de 2026</p>

      {[
        {
          title: '1. Responsable del tratamiento',
          content: 'ChannelAd (en proceso de constitucion como SL en Espana) es responsable del tratamiento de tus datos personales. Contacto del responsable: soporte@channelad.io. Domicilio: Espana. A efectos del RGPD (Reglamento UE 2016/679), ChannelAd actua como responsable del tratamiento para los datos de usuarios registrados y como encargado del tratamiento para los datos procesados via Partner API en nombre de partners como Getalink.'
        },
        {
          title: '2. Datos que recopilamos',
          content: 'Datos de registro: nombre, correo electronico, rol (anunciante/creador), contrasena (hasheada con bcrypt). Datos de canales (creadores): nombre del canal, plataforma, URL, categoria, precio, metricas de audiencia. Datos de campanas: contenido, presupuesto, URL destino, estado, metricas de rendimiento. Datos de transacciones: importes, referencias de pago Stripe, comisiones. Datos tecnicos: direccion IP, user-agent, dispositivo, pais (via tracking links). No recopilamos datos sensibles (Art. 9 RGPD) ni datos de menores de 16 anos.'
        },
        {
          title: '3. Base legal del tratamiento (Art. 6 RGPD)',
          content: 'Ejecucion de contrato (Art. 6.1.b): registro de cuenta, gestion de campanas, procesamiento de pagos, comunicaciones transaccionales. Interes legitimo (Art. 6.1.f): metricas agregadas y anonimizadas de rendimiento de campanas, prevencion de fraude, seguridad de la plataforma. Consentimiento (Art. 6.1.a): cookies no esenciales, comunicaciones de marketing. Obligacion legal (Art. 6.1.c): conservacion de datos fiscales y de facturacion segun legislacion espanola.'
        },
        {
          title: '4. Destinatarios de los datos',
          content: 'Stripe Inc. (procesamiento de pagos, certificado PCI DSS Level 1). MongoDB Atlas (almacenamiento de datos, servidores UE). Vercel Inc. (hosting, CDN). Partners API (como Getalink) reciben unicamente datos de campanas y metricas agregadas, nunca datos personales de usuarios finales ni informacion de contacto de creadores (clausula 13 del contrato). No vendemos datos personales a terceros.'
        },
        {
          title: '5. Transferencias internacionales',
          content: 'Algunos de nuestros proveedores (Stripe, Vercel) pueden procesar datos fuera del EEE. Estas transferencias estan protegidas por Clausulas Contractuales Tipo (CCT) aprobadas por la Comision Europea y/o decisiones de adecuacion. Getalink (Andorra) opera bajo el regimen de adecuacion reconocido por la UE (Decision 2010/625/UE).'
        },
        {
          title: '6. Periodos de conservacion',
          content: 'Datos de cuenta: mientras la cuenta este activa + 3 anos tras la baja (obligacion legal). Datos de campanas y metricas: 24 meses desde la finalizacion. Datos de transacciones y facturacion: 6 anos (Ley General Tributaria, Art. 70). Datos de tracking (IP, dispositivo): 13 meses. Audit logs del Partner API: 12 meses. Tras estos periodos, los datos se eliminan o anonimizan de forma irreversible.'
        },
        {
          title: '7. Cookies y tecnologias similares',
          content: 'Cookies esenciales: autenticacion (JWT), preferencia de tema visual (channelad-theme). No requieren consentimiento. Cookies analiticas: actualmente no utilizamos cookies de analitica de terceros ni publicidad basada en cookies. Si en el futuro implementamos analitica, solicitaremos consentimiento previo mediante banner. Tracking links: los enlaces de campanas registran IP, dispositivo, navegador, pais y hora. Esta informacion se usa exclusivamente para metricas de rendimiento de campanas.'
        },
        {
          title: '8. Tus derechos (Art. 15-22 RGPD)',
          content: 'Acceso: solicitar copia de tus datos personales. Rectificacion: corregir datos inexactos o incompletos. Supresion ("derecho al olvido"): solicitar la eliminacion de tus datos. Limitacion: restringir el tratamiento en determinadas circunstancias. Portabilidad: recibir tus datos en formato estructurado (JSON/CSV). Oposicion: oponerte al tratamiento basado en interes legitimo. Para ejercer cualquiera de estos derechos, envia un email a soporte@channelad.io indicando tu nombre, email registrado y el derecho que deseas ejercer. Responderemos en un plazo maximo de 30 dias. Tambien tienes derecho a presentar una reclamacion ante la Agencia Espanola de Proteccion de Datos (AEPD) en www.aepd.es.'
        },
        {
          title: '9. Seguridad de datos',
          content: 'Encriptacion en transito (TLS/HTTPS). Contrasenas hasheadas con bcrypt (min. 10 rounds). API keys de partners hasheadas con SHA-256 y comparacion timing-safe. Encriptacion AES-256 para credenciales almacenadas. Rate limiting por usuario y por partner. Audit trail de todas las operaciones del Partner API. Los pagos se procesan integramente a traves de Stripe (certificado PCI DSS Level 1); ChannelAd no almacena datos de tarjetas de credito.'
        },
        {
          title: '10. Notificacion de brechas de seguridad',
          content: 'En caso de brecha de datos personales que suponga un riesgo para los derechos y libertades de los interesados, notificaremos a la AEPD en un plazo maximo de 72 horas (Art. 33 RGPD). Si el riesgo es alto, tambien notificaremos directamente a los afectados (Art. 34 RGPD).'
        },
        {
          title: '11. Cambios en esta politica',
          content: 'Nos reservamos el derecho de actualizar esta politica. Los cambios sustanciales se notificaran por email y mediante aviso destacado en la plataforma con al menos 15 dias de antelacion. El uso continuado de la plataforma tras la notificacion constituye aceptacion de la politica actualizada.'
        },
      ].map(section => (
        <div key={section.title} style={{ marginBottom: '32px' }}>
          <h2 style={{ fontFamily: FONT_DISPLAY, fontSize: '18px', fontWeight: 700, color: 'var(--text)', marginBottom: '10px' }}>
            {section.title}
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8 }}>
            {section.content}
          </p>
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '16px' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted2)' }}>
          Si tienes preguntas sobre esta politica, contactanos en{' '}
          <a href="mailto:soporte@channelad.io" style={{ color: PURPLE, textDecoration: 'none' }}>soporte@channelad.io</a>
        </p>
      </div>
    </div>
  )
}
