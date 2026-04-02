const TelegramAPI = require('../integraciones/telegram');
const WhatsAppAPI = require('../integraciones/whatsapp');
const DiscordAPI = require('../integraciones/discord');
const InstagramAPI = require('../integraciones/instagram');
const FacebookAPI = require('../integraciones/facebook');
const NewsletterAPI = require('../integraciones/newsletter');
const Canal = require('../models/Canal');
const Anuncio = require('../models/Anuncio');
const Estadistica = require('../models/Estadistica');
const config = require('../config/config');
const { getDecryptedCreds } = require('../lib/encryption');

/**
 * Servicio para sincronizar metricas reales desde las APIs de redes sociales
 */
class SocialSyncService {
  /**
   * Sincronizar metricas de todos los canales activos
   */
  async syncAllChannels() {
    try {
      const canales = await Canal.find({ estado: 'activo' });
      console.log(`Iniciando sincronizacion de ${canales.length} canales...`);

      const results = [];
      for (const canal of canales) {
        const result = await this.syncChannelMetrics(canal);
        results.push({ canalId: canal._id, plataforma: canal.plataforma, ...result });
      }

      return { success: true, count: canales.length, results };
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
      switch (plataforma) {
        case 'telegram':
          metricasActualizadas = await this.fetchTelegramMetrics(canal);
          break;
        case 'discord':
          metricasActualizadas = await this.fetchDiscordMetrics(canal);
          break;
        case 'whatsapp':
          metricasActualizadas = await this.fetchWhatsAppMetrics(canal);
          break;
        case 'instagram':
          metricasActualizadas = await this.fetchInstagramMetrics(canal);
          break;
        case 'facebook':
          metricasActualizadas = await this.fetchFacebookMetrics(canal);
          break;
        case 'newsletter':
          metricasActualizadas = await this.fetchNewsletterMetrics(canal);
          break;
        default:
          metricasActualizadas = { seguidores: canal.estadisticas?.seguidores || 0 };
          break;
      }

      // Actualizar el modelo del canal
      await Canal.findByIdAndUpdate(canal._id, {
        $set: {
          'estadisticas.seguidores': metricasActualizadas.seguidores || canal.estadisticas?.seguidores || 0,
          'estadisticas.ultimaActualizacion': new Date(),
        },
      });

      // Crear o actualizar registro en Estadistica
      await this.updateEstadisticaGlobal(canal._id, 'CANAL', metricasActualizadas);

      return { success: true, metricas: metricasActualizadas };
    } catch (error) {
      console.error(`Error sincronizando canal ${canal._id} (${plataforma}):`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Obtener metricas de Telegram
   */
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

  /**
   * Obtener metricas de Discord
   */
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

  /**
   * Obtener metricas de WhatsApp
   */
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

  /**
   * Obtener metricas de Instagram
   */
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

  /**
   * Obtener metricas de Facebook
   */
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

  /**
   * Obtener metricas de Newsletter (estimacion)
   */
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

  /**
   * Verificar acceso de todos los canales activos
   */
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

  /**
   * Verificar acceso de un canal individual
   */
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

  /**
   * Actualizar o crear registro de estadistica
   */
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
