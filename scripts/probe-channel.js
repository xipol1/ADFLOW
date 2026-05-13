#!/usr/bin/env node
/**
 * scripts/probe-channel.js
 *
 * One-shot diagnostic for Capa 2 schema design. Runs through every IPC
 * method whatsappAdmin exposes against a real verified WhatsApp channel,
 * and dumps raw Message objects (whatsapp-web.js) so we can see what the
 * library actually surfaces — reactions shape, forwardingScore, channel
 * metadata, subscriber count, etc.
 *
 *   Auto mode:  node scripts/probe-channel.js
 *               → picks the first Canal with botConfig.whatsapp.adminAccess=true
 *
 *   Manual:     node scripts/probe-channel.js 120363xxx@newsletter
 *               → uses the provided channelId directly
 *
 * Output: stdout summary + full JSON dump in logs/probe-<id>-<ts>.json.
 *
 * MUST be run on the VPS where the whatsapp-web.js LocalAuth session lives.
 * Locally it would just hang waiting for a QR scan.
 */

'use strict';

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const { conectar } = require('../config/database');
const whatsappAdmin = require('../services/WhatsAppAdminClient');
const Canal = require('../models/Canal');

const READY_TIMEOUT_MS = 120_000;
const LOG_DIR = path.join(__dirname, '..', 'logs');

function waitForReady(timeoutMs) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const tick = () => {
      if (whatsappAdmin.ready) return resolve();
      if (Date.now() - t0 > timeoutMs) {
        return reject(new Error(`worker no llegó a READY tras ${timeoutMs / 1000}s`));
      }
      setTimeout(tick, 500);
    };
    tick();
  });
}

async function runStep(findings, name, fn) {
  console.log(`[probe] ▶ ${name}`);
  const t0 = Date.now();
  try {
    const result = await fn();
    const ms = Date.now() - t0;
    findings.steps[name] = { ok: true, ms, result };
    console.log(`[probe] ✓ ${name} (${ms}ms)`);
    return result;
  } catch (e) {
    findings.steps[name] = { ok: false, ms: Date.now() - t0, error: e.message, stack: e.stack };
    console.error(`[probe] ✗ ${name}: ${e.message}`);
    return null;
  }
}

function extractMessageId(rawMsg) {
  return (
    rawMsg?.probedGetters?.id?._serialized ||
    rawMsg?.probedGetters?.id ||
    rawMsg?.raw?.id?._serialized ||
    rawMsg?.raw?._data?.id?._serialized ||
    null
  );
}

