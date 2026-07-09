/**
 * Captura de screenshots reales para el pitch video v2.0 — ronda 2.
 * Salida: C:\Users\win\Desktop\_Channelad\pitch-v2-assets\*.png (2880x2160, 2x)
 * Requiere: backend en :5000 y Vite en :3000 ya corriendo.
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
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: PASSWORD }),
  });
  const data = await res.json();
  if (!data.success) throw new Error(`login failed for ${email}: ${JSON.stringify(data)}`);
  return data;
}

async function newPage(browser, session) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1080, deviceScaleFactor: 2 });
  const cookieConsent = JSON.stringify({ necessary: true, analytics: false, marketing: false, ts: 1, v: 1 });
  await page.evaluateOnNewDocument((sess, cc) => {
    localStorage.setItem('channelad-cookie-consent', cc);
    // pre-dismiss the 5-step onboarding wizard for every audience variant
    for (const k of ['advertiser', 'advertiser:agencia', 'creator', 'creator:agencia']) {
      localStorage.setItem(`channelad-onboarding-${k}-done`, 'true');
    }
    if (sess) {
      localStorage.setItem('token', sess.token);
      localStorage.setItem('refreshToken', sess.refreshToken || '');
      localStorage.setItem('user', JSON.stringify(sess.user));
    }
  }, session || null, cookieConsent);
  return page;
}

async function shoot(page, name) {
  await page.screenshot({ path: path.join(OUT, name + '.png') });
  console.log('SAVED', name);
}

async function goAndSettle(page, route, extraWait = 2000) {
  await page.goto(FRONT + route, { waitUntil: 'networkidle2', timeout: 60000 });
  await sleep(extraWait);
}

async function clickByText(page, regex) {
  return page.evaluate((reSrc) => {
    const re = new RegExp(reSrc, 'i');
    const els = [...document.querySelectorAll('button, a, [role="button"], [role="tab"]')];
    const el = els.find((e) => re.test((e.textContent || '').trim()) && e.offsetParent !== null);
    if (el) { el.click(); return true; }
    return false;
  }, regex.source);
}

(async () => {
  const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox', '--window-size=1500,1200'] });
  const results = { ok: [], fail: [] };
  const attempt = async (label, fn) => {
    try { await fn(); results.ok.push(label); }
    catch (e) { console.error('FAIL', label, e.message); results.fail.push(label + ': ' + e.message); }
  };

  const advSess = await login('advertiser@channelad.io');

  // ---------- MARKETPLACE (logged-in advertiser → real channel names) ----------
  {
    const page = await newPage(browser, advSess);

    await attempt('S1a-marketplace-top', async () => {
      await goAndSettle(page, '/marketplace', 4000);
      await shoot(page, 'S1a-marketplace-top');
    });

    await attempt('S1b-marketplace-scroll', async () => {
      await page.evaluate(() => window.scrollBy({ top: Math.round(window.innerHeight * 1.4), behavior: 'instant' }));
      await sleep(1200);
      await shoot(page, 'S1b-marketplace-scroll');
    });

    await attempt('S1c-marketplace-cocina', async () => {
      await page.evaluate(() => window.scrollTo(0, 0));
      const filled = await page.evaluate(() => {
        const input = document.querySelector('input[placeholder*="Busca"], input[type="search"]');
        if (!input) return false;
        const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set;
        setter.call(input, 'cocina');
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return true;
      });
      if (!filled) throw new Error('search input not found');
      await clickByText(page, /^buscar$/);
      await sleep(3000);
      await shoot(page, 'S1c-marketplace-cocina');
    });

    await attempt('S2-card-hover', async () => {
      // reset search to full grid
      await goAndSettle(page, '/marketplace', 4000);
      const box = await page.evaluate(() => {
        const btn = [...document.querySelectorAll('button, a')]
          .find((e) => /ver canal/i.test(e.textContent || '') && e.offsetParent !== null);
        if (!btn) return null;
        // card = ancestor ~4 levels up with a sensible card-size bounding box
        let el = btn;
        for (let i = 0; i < 8 && el.parentElement; i++) {
          el = el.parentElement;
          const r = el.getBoundingClientRect();
          if (r.width > 240 && r.width < 600 && r.height > 180) {
            return { x: r.x + r.width / 2, y: Math.max(60, r.y + r.height / 2) };
          }
        }
        return null;
      });
      if (!box) throw new Error('no card found for hover');
      await page.mouse.move(box.x, box.y, { steps: 10 });
      await sleep(1000);
      await shoot(page, 'S2-card-hover');
    });

    await page.close();
  }

  // ---------- RANKINGS (public, wait for real rows) ----------
  {
    const page = await newPage(browser, null);

    await attempt('S3a-rankings', async () => {
      await page.goto(FRONT + '/rankings', { waitUntil: 'networkidle2', timeout: 60000 });
      await page.waitForFunction(
        () => /\b(BRONZE|SILVER|GOLD|PLATINUM)\b/.test(document.body.innerText),
        { timeout: 45000 }
      );
      await sleep(1500);
      await shoot(page, 'S3a-rankings');
    });

    await attempt('S3b-rankings-categoria', async () => {
      const clicked = await clickByText(page, /^(finanzas|salud|crypto)$/);
      if (!clicked) throw new Error('no category tab found');
      await sleep(3000);
      await shoot(page, 'S3b-rankings-categoria');
    });

    await page.close();
  }

  // ---------- ADVERTISER dashboards ----------
  {
    const page = await newPage(browser, advSess);

    await attempt('S4a-advertiser-campaigns', async () => {
      await goAndSettle(page, '/advertiser/campaigns', 3500);
      await shoot(page, 'S4a-advertiser-campaigns');
    });

    await attempt('S4b-new-campaign-modal', async () => {
      const clicked = await clickByText(page, /(nueva campaña|crear campaña|new campaign)/);
      if (!clicked) throw new Error('no "nueva campaña" button found');
      await sleep(2500);
      await shoot(page, 'S4b-new-campaign-modal');
    });

    await attempt('S4c-advertiser-dashboard', async () => {
      await goAndSettle(page, '/advertiser/dashboard', 3500);
      await shoot(page, 'S4c-advertiser-dashboard');
    });

    await attempt('S6-autobuy', async () => {
      await goAndSettle(page, '/advertiser/autobuy', 3500);
      await shoot(page, 'S6-autobuy');
    });

    await page.close();
  }

  // ---------- CREATOR dashboards ----------
  {
    const sess = await login('creator@channelad.io');
    const page = await newPage(browser, sess);

    await attempt('S5-creator-earnings', async () => {
      await goAndSettle(page, '/creator/earnings', 3500);
      await shoot(page, 'S5-creator-earnings');
    });

    await attempt('S7-creator-analytics', async () => {
      await goAndSettle(page, '/creator/analytics', 4000);
      await shoot(page, 'S7-creator-analytics');
    });

    await attempt('S5b-creator-channels', async () => {
      await goAndSettle(page, '/creator/channels', 3500);
      await shoot(page, 'S5b-creator-channels');
    });

    await page.close();
  }

  await browser.close();
  console.log('\nOK:', results.ok.join(', '));
  if (results.fail.length) console.log('FAILED:\n - ' + results.fail.join('\n - '));
})();
