/**
 * Middleware de manejo de errores global
 */

const errorHandler = (err, req, res, next) => {
  console.error('Error:', err.message);

  const statusCode = err.statusCode || err.status || 500;

  res.status(statusCode).json({
    success: false,
    code: err.code || 'INTERNAL_ERROR',
    message: err.message || 'Error interno del servidor',
    fields: err.fields || null,
    timestamp: new Date().toISOString(),
    path: req.path
  });
};

/**
 * Middleware para rutas no encontradas
 */
const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    code: 'NOT_FOUND',
    message: 'Ruta no encontrada',
    fields: null,
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method
  });
};

module.exports = {
  errorHandler,
  notFoundHandler
};
