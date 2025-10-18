const nock = require('nock');
const express = require('express');

let mockServer;
let mockServerPort = 5001;

/**
 * Mock healthy Python service response
 */
const mockPythonServiceHealthy = () => {
  nock(`http://localhost:${mockServerPort}`)
    .get('/health')
    .reply(200, {
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      models: {
        fraudDetection: {
          loaded: true,
          version: '1.2.0',
          accuracy: 0.94
        }
      }
    });
};

/**
 * Mock unhealthy Python service response
 */
const mockPythonServiceUnhealthy = () => {
  nock(`http://localhost:${mockServerPort}`)
    .get('/health')
    .reply(503, {
      status: 'unhealthy',
      error: 'Model not loaded',
      timestamp: new Date().toISOString()
    });
};

/**
 * Mock fraud prediction response
 * @param {Object} expenseData - Expense data for prediction
 * @param {number} fraudScore - Fraud score (0-1)
 * @param {string} riskLevel - Risk level (LOW, MEDIUM, HIGH)
 */
const mockFraudPrediction = (expenseData, fraudScore = 0.3, riskLevel = 'LOW') => {
  nock(`http://localhost:${mockServerPort}`)
    .post('/predict')
    .reply(200, {
      prediction: {
        fraudScore,
        confidence: Math.random() * 0.3 + 0.7, // 0.7-1.0
        riskLevel,
        features: {
          amountAnomaly: Math.random() * 0.5,
          timeAnomaly: Math.random() * 0.3,
          locationAnomaly: Math.random() * 0.2,
          behaviorAnomaly: Math.random() * 0.4,
          merchantRisk: Math.random() * 0.3,
          frequencyAnomaly: Math.random() * 0.2
        },
        explanation: `Predicted ${riskLevel.toLowerCase()} risk with score ${fraudScore}`,
        processingTime: Math.floor(Math.random() * 500) + 100
      },
      modelInfo: {
        version: '1.2.0',
        algorithm: 'ensemble',
        trainingDate: '2024-01-15T10:00:00Z'
      }
    });
};

/**
 * Mock ML analysis response
 * @param {Object} features - Feature vector
 * @param {number} score - ML prediction score
 * @param {number} confidence - Confidence level
 */
const mockMLAnalysis = (features, score = 0.25, confidence = 0.88) => {
  nock(`http://localhost:${mockServerPort}`)
    .post('/analyze')
    .reply(200, {
      analysis: {
        score,
        confidence,
        featureImportance: {
          amount: 0.35,
          merchant: 0.25,
          time: 0.15,
          location: 0.10,
          user_behavior: 0.15
        },
        anomalyScores: {
          amount: features.amountAnomaly || 0.1,
          time: features.timeAnomaly || 0.05,
          location: features.locationAnomaly || 0.0,
          behavior: features.behaviorAnomaly || 0.08
        },
        threshold: 0.7,
        classification: score > 0.7 ? 'fraud' : 'legitimate'
      }
    });
};

/**
 * Mock rule engine analysis response
 * @param {Array} triggeredRules - Array of triggered rule names
 * @param {number} score - Combined rule score
 */
const mockRuleEngineAnalysis = (triggeredRules = [], score = 0.2) => {
  return {
    triggered: triggeredRules.length > 0,
    rules: triggeredRules.map(ruleName => ({
      name: ruleName,
      severity: 'MEDIUM',
      weight: 0.3,
      score: Math.random() * 0.5 + 0.2
    })),
    totalScore: score,
    explanation: triggeredRules.length > 0 
      ? `${triggeredRules.length} rules triggered: ${triggeredRules.join(', ')}`
      : 'No rules triggered'
  };
};

/**
 * Mock batch prediction response
 * @param {Array} expenses - Array of expense data
 */
const mockBatchPrediction = (expenses) => {
  nock(`http://localhost:${mockServerPort}`)
    .post('/batch-predict')
    .reply(200, {
      predictions: expenses.map((expense, index) => ({
        id: expense.id || index,
        fraudScore: Math.random() * 0.8 + 0.1,
        confidence: Math.random() * 0.3 + 0.7,
        riskLevel: Math.random() > 0.7 ? 'HIGH' : Math.random() > 0.4 ? 'MEDIUM' : 'LOW',
        processingTime: Math.floor(Math.random() * 200) + 50
      })),
      batchInfo: {
        totalProcessed: expenses.length,
        averageProcessingTime: 125,
        totalProcessingTime: expenses.length * 125
      }
    });
};

