/**
 * Expense Routes for SafeSplitX
 * Handles expense CRUD operations, splits, receipts, and fraud analysis
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const { body, param, query, validationResult } = require('express-validator');
const expenseController = require('../controllers/expenseController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

// Import fraud detection middleware
const {
  preExpenseCreation,
  postExpenseCreation,
  expenseUpdateCheck,
  bulkExpenseAnalysis,
  userBehaviorAnalysis
} = require('../ai/middleware/fraudMiddleware');

const router = express.Router();

// Configure multer for receipt uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/receipts/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  // Accept images and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only images and PDFs are allowed'), false);
  }
};

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: fileFilter
});

// Validation middleware
const validateCreateExpense = [
  body('description')
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be positive'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('category')
    .isIn(['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'education', 'travel', 'other'])
    .withMessage('Invalid category'),
  body('date')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value > new Date()) {
        throw new Error('Expense date cannot be in the future');
      }
      return true;
    }),
  body('groupId')
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  body('splitMethod')
    .isIn(['equal', 'weighted', 'percentage', 'custom'])
    .withMessage('Invalid split method'),
  body('splits')
    .isArray({ min: 1 })
    .withMessage('At least one split is required'),
  body('splits.*.userId')
    .custom(isValidId)
    .withMessage('Invalid user ID in split'),
  body('splits.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Split amount must be non-negative'),
  body('splits.*.percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Split percentage must be between 0 and 100'),
  body('splits.*.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Split weight must be non-negative'),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each tag must be between 1 and 50 characters')
];

const validateUpdateExpense = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('description')
    .optional()
    .trim()
    .isLength({ min: 1, max: 200 })
    .withMessage('Description must be between 1 and 200 characters'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('category')
    .optional()
    .isIn(['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'education', 'travel', 'other'])
    .withMessage('Invalid category'),
  body('date')
    .optional()
    .isISO8601()
    .toDate()
    .custom((value) => {
      if (value > new Date()) {
        throw new Error('Expense date cannot be in the future');
      }
      return true;
    }),
  body('notes')
    .optional()
    .isLength({ max: 1000 })
    .withMessage('Notes cannot exceed 1000 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array')
];

const validateExpenseQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('startDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('category')
    .optional()
    .isIn(['food', 'transportation', 'accommodation', 'entertainment', 'shopping', 'utilities', 'healthcare', 'education', 'travel', 'other'])
    .withMessage('Invalid category'),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be non-negative'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be non-negative'),
  query('paidBy')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid payer ID'),
  query('sortBy')
    .optional()
    .isIn(['date', 'amount', 'description', 'createdAt'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validateSplitUpdate = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('splits')
    .isArray({ min: 1 })
    .withMessage('At least one split is required'),
  body('splits.*.userId')
    .custom(isValidId)
    .withMessage('Invalid user ID in split'),
  body('splits.*.amount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Split amount must be non-negative'),
  body('splits.*.percentage')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Split percentage must be between 0 and 100'),
  body('splits.*.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Split weight must be non-negative')
];

// Validation error handler
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    const details = errors.array();
    const primaryMessage = details[0]?.msg || 'Validation failed';
    return res.status(400).json({
      success: false,
      error: primaryMessage,
      details,
      requestId: req.requestId
    });
  }
  next();
};

// Add request ID to all routes
router.use(generateRequestId);

/**
 * @route   POST /api/expenses/calculate-split
 * @desc    Calculate split amounts for an expense
 * @access  Private
 * Note: Validation runs before auth to provide better error messages
 */
router.post('/calculate-split',
  auth,
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be positive'),
  body('splitType').isIn(['equal', 'weighted', 'percentage', 'custom']).withMessage('Invalid split type'),
  body('participants').isArray({ min: 1 }).withMessage('At least one participant required'),
  handleValidationErrors,
  expenseController.calculateSplit
);

/**
 * @route   POST /api/expenses
 * @desc    Create a new expense
 * @access  Private
 * Note: Validation runs before auth to provide better error messages
 */
router.post('/',
  auth,
  validateCreateExpense,
  handleValidationErrors,
  userBehaviorAnalysis,
  preExpenseCreation,
  expenseController.createExpense,
  postExpenseCreation
);

// All other routes require authentication
router.use(auth);

/**
 * @route   GET /api/expenses
 * @desc    Get expenses with filtering and pagination
 * @access  Private
 */
router.get('/',
  validateExpenseQuery,
  handleValidationErrors,
  expenseController.getExpenses
);

