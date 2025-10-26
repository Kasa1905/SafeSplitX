/**
 * Fraud Detection Routes for SafeSplitX
 * Handles AI analysis, score calculation, and review system
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const fraudController = require('../controllers/fraudController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Validation middleware
const validateFraudAnalysis = [
  body('expenseId')
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('forceReanalysis')
    .optional()
    .isBoolean()
    .withMessage('forceReanalysis must be a boolean')
];

const validateBulkAnalysis = [
  body('expenseIds')
    .isArray({ min: 1, max: 100 })
    .withMessage('Expense IDs array must contain between 1 and 100 items'),
  body('expenseIds.*')
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('priority')
    .optional()
    .isIn(['low', 'medium', 'high'])
    .withMessage('Priority must be low, medium, or high')
];

const validateReview = [
  param('expenseId')
    .custom(isValidId)
    .withMessage('Invalid expense ID'),
  body('status')
    .isIn(['approved', 'flagged', 'rejected'])
    .withMessage('Status must be approved, flagged, or rejected'),
  body('reviewNotes')
    .optional()
    .isLength({ min: 1, max: 1000 })
    .withMessage('Review notes must be between 1 and 1000 characters'),
  body('reviewTags')
    .optional()
    .isArray()
    .withMessage('Review tags must be an array'),
  body('reviewTags.*')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Each review tag must be between 1 and 50 characters')
];

const validateRuleUpdate = [
  param('ruleId')
    .custom(isValidId)
    .withMessage('Invalid rule ID'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  body('threshold')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Threshold must be between 0 and 100'),
  body('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical')
];

const validateFraudQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('minScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Minimum score must be between 0 and 100'),
  query('maxScore')
    .optional()
    .isFloat({ min: 0, max: 100 })
    .withMessage('Maximum score must be between 0 and 100'),
  query('status')
    .optional()
    .isIn(['pending', 'approved', 'flagged', 'rejected', 'under_review'])
    .withMessage('Invalid fraud status'),
  query('groupId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  query('userId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid user ID'),
  query('severity')
    .optional()
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical'),
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
    .isIn(['score', 'date', 'amount', 'severity'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validateModelTraining = [
  body('trainingData')
    .isArray({ min: 10 })
    .withMessage('At least 10 training samples are required'),
  body('trainingData.*.expenseId')
    .custom(isValidId)
    .withMessage('Invalid expense ID in training data'),
  body('trainingData.*.isFraudulent')
    .isBoolean()
    .withMessage('isFraudulent must be a boolean'),
  body('trainingData.*.reviewerConfidence')
    .optional()
    .isFloat({ min: 0, max: 1 })
    .withMessage('Reviewer confidence must be between 0 and 1'),
  body('modelVersion')
    .optional()
    .isString()
    .isLength({ min: 1, max: 50 })
    .withMessage('Model version must be between 1 and 50 characters')
];

const validateRuleCreation = [
  body('name')
    .isLength({ min: 1, max: 100 })
    .withMessage('Rule name must be between 1 and 100 characters'),
  body('description')
    .isLength({ min: 1, max: 500 })
    .withMessage('Rule description must be between 1 and 500 characters'),
  body('conditions')
    .isArray({ min: 1 })
    .withMessage('At least one condition is required'),
  body('conditions.*.field')
    .isIn(['amount', 'category', 'time_of_day', 'day_of_week', 'location', 'frequency', 'user_behavior'])
    .withMessage('Invalid condition field'),
  body('conditions.*.operator')
    .isIn(['equals', 'not_equals', 'greater_than', 'less_than', 'contains', 'not_contains', 'in', 'not_in'])
    .withMessage('Invalid condition operator'),
  body('conditions.*.value')
    .notEmpty()
    .withMessage('Condition value is required'),
  body('action')
    .isIn(['flag', 'score_boost', 'require_review', 'auto_reject'])
    .withMessage('Invalid rule action'),
  body('severity')
    .isIn(['low', 'medium', 'high', 'critical'])
    .withMessage('Severity must be low, medium, high, or critical'),
  body('scoreImpact')
    .isFloat({ min: -50, max: 50 })
    .withMessage('Score impact must be between -50 and 50')
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

// Public health check (no auth) so tests can probe service state
router.get('/health', fraudController.healthCheck);

// All routes below require authentication
router.use(auth);

/**
 * @route   POST /api/fraud/analyze
 * @desc    Analyze expense for fraud
 * @access  Private
 */
router.post('/analyze',
  validateFraudAnalysis,
  handleValidationErrors,
  fraudController.analyzeExpense
);

// Analyze by expenseId path used by AI integration tests
router.post('/analyze/:expenseId',
  param('expenseId').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  fraudController.analyzeExpenseById
);

/**
 * @route   POST /api/fraud/analyze-batch
 * @desc    Analyze multiple expenses for fraud
 * @access  Private
 */