/**
 * Start mock HTTP server for Python service
 */
const startMockPythonService = () => {
  const app = express();
  app.use(express.json());

  // Health endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
      uptime: 3600,
      models: {
        fraudDetection: {
          loaded: true,
          version: '1.2.0',
          accuracy: 0.94
        }
      }
    });
  });

  // Prediction endpoint
  app.post('/predict', (req, res) => {
    const { features } = req.body;
    const fraudScore = Math.random() * 0.6 + 0.1; // 0.1-0.7
    const riskLevel = fraudScore > 0.5 ? 'MEDIUM' : 'LOW';

    res.json({
      prediction: {
        fraudScore,
        confidence: Math.random() * 0.3 + 0.7,
        riskLevel,
        features: {
          amountAnomaly: Math.random() * 0.5,
          timeAnomaly: Math.random() * 0.3,
          locationAnomaly: Math.random() * 0.2,
          behaviorAnomaly: Math.random() * 0.4
        },
        explanation: `Predicted ${riskLevel.toLowerCase()} risk`,
        processingTime: Math.floor(Math.random() * 500) + 100
      }
    });
  });

  // Batch prediction endpoint
  app.post('/batch-predict', (req, res) => {
    const { expenses } = req.body;
    
    res.json({
      predictions: expenses.map((expense, index) => ({
        id: expense.id || index,
        fraudScore: Math.random() * 0.8 + 0.1,
        confidence: Math.random() * 0.3 + 0.7,
        riskLevel: Math.random() > 0.7 ? 'HIGH' : 'MEDIUM',
        processingTime: Math.floor(Math.random() * 200) + 50
      })),
      batchInfo: {
        totalProcessed: expenses.length,
        averageProcessingTime: 125
      }
    });
  });

  // Model info endpoint
  app.get('/model/info', (req, res) => {
    res.json({
      version: '1.2.0',
      algorithm: 'ensemble',
      trainingDate: '2024-01-15T10:00:00Z',
      accuracy: 0.94,
      precision: 0.91,
      recall: 0.87,
      features: ['amount', 'merchant', 'time', 'location', 'user_behavior']
    });
  });

  mockServer = app.listen(mockServerPort, () => {
    console.log(`Mock Python service running on port ${mockServerPort}`);
  });

  return mockServer;
};

/**
 * Stop mock HTTP server
 */
const stopMockPythonService = () => {
  if (mockServer) {
    mockServer.close();
    mockServer = null;
  }
  nock.cleanAll();
};

/**
 * Mock Python service unavailable (connection refused)
 */
const mockPythonServiceUnavailable = () => {
  nock(`http://localhost:${mockServerPort}`)
    .get('/health')
    .replyWithError('ECONNREFUSED');
    
  nock(`http://localhost:${mockServerPort}`)
    .post('/predict')
    .replyWithError('ECONNREFUSED');
};

/**
 * Mock Python service timeout
 */
const mockPythonServiceTimeout = () => {
  nock(`http://localhost:${mockServerPort}`)
    .get('/health')
    .delay(10000) // 10 second delay
    .reply(200, { status: 'healthy' });
};

/**
 * Clean all nock mocks
 */
const cleanMocks = () => {
  nock.cleanAll();
};

/**
 * Verify all mocks were used
 */
const verifyMocks = () => {
  if (!nock.isDone()) {
    const pendingMocks = nock.pendingMocks();
    throw new Error(`Unused mocks: ${pendingMocks.join(', ')}`);
  }
};

module.exports = {
  mockPythonServiceHealthy,
  mockPythonServiceUnhealthy,
  mockFraudPrediction,
  mockMLAnalysis,
  mockRuleEngineAnalysis,
  mockBatchPrediction,
  startMockPythonService,
  stopMockPythonService,
  mockPythonServiceUnavailable,
  mockPythonServiceTimeout,
  cleanMocks,
  verifyMocks,
  mockServerPort
};