'use strict';

/**
 * WhatsApp group aptitude rules.
 *
 * Extracted to a standalone module so the logic can be unit-tested without
 * pulling in BaileysSessionManager (which lazy-loads @whiskeysockets/baileys
 * and the Mongo auth store). Keep this file dependency-free.
 *
 * Eligibility (apto = true) requires:
 *   - user is admin or superadmin in the group
 *   - participantsCount >= APTO_MIN_PARTICIPANTS
 *   - not an announcement-only group (those should be Newsletters instead)
 */

const APTO_MIN_PARTICIPANTS = 200;

function evaluateGroupAptitude({ isAdmin, isAnnounce, count } = {}) {
  const memberCount = Number.isFinite(count) ? count : 0;
  const reasons = [];

  if (!isAdmin) reasons.push('No eres administrador del grupo');
  if (memberCount < APTO_MIN_PARTICIPANTS) {
    reasons.push(`Tiene ${memberCount} miembros — mínimo ${APTO_MIN_PARTICIPANTS} para monetizar`);
  }
  if (isAnnounce) {
    reasons.push('Grupo solo-anuncios — conviértelo en Canal (Newsletter) para Channelad');
  }

  const apto = Boolean(isAdmin) && memberCount >= APTO_MIN_PARTICIPANTS && !isAnnounce;
  if (apto) reasons.push(`Cumple criterios: eres admin y tiene ${memberCount} miembros`);

  return { apto, reasons };
}

/**
 * Normalise a Baileys JID for safe equality comparisons.
 *
 * Baileys returns `sock.user.id` in several shapes depending on version:
 *   - "34611:5@s.whatsapp.net" (jid + device resource)
 *   - "34611@s.whatsapp.net"   (bare)
 *   - "34611"                   (raw user, no server)
 *
 * The previous `(sock.user.id).split(':')[0] + '@s.whatsapp.net'` produced
 * `34611@s.whatsapp.net@s.whatsapp.net` for the second case, breaking the
 * isAdmin lookup and marking every group as "no apto" with a wrong reason.
 *
 * This helper strips the optional `:N` device resource AND any duplicated
 * server suffix, then re-attaches the canonical `@s.whatsapp.net` (or the
 * original server if it was an `@lid` identity).
 */
function normalizeJid(id) {
  if (!id) return '';
  const raw = String(id);
  const [userPart, serverPart] = raw.split('@');
  const bareUser = (userPart || '').split(':')[0];
  if (!bareUser) return '';
  const server = serverPart || 's.whatsapp.net';
  return `${bareUser}@${server}`;
}

module.exports = {
  APTO_MIN_PARTICIPANTS,
  evaluateGroupAptitude,
  normalizeJid,
};
