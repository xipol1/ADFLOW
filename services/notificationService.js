const EventEmitter = require('events');
const Usuario = require('../models/Usuario');
const Notificacion = require('../models/Notificacion');
const emailService = require('./emailService');
const config = require('../config/config');

/**
 * Servicio de notificaciones
 */
class NotificationService extends EventEmitter {
  constructor() {
    super();
    this.io = null; // Instancia de Socket.IO
    this.conexionesWebSocket = new Map();
    this.configurarEventos();
  }

  /**
   * Configurar instancia de Socket.IO
   */
  configurarSocketIO(io) {
    this.io = io;
  }

  /**
   * Configurar eventos del sistema
   */
  configurarEventos() {
    // Eventos de usuario
    this.on('usuario.registrado', this.manejarUsuarioRegistrado.bind(this));
    this.on('usuario.verificado', this.manejarUsuarioVerificado.bind(this));
    
    // Eventos de anuncios
    this.on('anuncio.creado', this.manejarAnuncioCreado.bind(this));
    this.on('anuncio.aprobado', this.manejarAnuncioAprobado.bind(this));
    this.on('anuncio.rechazado', this.manejarAnuncioRechazado.bind(this));
    // this.on('anuncio.completado', this.manejarAnuncioCompletado.bind(this));
    
    // Eventos de transacciones
    this.on('transaccion.creada', this.manejarTransaccionCreada.bind(this));
    this.on('transaccion.completada', this.manejarTransaccionCompletada.bind(this));
    // this.on('transaccion.fallida', this.manejarTransaccionFallida.bind(this));
    
    // Eventos de canales
    // this.on('canal.aprobado', this.manejarCanalAprobado.bind(this));
    // this.on('canal.rechazado', this.manejarCanalRechazado.bind(this));
    
    // Eventos del sistema
    this.on('sistema.mantenimiento', this.manejarMantenimiento.bind(this));
    // this.on('sistema.actualizacion', this.manejarActualizacion.bind(this));
  }

  /**
   * Enviar notificación completa (base de datos + email + push + tiempo real)
   */
  async enviarNotificacion(datos) {
    try {
      const {
        usuarioId,
        tipo,
        titulo,
        mensaje,
        datos: datosAdicionales = {},
        prioridad = 'normal',
        canales = ['database', 'realtime'],
        programada = null
      } = datos;

      // Ensure DB is connected before any query
      const { ensureDb } = require('../lib/ensureDb');
      await ensureDb();

      // Validar usuario
      const usuario = await Usuario.findById(usuarioId);
      if (!usuario) {
        throw new Error('Usuario no encontrado');
      }

      // Verificar preferencias de notificación del usuario
      const preferencias = usuario.configuracion?.notificaciones || {};
      const canalesFiltrados = this.filtrarCanalesPorPreferencias(canales, preferencias, tipo);

      if (canalesFiltrados.length === 0) {
        return null;
      }

      // Crear notificación en base de datos
      let notificacion = null;
      if (canalesFiltrados.includes('database')) {
        notificacion = await this.crearNotificacionBD({
          usuarioId,
          tipo,
          titulo,
          mensaje,
          datos: datosAdicionales,
          prioridad,
          programada
        });
      }

      // Enviar por diferentes canales
      const resultados = {};

      // Notificación en tiempo real (WebSocket)
      if (canalesFiltrados.includes('realtime')) {
        resultados.realtime = await this.enviarTiempoReal(usuarioId, {
          id: notificacion?._id,
          tipo,
          titulo,
          mensaje,
          datos: datosAdicionales,
          timestamp: new Date()
        });
      }

      // Notificación por email
      if (canalesFiltrados.includes('email')) {
        resultados.email = await this.enviarEmail(usuario, {
          tipo,
          titulo,
          mensaje,
          datos: datosAdicionales
        });
      }

      // Notificación push
      if (canalesFiltrados.includes('push')) {
        resultados.push = await this.enviarPush(usuario, {
          tipo,
          titulo,
          mensaje,
          datos: datosAdicionales
        });
      }

      return {
        notificacion,
        resultados
      };
    } catch (error) {
      console.error('Error al enviar notificación:', error);
      throw error;
    }
  }

