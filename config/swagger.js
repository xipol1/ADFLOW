// Build OpenAPI spec directly (no swagger-jsdoc — it has issues with Vercel serverless bundling)
// paths.json lives in config/ so Vercel nft bundles it (config/** is in includeFiles)
const apiPaths = require('./swaggerPaths.json').paths || {};

const spec = {
  openapi: '3.0.0',
  info: {
    title: 'ADFLOW API',
    version: '2.0.0',
    description:
      'Marketplace de publicidad en comunidades reales. Conecta anunciantes con creadores de canales en WhatsApp, Telegram, Discord, Instagram y mas.',
    contact: { name: 'ADFLOW Team', url: 'https://adflow-unified.vercel.app' },
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
          rol: { type: 'string', enum: ['creator', 'advertiser', 'admin'], example: 'creator' },
          createdAt: { type: 'string', format: 'date-time' },
        },
      },
      Channel: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          nombreCanal: { type: 'string', example: 'Tech News Daily' },
          plataforma: { type: 'string', enum: ['whatsapp', 'telegram', 'discord', 'instagram', 'newsletter', 'facebook'] },
          categoria: { type: 'string', example: 'tecnologia' },
          precio: { type: 'number', example: 50 },
          estado: { type: 'string', enum: ['pendiente_verificacion', 'activo', 'pausado', 'rechazado'] },
          verificado: { type: 'boolean', example: true },
          propietario: { type: 'string' },
        },
      },
      Campaign: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          advertiser: { type: 'string' },
          channel: { type: 'string' },
          content: { type: 'string' },
          targetUrl: { type: 'string', example: 'https://miapp.com/landing' },
          price: { type: 'number', example: 250 },
          netAmount: { type: 'number', example: 225 },
          status: { type: 'string', enum: ['DRAFT', 'PAID', 'PUBLISHED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED'] },
          trackingUrl: { type: 'string' },
          deadline: { type: 'string', format: 'date-time' },
        },
      },
      TrackingLink: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          code: { type: 'string', example: 'kHaZnvK' },
          targetUrl: { type: 'string' },
          type: { type: 'string', enum: ['campaign', 'verification', 'custom'] },
          stats: {
            type: 'object',
            properties: {
              totalClicks: { type: 'number', example: 245 },
              uniqueClicks: { type: 'number', example: 189 },
              devices: { type: 'object' },
              countries: { type: 'object' },
            },
          },
        },
      },
      Review: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          channel: { type: 'string' },
          campaign: { type: 'string' },
          reviewer: { type: 'string' },
          ratings: {
            type: 'object',
            properties: {
              overall: { type: 'number', minimum: 1, maximum: 5, example: 4 },
              communication: { type: 'number' },
              quality: { type: 'number' },
              timeliness: { type: 'number' },
              value: { type: 'number' },
            },
          },
          comment: { type: 'string' },
          response: { type: 'object', properties: { text: { type: 'string' }, respondedAt: { type: 'string', format: 'date-time' } } },
          helpful: { type: 'number' },
          status: { type: 'string', enum: ['active', 'flagged', 'removed'] },
        },
      },
      Dispute: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          campaign: { type: 'string' },
          reason: { type: 'string' },
          status: { type: 'string', enum: ['open', 'in_review', 'resolved', 'closed'] },
          messages: { type: 'array', items: { type: 'object' } },
        },
      },
      Notification: {
        type: 'object',
        properties: {
          _id: { type: 'string' },
          usuario: { type: 'string' },
          tipo: { type: 'string' },
          titulo: { type: 'string' },
          mensaje: { type: 'string' },
          leida: { type: 'boolean' },
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
  paths: apiPaths,
};

module.exports = spec;
