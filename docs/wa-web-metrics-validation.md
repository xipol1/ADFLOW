# WhatsApp Channel metrics via whatsapp-web.js — local validation (empirical)

**Scope:** revive the whatsapp-web.js worker locally and find out, empirically, which
channel metrics we can extract. 100% local — no Mongo, no `server.js`, no deploy.
Run date: **2026-06-04**. Library `whatsapp-web.js@1.34.7` + `puppeteer@24.40.0`.

Test channel: `https://whatsapp.com/channel/0029Vb82Fo0I7BeLLtWLvh2B`
→ resolves to **`120363423838140981@newsletter`** ("Channelad test").
Linked number during the test: **34674709388**.

## TL;DR verdict

1. **Channels do NOT appear on a linked device.** whatsapp-web.js drives WhatsApp Web,
   which is a *linked device*. After a **full sync** (`state: CONNECTED`, 384 chats, 121
   groups, 5602 contacts), the newsletter collection was **empty (0)** — even the linked
   account's **own** channel was absent. So `getChannels()`, `getChatById(<newsletter>)`,
   `fetchMessages`, publishing, and **per-post views/reactions are NOT available** through
   whatsapp-web.js. This is the **same root limitation as Baileys** (both are linked
   devices; WhatsApp doesn't deliver channels to linked devices).
2. **BUT channel-level public metrics ARE extractable by invite code**, with **no need to
   follow or be admin** — via a direct query (whatsapp-web.js's own wrapper is broken on
   the current WA Web build; see below). We pulled name, description, **subscribersCount**,
   verification, state and creation date for the test channel.
3. **Per-post views:** not obtainable here at all — the channel never materialises on the
   linked device, so there are no post objects to read. Reading posts/views would require
   *primary-device* access, which whatsapp-web.js does not provide.

> ⚠️ The task notes "it worked in May". Between then and 2026-06-04 the behaviour changed:
> today the newsletter collection does not populate on the linked device, and
> `getChannelByInviteCode` throws. Treat the May capability as no longer reliable.

## Metric availability — measured

| Metric | Available? | How / evidence |
|---|---|---|
| Channel name | ✅ YES | invite query → `"Channelad test"` |
| Channel description | ✅ YES | invite query (empty for test channel) |
| **Subscriber count** | ✅ YES | invite query → `subscribersCount: 1` |
| Verified badge | ✅ YES | invite query → `verificationState: "unverified"` |
| Channel state (active/suspended) | ✅ YES | `stateType: "active"` |
| Created date | ✅ YES | `createdAt: 1773932750` |
| Picture / privacy / reaction settings | ✅ YES | present in response mixins |
| Channel JID from invite | ✅ YES | `120363423838140981@newsletter` |
| **List my channels** (`getChannels()`) | ❌ NO | returns `[]`; `WAWebNewsletterCollection` empty after full sync |
| Channel appears as a chat | ❌ NO | 0 `@newsletter` entries among 384 chats |
| Recent posts (`fetchMessages`) | ❌ NO | channel chat never loads on linked device |
| Publish to channel | ❌ NO (here) | needs the channel chat, which is absent |
| **Per-post views** | ❌ NO | no post objects reachable; no `msg.views` getter exists either |
| Per-post reactions / forwards | ❌ NO | same reason |

### Channel-level metrics WITHOUT follow/admin — the usable win

whatsapp-web.js's `getChannelByInviteCode()` **throws** on the current WA Web build:
`WAWebNewsletterModelUtils.getRoleByIdentifier is not a function` (WhatsApp removed that
helper). The underlying query still works if you skip the role helper and pass `role = null`:

```js
// inside pupPage.evaluate, current (2026-06) WA Web modules:
const q = window.require('WAWebNewsletterMetadataQueryJob');
const resp = await q.queryNewsletterMetadataByInviteCode(inviteCode, null);
// resp.newsletterSubscribersMetadataMixin.subscribersCount  → follower count
// resp.newsletterNameMetadataMixin.nameElementValue         → name
// resp.newsletterVerificationMetadataMixin.verificationState→ verified?
// resp.idJid                                                → JID
```

This needs only ONE linked WhatsApp session and an invite code. **No following, no admin.**
It's the practical path to validate a creator's channel reach (subscriber count +
verification) at onboarding without any official API.

#### Productized: `services/whatsappChannelStats.js` + `scripts/wa-channel-stats.js`

A reusable module wraps the working query (single client, `ready`-hang fallback, batch,
URL→code normalisation). Validated 2026-06-04 on the owner's two real channels:

```
$ node scripts/wa-channel-stats.js 0029Vb82Fo0I7BeLLtWLvh2B 0029VbBdRDoKLaHpX2IUXW1u
 name              subscribers verified state  jid
 Channelad test    1           false    active 120363423838140981@newsletter
 La Terreta Cream  0           false    active 120363426046114710@newsletter
```

API:
```js
const Stats = require('./services/whatsappChannelStats');
const stats = new Stats();                 // data/whatsapp-session-probe by default
await stats.init();                        // session must be pre-linked (wa-login-qr.js)
const meta = await stats.getMetaByInvite('0029Vb82Fo0I7BeLLtWLvh2B');
const many = await stats.getManyByInvite([url1, url2]);   // never throws; per-item .ok/.error
await stats.close();
```
Integration point for onboarding: call `getMetaByInvite(channelUrl)` when a creator submits
a channel, store `subscribersCount` + `verified`. (Not wired into server.js here — local
validation only. The stats client should run as its own pre-linked session, e.g. the pm2
host, separate from any server.js worker.)

## Tooling produced (all local, reusable)

| Script | Purpose |
|---|---|
| `scripts/wa-login-qr.js` | One-shot login: renders the QR to `_wa-login-qr.png`, caches the session, exits on ready. |
| `scripts/wa-probe-live.js` | In-process metric probe with a `getChannels()` readiness fallback (the `ready` event hangs on session restore against current WA Web). |
| `scripts/wa-introspect.js` | Dumps the live WA Web Store collections — proved the newsletter collection is empty. |
| `scripts/wa-invite-meta.js` | **The win:** fetches a channel's public metadata by invite code via the current module API. |
| `scripts/wa-admin-probe.js` | Original worker-based probe (kept; depends on the worker reaching `ready`, which is currently flaky on restore). |
| `scripts/wa-worker-host.js` | pm2 always-on host for the worker (see below). |

Worker additions (`workers/whatsappWorker.js` + `services/WhatsAppAdminClient.js`):
`listChannels`, `getChannelByInvite`, `rawInviteMetadata`, `debugRawPosts`; plus
`getChannelFollowers`/`getChannelInfo` patched to read `channelMetadata.subscribersCount`
instead of the (channel-empty) `participants`.

## Gotchas confirmed

- whatsapp-web.js channel support is **broken/limited against the 2026-06 WA Web build**:
  `getChannelByInviteCode` throws; `getChannels()` returns `[]`.
- The `ready` event **hangs at 99–100%** on session *restore* (fires fine on a fresh QR).
  `wa-probe-live.js` works around it by proceeding once `getChannels()` answers.
- Repeated kill/relaunch leaves **orphan Chromium** holding the LocalAuth profile lock
  (`The browser is already running…`). Kill puppeteer-cache chrome by path before retrying.
- whatsapp-web.js bundles its **own** puppeteer-core → a **different** bundled Chrome
  (`win64-146.0.7680.31`) than top-level `puppeteer` (`…153`).

## Keep the worker alive on this PC with pm2

```powershell
npm i -g pm2
pm2 start scripts/wa-worker-host.js --name wa-worker-host
pm2 logs wa-worker-host     # FIRST start: scan the QR shown here, once
pm2 save
```

**Windows note:** `pm2 startup` is not supported natively. To auto-start on boot, install
pm2 as a service (`npm i -g @jessety/pm2-installer`, then `pm2 save`) or register
`pm2 resurrect` as a Task Scheduler task at logon. Keep everything on this PC — no cloud.

> Caveat: given finding #1, an always-on worker buys little for *channel* reads today.
> Its value is the invite-code metadata query (`wa-invite-meta.js`) and any future
> direct-chat/group use — not channel post metrics.
