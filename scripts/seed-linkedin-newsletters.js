/**
 * Seed the LinkedIn editorial newsletter list into the Canal catalog.
 *
 * Reuses the same pipeline as scripts/seed-newsletters-now.js but
 * restricts the sources to LinkedIn only, so the run is fast (<10s)
 * and safe to execute standalone without touching the Substack/ohmynewst
 * paths.
 *
 * Usage:
 *   node scripts/seed-linkedin-newsletters.js
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

(async () => {
  const start = Date.now();
  try {
    console.log('[linkedin-newsletter-seed] Connecting to Mongo...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[linkedin-newsletter-seed] Connected. Starting LinkedIn-only discovery.\n');

    const { batchDiscoverNewsletters } = require('../services/newsletter/newsletterDiscoveryService');

    const result = await batchDiscoverNewsletters({
      // Skip the expensive sources — only LinkedIn seeds
      skipOhmynewst: true,
      skipEditorial: true,
      skipLinkedin: false,
      enrichCap: 100,
    });

    console.log('\n[linkedin-newsletter-seed] ==== RESULT ====');
    console.log(JSON.stringify(result, null, 2));

    // Verify what ended up in DB
    const Canal = require('../models/Canal');
    const ChannelCandidate = require('../models/ChannelCandidate');

    const [canals, candidates, samples] = await Promise.all([
      Canal.countDocuments({
        plataforma: 'newsletter',
        'identificadores.provider': 'linkedin',
      }),
      ChannelCandidate.countDocuments({
        plataforma: 'newsletter',
        source: 'linkedin_newsletters',
      }),
      Canal.find({
        plataforma: 'newsletter',
        'identificadores.provider': 'linkedin',
      })
        .select('nombreCanal categoria tags idioma descripcion crawler.urlPublica')
        .limit(20)
        .lean(),
    ]);

    console.log(`\n[linkedin-newsletter-seed] DB STATE`);
    console.log(`  Canal (newsletter + linkedin provider): ${canals}`);
    console.log(`  ChannelCandidate (linkedin_newsletters source): ${candidates}`);

    console.log('\n[linkedin-newsletter-seed] All LinkedIn newsletters in catalog:');
    samples.forEach((c, i) => {
      console.log(`  [${String(i + 1).padStart(2)}] ${c.nombreCanal}`);
      console.log(`      categoria: ${c.categoria} | idioma: ${c.idioma}`);
      console.log(`      tags: ${(c.tags || []).slice(0, 4).join(', ') || '(none)'}`);
      console.log(`      url: ${(c.crawler?.urlPublica || '').slice(0, 80)}`);
    });
  } catch (err) {
    console.error('\n[linkedin-newsletter-seed] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log(
      '\n[linkedin-newsletter-seed] Done. Total runtime:',
      ((Date.now() - start) / 1000).toFixed(1),
      's',
    );
    process.exit(0);
  }
})();
