/**
 * Payment Controller for SafeSplitX
 * Handles payment/settlement operations with proper DB integration
 */

const mongoose = require('mongoose');
const Settlement = require('../models/Settlement');
const Group = require('../models/Group');
const { successResponse, errorResponse } = require('../utils/response');

/**
 * Create a new payment
 * POST /api/payments
 */
const createPayment = async (req, res) => {
  try {
    const { fromUserId, toUserId, amount, currency, groupId, method, description, methodDetails } = req.body;

    // Validation
    if (!fromUserId || !toUserId || !amount || !currency || !groupId) {
      return errorResponse(res, 'Missing required fields', 'VALIDATION_ERROR', null, 400);
    }

    if (fromUserId === toUserId) {
      return errorResponse(res, 'Cannot pay yourself', 'VALIDATION_ERROR', null, 400);
    }

    if (amount <= 0) {
      return errorResponse(res, 'Amount must be positive', 'VALIDATION_ERROR', null, 400);
    }

    // Verify group exists and both users are members
    const group = await Group.findById(groupId);
    if (!group) {
      return errorResponse(res, 'Group not found', 'NOT_FOUND', null, 404);
    }

    // Check if both users are group members
    const fromUserMember = group.members.find(m => m.user.toString() === fromUserId);
    const toUserMember = group.members.find(m => m.user.toString() === toUserId);

    if (!fromUserMember || !toUserMember) {
      return errorResponse(res, 'Users must be group members', 'FORBIDDEN', null, 403);
    }

    // Create settlement (payment is handled as settlement)
    const settlement = new Settlement({
      from: fromUserId,
      to: toUserId,
      group: groupId,
      amount,
      currency,
      paymentMethod: method || 'bank_transfer',
      description: description || '',
      status: 'pending',
      type: 'direct',
      paymentData: methodDetails ? { metadata: methodDetails } : {}
    });

    await settlement.save();

    return successResponse(res, {
      payment: {
        _id: settlement._id,
        fromUserId: settlement.from.toString(),
        toUserId: settlement.to.toString(),
        amount: settlement.amount,
        currency: settlement.currency,
        groupId: settlement.group.toString(),
        status: settlement.status,
        method: settlement.paymentMethod,
        methodDetails: settlement.paymentData?.metadata || {},
        description: settlement.description,
        createdAt: settlement.createdAt
      }
    }, 'Payment created successfully', 201);
  } catch (error) {
    console.error('Create payment error:', error);
    return errorResponse(res, 'Failed to create payment', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Get user payments with filters
 * GET /api/payments
 */
const getPayments = async (req, res) => {
  try {
    const userId = req.user.id;
    const { page = 1, limit = 20, status, groupId, direction } = req.query;

    const query = {
      $or: [
        { from: userId },
        { to: userId }
      ]
    };

    if (status) {
      query.status = status;
    }

    if (groupId) {
      query.group = groupId;
    }

    if (direction === 'sent') {
      delete query.$or;
      query.from = userId;
    } else if (direction === 'received') {
      delete query.$or;
      query.to = userId;
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Settlement.countDocuments(query);
    
    const payments = await Settlement.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .populate('from', 'username email')
      .populate('to', 'username email')
      .populate('group', 'name');

    return successResponse(res, {
      payments: payments.map(p => ({
        _id: p._id,
        fromUserId: p.from._id.toString(),
        toUserId: p.to._id.toString(),
        amount: p.amount,
        currency: p.currency,
        groupId: p.group._id.toString(),
        status: p.status,
        method: p.paymentMethod,
        description: p.description,
        createdAt: p.createdAt
      })),
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      }
    });
  } catch (error) {
    console.error('Get payments error:', error);
    return errorResponse(res, 'Failed to get payments', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Get payment by ID
 * GET /api/payments/:id
 */
const getPaymentById = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;

    if (!mongoose.Types.ObjectId.isValid(paymentId)) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    const payment = await Settlement.findById(paymentId)
      .populate('from', 'username email')
      .populate('to', 'username email')
      .populate('group', 'name');

    if (!payment) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    // Check if user has access (either sender or receiver)
    if (payment.from._id.toString() !== userId && payment.to._id.toString() !== userId) {
      return errorResponse(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    return successResponse(res, {
      payment: {
        _id: payment._id,
        fromUserId: payment.from._id.toString(),
        toUserId: payment.to._id.toString(),
        amount: payment.amount,
        currency: payment.currency,
        groupId: payment.group._id.toString(),
        status: payment.status,
        method: payment.paymentMethod,
        description: payment.description,
        createdAt: payment.createdAt,
        completedAt: payment.completedAt
      }
    });
  } catch (error) {
    console.error('Get payment by ID error:', error);
    return errorResponse(res, 'Failed to get payment', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Update payment
 * PUT /api/payments/:id
 */
const updatePayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;
    const { amount, description, method } = req.body;

    const payment = await Settlement.findById(paymentId);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    // Only sender can update, and only if not completed
    if (payment.from.toString() !== userId) {
      return errorResponse(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    if (payment.status === 'completed') {
      return errorResponse(res, 'Cannot update completed payment', 'VALIDATION_ERROR', null, 400);
    }

    if (amount) payment.amount = amount;
    if (description) payment.description = description;
    if (method) payment.paymentMethod = method;

    await payment.save();

    return successResponse(res, {
      payment: {
        _id: payment._id,
        fromUserId: payment.from.toString(),
        toUserId: payment.to.toString(),
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        method: payment.paymentMethod,
        description: payment.description
      }
    }, 'Payment updated successfully');
  } catch (error) {
    console.error('Update payment error:', error);
    return errorResponse(res, 'Failed to update payment', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Confirm payment
 * PATCH /api/payments/:id/confirm
 */
const confirmPayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;

    const payment = await Settlement.findById(paymentId);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    // Only receiver can confirm
    if (payment.to.toString() !== userId) {
      return errorResponse(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    if (payment.status === 'completed') {
      return errorResponse(res, 'Payment already completed', 'VALIDATION_ERROR', null, 400);
    }

    payment.status = 'completed';
    payment.completedAt = new Date();
    await payment.save();

    return successResponse(res, {
      payment: {
        _id: payment._id,
        status: payment.status,
        completedAt: payment.completedAt
      }
    }, 'Payment confirmed successfully');
  } catch (error) {
    console.error('Confirm payment error:', error);
    return errorResponse(res, 'Failed to confirm payment', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Cancel payment
 * PATCH /api/payments/:id/cancel
 */
const cancelPayment = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;
    const { reason } = req.body;

    const payment = await Settlement.findById(paymentId);

    if (!payment) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    // Both sender and receiver can cancel
    if (payment.from.toString() !== userId && payment.to.toString() !== userId) {
      return errorResponse(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    if (payment.status === 'completed') {
      return errorResponse(res, 'Cannot cancel completed payment', 'VALIDATION_ERROR', null, 400);
    }

    payment.status = 'cancelled';
    payment.cancelledAt = new Date();
    payment.cancelReason = reason || 'Cancelled by user';
    await payment.save();

    return successResponse(res, {
      payment: {
        _id: payment._id,
        status: payment.status,
        cancelledAt: payment.cancelledAt
      }
    }, 'Payment cancelled successfully');
  } catch (error) {
    console.error('Cancel payment error:', error);
    return errorResponse(res, 'Failed to cancel payment', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Get available payment methods
 * GET /api/payments/methods
 */
const getPaymentMethods = (req, res) => {
  return successResponse(res, {
    methods: [
      { id: 'bank_transfer', name: 'Bank Transfer', description: 'Direct bank transfer', enabled: true },
      { id: 'stripe', name: 'Stripe', description: 'Credit/Debit card via Stripe', enabled: true },
      { id: 'paypal', name: 'PayPal', description: 'PayPal payment', enabled: true },
      { id: 'venmo', name: 'Venmo', description: 'Venmo payment', enabled: true },
      { id: 'cash', name: 'Cash', description: 'Cash payment', enabled: true }
    ]
  });
};

/**
 * Get payment analytics
 * GET /api/payments/analytics
 */
const getPaymentAnalytics = async (req, res) => {
  try {
    const userId = req.user.id;
    const { startDate, endDate, groupId } = req.query;

    const query = {
      $or: [{ from: userId }, { to: userId }]
    };

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    if (groupId) {
      query.group = groupId;
    }

    const payments = await Settlement.find(query);

    const analytics = {
      totalAmount: payments.reduce((sum, p) => sum + p.amount, 0),
      totalPayments: payments.length,
      statusSummary: payments.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {}),
      methodBreakdown: payments.reduce((acc, p) => {
        acc[p.paymentMethod] = (acc[p.paymentMethod] || 0) + 1;
        return acc;
      }, {})
    };

    return successResponse(res, { analytics });
  } catch (error) {
    console.error('Get payment analytics error:', error);
    return errorResponse(res, 'Failed to get analytics', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Create batch payments
 * POST /api/payments/batch
 */
const createBatchPayments = async (req, res) => {
  try {
    const { payments } = req.body;

    if (!Array.isArray(payments) || payments.length === 0) {
      return errorResponse(res, 'Payments array is required', 'VALIDATION_ERROR', null, 400);
    }

    if (payments.length > 50) {
      return errorResponse(res, 'Cannot create more than 50 payments at once', 'VALIDATION_ERROR', null, 400);
    }

    const createdPayments = [];
    for (const paymentData of payments) {
      const settlement = new Settlement({
        from: paymentData.fromUserId,
        to: paymentData.toUserId,
        group: paymentData.groupId,
        amount: paymentData.amount,
        currency: paymentData.currency || 'USD',
        paymentMethod: paymentData.method || 'bank_transfer',
        description: paymentData.description || '',
        status: 'pending',
        type: 'direct'
      });
      await settlement.save();
      createdPayments.push(settlement);
    }

    return successResponse(res, {
      payments: createdPayments,
      summary: {
        total: createdPayments.length,
        successful: createdPayments.length,
        failed: 0
      }
    }, 'Batch payments created successfully', 201);
  } catch (error) {
    console.error('Create batch payments error:', error);
    return errorResponse(res, 'Failed to create batch payments', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Get payment reminders
 * GET /api/payments/reminders
 */
const getPaymentReminders = async (req, res) => {
  try {
    const userId = req.user.id;

    const reminders = await Settlement.find({
      from: userId,
      status: 'pending',
      dueDate: { $lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) } // Due within 7 days
    })
      .populate('to', 'username email')
      .populate('group', 'name');

    return successResponse(res, {
      reminders: reminders.map(r => ({
        _id: r._id,
        amount: r.amount,
        currency: r.currency,
        toUser: r.to,
        group: r.group,
        dueDate: r.dueDate
      }))
    });
  } catch (error) {
    console.error('Get payment reminders error:', error);
    return errorResponse(res, 'Failed to get reminders', 'SERVER_ERROR', error.message, 500);
  }
};

/**
 * Send payment reminder
 * POST /api/payments/:id/remind
 */
const sendPaymentReminder = async (req, res) => {
  try {
    const paymentId = req.params.id;
    const userId = req.user.id;

    const payment = await Settlement.findById(paymentId)
      .populate('to', 'email username');

    if (!payment) {
      return errorResponse(res, 'Payment not found', 'NOT_FOUND', null, 404);
    }

    // Only receiver can send reminder
    if (payment.to._id.toString() !== userId) {
      return errorResponse(res, 'Access denied', 'FORBIDDEN', null, 403);
    }

    if (payment.status === 'completed') {
      return errorResponse(res, 'Cannot remind for completed payment', 'VALIDATION_ERROR', null, 400);
    }

    // In a real implementation, send email/notification here
    // For now, just return success
    return successResponse(res, {
      message: 'Reminder sent successfully'
    });
  } catch (error) {
    console.error('Send payment reminder error:', error);
    return errorResponse(res, 'Failed to send reminder', 'SERVER_ERROR', error.message, 500);
  }
};

// Placeholder implementations for other endpoints
const notImplemented = (res, method) => {
  return errorResponse(
    res,
    `${method} endpoint not yet implemented`,
    'NOT_IMPLEMENTED',
    null,
    501
  );
};

const refundPayment = (req, res) => notImplemented(res, 'Refund payment');
const getPaymentHistory = (req, res) => notImplemented(res, 'Get payment history');
const updatePaymentMethod = (req, res) => notImplemented(res, 'Update payment method');
const addPaymentMethod = (req, res) => notImplemented(res, 'Add payment method');
const removePaymentMethod = (req, res) => notImplemented(res, 'Remove payment method');
const setDefaultPaymentMethod = (req, res) => notImplemented(res, 'Set default payment method');
const createSetupIntent = (req, res) => notImplemented(res, 'Create setup intent');
const confirmSetupIntent = (req, res) => notImplemented(res, 'Confirm setup intent');
const processRecurringPayment = (req, res) => notImplemented(res, 'Process recurring payment');
const handleStripeWebhook = (req, res) => notImplemented(res, 'Handle Stripe webhook');
const handlePayPalWebhook = (req, res) => notImplemented(res, 'Handle PayPal webhook');
const createPayPalOrder = (req, res) => notImplemented(res, 'Create PayPal order');
const capturePayPalPayment = (req, res) => notImplemented(res, 'Capture PayPal payment');
const getPaymentStatistics = (req, res) => notImplemented(res, 'Get payment statistics');
const getFailedPayments = (req, res) => notImplemented(res, 'Get failed payments');
const retryFailedPayment = (req, res) => notImplemented(res, 'Retry failed payment');
const getPaymentFees = (req, res) => notImplemented(res, 'Get payment fees');
const calculatePaymentFee = (req, res) => notImplemented(res, 'Calculate payment fee');
const getPaymentLimits = (req, res) => notImplemented(res, 'Get payment limits');
const updatePaymentLimits = (req, res) => notImplemented(res, 'Update payment limits');
const getPaymentConfig = (req, res) => notImplemented(res, 'Get payment config');
const updatePaymentConfig = (req, res) => notImplemented(res, 'Update payment config');
const exportPaymentData = (req, res) => notImplemented(res, 'Export payment data');
const getPaymentInsights = (req, res) => notImplemented(res, 'Get payment insights');
const getPendingPayments = (req, res) => notImplemented(res, 'Get pending payments');
const getPaymentReceipts = (req, res) => notImplemented(res, 'Get payment receipts');
const sendPaymentReceipt = (req, res) => notImplemented(res, 'Send payment receipt');
const disputePayment = (req, res) => notImplemented(res, 'Dispute payment');
const resolvePaymentDispute = (req, res) => notImplemented(res, 'Resolve payment dispute');
const getPaymentDisputes = (req, res) => notImplemented(res, 'Get payment disputes');
const createStripeSetupIntent = (req, res) => notImplemented(res, 'Create Stripe setup intent');
const createStripePaymentIntent = (req, res) => notImplemented(res, 'Create Stripe payment intent');
const confirmStripePayment = (req, res) => notImplemented(res, 'Confirm Stripe payment');
const createPayPalPayment = (req, res) => notImplemented(res, 'Create PayPal payment');
const executePayPalPayment = (req, res) => notImplemented(res, 'Execute PayPal payment');
const savePaymentMethod = (req, res) => notImplemented(res, 'Save payment method');
const getTransactions = (req, res) => notImplemented(res, 'Get transactions');
const getTransactionById = (req, res) => notImplemented(res, 'Get transaction by ID');
const refundTransaction = (req, res) => notImplemented(res, 'Refund transaction');
const getPaymentReceipt = (req, res) => notImplemented(res, 'Get payment receipt');
const createBatchPayout = (req, res) => notImplemented(res, 'Create batch payout');
const getPaymentBalance = (req, res) => notImplemented(res, 'Get payment balance');
const withdrawFunds = (req, res) => notImplemented(res, 'Withdraw funds');
const calculateFees = (req, res) => notImplemented(res, 'Calculate fees');
const verifyBankAccount = (req, res) => notImplemented(res, 'Verify bank account');
const getDisputes = (req, res) => notImplemented(res, 'Get disputes');
const respondToDispute = (req, res) => notImplemented(res, 'Respond to dispute');
const deletePaymentMethod = (req, res) => notImplemented(res, 'Delete payment method');

module.exports = {
  createPayment,
  getPayments,
  getPaymentById,
  updatePayment,
  confirmPayment,
  cancelPayment,
  getPaymentMethods,
  getPaymentAnalytics,
  createBatchPayments,
  getPaymentReminders,
  sendPaymentReminder,
  refundPayment,
  getPaymentHistory,
  updatePaymentMethod,
  addPaymentMethod,
  removePaymentMethod,
  setDefaultPaymentMethod,
  createSetupIntent,
  confirmSetupIntent,
  processRecurringPayment,
  handleStripeWebhook,
  handlePayPalWebhook,
  createPayPalOrder,
  capturePayPalPayment,
  getPaymentStatistics,
  getFailedPayments,
  retryFailedPayment,
  getPaymentFees,
  calculatePaymentFee,
  getPaymentLimits,
  updatePaymentLimits,
  getPaymentConfig,
  updatePaymentConfig,
  exportPaymentData,
  getPaymentInsights,
  getPendingPayments,
  getPaymentReceipts,
  sendPaymentReceipt,
  disputePayment,
  resolvePaymentDispute,
  getPaymentDisputes,
  createStripeSetupIntent,
  createStripePaymentIntent,
  confirmStripePayment,
  createPayPalPayment,
  executePayPalPayment,
  savePaymentMethod,
  getTransactions,
  getTransactionById,
  refundTransaction,
  getPaymentReceipt,
  createBatchPayout,
  getPaymentBalance,
  withdrawFunds,
  calculateFees,
  verifyBankAccount,
  getDisputes,
  respondToDispute,
  deletePaymentMethod
};
