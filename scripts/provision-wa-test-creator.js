/**
 * provision-wa-test-creator.js — prepara un creator free user listo para
 * probar el flow LinkWhatsApp.
 *
 * Crea (idempotente):
 *   1) Usuario: wa-test@channelad.io / WaTest2026x  (rol=creator, beta=true,
 *      email verified, activo)
 *   2) Canal placeholder WhatsApp propiedad de este usuario, sin
 *      newsletter linkeado (estado='pendiente_verificacion'). Es el target
 *      del flow: cuando el creator escanea el QR y elige un newsletter
 *      en LinkWhatsAppPage, lo vincula a este Canal.
 *
 * Run: node scripts/provision-wa-test-creator.js
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const Usuario = require('../models/Usuario');
const Canal = require('../models/Canal');

const EMAIL = 'wa-test@channelad.io';
const PASSWORD = 'WaTest2026x';

(async () => {
  if (!process.env.MONGODB_URI) { console.error('❌ MONGODB_URI missing'); process.exit(1); }
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('✅ Mongo conectado\n');

  // ── 1. Usuario ───────────────────────────────────────────────────────────
  let user = await Usuario.findOne({ email: EMAIL });
  if (user) {
    let changed = false;
    if (user.rol !== 'creator')      { user.rol = 'creator'; changed = true; }
    if (user.emailVerificado !== true) { user.emailVerificado = true; changed = true; }
    if (user.activo !== true)        { user.activo = true; changed = true; }
    if (user.betaAccess !== true)    { user.betaAccess = true; changed = true; }
    // Re-set password to known value in case user was created with another
    user.password = await bcrypt.hash(PASSWORD, 12);
    changed = true;
    if (changed) await user.save();
    console.log(`Usuario UPDATED: ${user._id}`);
  } else {
    const hashed = await bcrypt.hash(PASSWORD, 12);
    user = await Usuario.create({
      email: EMAIL,
      password: hashed,
      nombre: 'WA',
      apellido: 'Test Creator',
      rol: 'creator',
      tipoPerfil: 'individual',
      emailVerificado: true,
      activo: true,
      betaAccess: true,
    });
    console.log(`Usuario CREATED: ${user._id}`);
  }

  // ── 2. Canal placeholder WhatsApp ───────────────────────────────────────
  let canal = await Canal.findOne({
    propietario: user._id,
    plataforma: 'whatsapp',
    nombreCanal: 'WA Test Channel (placeholder)',
  });
  if (canal) {
    console.log(`Canal placeholder EXISTS: ${canal._id}`);
  } else {
    canal = await Canal.create({
      propietario: user._id,
      plataforma: 'whatsapp',
      // Placeholder identificadorCanal — al vincular el newsletter, el
      // controlador linkNewsletterToCanal escribirá botConfig.whatsapp.channelJid
      // con el JID real. identificadorCanal no se sobrescribe.
      identificadorCanal: `wa-test-placeholder-${user._id.toString().slice(-6)}`,
      nombreCanal: 'WA Test Channel (placeholder)',
      descripcion: 'Canal de prueba para validar el flow LinkWhatsApp + whatsappIntelService end-to-end',
      categoria: 'medios_comunicacion',
      idioma: 'es',
      estado: 'pendiente_verificacion',
      verificado: false,
      tags: ['wa_test_flow'],
    });
    console.log(`Canal placeholder CREATED: ${canal._id}`);
  }

  // ── Resumen ───────────────────────────────────────────────────────────────
  console.log('\n═══════════════════════════════════════════════════════════');
  console.log('  CREDENCIALES DE PRUEBA');
  console.log('═══════════════════════════════════════════════════════════');
  console.log(`  Email:    ${EMAIL}`);
  console.log(`  Password: ${PASSWORD}`);
  console.log(`  Rol:      creator (beta enabled, email verified)`);
  console.log(`  user _id: ${user._id}`);
  console.log(`  canal _id: ${canal._id}`);
  console.log(`  canal nombre: ${canal.nombreCanal}`);
  console.log('═══════════════════════════════════════════════════════════');

  await mongoose.disconnect();
  process.exit(0);
})().catch((e) => {
  console.error('💥 Fatal:', e.message);
  process.exit(1);
});
