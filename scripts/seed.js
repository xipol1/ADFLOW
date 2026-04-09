/**
 * Seed script — creates the 3 platform test users in MongoDB.
 * Run: node scripts/seed.js
 * Safe to re-run: skips users that already exist.
 */
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error('❌  MONGODB_URI not set. Add it to .env or export it before running.');
  process.exit(1);
}

const UserSchema = new mongoose.Schema({
  nombre: String,
  email: { type: String, unique: true, lowercase: true },
  password: String,
  rol: { type: String, enum: ['creator', 'advertiser', 'admin'], default: 'advertiser' },
  emailVerificado: { type: Boolean, default: false },
  activo: { type: Boolean, default: true },
  betaAccess: { type: Boolean, default: false },
  perfilAnunciante: { type: mongoose.Schema.Types.Mixed, default: {} },
  perfilCreador:    { type: mongoose.Schema.Types.Mixed, default: {} },
}, { timestamps: true });

const Usuario = mongoose.models.Usuario || mongoose.model('Usuario', UserSchema);

const USERS = [
  {
    nombre: 'Admin ADFLOW',
    email: 'admin@adflow.com',
    password: 'Admin2026x',
    rol: 'admin',
    emailVerificado: true,
    betaAccess: true,
  },
  {
    nombre: 'Creator Demo',
    email: 'creator@adflow.com',
    password: 'Creator2026x',
    rol: 'creator',
    emailVerificado: true,
    betaAccess: true,
  },
  {
    nombre: 'Advertiser Demo',
    email: 'advertiser@adflow.com',
    password: 'Advert2026x',
    rol: 'advertiser',
    emailVerificado: true,
    betaAccess: true,
    perfilAnunciante: { nombreEmpresa: 'Demo Company SL' },
  },
];

async function seed() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(MONGODB_URI, { serverSelectionTimeoutMS: 15000 });
  console.log('Connected.\n');

  for (const u of USERS) {
    const exists = await Usuario.findOne({ email: u.email });
    if (exists) {
      // Upgrade existing seeded users in place: make sure they carry the
      // betaAccess flag even if the seed ran before the field existed.
      let changed = false;
      if (exists.betaAccess !== true) {
        exists.betaAccess = true;
        changed = true;
      }
      if (changed) {
        await exists.save();
        console.log(`  UPDATE ${u.email} (betaAccess=true)`);
      } else {
        console.log(`  SKIP   ${u.email} (already exists, rol: ${exists.rol})`);
      }
      continue;
    }
    const hashed = await bcrypt.hash(u.password, 12);
    await Usuario.create({ ...u, password: hashed });
    console.log(`  CREATE ${u.email}  [${u.rol}]  betaAccess=${u.betaAccess === true}`);
  }

  console.log('\nSeed complete.');
  await mongoose.disconnect();
}

seed().catch(err => {
  console.error('Seed failed:', err.message || err);
  process.exit(1);
});
