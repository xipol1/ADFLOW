const express = require('express');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const FileController = require('../controllers/fileController');
const FileService = require('../services/fileService');
const { autenticar, autorizarRoles } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');

const router = express.Router();
const fileService = new FileService();

// Rate limiting para archivos
const fileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 50, // máximo 50 requests por ventana
  message: {
    exito: false,
    mensaje: 'Demasiadas solicitudes de archivos. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting más estricto para uploads
const uploadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 10, // máximo 10 uploads por ventana
  message: {
    exito: false,
    mensaje: 'Demasiados uploads. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para descargas
const downloadLimiter = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutos
  max: 100, // máximo 100 descargas por ventana
  message: {
    exito: false,
    mensaje: 'Demasiadas descargas. Intenta de nuevo en 5 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Configuración de multer para diferentes tipos de archivos
const uploadGeneral = fileService.getMulterConfig('general');
const uploadImage = fileService.getMulterConfig('image');
const uploadDocument = fileService.getMulterConfig('document');
const uploadAvatar = fileService.getMulterConfig('avatar');

// Validaciones
const validarPaginacion = [
  query('pagina')
    .optional()
    .isInt({ min: 1 })
    .withMessage('La página debe ser un número entero mayor a 0'),
  query('limite')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('El límite debe ser un número entre 1 y 100')
];

const validarFiltrosArchivo = [
  query('categoria')
    .optional()
    .isIn(['general', 'imagen', 'documento', 'avatar', 'anuncio', 'perfil', 'verificacion', 'soporte', 'temporal'])
    .withMessage('Categoría inválida'),
  query('tipoMime')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Tipo MIME inválido'),
  query('busqueda')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Término de búsqueda inválido')
    .trim()
    .escape(),
  query('ordenPor')
    .optional()
    .isIn(['fechaSubida', 'nombreOriginal', 'tamano', 'categoria'])
    .withMessage('Campo de ordenamiento inválido'),
  query('orden')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Orden inválido')
];

const validarIdArchivo = [
  param('id')
    .isMongoId()
    .withMessage('ID de archivo inválido')
];

const validarBusqueda = [
  query('termino')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim()
    .escape()
];

const validarActualizarArchivo = [
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('categoria')
    .optional()
    .isIn(['general', 'imagen', 'documento', 'avatar', 'anuncio', 'perfil', 'verificacion', 'soporte'])
    .withMessage('Categoría inválida'),
  body('esPublico')
    .optional()
    .isBoolean()
    .withMessage('El campo esPublico debe ser true o false'),
  body('etiquetas')
    .optional()
    .isArray()
    .withMessage('Las etiquetas deben ser un array')
    .custom((etiquetas) => {
      if (etiquetas.length > 10) {
        throw new Error('Máximo 10 etiquetas permitidas');
      }
      return etiquetas.every(etiqueta => 
        typeof etiqueta === 'string' && 
        etiqueta.length <= 50
      );
    })
    .withMessage('Cada etiqueta debe ser una cadena de máximo 50 caracteres')
];

const validarParametrosUpload = [
  body('categoria')
    .optional()
    .isIn(['general', 'imagen', 'documento', 'avatar', 'anuncio', 'perfil', 'verificacion', 'soporte'])
    .withMessage('Categoría inválida'),
  body('descripcion')
    .optional()
    .isLength({ max: 500 })
    .withMessage('La descripción no puede exceder 500 caracteres')
    .trim(),
  body('esPublico')
    .optional()
    .isBoolean()
    .withMessage('El campo esPublico debe ser true o false'),
  body('procesarImagenes')
    .optional()
    .isBoolean()
    .withMessage('El campo procesarImagenes debe ser true o false')
];

// Middleware para manejar errores de multer
const handleMulterError = (error, req, res, next) => {
  if (error) {
    console.error('Error de multer:', error);
    
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({
        exito: false,
        mensaje: 'Archivo demasiado grande',
        detalles: `Tamaño máximo permitido: ${fileService.maxFileSize / 1048576}MB`
      });
    }
    
    if (error.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({
        exito: false,
        mensaje: 'Demasiados archivos',
        detalles: 'Máximo 5 archivos por solicitud'
      });
    }
    
    if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({
        exito: false,
        mensaje: 'Campo de archivo inesperado',
        detalles: 'Verifica el nombre del campo del archivo'
      });
    }
    
    return res.status(400).json({
      exito: false,
      mensaje: error.message || 'Error al procesar archivo'
    });
  }
  
  next();
};

// Rutas públicas (sin autenticación) para archivos públicos
router.get('/publico/:id',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.obtenerArchivo
);

router.get('/publico/:id/thumbnail',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.obtenerThumbnail
);

// Rutas que requieren autenticación
router.use(autenticar);
router.use(fileLimiter);

// Subir archivos generales
router.post('/upload',
  uploadLimiter,
  uploadGeneral.array('archivos', 5),
  handleMulterError,
  validarParametrosUpload,
  validarCampos,
  FileController.subirArchivos
);

// Subir imágenes
router.post('/upload/imagen',
  uploadLimiter,
  uploadImage.array('imagenes', 5),
  handleMulterError,
  validarParametrosUpload,
  validarCampos,
  FileController.subirArchivos
);

// Subir documentos
router.post('/upload/documento',
  uploadLimiter,
  uploadDocument.array('documentos', 3),
  handleMulterError,
  validarParametrosUpload,
  validarCampos,
  FileController.subirArchivos
);

// Subir avatar
router.post('/upload/avatar',
  uploadLimiter,
  uploadAvatar.single('avatar'),
  handleMulterError,
  body('categoria').default('avatar'),
  validarParametrosUpload,
  validarCampos,
  FileController.subirArchivos
);

// Listar archivos del usuario
router.get('/',
  validarPaginacion,
  validarFiltrosArchivo,
  validarCampos,
  FileController.listarArchivos
);

// Buscar archivos
router.get('/buscar',
  validarBusqueda,
  validarPaginacion,
  validarFiltrosArchivo,
  validarCampos,
  FileController.buscarArchivos
);

// Obtener estadísticas de archivos
router.get('/estadisticas',
  FileController.obtenerEstadisticas
);

// Obtener información de archivo específico
router.get('/:id/info',
  validarIdArchivo,
  validarCampos,
  FileController.obtenerInfoArchivo
);

// Obtener archivo
router.get('/:id',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.obtenerArchivo
);

// Descargar archivo
router.get('/:id/download',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.descargarArchivo
);

// Obtener thumbnail
router.get('/:id/thumbnail',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.obtenerThumbnail
);

// Obtener versión optimizada
router.get('/:id/optimized',
  downloadLimiter,
  validarIdArchivo,
  validarCampos,
  FileController.obtenerArchivo // Usar el mismo controlador pero con lógica para optimizado
);

// Actualizar archivo
router.put('/:id',
  validarIdArchivo,
  validarActualizarArchivo,
  validarCampos,
  FileController.actualizarArchivo
);

// Eliminar archivo
router.delete('/:id',
  validarIdArchivo,
  validarCampos,
  FileController.eliminarArchivo
);

// Rutas de administración
router.use('/admin', autorizarRoles(['admin']));

// Limpiar archivos temporales
router.delete('/admin/limpiar/temporales',
  query('horas')
    .optional()
    .isInt({ min: 1, max: 168 })
    .withMessage('Las horas deben ser un número entre 1 y 168 (1 semana)'),
  validarCampos,
  FileController.limpiarTemporales
);

// Limpiar archivos expirados
router.delete('/admin/limpiar/expirados',
  FileController.limpiarExpirados
);

// Obtener estadísticas globales (solo admin)
router.get('/admin/estadisticas/globales',
  async (req, res) => {
    try {
      const estadisticas = await Archivo.aggregate([
        {
          $group: {
            _id: null,
            totalArchivos: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' },
            totalDescargas: { $sum: '$estadisticas.descargas' },
            totalVistas: { $sum: '$estadisticas.vistas' }
          }
        },
        {
          $project: {
            _id: 0,
            totalArchivos: 1,
            tamanoTotal: 1,
            tamanoTotalGB: { $divide: ['$tamanoTotal', 1073741824] },
            totalDescargas: 1,
            totalVistas: 1
          }
        }
      ]);

      const estadisticasPorCategoria = await Archivo.aggregate([
        {
          $group: {
            _id: '$categoria',
            cantidad: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' }
          }
        },
        { $sort: { cantidad: -1 } }
      ]);

      const estadisticasPorTipo = await Archivo.aggregate([
        {
          $group: {
            _id: '$tipoMime',
            cantidad: { $sum: 1 },
            tamanoTotal: { $sum: '$tamano' }
          }
        },
        { $sort: { cantidad: -1 } },
        { $limit: 10 }
      ]);

      res.json({
        exito: true,
        datos: {
          resumen: estadisticas[0] || {
            totalArchivos: 0,
            tamanoTotal: 0,
            tamanoTotalGB: 0,
            totalDescargas: 0,
            totalVistas: 0
          },
          porCategoria: estadisticasPorCategoria,
          porTipo: estadisticasPorTipo
        }
      });

    } catch (error) {
      console.error('Error al obtener estadísticas globales:', error);
      res.status(500).json({
        exito: false,
        mensaje: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      });
    }
  }
);

// Middleware de manejo de errores específico para archivos
router.use((error, req, res, next) => {
  console.error('Error en rutas de archivos:', error);
  
  // Errores de validación de Mongoose
  if (error.name === 'ValidationError') {
    const errores = Object.values(error.errors).map(err => ({
      campo: err.path,
      mensaje: err.message
    }));
    
    return res.status(400).json({
      exito: false,
      mensaje: 'Error de validación',
      errores
    });
  }
  
  // Error de cast (ID inválido)
  if (error.name === 'CastError') {
    return res.status(400).json({
      exito: false,
      mensaje: 'ID de archivo inválido'
    });
  }
  
  // Error de archivo no encontrado
  if (error.code === 'ENOENT') {
    return res.status(404).json({
      exito: false,
      mensaje: 'Archivo físico no encontrado'
    });
  }
  
  // Error de espacio insuficiente
  if (error.code === 'ENOSPC') {
    return res.status(507).json({
      exito: false,
      mensaje: 'Espacio insuficiente en el servidor'
    });
  }
  
  // Error de permisos
  if (error.code === 'EACCES') {
    return res.status(403).json({
      exito: false,
      mensaje: 'Permisos insuficientes para acceder al archivo'
    });
  }
  
  // Error de límite de rate
  if (error.status === 429) {
    return res.status(429).json({
      exito: false,
      mensaje: 'Demasiadas solicitudes. Intenta de nuevo más tarde.'
    });
  }
  
  // Error genérico
  res.status(500).json({
    exito: false,
    mensaje: 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined
  });
});

module.exports = router;