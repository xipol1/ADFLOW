const { validationResult } = require('express-validator');

const validarCampos = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: errors.array()
    });
  }
  next();
};

const validarPaginacion = (req, res, next) => {
  const pagina = req.query?.pagina;
  const limite = req.query?.limite;

  const parsePositiveInt = (value) => {
    if (value == null || value === '') return null;
    const n = Number.parseInt(String(value), 10);
    if (!Number.isFinite(n) || n < 1) return NaN;
    return n;
  };

  const paginaNum = parsePositiveInt(pagina);
  const limiteNum = parsePositiveInt(limite);

  if (Number.isNaN(paginaNum) || Number.isNaN(limiteNum)) {
    return res.status(400).json({
      success: false,
      message: 'Datos inválidos',
      errors: [{ msg: 'Paginación inválida', param: 'pagina/limite', location: 'query' }]
    });
  }

  next();
};

module.exports = { validarCampos, validarPaginacion };