async function main() {
  const argvId = process.argv[2];

  // Mongo is only needed for auto-pick (no argv). When the JID is provided
  // explicitly we operate purely against the worker — no DB lookup required.
  // This lets the probe run in environments without MONGODB_URI (e.g. local
  // dev with a freshly-paired worker session).
  let channelId = argvId;
  let canalDoc = null;

  if (!channelId) {
    const ok = await conectar();
    if (!ok) {
      console.error('[probe] No se pudo conectar a MongoDB. ¿MONGODB_URI definida?');
      console.error('[probe] Tip: pasa el JID como argv para saltar Mongo.');
      process.exit(2);
    }
    console.log('[probe] Mongo conectado');

    canalDoc = await Canal.findOne({
      plataforma: 'whatsapp',
      'botConfig.whatsapp.adminAccess': true,
      'botConfig.whatsapp.channelId': { $exists: true, $nin: ['', null] },
    })
      .select('_id nombreCanal identificadorCanal botConfig.whatsapp')
      .lean();

    if (!canalDoc) {
      console.error('[probe] No hay ningún Canal whatsapp con adminAccess=true en la DB. Pásalo por argv.');
      await mongoose.disconnect();
      process.exit(3);
    }
    channelId = canalDoc.botConfig.whatsapp.channelId;
    console.log('[probe] Canal auto-picked:', {
      _id: canalDoc._id.toString(),
      nombre: canalDoc.nombreCanal,
      channelId,
    });
  } else {
    console.log('[probe] Usando channelId de argv:', channelId);
    console.log('[probe] (Modo argv — Mongo no se conectará)');
  }

  console.log('[probe] Iniciando worker whatsapp-web.js...');
  whatsappAdmin.initialize();
  try {
    await waitForReady(READY_TIMEOUT_MS);
  } catch (e) {
    console.error('[probe] FATAL:', e.message);
    console.error('[probe] Si es la primera vez, escanea el QR que sale en stdout del worker.');
    await mongoose.disconnect();
    process.exit(4);
  }
  console.log('[probe] Worker READY');

  const findings = {
    channelId,
    canalId: canalDoc?._id?.toString() || null,
    canalNombre: canalDoc?.nombreCanal || null,
    startedAt: new Date().toISOString(),
    nodeVersion: process.version,
    steps: {},
  };

  await runStep(findings, 'health', () => whatsappAdmin.healthCheck());
  await runStep(findings, 'channelInfo', () => whatsappAdmin.getChannelInfo(channelId));
  await runStep(findings, 'adminAccess', () => whatsappAdmin.verifyAdminAccess(channelId));
  await runStep(findings, 'followers', () => whatsappAdmin.getChannelFollowers(channelId));
  await runStep(findings, 'recentPostsCurated', () => whatsappAdmin.getRecentPosts(channelId, 5));
  const rawInspect = await runStep(findings, 'inspectRaw', () =>
    whatsappAdmin.inspectChannelMessagesRaw(channelId, 20)
  );

  // Probe readPostMetrics on first 3 message IDs discovered above.
  if (rawInspect?.messages?.length) {
    const ids = rawInspect.messages.map(extractMessageId).filter(Boolean).slice(0, 3);
    if (ids.length === 0) {
      findings.steps.readPostMetricsSample = { ok: false, error: 'no se pudo extraer ningún message ID del inspectRaw' };
      console.warn('[probe] ⚠ no message IDs extractables — revisa rawInspect.messages[*].probedGetters.id');
    } else {
      findings.steps.readPostMetricsSample = { ok: true, results: [] };
      for (const id of ids) {
        console.log(`[probe] ▶ readPostMetrics(${id.substring(0, 40)}...)`);
        try {
          const r = await whatsappAdmin.readPostMetrics(channelId, id);
          findings.steps.readPostMetricsSample.results.push({ id, ok: true, result: r });
        } catch (e) {
          findings.steps.readPostMetricsSample.results.push({ id, ok: false, error: e.message });
        }
      }
    }
  }

  findings.finishedAt = new Date().toISOString();

  // ─── Capability summary — what whatsapp-web.js actually exposes ────────────
  const summary = {
    channelInfoFields: Object.keys(findings.steps.channelInfo?.result || {}),
    adminAccessFields: Object.keys(findings.steps.adminAccess?.result || {}),
    followersFields: Object.keys(findings.steps.followers?.result || {}),
    firstMessage: {},
  };
  const first = rawInspect?.messages?.[0];
  if (first) {
    summary.firstMessage = {
      ownKeys: first.ownKeys,
      protoKeysCount: first.protoKeys?.length || 0,
      protoKeysSample: (first.protoKeys || []).slice(0, 50),
      getterFieldsPresent: Object.keys(first.probedGetters || {}),
      reactionsType: typeof first.probedGetters?.reactions,
      hasReactionsField: 'reactions' in (first.probedGetters || {}),
      hasForwardingScore: 'forwardingScore' in (first.probedGetters || {}),
      hasViews: 'views' in (first.probedGetters || {}),
      hasAuthor: 'author' in (first.probedGetters || {}),
      hasLinks: 'links' in (first.probedGetters || {}),
      bodyLength: typeof first.probedGetters?.body === 'string' ? first.probedGetters.body.length : 0,
      methodsAvailable: first.hasMethods,
    };
  }
  findings.summary = summary;

  fs.mkdirSync(LOG_DIR, { recursive: true });
  const cleanId = channelId.replace(/[^a-z0-9]/gi, '_').substring(0, 60);
  const outPath = path.join(LOG_DIR, `probe-${cleanId}-${Date.now()}.json`);
  fs.writeFileSync(outPath, JSON.stringify(findings, null, 2));

  console.log('\n[probe] ═══════════════════════════════════════════════════');
  console.log('[probe] SUMMARY');
  console.log('[probe] ───────────────────────────────────────────────────');
  console.log(JSON.stringify(summary, null, 2));
  console.log('[probe] ───────────────────────────────────────────────────');
  console.log(`[probe] Dump completo: ${outPath}`);
  console.log('[probe] ═══════════════════════════════════════════════════');

  whatsappAdmin.shutdown();
  await mongoose.disconnect().catch(() => {});

  setTimeout(() => process.exit(0), 6000).unref();
}

main().catch(async (err) => {
  console.error('[probe] FATAL no manejado:', err);
  try { whatsappAdmin.shutdown(); } catch {}
  try { await mongoose.disconnect(); } catch {}
  setTimeout(() => process.exit(1), 6000).unref();
});
