/**
 * OAuth Controller — Handles Meta OAuth 2.0 flows for Facebook, Instagram, WhatsApp.
 */

const jwt = require('jsonwebtoken');
const Canal = require('../models/Canal');
const { ensureDb } = require('../lib/ensureDb');
const { encrypt } = require('../lib/encryption');
const metaOAuth = require('../services/metaOAuthService');
const linkedinOAuth = require('../services/linkedinOAuthService');
const config = require('../config/config');

const OAUTH_STATE_TTL = '5m'; // state token lives 5 minutes

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/oauth/meta/authorize
// Returns the Meta OAuth URL. Frontend redirects the user there.
// ═══════════════════════════════════════════════════════════════════════════════
const authorize = async (req, res, next) => {
  try {
    if (!config.meta.appId || !config.meta.appSecret) {
      return next(httpError(503, 'Meta OAuth no configurado. Falta META_APP_ID o META_APP_SECRET.'));
    }

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    // Sign a state token so we can verify the callback belongs to this user
    const state = jwt.sign(
      { userId, purpose: 'meta_oauth' },
      process.env.JWT_SECRET,
      { expiresIn: OAUTH_STATE_TTL }
    );

    const url = metaOAuth.getAuthorizationUrl(state);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/oauth/meta/callback
// Meta redirects here after user grants permissions.
// Exchanges code for tokens, fetches accounts, redirects to frontend.
// ═══════════════════════════════════════════════════════════════════════════════
const callback = async (req, res, next) => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    // User denied permissions
    if (oauthError) {
      const frontendUrl = config.frontend.url || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/channels/connect?error=${encodeURIComponent(error_description || oauthError)}`);
    }

    if (!code || !state) {
      return next(httpError(400, 'Faltan parámetros code o state'));
    }

    // Verify state token
    let stateData;
    try {
      stateData = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'State inválido o expirado. Intenta conectar de nuevo.'));
    }

    if (stateData.purpose !== 'meta_oauth' || !stateData.userId) {
      return next(httpError(400, 'State inválido'));
    }

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    // 1. Exchange code for short-lived token
    const shortLived = await metaOAuth.exchangeCodeForToken(code);

    // 2. Exchange for long-lived token (~60 days)
    const longLived = await metaOAuth.exchangeForLongLivedToken(shortLived.access_token);
    const userAccessToken = longLived.access_token;
    const expiresIn = longLived.expires_in || 5184000; // default 60 days

    // 3. Fetch user profile
    const profile = await metaOAuth.fetchUserProfile(userAccessToken);

    // 4. Fetch pages, Instagram accounts, WhatsApp accounts in parallel
    const [pages, waAccounts] = await Promise.all([
      metaOAuth.fetchUserPages(userAccessToken),
      metaOAuth.fetchWhatsAppBusinessAccounts(userAccessToken),
    ]);

    // 5. For each page, fetch linked Instagram business account
    const pagesWithIG = await Promise.all(
      pages.map(async (page) => {
        const ig = await metaOAuth.fetchInstagramBusinessAccount(page.id, page.access_token);
        return { ...page, instagram: ig };
      })
    );

    // 6. Store discovered accounts in a signed session token for the frontend
    const sessionData = {
      userId: stateData.userId,
      metaUserId: profile.id,
      metaUserName: profile.name,
      userAccessToken: encrypt(userAccessToken),
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      pages: pagesWithIG.map((p) => ({
        pageId: p.id,
        pageName: p.name,
        category: p.category,
        followers: p.followers_count || p.fan_count || 0,
        picture: p.picture?.data?.url || '',
        pageAccessToken: encrypt(p.access_token),
        instagram: p.instagram ? {
          id: p.instagram.id,
          username: p.instagram.username,
          name: p.instagram.name,
          followers: p.instagram.followers_count || 0,
          profilePicture: p.instagram.profile_picture_url || '',
          mediaCount: p.instagram.media_count || 0,
        } : null,
      })),
      whatsapp: waAccounts.map((wa) => ({
        phoneNumberId: wa.phoneNumberId,
        displayPhoneNumber: wa.displayPhoneNumber,
        verifiedName: wa.verifiedName,
        qualityRating: wa.qualityRating,
        wabaId: wa.wabaId,
        businessName: wa.businessName,
      })),
    };

    // Sign session for 15 minutes (user picks accounts on frontend)
    const sessionToken = jwt.sign(sessionData, process.env.JWT_SECRET, { expiresIn: '15m' });

    const frontendUrl = config.frontend.url || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/channels/connect?session=${sessionToken}`);
  } catch (error) {
    console.error('Meta OAuth callback error:', error.message);
    const frontendUrl = config.frontend.url || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/channels/connect?error=oauth_failed`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// GET /api/oauth/meta/accounts
// Decode the session token and return discovered accounts.
// ═══════════════════════════════════════════════════════════════════════════════
const listAccounts = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { session } = req.query;
    if (!session) return next(httpError(400, 'Falta parámetro session'));

    let data;
    try {
      data = jwt.verify(session, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'Sesión OAuth expirada. Conecta de nuevo.'));
    }

    if (data.userId !== userId) {
      return next(httpError(403, 'Sesión no pertenece a este usuario'));
    }

    // Return accounts without encrypted tokens (frontend doesn't need them)
    return res.json({
      success: true,
      data: {
        metaUserId: data.metaUserId,
        metaUserName: data.metaUserName,
        pages: data.pages.map((p) => ({
          pageId: p.pageId,
          pageName: p.pageName,
          category: p.category,
          followers: p.followers,
          picture: p.picture,
          instagram: p.instagram,
        })),
        whatsapp: data.whatsapp,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/oauth/meta/connect
// Create Canal records for the selected accounts.
// Body: { session: string, accounts: [{ type, pageId?, phoneNumberId? }] }
// ═══════════════════════════════════════════════════════════════════════════════
const connectAccounts = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { session, accounts } = req.body;
    if (!session || !accounts?.length) {
      return next(httpError(400, 'Faltan session o accounts'));
    }

    let sessionData;
    try {
      sessionData = jwt.verify(session, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'Sesión OAuth expirada. Conecta de nuevo.'));
    }

    if (sessionData.userId !== userId) {
      return next(httpError(403, 'Sesión no pertenece a este usuario'));
    }

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const created = [];

    for (const account of accounts) {
      const { type, pageId, phoneNumberId } = account;

      if (type === 'facebook' && pageId) {
        const page = sessionData.pages.find((p) => p.pageId === pageId);
        if (!page) continue;

        const canal = await Canal.create({
          propietario: userId,
          plataforma: 'facebook',
          identificadorCanal: page.pageId,
          nombreCanal: page.pageName,
          categoria: page.category || '',
          estado: 'activo',
          verificado: true,
          estadisticas: { seguidores: page.followers, ultimaActualizacion: new Date() },
          credenciales: {
            accessToken: page.pageAccessToken, // will be encrypted by pre-save hook
            tokenExpiresAt: null, // page tokens never expire when derived from long-lived user token
            tokenType: 'oauth_meta',
          },
          metaOAuth: {
            metaUserId: sessionData.metaUserId,
            scopes: (config.meta.scopes || '').split(','),
            oauthConnectedAt: new Date(),
          },
          foto: page.picture || '',
        });
        created.push(canal);
      }

      if (type === 'instagram' && pageId) {
        const page = sessionData.pages.find((p) => p.pageId === pageId);
        if (!page?.instagram) continue;

        const canal = await Canal.create({
          propietario: userId,
          plataforma: 'instagram',
          identificadorCanal: page.instagram.id,
          nombreCanal: page.instagram.name || page.instagram.username,
          estado: 'activo',
          verificado: true,
          estadisticas: { seguidores: page.instagram.followers, ultimaActualizacion: new Date() },
          credenciales: {
            accessToken: page.pageAccessToken, // IG uses the page token
            tokenExpiresAt: null,
            tokenType: 'oauth_meta',
          },
          metaOAuth: {
            metaUserId: sessionData.metaUserId,
            scopes: (config.meta.scopes || '').split(','),
            oauthConnectedAt: new Date(),
          },
          foto: page.instagram.profilePicture || '',
        });
        created.push(canal);
      }

      if (type === 'whatsapp' && phoneNumberId) {
        const wa = sessionData.whatsapp.find((w) => w.phoneNumberId === phoneNumberId);
        if (!wa) continue;

        const canal = await Canal.create({
          propietario: userId,
          plataforma: 'whatsapp',
          identificadorCanal: wa.phoneNumberId,
          nombreCanal: wa.verifiedName || wa.displayPhoneNumber,
          estado: 'activo',
          verificado: true,
          credenciales: {
            accessToken: sessionData.userAccessToken, // WA uses user token
            phoneNumberId: wa.phoneNumberId,
            tokenExpiresAt: sessionData.tokenExpiresAt,
            tokenType: 'oauth_meta',
          },
          identificadores: {
            phoneNumber: wa.displayPhoneNumber,
          },
          metaOAuth: {
            metaUserId: sessionData.metaUserId,
            scopes: (config.meta.scopes || '').split(','),
            oauthConnectedAt: new Date(),
          },
        });
        created.push(canal);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${created.length} canal(es) conectado(s) exitosamente`,
      data: { items: created },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/oauth/meta/disconnect/:id
// Disconnect a Meta OAuth channel (clear tokens, set inactive).
// ═══════════════════════════════════════════════════════════════════════════════
const disconnect = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    // Clear OAuth credentials
    canal.credenciales.accessToken = '';
    canal.credenciales.refreshToken = '';
    canal.credenciales.pageAccessToken = '';
    canal.credenciales.tokenExpiresAt = null;
    canal.credenciales.tokenType = 'manual';
    canal.metaOAuth = { metaUserId: '', connectedPages: [], scopes: [], oauthConnectedAt: null };
    canal.estado = 'pendiente_verificacion';
    canal.verificado = false;
    await canal.save();

    return res.json({ success: true, message: 'Canal desconectado de Meta' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// POST /api/oauth/meta/refresh/:id
// Force-refresh the token for a specific Meta OAuth channel.
// ═══════════════════════════════════════════════════════════════════════════════
const refreshToken = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    if (canal.credenciales.tokenType !== 'oauth_meta') {
      return next(httpError(400, 'Este canal no usa OAuth de Meta'));
    }

    const { decrypt } = require('../lib/encryption');
    const currentToken = decrypt(canal.credenciales.accessToken);
    if (!currentToken) return next(httpError(400, 'No hay token para refrescar'));

    const result = await metaOAuth.refreshLongLivedToken(currentToken);
    canal.credenciales.accessToken = result.access_token; // pre-save hook encrypts
    canal.credenciales.tokenExpiresAt = new Date(Date.now() + (result.expires_in || 5184000) * 1000);
    await canal.save();

    return res.json({
      success: true,
      message: 'Token renovado exitosamente',
      data: { tokenExpiresAt: canal.credenciales.tokenExpiresAt },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN OAUTH — GET /api/oauth/linkedin/authorize
// Returns the LinkedIn OAuth URL. Frontend redirects the user there.
// ═══════════════════════════════════════════════════════════════════════════════
const authorizeLinkedin = async (req, res, next) => {
  try {
    if (!config.linkedin.clientId || !config.linkedin.clientSecret) {
      return next(httpError(503, 'LinkedIn OAuth no configurado. Falta LINKEDIN_CLIENT_ID o LINKEDIN_CLIENT_SECRET.'));
    }

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const state = jwt.sign(
      { userId, purpose: 'linkedin_oauth' },
      process.env.JWT_SECRET,
      { expiresIn: OAUTH_STATE_TTL }
    );

    const url = linkedinOAuth.getAuthorizationUrl(state);
    return res.json({ success: true, data: { url } });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN OAUTH — GET /api/oauth/linkedin/callback
// LinkedIn redirects here after user grants permissions.
// ═══════════════════════════════════════════════════════════════════════════════
const callbackLinkedin = async (req, res, next) => {
  try {
    const { code, state, error: oauthError, error_description } = req.query;

    if (oauthError) {
      const frontendUrl = config.frontend.url || 'http://localhost:3000';
      return res.redirect(`${frontendUrl}/channels/connect?error=${encodeURIComponent(error_description || oauthError)}`);
    }

    if (!code || !state) {
      return next(httpError(400, 'Faltan parametros code o state'));
    }

    let stateData;
    try {
      stateData = jwt.verify(state, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'State invalido o expirado. Intenta conectar de nuevo.'));
    }

    if (stateData.purpose !== 'linkedin_oauth' || !stateData.userId) {
      return next(httpError(400, 'State invalido'));
    }

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    // 1. Exchange code for tokens
    const tokenData = await linkedinOAuth.exchangeCodeForToken(code);
    const accessToken = tokenData.access_token;
    const refreshToken = tokenData.refresh_token || '';
    const expiresIn = tokenData.expires_in || 5184000; // ~60 days default

    // 2. Fetch user profile
    const profile = await linkedinOAuth.fetchUserProfile(accessToken);

    // 3. Fetch organizations the user administers
    const organizations = await linkedinOAuth.fetchOrganizations(accessToken);

    // 4. Store discovered accounts in a signed session token
    const sessionData = {
      userId: stateData.userId,
      linkedinUserId: profile.sub,
      linkedinUserName: profile.name,
      linkedinEmail: profile.email || '',
      linkedinPicture: profile.picture || '',
      accessToken: encrypt(accessToken),
      refreshToken: refreshToken ? encrypt(refreshToken) : '',
      tokenExpiresAt: new Date(Date.now() + expiresIn * 1000).toISOString(),
      profile: {
        sub: profile.sub,
        name: profile.name,
        picture: profile.picture || '',
      },
      organizations: organizations.map((org) => ({
        orgId: org.orgId,
        name: org.name,
        vanityName: org.vanityName,
        logoUrl: org.logoUrl,
      })),
    };

    const sessionToken = jwt.sign(sessionData, process.env.JWT_SECRET, { expiresIn: '15m' });

    const frontendUrl = config.frontend.url || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/channels/connect?linkedin_session=${sessionToken}`);
  } catch (error) {
    console.error('LinkedIn OAuth callback error:', error.message);
    const frontendUrl = config.frontend.url || 'http://localhost:3000';
    return res.redirect(`${frontendUrl}/channels/connect?error=linkedin_oauth_failed`);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN — GET /api/oauth/linkedin/accounts
// Decode the session token and return discovered accounts.
// ═══════════════════════════════════════════════════════════════════════════════
const listLinkedinAccounts = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { session } = req.query;
    if (!session) return next(httpError(400, 'Falta parametro session'));

    let data;
    try {
      data = jwt.verify(session, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'Sesion OAuth expirada. Conecta de nuevo.'));
    }

    if (data.userId !== userId) {
      return next(httpError(403, 'Sesion no pertenece a este usuario'));
    }

    return res.json({
      success: true,
      data: {
        profile: data.profile,
        organizations: data.organizations,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN — POST /api/oauth/linkedin/connect
// Create Canal records for the selected LinkedIn accounts.
// Body: { session, accounts: [{ type: 'profile' | 'organization', orgId? }] }
// ═══════════════════════════════════════════════════════════════════════════════
const connectLinkedinAccounts = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { session, accounts } = req.body;
    if (!session || !accounts?.length) {
      return next(httpError(400, 'Faltan session o accounts'));
    }

    let sessionData;
    try {
      sessionData = jwt.verify(session, process.env.JWT_SECRET);
    } catch {
      return next(httpError(400, 'Sesion OAuth expirada. Conecta de nuevo.'));
    }

    if (sessionData.userId !== userId) {
      return next(httpError(403, 'Sesion no pertenece a este usuario'));
    }

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const created = [];

    for (const account of accounts) {
      const { type, orgId } = account;

      if (type === 'profile') {
        const canal = await Canal.create({
          propietario: userId,
          plataforma: 'linkedin',
          identificadorCanal: sessionData.linkedinUserId,
          nombreCanal: sessionData.linkedinUserName,
          estado: 'activo',
          verificado: true,
          credenciales: {
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            tokenExpiresAt: sessionData.tokenExpiresAt,
            tokenType: 'oauth_linkedin',
          },
          identificadores: {
            linkedinUrn: `urn:li:person:${sessionData.linkedinUserId}`,
          },
          linkedinOAuth: {
            linkedinUserId: sessionData.linkedinUserId,
            scopes: (config.linkedin.scopes || '').split(','),
            oauthConnectedAt: new Date(),
          },
          foto: sessionData.linkedinPicture || '',
        });
        created.push(canal);
      }

      if (type === 'organization' && orgId) {
        const org = sessionData.organizations.find((o) => o.orgId === orgId);
        if (!org) continue;

        const canal = await Canal.create({
          propietario: userId,
          plataforma: 'linkedin',
          identificadorCanal: `org_${orgId}`,
          nombreCanal: org.name,
          estado: 'activo',
          verificado: true,
          credenciales: {
            accessToken: sessionData.accessToken,
            refreshToken: sessionData.refreshToken,
            tokenExpiresAt: sessionData.tokenExpiresAt,
            tokenType: 'oauth_linkedin',
          },
          identificadores: {
            linkedinUrn: `urn:li:organization:${orgId}`,
          },
          linkedinOAuth: {
            linkedinUserId: sessionData.linkedinUserId,
            organizationId: orgId,
            scopes: (config.linkedin.scopes || '').split(','),
            oauthConnectedAt: new Date(),
          },
          foto: org.logoUrl || '',
        });
        created.push(canal);
      }
    }

    return res.status(201).json({
      success: true,
      message: `${created.length} canal(es) de LinkedIn conectado(s) exitosamente`,
      data: { items: created },
    });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN — POST /api/oauth/linkedin/disconnect/:id
// ═══════════════════════════════════════════════════════════════════════════════
const disconnectLinkedin = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    canal.credenciales.accessToken = '';
    canal.credenciales.refreshToken = '';
    canal.credenciales.tokenExpiresAt = null;
    canal.credenciales.tokenType = 'manual';
    canal.linkedinOAuth = { linkedinUserId: '', organizationId: '', scopes: [], oauthConnectedAt: null };
    canal.estado = 'pendiente_verificacion';
    canal.verificado = false;
    await canal.save();

    return res.json({ success: true, message: 'Canal desconectado de LinkedIn' });
  } catch (error) {
    next(error);
  }
};

// ═══════════════════════════════════════════════════════════════════════════════
// LINKEDIN — POST /api/oauth/linkedin/refresh/:id
// ═══════════════════════════════════════════════════════════════════════════════
const refreshLinkedinToken = async (req, res, next) => {
  try {
    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const canal = await Canal.findById(req.params.id);
    if (!canal) return next(httpError(404, 'Canal no encontrado'));
    if (canal.propietario?.toString() !== String(userId)) return next(httpError(403, 'No autorizado'));

    if (canal.credenciales.tokenType !== 'oauth_linkedin') {
      return next(httpError(400, 'Este canal no usa OAuth de LinkedIn'));
    }

    const { decrypt } = require('../lib/encryption');
    const currentRefreshToken = decrypt(canal.credenciales.refreshToken);
    if (!currentRefreshToken) return next(httpError(400, 'No hay refresh token para renovar'));

    const result = await linkedinOAuth.refreshAccessToken(currentRefreshToken);
    canal.credenciales.accessToken = result.access_token; // pre-save hook encrypts
    if (result.refresh_token) {
      canal.credenciales.refreshToken = result.refresh_token;
    }
    canal.credenciales.tokenExpiresAt = new Date(Date.now() + (result.expires_in || 5184000) * 1000);
    await canal.save();

    return res.json({
      success: true,
      message: 'Token de LinkedIn renovado exitosamente',
      data: { tokenExpiresAt: canal.credenciales.tokenExpiresAt },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  // Meta OAuth
  authorize,
  callback,
  listAccounts,
  connectAccounts,
  disconnect,
  refreshToken,
  // LinkedIn OAuth
  authorizeLinkedin,
  callbackLinkedin,
  listLinkedinAccounts,
  connectLinkedinAccounts,
  disconnectLinkedin,
  refreshLinkedinToken,
};