// Accept both expenseIds and expense_ids per differing test payloads
router.post('/analyze-batch',
  [
    body('expenseIds').optional().isArray({ min: 1, max: 100 }).withMessage('expenseIds must be an array with 1-100 items'),
    body('expense_ids').optional().isArray({ min: 1, max: 100 }).withMessage('expense_ids must be an array with 1-100 items')
  ],
  handleValidationErrors,
  fraudController.bulkAnalyzeExpenses
);

/**
 * @route   POST /api/fraud/batch-analyze
 * @desc    Batch analyze expenses (alternative path)
 * @access  Private
 */
router.post('/batch-analyze',
  [
    body('expenseIds').optional().isArray({ min: 1, max: 100 }).withMessage('expenseIds must be an array with 1-100 items'),
    body('expense_ids').optional().isArray({ min: 1, max: 100 }).withMessage('expense_ids must be an array with 1-100 items')
  ],
  handleValidationErrors,
  fraudController.bulkAnalyzeExpenses
);

/**
 * @route   GET /api/fraud/analyses
 * @desc    Get all fraud analyses with filtering
 * @access  Private
 */
router.get('/analyses',
  validateFraudQuery,
  handleValidationErrors,
  fraudController.getAllFraudAnalyses
);

/**
 * @route   PATCH /api/fraud/analysis/:id/status
 * @desc    Update fraud analysis status
 * @access  Private
 */
router.patch('/analysis/:id/status',
  [
    param('id').custom(isValidId).withMessage('Invalid analysis ID'),
    body('status').isIn(['pending', 'approved', 'flagged', 'rejected', 'under_review']).withMessage('Invalid status')
  ],
  handleValidationErrors,
  fraudController.updateAnalysisStatus
);

/**
 * @route   GET /api/fraud/dashboard
 * @desc    Get fraud detection dashboard metrics
 * @access  Private
 */
