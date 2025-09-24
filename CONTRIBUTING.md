# Contributing to SafeSplitX Fraud Detection Module

## 🎯 Quick Start for Team Members

### **Prerequisites**
- Python 3.10+
- Git
- Docker (optional)
- VS Code (recommended)

### **Setup Development Environment**

1. **Clone the Repository**
   ```bash
   git clone https://github.com/Kasa1905/SafeSplitX.git
   cd SafeSplitX/fraud-detection-module
   ```

2. **Create Virtual Environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # Windows: venv\Scripts\activate
   ```

3. **Install Dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Setup Environment**
   ```bash
   cp .env.example .env
   # Configure your local settings in .env
   ```

5. **Initialize Models**
   ```bash
   python scripts/generate_sample_data.py
   python scripts/train_models.py
   ```

6. **Run Tests**
   ```bash
   pytest tests/ -v
   ```

7. **Start Development Server**
   ```bash
   uvicorn fraud_detection.api.main:app --reload
   # Access API docs at: http://localhost:8000/docs
   ```

## 🔧 Integration Points for SafeSplitX Teams

### **Frontend Team**
**Location**: `/fraud_detection/api/routes.py`

**Key Endpoints**:
- `POST /predict` - Single expense fraud check
- `POST /predict/batch` - Multiple expense validation
- `GET /health` - Service health check

**Example Integration**:
```javascript
// In your React/Vue components
const checkExpense = async (expense) => {
  const response = await fetch('/api/fraud/predict', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(expense)
  });
  return response.json();
};
```

### **Backend Team**
**Location**: `/fraud_detection/schemas.py`

**Data Models**:
- `ExpenseData` - Input expense format
- `FraudPrediction` - Response format
- `ParticipantInfo` - Participant structure

**Integration Middleware**:
```python
# Add to your Express/FastAPI middleware
async def fraud_check_middleware(expense_data):
    fraud_result = await fraud_client.predict(expense_data)
    if fraud_result.is_suspicious:
        # Handle suspicious expense
        await notify_admins(fraud_result)
    return fraud_result
```

### **Settlements Team**
**Location**: `/scripts/batch_processing.py`

**Batch Validation**:
```python
# Validate expenses before settlement
expenses = get_pending_expenses(group_id)
fraud_results = await fraud_detector.predict_batch(expenses)
safe_expenses = [e for e, r in zip(expenses, fraud_results) if not r.is_suspicious]
```

### **DevOps Team**
**Deployment Files**:
- `Dockerfile` - Container configuration
- `docker-compose.yml` - Multi-service deployment
- `.github/workflows/ci.yml` - CI/CD pipeline

## 📋 Development Workflow

### **Branch Strategy**
- `main` - Production-ready code
- `develop` - Integration branch
- `feature/fraud-*` - Feature branches
- `hotfix/fraud-*` - Critical fixes

### **Code Standards**
```bash
# Format code
black fraud_detection/ tests/

# Type checking
mypy fraud_detection/

# Linting
flake8 fraud_detection/ tests/

# Testing
pytest tests/ --cov=fraud_detection
```

### **Commit Messages**
```
feat(fraud): add new ML model for pattern detection
fix(api): resolve timeout issue in batch processing
docs(readme): update API integration examples
test(models): add unit tests for ensemble model
```

## 🧪 Testing Guidelines

### **Test Structure**
```
tests/
├── test_api.py              # API endpoint tests
├── test_models.py           # ML model tests
├── test_feature_engineering.py
├── test_integration.py      # End-to-end tests
└── conftest.py             # Test fixtures
```

### **Running Tests**
```bash
# All tests
pytest tests/

# Specific test file
pytest tests/test_api.py -v

# With coverage
pytest tests/ --cov=fraud_detection --cov-report=html

# Integration tests only
pytest tests/test_integration.py -k integration
```

### **Adding New Tests**
```python
# Example test for new feature
def test_new_fraud_pattern():
    expense = create_test_expense(suspicious=True)
    result = fraud_detector.predict(expense)
    assert result.is_suspicious
    assert "pattern_name" in [r.rule_name for r in result.reasons]
```

## 🚀 Deployment Process

### **Development Deployment**
```bash
# Using Docker
docker-compose up -d fraud-detection

# Using Python
uvicorn fraud_detection.api.main:app --host 0.0.0.0 --port 8000
```

### **Production Deployment**
```bash
# Build production image
docker build -t safesplitx/fraud-detection:latest .

# Deploy with environment variables
docker run -d \
  --name fraud-detection \
  -p 8000:8000 \
  -e SECRET_KEY=$SECRET_KEY \
  -e FRAUD_THRESHOLD=0.5 \
  safesplitx/fraud-detection:latest
```

### **Health Monitoring**
```bash
# Check service health
curl http://localhost:8000/health

# View metrics
curl http://localhost:8000/metrics

# Check logs
docker logs fraud-detection --tail 100
```

## 🔄 Model Updates

### **Training New Models**
```bash
# Generate training data from SafeSplitX database
python scripts/export_safesplitx_data.py

# Train with new data
python scripts/train_models.py --data data/safesplitx_expenses.csv

# Validate model performance
python scripts/validate_models.py

# Deploy new model version
python scripts/deploy_model.py --version $(date +%Y%m%d_%H%M%S)
```

### **A/B Testing**
```bash
# Test new model against current
python scripts/ab_test.py --current-model v1.0 --candidate-model v1.1 --traffic-split 0.1
```

## 📊 Performance Monitoring

### **Key Metrics**
- Response Time: < 200ms (target)
- Accuracy: > 90%
- False Positive Rate: < 5%
- API Uptime: > 99.9%

### **Monitoring Tools**
```bash
# Performance profiling
python -m cProfile -o profile.stats scripts/benchmark.py

# Memory usage
memory_profiler uvicorn fraud_detection.api.main:app

# Load testing
locust -f tests/load_test.py --host http://localhost:8000
```

## 🆘 Troubleshooting

### **Common Issues**

1. **Models not loading**
   ```bash
   # Retrain models
   python scripts/train_models.py
   ```

2. **API not responding**
   ```bash
   # Check process
   ps aux | grep uvicorn
   
   # Check logs
   tail -f logs/fraud_detection.log
   ```

3. **High false positive rate**
   ```bash
   # Adjust threshold in .env
   FRAUD_THRESHOLD=0.7
   ```

### **Getting Help**
- **Slack**: #fraud-detection channel
- **GitHub Issues**: Tag with `fraud-detection` label
- **Code Review**: Tag @fraud-detection-team
- **Documentation**: API docs at `/docs` endpoint

## 📝 Documentation Updates

When adding new features:
1. Update API documentation in docstrings
2. Add examples to README.md
3. Update integration guides
4. Add changelog entry

## 🎉 Ready to Contribute!

You're all set! The fraud detection module is designed to be:
- **Easy to integrate** with existing SafeSplitX components
- **Well-tested** with comprehensive test suite
- **Production-ready** with monitoring and deployment tools
- **Maintainable** with clear code structure and documentation

Happy coding! 🚀
