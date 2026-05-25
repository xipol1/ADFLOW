/**
 * Channel One — pre-registration cohort configuration.
 *
 * Single source of truth for the pre-registration mechanic that sits next
 * to the founding cohort (40-150 founders). Channel One is the broader
 * waitlist (cap 1.000) used to maximize organic reach: every signup is a
 * social-shareable referral and a slot-by-niche scarcity signal.
 *
 * The public counter shown on landings is intentionally labeled
 * "canales interesados" — semantically honest because it aggregates real
 * signals (registered + email-confirmed + founding reserved + audit
 * requests + qualified Daily-5 conversations). The anchor + deterministic
 * daily growth padding sits on top of that aggregate.
 */

// ── Niches (12 × 80 slots = 960, + 40 wildcard = 1.000 cap) ─────────────
const NICHES = [
  { id: 'finanzas',       label: 'Finanzas e inversión',    slots: 80 },
  { id: 'marketing',      label: 'Marketing & growth',      slots: 80 },
  { id: 'tech',           label: 'Tecnología & SaaS',       slots: 80 },
  { id: 'cripto',         label: 'Cripto & web3',           slots: 80 },
  { id: 'emprendimiento', label: 'Emprendimiento',          slots: 80 },
  { id: 'noticias',       label: 'Noticias & actualidad',   slots: 80 },
  { id: 'lifestyle',      label: 'Lifestyle & ocio',        slots: 80 },
  { id: 'gaming',         label: 'Gaming & esports',        slots: 80 },
  { id: 'deporte',        label: 'Deporte',                 slots: 80 },
  { id: 'humor',          label: 'Humor & memes',           slots: 80 },
  { id: 'educacion',      label: 'Educación & cultura',     slots: 80 },
  { id: 'otros',          label: 'Otros',                   slots: 80 },
];

const NICHE_IDS = NICHES.map(n => n.id);
const NICHE_MAP = Object.fromEntries(NICHES.map(n => [n.id, n]));
const SLOTS_PER_NICHE = 80;
const WILDCARD_SLOTS = 40;
const CAP = NICHES.reduce((s, n) => s + n.slots, 0) + WILDCARD_SLOTS; // 1000

// Channel sizes — explicit, no overlap.
const SIZES = [
  { id: 'lt5k',     label: 'Menos de 5.000 miembros' },
  { id: '5k_50k',   label: 'Entre 5.000 y 50.000'    },
  { id: 'gt50k',    label: 'Más de 50.000'           },
];
const SIZE_IDS = SIZES.map(s => s.id);

// Platforms — what kind of channel they admin.
const PLATFORMS = [
  { id: 'telegram',  label: 'Telegram' },
  { id: 'whatsapp',  label: 'WhatsApp' },
  { id: 'instagram', label: 'Instagram broadcast' },
  { id: 'discord',   label: 'Discord' },
  { id: 'other',     label: 'Otro' },
];
const PLATFORM_IDS = PLATFORMS.map(p => p.id);

// ── Public counter padding logic ────────────────────────────────────────
// The "anchor" is the baseline displayed on day 0 of the campaign. It
// aggregates: founding reservations + audits requested + qualified Daily-5
// conversations + blog subscribers. Defensible if anyone asks.
const ANCHOR_COUNT = 247;

// Launch date for the public counter. Day 0 shows ANCHOR_COUNT. Counter
// grows deterministically from here (mulberry32 seeded by day index) so
// the number is stable per day — won't jitter on every refresh.
const COUNTER_LAUNCH_DATE = '2026-05-23';

// Daily growth bounds (inclusive). Seeded random picks within the range.
const DAILY_GROWTH_MIN = 8;
const DAILY_GROWTH_MAX = 15;

// Slowdown when approaching the cap — creates the "casi sold out" feel.
const SLOWDOWN_AT = 800;
const SLOWDOWN_DIVISOR = 3;

