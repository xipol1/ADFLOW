/*
 * _wa-track-post.js — Wire an Amazon-affiliate WhatsApp post into channelad's
 * native click-tracking mechanism, attributed to a creator's account.
 *
 * WHAT IT DOES (idempotent, find-or-create):
 *  - For each target channel × each Amazon destination, mints a TrackingLink
 *    (type 'campaign', createdBy = creator's Usuario, channel = his Canal) that
 *    302-redirects to the Amazon URL while recording clicks/devices/countries.
 *  - Because each (channel × destination) gets a UNIQUE /t/CODE, click data is
 *    separable PER CHANNEL — the whole point ("acumular datos de los canales").
 *  - The creator sees the accumulated result under his own account via
 *    GET /api/tracking/links + /links/:id/analytics (createdBy = him).
 *
 * Dry-run by default. Pass --apply to write to PRODUCTION Mongo.
 * Pass --report to just print accumulated clicks for existing links.
 *
 *   node _wa-track-post.js chomon@gmail.com            # dry-run (default channels)
 *   node _wa-track-post.js chomon@gmail.com --apply    # create the links
 *   node _wa-track-post.js chomon@gmail.com --report   # show accumulated clicks
 *   node _wa-track-post.js chomon@gmail.com --channels=all   # every airfryer ch
 */
require('dotenv').config();
const mongoose = require('mongoose');
const { connectDirect } = require('./_db-connect');

const email = process.argv[2] || 'chomon@gmail.com';
const APPLY = process.argv.includes('--apply');
const REPORT = process.argv.includes('--report');
const chArg = (process.argv.find(a => a.startsWith('--channels=')) || '').split('=')[1] || 'airfryer-es';

const TRACK_BASE = (process.env.TRACK_BASE_URL || 'https://channelad.io').replace(/\/$/, '');

// The two Amazon affiliate destinations from the post (order preserved).
const DESTINATIONS = [
  { slug: 'accesorios-freidora', label: 'Complementos / accesorios', url: 'https://amzn.to/3MN0RWh' },
  { slug: 'freidoras-oferta',    label: 'Freidoras de aire (ofertas)', url: 'https://amzn.to/3MEk2BA' },
];

// Target channels by canonical JID. Default = the two Spanish airfryer channels
// (post is airfryer + Spanish). --channels=all adds the German airfryer ones.
const CHANNELS = {
  'airfryer-es': [
    { jid: '120363195676344310@newsletter', name: 'Recetas Freidora de Aire - airfryer' },
    { jid: '120363417172015395@newsletter', name: '1001 Recetas con Freidora de Aire' },
  ],
  'airfryer-de': [
    { jid: '120363195908196684@newsletter', name: 'Rezepte für Heißluftfritteusen' },
    { jid: '120363404124457141@newsletter', name: 'Heißluftfritteusen - Rezepte' },
    { jid: '120363422305190039@newsletter', name: 'Heißluftfritteuse : 1001 Rezepte' },
  ],
};

function resolveChannels(arg) {
  if (arg === 'all') return [...CHANNELS['airfryer-es'], ...CHANNELS['airfryer-de']];
  if (CHANNELS[arg]) return CHANNELS[arg];
  // comma-separated JIDs
  return arg.split(',').map(j => ({ jid: j.trim(), name: j.trim() }));
}

const POST_TEMPLATE = `🔥 ¡Chollos de Amazon hoy! 🔥
Llévala tu Freidora de aire al siguiente nivel 🔥🍟
espera a probarla con los mejores complementos para ella a los mejores precios!! 😍👇
✅ Moldes de silicona
✅ Rejillas para cocinar en varios niveles
✅ Papel especial antiadherente
✅ Pinzas y accesorios prácticos
✅ Kits completos súper útiles
y Muchos mas.. justo lo que necesitas lo tienes..
Haz que tus recetas queden más crujientes, más fáciles y sin ensuciar 🙌✨
👉 Descubre los mejores complementos aquí:
🔗 {{accesorios-freidora}}
y si lo que estas buscando es UNA FREIDORA NUEVA!!!
desde 32 euros tienes Ofertas!!!
👉te mostramos las mejores ofertas en freidoras de aire aquí abajo
🔗{{freidoras-oferta}}`;

