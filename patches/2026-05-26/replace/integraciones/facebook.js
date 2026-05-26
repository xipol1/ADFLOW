const axios = require('axios');

const GRAPH_BASE = 'https://graph.facebook.com/v17.0';
const TIMEOUT = 10000;

class FacebookAPI {
  /**
   * Get page info (name, followers, likes, etc.)
   */
  async getPageInfo(accessToken, pageId) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const url = `${GRAPH_BASE}/${pageId}?fields=id,name,fan_count,followers_count,about,category,link,picture&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get page insights/analytics
   */
  async getPageInsights(accessToken, pageId, metrics = [], period = 'day') {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const metricStr = metrics.length > 0
      ? metrics.join(',')
      : 'page_impressions,page_engaged_users,page_fans';
    const url = `${GRAPH_BASE}/${pageId}/insights?metric=${metricStr}&period=${period}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Get recent page posts with engagement data
   */
  async getPagePosts(accessToken, pageId, limit = 25) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const url = `${GRAPH_BASE}/${pageId}/posts?fields=id,message,created_time,shares,likes.summary(true),comments.summary(true)&limit=${limit}&access_token=${accessToken}`;
    const res = await axios.get(url, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Verify that the page access token is valid
   */
  async verifyAccess(accessToken, pageId) {
    try {
      if (!accessToken || !pageId) return { valid: false, error: 'Credenciales incompletas' };
      const page = await this.getPageInfo(accessToken, pageId);
      if (page && page.id) {
        return { valid: true, page: { id: page.id, name: page.name, followers: page.followers_count } };
      }
      return { valid: false, error: 'Token inválido o sin acceso a la página' };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  /**
   * Helper: feed post puro (texto + link preview opcional).
   */
  async _postFeed(accessToken, pageId, message, link) {
    const payload = { message: String(message || ''), access_token: accessToken };
    if (link) payload.link = link;
    const res = await axios.post(`${GRAPH_BASE}/${pageId}/feed`, payload, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Helper: foto única publicada inmediatamente con caption.
   * El endpoint /photos crea automáticamente el post de feed asociado y
   * devuelve `{ id (photo id), post_id (feed post id) }`.
   */
  async _postPhoto(accessToken, pageId, photoUrl, caption) {
    const payload = {
      url: String(photoUrl),
      caption: String(caption || ''),
      access_token: accessToken,
    };
    const res = await axios.post(`${GRAPH_BASE}/${pageId}/photos`, payload, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Helper: video única con descripción.
   * Devuelve `{ id (video id) }`. Facebook procesa el vídeo en background.
   */
  async _postVideo(accessToken, pageId, videoUrl, description) {
    const payload = {
      file_url: String(videoUrl),
      description: String(description || ''),
      access_token: accessToken,
    };
    const res = await axios.post(`${GRAPH_BASE}/${pageId}/videos`, payload, { timeout: TIMEOUT });
    return res.data;
  }

  /**
   * Helper: multi-photo (álbum) post — proceso de 2 pasos.
   *
   * 1. Para cada foto, POST /{pageId}/photos con `published=false` →
   *    devuelve un photo id no asociado a ningún post todavía.
   * 2. POST /{pageId}/feed con `message` + `attached_media[]` apuntando a
   *    los photo ids del paso 1 → crea un único post con todas las fotos.
   */
  async _postMultiPhoto(accessToken, pageId, message, photoUrls) {
    const photoIds = [];
    for (const url of photoUrls) {
      try {
        const res = await axios.post(`${GRAPH_BASE}/${pageId}/photos`, {
          url: String(url),
          published: false,
          access_token: accessToken,
        }, { timeout: TIMEOUT });
        if (!res.data?.id) throw new Error(`No id returned for ${url}`);
        photoIds.push(res.data.id);
      } catch (err) {
        throw new Error(`Facebook multi-photo: fallo subiendo ${url} (${err.message}). IDs subidos: ${photoIds.join(',') || 'ninguno'}`);
      }
    }
    const feedRes = await axios.post(`${GRAPH_BASE}/${pageId}/feed`, {
      message: String(message || ''),
      attached_media: photoIds.map((id) => ({ media_fbid: id })),
      access_token: accessToken,
    }, { timeout: TIMEOUT });
    return feedRes.data;
  }

  /**
   * Publish a campaign post to the page.
   *
   * Limitaciones reales:
   *   1. Posts orgánicos no admiten inline buttons — los botones extra
   *      se anexan al body como texto auto-linkeado.
   *   2. No hay caption limit estricto (~63K chars).
   *   3. Álbumes son multi-step (subir cada foto con published=false +
   *      crear feed con attached_media).
   *   4. Videos son async — devolvemos el video id y FB publica
   *      cuando termina el transcoding.
   *
   * Signature legacy: publishPost(accessToken, pageId, message, link) sigue
   * funcionando porque `opts` tiene default `{}` y caemos en _postFeed.
   */
  async publishPost(accessToken, pageId, message, link = null, opts = {}) {
    if (!accessToken || !pageId) throw new Error('accessToken y pageId requeridos');
    const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
    const media = Array.isArray(opts.media) ? opts.media : [];

    const primaryUrl = buttons[0]?.url || link;
    const extraBtns = buttons[0] ? buttons.slice(1) : [];
    const bodyMessage = extraBtns.length > 0
      ? `${message || ''}\n\n${extraBtns.map((b) => `👉 ${b.label}: ${b.url}`).join('\n')}`
      : (message || '');

    // ── Branch 1: sin media → feed con link preview (legacy) ─────────
    if (media.length === 0) {
      return this._postFeed(accessToken, pageId, bodyMessage, primaryUrl);
    }

    // ── Branch 2: 1 imagen → /photos ─────────────────────────────────
    if (media.length === 1 && media[0].type === 'image') {
      const captionWithLink = primaryUrl
        ? `${bodyMessage}${bodyMessage ? '\n\n' : ''}${primaryUrl}`
        : bodyMessage;
      return this._postPhoto(accessToken, pageId, media[0].url, captionWithLink);
    }

    // ── Branch 3: 1 video → /videos ──────────────────────────────────
    if (media.length === 1 && media[0].type === 'video') {
      const captionWithLink = primaryUrl
        ? `${bodyMessage}${bodyMessage ? '\n\n' : ''}${primaryUrl}`
        : bodyMessage;
      return this._postVideo(accessToken, pageId, media[0].url, captionWithLink);
    }

    // ── Branch 4: 2+ imágenes → álbum ─────────────────────────────────
    const images = media.filter((m) => m.type === 'image');
    if (images.length >= 2) {
      const captionWithLink = primaryUrl
        ? `${bodyMessage}${bodyMessage ? '\n\n' : ''}${primaryUrl}`
        : bodyMessage;
      return this._postMultiPhoto(accessToken, pageId, captionWithLink, images.map((i) => i.url));
    }

    // ── Branch 5 (fallback): mezcla rara → feed con link preview ────
    return this._postFeed(accessToken, pageId, bodyMessage, primaryUrl);
  }
}

module.exports = FacebookAPI;
