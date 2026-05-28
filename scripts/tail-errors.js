#!/usr/bin/env node
/**
 * scripts/tail-errors.js — Pretty-print recent production errors from
 * the ErrorLog collection (populated by services/errorLogger.js).
 *
 * Usage:
 *   node scripts/tail-errors.js                # last 20 errors
 *   node scripts/tail-errors.js 50             # last 50
 *   node scripts/tail-errors.js 20 --since 1h  # last 20 within last 1 hour
 *   node scripts/tail-errors.js --watch        # poll every 10s
 *   node scripts/tail-errors.js --path /api/auth    # filter by path substring
 *   node scripts/tail-errors.js --user 6abc123     # filter by userId
 *
 * Reads MONGODB_URI from .env automatically. Run from repo root.
 */

require('dotenv').config();
const mongoose = require('mongoose');

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : null;
};
const has = (name) => args.includes(name);

const limit = Number(args.find((a) => /^\d+$/.test(a))) || 20;
const watch = has('--watch');
const sinceHours = flag('--since')
  ? Number(String(flag('--since')).replace(/h$/, '')) || 1
  : null;
const pathFilter = flag('--path');
const userFilter = flag('--user');

const COLORS = {
  reset: '\x1b[0m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  gray: '\x1b[90m',
  bold: '\x1b[1m',
};

const c = (color, text) => `${COLORS[color]}${text}${COLORS.reset}`;

const fmtDate = (d) => {
  const dt = new Date(d);
  return dt.toISOString().replace('T', ' ').slice(0, 19);
};

const fmtAgo = (d) => {
  const diff = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (diff < 60) return `${diff}s ago`;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

const printError = (err) => {
  const statusColor =
    err.statusCode >= 500 ? 'red' : err.statusCode >= 400 ? 'yellow' : 'cyan';
  const lvlColor = err.level === 'fatal' ? 'red' : err.level === 'warn' ? 'yellow' : 'red';

  console.log(
    `${c('gray', fmtDate(err.createdAt))} ${c('gray', `[${fmtAgo(err.createdAt)}]`)} ` +
      `${c(lvlColor, err.level.toUpperCase().padEnd(5))} ` +
      `${c(statusColor, String(err.statusCode || '???').padEnd(3))} ` +
      `${c('cyan', (err.method || '?').padEnd(4))} ${c('bold', err.path || '(no path)')}` +
      `${err.userId ? c('dim', ` user=${err.userId}`) : ''}`,
  );
  console.log(`  ${c('red', err.message)}`);
  if (err.stack) {
    const lines = err.stack.split('\n').slice(0, 4);
    lines.forEach((l) => console.log(c('gray', '  ' + l.trim())));
  }
  console.log();
};

let lastSeenId = null;

const queryAndPrint = async (ErrorLog) => {
  const filter = {};
  if (sinceHours) filter.createdAt = { $gte: new Date(Date.now() - sinceHours * 3600000) };
  if (pathFilter) filter.path = { $regex: pathFilter, $options: 'i' };
  if (userFilter) filter.userId = userFilter;
  if (watch && lastSeenId) filter._id = { $gt: lastSeenId };

  const items = await ErrorLog.find(filter)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  if (!items.length) {
    if (!watch) console.log(c('green', '✓ No errors found.'));
    return;
  }

  // Reverse so newest at bottom of terminal (standard tail behavior)
  items.reverse().forEach(printError);

  if (items.length) lastSeenId = items[items.length - 1]._id;
};

const main = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(c('red', 'MONGODB_URI no configurado en .env'));
    process.exit(1);
  }

  console.log(c('dim', `Conectando a Mongo… (limit=${limit}${sinceHours ? `, since=${sinceHours}h` : ''}${pathFilter ? `, path~${pathFilter}` : ''}${userFilter ? `, user=${userFilter}` : ''}${watch ? ', watch=on' : ''})`));

  await mongoose.connect(uri, { serverSelectionTimeoutMS: 8000 });

  const ErrorLogSchema = new mongoose.Schema({}, { strict: false, collection: 'errorlogs' });
  const ErrorLog = mongoose.models.ErrorLog || mongoose.model('ErrorLog', ErrorLogSchema);

  await queryAndPrint(ErrorLog);

  if (!watch) {
    await mongoose.disconnect();
    return;
  }

  console.log(c('dim', '── watching for new errors (Ctrl-C para salir) ──'));
  setInterval(() => queryAndPrint(ErrorLog).catch((e) => console.error(c('red', e.message))), 10000);
};

main().catch((err) => {
  console.error(c('red', 'tail-errors failed:'), err.message);
  process.exit(1);
});
