/** Ronda 4: overview advertiser, A/B lab creator, campañas completadas, cocina con Enter. */
const puppeteer = require('puppeteer');
const path = require('path');

const OUT = 'C:\\Users\\win\\Desktop\\_Channelad\\pitch-v2-assets';
const FRONT = 'http://localhost:3000';
const API = 'http://localhost:5000/api';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function login(email) {
  const res = await fetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: 'Channelad.test.2026' }),
  });
  const data = await res.json();
  if (!data.success) throw new Error('login failed ' + email);
  return data;
}

async function newPage(browser, sess) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 2 });
  await page.evaluateOnNewDocument((s) => {
    localStorage.setItem('channelad-cookie-consent', JSON.stringify({ necessary: true, ts: 1, v: 1 }));
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

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
  const results = { ok: [], fail: [] };
  const attempt = async (label, fn) => {
    try { await fn(); results.ok.push(label); console.log('SAVED', label); }
    catch (e) { console.error('FAIL', label, e.message); results.fail.push(label + ': ' + e.message); }
  };

  const adv = await login('advertiser@channelad.io');
  {
    const page = await newPage(browser, adv);

    await attempt('S4c-advertiser-overview', async () => {
      await page.goto(FRONT + '/advertiser', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(4000);
      await page.screenshot({ path: path.join(OUT, 'S4c-advertiser-overview.png') });
    });

    await attempt('S4a2-campaigns-completadas', async () => {
      await page.goto(FRONT + '/advertiser/campaigns', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(3000);
      const clicked = await page.evaluate(() => {
        const els = [...document.querySelectorAll('button, [role="tab"]')];
        const el = els.find((e) => /completadas/i.test(e.textContent || '') && e.offsetParent !== null);
        if (el) { el.click(); return true; }
        return false;
      });
      if (!clicked) throw new Error('no Completadas tab');
      await sleep(1500);
      await page.screenshot({ path: path.join(OUT, 'S4a2-campaigns-completadas.png') });
    });

    await attempt('S1c-marketplace-cocina', async () => {
      await page.goto(FRONT + '/marketplace', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(() => !/Cargando canales/i.test(document.body.innerText), { timeout: 45000 });
      await page.click('input[placeholder*="Busca"]');
      await page.keyboard.type('cocina', { delay: 60 });
      await page.keyboard.press('Enter');
      await sleep(1500);
      await page.waitForFunction(() => !/Cargando canales/i.test(document.body.innerText), { timeout: 30000 });
      await sleep(1000);
      await page.screenshot({ path: path.join(OUT, 'S1c-marketplace-cocina.png') });
    });

    await page.close();
  }

  const cre = await login('creator@channelad.io');
  {
    const page = await newPage(browser, cre);

    await attempt('S6-abtest-lab', async () => {
      await page.goto(FRONT + '/creator/abtest', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(4000);
      await page.screenshot({ path: path.join(OUT, 'S6-abtest-lab.png') });
    });

    await attempt('S6b-compare', async () => {
      await page.goto(FRONT + '/creator/compare', { waitUntil: 'networkidle2', timeout: 60000 });
      await sleep(4000);
      await page.screenshot({ path: path.join(OUT, 'S6b-compare.png') });
    });

    await page.close();
  }

  await browser.close();
  console.log('\nOK:', results.ok.join(', '));
  if (results.fail.length) console.log('FAILED:\n - ' + results.fail.join('\n - '));
})();
