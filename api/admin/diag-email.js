/**
 * GET/POST /api/admin/diag-email
 *
 * Diagnostic: shows email service config state and attempts a real send.
 * Query param or body: ?to=test@example.com
 * Protected by CRON_SECRET (Authorization: Bearer <secret>).
 * Remove once email issue is confirmed fixed.
 */
module.exports = async function handler(req, res) {
  // Auth
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }

  const cfg = {
    EMAIL_PROVIDER:     process.env.EMAIL_PROVIDER     || '(not set)',
    EMAIL_HOST:         process.env.EMAIL_HOST          || '(not set)',
    EMAIL_PORT:         process.env.EMAIL_PORT          || '(not set)',
    EMAIL_SECURE:       process.env.EMAIL_SECURE        || '(not set)',
    EMAIL_USER:         process.env.EMAIL_USER
      ? process.env.EMAIL_USER.replace(/(.{3}).*(@.*)/, '$1***$2') : '(not set)',
    EMAIL_PASS:         process.env.EMAIL_PASS          ? '***set***' : '(not set)',
    EMAIL_FROM_NAME:    process.env.EMAIL_FROM_NAME     || '(not set)',
    EMAIL_FROM_ADDRESS: process.env.EMAIL_FROM_ADDRESS  || '(not set)',
    SUPPORT_EMAIL:      process.env.SUPPORT_EMAIL       || '(not set)',
    NODE_ENV:           process.env.NODE_ENV            || '(not set)',
    FRONTEND_URL:       process.env.FRONTEND_URL        || '(not set)',
  };

  const to = req.body?.to || req.query?.to || process.env.EMAIL_USER || '';
  let transporterReady = false;
  let verifyOk = false;
  let verifyError = null;
  let sendResult = null;
  let sendError = null;

  try {
    const emailService = require('../../services/emailService');
    await emailService.ready;
    transporterReady = !!emailService.transporter;

    if (!transporterReady) {
      sendError = 'transporter is null — EMAIL_PROVIDER not configured or inicializar() threw';
    } else {
      try {
        await emailService.transporter.verify();
        verifyOk = true;
      } catch (vErr) {
        verifyError = vErr?.message || String(vErr);
      }

      if (!verifyOk) {
        sendError = `transporter.verify() failed: ${verifyError}`;
      } else if (!to) {
        sendError = 'no "to" address — pass ?to=your@email.com or body { "to": "..." }';
      } else {
        try {
          sendResult = await emailService.enviarEmailVerificacion(to, 'Test User', 'diag-token-000');
        } catch (sErr) {
          sendError = sErr?.message || String(sErr);
        }
      }
    }
  } catch (outer) {
    sendError = `outer error: ${outer?.message || outer}`;
  }

  return res.json({
    success: !sendError && verifyOk,
    config: cfg,
    transporterReady,
    verifyOk,
    verifyError,
    to,
    sendResult,
    sendError,
  });
};
