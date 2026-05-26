/**
 * Post Formats — canonical catalog of publication formats per platform.
 *
 * Each platform exposes a set of formats with a price multiplier over the
 * channel's base price and a list of editor fields. The frontend mirrors
 * this catalog in client/src/config/postFormats.js (kept in sync manually
 * because client and server use different module systems).
 *
 * Pricing rule:
 *   finalPrice = channelBasePrice
 *              × format.multiplier
 *              × (addOns selected → sum(addOn.bonus))
 *              × (urgent? × 1.5 : 1)
 *
 * Field IDs the editor knows how to render:
 *   - `text`     (always present; the post copy)
 *   - `targetUrl`(always present; the destination link)
 *   - `media`    (single or multiple images/videos)
 *   - `buttons`  (inline CTA buttons, Telegram-only)
 *   - `embed`    (Discord rich embed: title/desc/color/thumbnail/image)
 *   - `subject`  (newsletter dedicated send)
 *   - `preheader`(newsletter dedicated send)
 */

const FORMATS = {
  telegram: [
    { id: 'text',                label: 'Texto',                desc: 'Mensaje de texto con link.',                     multiplier: 1.0, fields: ['text', 'targetUrl'] },
    { id: 'text_image',          label: 'Texto + imagen',       desc: 'Imagen destacada con caption.',                  multiplier: 1.2, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'text_image_buttons',  label: 'Imagen + botones CTA', desc: 'Imagen con botones inline al final.',            multiplier: 1.4, fields: ['text', 'targetUrl', 'media', 'buttons'], media: { types: ['image'], max: 1 }, buttons: { max: 4 } },
    { id: 'album',               label: 'Álbum (carousel)',     desc: 'Hasta 10 imágenes en un álbum.',                 multiplier: 1.6, fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 10, min: 2 } },
    { id: 'text_video',          label: 'Texto + video',        desc: 'Video corto con caption.',                       multiplier: 1.8, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
  ],
  whatsapp: [
    { id: 'broadcast',           label: 'Broadcast texto',      desc: 'Mensaje de difusión.',                            multiplier: 1.0, fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen + caption',     desc: 'Imagen con texto descriptivo.',                   multiplier: 1.2, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'video',               label: 'Video',                desc: 'Video corto + caption.',                          multiplier: 1.5, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'document',            label: 'Documento + caption',  desc: 'PDF o documento adjunto.',                        multiplier: 1.3, fields: ['text', 'targetUrl', 'media'], media: { types: ['document'], max: 1 } },
    { id: 'status',              label: 'Status 24h',           desc: 'Historia visible 24h.',                           multiplier: 0.7, fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
  ],
  discord: [
    { id: 'text',                label: 'Texto',                desc: 'Mensaje plano con markdown.',                     multiplier: 1.0, fields: ['text', 'targetUrl'] },
    { id: 'embed',               label: 'Embed rico',           desc: 'Título, descripción, color, campos.',             multiplier: 1.4, fields: ['text', 'targetUrl', 'embed'] },
    { id: 'embed_image',         label: 'Embed + imagen',       desc: 'Embed rico con imagen grande.',                   multiplier: 1.6, fields: ['text', 'targetUrl', 'embed', 'media'], media: { types: ['image'], max: 1 } },
  ],
  instagram: [
    // Broadcast Channels primero — producto principal de Channelad en IG.
    // Canal unidireccional 1-a-muchos (Meta launch 2023). Audiencia opt-in
    // mejora CTR sobre el feed clásico.
    { id: 'broadcast',           label: 'Broadcast',            desc: 'Mensaje al canal unidireccional.',                 multiplier: 1.3, fields: ['text', 'targetUrl'] },
    { id: 'broadcast_image',     label: 'Broadcast · imagen',   desc: 'Mensaje con imagen al canal.',                     multiplier: 1.5, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'broadcast_video',     label: 'Broadcast · video',    desc: 'Mensaje con video al canal.',                      multiplier: 1.8, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'feed_image',          label: 'Feed · imagen',        desc: 'Post de imagen en el feed.',                      multiplier: 1.2, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'feed_carousel',       label: 'Feed · carousel',      desc: 'Hasta 10 imágenes deslizables.',                  multiplier: 1.5, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 10, min: 2 } },
    { id: 'reel',                label: 'Reel',                 desc: 'Video vertical < 60s.',                            multiplier: 2.0, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'story',               label: 'Story 24h',            desc: 'Historia vertical 24h.',                           multiplier: 0.8, fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
    { id: 'mention_bio',         label: 'Mención en bio',       desc: 'Link en bio + mención dedicada.',                  multiplier: 3.0, fields: ['text', 'targetUrl'] },
  ],
  facebook: [
    { id: 'text',                label: 'Texto',                desc: 'Status de texto.',                                multiplier: 1.0, fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen + texto',       desc: 'Imagen con caption.',                              multiplier: 1.2, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'link_preview',        label: 'Link con preview',     desc: 'Preview enriquecido del link.',                    multiplier: 1.1, fields: ['text', 'targetUrl'] },
    { id: 'video',               label: 'Video',                desc: 'Video con caption.',                               multiplier: 1.6, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'story',               label: 'Story 24h',            desc: 'Historia 24h.',                                    multiplier: 0.8, fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
  ],
  linkedin: [
    { id: 'text',                label: 'Texto',                desc: 'Post de texto profesional.',                       multiplier: 1.0, fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen + texto',       desc: 'Imagen con caption.',                              multiplier: 1.2, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'article',             label: 'Artículo largo',       desc: 'Artículo nativo en LinkedIn.',                     multiplier: 2.0, fields: ['text', 'targetUrl', 'subject'] },
    { id: 'document_carousel',   label: 'Carousel documento',   desc: 'PDF deslizable.',                                  multiplier: 1.5, fields: ['text', 'targetUrl', 'media'], media: { types: ['document'], max: 1 } },
    { id: 'video',               label: 'Video',                desc: 'Video nativo.',                                    multiplier: 1.6, fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
  ],
  newsletter: [
    { id: 'dedicated',           label: 'Email dedicado',       desc: 'Envío completo para tu marca.',                    multiplier: 3.0, fields: ['text', 'targetUrl', 'subject', 'preheader', 'media'], media: { types: ['image'], max: 3 } },
    { id: 'sponsored_section',   label: 'Sección patrocinada',  desc: 'Bloque dentro del newsletter regular.',            multiplier: 1.0, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'native_mention',      label: 'Mención nativa',       desc: 'Mención de texto dentro del contenido.',           multiplier: 0.6, fields: ['text', 'targetUrl'] },
    { id: 'sponsor_logo',        label: 'Logo de sponsor',      desc: 'Logo + brief corto al pie del email.',             multiplier: 0.5, fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
  ],
}

const ADD_ONS = {
  telegram: [
    { id: 'pinned',          label: 'Fijar al inicio',    desc: 'Pin al top del canal 24h.',                bonus: 0.50 },
  ],
  discord: [
    { id: 'pinned',          label: 'Pin al canal',       desc: 'Mensaje fijado en el canal.',              bonus: 0.30 },
    { id: 'mention_everyone',label: 'Mencionar a todos',  desc: 'Ping @everyone o @here al publicar.',      bonus: 0.25 },
  ],
}

function getPlatformFormats(platform) {
  const key = String(platform || '').toLowerCase()
  return FORMATS[key] || FORMATS.telegram
}

function getFormat(platform, formatId) {
  const list = getPlatformFormats(platform)
  return list.find((f) => f.id === formatId) || list[0]
}

function getPlatformAddOns(platform) {
  return ADD_ONS[String(platform || '').toLowerCase()] || []
}

function applyFormatPricing(basePrice, { platform, formatId, addOnIds = [], urgent = false } = {}) {
  const format = getFormat(platform, formatId)
  const addOns = getPlatformAddOns(platform)
  const bonus = addOnIds.reduce((acc, id) => {
    const a = addOns.find((x) => x.id === id)
    return acc + (a?.bonus || 0)
  }, 0)
  const urgentMul = urgent ? 1.5 : 1
  const raw = Number(basePrice || 0) * (format?.multiplier || 1) * (1 + bonus) * urgentMul
  return +raw.toFixed(2)
}

function validateFormatPayload({ platform, formatId, content, media = [], buttons = [], embed = null }) {
  const format = getFormat(platform, formatId)
  if (!format) return { ok: false, message: 'Formato no soportado para esta plataforma.' }

  if (!content || !String(content).trim()) {
    return { ok: false, message: 'El texto del anuncio es obligatorio.' }
  }
  if (String(content).length > 5000) {
    return { ok: false, message: 'El texto no puede superar los 5000 caracteres.' }
  }

  if (format.fields.includes('media')) {
    const cfg = format.media || {}
    if ((cfg.min || 0) > media.length) {
      return { ok: false, message: `Este formato requiere al menos ${cfg.min} archivos.` }
    }
    if ((cfg.max || Infinity) < media.length) {
      return { ok: false, message: `Máximo ${cfg.max} archivos para este formato.` }
    }
    for (const m of media) {
      if (cfg.types && !cfg.types.includes(m.type)) {
        return { ok: false, message: `Tipo de media no admitido: ${m.type}. Permitidos: ${cfg.types.join(', ')}.` }
      }
    }
  } else if (media.length > 0) {
    return { ok: false, message: 'Este formato no admite archivos adjuntos.' }
  }

  if (format.fields.includes('buttons')) {
    const cfg = format.buttons || {}
    if ((cfg.max || Infinity) < buttons.length) {
      return { ok: false, message: `Máximo ${cfg.max} botones para este formato.` }
    }
    for (const b of buttons) {
      if (!b?.label || !b?.url) return { ok: false, message: 'Cada botón requiere etiqueta y URL.' }
    }
  } else if (buttons.length > 0) {
    return { ok: false, message: 'Este formato no admite botones inline.' }
  }

  if (!format.fields.includes('embed') && embed) {
    return { ok: false, message: 'Este formato no admite embed.' }
  }

  return { ok: true }
}

module.exports = {
  FORMATS,
  ADD_ONS,
  getPlatformFormats,
  getFormat,
  getPlatformAddOns,
  applyFormatPricing,
  validateFormatPayload,
}
