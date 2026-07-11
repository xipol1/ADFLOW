/**
 * Discord Authenticity Service — "% bots real" + señales de comunidad.
 *
 * Lee el censo de miembros y una muestra de actividad reciente de un servidor
 * de Discord (vía DiscordBot) y produce un informe de autenticidad:
 *   - pctBotsEstimado   (0-100, alto = más sospechoso)  ← el titular
 *   - authenticityScore (0-100, alto = más limpio)      ← alimenta el scoring
 *   - señales de membresía / reach / engagement / distribución (Gini)
 *
 * computeAuthenticity() es PURA (sin I/O): toma censo + actividad + metadata
 * del guild y devuelve el informe. analyzeGuild() es el orquestador que hace
 * las llamadas de red y delega el cálculo. Esto permite testear toda la
 * matemática con fixtures, igual que channelScoringV2.
 *
 * Requiere el intent GUILD_MEMBERS para el censo (ver DiscordBot.fetchAllMembers).
 * El muestreo de actividad solo usa metadata, sin Message Content.
 *
 * IMPORTANTE: pctBotsEstimado es un ÍNDICE DE SOSPECHA heurístico (blend de
 * cuentas nuevas + altas en ráfaga + ausencia de avatar), NO un censo literal
 * de bots. Comunícalo siempre como estimación.
 */

const DiscordBot = require('../integraciones/discord');

const DAY_MS = 24 * 60 * 60 * 1000;

// ── Tunables ────────────────────────────────────────────────────────────────
const SUSP_WEIGHTS = { nuevas: 0.45, rafaga: 0.35, sinAvatar: 0.20 };
const NEW_ACCOUNT_DAYS = 30;   // cuenta "nueva" si < 30 días
const BURST_FLOOR = 25;        // mín. altas/día para considerar ráfaga (anti-falsos-positivos en servers pequeños)
const BURST_K = 5;             // ráfaga = día con > K× la mediana de altas/día

// Referencias para normalizar sub-scores a 0..1 (saturan en el valor de ref).
const PRESENCE_REF = 0.10;     // 10% online = reach pleno
const ENGAGE_REF = 0.05;       // 5% de miembros posteando en la ventana = engagement pleno

// Pesos del authenticityScore (espejo de los pilares del plan: 35/30/15/10/10).
const SCORE_WEIGHTS = {
  engagement: 0.35,
  autenticidad: 0.30,
  reach: 0.15,
  vitalidad: 0.10,
  distribucion: 0.10,
};

// Umbrales de flags.
const FLAG_BURST = 0.30;       // ≥30% de altas en ráfaga
const FLAG_NEW = 40;           // ≥40% cuentas nuevas
const FLAG_GINI = 0.85;        // distribución muy concentrada

// ── Utilities (puras) ───────────────────────────────────────────────────────
const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const round = (v) => Math.round(v);

function median(nums) {
  const arr = nums.filter((n) => Number.isFinite(n)).sort((a, b) => a - b);
  if (!arr.length) return 0;
  const mid = Math.floor(arr.length / 2);
  return arr.length % 2 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
}

function pctWhere(arr, pred) {
  if (!arr.length) return 0;
  return (arr.filter(pred).length / arr.length) * 100;
}

