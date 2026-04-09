const express = require('express');
const router = express.Router();
const crypto = require('crypto');

// ═══════════════════════════════════════════════════════════════════════════════
// WHATSAPP WEBHOOK — Verificación Meta + recepción de mensajes
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * GET /api/webhooks/whatsapp
 * Meta envía un GET para verificar el webhook al registrarlo.
 * Debe devolver hub.challenge si hub.verify_token coincide.
 */
router.get('/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  const verifyToken = process.env.WHATSAPP_VERIFY_TOKEN;

  if (mode === 'subscribe' && token === verifyToken) {
    console.log('✅ WhatsApp webhook verificado');
    return res.status(200).send(challenge);
  }

  console.warn('⚠️ WhatsApp webhook verification failed — token mismatch');
  return res.status(403).json({ error: 'Verification failed' });
});

/**
 * POST /api/webhooks/whatsapp
 * Meta envía mensajes entrantes aquí.
 * Procesamos respuestas de verificación OTP.
 */
router.post('/whatsapp', express.json(), async (req, res) => {
  // Siempre responder 200 inmediatamente — Meta reintenta si no recibe 200
  res.status(200).json({ status: 'ok' });

  try {
    // Validar firma de Meta si tenemos el secret
    const appSecret = process.env.INSTAGRAM_APP_SECRET || process.env.META_APP_SECRET;
    if (appSecret && req.headers['x-hub-signature-256']) {
      const signature = req.headers['x-hub-signature-256'];
      const rawBody = JSON.stringify(req.body);
      const expectedSig = 'sha256=' + crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex');

      if (signature !== expectedSig) {
        console.warn('⚠️ WhatsApp webhook — firma inválida, ignorando');
        return;
      }
    }

    const body = req.body;

    // Estructura de un webhook de WhatsApp Cloud API:
    // body.entry[].changes[].value.messages[]
    if (!body?.entry) return;

    for (const entry of body.entry) {
      const changes = entry.changes || [];
      for (const change of changes) {
        if (change.field !== 'messages') continue;

        const value = change.value;
        if (!value?.messages) continue;

        for (const message of value.messages) {
          await processIncomingMessage(message, value.metadata);
        }
      }
    }
  } catch (err) {
    console.error('Error procesando webhook WhatsApp:', err.message);
  }
});

/**
 * Procesa un mensaje entrante de WhatsApp.
 * Si contiene un código de 6 dígitos, intenta verificarlo como OTP.
 */
async function processIncomingMessage(message, metadata) {
  // Solo procesar mensajes de texto
  if (message.type !== 'text') return;

  const from = message.from; // número del remitente (sin +)
  const text = (message.text?.body || '').trim();
  const messageId = message.id;

  console.log(`📩 WhatsApp mensaje de ${from}: "${text.substring(0, 50)}"`);

  // Buscar si es un código OTP de verificación (6 dígitos)
  const otpMatch = text.match(/^\d{6}$/);
  if (!otpMatch) return;

  const codigo = otpMatch[0];

  try {
    const WhatsAppVerification = require('../models/WhatsAppVerification');
    const WhatsAppAPI = require('../integraciones/whatsapp');

    // Normalizar número: el webhook envía sin +, la BD guarda con +
    const phoneNormalized = '+' + from;

    const verification = await WhatsAppVerification.findPendingByPhone(phoneNormalized);
    if (!verification) {
      console.log(`⚠️ No hay verificación pendiente para ${phoneNormalized}`);
      return;
    }

    const result = verification.verificarOTP(codigo);
    verification.webhookMessageId = messageId;
    await verification.save();

    // Enviar respuesta por WhatsApp
    const waToken = process.env.WHATSAPP_TOKEN;
    const waPhoneId = process.env.WHATSAPP_PHONE_NUMBER_ID;

    if (waToken && waPhoneId) {
      const wa = new WhatsAppAPI(waToken, waPhoneId);

      if (result.success) {
        await wa.sendTextMessage(from,
          `✅ *Número verificado correctamente*\n\n` +
          `Ahora publica este mensaje en tu canal de WhatsApp:\n\n` +
          `📝 *${result.codigoCanal}*\n\n` +
          `Después vuelve a ChannelAd y pulsa "Confirmar publicación".`
        );
        console.log(`✅ OTP verificado para ${phoneNormalized}`);
      } else {
        await wa.sendTextMessage(from,
          `❌ ${result.error}\n\nRevisa el código e inténtalo de nuevo.`
        );
        console.log(`❌ OTP incorrecto para ${phoneNormalized}: ${result.error}`);
      }
    }
  } catch (err) {
    console.error('Error verificando OTP WhatsApp:', err.message);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// TELEGRAM WEBHOOK — Recepción de updates de canales
// ═══════════════════════════════════════════════════════════════════════════════

router.post('/telegram', express.json(), async (req, res) => {
  res.json({ ok: true });

  try {
    const TelegramBot = require('../integraciones/telegram');
    const parsed = TelegramBot.parseWebhookUpdate(req.body);
    if (!parsed || parsed.views === 0) return;

    const CampaignMetrics = require('../models/CampaignMetrics');
    await CampaignMetrics.findOneAndUpdate(
      {
        postId: parsed.messageId.toString(),
        plataforma: 'telegram',
        'metricsFinales.views': { $lt: parsed.views },
      },
      {
        $set: {
          'metricsFinales.views': parsed.views,
          'metricsFinales.forwards': parsed.forwards,
          ultimaSync: new Date(),
        },
      }
    );
  } catch (err) {
    console.error('Error procesando webhook Telegram:', err.message);
  }
});

module.exports = router;
