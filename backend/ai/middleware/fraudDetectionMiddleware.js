const logger = require('../../utils/logger');
const { FraudAnalysis, FraudAlert } = require('../models');
const fraudService = require('../fraud-detection/fraudService');

/**
 * Fraud Detection Middleware
 * Automatically analyzes expenses for fraud patterns
 * Integrates with the main expense creation/update flow
 */
class FraudDetectionMiddleware {
  constructor() {
    this.fraudService = fraudService.getInstance();
    this.isEnabled = process.env.FRAUD_DETECTION_ENABLED !== 'false';
    this.asyncMode = process.env.FRAUD_DETECTION_ASYNC === 'true';
    this.blockOnHighRisk = process.env.FRAUD_BLOCK_HIGH_RISK === 'true';
    this.alertThreshold = parseFloat(process.env.FRAUD_ALERT_THRESHOLD) || 0.7;
    this.blockThreshold = parseFloat(process.env.FRAUD_BLOCK_THRESHOLD) || 0.9;
    
    logger.info('Fraud Detection Middleware initialized', {
      enabled: this.isEnabled,
      asyncMode: this.asyncMode,
      blockOnHighRisk: this.blockOnHighRisk,
      alertThreshold: this.alertThreshold,
      blockThreshold: this.blockThreshold
    });
  }

  /**
   * Pre-expense creation middleware
   * Analyzes expense for fraud before it's saved
   */
  preExpenseCreation = async (req, res, next) => {
    if (!this.isEnabled) {
      return next();
    }

    try {
      const expenseData = req.body;
      const userId = req.user.id;

      logger.info('Running fraud detection on expense creation', {
        userId,
        amount: expenseData.amount,
        description: expenseData.description
      });

      if (this.asyncMode) {
        // Run fraud detection asynchronously
        this.analyzeExpenseAsync(expenseData, userId, req);
        return next();
      } else {
        // Run fraud detection synchronously
        const analysis = await this.fraudService.analyzeExpense(expenseData, {
          userId,
          groupId: expenseData.groupId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date()
        });

        // Attach analysis to request for use in controller
        req.fraudAnalysis = analysis;

        // Check if we should block the transaction
        if (this.blockOnHighRisk && analysis.overallScore >= this.blockThreshold) {
          logger.warn('Blocking expense creation due to high fraud score', {
            userId,
            score: analysis.overallScore,
            reasons: analysis.riskFactors
          });

          return res.status(403).json({
            success: false,
            error: 'Transaction blocked due to security concerns',
            code: 'FRAUD_DETECTION_BLOCK',
            details: {
              score: analysis.overallScore,
              riskLevel: analysis.riskLevel,
              requiresReview: true
            }
          });
        }

        // Add warning if score is above alert threshold
        if (analysis.overallScore >= this.alertThreshold) {
          req.fraudWarning = {
            score: analysis.overallScore,
            riskLevel: analysis.riskLevel,
            message: 'This transaction has been flagged for review'
          };
        }

        return next();
      }
    } catch (error) {
      logger.error('Error in fraud detection pre-creation middleware', {
        error: error.message,
        stack: error.stack,
        userId: req.user?.id
      });

      // Don't block the transaction on fraud detection errors
      // unless explicitly configured to do so
      if (process.env.FRAUD_FAIL_SECURE === 'true') {
        return res.status(500).json({
          success: false,
          error: 'Security validation failed',
          code: 'FRAUD_DETECTION_ERROR'
        });
      }

      return next();
    }
  };

