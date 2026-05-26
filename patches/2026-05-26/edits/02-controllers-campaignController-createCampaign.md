# Edit · `controllers/campaignController.js` · `createCampaign`

## Qué hace este cambio

Extiende el endpoint POST /api/campaigns para:
1. Aceptar el payload rico (`format`, `media[]`, `buttons[]`, `embed`)
2. Sanitizar y limitar tamaños (max 10 media, max 4 buttons, etc.)
3. Validar URL destino y URLs de botones contra `lib/urlBlocklist.js`
4. Validar content/labels/embed contra `lib/contentFilter.js`
5. Aplicar el multiplier del formato al precio resuelto del canal
6. Persistir los campos nuevos en la Campaign

## Prerequisitos

- `models/Campaign.js` debe tener los campos `format`, `media[]`, `buttons[]`,
  `embed` (ver `patches/.../replace/models/Campaign.js`)
- `lib/postFormats.js`, `lib/urlBlocklist.js`, `lib/contentFilter.js`
  ya copiados a la raíz (drop-in desde `patches/.../new/`)

## Paso 1 · Imports al inicio del fichero

Localiza el bloque de `require(...)` arriba del fichero. Añade:

```js
const { checkUrl } = require('../lib/urlBlocklist');
const { checkContentPieces } = require('../lib/contentFilter');
const {
  getFormat: getPostFormat,
  applyFormatPricing,
  validateFormatPayload,
} = require('../lib/postFormats');
```

## Paso 2 · Reemplazar la función `createCampaign`

Localiza `const createCampaign = async (req, res, next) => {` y sustituye
**toda la función hasta su cierre `};`** por:

