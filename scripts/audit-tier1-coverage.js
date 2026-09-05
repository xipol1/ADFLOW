/**
 * audit-tier1-coverage.js — Read-only audit of Tier 1 outreach fintech-ES
 * coverage in MongoDB. Produces audit/tier1-outreach-coverage-YYYY-MM-DD.md.
 *
 * Read-only: only .find() / .findOne() / .countDocuments(). Never writes.
 *
 * Run:   node scripts/audit-tier1-coverage.js
 * Needs: .env with MONGODB_URI
 */

require('dotenv').config();
const dns = require('dns');
dns.setServers(['1.1.1.1', '8.8.8.8']);

const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const Canal = require('../models/Canal');
const ChannelMetrics = require('../models/ChannelMetrics');
const CanalScoreSnapshot = require('../models/CanalScoreSnapshot');

// ─────────────────────────────────────────────────────────────────────────────
// Targets
// ─────────────────────────────────────────────────────────────────────────────
const TARGETS = [
  { n: 1,  name: 'Rankia Inversión',              handle: null,                         fuzzy: 'rankia.*inversi',                    group: 'rankia' },
  { n: 2,  name: 'Rankia Eventos',                handle: null,                         fuzzy: 'rankia.*eventos',                    group: 'rankia' },
  { n: 3,  name: 'Rankia Cripto',                 handle: null,                         fuzzy: 'rankia.*(cripto|crypto)',            group: 'rankia' },
  { n: 4,  name: 'Las Inversiones de Javi Linares', handle: '@LasInversionesDeJavi',    fuzzy: '(javi.*linares|inversiones.*javi)' },
  { n: 5,  name: 'Invertir Desde Cero Oficial',   handle: '@invertirdesdecero_oficial', fuzzy: 'invertir.*desde.*cero' },
  { n: 6,  name: 'Bit2Me Español (OFICIAL)',      handle: '@Bit2Me_ES',                 fuzzy: 'bit2me.*(espa|oficial|\\bes\\b)' },
  { n: 7,  name: 'Bit2Me News',                   handle: '@bit2menews',                fuzzy: 'bit2me.*news' },
  { n: 8,  name: 'Tradersew',                     handle: null,                         fuzzy: 'tradersew',                          expectMulti: true,
           note: 'Multi-canal TG — listar todos los matches, no consolidar.' },
  { n: 9,  name: 'Nación Crypto',                 handle: null,                         fuzzy: 'naci[oó]n.*(crypto|cripto)' },
  { n: 10, name: 'Ecotechers',                    handle: null,                         fuzzy: 'ecotechers' },
  { n: 11, name: 'DiarioCripto',                  handle: null,                         fuzzy: 'diario.?cripto' },
  { n: 12, name: 'BeInCrypto España',             handle: '@BeInCryptoESComunidad',     fuzzy: 'beincrypto.*(espa|\\bes\\b)' },
  { n: 13, name: "Jack's Arrow",                  handle: null,                         fuzzy: "jack.{0,3}s?.?arrow" },
];

const FINTECH_CATEGORIES = /fintech|cripto|crypto|inversi|trading|forex|finanz|econom|bolsa|bursa|broker/i;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────
const today = new Date();
const todayStr = today.toISOString().slice(0, 10);
const daysAgo = (d) => d ? Math.floor((today - new Date(d)) / 86400000) : null;

function handleVariants(h) {
  if (!h) return [];
  const stripped = h.replace(/^@/, '');
  return [h, stripped, stripped.toLowerCase(), `@${stripped.toLowerCase()}`, stripped.toUpperCase()];
}

async function findByHandle(handle) {
  const variants = handleVariants(handle);
  if (!variants.length) return [];
  // Case-insensitive exact match across variants
  return Canal.find({
    plataforma: 'telegram',
    identificadorCanal: { $in: variants.map((v) => new RegExp(`^${escapeRe(v)}$`, 'i')) },
  }).lean();
}

