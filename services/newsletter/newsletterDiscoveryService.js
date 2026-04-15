/**
 * Newsletter Discovery Service — multi-source newsletter discovery orchestrator.
 *
 * Mirrors the shape of tgstatScraperService.js but targets newsletters.
 * Combines:
 *   1. Editorial seeds (curated hardcoded list of Spanish newsletters)
 *   2. OhMyNewst directory (HTML scraping — 30+ Spanish newsletters w/ subs)
 *   3. Substack public JSON API (enrichment of every candidate whose URL
 *      points at a Substack publication)
 *
 * Output: same interface as Telegram discovery: { discovered, saved, duplicates, errors, sources }.
 * Side effects: creates ChannelCandidate records AND unclaimed Canal records
 * (per the user's explicit request to index newsletters as unclaimed and let
 * creators reclaim them later — this feeds SEO / catalog volume immediately).
 */

const MIN_SUBSCRIBERS = 0; // no minimum — small newsletters are still valid catalog entries
const MAX_NEWSLETTERS_TO_ENRICH = 200; // safety cap

const { classifyNewsletter, slugify } = require('./taxonomyService');
const { enrichFromSubstack } = require('./substackPublicApiService');
const { NEWSLETTER_SEEDS } = require('./editorialSeedsData');

/**
 * Second-pass dedupe: group raw entries by computed slug (from title) and
 * merge them so e.g. "Rocker Insider" from editorial_seed + ohmynewst
 * collapse into a single entry with the richest fields from both.
 *
 * Merge strategy: keep the first entry as base, then fill in missing fields
 * from subsequent entries. A field is considered "missing" when it's empty
 * string / 0 / null / undefined. We also keep the higher subscriber count
 * between the two.
 */
function dedupeBySlug(rawMap) {
  const bySlug = new Map();
  for (const [, entry] of rawMap) {
    // Respect explicit slug from the seed (LinkedIn seeds use
    // "linkedin-<title>" to avoid colliding with Substack seeds that share
    // a display name). Fall back to slugifying the title for sources that
    // don't provide one.
    const slug = (entry.slug || slugify(entry.title || '')).toLowerCase();
    if (!slug) continue;
    if (!bySlug.has(slug)) {
      bySlug.set(slug, { ...entry });
      continue;
    }
    const existing = bySlug.get(slug);
    // Merge: prefer non-empty strings, higher numeric values, keep _source
    // of whichever one we encountered first (editorial has priority because
    // it comes first in the collect phase).
    if (!existing.description && entry.description) existing.description = entry.description;
    if (!existing.url && entry.url) existing.url = entry.url;
    if (!existing.rawCategory && entry.rawCategory) existing.rawCategory = entry.rawCategory;
    if ((entry.subscribers || 0) > (existing.subscribers || 0)) {
      existing.subscribers = entry.subscribers;
    }
    // Track all sources that contributed to this merged entry
    existing._mergedSources = existing._mergedSources || [existing._source];
    if (!existing._mergedSources.includes(entry._source)) {
      existing._mergedSources.push(entry._source);
    }
    // Preserve the ohmynewstDetailUrl if any input had it
    if (!existing.ohmynewstDetailUrl && entry.ohmynewstDetailUrl) {
      existing.ohmynewstDetailUrl = entry.ohmynewstDetailUrl;
    }
  }
  return bySlug;
}

/**
 * Collect raw newsletter records from every configured source.
 * Returns a Map keyed by slug-or-url so downstream steps can dedupe easily.
 */
