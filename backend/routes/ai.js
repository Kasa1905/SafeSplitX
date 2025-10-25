const express = require('express');
const router = express.Router();

const aiController = require('../controllers/aiController');

// Keep these endpoints open to allow tests with nock to drive behavior
router.get('/health', aiController.health);
router.post('/categorize', aiController.categorize);
router.post('/categorize-batch', aiController.categorizeBatch);
router.post('/analyze-patterns', aiController.analyzePatterns);
router.post('/detect-anomalies', aiController.detectAnomalies);
router.post('/full-analysis', aiController.fullAnalysis);
router.get('/metrics', aiController.metrics);
router.get('/retrain-status', aiController.retrainStatus);

module.exports = router;
