#!/usr/bin/env node
/**
 * Backlog promotion — promote relevant `pending_review` ChannelCandidates that
 * have NO Canal yet (orphans) into unclaimed Canal documents.
 *
 * WHY
 * ---
 * The discovery pipeline left ~1,023 orphan candidates (telegram never auto-
 * creates a Canal; some WA/Discord sources only created the candidate). Most of
 * that backlog is off-target/low-quality, so we promote only the subset that is
 *   (a) Spanish-language (title/description), no non-Latin script,
 *   (b) clean name (no HTML/mojibake),
 *   (c) reachable (telegram username / WA invite or code / discord invite or id),
 *   (d) not already a Canal (by identifier OR by name within platform).
 *
 * Creation mirrors the proven paths:
 *   - Telegram → routes/channelCandidates.js approve endpoint (calcularCAS + snapshot)
 *   - WhatsApp/Discord → scripts/run-multiplatform-discovery.js persist* (catalog row)
 * All rows are unclaimed (claimed:false, propietario:null), estado 'activo'.
 *
 * SAFETY: dry-run by default. Pass --apply to write. --limit N caps writes.
 *
 *   node scripts/promote-backlog.js                # dry-run, report only
 *   node scripts/promote-backlog.js --apply        # live writes
 *   node scripts/promote-backlog.js --apply --limit 20
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const APPLY = args.includes('--apply');
const LIMIT = (() => { const i = args.indexOf('--limit'); return i >= 0 ? Number(args[i + 1]) : Infinity; })();

// ── Relevance heuristics (kept identical to the sizing probe) ──────────────
const NON_LATIN = /[؀-ۿЀ-ӿऀ-ॿ一-鿿가-힯֐-׿฀-๿ሀ-፿]/;
const SPANISH_TOKENS = /\b(espa[nñ]ol|canal|grupo|gratis|noticias|recetas?|cocina|diet[ao]|salud|finanzas|cripto(monedas)?|inversi[oó]n(es)?|negocios?|emprendimiento|comunidad|ofertas?|descuentos?|trucos?|consejos?|aprende|curso|empleo|trabajo|f[uú]tbol|m[uú]sica|peliculas?|series|memes?|humor|tecnolog[ií]a|marketing|viajes?|moda|belleza|fitness|mascotas)\b/i;
const SPANISH_CHARS = /[ñ¿¡]|(?:ci[oó]n\b)/i;
const BAD_NAME = /<|>|&#|Ã|Ð|ð|š|�/;

function isSpanish(text) {
  const t = (text || '').toLowerCase();
  if (!t) return false;
  if (NON_LATIN.test(t)) return false;
  return SPANISH_CHARS.test(t) || SPANISH_TOKENS.test(t);
}

function cleanCategory(cat) {
  const c = (cat || '').trim();
  if (!c || c.length > 24 || /[<>]/.test(c)) return '';
  return c.toLowerCase();
}

// ── Per-platform Canal builders (mirror existing creation paths) ───────────
function buildTelegramCanal(c, Canal) {
  const m = c.raw_metrics || {};
  const username = (c.username || '').replace(/^@/, '');
  const subs = m.subscribers || 0;
  const avgViews = m.avg_views || 0;
  const verified = m.verified || false;
  const cat = cleanCategory(m.category);

  let scores = { CAF: 50, CTF: 50, CER: 50, CVS: 50, CAP: 50, CAS: 50, nivel: 'BRONZE', CPMDinamico: 0, confianzaScore: 30, ratioCTF_CAF: 1, flags: [] };
  try {
    const { calcularCAS } = require('../services/channelScoringV2');
    const mockCanal = {
      plataforma: 'telegram',
      categoria: cat,
      estadisticas: { seguidores: subs, promedioVisualizaciones: avgViews },
      verificacion: { tipoAcceso: verified ? 'tracking_url' : 'declarado' },
      antifraude: { flags: [] },
      crawler: { ultimoPostNum: null, urlPublica: `https://t.me/${username}` },
    };
    scores = calcularCAS(mockCanal, [], cat || 'otros');
  } catch (err) { /* keep defaults */ }

  const doc = {
    propietario: null,
    plataforma: 'telegram',
    identificadorCanal: `@${username}`,
    nombreCanal: m.title || username,
    categoria: cat,
    descripcion: (m.description || '').slice(0, 500),
    estado: 'activo',
    claimed: false,
    idioma: 'es',
    estadisticas: { seguidores: subs, ultimaActualizacion: new Date() },
    CAF: scores.CAF, CTF: scores.CTF, CER: scores.CER, CVS: scores.CVS, CAP: scores.CAP, CAS: scores.CAS,
    nivel: scores.nivel, CPMDinamico: scores.CPMDinamico,
    verificacion: { confianzaScore: scores.confianzaScore || 30, tipoAcceso: 'declarado' },
    antifraude: { ratioCTF_CAF: scores.ratioCTF_CAF, flags: scores.flags || [] },
    crawler: { urlPublica: `https://t.me/${username}`, ultimaActualizacion: new Date() },
  };
  return { doc, scores, subs, cat, avgViews };
}

