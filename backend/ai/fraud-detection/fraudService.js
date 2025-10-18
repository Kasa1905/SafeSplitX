const logger = require('../../utils/logger');
const { getConfig } = require('./config');
const { getClient } = require('./pythonServiceClient');
const { getRuleEngine } = require('./ruleEngine');
const { getMLUtils } = require('./mlUtils');
const { getModels } = require('../models');

/**
 * Main Fraud Detection Service
 * Coordinates ML models, rule engines, and external services
 */
class FraudService {
  constructor() {
    this.config = getConfig();
    this.pythonClient = getClient();
    this.ruleEngine = getRuleEngine();
    this.mlUtils = getMLUtils();
    this.models = getModels();
    this.analysisCache = new Map();
  }

  /**
   * Analyze a single expense for fraud
   */
  async analyzeExpense(expenseData, options = {}) {
    const startTime = Date.now();
    
    try {
      logger.debug('Starting fraud analysis for expense', { 
        expenseId: expenseData._id || 'new',
        amount: expenseData.amount,
        userId: expenseData.userId 
      });

      // Validate input data
      const sanitizedExpense = this.mlUtils.preprocessExpenseData(expenseData);
      
      // Check cache if enabled
      const cacheKey = this.generateCacheKey(sanitizedExpense);
      if (this.config.getPerformanceConfig().cacheEnabled && !options.skipCache) {
        const cached = this.analysisCache.get(cacheKey);
        if (cached && (Date.now() - cached.timestamp) < this.config.getPerformanceConfig().cacheTimeout) {
          logger.debug('Returning cached fraud analysis', { cacheKey });
          return cached.result;
        }
      }

      // Gather context data
      const context = await this.gatherContext(sanitizedExpense);
      
      // Run parallel analysis
      const [mlResult, ruleResult] = await Promise.allSettled([
        this.runMLAnalysis(sanitizedExpense, context, options),
        this.runRuleAnalysis(sanitizedExpense, context, options)
      ]);

      // Combine results
      const combinedResult = this.combineAnalysisResults(
        mlResult.status === 'fulfilled' ? mlResult.value : null,
        ruleResult.status === 'fulfilled' ? ruleResult.value : null,
        sanitizedExpense
      );

      // Store analysis result
      await this.storeAnalysisResult(sanitizedExpense, combinedResult, context);

      // Generate alerts if needed
      if (combinedResult.requiresAlert) {
        await this.generateAlert(sanitizedExpense, combinedResult);
      }

      // Cache result
      if (this.config.getPerformanceConfig().cacheEnabled) {
        this.analysisCache.set(cacheKey, {
          result: combinedResult,
          timestamp: Date.now()
        });
      }

      const processingTime = Date.now() - startTime;
      logger.info('Fraud analysis completed', {
        expenseId: sanitizedExpense._id || 'new',
        fraudScore: combinedResult.fraudScore,
        riskLevel: combinedResult.riskLevel,
        processingTime
      });

      return {
        ...combinedResult,
        processingTime
      };

    } catch (error) {
      logger.error('Fraud analysis failed', {
        error: error.message,
        stack: error.stack,
        expenseId: expenseData._id || 'new'
      });

      // Return safe fallback result
      return this.getFallbackResult(expenseData, error);
    }
  }