async function collectRawNewsletters(options = {}) {
  const errors = [];
  const all = new Map(); // key -> raw record
  const sourceCounts = {
    editorial_seed: 0,
    ohmynewst: 0,
    linkedin_newsletters: 0,
  };

  // ── Source 1: editorial seeds (always available, zero network) ─────────
  if (!options.skipEditorial) {
    for (const seed of NEWSLETTER_SEEDS) {
      const key = (seed.url || seed.title).toLowerCase();
      if (!all.has(key)) {
        all.set(key, { ...seed, _source: seed.source || 'editorial_seed' });
        sourceCounts.editorial_seed++;
      }
    }
  }

  // ── Source 2: ohmynewst directory (HTML scraping) ──────────────────────
  if (!options.skipOhmynewst) {
    try {
      const { scrapeAll } = require('./ohmynewstScraperService');
      const maxDetailFetches = options.maxDetailFetches ?? 80;
      const omn = await scrapeAll({ maxDetailFetches });

      for (const card of omn.results) {
        // Use card.url if we got the external URL, otherwise detailUrl as a
        // stable key (so we can still save even if detail follow failed).
        const key = (card.url || card.detailUrl || card.title).toLowerCase();
        if (all.has(key)) continue;

        all.set(key, {
          title: card.title,
          description: card.description || '', // scraped from the card body
          url: card.url || '', // may be empty if detail follow failed
          subscribers: card.subscribers || 0,
          rawCategory: card.rawCategory || '',
          ohmynewstDetailUrl: card.detailUrl,
          source: 'ohmynewst',
          _source: 'ohmynewst',
        });
        sourceCounts.ohmynewst++;
      }

      if (omn.errors.length > 0) {
        errors.push(...omn.errors);
      }
    } catch (err) {
      errors.push(`[ohmynewst phase] ${err.message}`);
    }
  }

  // ── Source 3: LinkedIn editorial seeds (curated list) ──────────────────
  // LinkedIn blocks anonymous HTTP, so there's no scraping phase — we only
  // inject the curated seed list. The creator reclaims via OAuth later to
  // enrich the data.
  if (!options.skipLinkedin) {
    try {
      const { getLinkedinNewsletterSeeds } = require('./linkedinNewslettersService');
      const seeds = getLinkedinNewsletterSeeds();
      for (const seed of seeds) {
        // Use "linkedin:<title>" as key so LinkedIn seeds don't collide with
        // Substack/ohmynewst seeds that happen to share a title (e.g.
        // "Marketing4eCommerce" exists on both Substack and LinkedIn).
        const key = `linkedin:${(seed.title || '').toLowerCase()}`;
        if (!all.has(key)) {
          all.set(key, { ...seed });
          sourceCounts.linkedin_newsletters++;
        }
      }
    } catch (err) {
      errors.push(`[linkedin newsletters phase] ${err.message}`);
    }
  }

  return { allRaw: all, errors, sourceCounts };
}

/**
 * Enrich every Substack newsletter with live JSON API data (subs, author,
 * real description). Newsletters that aren't Substack pass through unchanged.
 *
 * This is the most network-intensive step, so we cap it.
 */
async function enrichAll(rawMap, options = {}) {
  const cap = options.cap ?? MAX_NEWSLETTERS_TO_ENRICH;
  const enriched = [];
  const errors = [];

  const items = Array.from(rawMap.values()).slice(0, cap);
  let i = 0;
  for (const item of items) {
    i++;
    try {
      if (item.url && /substack\.com/i.test(item.url)) {
        const merged = await enrichFromSubstack(item);
        enriched.push(merged || item);
      } else {
        enriched.push(item);
      }
    } catch (err) {
      errors.push(`[enrich] ${item.title}: ${err.message}`);
      enriched.push(item); // fall through with the raw version
    }

    // Progress log every 20 items
    if (i % 20 === 0) {
      console.log(`[newsletterDiscovery] enriched ${i}/${items.length}`);
    }
  }

  return { enriched, errors };
}

/**
 * Persist classified newsletters to ChannelCandidate + Canal.
 *
 * For each newsletter:
 *   - Run it through classifyNewsletter() to get the canonical record
 *   - Upsert a ChannelCandidate with username = `nl:<slug>` and status='approved'
 *   - Upsert an unclaimed Canal (claimed:false, estado:'autodescubierto')
 *     with plataforma='newsletter' and the classified fields
 *
 * Returns counts of saved vs duplicates vs filtered.
 */
