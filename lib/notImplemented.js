const express = require('express');

const notImplementedPayload = (module) => {
  return {
    success: false,
    code: 'NOT_IMPLEMENTED',
    module: String(module || ''),
    message: 'Módulo pendiente'
  };
};

const notImplementedHandler = (module) => {
  return (req, res) => {
    res.status(501).json(notImplementedPayload(module));
  };
};

const notImplementedRouter = (module) => {
  const router = express.Router();
  router.use(notImplementedHandler(module));
  return router;
};

module.exports = {
  notImplementedPayload,
  notImplementedHandler,
  notImplementedRouter
};

