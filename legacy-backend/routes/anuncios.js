const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const anuncioController = require('../controllers/anuncioController');
const { 
  autenticar, 
  autorizarRoles, 
  requiereEmailVerificado,
  verificarPropietario 
} = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const { limitadorAPI, limitadorEndpoint } = require('../middleware/rateLimiter');

/**
 * Validaciones para crear anuncio
 */
const validacionesCrearAnuncio = [
  body('canal')
    .isMongoId()
    .withMessage('ID de canal no válido'),
  
  body('titulo')
    .notEmpty()
    .withMessage('El título es requerido')
    .isLength({ min: 5, max: 100 })
    .withMessage('El título debe tener entre 5 y 100 caracteres'),
  
  body('descripcion')
    .notEmpty()
    .withMessage('La descripción es requerida')
    .isLength({ min: 10, max: 1000 })
    .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  
  body('tipoAnuncio')
    .isIn(['publicacion_simple', 'publicacion_con_video', 'historia', 'mencion_especial', 'resena_producto', 'sorteo', 'colaboracion'])
    .withMessage('Tipo de anuncio no válido'),
  
  body('contenido.texto')
    .optional()
    .isLength({ max: 2000 })
    .withMessage('El texto del contenido no puede exceder 2000 caracteres'),
  
  body('contenido.hashtags')
    .optional()
    .isArray()
    .withMessage('Los hashtags deben ser un array'),
  
  body('contenido.menciones')
    .optional()
    .isArray()
    .withMessage('Las menciones deben ser un array'),
  
  body('contenido.archivosMultimedia')
    .optional()
    .isArray()
    .withMessage('Los archivos multimedia deben ser un array'),
  
  body('programacion.fechaInicio')
    .isISO8601()
    .withMessage('Fecha de inicio no válida')
    .custom((fecha) => {
      const fechaInicio = new Date(fecha);
      const ahora = new Date();
      if (fechaInicio <= ahora) {
        throw new Error('La fecha de inicio debe ser futura');
      }
      return true;
    }),
  
  body('programacion.fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin no válida')
    .custom((fechaFin, { req }) => {
      if (fechaFin && req.body.programacion && req.body.programacion.fechaInicio) {
        const inicio = new Date(req.body.programacion.fechaInicio);
        const fin = new Date(fechaFin);
        if (fin <= inicio) {
          throw new Error('La fecha de fin debe ser posterior a la fecha de inicio');
        }
      }
      return true;
    }),
  
  body('programacion.horaPreferida')
    .optional()
    .matches(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/)
    .withMessage('Formato de hora no válido (HH:MM)'),
  
  body('presupuesto.montoTotal')
    .isFloat({ min: 1 })
    .withMessage('El monto total debe ser mayor a 0'),
  
  body('presupuesto.moneda')
    .isIn(['USD', 'EUR', 'ARS', 'CLP', 'COP', 'MXN', 'PEN'])
    .withMessage('Moneda no válida'),
  
  body('audienciaObjetivo.edadMinima')
    .optional()
    .isInt({ min: 13, max: 100 })
    .withMessage('Edad mínima debe estar entre 13 y 100'),
  
  body('audienciaObjetivo.edadMaxima')
    .optional()
    .isInt({ min: 13, max: 100 })
    .withMessage('Edad máxima debe estar entre 13 y 100')
    .custom((edadMax, { req }) => {
      if (edadMax && req.body.audienciaObjetivo && req.body.audienciaObjetivo.edadMinima) {
        if (edadMax <= req.body.audienciaObjetivo.edadMinima) {
          throw new Error('La edad máxima debe ser mayor a la edad mínima');
        }
      }
      return true;
    }),
  
  body('audienciaObjetivo.genero')
    .optional()
    .isIn(['masculino', 'femenino', 'todos'])
    .withMessage('Género no válido'),
  
  body('audienciaObjetivo.ubicaciones')
    .optional()
    .isArray()
    .withMessage('Las ubicaciones deben ser un array'),
  
  body('audienciaObjetivo.intereses')
    .optional()
    .isArray()
    .withMessage('Los intereses deben ser un array'),
  
  body('objetivos.alcance')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El objetivo de alcance debe ser un número positivo'),
  
  body('objetivos.interacciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El objetivo de interacciones debe ser un número positivo'),
  
  body('objetivos.conversiones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El objetivo de conversiones debe ser un número positivo'),
  
  body('configuracionSeguimiento.pixelConversion')
    .optional()
    .isURL()
    .withMessage('URL del pixel de conversión no válida'),
  
  body('configuracionSeguimiento.codigoDescuento')
    .optional()
    .isLength({ min: 3, max: 20 })
    .withMessage('El código de descuento debe tener entre 3 y 20 caracteres')
];

