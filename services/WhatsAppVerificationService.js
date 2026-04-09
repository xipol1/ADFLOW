/**
 * WhatsAppVerificationService
 *
 * Flujo de verificación de canales de WhatsApp vía admin client.
 *
 * 1. startVerification: genera código, inicia polling en background
 * 2. checkAdminAccess: verifica que ChannelAd es admin del canal
 * 3. completeVerification: activa canal, publica confirmación
 * 4. getChannelSnapshot: obtiene datos iniciales del canal
 */

'use strict';

const crypto = require('crypto');
const whatsappAdmin = require('./WhatsAppAdminClient');
const Canal = require('../models/Canal');
const { getRedisClient } = require('../config/redis');

// In-memory fallback when Redis is unavailable
const memoryStore = new Map();
const activePolls = new Map();

const VERIFICATION_TTL = 1800; // 30 minutes
const POLL_INTERVAL = 30000;   // 30 seconds
const REDIS_PREFIX = 'wa:verify:';

class WhatsAppVerificationService {

  /**
   * Phase 1: Start verification — generate code, begin polling.
   *
   * The canal owner must publish the code in their WhatsApp channel.
   * We poll every 30s looking for it. When found → auto-complete.
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

    // Start background polling
    this._startPolling(canalId, channelId, code);

    return {
      code,
      channelId,
      expiresIn: VERIFICATION_TTL,
      instrucciones: {
        pasos: [
          'Abre tu canal de WhatsApp',
          `Publica un mensaje con este código exacto: ${code}`,
          'ChannelAd lo detectará automáticamente (máx. 30 minutos)',
          'Si quieres acelerar, pulsa "Verificar admin" después de añadir el número como admin',
        ],
        numeroChannelAd: process.env.WHATSAPP_CHANNELAD_NUMBER || '+34600000000',
        nota: 'Para completar la verificación, el número de ChannelAd debe ser admin de tu canal.',
        tiempoEstimado: '3 minutos',
      },
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

    // 3. Update Canal in MongoDB
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
    };

    const canal = await Canal.findByIdAndUpdate(canalId, { $set: updateData }, { new: true });

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

    // 5. Clean up polling and Redis
    this._stopPolling(channelId);
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
   * Get verification status for a channel.
   */
  async getVerificationStatus(channelId) {
    const redis = await getRedisClient();

    if (redis) {
      const raw = await redis.get(`${REDIS_PREFIX}${channelId}`);
      if (!raw) return { active: false };
      const data = JSON.parse(raw);
      return {
        active: true,
        code: data.code,
        channelId: data.channelId,
        startedAt: data.startedAt,
        expiresIn: Math.max(0, VERIFICATION_TTL - Math.floor((Date.now() - data.startedAt) / 1000)),
        polling: activePolls.has(channelId),
      };
    }

    const data = memoryStore.get(channelId);
    if (!data || data.expiresAt < Date.now()) {
      memoryStore.delete(channelId);
      return { active: false };
    }

    return {
      active: true,
      code: data.code,
      channelId: data.channelId,
      startedAt: data.startedAt,
      expiresIn: Math.max(0, Math.floor((data.expiresAt - Date.now()) / 1000)),
      polling: activePolls.has(channelId),
    };
  }

  // ─── Background Polling ───────────────────────────────────────────────────

  _startPolling(canalId, channelId, code) {
    // Stop any existing poll for this channel
    this._stopPolling(channelId);

    const maxPolls = Math.floor((VERIFICATION_TTL * 1000) / POLL_INTERVAL);
    let pollCount = 0;

    const interval = setInterval(async () => {
      pollCount++;

      if (pollCount >= maxPolls) {
        console.log(`[wa-verify] Polling expired for ${channelId}`);
        this._stopPolling(channelId);
        return;
      }

      if (!whatsappAdmin.ready) return;

      try {
        const posts = await whatsappAdmin.getRecentPosts(channelId, 5);

        const found = posts.some(post =>
          post.body && post.body.includes(code)
        );

        if (found) {
          console.log(`[wa-verify] Code ${code} found in channel ${channelId} — auto-completing`);
          this._stopPolling(channelId);

          try {
            await this.completeVerification(canalId, channelId);
            console.log(`[wa-verify] Auto-verification completed for ${channelId}`);
          } catch (err) {
            console.error(`[wa-verify] Auto-complete failed for ${channelId}:`, err.message);
          }
        }
      } catch (err) {
        // Silent — might not have access yet, that's expected
        if (pollCount % 10 === 0) {
          console.log(`[wa-verify] Poll #${pollCount} for ${channelId}: ${err.message}`);
        }
      }
    }, POLL_INTERVAL);

    activePolls.set(channelId, interval);
    console.log(`[wa-verify] Polling started for ${channelId} (code: ${code})`);
  }

  _stopPolling(channelId) {
    const interval = activePolls.get(channelId);
    if (interval) {
      clearInterval(interval);
      activePolls.delete(channelId);
    }
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
