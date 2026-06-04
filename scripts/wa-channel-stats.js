#!/usr/bin/env node
/**
 * wa-channel-stats.js — CLI over services/whatsappChannelStats. Given channel invite
 * codes or URLs, prints subscribers / verification / name (no follow, no admin needed).
 * 100% local. Login once first: `node scripts/wa-login-qr.js`.
 *
 *   node scripts/wa-channel-stats.js 0029Vb82Fo0I7BeLLtWLvh2B
 *   node scripts/wa-channel-stats.js https://whatsapp.com/channel/0029... https://whatsapp.com/channel/0029...
 *   node scripts/wa-channel-stats.js --file=invites.json     # ["0029...","https://..."] or {invites:[...]}
 */
'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const WhatsAppChannelStats = require('../services/whatsappChannelStats');

const RESULT = path.join(__dirname, '..', '_wa-channel-stats.json');

(async () => {
  const args = process.argv.slice(2);
  let invites = args.filter((a) => !a.startsWith('--'));

  const fileArg = args.find((a) => a.startsWith('--file='));
  if (fileArg) {
    const parsed = JSON.parse(fs.readFileSync(fileArg.split('=')[1], 'utf8'));
    invites = invites.concat(Array.isArray(parsed) ? parsed : (parsed.invites || []));
  }
  if (!invites.length) {
    console.error('Usage: node scripts/wa-channel-stats.js <inviteCodeOrUrl> [...]  |  --file=invites.json');
    process.exit(1);
  }

  const stats = new WhatsAppChannelStats();
  console.log(`Connecting (session: ${stats.sessionPath})…`);
  await stats.init();
  console.log(`Ready. Querying ${invites.length} channel(s)…\n`);

  const res = await stats.getManyByInvite(invites);

  console.table(res.map((r) => ({
    name: r.ok ? r.name : '(error)',
    subscribers: r.ok ? r.subscribersCount : '—',
    verified: r.ok ? r.verified : '—',
    state: r.ok ? r.stateType : '—',
    jid: r.ok ? r.jid : '—',
    invite: r.invite,
    error: r.ok ? '' : r.error,
  })));

  fs.writeFileSync(RESULT, JSON.stringify(res, null, 2));
  console.log(`\nFull JSON → ${RESULT}`);

  await stats.close();
  setTimeout(() => process.exit(0), 1000);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
