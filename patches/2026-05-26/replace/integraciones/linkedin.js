const axios = require('axios');

const API_BASE = 'https://api.linkedin.com';
const TIMEOUT = 10000;
const UPLOAD_TIMEOUT = 60000; // uploads de vídeo pueden tardar más

// Recipes para registerUpload — cada tipo de media exige uno distinto.
const RECIPES = {
  image: 'urn:li:digitalmediaRecipe:feedshare-image',
  video: 'urn:li:digitalmediaRecipe:feedshare-video',
  document: 'urn:li:digitalmediaRecipe:feedshare-document',
};

const MEDIA_CATEGORY = {
  image: 'IMAGE',
  video: 'VIDEO',
  document: 'DOCUMENT',
};

class LinkedInAPI {
  constructor(accessToken) {
    this.accessToken = String(accessToken || '').trim();
  }

  get headers() {
    if (!this.accessToken) throw new Error('LinkedIn access token no configurado');
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'X-Restli-Protocol-Version': '2.0.0',
      'Content-Type': 'application/json',
    };
  }

  /**
   * Fetch user profile via OpenID Connect userinfo endpoint.
   * Requires 'openid' and 'profile' scopes.
   */
  async getProfile() {
    const res = await axios.get(`${API_BASE}/v2/userinfo`, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    return res.data;
  }

  async verifyAccess() {
    try {
      const profile = await this.getProfile();
      if (!profile || !profile.sub) {
        return { valid: false, error: 'No se pudo verificar el acceso a LinkedIn' };
      }
      return { valid: true, profile };
    } catch (err) {
      return { valid: false, error: err.message };
    }
  }

  async getOrganization(orgId) {
    const res = await axios.get(`${API_BASE}/v2/organizations/${orgId}`, {
      headers: this.headers,
      params: { projection: '(id,localizedName,vanityName,logoV2)' },
      timeout: TIMEOUT,
    });
    return res.data;
  }

  async getOrganizationFollowers(orgId) {
    try {
      const res = await axios.get(
        `${API_BASE}/v2/organizationalEntityFollowerStatistics`,
        {
          headers: this.headers,
          params: { q: 'organizationalEntity', organizationalEntity: `urn:li:organization:${orgId}` },
          timeout: TIMEOUT,
        }
      );
      const stats = res.data?.elements?.[0];
      return stats?.followerCounts?.organicFollowerCount || 0;
    } catch {
      return 0;
    }
  }

  /**
   * Publish a post on LinkedIn (personal or organization).
   * Legacy signature — sigue funcionando para callers antiguos.
   */
  async publishPost(authorUrn, text, targetUrl) {
    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: {
        'com.linkedin.ugc.ShareContent': {
          shareCommentary: { text },
          shareMediaCategory: targetUrl ? 'ARTICLE' : 'NONE',
          ...(targetUrl ? {
            media: [{
              status: 'READY',
              originalUrl: targetUrl,
            }],
          } : {}),
        },
      },
      visibility: {
        'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC',
      },
    };

    const res = await axios.post(`${API_BASE}/v2/ugcPosts`, body, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    return res.data;
  }

  /**
   * Helper: descarga un archivo (típicamente de R2) y devuelve un Buffer.
   * LinkedIn no acepta URLs públicas — exige upload binario al endpoint
   * devuelto por registerUpload.
   */
  async _fetchMediaBuffer(url) {
    const res = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: UPLOAD_TIMEOUT,
    });
    return {
      buffer: Buffer.from(res.data),
      mime: res.headers['content-type'] || 'application/octet-stream',
    };
  }

  /**
   * Helper: paso 1 del upload — registra la intención de subir y obtiene
   * la `uploadUrl` única + el `asset URN` para luego adjuntar al post.
   */
  async _registerUpload(authorUrn, type) {
    const recipe = RECIPES[type];
    if (!recipe) throw new Error(`LinkedIn: tipo de media no soportado: ${type}`);
    const body = {
      registerUploadRequest: {
        recipes: [recipe],
        owner: authorUrn,
        serviceRelationships: [{
          relationshipType: 'OWNER',
          identifier: 'urn:li:userGeneratedContent',
        }],
      },
    };
    const res = await axios.post(`${API_BASE}/v2/assets?action=registerUpload`, body, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    const value = res.data?.value;
    const uploadUrl = value?.uploadMechanism?.['com.linkedin.digitalmediaUploading.MediaUploadHttpRequest']?.uploadUrl;
    const asset = value?.asset;
    if (!uploadUrl || !asset) {
      throw new Error('LinkedIn: registerUpload no devolvió uploadUrl/asset');
    }
    return { uploadUrl, asset };
  }

  /**
   * Helper: paso 2 — PUT binario a la uploadUrl. Un 201 vacío significa
   * éxito. Headers críticos: token y Content-Type real.
   */
  async _uploadBinary(uploadUrl, buffer, mime) {
    await axios.put(uploadUrl, buffer, {
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': mime || 'application/octet-stream',
      },
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      timeout: UPLOAD_TIMEOUT,
    });
  }

  /**
   * Pipeline completo de upload — fetch + register + PUT.
   * Devuelve el `asset URN` que el siguiente paso usa.
   */
  async _uploadMedia(authorUrn, mediaItem) {
    const { buffer, mime } = await this._fetchMediaBuffer(mediaItem.url);
    const { uploadUrl, asset } = await this._registerUpload(authorUrn, mediaItem.type);
    await this._uploadBinary(uploadUrl, buffer, mime);
    return asset;
  }

  /**
   * Helper: crear el UGC post final con los asset URNs ya subidos.
   */
  async _createUgcPost(authorUrn, text, mediaCategory, mediaUrns = [], legacyLink = null) {
    const shareContent = {
      shareCommentary: { text },
      shareMediaCategory: 'NONE',
    };
    if (mediaUrns.length > 0) {
      shareContent.shareMediaCategory = mediaCategory;
      shareContent.media = mediaUrns.map((urn) => ({
        status: 'READY',
        media: urn,
        title: { text: '' },
      }));
    } else if (legacyLink) {
      shareContent.shareMediaCategory = 'ARTICLE';
      shareContent.media = [{ status: 'READY', originalUrl: legacyLink }];
    }
    const body = {
      author: authorUrn,
      lifecycleState: 'PUBLISHED',
      specificContent: { 'com.linkedin.ugc.ShareContent': shareContent },
      visibility: { 'com.linkedin.ugc.MemberNetworkVisibility': 'PUBLIC' },
    };
    const res = await axios.post(`${API_BASE}/v2/ugcPosts`, body, {
      headers: this.headers,
      timeout: TIMEOUT,
    });
    return res.data;
  }

  /**
   * Publish a campaign post on LinkedIn.
   *
   * Acepta el payload rico (media[], buttons[], format). Limitaciones:
   *   1. UGC posts orgánicos no admiten inline buttons — los anexamos al
   *      body como texto. LinkedIn auto-linkea las URLs.
   *   2. `shareMediaCategory` debe ser uniforme — no se mezclan IMAGE+VIDEO.
   *   3. Upload binario obligatorio (3N+1 calls para N media).
   *   4. Sin caption length cap real (3000 chars en commentary).
   */
  async publishAd(authorUrn, content, targetUrl, opts = {}) {
    if (!authorUrn) throw new Error('LinkedIn: authorUrn requerido');
    const buttons = Array.isArray(opts.buttons) ? opts.buttons : [];
    const media = Array.isArray(opts.media) ? opts.media : [];

    const primaryUrl = buttons[0]?.url || targetUrl;
    const extraBtns = buttons[0] ? buttons.slice(1) : [];
    const baseText = String(content || '').trim();
    const buttonsTail = extraBtns.length > 0
      ? '\n\n' + extraBtns.map((b) => `👉 ${b.label}: ${b.url}`).join('\n')
      : '';
    const text = (baseText + buttonsTail).slice(0, 3000);

    // ── Branch 1: sin media → legacy article link preview ────────────
    if (media.length === 0) {
      return this._createUgcPost(authorUrn, text, 'NONE', [], primaryUrl);
    }

    // ── Branch 2: con media → register + upload + post ──────────────
    const firstType = media[0].type;
    const sameTypeMedia = media.filter((m) => m.type === firstType);

    // Imagen acepta múltiples (carousel auto). Video/documento solo 1.
    const limit = firstType === 'image' ? 9 : 1;
    const toUpload = sameTypeMedia.slice(0, limit);

    // Subimos en serie para que un fallo cancele los siguientes.
    const urns = [];
    for (const m of toUpload) {
      const urn = await this._uploadMedia(authorUrn, m);
      urns.push(urn);
    }

    // Anexamos el primaryUrl como CTA en el body (LinkedIn no tiene
    // botón nativo en UGC posts con media).
    const finalText = primaryUrl && !text.includes(primaryUrl)
      ? `${text}${text ? '\n\n' : ''}${primaryUrl}`
      : text;

    return this._createUgcPost(authorUrn, finalText, MEDIA_CATEGORY[firstType], urns, null);
  }
}

module.exports = LinkedInAPI;
