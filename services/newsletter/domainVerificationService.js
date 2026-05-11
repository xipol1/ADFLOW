/**
 * Newsletter Domain Verification Service
 *
 * Newsletter channels can't prove ownership via OAuth — Mailchimp/Beehiiv
 * API keys verify the *account*, not the specific newsletter or domain.
 * This service implements two out-of-band proofs to gate `verificado:true`:
 *
 *   1. DNS TXT: user adds `channelad-verify=<token>` as a TXT record on
 *      their newsletter's domain. We resolve TXT via Node's built-in
 *      `dns.promises.resolveTxt` and match the token.
 *
 *   2. Email confirm: we send a signed link to admin@<domain> /
 *      postmaster@<domain>. Clicking the link surfaces a signed JWT we
 *      verify before promoting the canal.
 *
 * Both paths produce the same outcome: `canal.verificado = true`,
 * `canal.verificacion.tipoAcceso = 'admin_directo'`, with the proof
 * recorded under `canal.newsletterVerification`.
 *
 * Tokens have a 24h TTL — long enough for DNS propagation, short enough
 * that a leaked token can't be exploited indefinitely.
 */

const crypto = require('crypto');
const dns = require('dns').promises;
const jwt = require('jsonwebtoken');

const CHALLENGE_TTL_HOURS = 24;
const CHALLENGE_TTL_MS = CHALLENGE_TTL_HOURS * 60 * 60 * 1000;
const TOKEN_PREFIX = 'channelad-verify=';
// We accept a small set of well-known mailboxes per RFC 2142. Sending to
// arbitrary user-provided addresses would defeat the proof: an attacker
// who controls *their own* address `me@somedomain.com` could "verify"
// somebody else's domain. admin@/postmaster@/webmaster@ are conventionally
// reserved for the domain operator.
const ALLOWED_MAILBOXES = Object.freeze(['admin', 'postmaster', 'webmaster', 'hostmaster']);

function _jwtSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) {
    // Don't silently sign with a placeholder — that would let attackers
    // mint their own confirmation links against a known fallback.
    throw new Error('JWT_SECRET not configured — domain verification disabled');
  }
  return s;
}

function _normalizeDomain(raw) {
  if (!raw) return '';
  let d = String(raw).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '').replace(/\/$/, '');
  // Strip any path component — we only care about the host
  d = d.split('/')[0];
  return d;
}

