#!/usr/bin/env node

/**
 * AI Services Monitor Script
 * Monitors AI fraud detection services health, performance, and logs
 */

const { AIServiceManager } = require('../ai/fraud-detection/serviceManager');
require('dotenv').config();

class AIMonitor {
  constructor() {
    this.serviceManager = new AIServiceManager();
    this.isMonitoring = false;
    this.monitoringInterval = null;
  }

  async startMonitoring(options = {}) {
    const {
      interval = 30000, // 30 seconds
      logLevel = 'info',
      showMetrics = true,
      showLogs = false
    } = options;

    console.log('🔍 Starting AI services monitoring...');
    console.log(`📊 Check interval: ${interval / 1000}s`);
    console.log(`📝 Log level: ${logLevel}`);
    
    this.isMonitoring = true;

    // Initial health check
    await this.checkAndReport();

    // Start monitoring loop
    this.monitoringInterval = setInterval(async () => {
      if (!this.isMonitoring) return;
      await this.checkAndReport(showMetrics, showLogs);
    }, interval);

    // Graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n⏹️  Stopping AI monitor...');
      this.stopMonitoring();
      process.exit(0);
    });

    console.log('✅ AI monitoring started. Press Ctrl+C to stop.\n');
  }

  async checkAndReport(showMetrics = true, showLogs = false) {
    try {
      const timestamp = new Date().toISOString();
      const health = await this.serviceManager.checkHealth();

      // Basic health status
      console.log(`[${timestamp}] ${this.getStatusIcon(health.status)} AI Services: ${health.status.toUpperCase()}`);

      if (health.status !== 'healthy') {
        console.log(`  ⚠️  Issues detected: ${JSON.stringify(health.details, null, 2)}`);
      }

      if (showMetrics && health.metrics) {
        this.displayMetrics(health.metrics);
      }

      if (showLogs) {
        await this.displayRecentLogs();
      }

      // Service-specific checks
      await this.checkPythonService();
      await this.checkRuleEngine();

    } catch (error) {
      console.error(`❌ Monitoring error: ${error.message}`);
    }
  }

  async checkPythonService() {
    try {
      const pythonClient = this.serviceManager.pythonServiceClient;
      if (pythonClient) {
        const health = await pythonClient.checkHealth();
        if (health.status === 'healthy') {
          console.log('  🐍 Python ML Service: Healthy');
        } else {
          console.log('  ⚠️  Python ML Service: Issues detected');
        }
      }
    } catch (error) {
      console.log('  ❌ Python ML Service: Unavailable');
    }
  }

  async checkRuleEngine() {
    try {
      // Simple rule engine validation
      const ruleEngine = require('../ai/fraud-detection/ruleEngine');
      if (ruleEngine && typeof ruleEngine.analyzeExpense === 'function') {
        console.log('  ⚙️  Rule Engine: Operational');
      } else {
        console.log('  ⚠️  Rule Engine: Configuration issues');
      }
    } catch (error) {
      console.log('  ❌ Rule Engine: Module error');
    }
  }

  displayMetrics(metrics) {
    console.log('  📊 Metrics:');
    if (metrics.requests) {
      console.log(`    - Total requests: ${metrics.requests.total || 'N/A'}`);
      console.log(`    - Success rate: ${metrics.requests.successRate || 'N/A'}%`);
      console.log(`    - Avg response time: ${metrics.requests.avgResponseTime || 'N/A'}ms`);
    }
    if (metrics.fraud) {
      console.log(`    - Fraud detections: ${metrics.fraud.totalDetections || 'N/A'}`);
      console.log(`    - High risk alerts: ${metrics.fraud.highRiskAlerts || 'N/A'}`);
    }
  }

  async displayRecentLogs() {
    // In a real implementation, this would tail log files
    console.log('  📝 Recent activity: (Log streaming not implemented)');
  }

  getStatusIcon(status) {
    switch (status.toLowerCase()) {
      case 'healthy': return '✅';
      case 'degraded': return '⚠️ ';
      case 'unhealthy': return '❌';
      default: return '❓';
    }
  }

  stopMonitoring() {
    this.isMonitoring = false;
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.monitoringInterval = null;
    }
    console.log('✅ AI monitoring stopped');
  }
}

// CLI interface
const runMonitor = async () => {
  const args = process.argv.slice(2);
  const options = {};

  // Parse CLI arguments
  args.forEach((arg, index) => {
    switch (arg) {
      case '--interval':
        options.interval = parseInt(args[index + 1]) * 1000;
        break;
      case '--metrics':
        options.showMetrics = true;
        break;
      case '--logs':
        options.showLogs = true;
        break;
      case '--help':
        console.log(`
AI Services Monitor

Usage: npm run monitor:ai [options]

Options:
  --interval <seconds>  Monitoring interval (default: 30)
  --metrics            Show detailed metrics
  --logs              Show recent logs
  --help              Show this help message

Examples:
  npm run monitor:ai
  npm run monitor:ai -- --interval 10 --metrics
`);
        process.exit(0);
    }
  });

  const monitor = new AIMonitor();
  await monitor.startMonitoring(options);
};

// Run if called directly
if (require.main === module) {
  runMonitor().catch(error => {
    console.error('❌ Monitor failed to start:', error.message);
    process.exit(1);
  });
}

module.exports = { AIMonitor };