function escapeRe(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

async function findByExactName(name) {
  return Canal.find({
    plataforma: 'telegram',
    nombreCanal: new RegExp(`^${escapeRe(name)}$`, 'i'),
  }).lean();
}

async function findFuzzy(pattern) {
  return Canal.find({
    plataforma: 'telegram',
    $or: [
      { nombreCanal: new RegExp(pattern, 'i') },
      { identificadorCanal: new RegExp(pattern, 'i') },
      { descripcion: new RegExp(pattern, 'i') },
    ],
  })
    .select('_id identificadorCanal nombreCanal categoria estadisticas updatedAt')
    .limit(20)
    .lean();
}

// Decide a single match for a target. Returns one of:
//   { status: 'found-exact', canal }
//   { status: 'found-fuzzy', canal }
//   { status: 'multi-fuzzy', candidates }   ← needs human review
//   { status: 'not-found' }
async function locate(target) {
  if (target.handle) {
    const byHandle = await findByHandle(target.handle);
    if (byHandle.length === 1) return { status: 'found-exact', canal: byHandle[0], via: 'handle' };
    if (byHandle.length > 1)  return { status: 'multi-fuzzy', candidates: byHandle, via: 'handle' };
  }

  const byName = await findByExactName(target.name);
  if (byName.length === 1) return { status: 'found-exact', canal: byName[0], via: 'exact-name' };
  if (byName.length > 1)  return { status: 'multi-fuzzy', candidates: byName, via: 'exact-name' };

  const fuzzy = await findFuzzy(target.fuzzy);
  if (fuzzy.length === 0)               return { status: 'not-found' };
  if (target.expectMulti)               return { status: 'multi-expected', candidates: fuzzy };
  if (fuzzy.length === 1)               return { status: 'found-fuzzy', canal: fuzzy[0], via: 'fuzzy-name' };
  return { status: 'multi-fuzzy', candidates: fuzzy };
}

// ─────────────────────────────────────────────────────────────────────────────
// Scoring
// ─────────────────────────────────────────────────────────────────────────────
async function scoreCanal(canal) {
  const metrics = await ChannelMetrics.findOne({ channel: canal._id }).lean();
  const snapshotCount = await CanalScoreSnapshot.countDocuments({ canalId: canal._id });
  const latestSnap = await CanalScoreSnapshot.findOne({ canalId: canal._id }).sort({ fecha: -1 }).lean();

  // ── A: Frescura (max de los 3 timestamps) ──
  const tsCandidates = [
    canal.estadisticas?.ultimaActualizacion,
    metrics?.platformData?.lastFetched,
    latestSnap?.fecha,
  ].filter(Boolean).map((d) => new Date(d).getTime());
  const lastTs = tsCandidates.length ? new Date(Math.max(...tsCandidates)) : null;
  const ageDays = daysAgo(lastTs);
  let A;
  if (ageDays === null)        A = 1;
  else if (ageDays <= 7)       A = 5;
  else if (ageDays <= 30)      A = 3;
  else                         A = 1;

  // ── B: Volumen / histórico (redefinido) ──
  const lastPostDate = latestSnap?.telegramIntel?.last_post_date;
  const lastPostAge = daysAgo(lastPostDate);
  let B;
  if (snapshotCount >= 90 && lastPostAge !== null && lastPostAge <= 7)         B = 5;
  else if (snapshotCount >= 30 || (lastPostAge !== null && lastPostAge <= 30)) B = 3;
  else                                                                          B = 1;

  // ── C: Métricas Scoring v2.0 ──
  // Proxy: si hay al menos 1 snapshot, las 6 métricas están calculadas (el
  // schema las requiere). Si no hay snapshots, miramos el doc Canal: las
  // métricas con valor != 50 (default) se consideran "computadas".
  let C;
  if (snapshotCount > 0) {
    C = 5;
  } else {
    const fields = ['CAF', 'CTF', 'CER', 'CVS', 'CAP', 'CAS'];
    const nonDefault = fields.filter((f) => typeof canal[f] === 'number' && canal[f] !== 50).length;
    if (nonDefault >= 6) C = 5;
    else if (nonDefault >= 3) C = 3;
    else C = 1;
  }

  // ── D: Engagement granular ──
  // 5 = data por post (avg views / engagement rate poblados desde plataforma)
  // 3 = sólo agregados (subs + algún score)
  // 1 = sólo subscriber count
  const hasGranular =
    (metrics?.viewsAvg > 0) ||
    (metrics?.engagementRate > 0) ||
    (metrics?.platformData?.avgViewsPerPost > 0) ||
    (latestSnap?.telegramIntel?.avg_views_last_20_posts > 0);
  const hasAggregates = (metrics?.platformData?.followers > 0) || snapshotCount > 0;
  let D;
  if (hasGranular)         D = 5;
  else if (hasAggregates)  D = 3;
  else                     D = 1;

  // ── E: Audiencia / vertical ──
  const cat = (canal.categoria || '').trim();
  let E;
  if (cat && FINTECH_CATEGORIES.test(cat)) E = 5;
  else if (cat)                            E = 3;
  else                                     E = 1;

  const total = A + B + C + D + E;

  // ── Mínimo viable para outreach ──
  // Al menos 1 snapshot con telegramIntel.last_post_date ≤ 14d
  const minimoViable =
    !!latestSnap &&
    !!latestSnap.telegramIntel?.last_post_date &&
    daysAgo(latestSnap.telegramIntel.last_post_date) !== null &&
    daysAgo(latestSnap.telegramIntel.last_post_date) <= 14;

  return {
    A, B, C, D, E, total,
    ageDays, lastTs,
    snapshotCount,
    lastPostDate, lastPostAge,
    hasGranular, hasAggregates,
    minimoViable,
    metrics, latestSnap,
  };
}

function actionFromScore(total, status) {
  if (status === 'not-found' || status === 'multi-fuzzy' || status === 'multi-expected') {
    return 'scrape inicial / investigación';
  }
  if (total >= 20) return 'listo para Insights';
  if (total >= 12) return 're-scrape ligero';
  return 'scrape profundo';
}

function suggestedCmd(handle, name) {
  // No hay CLI single-channel ya hecho. Sugerimos el patrón documentado:
  // 1) crear/seed el Canal doc, 2) trigger del intel job.
  if (handle) {
    return `node -e "require('./services/telegramIntelService').getChannelMetrics('${handle.replace(/^@/, '')}').then(r=>console.log(JSON.stringify(r,null,2)))"`;
  }
  return `# handle no confirmado — buscar primero en Telegram, luego: getChannelMetrics(<handle>)`;
}

// ─────────────────────────────────────────────────────────────────────────────
// Main
// ─────────────────────────────────────────────────────────────────────────────
(async () => {
  if (!process.env.MONGODB_URI) {
    console.error('❌ MONGODB_URI no está en el entorno. Aborto.');
    process.exit(1);
  }

  console.log('Conectando a MongoDB...');
  await mongoose.connect(process.env.MONGODB_URI);
  console.log('✅ Conectado.\n');

  const results = [];
  for (const target of TARGETS) {
    process.stdout.write(`[${target.n}/13] ${target.name} ... `);
    const located = await locate(target);

    if (located.status === 'found-exact' || located.status === 'found-fuzzy') {
      const scored = await scoreCanal(located.canal);
      results.push({ target, located, scored });
      console.log(`OK (${located.via}) → ${scored.total}/25 ${scored.minimoViable ? '✅viable' : '⚠️ no viable'}`);
    } else if (located.status === 'multi-expected' || located.status === 'multi-fuzzy') {
      // Score each candidate individually so the user can pick
      const candidates = [];
      for (const c of located.candidates) {
        const s = await scoreCanal(c);
        candidates.push({ canal: c, scored: s });
      }
      results.push({ target, located, candidates });
      console.log(`AMBIGUO — ${located.candidates.length} candidatos`);
    } else {
      results.push({ target, located });
      console.log('NO ENCONTRADO');
    }
  }

  // ── Bonus sweep: any Rankia channels in DB? (visibility) ──
  const rankiaSweep = await Canal.find({
    plataforma: 'telegram',
    $or: [
      { nombreCanal: /rankia/i },
      { identificadorCanal: /rankia/i },
      { descripcion: /rankia/i },
    ],
  }).select('_id identificadorCanal nombreCanal categoria estadisticas').limit(20).lean();

  await mongoose.disconnect();

  // ── Build markdown ──
  const md = buildMarkdown(results, rankiaSweep);
  const outDir = path.resolve(__dirname, '..', 'audit');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `tier1-outreach-coverage-${todayStr}.md`);
  fs.writeFileSync(outFile, md, 'utf8');
  console.log(`\n✅ Reporte escrito: ${outFile}`);
})().catch((err) => {
  console.error('💥 Audit failed:', err);
  process.exit(1);
});