  /**
   * Crear notificación en base de datos
   */
  async crearNotificacionBD(datos) {
    try {
      const { ensureDb } = require('../lib/ensureDb');
      await ensureDb();

      const notificacion = new Notificacion({
        usuario: datos.usuarioId,
        tipo: datos.tipo,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        metadata: datos.datos || {},
        prioridad: datos.prioridad,
        leida: false,
        archivada: false
      });

      await notificacion.save();
      return notificacion;
    } catch (error) {
      console.error('Error al crear notificación en BD:', error);
      throw error;
    }
  }

  /**
   * Enviar notificación en tiempo real via WebSocket
   */
  async enviarTiempoReal(usuarioId, datos) {
    try {
      const conexion = this.conexionesWebSocket.get(usuarioId.toString());
      
      if (conexion && conexion.readyState === 1) { // WebSocket.OPEN
        conexion.send(JSON.stringify({
          tipo: 'notificacion',
          datos
        }));
        return { exito: true, canal: 'websocket' };
      }
      
      return { exito: false, razon: 'Usuario no conectado' };
    } catch (error) {
      console.error('Error al enviar notificación en tiempo real:', error);
      return { exito: false, error: error.message };
    }
  }

  /**
   * Enviar notificación por email
   */
  async enviarEmail(usuario, datos) {
    try {
      const plantillas = {
        'anuncio.creado': 'nuevo-anuncio',
        'anuncio.aprobado': 'aprobacion-anuncio',
        'anuncio.rechazado': 'aprobacion-anuncio',
        'transaccion.completada': 'notificacion-pago',
        'usuario.bienvenida': 'bienvenida',
        // ── Ciclo de vida de campañas → plantillas dedicadas ──────────────
        // Tipos verificados contra los call sites reales (campaignController,
        // campaignCron, partnerIntegrationService). `campana.expirada` y
        // `campana.recordatorio` NO tienen plantilla propia y caen a la
        // genérica a propósito: su `mensaje` ya es autoexplicativo.
        'campana.nueva': 'campana-creada',
        'campana.publicada': 'campana-publicada',
        'campana.pagada': 'campana-pagada',
        'campana.completada': 'campana-completada',
        'campana.cancelada': 'campana-cancelada',
        'campana.disponible': 'campana-disponible',
        'campana.auditada': 'campana-auditada'
      };

      let plantilla = plantillas[datos.tipo] || 'notificacion-generica';

      // Variables base disponibles para cualquier plantilla.
      let variables = {
        nombre: usuario.nombre,
        titulo: datos.titulo,
        mensaje: datos.mensaje,
        ...datos.datos
      };

      // Las plantillas campana-* son fragmentos con muchos {{campos}} (canal,
      // anunciante, precio, fechas, reembolso…) que la notificación NO
      // transporta — solo lleva un campaignId. Las enriquecemos con una
      // lectura de solo-lectura (sin escrituras ni cambios de estado). Si la
      // resolución falla, caemos a la genérica para no enviar un email con
      // tarjetas en blanco.
      if (plantilla.startsWith('campana-') && datos.datos?.campaignId) {
        const enriquecidas = await this.construirVariablesCampana(datos.tipo, usuario, datos.datos);
        if (enriquecidas) {
          variables = { ...variables, ...enriquecidas };
        } else {
          plantilla = 'notificacion-generica';
        }
      }

      // renderTemplate envuelve el fragmento en el layout base
      // (cabecera/pie/preheader) y elimina los {{placeholders}} sin resolver;
      // si el fichero no se puede cargar recurre internamente a
      // cargarPlantilla. Es el mismo renderizador que usan los métodos
      // dedicados enviarCampana* de emailService.
      const contenido = await emailService.renderTemplate(plantilla, variables);

      return await emailService.enviarEmail({
        para: usuario.email,
        asunto: datos.titulo,
        html: contenido
      });
    } catch (error) {
      console.error('Error al enviar notificación por email:', error);
      return { exito: false, error: error.message };
    }
  }

