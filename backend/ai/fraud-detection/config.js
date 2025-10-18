const path = require('path');
const { validationUtils } = require('../../utils/validation');

/**
 * Fraud Detection Configuration Management
 * Loads configuration from environment variables with proper validation
 */
class FraudDetectionConfig {
  constructor() {
    this.config = this.loadConfiguration();
    this.validateConfiguration();
  }

  loadConfiguration() {
    return {
      // Python ML Service Configuration
      pythonService: {
        url: process.env.AI_FRAUD_SERVICE_URL || 'http://localhost:8000',
        port: parseInt(process.env.AI_FRAUD_SERVICE_PORT || '8000'),
        timeout: parseInt(process.env.AI_SERVICE_TIMEOUT_MS || '30000'),
        retries: parseInt(process.env.AI_SERVICE_RETRIES || '3'),
        retryDelay: parseInt(process.env.AI_SERVICE_RETRY_DELAY || '1000'),
        apiKey: process.env.AI_SERVICE_API_KEY || '',
        healthEndpoint: '/health',
        predictEndpoint: '/predict',
        batchPredictEndpoint: '/batch-predict'
      },

      // Model Configuration
      models: {
        primary: process.env.FRAUD_MODEL_PRIMARY || 'isolation_forest',
        fallback: process.env.FRAUD_MODEL_FALLBACK || 'rule_engine',
        modelPath: process.env.FRAUD_MODEL_PATH || path.join(__dirname, '../models'),
        updateInterval: parseInt(process.env.MODEL_UPDATE_INTERVAL_HOURS || '24') * 60 * 60 * 1000
      },

      // Scoring Thresholds
      scoring: {
        fraudThreshold: parseFloat(process.env.FRAUD_SCORE_THRESHOLD || '0.7'),
        alertThreshold: parseFloat(process.env.FRAUD_ALERT_THRESHOLD || '0.8'),
        autoFlagThreshold: parseFloat(process.env.FRAUD_AUTO_FLAG_THRESHOLD || '0.9'),
        reviewThreshold: parseFloat(process.env.FRAUD_REVIEW_THRESHOLD || '0.6')
      },

      // Rule Engine Configuration
      ruleEngine: {
        enabled: process.env.FRAUD_RULES_ENABLED !== 'false',
        ruleWeight: parseFloat(process.env.FRAUD_RULE_WEIGHT || '0.3'),
        mlWeight: parseFloat(process.env.FRAUD_ML_WEIGHT || '0.7'),
        dynamicRules: process.env.FRAUD_DYNAMIC_RULES === 'true'
      },

      // Alert Configuration
      alerts: {
        enabled: process.env.FRAUD_ALERTS_ENABLED !== 'false',
        channels: (process.env.FRAUD_ALERT_CHANNELS || 'database,email').split(','),
        emailNotifications: process.env.FRAUD_EMAIL_NOTIFICATIONS === 'true',
        slackWebhook: process.env.FRAUD_SLACK_WEBHOOK || '',
        maxAlertsPerHour: parseInt(process.env.FRAUD_MAX_ALERTS_PER_HOUR || '100')
      },

      // Feature Engineering
      features: {
        timeWindow: parseInt(process.env.FRAUD_TIME_WINDOW_HOURS || '24'),
        userHistoryDays: parseInt(process.env.FRAUD_USER_HISTORY_DAYS || '30'),
        groupAnalysisDays: parseInt(process.env.FRAUD_GROUP_ANALYSIS_DAYS || '7'),
        amountAnomalyThreshold: parseFloat(process.env.FRAUD_AMOUNT_ANOMALY_THRESHOLD || '3.0')
      },

      // Performance Configuration
      performance: {
        cacheEnabled: process.env.FRAUD_CACHE_ENABLED !== 'false',
        cacheTimeout: parseInt(process.env.FRAUD_CACHE_TIMEOUT_MS || '300000'), // 5 minutes
        batchSize: parseInt(process.env.FRAUD_BATCH_SIZE || '100'),
        maxConcurrentRequests: parseInt(process.env.FRAUD_MAX_CONCURRENT || '10'),
        asyncAnalysis: process.env.FRAUD_ASYNC_ANALYSIS === 'true'
      },

      // Database Configuration
      database: {
        retentionDays: parseInt(process.env.FRAUD_DATA_RETENTION_DAYS || '365'),
        archiveOldRecords: process.env.FRAUD_ARCHIVE_OLD_RECORDS === 'true',
        indexOptimization: process.env.FRAUD_INDEX_OPTIMIZATION === 'true'
      },

      // Environment-specific Settings
      environment: {
        isDevelopment: process.env.NODE_ENV === 'development',
        isProduction: process.env.NODE_ENV === 'production',
        debugMode: process.env.FRAUD_DEBUG_MODE === 'true',
        logLevel: process.env.FRAUD_LOG_LEVEL || 'info',
        testMode: process.env.FRAUD_TEST_MODE === 'true'
      }
    };
  }

  validateConfiguration() {
    const { scoring, ruleEngine, performance } = this.config;

    // Validate scoring thresholds
    if (scoring.fraudThreshold < 0 || scoring.fraudThreshold > 1) {
      throw new Error('FRAUD_SCORE_THRESHOLD must be between 0 and 1');
    }

    if (scoring.alertThreshold < scoring.fraudThreshold) {
      throw new Error('FRAUD_ALERT_THRESHOLD must be >= FRAUD_SCORE_THRESHOLD');
    }

    // Validate rule engine weights
    if (Math.abs((ruleEngine.ruleWeight + ruleEngine.mlWeight) - 1.0) > 0.01) {
      throw new Error('FRAUD_RULE_WEIGHT + FRAUD_ML_WEIGHT must equal 1.0');
    }

    // Validate performance settings
    if (performance.batchSize < 1 || performance.batchSize > 1000) {
      throw new Error('FRAUD_BATCH_SIZE must be between 1 and 1000');
    }

    if (performance.maxConcurrentRequests < 1 || performance.maxConcurrentRequests > 50) {
      throw new Error('FRAUD_MAX_CONCURRENT must be between 1 and 50');
    }
  }

  get(path) {
    return path.split('.').reduce((obj, key) => obj && obj[key], this.config);
  }

  getAll() {
    return { ...this.config };
  }

  updateConfig(updates) {
    this.config = { ...this.config, ...updates };
    this.validateConfiguration();
  }

  // Environment-specific getters
  isPythonServiceEnabled() {
    return this.config.pythonService.url && !this.config.environment.testMode;
  }

  isRuleEngineEnabled() {
    return this.config.ruleEngine.enabled;
  }

  isAlertsEnabled() {
    return this.config.alerts.enabled;
  }

  isDevelopment() {
    return this.config.environment.isDevelopment;
  }

  isProduction() {
    return this.config.environment.isProduction;
  }

  // Get configuration for specific components
  getPythonServiceConfig() {
    return { ...this.config.pythonService };
  }

  getScoringConfig() {
    return { ...this.config.scoring };
  }

  getRuleEngineConfig() {
    return { ...this.config.ruleEngine };
  }

  getAlertConfig() {
    return { ...this.config.alerts };
  }

  getFeatureConfig() {
    return { ...this.config.features };
  }

  getPerformanceConfig() {
    return { ...this.config.performance };
  }
}

// Singleton instance
let configInstance = null;

function getConfig() {
  if (!configInstance) {
    configInstance = new FraudDetectionConfig();
  }
  return configInstance;
}

function resetConfig() {
  configInstance = null;
}

module.exports = {
  getConfig,
  resetConfig,
  FraudDetectionConfig
};