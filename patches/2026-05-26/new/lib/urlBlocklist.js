/**
 * URL Blocklist · valida que el destino de una campaña no apunte a
 * dominios de categorías que Channelad no acepta publicar.
 *
 * Diseño:
 *   - Listas hardcoded por categoría (gambling, adult, drugs, weapons,
 *     fraud, malware).
 *   - Match por dominio exacto Y subdominio.
 *   - Devuelve la categoría para que el caller localice el mensaje.
 *
 * Esto NO sustituye:
 *   - Allowlists por mercado (gambling regulado puede ser legítimo)
 *   - Verificación de identidad del advertiser
 *   - Revisión humana de campañas sospechosas
 */

const STATIC_BLOCKLIST = {
  gambling: [
    'bet365.com', 'betano.com', 'betfair.com', 'williamhill.com',
    'pokerstars.com', '888casino.com', 'casino.com', 'unibet.com',
    'bwin.com', 'codere.es', 'sportium.es', 'casumo.com',
    'leovegas.com', 'mrgreen.com', 'ladbrokes.com', 'paddypower.com',
    'stake.com', 'bcgame.com',
  ],
  adult: [
    'pornhub.com', 'xvideos.com', 'xhamster.com', 'redtube.com',
    'youporn.com', 'onlyfans.com', 'manyvids.com', 'chaturbate.com',
    'stripchat.com', 'livejasmin.com',
  ],
  drugs: [
    'silkroad-market.com', 'darknetmarkets.com',
    'royalqueenseeds.com', 'seedsman.com',
  ],
  weapons: [
    'budsgunshop.com', 'gunbroker.com', 'palmettostatearmory.com',
    'cheaperthandirt.com',
  ],
  fraud: [
    'forsage.io', 'bitconnect.co',
  ],
  malware: [
    'tinyurl.com', 'is.gd',
  ],
};

const BLOCKLIST_RUNTIME = new Map();
const ALLOWLIST = new Set([]);
const PATH_BLOCKLIST = [];

const cleanHost = (urlOrHost) => {
  const s = String(urlOrHost || '').trim().toLowerCase();
  if (!s) return '';
  try {
    const u = new URL(s.startsWith('http') ? s : `https://${s}`);
    return u.hostname.replace(/^www\./, '');
  } catch {
    return s.replace(/^www\./, '').split('/')[0];
  }
};

const matchesDomain = (host, base) => {
  if (!host || !base) return false;
  if (host === base) return true;
  return host.endsWith(`.${base}`);
};

function checkUrl(url) {
  const host = cleanHost(url);
  if (!host) return { allowed: false, category: 'invalid', match: '', source: 'static' };

  for (const allowed of ALLOWLIST) {
    if (matchesDomain(host, allowed)) return { allowed: true };
  }

  for (const [base, meta] of BLOCKLIST_RUNTIME.entries()) {
    if (matchesDomain(host, base)) {
      return { allowed: false, category: meta.category, match: base, source: 'runtime' };
    }
  }

  try {
    const u = new URL(String(url).startsWith('http') ? url : `https://${url}`);
    for (const rule of PATH_BLOCKLIST) {
      if (matchesDomain(host, rule.domain) && rule.pattern.test(u.pathname)) {
        return { allowed: false, category: rule.category, match: `${rule.domain}${rule.pattern}`, source: 'path' };
      }
    }
  } catch { /* invalid URL */ }

  for (const [category, domains] of Object.entries(STATIC_BLOCKLIST)) {
    for (const base of domains) {
      if (matchesDomain(host, base)) {
        return { allowed: false, category, match: base, source: 'static' };
      }
    }
  }

  return { allowed: true };
}

function addRuntimeBlock(domain, { category, addedBy, reason } = {}) {
  const base = cleanHost(domain);
  if (!base) throw new Error('Dominio inválido');
  BLOCKLIST_RUNTIME.set(base, {
    category: String(category || 'manual'),
    addedAt: new Date(),
    addedBy: String(addedBy || 'system'),
    reason: String(reason || ''),
  });
  return base;
}

function removeRuntimeBlock(domain) {
  return BLOCKLIST_RUNTIME.delete(cleanHost(domain));
}

function listCategories() {
  return Object.keys(STATIC_BLOCKLIST);
}

module.exports = {
  checkUrl,
  addRuntimeBlock,
  removeRuntimeBlock,
  listCategories,
  STATIC_BLOCKLIST,
  cleanHost,
};
