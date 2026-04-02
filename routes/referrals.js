const express = require('express')
const router = express.Router()
const { autenticar } = require('../middleware/auth')
const Usuario = require('../models/Usuario')
const Transaccion = require('../models/Transaccion')

// Helper: calculate tier
function getReferralTier(user) {
  if (user.referralGMVGenerated >= 20000 || user.referralCount >= 20) return 'partner'
  if (user.referralGMVGenerated >= 5000 || user.referralCount >= 5) return 'power'
  return 'normal'
}

// Helper: conversion rate
function getConversionRate(tier) {
  if (tier === 'partner') return 1
  if (tier === 'power') return 0.5
  return 0
}

// GET /api/referrals/stats — get referral dashboard data
router.get('/stats', autenticar, async (req, res) => {
  try {
    const user = await Usuario.findById(req.usuario.id)
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })

    const tier = getReferralTier(user)
    if (user.referralTier !== tier) {
      user.referralTier = tier
      await user.save()
    }

    const referrals = await Usuario.find({ referredBy: user._id })
      .select('nombre email createdAt')
      .lean()

    // Get GMV per referral
    const Campaign = require('../models/Campaign')
    const referralStats = await Promise.all(referrals.map(async (ref) => {
      const campaigns = await Campaign.find({ advertiser: ref._id, status: 'COMPLETED' })
      const gmv = campaigns.reduce((sum, c) => sum + (c.price || 0), 0)
      return {
        id: ref._id,
        nombre: ref.nombre || ref.email?.split('@')[0] || 'Usuario',
        email: ref.email,
        gmvGenerated: gmv,
        active: gmv > 0,
        joinedAt: ref.createdAt,
      }
    }))

    // Monthly earnings (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)
    const referralTxns = await Transaccion.find({
      referralUserId: user._id,
      tipo: 'referral',
      createdAt: { $gte: sixMonthsAgo },
    }).lean()

    const monthlyEarnings = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date()
      d.setMonth(d.getMonth() - i)
      const month = d.toLocaleDateString('es', { month: 'short' })
      const year = d.getFullYear()
      const m = d.getMonth()
      const amount = referralTxns
        .filter(t => new Date(t.createdAt).getMonth() === m && new Date(t.createdAt).getFullYear() === year)
        .reduce((sum, t) => sum + (t.referralCreditGenerated || 0), 0)
      monthlyEarnings.push({ month, amount: Math.round(amount * 100) / 100 })
    }

    res.json({
      success: true,
      data: {
        referralCode: user.referralCode,
        creditsBalance: user.referralCreditsBalance,
        cashBalance: user.referralCashBalance,
        tier: user.referralTier,
        gmvGenerated: user.referralGMVGenerated,
        referralCount: user.referralCount,
        conversionRate: getConversionRate(user.referralTier),
        referrals: referralStats,
        monthlyEarnings,
        tierProgress: {
          current: user.referralTier,
          nextTier: user.referralTier === 'normal' ? 'power' : user.referralTier === 'power' ? 'partner' : null,
          referralsNeeded: user.referralTier === 'normal' ? Math.max(0, 5 - user.referralCount) : user.referralTier === 'power' ? Math.max(0, 20 - user.referralCount) : 0,
          gmvNeeded: user.referralTier === 'normal' ? Math.max(0, 5000 - user.referralGMVGenerated) : user.referralTier === 'power' ? Math.max(0, 20000 - user.referralGMVGenerated) : 0,
        },
      },
    })
  } catch (err) {
    console.error('Referral stats error:', err)
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de referidos' })
  }
})

// POST /api/referrals/convert — convert credits to cash
router.post('/convert', autenticar, async (req, res) => {
  try {
    const { amount } = req.body
    if (!amount || amount <= 0) return res.status(400).json({ success: false, message: 'Cantidad inválida' })

    const user = await Usuario.findById(req.usuario.id)
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })

    const tier = getReferralTier(user)
    user.referralTier = tier
    const rate = getConversionRate(tier)

    if (rate === 0) return res.status(403).json({ success: false, message: 'Tu nivel actual no permite convertir créditos a dinero' })

    const maxConvertible = user.referralCreditsBalance * rate
    if (amount > maxConvertible) {
      return res.status(400).json({ success: false, message: `Solo puedes convertir hasta €${maxConvertible.toFixed(2)}` })
    }
    if (amount > user.referralCreditsBalance) {
      return res.status(400).json({ success: false, message: 'Créditos insuficientes' })
    }

    user.referralCreditsBalance -= amount
    user.referralCashBalance += amount
    await user.save()

    res.json({
      success: true,
      data: {
        converted: amount,
        creditsBalance: user.referralCreditsBalance,
        cashBalance: user.referralCashBalance,
      },
    })
  } catch (err) {
    console.error('Referral convert error:', err)
    res.status(500).json({ success: false, message: 'Error al convertir créditos' })
  }
})

// POST /api/referrals/apply — apply referral code during registration
router.post('/apply', autenticar, async (req, res) => {
  try {
    const { code } = req.body
    if (!code) return res.status(400).json({ success: false, message: 'Código requerido' })

    const user = await Usuario.findById(req.usuario.id)
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' })
    if (user.referredBy) return res.status(400).json({ success: false, message: 'Ya tienes un referente asignado' })

    const referrer = await Usuario.findOne({ referralCode: code.toUpperCase() })
    if (!referrer) return res.status(404).json({ success: false, message: 'Código de referido no válido' })
    if (referrer._id.equals(user._id)) return res.status(400).json({ success: false, message: 'No puedes referirte a ti mismo' })

    user.referredBy = referrer._id
    await user.save()

    referrer.referralCount += 1
    referrer.referralTier = getReferralTier(referrer)
    await referrer.save()

    res.json({ success: true, message: 'Código de referido aplicado correctamente' })
  } catch (err) {
    console.error('Referral apply error:', err)
    res.status(500).json({ success: false, message: 'Error al aplicar código de referido' })
  }
})

module.exports = router
