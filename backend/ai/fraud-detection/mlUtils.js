const logger = require('../../utils/logger');
const { getConfig } = require('./config');

/**
 * Machine Learning Utilities for Fraud Detection
 * Handles feature extraction and model interaction
 */
class MLUtils {
  constructor() {
    this.config = getConfig();
    this.featureCache = new Map();
    this.cacheTimeout = this.config.getPerformanceConfig().cacheTimeout;
  }

  /**
   * Extract features from expense data for ML models
   */
  extractFeatures(expenseData, userHistory = [], groupHistory = []) {
    const features = {
      // Basic expense features
      amount: parseFloat(expenseData.amount) || 0,
      amountLog: Math.log(Math.max(parseFloat(expenseData.amount) || 1, 1)),
      
      // Time-based features
      ...this.extractTimeFeatures(expenseData),
      
      // User behavior features
      ...this.extractUserFeatures(expenseData, userHistory),
      
      // Group context features
      ...this.extractGroupFeatures(expenseData, groupHistory),
      
      // Text/description features
      ...this.extractTextFeatures(expenseData),
      
      // Category features
      ...this.extractCategoryFeatures(expenseData),
      
      // Statistical features
      ...this.extractStatisticalFeatures(expenseData, userHistory, groupHistory)
    };

    return this.normalizeFeatures(features);
  }

  extractTimeFeatures(expenseData) {
    const timestamp = new Date(expenseData.createdAt || expenseData.timestamp || Date.now());
    
    return {
      hourOfDay: timestamp.getHours(),
      dayOfWeek: timestamp.getDay(),
      dayOfMonth: timestamp.getDate(),
      month: timestamp.getMonth() + 1,
      isWeekend: timestamp.getDay() === 0 || timestamp.getDay() === 6 ? 1 : 0,
      isBusinessHour: (timestamp.getHours() >= 9 && timestamp.getHours() <= 17) ? 1 : 0,
      isLateNight: (timestamp.getHours() >= 22 || timestamp.getHours() <= 5) ? 1 : 0
    };
  }

  extractUserFeatures(expenseData, userHistory) {
    const features = {
      userExpenseCount: userHistory.length,
      userAccountAge: 0,
      userAverageAmount: 0,
      userStdAmount: 0,
      userMaxAmount: 0,
      userMinAmount: 0,
      userExpenseFrequency: 0,
      userCategoryCount: 0
    };

    if (userHistory.length === 0) {
      return features;
    }

    // Calculate user statistics
    const amounts = userHistory.map(e => parseFloat(e.amount) || 0).filter(a => a > 0);
    if (amounts.length > 0) {
      features.userAverageAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      features.userMaxAmount = Math.max(...amounts);
      features.userMinAmount = Math.min(...amounts);
      
      // Standard deviation
      const variance = amounts.reduce((sum, a) => sum + Math.pow(a - features.userAverageAmount, 2), 0) / amounts.length;
      features.userStdAmount = Math.sqrt(variance);
    }

    // User account age in days
    const oldestExpense = userHistory.reduce((oldest, expense) => {
      const expenseDate = new Date(expense.createdAt || expense.timestamp);
      return expenseDate < oldest ? expenseDate : oldest;
    }, new Date());
    features.userAccountAge = Math.max(0, (Date.now() - oldestExpense.getTime()) / (24 * 60 * 60 * 1000));

    // Expense frequency (expenses per day)
    if (features.userAccountAge > 0) {
      features.userExpenseFrequency = userHistory.length / features.userAccountAge;
    }

    // Category diversity
    const categories = new Set(userHistory.map(e => e.category).filter(c => c));
    features.userCategoryCount = categories.size;

    return features;
  }

