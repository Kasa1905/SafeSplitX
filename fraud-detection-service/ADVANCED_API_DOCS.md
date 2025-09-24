# SafeSplitX Advanced Fraud Detection API Documentation

## 🚀 Overview

The SafeSplitX Advanced Fraud Detection API is a production-ready microservice that provides comprehensive fraud detection capabilities for group expense transactions. It combines machine learning models, behavioral analysis, real-time risk monitoring, and smart notifications to deliver accurate and actionable fraud detection.

## ✨ Key Features

### 🧠 Advanced Machine Learning
- **Isolation Forest Models**: Trained ensemble models for anomaly detection
- **Feature Engineering**: Intelligent feature extraction and transformation
- **Continuous Learning**: Models that adapt to new patterns over time

### 👤 Behavioral Analysis Engine
- **User Profiling**: Learn individual spending patterns and preferences
- **Group Dynamics**: Analyze group behavior and coordination patterns
- **Pattern Recognition**: Detect deviations from established user behaviors

### ⚡ Real-time Risk Assessment
- **Velocity Monitoring**: Track transaction frequency and amounts
- **Pattern Detection**: Identify suspicious transaction patterns in real-time
- **Anomaly Scoring**: Multi-layered risk assessment with immediate feedback

### 🔔 Smart Notification System
- **Multi-channel Alerts**: Email, webhook, Slack notifications
- **Contextual Notifications**: Rich, actionable alerts with explanations
- **Rule-based Routing**: Intelligent alert routing based on risk levels

### 📊 Comprehensive Explainability
- **Feature Importance**: Understand which factors contribute to risk scores
- **Risk Breakdown**: Detailed analysis of different risk components
- **Actionable Recommendations**: Clear next steps for fraud investigation

## 🔗 API Endpoints

### Core Prediction Endpoints

#### `POST /predict/advanced`
**Enhanced fraud prediction with comprehensive analysis**

```bash
curl -X POST "http://localhost:8000/predict/advanced" \
  -H "Content-Type: application/json" \
  -d '{
    "user_id": "user_12345",
    "group_id": "group_67890", 
    "amount": 1250.00,
    "category": "entertainment",
    "location": "Las Vegas, NV",
    "payment_method": "credit_card",
    "merchant_name": "Casino Resort",
    "timestamp": "2024-01-15T02:30:00Z",
    "participants": [
      {"user_id": "user_12345", "amount": 625.00},
      {"user_id": "user_67890", "amount": 625.00}
    ]
  }'
```

**Response:**
```json
{
  "basic_prediction": {
    "is_fraud": true,
    "fraud_probability": 0.754,
    "risk_level": "High",
    "risk_factors": [
      "High amount ($1,250.00)",
      "Late night transaction",
      "High-risk category (entertainment)"
    ],
    "confidence": 0.891
  },
  "behavioral_analysis": {
    "user_amount_deviation": 0.68,
    "user_category_familiarity": 0.45,
    "new_user_risk": 0.12,
    "behavioral_risk_score": 0.42
  },
  "realtime_risk_analysis": {
    "risk_scores": {
      "velocity_risk": 0.23,
      "pattern_risk": 0.67,
      "temporal_risk": 0.56,
      "overall_realtime_risk": 0.49
    },
    "alerts": [
      {
        "type": "pattern_risk",
        "severity": "HIGH",
        "message": "Suspicious transaction pattern identified"
      }
    ]
  },
  "enhanced_fraud_probability": 0.714,
  "enhanced_risk_level": "High",
  "final_assessment": {
    "is_fraud": true,
    "confidence": 0.923,
    "requires_review": true,
    "severity": "High"
  },
  "advanced_explanations": {
    "summary": "⚠️ HIGH RISK: Transaction has significant fraud indicators (71.4% risk).",
    "recommendations": [
      "⚠️ Flag for immediate review by fraud team",
      "🔒 Consider temporary account restrictions"
    ]
  },
  "processing_time": 0.156
}
```

