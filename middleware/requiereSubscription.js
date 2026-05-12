/**
 * Gate middleware — blocks a route unless the authenticated user's
 * effective plan unlocks the named feature.
 *
 * Usage:
 *   router.post('/api/campaigns/launch-auto',
 *     autenticar,
 *     requiereSubscription({ feature: 'bulkLauncher' }),
 *     controller.launchAuto);
 *
 * Returns a 402 (Payment Required) with a structured body the frontend
 * can use to surface an upsell modal:
 *   { success: false, code: 'PLAN_REQUIRED', feature, currentPlan, suggestedPlan }
 *
 * NOTE: This middleware is the runtime check, but the declarative map of
 * what feature gates which route lives in lib/featureGates.js.
 */

const { hasFeature, getUserPlanKey } = require('../lib/plans');
const { PLANS } = require('../config/plans');

function suggestPlanFor(role, feature) {
  // Smallest paid plan in the role that unlocks the feature.
  for (const [key, plan] of Object.entries(PLANS)) {
    if (plan.role !== role) continue;
    if (plan.tier === 'free') continue;
    if (plan.features?.[feature]) return key;
  }
  return null;
}

function requiereSubscription({ feature }) {
  if (!feature || typeof feature !== 'string') {
    throw new Error('requiereSubscription: feature name is required');
  }

  return async (req, res, next) => {
    try {
      if (!req.usuario?.id) {
        return res.status(401).json({ success: false, message: 'No autorizado' });
      }

      const Usuario = require('../models/Usuario');
      const database = require('../config/database');
      if (!database.estaConectado()) await database.conectar();

      const user = await Usuario.findById(req.usuario.id).select('rol subscription').lean();
      if (!user) {
        return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
      }

      if (hasFeature(user, feature)) return next();

      const role = user.rol === 'creator' ? 'creator' : 'advertiser';
      return res.status(402).json({
        success: false,
        code: 'PLAN_REQUIRED',
        message: 'Esta funcionalidad requiere un plan superior',
        feature,
        currentPlan: getUserPlanKey(user),
        suggestedPlan: suggestPlanFor(role, feature),
      });
    } catch (e) {
      try {
        require('../lib/logger').error('requiereSubscription', { msg: e?.message, feature });
      } catch { /* logger unavailable */ }
      return res.status(500).json({ success: false, message: 'Error interno' });
    }
  };
}

module.exports = { requiereSubscription };
