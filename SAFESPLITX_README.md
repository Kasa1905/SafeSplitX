# 🛡️ AI & Fraud Detection Module - SafeSplitX

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)](https://fastapi.tiangolo.com)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker&logoColor=white)](https://www.docker.com/)

## 🎯 **Overview**

The **AI & Fraud Detection Module** is a production-ready microservice designed specifically for the **SafeSplitX** group expense sharing application. This intelligent system provides real-time fraud detection using a hybrid approach that combines Machine Learning models with business rule engines to identify suspicious expense patterns and protect users from fraudulent activities.

### 🔗 **Integration with SafeSplitX**
This module seamlessly integrates with the SafeSplitX ecosystem to provide:
- **Real-time fraud detection** for expense submissions
- **Risk scoring** for transactions before settlement
- **Explainable AI** to help users understand why an expense was flagged
- **Webhook notifications** to alert administrators of suspicious activities

---

## 🚀 **Key Features**

### 🤖 **Hybrid AI Detection System**
- **Machine Learning Models**: Isolation Forest for anomaly detection
- **Rule-Based Engine**: Configurable business rules for known fraud patterns
- **Ensemble Approach**: Combines ML predictions with rule violations for maximum accuracy
- **Explainable AI**: SHAP-based explanations for every prediction

### 🌐 **Production-Ready API**
- **FastAPI Framework**: High-performance async REST API
- **Automatic Documentation**: Interactive Swagger UI and ReDoc
- **Real-time Processing**: Sub-200ms response times
- **Batch Processing**: Handle multiple expenses simultaneously

### 🔧 **Advanced Features**
- **Model Versioning**: Built-in model registry and lifecycle management
- **Feature Engineering**: 17+ sophisticated features extracted from expense data
- **Notification System**: Webhook and Kafka integration for fraud alerts
- **Comprehensive Logging**: Structured JSON logging for monitoring

### 🐳 **DevOps Ready**
- **Docker Support**: Containerized deployment
- **CI/CD Pipeline**: GitHub Actions for automated testing and deployment
- **VS Code Integration**: Pre-configured tasks and debugging
- **Health Checks**: Built-in monitoring endpoints

---

## 📊 **How It Works**

### 1. **Data Flow Architecture**
```
Expense Request → Feature Engineering → ML Model → Rule Engine → Ensemble Decision → Response + Alerts
```

### 2. **Detection Process**
1. **Input Validation**: Expense data validated using Pydantic schemas
2. **Feature Extraction**: 17 features computed including:
   - Amount patterns and statistical measures
   - Time-based features (hour, day, weekend indicators)
   - Participant behavior analysis
   - Merchant and category encoding
   - Historical context when available

3. **ML Analysis**: Isolation Forest model analyzes feature patterns
4. **Rule Evaluation**: Business rules check for known fraud indicators:
   - Excessive amounts compared to group averages
   - Suspicious timing (midnight transactions, weekends)
   - Invalid merchant names (ATM, CASH, etc.)
   - Participant mismatches and duplicates
   - Amount discrepancies

5. **Ensemble Decision**: Weighted combination of ML score and rule violations
6. **Explanation Generation**: Feature contributions and rule violations explained
7. **Response & Alerts**: JSON response with fraud score, explanations, and optional notifications

### 3. **Fraud Detection Patterns**
The system detects various fraud patterns:
- **Amount Manipulation**: Unusually high amounts, round numbers
- **Time-based Anomalies**: Midnight transactions, weekend late-night activities
- **Participant Fraud**: Duplicate participants, payer not in participant list
- **Merchant Anomalies**: Suspicious merchant names, invalid categories
- **Statistical Outliers**: Expenses that don't match historical patterns

---

## 🛠️ **Installation & Setup**

### **Prerequisites**
- Python 3.10 or higher
- Git
- Docker (optional but recommended)

### **Quick Start**

1. **Clone the SafeSplitX Repository**
   ```bash
   git clone https://github.com/Kasa1905/SafeSplitX.git
   cd SafeSplitX/fraud-detection-module
   ```

2. **Set Up Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure Environment**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Generate Training Data & Train Models**
   ```bash
   # Generate sample data for initial training
   python scripts/generate_sample_data.py --output data/training_data.csv --samples 1000

   # Train the fraud detection models
   python scripts/train_models.py --data data/training_data.csv
   ```

6. **Start the API Server**
   ```bash
   uvicorn fraud_detection.api.main:app --reload --host 0.0.0.0 --port 8000
   ```

7. **Verify Installation**
   ```bash
   curl http://localhost:8000/health
   # Visit http://localhost:8000/docs for interactive documentation
   ```

### **Docker Installation**
```bash
# Build the Docker image
docker build -t safesplitx-fraud-detection .

# Run the container
docker run -d --name fraud-detection -p 8000:8000 safesplitx-fraud-detection

# Check health
curl http://localhost:8000/health
```

---

## 📋 **API Usage Guide**

### **Base URL**
```
http://localhost:8000  # Development
https://your-domain.com/fraud-api  # Production
```

### **Authentication**
Currently uses simple API key authentication. Include in headers:
```bash
Authorization: Bearer YOUR_API_KEY
```

### **Core Endpoints**

#### 1. **Fraud Detection** - `POST /predict`
Analyze a single expense for fraud indicators.

**Request:**
```json
{
  "expense_id": "exp_12345",
  "group_id": "group_789",
  "payer_id": "user_abc",
  "participants": [
    {"user_id": "user_abc", "amount": 25.50},
    {"user_id": "user_def", "amount": 24.50}
  ],
  "amount": 50.00,
  "currency": "USD",
  "merchant": "Restaurant XYZ",
  "category": "food",
  "timestamp": "2023-12-01T18:30:00Z"
}
```

**Response:**
```json
{
  "expense_id": "exp_12345",
  "anomaly_score": 0.342,
  "is_suspicious": false,
  "model_version": "20250924_060541",
  "reasons": [],
  "explanation": [
    {
      "feature_name": "amount",
      "contribution": 0.145,
      "value": 50.0
    },
    {
      "feature_name": "hour_of_day", 
      "contribution": -0.089,
      "value": 18
    }
  ],
  "timestamp": "2025-09-24T11:45:00Z"
}
```

#### 2. **Batch Processing** - `POST /predict/batch`
Analyze multiple expenses simultaneously.

**Request:**
```json
[
  {expense_object_1},
  {expense_object_2},
  {expense_object_3}
]
```

#### 3. **Health Check** - `GET /health`
Check service status and model information.

**Response:**
```json
{
  "status": "healthy",
  "model_version": "20250924_060541",
  "last_trained_at": "2025-09-24T06:05:41Z",
  "uptime_seconds": 3600.0
}
```

#### 4. **Model Training** - `POST /train`
Trigger model retraining with new data.

**Request:**
```json
{
  "data_source": "database",
  "model_types": ["isolation_forest"],
  "validation_split": 0.2
}
```

### **Response Codes**
- `200`: Successful prediction/operation
- `400`: Invalid input data
- `422`: Validation error
- `429`: Rate limit exceeded
- `500`: Internal server error

---

## 🔧 **Configuration Guide**

### **Environment Variables**

Create a `.env` file in the project root:

```bash
# API Configuration
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
SECRET_KEY=your-super-secret-key-here

# Model Configuration  
MODEL_PATH=./models
FRAUD_THRESHOLD=0.5
ENSEMBLE_WEIGHTS=0.7,0.3  # ML model weight, Rule engine weight

# Rule Engine Thresholds
MAX_AMOUNT_THRESHOLD=5000.0
MIDNIGHT_HOURS=0,1,2,3,4,5
SUSPICIOUS_MERCHANTS=atm,cash,unknown,venmo,paypal

# Notification Configuration (for SafeSplitX integration)
WEBHOOK_URL=https://safesplitx-api.com/webhooks/fraud-alert
KAFKA_BOOTSTRAP_SERVERS=localhost:9092
KAFKA_TOPIC=fraud-alerts
NOTIFICATION_RETRY_ATTEMPTS=3

# Database (for historical data)
DATABASE_URL=postgresql://user:pass@localhost:5432/safesplitx_fraud

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Performance
RATE_LIMIT_PER_MINUTE=100
MAX_WORKERS=4
BATCH_SIZE=100
```

### **Model Parameters**
Customize fraud detection sensitivity:

```python
# In fraud_detection/models/rule_engine.py
AMOUNT_MULTIPLIER_THRESHOLD = 5.0  # Flag if 5x group average
PARTICIPANT_MISMATCH_TOLERANCE = 0.01  # $0.01 tolerance for amount mismatches
SUSPICIOUS_HOUR_THRESHOLD = [0, 1, 2, 3, 4, 5]  # Midnight hours
WEEKEND_LATE_THRESHOLD = 22  # 10 PM on weekends
```

---

## 🔌 **Integration with SafeSplitX Components**

### **1. Frontend Integration (React/Vue)**

```javascript
// fraud-detection-client.js
class FraudDetectionClient {
  constructor(baseUrl = 'http://localhost:8000') {
    this.baseUrl = baseUrl;
  }

  async checkExpense(expense) {
    try {
      const response = await fetch(`${this.baseUrl}/predict`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.FRAUD_API_KEY}`
        },
        body: JSON.stringify(expense)
      });
      
      const result = await response.json();
      
      // Handle suspicious expenses
      if (result.is_suspicious) {
        this.showFraudWarning(result.explanations, result.reasons);
      }
      
      return result;
    } catch (error) {
      console.error('Fraud check failed:', error);
      return null;
    }
  }

  showFraudWarning(explanations, reasons) {
    // Display fraud warning to user with explanations
    const warningMessage = `
      ⚠️ This expense has been flagged as potentially suspicious.
      
      Reasons:
      ${reasons.map(r => `• ${r.message}`).join('\n')}
      
      Please review the details and contact support if you believe this is an error.
    `;
    
    // Show modal or notification
    alert(warningMessage);
  }
}