  /**
   * Construir las {{variables}} ricas que necesitan las plantillas campana-*.
   *
   * El payload de la notificación solo lleva un `campaignId`, pero las
   * plantillas esperan nombre de canal, anunciante, precio, fechas, reembolso,
   * etc. Las resolvemos con una lectura de SOLO LECTURA (Campaign + Canal +
   * Usuario): no hay escrituras ni transiciones de estado, solo presentación
   * del email. Devuelve `null` ante cualquier problema para que el llamante
   * recurra a la plantilla genérica.
   *
   * @param {string} tipo              tipo de notificación (p.ej. 'campana.nueva')
   * @param {object} usuario           destinatario (doc Usuario con _id/nombre)
   * @param {object} datosAdicionales  datos.datos de la notificación ({ campaignId, … })
   * @returns {Promise<object|null>}   variables para la plantilla, o null
   */
  async construirVariablesCampana(tipo, usuario, datosAdicionales = {}) {
    try {
      const { ensureDb } = require('../lib/ensureDb');
      await ensureDb();

      const Campaign = require('../models/Campaign');
      const Canal = require('../models/Canal');
      const { sanitizeChannelName } = require('../lib/channelName');

      const campaign = await Campaign.findById(datosAdicionales.campaignId).lean();
      if (!campaign) return null;

      // Entidades relacionadas (best-effort; las plantillas tienen fallback).
      const [canal, anunciante] = await Promise.all([
        campaign.channel
          ? Canal.findById(campaign.channel).select('nombreCanal identificadorCanal').lean()
          : null,
        campaign.advertiser
          ? Usuario.findById(campaign.advertiser).select('nombre').lean()
          : null
      ]);

      // Nunca servir markup envenenado (ver lib/channelName.js).
      const channelName =
        sanitizeChannelName(canal?.nombreCanal, canal?.identificadorCanal) ||
        campaign.waChannel?.name ||
        'tu canal';
      const advertiserName = anunciante?.nombre || 'Anunciante';
      const campaignUrl = `${config.frontend.url}/campanas/${campaign._id}`;
      const fmtPrice = (n) => emailService._formatPrice(n);
      const fmtDate = (d) => emailService._formatDate(d);
      const esAnunciante = String(usuario._id) === String(campaign.advertiser);

      switch (tipo) {
        // campana-creada → destinatario: creador/dueño del canal. El importe
        // relevante para él es lo que recibe (netAmount), igual que el `mensaje`
        // ("recibes €…"), no el bruto que paga el anunciante.
        case 'campana.nueva':
          return {
            creatorName: usuario.nombre,
            advertiserName,
            channelName,
            content: campaign.content || '',
            price: fmtPrice(campaign.netAmount || campaign.price),
            deadline: fmtDate(campaign.deadline),
            campaignUrl
          };

        // campana-publicada → destinatario: anunciante.
        case 'campana.publicada':
          return {
            advertiserName: usuario.nombre,
            channelName,
            publishedAt: fmtDate(campaign.publishedAt || new Date()),
            campaignUrl
          };

        // campana-pagada → destinatario: anunciante. Mostramos lo realmente
        // capturado en EUR cuando existe; si no, el precio de la campaña.
        case 'campana.pagada':
          return {
            advertiserName: usuario.nombre,
            channelName,
            price: fmtPrice(campaign.capturedAmount ?? campaign.price),
            campaignUrl
          };

        // campana-completada → destinatario: anunciante O creador. El neto del
        // creador es su parte (earnings de la notificación / creatorPayable);
        // para el anunciante el neto es el total que pagó.
        case 'campana.completada': {
          const neto = esAnunciante
            ? campaign.price
            : (datosAdicionales.earnings ?? campaign.creatorPayable ?? campaign.netAmount);
          return {
            nombre: usuario.nombre,
            channelName,
            price: fmtPrice(campaign.price),
            netAmount: fmtPrice(neto),
            stats: 'Estadísticas detalladas disponibles en tu panel.',
            campaignUrl
          };
        }

        // campana-cancelada → destinatario: dueño del canal. El reembolso
        // devuelve lo capturado; una campaña sin pagar (DRAFT) → 0. El motivo
        // no se persiste en el modelo, así que se usa el que venga o un default.
        case 'campana.cancelada':
          return {
            nombre: usuario.nombre,
            channelName,
            reason: datosAdicionales.reason || 'No especificado',
            refundAmount: fmtPrice(campaign.capturedAmount ?? 0)
          };

        // campana-auditada → destinatario: anunciante (o creador). Email del
        // resultado de la verificación/auditoría de una campaña publicada. El
        // resultado y la fecha pueden venir en datos.datos; si no, se derivan
        // del estado/entrega de la campaña.
        case 'campana.auditada':
          return {
            nombre: usuario.nombre,
            advertiserName,
            channelName,
            auditResult:
              datosAdicionales.auditResult ||
              (campaign.status === 'DISPUTED'
                ? 'Requiere revisión'
                : 'Publicación verificada correctamente'),
            auditDate: fmtDate(
              datosAdicionales.auditDate ||
              campaign.deliveryConfirmedAt ||
              campaign.publishedAt ||
              new Date()
            ),
            campaignUrl
          };

        // campana-disponible → destinatario: dueño del canal (variables en
        // español). presupuesto = lo que recibe el creador.
        case 'campana.disponible':
          return {
            nombre: usuario.nombre,
            nombreCanal: channelName,
            nombreAnunciante: advertiserName,
            tipoCampana: datosAdicionales.tipoCampana || 'Publicación patrocinada',
            presupuesto: fmtPrice(campaign.netAmount || campaign.price),
            fechaPropuesta: fmtDate(campaign.createdAt),
            linkCampana: campaignUrl
          };

        default:
          return null;
      }
    } catch (error) {
      console.error('construirVariablesCampana: no se pudieron resolver variables de campaña:', error?.message || error);
      return null;
    }
  }

