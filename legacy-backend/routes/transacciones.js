const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const transaccionController = require('../controllers/transaccionController');
const { autenticar, autorizarRoles, requiereEmailVerificado } = require('../middleware/auth');
const { validarCampos, validarPaginacion } = require('../middleware/validarCampos');
const { limitadorAPI, limitadorGeneral, limitadorEndpoint } = require('../middleware/rateLimiter');

// ==========================================
// MIDDLEWARE GLOBAL
// ==========================================

// Aplicar rate limiting a todas las rutas
router.use(limitadorAPI);

// Todas las rutas requieren autenticación
router.use(autenticar);
router.use(requiereEmailVerificado);

// ==========================================
// VALIDACIONES
// ==========================================

// Validaciones para obtener transacciones
const validacionesObtenerTransacciones = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe ser un número entre 1 y 50'),
  query('tipo')
    .optional()
    .isIn(['pago_anuncio', 'reembolso', 'comision', 'retiro'])
    .withMessage('Tipo de transacción inválido'),
  query('estado')
    .optional()
    .isIn(['pendiente', 'procesando', 'completado', 'fallido', 'cancelado'])
    .withMessage('Estado de transacción inválido'),
  query('fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio debe ser una fecha válida'),
  query('fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin debe ser una fecha válida'),
  validarPaginacion
];

// Validaciones para procesar pago
const validacionesProcesarPago = [
  body('anuncioId')
    .notEmpty()
    .withMessage('El ID del anuncio es requerido')
    .isMongoId()
    .withMessage('ID de anuncio inválido'),
  body('metodoPago')
    .notEmpty()
    .withMessage('El método de pago es requerido')
    .isIn(['tarjeta_credito', 'tarjeta_debito', 'paypal', 'transferencia', 'billetera'])
    .withMessage('Método de pago inválido'),
  body('datosPago')
    .isObject()
    .withMessage('Los datos de pago deben ser un objeto'),
  body('datosPago.numeroTarjeta')
    .if(body('metodoPago').isIn(['tarjeta_credito', 'tarjeta_debito']))
    .notEmpty()
    .withMessage('El número de tarjeta es requerido')
    .isCreditCard()
    .withMessage('Número de tarjeta inválido'),
  body('datosPago.fechaExpiracion')
    .if(body('metodoPago').isIn(['tarjeta_credito', 'tarjeta_debito']))
    .notEmpty()
    .withMessage('La fecha de expiración es requerida')
    .matches(/^(0[1-9]|1[0-2])\/([0-9]{2})$/)
    .withMessage('Formato de fecha de expiración inválido (MM/YY)'),
  body('datosPago.cvv')
    .if(body('metodoPago').isIn(['tarjeta_credito', 'tarjeta_debito']))
    .notEmpty()
    .withMessage('El CVV es requerido')
    .isLength({ min: 3, max: 4 })
    .withMessage('CVV debe tener 3 o 4 dígitos')
    .isNumeric()
    .withMessage('CVV debe ser numérico'),
  body('datosPago.nombreTitular')
    .if(body('metodoPago').isIn(['tarjeta_credito', 'tarjeta_debito']))
    .notEmpty()
    .withMessage('El nombre del titular es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre del titular debe tener entre 2 y 100 caracteres'),
  body('datosPago.email')
    .if(body('metodoPago').equals('paypal'))
    .notEmpty()
    .withMessage('El email de PayPal es requerido')
    .isEmail()
    .withMessage('Email de PayPal inválido'),
  validarCampos
];

// Validaciones para reembolso
const validacionesReembolso = [
  param('id')
    .isMongoId()
    .withMessage('ID de transacción inválido'),
  body('razon')
    .notEmpty()
    .withMessage('La razón del reembolso es requerida')
    .isLength({ min: 10, max: 500 })
    .withMessage('La razón debe tener entre 10 y 500 caracteres'),
  body('montoReembolso')
    .notEmpty()
    .withMessage('El monto de reembolso es requerido')
    .isFloat({ min: 0.01 })
    .withMessage('El monto debe ser mayor a 0'),
  validarCampos
];

