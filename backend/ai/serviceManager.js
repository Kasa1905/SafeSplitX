/**
 * AI Service Manager for SafeSplitX
 * Manages the lifecycle of AI services including Python service client
 * and fraud detection components
 */

const logger = require('../utils/logger');
const { getClient } = require('./fraud-detection/pythonServiceClient');
const { getFraudService } = require('./fraud-detection/fraudService');
const { getConfig } = require('./fraud-detection/config');
const { setDatabaseModels } = require('./models');

class AIServiceManager {
  constructor() {
    this.pythonClient = null;
    this.fraudService = null;
    this.config = null;
    this.initialized = false;
    this.healthCheckInterval = null;
    this.servicesStatus = {
      pythonService: 'unknown',
      fraudService: 'unknown',
      overall: 'unknown'
    };
  }

  /**
   * Initialize all AI services
   */
  async initialize() {
    try {
      logger.info('Initializing AI services...');

      // Initialize configuration
      this.config = getConfig();
      
      // Check if AI services are enabled
      if (!this.config.getFeatureConfig().fraudDetectionEnabled) {
        logger.info('AI fraud detection is disabled in configuration');
        this.servicesStatus.overall = 'disabled';
        return { success: true, message: 'AI services disabled' };
      }

      // Initialize database model wiring
      await this.initializeDatabaseModels();

      // Initialize Python service client
      await this.initializePythonService();

      // Initialize fraud service
      await this.initializeFraudService();

      // Start health monitoring
      this.startHealthMonitoring();

      this.initialized = true;
      this.servicesStatus.overall = 'healthy';

      logger.info('AI services initialized successfully', {
        pythonService: this.servicesStatus.pythonService,
        fraudService: this.servicesStatus.fraudService
      });

      return { success: true, message: 'AI services initialized successfully' };

    } catch (error) {
      logger.error('Failed to initialize AI services', {
        error: error.message,
        stack: error.stack
      });

      this.servicesStatus.overall = 'failed';
      
      // Don't throw error - allow server to start with degraded AI services
      return { 
        success: false, 
        message: 'AI services initialization failed', 
        error: error.message 
      };
    }
  }

  /**
   * Initialize database model wiring
   * This should be called after database connection is established
   */
  async initializeDatabaseModels() {
    try {
      logger.info('Wiring AI models to main database models...');
      
      // Import main models from backend/models
      const mainModels = require('../models');
      
      // Wire AI models to main models
      if (mainModels) {
        setDatabaseModels(mainModels);
        logger.info('AI models successfully wired to database models', {
          hasUser: !!mainModels.User,
          hasExpense: !!mainModels.Expense,
          hasGroup: !!mainModels.Group
        });
      } else {
        logger.warn('Main models not available - AI services will work with limited functionality');
      }
      
    } catch (error) {
      logger.error('Failed to wire database models', {
        error: error.message
      });
      // Don't throw - AI services can still work with limited functionality
    }
  }

  /**
   * Initialize Python service client
   */
  async initializePythonService() {
    try {
      logger.info('Initializing Python service client...');
      
      this.pythonClient = getClient();
      
      // Test connection to Python service
      const healthCheck = await this.pythonClient.healthCheck();
      
      if (healthCheck.status === 'healthy') {
        this.servicesStatus.pythonService = 'healthy';
        logger.info('Python service client initialized successfully');
      } else {
        this.servicesStatus.pythonService = 'degraded';
        logger.warn('Python service client initialized but health check failed', { 
          status: healthCheck.status 
        });
      }

    } catch (error) {
      this.servicesStatus.pythonService = 'unhealthy';
      logger.error('Failed to initialize Python service client', {
        error: error.message
      });
      
      // Continue initialization - fraud service can work with rule engine only
      throw new Error(`Python service initialization failed: ${error.message}`);
    }
  }

  /**
   * Initialize fraud service
   */
  async initializeFraudService() {
    try {
      logger.info('Initializing fraud service...');
      
      this.fraudService = getFraudService();
      
      // Test fraud service
      const healthCheck = await this.fraudService.healthCheck();
      
      if (healthCheck.service === 'healthy' || healthCheck.service === 'degraded') {
        this.servicesStatus.fraudService = healthCheck.service;
        logger.info('Fraud service initialized successfully', {
          status: healthCheck.service,
          components: healthCheck.components
        });
      } else {
        this.servicesStatus.fraudService = 'unhealthy';
        logger.warn('Fraud service initialized but health check failed', {
          status: healthCheck.service
        });
      }

    } catch (error) {
      this.servicesStatus.fraudService = 'unhealthy';
      logger.error('Failed to initialize fraud service', {
        error: error.message
      });
      
      throw new Error(`Fraud service initialization failed: ${error.message}`);
    }
  }

