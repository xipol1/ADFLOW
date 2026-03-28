const express = require('express');
const { body, query, param } = require('express-validator');
const rateLimit = require('express-rate-limit');
const NotificationController = require('../controllers/notificationController');
const { autenticar, autorizarRoles } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');

const router = express.Router();

// Rate limiting para notificaciones
const notificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 100, // máximo 100 requests por ventana
  message: {
    exito: false,
    mensaje: 'Demasiadas solicitudes de notificaciones. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting más estricto para operaciones de escritura
const writeNotificationLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutos
  max: 20, // máximo 20 operaciones de escritura por ventana
  message: {
    exito: false,
    mensaje: 'Demasiadas operaciones de notificaciones. Intenta de nuevo en 15 minutos.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Rate limiting para notificaciones masivas (solo admin)
const massNotificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hora
  max: 5, // máximo 5 notificaciones masivas por hora
  message: {
    exito: false,
    mensaje: 'Límite de notificaciones masivas alcanzado. Intenta de nuevo en 1 hora.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

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

const validarFiltrosNotificacion = [
  query('tipo')
    .optional()
    .isIn([
      'usuario.bienvenida', 'usuario.verificado', 'usuario.password_cambiado', 'usuario.login_sospechoso',
      'anuncio.creado', 'anuncio.aprobado', 'anuncio.rechazado', 'anuncio.completado', 'anuncio.cancelado',
      'anuncio.expirando', 'anuncio.nuevo_aplicante',
      'transaccion.creada', 'transaccion.completada', 'transaccion.fallida', 'transaccion.reembolso',
      'transaccion.pago_liberado',
      'canal.aprobado', 'canal.rechazado', 'canal.suspendido', 'canal.reactivado', 'canal.estadisticas',
      'sistema.mantenimiento', 'sistema.actualizacion', 'sistema.promocion', 'sistema.recordatorio',
      'moderacion.contenido_reportado', 'moderacion.accion_tomada', 'moderacion.advertencia',
      'soporte.ticket_creado', 'soporte.ticket_respondido', 'soporte.ticket_cerrado'
    ])
    .withMessage('Tipo de notificación inválido'),
  query('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta', 'critica'])
    .withMessage('Prioridad inválida'),
  query('leida')
    .optional()
    .isBoolean()
    .withMessage('El campo leída debe ser true o false'),
  query('archivada')
    .optional()
    .isBoolean()
    .withMessage('El campo archivada debe ser true o false')
];

const validarIdNotificacion = [
  param('id')
    .isMongoId()
    .withMessage('ID de notificación inválido')
];

const validarBusqueda = [
  query('termino')
    .notEmpty()
    .isLength({ min: 2, max: 100 })
    .withMessage('El término de búsqueda debe tener entre 2 y 100 caracteres')
    .trim()
    .escape()
];

const validarCrearNotificacion = [
  body('usuarioId')
    .isMongoId()
    .withMessage('ID de usuario inválido'),
  body('tipo')
    .isIn([
      'usuario.bienvenida', 'usuario.verificado', 'usuario.password_cambiado', 'usuario.login_sospechoso',
      'anuncio.creado', 'anuncio.aprobado', 'anuncio.rechazado', 'anuncio.completado', 'anuncio.cancelado',
      'anuncio.expirando', 'anuncio.nuevo_aplicante',
      'transaccion.creada', 'transaccion.completada', 'transaccion.fallida', 'transaccion.reembolso',
      'transaccion.pago_liberado',
      'canal.aprobado', 'canal.rechazado', 'canal.suspendido', 'canal.reactivado', 'canal.estadisticas',
      'sistema.mantenimiento', 'sistema.actualizacion', 'sistema.promocion', 'sistema.recordatorio',
      'moderacion.contenido_reportado', 'moderacion.accion_tomada', 'moderacion.advertencia',
      'soporte.ticket_creado', 'soporte.ticket_respondido', 'soporte.ticket_cerrado'
    ])
    .withMessage('Tipo de notificación inválido'),
  body('titulo')
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres')
    .trim(),
  body('mensaje')
    .notEmpty()
    .isLength({ min: 1, max: 1000 })
    .withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
    .trim(),
  body('datos')
    .optional()
    .isObject()
    .withMessage('Los datos deben ser un objeto válido'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta', 'critica'])
    .withMessage('Prioridad inválida'),
  body('fechaProgramada')
    .optional()
    .isISO8601()
    .withMessage('Fecha programada inválida')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('La fecha programada debe ser futura');
      }
      return true;
    }),
  body('fechaExpiracion')
    .optional()
    .isISO8601()
    .withMessage('Fecha de expiración inválida')
    .custom((value) => {
      if (value && new Date(value) <= new Date()) {
        throw new Error('La fecha de expiración debe ser futura');
      }
      return true;
    }),
  body('urlAccion')
    .optional()
    .isURL()
    .isLength({ max: 500 })
    .withMessage('URL de acción inválida'),
  body('textoAccion')
    .optional()
    .isLength({ max: 50 })
    .withMessage('El texto de acción no puede exceder 50 caracteres')
    .trim(),
  body('icono')
    .optional()
    .isLength({ max: 100 })
    .withMessage('El icono no puede exceder 100 caracteres')
    .trim(),
  body('color')
    .optional()
    .matches(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/)
    .withMessage('Color inválido (debe ser formato hexadecimal)')
];

