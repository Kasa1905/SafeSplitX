/**
 * Fraud Detection Controller for SafeSplitX
 * Comprehensive fraud detection API endpoints
 */

const { errorResponse, successResponse } = require('../utils/response');

const logger = require('../utils/logger');
const { FraudAnalysis, FraudAlert, FraudRule } = require('../ai/models');
const fraudService = require('../ai/fraud-detection/fraudService');
const { validationResult } = require('express-validator');

/**
 * Enhanced Fraud Controller
 * Manages all fraud detection related API endpoints
 * Integrates with AI fraud detection services
 */
class FraudController {
  constructor() {
    this.fraudService = fraudService.getInstance();
  }

  /**
   * Analyze single expense for fraud
   * POST /api/fraud/analyze/expense
   */
  analyzeExpense = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { expenseData, context = {} } = req.body;
      const userId = req.user.id;

      logger.info('Manual expense fraud analysis requested', {
        userId,
        expenseId: expenseData.id || 'new',
        amount: expenseData.amount
      });

      // Merge context with request metadata
      const analysisContext = {
        ...context,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        source: 'manual_analysis'
      };

      const analysis = await this.fraudService.analyzeExpense(expenseData, analysisContext);

      res.json({
        success: true,
        data: {
          analysisId: analysis._id,
          score: analysis.overallScore,
          riskLevel: analysis.riskLevel,
          confidence: analysis.confidence,
          classification: analysis.classification,
          riskFactors: analysis.riskFactors,
          recommendations: analysis.recommendations,
          analysisComponents: analysis.analysisComponents,
          processingTime: analysis.processingTime,
          mlAnalysis: {
            available: analysis.mlAnalysis?.available || false,
            score: analysis.mlAnalysis?.score,
            features: analysis.mlAnalysis?.features,
            modelVersion: analysis.mlAnalysis?.modelVersion
          },
          ruleAnalysis: {
            triggeredRules: analysis.ruleAnalysis?.triggeredRules || [],
            ruleScores: analysis.ruleAnalysis?.ruleScores || {},
            totalRulesEvaluated: analysis.ruleAnalysis?.totalRulesEvaluated || 0
          }
        }
      });

    } catch (error) {
      logger.error('Error in expense fraud analysis', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to analyze expense for fraud',
        code: 'ANALYSIS_ERROR'
      });
    }
  };

  /**
   * Bulk analyze expenses for fraud
   * POST /api/fraud/analyze/bulk
   */
  bulkAnalyzeExpenses = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: errors.array()
        });
      }

      const { expenses, context = {} } = req.body;
      const userId = req.user.id;

      if (!Array.isArray(expenses) || expenses.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Expenses array is required and must not be empty'
        });
      }

      const maxBatchSize = 100;
      if (expenses.length > maxBatchSize) {
        return res.status(400).json({
          success: false,
          error: `Batch size too large. Maximum ${maxBatchSize} expenses allowed.`
        });
      }

      logger.info('Bulk fraud analysis requested', {
        userId,
        count: expenses.length
      });

      const analysisContext = {
        ...context,
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date(),
        source: 'bulk_analysis'
      };

      const analyses = await this.fraudService.bulkAnalyzeExpenses(expenses, analysisContext);

      // Calculate summary statistics
      const summary = {
        totalAnalyzed: analyses.length,
        highRisk: analyses.filter(a => a.overallScore >= 0.7).length,
        mediumRisk: analyses.filter(a => a.overallScore >= 0.5 && a.overallScore < 0.7).length,
        lowRisk: analyses.filter(a => a.overallScore < 0.5).length,
        avgScore: analyses.reduce((sum, a) => sum + a.overallScore, 0) / analyses.length,
        processingTime: analyses.reduce((sum, a) => sum + (a.processingTime || 0), 0)
      };

      res.json({
        success: true,
        data: {
          summary,
          analyses: analyses.map(analysis => ({
            id: analysis._id,
            batchIndex: analysis.metadata?.batchIndex,
            score: analysis.overallScore,
            riskLevel: analysis.riskLevel,
            classification: analysis.classification,
            riskFactors: analysis.riskFactors?.slice(0, 3), // Limit for bulk response
            mlAvailable: analysis.mlAnalysis?.available || false,
            triggeredRules: analysis.ruleAnalysis?.triggeredRules?.length || 0
          }))
        }
      });

    } catch (error) {
      logger.error('Error in bulk fraud analysis', {
        error: error.message,
        userId: req.user?.id,
        expenseCount: req.body.expenses?.length
      });

      res.status(500).json({
        success: false,
        error: 'Failed to perform bulk fraud analysis',
        code: 'BULK_ANALYSIS_ERROR'
      });
    }
  };

  /**
   * Get fraud analysis by ID
   * GET /api/fraud/analysis/:id
   */
  getFraudAnalysis = async (req, res) => {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const analysis = await FraudAnalysis.findById(id)
        .populate('expenseId', 'amount description category')
        .populate('userId', 'name email');

      if (!analysis) {
        return res.status(404).json({
          success: false,
          error: 'Fraud analysis not found'
        });
      }

      // Check permissions - users can only view their own analyses unless admin
      if (analysis.userId._id.toString() !== userId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      res.json({
        success: true,
        data: analysis
      });

    } catch (error) {
      logger.error('Error fetching fraud analysis', {
        error: error.message,
        analysisId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud analysis'
      });
    }
  };

  /**
   * Get user's fraud analysis history
   * GET /api/fraud/analysis/user/:userId?
   */
  getUserFraudHistory = async (req, res) => {
    try {
      const targetUserId = req.params.userId || req.user.id;
      const currentUserId = req.user.id;

      // Check permissions
      if (targetUserId !== currentUserId && !req.user.isAdmin) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const query = { userId: targetUserId };

      // Add filters
      if (req.query.riskLevel) {
        query.riskLevel = req.query.riskLevel.toUpperCase();
      }

      if (req.query.minScore) {
        query.overallScore = { $gte: parseFloat(req.query.minScore) };
      }

      if (req.query.startDate || req.query.endDate) {
        query.createdAt = {};
        if (req.query.startDate) {
          query.createdAt.$gte = new Date(req.query.startDate);
        }
        if (req.query.endDate) {
          query.createdAt.$lte = new Date(req.query.endDate);
        }
      }

      const [analyses, total] = await Promise.all([
        FraudAnalysis.find(query)
          .populate('expenseId', 'amount description category')
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        FraudAnalysis.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          analyses,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching user fraud history', {
        error: error.message,
        targetUserId: req.params.userId,
        currentUserId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud history'
      });
    }
  };

  /**
   * Get fraud alerts
   * GET /api/fraud/alerts
   */
  getFraudAlerts = async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.isAdmin;

      const page = parseInt(req.query.page) || 1;
      const limit = Math.min(parseInt(req.query.limit) || 20, 100);
      const skip = (page - 1) * limit;

      const query = {};

      // Non-admin users can only see their own alerts
      if (!isAdmin) {
        query.userId = userId;
      }

      // Add filters
      if (req.query.status) {
        query.status = req.query.status.toUpperCase();
      }

      if (req.query.severity) {
        query.severity = req.query.severity.toUpperCase();
      }

      if (req.query.assignedTo && isAdmin) {
        query.assignedTo = req.query.assignedTo;
      }

      const [alerts, total] = await Promise.all([
        FraudAlert.find(query)
          .populate('userId', 'name email')
          .populate('expenseId', 'amount description')
          .populate('assignedTo', 'name email')
          .sort({ priority: -1, createdAt: -1 })
          .skip(skip)
          .limit(limit),
        FraudAlert.countDocuments(query)
      ]);

      res.json({
        success: true,
        data: {
          alerts,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1
          }
        }
      });

    } catch (error) {
      logger.error('Error fetching fraud alerts', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud alerts'
      });
    }
  };

  /**
   * Update fraud alert status
   * PATCH /api/fraud/alerts/:id
   */
  updateFraudAlert = async (req, res) => {
    try {
      const { id } = req.params;
      const { status, resolution, notes } = req.body;
      const userId = req.user.id;

      const alert = await FraudAlert.findById(id);
      if (!alert) {
        return res.status(404).json({
          success: false,
          error: 'Fraud alert not found'
        });
      }

      // Check permissions
      if (!req.user.isAdmin && alert.userId.toString() !== userId) {
        return res.status(403).json({
          success: false,
          error: 'Access denied'
        });
      }

      let updatedAlert;

      if (status === 'RESOLVED') {
        updatedAlert = await alert.resolve(userId, resolution, notes);
      } else if (status === 'DISMISSED') {
        updatedAlert = await alert.dismiss(userId, notes);
      } else {
        // General status update
        alert.status = status;
        if (notes) {
          alert.resolutionNotes = notes;
        }
        updatedAlert = await alert.save();
      }

      logger.info('Fraud alert updated', {
        alertId: alert.alertId,
        newStatus: status,
        updatedBy: userId
      });

      res.json({
        success: true,
        data: updatedAlert
      });

    } catch (error) {
      logger.error('Error updating fraud alert', {
        error: error.message,
        alertId: req.params.id,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to update fraud alert'
      });
    }
  };

  /**
   * Get fraud statistics
   * GET /api/fraud/stats
   */
  getFraudStatistics = async (req, res) => {
    try {
      const userId = req.user.id;
      const isAdmin = req.user.isAdmin;
      
      const days = parseInt(req.query.days) || 30;
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      const endDate = new Date();

      const baseQuery = {
        createdAt: { $gte: startDate, $lte: endDate }
      };

      // Non-admin users see only their own stats
      if (!isAdmin) {
        baseQuery.userId = userId;
      }

      const [
        totalAnalyses,
        alertsSummary,
        riskDistribution,
        recentTrends
      ] = await Promise.all([
        FraudAnalysis.countDocuments(baseQuery),
        FraudAlert.getAlertsSummary(startDate, endDate),
        FraudAnalysis.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: '$riskLevel',
              count: { $sum: 1 },
              avgScore: { $avg: '$overallScore' }
            }
          }
        ]),
        FraudAnalysis.aggregate([
          { $match: baseQuery },
          {
            $group: {
              _id: {
                date: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } }
              },
              count: { $sum: 1 },
              avgScore: { $avg: '$overallScore' },
              highRiskCount: {
                $sum: { $cond: [{ $gte: ['$overallScore', 0.7] }, 1, 0] }
              }
            }
          },
          { $sort: { '_id.date': 1 } },
          { $limit: days }
        ])
      ]);

      const stats = {
        period: {
          days,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        },
        overview: {
          totalAnalyses,
          totalAlerts: alertsSummary.reduce((sum, item) => 
            sum + item.statusBreakdown.reduce((s, status) => s + status.count, 0), 0)
        },
        riskDistribution: riskDistribution.reduce((acc, item) => {
          acc[item._id.toLowerCase()] = {
            count: item.count,
            percentage: totalAnalyses > 0 ? (item.count / totalAnalyses * 100).toFixed(1) : 0,
            avgScore: item.avgScore?.toFixed(3) || 0
          };
          return acc;
        }, {}),
        alerts: alertsSummary,
        trends: recentTrends
      };

      res.json({
        success: true,
        data: stats
      });

    } catch (error) {
      logger.error('Error fetching fraud statistics', {
        error: error.message,
        userId: req.user?.id
      });

      res.status(500).json({
        success: false,
        error: 'Failed to fetch fraud statistics'
      });
    }
  };

  // Legacy method mapping for backwards compatibility
  getFraudHistory = this.getUserFraudHistory;
  getFlaggedExpenses = this.getFraudAlerts;
  reviewExpense = this.updateFraudAlert;

  // Get fraud patterns for a user
  getFraudPatterns = async (req, res) => {
    try {
      const userId = req.user.id;
      const { groupId, timeRange = 30 } = req.query;

      logger.info('Getting fraud patterns', { userId, groupId, timeRange });

      const patterns = await this.fraudService.getFraudPatterns(userId, {
        groupId,
        timeRange: parseInt(timeRange)
      });

      return successResponse(res, patterns, 'Fraud patterns retrieved successfully');

    } catch (error) {
      logger.error('Error getting fraud patterns', {
        error: error.message,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to get fraud patterns', 'PATTERNS_ERROR', null, 500);
    }
  };

  getFraudRules = async (req, res) => {
    try {
      const { active } = req.query;
      const filters = {};
      
      if (active !== undefined) {
        filters.active = active === 'true';
      }

      logger.info('Getting fraud rules', { filters });

      const rules = await this.fraudService.getFraudRules(filters);

      return successResponse(res, rules, 'Fraud rules retrieved successfully');

    } catch (error) {
      logger.error('Error getting fraud rules', { error: error.message });
      return errorResponse(res, 'Failed to get fraud rules', 'RULES_ERROR', null, 500);
    }
  };

  createFraudRule = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', errors.array(), 400);
      }

      const ruleData = {
        ...req.body,
        createdBy: req.user.id
      };

      logger.info('Creating fraud rule', { name: ruleData.name, createdBy: req.user.id });

      const rule = await this.fraudService.createFraudRule(ruleData);

      return successResponse(res, rule, 'Fraud rule created successfully', 201);

    } catch (error) {
      logger.error('Error creating fraud rule', {
        error: error.message,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to create fraud rule', 'CREATE_RULE_ERROR', null, 500);
    }
  };

  updateFraudRule = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', errors.array(), 400);
      }

      const { id } = req.params;
      const updateData = {
        ...req.body,
        updatedBy: req.user.id
      };

      logger.info('Updating fraud rule', { ruleId: id, updatedBy: req.user.id });

      const rule = await this.fraudService.updateFraudRule(id, updateData);

      return successResponse(res, rule, 'Fraud rule updated successfully');

    } catch (error) {
      logger.error('Error updating fraud rule', {
        error: error.message,
        ruleId: req.params?.id,
        userId: req.user?.id
      });
      
      if (error.message.includes('not found')) {
        return errorResponse(res, 'Fraud rule not found', 'RULE_NOT_FOUND', null, 404);
      }
      
      return errorResponse(res, 'Failed to update fraud rule', 'UPDATE_RULE_ERROR', null, 500);
    }
  };

  deleteFraudRule = async (req, res) => {
    try {
      const { id } = req.params;

      logger.info('Deleting fraud rule', { ruleId: id, deletedBy: req.user.id });

      const rule = await this.fraudService.deleteFraudRule(id);

      return successResponse(res, rule, 'Fraud rule deleted successfully');

    } catch (error) {
      logger.error('Error deleting fraud rule', {
        error: error.message,
        ruleId: req.params?.id,
        userId: req.user?.id
      });
      
      if (error.message.includes('not found')) {
        return errorResponse(res, 'Fraud rule not found', 'RULE_NOT_FOUND', null, 404);
      }
      
      return errorResponse(res, 'Failed to delete fraud rule', 'DELETE_RULE_ERROR', null, 500);
    }
  };

  // Get flagged expenses
  getFlaggedExpenses = async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        riskLevel = 'HIGH', 
        limit = 50, 
        offset = 0, 
        sortBy = 'timestamp', 
        sortOrder = 'desc',
        groupId 
      } = req.query;

      logger.info('Getting flagged expenses', { userId, riskLevel, limit, offset });

      const result = await this.fraudService.getFlaggedExpenses(userId, groupId, {
        riskLevel: Array.isArray(riskLevel) ? riskLevel : [riskLevel],
        limit: parseInt(limit),
        offset: parseInt(offset),
        sortBy,
        sortOrder
      });

      return successResponse(res, result, 'Flagged expenses retrieved successfully');

    } catch (error) {
      logger.error('Error getting flagged expenses', {
        error: error.message,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to get flagged expenses', 'FLAGGED_ERROR', null, 500);
    }
  };

  // Review expense (mark as reviewed)
  reviewExpense = async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return errorResponse(res, 'Validation failed', 'VALIDATION_ERROR', errors.array(), 400);
      }

      const { analysisId } = req.params;
      const { reviewed, notes, decision } = req.body;

      logger.info('Reviewing expense', { analysisId, decision, reviewedBy: req.user.id });

      // Update the fraud analysis with review information
      const analysis = await this.fraudService.getFraudAnalysis(analysisId);
      if (!analysis) {
        return errorResponse(res, 'Fraud analysis not found', 'ANALYSIS_NOT_FOUND', null, 404);
      }

      // Here you would typically update the analysis with review status
      // This is a simplified implementation
      const reviewData = {
        reviewed: reviewed !== false,
        reviewedAt: new Date(),
        reviewedBy: req.user.id,
        reviewNotes: notes,
        reviewDecision: decision
      };

      return successResponse(res, { analysisId, ...reviewData }, 'Expense review completed successfully');

    } catch (error) {
      logger.error('Error reviewing expense', {
        error: error.message,
        analysisId: req.params?.analysisId,
        userId: req.user?.id
      });
      
      if (error.message.includes('not found')) {
        return errorResponse(res, 'Analysis not found', 'ANALYSIS_NOT_FOUND', null, 404);
      }
      
      return errorResponse(res, 'Failed to review expense', 'REVIEW_ERROR', null, 500);
    }
  };

  // Get fraud history for a user
  getFraudHistory = async (req, res) => {
    try {
      const userId = req.user.id;
      const { 
        limit = 50, 
        offset = 0, 
        timeRange = 30,
        includeResolved = true 
      } = req.query;

      logger.info('Getting fraud history', { userId, timeRange, limit });

      const result = await this.fraudService.getFraudAlerts(userId, {
        limit: parseInt(limit),
        offset: parseInt(offset),
        status: includeResolved === 'false' ? 'ACTIVE' : undefined
      });

      return successResponse(res, result, 'Fraud history retrieved successfully');

    } catch (error) {
      logger.error('Error getting fraud history', {
        error: error.message,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to get fraud history', 'HISTORY_ERROR', null, 500);
    }
  };

  // Get model status
  getModelStatus = async (req, res) => {
    try {
      logger.info('Getting model status');

      const status = await this.fraudService.getModelStatus();

      return successResponse(res, status, 'Model status retrieved successfully');

    } catch (error) {
      logger.error('Error getting model status', { error: error.message });
      return errorResponse(res, 'Failed to get model status', 'MODEL_STATUS_ERROR', null, 500);
    }
  };

  // Train model
  trainModel = async (req, res) => {
    try {
      const modelConfig = req.body || {};
      
      logger.info('Training model requested', { config: modelConfig, requestedBy: req.user.id });

      const training = await this.fraudService.trainModel(modelConfig);

      return successResponse(res, training, 'Model training initiated successfully');

    } catch (error) {
      logger.error('Error training model', {
        error: error.message,
        userId: req.user?.id
      });
      return errorResponse(res, 'Failed to initiate model training', 'TRAIN_MODEL_ERROR', null, 500);
    }
  };
}

const fraudController = new FraudController();

module.exports = {
  analyzeExpense: fraudController.analyzeExpense,
  bulkAnalyzeExpenses: fraudController.bulkAnalyzeExpenses,
  getFlaggedExpenses: fraudController.getFlaggedExpenses,
  getFraudAnalysis: fraudController.getFraudAnalysis,
  reviewExpense: fraudController.reviewExpense,
  getFraudHistory: fraudController.getFraudHistory,
  getFraudPatterns: fraudController.getFraudPatterns,
  getFraudRules: fraudController.getFraudRules,
  createFraudRule: fraudController.createFraudRule,
  updateFraudRule: fraudController.updateFraudRule,
  deleteFraudRule: fraudController.deleteFraudRule,
  getFraudAlerts: fraudController.getFraudAlerts,
  updateFraudAlert: fraudController.updateFraudAlert,
  getFraudStatistics: fraudController.getFraudStatistics,
  getUserFraudHistory: fraudController.getUserFraudHistory,
  getModelStatus: fraudController.getModelStatus,
  trainModel: fraudController.trainModel
};