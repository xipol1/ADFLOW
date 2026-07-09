/** Ronda 5: campañas con typo arreglado + rankings categoría con espera real. */
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = 'C:\\Users\\win\\Desktop\\_Channelad\\pitch-v2-assets';
const FRONT = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

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

  // S4a todas + S4a2 completadas (heading ya con ñ vía HMR)
  await page.goto(FRONT + '/advertiser/campaigns', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => /La Terreta/i.test(document.body.innerText), { timeout: 45000 });
  await sleep(1500);
  await page.screenshot({ path: path.join(OUT, 'S4a-advertiser-campaigns.png') });
  console.log('SAVED S4a-advertiser-campaigns');

  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, [role="tab"]')]
      .find((e) => /completadas/i.test(e.textContent || '') && e.offsetParent !== null);
    if (el) el.click();
  });
  await sleep(1800);
  await page.screenshot({ path: path.join(OUT, 'S4a2-campaigns-completadas.png') });
  console.log('SAVED S4a2-campaigns-completadas');

  // S3b rankings con categoría y espera por filas reales
  await page.goto(FRONT + '/rankings', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => /🥇/.test(document.body.innerText) && /\d+K/.test(document.body.innerText), { timeout: 60000 });
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('button, a, [role="tab"]')]
      .find((e) => /^(salud|finanzas|educacion)$/i.test((e.textContent || '').trim()) && e.offsetParent !== null);
    if (el) el.click();
  });
  await page.waitForFunction(() => /🥇/.test(document.body.innerText) && /\d+K/.test(document.body.innerText), { timeout: 60000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, 'S3b-rankings-categoria.png') });
  console.log('SAVED S3b-rankings-categoria');

  await browser.close();
})();
