# SafeSplitX Fraud Detection API Documentation

## 🔗 Base URL
```
Production: https://api.safesplitx.com/fraud
Development: http://localhost:8000
```

## 🔐 Authentication
All API requests require authentication using Bearer token:
```bash
Authorization: Bearer YOUR_API_KEY
```

## 📋 API Endpoints

### **1. Health Check**
Check service status and model information.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "healthy",
  "model_version": "20250924_120000",
  "last_trained_at": "2025-09-24T12:00:00Z",
  "uptime_seconds": 3600.0,
  "models_loaded": ["isolation_forest", "rule_engine", "ensemble"]
}
```

---

### **2. Single Expense Fraud Detection**
Analyze a single expense for fraud indicators.

**Endpoint:** `POST /predict`

**Request Body:**
```json
{
  "expense_id": "exp_abc123",
  "group_id": "grp_xyz789",
  "payer_id": "user_123",
  "participants": [
    {
      "user_id": "user_123",
      "amount": 25.50
    },
    {
      "user_id": "user_456", 
      "amount": 24.50
    }
  ],
  "amount": 50.00,
  "currency": "USD",
  "merchant": "Pizza Palace",
  "category": "food",
  "description": "Team lunch",
  "timestamp": "2025-09-24T18:30:00Z"
}
```

**Response:**
```json
{
  "expense_id": "exp_abc123",
  "anomaly_score": 0.342,
  "is_suspicious": false,
  "confidence": 0.89,
  "model_version": "20250924_120000",
  "reasons": [],
  "explanation": [
    {
      "feature_name": "amount",
      "contribution": 0.145,
      "value": 50.0,
      "description": "Amount is within normal range"
    },
    {
      "feature_name": "hour_of_day",
      "contribution": -0.089,
      "value": 18,
      "description": "Normal business hours"
    }
  ],
  "processing_time_ms": 187,
  "timestamp": "2025-09-24T18:30:15Z"
}
```

**Suspicious Expense Example:**
```json
{
  "expense_id": "exp_def456",
  "anomaly_score": 0.782,
  "is_suspicious": true,
  "confidence": 0.94,
  "model_version": "20250924_120000",
  "reasons": [
    {
      "rule_name": "excessive_amount",
      "message": "Amount significantly exceeds group average",
      "severity": "HIGH",
      "details": {
        "amount": 2500.0,
        "group_average": 45.0,
        "multiplier": 55.6
      }
    },
    {
      "rule_name": "suspicious_timing",
      "message": "Transaction occurred at unusual hour",
      "severity": "MEDIUM", 
      "details": {
        "hour": 2,
        "is_weekend": true
      }
    }
  ],
  "explanation": [
    {
      "feature_name": "amount",
      "contribution": 0.456,
      "value": 2500.0,
      "description": "Unusually high amount"
    },
    {
      "feature_name": "hour_of_day",
      "contribution": 0.234,
      "value": 2,
      "description": "Late night transaction"
    }
  ],
  "processing_time_ms": 203,
  "timestamp": "2025-09-24T02:15:30Z"
}
```

---

### **3. Batch Expense Processing**
Analyze multiple expenses simultaneously for better performance.

**Endpoint:** `POST /predict/batch`

**Request Body:**
```json
[
  {
    "expense_id": "exp_001",
    "group_id": "grp_abc",
    // ... expense data
  },
  {
    "expense_id": "exp_002", 
    "group_id": "grp_abc",
    // ... expense data
  }
]
```

**Response:**
```json
[
  {
    "expense_id": "exp_001",
    "anomaly_score": 0.234,
    "is_suspicious": false,
    // ... prediction details
  },
  {
    "expense_id": "exp_002",
    "anomaly_score": 0.678,
    "is_suspicious": true,
    // ... prediction details
  }
]
```

---

### **4. Model Training**
Trigger model retraining with new data (Admin only).

**Endpoint:** `POST /train`

**Request Body:**
```json
{
  "data_source": "database",
  "model_types": ["isolation_forest", "autoencoder"],
  "validation_split": 0.2,
  "hyperparameter_tuning": true
}
```

**Response:**
```json
{
  "training_id": "train_20250924_120000",
  "status": "started",
  "estimated_duration_minutes": 15,
  "models_to_train": ["isolation_forest", "autoencoder"],
  "data_samples": 10000
}
```

---

### **5. Training Status**
Check training progress (Admin only).

**Endpoint:** `GET /train/{training_id}/status`

**Response:**
```json
{
  "training_id": "train_20250924_120000", 
  "status": "completed",
  "progress": 100,
  "started_at": "2025-09-24T12:00:00Z",
  "completed_at": "2025-09-24T12:12:30Z",
  "results": {
    "isolation_forest": {
      "accuracy": 0.924,
      "precision": 0.891,
      "recall": 0.876,
      "f1_score": 0.883
    }
  },
  "new_model_version": "20250924_121230"
}
```

---

### **6. Performance Metrics**
Get API and model performance metrics.

**Endpoint:** `GET /metrics`

**Response:**
```json
{
  "api_metrics": {
    "requests_per_minute": 150,
    "average_response_time_ms": 189,
    "error_rate_percent": 0.02
  },
  "model_metrics": {
    "predictions_today": 1250,
    "suspicious_rate_percent": 3.2,
    "model_accuracy": 0.924,
    "false_positive_rate": 0.048
  },
  "system_metrics": {
    "cpu_usage_percent": 45.2,
    "memory_usage_mb": 1024,
    "disk_usage_percent": 23.1
  }
}
```

---

### **7. Historical Analysis**
Get fraud analysis for past expenses (Admin only).

**Endpoint:** `GET /analytics/history`

**Query Parameters:**
- `group_id` - Filter by group
- `start_date` - Start date (ISO format)
- `end_date` - End date (ISO format)
- `suspicious_only` - Show only flagged expenses

**Response:**
```json
{
  "total_expenses": 1500,
  "suspicious_expenses": 48,
  "fraud_rate_percent": 3.2,
  "trends": {
    "weekly_fraud_rate": [2.1, 2.8, 3.2, 4.1],
    "top_fraud_patterns": [
      "excessive_amount",
      "suspicious_timing",
      "merchant_anomaly"
    ]
  },
  "expenses": [
    {
      "expense_id": "exp_123",
      "fraud_score": 0.78,
      "is_suspicious": true,
      "detected_at": "2025-09-20T14:30:00Z"
    }
  ]
}
```

## 🔗 Webhook Integration

### **Fraud Alert Webhook**
When a suspicious expense is detected, the system can send webhooks to configured endpoints.

**Webhook URL Configuration:**
```bash
WEBHOOK_URL=https://safesplitx.com/api/webhooks/fraud-alert
```

**Webhook Payload:**
```json
{
  "event": "fraud_detected",
  "timestamp": "2025-09-24T18:45:00Z",
  "expense": {
    "expense_id": "exp_abc123",
    "group_id": "grp_xyz789",
    "amount": 2500.0,
    "payer_id": "user_456"
  },
  "fraud_analysis": {
    "anomaly_score": 0.832,
    "confidence": 0.95,
    "reasons": [
      {
        "rule_name": "excessive_amount",
        "severity": "HIGH"
      }
    ]
  },
  "suggested_actions": [
    "require_additional_verification",
    "notify_group_admins",
    "flag_for_manual_review"
  ]
}
```

**Webhook Verification:**
```http
X-Signature: sha256=abc123def456...
X-Timestamp: 1640995200
```

## 📝 Request/Response Schemas

### **ExpenseData Schema**
```json
{
  "expense_id": "string (required)",
  "group_id": "string (required)", 
  "payer_id": "string (required)",
  "participants": [
    {
      "user_id": "string (required)",
      "amount": "number (required, > 0)"
    }
  ],
  "amount": "number (required, > 0)",
  "currency": "string (optional, default: USD)",
  "merchant": "string (optional)",
  "category": "string (optional)",
  "description": "string (optional)",
  "timestamp": "string (ISO 8601, optional, default: current time)",
  "location": {
    "latitude": "number (optional)",
    "longitude": "number (optional)",
    "country": "string (optional)"
  }
}
```

### **FraudPrediction Schema**
```json
{
  "expense_id": "string",
  "anomaly_score": "number (0-1)",
  "is_suspicious": "boolean",
  "confidence": "number (0-1)",
  "model_version": "string",
  "reasons": [
    {
      "rule_name": "string",
      "message": "string", 
      "severity": "LOW|MEDIUM|HIGH",
      "details": "object"
    }
  ],
  "explanation": [
    {
      "feature_name": "string",
      "contribution": "number",
      "value": "number|string",
      "description": "string"
    }
  ],
  "processing_time_ms": "number",
  "timestamp": "string (ISO 8601)"
}
```

## ⚠️ Error Handling

### **HTTP Status Codes**
- `200` - Success
- `400` - Bad Request (invalid input)
- `401` - Unauthorized (invalid API key)
- `422` - Unprocessable Entity (validation error)
- `429` - Too Many Requests (rate limited)
- `500` - Internal Server Error
- `503` - Service Unavailable (maintenance mode)

### **Error Response Format**
```json
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Invalid expense data provided",
    "details": {
      "field": "amount",
      "issue": "Amount must be greater than 0"
    }
  },
  "request_id": "req_abc123",
  "timestamp": "2025-09-24T12:00:00Z"
}
```

### **Common Error Codes**
- `INVALID_API_KEY` - Authentication failed
- `VALIDATION_ERROR` - Request validation failed
- `MODEL_NOT_LOADED` - ML model not available
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `INTERNAL_ERROR` - Server error

## 🚀 Integration Examples

### **JavaScript/TypeScript Client**
```typescript
class FraudDetectionClient {
  constructor(
    private baseUrl: string,
    private apiKey: string
  ) {}

