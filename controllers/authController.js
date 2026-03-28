const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const Usuario = require('../models/Usuario');
const AuthService = require('../services/authService');
const config = require('../config/config');
const database = require('../config/database');

const env = process.env.NODE_ENV || 'development';
const isDev = env !== 'production';
const logDev = (...args) => {
  if (isDev) console.log(...args);
};

const errorPayload = (error) => (isDev ? { error: error?.message } : {});

const normalizeEmail = (value) => {
  if (!value) return '';
  return String(value).trim().toLowerCase();
};

const buildUserResponse = (usuario) => {
  return {
    id: usuario?._id ? usuario._id.toString() : undefined,
    email: usuario?.email,
    role: usuario?.rol,
    nombre: usuario?.nombre,
    apellido: usuario?.apellido,
    emailVerificado: usuario?.emailVerificado
  };
};

const login = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    logDev('LOGIN: request', { email });

    if (!process.env.MONGODB_URI) {
      console.warn('LOGIN: MONGODB_URI no definida');
      return res.status(503).json({
        success: false,
        message: 'Servicio no disponible',
        error: 'MONGODB_URI no definida'
      });
    }

    if (!database.estaConectado()) {
      logDev('LOGIN: connecting DB...');
      const ok = await database.conectar();
      if (!ok) {
        const last = database.getLastConnectionError?.();
        return res.status(503).json({
          success: false,
          message: 'Servicio no disponible',
          ...(last ? { error: last.message || String(last) } : {})
        });
      }
    }

    const user = await Usuario.findOne({ email });
    logDev('LOGIN: user lookup', { found: Boolean(user) });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const password = String(req.body?.password || '');
    const isMatch = await bcrypt.compare(password, user.password);
    logDev('LOGIN: password match', isMatch);

    if (!isMatch) {
      logDev('LOGIN: password mismatch', { userId: user._id.toString() });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    const tokens = await AuthService.generarTokens(user);
    logDev('LOGIN: tokens generated', { userId: user._id.toString() });

    return res.json({
      success: true,
      user: {
        id: user._id,
        email: user.email,
        role: user.rol
      },
      token: tokens.tokenAcceso,
      refreshToken: tokens.tokenRefresco
    });
  } catch (error) {
    console.error('LOGIN ERROR:', error?.message || error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      ...errorPayload(error)
    });
  }
};

const registro = async (req, res) => {
  const email = normalizeEmail(req.body?.email);

  try {
    logDev('REGISTER: request', { email });
    const password = String(req.body?.password || '');

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email y password requeridos'
      });
    }

    if (!process.env.MONGODB_URI) {
      console.warn('REGISTER: MONGODB_URI no definida');
      return res.status(503).json({
        success: false,
        message: 'Servicio no disponible',
        error: 'MONGODB_URI no definida'
      });
    }

    if (!database.estaConectado()) {
      logDev('REGISTER: connecting DB...');
      const ok = await database.conectar();
      if (!ok) {
        const last = database.getLastConnectionError?.();
        return res.status(503).json({
          success: false,
          message: 'Servicio no disponible',
          ...(last ? { error: last.message || String(last) } : {})
        });
      }
    }

    const existing = await Usuario.findOne({ email });
    logDev('REGISTER: user lookup', { found: Boolean(existing) });
    if (existing) {
      return res.status(400).json({ success: false, message: 'El email ya está registrado' });
    }

    const hashedPassword = await bcrypt.hash(password.trim(), 10);

    const nombre = String(req.body?.nombre || req.body?.name || '').trim()
    const rol    = ['creator', 'advertiser'].includes(req.body?.role) ? req.body.role : 'advertiser'

    const user = await Usuario.create({
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      nombre,
      rol,
    });

    logDev('REGISTER: user created', { userId: user._id.toString() });
    const tokens = await AuthService.generarTokens(user);
    logDev('REGISTER: tokens generated', { userId: user._id.toString() });

    return res.status(201).json({
      success: true,
      user: buildUserResponse(user),
      token: tokens.tokenAcceso,
      refreshToken: tokens.tokenRefresco,
      expiresIn: tokens.expiresIn
    });
  } catch (error) {
    console.error('REGISTER ERROR:', error);
    return res.status(500).json({
      success: false,
      message: 'Error interno del servidor',
      ...errorPayload(error)
    });
  }
};

const verificarToken = async (req, res) => {
  try {
    const authHeader = req.headers['authorization'] || ''
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : ''
    if (!token) {
      return res.status(401).json({ success: false, message: 'Token requerido' })
    }

    let decoded
    try {
      decoded = AuthService.verificarTokenAcceso(token)
    } catch {
      return res.status(401).json({ success: false, message: 'Token inválido o expirado' })
    }

    if (!database.estaConectado()) {
      await database.conectar()
    }

    const user = await Usuario.findById(decoded.id).select('-password -sesiones')
    if (!user || !user.activo) {
      return res.status(401).json({ success: false, message: 'Usuario no encontrado' })
    }

    return res.json({
      success: true,
      user: buildUserResponse(user)
    })
  } catch (error) {
    console.error('VERIFY TOKEN ERROR:', error?.message)
    return res.status(500).json({ success: false, message: 'Error interno' })
  }
}