  extractGroupFeatures(expenseData, groupHistory) {
    const features = {
      groupSize: 0,
      groupTotalExpenses: groupHistory.length,
      groupAverageAmount: 0,
      groupMaxAmount: 0,
      isGroupCreator: 0,
      userGroupExpenseRatio: 0,
      groupActivityLevel: 0
    };

    if (groupHistory.length === 0) {
      return features;
    }

    // Group statistics
    const amounts = groupHistory.map(e => parseFloat(e.amount) || 0).filter(a => a > 0);
    if (amounts.length > 0) {
      features.groupAverageAmount = amounts.reduce((sum, a) => sum + a, 0) / amounts.length;
      features.groupMaxAmount = Math.max(...amounts);
    }

    // User's contribution to group
    const userExpensesInGroup = groupHistory.filter(e => e.userId === expenseData.userId).length;
    if (groupHistory.length > 0) {
      features.userGroupExpenseRatio = userExpensesInGroup / groupHistory.length;
    }

    // Group activity level (expenses per day since first expense)
    if (groupHistory.length > 1) {
      const dates = groupHistory.map(e => new Date(e.createdAt || e.timestamp)).sort();
      const daysSinceFirst = Math.max(1, (dates[dates.length - 1] - dates[0]) / (24 * 60 * 60 * 1000));
      features.groupActivityLevel = groupHistory.length / daysSinceFirst;
    }

    return features;
  }

