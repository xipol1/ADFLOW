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
    console.error('AUTH ERROR:', error);
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

const verificarPropietario = () => {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ success: false, message: 'No autorizado' });
    }

    return next();
  };
};

module.exports = {
  autenticar,
  autorizarRoles,
  requiereEmailVerificado,
  verificarPropietario
};