const obtenerPerfil = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const user = await Usuario.findById(req.usuario.id).select('-password -sesiones');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({ success: true, user: buildUserResponse(user) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const actualizarPerfil = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const allowed = ['nombre', 'apellido'];
    const updates = {};
    allowed.forEach(k => { if (req.body[k] !== undefined) updates[k] = String(req.body[k]).trim(); });
    const user = await Usuario.findByIdAndUpdate(req.usuario.id, updates, { new: true }).select('-password -sesiones');
    return res.json({ success: true, user: buildUserResponse(user) });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const refreshToken = async (req, res) => {
  try {
    const token = String(req.body?.refreshToken || '').trim();
    if (!token) return res.status(400).json({ success: false, message: 'refreshToken requerido' });
    if (!database.estaConectado()) await database.conectar();
    const tokens = await AuthService.refrescarToken(token);
    return res.json({ success: true, token: tokens.tokenAcceso, refreshToken: tokens.tokenRefresco });
  } catch (e) {
    return res.status(401).json({ success: false, message: 'Token inválido o expirado' });
  }
};

const logout = async (req, res) => {
  try {
    const token = String(req.body?.refreshToken || '').trim();
    if (token && database.estaConectado()) {
      await AuthService.revocarToken(token, req.usuario?.id).catch(() => {});
    }
    return res.json({ success: true, message: 'Sesión cerrada' });
  } catch (e) {
    return res.json({ success: true, message: 'Sesión cerrada' });
  }
};

const cambiarPassword = async (req, res) => {
  try {
    const { passwordActual, passwordNueva } = req.body || {};
    if (!passwordActual || !passwordNueva) return res.status(400).json({ success: false, message: 'Campos requeridos' });
    if (!database.estaConectado()) await database.conectar();
    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    const ok = await AuthService.compararPassword(passwordActual, user.password);
    if (!ok) return res.status(401).json({ success: false, message: 'Contraseña actual incorrecta' });
    user.password = await AuthService.hashPassword(passwordNueva);
    await AuthService.revocarTodasLasSesiones(user._id).catch(() => {});
    await user.save();
    return res.json({ success: true, message: 'Contraseña actualizada' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const verificarEmail = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { token } = req.params;
    if (!token) return res.status(400).json({ success: false, message: 'Token requerido' });
    const user = await Usuario.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    });
    if (!user) return res.status(400).json({ success: false, message: 'Token invalido o expirado' });
    user.emailVerificado = true;
    user.emailVerificationToken = null;
    user.emailVerificationExpires = null;
    await user.save();
    return res.json({ success: true, message: 'Email verificado correctamente' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

const reenviarVerificacion = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { email } = req.body;
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });
    const user = await Usuario.findOne({ email: email.toLowerCase() });
    if (!user) return res.json({ success: true, message: 'Si el email existe, se envio el enlace' });
    if (user.emailVerificado) return res.json({ success: true, message: 'Email ya verificado' });
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    user.emailVerificationToken = token;
    user.emailVerificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await user.save();
    try {
      const emailService = require('../services/emailService');
      const verifyUrl = `${process.env.FRONTEND_URL || 'http://localhost:3000'}/verificar-email/${token}`;
      await emailService.sendEmail({
        to: user.email,
        subject: 'Verifica tu email - Adflow',
        html: `<p>Haz clic para verificar: <a href="${verifyUrl}">${verifyUrl}</a></p>`,
      });
    } catch {}
    return res.json({ success: true, message: 'Email de verificacion enviado' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

const solicitarRestablecimiento = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Restablecimiento pendiente de configurar' });
};

const restablecerPassword = async (req, res) => {
  return res.status(501).json({ success: false, message: 'Restablecimiento pendiente de configurar' });
};

const desactivarCuenta = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    await Usuario.findByIdAndUpdate(req.usuario.id, { activo: false });
    return res.json({ success: true, message: 'Cuenta desactivada' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const obtenerEstadisticas = async (req, res) => {
  return res.json({ success: true, data: {} });
};

module.exports = {
  login,
  registro,
  verificarToken,
  refreshToken,
  verificarEmail,
  reenviarVerificacion,
  solicitarRestablecimiento,
  restablecerPassword,
  logout,
  obtenerPerfil,
  actualizarPerfil,
  cambiarPassword,
  desactivarCuenta,
  obtenerEstadisticas
};