// Conservative domain shape check. We deliberately do NOT do a public-
// suffix-list check; the DNS resolution step is what actually proves the
// domain exists. This is just defense against obviously bogus input
// (spaces, scheme remnants, etc) before we hit the network.
function _isValidDomain(d) {
  if (!d) return false;
  if (d.length > 253) return false;
  return /^([a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(d);
}

function _newChallengeToken() {
  return crypto.randomBytes(16).toString('hex');
}

/**
 * Start a verification challenge. Persists the token on the canal so the
 * subsequent check call can match it. Generates a fresh token even if
 * one already exists — re-starting a challenge invalidates the old proof.
 */
async function startChallenge(canal, { domain, method }) {
  const dom = _normalizeDomain(domain);
  if (!_isValidDomain(dom)) {
    const err = new Error('Dominio inválido. Formato esperado: ejemplo.com');
    err.code = 'INVALID_DOMAIN';
    throw err;
  }
  if (!['dns', 'email'].includes(method)) {
    const err = new Error('Método debe ser "dns" o "email"');
    err.code = 'INVALID_METHOD';
    throw err;
  }
  if (canal.plataforma !== 'newsletter') {
    const err = new Error('Solo aplicable a canales de tipo newsletter');
    err.code = 'WRONG_PLATFORM';
    throw err;
  }

  const token = _newChallengeToken();
  canal.newsletterVerification = {
    domain: dom,
    method,
    challengeToken: token,
    challengeStartedAt: new Date(),
    verifiedAt: null,
    attempts: 0,
    lastError: '',
  };
  await canal.save();

  return {
    domain: dom,
    method,
    token,
    txtRecord: method === 'dns' ? `${TOKEN_PREFIX}${token}` : null,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  };
}

/**
 * Resolve TXT records on the configured domain and look for the expected
 * `channelad-verify=<token>` entry. On success the canal is promoted.
 */
async function checkDnsChallenge(canal, { resolver = dns } = {}) {
  const v = canal.newsletterVerification || {};
  if (!v.challengeToken || !v.domain) {
    return { ok: false, code: 'NO_CHALLENGE', message: 'No hay reto activo. Llama a /start primero.' };
  }
  if (v.method !== 'dns') {
    return { ok: false, code: 'WRONG_METHOD', message: 'El reto activo no es DNS' };
  }
  if (_isExpired(v.challengeStartedAt)) {
    return { ok: false, code: 'EXPIRED', message: 'El reto expiró. Vuelve a empezar.' };
  }

  v.attempts = (v.attempts || 0) + 1;

  let records;
  try {
    records = await resolver.resolveTxt(v.domain);
  } catch (err) {
    v.lastError = err.code || err.message;
    await canal.save();
    return {
      ok: false,
      code: err.code === 'ENOTFOUND' || err.code === 'ENODATA' ? 'NO_TXT_RECORDS' : 'DNS_ERROR',
      message: err.message,
    };
  }

  // resolveTxt returns string[][] — each TXT record can be a tuple of
  // strings concatenated client-side (per RFC 7208). We flatten and
  // compare the full assembled value.
  const expected = `${TOKEN_PREFIX}${v.challengeToken}`;
  const found = (records || []).some((parts) => parts.join('') === expected);

  if (!found) {
    v.lastError = 'TXT no encontrado';
    await canal.save();
    return {
      ok: false,
      code: 'TOKEN_MISMATCH',
      message: `No se encontró "${expected}" entre los TXT del dominio.`,
    };
  }

  await _promoteVerified(canal);
  return { ok: true, code: 'VERIFIED', message: 'Dominio verificado por DNS.' };
}

/**
 * Generate a signed JWT for the email-confirmation link. The token
 * embeds canalId + domain + nonce so we can validate without server-side
 * lookup until confirmation time.
 */
function buildEmailToken(canal) {
  const v = canal.newsletterVerification || {};
  if (v.method !== 'email' || !v.challengeToken) {
    const err = new Error('No hay reto de email activo');
    err.code = 'NO_CHALLENGE';
    throw err;
  }
  return jwt.sign(
    {
      canalId: String(canal._id),
      domain: v.domain,
      nonce: v.challengeToken,
    },
    _jwtSecret(),
    { expiresIn: `${CHALLENGE_TTL_HOURS}h` }
  );
}

/**
 * Validate which mailbox the caller wants the link sent to and return
 * the full `mailbox@domain` address. We do NOT accept arbitrary local
 * parts (see ALLOWED_MAILBOXES rationale above).
 */
function resolveRecipient(canal, requestedMailbox) {
  const v = canal.newsletterVerification || {};
  if (v.method !== 'email' || !v.domain) {
    const err = new Error('No hay reto de email activo');
    err.code = 'NO_CHALLENGE';
    throw err;
  }
  const mailbox = String(requestedMailbox || 'admin').toLowerCase().trim();
  if (!ALLOWED_MAILBOXES.includes(mailbox)) {
    const err = new Error(`Mailbox no permitido. Usa uno de: ${ALLOWED_MAILBOXES.join(', ')}`);
    err.code = 'BAD_MAILBOX';
    throw err;
  }
  return `${mailbox}@${v.domain}`;
}

/**
 * Validate an email-confirmation token signed by `buildEmailToken` and
 * promote the matching canal if the nonce still matches. We require the
 * stored nonce to match the JWT nonce — that way a re-started challenge
 * invalidates old links automatically.
 */
async function confirmEmailToken(token, { CanalModel }) {
  if (!CanalModel) throw new Error('CanalModel required');
  let payload;
  try {
    payload = jwt.verify(token, _jwtSecret());
  } catch (err) {
    return {
      ok: false,
      code: err.name === 'TokenExpiredError' ? 'EXPIRED' : 'INVALID_TOKEN',
      message: err.message,
    };
  }

  const canal = await CanalModel.findById(payload.canalId);
  if (!canal) return { ok: false, code: 'CANAL_NOT_FOUND', message: 'Canal inexistente' };
  if (canal.plataforma !== 'newsletter') {
    return { ok: false, code: 'WRONG_PLATFORM', message: 'Canal no es newsletter' };
  }

  const v = canal.newsletterVerification || {};
  if (v.method !== 'email') {
    return { ok: false, code: 'WRONG_METHOD', message: 'Reto activo no es de email' };
  }
  if (v.challengeToken !== payload.nonce) {
    // Re-started challenges invalidate older email links — this is the
    // mechanism that makes that work.
    return { ok: false, code: 'NONCE_MISMATCH', message: 'Token obsoleto: reto reiniciado.' };
  }
  if (v.domain !== payload.domain) {
    return { ok: false, code: 'DOMAIN_MISMATCH', message: 'Token no corresponde al dominio actual.' };
  }
  if (_isExpired(v.challengeStartedAt)) {
    return { ok: false, code: 'EXPIRED', message: 'Reto expirado.' };
  }

  await _promoteVerified(canal);
  return { ok: true, code: 'VERIFIED', message: 'Dominio verificado por email.' };
}

function _isExpired(startedAt) {
  if (!startedAt) return true;
  return Date.now() - new Date(startedAt).getTime() > CHALLENGE_TTL_MS;
}

async function _promoteVerified(canal) {
  canal.verificado = true;
  canal.verificacion = canal.verificacion || {};
  // Direct ownership proof of the domain is a stronger signal than the
  // declared-API-key path that newsletters previously stuck at — bump
  // confianzaScore to match the bot-admin / OAuth tier.
  canal.verificacion.tipoAcceso = 'admin_directo';
  canal.verificacion.confianzaScore = Math.max(canal.verificacion.confianzaScore || 0, 80);

  canal.newsletterVerification = canal.newsletterVerification || {};
  canal.newsletterVerification.verifiedAt = new Date();
  canal.newsletterVerification.lastError = '';
  await canal.save();
}

module.exports = {
  startChallenge,
  checkDnsChallenge,
  buildEmailToken,
  resolveRecipient,
  confirmEmailToken,
  // exported for tests
  _normalizeDomain,
  _isValidDomain,
  ALLOWED_MAILBOXES,
  CHALLENGE_TTL_MS,
  TOKEN_PREFIX,
};
