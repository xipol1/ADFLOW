/**
 * WhatsAppVerificationService
 *
 * Flujo de verificación de canales de WhatsApp vía admin client.
 *
 * 1. startVerification: genera código y guarda estado de verificación
 * 2. pollForCode:        chequea on-demand si el código apareció en posts
 *                        (lo llama el frontend mientras el usuario espera)
 * 3. checkAdminAccess:   verifica que ChannelAd es admin del canal
 * 4. completeVerification: activa canal, publica confirmación
 * 5. getChannelSnapshot: obtiene datos iniciales del canal
 *
 * Nota: anteriormente había un setInterval que pollaba en background.
 * No funciona en Vercel serverless (las funciones mueren al responder)
 * y el WhatsApp admin client en este despliegue corre como servicio
 * remoto vía API, así que polling local nunca tendría acceso real.
 * Frontend-driven polling es la única opción confiable.
 */

'use strict';

const crypto = require('crypto');
const whatsappAdmin = require('./WhatsAppAdminClient');
const Canal = require('../models/Canal');
const { getRedisClient } = require('../config/redis');

// In-memory fallback when Redis is unavailable
const memoryStore = new Map();

const VERIFICATION_TTL = 1800; // 30 minutes
const REDIS_PREFIX = 'wa:verify:';

class WhatsAppVerificationService {

  /**
   * Phase 1: Start verification — generate code and store it.
   *
   * The canal owner must publish the code in their WhatsApp channel and
   * keep the verification UI open. The frontend polls `pollForCode` every
   * few seconds; when the code is detected we complete the verification.
   */
  async startVerification(canalId, channelId) {
    const code = crypto.randomInt(100000, 999999).toString();

    const data = {
      code,
      canalId,
      channelId,
      startedAt: Date.now(),
    };

    // Store in Redis (or memory fallback)
    const redis = await getRedisClient();
    if (redis) {
      await redis.set(
        `${REDIS_PREFIX}${channelId}`,
        JSON.stringify(data),
        { EX: VERIFICATION_TTL }
      );
    } else {
      memoryStore.set(channelId, {
        ...data,
        expiresAt: Date.now() + VERIFICATION_TTL * 1000,
      });
    }

    return {
      code,
      channelId,
      expiresIn: VERIFICATION_TTL,
      instrucciones: {
        pasos: [
          'Abre tu canal de WhatsApp',
          `Publica un mensaje con este código exacto: ${code}`,
          'Mantén esta pantalla abierta — comprobaremos cada pocos segundos',
          'Asegúrate de añadir el número de ChannelAd como administrador del canal',
        ],
        numeroChannelAd: process.env.WHATSAPP_CHANNELAD_NUMBER || '+34600000000',
        nota: 'Para completar la verificación, el número de ChannelAd debe ser admin de tu canal.',
        tiempoEstimado: '3 minutos',
      },
    };
  }

  /**
   * Phase 2 (frontend-driven): single on-demand check for the verification
   * code in the channel's recent posts. Frontend calls this on a timer
   * (rate-limited at the route layer). Resolves to one of:
   *
   *   { active: false, reason: 'expired' | 'none' }
   *   { active: true, found: false, expiresIn }
   *   { active: true, found: true, completed: true, canal }
   *   { active: true, found: true, completed: false, error, instrucciones }
   *
   * The "found:true, completed:false" case is informative (e.g. user posted
   * the code but hasn't granted admin yet); the frontend can keep showing
   * the "make admin" instructions without re-issuing a new code.
   */
  async pollForCode(canalId, channelId) {
    const stored = await this._readStoredVerification(channelId);
    if (!stored) {
      return { active: false, reason: 'none', message: 'No hay verificación activa o ha expirado' };
    }
    if (stored.canalId && stored.canalId !== canalId) {
      // Defensive: the stored entry belongs to another canalId. Treat as inactive.
      return { active: false, reason: 'mismatch' };
    }

    if (!whatsappAdmin.ready) {
      return { active: true, found: false, expiresIn: stored.expiresIn, adminClientReady: false };
    }

    let posts;
    try {
      posts = await whatsappAdmin.getRecentPosts(channelId, 5);
    } catch (err) {
      // Read failure (no admin yet, network issue, etc.) — treat as not-found
      // so the frontend keeps polling. We don't abort the verification.
      return {
        active: true,
        found: false,
        expiresIn: stored.expiresIn,
        adminClientReady: true,
        readError: err.message,
      };
    }

    const found = (posts || []).some((p) => p?.body && p.body.includes(stored.code));
    if (!found) {
      return { active: true, found: false, expiresIn: stored.expiresIn, adminClientReady: true };
    }

    // Code detected — try to complete (requires admin access).
    try {
      const result = await this.completeVerification(canalId, channelId);
      return { active: true, found: true, completed: true, canal: result.canal, tier: result.tier };
    } catch (err) {
      return {
        active: true,
        found: true,
        completed: false,
        error: err.message,
        instrucciones: err.instrucciones,
      };
    }
  }

