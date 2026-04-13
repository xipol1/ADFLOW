/**
 * Channel Candidates routes.
 *
 * 1. Cron endpoint: GET /api/jobs/tgstat-discover (CRON_SECRET)
 * 2. Admin endpoints:
 *    - GET  /                    — list candidates
 *    - POST /:id/approve         — approve → create Canal
 *    - POST /:id/reject          — reject with reason
 */

const express = require('express');
const mongoose = require('mongoose');
// Lazy-loaded to avoid bundling axios/cheerio into every Vercel function invocation
const loadTgstat = () => require('../services/tgstatScraperService');
const { autenticar } = require('../middleware/auth');

const router = express.Router();

// ── Lazy model loaders (avoid circular deps at startup) ──────────────────
let _ChannelCandidate, _Canal;
function getModels() {
  if (!_ChannelCandidate) _ChannelCandidate = require('../models/ChannelCandidate');
  if (!_Canal) _Canal = require('../models/Canal');
  return { ChannelCandidate: _ChannelCandidate, Canal: _Canal };
}

// ── CRON_SECRET middleware ───────────────────────────────────────────────
function requireCronSecret(req, res, next) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return res.status(503).json({ success: false, message: 'CRON_SECRET not configured' });
  }
  if (req.headers.authorization !== `Bearer ${secret}`) {
    return res.status(401).json({ success: false, message: 'Unauthorized' });
  }
  return next();
}

// ── Cron: TGStat Discovery ──────────────────────────────────────────────
async function handleTGStatDiscover(req, res) {
  try {
    const { batchDiscoverFromTGStat, DEFAULT_CATEGORIES } = loadTgstat();
    const categories = req.body?.categories || req.query?.categories?.split(',') || DEFAULT_CATEGORIES;
    const start = Date.now();

    const result = await batchDiscoverFromTGStat(categories);

    return res.json({
      success: true,
      discovered: result.discovered,
      duplicates: result.duplicates,
      saved: result.saved,
      errors: result.errors,
      duration_ms: Date.now() - start,
    });
  } catch (err) {
    console.error('TGStat discover cron error:', err?.message);
    return res.status(500).json({
      success: false,
      message: 'TGStat discovery failed',
      error: err?.message,
    });
  }
}

router.get('/tgstat-discover', requireCronSecret, handleTGStatDiscover);
router.post('/tgstat-discover', requireCronSecret, handleTGStatDiscover);

// ── Massive seed (one-shot, background) ─────────────────────────────────
router.post('/massive-seed', requireCronSecret, async (req, res) => {
  try {
    const { startMassiveSeedJob } = require('../jobs/massiveSeedJob');
    const jobId = startMassiveSeedJob();
    return res.json({ success: true, jobId, status: 'started', message: 'Job running in background. Poll /api/jobs/:jobId/status for progress.' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Job status polling ──────────────────────────────────────────────────
router.get('/:jobId/status', requireCronSecret, async (req, res) => {
  try {
    const JobLog = require('../models/JobLog');
    const log = await JobLog.findOne({ jobId: req.params.jobId }).lean();
    if (!log) return res.status(404).json({ success: false, message: 'Job not found' });
    return res.json({ success: true, data: log });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Admin: List candidates ──────────────────────────────────────────────
router.get('/candidates', autenticar, async (req, res) => {
  try {
    const { ChannelCandidate } = getModels();
    const { status, source, page = 1, limit = 50 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (source) filter.source = source;

    const skip = (Math.max(1, Number(page)) - 1) * Number(limit);

    const [candidates, total] = await Promise.all([
      ChannelCandidate.find(filter)
        .sort({ scraped_at: -1 })
        .skip(skip)
        .limit(Number(limit))
        .lean(),
      ChannelCandidate.countDocuments(filter),
    ]);

    return res.json({
      success: true,
      data: candidates,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (err) {
    console.error('List candidates error:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to list candidates' });
  }
});

// ── Admin: Approve candidate ────────────────────────────────────────────
router.post('/candidates/:id/approve', autenticar, async (req, res) => {
  try {
    const { ChannelCandidate, Canal } = getModels();
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate ID' });
    }

    const candidate = await ChannelCandidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    if (candidate.status === 'approved') {
      return res.status(409).json({ success: false, message: 'Already approved', canal_id: candidate.canal_id });
    }

    // Check if canal already exists with this username
    const existing = await Canal.findOne({
      plataforma: 'telegram',
      identificadorCanal: { $regex: new RegExp(`^@?${candidate.username}$`, 'i') },
    });

    if (existing) {
      candidate.status = 'duplicate';
      candidate.canal_id = existing._id;
      candidate.reviewed_at = new Date();
      await candidate.save();
      return res.status(409).json({ success: false, message: 'Canal already exists', canal_id: existing._id });
    }

    // Create Canal document
    const canal = await Canal.create({
      propietario: req.usuario?._id || null,
      plataforma: 'telegram',
      identificadorCanal: `@${candidate.username}`,
      nombreCanal: candidate.raw_metrics?.title || candidate.username,
      categoria: candidate.raw_metrics?.category || '',
      descripcion: candidate.raw_metrics?.description || '',
      estado: 'pendiente_verificacion',
      estadisticas: {
        seguidores: candidate.raw_metrics?.subscribers || 0,
      },
    });

    // Update candidate
    candidate.status = 'approved';
    candidate.canal_id = canal._id;
    candidate.reviewed_at = new Date();
    await candidate.save();

    return res.json({ success: true, data: { candidate, canal } });
  } catch (err) {
    console.error('Approve candidate error:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to approve candidate' });
  }
});

// ── Admin: Reject candidate ─────────────────────────────────────────────
router.post('/candidates/:id/reject', autenticar, async (req, res) => {
  try {
    const { ChannelCandidate } = getModels();
    const { id } = req.params;
    const { rejection_reason } = req.body || {};

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ success: false, message: 'Invalid candidate ID' });
    }

    const candidate = await ChannelCandidate.findById(id);
    if (!candidate) {
      return res.status(404).json({ success: false, message: 'Candidate not found' });
    }

    candidate.status = 'rejected';
    candidate.rejection_reason = rejection_reason || '';
    candidate.reviewed_at = new Date();
    await candidate.save();

    return res.json({ success: true, data: candidate });
  } catch (err) {
    console.error('Reject candidate error:', err?.message);
    return res.status(500).json({ success: false, message: 'Failed to reject candidate' });
  }
});

module.exports = router;
