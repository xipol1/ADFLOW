/**
 * Onboarding progress, derived from what actually happened.
 *
 * The checklist used to compute every step in the browser from localStorage:
 * `channelad-advertiser-fiscal-v1`, `channelad-*-profile-draft`,
 * `channelad-advertiser-tracking-configured-v1`, and so on. Two consequences,
 * both live in production:
 *
 *   - Changing browser reset the user's progress to 0%.
 *   - "Datos fiscales" disagreed with the server in both directions. It showed
 *     pending for a user whose datosFacturacion.completado was true, and showed
 *     done for a user the API would 403 via requiereDatosFacturacion.
 *
 * So the server computes it instead, from the same records the rest of the
 * product enforces against. Only steps with no server-side footprint —
 * currently just the advertiser's spend goal — are stored, in
 * `Usuario.onboarding.pasosCompletados`.
 *
 * Returns a flat map { stepId: boolean }. Titles, icons and CTA paths stay in
 * the frontend; this module owns only the question "is it done".
 */

const PASOS_CREATOR = ['channel', 'oauth', 'cas', 'profile', 'pricing', 'discover', 'first-campaign', 'fiscal'];
const PASOS_ADVERTISER = ['fiscal', 'brand', 'recharge', 'tracking', 'explore', 'first-campaign', 'completed-campaign', 'goal'];

// Steps nothing in the database can attest to. They are the only ones allowed
// into onboarding.pasosCompletados — anything else must be derived, or it will
// drift from reality exactly like the localStorage flags did.
const PASOS_MANUALES = new Set(['goal']);

function pasosDeRol(rol) {
  return rol === 'creator' ? PASOS_CREATOR : PASOS_ADVERTISER;
}

function esPasoManual(rol, pasoId) {
  return PASOS_MANUALES.has(pasoId) && pasosDeRol(rol).includes(pasoId);
}

async function progresoCreador(user, manuales) {
  const Canal = require('../models/Canal');
  const Campaign = require('../models/Campaign');

  const canales = await Canal.find({ propietario: user._id })
    .select('CAS verificacion').lean();
  const canalIds = canales.map((c) => c._id);

  const [completadas, conActividad] = await Promise.all([
    canalIds.length
      ? Campaign.countDocuments({ channel: { $in: canalIds }, status: 'COMPLETED' })
      : 0,
    canalIds.length
      ? Campaign.countDocuments({ channel: { $in: canalIds }, status: { $ne: 'DRAFT' } })
      : 0,
  ]);

  const perfil = user.perfilCreador || {};

  return {
    channel: canales.length > 0,
    oauth: canales.some((c) => c.verificacion?.tipoAcceso === 'oauth'),
    cas: canales.some((c) => Number(c.CAS) > 0),
    // The public profile counts as done once it says something about the
    // creator — a bio or headline is what an advertiser actually reads.
    profile: Boolean(perfil.biografia || perfil.bio || perfil.headline),
    pricing: Array.isArray(perfil.packages) && perfil.packages.length > 0,
    discover: conActividad > 0,
    'first-campaign': completadas > 0,
    fiscal: user.datosFacturacion?.completado === true,
    ...manuales,
  };
}

async function progresoAnunciante(user, manuales) {
  const Campaign = require('../models/Campaign');
  const Transaccion = require('../models/Transaccion');
  const TrackingLink = require('../models/TrackingLink');

  const [campanas, completadas, pagadas, recargas, enlaces] = await Promise.all([
    Campaign.countDocuments({ advertiser: user._id }),
    Campaign.countDocuments({ advertiser: user._id, status: 'COMPLETED' }),
    Campaign.countDocuments({ advertiser: user._id, status: { $in: ['PAID', 'PUBLISHED', 'COMPLETED'] } }),
    Transaccion.countDocuments({ advertiser: user._id, tipo: 'recarga', status: 'paid' }),
    TrackingLink.countDocuments({ createdBy: user._id }),
  ]);

  const perfil = user.perfilAnunciante || {};

  return {
    fiscal: user.datosFacturacion?.completado === true,
    brand: Boolean((perfil.nombreEmpresa || perfil.companyName || perfil.brandName) && (perfil.industria || perfil.industry)),
    recharge: recargas > 0,
    tracking: enlaces > 0,
    explore: pagadas > 0,
    'first-campaign': campanas > 0,
    'completed-campaign': completadas > 0,
    ...manuales,
  };
}

/**
 * Compute the progress map for one user.
 *
 * @param {Object} user - lean Usuario doc (needs _id, rol, datosFacturacion,
 *                        perfil*, onboarding)
 * @returns {Promise<{pasos: Object, dismissedAt: Date|null, completedAt: Date|null,
 *                    total: number, completados: number}>}
 */
async function calcular(user) {
  const rol = user?.rol === 'creator' ? 'creator' : 'advertiser';
  const guardados = user?.onboarding?.pasosCompletados || [];

  // Only manual steps are honoured from storage. A stale entry for a derived
  // step (say someone wrote 'fiscal' by hand) must not override the truth.
  const manuales = {};
  for (const id of guardados) {
    if (esPasoManual(rol, id)) manuales[id] = true;
  }

  const pasos = rol === 'creator'
    ? await progresoCreador(user, manuales)
    : await progresoAnunciante(user, manuales);

  // Guarantee every step of the role is present, so the client never has to
  // guess whether a missing key means false or means "not applicable".
  for (const id of pasosDeRol(rol)) {
    if (!(id in pasos)) pasos[id] = false;
  }

  const total = pasosDeRol(rol).length;
  const completados = pasosDeRol(rol).filter((id) => pasos[id]).length;

  return {
    pasos,
    total,
    completados,
    dismissedAt: user?.onboarding?.dismissedAt || null,
    completedAt: user?.onboarding?.completedAt || null,
  };
}

module.exports = {
  calcular,
  pasosDeRol,
  esPasoManual,
  PASOS_CREATOR,
  PASOS_ADVERTISER,
  PASOS_MANUALES,
};