async function persistNewsletters(enrichedRaws) {
  const ChannelCandidate = require('../../models/ChannelCandidate');
  const Canal = require('../../models/Canal');

  let saved = 0;
  let duplicates = 0;
  let filteredOut = 0;
  const errors = [];

  for (const raw of enrichedRaws) {
    try {
      const classified = classifyNewsletter(raw);

      // Must have a slug and a title
      if (!classified.slug || !classified.title) {
        filteredOut++;
        continue;
      }

      // Optional min-subs filter (currently 0 — all are valid)
      if ((classified.subscribers || 0) < MIN_SUBSCRIBERS) {
        filteredOut++;
        continue;
      }

      // Candidate username is prefixed to avoid colliding with Telegram
      const candidateUsername = `nl:${classified.slug}`;

      // Check for existing Canal first — don't recreate if a creator already
      // registered this newsletter themselves.
      const existingCanal = await Canal.findOne({
        plataforma: 'newsletter',
        identificadorCanal: classified.slug,
      }).lean();

      if (existingCanal) {
        duplicates++;
        continue;
      }

      // URL fallback chain: real external URL > ohmynewst detail page >
      // empty. We prefer a real link but keeping the ohmynewst detail URL
      // ensures every auto-discovered newsletter has a reachable page.
      const canalUrl = classified.url || raw.ohmynewstDetailUrl || '';

      // Create the unclaimed Canal (fast-track per user request).
      // estado='activo' so it appears in /api/lists/channels (the public
      // marketplace filter). claimed:false marks it as auto-discovered so
      // creators can reclaim it via the claim flow.
      const canalDoc = await Canal.create({
        plataforma: 'newsletter',
        identificadorCanal: classified.slug,
        nombreCanal: classified.title,
        descripcion: classified.description || '',
        categoria: classified.categoria,
        estado: 'activo',
        estadisticas: {
          seguidores: classified.subscribers || 0,
          ultimaActualizacion: new Date(),
        },
        identificadores: {
          provider: classified.provider,
        },
        idioma: classified.idioma,
        tags: classified.tags,
        foto: raw.logoUrl || '',
        // Unclaimed by default — creators can reclaim via the claim flow
        claimed: false,
        claimedBy: null,
        crawler: {
          ultimaActualizacion: new Date(),
          urlPublica: canalUrl,
        },
        verificacion: {
          tipoAcceso: 'declarado',
          confianzaScore: 30,
        },
      });

      // Mirror into ChannelCandidate for audit trail (status=approved since
      // we already promoted it to Canal).
      // We use findOneAndUpdate to tolerate re-runs without E11000 errors.
      const sourceForEnum = mapSourceToEnum(raw._source || raw.source);
      await ChannelCandidate.findOneAndUpdate(
        { username: candidateUsername },
        {
          $setOnInsert: {
            username: candidateUsername,
            plataforma: 'newsletter',
            source: sourceForEnum,
            scraped_at: new Date(),
          },
          $set: {
            status: 'approved',
            canal_id: canalDoc._id,
            reviewed_at: new Date(),
            raw_metrics: {
              title: classified.title,
              description: classified.description,
              subscribers: classified.subscribers || 0,
              category: classified.categoria,
              rawCategory: classified.rawCategory,
              tags: classified.tags,
              url: classified.url,
              provider: classified.provider,
              idioma: classified.idioma,
              author: raw.author || '',
              logoUrl: raw.logoUrl || '',
              latestPostDate: raw._latestPostDate || null,
              postsPerWeek: raw._postsPerWeek || null,
              discoveredVia: raw._source || raw.source || 'editorial_seed',
            },
          },
        },
        { upsert: true, new: true },
      );

      saved++;
    } catch (err) {
      if (err.code === 11000) {
        duplicates++;
      } else {
        errors.push(`[persist ${raw.title || '?'}] ${err.message}`);
      }
    }
  }

  return { saved, duplicates, filteredOut, errors };
}

