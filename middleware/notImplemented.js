const notImplementedModule = (moduleName) => {
  return (req, res) => {
    res.status(501).json({
      success: false,
      code: 'NOT_IMPLEMENTED',
      module: moduleName,
      message: 'Módulo pendiente'
    });
  };
};

module.exports = { notImplementedModule };
