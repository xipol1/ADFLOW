const TelegramAPI = require('../integraciones/telegram');
const DiscordAPI = require('../integraciones/discord');
const InstagramAPI = require('../integraciones/instagram');
const WhatsAppAPI = require('../integraciones/whatsapp');
const FacebookAPI = require('../integraciones/facebook');
const NewsletterAPI = require('../integraciones/newsletter');
const Canal = require('../models/Canal');
const Anuncio = require('../models/Anuncio');
const Estadistica = require('../models/Estadistica');
const config = require('../config/config');
const { getDecryptedCreds } = require('../lib/encryption');

let CampaignMetrics;
try { CampaignMetrics = require('../models/CampaignMetrics'); } catch (_) {}

const SYNC_INTERVALS_HOURS = [1, 6, 24, 72, 168];

/**
 * Servicio para sincronizar metricas reales desde las APIs de redes sociales.
 * Soporta tanto el flujo legacy (credenciales cifradas) como el nuevo flujo
 * de bot admin (botConfig).
 */
class SocialSyncService {
  /**
   * Sincronizar metricas de todos los canales activos
   */
  async syncAllChannels() {
    try {
      const canales = await Canal.find({ estado: 'activo' });
      console.log(`🔄 Sincronizando ${canales.length} canales...`);

      const results = await Promise.allSettled(canales.map(c => this.syncChannelMetrics(c)));
      const ok = results.filter(r => r.status === 'fulfilled').length;
      const err = results.filter(r => r.status === 'rejected').length;
      console.log(`✅ ${ok} ok, ${err} errores`);
      return { success: true, ok, err, count: canales.length, results };
    } catch (error) {
      console.error('Error en sincronizacion global de canales:', error.message);
      throw error;
    }
  }