// Usage in expense form
const fraudClient = new FraudDetectionClient();

async function submitExpense(expenseData) {
  // Check for fraud before submitting
  const fraudCheck = await fraudClient.checkExpense(expenseData);
  
  if (fraudCheck && !fraudCheck.is_suspicious) {
    // Proceed with normal expense submission
    await submitToSafeSplitX(expenseData);
  } else {
    // Handle suspicious expense
    showReviewDialog(expenseData, fraudCheck);
  }
}
```

### **2. Backend Integration (Node.js/Express)**

```javascript
// fraud-middleware.js
const axios = require('axios');

const fraudDetectionMiddleware = async (req, res, next) => {
  try {
    // Extract expense data from request
    const expense = {
      expense_id: req.body.expense_id,
      group_id: req.body.group_id,
      payer_id: req.user.id,
      participants: req.body.participants,
      amount: req.body.amount,
      currency: req.body.currency,
      merchant: req.body.merchant,
      category: req.body.category,
      timestamp: new Date().toISOString()
    };

    // Check with fraud detection service
    const fraudResponse = await axios.post(
      `${process.env.FRAUD_API_URL}/predict`,
      expense,
      {
        headers: {
          'Authorization': `Bearer ${process.env.FRAUD_API_KEY}`,
          'Content-Type': 'application/json'
        },
        timeout: 5000
      }
    );

    const fraudResult = fraudResponse.data;

    // Add fraud information to request
    req.fraudAnalysis = fraudResult;

    // Handle suspicious expenses
    if (fraudResult.is_suspicious) {
      // Log for admin review
      console.log('Suspicious expense detected:', {
        expense_id: expense.expense_id,
        user_id: req.user.id,
        fraud_score: fraudResult.anomaly_score,
        reasons: fraudResult.reasons
      });

      // Optionally block or require additional verification
      if (fraudResult.anomaly_score > 0.8) {
        return res.status(400).json({
          error: 'Expense requires manual review',
          fraud_analysis: fraudResult
        });
      }
    }

    next();
  } catch (error) {
    console.error('Fraud detection failed:', error);
    // Continue without fraud check in case of service failure
    req.fraudAnalysis = { error: 'Fraud detection unavailable' };
    next();
  }
};

