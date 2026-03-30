const swaggerJsdoc = require('swagger-jsdoc');
const _swaggerPaths = require('../docs/swagger/paths.json');
const yamlPaths = (_swaggerPaths && _swaggerPaths.paths) ? _swaggerPaths.paths : {};

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'ADFLOW API',
      version: '2.0.0',
      description:
        'Marketplace de publicidad en comunidades reales. Conecta anunciantes con creadores de canales en WhatsApp, Telegram, Discord, Instagram y mas.',
      contact: {
        name: 'ADFLOW Team',
        url: 'https://adflow-unified.vercel.app',
      },
    },
    servers: [
      { url: 'https://adflow-unified.vercel.app', description: 'Production' },
      { url: 'http://localhost:5000', description: 'Development' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: { type: 'http', scheme: 'bearer', bearerFormat: 'JWT' },
        partnerApiKey: { type: 'apiKey', in: 'header', name: 'x-api-key' },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            success: { type: 'boolean', example: false },
            message: { type: 'string' },
          },
        },
        User: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            nombre: { type: 'string', example: 'Juan Perez' },
            email: { type: 'string', example: 'juan@example.com' },
            rol: { type: 'string', enum: ['anunciante', 'creador', 'admin'], example: 'creador' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Channel: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            nombre: { type: 'string', example: 'Tech News Daily' },
            plataforma: { type: 'string', enum: ['whatsapp', 'telegram', 'discord', 'instagram', 'otro'], example: 'telegram' },
            categoria: { type: 'string', example: 'tecnologia' },
            suscriptores: { type: 'number', example: 15000 },
            precio: { type: 'number', example: 50 },
            estado: { type: 'string', enum: ['pendiente', 'activo', 'pausado', 'rechazado'], example: 'activo' },
            verificado: { type: 'boolean', example: true },
            descripcion: { type: 'string', example: 'Canal de noticias tecnologicas con audiencia activa' },
            owner: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
          },
        },
        Campaign: {
          type: 'object',
          properties: {
            _id: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            titulo: { type: 'string', example: 'Lanzamiento App Fitness' },
            descripcion: { type: 'string', example: 'Promocion de nueva app de ejercicios' },
            presupuesto: { type: 'number', example: 500 },
            estado: {
              type: 'string',
              enum: ['borrador', 'pendiente', 'confirmada', 'publicada', 'completada', 'cancelada'],
              example: 'pendiente',
            },
            canal: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            anunciante: { type: 'string', example: '664f1a2b3c4d5e6f7a8b9c0d' },
            targetUrl: { type: 'string', example: 'https://miapp.com/landing' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        TrackingLink: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            code: { type: 'string', example: 'abc123' },
            targetUrl: { type: 'string', example: 'https://example.com' },
            type: { type: 'string', enum: ['campaign', 'verification', 'custom'], example: 'verification' },
            channel: { type: 'string' },
            active: { type: 'boolean', example: true },
            stats: {
              type: 'object',
              properties: {
                totalClicks: { type: 'number', example: 245 },
                uniqueClicks: { type: 'number', example: 189 },
                lastClickAt: { type: 'string', format: 'date-time' },
              },
            },
          },
        },
        Dispute: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            campaign: { type: 'string' },
            initiator: { type: 'string' },
            reason: { type: 'string', example: 'El anuncio no fue publicado en el horario acordado' },
            status: { type: 'string', enum: ['open', 'in_review', 'resolved', 'closed'], example: 'open' },
            resolution: { type: 'string' },
            messages: {
              type: 'array',
              items: {
                type: 'object',
                properties: {
                  sender: { type: 'string' },
                  text: { type: 'string' },
                  createdAt: { type: 'string', format: 'date-time' },
                },
              },
            },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        List: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            nombre: { type: 'string', example: 'Canales de Tecnologia' },
            user: { type: 'string' },
            channels: { type: 'array', items: { type: 'string' } },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        AutoBuyRule: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            nombre: { type: 'string', example: 'Auto-compra Telegram Tech' },
            filtros: {
              type: 'object',
              properties: {
                plataforma: { type: 'string', example: 'telegram' },
                categorias: { type: 'array', items: { type: 'string' }, example: ['tecnologia'] },
                precioMax: { type: 'number', example: 100 },
                suscriptoresMin: { type: 'number', example: 5000 },
              },
            },
            presupuestoMax: { type: 'number', example: 500 },
            activo: { type: 'boolean', example: true },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Review: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            channel: { type: 'string' },
            campaign: { type: 'string' },
            reviewer: { type: 'string' },
            rating: { type: 'number', minimum: 1, maximum: 5, example: 4 },
            comment: { type: 'string', example: 'Excelente alcance y engagement' },
            response: { type: 'string', example: 'Gracias por tu resena!' },
            helpful: { type: 'number', example: 12 },
            reported: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Transaction: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            tipo: { type: 'string', enum: ['pago', 'cobro', 'reembolso'], example: 'pago' },
            monto: { type: 'number', example: 50 },
            estado: { type: 'string', enum: ['pendiente', 'completada', 'fallida', 'reembolsada'], example: 'completada' },
            campaign: { type: 'string' },
            user: { type: 'string' },
            stripePaymentIntent: { type: 'string' },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
        Notification: {
          type: 'object',
          properties: {
            _id: { type: 'string' },
            user: { type: 'string' },
            tipo: { type: 'string', example: 'campaign_update' },
            titulo: { type: 'string', example: 'Campana confirmada' },
            mensaje: { type: 'string', example: 'Tu campana ha sido confirmada por el creador' },
            leida: { type: 'boolean', example: false },
            createdAt: { type: 'string', format: 'date-time' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Autenticacion y gestion de sesiones' },
      { name: 'Channels', description: 'Canales publicos del marketplace' },
      { name: 'My Channels', description: 'Gestion de canales propios (creator)' },
      { name: 'Campaigns', description: 'Campanas publicitarias' },
      { name: 'Tracking', description: 'Links trackeables y verificacion' },
      { name: 'Disputes', description: 'Sistema de disputas' },
      { name: 'Lists', description: 'Listas de favoritos' },
      { name: 'AutoBuy', description: 'Reglas de compra automatica' },
      { name: 'Reviews', description: 'Resenas y valoraciones' },
      { name: 'Transactions', description: 'Transacciones financieras' },
      { name: 'Statistics', description: 'Estadisticas y analytics' },
      { name: 'Notifications', description: 'Notificaciones' },
      { name: 'Files', description: 'Gestion de archivos' },
      { name: 'Partner API', description: 'API para partners externos' },
      { name: 'Health', description: 'Health checks' },
    ],
  },
  apis: ['./routes/*.js'],
};

const spec = swaggerJsdoc(options);
// Merge YAML paths into the generated spec
if (yamlPaths && Object.keys(yamlPaths).length > 0) {
  spec.paths = { ...spec.paths, ...yamlPaths };
}

module.exports = spec;
