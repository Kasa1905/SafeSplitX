/**
 * Settlement Routes for SafeSplitX
 * Handles settlement calculations, payment processing, and reminders
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const settlementController = require('../controllers/settlementController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Validation middleware
const validateCreateSettlement = [
  body('groupId')
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  body('fromUserId')
    .custom(isValidId)
    .withMessage('Invalid from user ID'),
  body('toUserId')
    .custom(isValidId)
    .withMessage('Invalid to user ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('type')
    .optional()
    .isIn(['direct', 'optimized', 'split'])
    .withMessage('Invalid settlement type'),
  body('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal', 'venmo', 'cash', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('expenses')
    .optional()
    .isArray()
    .withMessage('Expenses must be an array'),
  body('expenses.*.expenseId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('expenses.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Expense amount must be non-negative')
];

const validateUpdateSettlement = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid settlement ID'),
  body('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal', 'venmo', 'cash', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters'),
  body('dueDate')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value <= new Date()) {
        throw new Error('Due date must be in the future');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters')
];

const validateSettlementQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'in_progress', 'completed', 'cancelled', 'failed'])
    .withMessage('Invalid status'),
  query('groupId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  query('fromUserId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid from user ID'),
  query('toUserId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid to user ID'),
  query('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal', 'venmo', 'cash', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  query('isOverdue')
    .optional()
    .isBoolean()
    .withMessage('isOverdue must be a boolean'),
  query('startDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'amount', 'dueDate', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validatePayment = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid settlement ID'),
  body('paymentMethod')
    .isIn(['stripe', 'paypal', 'venmo', 'cash', 'bank_transfer', 'other'])
    .withMessage('Invalid payment method'),
  body('transactionId')
    .optional()
    .isLength({ min: 1, max: 100 })
    .withMessage('Transaction ID must be between 1 and 100 characters'),
  body('paymentData')
    .optional()
    .isObject()
    .withMessage('Payment data must be an object'),
  body('notes')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Notes cannot exceed 500 characters')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: errors.array(),
      requestId: req.requestId
    });
  }
  next();
};

// Add request ID to all routes
router.use(generateRequestId);

/**
 * @route   POST /api/settlements
 * @desc    Create a new settlement
 * @access  Private
 * Note: Validation runs before auth to provide better error messages
 */
router.post('/',
  validateCreateSettlement,
  handleValidationErrors,
  auth,
  settlementController.createSettlement
);

// All other routes require authentication
router.use(auth);

/**
 * @route   GET /api/settlements
 * @desc    Get settlements with filtering and pagination
 * @access  Private
 */
router.get('/',
  validateSettlementQuery,
  handleValidationErrors,
  settlementController.getSettlements
);

/**
 * @route   GET /api/settlements/:id
 * @desc    Get settlement by ID
 * @access  Private
 */
router.get('/:id',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  handleValidationErrors,
  settlementController.getSettlementById
);

/**
 * @route   PUT /api/settlements/:id
 * @desc    Update settlement
 * @access  Private
 */
router.put('/:id',
  validateUpdateSettlement,
  handleValidationErrors,
  settlementController.updateSettlement
);

/**
 * @route   DELETE /api/settlements/:id
 * @desc    Cancel settlement
 * @access  Private
 */
router.delete('/:id',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Cancellation reason must be between 1 and 500 characters'),
  handleValidationErrors,
  settlementController.cancelSettlement
);

/**
 * @route   POST /api/settlements/:id/pay
 * @desc    Mark settlement as paid or process payment
 * @access  Private
 */
router.post('/:id/pay',
  validatePayment,
  handleValidationErrors,
  settlementController.processPayment
);

/**
 * @route   POST /api/settlements/:id/confirm
 * @desc    Confirm settlement payment (by payee)
 * @access  Private
 */
router.post('/:id/confirm',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
  settlementController.confirmPayment
);

/**
 * @route   POST /api/settlements/:id/dispute
 * @desc    Dispute settlement payment
 * @access  Private
 */
router.post('/:id/dispute',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Dispute reason must be between 1 and 500 characters'),
  body('evidence').optional().isLength({ max: 1000 }).withMessage('Evidence cannot exceed 1000 characters'),
  handleValidationErrors,
  settlementController.disputePayment
);