  /**
   * Enviar notificación push
   */
  async enviarPush(usuario, datos) {
    try {
      // Aquí se integraría con un servicio de push notifications como Firebase FCM
      // Por ahora, simulamos el envío
      
      if (!usuario.tokensPush || usuario.tokensPush.length === 0) {
        return { exito: false, razon: 'Usuario sin tokens push' };
      }

      const payload = {
        notification: {
          title: datos.titulo,
          body: datos.mensaje,
          icon: '/icon-192x192.png',
          badge: '/badge-72x72.png',
          tag: datos.tipo,
          requireInteraction: datos.prioridad === 'alta'
        },
        data: {
          tipo: datos.tipo,
          ...datos.datos
        }
      };

      // Simular envío exitoso
      return { 
        exito: true, 
        tokensEnviados: usuario.tokensPush.length,
        payload 
      };
    } catch (error) {
      console.error('Error al enviar notificación push:', error);
      return { exito: false, error: error.message };
    }
  }

  /**
   * Filtrar canales según preferencias del usuario
   */
  filtrarCanalesPorPreferencias(canales, preferencias, _tipo) {
    const canalesFiltrados = [];

    for (const canal of canales) {
      switch (canal) {
        case 'email':
          if (preferencias.email !== false) {
            canalesFiltrados.push(canal);
          }
          break;
        case 'push':
          if (preferencias.push !== false) {
            canalesFiltrados.push(canal);
          }
          break;
        case 'sms':
          if (preferencias.sms === true) {
            canalesFiltrados.push(canal);
          }
          break;
        default:
          canalesFiltrados.push(canal);
      }
    }

    return canalesFiltrados;
  }

  /**
   * Registrar conexión WebSocket
   */
  registrarConexionWS(usuarioId, conexion) {
    this.conexionesWebSocket.set(usuarioId.toString(), conexion);
    
    conexion.on('close', () => {
      this.conexionesWebSocket.delete(usuarioId.toString());
    });
  }