// Use in expense routes
app.post('/api/expenses', fraudDetectionMiddleware, async (req, res) => {
  // Create expense with fraud analysis attached
  const expense = await createExpense({
    ...req.body,
    fraud_analysis: req.fraudAnalysis
  });
  
  res.json(expense);
});
```

### **3. Settlements Integration**

```python
# settlements_fraud_check.py
import asyncio
import httpx
from typing import List, Dict

class SettlementFraudChecker:
    def __init__(self, fraud_api_url: str, api_key: str):
        self.fraud_api_url = fraud_api_url
        self.api_key = api_key
    
    async def validate_expenses_batch(self, expenses: List[Dict]) -> Dict:
        """Validate a batch of expenses before settlement processing."""
        async with httpx.AsyncClient() as client:
            try:
                response = await client.post(
                    f"{self.fraud_api_url}/predict/batch",
                    json=expenses,
                    headers={"Authorization": f"Bearer {self.api_key}"},
                    timeout=30.0
                )
                response.raise_for_status()
                results = response.json()
                
                # Categorize results
                safe_expenses = []
                suspicious_expenses = []
                
                for expense, fraud_result in zip(expenses, results):
                    if fraud_result['is_suspicious']:
                        suspicious_expenses.append({
                            'expense': expense,
                            'fraud_analysis': fraud_result
                        })
                    else:
                        safe_expenses.append(expense)
                
                return {
                    'safe_count': len(safe_expenses),
                    'suspicious_count': len(suspicious_expenses),
                    'safe_expenses': safe_expenses,
                    'suspicious_expenses': suspicious_expenses,
                    'total_processed': len(expenses)
                }
                
            except Exception as e:
                print(f"Batch fraud check failed: {e}")
                return {'error': str(e), 'expenses': expenses}
    
    async def process_settlement(self, group_id: str):
        """Process group settlement with fraud validation."""
        # Get pending expenses for settlement
        pending_expenses = await get_pending_expenses(group_id)
        
        # Validate expenses for fraud
        fraud_results = await self.validate_expenses_batch(pending_expenses)
        
        if fraud_results.get('suspicious_count', 0) > 0:
            # Hold suspicious expenses for review
            await hold_suspicious_expenses(fraud_results['suspicious_expenses'])
            
            # Notify admins
            await notify_settlement_fraud(group_id, fraud_results)
            
            # Process only safe expenses
            await process_safe_settlement(fraud_results['safe_expenses'])
        else:
            # Process all expenses normally
            await process_normal_settlement(pending_expenses)
