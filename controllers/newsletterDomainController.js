/**
 * Newsletter Domain Verification Controller
 *
 * REST surface for the proof-of-domain protocol implemented in
 * services/newsletter/domainVerificationService.js. There are four
 * endpoints, three authenticated and one public:
 *
 *   POST  /newsletter/verify/start       (auth) → returns TXT record or queues email
 *   POST  /newsletter/verify/dns-check   (auth) → polls DNS for the TXT
 *   POST  /newsletter/verify/email-send  (auth) → sends the signed link
 *   GET   /newsletter/verify/email-confirm/:token   (public) → completes proof
 *
 * The public confirm endpoint is intentionally not auth-gated: the signed
 * JWT in the URL *is* the auth. Requiring login here would defeat the
 * email-based proof — the owner clicking the link may not have a session.
 */

const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const domainVerification = require('../services/newsletter/domainVerificationService');
const emailService = require('../services/emailService');

const httpError = (status, message, code) => {
  const err = new Error(message);
  err.status = status;
  if (code) err.code = code;
  return err;
};

async function loadOwnedCanal(req, res, next) {
  const userId = req.usuario?.id;
  if (!userId) {
    next(httpError(401, 'No autorizado'));
    return null;
  }
  const ok = await ensureDb();
  if (!ok) {
    res.status(503).json({ success: false, message: 'Servicio no disponible' });
    return null;
  }
  const canal = await Canal.findById(req.params.id);
  if (!canal) {
    next(httpError(404, 'Canal no encontrado'));
    return null;
  }
  if (canal.propietario?.toString() !== String(userId)) {
    next(httpError(403, 'No autorizado'));
    return null;
  }
  if (canal.plataforma !== 'newsletter') {
    next(httpError(400, 'Solo aplicable a canales de newsletter'));
    return null;
  }
  return canal;
}

exports.startChallenge = async (req, res, next) => {
  try {
    const canal = await loadOwnedCanal(req, res, next);
    if (!canal) return;

    const { domain, method } = req.body;
    const result = await domainVerification.startChallenge(canal, { domain, method });
    return res.json({ success: true, data: result });
  } catch (err) {
    if (err.status) return next(err);
    if (err.code) return next(httpError(400, err.message, err.code));
    return next(err);
  }
};

exports.checkDns = async (req, res, next) => {
  try {
    const canal = await loadOwnedCanal(req, res, next);
    if (!canal) return;

    const result = await domainVerification.checkDnsChallenge(canal);
    // Don't 4xx on TOKEN_MISMATCH — that's an expected state during DNS
    // propagation; client polls until ok:true. We only return non-200 for
    // shape errors (WRONG_METHOD, NO_CHALLENGE).
    return res.json({ success: result.ok, data: result });
  } catch (err) {
    return next(err);
  }
};

exports.sendEmail = async (req, res, next) => {
  try {
    const canal = await loadOwnedCanal(req, res, next);
    if (!canal) return;

    const { mailbox } = req.body || {};
    let recipient;
    try {
      recipient = domainVerification.resolveRecipient(canal, mailbox);
    } catch (err) {
      return next(httpError(400, err.message, err.code));
    }

    let token;
    try {
      token = domainVerification.buildEmailToken(canal);
    } catch (err) {
      return next(httpError(400, err.message, err.code));
    }

    const appBase = process.env.APP_BASE_URL || 'https://channelad.io';
    const link = `${appBase}/api/oauth/newsletter/verify/email-confirm/${encodeURIComponent(token)}`;
    const domain = canal.newsletterVerification?.domain || '';

    try {
      await emailService.enviarEmail({
        para: recipient,
        asunto: `Verifica tu dominio ${domain} en Channelad`,
        texto: `Confirma la propiedad de ${domain} haciendo clic: ${link}\n\nSi no solicitaste esta verificación, ignora este mensaje. El enlace expira en 24 horas.`,
        html: `
          <p>Para verificar la propiedad del dominio <strong>${domain}</strong> en Channelad, haz clic en el siguiente enlace:</p>
          <p><a href="${link}">${link}</a></p>
          <p>Si no solicitaste esta verificación, ignora este mensaje. El enlace expira en 24 horas.</p>
        `,
      });
    } catch (emailErr) {
      return next(httpError(502, 'No se pudo enviar el correo de verificación', 'EMAIL_SEND_FAILED'));
    }

    return res.json({
      success: true,
      data: { sentTo: recipient, expiresInHours: 24 },
    });
  } catch (err) {
    return next(err);
  }
};

// Public — the signed token in the URL is the proof of authorization.
exports.confirmEmail = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const token = String(req.params.token || '');
    const result = await domainVerification.confirmEmailToken(token, { CanalModel: Canal });
    if (result.ok) {
      // Friendly HTML for the human clicking the link. JSON is exposed via
      // ?format=json for programmatic callers (tests, CLIs).
      if (req.query.format === 'json') {
        return res.json({ success: true, data: result });
      }
      return res.send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Dominio verificado</title>
<body style="font-family:sans-serif;max-width:560px;margin:80px auto;padding:24px;text-align:center">
<h1>Dominio verificado</h1>
<p>${result.message}</p>
<p><a href="/dashboard">Volver al panel</a></p>
</body></html>`);
    }
    if (req.query.format === 'json') {
      return res.status(400).json({ success: false, data: result });
    }
    return res.status(400).send(`<!doctype html><html lang="es"><meta charset="utf-8"><title>Verificación fallida</title>
<body style="font-family:sans-serif;max-width:560px;margin:80px auto;padding:24px;text-align:center">
<h1>Verificación fallida</h1>
<p>${result.message}</p>
</body></html>`);
  } catch (err) {
    return next(err);
  }
};