  /**
   * Post-expense creation middleware
   * Updates fraud analysis with actual expense ID and triggers alerts
   */
  postExpenseCreation = async (req, res, next) => {
    if (!this.isEnabled) {
      return next();
    }

    try {
      const expense = req.expense || res.locals.expense;
      const analysis = req.fraudAnalysis;
      
      if (expense && analysis) {
        // Update fraud analysis with expense ID
        await FraudAnalysis.findByIdAndUpdate(analysis._id, {
          expenseId: expense._id,
          $push: {
            metadata: {
              key: 'expense_created',
              value: true,
              timestamp: new Date()
            }
          }
        });

        // Create alert if necessary
        if (analysis.overallScore >= this.alertThreshold) {
          await this.createFraudAlert(expense, analysis, req.user.id);
        }

        // Add fraud info to response if present
        if (req.fraudWarning && res.locals.responseData) {
          res.locals.responseData.fraudInfo = {
            reviewed: true,
            score: req.fraudWarning.score,
            riskLevel: req.fraudWarning.riskLevel
          };
        }

        logger.info('Post-expense fraud analysis completed', {
          expenseId: expense._id,
          analysisId: analysis._id,
          score: analysis.overallScore
        });
      }
    } catch (error) {
      logger.error('Error in post-expense fraud middleware', {
        error: error.message,
        expenseId: req.expense?._id,
        userId: req.user?.id
      });
    }

    return next();
  };

  /**
   * Expense update middleware
   * Analyzes changes to existing expenses
   */
  expenseUpdateCheck = async (req, res, next) => {
    if (!this.isEnabled) {
      return next();
    }

    try {
      const expenseId = req.params.id;
      const updates = req.body;
      const userId = req.user.id;

      // Get original expense for comparison
      const originalExpense = await req.models.Expense.findById(expenseId);
      if (!originalExpense) {
        return next();
      }

      // Check if significant fields are being updated
      const significantFields = ['amount', 'description', 'category', 'participants'];
      const hasSignificantChanges = significantFields.some(field => 
        updates[field] && updates[field] !== originalExpense[field]
      );

      if (hasSignificantChanges) {
        logger.info('Running fraud detection on expense update', {
          expenseId,
          userId,
          changes: Object.keys(updates)
        });

        // Create combined data for analysis
        const updatedExpenseData = { ...originalExpense.toObject(), ...updates };

        const analysis = await this.fraudService.analyzeExpense(updatedExpenseData, {
          userId,
          groupId: originalExpense.groupId,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent'),
          timestamp: new Date(),
          isUpdate: true,
          originalExpense: originalExpense.toObject()
        });

        req.fraudAnalysis = analysis;

        // Block high-risk updates if configured
        if (this.blockOnHighRisk && analysis.overallScore >= this.blockThreshold) {
          logger.warn('Blocking expense update due to high fraud score', {
            expenseId,
            userId,
            score: analysis.overallScore
          });

          return res.status(403).json({
            success: false,
            error: 'Update blocked due to security concerns',
            code: 'FRAUD_DETECTION_BLOCK_UPDATE'
          });
        }

        // Create alert for suspicious updates
        if (analysis.overallScore >= this.alertThreshold) {
          await this.createFraudAlert(originalExpense, analysis, userId, 'UPDATE');
        }
      }
    } catch (error) {
      logger.error('Error in expense update fraud check', {
        error: error.message,
        expenseId: req.params.id,
        userId: req.user?.id
      });
    }

    return next();
  };

