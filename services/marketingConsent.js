/**
 * Marketing consent — fuente única de verdad para "¿puedo enviarle a esta
 * persona un email COMERCIAL?".
 *
 * Por qué existe (y por qué está separado de services/legalConsent.js):
 *
 *   - Los emails OPERATIVOS (verificación, recuperación de contraseña, estado
 *     de una campaña, disputa, retiro) van por ejecución de contrato — art.
 *     6.1.b RGPD. No necesitan consentimiento ni enlace de baja: el usuario no
 *     puede "darse de baja" del funcionamiento del servicio que contrató.
 *
 *   - Los emails COMERCIALES (novedades de producto, funcionalidades nuevas,
 *     promociones, invitaciones a probar algo) van por consentimiento — art.
 *     6.1.a RGPD, tal y como declara nuestra propia Política de Privacidad, y
 *     art. 21.1 LSSI. El opt-in blando del art. 21.2 LSSI (comunicaciones
 *     sobre productos similares a los ya contratados) NO nos vale hoy: exige
 *     una contratación previa, y la mayoría de cuentas no ha contratado nada.
 *
 * Reglas que implementa este módulo:
 *   1. Casilla NO premarcada y separada de la aceptación legal (art. 7.2 RGPD
 *      + Planet49): el consentimiento no puede ir "empaquetado" con los
 *      términos, ni ser condición para registrarse.
 *   2. Prueba del consentimiento (art. 7.1): guardamos el texto literal que
 *      vio el usuario, su versión, fecha, IP y user-agent.
 *   3. Retirada tan fácil como la concesión (art. 7.3): un click en el enlace
 *      de baja de cualquier email comercial, sin login, más un interruptor en
 *      la propia cuenta.
 *
 * El guardián de envío está en services/emailService.enviarEmailComercial():
 * ningún email comercial sale sin pasar por `puedeRecibirMarketing()`.
 */

const crypto = require('crypto');

// ─── Texto del consentimiento ────────────────────────────────────────────────
// El texto LITERAL que se muestra en la casilla. Se guarda con cada opt-in.
// Si cambia el texto hay que subir MARKETING_CONSENT_VERSION: los opt-in
// antiguos siguen siendo válidos para su versión (no forzamos re-consent, el
// consentimiento no caduca por cambiar la redacción), pero la evidencia queda
// atada a lo que la persona leyó de verdad.
const MARKETING_CONSENT_VERSION = '2026-08-v1';
const MARKETING_CONSENT_TEXT =
  'Quiero recibir emails de Channelad con novedades de producto, funcionalidades ' +
  'nuevas y consejos para monetizar mi canal. Es opcional y puedo darme de baja ' +
  'cuando quiera desde el enlace de cualquier email o desde mi cuenta.';

// El formulario de alta pinta este mismo texto (client/src/ui/pages/auth/AuthPage.jsx).
// Tienen que coincidir palabra por palabra: lo que guardamos como prueba debe ser
// exactamente lo que la persona leyó. tests/marketingConsent.test.js lo verifica.

// Motivos por los que un envío comercial se bloquea. Los devolvemos en vez de
// lanzar para que los jobs de envío masivo puedan contarlos y registrarlos.
const BLOQUEO = {
  SIN_CONSENTIMIENTO: 'sin_consentimiento',
  BAJA: 'baja_solicitada',
  CUENTA_INACTIVA: 'cuenta_inactiva',
  SIN_EMAIL: 'sin_email',
};

// ─── Estado ──────────────────────────────────────────────────────────────────

/**
 * ¿Se le puede enviar un email comercial a este usuario?
 * Devuelve { ok: true } o { ok: false, motivo }.
 *
 * Es intencionadamente restrictivo: cualquier duda (usuario sin cargar,
 * campo ausente en una cuenta antigua) resuelve en "no".
 */
function puedeRecibirMarketing(usuario) {
  if (!usuario?.email) return { ok: false, motivo: BLOQUEO.SIN_EMAIL };
  if (usuario?.activo === false) return { ok: false, motivo: BLOQUEO.CUENTA_INACTIVA };
  const c = usuario?.comunicaciones || {};
  if (c.marketingOptOutAt && !c.marketingOptIn) return { ok: false, motivo: BLOQUEO.BAJA };
  if (c.marketingOptIn !== true) return { ok: false, motivo: BLOQUEO.SIN_CONSENTIMIENTO };
  return { ok: true };
}

