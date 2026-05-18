/**
 * Bootstrap the SYSTEM Baileys session — one-time interactive linking.
 *
 * Run this once on the machine that will host the enrichment worker:
 *
 *   node scripts/baileys-system-bootstrap.js
 *
 * The script prints a QR code in the terminal AND saves it as a PNG file
 * (data/baileys-system-session/last-qr.png) so you can scan from a different
 * device than the one running Node. Scan with:
 *
 *   WhatsApp → Settings → Linked Devices → Link a Device
 *
 * Once you scan it, the script prints the linked account info and exits.
 *
 * The auth state is persisted under data/baileys-system-session/ (gitignored).
 * Move that folder to another machine to migrate the session.
 *
 * Re-running this script while already linked is safe — it will just
 * re-confirm the connection and exit.
 */

require('dotenv').config();
const path = require('path');
const fs = require('fs');
const { openSystemSocket, DEFAULT_AUTH_DIR } = require('../services/baileys/systemSocket');

(async () => {
  fs.mkdirSync(DEFAULT_AUTH_DIR, { recursive: true });
  const qrPngPath = path.join(DEFAULT_AUTH_DIR, 'last-qr.png');

  console.log('═══════════════════════════════════════════════════════════');
  console.log('  ChannelAd — Baileys system session bootstrap');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Auth dir:  ${DEFAULT_AUTH_DIR}`);
  console.log(`  QR PNG:    ${qrPngPath}`);
  console.log('');
  console.log('  If creds already exist this script will just reconnect.');
  console.log('  Otherwise scan the QR with: WhatsApp → Linked Devices.');
  console.log('  Use a dedicated "scraper" phone number, NOT your personal one.');
  console.log('');

  let session;
  try {
    session = await openSystemSocket({
      printQrToTerminal: true,
      qrPngPath,
      connectTimeoutMs: 5 * 60 * 1000, // 5 min to scan
    });
  } catch (err) {
    console.error(`[bootstrap] Failed to open socket: ${err.message}`);
    process.exit(1);
  }

  try {
    const info = await session.ready;
    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  ✓ System session linked');
    console.log('═══════════════════════════════════════════════════════════');
    console.log(`    JID:    ${info.jid}`);
    console.log(`    Number: ${info.number}`);
    console.log(`    Name:   ${info.name || '(no push name set)'}`);
    console.log('');
    console.log('  Next step:  node scripts/enrich-wa-candidates.js --limit 5');
    console.log('');
  } catch (err) {
    console.error(`\n[bootstrap] Did not reach connected state: ${err.message}`);
    await session.end();
    process.exit(1);
  }

  await session.end();
  process.exit(0);
})().catch((err) => {
  console.error('[bootstrap] FATAL:', err.message);
  console.error(err.stack);
  process.exit(1);
});
