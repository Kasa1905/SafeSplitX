/**
 * Authentication Routes for SafeSplitX
 * Handles user registration, login, token refresh, and password management
 */

const express = require('express');
const rateLimit = require('express-rate-limit');
const { body, validationResult } = require('express-validator');
const authController = require('../controllers/authController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');

const router = express.Router();

// Rate limiting for auth routes
const authLimiterBase = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 5, // limit each IP to 5 requests per windowMs
  message: {
    error: 'Too many authentication attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  },
  standardHeaders: true,
  legacyHeaders: false
});

const passwordResetLimiterBase = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 3, // limit each IP to 3 password reset requests per hour
  message: {
    error: 'Too many password reset attempts, please try again later',
    code: 'RATE_LIMIT_EXCEEDED'
  }
});

// In test environment, bypass rate limiting to avoid flakiness
const maybe = (mw) => (req, res, next) => {
  if (process.env.NODE_ENV === 'test') return next();
  return mw(req, res, next);
};

const authLimiter = maybe(authLimiterBase);
const passwordResetLimiter = maybe(passwordResetLimiterBase);

// Validation middleware
const validateRegister = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email format'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character'),
  body('firstName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number')
];

const validateLogin = [
  body('email')
    .notEmpty()
    .withMessage('Email and password are required'),
  body('password')
    .notEmpty()
    .withMessage('Email and password are required')
];

const validateForgotPassword = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email address')
];

const validateResetPassword = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const validateChangePassword = [
  body('currentPassword')
    .notEmpty()
    .withMessage('Current password is required'),
  body('newPassword')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
    .withMessage('Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character')
];

const validateUpdateProfile = [
  body('firstName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be between 1 and 50 characters'),
  body('lastName')
    .optional()
    .trim()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be between 1 and 50 characters'),
  body('phone')
    .optional()
    .isMobilePhone()
    .withMessage('Please provide a valid phone number'),
  body('timezone')
    .optional()
    .isIn(['UTC', 'America/New_York', 'America/Chicago', 'America/Denver', 'America/Los_Angeles', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo', 'Asia/Shanghai'])
    .withMessage('Invalid timezone'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const firstMsg = errors.array()[0]?.msg || 'Validation failed';
    return res.status(400).json({
      success: false,
      error: firstMsg,
      details: errors.array(),
      requestId: req.requestId
    });
  }
  next();
};

// Add request ID to all routes
router.use(generateRequestId);

/**
 * @route   POST /api/auth/register
 * @desc    Register a new user
 * @access  Public
 */
router.post('/register', 
  authLimiter,
  validateRegister,
  handleValidationErrors,
  authController.register
);

/**
 * @route   POST /api/auth/login
 * @desc    Login user and return JWT tokens
 * @access  Public
 */
router.post('/login',
  authLimiter,
  validateLogin,
  handleValidationErrors,
  authController.login
);

/**
 * @route   POST /api/auth/refresh
 * @desc    Refresh access token using refresh token
 * @access  Public (requires refresh token)
 */
router.post('/refresh', authController.refreshToken);

/**
 * @route   POST /api/auth/logout
 * @desc    Logout user and invalidate tokens
 * @access  Private
 */
router.post('/logout', authController.logout);
if (typeof authController.logout !== 'function') {
  // eslint-disable-next-line no-console
  console.warn('authController.logout is not a function:', typeof authController.logout, JSON.stringify(authController.logout, null, 2));
}

/**
 * @route   POST /api/auth/forgot-password
 * @desc    Send password reset email
 * @access  Public
 */
router.post('/forgot-password',
  passwordResetLimiter,
  validateForgotPassword,
  handleValidationErrors,
  authController.forgotPassword
);

/**
 * @route   POST /api/auth/reset-password
 * @desc    Reset password using token
 * @access  Public
 */
router.post('/reset-password',
  passwordResetLimiter,
  validateResetPassword,
  handleValidationErrors,
  authController.resetPassword
);

/**
 * @route   POST /api/auth/change-password
 * @desc    Change user password
 * @access  Private
 */
router.post('/change-password',
  auth,
  validateChangePassword,
  handleValidationErrors,
  authController.changePassword
);

/**
 * @route   GET /api/auth/me
 * @desc    Get current user profile
 * @access  Private
 */
router.get('/me', auth, authController.getCurrentUser);
router.get('/profile', auth, authController.getCurrentUser);

/**
 * @route   PUT /api/auth/me
 * @desc    Update user profile
 * @access  Private
 */
router.put('/me',
  auth,
  validateUpdateProfile,
  handleValidationErrors,
  authController.updateProfile
);
router.put('/profile',
  auth,
  validateUpdateProfile,
  handleValidationErrors,
  authController.updateProfile
);

/**
 * @route   POST /api/auth/verify-email
 * @desc    Verify email address
 * @access  Public
 */
router.post('/verify-email/:token', authController.verifyEmail);

/**
 * @route   POST /api/auth/resend-verification
 * @desc    Resend email verification
 * @access  Private
 */
router.post('/resend-verification', auth, authController.resendVerification);

/**
 * @route   DELETE /api/auth/account
 * @desc    Delete user account
 * @access  Private
 */
router.delete('/account',
  auth,
  body('password').notEmpty().withMessage('Password is required for account deletion'),
  handleValidationErrors,
  authController.deleteAccount
);

module.exports = router;