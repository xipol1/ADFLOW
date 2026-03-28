const TelegramAPI = require('../integraciones/telegram');
const WhatsAppAPI = require('../integraciones/whatsapp');
const DiscordAPI = require('../integraciones/discord');
const Canal = require('../models/Canal');
const Anuncio = require('../models/Anuncio');
const Estadistica = require('../models/Estadistica');
const config = require('../config/config');

/**
 * Servicio para sincronizar métricas reales desde las APIs de redes sociales
 */
class SocialSyncService {
  /**
   * Sincronizar métricas de todos los canales activos
   */
  async syncAllChannels() {
    try {
      const canales = await Canal.find({ estado: 'activo' });
      console.log(`🔄 Iniciando sincronización de ${canales.length} canales...`);
      
      for (const canal of canales) {
        await this.syncChannelMetrics(canal);
      }
      
      return { success: true, count: canales.length };
    } catch (error) {
      console.error('❌ Error en sincronización global de canales:', error.message);
      throw error;
    }
  }

  /**
   * Sincronizar métricas de un canal específico
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
          // WhatsApp es más limitado para obtener métricas agregadas vía API sin webhooks
          metricasActualizadas = { seguidores: canal.estadisticas.seguidores }; 
          break;
      }

      // Actualizar el modelo del canal
      await Canal.findByIdAndUpdate(canal._id, {
        $set: {
          'estadisticas.seguidores': metricasActualizadas.seguidores || canal.estadisticas.seguidores,
          'estadisticas.ultimaActualizacion': new Date()
        }
      });

      // Crear o actualizar registro en Estadistica
      await this.updateEstadisticaGlobal(canal._id, 'CANAL', metricasActualizadas);

    } catch (error) {
      console.error(`⚠️ Error sincronizando canal ${canal._id} (${plataforma}):`, error.message);
    }
  }

  /**
   * Obtener métricas de Telegram
   */
  async fetchTelegramMetrics(canal) {
    const botToken = canal.credenciales?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = canal.identificadorCanal || canal.identificadores?.chatId;

    if (!botToken || !chatId) return {};

    const telegram = new TelegramAPI(botToken);
    const memberCountRes = await telegram.getChatMemberCount(chatId);
    
    return {
      seguidores: memberCountRes.result || 0,
      social: {
        telegram: {
          miembrosAlPublicar: memberCountRes.result || 0
        }
      }
    };
  }

  /**
   * Obtener métricas de Discord
   */
  async fetchDiscordMetrics(canal) {
    const serverId = canal.identificadores?.serverId;
    // Requiere un bot token con permisos de lectura
    const botToken = process.env.DISCORD_BOT_TOKEN; 

    if (!serverId || !botToken) return {};

    const discord = new DiscordAPI(botToken);
    // Asumimos que tenemos un método getGuildMemberCount o similar
    try {
      const guild = await discord.getGuild(serverId);
      return {
        seguidores: guild.approximate_member_count || 0,
        social: {
          discord: {
            miembrosActivos: guild.approximate_presence_count || 0
          }
        }
      };
    } catch (e) {
      return {};
    }
  }

  /**
   * Actualizar o crear registro de estadística
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
        'periodo.fin': { $lte: finDia }
      },
      {
        $set: {
          'metricas.alcance': metricasNuevas.seguidores || 0,
          'metricasSociales': metricasNuevas.social || {}
        }
      },
      { upsert: true, new: true }
    );
  }
}

module.exports = new SocialSyncService();