const validarNotificacionMasiva = [
  body('filtroUsuarios')
    .optional()
    .isObject()
    .withMessage('El filtro de usuarios debe ser un objeto válido'),
  body('tipo')
    .isIn([
      'sistema.mantenimiento', 'sistema.actualizacion', 'sistema.promocion', 'sistema.recordatorio'
    ])
    .withMessage('Tipo de notificación masiva inválido'),
  body('titulo')
    .notEmpty()
    .isLength({ min: 1, max: 200 })
    .withMessage('El título debe tener entre 1 y 200 caracteres')
    .trim(),
  body('mensaje')
    .notEmpty()
    .isLength({ min: 1, max: 1000 })
    .withMessage('El mensaje debe tener entre 1 y 1000 caracteres')
    .trim(),
  body('datos')
    .optional()
    .isObject()
    .withMessage('Los datos deben ser un objeto válido'),
  body('prioridad')
    .optional()
    .isIn(['baja', 'normal', 'alta', 'critica'])
    .withMessage('Prioridad inválida'),
  body('fechaProgramada')
    .optional()
    .isISO8601()
    .withMessage('Fecha programada inválida'),
  body('canales')
    .optional()
    .isArray()
    .withMessage('Los canales deben ser un array')
    .custom((canales) => {
      const canalValidos = ['database', 'email', 'push', 'sms', 'realtime'];
      return canales.every(canal => canalValidos.includes(canal));
    })
    .withMessage('Canales inválidos')
];

// Rutas públicas (requieren autenticación)
router.use(autenticar);
router.use(notificationLimiter);

// Obtener notificaciones del usuario
router.get('/',
  validarPaginacion,
  validarFiltrosNotificacion,
  validarCampos,
  NotificationController.obtenerNotificaciones
);

// Obtener contador de notificaciones no leídas
router.get('/contador',
  NotificationController.contarNoLeidas
);

// Buscar notificaciones
router.get('/buscar',
  validarBusqueda,
  validarPaginacion,
  validarFiltrosNotificacion,
  validarCampos,
  NotificationController.buscarNotificaciones
);

// Obtener estadísticas de notificaciones
router.get('/estadisticas',
  NotificationController.obtenerEstadisticas
);

// Obtener notificación específica
router.get('/:id',
  validarIdNotificacion,
  validarCampos,
  NotificationController.obtenerNotificacion
);

// Marcar todas las notificaciones como leídas
router.put('/marcar-todas-leidas',
  writeNotificationLimiter,
  NotificationController.marcarTodasComoLeidas
);

// Marcar notificación como leída
router.put('/:id/marcar-leida',
  writeNotificationLimiter,
  validarIdNotificacion,
  validarCampos,
  NotificationController.marcarComoLeida
);

// Archivar notificación
router.put('/:id/archivar',
  writeNotificationLimiter,
  validarIdNotificacion,
  validarCampos,
  NotificationController.archivarNotificacion
);

// Eliminar notificación
router.delete('/:id',
  writeNotificationLimiter,
  validarIdNotificacion,
  validarCampos,
  NotificationController.eliminarNotificacion
);

// Rutas de administración (requieren rol de admin)
router.use(autorizarRoles(['admin', 'moderador']));

// Crear notificación individual
router.post('/',
  writeNotificationLimiter,
  validarCrearNotificacion,
  validarCampos,
  NotificationController.crearNotificacion
);

// Enviar notificación masiva
router.post('/masiva',
  massNotificationLimiter,
  validarNotificacionMasiva,
  validarCampos,
  NotificationController.enviarNotificacionMasiva
);

// Rutas de administración avanzada (solo admin)
router.use(autorizarRoles(['admin']));

// Limpiar notificaciones expiradas
router.delete('/mantenimiento/expiradas',
  NotificationController.limpiarExpiradas
);

// Limpiar notificaciones antiguas
router.delete('/mantenimiento/antiguas',
  query('dias')
    .optional()
    .isInt({ min: 1, max: 365 })
    .withMessage('Los días deben ser un número entre 1 y 365'),
  validarCampos,
  NotificationController.limpiarAntiguas
);

// Middleware de manejo de errores específico para notificaciones
router.use((error, req, res, next) => {
  console.error('Error en rutas de notificaciones:', error);
  
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
      mensaje: 'ID de notificación inválido'
    });
  }
  
  // Error de duplicado
  if (error.code === 11000) {
    return res.status(409).json({
      exito: false,
      mensaje: 'Notificación duplicada'
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