  /**
   * Bulk expense analysis middleware
   * For batch operations and imports
   */
  bulkExpenseAnalysis = async (req, res, next) => {
    if (!this.isEnabled || !Array.isArray(req.body.expenses)) {
      return next();
    }

    try {
      const expenses = req.body.expenses;
      const userId = req.user.id;
      const maxBatchSize = 100;

      if (expenses.length > maxBatchSize) {
        logger.warn('Bulk expense batch too large for sync analysis', {
          count: expenses.length,
          maxBatchSize,
          userId
        });
        
        // Process asynchronously for large batches
        this.processBulkExpensesAsync(expenses, userId, req);
        return next();
      }

      logger.info('Running bulk fraud analysis', {
        count: expenses.length,
        userId
      });

      const analyses = await this.fraudService.bulkAnalyzeExpenses(expenses, {
        userId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      // Check for high-risk expenses
      const highRiskExpenses = analyses.filter(a => a.overallScore >= this.alertThreshold);
      
      if (highRiskExpenses.length > 0) {
        req.fraudWarnings = {
          count: highRiskExpenses.length,
          total: expenses.length,
          highRiskIndices: highRiskExpenses.map(a => a.metadata.batchIndex)
        };

        logger.warn('High-risk expenses detected in bulk analysis', {
          highRiskCount: highRiskExpenses.length,
          totalCount: expenses.length,
          userId
        });
      }

      req.bulkFraudAnalyses = analyses;
    } catch (error) {
      logger.error('Error in bulk expense fraud analysis', {
        error: error.message,
        userId: req.user?.id,
        expenseCount: req.body.expenses?.length
      });
    }

    return next();
  };

  /**
   * User behavior analysis middleware
   * Analyzes patterns across user's recent activity
   */
  userBehaviorAnalysis = async (req, res, next) => {
    if (!this.isEnabled) {
      return next();
    }

    try {
      const userId = req.user.id;
      
      // Get user's recent analyses for pattern detection
      const recentAnalyses = await FraudAnalysis.find({
        userId,
        createdAt: { 
          $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
        }
      }).sort({ createdAt: -1 }).limit(50);

      if (recentAnalyses.length > 0) {
        const patterns = this.analyzeUserPatterns(recentAnalyses);
        
        if (patterns.riskScore > 0.6) {
          logger.info('Suspicious user behavior pattern detected', {
            userId,
            riskScore: patterns.riskScore,
            patterns: patterns.detectedPatterns
          });

          req.userBehaviorWarning = {
            riskScore: patterns.riskScore,
            patterns: patterns.detectedPatterns,
            message: 'Unusual activity pattern detected'
          };
        }
      }
    } catch (error) {
      logger.error('Error in user behavior analysis', {
        error: error.message,
        userId: req.user?.id
      });
    }

    return next();
  };

  // Helper methods

  async analyzeExpenseAsync(expenseData, userId, req) {
    try {
      const analysis = await this.fraudService.analyzeExpense(expenseData, {
        userId,
        groupId: expenseData.groupId,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        timestamp: new Date()
      });

      if (analysis.overallScore >= this.alertThreshold) {
        // Create alert asynchronously
        setImmediate(async () => {
          try {
            await this.createFraudAlert(null, analysis, userId, 'ASYNC_CREATION');
          } catch (error) {
            logger.error('Error creating async fraud alert', {
              error: error.message,
              analysisId: analysis._id
            });
          }
        });
      }

      logger.info('Async fraud analysis completed', {
        userId,
        score: analysis.overallScore,
        analysisId: analysis._id
      });
    } catch (error) {
      logger.error('Error in async expense analysis', {
        error: error.message,
        userId
      });
    }
  }

  async processBulkExpensesAsync(expenses, userId, req) {
    try {
      const batchSize = 20;
      const batches = [];
      
      for (let i = 0; i < expenses.length; i += batchSize) {
        batches.push(expenses.slice(i, i + batchSize));
      }

      // Process batches with delay to avoid overwhelming the system
      for (let i = 0; i < batches.length; i++) {
        setTimeout(async () => {
          try {
            await this.fraudService.bulkAnalyzeExpenses(batches[i], {
              userId,
              ipAddress: req.ip,
              userAgent: req.get('User-Agent'),
              timestamp: new Date(),
              batchNumber: i + 1,
              totalBatches: batches.length
            });
          } catch (error) {
            logger.error('Error in bulk expense batch processing', {
              error: error.message,
              batchNumber: i + 1,
              userId
            });
          }
        }, i * 1000); // 1 second delay between batches
      }

      logger.info('Bulk expense async processing initiated', {
        totalExpenses: expenses.length,
        batches: batches.length,
        userId
      });
    } catch (error) {
      logger.error('Error initiating bulk expense async processing', {
        error: error.message,
        userId
      });
    }
  }

  async createFraudAlert(expense, analysis, userId, alertType = 'DETECTION') {
    try {
      const alertData = {
        type: 'FRAUD_DETECTION',
        severity: this.getSeverityFromScore(analysis.overallScore),
        expenseId: expense?._id,
        userId: expense?.userId || userId,
        groupId: expense?.groupId,
        analysisId: analysis._id,
        title: `Fraud ${alertType.toLowerCase()} - Risk Score: ${(analysis.overallScore * 100).toFixed(1)}%`,
        message: this.generateAlertMessage(analysis, alertType),
        fraudScore: analysis.overallScore,
        triggeredRules: analysis.ruleAnalysis?.triggeredRules || [],
        metadata: {
          analysisComponents: analysis.analysisComponents,
          confidence: analysis.confidence,
          autoFlag: analysis.overallScore >= this.blockThreshold,
          processingTime: analysis.processingTime,
          modelVersion: analysis.mlAnalysis?.modelVersion,
          ruleVersions: analysis.ruleAnalysis?.ruleVersions,
          contextData: analysis.context,
          additionalInfo: {
            alertType,
            riskFactors: analysis.riskFactors,
            recommendations: analysis.recommendations
          }
        }
      };

      const alert = new FraudAlert(alertData);
      await alert.save();

      logger.info('Fraud alert created', {
        alertId: alert.alertId,
        severity: alert.severity,
        score: analysis.overallScore,
        expenseId: expense?._id
      });

      return alert;
    } catch (error) {
      logger.error('Error creating fraud alert', {
        error: error.message,
        analysisId: analysis._id,
        expenseId: expense?._id
      });
      throw error;
    }
  }

  getSeverityFromScore(score) {
    if (score >= 0.9) return 'CRITICAL';
    if (score >= 0.7) return 'HIGH';
    if (score >= 0.5) return 'MEDIUM';
    return 'LOW';
  }

  generateAlertMessage(analysis, alertType) {
    const riskLevel = analysis.riskLevel;
    const score = (analysis.overallScore * 100).toFixed(1);
    
    let message = `${alertType === 'UPDATE' ? 'Expense update' : 'New expense'} flagged with ${riskLevel.toLowerCase()} risk (${score}% fraud score).`;
    
    if (analysis.riskFactors && analysis.riskFactors.length > 0) {
      message += ` Key concerns: ${analysis.riskFactors.slice(0, 3).join(', ')}.`;
    }
    
    if (analysis.recommendations && analysis.recommendations.length > 0) {
      message += ` Recommended actions: ${analysis.recommendations.slice(0, 2).join(', ')}.`;
    }
    
    return message;
  }

  analyzeUserPatterns(recentAnalyses) {
    const patterns = {
      detectedPatterns: [],
      riskScore: 0
    };

    try {
      // Analyze frequency of high-risk activities
      const highRiskCount = recentAnalyses.filter(a => a.overallScore >= 0.6).length;
      if (highRiskCount > recentAnalyses.length * 0.3) {
        patterns.detectedPatterns.push('High frequency of risky transactions');
        patterns.riskScore += 0.3;
      }

      // Analyze score trends
      const scores = recentAnalyses.map(a => a.overallScore);
      const avgScore = scores.reduce((sum, score) => sum + score, 0) / scores.length;
      if (avgScore > 0.5) {
        patterns.detectedPatterns.push('Consistently suspicious activity');
        patterns.riskScore += 0.2;
      }

      // Analyze time patterns
      const timestamps = recentAnalyses.map(a => new Date(a.createdAt).getHours());
      const nightTimeActivity = timestamps.filter(hour => hour >= 23 || hour <= 5).length;
      if (nightTimeActivity > recentAnalyses.length * 0.4) {
        patterns.detectedPatterns.push('Unusual time-of-day activity');
        patterns.riskScore += 0.1;
      }

      patterns.riskScore = Math.min(patterns.riskScore, 1.0);
    } catch (error) {
      logger.error('Error analyzing user patterns', { error: error.message });
    }

    return patterns;
  }
}

// Export singleton instance
const fraudDetectionMiddleware = new FraudDetectionMiddleware();

module.exports = {
  preExpenseCreation: fraudDetectionMiddleware.preExpenseCreation,
  postExpenseCreation: fraudDetectionMiddleware.postExpenseCreation,
  expenseUpdateCheck: fraudDetectionMiddleware.expenseUpdateCheck,
  bulkExpenseAnalysis: fraudDetectionMiddleware.bulkExpenseAnalysis,
  userBehaviorAnalysis: fraudDetectionMiddleware.userBehaviorAnalysis,
  middleware: fraudDetectionMiddleware
};