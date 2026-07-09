/** Recaptura marketplace ordenado por score + búsqueda cocina + hover. */
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = 'C:\\Users\\win\\Desktop\\_Channelad\\pitch-v2-assets';
const FRONT = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const waitLoaded = (page) =>
  page.waitForFunction(
    () => !/Cargando canales/i.test(document.body.innerText) && /€/.test(document.body.innerText),
    { timeout: 45000 }
  );

async function setSort(page, value) {
  await page.evaluate((v) => {
    const sel = [...document.querySelectorAll('select')].find((s) => [...s.options].some((o) => o.value === v));
    if (!sel) throw new Error('sort select not found');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set;
    setter.call(sel, v);
    sel.dispatchEvent(new Event('change', { bubbles: true }));
  }, value);
}

(async () => {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'advertiser@channelad.io', password: 'Channelad.test.2026' }),
  });
  const sess = await res.json();
  if (!sess.success) throw new Error('login failed');

  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('channelad-cookie-consent', JSON.stringify({ necessary: true, ts: 1, v: 1 }));
    for (const k of ['advertiser', 'advertiser:agencia', 'creator', 'creator:agencia'])
      localStorage.setItem(`channelad-onboarding-${k}-done`, 'true');
    localStorage.setItem('token', s.token);
    localStorage.setItem('refreshToken', s.refreshToken || '');
    localStorage.setItem('user', JSON.stringify(s.user));
  }, sess);

  await page.goto(FRONT + '/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
  await waitLoaded(page);

  // S1a/S1b: ordenado por mejor puntuación
  await setSort(page, 'score');
  await sleep(3000); await waitLoaded(page); await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'S1a-marketplace-top.png') });
  console.log('SAVED S1a-marketplace-top (score)');

  await page.evaluate(() => window.scrollBy({ top: Math.round(window.innerHeight * 1.4), behavior: 'instant' }));
  await sleep(1000);
  await page.screenshot({ path: path.join(OUT, 'S1b-marketplace-scroll.png') });
  console.log('SAVED S1b-marketplace-scroll');

  // S1d: mayor audiencia
  await page.evaluate(() => window.scrollTo(0, 0));
  await setSort(page, 'audiencia');
  await sleep(3000); await waitLoaded(page); await sleep(800);
  await page.screenshot({ path: path.join(OUT, 'S1d-marketplace-audiencia.png') });
  console.log('SAVED S1d-marketplace-audiencia');

  // S2: hover sobre primera card del grid por score
  await setSort(page, 'score');
  await sleep(3000); await waitLoaded(page); await sleep(800);
  const box = await page.evaluate(() => {
    const btn = [...document.querySelectorAll('button, a')]
      .find((e) => /ver canal/i.test(e.textContent || '') && e.offsetParent !== null);
    if (!btn) return null;
    let el = btn;
    for (let i = 0; i < 8 && el.parentElement; i++) {
      el = el.parentElement;
      const r = el.getBoundingClientRect();
      if (r.width > 240 && r.width < 600 && r.height > 180) return { x: r.x + r.width / 2, y: Math.max(60, r.y + r.height / 2) };
    }
    return null;
  });
  if (box) {
    await page.mouse.move(box.x, box.y, { steps: 10 });
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT, 'S2-card-hover.png') });
    console.log('SAVED S2-card-hover');
  } else console.log('SKIP S2: no card');

  // S1c: búsqueda cocina (espera real de resultados)
  await page.evaluate(() => {
    const input = document.querySelector('input[placeholder*="Busca"], input[type="search"]');
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
    setter.call(input, 'cocina');
    input.dispatchEvent(new Event('input', { bubbles: true }));
  });
  await page.evaluate(() => {
    const b = [...document.querySelectorAll('button')].find((e) => /^buscar$/i.test((e.textContent || '').trim()));
    if (b) b.click();
  });
  await sleep(1500);
  try {
    await page.waitForFunction(
      () => !/Cargando canales/i.test(document.body.innerText),
      { timeout: 30000 }
    );
    await sleep(1000);
    await page.screenshot({ path: path.join(OUT, 'S1c-marketplace-cocina.png') });
    console.log('SAVED S1c-marketplace-cocina');
  } catch { console.log('SKIP S1c: search never settled'); }

  await browser.close();
})();
