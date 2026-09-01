/**
 * Grant or revoke beta access from the command line.
 *
 * Replaces scripts/grantBetaAccess.js, which was hardcoded to two demo emails
 * and had no way to grant access to a real user.
 *
 *   node scripts/grant-beta.js --email chomon@example.com --reason "16 canales cocina"
 *   node scripts/grant-beta.js --email a@b.com --revoke
 *   node scripts/grant-beta.js --email a@b.com --reason "..." --email c@d.com
 *   node scripts/grant-beta.js --email a@b.com --dry-run
 *
 * Flags:
 *   --email <addr>   Repeatable. At least one required.
 *   --reason <text>  Recorded on the user and in the audit log.
 *   --revoke         Take access away instead of granting it.
 *   --no-email       Grant without sending the notification email.
 *   --dry-run        Show what would change and exit without writing.
 *
 * Requires MONGODB_URI in the environment (or .env).
 */
require('dotenv').config();
const mongoose = require('mongoose');

function parseArgs(argv) {
  const opts = { emails: [], reason: '', revoke: false, sendEmail: true, dryRun: false };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--email') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--email necesita un valor');
      opts.emails.push(value.trim().toLowerCase());
      i += 1;
    } else if (arg === '--reason') {
      const value = argv[i + 1];
      if (!value || value.startsWith('--')) throw new Error('--reason necesita un valor');
      opts.reason = value;
      i += 1;
    } else if (arg === '--revoke') {
      opts.revoke = true;
    } else if (arg === '--no-email') {
      opts.sendEmail = false;
    } else if (arg === '--dry-run') {
      opts.dryRun = true;
    } else {
      throw new Error(`Opción desconocida: ${arg}`);
    }
  }
  if (opts.emails.length === 0) throw new Error('Se requiere al menos un --email');
  return opts;
}

async function run() {
  let opts;
  try {
    opts = parseArgs(process.argv.slice(2));
  } catch (err) {
    console.error(`❌  ${err.message}`);
    console.error('\nUso: node scripts/grant-beta.js --email <addr> [--reason <text>] [--revoke] [--no-email] [--dry-run]');
    process.exit(1);
  }

  if (!process.env.MONGODB_URI) {
    console.error('❌  MONGODB_URI no está definida. Añádela al .env o expórtala.');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  const Usuario = require('../models/Usuario');

  const conceder = !opts.revoke;
  let cambiados = 0;

  for (const email of opts.emails) {
    const user = await Usuario.findOne({ email }).select('email nombre rol betaAccess subscription');
    if (!user) {
      console.log(`  –  ${email}: no existe, saltado`);
      continue;
    }
    if (user.betaAccess === conceder) {
      console.log(`  =  ${email}: ya ${conceder ? 'tiene' : 'no tiene'} acceso, sin cambios`);
      continue;
    }
    if (opts.dryRun) {
      console.log(`  ~  ${email}: se ${conceder ? 'concedería' : 'retiraría'} el acceso (dry-run)`);
      cambiados += 1;
      continue;
    }

    const betaGrant = require('../lib/betaGrant');
    const updates = conceder
      ? betaGrant.construirConcesion(user, { grantedBy: null, motivo: opts.reason || 'CLI' })
      : betaGrant.construirRevocacion(user);
    Object.assign(user, updates);
    await user.save();
    cambiados += 1;
    const plan = updates.subscription?.plan;
    console.log(`  ✓  ${email}: acceso ${conceder ? 'concedido' : 'retirado'}${plan ? ` (+ ${plan} de cortesia)` : ''}`);

    try {
      const authAudit = require('../lib/authAudit');
      await authAudit.record(conceder ? 'beta.granted' : 'beta.revoked', null, {
        userId: user._id,
        email: user.email,
        metadata: { rol: user.rol, motivo: opts.reason || 'CLI', origen: 'cli' },
      });
    } catch (err) {
      console.warn(`     (auditoría no registrada: ${err?.message || err})`);
    }

    if (conceder && opts.sendEmail) {
      try {
        const emailService = require('../services/emailService');
        await emailService.enviarAccesoBeta(user);
        console.log('     email de aviso enviado');
      } catch (err) {
        console.warn(`     ⚠ email NO enviado: ${err?.message || err}`);
      }
    }
  }

  console.log(`\n${cambiados} usuario(s) ${opts.dryRun ? 'a cambiar' : 'actualizado(s)'}.`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error('grant-beta falló:', err?.message || err);
  process.exit(1);
});
