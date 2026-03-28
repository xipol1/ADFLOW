'use strict';
const Anuncio = require('../models/Anuncio');
const { ensureDb } = require('../lib/ensureDb');

const userIdOf = (req) => req.usuario?.id || req.usuario?._id;
const roleOf   = (req) => req.usuario?.rol || req.usuario?.role;

const crearAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const { titulo, descripcion, presupuesto, canal, tipoAnuncio } = req.body || {};
  const anuncio = await Anuncio.create({ anunciante: userIdOf(req), titulo: String(titulo||'').trim(), descripcion: String(descripcion||'').trim(), tipoAnuncio: String(tipoAnuncio||'').trim(), 'presupuesto.montoTotal': Number(presupuesto||0), canal: canal||undefined, estado: 'borrador' });
  return res.status(201).json({ success: true, data: anuncio });
};

const obtenerMisAnuncios = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const role = roleOf(req); const uid = userIdOf(req);
  const query = role === 'admin' ? {} : role === 'creator' ? { creador: uid } : { anunciante: uid };
  const items = await Anuncio.find(query).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: items });
};

const obtenerAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const anuncio = await Anuncio.findById(req.params.id).lean();
  if (!anuncio) return res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
  return res.json({ success: true, data: anuncio });
};

const actualizarAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const anuncio = await Anuncio.findById(req.params.id);
  if (!anuncio) return res.status(404).json({ success: false, message: 'Anuncio no encontrado' });
  const { titulo, descripcion, presupuesto, tipoAnuncio } = req.body || {};
  if (titulo !== undefined) anuncio.titulo = String(titulo).trim();
  if (descripcion !== undefined) anuncio.descripcion = String(descripcion).trim();
  if (tipoAnuncio !== undefined) anuncio.tipoAnuncio = String(tipoAnuncio).trim();
  if (presupuesto !== undefined) anuncio.presupuesto.montoTotal = Number(presupuesto);
  await anuncio.save();
  return res.json({ success: true, data: anuncio });
};

const eliminarAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Anuncio.findByIdAndDelete(req.params.id);
  return res.json({ success: true, message: 'Anuncio eliminado' });
};

const enviarParaAprobacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const anuncio = await Anuncio.findByIdAndUpdate(req.params.id, { estado: 'pendiente_aprobacion' }, { new: true });
  return res.json({ success: true, data: anuncio });
};

const responderAprobacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const { aprobado } = req.body || {};
  const estado = aprobado ? 'aprobado' : 'rechazado';
  const anuncio = await Anuncio.findByIdAndUpdate(req.params.id, { estado }, { new: true });
  return res.json({ success: true, data: anuncio });
};

const activarAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const anuncio = await Anuncio.findByIdAndUpdate(req.params.id, { estado: 'activo' }, { new: true });
  return res.json({ success: true, data: anuncio });
};

const completarAnuncio = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const anuncio = await Anuncio.findByIdAndUpdate(req.params.id, { estado: 'completado' }, { new: true });
  return res.json({ success: true, data: anuncio });
};

const trackClick = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Anuncio.findByIdAndUpdate(req.params.id, { $inc: { 'tracking.clicks': 1 } });
  return res.json({ success: true });
};

const trackConversion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Anuncio.findByIdAndUpdate(req.params.id, { $inc: { 'tracking.conversions': 1 } });
  return res.json({ success: true });
};

const obtenerAnunciosParaCreador = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const items = await Anuncio.find({ creador: userIdOf(req) }).sort({ createdAt: -1 }).lean();
  return res.json({ success: true, data: items });
};

const obtenerEstadisticas = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const uid = userIdOf(req);
  const [total, activos, pendientes] = await Promise.all([
    Anuncio.countDocuments({ anunciante: uid }),
    Anuncio.countDocuments({ anunciante: uid, estado: 'activo' }),
    Anuncio.countDocuments({ anunciante: uid, estado: 'pendiente_aprobacion' })
  ]);
  return res.json({ success: true, data: { total, activos, pendientes } });
};

const buscarAnuncios = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const { estado, canal } = req.query;
  const query = {};
  if (estado) query.estado = estado;
  if (canal) query.canal = canal;
  const items = await Anuncio.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return res.json({ success: true, data: items });
};

module.exports = { crearAnuncio, trackClick, trackConversion, obtenerMisAnuncios, obtenerAnunciosParaCreador, obtenerEstadisticas, obtenerAnuncio, actualizarAnuncio, eliminarAnuncio, enviarParaAprobacion, responderAprobacion, activarAnuncio, completarAnuncio, buscarAnuncios };