function countBy(keys) {
  const m = new Map();
  for (const k of keys) {
    if (k === null || k === undefined) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return m;
}

/**
 * Coeficiente de Gini (0 = perfectamente igualitario, 1 = todo en una cuenta).
 * Sobre el conteo de mensajes por autor. Pura.
 */
function gini(values) {
  const xs = values.filter((v) => Number.isFinite(v) && v >= 0).sort((a, b) => a - b);
  const n = xs.length;
  if (n === 0) return 0;
  const sum = xs.reduce((a, b) => a + b, 0);
  if (sum === 0) return 0;
  let cum = 0;
  for (let i = 0; i < n; i++) cum += (i + 1) * xs[i];
  // (2·Σ i·x_i)/(n·Σx) − (n+1)/n
  return clamp((2 * cum) / (n * sum) - (n + 1) / n, 0, 1);
}

/** Media ponderada que ignora componentes no disponibles y renormaliza. */
function blend(parts) {
  const live = parts.filter((p) => p.ok && Number.isFinite(p.v));
  const wsum = live.reduce((a, p) => a + p.w, 0);
  if (!wsum) return null;
  return live.reduce((a, p) => a + p.v * p.w, 0) / wsum;
}

// ── Núcleo: función pura ─────────────────────────────────────────────────────
/**
 * @param {{ members: Array }} census   — de DiscordBot.fetchAllMembers
 * @param {{ events: Array, channelsScanned: number, windowDays: number }} activity
 * @param {{ memberCount: number, presenceCount: number }} guildMeta
 * @param {Date} now
 */
function computeAuthenticity({ census = {}, activity = {}, guildMeta = {}, now = new Date() } = {}) {
  const members = Array.isArray(census.members) ? census.members : [];
  const censusSize = members.length;
  const censusTruncated = !!census.truncated;
  const membershipAvailable = censusSize > 0;
  const nowMs = now.getTime();

  // Separar bots declarados (legítimos: MEE6, etc.) de cuentas humanas.
  const humans = members.filter((m) => !m?.user?.bot);
  const declaredBots = censusSize - humans.length;

  // ── Membresía ───────────────────────────────────────────────────────────
  const ages = humans
    .map((m) => {
      const created = DiscordBot.snowflakeToDate(m?.user?.id);
      return created ? (nowMs - created.getTime()) / DAY_MS : null;
    })
    .filter((a) => Number.isFinite(a) && a >= 0);

  const pctCuentasNuevas = ages.length ? pctWhere(ages, (a) => a < NEW_ACCOUNT_DAYS) : null;
  const accountAgeMedianDays = ages.length ? round(median(ages)) : null;
  const pctSinAvatar = humans.length ? pctWhere(humans, (m) => !m?.user?.avatar) : null;
  const pctSinRol = humans.length
    ? pctWhere(humans, (m) => !Array.isArray(m?.roles) || m.roles.length === 0)
    : null;

  // Ráfagas de alta: días cuyo nº de altas supera max(BURST_FLOOR, K·mediana).
  const joinDays = humans
    .map((m) => (m?.joined_at ? Math.floor(new Date(m.joined_at).getTime() / DAY_MS) : null))
    .filter((d) => Number.isFinite(d));
  let joinBurstScore = null;
  if (joinDays.length) {
    const perDay = [...countBy(joinDays).values()];
    const threshold = Math.max(BURST_FLOOR, median(perDay) * BURST_K);
    const burstJoins = perDay.filter((c) => c > threshold).reduce((a, c) => a + c, 0);
    joinBurstScore = burstJoins / joinDays.length;
  }

  // pctBotsEstimado: blend de las señales disponibles (renormaliza).
  let pctBotsEstimado = null;
  if (membershipAvailable) {
    const susp = blend([
      { v: (pctCuentasNuevas ?? 0) / 100, w: SUSP_WEIGHTS.nuevas, ok: pctCuentasNuevas !== null },
      { v: joinBurstScore ?? 0, w: SUSP_WEIGHTS.rafaga, ok: joinBurstScore !== null },
      { v: (pctSinAvatar ?? 0) / 100, w: SUSP_WEIGHTS.sinAvatar, ok: pctSinAvatar !== null },
    ]);
    pctBotsEstimado = susp === null ? null : clamp(round(susp * 100), 0, 100);
  }

  // ── Reach ─────────────────────────────────────────────────────────────────
  const memberCount = Number(guildMeta.memberCount) || censusSize || 0;
  const presenceCount = Number(guildMeta.presenceCount) || 0;
  const presenceRatio = memberCount > 0 ? clamp(presenceCount / memberCount, 0, 1) : null;

  // ── Engagement + distribución (muestra de actividad) ──────────────────────
  const events = Array.isArray(activity.events) ? activity.events : [];
  const windowDays = Number(activity.windowDays) || 14;
  const activityAvailable = (activity.channelsScanned || 0) > 0;

  const humanEvents = events.filter((e) => !e.isBot && e.authorId);
  const perAuthor = countBy(humanEvents.map((e) => e.authorId));
  const uniqueAuthors = perAuthor.size;
  const engagementRate = memberCount > 0 ? uniqueAuthors / memberCount : null;
  const messagesPerDay = windowDays > 0 ? humanEvents.length / windowDays : null;
  const giniActividad = uniqueAuthors > 0 ? +gini([...perAuthor.values()]).toFixed(4) : null;
  const activeDays = new Set(humanEvents.map((e) => Math.floor(e.timestamp / DAY_MS))).size;
  const vitalidad = windowDays > 0 ? clamp(activeDays / windowDays, 0, 1) : null;

  // ── authenticityScore (0-100, alto = limpio) ──────────────────────────────
  const sAuth = pctBotsEstimado === null ? null : 1 - pctBotsEstimado / 100;
  const sReach = presenceRatio === null ? null : clamp(presenceRatio / PRESENCE_REF, 0, 1);
  const sEngage = !activityAvailable || engagementRate === null
    ? null
    : clamp(engagementRate / ENGAGE_REF, 0, 1);
  const sVital = !activityAvailable ? null : vitalidad;
  const sDist = giniActividad === null ? null : 1 - giniActividad;

  const score01 = blend([
    { v: sEngage, w: SCORE_WEIGHTS.engagement, ok: sEngage !== null },
    { v: sAuth, w: SCORE_WEIGHTS.autenticidad, ok: sAuth !== null },
    { v: sReach, w: SCORE_WEIGHTS.reach, ok: sReach !== null },
    { v: sVital, w: SCORE_WEIGHTS.vitalidad, ok: sVital !== null },
    { v: sDist, w: SCORE_WEIGHTS.distribucion, ok: sDist !== null },
  ]);
  const authenticityScore = score01 === null ? null : clamp(round(score01 * 100), 0, 100);

  // ── Flags ───────────────────────────────────────────────────────────────────
  const flags = [];
  if (membershipAvailable) {
    if (joinBurstScore !== null && joinBurstScore >= FLAG_BURST) flags.push('altas_en_rafaga');
    if (pctCuentasNuevas !== null && pctCuentasNuevas >= FLAG_NEW) flags.push('cuentas_nuevas_masivas');
  }
  if (activityAvailable && giniActividad !== null && giniActividad >= FLAG_GINI && uniqueAuthors > 0) {
    flags.push('actividad_concentrada');
  }

  return {
    pctBotsEstimado,
    authenticityScore,
    membership: {
      pctCuentasNuevas: pctCuentasNuevas === null ? null : +pctCuentasNuevas.toFixed(2),
      accountAgeMedianDays,
      joinBurstScore: joinBurstScore === null ? null : +joinBurstScore.toFixed(4),
      pctSinAvatar: pctSinAvatar === null ? null : +pctSinAvatar.toFixed(2),
      pctSinRol: pctSinRol === null ? null : +pctSinRol.toFixed(2),
      declaredBots,
      censusSize,
      censusTruncated,
    },
    reach: { presenceRatio: presenceRatio === null ? null : +presenceRatio.toFixed(4) },
    engagement: {
      engagementRate: engagementRate === null ? null : +engagementRate.toFixed(4),
      messagesPerDay: messagesPerDay === null ? null : +messagesPerDay.toFixed(2),
      uniqueAuthors,
      vitalidad: vitalidad === null ? null : +vitalidad.toFixed(4),
    },
    distribution: { giniActividad },
    flags,
    dataAvailability: { membership: membershipAvailable, activity: activityAvailable },
    computedAt: now.toISOString(),
  };
}

// ── Orquestador (con I/O) ────────────────────────────────────────────────────
/**
 * Hace las lecturas de red y delega en computeAuthenticity.
 * `bot` es una instancia de DiscordBot ya construida con el token correcto.
 */
async function analyzeGuild(bot, guildId, opts = {}) {
  const { memberOpts = {}, activityOpts = {}, now = new Date() } = opts;
  const [census, activity, guild] = await Promise.all([
    bot.fetchAllMembers(guildId, memberOpts),
    bot.sampleRecentActivity(guildId, activityOpts),
    bot.getGuild(guildId, true).catch(() => ({})),
  ]);
  const guildMeta = {
    memberCount: guild?.approximate_member_count || guild?.member_count || 0,
    presenceCount: guild?.approximate_presence_count || 0,
  };
  return computeAuthenticity({ census, activity, guildMeta, now });
}

// ── Mappers de persistencia ──────────────────────────────────────────────────
/** Sub-doc `autenticidad` que se persiste en el Canal. */
function toCanalAutenticidad(report) {
  if (!report) return null;
  return {
    pctBotsEstimado: report.pctBotsEstimado,
    authenticityScore: report.authenticityScore,
    presenceRatio: report.reach.presenceRatio,
    engagementRate: report.engagement.engagementRate,
    giniActividad: report.distribution.giniActividad,
    censusSize: report.membership.censusSize,
    censusTruncated: report.membership.censusTruncated,
    flags: report.flags,
    ultimaLectura: new Date(report.computedAt),
  };
}

/** Bloque `discordIntel` que se persiste en el CanalScoreSnapshot. */
function toSnapshotIntel(report) {
  if (!report) return null;
  return {
    pctBotsEstimado: report.pctBotsEstimado,
    authenticityScore: report.authenticityScore,
    pctCuentasNuevas: report.membership.pctCuentasNuevas,
    joinBurstScore: report.membership.joinBurstScore,
    pctSinAvatar: report.membership.pctSinAvatar,
    presenceRatio: report.reach.presenceRatio,
    engagementRate: report.engagement.engagementRate,
    giniActividad: report.distribution.giniActividad,
    censusSize: report.membership.censusSize,
    censusTruncated: report.membership.censusTruncated,
  };
}

module.exports = {
  computeAuthenticity,
  analyzeGuild,
  toCanalAutenticidad,
  toSnapshotIntel,
  gini,
};
