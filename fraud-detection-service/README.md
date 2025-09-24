# SafeSplitX Fraud Detection Service

🛡️ **AI-powered fraud detection microservice for group expense management**

[![Python 3.10+](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.104.1-009688.svg)](https://fastapi.tiangolo.com)
[![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?logo=docker&logoColor=white)](https://www.docker.com/)
[![Accuracy](https://img.shields.io/badge/ML_Accuracy-90%25-brightgreen.svg)](https://github.com/Kasa1905/SafeSplitX)

## 🎯 Overview

The **SafeSplitX Fraud Detection Service** is an intelligent microservice that provides real-time fraud detection for group expenses using a hybrid approach combining Machine Learning models with business rule engines. Designed for seamless integration with the SafeSplitX ecosystem.

## ⚡ Key Features

- **🤖 Hybrid AI System**: ML models + business rules (90% accuracy)
- **🚀 Sub-200ms Response**: Real-time fraud detection API  
- **🔍 Explainable AI**: SHAP-based explanations for every decision
- **📦 Batch Processing**: Handle multiple expenses simultaneously
- **🐳 Production Ready**: Docker, CI/CD, monitoring, and health checks
- **🔗 Easy Integration**: RESTful API with comprehensive documentation

## 🏗️ System Architecture

```
Expense Input → Feature Engineering → ML Ensemble → Rule Engine → Decision + Alerts
                     (17+ features)    (Isolation Forest +     (Business Rules)
                                       Autoencoder)
```

## 🚀 Quick Start

### Prerequisites
- Python 3.10+
- Docker (optional but recommended)

### Setup

1. **Navigate to Service Directory**
   ```bash
   cd fraud-detection-service
   ```

2. **Environment Setup**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

3. **Train Models**
   ```bash
   python train.py
   ```

4. **Start the Service**
   ```bash
   # Option 1: Python directly
   cd fraud_detection && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000 --reload
   
   # Option 2: Docker
   docker-compose up --build
   ```

## 🌐 API Endpoints

### Health Check
```bash
curl http://localhost:8000/health
```

### Single Expense Analysis
```bash
curl -X POST "http://localhost:8000/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "amount": 150.00,
       "category": "restaurant",
       "location": "New York",
       "timestamp": "2024-12-01T19:30:00",
       "participants": ["user1", "user2", "user3"],
       "payment_method": "credit_card"
     }'
```

### Batch Processing
```bash
curl -X POST "http://localhost:8000/predict-batch" \
     -H "Content-Type: application/json" \
     -d '{
       "expenses": [
         {"amount": 50.00, "category": "food", "location": "NYC"},
         {"amount": 200.00, "category": "entertainment", "location": "LA"}
       ]
     }'
```

## 📊 Response Format

```json
{
  "is_fraud": false,
  "fraud_probability": 0.05,
  "risk_score": 12.5,
  "risk_level": "low",
  "explanation": {
    "primary_factors": [
      "Amount within normal range for category",
      "Location matches user pattern"
    ],
    "feature_importance": {
      "amount_zscore": 0.15,
      "location_frequency": 0.08,
      "time_of_day": 0.12
    }
  },
  "timestamp": "2024-12-01T19:35:22Z"
}
```

## 🔧 Configuration

Key configuration options in `fraud_detection/config.py`:

- **Model Thresholds**: Fraud detection sensitivity
- **Feature Engineering**: Enable/disable feature groups
- **Notification Settings**: Alert channels and recipients
- **Performance Tuning**: Batch sizes, timeout settings

## 📈 Performance Metrics

- **Accuracy**: 90%+ on validation set
- **Precision**: 88% (low false positives)
- **Recall**: 85% (catches most fraud)
- **Latency**: <200ms average response time
- **Throughput**: 1000+ requests/minute

## 🧪 Testing

```bash
# Run all tests
python -m pytest tests/ -v

# Test specific endpoint
python -m pytest tests/test_predict_endpoint.py -v

# Test with coverage
python -m pytest tests/ --cov=fraud_detection
```

## 📁 Project Structure

```
fraud-detection-service/
├── fraud_detection/           # Main service package
│   ├── api/                  # FastAPI application
│   ├── models/               # ML models and training
│   ├── utils/                # Utilities and helpers
│   └── data/                 # Data processing
├── tests/                    # Test suite
├── scripts/                  # Utility scripts
├── docs/                     # Documentation
├── Dockerfile               # Container configuration
├── docker-compose.yml       # Multi-service setup
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

## 🔗 Integration with SafeSplitX

This service is designed to integrate seamlessly with the main SafeSplitX application:

1. **API Integration**: RESTful endpoints for real-time fraud checking
2. **Webhook Support**: Automatic notifications for suspicious activities
3. **Shared Database**: Optional integration with SafeSplitX user data
4. **Authentication**: JWT token support for secure access

For detailed integration instructions, see [REPOSITORY_INTEGRATION_GUIDE.md](./REPOSITORY_INTEGRATION_GUIDE.md).

## 📚 Documentation

- **[API Documentation](./API_DOCUMENTATION.md)** - Complete API reference
- **[Deployment Guide](./DEPLOYMENT.md)** - Production deployment instructions
- **[Contributing Guide](./CONTRIBUTING.md)** - Development and contribution guidelines
- **[Project Structure](./PROJECT_STRUCTURE.md)** - Detailed code organization

## 🛠️ Development

### Adding New Features
1. Create feature branch: `git checkout -b feature/new-feature`
2. Implement changes with tests
3. Update documentation
4. Submit pull request

### Model Improvements
1. Add new features in `feature_engineering.py`
2. Train and validate models using `train.py`
3. Update model registry in `models/registry.py`
4. Test performance improvements

## 🚀 Deployment

### Production Deployment
```bash
# Build and deploy with Docker
docker-compose -f docker-compose.prod.yml up -d

# Or using Kubernetes (see DEPLOYMENT.md)
kubectl apply -f k8s/
```

### Monitoring
- Health checks: `/health` and `/ready` endpoints
- Metrics: Prometheus metrics at `/metrics`
- Logs: Structured JSON logging with correlation IDs

## 📞 Support

For questions or issues:
1. Check the [API Documentation](./API_DOCUMENTATION.md)
2. Review [Common Issues](./CONTRIBUTING.md#common-issues)
3. Open an issue in the SafeSplitX repository
4. Contact the development team

## 📄 License

This project is part of SafeSplitX and follows the main project's license terms.

---

**SafeSplitX Team** | Making group expenses safe and transparent 🛡️
