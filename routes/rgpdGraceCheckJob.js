/**
 * SPEC-B1: RGPD grace-check cron job.
 *
 * GET/POST /api/jobs/rgpd-grace
 * Protected by CRON_SECRET. Triggered hourly por Vercel Cron (vercel.json).
 *
 * En cada ejecución dispara los 2 workers RGPD en orden:
 *   1. rgpdExportWorker.runPendingExports()        — genera ZIPs encolados
 *   2. rgpdDeletionWorker.runGraceWarnings()       — envía aviso 24h antes
 *   3. rgpdDeletionWorker.runExpiredGracePeriods() — liquida + anonimiza
 *
 * Orden importante: ejecutamos el worker de export PRIMERO porque un usuario
 * podría haber pedido export justo antes de borrarse — queremos darle la
 * descarga antes de que la anonimización rompa los datos.
 *
 * Los 2 workers son skeleton aún (creados en US1 T018 y US2 T035). Mientras
 * tanto este handler responde 200 con stats vacías sin romper el cron.
 *
 * Mount: `/api/jobs/rgpd-grace` en app.js (route definida más abajo, montada
 * por `enabledRoutes`).
 */

const express = require('express');
const router = express.Router();

// Lazy-loaded — el workers no existen todavía (skeleton phase). Cuando US1
// T018 y US2 T035 estén implementados, estas llamadas tendrán efecto real.
const loadDeletionWorker = () => {
  try { return require('../workers/rgpdDeletionWorker'); }
  catch { return null; }
};
const loadExportWorker = () => {
  try { return require('../workers/rgpdExportWorker'); }
  catch { return null; }
};

function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

async function handle(req, res) {
  const start = Date.now();
  const result = {
    exports: { skipped: true, reason: 'worker not yet implemented' },
    graceWarnings: { skipped: true, reason: 'worker not yet implemented' },
    expiredDeletions: { skipped: true, reason: 'worker not yet implemented' },
  };

  try {
    // 1. Exports pendientes (US2 T035)
    const exportWorker = loadExportWorker();
    if (exportWorker?.runPendingExports) {
      result.exports = await exportWorker.runPendingExports();
    }

    // 2. Aviso 24h antes de fin de gracia (US1 T018)
    const deletionWorker = loadDeletionWorker();
    if (deletionWorker?.runGraceWarnings) {
      result.graceWarnings = await deletionWorker.runGraceWarnings();
    }

    // 3. Liquidación + anonimización (US1 T018)
    if (deletionWorker?.runExpiredGracePeriods) {
      result.expiredDeletions = await deletionWorker.runExpiredGracePeriods();
    }

    return res.json({
      success: true,
      duration_ms: Date.now() - start,
      timestamp: new Date().toISOString(),
      ...result,
    });
  } catch (err) {
    console.error('[rgpd-grace] cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'RGPD grace check failed',
      error: err?.message,
      duration_ms: Date.now() - start,
      partialResult: result,
    });
  }
}

router.get('/rgpd-grace', requireCronSecret, handle);
router.post('/rgpd-grace', requireCronSecret, handle);

module.exports = router;
