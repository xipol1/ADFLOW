#!/usr/bin/env node
/**
 * Static Blog Generator for Channelad
 * Converts Markdown articles in content/blog/ → static HTML in public/blog/
 * Generates: individual posts, blog index, sitemap.xml
 * Features: prev/next nav, related posts, keyword tags, author box
 *
 * Usage: node scripts/build-blog.js
 */

const fs = require('fs');
const path = require('path');
const { marked } = require('marked');

const ROOT = path.resolve(__dirname, '..');
const CONTENT_DIR = path.join(ROOT, 'content', 'blog');
const OUTPUT_DIR = path.join(ROOT, 'public', 'blog');
const TEMPLATE_PATH = path.join(CONTENT_DIR, '_template.html');
const SITEMAP_PATH = path.join(ROOT, 'public', 'sitemap.xml');
const DOMAIN = 'https://channelad.io';

// ─── Frontmatter parser ───
function parseFrontmatter(content) {
  // Normalise CRLF → LF so the regex works on files saved on Windows.
  // Without this, posts edited on Windows silently skip the build because the
  // \r terminator stops `^---\n` from matching the opening delimiter.
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
    if (val.startsWith('[') && val.endsWith(']')) {
      val = val.slice(1, -1).split(',').map(s => s.trim().replace(/^["']|["']$/g, ''));
    }
    meta[key] = val;
  });
  return { meta, body: match[2] };
}

// ─── Load FAQ data from blogPosts.js ───
const BLOG_POSTS_PATH = path.join(ROOT, 'client', 'src', 'ui', 'pages', 'blog', 'blogPosts.js');

// ─── Load platform map (slug → platform) from blogPosts.js ───
// We keep platform in a single source of truth (the React registry) and inject
// it into markdown posts so related-post scoring works correctly.
function loadPlatformMap() {
  const map = {};
  try {
    const src = fs.readFileSync(BLOG_POSTS_PATH, 'utf-8');
    const re = /slug:\s*['"]([^'"]+)['"][\s\S]*?platform:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      map[m[1]] = m[2];
    }
  } catch (e) {
    console.warn('⚠️  Could not load platform map:', e.message);
  }
  return map;
}

function loadFaqMap() {
  const faqMap = {};
  try {
    const src = fs.readFileSync(BLOG_POSTS_PATH, 'utf-8');
    // Extract each post block with slug and faq
    const postBlocks = src.split(/\{\s*\n\s*slug:/);
    for (const block of postBlocks) {
      const slugMatch = block.match(/['"]([^'"]+)['"]/);
      if (!slugMatch) continue;
      const slug = slugMatch[1];
      const faqMatch = block.match(/faq:\s*\[([\s\S]*?)\]\s*,?\s*\}/);
      if (!faqMatch) continue;
      const faqStr = faqMatch[1];
      const questions = [];
      const qRegex = /question:\s*['"`]([\s\S]*?)['"`]\s*,\s*answer:\s*['"`]([\s\S]*?)['"`]\s*\}/g;
      let m;
      while ((m = qRegex.exec(faqStr)) !== null) {
        // Decode \uXXXX escape sequences from JS source
        const decode = s => s.replace(/\\u([0-9a-fA-F]{4})/g, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
        questions.push({ question: decode(m[1]), answer: decode(m[2]) });
      }
      if (questions.length > 0) faqMap[slug] = questions;
    }
  } catch (e) {
    console.warn('⚠️  Could not load FAQ data from blogPosts.js:', e.message);
  }

  // Merge FAQ for markdown-only posts not registered in blogPosts.js
  // (content/blog/faq-extra.json). The React app never imports this file.
  try {
    const extraPath = path.join(CONTENT_DIR, 'faq-extra.json');
    if (fs.existsSync(extraPath)) {
      const extra = JSON.parse(fs.readFileSync(extraPath, 'utf-8'));
      for (const [slug, qs] of Object.entries(extra)) {
        if (slug.startsWith('_')) continue;
        if (!faqMap[slug] && Array.isArray(qs) && qs.length > 0) faqMap[slug] = qs;
      }
    }
  } catch (e) {
    console.warn('⚠️  Could not load faq-extra.json:', e.message);
  }

  return faqMap;
}

