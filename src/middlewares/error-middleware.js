import logger from '../utils/logger.js';
import env from '../config/env.js';
import AppError from '../utils/app-error.js';

/**
 * Handle MongoDB CastError (invalid ObjectId)
 */
const handleCastErrorDB = (err) => {
  const message = `Invalid ${err.path}: ${err.value}`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB duplicate key error
 */
const handleDuplicateFieldsDB = (err) => {
  const field = Object.keys(err.keyValue)[0];
  const value = err.keyValue[field];
  const message = `Duplicate value for field '${field}': ${value}. Please use another value.`;
  return new AppError(message, 400);
};

/**
 * Handle MongoDB validation error
 */
const handleValidationErrorDB = (err) => {
  const errors = Object.values(err.errors).map((el) => el.message);
  const message = `Invalid input data. ${errors.join('. ')}`;
  return new AppError(message, 400);
};

/**
 * Handle JWT error
 */
const handleJWTError = () =>
  new AppError('Invalid token. Please log in again.', 401);

/**
 * Handle JWT expired error
 */
const handleJWTExpiredError = () =>
  new AppError('Your session has expired. Please log in again.', 401);

/**
 * Handle syntax error in JSON body
 */
const handleSyntaxError = () =>
  new AppError('Invalid JSON in request body.', 400);

/**
 * Handle payload too large error
 */
const handlePayloadTooLarge = () =>
  new AppError('Request payload is too large. Maximum size is 10KB.', 413);

/**
 * Global error handling middleware
 */
const errorMiddleware = (err, req, res, next) => {
  err.statusCode = err.statusCode || 500;
  err.status = err.status || 'error';
  
  // Log error details
  const errorLog = {
    message: err.message,
    statusCode: err.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.userId || req.adminId || 'anonymous',
  };
  
  // Log stack trace only for server errors or in development
  if (err.statusCode >= 500 || env.nodeEnv === 'development') {
    errorLog.stack = err.stack;
  }
  
  // Use appropriate log level
  if (err.statusCode >= 500) {
    logger.error('Server error:', errorLog);
  } else if (err.statusCode >= 400) {
    logger.warn('Client error:', errorLog);
  }
  
  // Transform known error types
  let error = { ...err, message: err.message };
  
  // MongoDB errors
  if (err.name === 'CastError') error = handleCastErrorDB(err);
  if (err.code === 11000) error = handleDuplicateFieldsDB(err);
  if (err.name === 'ValidationError') error = handleValidationErrorDB(err);
  
  // JWT errors
  if (err.name === 'JsonWebTokenError') error = handleJWTError();
  if (err.name === 'TokenExpiredError') error = handleJWTExpiredError();
  
  // Body parser errors
  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    error = handleSyntaxError();
  }
  
  // Payload too large
  if (err.type === 'entity.too.large') {
    error = handlePayloadTooLarge();
  }
  
  if (env.nodeEnv === 'development') {
    return sendDevError(error, err, res);
  }
  
  return sendProdError(error, res);
};

/**
 * Send detailed error in development
 */
const sendDevError = (error, originalError, res) => {
  res.status(error.statusCode || 500).json({
    status: error.status || 'error',
    message: error.message,
    error: {
      ...error,
      name: originalError.name,
      code: originalError.code,
    },
    stack: originalError.stack,
    // Include validation errors if present
    ...(error.errors && { errors: error.errors }),
  });
};

/**
 * Send minimal error in production
 */
const sendProdError = (error, res) => {
  // Operational errors: send message to client
  if (error.isOperational) {
    const response = {
      status: error.status || 'fail',
      message: error.message,
    };
    
    // Include validation errors for validation failures
    if (error.isValidationError && error.errors) {
      response.errors = error.errors;
    }
    
    return res.status(error.statusCode).json(response);
  }
  
  // Programming/unknown errors: don't leak details
  return res.status(500).json({
    status: 'error',
    message: 'Something went wrong. Please try again later.',
  });
};

export default errorMiddleware;
