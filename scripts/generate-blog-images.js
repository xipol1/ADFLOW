#!/usr/bin/env node
/**
 * Blog cover/OG image generator for Channelad
 * --------------------------------------------
 * For every Markdown article in content/blog/, produces an ORIGINAL, on-brand
 * cover image (no stock photos, no hotlinks):
 *   - public/blog/img/<slug>.svg  → crisp in-page hero (browser-rendered)
 *   - public/blog/img/<slug>.png  → 1200x630 raster for og:image / twitter:image
 *                                   (social crawlers do NOT render SVG)
 *
 * The design is unique per post (title + platform colour + category badge) so
 * Google sees a distinct image per URL instead of one shared og-default.png.
 *
 * Runs before scripts/build-blog.js (see package.json "build"). The PNG step
 * uses sharp; if sharp is unavailable the SVG still ships and build-blog falls
 * back to og-default.png for the social card.
 *
 * Usage: node scripts/generate-blog-images.js
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const OUT_DIR = path.join(ROOT, 'public', 'blog', 'img');

// ─── Brand palette (mirrors build-blog.js / _template.html) ───
const PLATFORM = {
  telegram:    { accent: '#229ED9', glow: '#2bb6f0', label: 'Telegram' },
  whatsapp:    { accent: '#25D366', glow: '#3ee87f', label: 'WhatsApp' },
  discord:     { accent: '#5865F2', glow: '#7a86ff', label: 'Discord' },
  instagram:   { accent: '#E1306C', glow: '#ff5a90', label: 'Instagram' },
  newsletter:  { accent: '#F59E0B', glow: '#ffba3d', label: 'Newsletter' },
  all:         { accent: '#7C3AED', glow: '#a78bfa', label: 'Channelad' },
};
const CATEGORY_ACCENT = {
  Guias: '#3b82f6',
  Monetizacion: '#10b981',
  Comparativas: '#7C3AED',
  Herramientas: '#F59E0B',
};

// ─── Frontmatter parser (same contract as build-blog.js) ───
function parseFrontmatter(content) {
  const normalised = content.replace(/\r\n/g, '\n');
  const match = normalised.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: normalised };
  const meta = {};
  match[1].split('\n').forEach(line => {
    const idx = line.indexOf(':');
    if (idx === -1) return;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    meta[key] = val;
  });
  return { meta, body: match[2] };
}

// ─── Load platform map from blogPosts.js (single source of truth) ───
const BLOG_POSTS_PATH = path.join(ROOT, 'client', 'src', 'ui', 'pages', 'blog', 'blogPosts.js');
function loadPlatformMap() {
  const map = {};
  try {
    const src = fs.readFileSync(BLOG_POSTS_PATH, 'utf-8');
    const re = /slug:\s*['"]([^'"]+)['"][\s\S]*?platform:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) map[m[1]] = m[2];
  } catch { /* ignore */ }
  return map;
}

// Fallback platform inference from the slug for markdown-only posts that are not
// registered in blogPosts.js and carry no `platform:` frontmatter.
function inferPlatform(slug) {
  const s = slug.toLowerCase();
  if (/telegram|telega|telemetr|tgstat|combot|fragment|adsgram|admixer/.test(s)) return 'telegram';
  if (/whatsapp/.test(s)) return 'whatsapp';
  if (/discord/.test(s)) return 'discord';
  if (/instagram|difusion/.test(s)) return 'instagram';
  if (/newsletter|substack|beehiiv|mailchimp/.test(s)) return 'newsletter';
  return 'all';
}

