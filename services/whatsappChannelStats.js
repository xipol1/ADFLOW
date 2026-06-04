/**
 * whatsappChannelStats — fetch a WhatsApp Channel's PUBLIC metadata by invite code.
 *
 * Why: WhatsApp does NOT deliver channels to linked devices, so whatsapp-web.js can't
 * list/read channels. AND its getChannelByInviteCode() throws on the current WA Web build
 * (WAWebNewsletterModelUtils.getRoleByIdentifier was removed). This module calls the
 * underlying query directly with role=null, which works and needs NO follow/admin —
 * only one linked WhatsApp session.
 *
 * Returns: { jid, name, description, subscribersCount, verified, verificationState,
 *            stateType, createdAt, pictureUrl }
 *
 * Usage:
 *   const Stats = require('./services/whatsappChannelStats');
 *   const stats = new Stats();              // uses data/whatsapp-session-probe by default
 *   await stats.init();                     // session must already be logged in
 *   const meta = await stats.getMetaByInvite('0029Vb82Fo0I7BeLLtWLvh2B');
 *   const many = await stats.getManyByInvite([url1, url2]);
 *   await stats.close();
 *
 * Login once with: node scripts/wa-login-qr.js   (caches the session).
 */
'use strict';

const path = require('path');
const { Client, LocalAuth } = require('whatsapp-web.js');

const PUPPETEER_ARGS = [
  '--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu',
  '--disable-dev-shm-usage', '--disable-accelerated-2d-canvas',
  '--no-first-run', '--single-process',
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function inviteCodeOf(s) {
  return String(s).trim().replace(/^https?:\/\/(?:www\.)?whatsapp\.com\/channel\//i, '').replace(/[/?#].*$/, '');
}

class WhatsAppChannelStats {
  constructor({ sessionPath } = {}) {
    this.sessionPath = sessionPath
      || process.env.WA_STATS_SESSION_PATH
      || path.join(__dirname, '..', 'data', 'whatsapp-session-probe');
    this.client = null;
    this.ready = false;
    this._readyPromise = null;
  }

  /**
   * Boot the client and resolve when usable. Works around the wweb 1.34.7 bug where the
   * 'ready' event hangs at ~99% on session RESTORE: if 'ready' doesn't fire, we proceed
   * once getState() reports CONNECTED.
   */
  init() {
    if (this._readyPromise) return this._readyPromise;
    this._readyPromise = new Promise((resolve, reject) => {
      this.client = new Client({
        authStrategy: new LocalAuth({ dataPath: this.sessionPath }),
        puppeteer: { headless: true, args: PUPPETEER_ARGS },
      });

      let settled = false;
      const ok = () => { if (settled) return; settled = true; this.ready = true; resolve(this); };
      const ko = (e) => { if (settled) return; settled = true; reject(e); };

      this.client.on('ready', ok);
      this.client.on('auth_failure', (m) => ko(new Error('auth_failure: ' + m)));
      this.client.on('qr', () => ko(new Error('No cached session — run `node scripts/wa-login-qr.js` first to link a device.')));
      this.client.initialize().catch(ko);

      // Readiness fallback for the restore-path 'ready' hang.
      (async () => {
        await sleep(18000);
        if (settled) return;
        for (let i = 0; i < 12 && !settled; i++) {
          try {
            const state = await this.client.getState();
            if (state === 'CONNECTED') return ok();
          } catch (_) { /* not up yet */ }
          await sleep(4000);
        }
        ko(new Error('WhatsApp client never reached a usable state (ready hang + fallback exhausted).'));
      })();
    });
    return this._readyPromise;
  }

  /** Fetch one channel's public metadata by invite code or full channel URL. */
  async getMetaByInvite(inviteOrUrl) {
    await this.init();
    const code = inviteCodeOf(inviteOrUrl);
    return this.client.pupPage.evaluate(async (invite) => {
      const q = window.require('WAWebNewsletterMetadataQueryJob');
      const resp = await q.queryNewsletterMetadataByInviteCode(invite, null);
      const pic = resp?.newsletterPictureMetadataMixin?.picture?.[0]
        ?.queryPictureDirectPathOrEmptyResponseMixinGroup?.value?.directPath;
      return {
        jid: resp?.idJid?._serialized || resp?.idJid || null,
        name: resp?.newsletterNameMetadataMixin?.nameElementValue ?? null,
        description: resp?.newsletterDescriptionMetadataMixin
          ?.descriptionQueryDescriptionResponseMixin?.elementValue ?? null,
        subscribersCount: resp?.newsletterSubscribersMetadataMixin?.subscribersCount ?? null,
        verificationState: resp?.newsletterVerificationMetadataMixin?.verificationState ?? null,
        verified: resp?.newsletterVerificationMetadataMixin?.verificationState === 'verified',
        stateType: resp?.newsletterStateMetadataMixin?.stateType ?? null,
        createdAt: resp?.newsletterCreationTimeMetadataMixin?.creationTimeValue ?? null,
        pictureUrl: pic ? 'https://pps.whatsapp.net' + pic : null,
      };
    }, code);
  }

  /** Fetch many channels sequentially; never throws — failures are captured per item. */
  async getManyByInvite(invitesOrUrls) {
    const out = [];
    for (const item of invitesOrUrls) {
      const code = inviteCodeOf(item);
      try {
        out.push({ invite: code, ok: true, ...(await this.getMetaByInvite(code)) });
      } catch (e) {
        out.push({ invite: code, ok: false, error: e.message });
      }
    }
    return out;
  }

  async close() { try { await this.client?.destroy(); } catch (_) {} }
}

module.exports = WhatsAppChannelStats;
module.exports.inviteCodeOf = inviteCodeOf;
