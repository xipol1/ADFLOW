#!/usr/bin/env node
/**
 * Multi-Platform Discovery Runner
 *
 * Runs all HTML-based scrapers (no APIs needed) and persists results
 * to ChannelCandidate + Canal collections. Covers:
 *
 *   Telegram:  XTEA, TDirectory, TelegramCryptoGroups
 *   Discord:   Disboard, iGrupos
 *   WhatsApp:  WaChannelsFinder, CheetahGroups, iGrupos
 *
 * Usage:
 *   node scripts/run-multiplatform-discovery.js                   # all sources
 *   node scripts/run-multiplatform-discovery.js --only telegram   # telegram only
 *   node scripts/run-multiplatform-discovery.js --only discord    # discord only
 *   node scripts/run-multiplatform-discovery.js --only whatsapp   # whatsapp only
 *   node scripts/run-multiplatform-discovery.js --dry-run         # scrape but don't save
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

// ── Config ────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const ONLY = (() => {
  const idx = args.indexOf('--only');
  return idx >= 0 ? args[idx + 1] : null;
})();

const MIN_SUBSCRIBERS_TELEGRAM = 100;
const MIN_MEMBERS_DISCORD = 50;
const MIN_FOLLOWERS_WHATSAPP = 0; // WhatsApp channels are newer, lower bar

// ── Helpers ───────────────────────────────────────────────────────────
function elapsed(start) {
  return `${((Date.now() - start) / 1000).toFixed(1)}s`;
}

function banner(text) {
  console.log(`\n${'═'.repeat(60)}`);
  console.log(`  ${text}`);
  console.log(`${'═'.repeat(60)}\n`);
}

// ── Scrapers ──────────────────────────────────────────────────────────
async function runTelegramScrapers() {
  banner('TELEGRAM SCRAPERS');
  const results = { xtea: [], tdirectory: [], telegramCryptoGroups: [] };
  const errors = [];

  // XTEA
  try {
    console.log('[1/3] XTEA — scraping category pages...');
    const { scrapeAllCategories } = require('../services/scrapers/xteaScraperService');
    const r = await scrapeAllCategories();
    results.xtea = r.results;
    errors.push(...r.errors);
    console.log(`  → ${r.results.length} channels found\n`);
  } catch (err) {
    errors.push(`XTEA fatal: ${err.message}`);
    console.error(`  ✗ XTEA failed: ${err.message}\n`);
  }

  // TDirectory (currently Cloudflare-blocked — kept for future use)
  // Uncomment when Cloudflare bypass is available (e.g. headless browser)
  // try {
  //   console.log('[2/3] TDirectory — scraping Spanish categories...');
  //   const { scrapeAllCategories } = require('../services/scrapers/tdirectoryScraperService');
  //   const r = await scrapeAllCategories();
  //   results.tdirectory = r.results;
  //   errors.push(...r.errors);
  //   console.log(`  → ${r.results.length} channels found\n`);
  // } catch (err) {
  //   errors.push(`TDirectory fatal: ${err.message}`);
  //   console.error(`  ✗ TDirectory failed: ${err.message}\n`);
  // }
  console.log('[2/3] TDirectory — skipped (Cloudflare-blocked)\n');

  // TelegramCryptoGroups
  try {
    console.log('[3/3] TelegramCryptoGroups — scraping...');
    const { scrapeAll } = require('../services/scrapers/telegramCryptoGroupsScraperService');
    const r = await scrapeAll();
    results.telegramCryptoGroups = r.results;
    errors.push(...r.errors);
    console.log(`  → ${r.results.length} channels found\n`);
  } catch (err) {
    errors.push(`TelegramCryptoGroups fatal: ${err.message}`);
    console.error(`  ✗ TelegramCryptoGroups failed: ${err.message}\n`);
  }

  return { results, errors };
}

async function runDiscordScrapers() {
  banner('DISCORD SCRAPERS');
  const results = { disboard: [], igruposDiscord: [] };
  const errors = [];

  // Disboard (currently Cloudflare-blocked — kept for future use)
  // Uncomment when Cloudflare bypass is available (e.g. Apify actor)
  // try {
  //   console.log('[1/2] Disboard — scraping tags...');
  //   const { scrapeAll } = require('../services/scrapers/disboardScraperService');
  //   const r = await scrapeAll();
  //   results.disboard = r.results;
  //   errors.push(...r.errors);
  //   console.log(`  → ${r.results.length} servers found\n`);
  // } catch (err) {
  //   errors.push(`Disboard fatal: ${err.message}`);
  //   console.error(`  ✗ Disboard failed: ${err.message}\n`);
  // }
  console.log('[1/2] Disboard — skipped (Cloudflare-blocked)\n');

  // iGrupos (Discord tags only)
  try {
    console.log('[2/2] iGrupos (Discord) — scraping tags...');
    const { scrapeTagPage, sleep: iSleep } = require('../services/scrapers/igruposScraperService');
    const discordTags = ['gaming', 'marketing', 'programacion', 'criptomonedas', 'comunidad'];
    for (const tag of discordTags) {
      const items = await scrapeTagPage('discord', tag);
      const discordItems = items.filter((i) => i.platform === 'discord');
      results.igruposDiscord.push(...discordItems);
      if (discordItems.length > 0) {
        console.log(`  iGrupos discord/${tag}: ${discordItems.length} servers`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    console.log(`  → ${results.igruposDiscord.length} servers total\n`);
  } catch (err) {
    errors.push(`iGrupos Discord fatal: ${err.message}`);
    console.error(`  ✗ iGrupos Discord failed: ${err.message}\n`);
  }

  return { results, errors };
}

async function runWhatsAppScrapers() {
  banner('WHATSAPP SCRAPERS');
  const results = { wachannelsfinder: [], cheetahGroups: [], igruposWhatsapp: [] };
  const errors = [];

  // WaChannelsFinder
  try {
    console.log('[1/3] WaChannelsFinder — scraping categories + countries...');
    const { scrapeAll } = require('../services/scrapers/wachannelsfinderScraperService');
    const r = await scrapeAll();
    results.wachannelsfinder = r.results;
    errors.push(...r.errors);
    console.log(`  → ${r.results.length} channels found\n`);
  } catch (err) {
    errors.push(`WaChannelsFinder fatal: ${err.message}`);
    console.error(`  ✗ WaChannelsFinder failed: ${err.message}\n`);
  }

  // CheetahGroups (currently Cloudflare-blocked — kept for future use)
  // try {
  //   console.log('[2/3] CheetahGroups — scraping WhatsApp Channels...');
  //   const { scrapeAll } = require('../services/scrapers/cheetahGroupsScraperService');
  //   const r = await scrapeAll();
  //   results.cheetahGroups = r.results;
  //   errors.push(...r.errors);
  //   console.log(`  → ${r.results.length} channels found\n`);
  // } catch (err) {
  //   errors.push(`CheetahGroups fatal: ${err.message}`);
  //   console.error(`  ✗ CheetahGroups failed: ${err.message}\n`);
  // }
  console.log('[2/3] CheetahGroups — skipped (Cloudflare-blocked)\n');

  // iGrupos (WhatsApp tags)
  try {
    console.log('[3/3] iGrupos (WhatsApp) — scraping tags...');
    const { scrapeTagPage } = require('../services/scrapers/igruposScraperService');
    const waTags = ['marketing', 'negocios', 'emprendimiento', 'finanzas', 'criptomonedas', 'ecommerce', 'tecnologia', 'inversiones'];
    for (const tag of waTags) {
      const items = await scrapeTagPage('whatsapp', tag);
      const waItems = items.filter((i) => i.platform === 'whatsapp');
      results.igruposWhatsapp.push(...waItems);
      if (waItems.length > 0) {
        console.log(`  iGrupos whatsapp/${tag}: ${waItems.length} groups`);
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    console.log(`  → ${results.igruposWhatsapp.length} groups total\n`);
  } catch (err) {
    errors.push(`iGrupos WhatsApp fatal: ${err.message}`);
    console.error(`  ✗ iGrupos WhatsApp failed: ${err.message}\n`);
  }

  return { results, errors };
}

// ── Persistence ───────────────────────────────────────────────────────

async function persistTelegramChannels(channels, source) {
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  let saved = 0, duplicates = 0, filtered = 0;

  for (const ch of channels) {
    if (!ch.username || ch.username.length < 4) { filtered++; continue; }
    if ((ch.subscribers || 0) < MIN_SUBSCRIBERS_TELEGRAM) { filtered++; continue; }

    // Check duplicates
    const [existingCanal, existingCandidate] = await Promise.all([
      Canal.findOne({
        plataforma: 'telegram',
        identificadorCanal: { $regex: new RegExp(`^@?${ch.username}$`, 'i') },
      }).lean(),
      ChannelCandidate.findOne({ username: ch.username }).lean(),
    ]);

    if (existingCanal || existingCandidate) { duplicates++; continue; }

    try {
      await ChannelCandidate.create({
        username: ch.username,
        plataforma: 'telegram',
        source,
        status: 'pending_review',
        scraped_at: new Date(),
        raw_metrics: {
          title: ch.title || '',
          description: ch.description || '',
          subscribers: ch.subscribers || 0,
          category: ch.category || '',
          discoveredVia: source,
        },
      });
      saved++;
    } catch (err) {
      if (err.code === 11000) duplicates++;
    }
  }

  return { saved, duplicates, filtered };
}

async function persistDiscordServers(servers, source) {
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  let saved = 0, duplicates = 0, filtered = 0;

  for (const s of servers) {
    const identifier = s.serverId || s.inviteLink || s.name;
    if (!identifier) { filtered++; continue; }
    if ((s.members || 0) < MIN_MEMBERS_DISCORD) { filtered++; continue; }

    // Candidate username: discord:identifier
    const candidateUsername = `discord:${(s.serverId || s.name).toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`;

    const existing = await ChannelCandidate.findOne({ username: candidateUsername }).lean();
    if (existing) { duplicates++; continue; }

    // Check Canal by invite link or name
    const existingCanal = await Canal.findOne({
      plataforma: 'discord',
      $or: [
        { identificadorCanal: candidateUsername },
        { nombreCanal: s.name },
      ],
    }).lean();
    if (existingCanal) { duplicates++; continue; }

    try {
      // Create candidate
      await ChannelCandidate.create({
        username: candidateUsername,
        plataforma: 'discord',
        source,
        status: 'pending_review',
        scraped_at: new Date(),
        raw_metrics: {
          title: s.name || '',
          description: s.description || '',
          members: s.members || 0,
          tags: s.tags || [],
          inviteLink: s.inviteLink || '',
          serverId: s.serverId || '',
          discoveredVia: source,
        },
      });

      // Also create unclaimed Canal for catalog volume
      await Canal.create({
        plataforma: 'discord',
        identificadorCanal: candidateUsername,
        nombreCanal: s.name || '',
        descripcion: (s.description || '').slice(0, 500),
        categoria: (s.tags || [])[0] || '',
        estado: 'activo',
        estadisticas: {
          seguidores: s.members || 0,
          ultimaActualizacion: new Date(),
        },
        identificadores: {
          serverId: s.serverId || '',
        },
        claimed: false,
        claimedBy: null,
        crawler: {
          ultimaActualizacion: new Date(),
          urlPublica: s.inviteLink || '',
        },
        verificacion: {
          tipoAcceso: 'declarado',
          confianzaScore: 20,
        },
      });

      saved++;
    } catch (err) {
      if (err.code === 11000) duplicates++;
    }
  }

  return { saved, duplicates, filtered };
}

async function persistWhatsAppChannels(channels, source) {
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  let saved = 0, duplicates = 0, filtered = 0;

  for (const ch of channels) {
    const identifier = ch.channelCode || ch.slug || ch.igruposId || ch.name;
    if (!identifier) { filtered++; continue; }
    if ((ch.followers || ch.members || 0) < MIN_FOLLOWERS_WHATSAPP) { filtered++; continue; }

    const candidateUsername = `wa:${(ch.channelCode || ch.slug || ch.name).toLowerCase().replace(/\s+/g, '-').slice(0, 60)}`;

    const existing = await ChannelCandidate.findOne({ username: candidateUsername }).lean();
    if (existing) { duplicates++; continue; }

    const existingCanal = await Canal.findOne({
      plataforma: 'whatsapp',
      $or: [
        { identificadorCanal: candidateUsername },
        { nombreCanal: ch.name },
      ],
    }).lean();
    if (existingCanal) { duplicates++; continue; }

    try {
      await ChannelCandidate.create({
        username: candidateUsername,
        plataforma: 'whatsapp',
        source,
        status: 'pending_review',
        scraped_at: new Date(),
        raw_metrics: {
          title: ch.name || '',
          description: ch.description || '',
          followers: ch.followers || ch.members || 0,
          category: ch.category || '',
          inviteLink: ch.inviteLink || '',
          channelCode: ch.channelCode || '',
          discoveredVia: source,
        },
      });

      // Create unclaimed Canal
      await Canal.create({
        plataforma: 'whatsapp',
        identificadorCanal: candidateUsername,
        nombreCanal: ch.name || '',
        descripcion: (ch.description || '').slice(0, 500),
        categoria: ch.category || '',
        estado: 'activo',
        estadisticas: {
          seguidores: ch.followers || ch.members || 0,
          ultimaActualizacion: new Date(),
        },
        claimed: false,
        claimedBy: null,
        crawler: {
          ultimaActualizacion: new Date(),
          urlPublica: ch.inviteLink || '',
        },
        verificacion: {
          tipoAcceso: 'declarado',
          confianzaScore: 20,
        },
      });

      saved++;
    } catch (err) {
      if (err.code === 11000) duplicates++;
    }
  }

  return { saved, duplicates, filtered };
}

// ── Main ──────────────────────────────────────────────────────────────

async function main() {
  const startTime = Date.now();
  banner('MULTI-PLATFORM DISCOVERY');
  console.log(`Mode: ${DRY_RUN ? 'DRY RUN (no DB writes)' : 'LIVE'}`);
  console.log(`Filter: ${ONLY || 'all platforms'}`);
  console.log(`Date: ${new Date().toISOString()}\n`);

  // Connect to MongoDB
  if (!DRY_RUN) {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected.\n');
  }

  const summary = {
    telegram: { scraped: 0, saved: 0, duplicates: 0, filtered: 0 },
    discord: { scraped: 0, saved: 0, duplicates: 0, filtered: 0 },
    whatsapp: { scraped: 0, saved: 0, duplicates: 0, filtered: 0 },
  };
  const allErrors = [];

  // ── Telegram ──
  if (!ONLY || ONLY === 'telegram') {
    const tg = await runTelegramScrapers();
    allErrors.push(...tg.errors);

    const allTgChannels = [
      ...tg.results.xtea.map((ch) => ({ ...ch, _src: 'xtea' })),
      ...tg.results.tdirectory.map((ch) => ({ ...ch, _src: 'tdirectory' })),
      ...tg.results.telegramCryptoGroups.map((ch) => ({ ...ch, _src: 'telegram_crypto_groups' })),
    ];

    // Dedupe across scrapers
    const deduped = new Map();
    for (const ch of allTgChannels) {
      if (ch.username && !deduped.has(ch.username)) deduped.set(ch.username, ch);
    }
    summary.telegram.scraped = deduped.size;

    if (!DRY_RUN) {
      // Persist by source
      for (const [, ch] of deduped) {
        const src = ch._src;
        const r = await persistTelegramChannels([ch], src);
        summary.telegram.saved += r.saved;
        summary.telegram.duplicates += r.duplicates;
        summary.telegram.filtered += r.filtered;
      }
    }
  }

  // ── Discord ──
  if (!ONLY || ONLY === 'discord') {
    const dc = await runDiscordScrapers();
    allErrors.push(...dc.errors);

    const allDcServers = [
      ...dc.results.disboard.map((s) => ({ ...s, _src: 'disboard' })),
      ...dc.results.igruposDiscord.map((s) => ({
        name: s.name,
        description: s.description,
        members: s.members,
        tags: [s.category],
        inviteLink: '',
        serverId: s.igruposId || '',
        _src: 'igrupos_discord',
      })),
    ];

    // Dedupe
    const deduped = new Map();
    for (const s of allDcServers) {
      const key = s.serverId || s.name?.toLowerCase();
      if (key && !deduped.has(key)) deduped.set(key, s);
    }
    summary.discord.scraped = deduped.size;

    if (!DRY_RUN) {
      for (const [, s] of deduped) {
        const r = await persistDiscordServers([s], s._src);
        summary.discord.saved += r.saved;
        summary.discord.duplicates += r.duplicates;
        summary.discord.filtered += r.filtered;
      }
    }
  }

  // ── WhatsApp ──
  if (!ONLY || ONLY === 'whatsapp') {
    const wa = await runWhatsAppScrapers();
    allErrors.push(...wa.errors);

    const allWaChannels = [
      ...wa.results.wachannelsfinder.map((ch) => ({ ...ch, _src: 'wachannelsfinder' })),
      ...wa.results.cheetahGroups.map((ch) => ({ ...ch, _src: 'cheetah_groups' })),
      ...wa.results.igruposWhatsapp.map((ch) => ({
        name: ch.name,
        description: ch.description,
        followers: ch.members,
        channelCode: '',
        inviteLink: '',
        igruposId: ch.igruposId,
        category: ch.category,
        _src: 'igrupos_whatsapp',
      })),
    ];

    // Dedupe
    const deduped = new Map();
    for (const ch of allWaChannels) {
      const key = ch.channelCode || ch.slug || ch.name?.toLowerCase();
      if (key && !deduped.has(key)) deduped.set(key, ch);
    }
    summary.whatsapp.scraped = deduped.size;

    if (!DRY_RUN) {
      for (const [, ch] of deduped) {
        const r = await persistWhatsAppChannels([ch], ch._src);
        summary.whatsapp.saved += r.saved;
        summary.whatsapp.duplicates += r.duplicates;
        summary.whatsapp.filtered += r.filtered;
      }
    }
  }

  // ── Summary ─────────────────────────────────────────────────────────
  banner('RESULTS');

  console.log('Platform     | Scraped | Saved | Dupes | Filtered');
  console.log('-------------|---------|-------|-------|--------');
  for (const [platform, s] of Object.entries(summary)) {
    if (!ONLY || ONLY === platform) {
      console.log(
        `${platform.padEnd(13)}| ${String(s.scraped).padEnd(8)}| ${String(s.saved).padEnd(6)}| ${String(s.duplicates).padEnd(6)}| ${s.filtered}`,
      );
    }
  }

  const totalScraped = Object.values(summary).reduce((a, s) => a + s.scraped, 0);
  const totalSaved = Object.values(summary).reduce((a, s) => a + s.saved, 0);
  console.log(`\nTotal: ${totalScraped} scraped, ${totalSaved} saved`);
  console.log(`Errors: ${allErrors.length}`);
  console.log(`Duration: ${elapsed(startTime)}`);

  if (allErrors.length > 0) {
    console.log('\nErrors (first 20):');
    for (const err of allErrors.slice(0, 20)) {
      console.log(`  • ${err}`);
    }
  }

  if (!DRY_RUN) {
    await mongoose.disconnect();
  }

  process.exit(0);
}

main().catch((err) => {
  console.error('FATAL:', err);
  process.exit(1);
});
