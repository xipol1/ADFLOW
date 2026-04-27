require('dotenv').config();

// Use public DNS to resolve MongoDB Atlas SRV records (Movistar router DNS fails)
const dns = require('dns');
if (process.env.NODE_ENV !== 'production') {
  dns.setServers(['8.8.8.8', '8.8.4.4', '1.1.1.1']);
}

const http = require('http');
const app = require('./app');
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const database = require('./config/database');

// ==========================================
// INICIALIZACIÓN DEL SERVIDOR
// ==========================================

async function startServer() {
  try {
    const PORT = process.env.PORT || 5000;
    const ENV = process.env.NODE_ENV || 'development';
    const fatalPath = path.join(__dirname, '_server_fatal.log');

    const logFatal = (error) => {
      const msg = `${new Date().toISOString()} ${error?.stack || String(error)}\n`;
      try {
        fs.appendFileSync(fatalPath, msg);
      } catch (e) {
        console.error('Error escribiendo _server_fatal.log:', e?.message || e);
      }
      console.error(msg);
    };

    process.on('uncaughtException', logFatal);
    process.on('unhandledRejection', logFatal);

    const { validateEnv } = require('./config/validateEnv');
    validateEnv({ strict: ENV === 'production' });
    if (process.env.DATABASE_URL && !process.env.MONGODB_URI) console.warn('DATABASE_URL definida pero falta MONGODB_URI');
    if (!process.env.STRIPE_SECRET_KEY) console.warn('Falta STRIPE_SECRET_KEY');

    const connectDB = async () => {
      try {
        const ok = await database.conectar();
        if (!ok) {
          const last = database.getLastConnectionError?.();
          console.error('Error conectando a MongoDB:', last?.message || last || 'MONGODB_URI no definida');
        }
        return ok;
      } catch (error) {
        console.error('Error conectando a MongoDB:', error?.message || error);
        return false;
      }
    };

    await connectDB();
    await database.configurarIndices?.();

    // Create HTTP server and attach Socket.io
    const server = http.createServer(app);

    try {
      const { Server } = require('socket.io');
      const jwt = require('jsonwebtoken');
      const notificationService = require('./services/notificationService');

      // Reuse the same allowlist as the HTTP CORS middleware (defined in
      // app.js as app.isAllowedOrigin). Previous code passed the literal
      // string '*.vercel.app' in the array, which Socket.io treats as an
      // exact match — so no preview deploy ever connected.
      const io = new Server(server, {
        cors: {
          origin: (origin, cb) => {
            const allow = typeof app.isAllowedOrigin === 'function'
              ? app.isAllowedOrigin(origin)
              : true;
            return cb(allow ? null : new Error('Origin no permitido por CORS'), allow);
          },
          methods: ['GET', 'POST']
        },
        transports: ['websocket', 'polling']
      });

      // JWT authentication middleware for Socket.io
      io.use((socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.query?.token;
        if (!token) return next(new Error('Token requerido'));
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          socket.userId = decoded.id || decoded.userId;
          next();
        } catch {
          next(new Error('Token inválido'));
        }
      });

      io.on('connection', (socket) => {
        const userId = socket.userId;
        if (userId) {
          socket.join(`user:${userId}`);
          notificationService.conexionesWebSocket.set(userId, socket);
          socket.on('disconnect', () => {
            notificationService.conexionesWebSocket.delete(userId);
          });
        }
      });

      // Wire Socket.io into NotificationService
      notificationService.configurarSocketIO(io);

      // Override realtime delivery to use Socket.io rooms
      notificationService.enviarTiempoReal = async (usuarioId, datos) => {
        try {
          io.to(`user:${usuarioId.toString()}`).emit('notificacion', datos);
          return { exito: true, canal: 'socketio' };
        } catch (error) {
          return { exito: false, error: error.message };
        }
      };

      console.log('Socket.io initialized');
    } catch (ioErr) {
      console.warn('Socket.io not available:', ioErr.message);
    }

    // Start campaign automation cron (non-blocking)
    try {
      const { startCampaignCron } = require('./lib/campaignCron');
      startCampaignCron();
      console.log('Campaign cron started');
    } catch (cronErr) {
      console.warn('Campaign cron not available:', cronErr.message);
    }

    // Start WhatsApp admin worker (VPS/local only — not on Vercel)
    if (process.env.WHATSAPP_SESSION_PATH) {
      try {
        const whatsappAdmin = require('./services/WhatsAppAdminClient');
        whatsappAdmin.initialize();
        console.log('WhatsApp admin worker starting...');
      } catch (waErr) {
        console.warn('WhatsApp admin worker not available:', waErr.message);
      }
    }

    server.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

    // ── Graceful shutdown ──
    const shutdown = async (signal) => {
      console.log(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        try {
          await mongoose.disconnect();
          console.log('MongoDB disconnected');
        } catch (e) {
          console.error('Error disconnecting MongoDB:', e.message);
        }
        // Shutdown WhatsApp worker
        try {
          const whatsappAdmin = require('./services/WhatsAppAdminClient');
          whatsappAdmin.shutdown();
        } catch (_) {}
        // Disconnect Redis
        try {
          const { disconnectRedis } = require('./config/redis');
          await disconnectRedis();
        } catch (_) {}
        process.exit(0);
      });
      // Force exit after 10s if connections don't close
      setTimeout(() => {
        console.error('Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

  } catch (error) {
    console.error('Error fatal durante el inicio del servidor:', error);
  }
}

// Ejecutar el inicio del servidor
startServer();
