/** Recaptura S3 rankings con sesión iniciada y espera por filas reales. */
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

  await page.goto(FRONT + '/rankings', { waitUntil: 'networkidle2', timeout: 60000 });
  await page.waitForFunction(() => /🥇/.test(document.body.innerText) && /\d+K/.test(document.body.innerText), { timeout: 60000 });
  await sleep(2000);
  await page.screenshot({ path: path.join(OUT, 'S3a-rankings.png') });
  console.log('SAVED S3a-rankings');

  const clicked = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, a, [role="tab"]')];
    const el = els.find((e) => /^(salud|finanzas|crypto)$/i.test((e.textContent || '').trim()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  });
  if (clicked) {
    await sleep(3500);
    await page.screenshot({ path: path.join(OUT, 'S3b-rankings-categoria.png') });
    console.log('SAVED S3b-rankings-categoria');
  } else {
    console.log('SKIP S3b: no tab found');
  }

  await browser.close();
})();
