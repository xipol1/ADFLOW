/**
 * validate-whatsapp-intel.js — smoke test del flow WhatsApp Intel.
 *
 * Lo que valida (sin requerir una sesión Baileys real conectada):
 *   T1) Carga de módulos sin error                                         ✓
 *   T2) computeMetrics con data sintética → math correcta
 *   T3) syncAllConnectedCanales con 0 sesiones connected → processed:0
 *   T4) getChannelMetrics(canalId WA sin sessionId) → unscrapable+reason
 *   T5) syncCanalIntel(canalId WA sin sessionId) → status:'unscrapable',
 *        NO crea snapshot, NO escribe scoring spurious
 *   T6) HTTP endpoint /api/jobs/whatsapp-intel sin auth → 401
 *   T7) HTTP endpoint /api/jobs/whatsapp-intel con auth correcta → 200
 *
 * Lo que NO valida (necesita sesión real):
 *   - fetchNewsletterMessages devuelve mensajes reales
 *   - Cálculo de engagement sobre data WA real
 *   - Hook fire-and-forget tras linkNewsletterToCanal
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const assert = require('node:assert');

const Canal = require('../models/Canal');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
const BaileysSession = require('../models/BaileysSession');
const intel = require('../services/whatsappIntelService');

let pass = 0, fail = 0;
function check(name, condition, detail = '') {
  if (condition) { console.log(`  ✓ ${name}`); pass++; }
  else { console.error(`  ✗ ${name}${detail ? ' — ' + detail : ''}`); fail++; }
}
function section(t) { console.log(`\n══ ${t} ══`); }

(async () => {
  if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI missing'); process.exit(1); }
  if (!process.env.CRON_SECRET) {
    console.warn('⚠ CRON_SECRET no en env — T6/T7 se saltan');
  }

  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Mongo conectado');

  // ── T2: computeMetrics ─────────────────────────────────────────────────
  section('T2: computeMetrics — math correcta sobre data sintética');
  const synthetic = [
    { id: '1', timestamp: new Date('2026-05-12T10:00:00Z'), reactions: [{ emoji: '👍', count: 10 }, { emoji: '❤️', count: 5 }], viewCount: 200 },
    { id: '2', timestamp: new Date('2026-05-11T10:00:00Z'), reactions: [{ emoji: '👍', count: 20 }], viewCount: 300 },
    { id: '3', timestamp: new Date('2026-05-10T10:00:00Z'), reactions: [{ emoji: '👍', count: 30 }], viewCount: 400 },
    { id: '4', timestamp: new Date('2026-05-09T10:00:00Z'), reactions: [], viewCount: 100 },
  ];
  const m = intel.computeMetrics(synthetic);
  check('message_count = 4', m.message_count === 4, `got ${m.message_count}`);
  check('avg_reactions = round((15+20+30+0)/4) = 16', m.avg_reactions === 16, `got ${m.avg_reactions}`);
  check('avg_views = round((200+300+400+100)/4) = 250', m.avg_views === 250, `got ${m.avg_views}`);
  check('post_frequency_per_week > 0', (m.post_frequency_per_week || 0) > 0, `got ${m.post_frequency_per_week}`);
  check('last_post_date is the newest', m.last_post_date?.toISOString() === '2026-05-12T10:00:00.000Z', `got ${m.last_post_date?.toISOString()}`);
  check('reactions_trend = null (<20 messages)', m.reactions_trend === null, `got ${m.reactions_trend}`);

  // ── T3: syncAllConnectedCanales con 0 conectadas ───────────────────────
  section('T3: syncAllConnectedCanales con 0 sesiones connected');
  const connectedCount = await BaileysSession.countDocuments({ status: 'connected' });
  console.log(`  (estado pre-test: ${connectedCount} BaileysSession con status='connected')`);
  const r3 = await intel.syncAllConnectedCanales();
  check('processed=0 cuando no hay sesiones', connectedCount > 0 || r3.processed === 0, `processed=${r3.processed}, errors=${r3.errors.length}`);
  check('duration_ms > 0', r3.duration_ms > 0);
  check('errors array', Array.isArray(r3.errors));

  // ── T4: getChannelMetrics sobre canal WA sin baileysSessionId ──────────
  section('T4: getChannelMetrics(canal WA sin session linkeada)');
  const canalSinSession = await Canal.findOne({
    plataforma: 'whatsapp',
    $or: [
      { 'botConfig.whatsapp.baileysSessionId': { $exists: false } },
      { 'botConfig.whatsapp.baileysSessionId': null },
      { 'botConfig.whatsapp.baileysSessionId': '' },
    ],
    'crawler.urlPublica': { $regex: /^https:\/\/whatsapp\.com\/channel\// },
  }).lean();

  if (!canalSinSession) {
    console.log('  ⊘ skipped — no hay canal WA sin baileysSessionId en DB');
  } else {
    console.log(`  (target: ${canalSinSession.nombreCanal}, _id=${canalSinSession._id})`);
    const r4 = await intel.getChannelMetrics(canalSinSession._id);
    check('unscrapable=true', r4.unscrapable === true);
    check('reason="no_baileys_session_linked"', r4.reason === 'no_baileys_session_linked', `got "${r4.reason}"`);
    check('participants_count se preserva del canal', typeof r4.participants_count === 'number');
    check('verified se preserva del canal', typeof r4.verified === 'boolean');
  }

  // ── T5: syncCanalIntel sobre canal WA sin session — no crea snapshot ──
  section('T5: syncCanalIntel(canal WA sin session) — no crea snapshot');
  if (!canalSinSession) {
    console.log('  ⊘ skipped — no hay canal WA candidato');
  } else {
    const snapsBefore = await CanalScoreSnapshot.countDocuments({ canalId: canalSinSession._id });
    const r5 = await intel.syncCanalIntel(canalSinSession._id);
    const snapsAfter = await CanalScoreSnapshot.countDocuments({ canalId: canalSinSession._id });
    check('status="unscrapable"', r5.status === 'unscrapable', `got "${r5.status}"`);
    check('reason matches', r5.reason === 'no_baileys_session_linked', `got "${r5.reason}"`);
    check('snapshot count no cambió (no creó snapshot basura)', snapsBefore === snapsAfter, `${snapsBefore} → ${snapsAfter}`);
  }

  // ── T6/T7: HTTP endpoint ────────────────────────────────────────────────
  if (process.env.CRON_SECRET) {
    section('T6/T7: HTTP /api/jobs/whatsapp-intel');
    let supertest;
    try { supertest = require('supertest'); } catch (_) { console.log('  ⊘ supertest no disponible'); }
    if (supertest) {
      const app = require('../app');

      const noAuth = await supertest(app).get('/api/jobs/whatsapp-intel');
      check('sin auth → 401', noAuth.status === 401, `got ${noAuth.status}`);

      const badAuth = await supertest(app).get('/api/jobs/whatsapp-intel').set('Authorization', 'Bearer WRONG');
      check('auth incorrecto → 401', badAuth.status === 401, `got ${badAuth.status}`);

      const okAuth = await supertest(app).get('/api/jobs/whatsapp-intel').set('Authorization', `Bearer ${process.env.CRON_SECRET}`);
      check('auth correcto → 200', okAuth.status === 200, `got ${okAuth.status} body=${JSON.stringify(okAuth.body).slice(0, 200)}`);
      check('body.success=true', okAuth.body?.success === true);
      check('body.processed es número', typeof okAuth.body?.processed === 'number');
      check('body.duration_ms es número', typeof okAuth.body?.duration_ms === 'number');
    }
  }

  // ── Resumen ─────────────────────────────────────────────────────────────
  console.log(`\n═══ TOTAL: ${pass} pass, ${fail} fail ═══`);
  await mongoose.disconnect();
  process.exit(fail > 0 ? 1 : 0);
})().catch((e) => {
  console.error('💥 Fatal:', e.message);
  console.error(e.stack);
  process.exit(2);
});
