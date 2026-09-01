/**
 * Blocks a route until the authenticated user is in the beta programme.
 *
 * Until now `betaAccess` only existed in the frontend: ProtectedRoute kept
 * people out of /advertiser and /creator, but nothing stopped a request going
 * straight to /api/campaigns with a valid token. For a closed beta that is the
 * difference between a gate and a suggestion.
 *
 * Mounted on the routes that move money or create commitments, not on reads —
 * browsing the marketplace stays open, which is what the waiting room links to.
 *
 * Works in two positions:
 *   - At mount level in app.js, i.e. BEFORE each router's own `autenticar`.
 *     There is no req.usuario yet, so it reads the token itself.
 *   - Inside a router after `autenticar` (see routes/subscriptions.js), where
 *     it just uses req.usuario.
 *
 * When there is no usable token it defers with next() instead of answering
 * 401. The router's own `autenticar` then produces the correct 401 for its
 * protected endpoints, and any public endpoint in that router stays public —
 * this middleware must not turn a public route into an authenticated one.
 *
 * Deliberately reads the flag from the database rather than the JWT: a grant
 * must take effect on the user's next request, not after they log out and back
 * in. The token is minted at login and never carries betaAccess for that reason.
 */

const jwt = require('jsonwebtoken');
const config = require('../config/config');

// Mirrors middleware/auth.js `autenticar`, but returns null instead of
// answering, so a missing or invalid token can be deferred to the router.
function leerUsuarioDelToken(req) {
  try {
    const authHeader = req.headers?.authorization || '';
    const [type, token] = authHeader.split(' ');
    if (type !== 'Bearer' || !token || !config.jwt?.secret) return null;
    return jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ['HS256'],
    });
  } catch {
    return null;
  }
}

const requiereBeta = async (req, res, next) => {
  try {
    const usuario = req.usuario || leerUsuarioDelToken(req);

    // Sin token utilizable: que decida el `autenticar` del router.
    if (!usuario?.id) return next();

    // Admins are always in — mirrors authController.buildUserResponse and
    // ProtectedRoute, so the three places agree on who counts as beta.
    if ((usuario.rol || usuario.role) === 'admin') return next();

    const Usuario = require('../models/Usuario');
    const database = require('../config/database');
    if (!database.estaConectado()) await database.conectar();

    const user = await Usuario.findById(usuario.id).select('betaAccess rol').lean();
    // Cuenta inexistente: mismo criterio, que el router responda el 401.
    if (!user) return next();

    if (user.rol === 'admin' || user.betaAccess === true) return next();

    return res.status(403).json({
      success: false,
      code: 'BETA_REQUIRED',
      message: 'Channelad está en beta cerrada. Te avisaremos por email en cuanto tengas acceso.',
      redirectTo: '/beta',
    });
  } catch (e) {
    try {
      require('../lib/logger').error('requiereBeta', { msg: e?.message });
    } catch { /* logger unavailable */ }
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = { requiereBeta };
