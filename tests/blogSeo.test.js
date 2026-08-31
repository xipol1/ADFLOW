/**
 * SEO invariants of the static blog (public/blog/, built by scripts/build-blog.js).
 *
 * These lock the failures found in the August 2026 audit, all of which had
 * shipped to production and none of which any existing test could see:
 *   - 13 posts retired behind a 301 in vercel.json were still being rebuilt and
 *     announced in the sitemap, the RSS feed and the index (20% of the sitemap).
 *   - an internal link to a slug that does not exist (hard 404, the /blog/:slug
 *     rewrite never falls through to the SPA).
 *   - posts shipping without a canonical, without FAQPage/Article schema, or
 *     with a <title> Google will truncate.
 *
 * They run against the built output, so a stale build fails them too.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const BLOG_DIR = path.join(ROOT, 'public', 'blog');

const vercel = JSON.parse(fs.readFileSync(path.join(ROOT, 'vercel.json'), 'utf-8'));
const retiredSlugs = (vercel.redirects || [])
  .map(r => /^\/blog\/([a-z0-9-]+)$/.exec(r.source || ''))
  .filter(Boolean)
  .map(m => m[1]);

const postFiles = fs.readdirSync(BLOG_DIR).filter(f => f.endsWith('.html') && f !== 'index.html');
const slugOf = f => f.replace(/\.html$/, '');
const read = f => fs.readFileSync(path.join(BLOG_DIR, f), 'utf-8');

const sitemap = fs.readFileSync(path.join(BLOG_DIR, 'sitemap.xml'), 'utf-8');
const feed = fs.readFileSync(path.join(BLOG_DIR, 'feed.xml'), 'utf-8');
const index = fs.readFileSync(path.join(BLOG_DIR, 'index.html'), 'utf-8');

// Served by the SPA through its own rewrite, so it has no static HTML but is a
// perfectly valid link target.
const SPA_ONLY_SLUGS = ['calculadora-precios-publicidad'];

describe('blog: retired posts stay retired', () => {
  it('has at least one redirect to guard (otherwise this suite proves nothing)', () => {
    expect(retiredSlugs.length).toBeGreaterThan(0);
  });

  it.each(retiredSlugs)('%s is not published anywhere', (slug) => {
    expect(fs.existsSync(path.join(BLOG_DIR, `${slug}.html`))).toBe(false);
    expect(sitemap).not.toContain(`/blog/${slug}<`);
    expect(feed).not.toContain(`/blog/${slug}<`);
    expect(index).not.toContain(`href="/blog/${slug}"`);
  });
});

describe('blog: internal links resolve', () => {
  const served = new Set([...postFiles.map(slugOf), ...SPA_ONLY_SLUGS]);

  it('every href="/blog/<slug>" points at a page we actually serve', () => {
    const broken = [];
    for (const file of [...postFiles, 'index.html']) {
      const html = read(file);
      for (const m of html.matchAll(/href="\/blog\/([a-z0-9-]+)"/g)) {
        if (!served.has(m[1])) broken.push(`${file} → /blog/${m[1]}`);
      }
    }
    expect(broken).toEqual([]);
  });
});

describe('blog: per-post SEO tags', () => {
  it.each(postFiles)('%s ships the tags Google needs', (file) => {
    const html = read(file);
    const slug = slugOf(file);

    expect(html).toContain(`<link rel="canonical" href="https://channelad.io/blog/${slug}">`);
    expect(html).toMatch(/<meta name="description" content="[^"]{50,170}">/);
    expect((html.match(/<h1/g) || []).length).toBe(1);
    expect(html).toContain('"@type": "Article"');
    expect(html).toContain('"@type": "BreadcrumbList"');

    // Titles over ~60 characters get truncated in the SERP.
    const title = /<title>([\s\S]*?)<\/title>/.exec(html)[1];
    expect(title.length).toBeLessThanOrEqual(60);
  });

  it('every JSON-LD block parses', () => {
    const failures = [];
    for (const file of [...postFiles, 'index.html']) {
      for (const m of read(file).matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
        try {
          JSON.parse(m[1]);
        } catch (e) {
          failures.push(`${file}: ${e.message}`);
        }
      }
    }
    expect(failures).toEqual([]);
  });

  it('has no duplicate titles or descriptions across posts', () => {
    const titles = new Map();
    const descs = new Map();
    for (const file of postFiles) {
      const html = read(file);
      const t = /<title>([\s\S]*?)<\/title>/.exec(html)[1];
      const d = /<meta name="description" content="([\s\S]*?)">/.exec(html)[1];
      titles.set(t, [...(titles.get(t) || []), file]);
      descs.set(d, [...(descs.get(d) || []), file]);
    }
    const dupTitles = [...titles.values()].filter(v => v.length > 1);
    const dupDescs = [...descs.values()].filter(v => v.length > 1);
    expect(dupTitles).toEqual([]);
    expect(dupDescs).toEqual([]);
  });
});

describe('blog: sitemap and feed match the built posts', () => {
  it('lists exactly the posts we built, plus the SPA-only ones', () => {
    const inSitemap = [...sitemap.matchAll(/<loc>https:\/\/channelad\.io\/blog\/([a-z0-9-]+)<\/loc>/g)].map(m => m[1]);
    const expected = [...postFiles.map(slugOf), ...SPA_ONLY_SLUGS].sort();
    expect(inSitemap.sort()).toEqual(expected);
    expect((feed.match(/<item>/g) || []).length).toBe(expected.length);
  });
});

// The blog shipped for months with no analytics tag whatsoever: scripts/build-blog.js
// grew its own <head> independently of client/index.html, so every /blog/* pageview —
// the entire organic surface — was invisible in GA4, and nothing failed. Both the tag
// and its consent gate are now injected from config/, and these lock that in.
describe('blog: analytics tag is present and consent-gated', () => {
  const analyticsTag = fs.readFileSync(path.join(ROOT, 'config', 'analytics-tag.html'), 'utf-8');
  const pages = [...postFiles, 'index.html'];

  it('loads Google Tag Manager on every built page', () => {
    const missing = pages.filter(f => !read(f).includes('googletagmanager.com/gtm.js?id=GTM-5D2RGMVJ'));
    expect(missing).toEqual([]);
  });

  it('sets Consent Mode v2 defaults to denied before loading any Google tag', () => {
    for (const f of pages) {
      const html = read(f);
      const defaultAt = html.indexOf("gtag('consent', 'default'");
      const gtmAt = html.indexOf('googletagmanager.com/gtm.js');
      expect(defaultAt).toBeGreaterThan(-1);
      // Ordering, not mere presence: defaults that run after the loader do nothing.
      expect(defaultAt).toBeLessThan(gtmAt);
      for (const signal of ['ad_storage', 'analytics_storage', 'ad_user_data', 'ad_personalization']) {
        expect(html).toMatch(new RegExp(`${signal}: 'denied'`));
      }
    }
  });

  it('gives static pages a way to consent, since they have no React banner', () => {
    const missing = pages.filter(f => !read(f).includes('id="cc-banner"'));
    expect(missing).toEqual([]);
  });

  it('never loads Ahrefs without analytics consent', () => {
    for (const f of pages) {
      const html = read(f);
      // The only mention of the script URL must be inside the gated loader.
      expect((html.match(/analytics\.ahrefs\.com/g) || []).length).toBe(1);
      expect(html).toContain('window.__channeladLoadAhrefs = function');
    }
  });

  it('injects config/analytics-tag.html verbatim, so the SPA cannot drift from the blog', () => {
    const drifted = pages.filter(f => !read(f).includes(analyticsTag.trim()));
    expect(drifted).toEqual([]);
  });

  it('leaves no unreplaced template placeholder in the output', () => {
    const leftover = pages.filter(f => /{{\s*(analytics|consentBanner)\s*}}/.test(read(f)));
    expect(leftover).toEqual([]);
  });
});
