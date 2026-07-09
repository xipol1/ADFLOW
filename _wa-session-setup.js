/**
 * _wa-session-setup.js — One-time setup of OUR WhatsApp Web session on disk.
 *
 * Boots the production whatsapp-web.js worker against data/whatsapp-session and
 * writes the pairing QR as a PNG (_wa-session-qr.png) so it's easy to scan. Scan
 * it ONCE with Channelad's number (+34674709388 = your phone). Once connected,
 * LocalAuth persists the session to disk and the script exits — afterwards
 * `_wa-verify-cocina.js` reconnects WITHOUT a QR.
 *
 * This is a normal single device-link of OUR own number. No anti-abuse risk
 * (that risk only applied to pairing a CREATOR's number to our infra).
 *
 *   node _wa-session-setup.js
 */
'use strict';

require('dotenv').config();
const dns = require('dns');
dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);

const path = require('path');
const qrcode = require('qrcode');

// Use the PRODUCTION wweb session path. Set here (NOT in .env) — putting
// WHATSAPP_SESSION_PATH in .env makes server.js fork its own worker and hijack
// the session (documented gotcha).
process.env.WHATSAPP_SESSION_PATH =
  process.env.WHATSAPP_SESSION_PATH || path.join(__dirname, 'data', 'whatsapp-session');

const CHANNELAD_NUMBER = process.env.WHATSAPP_CHANNELAD_NUMBER || '+34674709388';
const QR_PNG = path.join(__dirname, '_wa-session-qr.png');
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

(async () => {
  const wa = require('./services/WhatsAppAdminClient');

  console.log(`Sesión: ${process.env.WHATSAPP_SESSION_PATH}`);
  console.log(`Número a vincular (Channelad): ${CHANNELAD_NUMBER}\n`);

  wa.initialize();

  // Capture the raw QR string (the client forwards worker events) and write a PNG.
  let qrWritten = false;
  wa.worker.on('message', (msg) => {
    if (msg && msg.event === 'QR_RECEIVED' && msg.qr) {
      qrcode
        .toFile(QR_PNG, msg.qr, { margin: 1, width: 420 })
        .then(() => {
          if (!qrWritten) {
            console.log(`\n📲  QR listo → ${QR_PNG}`);
            console.log(`   Ábrelo y escanéalo con WhatsApp del número ${CHANNELAD_NUMBER}:`);
            console.log('   WhatsApp → Dispositivos vinculados → Vincular un dispositivo.\n');
            qrWritten = true;
          }
        })
        .catch((e) => console.error('No pude escribir el PNG del QR:', e.message));
    }
  });

  const deadline = Date.now() + 10 * 60 * 1000;
  while (!wa.ready && Date.now() < deadline) await sleep(2000);

  if (wa.ready) {
    console.log('\n✅ Sesión establecida y guardada en disco. Ya puedes verificar canales sin volver a escanear.');
    console.log('   Siguiente paso (cuando chomon nos añada como admin):');
    console.log('   node _wa-verify-cocina.js chomon@gmail.com           (dry-run)');
    console.log('   node _wa-verify-cocina.js chomon@gmail.com --apply   (promueve)');
  } else {
    console.log('\n❌ No se escaneó el QR a tiempo. Reejecuta:  node _wa-session-setup.js');
  }

  try { wa.shutdown(); } catch (_) {}
  setTimeout(() => process.exit(wa.ready ? 0 : 1), 1500);
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
