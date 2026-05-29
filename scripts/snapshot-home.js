#!/usr/bin/env node
/**
 * Static prerender of the home ("/") hero — run LOCALLY, not in CI.
 *
 * The landing is a client-rendered SPA: dist/index.html ships an empty
 * <div id="root"></div>, so the hero (the LCP element) only paints after the
 * JS bundle downloads, parses, and React mounts. Lighthouse measured ~2.9s of
 * "render delay" on the LCP — pure JS/render cost, not network.
 *
 * This script renders the home in a real browser, captures the above-the-fold
 * markup (scarcity banner + navbar + hero section, with the heavy below-fold
 * sections pruned), and writes it to scripts/home-shell.html. The build step
 * (scripts/prerender-routes.js) injects that markup into dist/home.html so the
 * hero is present in the HTML and paints before any JS runs. React then mounts
 * over it with createRoot().render(), which replaces the shell in a single
 * commit — no flash, because the hero's entrance animations are static
 * (initial={false}), so the mounted render matches the snapshot.
 *
 * Why local-only: it needs a real Chrome. Keeping it out of `npm run build`
 * guarantees the Vercel build never depends on launching Chromium. The shell
 * is committed; regenerate it whenever the hero markup changes:
 *
 *   npm run frontend:build && node scripts/snapshot-home.js
 *
 * (or just `npm run snapshot:home`, which does both).
 */
const fs = require('fs');
const path = require('path');
const http = require('http');

const ROOT = path.resolve(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const OUT = path.join(__dirname, 'home-shell.html');
const PORT = 4290;

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

function startServer() {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
      let filePath = path.join(DIST, urlPath);
      // SPA fallback: anything without a file extension serves index.html.
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

async function run() {
  if (!fs.existsSync(path.join(DIST, 'index.html'))) {
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

  const server = await startServer();
  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath, // undefined → puppeteer's bundled Chromium
    args: ['--no-sandbox', '--disable-gpu'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 900, deviceScaleFactor: 1 });
    await page.goto(`http://127.0.0.1:${PORT}/`, { waitUntil: 'networkidle2', timeout: 30000 });
    // Wait for the hero to render (the H1 carries the headline text).
    await page.waitForSelector('[data-testid="for-brands-page"] h1', { timeout: 15000 });

    const shell = await page.evaluate(() => {
      const main = document.querySelector('[data-testid="for-brands-page"]');
      if (!main) return null;
      // Keep everything up to and including the first <section> (the hero);
      // drop the heavy below-fold sections — React re-adds them on mount.
      let seenSection = false;
      for (const child of [...main.children]) {
        if (seenSection) { child.remove(); continue; }
        if (child.tagName === 'SECTION') seenSection = true;
      }
      const root = document.getElementById('root');
      return root ? root.innerHTML : null;
    });

    if (!shell || shell.length < 500) {
      throw new Error(`captured shell looks empty (${shell ? shell.length : 0} chars)`);
    }

    fs.writeFileSync(OUT, shell, 'utf-8');
    console.log(`  ✅ wrote ${path.relative(ROOT, OUT)} (${(shell.length / 1024).toFixed(1)} KB)`);
  } finally {
    await browser.close();
    server.close();
  }
}

console.log('\n📸 Channelad home hero snapshot\n');
run().catch((err) => {
  console.error('  ✗ snapshot failed:', err.message);
  process.exit(1);
});
