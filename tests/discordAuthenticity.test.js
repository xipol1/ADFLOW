/**
 * Lector de autenticidad de Discord — matemática pura.
 *
 * Cubre las funciones sin I/O detrás del "% bots real":
 *   - DiscordBot.snowflakeToDate  → snowflake → fecha de creación de cuenta
 *   - gini()                      → concentración de la actividad
 *   - computeAuthenticity()       → informe completo (fixtures limpio vs bot-farm)
 *   - la penalización en channelScoringV2 alimentada por pctBotsEstimado real
 *
 * Las llamadas de red (fetchAllMembers / sampleRecentActivity / analyzeGuild)
 * NO se testean aquí — necesitan un guild real (ver scripts/discord-authenticity-probe.js).
 */

const DiscordBot = require('../integraciones/discord');
const {
  computeAuthenticity,
  gini,
} = require('../services/discordAuthenticityService');
const { calcularCAS } = require('../services/channelScoringV2');

const DAY = 24 * 60 * 60 * 1000;
const DISCORD_EPOCH = 1420070400000;
const NOW = new Date('2026-06-25T00:00:00Z');

// Inversa de snowflakeToDate: genera un snowflake con los bits bajos a 0 para
// una fecha dada (round-trip exacto). Solo válido para fechas > epoch Discord.
function snowflakeForDate(ms) {
  return ((BigInt(Math.floor(ms)) - BigInt(DISCORD_EPOCH)) << BigInt(22)).toString();
}

function member({ createdMs, joinedMs, avatar = 'av', bot = false, roles = ['member'] }) {
  return {
    user: { id: snowflakeForDate(createdMs), avatar, bot },
    joined_at: new Date(joinedMs).toISOString(),
    roles,
  };
}

describe('DiscordBot.snowflakeToDate', () => {
  test('decodes a documented snowflake to ~2016-04-30', () => {
    // 175928847299117063 → 1462015105796 ms (ejemplo de la doc de Discord).
    const d = DiscordBot.snowflakeToDate('175928847299117063');
    expect(Math.abs(d.getTime() - 1462015105796)).toBeLessThan(2000);
    expect(d.getUTCFullYear()).toBe(2016);
  });

  test('round-trips a generated snowflake exactly', () => {
    const ms = Date.parse('2021-09-09T09:09:09.000Z');
    const id = snowflakeForDate(ms);
    expect(DiscordBot.snowflakeToDate(id).getTime()).toBe(ms);
  });

  test('returns null on garbage input (fail-soft)', () => {
    expect(DiscordBot.snowflakeToDate('not-a-snowflake')).toBeNull();
    expect(DiscordBot.snowflakeToDate(undefined)).toBeNull();
  });
});

describe('gini', () => {
  test('0 for a perfectly equal distribution', () => {
    expect(gini([5, 5, 5, 5])).toBe(0);
  });

  test('(n-1)/n for a single holder', () => {
    expect(gini([0, 0, 0, 40])).toBeCloseTo(0.75, 5);
  });

  test('0 for empty or single-element input', () => {
    expect(gini([])).toBe(0);
    expect(gini([10])).toBe(0);
  });

  test('rises with concentration', () => {
    const even = gini([10, 10, 10, 10, 10]);
    const skewed = gini([1, 1, 1, 1, 96]);
    expect(skewed).toBeGreaterThan(even);
  });
});

describe('computeAuthenticity — servidor limpio', () => {
  // 20 humanos: cuentas viejas (2019), con avatar, altas en días distintos.
  const CREATED_OLD = Date.parse('2019-01-01T00:00:00Z');
  const cleanMembers = [];
  for (let i = 0; i < 20; i++) {
    cleanMembers.push(member({
      createdMs: CREATED_OLD + i * DAY,
      joinedMs: Date.parse('2026-01-01T00:00:00Z') + i * DAY,
      avatar: `av${i}`,
    }));
  }
  // Actividad distribuida: 12 autores, 2-5 mensajes c/u, repartida en ~6 días.
  const cleanActivity = { channelsScanned: 2, windowDays: 14, events: [] };
  for (let a = 0; a < 12; a++) {
    const count = 2 + (a % 4);
    for (let c = 0; c < count; c++) {
      cleanActivity.events.push({
        authorId: `u${a}`,
        isBot: false,
        timestamp: Date.parse('2026-06-19T12:00:00Z') + ((a + c) % 6) * DAY,
      });
    }
  }

  const report = computeAuthenticity({
    census: { members: cleanMembers, truncated: false },
    activity: cleanActivity,
    guildMeta: { memberCount: 20, presenceCount: 5 },
    now: NOW,
  });

  test('pctBotsEstimado is near zero', () => {
    expect(report.pctBotsEstimado).toBeLessThanOrEqual(5);
  });

  test('no anomaly flags', () => {
    expect(report.flags).toEqual([]);
  });

  test('authenticityScore is high', () => {
    expect(report.authenticityScore).toBeGreaterThanOrEqual(70);
  });

  test('membership signals are clean', () => {
    expect(report.membership.pctCuentasNuevas).toBe(0);
    expect(report.membership.pctSinAvatar).toBe(0);
    expect(report.membership.censusSize).toBe(20);
  });
});

