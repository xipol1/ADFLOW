/**
 * Unified scraper runner — discovers channels across ALL platforms.
 *
 * Phase A: HTTP directory scrapers (fast, no API keys needed)
 *   - Disboard        → Discord
 *   - WaChannelsFinder → WhatsApp
 *   - CheetahGroups   → WhatsApp
 *   - iGrupos         → WhatsApp + Discord + Telegram
 *   - XTEA            → Telegram
 *   - TDirectory      → Telegram
 *   - TelegramCryptoGroups → Telegram
 *
 * Phase B: Telegram MTProto massive seed (keywords + lyzem + social graph)
 *
 * Phase C: Newsletter discovery (Substack, ohmynewst, editorial, LinkedIn)
 *
 * Usage:
 *   node scripts/run-all-scrapers-now.js                # all phases
 *   node scripts/run-all-scrapers-now.js --skip-mtproto # skip Telegram MTProto
 *   node scripts/run-all-scrapers-now.js --only-dirs    # only directory scrapers
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const SKIP_MTPROTO = args.includes('--skip-mtproto');
const ONLY_DIRS = args.includes('--only-dirs');

(async () => {
  const globalStart = Date.now();
  const summary = { phases: {}, totalNew: 0, totalDupes: 0, errors: [] };

  try {
    console.log('[AllScrapers] Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('[AllScrapers] Connected.\n');

    const ChannelCandidate = require('../models/ChannelCandidate');

    /**
     * Map raw category/tag strings from each source to a canonical taxonomy.
     * Anything not matched falls through to the original raw value (lowercased).
     */
    const CATEGORY_MAP = {
      // Finance / crypto
      crypto: 'cripto',
      cryptocurrency: 'cripto',
      criptomonedas: 'cripto',
      cripto_global: 'cripto',
      finance: 'finanzas',
      finanzas: 'finanzas',
      finanzas_global: 'finanzas',
      trading: 'trading',
      inversiones: 'finanzas',
      // Business / marketing
      business: 'negocios',
      negocios: 'negocios',
      marketing: 'marketing',
      marketing_global: 'marketing',
      ecommerce: 'ecommerce',
      emprendimiento: 'negocios',
      // Tech
      technology: 'tecnologia',
      tecnologia: 'tecnologia',
      tech: 'tecnologia',
      programming: 'tecnologia',
      programacion: 'tecnologia',
      // Education / news
      education: 'educacion',
      educacion: 'educacion',
      news: 'noticias',
      noticias: 'noticias',
      // Lifestyle
      entertainment: 'entretenimiento',
      entretenimiento: 'entretenimiento',
      gaming: 'gaming',
      sports: 'deportes',
      deportes: 'deportes',
      health: 'salud',
      salud: 'salud',
      community: 'comunidad',
      comunidad: 'comunidad',
      // Spanish-language tags from TopGg
      spanish: 'comunidad',
      'español': 'comunidad',
    };

    function normalizeCategory(raw) {
      if (!raw) return '';
      const key = String(raw).toLowerCase().trim();
      return CATEGORY_MAP[key] || key;
    }

    /**
     * Detect probable language from name + description heuristics.
     * Falls back to 'unknown'. Cheap pre-filter — admin review still authoritative.
     */
    function detectLanguage(text) {
      if (!text) return 'unknown';
      const lower = text.toLowerCase();
      // Spanish markers
      if (/\b(de|para|el|la|los|las|que|del|por|una?|y|con|en|señal|cripto|trading|negocio|inversión|inversiones|empresa|noticias|comunidad|grupo|canal)\b/.test(lower)) {
        return 'es';
      }
      // English markers
      if (/\b(the|and|for|with|of|in|to|news|community|free|join|trading|signals?|business|crypto)\b/.test(lower)) {
        return 'en';
      }
      return 'unknown';
    }

    /**
     * Upsert discovered channels into ChannelCandidate.
     * Returns { saved, dupes, errors }.
     */
    async function saveDiscoveries(channels, plataforma, source) {
      let saved = 0;
      let dupes = 0;
      const errs = [];

      for (const ch of channels) {
        const username = buildUsername(ch, plataforma);
        if (!username) continue;

        try {
          const exists = await ChannelCandidate.findOne({ username }).lean();
          if (exists) {
            dupes++;
            continue;
          }

          const title = ch.name || ch.title || '';
          const description = ch.description || '';
          const rawCategory = ch.category || ch._tag || '';
          const language = detectLanguage(`${title} ${description}`);

          await ChannelCandidate.create({
            username,
            plataforma,
            source,
            status: 'pending_review',
            scraped_at: new Date(),
            raw_metrics: {
              title,
              description,
              subscribers: ch.members || ch.followers || ch.subscribers || 0,
              category: normalizeCategory(rawCategory),
              raw_category: rawCategory,
              language,
              discoveredVia: source,
              source_platform: plataforma,
              scraped_run_at: new Date().toISOString(),
              ...(Array.isArray(ch.tags) && ch.tags.length > 0 && { tags: ch.tags }),
              ...(ch.kind && { kind: ch.kind }),
              ...(ch.votes != null && { votes: ch.votes }),
              ...(ch.inviteLink && { inviteLink: ch.inviteLink }),
              ...(ch.sourceUrl && { sourceUrl: ch.sourceUrl }),
              ...(ch.serverId && { serverId: ch.serverId }),
              ...(ch.channelCode && { channelCode: ch.channelCode }),
              ...(ch.slug && { slug: ch.slug }),
              ...(ch.igruposId && { igruposId: ch.igruposId }),
              ...(ch.country && { country: ch.country }),
            },
          });
          saved++;
        } catch (err) {
          if (err.code === 11000) {
            dupes++;
          } else {
            errs.push(`${source}/${username}: ${err.message}`);
          }
        }
      }

      return { saved, dupes, errors: errs };
    }

    function buildUsername(ch, plataforma) {
      if (plataforma === 'discord') {
        return ch.serverId
          ? `dc:${ch.serverId}`
          : ch.name
            ? `dc:${ch.name.toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 60)}`
            : null;
      }
      if (plataforma === 'whatsapp') {
        return ch.channelCode
          ? `wa:${ch.channelCode}`
          : ch.slug
            ? `wa:${ch.slug}`
            : ch.name
              ? `wa:${ch.name.toLowerCase().replace(/[^a-z0-9áéíóúñ-]/g, '-').slice(0, 60)}`
              : null;
      }
      // Telegram
      return ch.username || null;
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE A: HTTP Directory Scrapers
    // ═══════════════════════════════════════════════════════════════════
    console.log('═══════════════════════════════════════════════════════');
    console.log('  PHASE A: Directory Scrapers (HTTP)');
    console.log('═══════════════════════════════════════════════════════\n');

    const scraperConfigs = [
      {
        name: 'TopGg',
        load: () => require('../services/scrapers/topGgScraperService'),
        run: (svc) => svc.scrapeAll(),
        plataforma: 'discord',
        source: 'top_gg',
      },
      {
        name: 'WaChannelsFinder',
        load: () => require('../services/scrapers/wachannelsfinderScraperService'),
        run: (svc) => svc.scrapeAll(),
        plataforma: 'whatsapp',
        source: 'wachannelsfinder',
      },
      {
        name: 'CheetahGroups',
        load: () => require('../services/scrapers/cheetahGroupsScraperService'),
        run: (svc) => svc.scrapeAll(),
        plataforma: 'whatsapp',
        source: 'cheetah_groups',
      },
      {
        name: 'iGrupos',
        load: () => require('../services/scrapers/igruposScraperService'),
        run: (svc) => svc.scrapeAll(),
        plataforma: null, // multi-platform, determined per item
        source: null,
      },
      {
        name: 'XTEA',
        load: () => require('../services/scrapers/xteaScraperService'),
        run: (svc) => svc.scrapeAllCategories(),
        plataforma: 'telegram',
        source: 'xtea',
      },
      {
        name: 'TDirectory',
        load: () => require('../services/scrapers/tdirectoryScraperService'),
        run: (svc) => svc.scrapeAllCategories(),
        plataforma: 'telegram',
        source: 'tdirectory',
      },
      {
        name: 'TelegramCryptoGroups',
        load: () => require('../services/scrapers/telegramCryptoGroupsScraperService'),
        run: (svc) => svc.scrapeAll(),
        plataforma: 'telegram',
        source: 'telegram_crypto_groups',
      },
    ];

    for (const cfg of scraperConfigs) {
      const t0 = Date.now();
      console.log(`\n── ${cfg.name} ──`);

      try {
        const svc = cfg.load();
        const result = await cfg.run(svc);

        const items = result.results || [];
        console.log(`  Scraped: ${items.length} raw items`);

        if (cfg.name === 'iGrupos') {
          // iGrupos returns multi-platform results — split by detected platform
          const platformSourceMap = {
            whatsapp: 'igrupos_whatsapp',
            discord: 'igrupos_discord',
            telegram: 'igrupos',
          };

          const grouped = {};
          for (const item of items) {
            const p = item.platform || 'unknown';
            if (!grouped[p]) grouped[p] = [];
            grouped[p].push(item);
          }

          let totalSaved = 0;
          let totalDupes = 0;
          for (const [platform, group] of Object.entries(grouped)) {
            if (platform === 'unknown' || platform === 'signal' || platform === 'facebook') continue;
            const src = platformSourceMap[platform] || 'igrupos';
            const r = await saveDiscoveries(group, platform, src);
            totalSaved += r.saved;
            totalDupes += r.dupes;
            summary.errors.push(...r.errors);
          }

          summary.phases[cfg.name] = {
            scraped: items.length,
            saved: totalSaved,
            dupes: totalDupes,
            duration: Date.now() - t0,
          };
          summary.totalNew += totalSaved;
          summary.totalDupes += totalDupes;
        } else {
          const r = await saveDiscoveries(items, cfg.plataforma, cfg.source);
          summary.phases[cfg.name] = {
            scraped: items.length,
            saved: r.saved,
            dupes: r.dupes,
            duration: Date.now() - t0,
          };
          summary.totalNew += r.saved;
          summary.totalDupes += r.dupes;
          summary.errors.push(...r.errors);
        }

        if (result.errors?.length) {
          summary.errors.push(...result.errors.slice(0, 5));
        }

        const phase = summary.phases[cfg.name];
        console.log(
          `  Result: +${phase.saved} new, ${phase.dupes} dupes (${(phase.duration / 1000).toFixed(1)}s)`,
        );
      } catch (err) {
        console.error(`  FAILED: ${err.message}`);
        summary.phases[cfg.name] = { error: err.message };
        summary.errors.push(`${cfg.name}: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE B: Telegram MTProto Massive Seed
    // ═══════════════════════════════════════════════════════════════════
    if (!SKIP_MTPROTO && !ONLY_DIRS) {
      console.log('\n\n═══════════════════════════════════════════════════════');
      console.log('  PHASE B: Telegram MTProto Massive Seed');
      console.log('═══════════════════════════════════════════════════════\n');

      try {
        // Reset rotation for fresh keyword coverage
        const ScrapingRotation = require('../models/ScrapingRotation');
        await ScrapingRotation.updateMany({}, { $set: { offset: 0 } });
        console.log('  Rotation cursors reset to 0\n');

        const { runMassiveSeed } = require('../jobs/massiveSeedJob');
        const jobId = `all-scrapers-${Date.now()}`;
        const t0 = Date.now();

        await runMassiveSeed(jobId);

        const JobLog = require('../models/JobLog');
        const log = await JobLog.findOne({ jobId }).lean();
        const result = log?.result || {};

        summary.phases['MassiveSeed'] = {
          saved: result.saved || 0,
          dupes: result.duplicates || 0,
          discovered: result.total_discovered || 0,
          duration: Date.now() - t0,
        };
        summary.totalNew += result.saved || 0;
        summary.totalDupes += result.duplicates || 0;

        console.log(`\n  MTProto result: +${result.saved || 0} new, ${result.duplicates || 0} dupes`);
      } catch (err) {
        console.error(`  MTProto FAILED: ${err.message}`);
        summary.phases['MassiveSeed'] = { error: err.message };
        summary.errors.push(`MassiveSeed: ${err.message}`);
      }
    } else {
      console.log('\n  [Skipping MTProto phase]');
    }

    // ═══════════════════════════════════════════════════════════════════
    //  PHASE C: Newsletter Discovery
    // ═══════════════════════════════════════════════════════════════════
    if (!ONLY_DIRS) {
      console.log('\n\n═══════════════════════════════════════════════════════');
      console.log('  PHASE C: Newsletter Discovery');
      console.log('═══════════════════════════════════════════════════════\n');

      try {
        const { batchDiscoverNewsletters } = require('../services/newsletter/newsletterDiscoveryService');
        const t0 = Date.now();

        const result = await batchDiscoverNewsletters({
          skipOhmynewst: false,
          enrichCap: 50,
          detailFetches: true,
        });

        summary.phases['Newsletters'] = {
          saved: result?.saved || 0,
          dupes: result?.duplicates || 0,
          duration: Date.now() - t0,
        };
        summary.totalNew += result?.saved || 0;
        summary.totalDupes += result?.duplicates || 0;

        console.log(`  Newsletter result: +${result?.saved || 0} new`);
      } catch (err) {
        console.error(`  Newsletter FAILED: ${err.message}`);
        summary.phases['Newsletters'] = { error: err.message };
        summary.errors.push(`Newsletters: ${err.message}`);
      }
    }

    // ═══════════════════════════════════════════════════════════════════
    //  FINAL SUMMARY
    // ═══════════════════════════════════════════════════════════════════
    const totalRuntime = ((Date.now() - globalStart) / 1000).toFixed(1);

    console.log('\n\n╔═══════════════════════════════════════════════════════╗');
    console.log('║              SCRAPING RUN COMPLETE                    ║');
    console.log('╚═══════════════════════════════════════════════════════╝\n');

    console.log(`Total runtime: ${totalRuntime}s`);
    console.log(`New candidates saved: ${summary.totalNew}`);
    console.log(`Duplicates skipped: ${summary.totalDupes}`);
    console.log(`Errors: ${summary.errors.length}`);

    console.log('\nBy phase:');
    for (const [name, data] of Object.entries(summary.phases)) {
      if (data.error) {
        console.log(`  ${name}: FAILED — ${data.error}`);
      } else {
        console.log(
          `  ${name}: +${data.saved} new, ${data.dupes} dupes, ${data.scraped || data.discovered || '?'} scraped (${((data.duration || 0) / 1000).toFixed(1)}s)`,
        );
      }
    }

    if (summary.errors.length > 0) {
      console.log(`\nFirst 10 errors:`);
      summary.errors.slice(0, 10).forEach((e) => console.log(`  - ${e}`));
    }

    // Post-run stats
    const totalCands = await ChannelCandidate.countDocuments();
    const byPlatform = await ChannelCandidate.aggregate([
      { $group: { _id: '$plataforma', count: { $sum: 1 } } },
    ]);
    const byStatus = await ChannelCandidate.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
    ]);

    console.log(`\nPost-run totals:`);
    console.log(`  Total candidates: ${totalCands}`);
    console.log(`  By platform: ${JSON.stringify(byPlatform)}`);
    console.log(`  By status: ${JSON.stringify(byStatus)}`);

    // Save summary to log file
    try {
      const fs = require('fs');
      const path = require('path');
      const logPath = path.join(__dirname, '..', 'logs', `all-scrapers-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
      fs.writeFileSync(logPath, JSON.stringify({ ...summary, totalRuntime, timestamp: new Date().toISOString() }, null, 2));
      console.log(`\nLog saved: ${logPath}`);
    } catch (err) {
      console.warn(`Log save failed: ${err.message}`);
    }
  } catch (err) {
    console.error('[AllScrapers] FATAL:', err.message);
    console.error(err.stack);
  } finally {
    await mongoose.disconnect();
    console.log('\n[AllScrapers] Done.');
    process.exit(0);
  }
})();
