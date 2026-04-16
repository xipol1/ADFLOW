// Self-contained Vercel serverless function for email verification.
// Does NOT depend on the Express monolith — connects to DB directly
// so Vercel's NFT bundler doesn't need to trace the full app tree.
const mongoose = require('mongoose')
const jwt = require('jsonwebtoken')
const crypto = require('crypto')

let cached = null
async function connectDB() {
  if (cached && mongoose.connection.readyState === 1) return
  const uri = process.env.MONGODB_URI
  if (!uri) throw new Error('MONGODB_URI not set')
  cached = await mongoose.connect(uri, { bufferCommands: false })
}

module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const token = req.query.token
  if (!token || token.length < 32) {
    return res.status(400).json({ success: false, message: 'Token requerido' })
  }

  try {
    await connectDB()

    // Use the existing model if already registered, otherwise define inline
    const Usuario = mongoose.models.Usuario || mongoose.model('Usuario',
      new mongoose.Schema({
        email: String,
        password: String,
        nombre: { type: String, default: '' },
        rol: String,
        emailVerificado: { type: Boolean, default: false },
        emailVerificationToken: String,
        emailVerificationExpires: Date,
        activo: { type: Boolean, default: true },
        betaAccess: { type: Boolean, default: false },
        campaignCreditsBalance: { type: Number, default: 0 },
        sesiones: { type: Array, default: [] },
      }, { timestamps: true, strict: false })
    )

    const user = await Usuario.findOne({
      emailVerificationToken: token,
      emailVerificationExpires: { $gt: new Date() },
    })

    if (!user) {
      return res.status(400).json({
        success: false,
        message: 'Token invalido o expirado. Si ya verificaste tu email, inicia sesion normalmente.',
      })
    }

    user.emailVerificado = true
    user.emailVerificationToken = null
    user.emailVerificationExpires = null
    await user.save()

    // Issue fresh JWT tokens
    const secret = (process.env.JWT_SECRET || '').trim()
    const refreshSecret = (process.env.JWT_REFRESH_SECRET || '').trim()
    if (!secret || !refreshSecret) {
      return res.json({ success: true, message: 'Email verificado correctamente' })
    }

    const payload = {
      id: user._id.toString(),
      email: user.email,
      rol: user.rol,
      emailVerificado: true,
      iat: Math.floor(Date.now() / 1000),
    }

    const tokenAcceso = jwt.sign(payload, secret, {
      expiresIn: process.env.JWT_EXPIRES_IN || '15m',
      issuer: 'channelad',
      audience: 'channelad-users',
      algorithm: 'HS256',
    })

    const tokenRefresco = jwt.sign(
      { id: payload.id, email: payload.email, type: 'refresh', iat: payload.iat },
      refreshSecret,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d', issuer: 'channelad', audience: 'channelad-users', algorithm: 'HS256' }
    )

    // Store refresh token hash
    const hashToken = crypto.createHash('sha256').update(tokenRefresco).digest('hex')
    await Usuario.findByIdAndUpdate(user._id, {
      $push: {
        sesiones: {
          tokenHash: hashToken,
          fechaCreacion: new Date(),
          fechaExpiracion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      },
    })

    const email = (user.email || '').toLowerCase()
    const rol = user.rol || ''
    const FULL_ACCESS_EMAILS = (process.env.FULL_ACCESS_EMAILS || 'admin@channelad.io')
      .split(',').map(e => e.trim().toLowerCase()).filter(Boolean)
    const betaAccess = rol === 'admin' || user.betaAccess === true || FULL_ACCESS_EMAILS.includes(email)

    return res.json({
      success: true,
      message: 'Email verificado correctamente',
      token: tokenAcceso,
      refreshToken: tokenRefresco,
      user: {
        id: user._id.toString(),
        email: user.email,
        role: rol,
        nombre: user.nombre,
        emailVerificado: true,
        fullAccess: betaAccess,
        betaAccess,
        campaignCredits: user.campaignCreditsBalance || 0,
      },
    })
  } catch (err) {
    console.error('VERIFY EMAIL ERROR:', err?.message || err)
    return res.status(500).json({ success: false, message: 'Error del servidor' })
  }
}