describe('computeAuthenticity — bot farm', () => {
  const CREATED_OLD = Date.parse('2019-01-01T00:00:00Z');
  const NEW_MS = NOW.getTime() - 5 * DAY; // cuentas creadas hace 5 días
  const BURST_JOIN = Date.parse('2026-06-20T00:00:00Z');

  const farmMembers = [];
  // 15 normales: viejos, con avatar, altas en días distintos.
  for (let i = 0; i < 15; i++) {
    farmMembers.push(member({
      createdMs: CREATED_OLD + i * DAY,
      joinedMs: Date.parse('2026-05-01T00:00:00Z') + i * DAY,
      avatar: `av${i}`,
    }));
  }
  // 40 bots: cuentas nuevas, TODAS de alta el mismo día, sin avatar, sin rol.
  for (let i = 0; i < 40; i++) {
    farmMembers.push(member({
      createdMs: NEW_MS,
      joinedMs: BURST_JOIN,
      avatar: null,
      roles: [],
    }));
  }

  // Actividad muy concentrada: 1 autor domina (200 msgs), 9 con 1 msg → Gini alto.
  const farmActivity = { channelsScanned: 1, windowDays: 14, events: [] };
  for (let c = 0; c < 200; c++) {
    farmActivity.events.push({ authorId: 'a0', isBot: false, timestamp: BURST_JOIN });
  }
  for (let a = 1; a < 10; a++) {
    farmActivity.events.push({ authorId: `a${a}`, isBot: false, timestamp: BURST_JOIN });
  }

  const report = computeAuthenticity({
    census: { members: farmMembers, truncated: false },
    activity: farmActivity,
    guildMeta: { memberCount: 55, presenceCount: 2 },
    now: NOW,
  });

  test('pctBotsEstimado is high', () => {
    expect(report.pctBotsEstimado).toBeGreaterThanOrEqual(50);
  });

  test('raises join-burst + new-account + concentration flags', () => {
    expect(report.flags).toEqual(
      expect.arrayContaining(['altas_en_rafaga', 'cuentas_nuevas_masivas', 'actividad_concentrada']),
    );
  });

  test('membership signals reflect the dump', () => {
    expect(report.membership.pctCuentasNuevas).toBeGreaterThanOrEqual(40);
    expect(report.membership.pctSinAvatar).toBeGreaterThanOrEqual(40);
    expect(report.membership.joinBurstScore).toBeGreaterThanOrEqual(0.3);
    expect(report.distribution.giniActividad).toBeGreaterThanOrEqual(0.85);
  });

  test('scores below a clean server', () => {
    const clean = computeAuthenticity({
      census: { members: [member({ createdMs: CREATED_OLD, joinedMs: CREATED_OLD })], truncated: false },
      activity: { channelsScanned: 1, windowDays: 14, events: [{ authorId: 'x', isBot: false, timestamp: BURST_JOIN }] },
      guildMeta: { memberCount: 1, presenceCount: 1 },
      now: NOW,
    });
    expect(report.authenticityScore).toBeLessThan(clean.authenticityScore);
  });
});

describe('computeAuthenticity — data availability', () => {
  test('no census → membership unavailable, pctBotsEstimado null', () => {
    const report = computeAuthenticity({
      census: { members: [] },
      activity: { channelsScanned: 0, windowDays: 14, events: [] },
      guildMeta: { memberCount: 0, presenceCount: 0 },
      now: NOW,
    });
    expect(report.pctBotsEstimado).toBeNull();
    expect(report.dataAvailability.membership).toBe(false);
  });

  test('census but no activity sample → score still computed, activity unavailable', () => {
    const m = member({ createdMs: Date.parse('2019-01-01T00:00:00Z'), joinedMs: Date.parse('2026-01-01T00:00:00Z') });
    const report = computeAuthenticity({
      census: { members: [m], truncated: false },
      activity: { channelsScanned: 0, windowDays: 14, events: [] },
      guildMeta: { memberCount: 1, presenceCount: 1 },
      now: NOW,
    });
    expect(report.pctBotsEstimado).not.toBeNull();
    expect(report.authenticityScore).not.toBeNull();
    expect(report.dataAvailability.activity).toBe(false);
  });
});

describe('channelScoringV2 — penalización por autenticidad medida', () => {
  const baseCanal = {
    estadisticas: { seguidores: 20000, promedioVisualizaciones: 2000 },
    verificacion: { tipoAcceso: 'admin_directo' },
    plataforma: 'discord',
    categoria: 'crypto',
  };

  test('high pctBotsEstimado drives bot_farm_sospechoso + lowers CAS vs no signal', () => {
    const withBots = calcularCAS(
      { ...baseCanal, autenticidad: { pctBotsEstimado: 70, flags: [] } },
      [],
      'crypto',
    );
    const withoutSignal = calcularCAS(baseCanal, [], 'crypto');

    expect(withBots.flags).toContain('bot_farm_sospechoso');
    expect(withoutSignal.flags).not.toContain('bot_farm_sospechoso');
    expect(withBots.CAS).toBeLessThan(withoutSignal.CAS);
  });

  test('a measured 0% bots applies no penalty and falls through to no flag', () => {
    const clean = calcularCAS(
      { ...baseCanal, autenticidad: { pctBotsEstimado: 0, flags: [] } },
      [],
      'crypto',
    );
    expect(clean.flags).not.toContain('bot_farm_sospechoso');
    expect(clean.flags).not.toContain('engagement_bajo');
  });

  test('reader-specific flags are surfaced on the antifraude flags array', () => {
    const res = calcularCAS(
      { ...baseCanal, autenticidad: { pctBotsEstimado: 35, flags: ['altas_en_rafaga'] } },
      [],
      'crypto',
    );
    expect(res.flags).toContain('altas_en_rafaga');
  });
});
