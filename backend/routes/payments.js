/**
 * Payment Routes for SafeSplitX
 * Handles Stripe/PayPal integration, webhooks, and transaction management
 */

const express = require('express');
const { body, param, query, validationResult } = require('express-validator');
const paymentController = require('../controllers/paymentController');
const auth = require('../middleware/auth');
const { generateRequestId } = require('../middleware/requestId');
const { isValidId } = require('../utils/validation');

const router = express.Router();

// Validation middleware
const validateStripePayment = [
  body('settlementId')
    .custom(isValidId)
    .withMessage('Invalid settlement ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR'])
    .withMessage('Invalid currency'),
  body('paymentMethodId')
    .optional()
    .isString()
    .withMessage('Payment method ID must be a string'),
  body('savePaymentMethod')
    .optional()
    .isBoolean()
    .withMessage('savePaymentMethod must be a boolean'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

const validatePayPalPayment = [
  body('settlementId')
    .custom(isValidId)
    .withMessage('Invalid settlement ID'),
  body('amount')
    .isFloat({ min: 0.01 })
    .withMessage('Amount must be greater than 0'),
  body('currency')
    .isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'])
    .withMessage('Invalid currency for PayPal'),
  body('returnUrl')
    .isURL()
    .withMessage('Valid return URL is required'),
  body('cancelUrl')
    .isURL()
    .withMessage('Valid cancel URL is required'),
  body('description')
    .optional()
    .isLength({ max: 200 })
    .withMessage('Description cannot exceed 200 characters')
];

const validatePaymentMethodSetup = [
  body('type')
    .isIn(['stripe', 'paypal'])
    .withMessage('Payment method type must be stripe or paypal'),
  body('stripeCustomerId')
    .optional()
    .isString()
    .withMessage('Stripe customer ID must be a string'),
  body('paypalEmail')
    .optional()
    .isEmail()
    .normalizeEmail()
    .withMessage('Valid PayPal email is required')
];

const validateRefund = [
  param('transactionId')
    .isLength({ min: 1 })
    .withMessage('Transaction ID is required'),
  body('amount')
    .optional()
    .isFloat({ min: 0.01 })
    .withMessage('Refund amount must be greater than 0'),
  body('reason')
    .optional()
    .isIn(['duplicate', 'fraudulent', 'requested_by_customer', 'other'])
    .withMessage('Invalid refund reason'),
  body('description')
    .optional()
    .isLength({ max: 500 })
    .withMessage('Description cannot exceed 500 characters')
];

const validateTransactionQuery = [
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
    .isIn(['pending', 'processing', 'succeeded', 'failed', 'cancelled', 'refunded'])
    .withMessage('Invalid transaction status'),
  query('paymentMethod')
    .optional()
    .isIn(['stripe', 'paypal'])
    .withMessage('Invalid payment method'),
  query('settlementId')
    .optional()
    .custom(isValidId)
    .withMessage('Invalid settlement ID'),
  query('startDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('endDate')
    .optional()
    .isISO8601()
    .toDate(),
  query('minAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Minimum amount must be non-negative'),
  query('maxAmount')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Maximum amount must be non-negative'),
  query('sortBy')
    .optional()
    .isIn(['createdAt', 'amount', 'status'])
    .withMessage('Invalid sort field'),
  query('sortOrder')
    .optional()
    .isIn(['asc', 'desc'])
    .withMessage('Sort order must be asc or desc')
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

// Webhook routes (no auth required)
/**
 * @route   POST /api/payments/stripe/webhook
 * @desc    Handle Stripe webhooks
 * @access  Public (Stripe signature verification)
 */
router.post('/stripe/webhook', paymentController.handleStripeWebhook);

/**
 * @route   POST /api/payments/paypal/webhook
 * @desc    Handle PayPal webhooks
 * @access  Public (PayPal signature verification)
 */
router.post('/paypal/webhook', paymentController.handlePayPalWebhook);

// All other routes require authentication
router.use(auth);

/**
 * @route   POST /api/payments/stripe/setup-intent
 * @desc    Create Stripe setup intent for saving payment methods
 * @access  Private
 */
router.post('/stripe/setup-intent',
  body('usage').optional().isIn(['on_session', 'off_session']).withMessage('Invalid usage type'),
  handleValidationErrors,
  paymentController.createStripeSetupIntent
);

/**
 * @route   POST /api/payments/stripe/payment-intent
 * @desc    Create Stripe payment intent
 * @access  Private
 */
router.post('/stripe/payment-intent',
  validateStripePayment,
  handleValidationErrors,
  paymentController.createStripePaymentIntent
);

/**
 * @route   POST /api/payments/stripe/confirm
 * @desc    Confirm Stripe payment intent
 * @access  Private
 */
router.post('/stripe/confirm/:paymentIntentId',
  param('paymentIntentId').isLength({ min: 1 }).withMessage('Payment intent ID is required'),
  handleValidationErrors,
  paymentController.confirmStripePayment
);

/**
 * @route   POST /api/payments/paypal/create
 * @desc    Create PayPal payment
 * @access  Private
 */
router.post('/paypal/create',
  validatePayPalPayment,
  handleValidationErrors,
  paymentController.createPayPalPayment
);

/**
 * @route   POST /api/payments/paypal/execute
 * @desc    Execute PayPal payment after approval
 * @access  Private
 */
router.post('/paypal/execute',
  body('paymentId').isLength({ min: 1 }).withMessage('PayPal payment ID is required'),
  body('payerId').isLength({ min: 1 }).withMessage('PayPal payer ID is required'),
  handleValidationErrors,
  paymentController.executePayPalPayment
);

/**
 * @route   GET /api/payments/methods
 * @desc    Get user's saved payment methods
 * @access  Private
 */
router.get('/methods', paymentController.getPaymentMethods);

/**
 * @route   POST /api/payments/methods
 * @desc    Save payment method
 * @access  Private
 */
router.post('/methods',
  validatePaymentMethodSetup,
  handleValidationErrors,
  paymentController.savePaymentMethod
);

/**
 * @route   DELETE /api/payments/methods/:id
 * @desc    Delete saved payment method
 * @access  Private
 */
router.delete('/methods/:id',
  param('id').isLength({ min: 1 }).withMessage('Payment method ID is required'),
  handleValidationErrors,
  paymentController.deletePaymentMethod
);

/**
 * @route   POST /api/payments/methods/:id/set-default
 * @desc    Set default payment method
 * @access  Private
 */
router.post('/methods/:id/set-default',
  param('id').isLength({ min: 1 }).withMessage('Payment method ID is required'),
  handleValidationErrors,
  paymentController.setDefaultPaymentMethod
);

/**
 * @route   GET /api/payments/transactions
 * @desc    Get user's payment transactions
 * @access  Private
 */
router.get('/transactions',
  validateTransactionQuery,
  handleValidationErrors,
  paymentController.getTransactions
);

/**
 * @route   GET /api/payments/transactions/:id
 * @desc    Get transaction details
 * @access  Private
 */
router.get('/transactions/:id',
  param('id').custom(isValidId).withMessage('Invalid transaction ID'),
  handleValidationErrors,
  paymentController.getTransactionById
);

/**
 * @route   POST /api/payments/transactions/:transactionId/refund
 * @desc    Refund a transaction
 * @access  Private
 */
router.post('/transactions/:transactionId/refund',
  validateRefund,
  handleValidationErrors,
  paymentController.refundTransaction
);

/**
 * @route   GET /api/payments/transactions/:transactionId/receipt
 * @desc    Get payment receipt
 * @access  Private
 */
router.get('/transactions/:transactionId/receipt',
  param('transactionId').isLength({ min: 1 }).withMessage('Transaction ID is required'),
  query('format').optional().isIn(['pdf', 'html']).withMessage('Format must be pdf or html'),
  handleValidationErrors,
  paymentController.getPaymentReceipt
);

/**
 * @route   POST /api/payments/batch-payout
 * @desc    Create batch payout for multiple settlements
 * @access  Private
 */
router.post('/batch-payout',
  body('settlements').isArray({ min: 1 }).withMessage('At least one settlement is required'),
  body('settlements.*.settlementId').custom(isValidId).withMessage('Invalid settlement ID'),
  body('settlements.*.amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  body('settlements.*.recipientEmail').optional().isEmail().withMessage('Invalid recipient email'),
  body('paymentMethod').isIn(['stripe', 'paypal']).withMessage('Invalid payment method'),
  handleValidationErrors,
  paymentController.createBatchPayout
);

/**
 * @route   GET /api/payments/balance
 * @desc    Get user's payment balance and pending amounts
 * @access  Private
 */
router.get('/balance', paymentController.getPaymentBalance);

/**
 * @route   POST /api/payments/withdraw
 * @desc    Withdraw funds to bank account
 * @access  Private
 */
router.post('/withdraw',
  body('amount').isFloat({ min: 1 }).withMessage('Withdrawal amount must be at least $1'),
  body('bankAccountId').optional().isString().withMessage('Bank account ID must be a string'),
  body('description').optional().isLength({ max: 200 }).withMessage('Description cannot exceed 200 characters'),
  handleValidationErrors,
  paymentController.withdrawFunds
);

/**
 * @route   GET /api/payments/fees
 * @desc    Calculate payment processing fees
 * @access  Private
 */
router.get('/fees',
  query('amount').isFloat({ min: 0.01 }).withMessage('Amount must be greater than 0'),
  query('currency').isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR']).withMessage('Invalid currency'),
  query('paymentMethod').isIn(['stripe', 'paypal']).withMessage('Invalid payment method'),
  query('paymentType').optional().isIn(['card', 'bank_transfer', 'digital_wallet']).withMessage('Invalid payment type'),
  handleValidationErrors,
  paymentController.calculateFees
);

/**
 * @route   GET /api/payments/analytics
 * @desc    Get payment analytics
 * @access  Private
 */
router.get('/analytics',
  query('period').optional().isIn(['week', 'month', 'quarter', 'year']).withMessage('Invalid period'),
  query('currency').optional().isIn(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY', 'CNY', 'INR']).withMessage('Invalid currency'),
  handleValidationErrors,
  paymentController.getPaymentAnalytics
);

/**
 * @route   POST /api/payments/verify-bank-account
 * @desc    Verify bank account for ACH payments
 * @access  Private
 */
router.post('/verify-bank-account',
  body('bankAccountId').isString().withMessage('Bank account ID is required'),
  body('amounts').isArray({ min: 2, max: 2 }).withMessage('Exactly 2 micro-deposit amounts required'),
  body('amounts.*').isFloat({ min: 0.01, max: 0.99 }).withMessage('Invalid micro-deposit amount'),
  handleValidationErrors,
  paymentController.verifyBankAccount
);

/**
 * @route   GET /api/payments/disputes
 * @desc    Get payment disputes
 * @access  Private
 */
router.get('/disputes',
  query('status').optional().isIn(['warning_needs_response', 'warning_under_review', 'warning_closed', 'needs_response', 'under_review', 'charge_refunded', 'won', 'lost']).withMessage('Invalid dispute status'),
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
  handleValidationErrors,
  paymentController.getDisputes
);

/**
 * @route   POST /api/payments/disputes/:id/respond
 * @desc    Respond to payment dispute
 * @access  Private
 */
router.post('/disputes/:id/respond',
  param('id').isLength({ min: 1 }).withMessage('Dispute ID is required'),
  body('evidence').isObject().withMessage('Evidence object is required'),
  body('evidence.customerCommunication').optional().isString(),
  body('evidence.receipt').optional().isString(),
  body('evidence.shippingDocumentation').optional().isString(),
  handleValidationErrors,
  paymentController.respondToDispute
);

module.exports = router;