#!/usr/bin/env node
/**
 * scripts/manual-poll.js
 *
 * Fase 1 acceptance harness — manually exercises ChannelMetricsCollector
 * (snapshot + real-time ingest) against a real Canal document with a live
 * Baileys session. Designed for the dev box where the probe-baileys session
 * already exists at `data/baileys-probe-session/`.
 *
 * Usage:
 *   node scripts/manual-poll.js <canalId>
 *   node scripts/manual-poll.js <canalId> --listen 120
 *
 * The optional `--listen <seconds>` flag opens a real-time subscription
 * after the snapshot. Useful to verify CanalPostObservation upsert path —
 * publish a post in the channel during the window and watch the log.
 *
 * Requirements:
 *   - MONGODB_URI in env (loaded from worktree `.env` or parent `.env`)
 *   - `data/baileys-probe-session/creds.json` from a prior probe pair
 *   - Canal document with metricsIntelligence.enabled=true and a channelJid
 *     that matches a newsletter the paired phone admins
 *
 * This script does NOT touch BaileysSessionManager (which would create a
 * fresh Mongo-backed session). Capa 2 Fase 2 will wire the production path.
 */

'use strict';

const path = require('path');
const fs = require('fs');

// Multi-path .env load — worktree first, then main repo root.
{
  const candidates = [
    path.join(__dirname, '..', '.env'),
    path.join(__dirname, '..', '..', '..', '..', '.env'), // ADFLOW root from worktree depth
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) {
      require('dotenv').config({ path: p });
      break;
    }
  }
}

const mongoose = require('mongoose');
const pino = require('pino');
const baileys = require('@whiskeysockets/baileys');

const { conectar } = require('../config/database');
const Canal = require('../models/Canal');
const channelMetricsCollector = require('../services/ChannelMetricsCollector');

const SESSION_DIR = path.join(__dirname, '..', 'data', 'baileys-probe-session');
const makeWASocket = baileys.default;
const { useMultiFileAuthState, fetchLatestBaileysVersion, DisconnectReason } = baileys;

function parseArgs() {
  const args = process.argv.slice(2);
  const canalId = args[0];
  let listenSeconds = 0;
  for (let i = 1; i < args.length; i++) {
    if (args[i] === '--listen' && args[i + 1]) {
      listenSeconds = Number(args[i + 1]);
      i++;
    }
  }
  return { canalId, listenSeconds };
}

function connectBaileysWith515Restart(state, saveCreds, version, timeoutMs) {
  return new Promise((resolve, reject) => {
    let resolved = false;
    let currentSock = null;
    let attempts = 0;
    const overallT = setTimeout(() => {
      if (resolved) return;
      resolved = true;
      reject(new Error(`Baileys no llegó a 'open' tras ${timeoutMs / 1000}s`));
    }, timeoutMs);

    const build = () => {
      const s = makeWASocket({
        version,
        auth: state,
        printQRInTerminal: false,
        browser: ['ChannelAd Manual Poll', 'Chrome', '1.0.0'],
        markOnlineOnConnect: false,
        syncFullHistory: false,
        logger: pino({ level: 'silent' }),
      });
      s.ev.on('creds.update', saveCreds);
      s.ev.on('connection.update', (u) => {
        if (u.connection === 'open' && !resolved) {
          resolved = true;
          clearTimeout(overallT);
          resolve(currentSock);
        } else if (u.connection === 'close') {
          const reason = u.lastDisconnect?.error?.output?.statusCode;
          if (reason === DisconnectReason?.loggedOut) {
            if (resolved) return;
            resolved = true;
            clearTimeout(overallT);
            reject(new Error('Session loggedOut — re-run scripts/probe-channel-baileys.js to re-pair'));
            return;
          }
          if (++attempts > 4) {
            if (resolved) return;
            resolved = true;
            clearTimeout(overallT);
            reject(new Error(`too many reconnect attempts (last reason=${reason})`));
            return;
          }
          console.log(`[manual-poll] reconnecting after close (reason=${reason})`);
          setTimeout(() => { if (!resolved) currentSock = build(); }, 1500);
        }
      });
      return s;
    };
    currentSock = build();
  });
}

