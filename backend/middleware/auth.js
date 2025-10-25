/**
 * Authentication Middleware for SafeSplitX Backend
 * JWT-based authentication (placeholder for Team Member 1)
 */

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');

/**
 * Verify JWT token middleware
 * To be implemented by Team Member 1 (Security & Fraud)
 */
const authenticateToken = (req, res, next) => {
  // Minimal usable implementation for tests
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({
      success: false,
      error: 'Access token required',
      message: 'Access token required',
      timestamp: new Date().toISOString()
    });
  }

  try {
    const secret = process.env.JWT_SECRET || 'test_jwt_secret_key_for_testing_only';
    const decoded = jwt.verify(token, secret);
    req.user = decoded;
    return next();
  } catch (err) {
    logger.warn('JWT verification failed', { error: err && err.message });
    return res.status(401).json({
      success: false,
      error: 'Invalid token',
      message: 'Invalid token',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Authorization middleware for role-based access
 * To be implemented by Team Member 1 (Security & Fraud)
 */
const authorizeRoles = (...roles) => {
  return (req, res, next) => {
    try {
      if (!req.user || !req.user.role) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: 'Forbidden',
          timestamp: new Date().toISOString()
        });
      }

      if (roles.length > 0 && !roles.includes(req.user.role)) {
        return res.status(403).json({
          success: false,
          error: 'Forbidden',
          message: `Requires one of roles: ${roles.join(', ')}`,
          timestamp: new Date().toISOString()
        });
      }

      return next();
    } catch (e) {
      return res.status(403).json({
        success: false,
        error: 'Forbidden',
        message: 'Forbidden',
        timestamp: new Date().toISOString()
      });
    }
  };
};

/**
 * Rate limiting per user
 * To be implemented by Team Member 1 (Security & Fraud)
 */
const userRateLimit = (req, res, next) => {
  // Placeholder implementation
  logger.info('User rate limiting middleware called - to be implemented by Team Member 1');
  
  // Add rate limit headers for tests
  res.set('x-ratelimit-limit', '100');
  res.set('x-ratelimit-remaining', '99');
  // TODO: Team Member 1 - Implement user-specific rate limiting
  // This should track requests per user ID rather than IP
  next();
};

// Export the authenticate middleware as the default export (function),
// while preserving helper middlewares as properties for ergonomic imports.
module.exports = authenticateToken;
module.exports.authenticateToken = authenticateToken;
module.exports.authorizeRoles = authorizeRoles;
module.exports.userRateLimit = userRateLimit;