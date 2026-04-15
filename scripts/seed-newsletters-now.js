/**
 * Ad-hoc runner for newsletter massive seed. Runs the pipeline INLINE
 * (blocks until done) so it can be launched from CLI and watched via logs.
 *
 * Usage:
 *   node scripts/seed-newsletters-now.js
 *
 * Options (env vars):
 *   SEED_SKIP_OHMYNEWST=1  → skip ohmynewst scraping (editorial seeds only)
 *   SEED_SKIP_EDITORIAL=1  → skip editorial seeds (ohmynewst only)
 *   SEED_ENRICH_CAP=150    → cap on Substack enrichments (default 200)
 *   SEED_DETAIL_FETCHES=60 → ohmynewst detail-page follows (default 80)
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  const start = Date.now();
  try {
    console.log('[newsletter-seed] Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[newsletter-seed] Connected. Starting newsletter discovery inline.\n');

    const { batchDiscoverNewsletters } = require('../services/newsletter/newsletterDiscoveryService');

    const options = {
      skipOhmynewst: process.env.SEED_SKIP_OHMYNEWST === '1',
      skipEditorial: process.env.SEED_SKIP_EDITORIAL === '1',
      enrichCap: Number(process.env.SEED_ENRICH_CAP) || 200,
      maxDetailFetches: Number(process.env.SEED_DETAIL_FETCHES) || 80,
    };

    console.log('[newsletter-seed] Options:', JSON.stringify(options));
    console.log('');

    const result = await batchDiscoverNewsletters(options);

    console.log('\n[newsletter-seed] ==== FINAL RESULT ====');
    console.log(JSON.stringify(result, null, 2));

    // ── Verify by querying DB ─────────────────────────────────────────
    const Canal = require('../models/Canal');
    const ChannelCandidate = require('../models/ChannelCandidate');

    const [
      newsletterCanals,
      newsletterCandidates,
      bySourceAgg,
      byCategoriaAgg,
      byProviderAgg,
    ] = await Promise.all([
      Canal.countDocuments({ plataforma: 'newsletter' }),
      ChannelCandidate.countDocuments({ plataforma: 'newsletter' }),
      ChannelCandidate.aggregate([
        { $match: { plataforma: 'newsletter' } },
        { $group: { _id: '$source', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Canal.aggregate([
        { $match: { plataforma: 'newsletter' } },
        { $group: { _id: '$categoria', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
      Canal.aggregate([
        { $match: { plataforma: 'newsletter' } },
        { $group: { _id: '$identificadores.provider', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),
    ]);

    console.log('\n[newsletter-seed] DB STATE AFTER RUN');
    console.log(`  Canal (plataforma=newsletter): ${newsletterCanals}`);
    console.log(`  ChannelCandidate (plataforma=newsletter): ${newsletterCandidates}`);

    console.log('\n[newsletter-seed] Candidates by source:');
    bySourceAgg.forEach((r) => console.log(`  ${r._id}: ${r.count}`));

    console.log('\n[newsletter-seed] Canals by categoria:');
    byCategoriaAgg.forEach((r) => console.log(`  ${r._id || '(empty)'}: ${r.count}`));

    console.log('\n[newsletter-seed] Canals by provider:');
    byProviderAgg.forEach((r) => console.log(`  ${r._id || '(empty)'}: ${r.count}`));

    // ── Sample 5 newsletters to visually verify classification ────────
    console.log('\n[newsletter-seed] Sample classification check:');
    const samples = await Canal.find({ plataforma: 'newsletter' })
      .sort({ 'estadisticas.seguidores': -1 })
      .limit(5)
      .select('nombreCanal categoria tags identificadores.provider estadisticas.seguidores idioma descripcion')
      .lean();

    samples.forEach((c, i) => {
      console.log(`\n  [${i + 1}] ${c.nombreCanal}`);
      console.log(`      categoria: ${c.categoria}`);
      console.log(`      provider:  ${c.identificadores?.provider || '(none)'}`);
      console.log(`      idioma:    ${c.idioma}`);
      console.log(`      subs:      ${c.estadisticas?.seguidores || 0}`);
      console.log(`      tags:      ${(c.tags || []).join(', ') || '(none)'}`);
      console.log(
        `      desc:      ${(c.descripcion || '').slice(0, 120)}${(c.descripcion || '').length > 120 ? '…' : ''}`,
      );
    });
  } catch (err) {
    console.error('\n[newsletter-seed] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log(
      '\n[newsletter-seed] Done. Total runtime:',
      ((Date.now() - start) / 1000).toFixed(1),
      's',
    );
    process.exit(0);
  }
})();
