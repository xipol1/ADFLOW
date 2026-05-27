/**
 * discordAnalyzer — Discord expone un endpoint público sin auth:
 *
 *   GET https://discord.com/api/v10/invites/{code}?with_counts=true
 *
 * Devuelve un JSON con:
 *   - guild.name, guild.description, guild.icon, guild.banner
 *   - approximate_member_count   ← lo crítico
 *   - approximate_presence_count (online aprox)
 *   - guild.features[]  ← contiene 'VERIFIED', 'PARTNERED' si aplican
 *   - guild.premium_tier (server boost level)
 *
 * Discord ha intentado cerrar este endpoint en el pasado. Tolerar 401/404.
 */

const UA = 'ChanneladBot/1.0 (+https://channelad.io)';

async function fetchDiscordInvite(code) {
  const url = `https://discord.com/api/v10/invites/${encodeURIComponent(code)}?with_counts=true&with_expiration=true`;
  const ac = new AbortController();
  const timer = setTimeout(() => ac.abort(), 8000);
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'application/json' },
      signal: ac.signal,
    });
    if (res.status === 404) {
      const err = new Error('discord_invite_not_found');
      err.statusCode = 404;
      throw err;
    }
    if (!res.ok) {
      const err = new Error(`discord_http_${res.status}`);
      err.statusCode = res.status;
      throw err;
    }
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/**
 * analyze({ externalId }) — externalId es el código del invite (la parte
 * después de discord.gg/).
 */
async function analyze({ externalId }) {
  if (!externalId || typeof externalId !== 'string') {
    return { status: 'failed', errorMessage: 'invalid_invite_code', data: {} };
  }

  let payload;
  try {
    payload = await fetchDiscordInvite(externalId);
  } catch (err) {
    if (err.statusCode === 404) {
      return { status: 'not_found', errorMessage: 'invite_expired_or_invalid', data: {} };
    }
    return { status: 'failed', errorMessage: err.message || 'fetch_failed', data: {} };
  }

  const guild = payload?.guild || {};
  if (!guild.id) {
    return { status: 'partial', errorMessage: 'no_guild_in_response', data: {} };
  }

  const features = Array.isArray(guild.features) ? guild.features : [];
  const iconUrl = guild.icon
    ? `https://cdn.discordapp.com/icons/${guild.id}/${guild.icon}.png?size=256`
    : '';

  return {
    status: 'ok',
    data: {
      name:         guild.name || '',
      description:  guild.description || '',
      subscribers:  Number.isFinite(payload.approximate_member_count)
        ? payload.approximate_member_count
        : null,
      onlineCount:  Number.isFinite(payload.approximate_presence_count)
        ? payload.approximate_presence_count
        : null,
      verified:     features.includes('VERIFIED') || features.includes('PARTNERED'),
      profileImage: iconUrl,
      lastActivity: null,
      raw: {
        features,
        premiumTier:       guild.premium_tier ?? null,
        verificationLevel: guild.verification_level ?? null,
        memberCount:       payload.approximate_member_count ?? null,
        presenceCount:     payload.approximate_presence_count ?? null,
      },
    },
  };
}

module.exports = { analyze };