// ─── Extract published post slugs/dates from blogPosts.js for sitemap ───
function loadReactOnlyPosts(mdSlugs) {
  const reactPosts = [];
  try {
    const src = fs.readFileSync(BLOG_POSTS_PATH, 'utf-8');
    const today = new Date().toISOString().slice(0, 10);
    // Match slug and date from each post block
    const blockRegex = /\{\s*\n\s*slug:\s*['"]([^'"]+)['"][\s\S]*?date:\s*['"]([^'"]+)['"]/g;
    let m;
    while ((m = blockRegex.exec(src)) !== null) {
      const slug = m[1];
      const date = m[2];
      // Only include posts that are published (date <= today) and NOT already in markdown
      if (date <= today && !mdSlugs.has(slug)) {
        reactPosts.push({ slug, date });
      }
    }
  } catch (e) {
    console.warn('⚠️  Could not load React-only posts from blogPosts.js:', e.message);
  }
  return reactPosts;
}

function buildFaqSchema(slug, faqMap) {
  const faqs = faqMap[slug];
  if (!faqs || faqs.length === 0) return '';
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(q => ({
      '@type': 'Question',
      name: q.question,
      acceptedAnswer: { '@type': 'Answer', text: q.answer },
    })),
  };
  return `<script type="application/ld+json">\n  ${JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;
}

// ─── Configure marked ───
marked.setOptions({ gfm: true, breaks: false, smartypants: false });

// ─── HTML attribute escape (alt text, etc.) ───
function escAttr(s) {
  return String(s || '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ─── GitHub-compatible heading slugger ───
// Replicates the anchor convention the manual "Índice de contenidos" blocks in
// the markdown were authored against: lowercase, keep accents/ñ, strip
// punctuation (: ( ) ¿ ? , …), spaces → hyphens. marked v18 adds NO heading ids
// on its own, so without this the manual TOC anchors are dead links.
function makeSlugger() {
  const seen = new Map();
  return (text) => {
    let base = text
      .toLowerCase()
      .trim()
      .replace(/[^\p{L}\p{N}\p{M}\p{Pc} -]+/gu, '')
      .replace(/ /g, '-');
    if (!base) base = 'section';
    if (seen.has(base)) {
      const n = seen.get(base) + 1;
      seen.set(base, n);
      return `${base}-${n}`;
    }
    seen.set(base, 0);
    return base;
  };
}

// ─── Add ids to h2/h3 + build a Table of Contents from the H2s ───
// Returns { html, tocHtml }. tocHtml is '' when the post already ships a manual
// "Índice" (detected via in-page anchor links) or has fewer than 4 H2s — so we
// never double up on posts that already have one.
function addHeadingIdsAndToc(htmlBody, lang) {
  const slugger = makeSlugger();
  const h2s = [];
  const html = htmlBody.replace(/<h([23])>([\s\S]*?)<\/h\1>/g, (m, lvl, inner) => {
    const text = inner.replace(/<[^>]+>/g, '').trim();
    const id = slugger(text);
    if (lvl === '2') h2s.push({ id, text });
    return `<h${lvl} id="${id}">${inner}</h${lvl}>`;
  });

  const hasManualToc = /href="#[^"]/.test(htmlBody);
  if (hasManualToc || h2s.length < 4) return { html, tocHtml: '' };

  const label = lang === 'en' ? 'Contents' : 'Contenido';
  const items = h2s.map(h => `<li><a href="#${h.id}">${h.text}</a></li>`).join('\n        ');
  const tocHtml = `<nav class="post-toc" aria-label="${label}">
      <div class="post-toc-title">${label}</div>
      <ol>
        ${items}
      </ol>
    </nav>`;
  return { html, tocHtml };
}

// ─── Resolve per-post cover/OG images generated by generate-blog-images.js ───
const BLOG_IMG_DIR = path.join(ROOT, 'public', 'blog', 'img');
function resolvePostImages(slug, title) {
  const hasPng = fs.existsSync(path.join(BLOG_IMG_DIR, `${slug}.png`));
  const hasSvg = fs.existsSync(path.join(BLOG_IMG_DIR, `${slug}.svg`));
  // Social crawlers don't render SVG → PNG for og:image, SVG (crisp) for the hero.
  const ogImage = hasPng ? `${DOMAIN}/blog/img/${slug}.png` : `${DOMAIN}/og-default.png`;
  const heroSrc = hasSvg ? `/blog/img/${slug}.svg` : (hasPng ? `/blog/img/${slug}.png` : '');
  const heroHtml = heroSrc
    ? `<figure class="article-hero"><img src="${heroSrc}" alt="${escAttr(title)}" width="1200" height="630"></figure>`
    : '';
  return { ogImage, heroHtml };
}

// ─── Format date as "24 de abril de 2026" ───
function formatDate(dateStr, lang) {
  if (!dateStr) return '';
  const d = new Date(dateStr + 'T00:00:00');
  const months = lang === 'en'
    ? ['January','February','March','April','May','June','July','August','September','October','November','December']
    : ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  const day = d.getDate();
  const month = months[d.getMonth()];
  const year = d.getFullYear();
  return lang === 'en' ? `${month} ${day}, ${year}` : `${day} de ${month} de ${year}`;
}

// ─── Generate tags HTML ───
function buildTagsHtml(keywords) {
  if (!keywords) return '';
  const kw = Array.isArray(keywords) ? keywords : keywords.split(',').map(s => s.trim());
  return kw.map(k => `<span class="tag">${k}</span>`).join('\n      ');
}

// ─── Generate prev/next HTML ───
function buildPrevNextHtml(posts, currentIdx) {
  const prev = currentIdx > 0 ? posts[currentIdx - 1] : null;
  const next = currentIdx < posts.length - 1 ? posts[currentIdx + 1] : null;

  if (!prev && !next) return '';

  let html = '  <nav class="post-nav">\n';
  if (prev) {
    html += `    <a href="/blog/${prev.slug}" class="post-nav-item prev">
      <span class="post-nav-label">← Anterior</span>
      <span class="post-nav-title">${prev.title}</span>
    </a>\n`;
  } else {
    html += '    <div></div>\n';
  }
  if (next) {
    html += `    <a href="/blog/${next.slug}" class="post-nav-item next">
      <span class="post-nav-label">Siguiente →</span>
      <span class="post-nav-title">${next.title}</span>
    </a>\n`;
  } else {
    html += '    <div></div>\n';
  }
  html += '  </nav>';
  return html;
}

// ─── Generate related posts HTML (topic-scored, not sequential) ───
function buildRelatedHtml(posts, currentSlug) {
  const current = posts.find(p => p.slug === currentSlug);
  const others = posts.filter(p => p.slug !== currentSlug);
  if (others.length === 0 || !current) return '';

  const asArr = kw => Array.isArray(kw) ? kw : (kw || '').split(',').map(s => s.trim()).filter(Boolean);
  const curKws = asArr(current.keywords).map(k => k.toLowerCase());

  // Score each candidate by topical relevance
  const scored = others.map(p => {
    let score = 0;
    if (p.platform && p.platform === current.platform) score += 4;
    if (p.category && p.category === current.category) score += 2;
    const pKws = asArr(p.keywords).map(k => k.toLowerCase());
    for (const k of curKws) {
      if (!k) continue;
      if (pKws.some(pk => pk.includes(k) || k.includes(pk))) score += 1;
    }
    // Tie-break by recency (newer first)
    return { post: p, score, date: p.date || '' };
  });
  scored.sort((a, b) => (b.score - a.score) || (b.date.localeCompare(a.date)));
  const related = scored.slice(0, 3).map(s => s.post);

  const cards = related.map(p => `
      <a href="/blog/${p.slug}" class="related-card">
        <span class="rc-cat">${p.category || 'Guias'}</span>
        <h3>${p.title}</h3>
        <span class="rc-meta">${p.readTime || '10 min'} · ${p.date || ''}</span>
      </a>`).join('\n');

  return `  <section class="related-section">
    <h2 class="related-header">Tambien te puede interesar</h2>
    <div class="related-grid">${cards}
    </div>
  </section>`;
}

// ─── Static internal links to core product pages ───
// Every post links to the main marketing pages. These are otherwise only
// reachable via the SPA nav (client-rendered), so HTML-only crawlers had no
// crawlable path to them from the indexed blog — this gives them link equity
// and crawl priority from ~all posts. Reuses the .related-* styles.
function buildExploreHtml() {
  const links = [
    { to: '/marketplace', label: 'Marketplace de canales', cat: 'Producto' },
    { to: '/rankings', label: 'Rankings de canales', cat: 'Datos' },
    { to: '/pricing', label: 'Precios y planes', cat: 'Producto' },
    { to: '/herramientas', label: 'Herramientas para anunciantes', cat: 'Anunciantes' },
    { to: '/que-es-channelad', label: 'Qué es Channelad', cat: 'Guia' },
  ];
  const cards = links.map(l => `
      <a href="${l.to}" class="related-card">
        <span class="rc-cat">${l.cat}</span>
        <h3>${l.label}</h3>
      </a>`).join('\n');
  return `  <section class="related-section">
    <h2 class="related-header">Explora Channelad</h2>
    <div class="related-grid">${cards}
    </div>
  </section>`;
}

// ─── Generate HowTo schema for guide-type posts ───
// Triggered by frontmatter `howto: "true"` on the post. Extracts steps by parsing
// the markdown body for H2 headings after the first "paso", or by numbered H2s.
function buildHowToSchema(meta) {
  if (meta.howto !== 'true') return '';
  const body = meta._body || '';
  // Find all H2 headings
  const h2s = [];
  const h2Re = /^##\s+(.+)$/gm;
  let m;
  while ((m = h2Re.exec(body)) !== null) {
    let heading = m[1].trim();
    // Skip non-step headings (ToC, intros, conclusions, tables, FAQs, etc.)
    if (/^(introducción|introduccion|qué es|que es|conclusión|conclusion|faq|preguntas|resumen|tabla|bonus|índice|indice|tldr|tl;dr|antes de empezar|para quien)/i.test(heading)) continue;
    // Get the text after the heading up to the next H2 (max 300 chars)
    const start = m.index + m[0].length;
    const nextH2 = body.indexOf('\n## ', start);
    const endIdx = nextH2 === -1 ? Math.min(start + 600, body.length) : nextH2;
    const stepBody = body.slice(start, endIdx).trim().replace(/\n+/g, ' ').replace(/[*#_`]/g, '').slice(0, 300);
    h2s.push({ name: heading, text: stepBody });
  }
  if (h2s.length < 3) return ''; // Not enough steps to be a real HowTo

  const steps = h2s.slice(0, 8).map((step, i) => ({
    '@type': 'HowToStep',
    position: i + 1,
    name: step.name,
    text: step.text,
  }));

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: meta.title,
    description: meta.description || '',
    totalTime: meta.readTime ? `PT${parseInt(meta.readTime)}M` : undefined,
    step: steps,
  };
  return `<script type="application/ld+json">\n  ${JSON.stringify(schema, null, 2).replace(/\n/g, '\n  ')}\n  </script>`;
}

