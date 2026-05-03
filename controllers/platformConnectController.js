/**
 * Platform Connect Controller — Handles token-based platform connections.
 *
 * Covers: Telegram, Discord, WhatsApp (manual), Newsletter.
 * Each platform follows: connect → verify → disconnect flow.
 */

const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const { verifyChannelAccess } = require('../lib/platformConnectors');
const { maybeElevateFounderTier } = require('../services/founderTierElevation');
const TelegramAPI = require('../integraciones/telegram');
const DiscordAPI = require('../integraciones/discord');
const WhatsAppAPI = require('../integraciones/whatsapp');
const NewsletterAPI = require('../integraciones/newsletter');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ═══════════════════════════════════════════════════════════════════════════════
// SHARED HELPERS
// ═══════════════════════════════════════════════════════════════════════════════

async function genericDisconnect(req, res, next, expectedPlatform) {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));
    if (canal.plataforma !== expectedPlatform) {
      return next(httpError(400, `Este canal no es de ${expectedPlatform}`));
    }

    canal.credenciales.botToken = '';
    canal.credenciales.accessToken = '';
    canal.credenciales.refreshToken = '';
    canal.credenciales.phoneNumberId = '';
    canal.credenciales.tokenExpiresAt = null;
    canal.credenciales.tokenType = 'manual';
    canal.estado = 'pendiente_verificacion';
    canal.verificado = false;
    await canal.save();

    return res.json({ success: true, message: `Canal de ${expectedPlatform} desconectado` });
  } catch (error) {
    next(error);
  }
}

async function genericVerify(req, res, next) {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    const result = await verifyChannelAccess(canal);

    if (result.valid) {
      canal.estado = 'activo';
      // Newsletter re-verification only re-validates the API key, which is
      // not strong enough to flip `verificado` (see connectNewsletter). For
      // every other platform verifyChannelAccess is gated by a real ownership
      // signal (bot admin, OAuth token, …) so we can safely promote.
      if (canal.plataforma !== 'newsletter') {
        canal.verificado = true;
      }
      await canal.save();
      return res.json({ success: true, message: 'Canal verificado correctamente', data: { valid: true } });
    }

    return res.json({ success: false, message: result.error || 'Verificacion fallida', data: { valid: false } });
  } catch (error) {
    next(error);
  }
}

/**
 * Find existing canal or create/update one.
 *
 * `trust` shapes how strongly we mark the channel as verified:
 *   - { verificado: true,  tipoAcceso, confianzaScore } for strong proofs
 *     (bot admin, OAuth graph access, MTProto description match, etc.)
 *   - { verificado: false, tipoAcceso: 'declarado', confianzaScore: <30 }
 *     for weak proofs (API-key-only Newsletter, declared Telegram, …) —
 *     the channel becomes operational (estado='activo') but the binary
 *     `verificado` flag stays false so the marketplace doesn't surface it
 *     as a strongly-verified channel.
 */
async function upsertCanal(userId, plataforma, identificadorCanal, updateData, trust = {}) {
  const verificado = trust.verificado !== undefined ? !!trust.verificado : true;
  const tipoAcceso = trust.tipoAcceso || 'admin_directo';
  const confianzaScore = trust.confianzaScore != null ? trust.confianzaScore : 80;

  let canal = await Canal.findOne({ propietario: userId, plataforma, identificadorCanal });

  if (canal) {
    Object.assign(canal.credenciales, updateData.credenciales || {});
    if (updateData.nombreCanal) canal.nombreCanal = updateData.nombreCanal;
    if (updateData.categoria) canal.categoria = updateData.categoria;
    if (updateData.estadisticas) {
      canal.estadisticas.seguidores = updateData.estadisticas.seguidores ?? canal.estadisticas.seguidores;
      canal.estadisticas.ultimaActualizacion = new Date();
    }
    if (updateData.identificadores) {
      Object.assign(canal.identificadores, updateData.identificadores);
    }
    canal.estado = 'activo';
    canal.verificado = verificado;
    canal.verificacion = canal.verificacion || {};
    canal.verificacion.tipoAcceso = tipoAcceso;
    canal.verificacion.confianzaScore = confianzaScore;
    await canal.save();
    await maybeElevateFounderTier(canal);
    return canal;
  }

  canal = await Canal.create({
    propietario: userId,
    plataforma,
    identificadorCanal,
    nombreCanal: updateData.nombreCanal || '',
    categoria: updateData.categoria || '',
    estado: 'activo',
    verificado,
    estadisticas: {
      seguidores: updateData.estadisticas?.seguidores || 0,
      ultimaActualizacion: new Date(),
    },
    identificadores: updateData.identificadores || {},
    credenciales: updateData.credenciales || {},
    verificacion: { tipoAcceso, confianzaScore },
  });
  await maybeElevateFounderTier(canal);
  return canal;
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM
// ═══════════════════════════════════════════════════════════════════════════════

const connectTelegram = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { botToken, chatId, name, category } = req.body;

    const telegram = new TelegramAPI(botToken);
    const verification = await telegram.verifyBotAccess(chatId);
    if (!verification.valid) {
      return next(httpError(400, verification.error || 'No se pudo verificar el bot de Telegram'));
    }

    let memberCount = 0;
    try {
      const countRes = await telegram.getChatMemberCount(chatId);
      memberCount = countRes?.result || 0;
    } catch { /* non-critical */ }

    const chatName = verification.chat?.title || name || '';

    const canal = await upsertCanal(userId, 'telegram', chatId, {
      nombreCanal: chatName,
      categoria: category || '',
      estadisticas: { seguidores: memberCount },
      identificadores: { chatId },
      credenciales: { botToken, tokenType: 'manual' },
    }, { verificado: true, tipoAcceso: 'admin_directo', confianzaScore: 80 });

    return res.status(201).json({
      success: true,
      message: 'Canal de Telegram conectado exitosamente',
      data: { canal },
    });
  } catch (error) {
    next(error);
  }
};

