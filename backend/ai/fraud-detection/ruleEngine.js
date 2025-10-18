const logger = require('../../utils/logger');
const { getConfig } = require('./config');
const { getModels } = require('../models');
const { find, count, aggregateOrGroup, getDatabaseType } = require('../models/adapter');

/**
 * Rule-Based Fraud Detection Engine
 * Provides fallback and complement to ML models
 */
class RuleEngine {
  constructor() {
    this.config = getConfig().getRuleEngineConfig();
    this.models = getModels();
    this.rules = new Map();
    this.ruleStats = new Map();
    this.initializeDefaultRules();
  }

  initializeDefaultRules() {
    // Amount-based rules
    this.addRule('unusualAmount', {
      name: 'Unusual Amount Detection',
      description: 'Detects expenses with unusual amounts compared to user history',
      severity: 'MEDIUM',
      weight: 0.3,
      condition: this.checkUnusualAmount.bind(this),
      enabled: true
    });

    // Frequency-based rules
    this.addRule('highFrequency', {
      name: 'High Frequency Detection',
      description: 'Detects users creating too many expenses in short time',
      severity: 'HIGH',
      weight: 0.4,
      condition: this.checkHighFrequency.bind(this),
      enabled: true
    });

    // Time-based rules
    this.addRule('unusualTiming', {
      name: 'Unusual Timing Detection',
      description: 'Detects expenses created at unusual hours',
      severity: 'LOW',
      weight: 0.2,
      condition: this.checkUnusualTiming.bind(this),
      enabled: true
    });

    // User behavior rules
    this.addRule('newUserHighAmount', {
      name: 'New User High Amount',
      description: 'Detects new users with unusually high first expenses',
      severity: 'HIGH',
      weight: 0.5,
      condition: this.checkNewUserHighAmount.bind(this),
      enabled: true
    });

    // Group-based rules
    this.addRule('duplicateExpense', {
      name: 'Duplicate Expense Detection',
      description: 'Detects potential duplicate expenses in the same group',
      severity: 'HIGH',
      weight: 0.6,
      condition: this.checkDuplicateExpense.bind(this),
      enabled: true
    });

    // Geographic rules (if location data available)
    this.addRule('unusualLocation', {
      name: 'Unusual Location Detection',
      description: 'Detects expenses from unusual geographic locations',
      severity: 'MEDIUM',
      weight: 0.3,
      condition: this.checkUnusualLocation.bind(this),
      enabled: false // Disabled by default until location data is available
    });

    // Category-based rules
    this.addRule('categoryAnomaly', {
      name: 'Category Anomaly Detection',
      description: 'Detects expenses in unusual categories for the user',
      severity: 'LOW',
      weight: 0.2,
      condition: this.checkCategoryAnomaly.bind(this),
      enabled: true
    });

    // Amount pattern rules
    this.addRule('roundNumberPattern', {
      name: 'Round Number Pattern',
      description: 'Detects suspicious patterns in round numbers',
      severity: 'LOW',
      weight: 0.1,
      condition: this.checkRoundNumberPattern.bind(this),
      enabled: true
    });

    logger.info(`Initialized ${this.rules.size} fraud detection rules`);
  }

  addRule(id, rule) {
    this.rules.set(id, {
      id,
      ...rule,
      createdAt: new Date(),
      timesTriggered: 0,
      lastTriggered: null
    });

    this.ruleStats.set(id, {
      triggered: 0,
      falsePositives: 0,
      truePositives: 0,
      accuracy: 0
    });
  }

  removeRule(id) {
    this.rules.delete(id);
    this.ruleStats.delete(id);
  }

