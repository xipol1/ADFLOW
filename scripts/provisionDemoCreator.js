/**
 * Provision a demo channel with scoring data for the creator@channelad.io user.
 * Also marks the 3 @channelad.io users as email-verified so they can
 * use all dashboard features.
 *
 *   MONGODB_URI=<prod-uri> node scripts/provisionDemoCreator.js
 *
 * Safe to re-run: skips channel if it already exists.
 */
require('dotenv').config();
const mongoose = require('mongoose');

async function run() {
  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI not set.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected to MongoDB.\n');

  const Canal = require('../models/Canal');
  const Usuario = require('../models/Usuario');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

  // ── 1. Mark all 3 demo users as email-verified ──────────────────────
  const demoEmails = ['admin@channelad.io', 'creator@channelad.io', 'advertiser@channelad.io'];
  const verifyResult = await Usuario.updateMany(
    { email: { $in: demoEmails }, emailVerificado: { $ne: true } },
    { $set: { emailVerificado: true, emailVerificationToken: null, emailVerificationExpires: null } }
  );
  console.log(`Email verified: ${verifyResult.modifiedCount} users updated`);

  // ── 2. Find the creator user ────────────────────────────────────────
  const creator = await Usuario.findOne({ email: 'creator@channelad.io' });
  if (!creator) {
    console.error('❌  creator@channelad.io not found. Run scripts/seed.js first or register the user.');
    await mongoose.disconnect();
    process.exit(1);
  }
  console.log(`Creator found: ${creator._id}`);

  // ── 3. Create demo channel (skip if exists) ─────────────────────────
  const existing = await Canal.findOne({
    propietario: creator._id,
    identificadorCanal: 'channelad_demo',
  });

  let channel;
  if (existing) {
    console.log(`Channel already exists: ${existing._id} — updating scores`);
    channel = existing;
  } else {
    channel = await Canal.create({
      propietario: creator._id,
      plataforma: 'telegram',
      identificadorCanal: 'channelad_demo',
      nombreCanal: 'ChannelAd Demo',
      descripcion: 'Canal demo de marketing digital — analytics dashboard',
      categoria: 'marketing',
      estado: 'activo',
      estadisticas: { seguidores: 28500, ultimaActualizacion: new Date() },
      precio: 350,
      verificado: true,
      idioma: 'es',
      tags: ['marketing', 'publicidad', 'comunidades'],
      disponibilidad: {
        maxPublicacionesMes: 20,
        diasSemana: [1, 2, 3, 4, 5],
        horarioPreferido: { desde: '09:00', hasta: '21:00' },
        antelacionMinima: 2,
      },
    });
    console.log(`Channel created: ${channel._id}`);
  }

  // ── 4. Set scoring data on the channel ──────────────────────────────
  channel.CAF = 72;
  channel.CTF = 81;
  channel.CER = 68;
  channel.CVS = 55;
  channel.CAP = 74;
  channel.CAS = 74;
  channel.nivel = 'GOLD';
  channel.CPMDinamico = 15.8;
  channel.verificacion = {
    tipoAcceso: 'bot_miembro',
    confianzaScore: 78,
  };
  channel.antifraude = {
    ratioCTF_CAF: 0.88,
    flags: [],
    ultimaRevision: new Date(),
  };
  await channel.save();
  console.log('Scoring data applied: CAS 74 GOLD');

  // ── 5. Generate 60 days of snapshot history ─────────────────────────
  const existingSnapshots = await CanalScoreSnapshot.countDocuments({ canalId: channel._id });
  if (existingSnapshots >= 30) {
    console.log(`Snapshots already exist (${existingSnapshots}) — skipping generation`);
  } else {
    // Clear any partial snapshots
    await CanalScoreSnapshot.deleteMany({ canalId: channel._id });

    const snapshots = [];
    const now = Date.now();
    for (let i = 59; i >= 0; i--) {
      const fecha = new Date(now - i * 86400000);
      // Simulate gradual improvement with some noise
      const progress = (60 - i) / 60; // 0 → 1
      const noise = () => Math.round((Math.random() - 0.5) * 6);
      const clamp = (v) => Math.max(0, Math.min(100, v));

      snapshots.push({
        canalId: channel._id,
        fecha,
        CAF: clamp(55 + Math.round(progress * 17) + noise()),
        CTF: clamp(62 + Math.round(progress * 19) + noise()),
        CER: clamp(50 + Math.round(progress * 18) + noise()),
        CVS: clamp(40 + Math.round(progress * 15) + noise()),
        CAP: clamp(58 + Math.round(progress * 16) + noise()),
        CAS: clamp(55 + Math.round(progress * 19) + noise()),
        nivel: progress > 0.7 ? 'GOLD' : progress > 0.4 ? 'SILVER' : 'BRONZE',
        CPMDinamico: 22 - progress * 6.2,
        confianzaScore: clamp(55 + Math.round(progress * 23)),
        ratioCTF_CAF: 0.75 + progress * 0.13,
        flags: [],
        seguidores: Math.round(18000 + progress * 10500),
        nicho: 'marketing',
        plataforma: 'telegram',
        version: 2,
      });
    }

    await CanalScoreSnapshot.insertMany(snapshots);
    console.log(`${snapshots.length} snapshots created (60-day history)`);
  }

  console.log('\n✅ Demo creator provisioned successfully!');
  console.log(`   Channel: ${channel.nombreCanal} (${channel._id})`);
  console.log(`   CAS: ${channel.CAS} (${channel.nivel})`);
  console.log(`   CPM: €${channel.CPMDinamico}`);
  console.log(`   Snapshots: 60 days of history`);
  console.log(`   Email verified: all 3 demo users`);

  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('Provision failed:', err?.message || err);
  process.exit(1);
});
