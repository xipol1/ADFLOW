const express = require('express');
const router = express.Router();
const { body, param, query } = require('express-validator');
const canalController = require('../controllers/canalController');
const { 
  autenticar, 
  autorizarRoles, 
  requiereEmailVerificado,
  verificarPropietario 
} = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const { limitadorAPI, limitadorEndpoint } = require('../middleware/rateLimiter');

/**
 * @route   POST /api/canales/register
 * @desc    Registrar un nuevo canal con scoring
 * @access  Private
 */
router.post('/register',
  limitadorEndpoint.crearCanal,
  autenticar,
  canalController.registerChannel
);

/**
 * Validaciones para crear canal
 */
const validacionesCrearCanal = [
  body('plataforma')
    .isIn(['telegram', 'whatsapp', 'instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin'])
    .withMessage('Plataforma no válida'),
  
  body('identificadorCanal')
    .notEmpty()
    .withMessage('El identificador del canal es requerido')
    .isLength({ min: 1, max: 100 })
    .withMessage('El identificador debe tener entre 1 y 100 caracteres'),
  
  body('nombreCanal')
    .notEmpty()
    .withMessage('El nombre del canal es requerido')
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('urlCanal')
    .optional()
    .isURL()
    .withMessage('La URL del canal no es válida'),
  
  body('categoria')
    .isIn([
      'entretenimiento', 'educacion', 'tecnologia', 'deportes', 'musica',
      'gaming', 'lifestyle', 'negocios', 'salud', 'viajes', 'comida',
      'moda', 'arte', 'ciencia', 'politica', 'noticias', 'otro'
    ])
    .withMessage('Categoría no válida'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  
  body('idiomas')
    .isArray({ min: 1 })
    .withMessage('Debe especificar al menos un idioma')
    .custom((idiomas) => {
      const idiomasValidos = ['es', 'en', 'pt', 'fr', 'de', 'it', 'zh', 'ja', 'ko', 'ar'];
      return idiomas.every(idioma => idiomasValidos.includes(idioma));
    })
    .withMessage('Uno o más idiomas no son válidos'),
  
  body('pais')
    .notEmpty()
    .withMessage('El país es requerido')
    .isLength({ min: 2, max: 2 })
    .withMessage('El código de país debe tener 2 caracteres'),
  
  body('ciudad')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El nombre de la ciudad no puede exceder 100 caracteres'),
  
  body('tarifas.publicacionSimple')
    .isFloat({ min: 0 })
    .withMessage('La tarifa de publicación simple debe ser un número positivo'),
  
  body('tarifas.publicacionConVideo')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La tarifa de publicación con video debe ser un número positivo'),
  
  body('tarifas.historia')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La tarifa de historia debe ser un número positivo'),
  
  body('tarifas.mencionEspecial')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La tarifa de mención especial debe ser un número positivo'),
  
  body('politicasContenido.aceptaContenidoComercial')
    .isBoolean()
    .withMessage('La política de contenido comercial debe ser verdadero o falso'),
  
  body('politicasContenido.categoriasProhibidas')
    .optional()
    .isArray()
    .withMessage('Las categorías prohibidas deben ser un array'),
  
  body('configuracionPublicacion.tiempoEntrega')
    .isInt({ min: 1, max: 168 })
    .withMessage('El tiempo de entrega debe estar entre 1 y 168 horas'),
  
  body('configuracionPublicacion.requiereAprobacion')
    .isBoolean()
    .withMessage('La configuración de aprobación debe ser verdadero o falso')
];

/**
 * Validaciones para actualizar canal
 */
const validacionesActualizarCanal = [
  param('id')
    .isMongoId()
    .withMessage('ID de canal no válido'),
  
  body('nombreCanal')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El nombre debe tener entre 2 y 100 caracteres'),
  
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres'),
  
  body('tarifas.publicacionSimple')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('La tarifa debe ser un número positivo')
];

/**
 * Validaciones para búsqueda
 */
const validacionesBusqueda = [
  query('q')
    .optional()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres'),
  
  query('plataforma')
    .optional()
    .isIn(['telegram', 'whatsapp', 'instagram', 'youtube', 'tiktok', 'facebook', 'twitter', 'linkedin'])
    .withMessage('Plataforma no válida'),
  
  query('categoria')
    .optional()
    .isIn([
      'entretenimiento', 'educacion', 'tecnologia', 'deportes', 'musica',
      'gaming', 'lifestyle', 'negocios', 'salud', 'viajes', 'comida',
      'moda', 'arte', 'ciencia', 'politica', 'noticias', 'otro'
    ])
    .withMessage('Categoría no válida'),
  
  query('ordenPor')
    .optional()
    .isIn(['relevancia', 'seguidores', 'engagement', 'precio_asc', 'precio_desc', 'fecha'])
    .withMessage('Criterio de ordenamiento no válido'),
  
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
 * Validaciones para calificación
 */
const validacionesCalificacion = [
  param('id')
    .isMongoId()
    .withMessage('ID de canal no válido'),
  
  body('puntuacion')
    .isFloat({ min: 1, max: 5 })
    .withMessage('La puntuación debe estar entre 1 y 5'),
  
  body('comentario')
    .optional()
    .isLength({ max: 500 })
    .withMessage('El comentario no puede exceder 500 caracteres')
];

/**
 * Validaciones para estadísticas
 */
const validacionesEstadisticas = [
  param('id')
    .isMongoId()
    .withMessage('ID de canal no válido'),
  
  body('estadisticas.seguidores')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El número de seguidores debe ser un entero positivo'),
  
  body('estadisticas.publicaciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El número de publicaciones debe ser un entero positivo'),
  
  body('estadisticas.interacciones')
    .optional()
    .isInt({ min: 0 })
    .withMessage('El número de interacciones debe ser un entero positivo')
];

// ==========================================
// RUTAS PÚBLICAS
// ==========================================

/**
 * @route   GET /api/canales/buscar
 * @desc    Buscar canales públicos
 * @access  Public
 */
router.get('/buscar', 
  limitadorAPI,
  validacionesBusqueda,
  validarCampos,
  canalController.buscarCanales
);

/**
 * @route   GET /api/canales/:id
 * @desc    Obtener información de un canal específico
 * @access  Public/Private (depende del estado del canal)
 */
router.get('/:id',
  limitadorAPI,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de canal no válido')
  ],
  validarCampos,
  autenticar, // Token opcional para canales públicos
  canalController.obtenerCanal
);

// ==========================================
// RUTAS PROTEGIDAS - REQUIEREN AUTENTICACIÓN
// ==========================================

/**
 * @route   POST /api/canales
 * @desc    Crear un nuevo canal
 * @access  Private (Solo creadores)
 */
router.post('/',
  limitadorEndpoint.crearCanal,
  autenticar,
  requiereEmailVerificado,
  autorizarRoles('creator'),
  validacionesCrearCanal,
  validarCampos,
  canalController.crearCanal
);

/**
 * @route   GET /api/canales
 * @desc    Obtener todos los canales del usuario autenticado
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
      .isIn(['pendiente_verificacion', 'activo', 'suspendido', 'rechazado'])
      .withMessage('Estado no válido')
  ],
  validarCampos,
  canalController.obtenerMisCanales
);

/**
 * @route   PUT /api/canales/:id
 * @desc    Actualizar información de un canal
 * @access  Private (Solo propietario)
 */
router.put('/:id',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  validacionesActualizarCanal,
  validarCampos,
  verificarPropietario('Canal'),
  canalController.actualizarCanal
);

/**
 * @route   DELETE /api/canales/:id
 * @desc    Eliminar un canal
 * @access  Private (Solo propietario)
 */
router.delete('/:id',
  limitadorAPI,
  autenticar,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de canal no válido')
  ],
  validarCampos,
  verificarPropietario('Canal'),
  canalController.eliminarCanal
);