async function main() {
  const { canalId, listenSeconds } = parseArgs();
  if (!canalId) {
    console.error('Usage: node scripts/manual-poll.js <canalId> [--listen <seconds>]');
    process.exit(1);
  }

  if (!fs.existsSync(path.join(SESSION_DIR, 'creds.json'))) {
    console.error(`[manual-poll] No Baileys session found at ${SESSION_DIR}`);
    console.error('[manual-poll] Run scripts/probe-channel-baileys.js first to pair a device.');
    process.exit(2);
  }

  console.log('[manual-poll] Conectando a Mongo...');
  const ok = await conectar();
  if (!ok) {
    console.error('[manual-poll] No se pudo conectar a Mongo (¿MONGODB_URI definida?)');
    process.exit(3);
  }

  const canal = await Canal.findById(canalId)
    .select('_id plataforma metricsIntelligence nombreCanal')
    .lean();
  if (!canal) {
    console.error(`[manual-poll] Canal ${canalId} no encontrado`);
    await mongoose.disconnect();
    process.exit(4);
  }
  if (!canal.metricsIntelligence?.enabled) {
    console.error(`[manual-poll] Canal ${canalId} no tiene metricsIntelligence.enabled=true`);
    console.error('[manual-poll] Para activarlo manualmente en dev:');
    console.error(`  db.canales.updateOne({_id: ObjectId("${canalId}")}, { $set: {`);
    console.error(`    "metricsIntelligence.enabled": true,`);
    console.error(`    "metricsIntelligence.channelJid": "<...>@newsletter",`);
    console.error(`    "metricsIntelligence.observationStartedAt": new Date()`);
    console.error(`  }})`);
    await mongoose.disconnect();
    process.exit(5);
  }

  console.log(`[manual-poll] Canal: ${canal.nombreCanal || '(sin nombre)'} (${canal._id})`);
  console.log(`[manual-poll] channelJid: ${canal.metricsIntelligence.channelJid}`);

  console.log('[manual-poll] Conectando Baileys (file-based session)...');
  const { state, saveCreds } = await useMultiFileAuthState(SESSION_DIR);
  let version;
  try {
    const v = await fetchLatestBaileysVersion();
    version = v.version;
  } catch {
    version = [2, 3000, 1015901307];
  }
  let sock;
  try {
    sock = await connectBaileysWith515Restart(state, saveCreds, version, 120_000);
  } catch (e) {
    console.error('[manual-poll] FATAL Baileys:', e.message);
    await mongoose.disconnect();
    process.exit(6);
  }
  console.log('[manual-poll] ✓ Baileys conectado');

  // ── Snapshot ─────────────────────────────────────────────────────────────
  console.log('[manual-poll] ▶ collectSnapshot...');
  try {
    const { snapshot } = await channelMetricsCollector.collectSnapshot(canalId, sock);
    console.log('[manual-poll] ✓ snapshot persistido', {
      _id: snapshot._id?.toString(),
      subscribersCount: snapshot.subscribersCount,
      name: snapshot.name,
      verification: snapshot.verification,
      viewerRole: snapshot.viewerRole,
      pollDurationMs: snapshot.pollDurationMs,
    });
  } catch (e) {
    console.error('[manual-poll] ✗ collectSnapshot:', e.message);
  }

  // ── Real-time listen (optional) ──────────────────────────────────────────
  if (listenSeconds > 0) {
    console.log(`[manual-poll] ▶ subscribeNewsletterUpdates + listen ${listenSeconds}s`);
    try {
      await sock.subscribeNewsletterUpdates(canal.metricsIntelligence.channelJid);
    } catch (e) {
      console.error('[manual-poll] ✗ subscribe:', e.message);
    }

    const targetJid = canal.metricsIntelligence.channelJid;
    let captured = 0;
    let dropped = 0;
    sock.ev.on('messages.upsert', async (eventData) => {
      const messages = eventData?.messages || [];
      for (const msg of messages) {
        const remoteJid = msg?.key?.remoteJid;
        if (remoteJid !== targetJid) {
          dropped++;
          continue;
        }
        try {
          const r = await channelMetricsCollector.ingestRealtimePost(canalId, msg);
          captured++;
          console.log(`[manual-poll] ↪ post ingest`, {
            created: r?.created,
            serverId: msg.key.server_id,
            type: r?.doc?.type,
            bodyPreview: (r?.doc?.body || '').substring(0, 60),
          });
        } catch (e) {
          console.error(`[manual-poll] ↪ ingest error:`, e.message);
        }
      }
    });

    console.log(`[manual-poll] ▼ PUBLICA AHORA un post en el canal (${listenSeconds}s)`);
    await new Promise((r) => setTimeout(r, listenSeconds * 1000));
    console.log(`[manual-poll] ✓ ventana cerrada — ${captured} posts ingest, ${dropped} eventos no-canal descartados`);
  }

  try { sock.end?.(); } catch (_) {}
  await mongoose.disconnect().catch(() => {});
  setTimeout(() => process.exit(0), 3000).unref();
}

main().catch(async (err) => {
  console.error('[manual-poll] FATAL no manejado:', err);
  try { await mongoose.disconnect(); } catch (_) {}
  process.exit(1);
});
