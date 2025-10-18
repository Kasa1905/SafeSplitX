/**
 * Error Handler Middleware for SafeSplitX Backend
 * Centralized error handling
 */

const logger = require('../utils/logger');

const errorHandler = (error, req, res, next) => {
  let statusCode = error.statusCode || error.status || 500;
  let message = error.message || 'Internal Server Error';

  // Mongoose validation error
  if (error.name === 'ValidationError') {
    statusCode = 400;
    message = Object.values(error.errors).map(err => err.message).join(', ');
  }

  // Mongoose duplicate key error
  if (error.code === 11000) {
    statusCode = 400;
    message = 'Resource already exists';
  }

  // JWT errors
  if (error.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (error.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // PostgreSQL errors
  if (error.name === 'SequelizeUniqueConstraintError') {
    statusCode = 400;
    message = 'Resource already exists';
  }

  if (error.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = error.errors.map(err => err.message).join(', ');
  }

  // Log error
  logger.error(`Error ${statusCode}: ${message}`, {
    error: error.message,
    stack: error.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userAgent: req.get('User-Agent')
  });

  // Send error response
  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack,
      details: error 
    }),
    timestamp: new Date().toISOString(),
    requestId: req.requestId || 'unknown'
  });
};

module.exports = errorHandler;