// Validaciones para estadísticas
const validacionesEstadisticas = [
  query('periodo')
    .optional()
    .isIn(['7d', '30d', '90d', '1y'])
    .withMessage('Período inválido. Valores permitidos: 7d, 30d, 90d, 1y'),
  validarCampos
];

// Validaciones para admin
const validacionesAdmin = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100'),
  query('estado')
    .optional()
    .isIn(['pendiente', 'procesando', 'completado', 'fallido', 'cancelado'])
    .withMessage('Estado inválido'),
  query('tipo')
    .optional()
    .isIn(['pago_anuncio', 'reembolso', 'comision', 'retiro'])
    .withMessage('Tipo inválido'),
  query('usuario')
    .optional()
    .isMongoId()
    .withMessage('ID de usuario inválido'),
  query('fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio inválida'),
  query('fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin inválida'),
  validarPaginacion
];

// ==========================================
// RUTAS PÚBLICAS (AUTENTICADAS)
// ==========================================

/**
 * @route   GET /api/transacciones
 * @desc    Obtener transacciones del usuario autenticado
 * @access  Private
 */
router.get('/', 
  validacionesObtenerTransacciones,
  transaccionController.obtenerMisTransacciones
);

/**
 * @route   GET /api/transacciones/estadisticas
 * @desc    Obtener estadísticas financieras del usuario
 * @access  Private
 */
router.get('/estadisticas',
  validacionesEstadisticas,
  transaccionController.obtenerEstadisticasFinancieras
);

/**
 * @route   GET /api/transacciones/:id
 * @desc    Obtener una transacción específica
 * @access  Private
 */
router.get('/:id',
  [
    param('id')
      .isMongoId()
      .withMessage('ID de transacción inválido'),
    validarCampos
  ],
  transaccionController.obtenerTransaccion
);

// ==========================================
// RUTAS DE PAGOS
// ==========================================

/**
 * @route   POST /api/transacciones/pagar
 * @desc    Procesar pago de anuncio
 * @access  Private (Anunciantes)
 */
router.post('/pagar',
  limitadorGeneral,
  autorizarRoles('advertiser'),
  validacionesProcesarPago,
  transaccionController.procesarPagoAnuncio
);

/**
 * @route   PUT /api/transacciones/:id/liberar
 * @desc    Liberar pago al creador
 * @access  Private (Anunciante del anuncio o Admin)
 */
router.put('/:id/liberar',
  limitadorGeneral,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de transacción inválido'),
    validarCampos
  ],
  transaccionController.liberarPagoCreador
);

/**
 * @route   POST /api/transacciones/:id/reembolso
 * @desc    Procesar reembolso
 * @access  Private (Anunciante del anuncio o Admin)
 */
router.post('/:id/reembolso',
  limitadorGeneral,
  validacionesReembolso,
  transaccionController.procesarReembolso
);

// ==========================================
// RUTAS DE ADMINISTRACIÓN
// ==========================================

/**
 * @route   GET /api/transacciones/admin/todas
 * @desc    Obtener todas las transacciones (Admin)
 * @access  Private (Admin)
 */
router.get('/admin/todas',
  autorizarRoles('admin'),
  validacionesAdmin,
  transaccionController.obtenerTransaccionesAdmin
);

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================

// Middleware para manejar errores específicos de transacciones
router.use((error, req, res, next) => {
  console.error('Error en rutas de transacciones:', error);
  
  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errores = Object.values(error.errors).map(err => ({
      campo: err.path,
      mensaje: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación en los datos de la transacción',
      errores
    });
  }
  
  // Error de cast (ID inválido)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID de transacción inválido'
    });
  }
  
  // Error de duplicado
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Ya existe una transacción con estos datos'
    });
  }
  
  // Error de pago
  if (error.type === 'payment_error') {
    return res.status(402).json({
      success: false,
      message: 'Error en el procesamiento del pago',
      detalles: error.message
    });
  }
  
  // Error de saldo insuficiente
  if (error.type === 'insufficient_funds') {
    return res.status(400).json({
      success: false,
      message: 'Saldo insuficiente para completar la transacción'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor en el procesamiento de transacciones'
  });
});

// Middleware para rutas no encontradas
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'Ruta de transacciones no encontrada'
  });
});

module.exports = router;