  /**
   * Start health monitoring for all services
   */
  startHealthMonitoring() {
    const healthCheckInterval = this.config.getPerformanceConfig().healthCheckInterval || 60000; // 1 minute default
    
    this.healthCheckInterval = setInterval(async () => {
      try {
        await this.performHealthCheck();
      } catch (error) {
        logger.error('Health check failed', { error: error.message });
      }
    }, healthCheckInterval);

    logger.info('AI services health monitoring started', {
      interval: healthCheckInterval
    });
  }

  /**
   * Perform comprehensive health check
   */
  async performHealthCheck() {
    try {
      const results = {
        timestamp: new Date(),
        services: {}
      };

      // Check Python service
      if (this.pythonClient) {
        try {
          const pythonHealth = await this.pythonClient.healthCheck();
          results.services.pythonService = {
            status: pythonHealth.status,
            uptime: pythonHealth.uptime,
            lastCheck: new Date()
          };
          this.servicesStatus.pythonService = pythonHealth.status;
        } catch (error) {
          results.services.pythonService = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date()
          };
          this.servicesStatus.pythonService = 'unhealthy';
        }
      }

      // Check fraud service
      if (this.fraudService) {
        try {
          const fraudHealth = await this.fraudService.healthCheck();
          results.services.fraudService = {
            status: fraudHealth.service,
            components: fraudHealth.components,
            lastCheck: new Date()
          };
          this.servicesStatus.fraudService = fraudHealth.service;
        } catch (error) {
          results.services.fraudService = {
            status: 'unhealthy',
            error: error.message,
            lastCheck: new Date()
          };
          this.servicesStatus.fraudService = 'unhealthy';
        }
      }

      // Update overall status
      this.updateOverallStatus();

      // Log status changes
      if (this.lastHealthCheck) {
        const statusChanged = JSON.stringify(this.lastHealthCheck.services) !== JSON.stringify(results.services);
        if (statusChanged) {
          logger.info('AI services health status changed', {
            previous: this.lastHealthCheck.services,
            current: results.services
          });
        }
      }

      this.lastHealthCheck = results;

    } catch (error) {
      logger.error('Failed to perform health check', { error: error.message });
    }
  }

  /**
   * Update overall service status based on individual components
   */
  updateOverallStatus() {
    const statuses = [
      this.servicesStatus.pythonService,
      this.servicesStatus.fraudService
    ];

    if (statuses.every(status => status === 'healthy')) {
      this.servicesStatus.overall = 'healthy';
    } else if (statuses.every(status => status === 'unhealthy')) {
      this.servicesStatus.overall = 'unhealthy';
    } else if (statuses.includes('healthy') || statuses.includes('degraded')) {
      this.servicesStatus.overall = 'degraded';
    } else {
      this.servicesStatus.overall = 'unknown';
    }
  }

  /**
   * Get current service status
   */
  getStatus() {
    return {
      initialized: this.initialized,
      services: this.servicesStatus,
      lastHealthCheck: this.lastHealthCheck,
      uptime: process.uptime()
    };
  }

  /**
   * Gracefully shutdown all AI services
   */
  async shutdown() {
    try {
      logger.info('Shutting down AI services...');

      // Stop health monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
        this.healthCheckInterval = null;
      }

      // Shutdown Python service client
      if (this.pythonClient && this.pythonClient.shutdown) {
        await this.pythonClient.shutdown();
      }

      // Clear fraud service cache
      if (this.fraudService && this.fraudService.clearCache) {
        this.fraudService.clearCache();
      }

      this.initialized = false;
      this.servicesStatus.overall = 'shutdown';

      logger.info('AI services shutdown completed');

    } catch (error) {
      logger.error('Error during AI services shutdown', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Restart all AI services
   */
  async restart() {
    try {
      logger.info('Restarting AI services...');
      
      await this.shutdown();
      await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
      return await this.initialize();

    } catch (error) {
      logger.error('Failed to restart AI services', { error: error.message });
      throw error;
    }
  }

  /**
   * Check if AI services are available
   */
  isAvailable() {
    return this.initialized && (
      this.servicesStatus.overall === 'healthy' || 
      this.servicesStatus.overall === 'degraded'
    );
  }

  /**
   * Get fraud service instance
   */
  getFraudService() {
    return this.fraudService;
  }

  /**
   * Get Python client instance
   */
  getPythonClient() {
    return this.pythonClient;
  }
}

// Singleton instance
let aiServiceManager = null;

/**
 * Get singleton AI service manager instance
 */
function getServiceManager() {
  if (!aiServiceManager) {
    aiServiceManager = new AIServiceManager();
  }
  return aiServiceManager;
}

/**
 * Initialize AI services (convenience function)
 */
async function initializeAIServices() {
  const manager = getServiceManager();
  return await manager.initialize();
}

/**
 * Shutdown AI services (convenience function)
 */
async function shutdownAIServices() {
  if (aiServiceManager) {
    return await aiServiceManager.shutdown();
  }
}

module.exports = {
  AIServiceManager,
  getServiceManager,
  initializeAIServices,
  shutdownAIServices
};