/**
 * Map an internal source tag to the ChannelCandidate.source enum value.
 */
function mapSourceToEnum(rawSource) {
  const s = (rawSource || '').toLowerCase();
  if (s === 'ohmynewst') return 'ohmynewst';
  if (s === 'substack_public_api') return 'substack_public_api';
  if (s === 'substack_directory') return 'substack_directory';
  if (s === 'marketing4ecommerce') return 'marketing4ecommerce';
  if (s === 'autonewsletter_ai') return 'autonewsletter_ai';
  if (s === 'fleet_street') return 'fleet_street';
  if (s === 'linkedin_newsletters') return 'linkedin_newsletters';
  return 'editorial_seed';
}

/**
 * Top-level entry point. Runs the full discovery pipeline end-to-end.
 *
 * @param {object} options
 * @param {boolean} options.skipEditorial — skip editorial seeds
 * @param {boolean} options.skipOhmynewst — skip ohmynewst scraping
 * @param {number} options.maxDetailFetches — ohmynewst detail pages to follow
 * @param {number} options.enrichCap — max newsletters to enrich with Substack API
 * @returns {{ discovered, saved, duplicates, filteredOut, errors, sources }}
 */
async function batchDiscoverNewsletters(options = {}) {
  const start = Date.now();

  // ── Phase 1: collect raw ──────────────────────────────────────────────
  console.log('[newsletterDiscovery] Phase 1: collecting raw from sources...');
  const { allRaw, errors: collectErrors, sourceCounts } = await collectRawNewsletters(options);
  console.log(`[newsletterDiscovery] Phase 1 done: ${allRaw.size} unique raw candidates`);
  console.log(`[newsletterDiscovery]   - editorial:  ${sourceCounts.editorial_seed}`);
  console.log(`[newsletterDiscovery]   - ohmynewst:  ${sourceCounts.ohmynewst}`);
  console.log(`[newsletterDiscovery]   - linkedin:   ${sourceCounts.linkedin_newsletters || 0}`);

  // ── Phase 1.5: dedupe by slug (same newsletter from multiple sources) ─
  const deduped = dedupeBySlug(allRaw);
  const mergedCount = allRaw.size - deduped.size;
  console.log(
    `[newsletterDiscovery] Phase 1.5 dedupe: ${deduped.size} unique (merged ${mergedCount} duplicates)`,
  );

  // ── Phase 2: enrich with Substack API (where applicable) ──────────────
  console.log('[newsletterDiscovery] Phase 2: enriching via Substack public API...');
  const { enriched, errors: enrichErrors } = await enrichAll(deduped, {
    cap: options.enrichCap ?? MAX_NEWSLETTERS_TO_ENRICH,
  });
  console.log(`[newsletterDiscovery] Phase 2 done: ${enriched.length} enriched`);

  // ── Phase 3: classify + persist ───────────────────────────────────────
  console.log('[newsletterDiscovery] Phase 3: classifying and persisting...');
  const { saved, duplicates, filteredOut, errors: persistErrors } = await persistNewsletters(enriched);
  console.log(
    `[newsletterDiscovery] Phase 3 done: saved=${saved}, duplicates=${duplicates}, filtered=${filteredOut}`,
  );

  return {
    discovered: allRaw.size,
    enriched: enriched.length,
    saved,
    duplicates,
    filtered_out: filteredOut,
    errors: [...collectErrors, ...enrichErrors, ...persistErrors].slice(0, 100),
    error_count: collectErrors.length + enrichErrors.length + persistErrors.length,
    sources: sourceCounts,
    duration_ms: Date.now() - start,
  };
}

module.exports = {
  batchDiscoverNewsletters,
  collectRawNewsletters,
  enrichAll,
  persistNewsletters,
  mapSourceToEnum,
  MIN_SUBSCRIBERS,
  MAX_NEWSLETTERS_TO_ENRICH,
};