// ─── hreflang alternates (bilingual ES↔EN) ───
// A post declares its counterpart via frontmatter `altLang: <other-language-slug>`.
// Both posts MUST reference each other (Google requires reciprocal hreflang).
// Dormant until a pair is declared: returns '' / undefined when altLang is absent,
// so monolingual posts emit nothing. x-default points to Spanish (primary market).
const HREFLANG_XDEFAULT = 'es';
function hreflangPair(p) {
  if (!p || !p.altLang) return null;
  const lang = p.lang === 'en' ? 'en' : 'es';
  const esSlug = lang === 'es' ? p.slug : p.altLang;
  const enSlug = lang === 'en' ? p.slug : p.altLang;
  return { esUrl: `${DOMAIN}/blog/${esSlug}`, enUrl: `${DOMAIN}/blog/${enSlug}` };
}
function buildHreflangTags(meta) {
  const pair = hreflangPair(meta);
  if (!pair) return '';
  const xdefault = HREFLANG_XDEFAULT === 'en' ? pair.enUrl : pair.esUrl;
  return [
    `<link rel="alternate" hreflang="es" href="${pair.esUrl}">`,
    `<link rel="alternate" hreflang="en" href="${pair.enUrl}">`,
    `<link rel="alternate" hreflang="x-default" href="${xdefault}">`,
  ].join('\n  ');
}
function hreflangAlternates(p) {
  const pair = hreflangPair(p);
  if (!pair) return undefined;
  const xdefault = HREFLANG_XDEFAULT === 'en' ? pair.enUrl : pair.esUrl;
  return [
    { hreflang: 'es', href: pair.esUrl },
    { hreflang: 'en', href: pair.enUrl },
    { hreflang: 'x-default', href: xdefault },
  ];
}

