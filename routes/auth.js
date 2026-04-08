const express = require('express');
const { body, param } = require('express-validator');
const authController = require('../controllers/authController');
const { validarCampos } = require('../middleware/validarCampos');
const { autenticar } = require('../middleware/auth');
const { limitarIntentos } = require('../middleware/rateLimiter');

const router = express.Router();

// Validaciones comunes
const validacionesRegistro = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('La contraseña debe incluir mayúscula, minúscula y número'),
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El apellido solo puede contener letras y espacios'),
  body('telefono')
    .optional()
    .isMobilePhone('any')
    .withMessage('Número de teléfono inválido'),
  body('role')
    .optional()
    .isIn(['creator', 'advertiser'])
    .withMessage('Rol inválido. Debe ser creator o advertiser'),
  
  // Validaciones condicionales para perfil de creador
  body('perfilCreador.biografia')
    .if(body('role').equals('creator'))
    .optional()
    .isLength({ max: 500 })
    .withMessage('La biografía no puede exceder 500 caracteres'),
  body('perfilCreador.especialidades')
    .if(body('role').equals('creator'))
    .optional()
    .isArray()
    .withMessage('Las especialidades deben ser un array'),
  body('perfilCreador.experiencia')
    .if(body('role').equals('creator'))
    .optional()
    .isIn(['principiante', 'intermedio', 'avanzado', 'experto'])
    .withMessage('Nivel de experiencia inválido'),
  
  // Validaciones condicionales para perfil de anunciante
  body('perfilAnunciante.nombreEmpresa')
    .if(body('role').equals('advertiser'))
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre de empresa debe tener entre 2 y 100 caracteres'),
  body('perfilAnunciante.sitioWeb')
    .if(body('role').equals('advertiser'))
    .optional()
    .isURL()
    .withMessage('URL del sitio web inválida'),
  body('perfilAnunciante.industria')
    .if(body('role').equals('advertiser'))
    .optional()
    .isLength({ min: 2, max: 50 })
    .withMessage('La industria debe tener entre 2 y 50 caracteres'),
  body('referralCode')
    .optional()
    .trim()
    .isLength({ min: 3, max: 20 })
    .withMessage('Codigo de referido invalido')
    .matches(/^[A-Za-z0-9]+$/)
    .withMessage('Codigo de referido solo puede contener letras y numeros'),
];

const validacionesLogin = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido'),
  body('password')
    .notEmpty()
    .withMessage('La contraseña es obligatoria')
];

const validacionesCambioPassword = [
  body('passwordActual')
    .notEmpty()
    .withMessage('La contraseña actual es obligatoria'),
  body('passwordNueva')
    .isLength({ min: 8 })
    .withMessage('La nueva contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('La nueva contraseña debe incluir mayúscula, minúscula y número')
];

const validacionesRestablecimiento = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Email inválido')
];

const validacionesNuevaPassword = [
  param('token')
    .isLength({ min: 32 })
    .withMessage('Token inválido'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('La contraseña debe tener al menos 8 caracteres')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).+$/)
    .withMessage('La contraseña debe incluir mayúscula, minúscula y número')
];

const validacionesActualizarPerfil = [
  body('nombre')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El nombre debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El nombre solo puede contener letras y espacios'),
  body('apellido')
    .optional()
    .trim()
    .isLength({ min: 2, max: 50 })
    .withMessage('El apellido debe tener entre 2 y 50 caracteres')
    .matches(/^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]+$/)
    .withMessage('El apellido solo puede contener letras y espacios'),
  body('telefono')
    .optional()
    .isMobilePhone('any')
    .withMessage('Número de teléfono inválido'),
  body('avatar')
    .optional()
    .isURL()
    .withMessage('URL del avatar inválida'),
  body('fechaNacimiento')
    .optional()
    .isISO8601()
    .withMessage('Fecha de nacimiento inválida'),
  body('genero')
    .optional()
    .isIn(['masculino', 'femenino', 'otro', 'prefiero_no_decir'])
    .withMessage('Género inválido'),
  body('ubicacion.pais')
    .optional()
    .isLength({ min: 2, max: 2 })
    .withMessage('Código de país inválido (ISO 3166-1 alpha-2)'),
  body('ubicacion.ciudad')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('La ciudad debe tener entre 2 y 100 caracteres'),
  body('idiomas')
    .optional()
    .isArray()
    .withMessage('Los idiomas deben ser un array'),
  body('zonaHoraria')
    .optional()
    .isLength({ min: 3, max: 50 })
    .withMessage('Zona horaria inválida')
];