// ─── La pregunta única a las cuentas antiguas ────────────────────────────────
//
// Las cuentas creadas antes de que existiera la casilla no tienen ni sí ni no:
// simplemente nunca se les preguntó. Este bloque decide a quién se le muestra
// el diálogo al entrar.
//
// Lo que el diálogo NO puede hacer, por mucho que sea tentador: bloquear la
// aplicación hasta que digan que sí. El art. 7.4 RGPD exige que el
// consentimiento sea libre, y no lo es si la única salida es aceptar; un "sí"
// arrancado así no vale como consentimiento y encima deja constancia escrita
// de la coacción. Lo que sí puede es exigir una DECISIÓN — sí o no, ambas
// igual de accesibles — y no volver a preguntar una vez respondida.
const MAX_APLAZAMIENTOS = 3;

/**
 * ¿Hay que enseñarle el diálogo de consentimiento a este usuario?
 *
 * Solo si: tiene la cuenta activa y verificada, no consintió ya (en el alta o
 * en ajustes), nunca respondió a la pregunta, y no la ha aplazado demasiadas
 * veces. Quien se dio de baja tampoco cuenta: ya se pronunció.
 */
function necesitaPrompt(usuario) {
  if (!usuario?.email) return false;
  if (usuario?.activo === false) return false;
  // Sin verificar el email no le pedimos nada más: primero que active la cuenta.
  if (usuario?.emailVerificado !== true) return false;

  const c = usuario?.comunicaciones || {};
  if (c.marketingOptIn === true) return false;
  if (c.marketingOptOutAt) return false;

  const prompt = c.marketingPrompt || {};
  if (prompt.respuesta === 'si' || prompt.respuesta === 'no') return false;
  return (prompt.aplazamientos || 0) < MAX_APLAZAMIENTOS;
}

/**
 * Registra la respuesta al diálogo.
 *
 *   'si'    → consentimiento con su evidencia completa (igual que la casilla
 *             del alta, pero con origen 'prompt').
 *   'no'    → queda constancia de que se preguntó y dijo que no. NO se escribe
 *             una entrada de opt_out en el historial: nunca hubo consentimiento
 *             que retirar, y falsear ese historial estropearía la prueba.
 *   'luego' → suma un aplazamiento y se le vuelve a preguntar más adelante,
 *             hasta MAX_APLAZAMIENTOS.
 *
 * Devuelve { respuesta, optIn }.
 */
async function registrarDecision(user, respuesta, req) {
  if (!user.comunicaciones) user.comunicaciones = {};
  if (!user.comunicaciones.marketingPrompt) user.comunicaciones.marketingPrompt = {};
  const prompt = user.comunicaciones.marketingPrompt;

  if (respuesta === 'luego') {
    prompt.aplazamientos = (prompt.aplazamientos || 0) + 1;
    user.markModified('comunicaciones');
    await user.save();
    return { respuesta: 'luego', optIn: user.comunicaciones.marketingOptIn === true };
  }

  const acepta = respuesta === 'si';
  prompt.respuesta = acepta ? 'si' : 'no';
  prompt.respondidoEn = new Date();
  user.markModified('comunicaciones');

  if (acepta) {
    // aplicarPreferencia ya persiste y escribe la evidencia en el historial.
    await aplicarPreferencia(user, true, req, 'prompt');
  } else {
    await user.save();
  }

  return { respuesta: prompt.respuesta, optIn: user.comunicaciones.marketingOptIn === true };
}

// IP / user-agent — misma precedencia que services/legalConsent.js.
const clientIp = (req) =>
  req?.headers?.['x-forwarded-for']?.split(',')[0]?.trim() ||
  req?.ip ||
  req?.connection?.remoteAddress ||
  '';
const clientUA = (req) => req?.headers?.['user-agent'] || '';

/**
 * Construye el bloque `comunicaciones` inicial para un usuario que se está
 * registrando. Puro (no toca la BD) — se usa antes de crear el documento.
 * `optIn` viene del checkbox opcional del formulario; si es false devolvemos
 * el bloque vacío (sin historial: no consentir no es un evento que registrar).
 */
