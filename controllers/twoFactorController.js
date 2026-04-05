/**
 * Two-Factor Authentication Controller — TOTP (Google Authenticator compatible)
 */

const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { OTPAuth } = require('otpauth') || {};
const Usuario = require('../models/Usuario');
const { ensureDb } = require('../lib/ensureDb');
const { encrypt, decrypt } = require('../lib/encryption');

const httpError = (status, message) => {
  const err = new Error(message);
  err.status = status;
  return err;
};

// ── POST /api/auth/2fa/setup — Generate TOTP secret + QR code ──
const setup2FA = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const user = await Usuario.findById(userId);
    if (!user) return next(httpError(404, 'Usuario no encontrado'));
    if (user.twoFactorEnabled) return next(httpError(400, '2FA ya esta activado'));

    const OTPAuth = require('otpauth');
    const totp = new OTPAuth.TOTP({
      issuer: 'Channelad',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: new OTPAuth.Secret({ size: 20 }),
    });

    const secret = totp.secret.base32;
    const otpauthUrl = totp.toString();

    // Store secret encrypted (not yet enabled until verify)
    user.twoFactorSecret = encrypt(secret);
    await user.save();

    // Generate QR code as data URL
    let qrDataUrl = '';
    try {
      const QRCode = require('qrcode');
      qrDataUrl = await QRCode.toDataURL(otpauthUrl);
    } catch {}

    return res.json({
      success: true,
      data: {
        secret, // show to user for manual entry
        qrCode: qrDataUrl,
        otpauthUrl,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/2fa/verify — Verify TOTP code and enable 2FA ──
const verify2FA = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { code } = req.body;
    if (!code) return next(httpError(400, 'Codigo requerido'));

    const user = await Usuario.findById(userId);
    if (!user) return next(httpError(404, 'Usuario no encontrado'));
    if (!user.twoFactorSecret) return next(httpError(400, 'Primero configura 2FA con /2fa/setup'));

    const OTPAuth = require('otpauth');
    const secret = decrypt(user.twoFactorSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'Channelad',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: String(code), window: 1 });
    if (delta === null) {
      return next(httpError(400, 'Codigo invalido. Intenta de nuevo.'));
    }

    // Generate 8 backup codes
    const backupCodes = [];
    const hashedCodes = [];
    for (let i = 0; i < 8; i++) {
      const code = crypto.randomBytes(4).toString('hex').toUpperCase();
      backupCodes.push(code);
      hashedCodes.push(await bcrypt.hash(code, 8));
    }

    user.twoFactorEnabled = true;
    user.twoFactorBackupCodes = hashedCodes;
    await user.save();

    return res.json({
      success: true,
      message: '2FA activado correctamente',
      data: { backupCodes }, // show once, user must save them
    });
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/2fa/validate — Validate TOTP during login ──
const validate2FA = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const { email, code } = req.body;
    if (!email || !code) return next(httpError(400, 'Email y codigo requeridos'));

    const user = await Usuario.findOne({ email: email.toLowerCase().trim() });
    if (!user || !user.twoFactorEnabled) {
      return next(httpError(400, 'Codigo invalido'));
    }

    const OTPAuth = require('otpauth');
    const secret = decrypt(user.twoFactorSecret);
    const totp = new OTPAuth.TOTP({
      issuer: 'Channelad',
      label: user.email,
      algorithm: 'SHA1',
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(secret),
    });

    const delta = totp.validate({ token: String(code), window: 1 });

    if (delta !== null) {
      // Valid TOTP code — return success signal for login flow
      return res.json({ success: true, message: '2FA verificado' });
    }

    // Check backup codes
    for (let i = 0; i < user.twoFactorBackupCodes.length; i++) {
      const match = await bcrypt.compare(String(code).toUpperCase(), user.twoFactorBackupCodes[i]);
      if (match) {
        // Remove used backup code
        user.twoFactorBackupCodes.splice(i, 1);
        await user.save();
        return res.json({ success: true, message: '2FA verificado (codigo de respaldo usado)' });
      }
    }

    return next(httpError(400, 'Codigo invalido'));
  } catch (error) {
    next(error);
  }
};

// ── POST /api/auth/2fa/disable — Disable 2FA ──
const disable2FA = async (req, res, next) => {
  try {
    const ok = await ensureDb();
    if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });

    const userId = req.usuario?.id;
    if (!userId) return next(httpError(401, 'No autorizado'));

    const { password } = req.body;
    if (!password) return next(httpError(400, 'Contrasena requerida para desactivar 2FA'));

    const user = await Usuario.findById(userId);
    if (!user) return next(httpError(404, 'Usuario no encontrado'));

    const isMatch = await bcrypt.compare(String(password), user.password);
    if (!isMatch) return next(httpError(401, 'Contrasena incorrecta'));

    user.twoFactorEnabled = false;
    user.twoFactorSecret = null;
    user.twoFactorBackupCodes = [];
    await user.save();

    return res.json({ success: true, message: '2FA desactivado' });
  } catch (error) {
    next(error);
  }
};

module.exports = { setup2FA, verify2FA, validate2FA, disable2FA };
