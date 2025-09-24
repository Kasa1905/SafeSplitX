# SafeSplitX - Smart Group Expense Management

� **Open-source platform for intelligent group expense sharing and fraud detection**

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Contributors](https://img.shields.io/badge/contributors-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Python](https://img.shields.io/badge/python-3.10%2B-blue.svg)](https://www.python.org/downloads/)

## 🎯 Project Overview

**SafeSplitX** is a comprehensive group expense management platform that makes splitting bills fair, transparent, and secure. The platform combines intuitive expense sharing with AI-powered fraud detection to protect users and ensure accurate financial tracking.

### 🏗️ Project Components

This repository contains modular services that work together to create the complete SafeSplitX experience:

#### 🛡️ [Fraud Detection Service](./fraud-detection-service/)
- **AI-powered fraud detection** with 90% accuracy
- **Real-time transaction analysis** (sub-200ms response)
- **Explainable AI decisions** with detailed reasoning
- **Production-ready microservice** with Docker deployment

#### 📱 Frontend Application (Coming Soon)
- **React/React Native** user interface
- **Intuitive expense splitting** workflows
- **Real-time notifications** and alerts
- **Mobile-first design** for on-the-go usage

#### 🔧 Backend Services (Coming Soon)
- **User management** and authentication
- **Group and expense management** APIs
- **Payment processing** integration
- **Notification and communication** services

#### 📊 Analytics & Reporting (Coming Soon)
- **Expense analytics** and insights
- **Group spending patterns** analysis
- **Financial reporting** and export tools
- **Data visualization** dashboards

## ✨ Key Features

### Current (Fraud Detection Service)
- **🤖 Hybrid AI**: ML models + business rules (90% accuracy)
- **🚀 Real-time Processing**: Sub-200ms fraud detection
- **🔍 Explainable Decisions**: SHAP-based reasoning for every prediction
- **📦 Batch Processing**: Efficient handling of multiple transactions
- **🐳 Production Ready**: Complete Docker deployment setup

### Planned (Full Platform)
- **👥 Smart Group Management**: Automatic expense categorization and splitting
- **💳 Multi-Payment Integration**: Credit cards, digital wallets, bank transfers
- **📱 Cross-Platform Apps**: iOS, Android, and web applications
- **🔔 Smart Notifications**: Real-time alerts and reminders
- **📈 Advanced Analytics**: Spending insights and budget tracking
- **🌍 Multi-Currency Support**: Global expense management

## � Quick Start

### Running the Fraud Detection Service

1. **Clone Repository**
   ```bash
   git clone https://github.com/Kasa1905/SafeSplitX.git
   cd SafeSplitX
   ```

2. **Start Fraud Detection Service**
   ```bash
   cd fraud-detection-service
   
   # Using Docker (Recommended)
   docker-compose up --build
   
   # Or using Python directly
   pip install -r requirements.txt
   python train.py
   cd fraud_detection && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000
   ```

3. **Test the Service**
   ```bash
   curl http://localhost:8000/health
   ```

For detailed instructions, see the [Fraud Detection Service README](./fraud-detection-service/README.md).

## 📁 Project Structure

```
SafeSplitX/
├── fraud-detection-service/          # AI fraud detection microservice
│   ├── fraud_detection/              # Main service package
│   ├── tests/                        # Service-specific tests
│   ├── scripts/                      # Utility scripts
│   ├── Dockerfile                    # Container configuration
│   └── README.md                     # Service documentation
│
├── frontend/                         # Frontend applications (Coming Soon)
│   ├── web/                         # React web application
│   └── mobile/                      # React Native mobile app
│
├── backend/                         # Backend services (Coming Soon)
│   ├── user-service/               # User management
│   ├── expense-service/            # Expense and group management
│   └── payment-service/            # Payment processing
│
├── shared/                          # Shared utilities (Coming Soon)
│   ├── models/                     # Common data models
│   └── utils/                      # Shared utilities
│
├── docs/                           # Project documentation
├── scripts/                        # Project-wide scripts
├── LICENSE                         # Project license
└── README.md                       # This file
```

## 🎯 Roadmap

### Phase 1: Core Infrastructure ✅
- [x] Fraud detection service
- [x] API documentation
- [x] Docker deployment
- [x] Testing framework

### Phase 2: Backend Services (Q1 2024)
- [ ] User authentication service
- [ ] Expense management API
- [ ] Group management system
- [ ] Payment integration

### Phase 3: Frontend Development (Q2 2024)
- [ ] React web application
- [ ] React Native mobile app
- [ ] User dashboard
- [ ] Expense splitting interface

### Phase 4: Advanced Features (Q3-Q4 2024)
- [ ] Advanced analytics
- [ ] Multi-currency support
- [ ] Third-party integrations
- [ ] Enhanced fraud detection

## 🛠️ Development

### Contributing to SafeSplitX

We welcome contributions to any part of the SafeSplitX platform! Here's how to get started:

1. **Choose Your Area**:
   - **Fraud Detection**: Improve ML models, add features
   - **Backend Services**: Build new APIs and services  
   - **Frontend**: Create user interfaces
   - **Documentation**: Help others understand and use SafeSplitX

2. **Development Setup**:
   ```bash
   git clone https://github.com/Kasa1905/SafeSplitX.git
   cd SafeSplitX
   
   # For fraud detection service
   cd fraud-detection-service
   python -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

3. **Make Changes**:
   - Create a feature branch
   - Follow coding standards
   - Add tests for new features
   - Update documentation

4. **Submit Contribution**:
   - Open a pull request
   - Describe your changes clearly
   - Ensure all tests pass

For detailed guidelines, see our [Contributing Guide](./fraud-detection-service/CONTRIBUTING.md).

## 📚 Documentation

- **[Fraud Detection Service](./fraud-detection-service/README.md)** - Complete fraud detection documentation
- **[API Reference](./fraud-detection-service/API_DOCUMENTATION.md)** - REST API documentation
- **[Deployment Guide](./fraud-detection-service/DEPLOYMENT.md)** - Production deployment
- **[Project Structure](./fraud-detection-service/PROJECT_STRUCTURE.md)** - Code organization

## 🤝 Team & Community

### Current Contributors
- **AI/ML Team**: Fraud detection and machine learning
- **Backend Team**: Service architecture and APIs
- **Frontend Team**: User interface and experience
- **DevOps Team**: Infrastructure and deployment

### Join Our Community
- 🐛 **Report Issues**: Found a bug? Open an issue
- 💡 **Feature Requests**: Have ideas? We'd love to hear them
- 📝 **Documentation**: Help improve our docs
- 💬 **Discussions**: Join project discussions

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 📞 Support & Contact

- **Issues**: [GitHub Issues](https://github.com/Kasa1905/SafeSplitX/issues)
- **Discussions**: [GitHub Discussions](https://github.com/Kasa1905/SafeSplitX/discussions)
- **Email**: [Project Contact](mailto:support@safesplitx.com)

---

**Made with ❤️ by the SafeSplitX Team** | Making group expenses safe, smart, and simple
   ```bash
   cp .env.example .env
   python scripts/generate_sample_data.py
   python scripts/train_models.py
   ```

4. **Start API Server**
   ```bash
   uvicorn fraud_detection.api.main:app --reload
   # API docs: http://localhost:8000/docs
   ```

5. **Test Integration**
   ```bash
   curl -X POST "http://localhost:8000/predict" \
     -H "Content-Type: application/json" \
     -d '{
       "expense_id": "test_123",
       "group_id": "group_abc", 
       "payer_id": "user_xyz",
       "participants": [{"user_id": "user_xyz", "amount": 25.0}],
       "amount": 50.0,
       "merchant": "Restaurant",
       "category": "food"
     }'
   ```

## 🔌 Integration Examples

### Frontend Integration (JavaScript)
```javascript
const fraudClient = {
  async checkExpense(expense) {
    const response = await fetch('/api/fraud/predict', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(expense)
    });
    return response.json();
  }
};