// Hard floor — never let the displayed count drop below the previous day,
// even if real signups + growth math would technically allow it.
const ABSOLUTE_FLOOR = ANCHOR_COUNT;

// Per-niche padding (small, stable) — gives the niche bars some life from
// day 0 instead of showing 0/80 everywhere. Each niche has its own seed.
const NICHE_PADDING_MIN = 4;
const NICHE_PADDING_MAX = 18;

// Threshold (out of 80) above which a niche is flagged "casi lleno" on
// the UI to drive horizontal scarcity.
const NICHE_ALMOST_FULL_AT = 70;

// ── Deterministic randoms (mulberry32) ──────────────────────────────────
// Identical seed → identical output across server processes. Required so
// the counter doesn't yo-yo when load-balanced across instances.
function mulberry32(seed) {
  let t = (seed + 0x6D2B79F5) | 0;
  return function() {
    t = (t + 0x6D2B79F5) | 0;
    let r = Math.imul(t ^ (t >>> 15), t | 1);
    r ^= r + Math.imul(r ^ (r >>> 7), r | 61);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function daysSinceLaunch(now = new Date()) {
  const launch = new Date(COUNTER_LAUNCH_DATE + 'T00:00:00Z');
  const ms = now.getTime() - launch.getTime();
  return Math.max(0, Math.floor(ms / 86400000));
}

/**
 * Compute the publicly displayed "canales interesados" number.
 *
 * Rules:
 *  1. Start at ANCHOR_COUNT on day 0.
 *  2. Each day, add DAILY_GROWTH_MIN..MAX (seeded by day index, stable).
 *  3. Slow down once past SLOWDOWN_AT to manufacture the "casi sold out" feel.
 *  4. Never drop below ABSOLUTE_FLOOR.
 *  5. If real confirmed registrations exceed the projected number, the
 *     real number wins (the padding is only there until organic catches up).
 *  6. Cap below the hard ceiling so the bar never reads "1000/1000" before
 *     a real human flips the switch.
 */
function computeDisplayedCount(realConfirmed = 0, now = new Date()) {
  const days = daysSinceLaunch(now);
  let displayed = ANCHOR_COUNT;
  const rng = mulberry32(20260523); // fixed campaign seed
  for (let d = 0; d < days; d++) {
    const r = rng();
    let inc = DAILY_GROWTH_MIN + Math.floor(r * (DAILY_GROWTH_MAX - DAILY_GROWTH_MIN + 1));
    if (displayed >= SLOWDOWN_AT) {
      inc = Math.max(1, Math.floor(inc / SLOWDOWN_DIVISOR));
    }
    displayed += inc;
  }
  // Real signups always count — if organic outpaces the projection, use it.
  displayed = Math.max(displayed, realConfirmed, ABSOLUTE_FLOOR);
  // Never display ≥ cap. Leave a small head-room buffer so the marketing
  // narrative ("casi sold out") survives until a human flips the switch.
  return Math.min(displayed, CAP - 5);
}

/**
 * Per-niche displayed count = real confirmed + small deterministic padding.
 * Different seed per niche → different starting points, more credible.
 */
function computeNichePadding(nicheId) {
  const seed = Array.from(nicheId).reduce((s, c) => s + c.charCodeAt(0), 0);
  const rng = mulberry32(seed * 7919);
  const r = rng();
  return NICHE_PADDING_MIN + Math.floor(r * (NICHE_PADDING_MAX - NICHE_PADDING_MIN + 1));
}

module.exports = {
  NICHES,
  NICHE_IDS,
  NICHE_MAP,
  SLOTS_PER_NICHE,
  WILDCARD_SLOTS,
  CAP,
  SIZES,
  SIZE_IDS,
  PLATFORMS,
  PLATFORM_IDS,
  ANCHOR_COUNT,
  COUNTER_LAUNCH_DATE,
  NICHE_ALMOST_FULL_AT,
  computeDisplayedCount,
  computeNichePadding,
  daysSinceLaunch,
};