  /**
   * Obtener notificaciones de un usuario
   */
  async obtenerNotificaciones(usuarioId, opciones = {}) {
    try {
      const {
        limite = 20,
        pagina = 1,
        soloNoLeidas = false,
        tipo = null,
        desde = null,
        hasta = null
      } = opciones;

      const filtros = { usuario: usuarioId };
      
      if (soloNoLeidas) {
        filtros.leida = false;
      }
      
      if (tipo) {
        filtros.tipo = tipo;
      }
      
      if (desde || hasta) {
        filtros.fechaCreacion = {};
        if (desde) filtros.fechaCreacion.$gte = new Date(desde);
        if (hasta) filtros.fechaCreacion.$lte = new Date(hasta);
      }

      const notificaciones = await Notificacion.find(filtros)
        .sort({ fechaCreacion: -1 })
        .limit(limite)
        .skip((pagina - 1) * limite)
        .lean();

      const total = await Notificacion.countDocuments(filtros);
      const noLeidas = await Notificacion.countDocuments({ 
        usuario: usuarioId, 
        leida: false 
      });

      return {
        notificaciones,
        paginacion: {
          total,
          pagina,
          limite,
          totalPaginas: Math.ceil(total / limite)
        },
        contadores: {
          noLeidas
        }
      };
    } catch (error) {
      console.error('Error al obtener notificaciones:', error);
      throw error;
    }
  }

  /**
   * Marcar notificación como leída
   */
  async marcarComoLeida(notificacionId, usuarioId) {
    try {
      const resultado = await Notificacion.findOneAndUpdate(
        { _id: notificacionId, usuario: usuarioId },
        { leida: true, fechaLectura: new Date() },
        { new: true }
      );

      return resultado;
    } catch (error) {
      console.error('Error al marcar notificación como leída:', error);
      throw error;
    }
  }

  /**
   * Marcar todas las notificaciones como leídas
   */
  async marcarTodasComoLeidas(usuarioId) {
    try {
      const resultado = await Notificacion.updateMany(
        { usuario: usuarioId, leida: false },
        { leida: true, fechaLectura: new Date() }
      );

      return resultado;
    } catch (error) {
      console.error('Error al marcar todas como leídas:', error);
      throw error;
    }
  }

  /**
   * Eliminar notificación
   */
  async eliminarNotificacion(notificacionId, usuarioId) {
    try {
      const resultado = await Notificacion.findOneAndDelete({
        _id: notificacionId,
        usuario: usuarioId
      });

      return resultado;
    } catch (error) {
      console.error('Error al eliminar notificación:', error);
      throw error;
    }
  }

  // Manejadores de eventos específicos