async function main() {
  if (!process.env.MONGODB_URI) throw new Error('MONGODB_URI no está en el entorno (.env)');
  await connectDirect(process.env.MONGODB_URI);
  console.log('✓ Conectado a Mongo\n');

  const Usuario = require('./models/Usuario');
  const Canal = require('./models/Canal');
  const TrackingLink = require('./models/TrackingLink');

  const user = await Usuario.findOne({ email }).select('_id email nombre rol').lean();
  if (!user) throw new Error(`Usuario ${email} no encontrado en prod`);
  console.log(`Creador: ${user.email}  (${user.nombre || 's/n'}, rol=${user.rol}, id=${user._id})`);

  const targets = resolveChannels(chArg);
  console.log(`Canales objetivo (${chArg}): ${targets.length}`);
  console.log(`Destinos Amazon: ${DESTINATIONS.length}`);
  console.log(`Modo: ${REPORT ? 'REPORT' : APPLY ? 'APPLY (escribe en prod)' : 'DRY-RUN (no escribe)'}\n`);
  console.log('─'.repeat(72));

  let created = 0, reused = 0, missing = 0;
  const perChannelLinks = {}; // jid -> { slug -> trackingUrl }

  for (const t of targets) {
    const canal = await Canal.findOne({
      propietario: user._id, plataforma: 'whatsapp', identificadorCanal: t.jid,
    }).select('_id nombreCanal identificadorCanal estadisticas').lean();

    console.log(`\n■ ${t.name}`);
    console.log(`  JID ${t.jid}`);
    if (!canal) {
      console.log('  ⚠ Canal NO encontrado bajo este creador — se omite. (¿onboarding pendiente?)');
      missing++;
      continue;
    }
    console.log(`  Canal ✓ id=${canal._id}  subs≈${canal.estadisticas?.suscriptores ?? canal.estadisticas?.miembros ?? '?'}`);
    perChannelLinks[t.jid] = { name: t.name };

    for (const d of DESTINATIONS) {
      // Dedup key: same creator + channel + destination + campaign type.
      let link = await TrackingLink.findOne({
        createdBy: user._id, channel: canal._id, targetUrl: d.url, type: 'campaign',
      });

      if (link) {
        reused++;
        const url = `${TRACK_BASE}/t/${link.code}`;
        perChannelLinks[t.jid][d.slug] = url;
        console.log(`    • ${d.label.padEnd(28)} ${url}  [existe · ${link.stats.totalClicks} clicks / ${link.stats.uniqueClicks} únicos]`);
        continue;
      }

      if (REPORT) {
        console.log(`    • ${d.label.padEnd(28)} (sin link aún)`);
        continue;
      }

      // Generate a unique code
      let code, attempts = 0;
      do { code = TrackingLink.generateCode(); attempts++; }
      while (await TrackingLink.exists({ code }) && attempts < 10);

      const url = `${TRACK_BASE}/t/${code}`;
      perChannelLinks[t.jid][d.slug] = url;

      if (APPLY) {
        link = await TrackingLink.create({
          code, targetUrl: d.url, createdBy: user._id, type: 'campaign', channel: canal._id,
        });
        created++;
        console.log(`    • ${d.label.padEnd(28)} ${url}  [CREADO]`);
      } else {
        created++;
        console.log(`    • ${d.label.padEnd(28)} ${url}  [se crearía]`);
      }
    }
  }

  console.log('\n' + '─'.repeat(72));
  console.log(`Resumen: ${created} ${APPLY ? 'creados' : 'a crear'} · ${reused} reutilizados · ${missing} canales sin encontrar`);

  // Emit ready-to-paste posts per channel (only when we have both links)
  if (!REPORT) {
    console.log('\n' + '═'.repeat(72));
    console.log('POSTS LISTOS PARA PUBLICAR (un enlace único por canal):');
    console.log('═'.repeat(72));
    for (const jid of Object.keys(perChannelLinks)) {
      const l = perChannelLinks[jid];
      if (!l['accesorios-freidora'] || !l['freidoras-oferta']) continue;
      let post = POST_TEMPLATE
        .replace('{{accesorios-freidora}}', l['accesorios-freidora'])
        .replace('{{freidoras-oferta}}', l['freidoras-oferta']);
      console.log(`\n### ${l.name}\n`);
      console.log(post);
      console.log('\n' + '·'.repeat(72));
    }
  }

  await mongoose.disconnect();
  console.log('\n✓ Hecho.');
}

main().catch(e => { console.error('✗', e.message); process.exit(1); });
