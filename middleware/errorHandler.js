const logger = require('../config/logger');

// Custom error class
class AppError extends Error {
  constructor(message, statusCode) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
    Error.captureStackTrace(this, this.constructor);
  }
}

// Error handler middleware
const errorHandler = (err, req, res, next) => {
  let error = { ...err };
  error.message = err.message;
  error.statusCode = err.statusCode || 500;

  // Log error
  logger.error({
    message: error.message,
    statusCode: error.statusCode,
    stack: err.stack,
    url: req.url,
    method: req.method
  });

  // Multer file upload errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    error.message = 'File size is too large. Maximum size is 1MB';
    error.statusCode = 400;
  }

  // Database errors
  if (err.code === 'SQLITE_CONSTRAINT') {
    error.message = 'Database constraint violation';
    error.statusCode = 400;
  }

  // Send response
  if (process.env.NODE_ENV === 'production') {
    res.status(error.statusCode).json({
      success: false,
      message: error.isOperational ? error.message : 'Internal server error'
    });
  } else {
    res.status(error.statusCode).json({
      success: false,
      message: error.message,
      stack: err.stack
    });
  }
};

// Catch async errors
const catchAsync = (fn) => {
  return (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

module.exports = {
  AppError,
  errorHandler,
  catchAsync
};