  async manejarUsuarioRegistrado(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.usuarioId,
      tipo: 'usuario.bienvenida',
      titulo: `¡Bienvenido a ${config.app.nombre}!`,
      mensaje: 'Tu cuenta ha sido creada exitosamente. No olvides verificar tu email.',
      canales: ['database', 'email'],
      prioridad: 'alta'
    });
  }

  async manejarUsuarioVerificado(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.usuarioId,
      tipo: 'usuario.verificado',
      titulo: '✅ Email verificado',
      mensaje: 'Tu email ha sido verificado exitosamente. Ya puedes usar todas las funciones de la plataforma.',
      canales: ['database', 'realtime'],
      prioridad: 'normal'
    });
  }

  async manejarAnuncioCreado(datos) {
    // Notificar a creadores relevantes
    const creadores = await Usuario.find({
      tipoUsuario: 'creador',
      activo: true,
      'configuracion.notificaciones.nuevosAnuncios': { $ne: false }
    });

    for (const creador of creadores) {
      await this.enviarNotificacion({
        usuarioId: creador._id,
        tipo: 'anuncio.creado',
        titulo: 'Nuevo anuncio disponible',
        mensaje: `Se ha publicado un nuevo anuncio: ${datos.titulo}`,
        datos: {
          anuncioId: datos.anuncioId,
          titulo: datos.titulo,
          presupuesto: datos.presupuesto
        },
        canales: ['database', 'realtime', 'email'],
        prioridad: 'normal'
      });
    }
  }

  async manejarAnuncioAprobado(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.anuncianteId,
      tipo: 'anuncio.aprobado',
      titulo: '✅ Anuncio aprobado',
      mensaje: `Tu anuncio "${datos.titulo}" ha sido aprobado y ya está visible.`,
      datos: {
        anuncioId: datos.anuncioId,
        titulo: datos.titulo
      },
      canales: ['database', 'realtime', 'email'],
      prioridad: 'alta'
    });
  }

  async manejarAnuncioRechazado(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.anuncianteId,
      tipo: 'anuncio.rechazado',
      titulo: '❌ Anuncio rechazado',
      mensaje: `Tu anuncio "${datos.titulo}" ha sido rechazado. Revisa los comentarios y vuelve a enviarlo.`,
      datos: {
        anuncioId: datos.anuncioId,
        titulo: datos.titulo,
        comentarios: datos.comentarios
      },
      canales: ['database', 'realtime', 'email'],
      prioridad: 'alta'
    });
  }

  async manejarTransaccionCreada(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.usuarioId,
      tipo: 'transaccion.creada',
      titulo: 'Transacción iniciada',
      mensaje: `Se ha iniciado una transacción por $${datos.monto}`,
      datos: {
        transaccionId: datos.transaccionId,
        monto: datos.monto,
        tipo: datos.tipo
      },
      canales: ['database', 'realtime'],
      prioridad: 'normal'
    });
  }

  async manejarTransaccionCompletada(datos) {
    await this.enviarNotificacion({
      usuarioId: datos.usuarioId,
      tipo: 'transaccion.completada',
      titulo: '💰 Pago completado',
      mensaje: `Tu ${datos.tipo} por $${datos.monto} ha sido procesado exitosamente.`,
      datos: {
        transaccionId: datos.transaccionId,
        monto: datos.monto,
        tipo: datos.tipo
      },
      canales: ['database', 'realtime', 'email'],
      prioridad: 'alta'
    });
  }

  async manejarMantenimiento(datos) {
    // Notificar a todos los usuarios activos
    const usuarios = await Usuario.find({ activo: true }).select('_id');
    
    for (const usuario of usuarios) {
      await this.enviarNotificacion({
        usuarioId: usuario._id,
        tipo: 'sistema.mantenimiento',
        titulo: '🔧 Mantenimiento programado',
        mensaje: datos.mensaje,
        datos: {
          fechaInicio: datos.fechaInicio,
          fechaFin: datos.fechaFin
        },
        canales: ['database', 'realtime'],
        prioridad: 'alta'
      });
    }
  }

  /**
   * Limpiar notificaciones antiguas
   */
  async limpiarNotificacionesAntiguas(diasAntiguedad = 30) {
    try {
      const fechaLimite = new Date();
      fechaLimite.setDate(fechaLimite.getDate() - diasAntiguedad);

      const resultado = await Notificacion.deleteMany({
        fechaCreacion: { $lt: fechaLimite },
        leida: true
      });

      return resultado;
    } catch (error) {
      console.error('Error al limpiar notificaciones antiguas:', error);
      throw error;
    }
  }

  /**
   * Obtener estadísticas de notificaciones
   */
  async obtenerEstadisticas() {
    try {
      const estadisticas = await Notificacion.aggregate([
        {
          $group: {
            _id: '$tipo',
            total: { $sum: 1 },
            leidas: { $sum: { $cond: ['$leida', 1, 0] } },
            noLeidas: { $sum: { $cond: ['$leida', 0, 1] } }
          }
        },
        {
          $project: {
            tipo: '$_id',
            total: 1,
            leidas: 1,
            noLeidas: 1,
            tasaLectura: { $divide: ['$leidas', '$total'] }
          }
        }
      ]);

      return estadisticas;
    } catch (error) {
      console.error('Error al obtener estadísticas:', error);
      throw error;
    }
  }
}

// Crear instancia singleton
const notificationService = new NotificationService();

module.exports = notificationService;
