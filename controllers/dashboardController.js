const Usuario = require('../models/Usuario');
const database = require('../config/database');
const crypto = require('crypto');

const MAX_VIEWS_PER_USER = 10;
const MAX_NAME_LENGTH = 60;
const MAX_ITEMS_PER_VIEW = 60;
const MAX_PAYLOAD_SIZE_KB = 80;

const newId = () => 'view_' + crypto.randomBytes(6).toString('hex');

const sanitizeName = (name, fallback = 'Vista sin nombre') => {
  if (typeof name !== 'string') return fallback;
  const trimmed = name.trim().slice(0, MAX_NAME_LENGTH);
  return trimmed || fallback;
};

const sanitizeItems = (items) => {
  if (!Array.isArray(items)) return [];
  return items.slice(0, MAX_ITEMS_PER_VIEW).map(it => {
    if (!it || typeof it !== 'object') return null;
    const w = Number(it.w);
    const h = Number(it.h);
    const x = Number(it.x);
    const y = Number(it.y);
    return {
      i: String(it.i || ''),
      type: String(it.type || ''),
      variant: String(it.variant || ''),
      x: Number.isFinite(x) ? x : 0,
      y: Number.isFinite(y) ? y : 0,
      w: Number.isFinite(w) ? Math.max(1, Math.min(12, w)) : 3,
      h: Number.isFinite(h) ? Math.max(1, Math.min(12, h)) : 2,
    };
  }).filter(it => it && it.i && it.type);
};

const ensurePayloadSize = (payload, res) => {
  const size = JSON.stringify(payload).length;
  if (size > MAX_PAYLOAD_SIZE_KB * 1024) {
    res.status(413).json({ success: false, message: `Layout excede ${MAX_PAYLOAD_SIZE_KB}KB` });
    return false;
  }
  return true;
};

// ─── GET all views for current user ───────────────────────────────────────────
const getViews = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const user = await Usuario.findById(req.usuario.id).select('dashboardViews dashboardActiveViewId');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    return res.json({
      success: true,
      data: {
        views: user.dashboardViews || [],
        activeViewId: user.dashboardActiveViewId || null,
      },
    });
  } catch (e) {
    console.error('dashboardController.getViews failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── PUT bulk update (replace all views — used after create/edit/delete) ──────
const saveViews = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    if (!ensurePayloadSize(req.body, res)) return;

    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const incoming = Array.isArray(req.body.views) ? req.body.views : [];
    if (incoming.length > MAX_VIEWS_PER_USER) {
      return res.status(400).json({ success: false, message: `Máximo ${MAX_VIEWS_PER_USER} vistas por usuario` });
    }

    const cleaned = incoming.map(v => ({
      id: typeof v.id === 'string' && v.id ? v.id : newId(),
      name: sanitizeName(v.name),
      items: sanitizeItems(v.items),
      isDefault: !!v.isDefault,
      updatedAt: new Date(),
    }));

    // Ensure exactly one default view (or zero if list is empty).
    const defaults = cleaned.filter(v => v.isDefault);
    if (defaults.length > 1) {
      cleaned.forEach((v, idx) => { v.isDefault = idx === cleaned.findIndex(x => x.isDefault) });
    } else if (defaults.length === 0 && cleaned.length > 0) {
      cleaned[0].isDefault = true;
    }

    user.dashboardViews = cleaned;

    if (req.body.activeViewId !== undefined) {
      const valid = cleaned.find(v => v.id === req.body.activeViewId);
      user.dashboardActiveViewId = valid ? valid.id : (cleaned[0]?.id || null);
    } else if (!cleaned.find(v => v.id === user.dashboardActiveViewId)) {
      user.dashboardActiveViewId = cleaned[0]?.id || null;
    }

    await user.save();

    return res.json({
      success: true,
      data: {
        views: user.dashboardViews,
        activeViewId: user.dashboardActiveViewId,
      },
    });
  } catch (e) {
    console.error('dashboardController.saveViews failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── PATCH update single view items (debounced auto-save endpoint) ────────────
const updateView = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { viewId } = req.params;
    if (!ensurePayloadSize(req.body, res)) return;

    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const view = user.dashboardViews.find(v => v.id === viewId);
    if (!view) return res.status(404).json({ success: false, message: 'Vista no encontrada' });

    if (req.body.items !== undefined) view.items = sanitizeItems(req.body.items);
    if (req.body.name !== undefined) view.name = sanitizeName(req.body.name, view.name);
    if (req.body.isDefault === true) {
      user.dashboardViews.forEach(v => { v.isDefault = v.id === viewId });
    }
    view.updatedAt = new Date();

    await user.save();
    return res.json({ success: true, data: { view } });
  } catch (e) {
    console.error('dashboardController.updateView failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── PUT active view selector ─────────────────────────────────────────────────
const setActiveView = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { viewId } = req.body;
    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    const exists = user.dashboardViews.find(v => v.id === viewId);
    if (!exists) return res.status(404).json({ success: false, message: 'Vista no encontrada' });

    user.dashboardActiveViewId = viewId;
    await user.save();
    return res.json({ success: true, data: { activeViewId: viewId } });
  } catch (e) {
    console.error('dashboardController.setActiveView failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

// ─── PUT attribution settings (multi-touch model + lookback) ─────────────────
const VALID_MODELS = ['last_touch', 'linear', 'time_decay'];
const setAttributionSettings = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const { model, lookbackDays } = req.body || {};
    const user = await Usuario.findById(req.usuario.id);
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });

    if (model !== undefined) {
      if (!VALID_MODELS.includes(model)) {
        return res.status(400).json({ success: false, message: `model debe ser uno de ${VALID_MODELS.join(', ')}` });
      }
      user.attributionModel = model;
    }
    if (lookbackDays !== undefined) {
      const n = Number(lookbackDays);
      if (!Number.isFinite(n) || n < 1 || n > 90) {
        return res.status(400).json({ success: false, message: 'lookbackDays debe estar entre 1 y 90' });
      }
      user.attributionLookbackDays = n;
    }

    await user.save();
    return res.json({
      success: true,
      data: {
        attributionModel: user.attributionModel,
        attributionLookbackDays: user.attributionLookbackDays,
      },
    });
  } catch (e) {
    console.error('dashboardController.setAttributionSettings failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

const getAttributionSettings = async (req, res) => {
  try {
    if (!database.estaConectado()) await database.conectar();
    const user = await Usuario.findById(req.usuario.id).select('attributionModel attributionLookbackDays');
    if (!user) return res.status(404).json({ success: false, message: 'Usuario no encontrado' });
    return res.json({
      success: true,
      data: {
        attributionModel: user.attributionModel || 'last_touch',
        attributionLookbackDays: user.attributionLookbackDays || 30,
      },
    });
  } catch (e) {
    console.error('dashboardController.getAttributionSettings failed:', e);
    return res.status(500).json({ success: false, message: 'Error interno' });
  }
};

module.exports = {
  getViews,
  saveViews,
  updateView,
  setActiveView,
  setAttributionSettings,
  getAttributionSettings,
};
