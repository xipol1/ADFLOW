/**
 * TEMPORARY admin provisioning endpoint.
 * Remove after provisioning is done.
 *
 * POST /api/admin/provision-partner
 * Body: { name, slug, secret }
 *
 * The `secret` must match ADMIN_PROVISION_SECRET env var (or fallback).
 */
const express = require('express');
const crypto = require('crypto');
const { ensureDb } = require('../lib/ensureDb');

const router = express.Router();

router.post('/provision-partner', async (req, res) => {
  try {
    const secret = process.env.ADMIN_PROVISION_SECRET || 'adflow-temp-provision-2026';
    if (req.body.secret !== secret) {
      return res.status(403).json({ success: false, message: 'Invalid secret' });
    }

    await ensureDb();
    const Partner = require('../models/Partner');

    const name = req.body.name || 'Getalink';
    const slug = req.body.slug || name.toLowerCase().replace(/[^a-z0-9]+/g, '-');

    const existing = await Partner.findOne({ slug });
    if (existing) {
      return res.status(200).json({
        success: true,
        message: 'Partner already exists',
        partner: { id: existing._id, name: existing.name, slug: existing.slug, status: existing.status, hint: existing.apiKeyHint }
      });
    }

    const apiKey = `adflow_partner_${crypto.randomBytes(24).toString('hex')}`;
    const apiKeyHash = crypto.createHash('sha256').update(apiKey).digest('hex');
    const apiKeyHint = apiKey.slice(-4);

    const partner = await Partner.create({
      name,
      slug,
      apiKeyHash,
      apiKeyHint,
      status: 'active',
      allowedIps: ['*'],
      rateLimitPerMinute: 120,
      contactEmail: `${slug}@partner.example.com`,
      description: `Partner integration for ${name}`
    });

    return res.status(201).json({
      success: true,
      partner: { id: partner._id, name: partner.name, slug: partner.slug, status: partner.status },
      apiKey,
      warning: 'Store this API key securely. It will not be shown again.'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