  extractTextFeatures(expenseData) {
    const description = expenseData.description || '';
    
    return {
      hasDescription: description.length > 0 ? 1 : 0,
      descriptionLength: description.length,
      descriptionWordCount: description.split(/\s+/).filter(word => word.length > 0).length,
      hasSpecialChars: /[!@#$%^&*()_+={}\[\]:";'<>?,./]/.test(description) ? 1 : 0,
      hasNumbers: /\d/.test(description) ? 1 : 0,
      hasUpperCase: /[A-Z]/.test(description) ? 1 : 0,
      isAllCaps: description === description.toUpperCase() && description.length > 0 ? 1 : 0
    };
  }

  extractCategoryFeatures(expenseData) {
    const category = expenseData.category || 'other';
    
    // One-hot encoding for common categories
    const commonCategories = ['food', 'transport', 'entertainment', 'shopping', 'bills', 'other'];
    const categoryFeatures = {};
    
    commonCategories.forEach(cat => {
      categoryFeatures[`category_${cat}`] = category.toLowerCase() === cat ? 1 : 0;
    });

    categoryFeatures.hasCategory = expenseData.category ? 1 : 0;
    
    return categoryFeatures;
  }

  extractStatisticalFeatures(expenseData, userHistory, groupHistory) {
    const currentAmount = parseFloat(expenseData.amount) || 0;
    const features = {
      amountZScore: 0,
      amountPercentile: 0,
      isAmountOutlier: 0,
      timeSinceLastExpense: 0,
      amountVsUserAvg: 0,
      amountVsGroupAvg: 0
    };

    // User-based statistical features
    if (userHistory.length > 0) {
      const userAmounts = userHistory.map(e => parseFloat(e.amount) || 0).filter(a => a > 0);
      if (userAmounts.length > 1) {
        const userMean = userAmounts.reduce((sum, a) => sum + a, 0) / userAmounts.length;
        const userStd = Math.sqrt(userAmounts.reduce((sum, a) => sum + Math.pow(a - userMean, 2), 0) / userAmounts.length);
        
        if (userStd > 0) {
          features.amountZScore = (currentAmount - userMean) / userStd;
          features.isAmountOutlier = Math.abs(features.amountZScore) > 2 ? 1 : 0;
        }
        
        features.amountVsUserAvg = userMean > 0 ? currentAmount / userMean : 0;
        
        // Calculate percentile
        const sortedAmounts = userAmounts.sort((a, b) => a - b);
        const rank = sortedAmounts.filter(a => a <= currentAmount).length;
        features.amountPercentile = rank / sortedAmounts.length;
      }

      // Time since last expense
      const sortedUserHistory = userHistory
        .map(e => new Date(e.createdAt || e.timestamp))
        .sort((a, b) => b - a);
      
      if (sortedUserHistory.length > 0) {
        const lastExpenseTime = sortedUserHistory[0];
        const currentTime = new Date(expenseData.createdAt || expenseData.timestamp || Date.now());
        features.timeSinceLastExpense = Math.max(0, (currentTime - lastExpenseTime) / (60 * 60 * 1000)); // hours
      }
    }

    // Group-based statistical features
    if (groupHistory.length > 0) {
      const groupAmounts = groupHistory.map(e => parseFloat(e.amount) || 0).filter(a => a > 0);
      if (groupAmounts.length > 0) {
        const groupMean = groupAmounts.reduce((sum, a) => sum + a, 0) / groupAmounts.length;
        features.amountVsGroupAvg = groupMean > 0 ? currentAmount / groupMean : 0;
      }
    }

    return features;
  }

  normalizeFeatures(features) {
    const normalized = { ...features };
    
    // Apply log transformation to skewed features
    const logTransformFeatures = ['amount', 'userAverageAmount', 'groupAverageAmount', 'userMaxAmount', 'groupMaxAmount'];
    logTransformFeatures.forEach(feature => {
      if (normalized[feature] && normalized[feature] > 0) {
        normalized[`${feature}_log`] = Math.log(normalized[feature]);
      }
    });

    // Cap extreme values
    if (normalized.amountZScore) {
      normalized.amountZScore = Math.max(-5, Math.min(5, normalized.amountZScore));
    }

    // Ensure all features are finite numbers
    Object.keys(normalized).forEach(key => {
      if (!isFinite(normalized[key])) {
        normalized[key] = 0;
      }
    });

    return normalized;
  }

  /**
   * Prepare batch data for ML model
   */
  prepareBatchFeatures(expensesData, contexts = []) {
    return expensesData.map((expense, index) => {
      const context = contexts[index] || {};
      return this.extractFeatures(expense, context.userHistory, context.groupHistory);
    });
  }

  /**
   * Convert model output to fraud score
   */
  interpretModelOutput(modelOutput, modelType = 'isolation_forest') {
    switch (modelType.toLowerCase()) {
      case 'isolation_forest':
        return this.interpretIsolationForestOutput(modelOutput);
      case 'autoencoder':
        return this.interpretAutoencoderOutput(modelOutput);
      case 'ensemble':
        return this.interpretEnsembleOutput(modelOutput);
      default:
        return this.interpretGenericOutput(modelOutput);
    }
  }

  interpretIsolationForestOutput(output) {
    // Isolation Forest typically outputs anomaly scores
    // Lower scores indicate higher anomaly likelihood
    const anomalyScore = output.anomaly_score || output.score || 0;
    
    // Convert to fraud probability (0-1 scale)
    const fraudScore = Math.max(0, Math.min(1, (1 - anomalyScore) / 2 + 0.5));
    
    return {
      fraudScore,
      anomalyScore,
      confidence: Math.abs(anomalyScore * 2 - 1), // Higher confidence for extreme scores
      riskLevel: this.getRiskLevel(fraudScore),
      explanation: `Isolation Forest anomaly score: ${anomalyScore.toFixed(3)}`
    };
  }

  interpretAutoencoderOutput(output) {
    // Autoencoder typically outputs reconstruction error
    const reconstructionError = output.reconstruction_error || output.error || 0;
    const threshold = output.threshold || 0.1;
    
    // Higher reconstruction error indicates higher anomaly likelihood
    const fraudScore = Math.min(1, reconstructionError / threshold);
    
    return {
      fraudScore,
      reconstructionError,
      confidence: Math.min(1, reconstructionError / (threshold * 2)),
      riskLevel: this.getRiskLevel(fraudScore),
      explanation: `Reconstruction error: ${reconstructionError.toFixed(4)} (threshold: ${threshold.toFixed(4)})`
    };
  }

  interpretEnsembleOutput(output) {
    // Ensemble model combines multiple model predictions
    const scores = output.scores || [];
    const weights = output.weights || scores.map(() => 1 / scores.length);
    
    // Weighted average of model scores
    const fraudScore = scores.reduce((sum, score, index) => sum + score * weights[index], 0);
    const confidence = output.confidence || Math.min(...scores.map(s => Math.abs(s * 2 - 1)));
    
    return {
      fraudScore: Math.max(0, Math.min(1, fraudScore)),
      confidence,
      riskLevel: this.getRiskLevel(fraudScore),
      explanation: `Ensemble prediction from ${scores.length} models`,
      modelScores: scores,
      modelWeights: weights
    };
  }

  interpretGenericOutput(output) {
    // Generic interpretation for unknown model types
    const fraudScore = output.fraud_score || output.prediction || output.score || 0;
    const confidence = output.confidence || 0.5;
    
    return {
      fraudScore: Math.max(0, Math.min(1, fraudScore)),
      confidence: Math.max(0, Math.min(1, confidence)),
      riskLevel: this.getRiskLevel(fraudScore),
      explanation: output.explanation || 'Generic model prediction'
    };
  }

  getRiskLevel(fraudScore) {
    const { fraudThreshold, alertThreshold } = this.config.getScoringConfig();
    
    if (fraudScore >= alertThreshold) return 'HIGH';
    if (fraudScore >= fraudThreshold) return 'MEDIUM';
    return 'LOW';
  }

  /**
   * Feature importance analysis
   */
  analyzeFeatureImportance(features, modelOutput) {
    const importance = modelOutput.feature_importance || {};
    const topFeatures = [];
    
    Object.entries(features).forEach(([feature, value]) => {
      const score = importance[feature] || 0;
      if (score > 0.1) { // Only include features with significant importance
        topFeatures.push({
          feature,
          value,
          importance: score,
          contribution: score * Math.abs(value)
        });
      }
    });
    
    return topFeatures
      .sort((a, b) => b.contribution - a.contribution)
      .slice(0, 10); // Top 10 contributing features
  }

  /**
   * Cache feature vectors for performance
   */
  cacheFeatures(key, features) {
    if (this.config.getPerformanceConfig().cacheEnabled) {
      this.featureCache.set(key, {
        features,
        timestamp: Date.now()
      });
      
      // Clean up old cache entries
      this.cleanupCache();
    }
  }

  getCachedFeatures(key) {
    if (!this.config.getPerformanceConfig().cacheEnabled) {
      return null;
    }
    
    const cached = this.featureCache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp;
    if (age > this.cacheTimeout) {
      this.featureCache.delete(key);
      return null;
    }
    
    return cached.features;
  }

  cleanupCache() {
    const now = Date.now();
    for (const [key, cached] of this.featureCache.entries()) {
      if (now - cached.timestamp > this.cacheTimeout) {
        this.featureCache.delete(key);
      }
    }
  }

  /**
   * Data preprocessing utilities
   */
  preprocessExpenseData(rawExpenseData) {
    return {
      ...rawExpenseData,
      amount: this.sanitizeAmount(rawExpenseData.amount),
      description: this.sanitizeText(rawExpenseData.description),
      category: this.sanitizeCategory(rawExpenseData.category),
      createdAt: this.sanitizeDate(rawExpenseData.createdAt || rawExpenseData.timestamp)
    };
  }

  sanitizeAmount(amount) {
    const parsed = parseFloat(amount);
    return isNaN(parsed) || parsed < 0 ? 0 : Math.min(parsed, 1000000); // Cap at 1M
  }

  sanitizeText(text) {
    if (!text) return '';
    return text.toString().trim().slice(0, 500); // Limit length
  }

  sanitizeCategory(category) {
    if (!category) return 'other';
    return category.toString().toLowerCase().trim();
  }

  sanitizeDate(date) {
    const parsed = new Date(date);
    return isNaN(parsed.getTime()) ? new Date() : parsed;
  }

  /**
   * Model performance metrics
   */
  calculateMetrics(predictions, actualLabels) {
    if (predictions.length !== actualLabels.length) {
      throw new Error('Predictions and labels length mismatch');
    }

    let tp = 0, fp = 0, tn = 0, fn = 0;
    const threshold = this.config.getScoringConfig().fraudThreshold;

    for (let i = 0; i < predictions.length; i++) {
      const predicted = predictions[i] > threshold;
      const actual = actualLabels[i];

      if (predicted && actual) tp++;
      else if (predicted && !actual) fp++;
      else if (!predicted && !actual) tn++;
      else fn++;
    }

    const precision = tp / (tp + fp) || 0;
    const recall = tp / (tp + fn) || 0;
    const accuracy = (tp + tn) / (tp + fp + tn + fn) || 0;
    const f1Score = 2 * (precision * recall) / (precision + recall) || 0;

    return {
      accuracy,
      precision,
      recall,
      f1Score,
      truePositives: tp,
      falsePositives: fp,
      trueNegatives: tn,
      falseNegatives: fn
    };
  }

  getStats() {
    return {
      cacheSize: this.featureCache.size,
      cacheTimeout: this.cacheTimeout,
      config: this.config.getAll()
    };
  }
}

// Singleton instance
let mlUtilsInstance = null;

function getMLUtils() {
  if (!mlUtilsInstance) {
    mlUtilsInstance = new MLUtils();
  }
  return mlUtilsInstance;
}

function resetMLUtils() {
  if (mlUtilsInstance) {
    mlUtilsInstance.featureCache.clear();
    mlUtilsInstance = null;
  }
}

module.exports = {
  MLUtils,
  getMLUtils,
  resetMLUtils
};