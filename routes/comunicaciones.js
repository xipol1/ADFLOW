/**
 * Preferencias de comunicación + baja en un click.
 *
 *   GET  /api/comunicaciones/preferencias   (auth)   estado actual
 *   PUT  /api/comunicaciones/preferencias   (auth)   alta/baja desde la cuenta
 *   POST /api/comunicaciones/decision       (auth)   respuesta al diálogo único
 *   GET  /api/comunicaciones/baja?token=…   (público) baja en un click
 *   POST /api/comunicaciones/baja?token=…   (público) One-Click RFC 8058
 *
 * Los dos endpoints públicos no llevan sesión a propósito: el art. 7.3 RGPD
 * exige que retirar el consentimiento sea tan fácil como darlo, y obligar a
 * loguearse para darse de baja no lo es. La autorización va en la firma HMAC
 * del token (services/marketingConsent.js), que impide enumerar usuarios.
 *
 * El POST existe porque Gmail y Yahoo, desde febrero de 2024, hacen la baja
 * ellos mismos con un POST a la cabecera List-Unsubscribe cuando el usuario
 * pulsa "Cancelar suscripción" en su cliente de correo (RFC 8058). Sin él, esa
 * baja no llegaría nunca a nuestra base de datos.
 */

const express = require('express');
const { body } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const { ensureDb } = require('../lib/ensureDb');
const marketingConsent = require('../services/marketingConsent');

const router = express.Router();

// ─── Página HTML de confirmación de baja ─────────────────────────────────────
// Siempre el mismo formato, responda lo que responda: no revelamos si el token
// era válido ni si el usuario existe.
const renderPage = (title, body) => `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <title>${title} · Channelad</title>
  <meta name="viewport" content="width=device-width,initial-scale=1">
</head>
<body style="margin:0;padding:0;background:#f5f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#1c1c1e;">
  <div style="max-width:520px;margin:80px auto;padding:32px;background:#fff;border-radius:16px;text-align:center;">
    <h1 style="font-size:22px;font-weight:700;margin:0 0 12px;">${title}</h1>
    <p style="font-size:15px;color:#6e6e73;line-height:1.6;margin:0 0 24px;">${body}</p>
    <a href="https://channelad.io" style="display:inline-block;padding:12px 24px;background:#25d366;color:#fff;text-decoration:none;border-radius:10px;font-weight:600;font-size:14px;">Volver a channelad.io</a>
  </div>
</body>
</html>`;

/**
 * Procesa la baja a partir del token. Idempotente: dar de baja a quien ya
 * estaba de baja se considera éxito (los clientes de correo reintentan).
 * Devuelve un código de estado y un cuerpo listo para responder.
 */
async function procesarBaja(req) {
  const dato = marketingConsent.verifyUnsubscribeToken(req.query?.token || req.body?.token);
  if (!dato) {
    return {
      status: 400,
      title: 'Enlace no válido',
      body: 'El enlace de baja no es válido o ha caducado. Si sigues recibiendo emails y no los quieres, escríbenos a contact@channelad.io y te damos de baja a mano.',
    };
  }

  if (!(await ensureDb())) {
    return {
      status: 503,
      title: 'Servicio temporalmente no disponible',
      body: 'No hemos podido procesar tu baja ahora mismo. Vuelve a intentarlo en unos minutos.',
    };
  }

  // La audiencia 'lead' pertenece a la calculadora — ese flujo tiene su propio
  // endpoint (/api/calculator/unsubscribe) y su propia colección.
  if (dato.audiencia !== 'usuario') {
    return {
      status: 400,
      title: 'Enlace no válido',
      body: 'Este enlace de baja no corresponde a una cuenta de Channelad.',
    };
  }

  const Usuario = require('../models/Usuario');
  const user = await Usuario.findById(dato.id);
  if (user) {
    await marketingConsent.aplicarPreferencia(user, false, req, 'email_baja');
  }

  return {
    status: 200,
    title: 'Te hemos dado de baja',
    body: 'No volverás a recibir emails con novedades ni promociones de Channelad. Seguirás recibiendo los avisos del propio servicio (verificación, campañas, pagos) porque forman parte de tu cuenta. Puedes volver a suscribirte cuando quieras desde tus preferencias.',
  };
}