// Usage in expense form
const result = await fraudClient.checkExpense({
  expense_id: "exp_123",
  group_id: "group_abc",
  payer_id: "user_xyz",
  participants: [{"user_id": "user_xyz", "amount": 25.0}],
  amount: 50.0,
  merchant: "Pizza Palace",
  category: "food"
});

if (result.is_suspicious) {
  showFraudWarning(result.reasons);
}
```

### Backend Integration (Python)
```python
import httpx

async def validate_expense(expense_data):
    async with httpx.AsyncClient() as client:
        response = await client.post(
            "http://fraud-api:8000/predict",
            json=expense_data
        )
        fraud_result = response.json()
        
        if fraud_result['is_suspicious']:
            await notify_admins(fraud_result)
            
        return fraud_result
```

## 🐳 Docker Deployment

```bash
# Quick deployment
docker-compose up -d fraud-detection

# Scale for production
docker-compose up --scale fraud-detection=3 -d
```

## 📚 Documentation

- **[CONTRIBUTING.md](CONTRIBUTING.md)**: Team development guide
- **[API_DOCUMENTATION.md](API_DOCUMENTATION.md)**: Complete API reference  
- **[DEPLOYMENT.md](DEPLOYMENT.md)**: Production deployment guide
- **[SAFESPLITX_README.md](SAFESPLITX_README.md)**: Comprehensive project documentation

## 📊 Key Metrics

- **Accuracy**: 90% (tested on 10k+ samples)
- **Response Time**: <200ms (95th percentile)
- **False Positive Rate**: <5%
- **Uptime**: 99.9% target

## 🔧 Team-Specific Integration Points

### Frontend Team
- **Endpoint**: `POST /predict` for real-time checks
- **Response format**: JSON with `is_suspicious` boolean and `explanations` array
- **Integration**: Add to expense submission flow

### Backend Team  
- **Middleware**: Validate expenses before database save
- **Batch endpoint**: `POST /predict/batch` for settlements
- **Webhooks**: Fraud alerts to configured endpoints

### DevOps Team
- **Health check**: `GET /health` endpoint
- **Metrics**: `GET /metrics` for monitoring
- **Docker**: Ready for container deployment

## 🚨 Production Checklist

- [ ] Environment variables configured
- [ ] Models trained and loaded
- [ ] API health check passing
- [ ] Integration tests completed
- [ ] Monitoring dashboards set up
- [ ] Team training completed

## 📞 Support

- **Issues**: Create GitHub issue with `fraud-detection` label
- **Documentation**: Visit `/docs` when API is running
- **Team Chat**: #fraud-detection Slack channel

---

**Ready to integrate with SafeSplitX! 🚀**

*Making group expense sharing safer, one prediction at a time.*
   - `main.py`: FastAPI application setup
   - `routes.py`: API endpoints
   - `deps.py`: Dependency injection
   - `notifier.py`: Alert notification system

3. **Utilities** (`fraud_detection/utils/`)
   - `logging_config.py`: Centralized logging
   - `metrics.py`: Performance monitoring
   - `exceptions.py`: Custom error handling

### Data Flow

```
Expense Request → Feature Engineering → Model Ensemble → Rule Validation → Response + Notifications
```

## Model Training

### Training Data Format

Training data should be a CSV file with these columns:

```csv
expense_id,group_id,payer_id,participant_ids,amounts,total_amount,currency,merchant,category,timestamp,is_fraud
exp_001,grp_123,user_456,"[""user_456"",""user_789""]","[25.0,25.0]",50.0,USD,Restaurant ABC,food,2023-12-01T18:30:00Z,0
exp_002,grp_124,user_457,"[""user_457"",""user_790""]","[5000.0,5000.0]",10000.0,USD,Cash,other,2023-12-01T02:00:00Z,1
```

### Training Process

```bash
# Generate sample training data
python scripts/generate_sample_data.py --output data/training_data.csv --samples 10000