// ─────────────────────────────────────────────────────────────────────────────
// Markdown builder
// ─────────────────────────────────────────────────────────────────────────────
function fmtDate(d) { return d ? new Date(d).toISOString().slice(0, 10) : '—'; }
function fmtAge(d) {
  if (!d) return '—';
  const age = daysAgo(d);
  return `${fmtDate(d)} (${age}d)`;
}

function buildMarkdown(results, rankiaSweep) {
  const branch = (() => {
    try { return require('child_process').execSync('git branch --show-current').toString().trim(); }
    catch { return 'unknown'; }
  })();

  const found    = results.filter((r) => r.scored);
  const ambiguo  = results.filter((r) => r.candidates);
  const notFound = results.filter((r) => r.located.status === 'not-found');
  const ready    = found.filter((r) => r.scored.total >= 20);
  const reScrape = found.filter((r) => r.scored.total >= 12 && r.scored.total < 20);
  const deep     = found.filter((r) => r.scored.total < 12);

  let s = '';
  s += `# Auditoría de cobertura — Tier 1 outreach fintech ES\n`;
  s += `Fecha: ${todayStr}\n`;
  s += `Generado por: Claude Code (\`scripts/audit-tier1-coverage.js\`)\n`;
  s += `Branch: ${branch}\n\n`;

  s += `## Resumen ejecutivo\n\n`;
  s += `- Canales auditados: ${results.length}\n`;
  s += `- Listos para mandar Insights HOY (score ≥20): **${ready.length}**\n`;
  s += `- Necesitan re-scrape antes (12-19): **${reScrape.length}**\n`;
  s += `- Necesitan scrape inicial / profundo (<12): **${deep.length}**\n`;
  s += `- Ambiguos (requieren elección humana): **${ambiguo.length}**\n`;
  s += `- No encontrados en DB: **${notFound.length}**\n`;
  s += `- Con mínimo viable para outreach (snapshot fresco ≤14d): **${found.filter((r) => r.scored.minimoViable).length}**\n\n`;

  s += `## Tabla maestra\n\n`;
  s += `| # | Canal | Handle DB | En DB | Última act. | Score (A+B+C+D+E) | Mín. viable | Acción | Comando sugerido |\n`;
  s += `|---|---|---|---|---|---|---|---|---|\n`;
  for (const r of results) {
    const t = r.target;
    if (r.scored) {
      const { A, B, C, D, E, total, lastTs, minimoViable } = r.scored;
      const c = r.located.canal;
      s += `| ${t.n} | ${t.name} | \`${c.identificadorCanal}\` | sí (${r.located.via}) | ${fmtAge(lastTs)} | ${total}/25 (${A}+${B}+${C}+${D}+${E}) | ${minimoViable ? '✅' : '—'} | ${actionFromScore(total, r.located.status)} | \`${suggestedCmd(c.identificadorCanal, c.nombreCanal)}\` |\n`;
    } else if (r.candidates) {
      s += `| ${t.n} | ${t.name} | — | **ambiguo** (${r.candidates.length} cand.) | — | — | — | revisión humana | ver sección abajo |\n`;
    } else {
      s += `| ${t.n} | ${t.name} | ${t.handle || '—'} | **no** | — | — | — | scrape inicial | ${suggestedCmd(t.handle, t.name)} |\n`;
    }
  }
  s += `\n`;

  // ── Listos ──
  s += `## Acción inmediata — Listos para mandar Insights\n\n`;
  if (ready.length === 0) {
    s += `_Ninguno con score ≥20._\n\n`;
  }
  for (const r of ready) {
    const c = r.located.canal;
    const sc = r.scored;
    s += `- **${r.target.name}** — handle \`${c.identificadorCanal}\`\n`;
    s += `  - DB: ${c.estadisticas?.seguidores || 0} subs, ${sc.snapshotCount} snapshots, último post ${fmtAge(sc.lastPostDate)}\n`;
    s += `  - Insights sugerido: engagement real (${sc.latestSnap?.telegramIntel?.engagement_rate ?? '—'}), CAS=${c.CAS}, nivel=${c.nivel}, CPM dinámico=${c.CPMDinamico}\n`;
  }
  s += `\n`;

  // ── Re-scrape ──
  s += `## Re-scrape necesario\n\n`;
  if (reScrape.length === 0) s += `_Ninguno._\n\n`;
  for (const r of reScrape) {
    const c = r.located.canal;
    const sc = r.scored;
    const gaps = [];
    if (sc.A < 5) gaps.push(`frescura (último update hace ${sc.ageDays}d)`);
    if (sc.B < 5) gaps.push(`histórico (${sc.snapshotCount} snapshots, last_post ${fmtAge(sc.lastPostDate)})`);
    if (sc.C < 5) gaps.push('métricas v2.0 incompletas');
    if (sc.D < 5) gaps.push('engagement no granular');
    if (sc.E < 5) gaps.push(`vertical sin clasificar bien (categoria="${c.categoria || ''}")`);
    s += `- **${r.target.name}** \`${c.identificadorCanal}\` — score ${sc.total}/25\n`;
    s += `  - Falta: ${gaps.join('; ') || 'todo bien'}\n`;
    s += `  - Comando: \`${suggestedCmd(c.identificadorCanal)}\`\n`;
    s += `  - ETA re-scrape: ~30-60s (un solo canal)\n`;
  }
  s += `\n`;

  // ── Scrape inicial ──
  s += `## Scrape inicial\n\n`;
  if (deep.length === 0 && notFound.length === 0) s += `_Ninguno._\n\n`;
  for (const r of deep) {
    const c = r.located.canal;
    s += `- **${r.target.name}** \`${c.identificadorCanal}\` — encontrado pero score ${r.scored.total}/25\n`;
    s += `  - Comando: \`${suggestedCmd(c.identificadorCanal)}\`\n`;
  }
  for (const r of notFound) {
    s += `- **${r.target.name}** — NO en DB\n`;
    s += `  - Handle conocido: ${r.target.handle || '(sin confirmar)'}\n`;
    s += `  - Riesgo: ${r.target.handle ? 'bajo si el handle es correcto' : 'requiere búsqueda manual del handle real en Telegram'}\n`;
    s += `  - Comando: \`${suggestedCmd(r.target.handle, r.target.name)}\`\n`;
  }
  s += `\n`;

  // ── Ambiguos ──
  s += `## No encontrables / requieren investigación humana\n\n`;
  if (ambiguo.length === 0) s += `_Ninguno._\n\n`;
  for (const r of ambiguo) {
    s += `### ${r.target.name} — ${r.candidates.length} candidatos\n\n`;
    if (r.target.note) s += `_Nota: ${r.target.note}_\n\n`;
    s += `Intentado: handle exacto (\`${r.target.handle || 'n/a'}\`) → nombre exacto → fuzzy \`/${r.target.fuzzy}/i\`\n\n`;
    s += `| _id | identificadorCanal | nombreCanal | subs | categoría | score |\n`;
    s += `|---|---|---|---|---|---|\n`;
    for (const cand of r.candidates) {
      const c = cand.canal;
      s += `| \`${c._id}\` | \`${c.identificadorCanal}\` | ${c.nombreCanal || '—'} | ${c.estadisticas?.seguidores || 0} | ${c.categoria || '—'} | ${cand.scored.total}/25 |\n`;
    }
    s += `\nPregunta para Rafa: ¿cuál de estos es **${r.target.name}**? (o ninguno = scrape inicial)\n\n`;
  }

  // ── Observaciones de calidad ──
  s += `## Observaciones de calidad del scraper\n\n`;
  const obs = [];
  if (found.length > 0) {
    const noCat = found.filter((r) => !r.located.canal.categoria || !FINTECH_CATEGORIES.test(r.located.canal.categoria)).length;
    const pctNoCat = Math.round(100 * noCat / found.length);
    if (pctNoCat >= 50) obs.push(`El ${pctNoCat}% de canales encontrados no tiene vertical fintech detectado en \`categoria\`. El clasificador parece no estar marcando esta categoría para canales ES.`);

    const stale = found.filter((r) => r.scored.ageDays !== null && r.scored.ageDays > 30).length;
    if (stale > 0) obs.push(`${stale}/${found.length} canales tienen última actualización >30d — el cron de re-scrape parece intermitente para estos.`);

    const noSnap = found.filter((r) => r.scored.snapshotCount === 0).length;
    if (noSnap > 0) obs.push(`${noSnap}/${found.length} canales encontrados no tienen ningún \`CanalScoreSnapshot\` — entran en el set "creados manualmente / sin run del scoring engine".`);

    const noIntel = found.filter((r) => !r.scored.latestSnap?.telegramIntel?.last_post_date).length;
    if (noIntel > 0) obs.push(`${noIntel}/${found.length} canales no tienen \`telegramIntel\` poblado en su snapshot más reciente — el telegramIntelService no ha corrido sobre ellos.`);
  }
  if (obs.length === 0) s += `_Sin patrones sistémicos detectados._\n\n`;
  else for (const o of obs) s += `- ${o}\n`;
  s += `\n`;

  // ── Sweep Rankia ──
  s += `## Anexo — Sweep de canales con "rankia" en DB\n\n`;
  if (rankiaSweep.length === 0) {
    s += `_Ningún canal con 'rankia' en nombre/handle/descripción._\n\n`;
  } else {
    s += `| _id | identificadorCanal | nombreCanal | subs | categoría |\n|---|---|---|---|---|\n`;
    for (const c of rankiaSweep) {
      s += `| \`${c._id}\` | \`${c.identificadorCanal}\` | ${c.nombreCanal || '—'} | ${c.estadisticas?.seguidores || 0} | ${c.categoria || '—'} |\n`;
    }
    s += `\n`;
  }

  // ── Próximos pasos ──
  s += `## Próximos pasos sugeridos\n\n`;
  let i = 1;
  if (ready.length > 0)     s += `${i++}. Mandar Insights HOY a los ${ready.length} canales con score ≥20.\n`;
  if (ambiguo.length > 0)   s += `${i++}. Resolver los ${ambiguo.length} casos ambiguos (sección "No encontrables") — elegir o descartar.\n`;
  if (notFound.length > 0)  s += `${i++}. Confirmar handles de los ${notFound.length} no encontrados y disparar scrape inicial.\n`;
  if (reScrape.length > 0)  s += `${i++}. Programar re-scrape ligero para los ${reScrape.length} canales con score 12-19.\n`;
  s += `${i++}. Revisar las observaciones de calidad del scraper antes de hacer outreach masivo.\n`;

  return s;
}
