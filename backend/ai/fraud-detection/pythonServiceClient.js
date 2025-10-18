const axios = require('axios');
const logger = require('../../utils/logger');
const { getConfig } = require('./config');

/**
 * HTTP Client for Python FastAPI Fraud Detection Service
 * Handles communication with external ML services
 */
class PythonServiceClient {
  constructor() {
    this.config = getConfig().getPythonServiceConfig();
    this.client = this.createHttpClient();
    this.healthCheckInterval = null;
    this.isServiceHealthy = false;
    this.retryCount = 0;
    this.abortController = new AbortController();
  }

  createHttpClient() {
    const client = axios.create({
      baseURL: this.config.url,
      timeout: this.config.timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'SafeSplitX-Backend/1.0'
      }
    });

    // Add API key if configured
    if (this.config.apiKey) {
      client.defaults.headers.common['X-API-Key'] = this.config.apiKey;
    }

    // Request interceptor
    client.interceptors.request.use(
      (config) => {
        logger.debug(`Sending request to Python service: ${config.method?.toUpperCase()} ${config.url}`, {
          data: config.data,
          params: config.params
        });
        return config;
      },
      (error) => {
        logger.error('Request interceptor error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    client.interceptors.response.use(
      (response) => {
        logger.debug(`Received response from Python service: ${response.status}`, {
          data: response.data
        });
        this.retryCount = 0; // Reset retry count on success
        this.isServiceHealthy = true;
        return response;
      },
      (error) => {
        this.handleResponseError(error);
        return Promise.reject(error);
      }
    );

    return client;
  }

  handleResponseError(error) {
    if (error.response) {
      // Server responded with error status
      logger.error(`Python service error: ${error.response.status}`, {
        data: error.response.data,
        url: error.config?.url
      });
      
      if (error.response.status >= 500) {
        this.isServiceHealthy = false;
      }
    } else if (error.request) {
      // Request made but no response received
      logger.error('Python service unreachable:', {
        url: error.config?.url,
        timeout: this.config.timeout
      });
      this.isServiceHealthy = false;
    } else {
      // Something else happened
      logger.error('Python service client error:', error.message);
    }
  }

  async makeRequestWithRetry(requestFn, maxRetries = null) {
    const retries = maxRetries !== null ? maxRetries : this.config.retries;
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error;
        
        if (attempt === retries) {
          break; // Last attempt failed
        }

        // Calculate exponential backoff delay
        const delay = this.config.retryDelay * Math.pow(2, attempt);
        
        // Increment retry count
        this.retryCount += 1;
        
        logger.warn(`Python service request failed (attempt ${attempt + 1}/${retries + 1}), retrying in ${delay}ms... (total retries: ${this.retryCount})`, {
          error: error.message,
          attemptNumber: attempt + 1,
          totalRetries: this.retryCount
        });

        await this.sleep(delay);
      }
    }

