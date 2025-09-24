# SafeSplitX Fraud Detection - Production Deployment Guide

## 🚀 Production Deployment Options

### **Option 1: Docker Container (Recommended)**

1. **Build Production Image**
   ```bash
   docker build -t safesplitx/fraud-detection:latest .
   ```

2. **Run Container**
   ```bash
   docker run -d \
     --name fraud-detection \
     -p 8000:8000 \
     -e SECRET_KEY="${SECRET_KEY}" \
     -e FRAUD_THRESHOLD=0.5 \
     -e LOG_LEVEL=INFO \
     -v $(pwd)/models:/app/models \
     -v $(pwd)/logs:/app/logs \
     --restart unless-stopped \
     safesplitx/fraud-detection:latest
   ```

### **Option 2: Docker Compose (Multi-Service)**

1. **Configure Environment**
   ```bash
   cp .env.example .env
   # Set production values in .env
   ```

2. **Deploy Stack**
   ```bash
   docker-compose -f docker-compose.yml up -d
   ```

### **Option 3: Kubernetes Deployment**

1. **Create ConfigMap**
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: fraud-detection-config
   data:
     API_HOST: "0.0.0.0"
     API_PORT: "8000"
     FRAUD_THRESHOLD: "0.5"
     LOG_LEVEL: "INFO"
   ```

2. **Create Deployment**
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
           image: safesplitx/fraud-detection:latest
           ports:
           - containerPort: 8000
           envFrom:
           - configMapRef:
               name: fraud-detection-config
           livenessProbe:
             httpGet:
               path: /health
               port: 8000
             initialDelaySeconds: 30
             periodSeconds: 10
   ```

## 🔧 Production Configuration

### **Environment Variables**
```bash
# Core API Settings
API_HOST=0.0.0.0
API_PORT=8000
DEBUG=false
SECRET_KEY=your-production-secret-key-min-32-chars

# Fraud Detection Settings
FRAUD_THRESHOLD=0.5
ENSEMBLE_WEIGHTS=0.7,0.3
MAX_AMOUNT_THRESHOLD=10000.0

# Performance Settings
MAX_WORKERS=4
RATE_LIMIT_PER_MINUTE=1000
BATCH_SIZE=100

# Database (if using historical data)
DATABASE_URL=postgresql://user:pass@postgres:5432/fraud_db

# Notifications
WEBHOOK_URL=https://safesplitx.com/api/webhooks/fraud
NOTIFICATION_RETRY_ATTEMPTS=3

# Logging
LOG_LEVEL=INFO
LOG_FORMAT=json

# Monitoring
ENABLE_METRICS=true
METRICS_PORT=9090
```

### **Reverse Proxy (Nginx)**
```nginx
upstream fraud_detection {
    server localhost:8000;
    # Add more instances for load balancing
    # server localhost:8001;
    # server localhost:8002;
}

server {
    listen 80;
    server_name fraud-api.safesplitx.com;

    location / {
        proxy_pass http://fraud_detection;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Rate limiting
        limit_req zone=api burst=20 nodelay;
    }

    location /health {
        proxy_pass http://fraud_detection/health;
        access_log off;
    }
}
```

## 📊 Monitoring & Logging

### **Health Check Endpoints**
```bash
# Basic health check
curl http://localhost:8000/health

# Detailed health with model info
curl http://localhost:8000/health/detailed

# Metrics endpoint
curl http://localhost:8000/metrics
```

### **Logging Configuration**
The service produces structured JSON logs:
```json
{
  "timestamp": "2025-09-24T12:00:00Z",
  "level": "INFO",
  "module": "fraud_detection.api.routes",
  "message": "Prediction completed",
  "expense_id": "exp_12345",
  "fraud_score": 0.342,
  "processing_time_ms": 187,
  "model_version": "20250924_120000"
}
```

### **Prometheus Metrics**
```yaml
# metrics.yml
groups:
- name: fraud_detection
  rules:
  - alert: HighFraudRate
    expr: fraud_detection_suspicious_rate > 0.1
    for: 5m
    annotations:
      summary: "High fraud detection rate"
      
  - alert: SlowResponse
    expr: fraud_detection_response_time_seconds > 1
    for: 2m
    annotations:
      summary: "Fraud detection API responding slowly"
      
  - alert: ServiceDown
    expr: up{job="fraud-detection"} == 0
    for: 1m
    annotations:
      summary: "Fraud detection service is down"
```

## 🔒 Security Considerations

### **API Security**
1. **Use HTTPS** in production
2. **API Key Authentication** for service-to-service calls
3. **Rate Limiting** to prevent abuse
4. **Input Validation** on all endpoints

### **Data Protection**
1. **No PII Storage** - only processed features stored
2. **Encryption at Rest** for model files
3. **Secure Model Deployment** with checksum validation
4. **Audit Logging** for fraud decisions

