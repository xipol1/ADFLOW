const Anuncio = require('../models/Anuncio');
const Canal = require('../models/Canal');
const campaignOptimizerService = require('./campaignOptimizerService');
const publicationService = require('./publicationService');
const notificationService = require('./notificationService');

/**
 * Automates the entire campaign process: optimization, creation, publication, and notification.
 * @param {string} userId - ID of the advertiser
 * @param {Object} input - { budget, category, platform, maxChannels, content, targetUrl, listId }
 * @returns {Promise<Object>} Launch results
 */
const launchAutoCampaign = async (userId, input) => {
  const { budget, category, platform, maxChannels, content, targetUrl, listId } = input;

  // 1. Call optimizer
  const optimizationResult = await campaignOptimizerService.optimizeCampaign({
    budget,
    category,
    platform,
    maxChannels,
    listId
  });

  if (!optimizationResult.allocation || optimizationResult.allocation.length === 0) {
    throw new Error('No se encontraron canales adecuados para el presupuesto y filtros proporcionados');
  }

  const campaignsCreated = [];
  let totalExpectedClicks = 0;
  let totalBudgetUsed = 0;

  // 2, 3 & 4. Create campaigns, Trigger publication, and Notify admins
  for (const allocation of optimizationResult.allocation) {
    try {
      // Step 2: Create campaign document
      const nuevoAnuncio = new Anuncio({
        titulo: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
        descripcion: content,
        anunciante: userId,
        canal: allocation.channelId,
        tipoAnuncio: 'post',
        contenido: {
          texto: content,
          enlaces: [{ url: targetUrl, tipo: 'website' }]
        },
        presupuesto: {
          monto: allocation.price,
          moneda: 'EUR',
          desglose: {
            costoBase: allocation.price,
            costoTotal: allocation.price
          }
        },
        objetivos: {
          principal: 'trafico'
        },
        estado: 'pendiente_aprobacion'
      });

      await nuevoAnuncio.save();

      // Populate canal for publication service
      const anuncioPoblado = await Anuncio.findById(nuevoAnuncio._id).populate('canal');
      const canal = anuncioPoblado.canal;

      // Disparar webhook si el anuncio está asociado a un partner
      if (anuncioPoblado.partner_id) {
        const Partner = require('../models/Partner');
        const webhookService = require('./webhookService');
        const partner = await Partner.findById(anuncioPoblado.partner_id);
        if (partner) {
          webhookService.sendWebhook(partner, 'campaign.created', {
            campaign_id: anuncioPoblado._id,
            status: anuncioPoblado.estado,
            budget: allocation.price,
            channel: {
              id: canal._id,
              name: canal.nombre,
              platform: canal.plataforma
            }
          });
        }
      }

      // Step 3: Trigger publication (if automatic is enabled for the channel)
      let publicationResult = { success: false };
      if (canal.configuracion?.publicacionAutomatica) {
        publicationResult = await publicationService.publicarAnuncio(anuncioPoblado);
        
        if (publicationResult.success) {
          anuncioPoblado.estado = 'activo';
          anuncioPoblado.publicacion = {
            fechaPublicacion: new Date(),
            idPublicacion: publicationResult.resultado?.messageId || publicationResult.resultado?.id,
            urlPublicacion: publicationResult.resultado?.link || ''
          };
          await anuncioPoblado.save();
        }
      }

      // Step 4: Notify channel admin
      await notificationService.enviarNotificacion({
        usuarioId: canal.propietario,
        tipo: 'anuncio.creado',
        titulo: '🚀 Nueva campaña automática asignada',
        mensaje: `Tu canal "${canal.nombre}" ha sido seleccionado para una campaña automática. Presupuesto: ${allocation.price}€`,
        datos: {
          anuncioId: anuncioPoblado._id,
          titulo: anuncioPoblado.titulo,
          presupuesto: allocation.price,
          publicado: publicationResult.success
        },
        canales: ['database', 'realtime', 'email']
      });

      campaignsCreated.push({
        anuncioId: anuncioPoblado._id,
        channelId: allocation.channelId,
        price: allocation.price,
        status: anuncioPoblado.estado,
        published: publicationResult.success
      });

      totalBudgetUsed += allocation.price;
      totalExpectedClicks += allocation.expectedClicks;

    } catch (error) {
      console.error(`Error launching campaign for channel ${allocation.channelId}:`, error);
    }
  }

  return {
    campaignsCreated: campaignsCreated.length,
    totalBudgetUsed: Math.round(totalBudgetUsed * 100) / 100,
    expectedClicks: Math.round(totalExpectedClicks),
    status: 'LAUNCHED',
    details: campaignsCreated
  };
};

module.exports = {
  launchAutoCampaign
};