// Rate limiting específico para autenticación
const limitarLogin = limitarIntentos({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10,
  message: {
    success: false,
    message: 'Demasiados intentos de login. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const limitarRegistro = limitarIntentos({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    success: false,
    message: 'Demasiados registros desde esta IP. Intenta de nuevo en 1 hora.'
  }
});

const limitarRestablecimiento = limitarIntentos({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de restablecimiento. Intenta de nuevo en 1 hora.'
  }
});

// Rutas públicas

/**
 * @route   POST /api/auth/registro
 * @desc    Registrar nuevo usuario
 * @access  Público
 */
router.post('/registro', 
  limitarRegistro,
  validacionesRegistro,
  validarCampos,
  authController.registro
);

/**
 * @swagger
 * /auth/register:
 *   post:
 *     summary: Registra un nuevo usuario
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *               nombre:
 *                 type: string
 *               apellido:
 *                 type: string
 *               role:
 *                 type: string
 *                 enum: [creator, advertiser]
 *     responses:
 *       201:
 *         description: Usuario registrado
 */
router.post('/register', 
  limitarRegistro,
  validacionesRegistro,
  validarCampos,
  authController.registro
);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     summary: Inicia sesión
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               email:
 *                 type: string
 *               password:
 *                 type: string
 *     responses:
 *       200:
 *         description: Login exitoso
 */
router.post('/login',
  limitarLogin,
  validacionesLogin,
  validarCampos,
  authController.login
);

/**
 * @route   POST /api/auth/refresh-token
 * @desc    Refrescar token de acceso
 * @access  Público
 */
router.post('/refresh-token',
  body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  validarCampos,
  authController.refreshToken
);

/**
 * @route   GET /api/auth/verificar-email/:token
 * @desc    Verificar email con token
 * @access  Público
 */
router.get('/verificar-email/:token',
  param('token').isLength({ min: 32 }).withMessage('Token inválido'),
  validarCampos,
  authController.verificarEmail
);

/**
 * @route   POST /api/auth/solicitar-restablecimiento
 * @desc    Solicitar restablecimiento de contraseña
 * @access  Público
 */
router.post('/solicitar-restablecimiento',
  limitarRestablecimiento,
  validacionesRestablecimiento,
  validarCampos,
  authController.solicitarRestablecimiento
);

// English alias used by frontend ForgotPasswordPage
router.post('/forgot-password',
  limitarRestablecimiento,
  validacionesRestablecimiento,
  validarCampos,
  authController.solicitarRestablecimiento
);

/**
 * @route   POST /api/auth/restablecer-password/:token
 * @desc    Restablecer contraseña con token
 * @access  Público
 */
router.post('/restablecer-password/:token',
  validacionesNuevaPassword,
  validarCampos,
  authController.restablecerPassword
);

// Rutas protegidas (requieren autenticación)

/**
 * @route   POST /api/auth/logout
 * @desc    Cerrar sesión
 * @access  Privado
 */
router.post('/logout',
  autenticar,
  body('refreshToken').notEmpty().withMessage('Refresh token requerido'),
  validarCampos,
  authController.logout
);

/**
 * @route   GET /api/auth/perfil
 * @desc    Obtener perfil del usuario autenticado
 * @access  Privado
 */
