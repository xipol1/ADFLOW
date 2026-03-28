'use strict';
const FileService = require('../services/fileService');
const fileService = new FileService();

const subirArchivos = async (req, res) => {
  try {
    const usuarioId = req.usuario?.id;
    const archivos = req.files || (req.file ? [req.file] : []);
    if (!archivos.length) return res.status(400).json({ exito: false, mensaje: 'No se recibieron archivos' });
    const resultados = await Promise.all(archivos.map(f => fileService.guardarArchivo({ nombre: f.originalname, ruta: f.path, tamano: f.size, tipoMime: f.mimetype, categoria: req.body?.categoria || 'general' }, usuarioId)));
    return res.status(201).json({ exito: true, datos: resultados });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message || 'Error al subir' });
  }
};

const listarArchivos = async (req, res) => {
  try {
    const result = await fileService.listarArchivos(req.usuario?.id, req.query);
    return res.json({ exito: true, ...result });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message });
  }
};

const obtenerArchivo = async (req, res) => {
  try {
    const archivo = await fileService.obtenerArchivo(req.params.id, req.usuario?.id);
    return res.json({ exito: true, datos: archivo });
  } catch (e) {
    return res.status(404).json({ exito: false, mensaje: 'Archivo no encontrado' });
  }
};

const obtenerInfoArchivo  = obtenerArchivo;
const obtenerThumbnail    = obtenerArchivo;
const descargarArchivo    = obtenerArchivo;
const buscarArchivos      = listarArchivos;
const obtenerEstadisticas = async (req, res) => {
  try {
    const stats = await fileService.obtenerEstadisticas(req.usuario?.id);
    return res.json({ exito: true, datos: stats });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message });
  }
};

const actualizarArchivo = async (req, res) => {
  try {
    return res.status(501).json({ exito: false, mensaje: 'No implementado' });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message });
  }
};

const eliminarArchivo = async (req, res) => {
  try {
    await fileService.eliminarArchivo(req.params.id, req.usuario?.id);
    return res.json({ exito: true, mensaje: 'Eliminado' });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message });
  }
};

const limpiarTemporales = async (req, res) => {
  try {
    const result = await fileService.limpiarArchivosTemporales(Number(req.query.horas) || 24);
    return res.json({ exito: true, datos: result });
  } catch (e) {
    return res.status(500).json({ exito: false, mensaje: e.message });
  }
};

const limpiarExpirados = limpiarTemporales;

module.exports = { obtenerArchivo, obtenerThumbnail, subirArchivos, listarArchivos, buscarArchivos, obtenerEstadisticas, obtenerInfoArchivo, descargarArchivo, actualizarArchivo, eliminarArchivo, limpiarTemporales, limpiarExpirados };