    throw lastError;
  }

  async sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // Health Check
  async checkHealth() {
    try {
      const response = await this.client.get(this.config.healthEndpoint, {
        signal: this.abortController.signal
      });
      this.isServiceHealthy = response.status === 200;
      return {
        healthy: this.isServiceHealthy,
        status: response.status,
        data: response.data
      };
    } catch (error) {
      this.isServiceHealthy = false;
      return {
        healthy: false,
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  }

  // Single Prediction
  async predict(expenseData, options = {}) {
    if (!this.isServiceHealthy && !options.skipHealthCheck) {
      await this.checkHealth();
      if (!this.isServiceHealthy) {
        throw new Error('Python fraud detection service is not healthy');
      }
    }

    return this.makeRequestWithRetry(async () => {
      const response = await this.client.post(this.config.predictEndpoint, {
        expense: expenseData,
        options: {
          includeFeatures: options.includeFeatures || false,
          includeExplanation: options.includeExplanation || false,
          modelType: options.modelType || 'default'
        }
      }, {
        signal: this.abortController.signal
      });

      return this.formatPredictionResponse(response.data);
    });
  }

  // Batch Predictions
  async batchPredict(expensesData, options = {}) {
    if (!this.isServiceHealthy && !options.skipHealthCheck) {
      await this.checkHealth();
      if (!this.isServiceHealthy) {
        throw new Error('Python fraud detection service is not healthy');
      }
    }

    // Split large batches
    const batchSize = options.batchSize || getConfig().getPerformanceConfig().batchSize;
    const results = [];

    for (let i = 0; i < expensesData.length; i += batchSize) {
      const batch = expensesData.slice(i, i + batchSize);
      
      const batchResult = await this.makeRequestWithRetry(async () => {
        const response = await this.client.post(this.config.batchPredictEndpoint, {
          expenses: batch,
          options: {
            includeFeatures: options.includeFeatures || false,
            includeExplanation: options.includeExplanation || false,
            modelType: options.modelType || 'default'
          }
        }, {
          signal: this.abortController.signal
        });

        return response.data.predictions.map(pred => this.formatPredictionResponse(pred));
      });

      results.push(...batchResult);
    }

    return results;
  }

  formatPredictionResponse(rawResponse) {
    return {
      fraudScore: rawResponse.fraud_score || rawResponse.score || 0,
      riskLevel: rawResponse.risk_level || this.getRiskLevel(rawResponse.fraud_score || rawResponse.score || 0),
      confidence: rawResponse.confidence || 0,
      features: rawResponse.features || {},
      explanation: rawResponse.explanation || null,
      modelVersion: rawResponse.model_version || 'unknown',
      processingTime: rawResponse.processing_time || 0,
      anomalyScore: rawResponse.anomaly_score || null,
      patterns: rawResponse.patterns || []
    };
  }

  getRiskLevel(score) {
    const { fraudThreshold, alertThreshold } = getConfig().getScoringConfig();
    
    if (score >= alertThreshold) return 'HIGH';
    if (score >= fraudThreshold) return 'MEDIUM';
    return 'LOW';
  }

  // Start periodic health checks
  startHealthMonitoring(intervalMs = 30000) {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.checkHealth();
        logger.debug(`Python service health check: ${this.isServiceHealthy ? 'healthy' : 'unhealthy'}`);
      } catch (error) {
        logger.error('Health check failed:', error.message);
      }
    }, intervalMs);

    // Initial health check
    this.checkHealth().catch(error => {
      logger.warn('Initial health check failed:', error.message);
    });
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  // Get service status
  getStatus() {
    return {
      healthy: this.isServiceHealthy,
      url: this.config.url,
      timeout: this.config.timeout,
      retryCount: this.retryCount,
      lastHealthCheck: new Date().toISOString()
    };
  }

  // Get and reset retry count for per-interval metrics
  getAndResetRetryCount() {
    const currentCount = this.retryCount;
    this.retryCount = 0;
    return currentCount;
  }

  // Test connection
  async testConnection() {
    try {
      const health = await this.checkHealth();
      if (!health.healthy) {
        throw new Error(`Service unhealthy: ${health.error || 'Unknown error'}`);
      }

      // Test prediction with sample data
      const testExpense = {
        amount: 100,
        userId: 'test-user',
        groupId: 'test-group',
        timestamp: new Date().toISOString(),
        category: 'food'
      };

      await this.predict(testExpense, { skipHealthCheck: true });
      
      return {
        success: true,
        message: 'Python service connection successful',
        service: this.getStatus()
      };
    } catch (error) {
      return {
        success: false,
        message: `Python service connection failed: ${error.message}`,
        service: this.getStatus()
      };
    }
  }

  // Graceful shutdown
  async shutdown() {
    this.stopHealthMonitoring();
    
    // Cancel any pending requests using AbortController
    this.abortController.abort('Service shutting down');
    
    // Create new AbortController for any future requests (shouldn't happen after shutdown)
    this.abortController = new AbortController();
  }
}

// Singleton instance
let clientInstance = null;

function getClient() {
  if (!clientInstance) {
    clientInstance = new PythonServiceClient();
  }
  return clientInstance;
}

function resetClient() {
  if (clientInstance) {
    clientInstance.shutdown();
    clientInstance = null;
  }
}

module.exports = {
  PythonServiceClient,
  getClient,
  resetClient
};