const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const Transaccion = require('../models/Transaccion');
const { ensureDb } = require('../lib/ensureDb');
const { generateInvoiceHTML } = require('../services/invoiceService');

const router = express.Router();

// GET /api/invoices/:transactionId — Generate and return HTML invoice
// Supports both Bearer token and ?token= query param (for window.open)
router.get(
  '/:transactionId',
  async (req, res, next) => {
    // Allow token via query param for window.open() calls
    if (!req.headers.authorization && req.query.token) {
      req.headers.authorization = `Bearer ${req.query.token}`;
    }
    next();
  },
  autenticar,
  [param('transactionId').isMongoId().withMessage('ID invalido')],
  validarCampos,
  async (req, res, next) => {
    try {
      const ok = await ensureDb();
      if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

      const userId = req.usuario?.id;
      if (!userId) return res.status(401).json({ success: false, message: 'No autorizado' });

      const tx = await Transaccion.findById(req.params.transactionId)
        .populate('advertiser', 'nombre email')
        .populate('creator', 'nombre email');

      if (!tx) return res.status(404).json({ success: false, message: 'Transaccion no encontrada' });

      // Verify ownership
      const isOwner = [tx.advertiser?._id?.toString(), tx.creator?._id?.toString()].includes(String(userId));
      const isAdmin = req.usuario?.rol === 'admin';
      if (!isOwner && !isAdmin) {
        return res.status(403).json({ success: false, message: 'No autorizado' });
      }

      const html = generateInvoiceHTML(tx, req.usuario);

      const txId = String(tx._id).slice(-8).toUpperCase();
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.setHeader('Content-Disposition', `inline; filename="factura-${txId}.html"`);
      return res.send(html);
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
