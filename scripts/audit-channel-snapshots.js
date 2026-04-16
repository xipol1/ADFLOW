/**
 * Audit: which canales have CanalScoreSnapshot data and which don't?
 *
 * Suspected bug: the daily cron /api/admin/scoring/run calls runScoringBatch
 * with batchSize=25 and does not paginate. With 141 active canales, only the
 * first 25 by _id get daily snapshots — the rest show "Acumulando datos"
 * indefinitely in the Evolución chart.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    const Canal = require('../models/Canal');
    const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');
    const ScoringCronLog = require('../models/ScoringCronLog');

    // ── Overall counts ─────────────────────────────────────────────
    const totalCanales = await Canal.countDocuments({
      plataforma: 'telegram',
      estado: { $in: ['activo', 'verificado'] },
    });
    const totalSnapshots = await CanalScoreSnapshot.countDocuments();
    console.log('=== OVERALL ===');
    console.log('Active telegram canales:', totalCanales);
    console.log('Total CanalScoreSnapshot docs:', totalSnapshots);

    // ── Snapshots in last 30 days ──────────────────────────────────
    const since30d = new Date(Date.now() - 30 * 24 * 3600 * 1000);
    const since7d = new Date(Date.now() - 7 * 24 * 3600 * 1000);
    const since1d = new Date(Date.now() - 24 * 3600 * 1000);

    const snap30 = await CanalScoreSnapshot.countDocuments({ fecha: { $gte: since30d } });
    const snap7 = await CanalScoreSnapshot.countDocuments({ fecha: { $gte: since7d } });
    const snap1 = await CanalScoreSnapshot.countDocuments({ fecha: { $gte: since1d } });
    console.log('\n=== SNAPSHOTS BY WINDOW ===');
    console.log('Last 1 day:  ', snap1);
    console.log('Last 7 days: ', snap7);
    console.log('Last 30 days:', snap30);

    // ── Distinct canales with snapshots in each window ────────────
    const distinct30 = await CanalScoreSnapshot.distinct('canalId', { fecha: { $gte: since30d } });
    const distinct7 = await CanalScoreSnapshot.distinct('canalId', { fecha: { $gte: since7d } });
    const distinct1 = await CanalScoreSnapshot.distinct('canalId', { fecha: { $gte: since1d } });
    console.log('\n=== DISTINCT CANALES WITH SNAPSHOTS ===');
    console.log(`Last 1 day:   ${distinct1.length} / ${totalCanales} canales`);
    console.log(`Last 7 days:  ${distinct7.length} / ${totalCanales} canales`);
    console.log(`Last 30 days: ${distinct30.length} / ${totalCanales} canales`);

    // ── Most recent snapshot date + oldest ─────────────────────────
    const newest = await CanalScoreSnapshot.findOne().sort({ fecha: -1 }).lean();
    const oldest = await CanalScoreSnapshot.findOne().sort({ fecha: 1 }).lean();
    console.log('\n=== SNAPSHOT AGE ===');
    console.log('Newest:', newest?.fecha?.toISOString() || 'none');
    console.log('Oldest:', oldest?.fecha?.toISOString() || 'none');

    // ── Distribution: snapshots per canal in last 30d ──────────────
    const perCanal = await CanalScoreSnapshot.aggregate([
      { $match: { fecha: { $gte: since30d } } },
      { $group: { _id: '$canalId', count: { $sum: 1 }, lastFecha: { $max: '$fecha' } } },
      { $sort: { count: -1 } },
    ]);

    // How many canales have >= 2 snapshots (required for the chart to render)
    const withAtLeast2 = perCanal.filter((p) => p.count >= 2).length;
    const withOnly1 = perCanal.filter((p) => p.count === 1).length;
    const with0 = totalCanales - perCanal.length;
    console.log('\n=== CHART READINESS ===');
    console.log(`Canales with >= 2 snapshots (chart renders): ${withAtLeast2}`);
    console.log(`Canales with exactly 1 snapshot:              ${withOnly1}`);
    console.log(`Canales with 0 snapshots (Acumulando datos):  ${with0}`);

    // ── Sample: top 5 canales by snapshot count ────────────────────
    if (perCanal.length > 0) {
      console.log('\nTop 5 canales by snapshot count (last 30d):');
      for (const p of perCanal.slice(0, 5)) {
        const canal = await Canal.findById(p._id).select('identificadorCanal nombreCanal').lean();
        console.log(
          `  @${canal?.identificadorCanal || '?'} | ${p.count} snaps | last: ${p.lastFecha.toISOString()}`,
        );
      }
      console.log('\nBottom 5 canales by snapshot count (last 30d):');
      for (const p of perCanal.slice(-5)) {
        const canal = await Canal.findById(p._id).select('identificadorCanal nombreCanal').lean();
        console.log(
          `  @${canal?.identificadorCanal || '?'} | ${p.count} snaps | last: ${p.lastFecha.toISOString()}`,
        );
      }
    }

    // ── Canales with NO snapshots (first 10 by _id) ────────────────
    const canalesConSnaps = new Set(perCanal.map((p) => String(p._id)));
    const canalesSinSnaps = await Canal.find({
      plataforma: 'telegram',
      estado: { $in: ['activo', 'verificado'] },
    })
      .sort({ _id: 1 })
      .limit(500)
      .select('_id identificadorCanal estadisticas.seguidores')
      .lean();

    const missing = canalesSinSnaps.filter((c) => !canalesConSnaps.has(String(c._id)));
    console.log(`\n=== CANALES WITH 0 SNAPSHOTS (first 10 of ${missing.length}) ===`);
    missing.slice(0, 10).forEach((c, i) => {
      console.log(
        `  ${String(i + 1).padStart(2)}. @${(c.identificadorCanal || '').padEnd(25)} _id=${c._id} subs=${c.estadisticas?.seguidores || 0}`,
      );
    });

    // ── Scoring cron log: what's been running? ─────────────────────
    const lastCronRuns = await ScoringCronLog.find({ trigger: 'scheduled' })
      .sort({ fechaInicio: -1 })
      .limit(5)
      .lean();
    console.log('\n=== LAST 5 SCHEDULED SCORING CRON RUNS ===');
    if (lastCronRuns.length === 0) {
      console.log('(no scheduled runs found in ScoringCronLog)');
    } else {
      for (const r of lastCronRuns) {
        const dur = r.duracionMs || 0;
        console.log(
          `  ${r.fechaInicio.toISOString()} | ${r.canalesProcesados || 0} processed | ${r.canalesActualizados || 0} updated | ${r.errores || 0} errors | ${dur}ms`,
        );
      }
    }

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('ERROR:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
})();
