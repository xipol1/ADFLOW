/**
 * Uploads · campaign media to Cloudflare R2.
 *
 * Single endpoint `POST /api/uploads/campaign-media`. Multer memory
 * storage → buffer → r2StorageService → URL pública. Auth requerido,
 * rate-limited (10/min/user). Devuelve { url, key, type, mime, size }.
 *
 * Para montarlo en app.js:
 *   1. Añadir try { _routes['./routes/uploads'] = require('./routes/uploads'); }
 *      catch (e) { _routes['./routes/uploads'] = e; }  en el bloque de
 *      preloads.
 *   2. Añadir ['/api/uploads', './routes/uploads'] al array enabledRoutes.
 */

const express = require('express');
const multer = require('multer');
const { autenticar } = require('../middleware/auth');
const { limitarIntentos } = require('../middleware/rateLimiter');
const r2 = require('../services/r2StorageService');

const router = express.Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: r2.MAX_BYTES, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (!r2.ALLOWED_MIME.includes(file.mimetype)) {
      return cb(Object.assign(new Error(`Tipo no permitido: ${file.mimetype}`), {
        status: 400, code: 'MIME_NOT_ALLOWED',
      }));
    }
    cb(null, true);
  },
});

const uploadLimiter = limitarIntentos({
  windowMs: 60 * 1000,
  max: 10,
  message: 'Demasiadas subidas. Espera un minuto.',
});

router.post(
  '/campaign-media',
  autenticar,
  uploadLimiter,
  (req, res, next) => {
    upload.single('file')(req, res, (err) => {
      if (err) {
        const status = err.status || (err.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
        return res.status(status).json({
          success: false,
          message: err.message,
          code: err.code || 'UPLOAD_FAILED',
        });
      }
      next();
    });
  },
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'Falta el archivo (campo "file").' });
    }
    if (!r2.isEnabled()) {
      return res.status(503).json({
        success: false,
        message: 'Almacenamiento R2 no configurado en este entorno.',
        code: 'STORAGE_NOT_CONFIGURED',
      });
    }
    try {
      const result = await r2.uploadFile({
        buffer: req.file.buffer,
        mime: req.file.mimetype,
        originalName: req.file.originalname,
        userId: req.usuario?.id,
      });
      const type =
        result.mime.startsWith('image/') ? 'image' :
        result.mime.startsWith('video/') ? 'video' :
        'document';
      return res.json({
        success: true,
        data: {
          url: result.url,
          key: result.key,
          type,
          mime: result.mime,
          size: result.size,
        },
      });
    } catch (err) {
      const status = err.status || 500;
      return res.status(status).json({
        success: false,
        message: err.message || 'Error subiendo el archivo.',
        code: err.code || 'UPLOAD_FAILED',
      });
    }
  }
);

module.exports = router;