/**
 * @route   PUT /api/canales/:id/estadisticas
 * @desc    Actualizar estadísticas de un canal
 * @access  Private (Solo propietario)
 */
router.put('/:id/estadisticas',
  limitadorAPI,
  autenticar,
  validacionesEstadisticas,
  validarCampos,
  verificarPropietario('Canal'),
  canalController.actualizarEstadisticas
);

/**
 * @route   POST /api/canales/:id/calificar
 * @desc    Calificar un canal
 * @access  Private
 */
router.post('/:id/calificar',
  limitadorAPI,
  autenticar,
  requiereEmailVerificado,
  validacionesCalificacion,
  validarCampos,
  canalController.calificarCanal
);

/**
 * @route   GET /api/canales/:id/estadisticas
 * @desc    Obtener estadísticas detalladas de un canal
 * @access  Private (Solo propietario)
 */
router.get('/:id/estadisticas',
  limitadorAPI,
  autenticar,
  [
    param('id')
      .isMongoId()
      .withMessage('ID de canal no válido'),
    
    query('periodo')
      .optional()
      .isIn(['7d', '30d', '90d'])
      .withMessage('Período no válido')
  ],
  validarCampos,
  verificarPropietario('Canal'),
  canalController.obtenerEstadisticas
);

// ==========================================
// RUTAS DE ADMINISTRACIÓN
// ==========================================

/**
 * @route   PUT /api/canales/:id/estado
 * @desc    Cambiar estado de un canal (aprobar, rechazar, suspender)
 * @access  Private (Solo administradores)
 */
router.put('/:id/estado',
  limitadorAPI,
  autenticar,
  autorizarRoles('admin'),
  [
    param('id')
      .isMongoId()
      .withMessage('ID de canal no válido'),
    
    body('estado')
      .isIn(['pendiente_verificacion', 'activo', 'suspendido', 'rechazado'])
      .withMessage('Estado no válido'),
    
    body('razon')
      .optional()
      .isLength({ max: 500 })
      .withMessage('La razón no puede exceder 500 caracteres')
  ],
  validarCampos,
  canalController.cambiarEstado
);

/**
 * @route   GET /api/canales/admin/moderacion
 * @desc    Obtener canales pendientes de moderación
 * @access  Private (Solo administradores)
 */
router.get('/admin/moderacion',
  limitadorAPI,
  autenticar,
  autorizarRoles('admin'),
  [
    query('estado')
      .optional()
      .isIn(['pendiente_verificacion', 'activo', 'suspendido', 'rechazado'])
      .withMessage('Estado no válido'),
    
    query('pagina')
      .optional()
      .isInt({ min: 1 })
      .withMessage('La página debe ser un número entero positivo'),
    
    query('limite')
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage('El límite debe estar entre 1 y 100')
  ],
  validarCampos,
  canalController.obtenerCanalesParaModeracion
);

// ==========================================
// MIDDLEWARE DE MANEJO DE ERRORES
// ==========================================

/**
 * Middleware para manejar errores específicos de canales
 */
router.use((error, req, res, next) => {
  console.error('Error en rutas de canales:', error);
  
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
  
  // Error de duplicado (canal ya existe)
  if (error.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'Ya existe un canal con estos datos'
    });
  }
  
  // Error de cast (ID inválido)
  if (error.name === 'CastError') {
    return res.status(400).json({
      success: false,
      message: 'ID de canal no válido'
    });
  }
  
  // Error genérico
  res.status(500).json({
    success: false,
    message: 'Error interno del servidor'
  });
});

module.exports = router;