  // Read+normalize the stored verification entry from Redis or memory.
  // Returns null if absent or expired.
  async _readStoredVerification(channelId) {
    const redis = await getRedisClient();
    if (redis) {
      const raw = await redis.get(`${REDIS_PREFIX}${channelId}`);
      if (!raw) return null;
      const data = JSON.parse(raw);
      return {
        code: data.code,
        canalId: data.canalId,
        startedAt: data.startedAt,
        expiresIn: Math.max(0, VERIFICATION_TTL - Math.floor((Date.now() - data.startedAt) / 1000)),
      };
    }

    const data = memoryStore.get(channelId);
    if (!data || data.expiresAt < Date.now()) {
      memoryStore.delete(channelId);
      return null;
    }
    return {
      code: data.code,
      canalId: data.canalId,
      startedAt: data.startedAt,
      expiresIn: Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)),
    };
  }

  /**
   * Check if ChannelAd has admin access to the channel.
   */
  async checkAdminAccess(channelId) {
    const result = await whatsappAdmin.verifyAdminAccess(channelId);

    return {
      hasAccess: result.isAdmin,
      channelId,
      myNumber: result.myNumber,
      permissions: result.permissions || [],
      totalAdmins: result.totalAdmins || 0,
      reason: result.isAdmin
        ? null
        : `El número ${result.myNumber} no está en la lista de admins del canal`,
    };
  }

  /**
   * Complete verification: verify admin → snapshot → activate → confirm.
   */
  async completeVerification(canalId, channelId) {
    // 1. Verify admin access
    const access = await this.checkAdminAccess(channelId);
    if (!access.hasAccess) {
      const adminNumber = process.env.WHATSAPP_CHANNELAD_NUMBER || '+34600000000';
      const err = new Error('ChannelAd no tiene acceso admin al canal');
      err.instrucciones = {
        pasos: [
          'Abre tu canal de WhatsApp',
          'Ve a Información del canal → Administradores',
          `Añade el número ${adminNumber} como administrador`,
          'Vuelve aquí y pulsa "Verificar admin" de nuevo',
        ],
        numero: adminNumber,
      };
      err.statusCode = 403;
      throw err;
    }

    // 2. Get channel snapshot
    const snapshot = await this.getChannelSnapshot(channelId);

    // 3. Update Canal in MongoDB. Admin-client check + code-in-post is
    // strong proof of channel ownership (only admins can post in WhatsApp
    // channels and only admins can grant admin access to the bot number).
    const updateData = {
      'botConfig.whatsapp.adminNumber': process.env.WHATSAPP_CHANNELAD_NUMBER,
      'botConfig.whatsapp.channelId': channelId,
      'botConfig.whatsapp.channelName': snapshot.name,
      'botConfig.whatsapp.adminAccess': true,
      'botConfig.whatsapp.seguidoresVerificados': snapshot.followers,
      'botConfig.whatsapp.verificadoEn': new Date(),
      'botConfig.whatsapp.ultimaLectura': new Date(),
      'estadisticas.seguidores': snapshot.followers,
      'estadisticas.ultimaActualizacion': new Date(),
      'nivelVerificacion': 'oro',
      estado: 'activo',
      verificado: true,
      'verificacion.tipoAcceso': 'bot_miembro',
      'verificacion.confianzaScore': 85,
    };

    const canal = await Canal.findByIdAndUpdate(canalId, { $set: updateData }, { new: true });

    // Founder-tier elevation: post-save hook can't fire on findByIdAndUpdate,
    // so call the helper explicitly. No-op unless the user came through the
    // bot funnel and the channel matches what they declared.
    try {
      const { maybeElevateFounderTier } = require('./founderTierElevation');
      await maybeElevateFounderTier(canal);
    } catch { /* non-fatal */ }

    // 4. Publish confirmation message in channel
    try {
      await whatsappAdmin.publishToChannel(channelId, {
        text: '✅ *Canal verificado en ChannelAd*\n\n' +
              'Este canal está ahora conectado a ChannelAd. ' +
              'Las campañas patrocinadas se gestionarán automáticamente.\n\n' +
              '📊 Métricas leídas en tiempo real\n' +
              '💰 Pagos automáticos verificados\n' +
              '🛡️ Verificación nivel Oro',
      });
    } catch (pubErr) {
      console.warn('[wa-verify] Could not publish confirmation:', pubErr.message);
    }

    // 5. Clean up the stored verification entry
    await this._clearVerification(channelId);

    return {
      success: true,
      tier: 'oro',
      canal: {
        _id: canal?._id,
        channelId,
        channelName: snapshot.name,
        seguidores: snapshot.followers,
        adminAccess: true,
        verificadoEn: new Date(),
      },
    };
  }

  /**
   * Get a snapshot of the channel (info + followers).
   */
  async getChannelSnapshot(channelId) {
    const [info, followers] = await Promise.all([
      whatsappAdmin.getChannelInfo(channelId),
      whatsappAdmin.getChannelFollowers(channelId),
    ]);

    return {
      name: info.name || '',
      description: info.description || '',
      followers: followers.count || 0,
      isChannel: info.isChannel || false,
      isGroup: info.isGroup || false,
    };
  }

  /**
   * Get verification status for a channel — read-only view of the stored
   * code/expiration. Used by the admin-estado endpoint to show the user
   * the current verification state without triggering a check against the
   * WhatsApp admin client. Use `pollForCode` for the active check.
   */
  async getVerificationStatus(channelId) {
    const stored = await this._readStoredVerification(channelId);
    if (!stored) return { active: false };
    return {
      active: true,
      code: stored.code,
      channelId,
      startedAt: stored.startedAt,
      expiresIn: stored.expiresIn,
    };
  }

  async _clearVerification(channelId) {
    const redis = await getRedisClient();
    if (redis) {
      await redis.del(`${REDIS_PREFIX}${channelId}`).catch(() => {});
    }
    memoryStore.delete(channelId);
  }
}

module.exports = new WhatsAppVerificationService();
