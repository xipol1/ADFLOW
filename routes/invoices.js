const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const Transaccion = require('../models/Transaccion');
const Factura = require('../models/Factura');
const { ensureDb } = require('../lib/ensureDb');
const { issueInvoiceForTransaction, generateInvoiceHTML } = require('../services/invoiceService');

const router = express.Router();

// Middleware: extrae token de query param para soportar window.open() desde el frontend
const allowQueryToken = (req, _res, next) => {
  if (!req.headers.authorization && req.query.token) {
    req.headers.authorization = `Bearer ${req.query.token}`;
  }
  next();
};

/**
 * GET /api/invoices/:transactionId
 * Devuelve (creando si no existe) la factura HTML para una transacción.
 *
 * Idempotente: la primera llamada genera la Factura legal con número
 * correlativo y la segunda llamada renderiza la misma sin reemitir.
 *
 * El advertiser/creator implicado o un admin pueden acceder.
 */
router.get(
  '/:transactionId',
  allowQueryToken,
  autenticar,
  [param('transactionId').isMongoId().withMessage('ID inválido')],
  validarCampos,
  async (req, res, next) => {
    try {
      const ok = await ensureDb();
      if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

      const userId = req.usuario?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'No autorizado' });

      const tx = await Transaccion.findById(req.params.transactionId);
      if (!tx) return res.status(404).json({ success: false, message: 'Transaccion no encontrada' });

      // Verify ownership: advertiser, creator, or admin can read.
      const isOwner = [
        String(tx.advertiser || ''),
        String(tx.creator || ''),
      ].includes(String(userId));
      const isAdmin = req.usuario?.rol === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }

      // Decide tipo de factura según el rol del solicitante:
      //   - Advertiser ve factura emitida (cargo recibido)
      //   - Creator ve factura recibida (pago a creator) — requiere implementación adicional
      // De momento solo soportamos 'emitida'; el caso 'recibida' se añadirá
      // cuando el creator complete sus datos fiscales y la transacción tenga
      // un creator asociado.
      const tipo = 'emitida';

      let factura;
      try {
        factura = await issueInvoiceForTransaction({
          transactionId: tx._id,
          tipo,
        });
      } catch (e) {
        if (/datos fiscales/i.test(e.message)) {
          return res.status(412).json({
            success: false,
            code: 'FISCAL_DATA_REQUIRED',
            message: 'Datos fiscales del receptor incompletos — completa tu perfil',
          });
        }
        throw e;
      }

      const html = generateInvoiceHTML(factura);

      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="factura-${factura.numero}.html"`);
      return res.send(html);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/invoices/list/mine — Lista las facturas del usuario autenticado.
 */
router.get('/list/mine', autenticar, async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const facturas = await Factura.find({ usuario: req.usuario.id })
      .sort({ fechaEmision: -1 })
      .select('numero serie anio fechaEmision base iva total ivaTreatment tipo')
      .limit(200)
      .lean();

    return res.json({ success: true, facturas });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
