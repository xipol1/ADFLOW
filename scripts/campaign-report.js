#!/usr/bin/env node
/**
 * campaign-report.js — clicks + CTR report for a link-attribution campaign.
 *
 * Reads models/Tracking (written by GET /r/:campaignId on Vercel). The PC does
 * NOT need to be awake for clicks to be recorded — only to run this report.
 *
 * Usage:  node scripts/campaign-report.js <campaignId>
 * Output: console summary + _campaign-<id>-report.json
 */
'use strict';

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  try { dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']); } catch (_) {}
}
const database = require('../config/database');

const pct = (n, d) => (d > 0 ? +((n / d) * 100).toFixed(4) : null);

(async () => {
  const id = process.argv.find((a) => /^[a-f0-9]{24}$/i.test(a));
  if (!id) { console.error('Usage: node scripts/campaign-report.js <campaignId>'); process.exit(1); }

  const ok = await database.conectar();
  if (!ok) { console.error('✗ Mongo connection failed:', database.getLastConnectionError()?.message); process.exit(1); }

  const Campaign = require('../models/Campaign');
  const Tracking = require('../models/Tracking');

  const c = await Campaign.findById(id).lean();
  if (!c) { console.error('✗ Campaign not found:', id); await database.desconectar(); process.exit(1); }

  // Two click sources:
  //   - Real product flow (confirmCampaign) → models/TrackingLink (campaign.trackingLinkId),
  //     link is campaign.trackingUrl (channelad.io/go|t|r/<code>).
  //   - Direct link-attribution (run-first-campaign.js) → models/Tracking, link /r/<campaignId>.
  let clicks = [];
  let total = 0;
  let uniqueIps = 0;
  let clicksSource;
  let linkUrl;

  if (c.trackingLinkId) {
    const TrackingLink = require('../models/TrackingLink');
    const link = await TrackingLink.findById(c.trackingLinkId).lean();
    if (link) {
      clicksSource = 'TrackingLink';
      linkUrl = c.trackingUrl || '';
      clicks = (link.clicks || []).map((x) => ({ ip: x.ip || '', timestamp: x.timestamp }));
      // stats are authoritative for totals (clicks[] keeps only recent detail)
      total = link.stats?.totalClicks ?? clicks.length;
      uniqueIps = link.stats?.uniqueClicks ?? new Set(clicks.map((t) => t.ip)).size;
    }
  }
  if (clicksSource === undefined) {
    clicksSource = 'Tracking';
    linkUrl = `https://channelad.io/r/${c._id}`;
    clicks = await Tracking.find({ campaign: c._id }).select('ip timestamp').sort({ timestamp: 1 }).lean();
    total = clicks.length;
    uniqueIps = new Set(clicks.map((t) => t.ip || '')).size;
  }
  clicks.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  const reach = c.reachAtStart ?? c.estadisticasReach ?? null;

  // Time series — clicks per hour and per day (UTC)
  const byHour = {};
  const byDay = {};
  for (const t of clicks) {
    const d = new Date(t.timestamp);
    const hourKey = d.toISOString().slice(0, 13) + ':00Z';   // YYYY-MM-DDTHH:00Z
    const dayKey = d.toISOString().slice(0, 10);             // YYYY-MM-DD
    byHour[hourKey] = (byHour[hourKey] || 0) + 1;
    byDay[dayKey] = (byDay[dayKey] || 0) + 1;
  }

  const first = clicks[0]?.timestamp || null;
  const last = clicks[total - 1]?.timestamp || null;

  const report = {
    campaignId: String(c._id),
    advertiser: String(c.advertiser),
    channel: c.waChannel?.name || String(c.channel),
    channelJid: c.waChannel?.jid || '',
    targetUrl: c.targetUrl,
    trackingLink: linkUrl,
    clicksSource,
    status: c.status,
    attributionMode: c.attributionMode || 'native',
    publishedAt: c.publishedAt,
    deliveryConfirmedAt: c.deliveryConfirmedAt || null,
    reachAtStart: reach,
    clicks: { total, uniqueByIp: uniqueIps },
    ctrPct: pct(total, reach),
    uniqueCtrPct: pct(uniqueIps, reach),
    window: { firstClick: first, lastClick: last },
    series: { byDay, byHour },
    generatedAt: new Date().toISOString(),
  };

  console.log('\n══════════════════════════════════════════════════════════════');
  console.log('  Campaign report —', report.channel);
  console.log('══════════════════════════════════════════════════════════════');
  console.log('  Campaign   :', report.campaignId, '| status:', report.status);
  console.log('  Link       :', report.trackingLink);
  console.log('  Target     :', report.targetUrl);
  console.log('  Published  :', report.publishedAt || '(not confirmed)');
  console.log('  Reach@start:', reach ?? '(unknown)');
  console.log('  Clicks     :', total, `(${uniqueIps} unique IPs)`, `[source: ${clicksSource}]`);
  console.log('  CTR        :', report.ctrPct != null ? report.ctrPct + '%' : 'n/a (no reach)');
  console.log('  Unique CTR :', report.uniqueCtrPct != null ? report.uniqueCtrPct + '%' : 'n/a');
  console.log('  Window     :', first ? `${new Date(first).toISOString()} → ${new Date(last).toISOString()}` : '(no clicks yet)');
  if (Object.keys(byDay).length) {
    console.log('\n  Clicks per day:');
    for (const [d, n] of Object.entries(byDay).sort()) console.log(`    ${d}  ${'█'.repeat(Math.min(n, 50))} ${n}`);
  }

  const out = path.join(__dirname, '..', `_campaign-${c._id}-report.json`);
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  console.log('\n  Full JSON →', out);

  await database.desconectar();
  process.exit(0);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
