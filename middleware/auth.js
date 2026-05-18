const jwt = require('jsonwebtoken');
const config = require('../config/config');

const normalizeRoles = (inputRoles) => {
  if (inputRoles.length === 1 && Array.isArray(inputRoles[0])) {
    return inputRoles[0];
  }
  return inputRoles;
};

const autenticar = (req, res, next) => {
  const authHeader = req.headers?.authorization || '';
  const [type, token] = authHeader.split(' ');

  if (type !== 'Bearer' || !token) {
    return res.status(401).json({ success: false, message: 'No autorizado' });
  }

  if (!config.jwt?.secret) {
    console.warn('⚠️ JWT_SECRET no configurado; autenticación deshabilitada');
    return res.status(500).json({ success: false, message: 'Autenticación no configurada' });
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret, {
      issuer: config.jwt.issuer,
      audience: config.jwt.audience,
      algorithms: ['HS256']
    });

    req.usuario = decoded;
    next();
  } catch (error) {
    // Use structured logging so JWT failure messages don't leak via the
    // raw stack into shared log streams. Only message + JWT error name.
    try {
      require('../lib/logger').warn('auth.jwt.invalid', { name: error?.name, msg: error?.message });
    } catch { /* logger not available */ }
    return res.status(401).json({ success: false, message: 'Token inválido' });
  }
};

const autorizarRoles = (...inputRoles) => {
  const allowedRoles = normalizeRoles(inputRoles).filter(Boolean);

  return (req, res, next) => {
    const rolUsuario = req.usuario?.rol || req.usuario?.role;

    if (!rolUsuario) {
      return res.status(403).json({ success: false, message: 'Rol de usuario no disponible' });
    }

    if (allowedRoles.length === 0 || allowedRoles.includes(rolUsuario)) {
      return next();
    }

    return res.status(403).json({ success: false, message: 'No tienes permisos para esta acción' });
  };
};

const requiereEmailVerificado = (req, res, next) => {
  const emailVerificado = req.usuario?.emailVerificado;

  if (emailVerificado === true) {
    return next();
  }

  return res.status(403).json({
    success: false,
    message: 'Debes verificar tu email para continuar'
  });
};

/**
 * Blocks access until the authenticated user has filled in mandatory legal
 * billing data (datosFacturacion.completado === true).
 *
 * Required in any flow that triggers a money movement (campaign creation,
 * wallet top-up cash-out, creator withdrawal) since we cannot legally issue
 * an invoice without razón social, NIF/CIF, dirección, CP, ciudad and país.
 *
 * Returns a structured 403 with `code: 'FISCAL_DATA_REQUIRED'` so the
 * frontend can surface the right banner / redirect to settings.
 */
const requiereDatosFacturacion = async (req, res, next) => {
  try {
    if (!req.usuario?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // Lazy-require to avoid a circular dependency through models loading config.
    const Usuario = require('../models/Usuario');
    const database = require('../config/database');
    if (!database.estaConectado()) await database.conectar();

    const user = await Usuario.findById(req.usuario.id).select('datosFacturacion').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    if (user.datosFacturacion?.completado === true) {
      return next();
    }

    const rolUsuario = req.usuario?.rol || req.usuario?.role;
    const redirectTo = rolUsuario === 'creator'
      ? '/creator/settings?tab=cobros'
      : '/advertiser/settings?tab=facturacion';

    return res.status(403).json({
      success: false,
      code: 'FISCAL_DATA_REQUIRED',
      message: 'Debes completar tus datos de facturación antes de continuar',
      redirectTo,
    });
  } catch (e) {
    try {
      require('../lib/logger').error('requiereDatosFacturacion', { msg: e?.message });
    } catch { /* logger unavailable */ }
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const verificarPropietario = () => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    return next();
  };
};

/**
 * SPEC-B1: enforcement de Usuario.deletionStatus en el flujo authenticado.
 *
 * Se monta DESPUÉS de `autenticar` en cualquier ruta que requiera sesión activa.
 * Hace una query ligera por id (~1ms con índice) y decide:
 *   - 'anonymized'                   → 401 código 'account_deleted'
 *   - 'pending_deletion'             → continuar pero setear cabecera para banner
 *   - 'pending_email_confirmation'   → continuar (login normal, todavía no confirmado)
 *   - 'active' (o ausente)           → continuar
 *
 * No usamos JOIN ni populate — el campo está denormalizado en Usuario
 * precisamente para que el coste sea constante por request.
 *
 * Para mantener compatibilidad con código existente, este middleware NO se
 * añade a `autenticar` directamente. Cada router decide si lo aplica
 * (típicamente sí). Si en el futuro hace falta enforcement universal, mover
 * la lógica a `autenticar` y eliminar este export.
 */
const verificarCuentaActiva = async (req, res, next) => {
  try {
    if (!req.usuario?.id) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    // Lazy-require para evitar dependencia circular con models que cargan config.
    const Usuario = require('../models/Usuario');
    const database = require('../config/database');
    if (!database.estaConectado()) await database.conectar();

    const user = await Usuario.findById(req.usuario.id).select('deletionStatus').lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' });
    }

    const status = user.deletionStatus || 'active';

    if (status === 'anonymized') {
      return res.status(401).json({
        success: false,
        code: 'account_deleted',
        message: 'Esta cuenta ha sido eliminada.',
      });
    }

    if (status === 'pending_deletion') {
      // Marcador para el frontend: monta DeletionGraceBanner en el layout autenticado.
      res.setHeader('X-Channelad-Deletion-Pending', 'true');
    }

    return next();
  } catch (e) {
    try {
      require('../lib/logger').error('verificarCuentaActiva', { msg: e?.message });
    } catch { /* logger unavailable */ }
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  autenticar,
  autorizarRoles,
  requiereEmailVerificado,
  requiereDatosFacturacion,
  verificarPropietario,
  verificarCuentaActiva,
};
