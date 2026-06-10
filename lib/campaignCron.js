/**
 * Campaign lifecycle automation — runs periodically to:
 * 1.  Expire campaigns past their deadline
 * 1b. Send 24h reminders to creators on stale PAID campaigns
 *
 * Settlement (PUBLISHED → COMPLETED + escrow release) NO vive aquí:
 * lo gestiona jobs/campaignSettlementJob.js (platform-verified release).
 *
 * Response deadline: 48 horas desde createdAt para que el creator
 * confirme o rechace. Mandamos un único recordatorio a las 24h (flag
 * `reminder24hSent` en el doc Campaign evita duplicados).
 */
const INTERVAL_MS = 10 * 60 * 1000; // every 10 minutes

let timer = null;

async function runCampaignAutomation() {
  try {
    const { ensureDb } = require('./ensureDb');
    const ok = await ensureDb();
    if (!ok) return;

    const Campaign = require('../models/Campaign');
    const now = new Date();

    // 1. Expire campaigns past deadline that are still PAID (not yet published)
    const expiredResult = await Campaign.updateMany(
      {
        status: 'PAID',
        deadline: { $ne: null, $lt: now }
      },
      {
        $set: { status: 'EXPIRED', expiredAt: now }
      }
    );
    if (expiredResult.modifiedCount > 0) {
      console.log(`[cron] Expired ${expiredResult.modifiedCount} campaigns past deadline`);
      // Notify and trigger refunds for expired campaigns
      try {
        const expiredCampaigns = await Campaign.find({ status: 'EXPIRED', expiredAt: now }).lean();
        const notificationService = require('../services/notificationService');
        for (const c of expiredCampaigns) {
          await notificationService.enviarNotificacion({
            usuarioId: c.advertiser,
            tipo: 'campana.expirada',
            titulo: 'Campaña expirada',
            mensaje: 'Tu campaña ha expirado porque no fue publicada antes de la fecha límite.',
            datos: { campaignId: c._id },
            canales: ['database', 'realtime', 'email'],
            prioridad: 'alta'
          }).catch(() => {});
        }
      } catch (_) { /* non-blocking */ }
    }

    // 1b. Send 24h reminders to creators on PAID campaigns that haven't
    // been responded to yet. La ventana es 24-48h desde createdAt. Si
    // ya pasaron 48h, el step 1 expiró la campaña — no la veremos aquí.
    try {
      const Canal = require('../models/Canal');
      const notificationService = require('../services/notificationService');
      const hace24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const hace48h = new Date(now.getTime() - 48 * 60 * 60 * 1000);

      const pendingForReminder = await Campaign.find({
        status: 'PAID',
        reminder24hSent: { $ne: true },
        createdAt: { $lte: hace24h, $gte: hace48h },
      }).select('_id channel createdAt price').lean();

      if (pendingForReminder.length > 0) {
        const channelIds = pendingForReminder.map((c) => c.channel);
        const canales = await Canal.find({ _id: { $in: channelIds } })
          .select('_id propietario nombreCanal')
          .lean();
        const ownerByChannel = new Map(canales.map((c) => [c._id.toString(), c]));

        let sent = 0;
        for (const c of pendingForReminder) {
          const canal = ownerByChannel.get(c.channel.toString());
          if (!canal?.propietario) continue;
          try {
            await notificationService.enviarNotificacion({
              usuarioId: canal.propietario,
              tipo: 'campana.recordatorio',
              titulo: 'Quedan menos de 24h para responder',
              mensaje: `Tienes una solicitud de campaña pendiente en ${canal.nombreCanal || 'tu canal'} por €${c.price}. Si no la respondes, expirará automáticamente.`,
              datos: { campaignId: c._id },
              canales: ['database', 'realtime', 'email'],
              prioridad: 'alta',
            }).catch(() => {});
            await Campaign.updateOne(
              { _id: c._id },
              { $set: { reminder24hSent: true } }
            );
            sent++;
          } catch (notifErr) {
            console.error(`[cron] 24h reminder error for campaign ${c._id}:`, notifErr.message);
          }
        }
        if (sent > 0) {
          console.log(`[cron] Sent ${sent} 24h reminders to creators`);
        }
      }
    } catch (reminderErr) {
      console.error('[cron] 24h campaign reminder error:', reminderErr.message);
    }

    // Settlement (auto-complete + escrow release) vive en jobs/campaignSettlementJob.js.

    // 4. Send profile-incomplete reminders to creators (24h–72h after registration)
    try {
      const Usuario = require('../models/Usuario');
      const Canal = require('../models/Canal');
      const emailService = require('../services/emailService');

      const hace24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
      const hace72h = new Date(now.getTime() - 72 * 60 * 60 * 1000);

      // Find verified creators who registered 24-72h ago and haven't been reminded yet
      const candidatos = await Usuario.find({
        emailVerificado: true,
        rol: 'creator',
        recordatorioPerfil: { $ne: true },
        createdAt: { $gte: hace72h, $lte: hace24h },
      }).lean();

      if (candidatos.length > 0) {
        const candidatoIds = candidatos.map(u => u._id);
        const canalesCompletos = await Canal.find({
          propietario: { $in: candidatoIds },
          nombreCanal: { $ne: '' },
          plataforma: { $ne: '' },
          'estadisticas.seguidores': { $gt: 0 },
          precio: { $gt: 0 },
        }).distinct('propietario');

        const completoSet = new Set(canalesCompletos.map(id => id.toString()));

        let enviados = 0;
        for (const usuario of candidatos) {
          if (completoSet.has(usuario._id.toString())) continue;
          try {
            await emailService.enviarRecordatorioPerfil(
              usuario.email,
              usuario.nombre || usuario.email.split('@')[0]
            );
            await Usuario.updateOne(
              { _id: usuario._id },
              { $set: { recordatorioPerfil: true, recordatorioPerfilAt: now } }
            );
            enviados++;
          } catch (emailErr) {
            console.error(`[cron] Profile reminder email error for ${usuario.email}:`, emailErr.message);
          }
        }
        if (enviados > 0) {
          console.log(`[cron] Sent ${enviados} profile reminder emails`);
        }
      }
    } catch (reminderErr) {
      console.error('[cron] Profile reminder job error:', reminderErr.message);
    }

    // 5. Retry failed ad deliveries
    try {
      const { retryFailedDeliveries } = require('../services/adDeliveryService');
      const retryResults = await retryFailedDeliveries();
      const retried = retryResults.filter(r => r.success).length;
      if (retryResults.length > 0) {
        console.log(`[cron] Ad delivery retry: ${retried}/${retryResults.length} succeeded`);
      }
    } catch (deliveryErr) {
      console.error('[cron] Ad delivery retry error:', deliveryErr.message);
    }

    // 6. Sync social channel metrics and pending campaign metrics
    try {
      const socialSyncService = require('../services/SocialSyncService');
      await socialSyncService.syncAllChannels();
    } catch (syncErr) {
      console.error('[cron] Social sync error:', syncErr.message);
    }

    try {
      const socialSyncService = require('../services/SocialSyncService');
      const result = await socialSyncService.syncPendingCampaigns();
      if (result.ok > 0 || result.err > 0) {
        console.log(`[cron] Campaign metrics sync: ${result.ok} ok, ${result.err} errors`);
      }
    } catch (metricsErr) {
      console.error('[cron] Campaign metrics sync error:', metricsErr.message);
    }

    // 7. Poll WhatsApp campaign metrics via admin client (VPS only)
    try {
      const whatsappAdmin = require('../services/WhatsAppAdminClient');
      if (whatsappAdmin.ready) {
        const whatsappPoller = require('../services/WhatsAppMetricsPoller');
        const waResult = await whatsappPoller.pollAllActive();
        if (waResult.ok > 0 || waResult.err > 0) {
          console.log(`[cron] WhatsApp metrics poll: ${waResult.ok} ok, ${waResult.err} errors`);
        }
      }
    } catch (waErr) {
      // Silent on Vercel (module loads but worker not running)
      if (waErr.message !== 'WhatsApp admin client not ready') {
        console.error('[cron] WhatsApp metrics poll error:', waErr.message);
      }
    }

  } catch (error) {
    console.error('[cron] Campaign automation error:', error.message);
  }
}

function startCampaignCron() {
  if (timer) return;
  // Run once after a short delay, then periodically
  setTimeout(() => runCampaignAutomation(), 5000);
  timer = setInterval(runCampaignAutomation, INTERVAL_MS);
  console.log(`[cron] Campaign automation scheduled every ${INTERVAL_MS / 60000} minutes`);
}

function stopCampaignCron() {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }
}

module.exports = { startCampaignCron, stopCampaignCron, runCampaignAutomation };
