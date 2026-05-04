const mongoose = require('mongoose');

/**
 * ChannelSwap — intercambio de menciones entre dos canales (sin dinero).
 *
 * Flujo: requester propone → recipient acepta/rechaza → ambos publican en
 * fechas acordadas → tracking links miden conversión → reseñas mutuas.
 *
 * El campo `status` avanza:
 *   propuesto → aceptado → publicado_a → publicado_ambos → completado
 *                       ↘ rechazado
 *                       ↘ expirado (sin acción tras 7 días)
 *                       ↘ cancelado (cualquier parte antes de publicar)
 */
const ChannelSwapSchema = new mongoose.Schema(
  {
    // ── Partes implicadas ──
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true, index: true },
    requesterChannel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },
    recipientChannel: { type: mongoose.Schema.Types.ObjectId, ref: 'Canal', required: true, index: true },

    // ── Estado ──
    status: {
      type: String,
      enum: [
        'propuesto',         // requester ha enviado, esperando recipient
        'aceptado',          // recipient aceptó, esperando publicación
        'publicado_a',       // requester ya publicó, recipient pendiente
        'publicado_b',       // recipient ya publicó, requester pendiente
        'publicado_ambos',   // ambos publicaron, esperando ventana de tracking
        'completado',        // ventana cerrada, métricas finales calculadas
        'rechazado',         // recipient rechazó
        'expirado',          // sin respuesta en 7 días
        'cancelado',         // alguien lo canceló antes de publicar
      ],
      default: 'propuesto',
      index: true,
    },

    // ── Términos propuestos ──
    propuesta: {
      mensaje: { type: String, default: '', trim: true, maxlength: 1000 },
      fechaPublicacion: { type: Date, default: null }, // fecha sugerida para ambas publicaciones
      formato: { type: String, enum: ['post_simple', 'post_anclado', 'historia', 'mencion_inline'], default: 'post_simple' },
      duracionHoras: { type: Number, default: 24, min: 1, max: 168 }, // cuánto tiempo dejar el post visible
    },

    // ── Contenido propuesto/publicado por cada parte ──
    contenidoRequester: {
      texto: { type: String, default: '', maxlength: 4000 },
      mediaUrl: { type: String, default: '' },
      trackingUrl: { type: String, default: '' }, // generado por backend al aceptar
      publicadoEn: { type: Date, default: null },
      messageId: { type: String, default: '' },   // id del mensaje publicado en la plataforma
      verificado: { type: Boolean, default: false },
    },
    contenidoRecipient: {
      texto: { type: String, default: '', maxlength: 4000 },
      mediaUrl: { type: String, default: '' },
      trackingUrl: { type: String, default: '' },
      publicadoEn: { type: Date, default: null },
      messageId: { type: String, default: '' },
      verificado: { type: Boolean, default: false },
    },

    // ── Resultados (rellenados al cerrar) ──
    resultados: {
      clicksRequester: { type: Number, default: 0 },     // clicks en el link del requester
      clicksRecipient: { type: Number, default: 0 },
      seguidoresGanadosRequester: { type: Number, default: 0 },
      seguidoresGanadosRecipient: { type: Number, default: 0 },
      cerradoEn: { type: Date, default: null },
    },

    // ── Reseñas mutuas (post-completado) ──
    ratingDeRequester: { type: Number, min: 1, max: 5, default: null }, // requester valora a recipient
    ratingDeRecipient: { type: Number, min: 1, max: 5, default: null },
    comentarioDeRequester: { type: String, default: '', maxlength: 500 },
    comentarioDeRecipient: { type: String, default: '', maxlength: 500 },

    // ── Anti-fraude / auditoría ──
    motivoRechazo: { type: String, default: '', maxlength: 500 },
    motivoCancelacion: { type: String, default: '', maxlength: 500 },
    expiraEn: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), index: true },
  },
  { timestamps: true }
);

// No permitir dos swaps activos entre el mismo par de canales (en la misma
// dirección). El índice excluye `status` de la clave a propósito: la versión
// anterior incluía `status` y por tanto sólo prevenía duplicados del MISMO
// estado, dejando coexistir un `propuesto` y un `aceptado` para el mismo par
// — exactamente lo que queríamos prohibir. La validación a nivel aplicación
// en swapsController.createSwap también verifica esto, pero el índice es la
// red de seguridad ante carreras concurrentes.
ChannelSwapSchema.index(
  { requesterChannel: 1, recipientChannel: 1 },
  {
    unique: true,
    partialFilterExpression: {
      status: { $in: ['propuesto', 'aceptado', 'publicado_a', 'publicado_b', 'publicado_ambos'] },
    },
  }
);

// Lookup rápido del feed de cada usuario
ChannelSwapSchema.index({ recipient: 1, status: 1, createdAt: -1 });
ChannelSwapSchema.index({ requester: 1, status: 1, createdAt: -1 });

module.exports = mongoose.models.ChannelSwap || mongoose.model('ChannelSwap', ChannelSwapSchema);
