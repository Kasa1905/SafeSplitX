/**
 * Group Routes for SafeSplitX
 * Handles group CRUD operations, member management, and group analytics
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const groupController = require('../controllers/groupController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Validation middleware
const validateCreateGroup = [
  body('name')
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object'),
  body('settings.defaultSplitMethod')
    .optional()
    .isIn(['equal', 'weighted', 'percentage', 'custom'])
    .withMessage('Invalid default split method'),
  body('settings.allowSelfPayments')
    .optional()
    .isBoolean()
    .withMessage('allowSelfPayments must be a boolean'),
  body('settings.requireApproval')
    .optional()
    .isBoolean()
    .withMessage('requireApproval must be a boolean'),
  body('settings.maxMembers')
    .optional()
    .isInt({ min: 2, max: 100 })
    .withMessage('maxMembers must be between 2 and 100')
];

const validateUpdateGroup = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  body('name')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Group name must be between 1 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters'),
  body('currency')
    .optional()
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('settings')
    .optional()
    .isObject()
    .withMessage('Settings must be an object')
];

const validateAddMember = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  body('userId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid user ID'),
  body('email')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Invalid email address'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member')
];

const validateUpdateMember = [
  param('id')
    .custom(isValidId)
    .withMessage('Invalid group ID'),
  param('userId')
    .custom(isValidId)
    .withMessage('Invalid user ID'),
  body('role')
    .optional()
    .isIn(['admin', 'member'])
    .withMessage('Role must be admin or member'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean')
];

const validateGroupQuery = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
  query('search')
    .optional()
    .trim()
    .isLength({ min: 1, max: 100 })
    .withMessage('Search term must be between 1 and 100 characters'),
  query('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean'),
  query('sortBy')
    .optional()
    .isIn(['name', 'createdAt', 'totalExpenses', 'totalAmount'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
];

const validateExpenseQuery = [
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
    .withMessage('Maximum amount must be non-negative')
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
 * @route   POST /api/groups
 * @desc    Create a new group
 * @access  Private
 * Note: Validation runs before auth to provide better error messages
 */
router.post('/',
  validateCreateGroup,
  handleValidationErrors,
  auth,
  groupController.createGroup
);

// All other routes require authentication
router.use(auth);

/**
 * @route   GET /api/groups
 * @desc    Get user's groups with filtering and pagination
 * @access  Private
 */
router.get('/',
  validateGroupQuery,
  handleValidationErrors,
  groupController.getGroups
);

/**
 * @route   GET /api/groups/:id
 * @desc    Get group by ID
 * @access  Private
 */
router.get('/:id',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.getGroupById
);

/**
 * @route   PUT /api/groups/:id
 * @desc    Update group
 * @access  Private
 */
router.put('/:id',
  validateUpdateGroup,
  handleValidationErrors,
  groupController.updateGroup
);

/**
 * @route   DELETE /api/groups/:id
 * @desc    Delete/Archive group
 * @access  Private
 */
router.delete('/:id',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.deleteGroup
);

/**
 * @route   POST /api/groups/:id/members
 * @desc    Add member to group
 * @access  Private
 */
router.post('/:id/members',
  validateAddMember,
  handleValidationErrors,
  groupController.addMember
);

/**
 * @route   GET /api/groups/:id/members
 * @desc    Get group members
 * @access  Private
 */
router.get('/:id/members',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  query('includeInactive').optional().isBoolean().withMessage('includeInactive must be a boolean'),
  handleValidationErrors,
  groupController.getMembers
);

/**
 * @route   PUT /api/groups/:id/members/:userId
 * @desc    Update member role or status
 * @access  Private
 */
router.put('/:id/members/:userId',
  validateUpdateMember,
  handleValidationErrors,
  groupController.updateMember
);

/**
 * @route   DELETE /api/groups/:id/members/:userId
 * @desc    Remove member from group
 * @access  Private
 */