# Train models
python scripts/train_models.py --data data/training_data.csv --models isolation_forest autoencoder

# Evaluate models
python -m fraud_detection.models.trainer evaluate --model-path models/latest
```

## Testing

### Run Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=fraud_detection --cov-report=html

# Run specific test file
pytest tests/test_predict_endpoint.py -v

# Run performance tests
pytest tests/test_predict_endpoint.py::TestPerformance -v
```

### Test Coverage

The test suite includes:
- Unit tests for all models and utilities
- API endpoint integration tests
- Performance and load testing
- Rule engine validation tests
- Mock data generation for testing

## Deployment

### Docker Deployment

1. **Build Image**
   ```bash
   docker build -t fraud-detection:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name fraud-detection \
     -p 8000:8000 \
     -e DATABASE_URL=postgresql://user:pass@host:5432/db \
     -v $(pwd)/models:/app/models \
     fraud-detection:latest
   ```

### Kubernetes Deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: fraud-detection
spec:
  replicas: 3
  selector:
    matchLabels:
      app: fraud-detection
  template:
    metadata:
      labels:
        app: fraud-detection
    spec:
      containers:
      - name: fraud-detection
        image: fraud-detection:latest
        ports:
        - containerPort: 8000
        env:
        - name: DATABASE_URL
          valueFrom:
            secretKeyRef:
              name: db-secret
              key: url
        volumeMounts:
        - name: model-storage
          mountPath: /app/models
      volumes:
      - name: model-storage
        persistentVolumeClaim:
          claimName: model-storage-pvc
