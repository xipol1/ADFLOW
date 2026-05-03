/**
 * Founder-tier elevation
 *
 * Users registered via the Telegram lead-gen bot start with botVerified:true
 * and channelUsername/channelTier as *declared* metadata, but founderTier
 * stays false — the bot can't prove they're admin of the channel they named.
 *
 * This helper runs after a Canal save and elevates the user to
 * founderTier:true if:
 *
 *   1. The user originally arrived via the bot funnel (botVerified:true)
 *   2. The channel they declared in the bot conversation (channelUsername)
 *      matches the identificadorCanal of the just-saved Canal
 *   3. The Canal is strongly verified (verificado:true) — i.e. it passed
 *      OAuth / bot-admin / MTProto claim, not the soft tracking-URL path
 *
 * Failure to elevate is non-fatal — the Canal save proceeds either way.
 */

'use strict';

const normalize = (value) =>
  String(value || '').replace(/^@/, '').trim().toLowerCase();

async function maybeElevateFounderTier(canal) {
  if (!canal || !canal.verificado || !canal.propietario) return false;

  try {
    const Usuario = require('../models/Usuario');
    const user = await Usuario.findById(canal.propietario)
      .select('botVerified channelUsername founderTier')
      .lean();

    if (!user) return false;
    if (!user.botVerified) return false;
    if (user.founderTier) return false; // already elevated

    const declared = normalize(user.channelUsername);
    const verified = normalize(canal.identificadorCanal);
    if (!declared || declared !== verified) return false;

    await Usuario.findByIdAndUpdate(canal.propietario, { founderTier: true });
    return true;
  } catch (err) {
    // Swallow — never fail the caller because of an elevation lookup.
    try {
      require('../lib/logger').warn('founderTier.elevation_failed', {
        canalId: canal?._id?.toString(),
        msg: err?.message,
      });
    } catch { /* logger unavailable */ }
    return false;
  }
}

module.exports = { maybeElevateFounderTier };
