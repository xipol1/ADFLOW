const crypto = require('crypto');
const axios = require('axios');

class WebhookService {
  /**
   * Envía un webhook a un partner
   * @param {Object} partner - Objeto del partner (debe incluir webhook_url y webhook_secret)
   * @param {String} event - Nombre del evento (ej. 'campaign.created')
   * @param {Object} payloadData - Datos del evento a enviar
   */
  async sendWebhook(partner, event, payloadData) {
    if (!partner || !partner.webhook_url) {
      return; // El partner no tiene webhooks configurados
    }

    const payload = {
      event,
      data: payloadData,
      timestamp: new Date().toISOString()
    };

    const payloadString = JSON.stringify(payload);
    
    // Preparar headers
    const headers = {
      'Content-Type': 'application/json'
    };

    // Firmar el payload si el partner tiene un secret configurado
    if (partner.webhook_secret) {
      const signature = crypto
        .createHmac('sha256', partner.webhook_secret)
        .update(payloadString)
        .digest('hex');
      
      headers['x-webhook-signature'] = signature;
    }

    try {
      // Disparar la petición (Timeout de 5s, sin retries por ahora según specs)
      await axios.post(partner.webhook_url, payloadString, {
        headers,
        timeout: 5000 
      });
      
      console.log(`[Webhook Success] Event: ${event} | Partner: ${partner.name}`);
    } catch (error) {
      // Solo logueamos el error, no crasheamos la app principal
      console.error(`[Webhook Failed] Event: ${event} | Partner: ${partner.name} | Error: ${error.message}`);
    }
  }
}

module.exports = new WebhookService();
