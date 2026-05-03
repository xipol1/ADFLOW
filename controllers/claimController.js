/**
 * Claim Controller — channel ownership verification via Telegram description.
 *
 * Flow: initClaim → user adds token to channel description → verifyClaim
 */

const { v4: uuidv4 } = require('uuid');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const { maybeElevateFounderTier } = require('../services/founderTierElevation');

const CLAIM_PREFIX = 'channelad-verify-';

/**
 * POST /api/canales/:id/claim/init
 * Generate a claim token and store it on the Canal.
 */
const initClaim = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const canal = await Canal.findById(req.params.id);
    if (!canal) {
      return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    }

    if (canal.claimed) {
      return res.status(409).json({
        success: false,
        message: 'Este canal ya ha sido reclamado',
        claimedAt: canal.claimedAt,
      });
    }

    if (canal.plataforma !== 'telegram') {
      return res.status(400).json({
        success: false,
        message: 'La verificacion por descripcion solo esta disponible para canales de Telegram',
      });
    }

    const token = uuidv4().replace(/-/g, '').slice(0, 16);
    canal.claimToken = token;
    await canal.save();

    return res.json({
      success: true,
      data: {
        canalId: canal._id,
        nombre: canal.nombreCanal,
        username: canal.identificadorCanal,
        claimCode: `${CLAIM_PREFIX}${token}`,
        instructions: `Anade este texto en la descripcion de tu canal de Telegram durante 10 minutos: ${CLAIM_PREFIX}${token}`,
      },
    });
  } catch (err) {
    console.error('initClaim error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * POST /api/canales/:id/claim/verify
 * Check channel description via MTProto for the claim token.
 */
const verifyClaim = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const userId = req.usuario?.id || req.usuario?._id;
    if (!userId) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    const canal = await Canal.findById(req.params.id);
    if (!canal) {
      return res.status(404).json({ success: false, message: 'Canal no encontrado' });
    }

    if (canal.claimed) {
      return res.status(409).json({ success: false, message: 'Este canal ya ha sido reclamado' });
    }

    if (!canal.claimToken) {
      return res.status(400).json({
        success: false,
        message: 'No hay proceso de reclamacion activo. Llama a /claim/init primero.',
      });
    }

    // Fetch current channel description via MTProto
    const pkg = 'telegram';
    let description = '';
    try {
      const { getClient, disconnectClient, loadGramJS } = require('../services/telegramIntelService');
      const { Api } = loadGramJS();
      const client = await getClient();

      const username = (canal.identificadorCanal || '').replace(/^@/, '').trim();
      const entity = await client.getEntity(username);

      if (entity && entity instanceof Api.Channel) {
        const full = await client.invoke(
          new Api.channels.GetFullChannel({ channel: entity })
        );
        description = full.fullChat?.about || '';
      }

      await disconnectClient();
    } catch (err) {
      console.error('verifyClaim MTProto error:', err.message);
      return res.status(500).json({
        success: false,
        message: 'No se pudo conectar con Telegram para verificar. Intentalo de nuevo.',
      });
    }

    const expectedCode = `${CLAIM_PREFIX}${canal.claimToken}`;

    if (!description.includes(expectedCode)) {
      return res.json({
        success: false,
        verified: false,
        message: `Codigo no encontrado en la descripcion del canal. Asegurate de que contiene: ${expectedCode}`,
      });
    }

    // Verified — claim the channel. MTProto description match is the
    // strongest proof we can obtain (only an admin can edit the description
    // and we read it directly from Telegram's MTProto layer).
    canal.claimed = true;
    canal.claimedBy = userId;
    canal.claimedAt = new Date();
    canal.claimToken = null;
    canal.propietario = userId;
    canal.estado = 'activo';
    canal.verificado = true;
    canal.verificacion = canal.verificacion || {};
    canal.verificacion.tipoAcceso = 'admin_directo';
    canal.verificacion.confianzaScore = 95;
    await canal.save();
    await maybeElevateFounderTier(canal);

    return res.json({
      success: true,
      verified: true,
      message: 'Canal reclamado exitosamente. Ya puedes gestionar tu publicidad.',
      data: {
        id: canal._id,
        nombre: canal.nombreCanal,
        claimed: true,
        claimedAt: canal.claimedAt,
      },
    });
  } catch (err) {
    console.error('verifyClaim error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

/**
 * GET /api/canales/claimed/mine
 * Return all channels claimed by the authenticated user.
 */
const myClaimedChannels = async (req, res) => {
  const dbOk = await ensureDb();
  if (!dbOk) return res.status(503).json({ success: false, message: 'DB unavailable' });

  try {
    const userId = req.usuario?.id || req.usuario?._id;
    const channels = await Canal.find({ claimedBy: userId, claimed: true })
      .select('nombreCanal identificadorCanal plataforma categoria estadisticas CAS nivel claimedAt')
      .lean();

    return res.json({ success: true, data: channels });
  } catch (err) {
    console.error('myClaimedChannels error:', err.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { initClaim, verifyClaim, myClaimedChannels };
