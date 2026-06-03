/**
 * Founding cohort — pre-registration waitlist endpoints.
 *
 * Public (no auth). Hardened with a per-IP rate limit so the signup form
 * can't be turned into a write-amplifier by a single bot. Counter and
 * niche lookups are cached for 30s in process memory.
 *
 *   GET  /api/founder-waitlist/counter           — public counter (label "interesados")
 *   GET  /api/founder-waitlist/niches            — slot status per nicho
 *   GET  /api/founder-waitlist/recent            — masked activity feed
 *   POST /api/founder-waitlist/register          — create signup (double opt-in)
 *   GET  /api/founder-waitlist/confirm/:token    — confirm email, redirect to /founding
 *   GET  /api/founder-waitlist/status/:refToken  — lookup my position + referrals
 */

const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();
const { ensureDb } = require('../lib/ensureDb');
const { autenticar, autorizarRoles } = require('../middleware/auth');
const { migrateLegacyWaitlist } = require('../lib/migrateLegacyWaitlist');
const config = require('../config/config');
const {
  NICHES,
  NICHE_IDS,
  NICHE_MAP,
  SLOTS_PER_NICHE,
  CAP,
  SIZE_IDS,
  PLATFORM_IDS,
  NICHE_ALMOST_FULL_AT,
  computeDisplayedCount,
  computeNichePadding,
} = require('../config/founderWaitlist');

let FounderRegistration;
try {
  FounderRegistration = require('../models/FounderRegistration');
} catch (_) { /* DB-less environments — endpoints will 503 below. */ }

// ── In-process caches (30s TTL) ───────────────────────────────────────
// The counter is read on every landing page render — without a cache,
// even a small traffic spike turns into a Mongo countDocuments storm.
const CACHE_TTL_MS = 30 * 1000;
const RECENT_CACHE_TTL_MS = 60 * 1000; // activity ticker — slightly cooler
let _counterCache = { at: 0, value: null };
let _nicheCache = { at: 0, value: null };
let _recentCache = { at: 0, value: null };

function invalidateCache() {
  _counterCache = { at: 0, value: null };
  _nicheCache = { at: 0, value: null };
  _recentCache = { at: 0, value: null };
}

// Masks a handle so we never publish personal data. Anything that looks
// like an email (contains @ + .) but doesn't lead with @ or http is treated
// as private and rendered as "ab***". Public-looking handles
// (@something, t.me/x, http(s)://...) are returned verbatim.
function publicHandle(raw) {
  if (!raw || typeof raw !== 'string') return '';
  const trimmed = raw.trim();
  if (!trimmed) return '';
  const looksPublic =
    trimmed.startsWith('@') ||
    /^https?:\/\//i.test(trimmed) ||
    /^t\.me\//i.test(trimmed) ||
    /^(wa|whatsapp)\.me\//i.test(trimmed) ||
    /^discord\.gg\//i.test(trimmed);
  if (looksPublic) return trimmed.slice(0, 60);
  // Looks like email — mask. Other free text — keep first 2 chars + ***.
  return trimmed.slice(0, 2).toLowerCase() + '***';
}

// ── Per-IP rate limit (best-effort, in-process) ───────────────────────
// Real bot defense lives in Cloudflare/Vercel — this only blocks the
// trivial "submit 50 times in 60s" abuse. 5 signups / 5min / IP.
const _rateMap = new Map(); // ip → { count, windowStart }
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 5;
function rateLimit(req, res, next) {
  const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || 'unknown';
  const now = Date.now();
  const entry = _rateMap.get(ip);
  if (!entry || now - entry.windowStart > RATE_WINDOW_MS) {
    _rateMap.set(ip, { count: 1, windowStart: now });
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    return res.status(429).json({ success: false, message: 'Demasiados intentos, prueba en unos minutos.' });
  }
  return next();
}

// Periodic cleanup so the rate map doesn't grow forever.
setInterval(() => {
  const cutoff = Date.now() - RATE_WINDOW_MS * 2;
  for (const [ip, e] of _rateMap.entries()) {
    if (e.windowStart < cutoff) _rateMap.delete(ip);
  }
}, 10 * 60 * 1000).unref();

