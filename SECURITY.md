# Security policy

## Reporting a vulnerability

Email **rafa@channelad.io** with the details. Please do not open a public
GitHub issue. Expect an acknowledgement within 48 hours and a remediation
plan within 7 days for critical issues.

---

## Secret handling

Production secrets live in **Vercel project settings** (Production +
Preview environments) and **never** in this repository. The local `.env`
is gitignored; it is for local development only.

If at any point a secret is committed, leaks via screen-share, or is
shared with an external party (a contractor, a debugging session, a
support ticket, an LLM/agent), **rotate it**. Treating that secret as
compromised is the only safe response — you cannot un-leak it.

The full set of secrets used by the application is documented in
[`.env.example`](.env.example). The list below maps each one to its
rotation procedure.

### MongoDB Atlas

`MONGODB_URI` (and the embedded `<USER>:<PASSWORD>`).

1. Atlas console → *Database Access* → edit the user → *Edit Password*
   → *Generate Secure Password*.
2. Update `MONGODB_URI` in Vercel (Production + Preview).
3. Trigger a redeploy so existing serverless instances pick up the new
   credentials. The old password keeps working until the redeploy
   completes — there is no need for a maintenance window.

### JWT signing keys

`JWT_SECRET`, `JWT_REFRESH_SECRET`.

1. Generate two new high-entropy strings:
   ```bash
   node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"
   ```
2. Update both env vars in Vercel and redeploy.
3. **Rotating these invalidates all existing access and refresh tokens**;
   every signed-in user is forced to re-login. Consider doing this
   off-hours and giving users a heads-up.
4. If you need a softer rotation, introduce `JWT_SECRET_PREVIOUS`,
   teach `middleware/auth.js` to verify against either secret for the
   refresh-token TTL window, then drop the previous secret.

### Stripe

`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`.

1. Stripe dashboard → *Developers → API keys* → *Roll key* on the
   secret key. Set the deletion delay to 24h to avoid in-flight
   request failures.
2. *Developers → Webhooks* → select the endpoint → *Roll signing
   secret* (24h delay too). Update `STRIPE_WEBHOOK_SECRET` in Vercel
   before the old one expires.
3. Verify both webhooks (`/api/partners/webhooks/stripe`,
   `/api/transacciones/webhook`) keep returning 200 in
   *Webhooks → Recent events*.

### SMTP / email password

`EMAIL_PASS`.

1. Hostinger control panel → *Email accounts* → reset password for
   `contact@channelad.io`.
2. Update `EMAIL_PASS` in Vercel and redeploy.
3. Confirm a test email goes out from `/api/auth/reenviar-verificacion`.

### Telegram

`TELEGRAM_BOT_TOKEN`: revoke via `@BotFather` → `/revoke` → pick the
bot → confirm. BotFather issues a new token immediately. Update the
env var.

`TELEGRAM_API_ID` / `TELEGRAM_API_HASH` / `TELEGRAM_SESSION`: log into
[my.telegram.org](https://my.telegram.org), create a fresh API ID +
hash, then regenerate the session locally:

```bash
node scripts/generateTelegramSession.js
```

…and store the new `TELEGRAM_SESSION` in Vercel.

### Meta / WhatsApp Cloud API

- `META_APP_SECRET`: Meta dashboard → *App settings → Basic* →
  *Show* / *Reset* the App Secret. Update Vercel.
- `WHATSAPP_TOKEN`: regenerate the long-lived system-user token under
  *WhatsApp → Configuration*. Old tokens stay valid until they expire,
  so there is no downtime.
- `WHATSAPP_VERIFY_TOKEN`: any random string; update both Vercel and
  the webhook subscription URL in the Meta dashboard so Meta's
  re-subscribe handshake passes.

### Google OAuth

`GOOGLE_CLIENT_ID`: rotate by creating a new OAuth client under
*Google Cloud Console → APIs & Services → Credentials*, switching the
env var, then deleting the old client.

### Internal API keys

- `BOT_API_KEY`: 64 random bytes consumed by `/api/auth/bot-token`.
  ```bash
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  Update both Vercel and the Telegram bot's deployment.
- `CRON_SECRET`: rotated alongside Vercel cron jobs (they share the
  secret automatically when you redeploy from the dashboard).
- `ENCRYPTION_KEY`: AES-256 key used for stored OAuth/2FA secrets.
  **MUST be exactly 32 characters.** Rotating this one requires a
  data-migration script (`scripts/migrate-encrypt-tokens.js` is the
  reference) — old ciphertexts cannot be decrypted with the new key.

---

## Reference

- [`AUDIT.md`](AUDIT.md) — current technical audit (critical / high /
  medium / low findings, including the secret-rotation context for C-3).
- Vercel docs on environment variables: <https://vercel.com/docs/projects/environment-variables>