/**
 * Validaciones para actualizar anuncio
 */
const validacionesActualizarAnuncio = [
  param('id')
    .isMongoId()
    .withMessage('ID de anuncio no válido'),
  
  body('titulo')
    .optional()
    .isLength({ min: 5, max: 100 })
    .withMessage('El título debe tener entre 5 y 100 caracteres'),
  
  body('descripcion')
    .optional()
    .isLength({ min: 10, max: 1000 })
    .withMessage('La descripción debe tener entre 10 y 1000 caracteres'),
  
  body('presupuesto.montoTotal')
    .optional()
    .isFloat({ min: 1 })
    .withMessage('El monto total debe ser mayor a 0')
];

/**
 * Validaciones para responder aprobación
 */
const validacionesRespuestaAprobacion = [
  param('id')
    .isMongoId()
    .withMessage('ID de anuncio no válido'),
  
  body('accion')
    .isIn(['aprobar', 'rechazar'])
    .withMessage('Acción no válida. Use "aprobar" o "rechazar"'),
  
  body('comentarios')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Los comentarios no pueden exceder 500 caracteres')
];

/**
 * Validaciones para completar anuncio
 */
const validacionesCompletarAnuncio = [
  param('id')
    .isMongoId()
    .withMessage('ID de anuncio no válido'),
  
  body('evidencia')
    .optional()
    .isArray()
    .withMessage('La evidencia debe ser un array de URLs'),
  
  body('evidencia.*')
    .optional()
    .isURL()
    .withMessage('Cada evidencia debe ser una URL válida')
];

/**
 * Validaciones para búsqueda
 */
const validacionesBusqueda = [
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
  
  query('estado')
    .optional()
    .isIn(['borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado', 'activo', 'pausado', 'completado', 'cancelado', 'expirado'])
    .withMessage('Estado no válido'),
  
  query('tipoAnuncio')
    .optional()
    .isIn(['publicacion_simple', 'publicacion_con_video', 'historia', 'mencion_especial', 'resena_producto', 'sorteo', 'colaboracion'])
    .withMessage('Tipo de anuncio no válido'),
  
  query('fechaInicio')
    .optional()
    .isISO8601()
    .withMessage('Fecha de inicio no válida'),
  
  query('fechaFin')
    .optional()
    .isISO8601()
    .withMessage('Fecha de fin no válida'),
  
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero positivo'),
  
  query('limite')
    .optional()
    .isInt({ min: 1, max: 50 })
    .withMessage('El límite debe estar entre 1 y 50')
];

/**
 * Validaciones para estadísticas
 */
const validacionesEstadisticas = [
  query('periodo')
    .optional()
    .isIn(['7d', '30d', '90d'])
    .withMessage('Período no válido')
];

// ==========================================
// RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
// ==========================================

/**
 * @route   POST /api/anuncios
 * @desc    Crear un nuevo anuncio
 * @access  Private (Solo anunciantes)
 */
router.post('/',
  limitadorEndpoint.crearAnuncio,
  autenticar,
  requiereEmailVerificado,
  autorizarRoles('advertiser'),
  validacionesCrearAnuncio,
  validarCampos,
  anuncioController.crearAnuncio
);

/**
 * @route   GET /api/anuncios/t/:id
 * @desc    Tracking de clics en anuncios
 * @access  Public
 */
router.get('/t/:id', anuncioController.trackClick);

/**
 * @route   POST /api/anuncios/c/:id
 * @desc    Tracking de conversiones
 * @access  Public
 */
router.post('/c/:id', anuncioController.trackConversion);

/**
 * @route   GET /api/anuncios
 * @desc    Obtener todos los anuncios (con filtros)
 * @access  Private
 */
router.get('/',
  limitadorAPI,
  autenticar,
  [
    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    
    query('limite')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe estar entre 1 y 50'),
    
    query('estado')
      .optional()
      .isIn(['borrador', 'pendiente_aprobacion', 'aprobado', 'rechazado', 'activo', 'pausado', 'completado', 'cancelado', 'expirado'])
      .withMessage('Estado no válido'),
    
    query('tipoAnuncio')
      .optional()
      .isIn(['publicacion_simple', 'publicacion_con_video', 'historia', 'mencion_especial', 'resena_producto', 'sorteo', 'colaboracion'])
      .withMessage('Tipo de anuncio no válido'),
    
    query('canal')
      .optional()
      .isMongoId()
      .withMessage('ID de canal no válido')
  ],
  validarCampos,
  anuncioController.obtenerMisAnuncios
);

/**
 * @route   GET /api/anuncios/creador
 * @desc    Obtener anuncios para un creador (sus canales)
 * @access  Private (Solo creadores)
 */