```

### **4. Blockchain Integration**

```solidity
// FraudDetection.sol
pragma solidity ^0.8.0;

contract SafeSplitXFraudDetection {
    struct FraudAnalysis {
        uint256 anomalyScore;  // Score * 1000 for precision
        bool isSuspicious;
        uint256 timestamp;
        string modelVersion;
    }
    
    mapping(bytes32 => FraudAnalysis) public expenseAnalysis;
    
    event ExpenseAnalyzed(bytes32 indexed expenseId, uint256 anomalyScore, bool isSuspicious);
    event SuspiciousActivity(bytes32 indexed expenseId, address indexed user, uint256 anomalyScore);
    
    function recordFraudAnalysis(
        bytes32 expenseId,
        uint256 anomalyScore,
        bool isSuspicious,
        string memory modelVersion
    ) external {
        expenseAnalysis[expenseId] = FraudAnalysis({
            anomalyScore: anomalyScore,
            isSuspicious: isSuspicious,
            timestamp: block.timestamp,
            modelVersion: modelVersion
        });
        
        emit ExpenseAnalyzed(expenseId, anomalyScore, isSuspicious);
        
        if (isSuspicious) {
            emit SuspiciousActivity(expenseId, msg.sender, anomalyScore);
        }
    }
    
    function getFraudAnalysis(bytes32 expenseId) external view returns (FraudAnalysis memory) {
        return expenseAnalysis[expenseId];
    }
}
```

---

## 📊 **Monitoring & Analytics**

### **1. Health Monitoring**
```bash
# Check API health
curl http://localhost:8000/health

# Check model performance
curl http://localhost:8000/metrics

# View recent predictions
curl http://localhost:8000/admin/recent-predictions
```

### **2. Logging Analysis**
The system uses structured JSON logging. Example log entry:
```json
{
  "timestamp": "2025-09-24T11:45:00Z",
  "level": "INFO",
  "module": "fraud_detection.api.routes",
  "message": "Prediction completed",
  "expense_id": "exp_12345",
  "fraud_score": 0.342,
  "is_suspicious": false,
  "processing_time_ms": 187,
  "model_version": "20250924_060541"
}
```

### **3. Performance Metrics**
Key metrics to monitor:
- **Response Time**: Target < 200ms
- **Accuracy**: Monitor precision/recall
- **False Positive Rate**: Keep < 5%
- **API Uptime**: Target 99.9%
- **Model Drift**: Retrain when accuracy drops

---

## 🔄 **Model Training & Updates**

### **1. Training New Models**
```bash
# Generate training data from SafeSplitX database
python scripts/export_training_data.py --output data/safesplitx_data.csv

# Train models with new data
python scripts/train_models.py --data data/safesplitx_data.csv --models isolation_forest autoencoder

# Evaluate model performance
python scripts/evaluate_models.py --test-data data/test_set.csv

