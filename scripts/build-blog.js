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
const DOMAIN = 'https://www.channelad.io';

// ─── Frontmatter parser ───
function parseFrontmatter(content) {
  const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
  if (!match) return { meta: {}, body: content };
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
const BLOG_POSTS_PATH = path.join(ROOT, 'src', 'ui', 'pages', 'blog', 'blogPosts.js');
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

// ─── Generate related posts HTML ───
function buildRelatedHtml(posts, currentSlug) {
  const others = posts.filter(p => p.slug !== currentSlug);
  if (others.length === 0) return '';

  const related = others.slice(0, 3); // Max 3 related posts
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

  // ─── Pass 2: Generate HTML for each post ───
  const posts = []; // metadata only (no body)

  for (let i = 0; i < postsData.length; i++) {
    const meta = postsData[i];
    const htmlBody = marked.parse(meta._body);
    const tagsHtml = buildTagsHtml(meta.keywords);
    const prevNextHtml = buildPrevNextHtml(postsData, i);
    const relatedHtml = buildRelatedHtml(postsData, meta.slug);

    const formattedDate = formatDate(meta.date, meta.lang || 'es');
    const dateISO = meta.date || '';
    const dateModifiedISO = meta.dateModified || meta.date || '';
    const faqSchema = buildFaqSchema(meta.slug, faqMap);
    const canonicalSlug = meta.canonical || meta.slug;
    const canonicalUrl = `${DOMAIN}/blog/${canonicalSlug}`;

    if (meta.canonical) {
      console.log(`  🔗 ${meta.slug} → canonical: ${canonicalSlug}`);
    }

    let html = template
      .replace(/{{title}}/g, meta.title)
      .replace(/{{description}}/g, meta.description || '')
      .replace(/{{slug}}/g, meta.slug)
      .replace(/{{canonicalUrl}}/g, canonicalUrl)
      .replace(/{{dateISO}}/g, dateISO)
      .replace(/{{dateModifiedISO}}/g, dateModifiedISO)
      .replace(/{{date}}/g, formattedDate)
      .replace(/{{readTime}}/g, meta.readTime || '10 min')
      .replace(/{{category}}/g, meta.category || 'Guias')
      .replace(/{{lang}}/g, meta.lang || 'es')
      .replace(/{{keywords}}/g, Array.isArray(meta.keywords) ? meta.keywords.join(', ') : (meta.keywords || ''))
      .replace(/{{content}}/g, htmlBody)
      .replace(/{{domain}}/g, DOMAIN)
      .replace(/{{tags_html}}/g, tagsHtml)
      .replace(/{{prev_next_html}}/g, prevNextHtml)
      .replace(/{{related_html}}/g, relatedHtml)
      .replace(/{{faq_schema}}/g, faqSchema);

    const outFile = path.join(OUTPUT_DIR, `${meta.slug}.html`);
    fs.writeFileSync(outFile, html, 'utf-8');
    console.log(`  \u2705 ${meta.slug}.html (${meta.readTime})`);

    const { _body, ...cleanMeta } = meta;
    posts.push(cleanMeta);
  }

  // ─── Generate blog index.html ───
  const featuredPost = posts[0];
  const restPosts = posts.slice(1);

  const featuredHtml = featuredPost ? `
    <section class="featured">
      <a href="/blog/${featuredPost.slug}" class="featured-card">
        <div class="featured-ghost">DESTACADO</div>
        <div class="featured-inner">
          <div class="featured-meta">
            <span class="card-category">${featuredPost.category || 'Guias'}</span>
            <span class="card-meta-text">${featuredPost.readTime}</span>
          </div>
          <h2>${featuredPost.title}</h2>
          <p>${featuredPost.description || ''}</p>
          <span class="featured-link">Leer articulo <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M1 7h12M8 2l5 5-5 5"/></svg></span>
        </div>
      </a>
    </section>` : '';

  const gridCards = restPosts.map(p => `
      <a href="/blog/${p.slug}" class="blog-card">
        <div class="card-category">${p.category || 'Guias'}</div>
        <h2>${p.title}</h2>
        <p>${p.description || ''}</p>
        <div class="card-footer">
          <span>${p.readTime || '10 min'}</span>
          <span>${p.date || ''}</span>
        </div>
      </a>`).join('\n');

  const totalMinutes = posts.reduce((s, p) => s + parseInt(p.readTime || '10'), 0);

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

    .grid { max-width: 960px; margin: 0 auto; padding: 0 24px 120px; display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 20px; }
    .blog-card { border-radius: 16px; background: #F5F5F7; border: 1px solid rgba(0,0,0,0.04); padding: 28px 24px; display: flex; flex-direction: column; gap: 14px; transition: transform 0.3s cubic-bezier(.22,1,.36,1), border-color 0.3s, box-shadow 0.3s; }
    .blog-card:hover { transform: translateY(-2px); border-color: rgba(124,58,237,0.2); box-shadow: 0 8px 32px rgba(139,92,246,0.08); }
    .card-category { font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.8px; color: #7C3AED; background: rgba(124,58,237,0.08); padding: 3px 8px; border-radius: 5px; width: fit-content; }
    .blog-card h2 { font-family: 'Instrument Serif', serif; font-size: 20px; font-weight: 400; line-height: 1.3; }
    .blog-card p { font-size: 14px; color: #86868B; line-height: 1.6; flex: 1; }
    .card-footer { display: flex; justify-content: space-between; padding-top: 14px; border-top: 1px solid rgba(0,0,0,0.04); font-size: 12px; color: #86868B; }

    .grain { position: fixed; inset: 0; width: 100%; height: 100%; pointer-events: none; z-index: 9999; opacity: 0.028; }

    .section-label { max-width: 960px; margin: 0 auto; padding: 0 24px 16px; font-size: 11px; color: #86868B; text-transform: uppercase; letter-spacing: 1.5px; font-weight: 600; }
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
      <div class="stat"><div class="stat-value">${posts[0]?.date?.slice(0, 7) || '2026'}</div><div class="stat-label">Ultima actualizacion</div></div>
    </div>
  </section>

  ${featuredHtml}

  ${restPosts.length > 0 ? `<div class="section-label">Todos los articulos</div>` : ''}
  <section class="grid">
    ${gridCards}
  </section>
</body>
</html>`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.html'), indexHtml, 'utf-8');
  console.log(`  \u2705 index.html (${posts.length} articles)`);

  // ─── Generate sitemap.xml ───
  const staticPages = [
    { url: '/', priority: '1.0', freq: 'weekly' },
    { url: '/para-anunciantes', priority: '0.9', freq: 'monthly' },
    { url: '/para-canales', priority: '0.9', freq: 'monthly' },
    { url: '/marketplace', priority: '0.8', freq: 'weekly' },
    { url: '/blog', priority: '0.8', freq: 'weekly', lastmod: posts[0]?.date },
    { url: '/sobre-nosotros', priority: '0.5', freq: 'monthly' },
    { url: '/soporte', priority: '0.5', freq: 'monthly' },
    { url: '/privacidad', priority: '0.3', freq: 'yearly' },
    { url: '/terminos', priority: '0.3', freq: 'yearly' },
  ];

  const blogEntries = posts.map(p => ({
    url: `/blog/${p.slug}`,
    priority: '0.7',
    freq: 'monthly',
    lastmod: p.date,
  }));

  // Include React-only posts (no markdown) in sitemap too
  const mdSlugs = new Set(posts.map(p => p.slug));
  const reactOnlyPosts = loadReactOnlyPosts(mdSlugs);
  const reactEntries = reactOnlyPosts.map(p => ({
    url: `/blog/${p.slug}`,
    priority: '0.7',
    freq: 'monthly',
    lastmod: p.date,
  }));
  if (reactEntries.length > 0) {
    console.log(`  📎 ${reactEntries.length} React-only post(s) added to sitemap: ${reactOnlyPosts.map(p => p.slug).join(', ')}`);
  }

  const allEntries = [...staticPages, ...blogEntries, ...reactEntries];
  const todayDate = new Date().toISOString().slice(0, 10);

  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${allEntries.map(e => `  <url>
    <loc>${DOMAIN}${e.url}</loc>
    <lastmod>${e.lastmod || todayDate}</lastmod>
    <changefreq>${e.freq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`).join('\n')}
</urlset>`;

  fs.writeFileSync(SITEMAP_PATH, sitemap, 'utf-8');
  console.log(`  \u2705 sitemap.xml (${allEntries.length} URLs)`);

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
      <url>${DOMAIN}/logo.png</url>
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
