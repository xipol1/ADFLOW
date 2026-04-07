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
      <p style={{ fontSize: '13px', color: 'var(--muted)', marginBottom: '40px' }}>Ultima actualizacion: 1 de enero de 2026</p>

      {[
        {
          title: '1. Informacion que recopilamos',
          content: 'Recopilamos la informacion que nos proporcionas directamente al crear una cuenta (nombre, correo electronico, rol), asi como datos de uso de la plataforma para mejorar nuestros servicios. No vendemos tu informacion personal a terceros.'
        },
        {
          title: '2. Uso de la informacion',
          content: 'Utilizamos tu informacion para operar y mantener la plataforma, procesar transacciones entre anunciantes y creadores, enviar notificaciones relevantes, y mejorar la experiencia del usuario. Los datos de las campanas se utilizan para generar metricas anonimizadas.'
        },
        {
          title: '3. Compartir informacion',
          content: 'Compartimos informacion limitada entre anunciantes y creadores cuando existe una relacion comercial activa (solicitudes de publicidad, campanas). No compartimos tu informacion con terceros salvo obligacion legal o con proveedores de servicios esenciales (procesamiento de pagos, alojamiento).'
        },
        {
          title: '4. Seguridad de datos',
          content: 'Implementamos medidas de seguridad estandar del sector, incluyendo encriptacion de datos en transito y en reposo, autenticacion JWT, y auditorias regulares. Los pagos son procesados a traves de Stripe con los mas altos estandares PCI DSS.'
        },
        {
          title: '5. Retencion de datos',
          content: 'Conservamos tus datos personales mientras mantengas una cuenta activa. Puedes solicitar la eliminacion de tu cuenta y datos asociados en cualquier momento desde la configuracion de tu perfil o contactando a soporte.'
        },
        {
          title: '6. Cookies',
          content: 'Utilizamos cookies esenciales para la autenticacion y preferencias (como el tema visual). No utilizamos cookies de rastreo de terceros ni publicidad basada en cookies. Puedes gestionar las cookies desde la configuracion de tu navegador.'
        },
        {
          title: '7. Tus derechos',
          content: 'Tienes derecho a acceder, rectificar, portar y eliminar tus datos personales conforme al RGPD. Para ejercer estos derechos, contacta con nosotros a traves de soporte@adflow.com.'
        },
        {
          title: '8. Cambios en esta politica',
          content: 'Nos reservamos el derecho de actualizar esta politica de privacidad. Notificaremos cambios significativos por correo electronico o mediante un aviso destacado en la plataforma.'
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
          <a href="mailto:soporte@adflow.com" style={{ color: PURPLE, textDecoration: 'none' }}>soporte@adflow.com</a>
        </p>
      </div>
    </div>
  )
}
