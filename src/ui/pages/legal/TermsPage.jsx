import React from 'react'
import { Link } from 'react-router-dom'
import { PURPLE, FONT_BODY, FONT_DISPLAY } from '../../theme/tokens'

export default function TermsPage() {
  return (
    <div style={{ fontFamily: FONT_BODY, padding: '60px 24px 80px', maxWidth: '760px', margin: '0 auto' }}>
      <Link to="/" style={{ fontSize: '13px', color: PURPLE, textDecoration: 'none', fontWeight: 500, display: 'inline-flex', alignItems: 'center', gap: '4px', marginBottom: '32px' }}>
        ← Volver al inicio
      </Link>

      <h1 style={{ fontFamily: FONT_DISPLAY, fontSize: '32px', fontWeight: 800, color: 'var(--text)', marginBottom: '8px', letterSpacing: '-0.5px' }}>
        Terminos de Uso
      </h1>
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '40px' }}>Ultima actualizacion: 1 de enero de 2026</p>

      {[
        {
          title: '1. Aceptacion de los terminos',
          content: 'Al acceder o utilizar Adflow, aceptas estar sujeto a estos terminos de uso. Si no estas de acuerdo con alguna parte de estos terminos, no podras acceder a la plataforma.'
        },
        {
          title: '2. Descripcion del servicio',
          content: 'Adflow es una plataforma de marketplace que conecta anunciantes con creadores de contenido en canales de comunicacion (WhatsApp, Telegram, Discord, entre otros). Facilitamos la contratacion de espacios publicitarios y proporcionamos herramientas de gestion de campanas.'
        },
        {
          title: '3. Cuentas de usuario',
          content: 'Debes proporcionar informacion precisa y actualizada al registrarte. Eres responsable de mantener la confidencialidad de tu cuenta y contrasena. Cada persona solo puede mantener una cuenta activa.'
        },
        {
          title: '4. Roles: Anunciantes y Creadores',
          content: 'Los anunciantes pueden explorar canales, crear solicitudes de publicidad y gestionar campanas. Los creadores pueden registrar sus canales, recibir solicitudes y monetizar su audiencia. Ambas partes se comprometen a actuar de buena fe en todas las transacciones.'
        },
        {
          title: '5. Pagos y comisiones',
          content: 'Los pagos entre anunciantes y creadores se procesan a traves de nuestro sistema de pago custodiado. Adflow cobra una comision sobre cada transaccion completada. Los fondos se liberan al creador una vez confirmada la publicacion del anuncio.'
        },
        {
          title: '6. Contenido prohibido',
          content: 'Esta prohibido utilizar la plataforma para publicidad de contenido ilegal, enganoso, discriminatorio, o que infrinja derechos de terceros. Nos reservamos el derecho de eliminar contenido y suspender cuentas que violen estas normas.'
        },
        {
          title: '7. Disputas',
          content: 'En caso de desacuerdo entre anunciantes y creadores, ambas partes pueden abrir una disputa a traves del sistema integrado. Adflow actuara como mediador imparcial y su decision sera vinculante para ambas partes.'
        },
        {
          title: '8. Limitacion de responsabilidad',
          content: 'Adflow actua como intermediario y no es responsable del contenido publicado en los canales de los creadores, ni de los resultados de las campanas publicitarias. La plataforma se proporciona "tal cual" sin garantias implicitas.'
        },
        {
          title: '9. Modificaciones',
          content: 'Nos reservamos el derecho de modificar estos terminos en cualquier momento. Los cambios entraran en vigor al publicarse en la plataforma. El uso continuado de Adflow constituye la aceptacion de los terminos modificados.'
        },
        {
          title: '10. Contacto',
          content: 'Para consultas relacionadas con estos terminos, puedes contactarnos en soporte@adflow.com.'
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
          Si tienes preguntas sobre estos terminos, contactanos en{' '}
          <a href="mailto:soporte@adflow.com" style={{ color: PURPLE, textDecoration: 'none' }}>soporte@adflow.com</a>
        </p>
      </div>
    </div>
  )
}