const verifyTelegram = (req, res, next) => genericVerify(req, res, next);
const disconnectTelegram = (req, res, next) => genericDisconnect(req, res, next, 'telegram');

// ═══════════════════════════════════════════════════════════════════════════════
// DISCORD
// ═══════════════════════════════════════════════════════════════════════════════

const connectDiscord = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { botToken, serverId, name, category } = req.body;

    const discord = new DiscordAPI(botToken);
    const verification = await discord.verifyBotAccess(serverId);
    if (!verification.valid) {
      return next(httpError(400, verification.error || 'No se pudo verificar el bot de Discord'));
    }

    const guildName = verification.guild?.name || name || '';
    const memberCount = verification.guild?.memberCount || 0;

    // Discord: bot membership is enforced by getGuild (403 otherwise) AND
    // verifyBotAccess now requires VIEW_CHANNEL + SEND_MESSAGES — confianza
    // is on par with the Telegram bot-admin path.
    const canal = await upsertCanal(userId, 'discord', serverId, {
      nombreCanal: guildName,
      categoria: category || '',
      estadisticas: { seguidores: memberCount },
      identificadores: { serverId },
      credenciales: { botToken, tokenType: 'manual' },
    }, { verificado: true, tipoAcceso: 'admin_directo', confianzaScore: 80 });

    return res.status(201).json({
      success: true,
      message: 'Canal de Discord conectado exitosamente',
      data: { canal },
    });
  } catch (error) {
    next(error);
  }
};

const verifyDiscord = (req, res, next) => genericVerify(req, res, next);
const disconnectDiscord = (req, res, next) => genericDisconnect(req, res, next, 'discord');

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP (Manual — Business API direct token)
// ═══════════════════════════════════════════════════════════════════════════════

const connectWhatsAppManual = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { accessToken, phoneNumberId, name, category } = req.body;

    const whatsapp = new WhatsAppAPI(accessToken, phoneNumberId);
    const verification = await whatsapp.verifyAccess();
    if (!verification.valid) {
      return next(httpError(400, verification.error || 'No se pudo verificar WhatsApp Business'));
    }

    const channelName = verification.phoneInfo?.verified_name || name || phoneNumberId;
    const displayPhone = verification.phoneInfo?.display_phone_number || '';

    // WhatsApp manual: V10 tightens verifyAccess to require both phone-level
    // access AND a successful WABA-level read (admin scope on the parent
    // WhatsApp Business Account), so the ownership signal is comparable to
    // the bot-admin path on Telegram/Discord.
    const canal = await upsertCanal(userId, 'whatsapp', phoneNumberId, {
      nombreCanal: channelName,
      categoria: category || '',
      identificadores: { phoneNumber: displayPhone },
      credenciales: {
        accessToken,
        phoneNumberId,
        tokenType: 'manual',
      },
    }, { verificado: true, tipoAcceso: 'admin_directo', confianzaScore: 80 });

    return res.status(201).json({
      success: true,
      message: 'WhatsApp Business conectado exitosamente',
      data: { canal },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// NEWSLETTER
// ═══════════════════════════════════════════════════════════════════════════════

const connectNewsletter = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { apiKey, provider, subscribers, name, category } = req.body;

    const newsletter = new NewsletterAPI();
    const verification = await newsletter.verifyAccess(apiKey, provider);
    if (!verification.valid) {
      return next(httpError(400, verification.error || 'No se pudo verificar la API key del newsletter'));
    }

    const channelName = name || `Newsletter ${provider}`;
    const subs = Number(subscribers) || 0;

    // Newsletter: a valid API key proves the user has *some* account with
    // the provider, NOT that they own the specific newsletter they're
    // claiming (Mailchimp/Beehiiv/Substack don't expose ownership in the
    // verifyAccess check). Mark as soft signal — the channel is operational
    // but `verificado` stays false until we wire per-provider list selection.
    const canal = await upsertCanal(userId, 'newsletter', `${provider}_${userId}`, {
      nombreCanal: channelName,
      categoria: category || '',
      estadisticas: { seguidores: subs },
      identificadores: { provider: provider.toLowerCase() },
      credenciales: {
        accessToken: apiKey,
        tokenType: 'manual',
      },
    }, { verificado: false, tipoAcceso: 'declarado', confianzaScore: 25 });

    return res.status(201).json({
      success: true,
      message: `Newsletter (${provider}) conectado exitosamente`,
      data: { canal },
    });
  } catch (error) {
    next(error);
  }
};

const verifyNewsletter = (req, res, next) => genericVerify(req, res, next);
const disconnectNewsletter = (req, res, next) => genericDisconnect(req, res, next, 'newsletter');

module.exports = {
  connectTelegram,
  verifyTelegram,
  disconnectTelegram,
  connectDiscord,
  verifyDiscord,
  disconnectDiscord,
  connectWhatsAppManual,
  connectNewsletter,
  verifyNewsletter,
  disconnectNewsletter,
};
