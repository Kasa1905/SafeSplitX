/**
 * Centralized logging system for SafeSplitX
 * Designed for fraud detection, settlement events, and comprehensive monitoring
 */

const winston = require('winston');
const path = require('path');
const fs = require('fs');
const { generateId } = require('./helpers');

// Ensure logs directory exists
const logsDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

/**
 * Custom log format for structured logging
 */
const logFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json(),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    const logEntry = {
      timestamp,
      level: level.toUpperCase(),
      message,
      correlationId: meta.correlationId || generateId(),
      service: 'SafeSplitX',
      ...meta
    };
    
    // Mask sensitive data
    return JSON.stringify(maskSensitiveData(logEntry));
  })
);

/**
 * Console format for development
 */
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({
    format: 'HH:mm:ss'
  }),
  winston.format.printf(({ timestamp, level, message, correlationId, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] ${level} [${correlationId || 'N/A'}]: ${message}${metaStr}`;
  })
);

/**
 * Base logger configuration
 */
const createLogger = (filename, level = 'info') => {
  const transports = [
    // File transport
    new winston.transports.File({
      filename: path.join(logsDir, filename),
      level,
      format: logFormat,
      maxsize: 10485760, // 10MB
      maxFiles: 10,
      tailable: true
    })
  ];
  
  // Add console transport in development
  if (process.env.NODE_ENV !== 'production') {
    transports.push(
      new winston.transports.Console({
        level: 'debug',
        format: consoleFormat
      })
    );
  }
  
  return winston.createLogger({
    level,
    transports,
    exitOnError: false,
    handleExceptions: true,
    handleRejections: true
  });
};

/**
 * Specialized loggers for different event types
 */

// Main application logger
const appLogger = createLogger('application.log', 'info');

// Fraud detection logger
const fraudLogger = createLogger('fraud.log', 'warn');

// Settlement events logger
const settlementLogger = createLogger('settlements.log', 'info');

// Transaction logger
const transactionLogger = createLogger('transactions.log', 'info');

// Security events logger
const securityLogger = createLogger('security.log', 'warn');

// Audit trail logger
const auditLogger = createLogger('audit.log', 'info');

// Performance monitoring logger
const performanceLogger = createLogger('performance.log', 'info');

/**
 * Mask sensitive data in logs
 * @param {Object} data - Data to mask
 * @returns {Object} Masked data
 */
function maskSensitiveData(data) {
  const sensitiveFields = [
    'password', 'token', 'secret', 'key', 'authorization',
    'ssn', 'creditCard', 'bankAccount', 'pin', 'otp'
  ];
  
  const masked = { ...data };
  
  const maskValue = (obj, path = '') => {
    for (const [key, value] of Object.entries(obj)) {
      const currentPath = path ? `${path}.${key}` : key;
      
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        maskValue(value, currentPath);
      } else if (sensitiveFields.some(field => 
        key.toLowerCase().includes(field.toLowerCase()) ||
        currentPath.toLowerCase().includes(field.toLowerCase())
      )) {
        obj[key] = '***MASKED***';
      }
    }
  };
  
  maskValue(masked);
  return masked;
}

/**
 * Add correlation ID to log context
 * @param {string} correlationId - Correlation ID
 * @returns {Object} Logger context
 */
function withCorrelationId(correlationId) {
  return {
    correlationId: correlationId || generateId()
  };
}

/**
 * Log fraud-related events
 * @param {string} event - Event type
 * @param {Object} data - Event data
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID
 */
function logFraudEvent(event, data, userId = null, correlationId = null) {
  fraudLogger.warn('Fraud detection event', {
    event,
    userId,
    data,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Log settlement events
 * @param {string} action - Settlement action
 * @param {Object} settlement - Settlement data
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID
 */
function logSettlementEvent(action, settlement, userId, correlationId = null) {
  settlementLogger.info('Settlement event', {
    action,
    settlementId: settlement.id,
    amount: settlement.amount,
    currency: settlement.currency,
    fromUserId: settlement.fromUserId,
    toUserId: settlement.toUserId,
    groupId: settlement.groupId,
    userId,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Log transaction events
 * @param {string} type - Transaction type
 * @param {Object} transaction - Transaction data
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID
 */
function logTransactionEvent(type, transaction, userId, correlationId = null) {
  transactionLogger.info('Transaction event', {
    type,
    transactionId: transaction.id,
    amount: transaction.amount,
    currency: transaction.currency,
    status: transaction.status,
    userId,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Log security events
 * @param {string} event - Security event type
 * @param {Object} data - Event data
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID
 */
function logSecurityEvent(event, data, userId = null, correlationId = null) {
  securityLogger.warn('Security event', {
    event,
    userId,
    ipAddress: data.ipAddress,
    userAgent: data.userAgent,
    details: data.details,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Log audit trail
 * @param {string} action - Action performed
 * @param {string} resource - Resource affected
 * @param {Object} changes - Changes made
 * @param {string} userId - User ID
 * @param {string} correlationId - Correlation ID
 */
function logAuditEvent(action, resource, changes, userId, correlationId = null) {
  auditLogger.info('Audit event', {
    action,
    resource,
    changes,
    userId,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Log performance metrics
 * @param {string} operation - Operation name
 * @param {number} duration - Duration in milliseconds
 * @param {Object} metadata - Additional metadata
 * @param {string} correlationId - Correlation ID
 */
function logPerformance(operation, duration, metadata = {}, correlationId = null) {
  performanceLogger.info('Performance metric', {
    operation,
    duration,
    metadata,
    timestamp: new Date().toISOString(),
    ...withCorrelationId(correlationId)
  });
}

/**
 * Create request logger middleware
 * @param {Object} options - Logger options
 * @returns {Function} Express middleware
 */
function createRequestLogger(options = {}) {
  return (req, res, next) => {
    const startTime = Date.now();
    const correlationId = req.headers['x-correlation-id'] || generateId();
    
    // Add correlation ID to request
    req.correlationId = correlationId;
    
    // Log request
    appLogger.info('Incoming request', {
      method: req.method,
      url: req.url,
      userAgent: req.get('User-Agent'),
      ipAddress: req.ip || req.connection.remoteAddress,
      correlationId
    });
    
    // Override res.end to log response
    const originalEnd = res.end;
    res.end = function(...args) {
      const duration = Date.now() - startTime;
      
      appLogger.info('Outgoing response', {
        method: req.method,
        url: req.url,
        statusCode: res.statusCode,
        duration,
        correlationId
      });
      
      // Log performance metrics
      logPerformance(`${req.method} ${req.route?.path || req.url}`, duration, {
        statusCode: res.statusCode,
        method: req.method
      }, correlationId);
      
      originalEnd.apply(this, args);
    };
    
    next();
  };
}

/**
 * Error logger middleware
 * @param {Error} error - Error object
 * @param {Object} req - Request object
 * @param {Object} res - Response object
 * @param {Function} next - Next middleware
 */
function errorLogger(error, req, res, next) {
  const correlationId = req.correlationId || generateId();
  
  appLogger.error('Request error', {
    error: error.message,
    stack: error.stack,
    method: req.method,
    url: req.url,
    correlationId
  });
  
  // Log security-related errors
  if (error.status === 401 || error.status === 403) {
    logSecurityEvent('authentication_error', {
      error: error.message,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      details: { method: req.method, url: req.url }
    }, req.user?.id, correlationId);
  }
  
  next(error);
}

/**
 * Gracefully close all loggers
 */
function closeLoggers() {
  const loggers = [
    appLogger, fraudLogger, settlementLogger, transactionLogger,
    securityLogger, auditLogger, performanceLogger
  ];
  
  return Promise.all(
    loggers.map(logger => new Promise(resolve => {
      // Close all transports first
      const transportCloses = logger.transports.map(transport => 
        new Promise(resolveTransport => {
          if (typeof transport.close === 'function') {
            transport.close(() => resolveTransport());
          } else {
            resolveTransport();
          }
        })
      );
      
      Promise.all(transportCloses).then(() => {
        if (typeof logger.close === 'function') {
          logger.close(() => resolve());
        } else {
          // Fallback using setImmediate
          setImmediate(() => resolve());
        }
      });
    }))
  );
}

module.exports = {
  // Logger instances
  appLogger,
  fraudLogger,
  settlementLogger,
  transactionLogger,
  securityLogger,
  auditLogger,
  performanceLogger,
  
  // Utility functions
  maskSensitiveData,
  withCorrelationId,
  
  // Specialized logging functions
  logFraudEvent,
  logSettlementEvent,
  logTransactionEvent,
  logSecurityEvent,
  logAuditEvent,
  logPerformance,
  
  // Middleware
  createRequestLogger,
  errorLogger,
  
  // Cleanup
  closeLoggers
};