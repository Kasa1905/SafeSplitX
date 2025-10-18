#!/usr/bin/env node

/**
 * AI Services Setup Script
 * Sets up AI fraud detection services, downloads models, and validates configuration
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
require('dotenv').config();

const setupAI = async () => {
  console.log('🤖 Setting up AI services for SplitSafeX...');

  try {
    // Create required directories
    const dirs = [
      './ai/fraud-detection/models',
      './ai/fraud-detection/data',
      './ai/fraud-detection/logs',
      './docker/ai-service',
      './temp/ai-cache'
    ];

    dirs.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
        console.log(`✅ Created directory: ${dir}`);
      }
    });

    // Validate environment variables
    const requiredEnvVars = [
      'AI_SERVICE_URL',
      'AI_SERVICE_TIMEOUT',
      'FRAUD_DETECTION_ENABLED',
      'ML_MODEL_PATH'
    ];

    const missing = requiredEnvVars.filter(env => !process.env[env]);
    if (missing.length > 0) {
      console.warn(`⚠️  Missing environment variables: ${missing.join(', ')}`);
      console.log('Please check your .env file against .env.example');
    }

    // Initialize AI service manager
    const { AIServiceManager } = require('../ai/fraud-detection/serviceManager');
    const serviceManager = new AIServiceManager();

    console.log('🔄 Initializing AI service manager...');
    await serviceManager.initialize();

    // Check AI service health
    console.log('🏥 Checking AI service health...');
    const health = await serviceManager.checkHealth();
    
    if (health.status === 'healthy') {
      console.log('✅ AI services are running and healthy');
    } else {
      console.warn('⚠️  AI services may not be fully operational');
      console.log(`Status: ${health.status}`);
      console.log(`Details: ${JSON.stringify(health.details, null, 2)}`);
    }

    // Download/initialize ML models if needed
    console.log('📦 Checking ML models...');
    const modelPath = process.env.ML_MODEL_PATH || './ai/fraud-detection/models';
    if (!fs.existsSync(path.join(modelPath, 'fraud-model.json'))) {
      console.log('🔄 Initializing basic fraud detection model...');
      // Create a basic model structure (in production, this would download from ML service)
      const basicModel = {
        version: '1.0.0',
        type: 'fraud-detection',
        features: ['amount', 'merchant', 'time', 'location', 'user_behavior'],
        thresholds: {
          low_risk: 0.3,
          medium_risk: 0.6,
          high_risk: 0.8
        },
        created_at: new Date().toISOString()
      };
      
      fs.writeFileSync(
        path.join(modelPath, 'fraud-model.json'),
        JSON.stringify(basicModel, null, 2)
      );
      console.log('✅ Basic fraud detection model initialized');
    }

    console.log('🎉 AI services setup completed successfully!');
    console.log('\n📋 Next steps:');
    console.log('1. Run "npm run ai:health" to verify services');
    console.log('2. Run "npm run docker:up" to start containerized services');
    console.log('3. Run "npm run test:ai" to validate AI functionality');

  } catch (error) {
    console.error('❌ AI setup failed:', error.message);
    console.error('\n🔧 Troubleshooting:');
    console.error('1. Check your .env configuration');
    console.error('2. Ensure Docker is running (for containerized services)');
    console.error('3. Verify network connectivity to AI services');
    process.exit(1);
  }
};

// Run setup if called directly
if (require.main === module) {
  setupAI();
}

module.exports = { setupAI };