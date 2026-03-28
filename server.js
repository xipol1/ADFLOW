require('dotenv').config();

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

    if (!process.env.JWT_SECRET) console.warn('⚠️ Falta JWT_SECRET');
    if (!process.env.MONGODB_URI) console.warn('⚠️ MONGODB_URI no definida');
    if (process.env.DATABASE_URL && !process.env.MONGODB_URI) console.warn('⚠️ DATABASE_URL definida pero falta MONGODB_URI');
    if (!process.env.STRIPE_SECRET_KEY) console.warn('⚠️ Falta STRIPE_SECRET_KEY');

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

    app.listen(PORT, '0.0.0.0', () => {
      console.log(`Server running on port ${PORT}`);
    });

  } catch (error) {
    console.error('❌ Error fatal durante el inicio del servidor:', error);
  }
}

// Ejecutar el inicio del servidor
startServer();