### **Network Security**
```yaml
# Docker network isolation
version: '3.8'
services:
  fraud-detection:
    networks:
      - internal
      - safesplitx-backend
    # Only expose necessary ports
```

## 📈 Performance Optimization

### **Horizontal Scaling**
```bash
# Scale with Docker Compose
docker-compose up --scale fraud-detection=3

# Scale with Kubernetes
kubectl scale deployment fraud-detection --replicas=5
```

### **Model Caching**
```python
# Enable model caching in production
ENABLE_MODEL_CACHE=true
CACHE_SIZE=100MB
CACHE_TTL=3600  # 1 hour
```

### **Database Optimization**
```sql
-- Index for fast expense lookups
CREATE INDEX idx_expenses_timestamp ON expenses(timestamp);
CREATE INDEX idx_expenses_group_id ON expenses(group_id);
CREATE INDEX idx_expenses_fraud_score ON expenses(fraud_score);
```

## 🔄 CI/CD Pipeline

### **GitHub Actions Workflow**
The `.github/workflows/ci.yml` handles:
1. **Code Quality**: Linting, formatting, type checking
2. **Testing**: Unit tests, integration tests
3. **Security**: Dependency scanning, SAST
4. **Build**: Docker image creation
5. **Deploy**: Automated deployment to staging/production

### **Deployment Stages**
```yaml
stages:
  - test
  - build
  - deploy-staging
  - integration-tests
  - deploy-production
```

## 🗄️ Database Setup (Optional)

### **PostgreSQL for Analytics**
```sql
-- Create fraud analytics database
CREATE DATABASE fraud_analytics;

-- Create tables for historical data
CREATE TABLE fraud_predictions (
    id SERIAL PRIMARY KEY,
    expense_id VARCHAR(255) NOT NULL,
    group_id VARCHAR(255),
    fraud_score DECIMAL(5,4),
    is_suspicious BOOLEAN,
    model_version VARCHAR(50),
    predictions JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX idx_fraud_predictions_expense_id ON fraud_predictions(expense_id);
CREATE INDEX idx_fraud_predictions_created_at ON fraud_predictions(created_at);
CREATE INDEX idx_fraud_predictions_fraud_score ON fraud_predictions(fraud_score);
```

## 🚨 Backup & Recovery

### **Model Backup**
```bash
# Automated model backup
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
tar -czf "models_backup_$DATE.tar.gz" models/
aws s3 cp "models_backup_$DATE.tar.gz" s3://safesplitx-backups/fraud-models/
```

### **Configuration Backup**
```bash
# Backup configuration
kubectl get configmap fraud-detection-config -o yaml > config_backup.yaml
```

## 🔍 Troubleshooting Production Issues

### **Common Production Issues**

1. **High Memory Usage**
   ```bash
   # Check memory usage
   docker stats fraud-detection
   
   # Reduce batch size
   BATCH_SIZE=50
   ```

2. **Slow Response Times**
   ```bash
   # Enable performance profiling
   DEBUG_PERFORMANCE=true
   
   # Check database connections
   netstat -an | grep 5432
   ```

3. **Model Loading Errors**
   ```bash
   # Verify model files
   ls -la models/
   
   # Retrain if corrupted
   python scripts/train_models.py --force-retrain
   ```

### **Emergency Procedures**

1. **Service Rollback**
   ```bash
   # Rollback to previous version
   docker tag safesplitx/fraud-detection:v1.1 safesplitx/fraud-detection:rollback
   docker-compose up -d fraud-detection
   ```

2. **Disable Fraud Detection**
   ```bash
   # Temporary bypass (return all expenses as safe)
   FRAUD_DETECTION_ENABLED=false
   ```

## 📞 Production Support

### **Monitoring Dashboards**
- **Grafana**: Performance metrics
- **ELK Stack**: Log analysis
- **Prometheus**: Alert management

### **On-Call Procedures**
1. **Check service health**: `/health` endpoint
2. **Review recent logs**: Look for errors
3. **Verify model status**: Check model loading
4. **Escalate if needed**: Contact ML team

### **SLA Targets**
- **Uptime**: 99.9%
- **Response Time**: < 200ms (95th percentile)
- **False Positive Rate**: < 5%
- **Accuracy**: > 90%

## ✅ Production Readiness Checklist

- [ ] Environment variables configured
- [ ] SSL certificates installed
- [ ] Rate limiting enabled
- [ ] Monitoring dashboards set up
- [ ] Log aggregation configured
- [ ] Backup procedures tested
- [ ] Emergency procedures documented
- [ ] Load testing completed
- [ ] Security scan passed
- [ ] Team training completed

Your SafeSplitX Fraud Detection module is now production-ready! 🚀