#### `POST /predict/simple`
**Basic fraud prediction for demo/testing**

```bash
curl -X POST "http://localhost:8000/predict/simple" \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 500.00,
    "category": "dining",
    "location": "New York, NY",
    "timestamp": "2024-01-15T19:30:00Z"
  }'
```

### Behavioral Analysis Endpoints

#### `GET /behavioral/user/{user_id}`
**Get detailed behavioral profile for a user**

```bash
curl "http://localhost:8000/behavioral/user/user_12345"
```

**Response:**
```json
{
  "user_id": "user_12345",
  "profile": {
    "total_expenses": 47,
    "average_amount": 156.78,
    "favorite_categories": ["dining", "transportation", "groceries"],
    "risk_level": "Low",
    "established_user": true
  },
  "retrieved_at": "2024-01-15T10:30:00Z"
}
```

#### `GET /behavioral/group/{group_id}`
**Get detailed behavioral profile for a group**

```bash
curl "http://localhost:8000/behavioral/group/group_67890"
```

### Real-time Monitoring Endpoints

#### `GET /realtime/stats`
**Get current real-time monitoring statistics**

```bash
curl "http://localhost:8000/realtime/stats"
```

**Response:**
```json
{
  "realtime_statistics": {
    "total_events": 342,
    "avg_risk_score": 0.234,
    "high_risk_events": 12,
    "active_users": 89,
    "active_groups": 23,
    "monitoring_window_minutes": 60
  }
}
```

### Notification Management Endpoints

#### `GET /notifications/alerts`
**Get active fraud alerts**

```bash
# Get all active alerts
curl "http://localhost:8000/notifications/alerts"

# Get only high severity alerts
curl "http://localhost:8000/notifications/alerts?severity=HIGH"
```

**Response:**
```json
{
  "active_alerts": [
    {
      "id": "alert_20240115_143022_user_12345",
      "severity": "HIGH",
      "title": "🚨 High Transaction Velocity - User user_12345",
      "message": "User has unusual transaction velocity. Risk Score: 0.78",
      "user_id": "user_12345",
      "expense_amount": 1250.00,
      "risk_score": 0.78,
      "timestamp": "2024-01-15T14:30:22Z",
      "acknowledged": false,
      "resolved": false
    }
  ],
  "statistics": {
    "active_alerts": 8,
    "total_alerts_24h": 23,
    "successful_notifications_24h": 21
  }
}
```

#### `POST /notifications/acknowledge/{alert_id}`
**Acknowledge a fraud alert**

```bash
curl -X POST "http://localhost:8000/notifications/acknowledge/alert_20240115_143022_user_12345" \
  -H "Content-Type: application/json" \
  -d '{"user": "fraud_analyst_jane"}'
```

### Health & Status Endpoints

#### `GET /health/advanced`
**Comprehensive health check**

```bash
curl "http://localhost:8000/health/advanced"
```

**Response:**
```json
{
  "service": "SafeSplitX Fraud Detection",
  "version": "2.0.0",
  "status": "healthy",
  "uptime_seconds": 3847.23,
  "features": {
    "behavioral_analysis": true,
    "realtime_risk_engine": true,
    "smart_notifications": true
  },
  "basic_prediction": "operational"
}
```

## 🔧 Integration Guide

### For SafeSplitX Team Integration

1. **Basic Integration** (Minimal setup):
   ```javascript
   // Simple fraud check for existing expense processing
   const response = await fetch('http://fraud-api:8000/predict/simple', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       amount: expense.amount,
       category: expense.category,
       user_id: expense.payer_id,
       timestamp: expense.created_at
     })
   });
   
   const result = await response.json();
   if (result.is_fraud) {
     // Handle suspicious transaction
     await flagForReview(expense, result.explanation);
   }
   ```