  /**
   * Analyze multiple expenses in batch
   */
  async bulkAnalyzeExpenses(expensesData, options = {}) {
    const batchSize = options.batchSize || this.config.getPerformanceConfig().batchSize;
    const results = [];

    logger.info(`Starting bulk fraud analysis for ${expensesData.length} expenses`);

    // Process in batches to avoid memory issues
    for (let i = 0; i < expensesData.length; i += batchSize) {
      const batch = expensesData.slice(i, i + batchSize);
      
      try {
        // Process batch in parallel with concurrency limit
        const batchPromises = batch.map(expense => 
          this.analyzeExpense(expense, { ...options, skipCache: false })
        );

        const batchResults = await Promise.allSettled(batchPromises);
        
        // Collect successful results and log failures
        batchResults.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            results.push(result.value);
          } else {
            logger.error(`Batch analysis failed for expense ${i + index}:`, result.reason);
            results.push(this.getFallbackResult(batch[index], result.reason));
          }
        });

      } catch (error) {
        logger.error(`Batch processing error for batch starting at ${i}:`, error);
        
        // Add fallback results for this batch
        batch.forEach(expense => {
          results.push(this.getFallbackResult(expense, error));
        });
      }
    }

    logger.info(`Bulk fraud analysis completed: ${results.length} results`);
    return results;
  }

  /**
   * Run ML-based analysis
   */
  async runMLAnalysis(expenseData, context, options = {}) {
    if (!this.config.isPythonServiceEnabled()) {
      logger.debug('Python ML service disabled, skipping ML analysis');
      return null;
    }

    try {
      // Extract features for ML model
      const features = this.mlUtils.extractFeatures(
        expenseData,
        context.userHistory,
        context.groupHistory
      );

      // Get prediction from Python service
      const prediction = await this.pythonClient.predict(expenseData, {
        includeFeatures: true,
        includeExplanation: true,
        modelType: options.modelType
      });

      // Analyze feature importance
      const featureImportance = this.mlUtils.analyzeFeatureImportance(features, prediction);

      return {
        type: 'ml',
        fraudScore: prediction.fraudScore,
        confidence: prediction.confidence,
        riskLevel: prediction.riskLevel,
        features,
        featureImportance,
        modelVersion: prediction.modelVersion,
        explanation: prediction.explanation,
        anomalyScore: prediction.anomalyScore,
        patterns: prediction.patterns,
        processingTime: prediction.processingTime
      };

    } catch (error) {
      logger.warn('ML analysis failed, falling back to rule engine', {
        error: error.message,
        expenseId: expenseData._id || 'new'
      });
      return null;
    }
  }

  /**
   * Run rule-based analysis
   */
  async runRuleAnalysis(expenseData, context, options = {}) {
    if (!this.config.isRuleEngineEnabled()) {
      logger.debug('Rule engine disabled, skipping rule analysis');
      return null;
    }

    try {
      const ruleResult = await this.ruleEngine.evaluateRules(expenseData, context);
      
      return {
        type: 'rule',
        fraudScore: ruleResult.ruleScore,
        riskLevel: this.mlUtils.getRiskLevel(ruleResult.ruleScore),
        triggeredRules: ruleResult.triggeredRules,
        ruleAnalysis: ruleResult.ruleAnalysis,
        processingTime: ruleResult.processingTime,
        totalRulesEvaluated: ruleResult.totalRulesEvaluated
      };

    } catch (error) {
      logger.error('Rule analysis failed', {
        error: error.message,
        expenseId: expenseData._id || 'new'
      });
      return null;
    }
  }

  /**
   * Combine ML and rule-based results
   */
  combineAnalysisResults(mlResult, ruleResult, expenseData) {
    const ruleConfig = this.config.getRuleEngineConfig();
    const scoringConfig = this.config.getScoringConfig();
    
    let finalScore = 0;
    let confidence = 0;
    const analysisComponents = [];

    // Combine scores based on weights
    if (mlResult && ruleResult) {
      // Both ML and rule results available
      finalScore = (mlResult.fraudScore * ruleConfig.mlWeight) + 
                  (ruleResult.fraudScore * ruleConfig.ruleWeight);
      confidence = Math.max(mlResult.confidence || 0.5, 0.5);
      
      analysisComponents.push('ml', 'rule');
    } else if (mlResult) {
      // Only ML result available
      finalScore = mlResult.fraudScore;
      confidence = mlResult.confidence || 0.5;
      analysisComponents.push('ml');
    } else if (ruleResult) {
      // Only rule result available
      finalScore = ruleResult.fraudScore;
      confidence = 0.6; // Moderate confidence for rule-only analysis
      analysisComponents.push('rule');
    } else {
      // No analysis available - use fallback
      finalScore = 0.1; // Low default suspicion
      confidence = 0.1; // Very low confidence
      analysisComponents.push('fallback');
    }

    // Determine risk level and actions
    const riskLevel = this.mlUtils.getRiskLevel(finalScore);
    const requiresReview = finalScore >= scoringConfig.reviewThreshold;
    const requiresAlert = finalScore >= scoringConfig.alertThreshold;
    const autoFlag = finalScore >= scoringConfig.autoFlagThreshold;

    // Build explanation
    const explanation = this.buildExplanation(mlResult, ruleResult, finalScore, riskLevel);

    return {
      fraudScore: Math.round(finalScore * 1000) / 1000, // Round to 3 decimal places
      confidence: Math.round(confidence * 1000) / 1000,
      riskLevel,
      requiresReview,
      requiresAlert,
      autoFlag,
      explanation,
      analysisComponents,
      mlAnalysis: mlResult,
      ruleAnalysis: ruleResult,
      timestamp: new Date().toISOString(),
      version: '1.0.0'
    };
  }

  /**
   * Build human-readable explanation
   */
  buildExplanation(mlResult, ruleResult, finalScore, riskLevel) {
    const parts = [];

    parts.push(`Overall fraud score: ${(finalScore * 100).toFixed(1)}% (${riskLevel} risk)`);

    if (mlResult) {
      parts.push(`ML model confidence: ${(mlResult.confidence * 100).toFixed(1)}%`);
      if (mlResult.explanation) {
        parts.push(`ML analysis: ${mlResult.explanation}`);
      }
    }

    if (ruleResult && ruleResult.triggeredRules?.length > 0) {
      const topRules = ruleResult.triggeredRules
        .sort((a, b) => b.score - a.score)
        .slice(0, 3)
        .map(rule => rule.name);
      parts.push(`Triggered rules: ${topRules.join(', ')}`);
    }

    return parts.join('. ');
  }

  /**
   * Gather context data for analysis
   */
  async gatherContext(expenseData) {
    const features = this.config.getFeatureConfig();
    const now = new Date();
    const userHistoryStart = new Date(now.getTime() - (features.userHistoryDays || 30) * 24 * 60 * 60 * 1000);
    const groupHistoryStart = new Date(now.getTime() - (features.groupAnalysisDays || 7) * 24 * 60 * 60 * 1000);

    try {
      const [userHistory, groupHistory] = await Promise.all([
        // Get user's expense history
        this.models.Expense.find({
          userId: expenseData.userId,
          createdAt: { $gte: userHistoryStart },
          _id: { $ne: expenseData._id } // Exclude current expense
        })
        .sort({ createdAt: -1 })
        .limit(100)
        .lean(),

        // Get group's expense history
        expenseData.groupId ? this.models.Expense.find({
          groupId: expenseData.groupId,
          createdAt: { $gte: groupHistoryStart },
          _id: { $ne: expenseData._id }
        })
        .sort({ createdAt: -1 })
        .limit(200)
        .lean() : Promise.resolve([])
      ]);

      return {
        userHistory: userHistory || [],
        groupHistory: groupHistory || [],
        timestamp: now.toISOString()
      };

    } catch (error) {
      logger.warn('Failed to gather context data', {
        error: error.message,
        userId: expenseData.userId,
        groupId: expenseData.groupId
      });

      return {
        userHistory: [],
        groupHistory: [],
        timestamp: now.toISOString(),
        error: error.message
      };
    }
  }

  /**
   * Store analysis result in database
   */
  async storeAnalysisResult(expenseData, analysisResult, context) {
    try {
      const fraudAnalysis = new this.models.FraudAnalysis({
        expenseId: expenseData._id || null,
        userId: expenseData.userId,
        groupId: expenseData.groupId || null,
        fraudScore: analysisResult.fraudScore,
        confidence: analysisResult.confidence,
        riskLevel: analysisResult.riskLevel,
        analysisComponents: analysisResult.analysisComponents,
        mlAnalysis: analysisResult.mlAnalysis,
        ruleAnalysis: analysisResult.ruleAnalysis,
        explanation: analysisResult.explanation,
        requiresReview: analysisResult.requiresReview,
        requiresAlert: analysisResult.requiresAlert,
        autoFlag: analysisResult.autoFlag,
        processingTime: analysisResult.processingTime,
        contextData: {
          userHistoryCount: context.userHistory?.length || 0,
          groupHistoryCount: context.groupHistory?.length || 0
        },
        version: analysisResult.version,
        createdAt: new Date()
      });

      await fraudAnalysis.save();
      logger.debug('Fraud analysis result stored', { analysisId: fraudAnalysis._id });

    } catch (error) {
      logger.error('Failed to store fraud analysis result', {
        error: error.message,
        expenseId: expenseData._id
      });
    }
  }

  /**
   * Generate fraud alert
   */
  async generateAlert(expenseData, analysisResult) {
    if (!this.config.isAlertsEnabled()) {
      return;
    }

    try {
      const alert = new this.models.FraudAlert({
        type: 'FRAUD_DETECTION',
        severity: analysisResult.riskLevel,
        expenseId: expenseData._id || null,
        userId: expenseData.userId,
        groupId: expenseData.groupId || null,
        fraudScore: analysisResult.fraudScore,
        triggeredRules: analysisResult.ruleAnalysis?.triggeredRules?.map(r => r.id) || [],
        message: `High fraud risk detected: ${analysisResult.explanation}`,
        metadata: {
          analysisComponents: analysisResult.analysisComponents,
          confidence: analysisResult.confidence,
          autoFlag: analysisResult.autoFlag
        },
        status: 'OPEN',
        createdAt: new Date()
      });

      await alert.save();
      logger.info('Fraud alert generated', {
        alertId: alert._id,
        severity: alert.severity,
        fraudScore: analysisResult.fraudScore
      });

      // TODO: Send external notifications (email, Slack, etc.)

    } catch (error) {
      logger.error('Failed to generate fraud alert', {
        error: error.message,
        expenseId: expenseData._id
      });
    }
  }

  /**
   * Get fallback result when analysis fails
   */
  getFallbackResult(expenseData, error) {
    return {
      fraudScore: 0.1,
      confidence: 0.1,
      riskLevel: 'LOW',
      requiresReview: false,
      requiresAlert: false,
      autoFlag: false,
      explanation: `Fraud analysis failed: ${error.message}. Using safe fallback.`,
      analysisComponents: ['fallback'],
      mlAnalysis: null,
      ruleAnalysis: null,
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      error: error.message
    };
  }

  /**
   * Generate cache key for expense analysis
   */
  generateCacheKey(expenseData) {
    const keyData = {
      userId: expenseData.userId,
      amount: expenseData.amount,
      groupId: expenseData.groupId,
      category: expenseData.category,
      // Round timestamp to nearest hour for caching
      hour: Math.floor(new Date(expenseData.createdAt || Date.now()).getTime() / (60 * 60 * 1000))
    };
    
    return `fraud_${Buffer.from(JSON.stringify(keyData)).toString('base64')}`;
  }

  /**
   * Detect fraud patterns across multiple expenses
   */
  async detectPatterns(userId, groupId = null, options = {}) {
    const timeWindow = options.timeWindow || this.config.getFeatureConfig().timeWindow;
    const startTime = new Date(Date.now() - timeWindow * 60 * 60 * 1000);

    try {
      // Get recent fraud analyses
      const query = { 
        createdAt: { $gte: startTime },
        fraudScore: { $gte: 0.3 } // Only suspicious analyses
      };
      
      if (userId) query.userId = userId;
      if (groupId) query.groupId = groupId;

      const analyses = await this.models.FraudAnalysis.find(query)
        .sort({ createdAt: -1 })
        .limit(100)
        .lean();

      // Analyze patterns
      const patterns = this.analyzePatterns(analyses);

      return {
        patterns,
        timeWindow,
        totalAnalyses: analyses.length,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Pattern detection failed', { error: error.message, userId, groupId });
      return {
        patterns: [],
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  analyzePatterns(analyses) {
    const patterns = [];

    // Frequency pattern
    if (analyses.length >= 5) {
      patterns.push({
        type: 'HIGH_FREQUENCY',
        severity: 'HIGH',
        description: `${analyses.length} suspicious activities in recent period`,
        count: analyses.length
      });
    }

    // Score escalation pattern
    const recentScores = analyses.slice(0, 10).map(a => a.fraudScore);
    if (recentScores.length >= 3) {
      const isEscalating = recentScores.every((score, index) => 
        index === 0 || score >= recentScores[index - 1]
      );
      
      if (isEscalating) {
        patterns.push({
          type: 'SCORE_ESCALATION',
          severity: 'MEDIUM',
          description: 'Fraud scores are escalating over time',
          scores: recentScores
        });
      }
    }

    // Rule pattern
    const ruleFrequency = {};
    analyses.forEach(analysis => {
      if (analysis.ruleAnalysis?.triggeredRules) {
        analysis.ruleAnalysis.triggeredRules.forEach(rule => {
          ruleFrequency[rule.id] = (ruleFrequency[rule.id] || 0) + 1;
        });
      }
    });

    const frequentRules = Object.entries(ruleFrequency)
      .filter(([rule, count]) => count >= 3)
      .map(([rule, count]) => ({ rule, count }));

    if (frequentRules.length > 0) {
      patterns.push({
        type: 'RECURRING_RULE_VIOLATIONS',
        severity: 'MEDIUM',
        description: 'Certain fraud rules are frequently triggered',
        rules: frequentRules
      });
    }

    return patterns;
  }

  /**
   * Get fraud statistics
   */
  async getStatistics(timeRange = 7) {
    const startDate = new Date(Date.now() - timeRange * 24 * 60 * 60 * 1000);

    try {
      const [totalAnalyses, highRiskCount, alertCount, ruleStats] = await Promise.all([
        this.models.FraudAnalysis.countDocuments({
          createdAt: { $gte: startDate }
        }),

        this.models.FraudAnalysis.countDocuments({
          createdAt: { $gte: startDate },
          riskLevel: 'HIGH'
        }),

        this.models.FraudAlert.countDocuments({
          createdAt: { $gte: startDate }
        }),

        this.ruleEngine.getRuleStatistics()
      ]);

      const avgScore = await this.models.FraudAnalysis.aggregate([
        { $match: { createdAt: { $gte: startDate } } },
        { $group: { _id: null, avgScore: { $avg: '$fraudScore' } } }
      ]);

      return {
        timeRange: `${timeRange} days`,
        totalAnalyses,
        highRiskCount,
        alertCount,
        averageFraudScore: avgScore[0]?.avgScore || 0,
        highRiskPercentage: totalAnalyses > 0 ? (highRiskCount / totalAnalyses) * 100 : 0,
        ruleStatistics: ruleStats,
        cacheStats: {
          cacheSize: this.analysisCache.size,
          mlUtilsStats: this.mlUtils.getStats()
        },
        serviceHealth: {
          pythonService: this.pythonClient.getStatus(),
          ruleEngine: this.config.isRuleEngineEnabled()
        },
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      logger.error('Failed to get fraud statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Clear analysis cache
   */
  clearCache() {
    this.analysisCache.clear();
    this.mlUtils.cleanupCache();
    logger.info('Fraud service cache cleared');
  }

  /**
   * Health check
   */
  async healthCheck() {
    const results = {
      service: 'healthy',
      timestamp: new Date().toISOString(),
      components: {}
    };

    try {
      // Check Python service
      if (this.config.isPythonServiceEnabled()) {
        const pythonHealth = await this.pythonClient.checkHealth();
        results.components.pythonService = pythonHealth;
      } else {
        results.components.pythonService = { healthy: false, reason: 'disabled' };
      }

      // Check rule engine
      results.components.ruleEngine = {
        healthy: this.config.isRuleEngineEnabled(),
        ruleCount: this.ruleEngine.getAllRules().length
      };

      // Check database connectivity
      try {
        await this.models.FraudAnalysis.findOne().limit(1);
        results.components.database = { healthy: true };
      } catch (dbError) {
        results.components.database = { 
          healthy: false, 
          error: dbError.message 
        };
        results.service = 'degraded';
      }

      // Overall health
      const unhealthyComponents = Object.values(results.components)
        .filter(comp => !comp.healthy).length;
      
      if (unhealthyComponents > 0) {
        results.service = unhealthyComponents === Object.keys(results.components).length 
          ? 'unhealthy' 
          : 'degraded';
      }

    } catch (error) {
      results.service = 'unhealthy';
      results.error = error.message;
    }

    return results;
  }

  /**
   * Get flagged expenses based on fraud analysis
   */
  async getFlaggedExpenses(userId, groupId = null, options = {}) {
    try {
      const {
        riskLevel = 'HIGH',
        limit = 50,
        offset = 0,
        sortBy = 'timestamp',
        sortOrder = 'desc'
      } = options;

      const query = {
        userId,
        riskLevel: { $in: Array.isArray(riskLevel) ? riskLevel : [riskLevel] }
      };

      if (groupId) {
        query.groupId = groupId;
      }

      const flaggedAnalyses = await this.models.FraudAnalysis
        .find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(limit)
        .populate('expenseId')
        .lean();

      const total = await this.models.FraudAnalysis.countDocuments(query);

      return {
        expenses: flaggedAnalyses.map(analysis => ({
          ...analysis,
          expense: analysis.expenseId
        })),
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      logger.error('Error getting flagged expenses', { error: error.message });
      throw error;
    }
  }

  /**
   * Get fraud patterns for analysis
   */
  async getFraudPatterns(userId, options = {}) {
    try {
      const timeRange = options.timeRange || 30;
      const startDate = new Date(Date.now() - (timeRange * 24 * 60 * 60 * 1000));

      return await this.detectPatterns(userId, options.groupId, {
        startDate,
        ...options
      });

    } catch (error) {
      logger.error('Error getting fraud patterns', { error: error.message });
      throw error;
    }
  }

  /**
   * Get fraud rules
   */
  async getFraudRules(filters = {}) {
    try {
      const query = { ...filters };
      if (filters.active !== undefined) {
        query.isActive = filters.active;
      }

      const rules = await this.models.FraudRule
        .find(query)
        .sort({ priority: -1, name: 1 })
        .lean();

      return rules;

    } catch (error) {
      logger.error('Error getting fraud rules', { error: error.message });
      throw error;
    }
  }

  /**
   * Create a new fraud rule
   */
  async createFraudRule(ruleData) {
    try {
      const rule = new this.models.FraudRule({
        ...ruleData,
        createdAt: new Date(),
        updatedAt: new Date()
      });

      await rule.save();
      logger.info('Created new fraud rule', { ruleId: rule._id, name: rule.name });

      return rule.toObject();

    } catch (error) {
      logger.error('Error creating fraud rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Update a fraud rule
   */
  async updateFraudRule(ruleId, updateData) {
    try {
      const rule = await this.models.FraudRule.findByIdAndUpdate(
        ruleId,
        { ...updateData, updatedAt: new Date() },
        { new: true, runValidators: true }
      );

      if (!rule) {
        throw new Error(`Fraud rule ${ruleId} not found`);
      }

      logger.info('Updated fraud rule', { ruleId, changes: Object.keys(updateData) });
      return rule.toObject();

    } catch (error) {
      logger.error('Error updating fraud rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Delete a fraud rule
   */
  async deleteFraudRule(ruleId) {
    try {
      const rule = await this.models.FraudRule.findByIdAndDelete(ruleId);

      if (!rule) {
        throw new Error(`Fraud rule ${ruleId} not found`);
      }

      logger.info('Deleted fraud rule', { ruleId, name: rule.name });
      return rule.toObject();

    } catch (error) {
      logger.error('Error deleting fraud rule', { error: error.message });
      throw error;
    }
  }

  /**
   * Get model status
   */
  async getModelStatus() {
    try {
      const pythonHealth = await this.pythonClient.healthCheck();
      const modelInfo = await this.pythonClient.getModelInfo();

      return {
        pythonService: {
          status: pythonHealth.status,
          uptime: pythonHealth.uptime,
          version: pythonHealth.version
        },
        models: modelInfo.models || [],
        lastUpdate: new Date(),
        availability: pythonHealth.status === 'healthy' ? 'available' : 'unavailable'
      };

    } catch (error) {
      logger.error('Error getting model status', { error: error.message });
      return {
        pythonService: { status: 'unhealthy' },
        models: [],
        lastUpdate: new Date(),
        availability: 'unavailable',
        error: error.message
      };
    }
  }

  /**
   * Train model (placeholder for future ML training)
   */
  async trainModel(modelConfig = {}) {
    try {
      // This is a placeholder - actual training would be done via Python service
      logger.info('Model training requested', { config: modelConfig });

      const training = {
        id: `training_${Date.now()}`,
        status: 'initiated',
        startTime: new Date(),
        config: modelConfig
      };

      // In a real implementation, this would trigger training via Python service
      // For now, return a mock training session
      setTimeout(() => {
        training.status = 'completed';
        training.endTime = new Date();
        logger.info('Mock training completed', { trainingId: training.id });
      }, 1000);

      return training;

    } catch (error) {
      logger.error('Error initiating model training', { error: error.message });
      throw error;
    }
  }

  /**
   * Get fraud alerts
   */
  async getFraudAlerts(userId, options = {}) {
    try {
      const {
        status,
        severity,
        limit = 50,
        offset = 0,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = options;

      const query = { userId };

      if (status) {
        query.status = status;
      }

      if (severity) {
        query.severity = Array.isArray(severity) ? { $in: severity } : severity;
      }

      const alerts = await this.models.FraudAlert
        .find(query)
        .sort({ [sortBy]: sortOrder === 'desc' ? -1 : 1 })
        .skip(offset)
        .limit(limit)
        .populate('analysisId')
        .lean();

      const total = await this.models.FraudAlert.countDocuments(query);

      return {
        alerts,
        pagination: {
          total,
          limit,
          offset,
          hasMore: offset + limit < total
        }
      };

    } catch (error) {
      logger.error('Error getting fraud alerts', { error: error.message });
      throw error;
    }
  }

  /**
   * Resolve fraud alert
   */
  async resolveFraudAlert(alertId, resolution) {
    try {
      const alert = await this.models.FraudAlert.findByIdAndUpdate(
        alertId,
        {
          status: 'RESOLVED',
          resolution: resolution.type,
          resolutionNotes: resolution.notes,
          resolvedAt: new Date(),
          resolvedBy: resolution.userId
        },
        { new: true }
      );

      if (!alert) {
        throw new Error(`Fraud alert ${alertId} not found`);
      }

      logger.info('Resolved fraud alert', { 
        alertId, 
        resolution: resolution.type,
        resolvedBy: resolution.userId 
      });

      return alert.toObject();

    } catch (error) {
      logger.error('Error resolving fraud alert', { error: error.message });
      throw error;
    }
  }

  /**
   * Get fraud analysis by ID
   */
  async getFraudAnalysis(analysisId) {
    try {
      const analysis = await this.models.FraudAnalysis
        .findById(analysisId)
        .populate('expenseId')
        .lean();

      if (!analysis) {
        throw new Error(`Fraud analysis ${analysisId} not found`);
      }

      return analysis;

    } catch (error) {
      logger.error('Error getting fraud analysis', { error: error.message });
      throw error;
    }
  }
}

// Singleton instance
let fraudServiceInstance = null;

function getFraudService() {
  if (!fraudServiceInstance) {
    fraudServiceInstance = new FraudService();
  }
  return fraudServiceInstance;
}

function getInstance() {
  return getFraudService();
}

function resetFraudService() {
  if (fraudServiceInstance) {
    fraudServiceInstance.clearCache();
    fraudServiceInstance = null;
  }
}

module.exports = {
  FraudService,
  getFraudService,
  getInstance,
  resetFraudService
};