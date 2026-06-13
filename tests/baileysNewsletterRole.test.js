/**
 * resolveNewsletterRole — ownership detection for WhatsApp newsletters.
 *
 * Regression guard for the bug that froze Baileys ownership verification:
 * metadata fetched by INVITE link returns `viewer_metadata: null`, so OWNERs
 * were mislabeled SUBSCRIBER and their channels rejected. The SAME channel
 * fetched by JID carries `viewer_metadata.role`. The resolver must prefer the
 * by-JID payload and match owner JIDs against both phone and LID.
 *
 * Payloads below mirror the real shapes observed for the live channel
 * "La Terreta Cream" (120363426046114710@newsletter), account +34674709388
 * (LID 252200513175652).
 */
const { resolveNewsletterRole } = require('../services/baileys/newsletterRole');

const ACCOUNT = { userNum: '34674709388', userLidNum: '252200513175652' };

// Real shape: by-invite has viewer_metadata: null.
const INVITE_META = {
  id: '120363426046114710@newsletter',
  thread_metadata: { name: { text: 'La Terreta Cream' }, subscribers_count: '0', verification: 'UNVERIFIED' },
  viewer_metadata: null,
};
// Real shape: by-JID carries the viewer's role.
const BYJID_META = {
  id: '120363426046114710@newsletter',
  thread_metadata: { name: { text: 'La Terreta Cream' }, subscribers_count: '0', verification: 'UNVERIFIED' },
  viewer_metadata: { mute: 'ON', role: 'OWNER' },
};

describe('resolveNewsletterRole — the ownership freeze bug', () => {
  test('OWNER is detected from the by-JID payload even when the invite payload has viewer_metadata:null', () => {
    expect(resolveNewsletterRole(BYJID_META, INVITE_META, ACCOUNT)).toBe('OWNER');
  });

  test('documents the OLD bug: with ONLY the invite payload, role is unknown → SUBSCRIBER', () => {
    // This is exactly why a by-JID re-query is required before gating.
    expect(resolveNewsletterRole(INVITE_META, null, ACCOUNT)).toBe('SUBSCRIBER');
  });

  test('ADMIN viewer role passes through', () => {
    const m = { viewer_metadata: { role: 'ADMIN' } };
    expect(resolveNewsletterRole(m, null, ACCOUNT)).toBe('ADMIN');
  });
});

describe('resolveNewsletterRole — owner JID fallback (no explicit viewer role)', () => {
  test('matches owner exposed as a LID', () => {
    const m = { owner: '252200513175652@lid', viewer_metadata: null };
    expect(resolveNewsletterRole(m, null, ACCOUNT)).toBe('OWNER');
  });

  test('matches owner exposed as a phone number', () => {
    const m = { owner: '34674709388@s.whatsapp.net', viewer_metadata: null };
    expect(resolveNewsletterRole(m, null, ACCOUNT)).toBe('OWNER');
  });

  test('owner is someone else → SUBSCRIBER (cannot claim a channel you do not administer)', () => {
    const m = { owner: '34999999999@s.whatsapp.net', viewer_metadata: null };
    expect(resolveNewsletterRole(m, null, ACCOUNT)).toBe('SUBSCRIBER');
  });

  test('no role, no owner → SUBSCRIBER', () => {
    expect(resolveNewsletterRole({}, null, ACCOUNT)).toBe('SUBSCRIBER');
    expect(resolveNewsletterRole(null, null, ACCOUNT)).toBe('SUBSCRIBER');
  });
});