router.get('/perfil',
  autenticar,
  authController.obtenerPerfil
);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     summary: Obtiene perfil del usuario actual
 *     tags: [Auth]
 *     security:
 *       - BearerAuth: []
 *     responses:
 *       200:
 *         description: Perfil del usuario
 */
router.get('/me',
  autenticar,
  authController.obtenerPerfil
);

/**
 * @route   PUT /api/auth/perfil
 * @desc    Actualizar perfil del usuario
 * @access  Privado
 */
router.put('/perfil',
  autenticar,
  validacionesActualizarPerfil,
  validarCampos,
  authController.actualizarPerfil
);

/**
 * @route   POST /api/auth/cambiar-password
 * @desc    Cambiar contraseña (usuario autenticado)
 * @access  Privado
 */
router.post('/cambiar-password',
  autenticar,
  validacionesCambioPassword,
  validarCampos,
  authController.cambiarPassword
);

/**
 * @route   POST /api/auth/desactivar-cuenta
 * @desc    Desactivar cuenta del usuario
 * @access  Privado
 */
router.post('/desactivar-cuenta',
  autenticar,
  body('motivo')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El motivo no puede exceder 500 caracteres'),
  validarCampos,
  authController.desactivarCuenta
);

/**
 * @route   GET /api/auth/verificar-token
 * @desc    Verificar si el token es válido
 * @access  Privado
 */
router.get('/verificar-token',
  autenticar,
  authController.verificarToken
);

/**
 * @route   GET /api/auth/estadisticas
 * @desc    Obtener estadísticas del usuario
 * @access  Privado
 */
router.get('/estadisticas',
  autenticar,
  authController.obtenerEstadisticas
);

const limitarReenvio = limitarIntentos({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 3,
  message: {
    success: false,
    message: 'Demasiadas solicitudes de reenvío. Intenta de nuevo en 5 minutos.'
  }
});

router.post('/reenviar-verificacion',
  limitarReenvio,
  body('email').isEmail().withMessage('Email invalido'),
  validarCampos,
  authController.reenviarVerificacion
);

// ── 2FA / TOTP routes ──
try {
  const twoFA = require('../controllers/twoFactorController');
  router.post('/2fa/setup', autenticar, twoFA.setup2FA);
  router.post('/2fa/verify', autenticar, body('code').isLength({ min: 6, max: 8 }).withMessage('Codigo invalido'), validarCampos, twoFA.verify2FA);
  router.post('/2fa/validate', body('email').isEmail(), body('code').isLength({ min: 6, max: 8 }), validarCampos, twoFA.validate2FA);
  router.post('/2fa/disable', autenticar, body('password').notEmpty(), validarCampos, twoFA.disable2FA);
} catch (e) {
  console.warn('2FA routes not loaded:', e.message);
}

// ── Bot token endpoints (called by Telegram bot) ──

/**
 * @route   POST /api/auth/bot-token
 * @desc    Register a bot verification token (called by Telegram bot with API key)
 * @access  Bot only (X-Bot-Key header)
 */
router.post('/bot-token', authController.createBotToken);

/**
 * @route   GET /api/auth/validate-bot-token?token=XXX
 * @desc    Validate a bot token (called by frontend on register page load)
 * @access  Public
 */
router.get('/validate-bot-token', authController.validateBotToken);

// Middleware de manejo de errores específico para rutas de auth
router.use((error, req, res, next) => {
  console.error('Error en rutas de autenticación:', error);
  
  // Error de validación de Mongoose — return generic message, don't leak field names
  if (error.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos. Verifica los campos e intenta de nuevo.',
    });
  }
  
  // Error de duplicado (email ya existe)
  if (error.code === 11000) {
    return res.status(400).json({
      success: false,
      message: 'El email ya está registrado'
    });
  }
  
  // Error de JWT
  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Token inválido'
    });
  }
  
  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Token expirado'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = router;