function buildComunicacionesIniciales(optIn, req, origen = 'registro') {
  if (optIn !== true) {
    return { marketingOptIn: false, marketingOptInAt: null, marketingOptOutAt: null, historial: [] };
  }
  const now = new Date();
  return {
    marketingOptIn: true,
    marketingOptInAt: now,
    marketingOptOutAt: null,
    historial: [{
      accion: 'opt_in',
      origen,
      texto: MARKETING_CONSENT_TEXT,
      version: MARKETING_CONSENT_VERSION,
      fecha: now,
      ip: clientIp(req),
      userAgent: clientUA(req),
    }],
  };
}

/**
 * Aplica un cambio de preferencia sobre un documento de usuario y lo persiste.
 * Idempotente: si el estado ya es el pedido no añade una entrada duplicada al
 * historial (evita inflarlo con clicks repetidos en el enlace de baja).
 *
 * Devuelve { cambiado, estado }.
 */
async function aplicarPreferencia(user, optIn, req, origen = 'preferencias') {
  const quiere = optIn === true;
  if (!user.comunicaciones) user.comunicaciones = {};
  const actual = user.comunicaciones.marketingOptIn === true;

  if (actual === quiere) return { cambiado: false, estado: actual };

  const now = new Date();
  user.comunicaciones.marketingOptIn = quiere;
  if (quiere) {
    user.comunicaciones.marketingOptInAt = now;
    user.comunicaciones.marketingOptOutAt = null;
  } else {
    user.comunicaciones.marketingOptOutAt = now;
  }
  if (!Array.isArray(user.comunicaciones.historial)) user.comunicaciones.historial = [];
  user.comunicaciones.historial.push({
    accion: quiere ? 'opt_in' : 'opt_out',
    origen,
    texto: quiere ? MARKETING_CONSENT_TEXT : '',
    version: quiere ? MARKETING_CONSENT_VERSION : '',
    fecha: now,
    ip: clientIp(req),
    userAgent: clientUA(req),
  });
  user.markModified('comunicaciones');
  await user.save();
  return { cambiado: true, estado: quiere };
}

// ─── Tokens de baja (HMAC) ───────────────────────────────────────────────────
// Mismo patrón que routes/calculator.js, pero con un prefijo de audiencia para
// que un token de usuario no pueda dar de baja un lead de la calculadora ni al
// revés. Firmamos con JWT_SECRET: si rota, los enlaces viejos dejan de valer
// (aceptable — el usuario siempre puede darse de baja desde su cuenta).
const AUDIENCIAS = ['usuario', 'lead'];

function _secret() {
  return process.env.JWT_SECRET || 'channelad-fallback-unsub-secret';
}

function makeUnsubscribeToken(audiencia, id) {
  if (!AUDIENCIAS.includes(audiencia)) throw new Error(`Audiencia no válida: ${audiencia}`);
  const payload = `${audiencia}:${id}`;
  const mac = crypto.createHmac('sha256', _secret()).update(payload).digest('hex').slice(0, 32);
  return `${audiencia}.${id}.${mac}`;
}

/**
 * Verifica un token de baja. Devuelve { audiencia, id } o null.
 * No revela nada al llamante sobre por qué falló (la página de baja responde
 * igual en todos los casos para que no se pueda enumerar).
 */
function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [audiencia, id, mac] = token.split('.');
  if (!audiencia || !id || !mac) return null;
  if (!AUDIENCIAS.includes(audiencia)) return null;
  let esperado;
  try {
    esperado = makeUnsubscribeToken(audiencia, id).split('.')[2];
  } catch {
    return null;
  }
  if (mac.length !== esperado.length) return null;
  if (!crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(esperado))) return null;
  return { audiencia, id };
}

/** URL pública de baja en un click para un usuario. */
function unsubscribeUrl(userId, baseUrl) {
  const base = (baseUrl || process.env.FRONTEND_URL || 'https://channelad.io').replace(/\/$/, '');
  return `${base}/api/comunicaciones/baja?token=${makeUnsubscribeToken('usuario', userId)}`;
}

module.exports = {
  MARKETING_CONSENT_TEXT,
  MARKETING_CONSENT_VERSION,
  MAX_APLAZAMIENTOS,
  BLOQUEO,
  puedeRecibirMarketing,
  necesitaPrompt,
  registrarDecision,
  buildComunicacionesIniciales,
  aplicarPreferencia,
  makeUnsubscribeToken,
  verifyUnsubscribeToken,
  unsubscribeUrl,
};
