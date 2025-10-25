/**
 * AI Controller implemented to proxy to local AI service (mocked by tests via nock)
 */
const axios = require('axios');

const health = async (req, res) => {
  try {
    const resp = await axios.get('http://localhost:8000/health', { timeout: 5000 });
    return res.status(200).json({ success: true, data: resp.data });
  } catch (err) {
    if (err.code === 'ECONNABORTED') {
      return res.status(503).json({ success: false, error: 'AI service timeout' });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const categorize = async (req, res) => {
  try {
    const resp = await axios.post('http://localhost:8000/categorize-expense', req.body || {}, { timeout: 5000 });
    // Ensure we return the response data properly
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      // AI service responded with error
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Categorization failed' 
      });
    }
    // Network error or timeout
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const categorizeBatch = async (req, res) => {
  try {
    const resp = await axios.post('http://localhost:8000/categorize-batch', req.body || {}, { timeout: 5000 });
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Bulk categorization failed' 
      });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const analyzePatterns = async (req, res) => {
  try {
    const resp = await axios.post('http://localhost:8000/analyze-patterns', req.body || {}, { timeout: 5000 });
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Pattern analysis failed' 
      });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const detectAnomalies = async (req, res) => {
  try {
    const resp = await axios.post('http://localhost:8000/detect-anomalies', req.body || {}, { timeout: 5000 });
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Anomaly detection failed' 
      });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const fullAnalysis = async (req, res) => {
  try {
    // Run categorize and fraud analysis; allow partial success
    let categorization = { status: 'failed' };
    let fraudAnalysis = { status: 'failed' };
    let partial = false;

    try {
      const cat = await axios.post('http://localhost:8000/categorize-expense', req.body || {}, { timeout: 5000 });
      categorization = { status: 'success', ...(cat.data || {}) };
    } catch (e) {
      partial = true;
    }

    try {
      const fraud = await axios.post('http://localhost:8000/analyze-expense', req.body || {}, { timeout: 5000 });
      fraudAnalysis = { status: 'success', ...(fraud.data || {}) };
    } catch (e) {
      partial = true;
    }

    const payload = { categorization, fraud_analysis: fraudAnalysis };
    if (partial) {
      return res.status(206).json({ success: true, data: payload });
    }
    return res.status(200).json({ success: true, data: payload });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Full analysis failed' });
  }
};

const metrics = async (req, res) => {
  try {
    const resp = await axios.get('http://localhost:8000/metrics', { timeout: 5000 });
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Failed to get metrics' 
      });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};

const retrainStatus = async (req, res) => {
  try {
    const resp = await axios.get('http://localhost:8000/retrain-status', { timeout: 5000 });
    const data = resp.data || {};
    return res.status(200).json({ success: true, data });
  } catch (err) {
    if (err.response) {
      return res.status(err.response.status || 500).json({ 
        success: false, 
        error: err.response.data?.error || 'Failed to get retrain status' 
      });
    }
    return res.status(503).json({ success: false, error: 'AI service unavailable' });
  }
};;

module.exports = {
  health,
  categorize,
  categorizeBatch,
  analyzePatterns,
  detectAnomalies,
  fullAnalysis,
  metrics,
  retrainStatus
};