/**
 * @route   GET /api/expenses/:id
 * @desc    Get expense by ID
 * @access  Private
 */
router.get('/:id',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.getExpenseById
);

/**
 * @route   PUT /api/expenses/:id
 * @desc    Update expense
 * @access  Private
 */
router.put('/:id',
  validateUpdateExpense,
  handleValidationErrors,
  expenseUpdateCheck,
  expenseController.updateExpense
);

/**
 * @route   DELETE /api/expenses/:id
 * @desc    Delete expense
 * @access  Private
 */
router.delete('/:id',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.deleteExpense
);

/**
 * @route   PUT /api/expenses/:id/splits
 * @desc    Update expense splits
 * @access  Private
 */
router.put('/:id/splits',
  validateSplitUpdate,
  handleValidationErrors,
  expenseController.updateSplits
);

/**
 * @route   POST /api/expenses/:id/receipt
 * @desc    Upload receipt for expense
 * @access  Private
 */
router.post('/:id/receipt',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  upload.single('receipt'),
  expenseController.uploadReceipt
);

/**
 * @route   GET /api/expenses/:id/receipt
 * @desc    Get receipt for expense
 * @access  Private
 */
router.get('/:id/receipt',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.getReceipt
);

/**
 * @route   DELETE /api/expenses/:id/receipt
 * @desc    Delete receipt for expense
 * @access  Private
 */
router.delete('/:id/receipt',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.deleteReceipt
);

/**
 * @route   POST /api/expenses/:id/analyze-fraud
 * @desc    Analyze expense for fraud
 * @access  Private
 */
router.post('/:id/analyze-fraud',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.analyzeFraud
);

/**
 * @route   PUT /api/expenses/:id/fraud-review
 * @desc    Mark fraud analysis as reviewed
 * @access  Private
 */
router.put('/:id/fraud-review',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  body('isReviewed').isBoolean().withMessage('isReviewed must be a boolean'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
  expenseController.markFraudReviewed
);

/**
 * @route   POST /api/expenses/:id/approve
 * @desc    Approve expense
 * @access  Private
 */
router.post('/:id/approve',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.approveExpense
);

// Support PATCH method as used in tests
router.patch('/:id/approve',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  expenseController.approveExpense
);

/**
 * @route   POST /api/expenses/:id/reject
 * @desc    Reject expense
 * @access  Private
 */
router.post('/:id/reject',
  param('id').custom(isValidId).withMessage('Invalid expense ID'),
  body('reason').isLength({ min: 1, max: 500 }).withMessage('Rejection reason must be between 1 and 500 characters'),
  handleValidationErrors,
  expenseController.rejectExpense
);

/**
 * @route   GET /api/expenses/group/:groupId
 * @desc    Get expenses for a specific group
 * @access  Private
 */
router.get('/group/:groupId',
  param('groupId').custom(isValidId).withMessage('Invalid group ID'),
  validateExpenseQuery,
  handleValidationErrors,
  expenseController.getGroupExpenses
);

/**
 * @route   GET /api/expenses/user/:userId/balance
 * @desc    Get balance for a user across all groups
 * @access  Private
 */
router.get('/user/:userId/balance',
  param('userId').custom(isValidId).withMessage('Invalid user ID'),
  handleValidationErrors,
  expenseController.getUserBalance
);

/**
 * @route   POST /api/expenses/split-equally
 * @desc    Calculate equal splits for given amount and users
 * @access  Private
 */
router.post('/split-equally',
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('userIds').isArray({ min: 1 }).withMessage('At least one user is required'),
  body('userIds.*').custom(isValidId).withMessage('Invalid user ID'),
  handleValidationErrors,
  expenseController.calculateEqualSplit
);

/**
 * @route   POST /api/expenses/split-by-percentage
 * @desc    Calculate splits by percentage
 * @access  Private
 */
router.post('/split-by-percentage',
  body('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('splits').isArray({ min: 1 }).withMessage('At least one split is required'),
  body('splits.*.userId').custom(isValidId).withMessage('Invalid user ID'),
  body('splits.*.percentage').isFloat({ min: 0, max: 100 }).withMessage('Percentage must be between 0 and 100'),
  handleValidationErrors,
  expenseController.calculatePercentageSplit
);

/**
 * @route   GET /api/expenses/export
 * @desc    Export expenses to CSV
 * @access  Private
 */
router.get('/export',
  validateExpenseQuery,
  handleValidationErrors,
  expenseController.exportExpenses
);

module.exports = router;