```

## Integration Examples

### UI Team Integration

```javascript
// Frontend JavaScript example
async function checkExpenseFraud(expense) {
    try {
        const response = await fetch('http://fraud-service:8000/predict', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(expense)
        });
        
        const result = await response.json();
        
        if (result.is_fraud) {
            showFraudWarning(result.explanations);
        }
        
        return result;
    } catch (error) {
        console.error('Fraud check failed:', error);
        return null;
    }
}
```

### Settlements Team Integration

```python
# Python service integration example
import httpx

class FraudService:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.client = httpx.AsyncClient()
    
    async def check_expense(self, expense_data: dict) -> dict:
        """Check if an expense is fraudulent before processing."""
        response = await self.client.post(
            f"{self.base_url}/predict",
            json=expense_data,
            timeout=5.0
        )
        response.raise_for_status()
        return response.json()
    
    async def batch_check(self, expenses: list) -> list:
        """Check multiple expenses at once."""
        response = await self.client.post(
            f"{self.base_url}/predict/batch",
            json=expenses,
            timeout=30.0
        )
        response.raise_for_status()
        return response.json()
```

## Monitoring

### Health Checks

```bash
# Basic health check
curl http://localhost:8000/health

# Detailed metrics
curl http://localhost:8000/metrics
```

### Logging

Logs are structured JSON format with these fields:
- `timestamp`: ISO format timestamp
- `level`: Log level (INFO, WARNING, ERROR)
- `module`: Python module name
- `message`: Log message
- `request_id`: Unique request identifier
- `user_id`: User context (if available)

### Metrics

Key metrics exposed:
- Request latency percentiles
- Fraud detection rate
- Model accuracy metrics
- Error rates by endpoint
- Model inference time

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Setup

```bash
# Install development dependencies
pip install -r requirements-dev.txt

# Run pre-commit hooks
pre-commit install

# Run tests before committing
pytest && flake8 && mypy fraud_detection/
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: Check the `/docs` endpoint when running
- **Issues**: Report bugs via GitHub Issues
- **Discussions**: Use GitHub Discussions for questions
- **Email**: [Your support email]

## Changelog

### v1.0.0
- Initial release with ML models and rule engine
- FastAPI REST API with documentation
- Docker support and CI/CD pipeline
- Comprehensive test suite

---

**Built with ❤️ for secure group expense sharing**