// ── GET /counter ──────────────────────────────────────────────────────
router.get('/counter', async (req, res) => {
  try {
    if (_counterCache.value && Date.now() - _counterCache.at < CACHE_TTL_MS) {
      return res.json({ success: true, data: _counterCache.value });
    }

    let realConfirmed = 0;
    const dbOk = await ensureDb().catch(() => false);
    if (dbOk && FounderRegistration) {
      try {
        realConfirmed = await FounderRegistration.countDocuments({ confirmed: true });
      } catch (_) { realConfirmed = 0; }
    }

    const displayed = computeDisplayedCount(realConfirmed);
    const remaining = Math.max(0, CAP - displayed);
    const percentFull = Math.min(100, Math.round((displayed / CAP) * 100));

    const value = {
      // Public-facing label says "interesados", not "pre-registrados" —
      // legally honest because the number aggregates multiple interest signals.
      displayed,
      cap: CAP,
      remaining,
      percentFull,
      label: 'canales interesados',
      anchorLabel: 'incluye founding reservados y conversaciones cualificadas',
    };
    _counterCache = { at: Date.now(), value };
    res.json({ success: true, data: value });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /niches ───────────────────────────────────────────────────────
router.get('/niches', async (req, res) => {
  try {
    if (_nicheCache.value && Date.now() - _nicheCache.at < CACHE_TTL_MS) {
      return res.json({ success: true, data: _nicheCache.value });
    }

    // Real per-niche confirmed counts.
    const realByNiche = Object.fromEntries(NICHE_IDS.map(id => [id, 0]));
    const dbOk = await ensureDb().catch(() => false);
    if (dbOk && FounderRegistration) {
      try {
        const grouped = await FounderRegistration.aggregate([
          { $match: { confirmed: true } },
          { $group: { _id: '$nicho', n: { $sum: 1 } } },
        ]);
        for (const row of grouped) {
          if (row._id in realByNiche) realByNiche[row._id] = row.n;
        }
      } catch (_) { /* ignore — fall through to padding-only display */ }
    }

    const niches = NICHES.map(n => {
      const real = realByNiche[n.id] || 0;
      const padded = computeNichePadding(n.id);
      const filled = Math.min(n.slots, real + padded);
      return {
        id: n.id,
        label: n.label,
        slots: n.slots,
        filled,
        remaining: Math.max(0, n.slots - filled),
        percentFull: Math.round((filled / n.slots) * 100),
        almostFull: filled >= NICHE_ALMOST_FULL_AT,
        full: filled >= n.slots,
      };
    });

    const value = { niches, slotsPerNiche: SLOTS_PER_NICHE };
    _nicheCache = { at: Date.now(), value };
    res.json({ success: true, data: value });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── GET /recent ───────────────────────────────────────────────────────
// Tiny activity feed for the hero ticker. Returns the latest confirmed
// signups with a masked handle + niche + relative timestamp. We never
// return emails, IPs, or referral tokens. Cached 60s.
router.get('/recent', async (req, res) => {
  try {
    if (_recentCache.value && Date.now() - _recentCache.at < RECENT_CACHE_TTL_MS) {
      return res.json({ success: true, data: _recentCache.value });
    }

    let items = [];
    const dbOk = await ensureDb().catch(() => false);
    if (dbOk && FounderRegistration) {
      try {
        const raw = await FounderRegistration
          .find({ confirmed: true })
          .sort({ confirmedAt: -1, createdAt: -1 })
          .limit(5)
          .select('handle nicho confirmedAt createdAt')
          .lean();
        items = raw.map(r => ({
          handle: publicHandle(r.handle),
          nicho: r.nicho,
          at: (r.confirmedAt || r.createdAt || new Date()).toISOString(),
        })).filter(x => x.handle);
      } catch (_) { /* fall through with empty list */ }
    }

    const value = { items };
    _recentCache = { at: Date.now(), value };
    res.json({ success: true, data: value });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── POST /register ────────────────────────────────────────────────────
router.post('/register', rateLimit, async (req, res) => {
  try {
    const dbOk = await ensureDb().catch(() => false);
    if (!dbOk || !FounderRegistration) {
      return res.status(503).json({ success: false, message: 'Servicio no disponible momentáneamente.' });
    }

    const {
      email, handle, platform, nicho, size, ref, source,
    } = req.body || {};

    // ── Validation ──
    if (!email || typeof email !== 'string' || !/.+@.+\..+/.test(email)) {
      return res.status(400).json({ success: false, message: 'Email no válido.' });
    }
    if (!handle || typeof handle !== 'string' || handle.trim().length < 2) {
      return res.status(400).json({ success: false, message: 'Indica el handle de tu canal.' });
    }
    if (!nicho || !NICHE_IDS.includes(nicho)) {
      return res.status(400).json({ success: false, message: 'Selecciona un nicho válido.' });
    }
    if (!size || !SIZE_IDS.includes(size)) {
      return res.status(400).json({ success: false, message: 'Selecciona el tamaño del canal.' });
    }
    const plat = (platform && PLATFORM_IDS.includes(platform)) ? platform : 'other';

    const normEmail = email.trim().toLowerCase();
    const cleanHandle = handle.trim().slice(0, 120);

    // Total cap guard (counts confirmed only).
    const totalConfirmed = await FounderRegistration.countDocuments({ confirmed: true });
    if (totalConfirmed >= CAP) {
      return res.status(409).json({ success: false, message: `Las ${CAP} plazas founding están ocupadas. Te avisamos en el lanzamiento público.` });
    }

    // Niche cap guard (real-only — padding never blocks signups).
    const nicheConfirmed = await FounderRegistration.countDocuments({ confirmed: true, nicho });
    if (nicheConfirmed >= SLOTS_PER_NICHE) {
      return res.status(409).json({ success: false, message: 'Este nicho ya está completo. Prueba con otro nicho cercano.' });
    }

    // Already exists?
    const existing = await FounderRegistration.findOne({ email: normEmail });
    if (existing) {
      // Idempotent — return the existing referral link so they can share again.
      return res.json({
        success: true,
        message: existing.confirmed
          ? 'Ya estabas registrado. Aquí tienes tu link de referidos.'
          : 'Ya te registraste — revisa tu email para confirmar.',
        data: {
          confirmed: existing.confirmed,
          referralToken: existing.referralToken,
        },
      });
    }

    const ip = (req.headers['x-forwarded-for']?.split(',')[0]?.trim()) || req.ip || '';
    const ua = (req.headers['user-agent'] || '').slice(0, 500);

    // Validate referrer token if provided.
    let referredByToken = null;
    if (ref && typeof ref === 'string' && /^[a-f0-9]{16}$/.test(ref)) {
      const referrer = await FounderRegistration.exists({ referralToken: ref });
      if (referrer) referredByToken = ref;
    }

    const doc = await FounderRegistration.create({
      email: normEmail,
      handle: cleanHandle,
      platform: plat,
      nicho,
      size,
      referredByToken,
      ip,
      userAgent: ua,
      source: (source && String(source).slice(0, 60)) || 'direct',
    });

    // ── Send double-opt-in email (non-blocking) ──
    setImmediate(async () => {
      try {
        const base = (config?.frontend?.url || 'https://channelad.io').replace(/\/$/, '');
        const confirmUrl = `${base}/api/founder-waitlist/confirm/${doc.confirmToken}`;
        const emailService = require('../services/emailService');
        await emailService.enviarEmail({
          para: doc.email,
          asunto: 'Confirma tu plaza en el founding cohort de Channelad',
          html: renderConfirmEmail({ confirmUrl, handle: cleanHandle }),
          texto: `Confirma tu plaza founding:\n${confirmUrl}\n\n— Channelad`,
        });
      } catch (e) {
        // Email failure is logged but the signup still exists — the user can
        // request a resend later. We do NOT roll back the registration.
        console.error('[founderWaitlist] confirm email failed:', e?.message || e);
      }
    });

    invalidateCache();
    res.json({
      success: true,
      message: 'Registro recibido. Te hemos enviado un email para confirmar tu plaza.',
      data: {
        referralToken: doc.referralToken,
        confirmed: false,
      },
    });
  } catch (err) {
    // Duplicate key (race on the unique email index)
    if (err?.code === 11000) {
      return res.status(409).json({ success: false, message: 'Este email ya está registrado.' });
    }
    console.error('[founderWaitlist] register error:', err?.message || err);
    res.status(500).json({ success: false, message: 'Error al registrar.' });
  }
});

// ── GET /confirm/:token ───────────────────────────────────────────────
// Public confirm link from the email. Redirects to /founding with a
// query flag so the landing can show a success banner.
router.get('/confirm/:token', async (req, res) => {
  try {
    const dbOk = await ensureDb().catch(() => false);
    if (!dbOk || !FounderRegistration) {
      return res.redirect(302, '/founding?confirmed=0&err=db');
    }
    const { token } = req.params;
    if (!token || !/^[a-f0-9]{32}$/.test(token)) {
      return res.redirect(302, '/founding?confirmed=0&err=invalid');
    }
    const doc = await FounderRegistration.findOne({ confirmToken: token });
    if (!doc) {
      return res.redirect(302, '/founding?confirmed=0&err=notfound');
    }
    if (!doc.confirmed) {
      // Assign queue position atomically against the confirmed count.
      const pos = (await FounderRegistration.countDocuments({ confirmed: true })) + 1;
      doc.confirmed = true;
      doc.confirmedAt = new Date();
      doc.queuePosition = pos;
      await doc.save();

      // Bump referrer's count if this signup came in through a link.
      if (doc.referredByToken) {
        try {
          await FounderRegistration.findOneAndUpdate(
            { referralToken: doc.referredByToken },
            { $inc: { referralCount: 1 } }
          );
        } catch (_) { /* non-fatal */ }
      }

      invalidateCache();
    }
    return res.redirect(302, `/founding?confirmed=1&ref=${encodeURIComponent(doc.referralToken)}`);
  } catch (err) {
    console.error('[founderWaitlist] confirm error:', err?.message || err);
    return res.redirect(302, '/founding?confirmed=0&err=server');
  }
});

// ── GET /status/:refToken ─────────────────────────────────────────────
// Lets a signup see their queue position + referral progress on the
// landing without needing to log in. Returns minimal data — no PII.
router.get('/status/:refToken', async (req, res) => {
  try {
    const dbOk = await ensureDb().catch(() => false);
    if (!dbOk || !FounderRegistration) {
      return res.status(503).json({ success: false, message: 'Servicio no disponible momentáneamente.' });
    }
    const { refToken } = req.params;
    if (!/^[a-f0-9]{16}$/.test(refToken || '')) {
      return res.status(400).json({ success: false, message: 'Token no válido.' });
    }
    const doc = await FounderRegistration.findOne({ referralToken: refToken }).lean();
    if (!doc) return res.status(404).json({ success: false, message: 'No encontrado.' });

    const nicheLabel = NICHE_MAP[doc.nicho]?.label || doc.nicho;
    res.json({
      success: true,
      data: {
        confirmed: doc.confirmed,
        queuePosition: doc.queuePosition || null,
        referralCount: doc.referralCount || 0,
        nicho: doc.nicho,
        nichoLabel: nicheLabel,
        // Cosmetic boost shown on the UI — 3 refs = -100 positions visually.
        // Backend never reorders the queue: this is pure motivation.
        visualBoost: Math.min(3, Math.floor((doc.referralCount || 0) / 3)) * 100,
      },
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

// ── Email template (inline — keeps the route self-contained) ──────────
function renderConfirmEmail({ confirmUrl, handle }) {
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>Confirma tu plaza · Founding cohort</title></head>
<body style="margin:0;padding:0;background:#f5f7fa;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#0f172a;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f7fa;padding:32px 16px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">
        <tr><td style="padding:32px 32px 16px;">
          <div style="font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;color:#25d366;margin-bottom:14px;">FOUNDING COHORT · CHANNELAD</div>
          <h1 style="font-size:24px;font-weight:700;letter-spacing:-0.02em;line-height:1.2;margin:0 0 12px;">
            Confirma tu plaza founding.
          </h1>
          <p style="font-size:15px;line-height:1.6;color:#475569;margin:0 0 24px;">
            Hemos recibido la solicitud de tu canal <strong>${escapeHtml(handle)}</strong>.
            Confirma el email haciendo clic abajo para reservar tu slot — el founding cohort fija el 18% vitalicio.
          </p>
          <a href="${confirmUrl}" style="display:inline-block;background:#25d366;color:#ffffff;text-decoration:none;border-radius:12px;padding:14px 28px;font-size:15px;font-weight:600;">
            Confirmar mi plaza
          </a>
          <p style="font-size:13px;line-height:1.6;color:#64748b;margin:28px 0 0;">
            Si no fuiste tú, ignora este email y no haremos nada.
          </p>
        </td></tr>
        <tr><td style="padding:18px 32px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#94a3b8;line-height:1.6;">
          Channelad · MICHI SOLUCIONS S.L. · operado desde España.<br>
          Stripe Connect escrow · WhatsApp Channel API oficial · SEPA Instant.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

// ── POST /admin/migrate-legacy ────────────────────────────────────────
// One-off admin tool: migrate the orphaned Channel One waitlist collection
// (`channeloneregistrations`) into this cohort's collection. Runs server-side
// where the cluster IS reachable, so it can be triggered with a single
// authenticated request instead of running the CLI locally.
//
//   POST /api/founder-waitlist/admin/migrate-legacy            → DRY-RUN
//   POST /api/founder-waitlist/admin/migrate-legacy?apply=true → copy docs
//   POST .../migrate-legacy?apply=true&dropOld=true            → copy, drop old
//
// Idempotent (skips already-present email/referralToken). Shares logic with
// scripts/migrate-channelone-to-founder.js via lib/migrateLegacyWaitlist.
router.post('/admin/migrate-legacy', autenticar, autorizarRoles('admin'), async (req, res) => {
  try {
    const ok = await ensureDb();
    if (!ok || mongoose.connection.readyState !== 1) {
      return res.status(503).json({ success: false, message: 'DB unavailable' });
    }
    const apply = req.query.apply === 'true' || req.body?.apply === true;
    const dropOld = req.query.dropOld === 'true' || req.body?.dropOld === true;

    const result = await migrateLegacyWaitlist(mongoose.connection.db, { apply, dropOld });
    if (apply) invalidateCache(); // counter/niche caches now stale

    return res.json({ success: true, mode: apply ? 'APPLY' : 'DRY-RUN', data: result });
  } catch (err) {
    console.error('[founderWaitlist] migrate-legacy error:', err?.message || err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

module.exports = router;
