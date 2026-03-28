const mongoose = require('mongoose');
const config = require('./config');

let lastConnectionError = null;
let connectPromise = null;
let listenersAttached = false;

const redactMongoUriForLog = (value) => {
  if (!value) return '';
  const raw = String(value);
  try {
    const url = new URL(raw);
    const username = url.username ? decodeURIComponent(url.username) : '';
    const hasPassword = Boolean(url.password);
    const auth = username ? `${username}${hasPassword ? ':***' : ''}@` : '';
    const host = url.host || '';
    const path = url.pathname || '';
    const dbName = path && path !== '/' ? path : '';
    return `${url.protocol}//${auth}${host}${dbName}${url.search ? '?…' : ''}`;
  } catch {
    return raw.substring(0, 20) + (raw.length > 20 ? '...' : '');
  }
};

const isValidMongoScheme = (value) => {
  if (!value) return false;
  const v = String(value);
  return v.startsWith('mongodb://') || v.startsWith('mongodb+srv://');
};

const attachListenersOnce = () => {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.connection.on('connected', () => {
    console.log('MongoDB conectado correctamente');
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('⚠️ MongoDB desconectado');
  });

  mongoose.connection.on('error', (error) => {
    lastConnectionError = error;
    console.error('❌ MongoDB error:', error?.message || error);
  });
};

const getConfiguredUri = () => {
  const fromMongoEnv = process.env.MONGODB_URI;
  return { uri: fromMongoEnv || '', source: 'MONGODB_URI' };
};

const conectar = async () => {
  attachListenersOnce();

  if (mongoose.connection?.readyState === 1) return true;
  if (connectPromise) return connectPromise;

  const { uri, source } = getConfiguredUri();
  if (!uri) {
    console.warn('⚠️ MONGODB_URI no definida');
    if (process.env.DATABASE_URL) console.warn('⚠️ DATABASE_URL está definida pero la app requiere MONGODB_URI (Render env vars)');
    lastConnectionError = new Error('MONGODB_URI no definida');
    return Promise.resolve(false);
  }

  console.log(`MONGODB_URI detectada: ${redactMongoUriForLog(uri)}`);

  if (!isValidMongoScheme(uri)) {
    const err = new Error("Invalid scheme, expected connection string to start with 'mongodb://' or 'mongodb+srv://'");
    lastConnectionError = err;
    console.error(`❌ MONGODB_URI inválida: ${redactMongoUriForLog(uri)}`);
    console.error(`❌ Error conectando a MongoDB: ${err.message}`);
    return Promise.resolve(false);
  }

  console.log('Intentando conectar a MongoDB...');

  connectPromise = mongoose.connect(uri, {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    maxPoolSize: 10
  })
    .then(() => {
      lastConnectionError = null;
      return true;
    })
    .catch((error) => {
      lastConnectionError = error;
      console.error('Error conectando a MongoDB:', error?.message || error);
      return false;
    })
    .finally(() => {
      connectPromise = null;
    });

  return connectPromise;
};

const estaConectado = () => {
  return mongoose.connection?.readyState === 1;
};

const getLastConnectionError = () => lastConnectionError;

const configurarIndices = async () => {
  try {
    if (!estaConectado()) return false;
    await mongoose.connection.db.command({ ping: 1 });
    return true;
  } catch (error) {
    console.error('❌ Error al verificar índices/DB:', error?.message || error);
    return false;
  }
};

const desconectar = async () => {
  try {
    await mongoose.disconnect();
    return true;
  } catch (error) {
    console.error('❌ Error al desconectar DB:', error?.message || error);
    return false;
  }
};

module.exports = {
  conectar,
  estaConectado,
  configurarIndices,
  getLastConnectionError,
  desconectar,
  mongoose
};
