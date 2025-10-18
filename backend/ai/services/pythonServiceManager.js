const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs').promises;
const logger = require('../../utils/logger');

/**
 * Python Service Manager
 * Manages the lifecycle of the Python FastAPI fraud detection service
 */
class PythonServiceManager {
  constructor() {
    this.process = null;
    this.isStarting = false;
    this.isRunning = false;
    this.restartCount = 0;
    this.maxRestarts = 5;
    this.startupTimeout = 60000; // 60 seconds
    this.healthCheckInterval = null;
    this.serviceConfig = {
      pythonPath: process.env.PYTHON_PATH || 'python',
      servicePath: path.join(__dirname, '../python-service'),
      port: process.env.PYTHON_SERVICE_PORT || 8000,
      host: process.env.PYTHON_SERVICE_HOST || '127.0.0.1',
      logLevel: process.env.PYTHON_SERVICE_LOG_LEVEL || 'info',
      workers: parseInt(process.env.PYTHON_SERVICE_WORKERS) || 1,
      maxMemory: process.env.PYTHON_SERVICE_MAX_MEMORY || '2G',
      env: {
        ...process.env,
        PYTHONPATH: path.join(__dirname, '../python-service'),
        LOG_LEVEL: process.env.PYTHON_SERVICE_LOG_LEVEL || 'info',
        PORT: process.env.PYTHON_SERVICE_PORT || 8000,
        HOST: process.env.PYTHON_SERVICE_HOST || '127.0.0.1',
        WORKERS: process.env.PYTHON_SERVICE_WORKERS || 1
      }
    };
  }

  /**
   * Start the Python service
   */
  async startService() {
    if (this.isStarting || this.isRunning) {
      logger.warn('Python service is already starting or running');
      return;
    }

    this.isStarting = true;
    logger.info('Starting Python fraud detection service', this.serviceConfig);

    try {
      // Check if service directory exists
      await this.validateServiceDirectory();

      // Check dependencies
      await this.checkDependencies();

      // Start the service process
      await this.spawnService();

      // Wait for service to be ready
      await this.waitForServiceReady();

      // Start health monitoring
      this.startHealthMonitoring();

      this.isStarting = false;
      this.isRunning = true;
      this.restartCount = 0;

      logger.info('Python fraud detection service started successfully', {
        pid: this.process.pid,
        port: this.serviceConfig.port
      });

    } catch (error) {
      this.isStarting = false;
      logger.error('Failed to start Python service', {
        error: error.message,
        stack: error.stack
      });
      throw error;
    }
  }

