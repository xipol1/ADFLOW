// ─── Post Formats · client mirror ───────────────────────────────────────────
// Mirrors lib/postFormats.js para el wizard de React. Iconos atados aquí
// para que el backend no dependa de lucide-react. Mantén los multipliers
// en sync con lib/postFormats.js — el backend valida y recomputa el
// precio final, así que un drift entre ambos se manifiesta como
// diferencia entre lo que se muestra y lo que se cobra.

import {
  Type, Image as ImageIcon, MousePointerClick, Images, Film, FileText,
  Layers, Layout, AtSign, Newspaper, Mail, Tag, Megaphone, Pin, Radio,
} from 'lucide-react'

const F = {
  telegram: [
    { id: 'text',                label: 'Texto',                desc: 'Mensaje con link clicable.',                       multiplier: 1.0, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'text_image',          label: 'Texto + imagen',       desc: 'Imagen destacada con caption.',                    multiplier: 1.2, icon: ImageIcon,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'text_image_buttons',  label: 'Imagen + botones',     desc: 'Imagen + botones inline al final.',                multiplier: 1.4, icon: MousePointerClick, fields: ['text', 'targetUrl', 'media', 'buttons'], media: { types: ['image'], max: 1 }, buttons: { max: 4 } },
    { id: 'album',               label: 'Álbum',                desc: 'Hasta 10 imágenes deslizables.',                   multiplier: 1.6, icon: Images,           fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 10, min: 2 } },
    { id: 'text_video',          label: 'Texto + video',        desc: 'Video corto con caption.',                         multiplier: 1.8, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
  ],
  whatsapp: [
    { id: 'broadcast',           label: 'Broadcast',            desc: 'Mensaje de difusión.',                              multiplier: 1.0, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen',               desc: 'Imagen + caption.',                                 multiplier: 1.2, icon: ImageIcon,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'video',               label: 'Video',                desc: 'Video corto + caption.',                            multiplier: 1.5, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'document',            label: 'Documento',            desc: 'PDF o documento adjunto.',                          multiplier: 1.3, icon: FileText,         fields: ['text', 'targetUrl', 'media'], media: { types: ['document'], max: 1 } },
    { id: 'status',              label: 'Status 24h',           desc: 'Historia visible 24h.',                             multiplier: 0.7, icon: Layers,           fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
  ],
  discord: [
    { id: 'text',                label: 'Texto',                desc: 'Mensaje plano con markdown.',                       multiplier: 1.0, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'embed',               label: 'Embed rico',           desc: 'Título, color, campos.',                            multiplier: 1.4, icon: Layout,           fields: ['text', 'targetUrl', 'embed'] },
    { id: 'embed_image',         label: 'Embed + imagen',       desc: 'Embed con imagen grande.',                          multiplier: 1.6, icon: ImageIcon,        fields: ['text', 'targetUrl', 'embed', 'media'], media: { types: ['image'], max: 1 } },
  ],
  instagram: [
    // Broadcast Channels primero — producto principal en IG.
    { id: 'broadcast',           label: 'Broadcast',            desc: 'Canal unidireccional · solo texto.',                multiplier: 1.3, icon: Radio,            fields: ['text', 'targetUrl'] },
    { id: 'broadcast_image',     label: 'Broadcast · imagen',   desc: 'Canal unidireccional + imagen.',                    multiplier: 1.5, icon: Megaphone,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'broadcast_video',     label: 'Broadcast · video',    desc: 'Canal unidireccional + video.',                     multiplier: 1.8, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'feed_image',          label: 'Feed · imagen',        desc: 'Post en el feed.',                                  multiplier: 1.2, icon: ImageIcon,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'feed_carousel',       label: 'Feed · carousel',      desc: 'Hasta 10 imágenes.',                                multiplier: 1.5, icon: Images,           fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 10, min: 2 } },
    { id: 'reel',                label: 'Reel',                 desc: 'Vertical < 60s.',                                    multiplier: 2.0, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'story',               label: 'Story 24h',            desc: 'Historia vertical.',                                 multiplier: 0.8, icon: Layers,           fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
    { id: 'mention_bio',         label: 'Mención en bio',       desc: 'Link en bio + mención.',                             multiplier: 3.0, icon: AtSign,           fields: ['text', 'targetUrl'] },
  ],
  facebook: [
    { id: 'text',                label: 'Texto',                desc: 'Status de texto.',                                  multiplier: 1.0, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen',               desc: 'Imagen con caption.',                               multiplier: 1.2, icon: ImageIcon,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'link_preview',        label: 'Link preview',         desc: 'Preview enriquecido.',                              multiplier: 1.1, icon: Tag,              fields: ['text', 'targetUrl'] },
    { id: 'video',               label: 'Video',                desc: 'Video con caption.',                                multiplier: 1.6, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
    { id: 'story',               label: 'Story 24h',            desc: 'Historia 24h.',                                     multiplier: 0.8, icon: Layers,           fields: ['text', 'targetUrl', 'media'], media: { types: ['image', 'video'], max: 1 } },
  ],
  linkedin: [
    { id: 'text',                label: 'Texto',                desc: 'Post profesional.',                                 multiplier: 1.0, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'image',               label: 'Imagen',               desc: 'Imagen + caption.',                                 multiplier: 1.2, icon: ImageIcon,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'article',             label: 'Artículo largo',       desc: 'Artículo nativo.',                                  multiplier: 2.0, icon: Newspaper,        fields: ['text', 'targetUrl', 'subject'] },
    { id: 'document_carousel',   label: 'Carousel doc',         desc: 'PDF deslizable.',                                   multiplier: 1.5, icon: FileText,         fields: ['text', 'targetUrl', 'media'], media: { types: ['document'], max: 1 } },
    { id: 'video',               label: 'Video',                desc: 'Video nativo.',                                     multiplier: 1.6, icon: Film,             fields: ['text', 'targetUrl', 'media'], media: { types: ['video'], max: 1 } },
  ],
  newsletter: [
    { id: 'dedicated',           label: 'Email dedicado',       desc: 'Envío completo para tu marca.',                     multiplier: 3.0, icon: Mail,             fields: ['text', 'targetUrl', 'subject', 'preheader', 'media'], media: { types: ['image'], max: 3 } },
    { id: 'sponsored_section',   label: 'Sección patrocinada',  desc: 'Bloque en el newsletter regular.',                  multiplier: 1.0, icon: Megaphone,        fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
    { id: 'native_mention',      label: 'Mención nativa',       desc: 'Mención en el contenido.',                          multiplier: 0.6, icon: Type,             fields: ['text', 'targetUrl'] },
    { id: 'sponsor_logo',        label: 'Logo sponsor',         desc: 'Logo + brief al pie.',                              multiplier: 0.5, icon: Tag,              fields: ['text', 'targetUrl', 'media'], media: { types: ['image'], max: 1 } },
  ],
}

const ADD_ONS = {
  telegram: [
    { id: 'pinned',           label: 'Fijar 24h',          desc: 'Pin al top del canal.',                bonus: 0.50, icon: Pin },
  ],
  discord: [
    { id: 'pinned',           label: 'Pin al canal',       desc: 'Mensaje fijado.',                       bonus: 0.30, icon: Pin },
    { id: 'mention_everyone', label: '@everyone',          desc: 'Ping a todo el server.',                bonus: 0.25, icon: AtSign },
  ],
}

export function getPlatformFormats(platform) {
  const k = String(platform || '').toLowerCase()
  return F[k] || F.telegram
}

export function getFormat(platform, id) {
  const list = getPlatformFormats(platform)
  return list.find((f) => f.id === id) || list[0]
}

export function getPlatformAddOns(platform) {
  return ADD_ONS[String(platform || '').toLowerCase()] || []
}

export function applyFormatPricing(basePrice, { platform, formatId, addOnIds = [], urgent = false } = {}) {
  const format = getFormat(platform, formatId)
  const addOns = getPlatformAddOns(platform)
  const bonus = addOnIds.reduce((acc, id) => acc + (addOns.find((x) => x.id === id)?.bonus || 0), 0)
  const urgentMul = urgent ? 1.5 : 1
  const raw = Number(basePrice || 0) * (format?.multiplier || 1) * (1 + bonus) * urgentMul
  return +raw.toFixed(2)
}

export const POST_FORMATS = F
export const POST_ADD_ONS = ADD_ONS
