// SafeSplitX Fraud Detection Integration Library
// Add this to your main SafeSplitX project

class FraudDetectionService {
  constructor(options = {}) {
    this.baseUrl = options.baseUrl || process.env.FRAUD_DETECTION_URL || 'http://localhost:8000';
    this.timeout = options.timeout || 5000;
    this.retries = options.retries || 2;
    this.fallbackToAllow = options.fallbackToAllow !== false;
  }

  /**
   * Check if a transaction is fraudulent
   * @param {Object} expense - Expense transaction data
   * @returns {Promise<Object>} Fraud detection result
   */
  async checkTransaction(expense) {
    try {
      const response = await this._makeRequest('/predict/simple', {
        amount: expense.amount,
        category: expense.category || 'other',
        location: expense.location || expense.merchant || 'Unknown',
        payment_method: expense.paymentMethod || expense.payment_method || 'unknown',
        timestamp: expense.createdAt || expense.timestamp || new Date().toISOString(),
        user_id: expense.userId || expense.user_id,
        group_id: expense.groupId || expense.group_id,
        merchant_name: expense.merchant || expense.merchantName,
        participants: expense.participants || []
      });

      return {
        isFraud: response.is_fraud,
        riskLevel: response.risk_level,
        probability: response.fraud_probability,
        confidence: response.confidence,
        explanation: response.explanation,
        featureImportance: response.feature_importance,
        processingTime: response.processing_time
      };
    } catch (error) {
      console.warn('Fraud detection service error:', error.message);
      
      if (this.fallbackToAllow) {
        return {
          isFraud: false,
          riskLevel: 'Unknown',
          probability: 0,
          confidence: 0,
          explanation: 'Fraud check unavailable - allowing transaction',
          error: error.message
        };
      }
      
      throw error;
    }
  }

  /**
   * Check service health
   * @returns {Promise<Object>} Health status
   */
  async checkHealth() {
    try {
      const response = await this._makeRequest('/health');
      return {
        healthy: response.status === 'healthy',
        status: response.status,
        uptime: response.uptime_seconds
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message
      };
    }
  }

  /**
   * Get detailed service status
   * @returns {Promise<Object>} Service status
   */
  async getStatus() {
    try {
      return await this._makeRequest('/status');
    } catch (error) {
      throw new Error(`Failed to get fraud service status: ${error.message}`);
    }
  }

  /**
   * Make HTTP request with retries
   * @private
   */
  async _makeRequest(endpoint, data = null, attempt = 1) {
    const url = `${this.baseUrl}${endpoint}`;
    
    try {
      const options = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: this.timeout,
      };

      if (data) {
        options.body = JSON.stringify(data);
      }

      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      if (attempt < this.retries) {
        console.warn(`Fraud service request failed (attempt ${attempt}/${this.retries}), retrying...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        return this._makeRequest(endpoint, data, attempt + 1);
      }
      
      throw error;
    }
  }
}

// Express.js middleware integration
const createFraudCheckMiddleware = (fraudService) => {
  return async (req, res, next) => {
    try {
      if (req.body && req.body.amount) {
        const fraudResult = await fraudService.checkTransaction(req.body);
        
        // Add fraud data to request for downstream use
        req.fraudCheck = fraudResult;
        
        // Optional: Block high-risk transactions
        if (fraudResult.riskLevel === 'High' && fraudResult.probability > 0.8) {
          return res.status(400).json({
            error: 'Transaction blocked due to fraud risk',
            explanation: fraudResult.explanation,
            riskLevel: fraudResult.riskLevel
          });
        }
      }
      
      next();
    } catch (error) {
      console.error('Fraud check middleware error:', error);
      // Continue without fraud check (graceful degradation)
      next();
    }
  };
};

// Usage examples
const fraudService = new FraudDetectionService({
  baseUrl: process.env.FRAUD_DETECTION_URL,
  fallbackToAllow: true
});

// Example 1: Check before saving expense
async function createExpense(expenseData) {
  // Check for fraud
  const fraudCheck = await fraudService.checkTransaction(expenseData);
  
  // Add fraud metadata to expense
  const expense = {
    ...expenseData,
    fraudRisk: {
      level: fraudCheck.riskLevel,
      probability: fraudCheck.probability,
      explanation: fraudCheck.explanation,
      checkedAt: new Date()
    }
  };

  // Handle high-risk transactions
  if (fraudCheck.riskLevel === 'High') {
    expense.status = 'pending_review';
    await notifyAdmins(expense, fraudCheck);
  }

  return await saveExpense(expense);
}

// Example 2: Express route with fraud check
app.post('/api/expenses', async (req, res) => {
  try {
    const fraudResult = await fraudService.checkTransaction(req.body);
    
    const expense = await createExpense({
      ...req.body,
      fraudCheck: fraudResult
    });

    res.json({
      expense,
      fraudAssessment: {
        riskLevel: fraudResult.riskLevel,
        explanation: fraudResult.explanation
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Example 3: Background fraud checking
const backgroundFraudCheck = async (expenseId) => {
  try {
    const expense = await getExpenseById(expenseId);
    const fraudResult = await fraudService.checkTransaction(expense);
    
    if (fraudResult.isFraud) {
      await flagExpenseForReview(expenseId, fraudResult);
      await sendFraudAlert(expense, fraudResult);
    }
    
    await updateExpenseFraudData(expenseId, fraudResult);
  } catch (error) {
    console.error(`Background fraud check failed for expense ${expenseId}:`, error);
  }
};

module.exports = {
  FraudDetectionService,
  createFraudCheckMiddleware,
  createExpense,
  backgroundFraudCheck
};