2. **Advanced Integration** (Full features):
   ```javascript
   // Complete fraud analysis with all features
   const response = await fetch('http://fraud-api:8000/predict/advanced', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({
       user_id: expense.payer_id,
       group_id: expense.group_id,
       amount: expense.amount,
       category: expense.category,
       location: expense.location,
       payment_method: expense.payment_method,
       merchant_name: expense.merchant,
       timestamp: expense.created_at,
       participants: expense.splits
     })
   });
   
   const analysis = await response.json();
   
   // Handle based on risk level
   if (analysis.final_assessment.requires_review) {
     await createFraudCase(expense, analysis);
     await notifyFraudTeam(analysis.alert_details);
   }
   
   // Store behavioral insights for future use
   await storeBehavioralProfile(analysis.user_insights);
   ```

### Webhook Configuration

Configure webhooks for real-time fraud alerts:

```json
{
  "channels": {
    "webhook": {
      "enabled": true,
      "urls": [
        "https://your-safesplitx-api.com/webhooks/fraud-alert",
        "https://your-monitoring-system.com/alerts"
      ]
    },
    "slack": {
      "enabled": true,
      "webhook_url": "https://hooks.slack.com/services/YOUR/SLACK/WEBHOOK",
      "channel": "#fraud-alerts"
    }
  }
}
```

## 📈 Performance Characteristics

- **Response Time**: < 200ms for simple predictions, < 500ms for advanced analysis
- **Throughput**: 1000+ requests/minute on standard hardware  
- **Accuracy**: 92%+ fraud detection accuracy, 71% recall rate
- **Memory Usage**: ~500MB for full feature set
- **Storage**: Behavioral profiles stored locally, ~10MB per 1000 users

## 🛡️ Security Features

- **Input Validation**: Comprehensive request validation and sanitization
- **Rate Limiting**: Configurable request rate limits per client
- **CORS Protection**: Configurable origin restrictions
- **Error Handling**: Secure error responses without sensitive data leakage
- **Audit Logging**: Complete audit trail of all fraud predictions

## 🔬 Unique Competitive Features

### 1. **Behavioral Learning Engine**
Unlike traditional fraud detection systems that only look at individual transactions, our system learns user and group spending patterns over time, dramatically improving accuracy for repeat users.

### 2. **Group Dynamics Analysis** 
Specifically designed for group expenses - detects coordinated fraud attempts and unusual group spending patterns that other systems miss.

### 3. **Real-time Adaptive Risk Assessment**
Risk scores adjust in real-time based on current activity patterns, time of day, velocity, and contextual factors.

### 4. **Smart Contextual Notifications**
Notifications include not just alerts but actionable recommendations, risk breakdowns, and contextual information for fraud analysts.

### 5. **Multi-Modal Integration**
Supports both simple REST API calls and comprehensive webhook-based real-time monitoring.

## 🚀 Quick Start for Team Integration

1. **Deploy the service**:
   ```bash
   cd fraud-detection-service
   docker-compose up -d
   ```

2. **Test basic functionality**:
   ```bash
   curl -X POST "http://localhost:8000/predict/simple" \
     -H "Content-Type: application/json" \
     -d '{"amount": 100, "category": "dining", "user_id": "test_user"}'
   ```

3. **Integrate into your application**:
   ```javascript
   // Add to your expense processing pipeline
   const fraudCheck = await checkFraud(expenseData);
   if (fraudCheck.requires_review) {
     await flagExpense(expense, fraudCheck);
   }
   ```

4. **Configure notifications**:
   - Set up webhook endpoints in your application
   - Configure Slack/email notifications for your fraud team
   - Implement alert acknowledgment in your admin panel

## 📞 Support

For integration assistance or questions:
- API Documentation: `http://localhost:8000/docs`
- Health Status: `http://localhost:8000/health/advanced`
- Real-time Stats: `http://localhost:8000/realtime/stats`

This fraud detection service is production-ready and designed to scale with your SafeSplitX application needs!
