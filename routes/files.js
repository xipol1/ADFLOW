const express = require('express');
const { param } = require('express-validator');
const { autenticar } = require('../middleware/auth');
const { validarCampos } = require('../middleware/validarCampos');
const FileService = require('../services/fileService');
const c = require('../controllers/fileController');

const router = express.Router();
const fileService = new FileService();
const id = [param('id').isMongoId().withMessage('ID inválido'), validarCampos];
const upload = fileService.getMulterConfig('general');

router.use(autenticar);
router.get('/',                  c.listarArchivos);
router.get('/estadisticas',      c.obtenerEstadisticas);
router.post('/upload',           upload.array('archivos', 5), c.subirArchivos);
router.get('/:id',               id, c.obtenerArchivo);
router.get('/:id/info',          id, c.obtenerInfoArchivo);
router.delete('/:id',            id, c.eliminarArchivo);

module.exports = router;
