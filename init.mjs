#!/usr/bin/env node
// init.mjs — verificación de entorno y arnés para Channelad.
// Corre con `npm run verify`. Devuelve exit code 0 si todo OK, 1 si algún check crítico falla.
// Cross-platform (Node 20+). No tiene dependencias propias — solo stdlib.

import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const ROOT = process.cwd();
const isTTY = process.stdout.isTTY;
const c = {
  green:  (s) => isTTY ? `\x1b[32m${s}\x1b[0m` : s,
  yellow: (s) => isTTY ? `\x1b[33m${s}\x1b[0m` : s,
  red:    (s) => isTTY ? `\x1b[31m${s}\x1b[0m` : s,
  dim:    (s) => isTTY ? `\x1b[2m${s}\x1b[0m`  : s,
  bold:   (s) => isTTY ? `\x1b[1m${s}\x1b[0m` : s,
};

const results = { ok: 0, warn: 0, fail: 0 };
function ok(label, detail = '') {
  results.ok++;
  console.log(`${c.green('[OK]  ')} ${label}${detail ? c.dim(`  ${detail}`) : ''}`);
}
function warn(label, detail = '') {
  results.warn++;
  console.log(`${c.yellow('[WARN]')} ${label}${detail ? c.dim(`  ${detail}`) : ''}`);
}
function fail(label, detail = '') {
  results.fail++;
  console.log(`${c.red('[FAIL]')} ${label}${detail ? c.dim(`  ${detail}`) : ''}`);
}

function section(title) {
  console.log('\n' + c.bold(title));
}

function fileExists(rel) {
  return fs.existsSync(path.join(ROOT, rel));
}

function tryExec(cmd, opts = {}) {
  try {
    const out = execSync(cmd, { cwd: ROOT, stdio: 'pipe', encoding: 'utf8', ...opts });
    return { ok: true, out };
  } catch (err) {
    return { ok: false, code: err.status, out: (err.stdout || '') + (err.stderr || '') };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
console.log(c.bold('\nChannelad — verify\n') + c.dim('(arnés de sesión — corre antes de empezar y antes de cerrar)\n'));

// 1. Node version
section('1. Entorno');
{
  const v = process.versions.node.split('.').map(n => parseInt(n, 10));
  if (v[0] >= 20) ok(`Node ${process.versions.node}`);
  else fail(`Node ${process.versions.node} — se requiere >= 20`);
}

if (fileExists('node_modules')) ok('node_modules/ presente');
else fail('node_modules/ ausente — corre `npm install`');

// 2. Arnés (archivos base)
section('2. Arnés');
const harnessFiles = [
  'CLAUDE.md',
  'CHECKPOINTS.md',
  '.specify/memory/constitution.md',
  '.specify/memory/wording-playbook.md',
  'progress/current.md',
  'progress/history.md',
  '.claude/agents/leader.md',
  '.claude/agents/implementer.md',
  '.claude/agents/reviewer.md',
];
for (const f of harnessFiles) {
  if (fileExists(f)) ok(`${f} existe`);
  else fail(`${f} ausente`);
}

// 3. Estado del repo
section('3. Estado del repo');
{
  const status = tryExec('git status --porcelain');
  if (!status.ok) {
    warn('git status falló', '¿estás dentro de un repo git?');
  } else {
    const lines = status.out.split('\n').filter(l => l.trim());
    const envModified = lines.some(l => /\s\.env(\s|$)/.test(l) || / \.env$/.test(l));
    if (envModified) {
      fail('.env modificado o sin trackear', 'no se commitean secretos; revisa antes de continuar');
    } else {
      ok('.env no modificado');
    }
    if (lines.length === 0) ok('working tree limpio');
    else warn(`working tree con ${lines.length} cambio(s)`, 'documenta en progress/current.md si la sesión está activa');
  }
}

// 4. Spec activo y tasks.md
section('4. Spec activo');
{
  const specsDir = path.join(ROOT, 'specs');
  if (!fs.existsSync(specsDir)) {
    warn('specs/ no existe', 'no hay spec activo (válido fuera de feature work)');
  } else {
    const specs = fs.readdirSync(specsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name)
      .filter(name => fs.existsSync(path.join(specsDir, name, 'tasks.md')));
    if (specs.length === 0) {
      ok('sin spec activo', 'fuera de feature work — válido');
    } else {
      for (const spec of specs) {
        const tasksPath = path.join('specs', spec, 'tasks.md');
        const content = fs.readFileSync(path.join(ROOT, tasksPath), 'utf8');
        // Cuenta marcadores en líneas tipo "- [X] T001 ..." / "- [ ] T002 ..." / "- [~] T003 ..."
        const lines = content.split('\n').filter(l => /^\s*-\s*\[[X x~ ]\]/i.test(l));
        const done = lines.filter(l => /^\s*-\s*\[[Xx]\]/.test(l)).length;
        const pending = lines.filter(l => /^\s*-\s*\[ \]/.test(l)).length;
        const deferred = lines.filter(l => /^\s*-\s*\[~\]/.test(l)).length;
        const total = done + pending + deferred;
        const detail = `${done} done · ${pending} pending · ${deferred} deferred · ${total} total`;
        if (deferred > 1) {
          warn(`${tasksPath}`, `${detail} — más de 1 tarea deferida [~]; deja máx 1 activa`);
        } else {
          ok(`${tasksPath}`, detail);
        }
      }
    }
  }
}

// 5. Lint
section('5. Lint');
if (process.env.SKIP_LINT === '1') {
  warn('lint saltado por SKIP_LINT=1');
} else {
  const r = tryExec('npm run lint --silent', { stdio: 'pipe' });
  if (r.ok) {
    ok('npm run lint pasa');
  } else {
    const tail = r.out.split('\n').slice(-8).join('\n');
    fail('npm run lint falla', 'últimas líneas:\n' + tail);
  }
}

// 6. Tests
section('6. Tests');
if (process.env.SKIP_TESTS === '1') {
  warn('tests saltados por SKIP_TESTS=1');
} else {
  const r = tryExec('npm test --silent -- --passWithNoTests', { stdio: 'pipe' });
  if (r.ok) {
    // Saca la línea de resumen de Jest si está
    const summary = (r.out.match(/Tests:.*$/m) || [''])[0];
    ok('npm test pasa', summary);
  } else {
    const tail = r.out.split('\n').slice(-12).join('\n');
    fail('npm test falla', 'últimas líneas:\n' + tail);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
section('Resumen');
console.log(`  ${c.green(results.ok + ' OK')}  ·  ${c.yellow(results.warn + ' WARN')}  ·  ${c.red(results.fail + ' FAIL')}`);

if (results.fail > 0) {
  console.log(c.red('\nVerify FAILED — corrige los FAIL antes de cerrar sesión.\n'));
  process.exit(1);
} else {
  console.log(c.green('\nVerify OK.\n'));
  process.exit(0);
}