router.get('/creador',
  limitadorAPI,
  autenticar,
  autorizarRoles('creator'),
  [
    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    
    query('limite')
      .optional()
      .isInt({ min: 1, max: 50 })
      .withMessage('El límite debe estar entre 1 y 50'),
    
    query('estado')
      .optional()
      .isIn(['pendiente_aprobacion', 'aprobado', 'activo', 'completado'])
      .withMessage('Estado no válido'),
    
    query('tipoAnuncio')
      .optional()
      .isIn(['publicacion_simple', 'publicacion_con_video', 'historia', 'mencion_especial', 'resena_producto', 'sorteo', 'colaboracion'])
      .withMessage('Tipo de anuncio no válido')
  ],
  validarCampos,
  anuncioController.obtenerAnunciosParaCreador
);

/**
 * @route   GET /api/anuncios/estadisticas
 * @desc    Obtener estadísticas de anuncios
 * @access  Private
 */
router.get('/estadisticas',
  limitadorAPI,
  autenticar,
  validacionesEstadisticas,
  validarCampos,
  anuncioController.obtenerEstadisticas
);

/**
 * @route   GET /api/anuncios/:id
 * @desc    Obtener un anuncio específico
 * @access  Private
 */
router.get('/:id',
  limitadorAPI,
  autenticar,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de anuncio no válido')
  ],
  validarCampos,
  anuncioController.obtenerAnuncio
);

/**
 * @route   PUT /api/anuncios/:id
 * @desc    Actualizar un anuncio
 * @access  Private (Solo propietario)
 */
router.put('/:id',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  validacionesActualizarAnuncio,
  validarCampos,
  anuncioController.actualizarAnuncio
);

/**
 * @route   DELETE /api/anuncios/:id
 * @desc    Eliminar un anuncio
 * @access  Private (Solo propietario)
 */
router.delete('/:id',
  limitadorAPI,
  autenticar,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de anuncio no válido')
  ],
  validarCampos,
  anuncioController.eliminarAnuncio
);

/**
 * @route   POST /api/anuncios/:id/enviar-aprobacion
 * @desc    Enviar anuncio para aprobación
 * @access  Private (Solo propietario)
 */
router.post('/:id/enviar-aprobacion',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de anuncio no válido')
  ],
  validarCampos,
  anuncioController.enviarParaAprobacion
);

/**
 * @route   POST /api/anuncios/:id/responder-aprobacion
 * @desc    Aprobar o rechazar un anuncio
 * @access  Private (Solo propietario del canal)
 */
router.post('/:id/responder-aprobacion',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  autorizarRoles('creator'),
  validacionesRespuestaAprobacion,
  validarCampos,
  anuncioController.responderAprobacion
);

/**
 * @route   POST /api/anuncios/:id/activar
 * @desc    Activar un anuncio aprobado
 * @access  Private (Solo propietario)
 */
router.post('/:id/activar',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de anuncio no válido')
  ],
  validarCampos,
  anuncioController.activarAnuncio
);

/**
 * @route   POST /api/anuncios/:id/completar
 * @desc    Marcar anuncio como completado
 * @access  Private (Solo propietario del canal)
 */
router.post('/:id/completar',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  autorizarRoles('creator'),
  validacionesCompletarAnuncio,
  validarCampos,
  anuncioController.completarAnuncio
);

// ==========================================
// RUTAS DE ADMINISTRACIÓN
// ==========================================

/**
 * @route   GET /api/anuncios/admin/buscar
 * @desc    Buscar anuncios (para administradores)
 * @access  Private (Solo administradores)
 */
router.get('/admin/buscar',
  limitadorAPI,
  autenticar,
  autorizarRoles('admin'),
  validacionesBusqueda,
  validarCampos,
  anuncioController.buscarAnuncios
);

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================

/**
 * Middleware para manejar errores específicos de anuncios
 */
router.use((error, req, res, next) => {
  console.error('Error en rutas de anuncios:', error);
  
  // Error de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errores = Object.values(error.errors).map(err => ({
      campo: err.path,
      mensaje: err.message
    }));
    
    return res.status(400).json({
      success: false,
      message: 'Error de validación',
      errores
    });
  }
  
  // Error de cast (ID inválido)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID de anuncio no válido'
    });
  }
  
  // Error de saldo insuficiente
  if (error.message && error.message.includes('saldo insuficiente')) {
    return res.status(400).json({
      success: false,
      message: 'Saldo insuficiente para realizar esta operación'
    });
  }
  
  // Error de estado inválido
  if (error.message && error.message.includes('estado')) {
    return res.status(400).json({
      success: false,
      message: 'Operación no permitida en el estado actual del anuncio'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = router;
