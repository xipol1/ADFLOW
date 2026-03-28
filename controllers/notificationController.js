'use strict';
const Notificacion = require('../models/Notificacion');
const { ensureDb } = require('../lib/ensureDb');

const uid = (req) => req.usuario?.id || req.usuario?._id;

const obtenerNotificaciones = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const { pagina = 1, limite = 20, leida } = req.query;
  const query = { usuario: uid(req), archivada: false };
  if (leida !== undefined) query.leida = leida === 'true';
  const items = await Notificacion.find(query).sort({ createdAt: -1 }).skip((pagina - 1) * limite).limit(Number(limite)).lean();
  return res.json({ success: true, data: items });
};

const contarNoLeidas = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const count = await Notificacion.countDocuments({ usuario: uid(req), leida: false, archivada: false });
  return res.json({ success: true, data: { count } });
};

const marcarComoLeida = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Notificacion.findOneAndUpdate({ _id: req.params.id, usuario: uid(req) }, { leida: true });
  return res.json({ success: true });
};

const marcarTodasComoLeidas = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Notificacion.updateMany({ usuario: uid(req), leida: false }, { leida: true });
  return res.json({ success: true });
};

const archivarNotificacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Notificacion.findOneAndUpdate({ _id: req.params.id, usuario: uid(req) }, { archivada: true });
  return res.json({ success: true });
};

const eliminarNotificacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Notificacion.findOneAndDelete({ _id: req.params.id, usuario: uid(req) });
  return res.json({ success: true });
};

const crearNotificacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const { usuario, tipo, titulo, mensaje, prioridad } = req.body || {};
  const n = await Notificacion.create({ usuario, tipo, titulo, mensaje, prioridad: prioridad || 'normal' });
  return res.status(201).json({ success: true, data: n });
};

const obtenerNotificacion = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  const n = await Notificacion.findOne({ _id: req.params.id, usuario: uid(req) }).lean();
  if (!n) return res.status(404).json({ success: false, message: 'No encontrada' });
  return res.json({ success: true, data: n });
};

const buscarNotificaciones = async (req, res) => obtenerNotificaciones(req, res);
const obtenerEstadisticas  = async (req, res) => contarNoLeidas(req, res);
const enviarNotificacionMasiva = async (req, res) => res.status(501).json({ success: false, message: 'No implementado' });
const limpiarExpiradas = async (req, res) => {
  const ok = await ensureDb(); if (!ok) return res.status(503).json({ success: false, message: 'Servicio no disponible' });
  await Notificacion.deleteMany({ expiraEn: { $lt: new Date() } });
  return res.json({ success: true });
};
const limpiarAntiguas = limpiarExpiradas;

module.exports = { obtenerNotificaciones, contarNoLeidas, buscarNotificaciones, obtenerEstadisticas, obtenerNotificacion, marcarTodasComoLeidas, marcarComoLeida, archivarNotificacion, eliminarNotificacion, crearNotificacion, enviarNotificacionMasiva, limpiarExpiradas, limpiarAntiguas };
