const logger = require('../../utils/logger');
const pythonServiceManager = require('./pythonServiceManager');
const fraudService = require('../fraud-detection/fraudService');
const { FraudAnalysis, FraudAlert, FraudRule } = require('../models');

/**
 * AI Service Manager
 * Coordinates all AI-related services and components
 */
class AIServiceManager {
  constructor() {
    this.isInitialized = false;
    this.components = {
      pythonService: pythonServiceManager,
      fraudService: fraudService.getInstance()
    };
    this.healthCheckInterval = null;
    this.systemMetrics = {
      startTime: null,
      requestsProcessed: 0,
      errorsCount: 0,
      averageResponseTime: 0,
      lastHealthCheck: null
    };
  }

  /**
   * Initialize all AI services
   */
  async initialize() {
    if (this.isInitialized) {
      logger.warn('AI services already initialized');
      return;
    }

    logger.info('Initializing AI services');

    try {
      this.systemMetrics.startTime = new Date();

      // Initialize fraud service
      logger.info('Initializing fraud service...');
      await this.components.fraudService.initialize();

      // Start Python service if enabled
      if (process.env.AI_SERVICE_ENABLED !== 'false') {
        logger.info('Starting Python ML service...');
        await this.components.pythonService.startService();
      }

      // Start system monitoring
      this.startSystemMonitoring();

      this.isInitialized = true;
      logger.info('AI services initialized successfully');

    } catch (error) {
      logger.error('Failed to initialize AI services', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Shutdown all AI services
   */
  async shutdown() {
    if (!this.isInitialized) {
      logger.info('AI services not initialized');
      return;
    }

    logger.info('Shutting down AI services');

    try {
      // Stop system monitoring
      this.stopSystemMonitoring();

      // Stop Python service
      if (this.components.pythonService) {
        await this.components.pythonService.stopService();
      }

      // Shutdown fraud service
      if (this.components.fraudService) {
        await this.components.fraudService.shutdown();
      }

      this.isInitialized = false;
      logger.info('AI services shut down successfully');

    } catch (error) {
      logger.error('Error shutting down AI services', {
        error: error.message
      });
    }
  }

  /**
   * Restart all AI services
   */
  async restart() {
    logger.info('Restarting AI services');

    try {
      await this.shutdown();
      await new Promise(resolve => setTimeout(resolve, 3000)); // Wait 3 seconds
      await this.initialize();

      logger.info('AI services restarted successfully');

    } catch (error) {
      logger.error('Failed to restart AI services', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get comprehensive system health
   */
  async getSystemHealth() {
    try {
      const health = {
        timestamp: new Date(),
        system: {
          initialized: this.isInitialized,
          uptime: this.isInitialized ? Date.now() - this.systemMetrics.startTime.getTime() : 0,
          requestsProcessed: this.systemMetrics.requestsProcessed,
          errorsCount: this.systemMetrics.errorsCount,
          errorRate: this.systemMetrics.requestsProcessed > 0 ? 
            (this.systemMetrics.errorsCount / this.systemMetrics.requestsProcessed * 100).toFixed(2) : 0,
          averageResponseTime: this.systemMetrics.averageResponseTime
        },
        components: {
          pythonService: {
            status: 'unknown',
            details: {}
          },
          fraudService: {
            status: 'unknown',
            details: {}
          },
          database: {
            status: 'unknown',
            details: {}
          }
        },
        overall: 'unknown'
      };

      // Check Python service health
      try {
        const pythonStatus = this.components.pythonService.getServiceStatus();
        health.components.pythonService = {
          status: pythonStatus.isRunning ? 'healthy' : 'down',
          details: pythonStatus
        };

        // If Python service is running, get detailed health
        if (pythonStatus.isRunning) {
          try {
            const pythonHealth = await this.components.fraudService.checkPythonServiceHealth();
            if (pythonHealth.available) {
              health.components.pythonService.status = 'healthy';
              health.components.pythonService.details.response = pythonHealth;
            } else {
              health.components.pythonService.status = 'degraded';
            }
          } catch (error) {
            health.components.pythonService.status = 'error';
            health.components.pythonService.details.error = error.message;
          }
        }
      } catch (error) {
        health.components.pythonService = {
          status: 'error',
          details: { error: error.message }
        };
      }

      // Check fraud service health
      try {
        const fraudHealth = await this.components.fraudService.getSystemHealth();
        health.components.fraudService = {
          status: fraudHealth.status || 'unknown',
          details: fraudHealth
        };
      } catch (error) {
        health.components.fraudService = {
          status: 'error',
          details: { error: error.message }
        };
      }

      // Check database connectivity
      try {
        await this.checkDatabaseHealth();
        health.components.database = {
          status: 'healthy',
          details: { message: 'Database connection successful' }
        };
      } catch (error) {
        health.components.database = {
          status: 'error',
          details: { error: error.message }
        };
      }

      // Determine overall health
      const componentStatuses = Object.values(health.components).map(c => c.status);
      if (componentStatuses.every(status => status === 'healthy')) {
        health.overall = 'healthy';
      } else if (componentStatuses.some(status => status === 'healthy')) {
        health.overall = 'degraded';
      } else {
        health.overall = 'unhealthy';
      }

      this.systemMetrics.lastHealthCheck = new Date();
      return health;

    } catch (error) {
      logger.error('Failed to get system health', { error: error.message });
      return {
        timestamp: new Date(),
        overall: 'error',
        error: error.message
      };
    }
  }

  /**
   * Get system statistics
   */
  async getSystemStatistics(days = 7) {
    try {
      const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
      
      const [
        analysisStats,
        alertStats,
        errorStats
      ] = await Promise.all([
        this.getAnalysisStatistics(startDate),
        this.getAlertStatistics(startDate),
        this.getErrorStatistics(startDate)
      ]);

      return {
        period: {
          days,
          startDate,
          endDate: new Date()
        },
        system: this.systemMetrics,
        analysis: analysisStats,
        alerts: alertStats,
        errors: errorStats
      };

    } catch (error) {
      logger.error('Failed to get system statistics', { error: error.message });
      throw error;
    }
  }

  /**
   * Track request processing
   */
  trackRequest(responseTime, success = true) {
    this.systemMetrics.requestsProcessed++;
    
    if (!success) {
      this.systemMetrics.errorsCount++;
    }

    // Update average response time
    const currentAvg = this.systemMetrics.averageResponseTime;
    const requestCount = this.systemMetrics.requestsProcessed;
    this.systemMetrics.averageResponseTime = 
      ((currentAvg * (requestCount - 1)) + responseTime) / requestCount;
  }

  // Private methods

  startSystemMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Perform periodic health checks
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getSystemHealth();
        
        if (health.overall === 'unhealthy') {
          logger.warn('System health check failed', { health });
          
          // Trigger alerts or auto-recovery if needed
          await this.handleUnhealthySystem(health);
        }
      } catch (error) {
        logger.error('System monitoring error', { error: error.message });
      }
    }, 60000); // Check every minute
  }

  stopSystemMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }

  async checkDatabaseHealth() {
    try {
      // Test database connectivity with a simple query
      await FraudAnalysis.countDocuments({}).limit(1);
      return true;
    } catch (error) {
      throw new Error(`Database health check failed: ${error.message}`);
    }
  }

  async getAnalysisStatistics(startDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: 1 },
            avgScore: { $avg: '$overallScore' },
            avgProcessingTime: { $avg: '$processingTime' },
            highRisk: {
              $sum: { $cond: [{ $gte: ['$overallScore', 0.7] }, 1, 0] }
            },
            mediumRisk: {
              $sum: { 
                $cond: [
                  { $and: [{ $gte: ['$overallScore', 0.3] }, { $lt: ['$overallScore', 0.7] }] }, 
                  1, 
                  0
                ] 
              }
            },
            lowRisk: {
              $sum: { $cond: [{ $lt: ['$overallScore', 0.3] }, 1, 0] }
            }
          }
        }
      ];

      const results = await FraudAnalysis.aggregate(pipeline);
      return results[0] || {
        total: 0,
        avgScore: 0,
        avgProcessingTime: 0,
        highRisk: 0,
        mediumRisk: 0,
        lowRisk: 0
      };
    } catch (error) {
      logger.error('Failed to get analysis statistics', { error: error.message });
      return {};
    }
  }

  async getAlertStatistics(startDate) {
    try {
      const pipeline = [
        {
          $match: {
            createdAt: { $gte: startDate }
          }
        },
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 }
          }
        }
      ];

      const results = await FraudAlert.aggregate(pipeline);
      return results.reduce((acc, item) => {
        acc[item._id.toLowerCase()] = item.count;
        return acc;
      }, {});
    } catch (error) {
      logger.error('Failed to get alert statistics', { error: error.message });
      return {};
    }
  }

  async getErrorStatistics(startDate) {
    // This would typically query error logs or metrics
    // For now, return basic system metrics
    return {
      totalErrors: this.systemMetrics.errorsCount,
      errorRate: this.systemMetrics.requestsProcessed > 0 ? 
        (this.systemMetrics.errorsCount / this.systemMetrics.requestsProcessed * 100).toFixed(2) : 0
    };
  }

  async handleUnhealthySystem(health) {
    // Implement auto-recovery strategies
    logger.warn('Attempting system recovery due to unhealthy status');

    try {
      // Restart Python service if it's down
      if (health.components.pythonService?.status === 'down' || 
          health.components.pythonService?.status === 'error') {
        logger.info('Restarting Python service due to health check failure');
        await this.components.pythonService.restartService();
      }

      // Create system alert
      if (health.components.database?.status === 'healthy') {
        await this.createSystemAlert(health);
      }

    } catch (error) {
      logger.error('System recovery failed', { error: error.message });
    }
  }

  async createSystemAlert(health) {
    try {
      const alert = new FraudAlert({
        type: 'SYSTEM_HEALTH',
        severity: health.overall === 'unhealthy' ? 'CRITICAL' : 'HIGH',
        title: 'AI System Health Alert',
        message: `AI system health status: ${health.overall}. Components affected: ${
          Object.entries(health.components)
            .filter(([_, component]) => component.status !== 'healthy')
            .map(([name, _]) => name)
            .join(', ')
        }`,
        metadata: {
          healthCheck: health,
          autoGenerated: true,
          systemAlert: true
        }
      });

      await alert.save();
      logger.info('System health alert created', { alertId: alert.alertId });

    } catch (error) {
      logger.error('Failed to create system alert', { error: error.message });
    }
  }
}

// Export singleton instance
const aiServiceManager = new AIServiceManager();

module.exports = aiServiceManager;