/**
 * @route   POST /api/settlements/:id/reminder
 * @desc    Send payment reminder
 * @access  Private
 */
router.post('/:id/reminder',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('message').optional().isLength({ max: 500 }).withMessage('Custom message cannot exceed 500 characters'),
  handleValidationErrors,
  settlementController.sendReminder
);

/**
 * @route   GET /api/settlements/pending
 * @desc    Get pending settlements for current user
 * @access  Private
 */
router.get('/pending',
  query('type').optional().isIn(['incoming', 'outgoing', 'all']).withMessage('Type must be incoming, outgoing, or all'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  settlementController.getPendingSettlements
);

/**
 * @route   GET /api/settlements/overdue
 * @desc    Get overdue settlements for current user
 * @access  Private
 */
router.get('/overdue',
  query('type').optional().isIn(['incoming', 'outgoing', 'all']).withMessage('Type must be incoming, outgoing, or all'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  settlementController.getOverdueSettlements
);

/**
 * @route   POST /api/settlements/calculate
 * @desc    Calculate optimal settlement plan for multiple groups/users
 * @access  Private
 */
router.post('/calculate',
  body('groupIds').optional().isArray().withMessage('Group IDs must be an array'),
  body('groupIds.*').optional().custom(isValidId).withMessage('Invalid group ID'),
  body('userIds').optional().isArray().withMessage('User IDs must be an array'),
  body('userIds.*').optional().custom(isValidId).withMessage('Invalid user ID'),
  body('method').optional().isIn(['greedy', 'minimum_transactions', 'cash_flow']).withMessage('Invalid calculation method'),
  body('consolidate').optional().isBoolean().withMessage('Consolidate must be a boolean'),
  handleValidationErrors,
  settlementController.calculateOptimalSettlements
);

/**
 * @route   POST /api/settlements/bulk-create
 * @desc    Create multiple settlements from calculation
 * @access  Private
 */
router.post('/bulk-create',
  body('settlements').isArray({ min: 1 }).withMessage('At least one settlement is required'),
  body('settlements.*.groupId').custom(isValidId).withMessage('Invalid group ID'),
  body('settlements.*.fromUserId').custom(isValidId).withMessage('Invalid from user ID'),
  body('settlements.*.toUserId').custom(isValidId).withMessage('Invalid to user ID'),
  body('settlements.*.amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('settlements.*.currency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR']).withMessage('Invalid currency'),
  handleValidationErrors,
  settlementController.bulkCreateSettlements
);

/**
 * @route   GET /api/settlements/analytics
 * @desc    Get settlement analytics for user
 * @access  Private
 */
router.get('/analytics',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('groupId').optional().custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  settlementController.getSettlementAnalytics
);

/**
 * @route   GET /api/settlements/export
 * @desc    Export settlements to CSV
 * @access  Private
 */
router.get('/export',
  validateSettlementQuery,
  handleValidationErrors,
  settlementController.exportSettlements
);

/**
 * @route   POST /api/settlements/:id/split
 * @desc    Split settlement into multiple smaller settlements
 * @access  Private
 */
router.post('/:id/split',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('splits').isArray({ min: 2 }).withMessage('At least 2 splits are required'),
  body('splits.*.amount').isFloat({ min: 0.01 }).withMessage('Split amount must be greater than 0'),
  body('splits.*.description').optional().isLength({ max: 200 }).withMessage('Split description cannot exceed 200 characters'),
  body('splits.*.dueDate').optional().isISO8601().toDate(),
  handleValidationErrors,
  settlementController.splitSettlement
);

/**
 * @route   POST /api/settlements/:id/merge
 * @desc    Merge settlement with other settlements
 * @access  Private
 */
router.post('/:id/merge',
  param('id').custom(isValidId).withMessage('Invalid settlement ID'),
  body('settlementIds').isArray({ min: 1 }).withMessage('At least one settlement ID is required'),
  body('settlementIds.*').custom(isValidId).withMessage('Invalid settlement ID'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors,
  settlementController.mergeSettlements
);

module.exports = router;