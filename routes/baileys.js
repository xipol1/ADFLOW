/**
 * Baileys / WhatsApp Web linking routes.
 *
 * All endpoints require authentication. Rate-limited via limitadorEndpoint
 * to prevent abuse (QR generation is relatively cheap but scans require
 * persistent WebSocket resources).
 */

'use strict';

const express = require('express');
const { body, param } = require('express-validator');
const router = express.Router();

const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const { limitadorGeneral, limitarIntentos } = require('../middleware/rateLimiter');
const c = require('../controllers/baileysController');

// Specific limiter for QR link start — expensive, should be infrequent
const limitadorLinkStart = limitarIntentos({
  windowMs: 60 * 60 * 1000,
  max: 10,
  message: { success: false, message: 'Demasiados intentos de vinculación. Espera 1h.' },
});

// ─── Link flow ──────────────────────────────────────────────────────────────

router.post(
  '/link/start',
  autenticar,
  limitadorLinkStart,
  [
    body('consentAccepted').isBoolean().custom((v) => v === true).withMessage('Debes aceptar la política'),
    body('alias').optional().isString().isLength({ max: 80 }),
    body('canalId').optional({ nullable: true }).isMongoId(),
  ],
  validarCampos,
  c.startLink
);

router.get(
  '/link/:sessionId',
  autenticar,
  [param('sessionId').isMongoId()],
  validarCampos,
  c.getLinkState
);

// ─── Sessions management ────────────────────────────────────────────────────

router.get('/sessions', autenticar, c.listSessions);

router.post(
  '/sessions/:sessionId/refresh-newsletters',
  autenticar,
  limitadorGeneral,
  [param('sessionId').isMongoId()],
  validarCampos,
  c.refreshNewsletters
);

router.post(
  '/sessions/:sessionId/link-canal',
  autenticar,
  [
    param('sessionId').isMongoId(),
    body('newsletterJid').isString().notEmpty(),
    body('canalId').isMongoId(),
  ],
  validarCampos,
  c.linkNewsletterToCanal
);

router.delete(
  '/sessions/:sessionId',
  autenticar,
  [param('sessionId').isMongoId()],
  validarCampos,
  c.revokeSession
);

// ─── Audit log ──────────────────────────────────────────────────────────────

router.get('/audit', autenticar, c.listAuditLog);

module.exports = router;