router.delete('/:id/members/:userId',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  param('userId').custom(isValidId).withMessage('Invalid user ID'),
  handleValidationErrors,
  groupController.removeMember
);

/**
 * @route   POST /api/groups/:id/leave
 * @desc    Leave group
 * @access  Private
 */
router.post('/:id/leave',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.leaveGroup
);

/**
 * @route   GET /api/groups/:id/expenses
 * @desc    Get group expenses with filtering
 * @access  Private
 */
router.get('/:id/expenses',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  validateExpenseQuery,
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  groupController.getGroupExpenses
);

/**
 * @route   GET /api/groups/:id/balances
 * @desc    Get group member balances
 * @access  Private
 */
router.get('/:id/balances',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.getGroupBalances
);

/**
 * @route   GET /api/groups/:id/settlements
 * @desc    Get group settlements
 * @access  Private
 */
router.get('/:id/settlements',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  query('status').optional().isIn(['pending', 'in_progress', 'completed', 'cancelled', 'failed']).withMessage('Invalid settlement status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  groupController.getGroupSettlements
);

/**
 * @route   POST /api/groups/:id/settle-balances
 * @desc    Generate optimal settlement plan for group
 * @access  Private
 */
router.post('/:id/settle-balances',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  body('method').optional().isIn(['greedy', 'minimum_transactions', 'cash_flow']).withMessage('Invalid settlement method'),
  handleValidationErrors,
  groupController.generateSettlementPlan
);

/**
 * @route   GET /api/groups/:id/analytics
 * @desc    Get group analytics and insights
 * @access  Private
 */
router.get('/:id/analytics',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  validateExpenseQuery,
  handleValidationErrors,
  groupController.getGroupAnalytics
);

/**
 * @route   GET /api/groups/:id/summary
 * @desc    Get group summary (totals, recent activity, etc.)
 * @access  Private
 */
router.get('/:id/summary',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.getGroupSummary
);

/**
 * @route   POST /api/groups/:id/invite
 * @desc    Generate group invite link
 * @access  Private
 */
router.post('/:id/invite',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  body('expiresIn').optional().isInt({ min: 1, max: 30 }).withMessage('Expiry must be between 1 and 30 days'),
  body('role').optional().isIn(['admin', 'member']).withMessage('Role must be admin or member'),
  handleValidationErrors,
  groupController.generateInviteLink
);

/**
 * @route   POST /api/groups/join/:token
 * @desc    Join group via invite token
 * @access  Private
 */
router.post('/join/:token',
  param('token').isLength({ min: 1 }).withMessage('Invalid invite token'),
  handleValidationErrors,
  groupController.joinGroupViaInvite
);

/**
 * @route   POST /api/groups/:id/duplicate
 * @desc    Duplicate group (copy structure, not expenses)
 * @access  Private
 */
router.post('/:id/duplicate',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  body('name').trim().isLength({ min: 1, max: 100 }).withMessage('New group name must be between 1 and 100 characters'),
  body('includeMembers').optional().isBoolean().withMessage('includeMembers must be a boolean'),
  handleValidationErrors,
  groupController.duplicateGroup
);

/**
 * @route   POST /api/groups/:id/archive
 * @desc    Archive group
 * @access  Private
 */
router.post('/:id/archive',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.archiveGroup
);

/**
 * @route   POST /api/groups/:id/restore
 * @desc    Restore archived group
 * @access  Private
 */
router.post('/:id/restore',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  handleValidationErrors,
  groupController.restoreGroup
);

/**
 * @route   GET /api/groups/:id/export
 * @desc    Export group data
 * @access  Private
 */
router.get('/:id/export',
  param('id').custom(isValidId).withMessage('Invalid group ID'),
  query('format').optional().isIn(['csv', 'json', 'pdf']).withMessage('Format must be csv, json, or pdf'),
  query('includeReceipts').optional().isBoolean().withMessage('includeReceipts must be a boolean'),
  handleValidationErrors,
  groupController.exportGroupData
);

module.exports = router;