router.get('/dashboard',
  query('period').optional().isIn(['day', 'week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  handleValidationErrors,
  fraudController.getFraudDashboard
);

/**
 * @route   GET /api/fraud/flagged
 * @desc    Get flagged expenses requiring review
 * @access  Private
 */
router.get('/flagged',
  validateFraudQuery,
  handleValidationErrors,
  fraudController.getFlaggedExpenses
);

/**
 * @route   GET /api/fraud/expenses/:expenseId
 * @desc    Get fraud analysis details for an expense
 * @access  Private
 */
router.get('/expenses/:expenseId',
  param('expenseId').custom(isValidId).withMessage('Invalid expense ID'),
  handleValidationErrors,
  fraudController.getFraudAnalysis
);

/**
 * @route   POST /api/fraud/review/:expenseId
 * @desc    Submit fraud review decision
 * @access  Private
 */
router.post('/review/:expenseId',
  validateReview,
  handleValidationErrors,
  fraudController.reviewExpense
);

/**
 * @route   GET /api/fraud/history
 * @desc    Get fraud detection history and statistics
 * @access  Private
 */
router.get('/history',
  validateFraudQuery,
  handleValidationErrors,
  fraudController.getFraudHistory
);

/**
 * @route   GET /api/fraud/patterns
 * @desc    Get fraud patterns and trends analysis
 * @access  Private
 */
router.get('/patterns',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('groupBy').optional().isIn(['category', 'user', 'group', 'time', 'amount_range']).withMessage('Invalid groupBy field'),
  query('minOccurrences').optional().isInt({ min: 1 }).withMessage('Minimum occurrences must be positive'),
  handleValidationErrors,
  fraudController.getFraudPatterns
);

/**
 * @route   GET /api/fraud/rules
 * @desc    Get fraud detection rules
 * @access  Private
 */
router.get('/rules',
  query('isActive').optional().isBoolean().withMessage('isActive must be a boolean'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  handleValidationErrors,
  fraudController.getFraudRules
);

/**
 * @route   POST /api/fraud/rules
 * @desc    Create custom fraud detection rule
 * @access  Private
 */
router.post('/rules',
  validateRuleCreation,
  handleValidationErrors,
  fraudController.createFraudRule
);

/**
 * @route   PUT /api/fraud/rules/:ruleId
 * @desc    Update fraud detection rule
 * @access  Private
 */
router.put('/rules/:ruleId',
  validateRuleUpdate,
  handleValidationErrors,
  fraudController.updateFraudRule
);

/**
 * @route   DELETE /api/fraud/rules/:ruleId
 * @desc    Delete fraud detection rule
 * @access  Private
 */
router.delete('/rules/:ruleId',
  param('ruleId').custom(isValidId).withMessage('Invalid rule ID'),
  handleValidationErrors,
  fraudController.deleteFraudRule
);

/**
 * @route   GET /api/fraud/model/status
 * @desc    Get fraud detection model status and performance
 * @access  Private
 */
router.get('/model/status', fraudController.getModelStatus);

/**
 * @route   POST /api/fraud/model/train
 * @desc    Train fraud detection model with new data
 * @access  Private
 */
router.post('/model/train',
  validateModelTraining,
  handleValidationErrors,
  fraudController.trainModel
);

/**
 * @route   GET /api/fraud/model/performance
 * @desc    Get model performance metrics
 * @access  Private
 */
router.get('/model/performance',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('version').optional().isString().withMessage('Model version must be a string'),
  handleValidationErrors,
  fraudController.getModelPerformance
);

/**
 * @route   GET /api/fraud/alerts
 * @desc    Get real-time fraud alerts
 * @access  Private
 */
router.get('/alerts',
  query('status').optional().isIn(['active', 'resolved', 'dismissed']).withMessage('Invalid alert status'),
  query('severity').optional().isIn(['low', 'medium', 'high', 'critical']).withMessage('Invalid severity'),
  query('limit').optional().isInt({ min: 1, max: 50 }).withMessage('Limit must be between 1 and 50'),
  handleValidationErrors,
  fraudController.getFraudAlerts
);

/**
 * @route   POST /api/fraud/alerts/:alertId/resolve
 * @desc    Resolve fraud alert
 * @access  Private
 */
router.post('/alerts/:alertId/resolve',
  param('alertId').custom(isValidId).withMessage('Invalid alert ID'),
  body('resolution').isIn(['false_positive', 'confirmed_fraud', 'needs_investigation']).withMessage('Invalid resolution'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes cannot exceed 500 characters'),
  handleValidationErrors,
  fraudController.resolveFraudAlert
);

/**
 * @route   GET /api/fraud/whitelist
 * @desc    Get user's fraud whitelist (trusted patterns)
 * @access  Private
 */
router.get('/whitelist', fraudController.getWhitelist);

/**
 * @route   POST /api/fraud/whitelist
 * @desc    Add pattern to fraud whitelist
 * @access  Private
 */
router.post('/whitelist',
  body('type').isIn(['merchant', 'category', 'amount_range', 'location', 'time_pattern']).withMessage('Invalid whitelist type'),
  body('value').notEmpty().withMessage('Whitelist value is required'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors,
  fraudController.addToWhitelist
);

/**
 * @route   DELETE /api/fraud/whitelist/:id
 * @desc    Remove pattern from fraud whitelist
 * @access  Private
 */
router.delete('/whitelist/:id',
  param('id').custom(isValidId).withMessage('Invalid whitelist entry ID'),
  handleValidationErrors,
  fraudController.removeFromWhitelist
);

/**
 * @route   GET /api/fraud/report
 * @desc    Generate comprehensive fraud report
 * @access  Private
 */
router.get('/report',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('format').optional().isIn(['json', 'pdf', 'csv']).withMessage('Format must be json, pdf, or csv'),
  query('includeDetails').optional().isBoolean().withMessage('includeDetails must be a boolean'),
  query('groupId').optional().custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  fraudController.generateFraudReport
);

/**
 * @route   POST /api/fraud/feedback
 * @desc    Submit feedback on fraud detection accuracy
 * @access  Private
 */
router.post('/feedback',
  body('expenseId').custom(isValidId).withMessage('Invalid expense ID'),
  body('actualFraud').isBoolean().withMessage('actualFraud must be a boolean'),
  body('predictedScore').isFloat({ min: 0, max: 100 }).withMessage('Predicted score must be between 0 and 100'),
  body('feedback').isIn(['accurate', 'false_positive', 'false_negative', 'partially_correct']).withMessage('Invalid feedback type'),
  body('details').optional().isLength({ max: 1000 }).withMessage('Details cannot exceed 1000 characters'),
  handleValidationErrors,
  fraudController.submitFeedback
);

/**
 * @route   GET /api/fraud/benchmark
 * @desc    Get fraud detection benchmarks and industry comparisons
 * @access  Private
 */
router.get('/benchmark',
  query('metric').optional().isIn(['accuracy', 'precision', 'recall', 'f1_score', 'false_positive_rate']).withMessage('Invalid benchmark metric'),
  query('timeframe').optional().isIn(['current', 'historical', 'projected']).withMessage('Invalid timeframe'),
  handleValidationErrors,
  fraudController.getFraudBenchmarks
);

/**
 * @route   POST /api/fraud/simulate
 * @desc    Simulate fraud detection on historical data
 * @access  Private
 */
router.post('/simulate',
  body('startDate').isISO8601().toDate().withMessage('Valid start date is required'),
  body('endDate').isISO8601().toDate().withMessage('Valid end date is required'),
  body('ruleSet').optional().isArray().withMessage('Rule set must be an array'),
  body('threshold').optional().isFloat({ min: 0, max: 100 }).withMessage('Threshold must be between 0 and 100'),
  handleValidationErrors,
  fraudController.simulateFraudDetection
);

module.exports = router;