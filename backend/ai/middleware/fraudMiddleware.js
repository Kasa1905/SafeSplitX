/**
 * Fraud Detection Middleware for SafeSplitX
 * Analyzes expenses for potential fraud in real-time
 */

const logger = require('../../utils/logger');
const { getServiceManager } = require('../serviceManager');

/**
 * Pre-expense creation fraud analysis middleware
 * Analyzes expense data before it's saved to database
 */
const preExpenseCreation = async (req, res, next) => {
  try {
    const serviceManager = getServiceManager();
    
    // Skip fraud analysis if AI services are not available
    if (!serviceManager.isAvailable()) {
      logger.debug('AI services not available, skipping pre-expense fraud analysis');
      return next();
    }

    const fraudService = serviceManager.getFraudService();
    const expenseData = req.body;
    
    // Prepare context for analysis
    const analysisContext = {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      source: 'expense_creation',
      stage: 'pre_creation'
    };

    logger.debug('Starting pre-expense creation fraud analysis', {
      userId: req.user.id,
      amount: expenseData.amount,
      category: expenseData.category
    });

    // Run fraud analysis
    const analysis = await fraudService.analyzeExpense(expenseData, {
      ...analysisContext,
      skipCache: false,
      async: false // Synchronous for pre-creation check
    });

    // Store analysis result in request for later use
    req.fraudAnalysis = analysis;

    // Check if expense should be blocked
    const blockThreshold = 0.9; // HIGH risk threshold for blocking
    if (analysis.overallScore >= blockThreshold && analysis.riskLevel === 'CRITICAL') {
      logger.warn('Expense blocked due to high fraud risk', {
        userId: req.user.id,
        amount: expenseData.amount,
        fraudScore: analysis.overallScore,
        riskLevel: analysis.riskLevel,
        riskFactors: analysis.riskFactors
      });

      return res.status(403).json({
        success: false,
        message: 'Expense cannot be created due to security concerns',
        code: 'FRAUD_RISK_HIGH',
        details: {
          riskLevel: analysis.riskLevel,
          score: analysis.overallScore,
          blocked: true
        }
      });
    }

    // Log high-risk expenses that are not blocked
    if (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'MEDIUM') {
      logger.warn('High-risk expense detected but not blocked', {
        userId: req.user.id,
        amount: expenseData.amount,
        fraudScore: analysis.overallScore,
        riskLevel: analysis.riskLevel,
        riskFactors: analysis.riskFactors
      });
    }

    next();

  } catch (error) {
    logger.error('Error in pre-expense creation fraud analysis', {
      error: error.message,
      userId: req.user?.id,
      expenseAmount: req.body?.amount
    });

    // Don't block expense creation due to analysis errors
    // Log the error and continue
    req.fraudAnalysisError = error.message;
    next();
  }
};

/**
 * Post-expense creation fraud analysis middleware
 * Performs additional analysis after expense is saved
 */
const postExpenseCreation = async (req, res, next) => {
  try {
    const serviceManager = getServiceManager();
    
    // Skip if AI services not available
    if (!serviceManager.isAvailable()) {
      logger.debug('AI services not available, skipping post-expense fraud analysis');
      return next();
    }

    const fraudService = serviceManager.getFraudService();
    
    // Get the created expense from response or request
    const expenseData = res.locals.createdExpense || req.body;
    const expenseId = expenseData._id || expenseData.id;

    if (!expenseId) {
      logger.debug('No expense ID available for post-creation analysis');
      return next();
    }

    const analysisContext = {
      userId: req.user.id,
      expenseId: expenseId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      source: 'expense_creation',
      stage: 'post_creation'
    };

    logger.debug('Starting post-expense creation fraud analysis', {
      userId: req.user.id,
      expenseId: expenseId,
      amount: expenseData.amount
    });

    // Run asynchronous analysis with full context
    setImmediate(async () => {
      try {
        const analysis = await fraudService.analyzeExpense(expenseData, {
          ...analysisContext,
          skipCache: false,
          async: true,
          storeResult: true // Store analysis in database
        });

        // Generate alerts if necessary
        if (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL') {
          await fraudService.generateAlert(expenseData, analysis);
          
          logger.info('Fraud alert generated for high-risk expense', {
            userId: req.user.id,
            expenseId: expenseId,
            riskLevel: analysis.riskLevel,
            score: analysis.overallScore
          });
        }

      } catch (error) {
        logger.error('Error in post-expense creation fraud analysis', {
          error: error.message,
          userId: req.user.id,
          expenseId: expenseId
        });
      }
    });

    next();

  } catch (error) {
    logger.error('Error setting up post-expense creation fraud analysis', {
      error: error.message,
      userId: req.user?.id
    });
    
    // Don't affect response - this is post-creation
    next();
  }
};

