/**
 * Recaptura los 7 screenshots usados por el render del pitch v2.0,
 * OCULTANDO (blur) los nombres de canal/campaña pero dejando visibles
 * todas las métricas, precios y datos. Mismo viewport/estado que la
 * captura original, así el render sigue alineado.
 */
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = 'C:\\Users\\win\\Desktop\\_Channelad\\pitch-v2-assets';
const FRONT = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const PASSWORD = 'Channelad.test.2026';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('login failed ' + email);
  return data;
}

async function newPage(browser, sess) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('channelad-cookie-consent', JSON.stringify({ necessary: true, analytics: false, marketing: false, ts: 1, v: 1 }));
    for (const k of ['advertiser', 'advertiser:agencia', 'creator', 'creator:agencia'])
      localStorage.setItem(`channelad-onboarding-${k}-done`, 'true');
    if (s) {
      localStorage.setItem('token', s.token);
      localStorage.setItem('refreshToken', s.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(s.user));
    }
  }, sess || null);
  return page;
}

/** Aplica blur a todo lo que sea un nombre de canal/campaña, dejando métricas. */
async function mask(page, seedNames = ['terreta']) {
  await page.evaluate((seeds) => {
    const B = (el) => {
      if (!el || el.dataset.__masked) return;
      el.dataset.__masked = '1';
      el.style.filter = 'blur(9px)';
      el.style.webkitFilter = 'blur(9px)';
      el.style.userSelect = 'none';
    };
    // 1) Nombre de canal en marketplace (ChannelCard), rankings y wizard:
    //    todos renderizan el nombre como <* class="font-medium truncate">
    document.querySelectorAll('.font-medium.truncate, .font-semibold.truncate').forEach(B);
    // 2) Rankings: celda con nombre + @usuario (wrapper .min-w-0 dentro de la tabla)
    document.querySelectorAll('table tbody .min-w-0, tbody tr .min-w-0').forEach(B);
    // 3) Avatares pequeños (logos que podrían identificar el canal)
    document.querySelectorAll('img').forEach((im) => {
      const w = im.clientWidth || im.naturalWidth;
      if (w >= 20 && w <= 64 && Math.abs((im.clientHeight || w) - w) <= 8) B(im);
    });
    // 5) Selector de canal (analítica/creador): botón "Nombre · plataforma ▼"
    document.querySelectorAll('button, [role="button"]').forEach((b) => {
      if (/·\s*(telegram|whatsapp|discord|youtube|instagram)/i.test(b.textContent || '')) B(b);
    });
    // 4) Texto que contenga nombres conocidos (campañas, ganancias, analítica)
    const norm = (s) => (s || '').replace(/\s+/g, ' ').trim().toLowerCase();
    const targets = seeds.map(norm).filter(Boolean);
    if (targets.length) {
      const w = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
      const hits = []; let n;
      while ((n = w.nextNode())) {
        const t = norm(n.nodeValue);
        if (t && targets.some((s) => t.includes(s))) hits.push(n.parentElement);
      }
      hits.forEach(B);
    }
  }, seedNames);
  await sleep(450);
}

async function setSort(page, value) {
  await page.evaluate((v) => {
    const sel = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === v));
    if (!sel) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, v);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

const waitMkt = (page) => page.waitForFunction(
  () => !/Cargando canales/i.test(document.body.innerText) && /€/.test(document.body.innerText),
  { timeout: 45000 });

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const results = { ok: [], fail: [] };
  const attempt = async (label, fn) => {
    try { await fn(); results.ok.push(label); console.log('SAVED', label); }
    catch (e) { console.error('FAIL', label, e.message); results.fail.push(label + ': ' + e.message); }
  };

  const adv = await login('advertiser@channelad.io');

  // ---- Advertiser: marketplace + rankings + campaigns ----
  {
    const page = await newPage(browser, adv);

    await attempt('S1a-marketplace-top', async () => {
      await page.goto(FRONT + '/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
      await waitMkt(page);
      await setSort(page, 'score');
      await sleep(3000); await waitMkt(page); await sleep(800);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S1a-marketplace-top.png') });
    });

    await attempt('S2-card-hover', async () => {
      await page.goto(FRONT + '/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
      await waitMkt(page);
      await setSort(page, 'score');
      await sleep(3000); await waitMkt(page); await sleep(800);
      const box = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button, a')].find((e) => /ver canal/i.test(e.textContent || '') && e.offsetParent !== null);
        if (!btn) return null;
        let el = btn;
        for (let i = 0; i < 8 && el.parentElement; i++) {
          el = el.parentElement;
          const r = el.getBoundingClientRect();
          if (r.width > 240 && r.width < 600 && r.height > 180) return { x: r.x + r.width / 2, y: Math.max(60, r.y + r.height / 2) };
        }
        return null;
      });
      if (box) { await page.mouse.move(box.x, box.y, { steps: 10 }); await sleep(1000); }
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S2-card-hover.png') });
    });

    await attempt('S3a-rankings', async () => {
      await page.goto(FRONT + '/rankings', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => /🥇/.test(document.body.innerText) && /\d+K/.test(document.body.innerText), { timeout: 60000 });
      await sleep(2000);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S3a-rankings.png') });
    });

    await attempt('S4a2-campaigns-completadas', async () => {
      await page.goto(FRONT + '/advertiser/campaigns', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => /La Terreta/i.test(document.body.innerText), { timeout: 45000 });
      await page.evaluate(() => {
        const el = [...document.querySelectorAll('button, [role="tab"]')].find((e) => /completadas/i.test(e.textContent || '') && e.offsetParent !== null);
        if (el) el.click();
      });
      await sleep(1800);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S4a2-campaigns-completadas.png') });
    });

    await attempt('S4b-new-campaign-modal', async () => {
      await page.goto(FRONT + '/advertiser/campaigns', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(2500);
      const clicked = await page.evaluate(() => {
        const el = [...document.querySelectorAll('button, a, [role="button"]')].find((e) => /(nueva campaña|crear campaña|new campaign)/i.test(e.textContent || '') && e.offsetParent !== null);
        if (el) { el.click(); return true; }
        return false;
      });
      if (!clicked) throw new Error('no "nueva campaña" button');
      await sleep(2500);
      await page.waitForFunction(() => /€/.test(document.body.innerText), { timeout: 20000 }).catch(() => {});
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S4b-new-campaign-modal.png') });
    });

    await page.close();
  }

  // ---- Creator: earnings + analytics ----
  {
    const cre = await login('creator@channelad.io');
    const page = await newPage(browser, cre);

    await attempt('S5-creator-earnings', async () => {
      await page.goto(FRONT + '/creator/earnings', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(3500);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S5-creator-earnings.png') });
    });

    await attempt('S7-creator-analytics', async () => {
      await page.goto(FRONT + '/creator/analytics', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(4000);
      await mask(page);
      await page.screenshot({ path: path.join(OUT, 'S7-creator-analytics.png') });
    });

    await page.close();
  }

  await browser.close();
  console.log('\nOK:', results.ok.join(', '));
  if (results.fail.length) console.log('FAILED:\n - ' + results.fail.join('\n - '));
})();
