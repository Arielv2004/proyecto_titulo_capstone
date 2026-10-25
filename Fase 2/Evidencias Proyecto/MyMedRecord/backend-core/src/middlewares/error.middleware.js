const errorHandler = (err, req, res, next) => {
  console.error('[Error Handler] Error capturado:', err);

  const statusCode = err.statusCode || (err.name === 'MulterError' ? 400 : 500);
  const message = err.message || 'Error interno del servidor';

  res.status(statusCode).json({
    success: false,
    message,
  });
};

module.exports = errorHandler;
