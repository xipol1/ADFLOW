#!/usr/bin/env node
/**
 * Probe local del lector de autenticidad de Discord.
 *
 *   node scripts/discord-authenticity-probe.js <guildId> [--window 14] [--max-members 60]
 *
 * Requiere DISCORD_BOT_TOKEN en el entorno y el intent GUILD_MEMBERS activado
 * en el Developer Portal (si no, el censo devuelve 403). El bot debe estar ya
 * dentro del servidor. Crea un servidor de prueba, mete 2-3 cuentas recién
 * creadas y confirma que el detector las marca y que pctBotsEstimado sube.
 */
require('dotenv').config();
const DiscordBot = require('../integraciones/discord');
const { analyzeGuild } = require('../services/discordAuthenticityService');

function arg(flag, def) {
  const i = process.argv.indexOf(flag);
  return i !== -1 && process.argv[i + 1] ? process.argv[i + 1] : def;
}

async function main() {
  const guildId = process.argv[2];
  if (!guildId || guildId.startsWith('--')) {
    console.error('Uso: node scripts/discord-authenticity-probe.js <guildId> [--window 14] [--max-members 60]');
    process.exit(1);
  }
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) {
    console.error('Falta DISCORD_BOT_TOKEN en el entorno.');
    process.exit(1);
  }

  const windowDays = parseInt(arg('--window', '14'), 10);
  const maxPages = parseInt(arg('--max-members', '60'), 10);

  const bot = new DiscordBot(token);
  console.log(`\n🔎 Analizando guild ${guildId} (ventana ${windowDays}d)...\n`);

  let report;
  try {
    report = await analyzeGuild(bot, guildId, {
      memberOpts: { maxPages },
      activityOpts: { windowDays },
    });
  } catch (err) {
    console.error('❌ Error:', err.message);
    if (/intent|members|403|GUILD_MEMBERS/i.test(err.message)) {
      console.error('   → ¿Está activado el "Server Members Intent" en el Developer Portal?');
    }
    process.exit(1);
  }

  const m = report.membership;
  const e = report.engagement;
  const pct = (v) => (v === null ? 'n/d' : `${v}%`);
  const num = (v) => (v === null ? 'n/d' : v);
  const ratio = (v) => (v === null ? 'n/d' : `${(v * 100).toFixed(1)}%`);

  console.log('═'.repeat(52));
  console.log(`  pctBotsEstimado   : ${num(report.pctBotsEstimado)}/100  (alto = más sospechoso)`);
  console.log(`  authenticityScore : ${num(report.authenticityScore)}/100  (alto = más limpio)`);
  console.log('─'.repeat(52));
  console.log('  Membresía');
  console.log(`    censo            : ${m.censusSize}${m.censusTruncated ? ' (TRUNCADO)' : ''}`);
  console.log(`    bots declarados  : ${m.declaredBots}`);
  console.log(`    cuentas <30d     : ${pct(m.pctCuentasNuevas)}`);
  console.log(`    edad mediana     : ${num(m.accountAgeMedianDays)} días`);
  console.log(`    altas en ráfaga  : ${ratio(m.joinBurstScore)}`);
  console.log(`    sin avatar       : ${pct(m.pctSinAvatar)}`);
  console.log('  Reach / engagement');
  console.log(`    ratio online     : ${ratio(report.reach.presenceRatio)}`);
  console.log(`    autores únicos   : ${e.uniqueAuthors}`);
  console.log(`    engagement rate  : ${e.engagementRate === null ? 'n/d' : (e.engagementRate * 100).toFixed(2) + '%'}`);
  console.log(`    msgs/día         : ${num(e.messagesPerDay)}`);
  console.log(`    Gini actividad   : ${num(report.distribution.giniActividad)}`);
  console.log('─'.repeat(52));
  console.log(`  flags             : ${report.flags.length ? report.flags.join(', ') : '(ninguna)'}`);
  console.log(`  datos             : membresía=${report.dataAvailability.membership} actividad=${report.dataAvailability.activity}`);
  console.log('═'.repeat(52));
  console.log();
  process.exit(0);
}

main();
