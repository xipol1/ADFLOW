'use strict';

/**
 * Resolve a WhatsApp viewer's role for a newsletter (OWNER / ADMIN / SUBSCRIBER),
 * robust to the two quirks that broke ownership detection (the root cause of the
 * Baileys ownership beta-freeze):
 *
 *   1. Metadata fetched by INVITE link comes back with `viewer_metadata: null`,
 *      so the viewer's role is absent and OWNERs get mislabeled SUBSCRIBER. The
 *      SAME channel fetched by JID DOES carry `viewer_metadata.role`. Callers
 *      pass the by-JID payload as `primary` and the invite payload as `fallback`.
 *
 *   2. The owner JID may be exposed as a phone number OR as a LID. When no
 *      explicit viewer role exists, match the owner against BOTH the connected
 *      account's phone number and its LID (the LID-vs-phone mismatch that
 *      previously produced false SUBSCRIBER reads).
 *
 * Pure function — no I/O — so the gating logic can be unit-tested directly.
 *
 * @param {object|null} primary   by-JID newsletterMetadata payload (authoritative)
 * @param {object|null} fallback  by-invite newsletterMetadata payload
 * @param {{userNum?: string, userLidNum?: string}} account  connected account ids
 * @returns {'OWNER'|'ADMIN'|'SUBSCRIBER'}
 */
function resolveNewsletterRole(primary, fallback, account = {}) {
  const p = primary || {};
  const f = fallback || {};
  const { userNum, userLidNum } = account;

  let role =
    p.viewer_metadata?.role ||
    f.viewer_metadata?.role ||
    p.role ||
    f.role ||
    null;

  const ownerJid = p.owner || f.owner;
  if (!role && ownerJid) {
    const ownerNum = String(ownerJid).split('@')[0].split(':')[0];
    role = ownerNum && (ownerNum === userNum || ownerNum === userLidNum) ? 'OWNER' : 'SUBSCRIBER';
  }

  return role || 'SUBSCRIBER';
}

module.exports = { resolveNewsletterRole };