  /**
   * Sincronizar metricas de un canal especifico
   */
  async syncChannelMetrics(canal) {
    const plataforma = canal.plataforma.toLowerCase();
    let metricasActualizadas = {};

    try {
      // New bot admin flow: if botConfig is populated, use the new fetch methods
      const hasBotConfig = canal.botConfig &&
        (canal.botConfig.telegram?.botToken || canal.botConfig.discord?.botToken ||
         canal.botConfig.instagram?.accessToken || canal.botConfig.whatsapp?.adminNumber);

      if (hasBotConfig) {
        switch (plataforma) {
          case 'telegram':   metricasActualizadas = await this.fetchTelegramChannelMetrics(canal); break;
          case 'discord':    metricasActualizadas = await this.fetchDiscordChannelMetrics(canal); break;
          case 'instagram':  metricasActualizadas = await this.fetchInstagramChannelMetrics(canal); break;
          case 'whatsapp':   metricasActualizadas = await this.fetchWhatsAppChannelMetrics(canal); break;
          default: metricasActualizadas = { seguidores: canal.estadisticas?.seguidores || 0 }; break;
        }
        await Canal.findByIdAndUpdate(canal._id, {
          $set: {
            'estadisticas.seguidores': metricasActualizadas.seguidores ?? canal.estadisticas?.seguidores,
            'estadisticas.metricasRed': metricasActualizadas,
            'estadisticas.ultimaActualizacion': new Date(),
            'botConfig.ultimaSync': new Date(),
          },
        });
        console.log(`✅ Canal ${canal._id} (${plataforma}) — ${metricasActualizadas.seguidores} seguidores`);
      } else {
        // Legacy flow: use encrypted credentials
        switch (plataforma) {
          case 'telegram':   metricasActualizadas = await this.fetchTelegramMetrics(canal); break;
          case 'discord':    metricasActualizadas = await this.fetchDiscordMetrics(canal); break;
          case 'whatsapp':   metricasActualizadas = await this.fetchWhatsAppMetrics(canal); break;
          case 'instagram':  metricasActualizadas = await this.fetchInstagramMetrics(canal); break;
          case 'facebook':   metricasActualizadas = await this.fetchFacebookMetrics(canal); break;
          case 'newsletter': metricasActualizadas = await this.fetchNewsletterMetrics(canal); break;
          default: metricasActualizadas = { seguidores: canal.estadisticas?.seguidores || 0 }; break;
        }

        await Canal.findByIdAndUpdate(canal._id, {
          $set: {
            'estadisticas.seguidores': metricasActualizadas.seguidores || canal.estadisticas?.seguidores || 0,
            'estadisticas.ultimaActualizacion': new Date(),
          },
        });

        await this.updateEstadisticaGlobal(canal._id, 'CANAL', metricasActualizadas);
      }

      return { success: true, metricas: metricasActualizadas };
    } catch (error) {
      console.error(`❌ Error sync canal ${canal._id} (${plataforma}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Bot Admin Fetch Methods (use botConfig)
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchTelegramChannelMetrics(canal) {
    const botToken = canal.botConfig?.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = canal.identificadorCanal || canal.identificadores?.chatId;
    if (!botToken || !chatId) throw new Error('Credenciales Telegram incompletas');

    const bot = new TelegramAPI(botToken);
    const access = await bot.verifyAdminAccess(chatId);
    if (!access.isAdmin) {
      console.warn(`⚠️ Bot no es admin en ${chatId} — datos limitados`);
    }

    const metrics = await bot.fetchChannelMetrics(chatId);
    const stats = await bot.getChatStatistics(chatId);

    return { ...metrics, statsNativas: stats, esAdmin: access.isAdmin, puedePublicar: access.canPostMessages };
  }

  async fetchDiscordChannelMetrics(canal) {
    const botToken = canal.botConfig?.discord?.botToken || process.env.DISCORD_BOT_TOKEN;
    const guildId = canal.identificadorCanal || canal.identificadores?.guildId;
    if (!botToken || !guildId) throw new Error('Credenciales Discord incompletas');

    const bot = new DiscordAPI(botToken);
    const access = await bot.verifyBotAccess(guildId);
    if (!access.valid && !access.isPresent) throw new Error(`Bot no está en el servidor ${guildId}`);

    const metrics = await bot.fetchGuildMetrics(guildId);
    return { ...metrics, esPresente: true, puedeVerCanales: access.canViewChannels };
  }

  async fetchInstagramChannelMetrics(canal) {
    const accessToken = canal.botConfig?.instagram?.accessToken;
    const igUserId = canal.botConfig?.instagram?.igUserId || canal.identificadorCanal;
    if (!accessToken || !igUserId) throw new Error('Credenciales Instagram incompletas');

    // Renovar token si está próximo a expirar (< 7 días)
    const expiresAt = canal.botConfig?.instagram?.tokenExpiresAt;
    if (expiresAt && new Date(expiresAt) < new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)) {
      const refreshed = await InstagramAPI.refreshLongLivedToken(accessToken);
      await Canal.findByIdAndUpdate(canal._id, {
        $set: {
          'botConfig.instagram.accessToken': refreshed.accessToken,
          'botConfig.instagram.tokenExpiresAt': refreshed.expiresAt,
        },
      });
    }

    const api = new InstagramAPI(accessToken);
    return api.fetchChannelMetrics(igUserId);
  }

  async fetchWhatsAppChannelMetrics(canal) {
    return {
      seguidores: canal.estadisticas?.seguidores || 0,
      tieneAdminAccess: !!canal.botConfig?.whatsapp?.adminNumber,
      nota: canal.botConfig?.whatsapp?.adminNumber
        ? 'Admin access activo'
        : 'Sin admin access — upgrade pendiente',
    };
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // NEW: Campaign Metrics Sync
  // ═══════════════════════════════════════════════════════════════════════════

  async syncPendingCampaigns() {
    if (!CampaignMetrics) return { ok: 0, err: 0 };
    const pending = await CampaignMetrics.getPendingSync();
    console.log(`📊 ${pending.length} métricas de campaña pendientes...`);
    const results = await Promise.allSettled(pending.map(m => this.syncCampaignMetrics(m)));
    const ok = results.filter(r => r.status === 'fulfilled').length;
    return { ok, err: pending.length - ok };
  }

  async syncCampaignMetrics(cm) {
    const pl = cm.plataforma;
    const horasTranscurridas = cm.publicadoEn
      ? Math.floor((Date.now() - cm.publicadoEn) / (1000 * 60 * 60))
      : 0;

    let snapshotData = {};

    try {
      switch (pl) {
        case 'telegram':   snapshotData = await this.fetchTelegramPostMetrics(cm); break;
        case 'discord':    snapshotData = await this.fetchDiscordPostMetrics(cm); break;
        case 'instagram':  snapshotData = await this.fetchInstagramPostMetrics(cm); break;
        case 'whatsapp':   snapshotData = await this.fetchWhatsAppPostMetrics(cm); break;
      }

      cm.addSnapshot(snapshotData, horasTranscurridas);
      cm.calcularConfianza();
      cm.detectarFraude();

      const nextHours = this._getNextSyncInterval(horasTranscurridas);
      if (nextHours) {
        cm.proximaSync = new Date(Date.now() + nextHours * 3600 * 1000);
      } else {
        cm.syncCompletada = true;
      }

      cm.ultimaSync = new Date();
      await cm.save();

      console.log(`📊 CampaignMetrics ${cm._id} (${pl}) h:${horasTranscurridas} — views:${snapshotData.views} clicks:${snapshotData.clicks}`);
    } catch (err) {
      console.error(`❌ Error sync CampaignMetrics ${cm._id}:`, err.message);
      throw err;
    }
  }

  // ─── Post-level metrics ───────────────────────────────────────────────────

  async fetchTelegramPostMetrics(cm) {
    const canal = cm.canalId;
    const botToken = canal.botConfig?.telegram?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const statsChannelId = process.env.TELEGRAM_STATS_CHANNEL_ID;
    const bot = new TelegramAPI(botToken);
    const metrics = await bot.getPostMetrics(canal.identificadorCanal, cm.postId, statsChannelId);

    if (Object.keys(metrics.reactions || {}).length > 0) {
      cm.reactionsDetalle = metrics.reactions;
    }
    const totalReactions = Object.values(metrics.reactions || {}).reduce((a, b) => a + b, 0);
    return { views: metrics.views, forwards: metrics.forwards, reactions: totalReactions, plataformaData: metrics };
  }

  async fetchDiscordPostMetrics(cm) {
    const canal = cm.canalId;
    const botToken = canal.botConfig?.discord?.botToken || process.env.DISCORD_BOT_TOKEN;
    if (!cm.discordData?.channelId || !cm.postId) return {};
    const bot = new DiscordAPI(botToken);
    const metrics = await bot.getPostMetrics(cm.discordData.channelId, cm.postId);
    if (metrics.reactions) cm.reactionsDetalle = metrics.reactions;
    return { reactions: metrics.totalReactions, plataformaData: metrics };
  }

  async fetchInstagramPostMetrics(cm) {
    const canal = cm.canalId;
    const accessToken = canal.botConfig?.instagram?.accessToken;
    if (!accessToken || !cm.instagramData?.mediaId) return {};
    const api = new InstagramAPI(accessToken);
    const metrics = await api.getPostMetrics(cm.instagramData.mediaId);
    return { views: metrics.videoViews, reach: metrics.reach, impresiones: metrics.impresiones, reactions: metrics.likes, plataformaData: metrics };
  }

  async fetchWhatsAppPostMetrics(cm) {
    return { clicks: cm.metricsFinales?.clicks || 0 };
  }

  // ─── Init campaign metrics on publish ─────────────────────────────────────

  async initCampaignMetrics(anuncio, canal, postResult) {
    if (!CampaignMetrics) return null;
    const pl = canal.plataforma.toLowerCase();

    const doc = new CampaignMetrics({
      anuncioId: anuncio._id,
      canalId: canal._id,
      plataforma: pl,
      publicadoEn: new Date(),
      proximaSync: new Date(Date.now() + 3600 * 1000),
    });

    switch (pl) {
      case 'telegram':
        doc.postId = postResult.message_id?.toString();
        doc.fuenteDatos = canal.botConfig?.telegram?.botToken ? 'admin_directo' : 'tracking_url';
        doc.telegramData = { viewsNativos: !!canal.botConfig?.telegram?.botToken, statsApiDisponible: false };
        doc.addSnapshot({ views: postResult.views || 1, forwards: 0, reactions: 0 }, 0);
        break;

      case 'discord':
        doc.postId = postResult.id;
        doc.fuenteDatos = 'bot_miembro';
        doc.discordData = { channelId: postResult.channel_id, membersOnlineAlPublicar: canal.estadisticas?.metricasRed?.onlineAhora || null };
        doc.addSnapshot({ reactions: 0 }, 0);
        break;

      case 'instagram':
        doc.fuenteDatos = 'oauth_graph';
        doc.instagramData = { mediaId: postResult.id, mediaType: postResult.media_type };
        doc.addSnapshot({ views: 0, reach: 0 }, 0);
        break;

      case 'whatsapp':
        doc.fuenteDatos = canal.botConfig?.whatsapp?.adminNumber ? 'admin_directo' : 'tracking_url';
        doc.whatsappData = { adminAccess: !!canal.botConfig?.whatsapp?.adminNumber };
        doc.addSnapshot({ clicks: 0 }, 0);
        break;
    }

    doc.calcularConfianza();
    await doc.save();
    console.log(`📊 CampaignMetrics creado — anuncio ${anuncio._id} en ${pl} (tier: ${doc.nivelVerificacion})`);
    return doc;
  }

  _getNextSyncInterval(horasActuales) {
    for (const h of SYNC_INTERVALS_HOURS) {
      if (horasActuales < h) return h - horasActuales;
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // LEGACY: Encrypted Credentials Fetch Methods
  // ═══════════════════════════════════════════════════════════════════════════

  async fetchTelegramMetrics(canal) {
    const creds = getDecryptedCreds(canal);
    const botToken = creds.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = canal.identificadorCanal || canal.identificadores?.chatId;

    if (!botToken || !chatId) return {};

    const telegram = new TelegramAPI(botToken);

    try {
      const [memberCountRes, chatInfoRes] = await Promise.all([
        telegram.getChatMemberCount(chatId),
        telegram.getChat(chatId),
      ]);

      const chatInfo = chatInfoRes?.result || {};

      return {
        seguidores: memberCountRes.result || 0,
        social: {
          telegram: {
            miembrosAlPublicar: memberCountRes.result || 0,
            titulo: chatInfo.title || '',
            tipo: chatInfo.type || '',
            descripcion: chatInfo.description || '',
          },
        },
      };
    } catch (err) {
      console.error('Error obteniendo metricas de Telegram:', err.message);
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }
  }

  async fetchDiscordMetrics(canal) {
    const creds = getDecryptedCreds(canal);
    const serverId = canal.identificadores?.serverId || canal.identificadorCanal;
    const botToken = creds.botToken || process.env.DISCORD_BOT_TOKEN;

    if (!serverId || !botToken) return {};

    const discord = new DiscordAPI(botToken);

    try {
      const guild = await discord.getGuild(serverId);
      return {
        seguidores: guild.approximate_member_count || 0,
        social: {
          discord: {
            miembrosActivos: guild.approximate_presence_count || 0,
            nombre: guild.name || '',
            premiumTier: guild.premium_tier || 0,
          },
        },
      };
    } catch (err) {
      console.error('Error obteniendo metricas de Discord:', err.message);
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }
  }

  async fetchWhatsAppMetrics(canal) {
    const creds = getDecryptedCreds(canal);
    const accessToken = creds.accessToken;
    const phoneNumberId = creds.phoneNumberId;

    if (!accessToken || !phoneNumberId) {
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }

    const whatsapp = new WhatsAppAPI(accessToken, phoneNumberId);

    try {
      const phoneInfo = await whatsapp.getPhoneNumberInfo();
      return {
        seguidores: canal.estadisticas?.seguidores || 0,
        social: {
          whatsapp: {
            nombreVerificado: phoneInfo.verified_name || '',
            calidad: phoneInfo.quality_rating || 'unknown',
            numero: phoneInfo.display_phone_number || '',
          },
        },
      };
    } catch (err) {
      console.error('Error obteniendo metricas de WhatsApp:', err.message);
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }
  }

  async fetchInstagramMetrics(canal) {
    const creds = getDecryptedCreds(canal);
    const accessToken = creds.accessToken;

    if (!accessToken) {
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }

    const instagram = new InstagramAPI();

    try {
      const [profile, engagement] = await Promise.all([
        instagram.getProfile(accessToken),
        instagram.calculateEngagement(accessToken),
      ]);

      return {
        seguidores: profile.followers_count || 0,
        social: {
          instagram: {
            nombre: profile.name || '',
            mediaCount: profile.media_count || 0,
            engagementRate: engagement.engagementRate || 0,
            avgLikes: engagement.avgLikes || 0,
            avgComments: engagement.avgComments || 0,
          },
        },
      };
    } catch (err) {
      console.error('Error obteniendo metricas de Instagram:', err.message);
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }
  }

  async fetchFacebookMetrics(canal) {
    const creds = getDecryptedCreds(canal);
    const accessToken = creds.accessToken;
    const pageId = canal.identificadorCanal;

    if (!accessToken || !pageId) {
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }

    const facebook = new FacebookAPI();

    try {
      const pageInfo = await facebook.getPageInfo(accessToken, pageId);

      return {
        seguidores: pageInfo.followers_count || pageInfo.fan_count || 0,
        social: {
          facebook: {
            nombre: pageInfo.name || '',
            fans: pageInfo.fan_count || 0,
            seguidores: pageInfo.followers_count || 0,
            categoria: pageInfo.category || '',
          },
        },
      };
    } catch (err) {
      console.error('Error obteniendo metricas de Facebook:', err.message);
      return { seguidores: canal.estadisticas?.seguidores || 0 };
    }
  }

  async fetchNewsletterMetrics(canal) {
    const newsletter = new NewsletterAPI();
    const subs = canal.estadisticas?.seguidores || 0;
    const metrics = newsletter.estimateMetrics(subs);

    return {
      seguidores: subs,
      social: {
        newsletter: {
          openRate: metrics.openRate,
          clickRate: metrics.clickRate,
          estimatedOpens: metrics.estimatedOpens,
          estimatedClicks: metrics.estimatedClicks,
        },
      },
    };
  }

  // ─── Legacy verification methods ──────────────────────────────────────────

  async verifyAllChannels() {
    try {
      const canales = await Canal.find({ estado: 'activo' });
      const results = [];

      for (const canal of canales) {
        const result = await this.verifyChannelAccess(canal);
        results.push({
          canalId: canal._id,
          plataforma: canal.plataforma,
          nombre: canal.nombreCanal,
          ...result,
        });
      }

      return results;
    } catch (error) {
      console.error('Error verificando canales:', error.message);
      throw error;
    }
  }

  async verifyChannelAccess(canal) {
    const plataforma = canal.plataforma.toLowerCase();

    try {
      switch (plataforma) {
        case 'telegram': {
          const creds = getDecryptedCreds(canal);
          const chatId = canal.identificadores?.chatId || canal.identificadorCanal;
          if (!creds.botToken || !chatId) return { valid: false, error: 'Credenciales incompletas' };
          const telegram = new TelegramAPI(creds.botToken);
          return telegram.verifyBotAccess(chatId);
        }
        case 'discord': {
          const creds = getDecryptedCreds(canal);
          const botToken = creds.botToken || creds.accessToken;
          const serverId = canal.identificadores?.serverId || canal.identificadorCanal;
          if (!botToken || !serverId) return { valid: false, error: 'Credenciales incompletas' };
          const discord = new DiscordAPI(botToken);
          return discord.verifyBotAccess(serverId);
        }
        case 'whatsapp': {
          const creds = getDecryptedCreds(canal);
          if (!creds.accessToken || !creds.phoneNumberId) return { valid: false, error: 'Credenciales incompletas' };
          const whatsapp = new WhatsAppAPI(creds.accessToken, creds.phoneNumberId);
          return whatsapp.verifyAccess();
        }
        case 'instagram': {
          const creds = getDecryptedCreds(canal);
          if (!creds.accessToken) return { valid: false, error: 'Credenciales incompletas' };
          const instagram = new InstagramAPI();
          return instagram.verifyAccess(creds.accessToken);
        }
        case 'facebook': {
          const creds = getDecryptedCreds(canal);
          const pageId = canal.identificadorCanal;
          if (!creds.accessToken || !pageId) return { valid: false, error: 'Credenciales incompletas' };
          const facebook = new FacebookAPI();
          return facebook.verifyAccess(creds.accessToken, pageId);
        }
        case 'newsletter': {
          const creds = getDecryptedCreds(canal);
          const provider = canal.identificadores?.provider || 'mailchimp';
          if (!creds.accessToken) return { valid: false, error: 'API key no configurada' };
          const newsletter = new NewsletterAPI();
          return newsletter.verifyAccess(creds.accessToken, provider);
        }
        default:
          return { valid: false, error: `Plataforma "${plataforma}" no soportada` };
      }
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async updateEstadisticaGlobal(entidadId, tipoEntidad, metricasNuevas) {
    const hoy = new Date();
    const inicioDia = new Date(hoy.setHours(0, 0, 0, 0));
    const finDia = new Date(hoy.setHours(23, 59, 59, 999));

    await Estadistica.findOneAndUpdate(
      {
        entidadId,
        tipoEntidad,
        'periodo.inicio': { $gte: inicioDia },
        'periodo.fin': { $lte: finDia },
      },
      {
        $set: {
          'metricas.alcance': metricasNuevas.seguidores || 0,
          metricasSociales: metricasNuevas.social || {},
        },
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = new SocialSyncService();
