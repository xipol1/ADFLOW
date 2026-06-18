#!/usr/bin/env node
/**
 * Legal documents build step for Channelad.
 *
 * Single source of truth = docs/legal/*.html. This script:
 *   1. Copies every legal HTML doc → client/public/legal/<slug>.html so the
 *      SPA can serve the CANONICAL document (what the user reads === what they
 *      legally accept). We do NOT read docs/** from a backend fs route because
 *      docs/** is not reliably bundled into Vercel serverless functions.
 *   2. Computes a deterministic sha256 + short version per document.
 *   3. Writes a manifest consumed by BOTH sides:
 *        - config/legalManifest.json        → backend `require()` (committed)
 *        - client/public/legal/manifest.json → frontend `fetch()` (generated)
 *      The manifest also carries the role→required-docs mapping that drives the
 *      clickwrap checkboxes and the derived `requiresTermsAcceptance`.
 *
 * Versioning is content-derived: editing a doc changes its hash → its version,
 * which makes prior acceptances stale and re-triggers the consent gate. So
 * finalising a draft (e.g. condiciones-creador v0.9 → v1.0) needs no code
 * change — just edit the HTML and re-run `npm run legal:build`.
 *
 * Usage: node scripts/legal-build.js
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.resolve(__dirname, '..');
const LEGAL_SRC = path.join(ROOT, 'docs', 'legal');
// Vite's publicDir is the project-root /public (see vite.config.js — it serves
// /public, the same dir as /public/blog, NOT client/public). Assets written
// here are served at /legal/* in dev and copied into the build output.
const PUBLIC_OUT = path.join(ROOT, 'public', 'legal');
const MANIFEST_BACKEND = path.join(ROOT, 'config', 'legalManifest.json');
const MANIFEST_PUBLIC = path.join(PUBLIC_OUT, 'manifest.json');

// Documentos que cada rol debe aceptar (clickwrap) antes de operar. Coincide
// con docs/legal/informe-requisitos-legales.md §3-4. NDA/DPA quedan fuera de
// esta fase. Cada slug DEBE existir como <slug>.html en docs/legal.
const REQUIRED = {
  creator: ['terminos-condiciones', 'condiciones-creador', 'politica-privacidad'],
  advertiser: ['terminos-condiciones', 'condiciones-contratacion', 'condiciones-anunciante', 'politica-privacidad'],
};

// Etiquetas cortas para las casillas (opcional). Si falta, se usa el <title>.
const ETIQUETAS = {
  'terminos-condiciones': 'Términos y Condiciones de uso',
  'politica-privacidad': 'Política de Privacidad',
  'condiciones-creador': 'Condiciones del Creador (incl. titularidad del canal)',
  'condiciones-anunciante': 'Condiciones del Anunciante',
  'condiciones-contratacion': 'Condiciones de Contratación',
};

// Normalise CRLF → LF so the hash is identical on Windows and CI/Linux.
const normalise = (s) => s.replace(/\r\n/g, '\n');

function extractTitle(html, slug) {
  const m = html.match(/<title>([\s\S]*?)<\/title>/i);
  let title = m ? m[1].trim() : '';
  if (!title) {
    const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
    title = h1 ? h1[1].replace(/<[^>]+>/g, '').trim() : slug;
  }
  // Decode the dash entities some docs use in <title> so the suffix strip and
  // the viewer header render cleanly.
  title = title.replace(/&mdash;/gi, '—').replace(/&ndash;/gi, '–');
  // Strip the " — Channelad" / " - Channelad" suffix.
  return title.replace(/\s*[—–-]\s*Channelad\s*$/i, '').trim() || slug;
}

function build() {
  if (!fs.existsSync(LEGAL_SRC)) {
    console.error(`[legal:build] No existe ${LEGAL_SRC}`);
    process.exit(1);
  }
  fs.mkdirSync(PUBLIC_OUT, { recursive: true });
  fs.mkdirSync(path.dirname(MANIFEST_BACKEND), { recursive: true });

  const files = fs.readdirSync(LEGAL_SRC).filter((f) => f.toLowerCase().endsWith('.html'));
  const documents = {};

  for (const file of files) {
    const slug = file.replace(/\.html$/i, '');
    const raw = normalise(fs.readFileSync(path.join(LEGAL_SRC, file), 'utf8'));
    const hash = crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
    const version = hash.slice(0, 12);
    const titulo = extractTitle(raw, slug);

    // Serve the normalised content so what's served matches what we hashed.
    fs.writeFileSync(path.join(PUBLIC_OUT, file), raw, 'utf8');

    documents[slug] = {
      slug,
      titulo,
      ...(ETIQUETAS[slug] ? { etiqueta: ETIQUETAS[slug] } : {}),
      version,
      hash,
      url: `/legal/${slug}.html`,
    };
  }

  // Fail loudly if a required doc is missing — a silent gap here would let a
  // role register without ever being asked to accept a mandatory document.
  for (const [rol, slugs] of Object.entries(REQUIRED)) {
    for (const slug of slugs) {
      if (!documents[slug]) {
        console.error(`[legal:build] Falta el documento requerido "${slug}.html" para el rol "${rol}"`);
        process.exit(1);
      }
    }
  }

  // Deterministic output (sorted keys, no timestamp) so the committed backend
  // manifest only changes when document content changes.
  const manifest = {
    documents: Object.fromEntries(Object.keys(documents).sort().map((k) => [k, documents[k]])),
    required: REQUIRED,
  };
  const json = JSON.stringify(manifest, null, 2) + '\n';
  fs.writeFileSync(MANIFEST_BACKEND, json, 'utf8');
  fs.writeFileSync(MANIFEST_PUBLIC, json, 'utf8');

  console.log(`[legal:build] ${files.length} documentos → public/legal/ + manifest (backend & público)`);
}

build();
