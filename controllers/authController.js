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

// Emails with full platform access — configurable via env, never sent to frontend bundle
const FULL_ACCESS_EMAILS = (process.env.FULL_ACCESS_EMAILS || 'admin@channelad.io,creator@channelad.io,advertiser@channelad.io')
  .split(',').map(e => e.trim().toLowerCase()).filter(Boolean);

const buildUserResponse = (usuario) => {
  const email = (usuario?.email || '').toLowerCase();
  const rol = usuario?.rol || '';
  // Beta program: admins always in, plus any user whose DB flag is true.
  // FULL_ACCESS_EMAILS is kept as a legacy env fallback so existing deploys
  // don't lose access on rollout before the DB migration runs.
  const betaAccess =
    rol === 'admin' ||
    usuario?.betaAccess === true ||
    FULL_ACCESS_EMAILS.includes(email);
  return {
    id: usuario?._id ? usuario._id.toString() : undefined,
    email: usuario?.email,
    role: rol,
    nombre: usuario?.nombre,
    apellido: usuario?.apellido,
    emailVerificado: usuario?.emailVerificado,
    // fullAccess is kept as an alias for betaAccess so existing frontend
    // consumers (FullAccessOnly wrapper, isFullAccess) continue to work.
    fullAccess: betaAccess,
    betaAccess,
    campaignCredits: usuario?.campaignCreditsBalance || 0,
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

    // Account lockout check
    if (user.lockedUntil && user.lockedUntil > new Date()) {
      const minutesLeft = Math.ceil((user.lockedUntil - Date.now()) / 60000);
      return res.status(423).json({
        success: false,
        message: `Cuenta bloqueada temporalmente. Intenta de nuevo en ${minutesLeft} minuto(s).`,
      });
    }

    const password = String(req.body?.password || '');
    const isMatch = await bcrypt.compare(password, user.password);
    logDev('LOGIN: password match', isMatch);

    if (!isMatch) {
      // Increment failed attempts and lock after 5
      const attempts = (user.failedLoginAttempts || 0) + 1;
      const update = { failedLoginAttempts: attempts };
      if (attempts >= 5) {
        update.lockedUntil = new Date(Date.now() + 30 * 60 * 1000); // 30 min lock
        update.failedLoginAttempts = 0;
      }
      await Usuario.findByIdAndUpdate(user._id, update);
      logDev('LOGIN: password mismatch', { userId: user._id.toString(), attempts });
      return res.status(401).json({ success: false, message: 'Credenciales inválidas' });
    }

    // Reset failed attempts on successful login
    if (user.failedLoginAttempts > 0 || user.lockedUntil) {
      await Usuario.findByIdAndUpdate(user._id, { failedLoginAttempts: 0, lockedUntil: null });
    }

    // Check if 2FA is enabled — require second step
    if (user.twoFactorEnabled) {
      logDev('LOGIN: 2FA required', { userId: user._id.toString() });
      return res.json({
        success: true,
        requires2FA: true,
        email: user.email,
        message: 'Introduce el codigo de tu app de autenticacion',
      });
    }

    const tokens = await AuthService.generarTokens(user);
    logDev('LOGIN: tokens generated', { userId: user._id.toString() });

    return res.json({
      success: true,
      user: buildUserResponse(user),
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
      return res.status(503).json({ success: false, message: 'Servicio no disponible' });
    }

    if (!database.estaConectado()) {
      logDev('REGISTER: connecting DB...');
      const ok = await database.conectar();
      if (!ok) {
        return res.status(503).json({ success: false, message: 'Servicio no disponible' });
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

    // Generate email verification token
    const crypto = require('crypto');
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const userData = {
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      nombre,
      rol,
      emailVerificado: false,
      emailVerificationToken: verificationToken,
      emailVerificationExpires: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24h
    };

    // ── Bot token validation (founder benefits) ──
    const botToken = String(req.body?.botToken || '').trim();
    let founderApplied = false;
    if (botToken) {
      const BotToken = require('../models/BotToken');
      const tokenDoc = await BotToken.findOne({
        token: botToken,
        used: false,
        expiresAt: { $gt: new Date() },
      });
      if (tokenDoc && tokenDoc.email.toLowerCase() === email) {
        userData.botVerified = true;
        userData.founderTier = true;
        userData.telegramUserId = tokenDoc.telegramUserId;
        userData.channelUsername = tokenDoc.channelUsername;
        userData.channelTier = tokenDoc.channelTier;
        userData.campaignCreditsBalance = 10; // €10 welcome bonus
        founderApplied = true;
        // Mark token as used
        tokenDoc.used = true;
        tokenDoc.usedAt = new Date();
        await tokenDoc.save();
        logDev('REGISTER: bot token validated, founder benefits applied', { email, channel: tokenDoc.channelUsername });
      } else {
        logDev('REGISTER: bot token invalid or email mismatch', { botToken: botToken.slice(0, 8) + '...', email });
      }
    }

    // ── Referral code (atomic — applied during registration) ──
    const referralCode = String(req.body?.referralCode || req.body?.ref || '').trim().toUpperCase();
    let referralApplied = false;
    let referrer = null;
    if (referralCode) {
      referrer = await Usuario.findOne({ referralCode });
      if (referrer) {
        userData.referredBy = referrer._id;
        userData.campaignCreditsBalance = (userData.campaignCreditsBalance || 0) + 10; // €10 welcome bonus
        referralApplied = true;
        logDev('REGISTER: referral code valid, will apply atomically', { referralCode, referrerId: referrer._id.toString() });
      } else {
        logDev('REGISTER: referral code not found, ignoring', { referralCode });
      }
    }

    const user = await Usuario.create(userData);

    // Update referrer counts after user is created (non-blocking, atomic)
    if (referralApplied && referrer) {
      setImmediate(async () => {
        try {
          // Atomic increment to avoid race condition with concurrent registrations
          const updated = await Usuario.findByIdAndUpdate(referrer._id, {
            $inc: { referralCount: 1 },
          }, { new: true });
          // Recalculate tier based on fresh data
          const newCount = updated.referralCount || 0;
          const gmv = updated.referralGMVGenerated || 0;
          let newTier = 'normal';
          if (gmv >= 20000 || newCount >= 20) newTier = 'partner';
          else if (gmv >= 5000 || newCount >= 5) newTier = 'power';
          if (updated.referralTier !== newTier) {
            await Usuario.findByIdAndUpdate(referrer._id, { referralTier: newTier });
          }
          // Notify referrer by email
          try {
            const emailService = require('../services/emailService');
            await emailService.enviarReferidoRegistrado(updated, user.nombre || user.email, newCount, updated.referralCreditsBalance);
          } catch {}
          logDev('REGISTER: referrer updated atomically', { referrerId: referrer._id.toString(), count: newCount, tier: newTier });
        } catch (refErr) {
          console.error('REGISTER: failed to update referrer:', refErr?.message);
        }
      });
    }

    logDev('REGISTER: user created', { userId: user._id.toString(), founder: founderApplied, referral: referralApplied });

    // Send verification + welcome emails (non-blocking — don't fail registration if email fails)
    setImmediate(async () => {
      try {
        const emailService = require('../services/emailService');
        await emailService.enviarEmailVerificacion(user.email, user.nombre || '', verificationToken);
        logDev('REGISTER: verification email sent', { email: user.email });
        // Welcome email with referral code (sent after verification email)
        try {
          await emailService.enviarBienvenida(user);
          logDev('REGISTER: welcome email sent', { email: user.email });
        } catch (welErr) {
          console.error('REGISTER: failed to send welcome email:', welErr?.message);
        }
      } catch (emailErr) {
        console.error('REGISTER: failed to send verification email:', emailErr?.message || emailErr);
      }
    });

    const tokens = await AuthService.generarTokens(user);
    logDev('REGISTER: tokens generated', { userId: user._id.toString() });

    return res.status(201).json({
      success: true,
      user: buildUserResponse(user),
      token: tokens.tokenAcceso,
      refreshToken: tokens.tokenRefresco,
      expiresIn: tokens.expiresIn,
      emailVerificationRequired: true,
      founderApplied,
      referralApplied,
      message: founderApplied
        ? 'Cuenta creada como Canal Fundador. €10 de bono acreditados.'
        : referralApplied
          ? 'Cuenta creada. Has recibido 10€ en creditos de campana por tu codigo de referido. Revisa tu email para verificar tu cuenta.'
          : 'Cuenta creada. Revisa tu email para verificar tu cuenta.',
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

// ── Bot token endpoints ──

const BOT_API_KEY = process.env.BOT_API_KEY || '';

const createBotToken = async (req, res) => {
  try {
    const apiKey = req.headers['x-bot-key'] || '';
    if (!BOT_API_KEY || apiKey !== BOT_API_KEY) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    if (!database.estaConectado()) await database.conectar();

    const { token, email, telegramUserId, channelUsername, channelTier, precioPost, ingresoMensual, niche } = req.body;
    if (!token || !email || !telegramUserId) {
      return res.status(400).json({ success: false, message: 'token, email and telegramUserId required' });
    }

    const BotToken = require('../models/BotToken');

    // Invalidate previous tokens for this telegram user
    await BotToken.updateMany(
      { telegramUserId, used: false },
      { used: true, usedAt: new Date() }
    );

    await BotToken.create({
      token,
      email: email.toLowerCase(),
      telegramUserId,
      channelUsername: channelUsername || '',
      channelTier: channelTier || null,
      precioPost: precioPost || 0,
      ingresoMensual: ingresoMensual || 0,
      niche: niche || '',
      expiresAt: new Date(Date.now() + 48 * 60 * 60 * 1000), // 48h
    });

    logDev('BOT TOKEN: created', { telegramUserId, email, channelUsername });
    return res.status(201).json({ success: true });
  } catch (error) {
    console.error('BOT TOKEN CREATE ERROR:', error?.message);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const validateBotToken = async (req, res) => {
  try {
    const tokenStr = String(req.query?.token || '').trim();
    if (!tokenStr) {
      return res.json({ success: false, valid: false });
    }

    if (!database.estaConectado()) await database.conectar();

    const BotToken = require('../models/BotToken');
    const tokenDoc = await BotToken.findOne({
      token: tokenStr,
      used: false,
      expiresAt: { $gt: new Date() },
    });

    if (!tokenDoc) {
      return res.json({ success: true, valid: false });
    }

    return res.json({
      success: true,
      valid: true,
      email: tokenDoc.email,
      channelUsername: tokenDoc.channelUsername,
      channelTier: tokenDoc.channelTier,
      niche: tokenDoc.niche,
    });
  } catch (error) {
    console.error('BOT TOKEN VALIDATE ERROR:', error?.message);
    return res.status(500).json({ success: false, valid: false });
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
    // Return rotated refresh token (old one is now revoked)
    return res.json({
      success: true,
      token: tokens.tokenAcceso,
      refreshToken: tokens.tokenRefresco,
      expiresIn: tokens.expiresIn,
    });
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
    // Issue fresh tokens with emailVerificado=true so user doesn't need to re-login
    const tokens = await AuthService.generarTokens(user);
    return res.json({
      success: true,
      message: 'Email verificado correctamente',
      token: tokens.tokenAcceso,
      refreshToken: tokens.tokenRefresco,
      user: buildUserResponse(user),
    });
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
      await emailService.enviarEmailVerificacion(user.email, user.nombre || '', token);
    } catch {}
    return res.json({ success: true, message: 'Email de verificacion enviado' });
  } catch (e) {
    return res.status(500).json({ success: false, message: 'Error del servidor' });
  }
};

const solicitarRestablecimiento = async (req, res) => {
  try {
    const email = normalizeEmail(req.body?.email);
    if (!email) return res.status(400).json({ success: false, message: 'Email requerido' });

    if (!database.estaConectado()) await database.conectar();

    const user = await Usuario.findOne({ email });

    // Always return success to avoid email enumeration
    if (!user) {
      return res.json({ success: true, message: 'Si el email existe, recibiras instrucciones para restablecer tu contrasena' });
    }

    const crypto = require('crypto');
    const resetToken = crypto.randomBytes(32).toString('hex');

    user.passwordResetToken = resetToken;
    user.passwordResetExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    // Send reset email (non-blocking)
    setImmediate(async () => {
      try {
        const emailService = require('../services/emailService');
        await emailService.enviarEmailRecuperacion(user.email, user.nombre || '', resetToken);
        logDev('PASSWORD RESET: email sent', { email: user.email });
      } catch (emailErr) {
        console.error('PASSWORD RESET: failed to send email:', emailErr?.message || emailErr);
      }
    });

    return res.json({ success: true, message: 'Si el email existe, recibiras instrucciones para restablecer tu contrasena' });
  } catch (error) {
    console.error('PASSWORD RESET REQUEST ERROR:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
};

const restablecerPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const password = String(req.body?.password || '').trim();

    if (!token) return res.status(400).json({ success: false, message: 'Token requerido' });
    if (!password || password.length < 8) {
      return res.status(400).json({ success: false, message: 'La contrasena debe tener al menos 8 caracteres' });
    }

    if (!database.estaConectado()) await database.conectar();

    const user = await Usuario.findOne({
      passwordResetToken: token,
      passwordResetExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Token invalido o expirado. Solicita un nuevo enlace.' });
    }

    user.password = await AuthService.hashPassword(password);
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
    await user.save();

    // Revoke all existing sessions for security
    await AuthService.revocarTodasLasSesiones(user._id).catch(() => {});

    return res.json({ success: true, message: 'Contrasena restablecida correctamente. Inicia sesion con tu nueva contrasena.' });
  } catch (error) {
    console.error('PASSWORD RESET ERROR:', error?.message || error);
    return res.status(500).json({ success: false, message: 'Error interno del servidor' });
  }
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
  obtenerEstadisticas,
  createBotToken,
  validateBotToken,
};