// ─── Main build ───
function build() {
  console.log('\n\u{1F4DD} Channelad Blog Builder\n');

  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  if (!fs.existsSync(TEMPLATE_PATH)) {
    console.error('\u274C Template not found:', TEMPLATE_PATH);
    process.exit(1);
  }
  const template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');

  const mdFiles = fs.readdirSync(CONTENT_DIR).filter(f => f.endsWith('.md'));
  if (mdFiles.length === 0) {
    console.log('\u26A0\uFE0F  No .md files found in', CONTENT_DIR);
    return;
  }

  // ─── Pass 1: Parse all posts ───
  const postsData = [];
  for (const file of mdFiles) {
    const raw = fs.readFileSync(path.join(CONTENT_DIR, file), 'utf-8');
    const { meta, body } = parseFrontmatter(raw);
    if (!meta.slug || !meta.title) {
      console.warn(`\u26A0\uFE0F  Skipping ${file}: missing slug or title`);
      continue;
    }
    postsData.push({ ...meta, _body: body });
  }

  // ─── Filter: only build posts with date <= today (scheduled publication) ───
  const today = new Date().toISOString().slice(0, 10);
  const publishedData = postsData.filter(p => !p.date || p.date <= today);
  const skippedCount = postsData.length - publishedData.length;
  if (skippedCount > 0) {
    console.log(`  ⏳ ${skippedCount} post(s) scheduled for future dates (not built)\n`);
  }
  postsData.length = 0;
  postsData.push(...publishedData);

  // Sort by date descending
  postsData.sort((a, b) => (b.date || '').localeCompare(a.date || ''));

  // ─── Load FAQ data ───
  const faqMap = loadFaqMap();
  console.log(`  📋 FAQ data loaded for ${Object.keys(faqMap).length} post(s)\n`);

  // ─── Load platform map and inject into postsData ───
  const platformMap = loadPlatformMap();
  for (const p of postsData) {
    if (!p.platform && platformMap[p.slug]) p.platform = platformMap[p.slug];
  }
  console.log(`  🏷️  Platform map loaded for ${Object.keys(platformMap).length} post(s)\n`);

  // ─── Pass 2: Generate HTML for each post ───
  const posts = []; // metadata only (no body)

  for (let i = 0; i < postsData.length; i++) {
    const meta = postsData[i];
    let htmlBody = marked.parse(meta._body);

    // Add heading ids (fixes anchor links) + auto-inject a TOC after the intro
    // for posts that don't already ship a manual "Índice".
    const { html: bodyWithIds, tocHtml } = addHeadingIdsAndToc(htmlBody, meta.lang || 'es');
    htmlBody = bodyWithIds;
    if (tocHtml) {
      const firstPClose = htmlBody.indexOf('</p>');
      htmlBody = firstPClose !== -1
        ? htmlBody.slice(0, firstPClose + 4) + '\n    ' + tocHtml + htmlBody.slice(firstPClose + 4)
        : tocHtml + htmlBody;
    }

    // Per-post branded cover (hero img) + og:image.
    const { ogImage, heroHtml } = resolvePostImages(meta.slug, meta.title);

    const tagsHtml = buildTagsHtml(meta.keywords);
    const prevNextHtml = buildPrevNextHtml(postsData, i);
    const relatedHtml = buildRelatedHtml(postsData, meta.slug) + '\n' + buildExploreHtml();

    const formattedDate = formatDate(meta.date, meta.lang || 'es');
    const dateISO = meta.date || '';
    const dateModifiedISO = meta.dateModified || meta.date || '';
    const faqSchema = buildFaqSchema(meta.slug, faqMap);
    const howtoSchema = buildHowToSchema(meta);
    const canonicalSlug = meta.canonical || meta.slug;
    const canonicalUrl = `${DOMAIN}/blog/${canonicalSlug}`;
    // Locale for og:locale — Notion strategy targets ES primarily, EN cluster for global reach.
    const ogLocale = (meta.lang === 'en') ? 'en_US' : 'es_ES';
    // wordCount for Article schema — strip markdown noise, count tokens by whitespace.
    const wordCount = (meta._body || '')
      .replace(/```[\s\S]*?```/g, ' ')
      .replace(/[*#_>`~|\-]+/g, ' ')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .split(/\s+/).filter(Boolean).length;

    if (meta.canonical) {
      console.log(`  🔗 ${meta.slug} → canonical: ${canonicalSlug}`);
    }

    let html = template
      .replace(/{{title}}/g, meta.title)
      .replace(/{{description}}/g, meta.description || '')
      .replace(/{{slug}}/g, meta.slug)
      .replace(/{{canonicalUrl}}/g, canonicalUrl)
      .replace(/{{hreflang}}/g, buildHreflangTags(meta))
      .replace(/{{dateISO}}/g, dateISO)
      .replace(/{{dateModifiedISO}}/g, dateModifiedISO)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{readTime}}/g, meta.readTime || '10 min')
      .replace(/{{category}}/g, meta.category || 'Guias')
      .replace(/{{lang}}/g, meta.lang || 'es')
      .replace(/{{keywords}}/g, Array.isArray(meta.keywords) ? meta.keywords.join(', ') : (meta.keywords || ''))
      .replace(/{{content}}/g, htmlBody)
      .replace(/{{hero_html}}/g, heroHtml)
      .replace(/{{ogImage}}/g, ogImage)
      .replace(/{{domain}}/g, DOMAIN)
      .replace(/{{tags_html}}/g, tagsHtml)
      .replace(/{{prev_next_html}}/g, prevNextHtml)
      .replace(/{{related_html}}/g, relatedHtml)
      .replace(/{{faq_schema}}/g, faqSchema)
      .replace(/{{howto_schema}}/g, howtoSchema)
      .replace(/{{ogLocale}}/g, ogLocale)
      .replace(/{{wordCount}}/g, String(wordCount));

    // Skip static HTML for posts that need SPA (interactive components)
    if (meta.spaOnly === 'true') {
      console.log(`  ⚛️  ${meta.slug} (SPA-only, skipping static HTML)`);
    } else {
      const outFile = path.join(OUTPUT_DIR, `${meta.slug}.html`);
      fs.writeFileSync(outFile, html, 'utf-8');
      console.log(`  \u2705 ${meta.slug}.html (${meta.readTime})`);
    }

    const { _body, ...cleanMeta } = meta;
    posts.push(cleanMeta);
  }

  // ─── Generate blog index.html ───
  // Pillars: posts with pillar:"true" — surface at top in dedicated section.
  // Order: Telegram pillar, WhatsApp pillar, Discord pillar, Calculadora (Herramientas).
  const PILLAR_ORDER = [
    'como-monetizar-canal-telegram',
    'como-monetizar-canal-whatsapp',
    'como-monetizar-servidor-discord',
    'calculadora-precios-publicidad',
  ];
  // Include React-only pillar posts (calculadora) by enriching from blogPosts.js when missing.
  const pillarBySlug = new Map(posts.filter(p => p.pillar === 'true' || p.pillar === true).map(p => [p.slug, p]));
  // Calculadora is spaOnly → not in posts[] (skipped in pass 2). Pull from blogPostsJs:
  if (!pillarBySlug.has('calculadora-precios-publicidad')) {
    try {
      const src = fs.readFileSync(BLOG_POSTS_PATH, 'utf-8');
      const m = src.match(/slug:\s*['"]calculadora-precios-publicidad['"][\s\S]*?title:\s*['"]([^'"]+)['"][\s\S]*?description:\s*['"]([^'"]+)['"][\s\S]*?readTime:\s*['"]([^'"]+)['"]/);
      if (m) {
        pillarBySlug.set('calculadora-precios-publicidad', {
          slug: 'calculadora-precios-publicidad',
          title: m[1],
          description: m[2],
          readTime: m[3],
          category: 'Herramientas',
          platform: 'all',
          date: '2026-04-11',
        });
      }
    } catch { /* ignore */ }
  }
  const pillars = PILLAR_ORDER.map(slug => pillarBySlug.get(slug)).filter(Boolean);
  const pillarSet = new Set(pillars.map(p => p.slug));
  const restPosts = posts.filter(p => !pillarSet.has(p.slug));

  // Platform meta for pillars (icon + tagline)
  const PILLAR_META = {
    'como-monetizar-canal-telegram': { icon: '✉️', platform: 'Telegram', tagline: 'Guía pilar · monetización' },
    'como-monetizar-canal-whatsapp': { icon: '💬', platform: 'WhatsApp', tagline: 'Guía pilar · monetización' },
    'como-monetizar-servidor-discord': { icon: '🎮', platform: 'Discord', tagline: 'Guía pilar · monetización' },
    'calculadora-precios-publicidad': { icon: '🛠️', platform: 'Herramienta', tagline: 'Lead-gen · gratis 30s' },
  };

  const pillarsHtml = pillars.length > 0 ? `
    <div class="section-label">Empezar aquí — Pilares del blog</div>
    <section class="pillars">${pillars.map(p => {
      const meta = PILLAR_META[p.slug] || {};
      const isCalc = p.slug === 'calculadora-precios-publicidad';
      const cta = isCalc ? 'Calcula tu tarifa →' : 'Leer guía pilar →';
      return `
      <a href="/blog/${p.slug}" class="pillar-card pillar-${(meta.platform || '').toLowerCase()}${isCalc ? ' pillar-tool' : ''}">
        <div class="pillar-icon">${meta.icon || '★'}</div>
        <div class="pillar-tagline">${meta.tagline || 'Pilar'}</div>
        <h3 class="pillar-title">${p.title}</h3>
        <p class="pillar-desc">${p.description || ''}</p>
        <span class="pillar-cta">${cta}</span>
      </a>`;
    }).join('')}
    </section>` : '';

  const cardsByCategory = (cat) => restPosts.filter(p => cat === 'Todos' || p.category === cat);
  const gridCards = restPosts.map(p => {
    const cat = p.category || 'Guias';
    const platform = p.platform ? ` data-platform="${p.platform}"` : '';
    const platformBadge = p.platform && p.platform !== 'all'
      ? `<span class="card-platform card-platform-${p.platform}">${p.platform}</span>`
      : '';
    return `
      <a href="/blog/${p.slug}" class="blog-card" data-category="${cat}"${platform}>
        <div class="card-pills">
          <span class="card-category card-cat-${cat.toLowerCase()}">${cat}</span>
          ${platformBadge}
        </div>
        <h2>${p.title}</h2>
        <p>${p.description || ''}</p>
        <div class="card-footer">
          <span>${p.readTime || '10 min'}</span>
          <span>${p.date || ''}</span>
        </div>
      </a>`;
  }).join('\n');

  const totalMinutes = posts.reduce((s, p) => s + parseInt(p.readTime || '10'), 0);
  // Categories actually present, ordered. "Todos" first.
  const presentCategories = Array.from(new Set(restPosts.map(p => p.category || 'Guias')));
  const CATEGORY_ORDER = ['Guias', 'Monetizacion', 'Comparativas', 'Herramientas'];
  const orderedCategories = CATEGORY_ORDER.filter(c => presentCategories.includes(c));
  const filterButtons = ['Todos', ...orderedCategories].map((c, i) =>
    `<button class="filter-btn${i === 0 ? ' active' : ''}" data-filter="${c}">${c}</button>`
  ).join('');

  // Human-friendly latest date: "Mayo 2026" instead of "2026-05"
  const MONTHS_ES = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];
  const latestRaw = posts[0]?.date || '';
  const latestHuman = latestRaw && latestRaw.length >= 7
    ? `${MONTHS_ES[parseInt(latestRaw.slice(5, 7), 10) - 1]} ${latestRaw.slice(0, 4)}`
    : '—';

  const indexHtml = `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Blog — Channelad</title>
  <meta name="description" content="Guias, estrategias y comparativas sobre publicidad en comunidades de WhatsApp, Telegram y Discord. Por Rafa Ferrer, CEO de Channelad.">
  <meta name="author" content="Rafa Ferrer">
  <link rel="canonical" href="${DOMAIN}/blog">
  <meta property="og:title" content="Blog — Channelad">
  <meta property="og:description" content="Guias, estrategias y comparativas sobre publicidad en comunidades.">
  <meta property="og:url" content="${DOMAIN}/blog">
  <meta property="og:type" content="website">
  <meta property="og:image" content="${DOMAIN}/og-default.png">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name" content="Channelad">
  <meta property="og:locale" content="es_ES">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="Blog — Channelad">
  <meta name="twitter:description" content="Guias, estrategias y comparativas sobre publicidad en comunidades.">
  <meta name="twitter:image" content="${DOMAIN}/og-default.png">
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": "Blog — Channelad",
    "description": "Guias, estrategias y comparativas sobre publicidad en comunidades de WhatsApp, Telegram y Discord.",
    "url": "${DOMAIN}/blog",
    "publisher": { "@type": "Organization", "name": "Channelad", "url": "${DOMAIN}" },
    "author": { "@type": "Person", "name": "Rafa Ferrer", "jobTitle": "CEO", "worksFor": { "@type": "Organization", "name": "Channelad" } },
    "numberOfItems": ${posts.length}
  }
  </script>
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": [
      { "@type": "ListItem", "position": 1, "name": "Inicio", "item": "${DOMAIN}/" },
      { "@type": "ListItem", "position": 2, "name": "Blog", "item": "${DOMAIN}/blog" }
    ]
  }
  </script>
  <link rel="alternate" type="application/rss+xml" title="Channelad Blog" href="${DOMAIN}/blog/feed.xml">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;1,400&family=Instrument+Serif:ital@0;1&display=swap" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: 'DM Sans', system-ui, sans-serif; background: #FAFAFA; color: #1D1D1F; -webkit-font-smoothing: antialiased; }
    a { text-decoration: none; color: inherit; }

    .nav { max-width: 960px; margin: 0 auto; padding: 24px; display: flex; align-items: center; justify-content: space-between; }
    .nav-logo { font-weight: 700; font-size: 18px; color: #1D1D1F; }
    .nav-logo span { color: #7C3AED; }
    .nav-link { font-size: 13px; color: #7C3AED; font-weight: 500; }

    .hero { text-align: center; padding: 80px 24px 48px; position: relative; }
    .hero h1 { font-family: 'Instrument Serif', Georgia, serif; font-style: italic; font-size: clamp(48px, 8vw, 80px); font-weight: 400; letter-spacing: -0.02em; line-height: 1.05; margin-bottom: 16px; }
    .hero p { font-size: 17px; color: #86868B; line-height: 1.7; max-width: 480px; margin: 0 auto; }

    .stats { max-width: 800px; margin: 0 auto 40px; padding: 0 24px; }
    .stats-grid { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid rgba(0,0,0,0.06); border-bottom: 1px solid rgba(0,0,0,0.06); }
    .stat { padding: 20px 16px; text-align: center; }
    .stat + .stat { border-left: 1px solid rgba(0,0,0,0.06); }
    .stat-value { font-family: 'Instrument Serif', serif; font-size: 24px; margin-bottom: 4px; }
    .stat-label { font-size: 11px; color: #86868B; text-transform: uppercase; letter-spacing: 1px; font-weight: 500; }

    /* Featured */
    .featured { max-width: 960px; margin: 0 auto 48px; padding: 0 24px; }
    .featured-card { display: block; position: relative; padding: 48px 40px; border-radius: 20px; background: #F5F5F7; border: 1px solid rgba(0,0,0,0.04); overflow: hidden; transition: border-color 0.3s; }
    .featured-card:hover { border-color: rgba(124,58,237,0.2); }
    .featured-ghost { position: absolute; top: -12px; left: 24px; font-family: 'Instrument Serif', serif; font-style: italic; font-size: clamp(80px, 12vw, 140px); font-weight: 400; color: #1D1D1F; opacity: 0.025; line-height: 1; pointer-events: none; user-select: none; }
    .featured-inner { position: relative; z-index: 1; }
    .featured-meta { display: flex; align-items: center; gap: 10px; margin-bottom: 20px; }
    .featured-card h2 { font-family: 'Instrument Serif', serif; font-size: clamp(28px, 4vw, 40px); font-weight: 400; line-height: 1.2; letter-spacing: -0.02em; margin-bottom: 14px; }
    .featured-card p { font-size: 16px; color: #86868B; line-height: 1.65; max-width: 600px; margin-bottom: 20px; }
    .featured-link { font-size: 13px; font-weight: 600; color: #7C3AED; display: inline-flex; align-items: center; gap: 6px; }
    .card-meta-text { font-size: 12px; color: #86868B; }

    /* ─── Pillars (4 cards: 3 platforms + calculator) ─── */
    .pillars { max-width: 960px; margin: 0 auto 56px; padding: 0 24px; display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 16px; }
    .pillar-card { position: relative; padding: 28px 24px 24px; border-radius: 18px; background: #fff; border: 1px solid rgba(0,0,0,0.06); display: flex; flex-direction: column; gap: 10px; transition: transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.3s; overflow: hidden; }
    .pillar-card::before { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 3px; background: var(--accent, #7C3AED); }
    .pillar-card:hover { transform: translateY(-3px); border-color: rgba(0,0,0,0.1); box-shadow: 0 12px 32px rgba(0,0,0,0.06); }
    .pillar-telegram { --accent: #229ED9; }
    .pillar-whatsapp { --accent: #25D366; }
    .pillar-discord { --accent: #5865F2; }
    .pillar-tool { --accent: #F59E0B; background: linear-gradient(180deg, #fffbeb 0%, #fff 50%); }
    .pillar-icon { font-size: 26px; line-height: 1; }
    .pillar-tagline { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 1px; color: var(--accent, #7C3AED); }
    .pillar-title { font-family: 'Instrument Serif', serif; font-size: 22px; font-weight: 400; line-height: 1.25; color: #1D1D1F; margin-top: 2px; }
    .pillar-desc { font-size: 13px; color: #86868B; line-height: 1.55; flex: 1; }
    .pillar-cta { font-size: 13px; font-weight: 600; color: var(--accent, #7C3AED); margin-top: 8px; }

    /* ─── Filter bar ─── */
    .filter-bar { max-width: 960px; margin: 0 auto 24px; padding: 0 24px; display: flex; flex-wrap: wrap; gap: 8px; align-items: center; }
    .filter-btn { font-family: inherit; font-size: 13px; font-weight: 500; padding: 7px 14px; border-radius: 100px; border: 1px solid rgba(0,0,0,0.08); background: #fff; color: #1D1D1F; cursor: pointer; transition: all 0.2s; }
    .filter-btn:hover { border-color: rgba(124,58,237,0.3); color: #7C3AED; }
    .filter-btn.active { background: #1D1D1F; color: #fff; border-color: #1D1D1F; }
    .filter-count { margin-left: auto; font-size: 12px; color: #86868B; }

    /* ─── Grid of cards ─── */
    .grid { max-width: 960px; margin: 0 auto; padding: 0 24px 120px; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 20px; }
    .blog-card { border-radius: 16px; background: #F5F5F7; border: 1px solid rgba(0,0,0,0.04); padding: 24px; display: flex; flex-direction: column; gap: 12px; transition: transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.3s; }
    .blog-card:hover { transform: translateY(-2px); border-color: rgba(124,58,237,0.2); box-shadow: 0 8px 32px rgba(139,92,246,0.08); }
    .blog-card.hidden { display: none; }
    .card-pills { display: flex; gap: 6px; flex-wrap: wrap; }
    .card-category { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; padding: 3px 8px; border-radius: 5px; width: fit-content; }
    .card-cat-guias { color: #2563eb; background: rgba(37,99,235,0.08); }
    .card-cat-monetizacion { color: #059669; background: rgba(5,150,105,0.08); }
    .card-cat-comparativas { color: #7C3AED; background: rgba(124,58,237,0.08); }
    .card-cat-herramientas { color: #d97706; background: rgba(217,119,6,0.1); }
    .card-platform { font-size: 9px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.6px; padding: 3px 7px; border-radius: 4px; border: 1px solid rgba(0,0,0,0.08); color: #86868B; background: #fff; }
    .card-platform-telegram { color: #229ED9; border-color: rgba(34,158,217,0.25); }
    .card-platform-whatsapp { color: #128C7E; border-color: rgba(18,140,126,0.25); }
    .card-platform-discord { color: #5865F2; border-color: rgba(88,101,242,0.25); }
    .card-platform-instagram { color: #E1306C; border-color: rgba(225,48,108,0.25); }
    .card-platform-newsletter { color: #d97706; border-color: rgba(217,119,6,0.25); }
    .blog-card h2 { font-family: 'Instrument Serif', serif; font-size: 20px; font-weight: 400; line-height: 1.3; }
    .blog-card p { font-size: 14px; color: #86868B; line-height: 1.6; flex: 1; }
    .card-footer { display: flex; justify-content: space-between; padding-top: 12px; border-top: 1px solid rgba(0,0,0,0.04); font-size: 12px; color: #86868B; }
    .grid-empty { grid-column: 1 / -1; text-align: center; padding: 60px 20px; color: #86868B; font-size: 14px; }

    .grain { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; opacity: 0.028; }
    .section-label { max-width: 960px; margin: 0 auto; padding: 0 24px 16px; font-size: 11px; color: #86868B; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }

    @media (max-width: 640px) {
      .pillars { grid-template-columns: 1fr 1fr; }
      .pillar-card { padding: 22px 18px 18px; }
      .filter-bar { padding: 0 16px; gap: 6px; }
      .filter-btn { padding: 6px 12px; font-size: 12px; }
    }
  </style>
</head>
<body>
  <svg class="grain"><filter id="g"><feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/></filter><rect width="100%" height="100%" filter="url(#g)"/></svg>

  <nav class="nav">
    <a href="/" class="nav-logo">Channel<span>ad</span></a>
    <a href="/" class="nav-link">\u2190 Volver al inicio</a>
  </nav>

  <section class="hero">
    <h1>Blog</h1>
    <p>Guias practicas, numeros reales y estrategias para posicionar marcas en comunidades de Discord, Telegram y WhatsApp.</p>
  </section>

  <section class="stats">
    <div class="stats-grid">
      <div class="stat"><div class="stat-value">${posts.length}</div><div class="stat-label">Articulos</div></div>
      <div class="stat"><div class="stat-value">${totalMinutes} min</div><div class="stat-label">Lectura total</div></div>
      <div class="stat"><div class="stat-value">${latestHuman}</div><div class="stat-label">Ultima actualizacion</div></div>
    </div>
  </section>

  ${pillarsHtml}

  ${restPosts.length > 0 ? `<div class="section-label">Todos los articulos</div>` : ''}
  <div class="filter-bar">
    ${filterButtons}
    <span class="filter-count" id="filterCount">${restPosts.length} articulos</span>
  </div>
  <section class="grid" id="blogGrid">
    ${gridCards}
    <div class="grid-empty" id="gridEmpty" style="display:none">No hay articulos en esta categoria todavia.</div>
  </section>

  <script src="/blog/filter.js" defer></script>

  <footer style="max-width:960px;margin:0 auto;padding:48px 24px;border-top:1px solid rgba(0,0,0,0.08);display:flex;justify-content:space-between;align-items:center;font-size:13px;color:#86868B;flex-wrap:wrap;gap:16px">
    <span>&copy; 2026 <a href="/" style="color:#7C3AED;text-decoration:none">Channelad</a></span>
    <span>
      <a href="/para-anunciantes" style="color:#7C3AED;text-decoration:none">Anunciantes</a> ·
      <a href="/para-canales" style="color:#7C3AED;text-decoration:none">Canales</a> ·
      <a href="/pricing" style="color:#7C3AED;text-decoration:none">Precios</a> ·
      <a href="/herramientas" style="color:#7C3AED;text-decoration:none">Herramientas</a> ·
      <a href="/que-es-channelad" style="color:#7C3AED;text-decoration:none">Qué es</a> ·
      <a href="/sobre-nosotros" style="color:#7C3AED;text-decoration:none">Nosotros</a> ·
      <a href="/soporte" style="color:#7C3AED;text-decoration:none">Soporte</a>
    </span>
  </footer>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log(`  \u2705 index.html (${posts.length} articles)`);

  // ─── Generate sitemap.xml ───
  // Bilingual landing pairs: declare reciprocal hreflang in the sitemap so
  // Google clusters the ES/EN versions (on-page hreflang is also baked by
  // scripts/prerender-routes.js). x-default points to the Spanish page.
  const FORCREATORS_ALT = [
    { hreflang: 'es', href: `${DOMAIN}/para-canales` },
    { hreflang: 'en', href: `${DOMAIN}/en/for-creators` },
    { hreflang: 'x-default', href: `${DOMAIN}/para-canales` },
  ];
  const FORADVERTISERS_ALT = [
    { hreflang: 'es', href: `${DOMAIN}/para-anunciantes` },
    { hreflang: 'en', href: `${DOMAIN}/en/for-advertisers` },
    { hreflang: 'x-default', href: `${DOMAIN}/para-anunciantes` },
  ];
  const staticPages = [
    { url: '/', priority: '1.0', freq: 'weekly' },
    { url: '/para-anunciantes', priority: '0.9', freq: 'monthly', alternates: FORADVERTISERS_ALT },
    { url: '/para-canales', priority: '0.9', freq: 'monthly', alternates: FORCREATORS_ALT },
    { url: '/en/for-advertisers', priority: '0.8', freq: 'monthly', alternates: FORADVERTISERS_ALT },
    { url: '/en/for-creators', priority: '0.8', freq: 'monthly', alternates: FORCREATORS_ALT },
    { url: '/marketplace', priority: '0.8', freq: 'weekly' },
    { url: '/herramientas', priority: '0.7', freq: 'monthly' },
    { url: '/pricing', priority: '0.9', freq: 'monthly' },
    { url: '/que-es-channelad', priority: '0.7', freq: 'monthly' },
    { url: '/blog', priority: '0.8', freq: 'weekly', lastmod: posts[0]?.date },
    { url: '/sobre-nosotros', priority: '0.5', freq: 'monthly' },
    { url: '/soporte', priority: '0.5', freq: 'monthly' },
    { url: '/privacidad', priority: '0.3', freq: 'yearly' },
    { url: '/terminos', priority: '0.3', freq: 'yearly' },
  ];

  // Pillars get higher priority + weekly freq to signal canonical entry points.
  const PILLAR_SLUGS = new Set(PILLAR_ORDER);
  const blogEntries = posts.map(p => ({
    url: `/blog/${p.slug}`,
    priority: PILLAR_SLUGS.has(p.slug) ? '0.9' : '0.7',
    freq: PILLAR_SLUGS.has(p.slug) ? 'weekly' : 'monthly',
    lastmod: p.dateModified || p.date,
    alternates: hreflangAlternates(p),
  }));

  // Include React-only posts (no markdown) in sitemap too
  const mdSlugs = new Set(posts.map(p => p.slug));
  const reactOnlyPosts = loadReactOnlyPosts(mdSlugs);
  const reactEntries = reactOnlyPosts.map(p => ({
    url: `/blog/${p.slug}`,
    priority: PILLAR_SLUGS.has(p.slug) ? '0.9' : '0.7',
    freq: PILLAR_SLUGS.has(p.slug) ? 'weekly' : 'monthly',
    lastmod: p.date,
  }));
  if (reactEntries.length > 0) {
    console.log(`  📎 ${reactEntries.length} React-only post(s) added to sitemap: ${reactOnlyPosts.map(p => p.slug).join(', ')}`);
  }

  const todayDate = new Date().toISOString().slice(0, 10);
  const renderUrlset = (entries) => `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">
${entries.map(e => `  <url>
    <loc>${DOMAIN}${e.url}</loc>
    <lastmod>${e.lastmod || todayDate}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>${(e.alternates || []).map(a => `
    <xhtml:link rel="alternate" hreflang="${a.hreflang}" href="${a.href}"/>`).join('')}
  </url>`).join('\n')}
</urlset>`;

  // Child 1: marketing/static pages \u2192 /sitemap-pages.xml
  const PAGES_SITEMAP_PATH = path.join(ROOT, 'public', 'sitemap-pages.xml');
  fs.writeFileSync(PAGES_SITEMAP_PATH, renderUrlset(staticPages), 'utf-8');
  console.log(`  \u2705 sitemap-pages.xml (${staticPages.length} URLs)`);

  // Child 2: blog (markdown + React-only posts) \u2192 /blog/sitemap.xml
  const blogSitemapEntries = [...blogEntries, ...reactEntries];
  const BLOG_SITEMAP_PATH = path.join(OUTPUT_DIR, 'sitemap.xml');
  fs.writeFileSync(BLOG_SITEMAP_PATH, renderUrlset(blogSitemapEntries), 'utf-8');
  console.log(`  \u2705 blog/sitemap.xml (${blogSitemapEntries.length} URLs)`);

  // Parent: /sitemap.xml as a <sitemapindex> referencing both children.
  // robots.txt points only here; Google discovers the children from the index,
  // so there is a single canonical sitemap entry point (no main-vs-blog split).
  // Per-child lastmod = newest entry date \u2192 each section is re-crawled only
  // when it actually changed.
  const maxDate = (entries) => entries.reduce((max, e) => (e.lastmod && e.lastmod > max ? e.lastmod : max), '') || todayDate;
  const children = [
    { loc: `${DOMAIN}/sitemap-pages.xml`, lastmod: maxDate(staticPages) },
    { loc: `${DOMAIN}/blog/sitemap.xml`, lastmod: maxDate(blogSitemapEntries) },
  ];
  const sitemapIndex = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${children.map(c => `  <sitemap>
    <loc>${c.loc}</loc>
    <lastmod>${c.lastmod}</lastmod>
  </sitemap>`).join('\n')}
</sitemapindex>`;
  fs.writeFileSync(SITEMAP_PATH, sitemapIndex, 'utf-8');
  console.log(`  \u2705 sitemap.xml (index \u2192 ${children.length} child sitemaps)`);

  // ─── Generate RSS feed ───
  const allPostsForFeed = [...posts, ...reactOnlyPosts].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
  const rssItems = allPostsForFeed.map(p => `    <item>
      <title><![CDATA[${p.title || p.slug}]]></title>
      <link>${DOMAIN}/blog/${p.slug}</link>
      <guid isPermaLink="true">${DOMAIN}/blog/${p.slug}</guid>
      <pubDate>${new Date(p.date + 'T10:00:00Z').toUTCString()}</pubDate>
      <description><![CDATA[${p.description || ''}]]></description>
      <author>rafa@channelad.io (Rafa Ferrer)</author>
      <category>${p.category || 'Guias'}</category>
    </item>`).join('\n');

  const rssFeed = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Channelad Blog</title>
    <link>${DOMAIN}/blog</link>
    <description>Guias, estrategias y comparativas sobre publicidad en comunidades de WhatsApp, Telegram y Discord. Por Rafa Ferrer, CEO de Channelad.</description>
    <language>es</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <managingEditor>rafa@channelad.io (Rafa Ferrer)</managingEditor>
    <webMaster>rafa@channelad.io (Rafa Ferrer)</webMaster>
    <atom:link href="${DOMAIN}/blog/feed.xml" rel="self" type="application/rss+xml"/>
    <image>
      <url>${DOMAIN}/logo.svg</url>
      <title>Channelad Blog</title>
      <link>${DOMAIN}/blog</link>
    </image>
${rssItems}
  </channel>
</rss>`;

  const FEED_PATH = path.join(OUTPUT_DIR, 'feed.xml');
  fs.writeFileSync(FEED_PATH, rssFeed, 'utf-8');
  console.log(`  \u2705 feed.xml (${allPostsForFeed.length} items)`);

  console.log(`\n\u2728 Blog built: ${posts.length} articles \u2192 public/blog/\n`);
}

build();