function buildSimpleCanal(c, plataforma) {
  const m = c.raw_metrics || {};
  const subs = m.followers || m.members || 0;
  return {
    doc: {
      propietario: null,
      plataforma,
      identificadorCanal: c.username,
      nombreCanal: m.title || '',
      descripcion: (m.description || '').slice(0, 500),
      categoria: cleanCategory(m.category),
      estado: 'activo',
      claimed: false,
      claimedBy: null,
      idioma: 'es',
      estadisticas: { seguidores: subs, ultimaActualizacion: new Date() },
      identificadores: plataforma === 'discord' ? { serverId: m.serverId || '' } : {},
      crawler: { ultimaActualizacion: new Date(), urlPublica: m.inviteLink || '' },
      verificacion: { tipoAcceso: 'declarado', confianzaScore: 20 },
    },
    subs,
  };
}

function reachable(plat, c) {
  const m = c.raw_metrics || {};
  if (plat === 'telegram') return !!(c.username || '').replace(/^@/, '');
  if (plat === 'whatsapp') return !!(m.inviteLink || m.channelCode);
  if (plat === 'discord') return !!(m.inviteLink || m.serverId);
  return false;
}

(async () => {
  console.log(`\n=== promote-backlog ${APPLY ? 'LIVE (--apply)' : 'DRY-RUN'} ${LIMIT !== Infinity ? '(limit ' + LIMIT + ')' : ''} ===\n`);
  await mongoose.connect(process.env.MONGODB_URI, { serverSelectionTimeoutMS: 25000 });
  const ChannelCandidate = require('../models/ChannelCandidate');
  const Canal = require('../models/Canal');
  const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

  // Dedup sets
  const allCanales = await Canal.find({}).select('identificadorCanal nombreCanal plataforma').lean();
  const idSet = new Set(allCanales.map((x) => (x.identificadorCanal || '').toLowerCase().replace(/^@/, '')));
  const nameSet = new Set(allCanales.map((x) => `${x.plataforma}|${(x.nombreCanal || '').trim().toLowerCase()}`));

  const pend = await ChannelCandidate.find({ status: 'pending_review' }).lean();

  const summary = { telegram: 0, whatsapp: 0, discord: 0 };
  const skip = { has_canal: 0, not_reachable: 0, not_spanish: 0, bad_name: 0, dup_name: 0, error: 0 };
  let created = 0;
  const samples = [];

  for (const c of pend) {
    if (created >= LIMIT) break;
    const plat = (c.plataforma && c.plataforma !== '') ? c.plataforma : 'telegram';
    if (!['telegram', 'whatsapp', 'discord'].includes(plat)) { continue; }

    const m = c.raw_metrics || {};
    const uKey = (c.username || '').toLowerCase().replace(/^@/, '');
    if (idSet.has(uKey)) { skip.has_canal++; continue; }            // already a Canal (not orphan)
    if (!reachable(plat, c)) { skip.not_reachable++; continue; }
    const title = m.title || '';
    if (!title || BAD_NAME.test(title)) { skip.bad_name++; continue; }
    if (!isSpanish(title + ' ' + (m.description || ''))) { skip.not_spanish++; continue; }
    if (nameSet.has(`${plat}|${title.trim().toLowerCase()}`)) { skip.dup_name++; continue; }

    // Passes the relevance filter → build the Canal doc.
    let built;
    if (plat === 'telegram') built = buildTelegramCanal(c, Canal);
    else built = buildSimpleCanal(c, plat);

    if (samples.length < 25) samples.push(`${plat.padEnd(9)} subs=${String(built.subs).padStart(7)} [${built.cat || built.doc.categoria || '-'}] ${(built.doc.nombreCanal || '').slice(0, 38)}`);

    if (APPLY) {
      try {
        // Belt-and-suspenders: the {plataforma, identificadorCanal} index is
        // NOT unique for unclaimed canals, so guard every create with a live DB
        // existence check (not just the in-memory set) right before writing.
        const liveDup = await Canal.findOne({ plataforma: plat, identificadorCanal: built.doc.identificadorCanal })
          .select('_id').lean();
        if (liveDup) { skip.has_canal++; idSet.add(uKey); continue; }

        const canal = await Canal.create(built.doc);
        if (plat === 'telegram' && built.scores) {
          await CanalScoreSnapshot.create({
            canalId: canal._id, fecha: new Date(),
            CAF: built.scores.CAF, CTF: built.scores.CTF, CER: built.scores.CER,
            CVS: built.scores.CVS, CAP: built.scores.CAP, CAS: built.scores.CAS,
            nivel: built.scores.nivel, CPMDinamico: built.scores.CPMDinamico,
            confianzaScore: built.scores.confianzaScore || 30,
            ratioCTF_CAF: built.scores.ratioCTF_CAF,
            flags: built.scores.flags || [],
            seguidores: built.subs, nicho: built.cat || 'otros', plataforma: 'telegram', version: 2,
            telegramIntel: {
              avg_views_last_20_posts: built.avgViews || null,
              engagement_rate: (built.subs > 0 && built.avgViews > 0 ? built.avgViews / built.subs : null),
              post_frequency_per_week: m.post_frequency || null,
            },
          }).catch(() => {});
        }
        await ChannelCandidate.updateOne({ _id: c._id }, { $set: { status: 'approved', canal_id: canal._id, reviewed_at: new Date() } });
        // keep dedup sets fresh so a dup later in the loop is caught
        idSet.add(uKey);
        nameSet.add(`${plat}|${title.trim().toLowerCase()}`);
      } catch (err) {
        skip.error++;
        if (skip.error <= 5) console.error(`  ✗ ${plat} ${c.username}: ${err.message}`);
        continue;
      }
    }
    summary[plat]++;
    created++;
  }

  console.log('Would create' + (APPLY ? 'd' : '') + ' by platform:');
  for (const [p, n] of Object.entries(summary)) console.log(`  ${p.padEnd(10)}: ${n}`);
  console.log(`  TOTAL     : ${created}`);
  console.log('\nSkipped:');
  for (const [r, n] of Object.entries(skip)) console.log(`  ${r.padEnd(14)}: ${n}`);
  console.log('\nSamples:');
  samples.forEach((s) => console.log('  ' + s));
  console.log(`\nNOW: ${new Date().toISOString()}  mode=${APPLY ? 'APPLIED' : 'DRY-RUN'}`);

  await mongoose.disconnect();
})().catch((e) => { console.error('FATAL:', e.message); process.exit(1); });