// ─── XML escape for SVG text ───
function esc(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ─── Greedy word-wrap into <= maxLines lines of <= maxChars chars ───
function wrapTitle(title, maxChars, maxLines) {
  const words = title.trim().split(/\s+/);
  const lines = [];
  let cur = '';
  for (const w of words) {
    const candidate = cur ? `${cur} ${w}` : w;
    if (candidate.length > maxChars && cur) {
      lines.push(cur);
      cur = w;
      if (lines.length === maxLines - 1) break;
    } else {
      cur = candidate;
    }
  }
  if (cur) lines.push(cur);
  // If we ran out of lines, append the remaining words to the last line and ellipsize.
  const used = lines.join(' ').split(/\s+/).length;
  if (used < words.length) {
    let last = lines[lines.length - 1];
    const rest = words.slice(used).join(' ');
    last = `${last} ${rest}`;
    if (last.length > maxChars) last = last.slice(0, maxChars - 1).trim() + '…';
    lines[lines.length - 1] = last;
  }
  return lines.slice(0, maxLines);
}

// ─── Build the cover SVG markup ───
function buildCoverSvg({ title, platform, category, readTime, lang }) {
  const p = PLATFORM[platform] || PLATFORM.all;
  const catAccent = CATEGORY_ACCENT[category] || p.accent;
  const W = 1200, H = 630;
  // Wrap tighter (23 chars) and scale the font down a notch so even the longest
  // titles keep a comfortable right margin and never crowd the decorative rings.
  const titleLines = wrapTitle(title, 23, 4);
  const fontSize = titleLines.length >= 4 ? 56 : titleLines.length === 3 ? 64 : 72;
  const lineHeight = Math.round(fontSize * 1.12);
  // Vertically centre the title block around y≈350.
  const blockHeight = titleLines.length * lineHeight;
  let ty = 360 - blockHeight / 2 + fontSize * 0.8;

  const tspans = titleLines
    .map((ln, i) => `<tspan x="90" dy="${i === 0 ? 0 : lineHeight}">${esc(ln)}</tspan>`)
    .join('');

  // Badges: category pill, then platform pill spaced after it (no overlap).
  const catLabel = (category || 'Guias').toUpperCase();
  const catWidth = 32 + catLabel.length * 11;
  const platformPill = platform && platform !== 'all'
    ? `<g transform="translate(${90 + catWidth + 14},150)">
         <rect x="0" y="-26" width="${44 + p.label.length * 11}" height="36" rx="18" fill="${p.accent}" opacity="0.16"/>
         <circle cx="22" cy="-8" r="5" fill="${p.accent}"/>
         <text x="38" y="-2" font-family="DejaVu Sans, Verdana, sans-serif" font-size="17" font-weight="700" fill="${p.glow}" letter-spacing="0.4">${esc(p.label.toUpperCase())}</text>
       </g>`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#16161a"/>
      <stop offset="60%" stop-color="#1D1D1F"/>
      <stop offset="100%" stop-color="#241a3a"/>
    </linearGradient>
    <radialGradient id="glow" cx="0.82" cy="0.28" r="0.6">
      <stop offset="0%" stop-color="${p.accent}" stop-opacity="0.42"/>
      <stop offset="55%" stop-color="${p.accent}" stop-opacity="0.10"/>
      <stop offset="100%" stop-color="${p.accent}" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="${p.accent}"/>
      <stop offset="100%" stop-color="${p.glow}"/>
    </linearGradient>
    <pattern id="dots" width="26" height="26" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1.4" fill="#ffffff" opacity="0.05"/>
    </pattern>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <rect width="${W}" height="${H}" fill="url(#dots)"/>
  <rect width="${W}" height="${H}" fill="url(#glow)"/>

  <!-- decorative concentric rings (abstract "broadcast" motif, platform-tinted) -->
  <g transform="translate(1052,132)" fill="none" stroke="${p.accent}" stroke-opacity="0.18">
    <circle r="54" stroke-width="2"/>
    <circle r="110" stroke-width="2" stroke-opacity="0.12"/>
    <circle r="172" stroke-width="2" stroke-opacity="0.07"/>
  </g>
  <circle cx="1052" cy="132" r="13" fill="${p.accent}" opacity="0.85"/>

  <!-- wordmark -->
  <text x="90" y="92" font-family="DejaVu Sans, Verdana, sans-serif" font-size="30" font-weight="700" fill="#ffffff" letter-spacing="-0.5">Channel<tspan fill="${p.glow}">ad</tspan></text>

  <!-- category badge -->
  <g transform="translate(90,150)">
    <rect x="0" y="-26" width="${catWidth}" height="36" rx="8" fill="${catAccent}" opacity="0.16"/>
    <text x="16" y="-2" font-family="DejaVu Sans, Verdana, sans-serif" font-size="16" font-weight="700" fill="${catAccent}" letter-spacing="1.2">${esc(catLabel)}</text>
  </g>
  ${platformPill}

  <!-- accent bar -->
  <rect x="90" y="${ty - fontSize - 28}" width="64" height="5" rx="2.5" fill="url(#accent)"/>

  <!-- title -->
  <text x="90" y="${ty}" font-family="Georgia, 'Times New Roman', serif" font-size="${fontSize}" font-weight="400" fill="#ffffff" letter-spacing="-1">${tspans}</text>

  <!-- footer -->
  <text x="90" y="572" font-family="DejaVu Sans, Verdana, sans-serif" font-size="20" fill="#ffffff" opacity="0.42">channelad.io${readTime ? `  ·  ${esc(readTime)}` : ''}</text>
  <text x="${W - 90}" y="572" text-anchor="end" font-family="DejaVu Sans, Verdana, sans-serif" font-size="18" fill="#ffffff" opacity="0.30">${lang === 'en' ? 'Community advertising' : 'Publicidad en comunidades'}</text>
</svg>`;
}

async function main() {
  console.log('\n\u{1F5BC}️  Channelad Blog Image Generator\n');
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const platformMap = loadPlatformMap();
  const mdFiles = fs.existsSync(CONTENT_DIR)
    ? fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'))
    : [];
  if (mdFiles.length === 0) {
    console.log('⚠️  No .md files found in', CONTENT_DIR);
    return;
  }

  // sharp is optional: degrade gracefully to SVG-only if it cannot load.
  let sharp = null;
  try { sharp = require('sharp'); }
  catch (e) { console.warn('⚠️  sharp not available — PNG (og:image) step skipped:', e.message); }

  let svgCount = 0, pngCount = 0;
  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { meta } = parseFrontmatter(raw);
    if (!meta.slug || !meta.title) continue;

    const platform = meta.platform || platformMap[meta.slug] || inferPlatform(meta.slug);
    const svg = buildCoverSvg({
      title: meta.title,
      platform,
      category: meta.category || 'Guias',
      readTime: meta.readTime || '',
      lang: meta.lang || 'es',
    });

    const svgPath = path.join(OUT_DIR, `${meta.slug}.svg`);
    fs.writeFileSync(svgPath, svg, 'utf-8');
    svgCount++;

    if (sharp) {
      try {
        await sharp(Buffer.from(svg)).png({ quality: 90 }).toFile(path.join(OUT_DIR, `${meta.slug}.png`));
        pngCount++;
      } catch (e) {
        console.warn(`  ⚠️  PNG failed for ${meta.slug}: ${e.message}`);
      }
    }
    console.log(`  ✅ ${meta.slug} (${platform})`);
  }

  console.log(`\n✨ Generated ${svgCount} SVG + ${pngCount} PNG cover(s) → public/blog/img/\n`);
}

main().catch(e => { console.error(e); process.exit(1); });
