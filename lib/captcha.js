/**
 * Cloudflare Turnstile captcha verification.
 *
 * Closes Refinería audit M-4. The /api/auth/registro endpoint is rate-limited
 * to 5/hour per IP, but that's the only anti-bot defence. Turnstile adds a
 * silent challenge that filters automated registrations without adding
 * friction for real users.
 *
 * Opt-in by design: when `TURNSTILE_SECRET` is not set, verification is
 * skipped so local dev / preview deploys / CI don't need a Cloudflare site.
 * Production should set it and the matching `VITE_TURNSTILE_SITE_KEY` on the
 * frontend.
 *
 * Docs: https://developers.cloudflare.com/turnstile/get-started/server-side-validation/
 */

const TURNSTILE_VERIFY_URL = 'https://challenges.cloudflare.com/turnstile/v0/siteverify';

/**
 * @param {string|undefined} token   The cf-turnstile-response from the client.
 * @param {string|undefined} remoteip  Optional — Cloudflare uses it for risk scoring.
 * @returns {Promise<{ok: boolean, skipped?: boolean, code?: string, error?: string}>}
 *   - `ok: true, skipped: true`  — secret not configured, caller should pass through.
 *   - `ok: true`                 — token verified by Cloudflare.
 *   - `ok: false, code: ...`     — verification failed; `code` is the first
 *                                  Cloudflare error code (e.g. 'invalid-input-response',
 *                                  'timeout-or-duplicate') or one of our local
 *                                  codes ('missing-token', 'request-failed').
 */
async function verifyCaptcha(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET;
  if (!secret) {
    return { ok: true, skipped: true };
  }
  if (!token || typeof token !== 'string') {
    return { ok: false, code: 'missing-token' };
  }

  try {
    const body = new URLSearchParams({
      secret,
      response: token,
      ...(remoteip ? { remoteip } : {}),
    });
    const res = await fetch(TURNSTILE_VERIFY_URL, {
      method: 'POST',
      body,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    });
    const json = await res.json();
    if (json && json.success) {
      return { ok: true };
    }
    const code = Array.isArray(json && json['error-codes']) && json['error-codes'].length
      ? json['error-codes'][0]
      : 'unknown';
    return { ok: false, code };
  } catch (err) {
    return { ok: false, code: 'request-failed', error: err && err.message };
  }
}

/**
 * True when Turnstile is wired (so callers can branch UX: e.g. tell the
 * frontend whether to render the widget).
 */
function isCaptchaEnabled() {
  return Boolean(process.env.TURNSTILE_SECRET);
}

module.exports = { verifyCaptcha, isCaptchaEnabled };