```js
const createCampaign = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const channelId = String(req.body?.channel || '').trim();
    const content = String(req.body?.content || '').trim();
    const targetUrl = String(req.body?.targetUrl || '').trim();

    if (!channelId || !content || !targetUrl) {
      return next(httpError(400, 'Datos inválidos'));
    }
    if (content.length > 5000) {
      return next(httpError(400, 'El contenido no puede superar los 5000 caracteres'));
    }
    try { new URL(targetUrl); } catch {
      return next(httpError(400, 'URL de destino inválida'));
    }

    // ── Compliance: URL blocklist + content filter ──────────────────────
    // Defensa en profundidad. NO sustituye moderación humana — sólo
    // detiene los casos obvios (gambling, adult, armas, fraude evidente,
    // hate speech).
    const urlCheck = checkUrl(targetUrl);
    if (!urlCheck.allowed) {
      const err = httpError(400, `La URL de destino no está permitida (categoría: ${urlCheck.category}).`);
      err.code = 'URL_BLOCKED';
      err.details = { category: urlCheck.category, match: urlCheck.match };
      return next(err);
    }

    // ── Payload rico ───────────────────────────────────────────────────
    const rawMedia = Array.isArray(req.body?.media) ? req.body.media : [];
    const media = rawMedia
      .filter((m) => m && m.url && m.type)
      .slice(0, 10)
      .map((m) => ({
        type: String(m.type),
        url: String(m.url).trim().slice(0, 500),
        caption: String(m.caption || '').trim().slice(0, 1000),
      }));
    const rawButtons = Array.isArray(req.body?.buttons) ? req.body.buttons : [];
    const buttons = rawButtons
      .filter((b) => b && b.label && b.url)
      .slice(0, 4)
      .map((b) => ({
        label: String(b.label).slice(0, 64).trim(),
        url: String(b.url).trim().slice(0, 500),
      }));
    const embed = req.body?.embed && typeof req.body.embed === 'object' ? {
      title: String(req.body.embed.title || '').slice(0, 256).trim(),
      description: String(req.body.embed.description || '').slice(0, 4000).trim(),
      color: String(req.body.embed.color || '').slice(0, 12),
      thumbnail: String(req.body.embed.thumbnail || '').trim().slice(0, 500),
      image: String(req.body.embed.image || '').trim().slice(0, 500),
    } : null;
    const formatId = String(req.body?.format || 'text').trim().slice(0, 50) || 'text';

    // Compliance buttons URLs
    for (const btn of buttons) {
      const btnCheck = checkUrl(btn.url);
      if (!btnCheck.allowed) {
        const err = httpError(400, `El botón "${btn.label || 'CTA'}" apunta a una URL no permitida (categoría: ${btnCheck.category}).`);
        err.code = 'BUTTON_URL_BLOCKED';
        err.details = { category: btnCheck.category, button: btn.label };
        return next(err);
      }
    }

    // Compliance contenido textual (copy + button labels + embed)
    const contentCheck = checkContentPieces([
      { label: 'content', text: content },
      ...buttons.map((b, i) => ({ label: `button[${i}].label`, text: b.label || '' })),
      { label: 'embed.title', text: embed?.title || '' },
      { label: 'embed.description', text: embed?.description || '' },
    ]);
    if (!contentCheck.allowed) {
      const err = httpError(400, `El contenido contiene términos no permitidos (categoría: ${contentCheck.category}).`);
      err.code = 'CONTENT_FLAGGED';
      err.details = { category: contentCheck.category, match: contentCheck.match, piece: contentCheck.piece };
      return next(err);
    }

    const canal = await Canal.findById(channelId).select('_id CPMDinamico precio propietario disponibilidad plataforma').lean();
    if (!canal) return next(httpError(404, 'Canal no encontrado'));

    if (canal.propietario?.toString() === String(userId)) {
      return next(httpError(400, 'No puedes crear una campaña en tu propio canal'));
    }

    // Validar el payload rico contra el catálogo del formato
    const formatCheck = validateFormatPayload({
      platform: canal.plataforma,
      formatId,
      content,
      media,
      buttons,
      embed,
    });
    if (!formatCheck.ok) {
      const err = httpError(400, formatCheck.message);
      err.code = 'FORMAT_INVALID';
      return next(err);
    }
    const formatDef = getPostFormat(canal.plataforma, formatId);

    // Server-side base price: resuelve del calendar dinámico o el CPM base
    const publishDateStr = (req.body?.publishDate || req.body?.deadline || '').trim();
    let basePrice = canal.CPMDinamico || canal.precio || 0;
    if (publishDateStr) {
      const pubDate = new Date(publishDateStr + 'T12:00:00');
      if (!isNaN(pubDate.getTime())) {
        const dow = pubDate.getDay();
        const dispo = canal.disponibilidad || {};
        const dayPricing = (dispo.preciosPorDia || []).find(p => p.day === dow);
        if (dayPricing && dayPricing.enabled && dayPricing.price > 0) {
          basePrice = dayPricing.price;
        }
      }
    }
    if (!Number.isFinite(basePrice) || basePrice < 1) {
      return next(httpError(400, 'Este canal no tiene un precio configurado. Contacta al creador.'));
    }

    // Aplicar el multiplier del formato (×1.6 album, ×3.0 broadcast IG, etc.)
    const price = applyFormatPricing(basePrice, {
      platform: canal.plataforma,
      formatId,
      urgent: Boolean(req.body?.urgent),
    });

    const deadline = publishDateStr ? new Date(publishDateStr + 'T12:00:00') : (req.body?.deadline ? new Date(req.body.deadline) : null);
    const trackingLinkFormat = ['short', 'domain', 'custom'].includes(req.body?.trackingLinkFormat) ? req.body.trackingLinkFormat : 'domain';
    const trackingLinkSlug = (req.body?.trackingLinkSlug || '').trim().toLowerCase().replace(/[^a-z0-9-]/g, '-').slice(0, 40);

    const campaign = await Campaign.create({
      advertiser: userId,
      channel: canal._id,
      content,
      targetUrl,
      format: formatId,
      media,
      buttons,
      embed,
      price,
      deadline,
      trackingLinkFormat,
      trackingLinkSlug,
      status: 'DRAFT',
      createdAt: new Date()
    });

    await Transaccion.create({
      campaign: campaign._id,
      advertiser: userId,
      amount: price,
      tipo: 'pago',
      status: 'pending'
    });

    // Notify channel owner about new campaign request
    const channelDoc = await Canal.findById(canal._id).select('propietario').lean();
    if (channelDoc?.propietario) {
      notifySafe({
        usuarioId: channelDoc.propietario,
        tipo: 'campana.nueva',
        titulo: 'Nueva solicitud de campaña',
        mensaje: `Un anunciante quiere publicar en tu canal por €${price}`,
        datos: { campaignId: campaign._id },
        canales: ['database', 'realtime', 'email'],
        prioridad: 'normal'
      });
    }

    return res.status(201).json({ success: true, data: campaign });
  } catch (error) {
    next(error);
  }
};
```

## Verificación post-aplicación

```bash
# Reemplaza con un userId/channelId reales en tu DB y un token de auth válido
curl -X POST http://localhost:5000/api/campaigns \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "channel": "...",
    "content": "Test rich payload",
    "targetUrl": "https://channelad.io/test",
    "format": "text_image",
    "media": [{ "type": "image", "url": "https://r2.channelad.io/test.jpg" }],
    "buttons": [{ "label": "Probar", "url": "https://channelad.io/probar" }]
  }'
```

Casos de error esperados:
- `{ targetUrl: 'https://bet365.com' }` → 400 `code: URL_BLOCKED`
- `{ content: 'Apuesta en el casino' }` → 400 `code: CONTENT_FLAGGED`
- `{ format: 'album', media: [] }` → 400 `code: FORMAT_INVALID`