/**
 * Expense update fraud analysis middleware
 * Analyzes changes made to existing expenses
 */
const expenseUpdateCheck = async (req, res, next) => {
  try {
    const serviceManager = getServiceManager();
    
    // Skip if AI services not available
    if (!serviceManager.isAvailable()) {
      logger.debug('AI services not available, skipping expense update fraud analysis');
      return next();
    }

    const fraudService = serviceManager.getFraudService();
    const { id: expenseId } = req.params;
    const updateData = req.body;

    // Get original expense for comparison (this would typically come from database)
    // For now, we'll just analyze the update data
    const analysisContext = {
      userId: req.user.id,
      expenseId: expenseId,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      source: 'expense_update',
      stage: 'pre_update'
    };

    logger.debug('Starting expense update fraud analysis', {
      userId: req.user.id,
      expenseId: expenseId,
      updatedFields: Object.keys(updateData)
    });

    // Analyze the updated expense data
    const analysis = await fraudService.analyzeExpense(updateData, {
      ...analysisContext,
      skipCache: true, // Don't cache update analysis
      async: false
    });

    req.fraudAnalysis = analysis;

    // Check for suspicious update patterns
    if (analysis.riskLevel === 'HIGH' || analysis.riskLevel === 'CRITICAL') {
      logger.warn('Suspicious expense update detected', {
        userId: req.user.id,
        expenseId: expenseId,
        riskLevel: analysis.riskLevel,
        score: analysis.overallScore,
        updatedFields: Object.keys(updateData)
      });

      // Optionally block high-risk updates
      const blockThreshold = 0.95; // Very high threshold for update blocking
      if (analysis.overallScore >= blockThreshold) {
        return res.status(403).json({
          success: false,
          message: 'Expense update cannot be completed due to security concerns',
          code: 'FRAUD_RISK_UPDATE_BLOCKED',
          details: {
            riskLevel: analysis.riskLevel,
            score: analysis.overallScore
          }
        });
      }
    }

    next();

  } catch (error) {
    logger.error('Error in expense update fraud analysis', {
      error: error.message,
      userId: req.user?.id,
      expenseId: req.params?.id
    });

    // Don't block updates due to analysis errors
    next();
  }
};

/**
 * Bulk expense analysis middleware
 * Handles analysis of multiple expenses efficiently
 */
