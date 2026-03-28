const TelegramAPI = require('../integraciones/telegram');
const WhatsAppAPI = require('../integraciones/whatsapp');
const DiscordAPI = require('../integraciones/discord');
const config = require('../config/config');

/**
 * Servicio para manejar la publicación automática de anuncios en diferentes plataformas
 */
class PublicationService {
  /**
   * Publicar un anuncio en la plataforma correspondiente
   * @param {Object} anuncio - Objeto del anuncio con datos poblados
   * @returns {Promise<Object>} Resultado de la publicación
   */
  async publicarAnuncio(anuncio) {
    const { canal, contenido } = anuncio;
    const plataforma = canal.plataforma.toLowerCase();
    
    console.log(`🚀 Iniciando publicación automática en ${plataforma} para el anuncio: ${anuncio.titulo}`);

    // Generar URL de tracking
    const trackingUrl = `${process.env.BACKEND_URL || 'http://localhost:5000'}/api/anuncios/t/${anuncio._id}?ref=${plataforma}`;
    
    // Clonar contenido para no modificar el original pero añadir el link de tracking
    const contenidoPublicacion = { ...contenido };
    if (trackingUrl) {
      contenidoPublicacion.texto = `${contenido.texto}\n\n👉 Más info: ${trackingUrl}`;
    }

    try {
      let resultado;

      switch (plataforma) {
        case 'telegram':
          resultado = await this.publicarEnTelegram(canal, contenidoPublicacion);
          break;
        case 'whatsapp':
          resultado = await this.publicarEnWhatsApp(canal, contenidoPublicacion);
          break;
        case 'discord':
          resultado = await this.publicarEnDiscord(canal, contenidoPublicacion);
          break;
        default:
          throw new Error(`Plataforma ${plataforma} no soportada para publicación automática`);
      }

      return {
        success: true,
        plataforma,
        resultado
      };
    } catch (error) {
      console.error(`❌ Error al publicar en ${plataforma}:`, error.message);
      return {
        success: false,
        plataforma,
        error: error.message
      };
    }
  }

  /**
   * Publicar en Telegram
   */
  async publicarEnTelegram(canal, contenido) {
    const botToken = canal.credenciales?.botToken || process.env.TELEGRAM_BOT_TOKEN;
    const chatId = canal.identificadorCanal; // ID del canal o username

    if (!botToken || !chatId) {
      throw new Error('Credenciales de Telegram incompletas');
    }

    const telegram = new TelegramAPI(botToken);
    
    // Si hay imagen, enviar foto con pie de página
    if (contenido.archivosMultimedia && contenido.archivosMultimedia.length > 0) {
      // Por simplicidad, enviamos la primera imagen
      const fotoUrl = contenido.archivosMultimedia[0].url;
      return await telegram.sendPhoto(chatId, fotoUrl, { caption: contenido.texto });
    }

    // Si no, enviar solo texto
    return await telegram.sendMessage(chatId, contenido.texto);
  }

  /**
   * Publicar en WhatsApp
   */
  async publicarEnWhatsApp(canal, contenido) {
    // Verificar si el canal tiene habilitada la publicación automática o si el modo es manual
    if (canal.configuracion?.whatsapp?.modo === 'manual' || !canal.configuracion?.publicacionAutomatica) {
      console.log('ℹ️ Publicación en WhatsApp configurada como MANUAL. Omitiendo publicación automática.');
      return { status: 'manual_pending', message: 'El usuario debe publicar manualmente' };
    }

    const accessToken = canal.credenciales?.accessToken || process.env.WHATSAPP_TOKEN;
    const phoneNumberId = canal.credenciales?.phoneNumberId || process.env.WHATSAPP_PHONE_NUMBER_ID;
    const to = canal.identificadorCanal || canal.identificadores?.phoneNumber;

    if (!accessToken || !phoneNumberId || !to) {
      throw new Error('Credenciales de WhatsApp incompletas para publicación automática. Asegúrate de proporcionar el número de teléfono.');
    }

    const whatsapp = new WhatsAppAPI(accessToken, phoneNumberId);

    // Si hay imagen
    if (contenido.archivosMultimedia && contenido.archivosMultimedia.length > 0) {
      const fotoUrl = contenido.archivosMultimedia[0].url;
      return await whatsapp.sendImageMessage(to, fotoUrl, contenido.texto);
    }

    return await whatsapp.sendTextMessage(to, contenido.texto);
  }

  /**
   * Publicar en Discord
   */
  async publicarEnDiscord(canal, contenido) {
    const webhookUrl = canal.credenciales?.webhookUrl;

    if (!webhookUrl) {
      throw new Error('URL de Webhook de Discord no proporcionada');
    }

    // Discord integration usually works via Webhooks for automated posts
    const axios = require('axios');
    const payload = {
      content: contenido.texto,
      embeds: contenido.archivosMultimedia?.map(file => ({
        image: { url: file.url }
      }))
    };

    const response = await axios.post(webhookUrl, payload);
    return response.data;
  }
}

module.exports = new PublicationService();