# Deploy new model version
python scripts/deploy_model.py --version 20250924_120000
```

### **2. A/B Testing Framework**
```python
# Test new models against production traffic
python scripts/ab_test.py --model-a current --model-b candidate --traffic-split 0.1
```

### **3. Continuous Learning**
Set up automated retraining:
```bash
# Cron job for daily model updates
0 2 * * * /path/to/venv/bin/python /path/to/scripts/daily_retrain.py
```

---

## 🚨 **Troubleshooting Guide**

### **Common Issues**

1. **Models Not Loading**
   ```bash
   # Check model directory
   ls -la models/
   
   # Retrain if missing
   python scripts/train_models.py --data data/training_data.csv
   ```

2. **API Not Responding**
   ```bash
   # Check if service is running
   ps aux | grep uvicorn
   
   # Check logs
   tail -f logs/fraud_detection.log
   
   # Restart service
   pkill -f uvicorn
   uvicorn fraud_detection.api.main:app --reload
   ```

3. **High False Positive Rate**
   ```bash
   # Adjust fraud threshold in .env
   FRAUD_THRESHOLD=0.7  # Increase for fewer false positives
   
   # Retune rule engine weights
   ENSEMBLE_WEIGHTS=0.5,0.5  # Balance ML and rules equally
   ```

4. **Performance Issues**
   ```bash
   # Scale horizontally
   docker-compose scale fraud-detection=3
   
   # Check resource usage
   docker stats fraud-detection
   
   # Optimize batch size
   BATCH_SIZE=50  # Reduce if memory constrained
   ```

### **Getting Help**
- **Issues**: Create GitHub issue with detailed logs
- **Documentation**: Check `/docs` endpoint when API is running
- **Community**: SafeSplitX Discord/Slack channel
- **Email**: support@safesplitx.com

---

## 🤝 **Contributing to SafeSplitX**

### **Development Workflow**
1. Fork the SafeSplitX repository
2. Create a feature branch: `git checkout -b feature/fraud-improvements`
3. Make your changes and add tests
4. Run the test suite: `pytest tests/`
5. Submit a pull request with detailed description

### **Code Standards**
- Python 3.10+ with type hints
- Black code formatting
- pytest for testing
- Comprehensive docstrings
- Follow SafeSplitX coding guidelines

### **Testing Requirements**
```bash
# Run full test suite
pytest tests/ --cov=fraud_detection --cov-report=html

# Run specific test categories
pytest tests/test_api.py -v
pytest tests/test_models.py -v
pytest tests/test_integration.py -v
```

---

## 📈 **Roadmap & Future Enhancements**

### **Planned Features**
- [ ] **Advanced ML Models**: XGBoost, Neural Networks
- [ ] **Real-time Streaming**: Kafka stream processing
- [ ] **Graph Analysis**: Social network fraud detection
- [ ] **Mobile SDK**: iOS/Android fraud detection libraries
- [ ] **Multi-currency Support**: Enhanced international fraud detection
- [ ] **Behavioral Analysis**: User behavior pattern learning

### **Performance Goals**
- [ ] Sub-100ms response time
- [ ] 99.9% API uptime
- [ ] Support 10,000+ requests/minute
- [ ] < 2% false positive rate

---

## 📄 **License & Credits**

### **License**
This fraud detection module is licensed under the MIT License as part of the SafeSplitX project.

### **Contributors**
- **Lead Developer**: AI & Fraud Detection Module
- **SafeSplitX Team**: Integration and testing support
- **Community Contributors**: Bug reports and feature suggestions

### **Acknowledgments**
- scikit-learn team for machine learning tools
- FastAPI team for the excellent web framework
- SafeSplitX community for feedback and testing

---

## 📞 **Support & Contact**

### **Technical Support**
- **GitHub Issues**: https://github.com/Kasa1905/SafeSplitX/issues
- **Documentation**: Available at API `/docs` endpoint
- **Wiki**: https://github.com/Kasa1905/SafeSplitX/wiki

### **SafeSplitX Project**
- **Main Repository**: https://github.com/Kasa1905/SafeSplitX
- **Project Lead**: [Project Lead Contact]
- **Community**: [Discord/Slack Link]

---

## 🎯 **Getting Started Checklist**

- [ ] Clone SafeSplitX repository
- [ ] Set up Python environment
- [ ] Install dependencies
- [ ] Configure environment variables
- [ ] Generate training data
- [ ] Train initial models
- [ ] Start API server
- [ ] Test with sample requests
- [ ] Integrate with SafeSplitX frontend
- [ ] Set up monitoring and alerting
- [ ] Configure CI/CD pipeline
- [ ] Deploy to production environment

**Welcome to the SafeSplitX AI & Fraud Detection Module! 🚀**

*Making group expense sharing safer, one prediction at a time.*