  /**
   * Stop the Python service
   */
  async stopService() {
    if (!this.isRunning && !this.process) {
      logger.info('Python service is not running');
      return;
    }

    logger.info('Stopping Python fraud detection service');

    try {
      // Stop health monitoring
      this.stopHealthMonitoring();

      // Gracefully terminate the process
      if (this.process) {
        this.process.kill('SIGTERM');

        // Wait for graceful shutdown
        await this.waitForProcessExit(10000);

        // Force kill if still running
        if (!this.process.killed) {
          this.process.kill('SIGKILL');
          await this.waitForProcessExit(5000);
        }
      }

      this.isRunning = false;
      this.process = null;

      logger.info('Python fraud detection service stopped');

    } catch (error) {
      logger.error('Error stopping Python service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Restart the Python service
   */
  async restartService() {
    logger.info('Restarting Python fraud detection service');

    try {
      await this.stopService();
      await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
      await this.startService();

      logger.info('Python fraud detection service restarted successfully');

    } catch (error) {
      logger.error('Failed to restart Python service', {
        error: error.message
      });
      throw error;
    }
  }

  /**
   * Get service status
   */
  getServiceStatus() {
    return {
      isRunning: this.isRunning,
      isStarting: this.isStarting,
      processId: this.process?.pid,
      restartCount: this.restartCount,
      config: {
        port: this.serviceConfig.port,
        host: this.serviceConfig.host,
        workers: this.serviceConfig.workers
      }
    };
  }

  // Private methods

  async validateServiceDirectory() {
    const requiredFiles = [
      'app/main.py',
      'requirements.txt',
      'start.sh'
    ];

    for (const file of requiredFiles) {
      const filePath = path.join(this.serviceConfig.servicePath, file);
      try {
        await fs.access(filePath);
      } catch (error) {
        throw new Error(`Required file not found: ${filePath}`);
      }
    }
  }

  async checkDependencies() {
    return new Promise((resolve, reject) => {
      // Check if Python is available
      const pythonCheck = spawn(this.serviceConfig.pythonPath, ['--version']);
      
      pythonCheck.on('close', (code) => {
        if (code === 0) {
          logger.info('Python runtime available');
          resolve();
        } else {
          reject(new Error(`Python runtime not available (exit code: ${code})`));
        }
      });

      pythonCheck.on('error', (error) => {
        reject(new Error(`Python runtime check failed: ${error.message}`));
      });
    });
  }

  async spawnService() {
    return new Promise((resolve, reject) => {
      const startScript = path.join(this.serviceConfig.servicePath, 'start.sh');
      
      // Make start script executable
      fs.chmod(startScript, '755').catch(() => {
        // Ignore chmod errors on non-Unix systems
      });

      this.process = spawn('bash', [startScript], {
        cwd: this.serviceConfig.servicePath,
        env: this.serviceConfig.env,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.info('Python service stdout', { output });
        }
      });

      this.process.stderr.on('data', (data) => {
        const output = data.toString().trim();
        if (output) {
          logger.warn('Python service stderr', { output });
        }
      });

      this.process.on('spawn', () => {
        logger.info('Python service process spawned', { pid: this.process.pid });
        resolve();
      });

      this.process.on('error', (error) => {
        logger.error('Python service process error', { error: error.message });
        this.isRunning = false;
        this.process = null;
        reject(error);
      });

      this.process.on('exit', (code, signal) => {
        logger.info('Python service process exited', { code, signal, pid: this.process?.pid });
        this.isRunning = false;
        
        // Auto-restart if not intentionally stopped and within restart limit
        if (code !== 0 && this.restartCount < this.maxRestarts) {
          this.restartCount++;
          logger.info(`Auto-restarting Python service (attempt ${this.restartCount}/${this.maxRestarts})`);
          
          setTimeout(() => {
            this.startService().catch(error => {
              logger.error('Auto-restart failed', { error: error.message });
            });
          }, 5000);
        }
        
        this.process = null;
      });
    });
  }

  async waitForServiceReady() {
    const startTime = Date.now();
    const healthUrl = `http://${this.serviceConfig.host}:${this.serviceConfig.port}/health`;
    
    logger.info('Waiting for Python service to be ready', { healthUrl });

    while (Date.now() - startTime < this.startupTimeout) {
      try {
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        });

        if (response.ok) {
          const health = await response.json();
          if (health.status === 'healthy' || health.status === 'degraded') {
            logger.info('Python service is ready', { status: health.status });
            return;
          }
        }
      } catch (error) {
        // Service not ready yet, continue waiting
      }

      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    throw new Error(`Python service failed to become ready within ${this.startupTimeout}ms`);
  }

  async waitForProcessExit(timeout = 10000) {
    return new Promise((resolve) => {
      if (!this.process || this.process.killed) {
        resolve();
        return;
      }

      const timer = setTimeout(() => {
        resolve();
      }, timeout);

      this.process.once('exit', () => {
        clearTimeout(timer);
        resolve();
      });
    });
  }

  startHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    this.healthCheckInterval = setInterval(async () => {
      try {
        const healthUrl = `http://${this.serviceConfig.host}:${this.serviceConfig.port}/health`;
        const response = await fetch(healthUrl, {
          method: 'GET',
          timeout: 5000
        });

        if (!response.ok) {
          throw new Error(`Health check failed with status: ${response.status}`);
        }

        const health = await response.json();
        
        if (health.status === 'unhealthy') {
          logger.warn('Python service health check failed', { health });
          
          // Consider restarting if consistently unhealthy
          if (this.restartCount < this.maxRestarts) {
            this.restartService().catch(error => {
              logger.error('Health-triggered restart failed', { error: error.message });
            });
          }
        }

      } catch (error) {
        logger.error('Health check error', { error: error.message });
      }
    }, 30000); // Check every 30 seconds
  }

  stopHealthMonitoring() {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = null;
    }
  }
}

// Export singleton instance
const pythonServiceManager = new PythonServiceManager();

module.exports = pythonServiceManager;