router.get('/baja', async (req, res) => {
  try {
    const r = await procesarBaja(req);
    return res.status(r.status).send(renderPage(r.title, r.body));
  } catch (err) {
    console.error('[comunicaciones/baja] error:', err?.message || err);
    return res.status(500).send(renderPage(
      'Error procesando la baja',
      'Algo ha fallado. Vuelve a intentarlo o escríbenos a contact@channelad.io.'
    ));
  }
});

// One-Click (RFC 8058): el cliente de correo hace POST y espera 200 sin más.
router.post('/baja', express.urlencoded({ extended: false }), async (req, res) => {
  try {
    const r = await procesarBaja(req);
    return res.status(r.status).json({ success: r.status === 200, message: r.title });
  } catch (err) {
    console.error('[comunicaciones/baja POST] error:', err?.message || err);
    return res.status(500).json({ success: false, message: 'Error procesando la baja' });
  }
});

// ─── Preferencias desde la cuenta ────────────────────────────────────────────

router.get('/preferencias', autenticar, async (req, res) => {
  const c = req.usuario?.comunicaciones || {};
  return res.json({
    success: true,
    preferencias: {
      marketingOptIn: c.marketingOptIn === true,
      marketingOptInAt: c.marketingOptInAt || null,
      marketingOptOutAt: c.marketingOptOutAt || null,
      texto: marketingConsent.MARKETING_CONSENT_TEXT,
      version: marketingConsent.MARKETING_CONSENT_VERSION,
    },
  });
});

router.put(
  '/preferencias',
  autenticar,
  body('marketingOptIn').isBoolean().withMessage('marketingOptIn debe ser booleano'),
  validarCampos,
  async (req, res) => {
    try {
      if (!(await ensureDb())) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      const Usuario = require('../models/Usuario');
      const user = await Usuario.findById(req.usuario._id || req.usuario.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const optIn = req.body.marketingOptIn === true || req.body.marketingOptIn === 'true';
      const { cambiado, estado } = await marketingConsent.aplicarPreferencia(user, optIn, req, 'preferencias');

      return res.json({
        success: true,
        cambiado,
        preferencias: {
          marketingOptIn: estado,
          marketingOptInAt: user.comunicaciones?.marketingOptInAt || null,
          marketingOptOutAt: user.comunicaciones?.marketingOptOutAt || null,
        },
      });
    } catch (err) {
      console.error('[comunicaciones/preferencias] error:', err?.message || err);
      return res.status(500).json({ success: false, message: 'No se pudo guardar la preferencia' });
    }
  }
);

// ─── Respuesta al diálogo de consentimiento ──────────────────────────────────
//
// Lo contesta MarketingConsentPrompt, el modal que ven una sola vez las cuentas
// que se registraron antes de que existiera la casilla. Acepta 'si', 'no' o
// 'luego'; las tres son respuestas legítimas y ninguna condiciona el acceso a
// la plataforma (art. 7.4 RGPD).
router.post(
  '/decision',
  autenticar,
  body('respuesta').isIn(['si', 'no', 'luego']).withMessage('respuesta debe ser si, no o luego'),
  validarCampos,
  async (req, res) => {
    try {
      if (!(await ensureDb())) {
        return res.status(503).json({ success: false, message: 'Base de datos no disponible' });
      }
      const Usuario = require('../models/Usuario');
      const user = await Usuario.findById(req.usuario._id || req.usuario.id);
      if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

      const resultado = await marketingConsent.registrarDecision(user, req.body.respuesta, req);

      return res.json({
        success: true,
        ...resultado,
        // El frontend lo usa para dejar de mostrar el diálogo sin recargar.
        marketingPromptPending: marketingConsent.necesitaPrompt(user),
      });
    } catch (err) {
      console.error('[comunicaciones/decision] error:', err?.message || err);
      return res.status(500).json({ success: false, message: 'No se pudo guardar tu respuesta' });
    }
  }
);

module.exports = router;
