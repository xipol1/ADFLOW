import React from 'react'
import { Link } from 'react-router-dom'
import SEO from '../../components/SEO'
import { PURPLE, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function DataProcessingPage() {
  return (
    <div style={{ fontFamily: FONT_BODY, padding: '60px 24px 80px', maxWidth: '760px', margin: '0 auto' }}>
      <SEO
        title="Política de acceso y procesamiento de datos de WhatsApp"
        description="Cómo accedemos y procesamos los datos de tu WhatsApp cuando vinculas un canal a Channelad. RGPD, límites técnicos y tus derechos."
        path="/politica-acceso-whatsapp"
      />
      <Link
        to="/"
        style={{
          fontSize: '13px',
          color: PURPLE,
          textDecoration: 'none',
          fontWeight: 500,
          display: 'inline-flex',
          alignItems: 'center',
          gap: '4px',
          marginBottom: '32px',
        }}
      >
        ← Volver al inicio
      </Link>

      <h1
        style={{
          fontFamily: FONT_DISPLAY,
          fontSize: '32px',
          fontWeight: 800,
          color: 'var(--text)',
          marginBottom: '8px',
          letterSpacing: '-0.5px',
        }}
      >
        Política de acceso y procesamiento de datos de WhatsApp
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '40px' }}>
        Última actualización: 14 de abril de 2026 · Versión 1.0
      </p>

      <div
        style={{
          background: 'rgba(139,92,246,0.06)',
          border: '1px solid rgba(139,92,246,0.15)',
          borderRadius: '14px',
          padding: '20px 24px',
          marginBottom: '40px',
        }}
      >
        <p
          style={{
            fontSize: '13px',
            fontWeight: 700,
            color: PURPLE,
            textTransform: 'uppercase',
            letterSpacing: '0.08em',
            marginBottom: '8px',
          }}
        >
          Resumen en 30 segundos
        </p>
        <ul style={{ fontSize: '15px', color: 'var(--text)', lineHeight: 1.7, paddingLeft: '18px', margin: 0 }}>
          <li>
            <strong>Solo leemos</strong> los datos de los canales que tú apruebes expresamente.
          </li>
          <li>
            <strong>Nunca leemos</strong> tus chats personales, grupos ni contactos privados.
          </li>
          <li>
            <strong>Nunca publicamos</strong> nada sin tu aprobación explícita.
          </li>
          <li>
            <strong>Puedes revocar</strong> el acceso en 1 click desde tu móvil en cualquier momento.
          </li>
          <li>
            <strong>Todo queda registrado</strong> en un log auditable que puedes consultar.
          </li>
        </ul>
      </div>

      {SECTIONS.map((section) => (
        <div key={section.title} style={{ marginBottom: '32px' }}>
          <h2
            style={{
              fontFamily: FONT_DISPLAY,
              fontSize: '18px',
              fontWeight: 700,
              color: 'var(--text)',
              marginBottom: '10px',
            }}
          >
            {section.title}
          </h2>
          {section.paragraphs.map((p, i) => (
            <p key={i} style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8, marginBottom: '12px' }}>
              {p}
            </p>
          ))}
          {section.list && (
            <ul style={{ fontSize: '14px', color: 'var(--muted)', lineHeight: 1.8, paddingLeft: '20px' }}>
              {section.list.map((item, i) => (
                <li key={i} style={{ marginBottom: '6px' }}>
                  {item}
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}

      <div style={{ borderTop: '1px solid var(--border)', paddingTop: '24px', marginTop: '32px' }}>
        <p style={{ fontSize: '13px', color: 'var(--muted2)' }}>
          Si tienes preguntas sobre esta política o quieres ejercer tus derechos RGPD, contactanos en{' '}
          <a href="mailto:soporte@channelad.io" style={{ color: PURPLE, textDecoration: 'none' }}>
            soporte@channelad.io
          </a>
        </p>
      </div>
    </div>
  )
}

const SECTIONS = [
  {
    title: '1. Qué hacemos cuando vinculas un canal',
    paragraphs: [
      'Channelad utiliza la función oficial de WhatsApp "Dispositivos vinculados" para conectar un canal a nuestra plataforma. Es el mismo mecanismo que usas cuando abres WhatsApp Web en tu ordenador: escaneas un código QR con tu teléfono y autorizas un dispositivo adicional (en este caso, nuestro servidor).',
      'Una vez vinculado, Channelad queda listado como uno de tus dispositivos (hasta 4 permitidos por WhatsApp). Aparece como "ChannelAd Dashboard" en tu app de WhatsApp, sección Ajustes → Dispositivos vinculados.',
    ],
  },
  {
    title: '2. Qué datos leemos (scope positivo)',
    paragraphs: [
      'Accedemos únicamente a los siguientes datos, y solo de los canales que tú selecciones activamente en tu dashboard de Channelad:',
    ],
    list: [
      'Nombre del canal, descripción y foto de portada',
      'Número de seguidores actual (el que ya ves en tu panel de insights)',
      'Estado de verificación del canal (VERIFIED / UNVERIFIED)',
      'Métricas públicas de los posts que publiques a través de Channelad: views, reacciones, forwards',
      'Tu rol en cada canal (OWNER o ADMIN) — necesario para saber qué canales puedes registrar',
    ],
  },
  {
    title: '3. Qué NO leemos nunca (scope negativo)',
    paragraphs: [
      'Por diseño técnico y por compromiso contractual, Channelad nunca accede a:',
    ],
    list: [
      'Tus chats personales, individuales o de grupo',
      'Tus contactos o su información de perfil',
      'Tus llamadas, notas de voz o archivos multimedia privados',
      'Estados (Stories) que publiques fuera de los canales registrados',
      'Canales de WhatsApp que no hayas registrado explícitamente en Channelad',
      'Mensajes recibidos en cualquier chat',
      'Tu estado "en línea" o "última conexión"',
    ],
    paragraphs2: [
      'Nuestro código es auditable y la lista de acciones permitidas está fijada en el servidor. Cualquier intento de lectura fuera del scope lanza una excepción que queda registrada.',
    ],
  },
  {
    title: '4. Qué hacemos con los datos',
    paragraphs: [
      'Los datos leídos se usan exclusivamente para:',
    ],
    list: [
      'Mostrarte tus métricas en el dashboard de Channelad (seguidores, views, engagement)',
      'Validar la autenticidad de tu canal ante anunciantes potenciales',
      'Calcular el precio recomendado de tus publicaciones según el engagement real',
      'Verificar que las campañas contratadas cumplen los términos acordados (alcance prometido vs real)',
      'Detectar fraude (por ejemplo, canales con seguidores inflados sin engagement real)',
    ],
    paragraphs2: [
      'Los datos se almacenan en MongoDB Atlas (servidores en UE) cifrados en tránsito (TLS) y en reposo. Los tokens de autenticación de WhatsApp se cifran adicionalmente con AES-256.',
    ],
  },
  {
    title: '5. Publicación de contenido',
    paragraphs: [
      'Cuando un anunciante contrata una campaña en tu canal, Channelad puede publicar automáticamente en tu canal el contenido acordado. Esta publicación está sujeta a tu aprobación previa explícita para cada campaña. Nunca publicamos nada sin que hayas revisado y aprobado el contenido exacto, el momento y el formato.',
      'Puedes desactivar la publicación automática y exigir aprobación manual por campaña desde la configuración de tu canal.',
    ],
  },
  {
    title: '6. Retención y eliminación de datos',
    paragraphs: [
      'Los datos de tus canales se conservan mientras mantengas la vinculación activa. Al revocar una sesión (ya sea desde WhatsApp o desde Channelad), los siguientes datos se eliminan en 24 horas:',
    ],
    list: [
      'Credenciales de autenticación de WhatsApp (cifradas, borradas irreversiblemente)',
      'Token de sesión de dispositivo vinculado',
      'Lista de canales administrados por esa sesión',
    ],
    paragraphs2: [
      'Los datos históricos de métricas (views, clicks, engagement) se conservan 24 meses para cumplir con obligaciones fiscales y permitir análisis históricos a anunciantes. Puedes solicitar su eliminación total ejerciendo tu derecho al olvido.',
      'Los audit logs se conservan 365 días y luego se eliminan automáticamente.',
    ],
  },
  {
    title: '7. Revocación del acceso',
    paragraphs: [
      'Puedes revocar el acceso de Channelad a tu WhatsApp en cualquier momento y por tres vías distintas:',
    ],
    list: [
      'Desde tu teléfono: Ajustes de WhatsApp → Dispositivos vinculados → Cerrar sesión en "ChannelAd Dashboard"',
      'Desde el dashboard de Channelad: Sección WhatsApp → Revocar sesión',
      'Por email a soporte@channelad.io solicitando revocación',
    ],
    paragraphs2: [
      'La revocación tiene efecto inmediato. Channelad deja de tener acceso a WhatsApp, aunque los datos históricos ya recopilados permanecen según la política de retención descrita.',
    ],
  },
  {
    title: '8. Audit log (transparencia total)',
    paragraphs: [
      'Cada lectura y cada acción que Channelad realiza contra tu WhatsApp queda registrada en un log inmutable, visible en tu dashboard en la sección "Registro de accesos". El log incluye:',
    ],
    list: [
      'Fecha y hora exacta (UTC) de cada operación',
      'Tipo de operación (lectura de seguidores, lectura de métricas, publicación, etc.)',
      'Canal afectado',
      'Resumen legible del dato leído o escrito',
      'IP de origen y resultado de la operación',
    ],
    paragraphs2: [
      'Puedes exportar el log completo en formato JSON o CSV en cualquier momento. Si detectas una operación que no debería existir, notifícanos inmediatamente en soporte@channelad.io y abriremos una investigación.',
    ],
  },
  {
    title: '9. Base legal del tratamiento (Art. 6 RGPD)',
    paragraphs: [
      'El acceso a los datos de tu WhatsApp se basa en:',
    ],
    list: [
      'Art. 6.1.a RGPD — Consentimiento explícito: aceptas esta política antes de iniciar la vinculación y puedes retirar el consentimiento en cualquier momento',
      'Art. 6.1.b RGPD — Ejecución de contrato: el acceso es necesario para proporcionarte el servicio de marketplace de publicidad que has solicitado',
      'Art. 6.1.f RGPD — Interés legítimo: detección de fraude y protección de anunciantes que contratan campañas en tu canal',
    ],
  },
  {
    title: '10. Subprocesadores',
    paragraphs: [
      'Channelad utiliza los siguientes subprocesadores para operar el servicio. Ninguno de ellos recibe datos personales identificables de tus seguidores:',
    ],
    list: [
      'MongoDB Atlas (almacenamiento de datos, servidores UE)',
      'Vercel Inc. (hosting del frontend, CDN)',
      'Hetzner / Railway (hosting del worker Baileys, servidores UE)',
      'Stripe Inc. (procesamiento de pagos, PCI DSS Level 1) — solo para transacciones',
      '@whiskeysockets/baileys (librería open source, ejecutándose en nuestros servidores)',
    ],
  },
  {
    title: '11. Riesgos técnicos que debes conocer',
    paragraphs: [
      'Queremos que tomes la decisión con toda la información. Los riesgos conocidos al vincular tu WhatsApp son:',
    ],
    list: [
      'WhatsApp técnicamente no apoya clientes automatizados en sus términos de servicio, aunque usemos el mecanismo oficial de dispositivos vinculados. En casos extremos, Meta puede suspender cuentas que detecte como automatizadas.',
      'Si mantienes tu teléfono apagado o sin internet durante más de 14 días, WhatsApp desvincula automáticamente todos los dispositivos (incluido Channelad). Deberás volver a escanear el QR.',
      'Un fallo del servidor de Channelad puede interrumpir temporalmente la lectura de métricas. Tu canal y tus datos en WhatsApp no se ven afectados — solo el dashboard de Channelad.',
    ],
  },
  {
    title: '12. Tus derechos RGPD',
    paragraphs: [
      'Como titular de los datos, tienes en todo momento derecho a:',
    ],
    list: [
      'Acceso: solicitar una copia completa de los datos que tenemos sobre ti y tus canales',
      'Rectificación: corregir datos inexactos',
      'Supresión (derecho al olvido): solicitar la eliminación total e irreversible',
      'Limitación del tratamiento: pedir que paremos de procesar ciertos datos',
      'Portabilidad: recibir tus datos en formato JSON/CSV',
      'Oposición: oponerte al tratamiento basado en interés legítimo',
      'Retirada del consentimiento: revocar el acceso en cualquier momento sin dar explicaciones',
      'Reclamación ante la AEPD: si consideras que vulneramos tus derechos, puedes reclamar en www.aepd.es',
    ],
  },
  {
    title: '13. Contacto del responsable',
    paragraphs: [
      'Responsable del tratamiento: Channelad (en proceso de constitución como sociedad en España).',
      'Contacto para ejercer tus derechos y cualquier consulta relacionada con esta política: soporte@channelad.io',
      'Te responderemos en un plazo máximo de 30 días naturales.',
    ],
  },
]