  async checkExpense(expense: ExpenseData): Promise<FraudPrediction> {
    const response = await fetch(`${this.baseUrl}/predict`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(expense)
    });

    if (!response.ok) {
      throw new Error(`Fraud check failed: ${response.statusText}`);
    }

    return response.json();
  }

  async checkBatch(expenses: ExpenseData[]): Promise<FraudPrediction[]> {
    const response = await fetch(`${this.baseUrl}/predict/batch`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(expenses)
    });

    return response.json();
  }
}
```

### **Python Client**
```python
import httpx
from typing import List, Dict, Any

class FraudDetectionClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }

    async def check_expense(self, expense: Dict[str, Any]) -> Dict[str, Any]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/predict",
                json=expense,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()

    async def check_batch(self, expenses: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{self.base_url}/predict/batch",
                json=expenses,
                headers=self.headers
            )
            response.raise_for_status()
            return response.json()
```

## 📊 Rate Limiting

### **Rate Limits**
- **Standard**: 100 requests/minute per API key
- **Batch**: 10 requests/minute (max 100 expenses per batch)
- **Training**: 1 request/hour per API key

### **Rate Limit Headers**
```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 85
X-RateLimit-Reset: 1640995200
```

## 🔧 Configuration Options

### **Fraud Thresholds**
Customize fraud detection sensitivity:
```bash
# Environment variables
FRAUD_THRESHOLD=0.5          # Default threshold (0-1)
ENSEMBLE_WEIGHTS=0.7,0.3     # ML vs Rules weight
HIGH_RISK_THRESHOLD=0.8      # Auto-block threshold
```

### **Model Configuration**
```bash
# Model parameters
MODEL_UPDATE_INTERVAL=24h    # Auto-retrain frequency
FEATURE_IMPORTANCE_THRESHOLD=0.01  # Feature selection
ANOMALY_CONTAMINATION=0.05   # Expected fraud rate
```

## 📈 Performance Optimization

### **Caching**
- Model predictions cached for 5 minutes
- Feature engineering results cached
- Use `Cache-Control` headers appropriately

### **Batch Processing**
- Process up to 100 expenses per batch request
- Optimal batch size: 20-50 expenses
- Parallel processing for large batches

### **Response Times**
- Single prediction: < 200ms (95th percentile)
- Batch processing: < 50ms per expense
- Health check: < 50ms

This comprehensive API documentation ensures your SafeSplitX team can easily integrate and use the fraud detection module! 🚀
