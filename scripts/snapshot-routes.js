#!/usr/bin/env node
/**
 * Static prerender of the BODY for marketing routes — run LOCALLY, not in CI.
 *
 * Companion to scripts/snapshot-home.js (which handles "/"). The SPA ships an
 * empty <div id="root"></div> for every non-home route, so /pricing,
 * /que-es-channelad, etc. only paint after the JS bundle mounts React. HTML-only
 * crawlers (and Googlebot's first, render-deferred pass on a young, low-authority
 * site) read an empty body and file the page under "Discovered/Crawled —
 * currently not indexed". scripts/prerender-routes.js already bakes the correct
 * <head> per route; this script captures the rendered <body> so the page ships
 * real, indexable content too.
 *
 * For each configured route it renders the page in a real browser, captures the
 * #root markup, and writes it to scripts/shells/<name>.html. The build step
 * (scripts/prerender-routes.js) injects that markup into dist/<route>.html.
 * React then mounts over it with createRoot().render() — the static markup is
 * replaced in a single commit (no hydration, so no mismatch warnings).
 *
 *   source: 'local'  → served from the freshly-built dist/ (static marketing
 *                       copy that needs no API). Run `npm run frontend:build`
 *                       first so dist/ is current.
 *   source: 'live'   → rendered against https://channelad.io so data-driven
 *                       pages (e.g. /rankings) capture real rows from the prod
 *                       API instead of an empty skeleton.
 *
 * Why local-only: it needs a real Chrome. Keeping it out of `npm run build`
 * guarantees the Vercel build never launches Chromium. The shells are committed;
 * regenerate them whenever the page markup changes:
 *
 *   npm run snapshot:routes   (runs frontend:build first)
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const SHELLS_DIR = path.join(__dirname, 'shells');
const PORT = 4291;
const LIVE_ORIGIN = 'https://channelad.io';

// Routes whose body we prerender. Keep in sync with ROUTES in
// scripts/prerender-routes.js (those entries own the <head>; these own <body>).
const ROUTES = [
  { route: '/pricing', source: 'local' },
  { route: '/que-es-channelad', source: 'local' },
  { route: '/herramientas', source: 'local' },
  { route: '/sobre-nosotros', source: 'local' },
  { route: '/soporte', source: 'local' },
  // /rankings and /explore are intentionally NOT prerendered: their channel
  // data is gated for anonymous visitors (names/handles/prices render masked,
  // e.g. "Sp••••" / "@wa••" / "€••"), so a capture would bake thin, masked
  // content. Both carry noindex,follow instead (scripts/prerender-routes.js +
  // their Helmet) and stay out of the sitemap. The "channels with most
  // followers" intent is served by the public Top-15 blog post.
];

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.json': 'application/json',
  '.woff2': 'font/woff2',
  '.xml': 'application/xml',
};

// Local static server with SPA fallback (mirrors scripts/snapshot-home.js).
function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(DIST, urlPath);
      if (!path.extname(filePath) || !fs.existsSync(filePath)) {
        filePath = path.join(DIST, 'index.html');
      }
      fs.readFile(filePath, (err, buf) => {
        if (err) { res.statusCode = 404; res.end('not found'); return; }
        res.setHeader('Content-Type', MIME[path.extname(filePath)] || 'application/octet-stream');
        res.end(buf);
      });
    });
    server.listen(PORT, '127.0.0.1', () => resolve(server));
  });
}

function shellName(route) {
  return route.replace(/^\//, '').replace(/\//g, '__') + '.html';
}

async function capture(page, url, { live }) {
  // domcontentloaded (not networkidle2): deferred analytics + the prod
  // websocket keep the network busy indefinitely on `live` pages, so we gate
  // on real content instead of an idle network.
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  // Wait until React has mounted real text into #root.
  await page.waitForFunction(
    () => {
      const r = document.getElementById('root');
      return r && r.innerText && r.innerText.trim().length > 400;
    },
    { timeout: live ? 30000 : 20000 }
  );
  // Settle: let entrance animations finish and data-driven lists hydrate.
  await new Promise((r) => setTimeout(r, live ? 2500 : 700));
  return page.evaluate(() => {
    const root = document.getElementById('root');
    return root ? root.innerHTML : null;
  });
}

async function run() {
  const needsLocal = ROUTES.some((r) => r.source === 'local');
  if (needsLocal && !fs.existsSync(path.join(DIST, 'index.html'))) {
    console.error('  ✗ dist/index.html missing — run `npm run frontend:build` first');
    process.exit(1);
  }

  let puppeteer;
  try {
    puppeteer = require('puppeteer');
  } catch {
    console.error('  ✗ puppeteer not installed');
    process.exit(1);
  }

  const chromeCandidates = [
    'C:/Program Files (x86)/Google/Chrome/Application/chrome.exe',
    'C:/Program Files/Google/Chrome/Application/chrome.exe',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
  ];
  const executablePath = chromeCandidates.find((p) => fs.existsSync(p));

  fs.mkdirSync(SHELLS_DIR, { recursive: true });
  const server = needsLocal ? await startServer() : null;
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath, // undefined → puppeteer's bundled Chromium
    args: ['--no-sandbox', '--disable-gpu'],
  });

  let ok = 0;
  let failed = 0;
  try {
    for (const { route, source } of ROUTES) {
      const live = source === 'live';
      const url = live ? `${LIVE_ORIGIN}${route}` : `http://127.0.0.1:${PORT}${route}`;
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
      try {
        const shell = await capture(page, url, { live });
        if (!shell || shell.length < 800) {
          throw new Error(`captured shell looks empty (${shell ? shell.length : 0} chars)`);
        }
        const out = path.join(SHELLS_DIR, shellName(route));
        fs.writeFileSync(out, shell, 'utf-8');
        console.log(`  ✅ ${route} → shells/${shellName(route)} (${(shell.length / 1024).toFixed(1)} KB, ${source})`);
        ok++;
      } catch (err) {
        console.error(`  ✗ ${route} (${source}): ${err.message}`);
        failed++;
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    if (server) server.close();
  }

  console.log(`\n✨ Captured ${ok}/${ROUTES.length} route shell(s) → scripts/shells/${failed ? ` (${failed} failed)` : ''}\n`);
  if (ok === 0) process.exit(1);
}

console.log('\n📸 Channelad marketing-route body snapshot\n');
run().catch((err) => {
  console.error('  ✗ snapshot failed:', err.message);
  process.exit(1);
});
