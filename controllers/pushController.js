// NOTE: Requires `web-push` package — install with: npm install web-push
const webpush = require('web-push');
const Usuario = require('../models/Usuario');

// Configure web-push with VAPID keys from environment variables
const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_EMAIL = process.env.VAPID_EMAIL || 'mailto:admin@channelad.io';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_EMAIL, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

/**
 * POST /api/notifications/push-subscribe
 * Save a push subscription to the authenticated user's document.
 */
const subscribePush = async (req, res) => {
  try {
    const { subscription } = req.body;
    if (!subscription || !subscription.endpoint || !subscription.keys) {
      return res.status(400).json({ error: 'Suscripción push inválida' });
    }

    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    // Avoid duplicate subscriptions (same endpoint)
    const existing = (usuario.pushSubscriptions || []).find(
      s => s.endpoint === subscription.endpoint
    );
    if (!existing) {
      usuario.pushSubscriptions = usuario.pushSubscriptions || [];
      usuario.pushSubscriptions.push({
        endpoint: subscription.endpoint,
        keys: {
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
        },
      });
      await usuario.save();
    }

    return res.json({ ok: true, message: 'Suscripción push guardada' });
  } catch (error) {
    console.error('Error en subscribePush:', error);
    return res.status(500).json({ error: 'Error al guardar suscripción push' });
  }
};

/**
 * POST /api/notifications/push-unsubscribe
 * Remove all push subscriptions for the authenticated user.
 */
const unsubscribePush = async (req, res) => {
  try {
    const usuario = await Usuario.findById(req.usuario.id);
    if (!usuario) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    usuario.pushSubscriptions = [];
    await usuario.save();

    return res.json({ ok: true, message: 'Suscripciones push eliminadas' });
  } catch (error) {
    console.error('Error en unsubscribePush:', error);
    return res.status(500).json({ error: 'Error al eliminar suscripciones push' });
  }
};

/**
 * Internal utility — send a push notification to a specific user.
 * @param {string} userId - The user's MongoDB _id
 * @param {object} payload - { title, body, url, tag, actions }
 * @returns {object} result summary
 */
const sendPushToUser = async (userId, payload) => {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return { success: false, reason: 'VAPID keys not configured' };
  }

  const usuario = await Usuario.findById(userId);
  if (!usuario || !usuario.pushSubscriptions || usuario.pushSubscriptions.length === 0) {
    return { success: false, reason: 'No push subscriptions found' };
  }

  const results = [];
  const staleIndexes = [];

  for (let i = 0; i < usuario.pushSubscriptions.length; i++) {
    const sub = usuario.pushSubscriptions[i];
    const pushSubscription = {
      endpoint: sub.endpoint,
      keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    };

    try {
      await webpush.sendNotification(pushSubscription, JSON.stringify(payload));
      results.push({ endpoint: sub.endpoint, success: true });
    } catch (err) {
      // 410 Gone or 404 means the subscription is no longer valid
      if (err.statusCode === 410 || err.statusCode === 404) {
        staleIndexes.push(i);
      }
      results.push({ endpoint: sub.endpoint, success: false, error: 'delivery_failed' });
    }
  }

  // Clean up stale subscriptions
  if (staleIndexes.length > 0) {
    usuario.pushSubscriptions = usuario.pushSubscriptions.filter(
      (_, idx) => !staleIndexes.includes(idx)
    );
    await usuario.save();
  }

  return {
    success: results.some(r => r.success),
    sent: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    cleaned: staleIndexes.length,
  };
};

module.exports = {
  subscribePush,
  unsubscribePush,
  sendPushToUser,
};
