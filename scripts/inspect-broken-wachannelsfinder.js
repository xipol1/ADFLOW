/**
 * Inspect what data is rescuable from the 930 broken wachannelsfinder
 * candidates so we know which fields to use as matching keys when running
 * the other scrapers.
 */
require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

function deslugify(slug) {
  if (!slug) return '';
  return decodeURIComponent(slug.replace(/^wa:/, ''))
    .replace(/-/g, ' ')
    .replace(/%[0-9a-f]{2}%[0-9a-f]{2}%[0-9a-f]{2}%[0-9a-f]{2}/gi, '') // strip emoji escapes
    .trim();
}

(async () => {
  await mongoose.connect(process.env.MONGODB_URI);
  const ChannelCandidate = require('../models/ChannelCandidate');

  const broken = await ChannelCandidate.find(
    { plataforma: 'whatsapp', source: 'wachannelsfinder' },
    { username: 1, raw_metrics: 1, scraped_at: 1 },
  ).lean();
  console.log(`Total wachannelsfinder WA candidates: ${broken.length}\n`);

  // ── Field population stats ────────────────────────────────────────────
  const populated = {
    'raw_metrics.title': 0,
    'raw_metrics.description': 0,
    'raw_metrics.subscribers (>0)': 0,
    'raw_metrics.inviteLink': 0,
    'raw_metrics.channelCode': 0,
    'raw_metrics.sourceUrl': 0,
    'raw_metrics.slug': 0,
    'raw_metrics.category': 0,
    'raw_metrics.country': 0,
    'raw_metrics.language (es)': 0,
    'raw_metrics.language (en)': 0,
  };
  const titleHasHtml = [];
  const titleClean = [];

  for (const c of broken) {
    const rm = c.raw_metrics || {};
    if (rm.title) populated['raw_metrics.title']++;
    if (rm.description) populated['raw_metrics.description']++;
    if (rm.subscribers > 0) populated['raw_metrics.subscribers (>0)']++;
    if (rm.inviteLink) populated['raw_metrics.inviteLink']++;
    if (rm.channelCode) populated['raw_metrics.channelCode']++;
    if (rm.sourceUrl) populated['raw_metrics.sourceUrl']++;
    if (rm.slug) populated['raw_metrics.slug']++;
    if (rm.category) populated['raw_metrics.category']++;
    if (rm.country) populated['raw_metrics.country']++;
    if (rm.language === 'es') populated['raw_metrics.language (es)']++;
    if (rm.language === 'en') populated['raw_metrics.language (en)']++;

    if (rm.title && /<[a-z]/i.test(rm.title)) titleHasHtml.push(rm.title);
    else if (rm.title) titleClean.push(rm.title);
  }

  console.log('── Field population ──');
  for (const [k, v] of Object.entries(populated)) {
    console.log(`  ${k}: ${v}/${broken.length}`);
  }

  console.log(`\n── Title quality ──`);
  console.log(`  HTML-broken: ${titleHasHtml.length}`);
  console.log(`  Clean: ${titleClean.length}`);

  console.log(`\n── Sample raw_metrics (first 3) ──`);
  for (const c of broken.slice(0, 3)) {
    console.log(`  username: ${c.username}`);
    console.log(`  raw_metrics:`, JSON.stringify(c.raw_metrics, null, 2).slice(0, 800));
    console.log(`  ---`);
  }

  console.log(`\n── Sample slugs deslugified ──`);
  for (const c of broken.slice(0, 10)) {
    console.log(`  ${c.username} → "${deslugify(c.username)}"`);
  }

  console.log(`\n── Sample clean titles ──`);
  for (const t of titleClean.slice(0, 5)) {
    console.log(`  "${t}"`);
  }

  console.log(`\n── Sample broken (HTML) titles ──`);
  for (const t of titleHasHtml.slice(0, 3)) {
    console.log(`  "${t.slice(0, 200)}..."`);
  }

  await mongoose.disconnect();
  process.exit(0);
})();
