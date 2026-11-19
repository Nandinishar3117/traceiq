const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error(`Unhandled error during ${req.method} ${req.originalUrl}: ${err.message}`, {
    stack: err.stack
  });

  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    error: {
      message: err.message || 'Internal Server Error',
      status: statusCode,
      path: req.originalUrl,
      timestamp: new Date().toISOString()
    }
  });
}

module.exports = errorHandler;