  enableRule(id) {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = true;
    }
  }

  disableRule(id) {
    const rule = this.rules.get(id);
    if (rule) {
      rule.enabled = false;
    }
  }

  async evaluateRules(expenseData, context = {}) {
    if (!this.config.enabled) {
      return {
        ruleScore: 0,
        triggeredRules: [],
        ruleAnalysis: [],
        processingTime: 0
      };
    }

    const startTime = Date.now();
    const triggeredRules = [];
    const ruleAnalysis = [];
    let totalScore = 0;
    let totalWeight = 0;

    for (const [ruleId, rule] of this.rules) {
      if (!rule.enabled) continue;

      try {
        const result = await rule.condition(expenseData, context);
        
        const analysis = {
          ruleId,
          ruleName: rule.name,
          triggered: result.triggered,
          score: result.score || 0,
          weight: rule.weight,
          severity: rule.severity,
          explanation: result.explanation || '',
          metadata: result.metadata || {}
        };

        ruleAnalysis.push(analysis);

        if (result.triggered) {
          triggeredRules.push({
            id: ruleId,
            name: rule.name,
            severity: rule.severity,
            weight: rule.weight,
            score: result.score || rule.weight,
            explanation: result.explanation,
            metadata: result.metadata
          });

          // Update rule statistics
          rule.timesTriggered++;
          rule.lastTriggered = new Date();
          
          const stats = this.ruleStats.get(ruleId);
          stats.triggered++;
        }

        // Calculate weighted score
        const ruleScore = result.triggered ? (result.score || rule.weight) : 0;
        totalScore += ruleScore * rule.weight;
        totalWeight += rule.weight;

      } catch (error) {
        logger.error(`Rule evaluation error for rule ${ruleId}:`, error);
        ruleAnalysis.push({
          ruleId,
          ruleName: rule.name,
          triggered: false,
          error: error.message,
          weight: rule.weight,
          severity: rule.severity
        });
      }
    }

    const normalizedScore = totalWeight > 0 ? totalScore / totalWeight : 0;
    const processingTime = Date.now() - startTime;

    logger.debug(`Rule evaluation completed: ${triggeredRules.length} rules triggered, score: ${normalizedScore.toFixed(3)}`, {
      processingTime,
      triggeredRules: triggeredRules.map(r => r.id)
    });

    return {
      ruleScore: Math.min(normalizedScore, 1.0), // Cap at 1.0
      triggeredRules,
      ruleAnalysis,
      processingTime,
      totalRulesEvaluated: this.rules.size,
      enabledRules: Array.from(this.rules.values()).filter(r => r.enabled).length
    };
  }

  // Rule condition implementations
  async checkUnusualAmount(expenseData, context) {
    try {
      const { amount, userId } = expenseData;
      const features = getConfig().getFeatureConfig();
      
      // Get user's expense history using DB-agnostic adapter
      const userExpenses = await find(this.models.Expense, {
        userId,
        createdAt: { $gte: new Date(Date.now() - (features.userHistoryDays || 30) * 24 * 60 * 60 * 1000) }
      }, { limit: 100 });

      if (userExpenses.length < 5) {
        return { triggered: false, explanation: 'Insufficient history for analysis' };
      }

      const amounts = userExpenses.map(e => e.amount);
      const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
      const stdDev = Math.sqrt(amounts.reduce((sum, amount) => sum + Math.pow(amount - mean, 2), 0) / amounts.length);
      
      const zScore = Math.abs((amount - mean) / stdDev);
      const threshold = features.amountAnomalyThreshold || 3.0;

      return {
        triggered: zScore > threshold,
        score: Math.min(zScore / threshold, 1.0),
        explanation: `Amount ${amount} is ${zScore.toFixed(2)} standard deviations from user average ${mean.toFixed(2)}`,
        metadata: { zScore, mean, stdDev, threshold }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking amount: ${error.message}` };
    }
  }

  async checkHighFrequency(expenseData, context) {
    try {
      const { userId } = expenseData;
      const features = getConfig().getFeatureConfig();
      
      // Check expenses in the last hour using DB-agnostic adapter
      const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
      const recentExpenses = await count(this.models.Expense, {
        userId,
        createdAt: { $gte: oneHourAgo }
      });

      const threshold = features.frequencyThreshold || 5; // Max 5 expenses per hour
      
      return {
        triggered: recentExpenses >= threshold,
        score: Math.min(recentExpenses / threshold, 1.0),
        explanation: `User created ${recentExpenses} expenses in the last hour (threshold: ${threshold})`,
        metadata: { recentExpenses, threshold, timeWindow: '1 hour' }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking frequency: ${error.message}` };
    }
  }

  async checkUnusualTiming(expenseData, context) {
    try {
      const timestamp = new Date(expenseData.createdAt || expenseData.timestamp || Date.now());
      const hour = timestamp.getHours();
      
      // Consider 11 PM to 5 AM as unusual hours
      const isUnusualHour = hour >= 23 || hour <= 5;
      
      return {
        triggered: isUnusualHour,
        score: isUnusualHour ? 0.3 : 0,
        explanation: `Expense created at ${hour}:00 (unusual hours: 11 PM - 5 AM)`,
        metadata: { hour, timestamp: timestamp.toISOString() }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking timing: ${error.message}` };
    }
  }

  async checkNewUserHighAmount(expenseData, context) {
    try {
      const { amount, userId } = expenseData;
      
      // Check if user is new (less than 7 days old or fewer than 3 expenses)
      const user = await find(this.models.User, { _id: userId }, { limit: 1 });
      if (!user || user.length === 0) {
        return { triggered: false, explanation: 'User not found' };
      }

      const userData = user[0];
      const userAge = Date.now() - new Date(userData.createdAt).getTime();
      const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;
      const isNewUser = userAge < sevenDaysMs;

      const expenseCount = await count(this.models.Expense, { userId });
      const hasFewExpenses = expenseCount < 3;

      if (!isNewUser && !hasFewExpenses) {
        return { triggered: false, explanation: 'User is not new' };
      }

      const features = getConfig().getFeatureConfig();
      const highAmountThreshold = features.newUserThreshold || 500; // Consider amounts over $500 as high for new users
      const isHighAmount = amount > highAmountThreshold;

      return {
        triggered: isHighAmount,
        score: isHighAmount ? Math.min(amount / highAmountThreshold, 1.0) : 0,
        explanation: `New user (${Math.round(userAge / (24 * 60 * 60 * 1000))} days, ${expenseCount} expenses) with amount ${amount}`,
        metadata: { userAge, expenseCount, amount, threshold: highAmountThreshold }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking new user amount: ${error.message}` };
    }
  }

  async checkDuplicateExpense(expenseData, context) {
    try {
      const { amount, description, groupId, userId } = expenseData;
      
      // Look for similar expenses in the last 24 hours using DB-agnostic adapter
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const criteria = {
        groupId,
        userId,
        amount,
        createdAt: { $gte: oneDayAgo }
      };
      
      // Exclude current expense if updating
      if (expenseData._id) {
        criteria._id = { $ne: expenseData._id };
      }
      
      const similarExpenses = await find(this.models.Expense, criteria);

      // Check for description similarity if provided
      let duplicates = similarExpenses;
      if (description) {
        duplicates = similarExpenses.filter(expense => 
          expense.description && 
          this.calculateStringSimilarity(expense.description, description) > 0.8
        );
      }

      return {
        triggered: duplicates.length > 0,
        score: duplicates.length > 0 ? 0.8 : 0,
        explanation: `Found ${duplicates.length} similar expenses in the last 24 hours`,
        metadata: { duplicateCount: duplicates.length, checkPeriod: '24 hours' }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking duplicates: ${error.message}` };
    }
  }

  async checkUnusualLocation(expenseData, context) {
    // Placeholder for geographic analysis when location data becomes available
    return {
      triggered: false,
      score: 0,
      explanation: 'Location data not available',
      metadata: { locationEnabled: false }
    };
  }

  async checkCategoryAnomaly(expenseData, context) {
    try {
      const { category, userId } = expenseData;
      
      if (!category) {
        return { triggered: false, explanation: 'No category provided' };
      }

      // Get user's category distribution from history using DB-agnostic adapter
      const dbType = getDatabaseType(this.models.Expense);
      let userExpenses;
      
      if (dbType === 'mongodb') {
        // Use MongoDB aggregation pipeline
        userExpenses = await aggregateOrGroup(this.models.Expense, [
          { $match: { userId } },
          { $group: { _id: '$category', count: { $sum: 1 } } },
          { $sort: { count: -1 } }
        ]);
      } else {
        // For PostgreSQL, use simpler approach with conditional branches
        // TODO: Implement Sequelize grouping for category analysis
        logger.warn('Category anomaly detection limited for PostgreSQL - using basic approach');
        const allExpenses = await find(this.models.Expense, { userId });
        const categoryCount = {};
        allExpenses.forEach(exp => {
          if (exp.category) {
            categoryCount[exp.category] = (categoryCount[exp.category] || 0) + 1;
          }
        });
        userExpenses = Object.entries(categoryCount).map(([cat, count]) => ({
          _id: cat,
          count
        })).sort((a, b) => b.count - a.count);
      }

      if (userExpenses.length < 5) {
        return { triggered: false, explanation: 'Insufficient history for category analysis' };
      }

      const totalExpenses = userExpenses.reduce((sum, cat) => sum + cat.count, 0);
      const categoryData = userExpenses.find(cat => cat._id === category);
      
      if (!categoryData) {
        // New category for user
        return {
          triggered: true,
          score: 0.4,
          explanation: `First expense in category '${category}' for this user`,
          metadata: { newCategory: true, totalExpenses }
        };
      }

      const categoryFrequency = categoryData.count / totalExpenses;
      const isRareCategory = categoryFrequency < 0.1; // Less than 10% of expenses

      return {
        triggered: isRareCategory,
        score: isRareCategory ? (0.5 - categoryFrequency * 5) : 0,
        explanation: `Category '${category}' represents ${(categoryFrequency * 100).toFixed(1)}% of user's expenses`,
        metadata: { categoryFrequency, totalExpenses }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking category: ${error.message}` };
    }
  }

  async checkRoundNumberPattern(expenseData, context) {
    try {
      const { amount } = expenseData;
      
      // Check for suspiciously round numbers
      // Fix the logic: a round number ends in 0, very round number ends in 00
      const isRoundNumber = amount % 10 === 0;
      const isVeryRoundNumber = amount % 100 === 0 && amount >= 100;
      
      if (!isRoundNumber) {
        return { triggered: false, score: 0, explanation: 'Amount is not a round number' };
      }

      // Higher suspicion for very round numbers
      const suspicionScore = isVeryRoundNumber ? 0.2 : 0.1;

      return {
        triggered: true,
        score: suspicionScore,
        explanation: `Amount ${amount} is a ${isVeryRoundNumber ? 'very ' : ''}round number`,
        metadata: { roundNumber: true, veryRound: isVeryRoundNumber }
      };
    } catch (error) {
      return { triggered: false, explanation: `Error checking round number: ${error.message}` };
    }
  }

  // Utility methods
  calculateStringSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    return (longer.length - this.levenshteinDistance(longer, shorter)) / longer.length;
  }

  levenshteinDistance(str1, str2) {
    const matrix = [];

    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }

    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }

    return matrix[str2.length][str1.length];
  }

  // Rule management methods
  getAllRules() {
    return Array.from(this.rules.values()).map(rule => ({
      ...rule,
      stats: this.ruleStats.get(rule.id)
    }));
  }

  getRuleById(id) {
    const rule = this.rules.get(id);
    return rule ? {
      ...rule,
      stats: this.ruleStats.get(id)
    } : null;
  }

  updateRuleStats(ruleId, isTrue) {
    const stats = this.ruleStats.get(ruleId);
    if (stats) {
      if (isTrue) {
        stats.truePositives++;
      } else {
        stats.falsePositives++;
      }
      stats.accuracy = stats.truePositives / (stats.truePositives + stats.falsePositives);
    }
  }

  getRuleStatistics() {
    const stats = {};
    for (const [ruleId, rule] of this.rules) {
      const ruleStats = this.ruleStats.get(ruleId);
      stats[ruleId] = {
        name: rule.name,
        triggered: rule.timesTriggered,
        lastTriggered: rule.lastTriggered,
        accuracy: ruleStats.accuracy,
        truePositives: ruleStats.truePositives,
        falsePositives: ruleStats.falsePositives
      };
    }
    return stats;
  }
}

// Singleton instance
let ruleEngineInstance = null;

function getRuleEngine() {
  if (!ruleEngineInstance) {
    ruleEngineInstance = new RuleEngine();
  }
  return ruleEngineInstance;
}

function resetRuleEngine() {
  ruleEngineInstance = null;
}

module.exports = {
  RuleEngine,
  getRuleEngine,
  resetRuleEngine
};