const bulkExpenseAnalysis = async (req, res, next) => {
  try {
    const serviceManager = getServiceManager();
    
    if (!serviceManager.isAvailable()) {
      logger.debug('AI services not available, skipping bulk expense fraud analysis');
      return next();
    }

    const fraudService = serviceManager.getFraudService();
    const expenses = req.body.expenses || [];

    if (!Array.isArray(expenses) || expenses.length === 0) {
      return next();
    }

    const analysisContext = {
      userId: req.user.id,
      ipAddress: req.ip,
      userAgent: req.get('User-Agent'),
      timestamp: new Date(),
      source: 'bulk_expense_creation',
      batchSize: expenses.length
    };

    logger.debug('Starting bulk expense fraud analysis', {
      userId: req.user.id,
      expenseCount: expenses.length
    });

    // Run bulk analysis
    const analyses = await fraudService.bulkAnalyzeExpenses(expenses, {
      ...analysisContext,
      async: false
    });

    req.bulkFraudAnalyses = analyses;

    // Check if any expenses should be blocked
    const blockedExpenses = analyses.filter(analysis => 
      analysis.overallScore >= 0.9 && analysis.riskLevel === 'CRITICAL'
    );

    if (blockedExpenses.length > 0) {
      logger.warn('Some expenses blocked in bulk creation due to fraud risk', {
        userId: req.user.id,
        totalExpenses: expenses.length,
        blockedCount: blockedExpenses.length
      });

      return res.status(403).json({
        success: false,
        message: `${blockedExpenses.length} expenses cannot be created due to security concerns`,
        code: 'BULK_FRAUD_RISK_HIGH',
        details: {
          totalExpenses: expenses.length,
          blockedCount: blockedExpenses.length,
          blockedIndices: blockedExpenses.map(analysis => analysis.index)
        }
      });
    }

    next();

  } catch (error) {
    logger.error('Error in bulk expense fraud analysis', {
      error: error.message,
      userId: req.user?.id,
      expenseCount: req.body?.expenses?.length
    });

    // Don't block bulk creation due to analysis errors
    next();
  }
};

/**
 * User behavior analysis middleware
 * Analyzes user spending patterns and behavior
 */
const userBehaviorAnalysis = async (req, res, next) => {
  try {
    const serviceManager = getServiceManager();
    
    if (!serviceManager.isAvailable()) {
      return next();
    }

    const fraudService = serviceManager.getFraudService();
    const userId = req.user.id;

    // Run user behavior analysis asynchronously
    setImmediate(async () => {
      try {
        const patterns = await fraudService.detectPatterns(userId);
        
        if (patterns.suspiciousPatterns.length > 0) {
          logger.info('Suspicious user behavior patterns detected', {
            userId: userId,
            patterns: patterns.suspiciousPatterns,
            riskLevel: patterns.overallRisk
          });

          // Generate behavioral alert if needed
          if (patterns.overallRisk === 'HIGH') {
            await fraudService.generateAlert({
              userId: userId,
              type: 'behavioral',
              patterns: patterns.suspiciousPatterns
            }, {
              riskLevel: patterns.overallRisk,
              overallScore: patterns.riskScore,
              classification: 'behavioral_anomaly'
            });
          }
        }

      } catch (error) {
        logger.error('Error in user behavior analysis', {
          error: error.message,
          userId: userId
        });
      }
    });

    next();

  } catch (error) {
    logger.error('Error setting up user behavior analysis', {
      error: error.message,
      userId: req.user?.id
    });
    next();
  }
};

/**
 * Fraud analysis status middleware
 * Adds fraud analysis results to response when available
 */
const addFraudAnalysisToResponse = (req, res, next) => {
  const originalJson = res.json;

  res.json = function(data) {
    // Add fraud analysis info if available and successful response
    if (data.success && req.fraudAnalysis) {
      data.fraudAnalysis = {
        riskLevel: req.fraudAnalysis.riskLevel,
        score: req.fraudAnalysis.overallScore,
        confidence: req.fraudAnalysis.confidence,
        analysisId: req.fraudAnalysis._id,
        processed: true
      };
    }

    // Add analysis error info if available
    if (req.fraudAnalysisError) {
      data.fraudAnalysis = {
        processed: false,
        error: 'Analysis failed',
        fallbackApplied: true
      };
    }

    return originalJson.call(this, data);
  };

  next();
};

module.exports = {
  preExpenseCreation,
  postExpenseCreation,
  expenseUpdateCheck,
  bulkExpenseAnalysis,
  userBehaviorAnalysis,
  addFraudAnalysisToResponse
};
