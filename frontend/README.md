# Frontend Applications

This directory contains the user interface applications for SafeSplitX.

## 🎯 Current: Streamlit Demo Interface ✅

**A simple web interface for testing the fraud detection API visually**

### Features
- **🔍 Single Expense Testing** - Test individual transactions with detailed explanations
- **📊 Batch Testing** - Upload and analyze multiple expenses at once
- **🎭 Sample Scenarios** - Pre-defined test cases (normal vs suspicious)
- **📈 Visual Analytics** - Interactive charts and fraud risk gauges
- **💾 Export Results** - Download analysis results in CSV/JSON format
- **🤖 Real-time API** - Live connection to fraud detection service

### Quick Start

1. **Start Fraud Detection Service** (Required)
   ```bash
   cd ../fraud-detection-service
   docker-compose up -d
   # OR manually: python train.py && cd fraud_detection && uvicorn api.main:app --port 8000
   ```

2. **Launch Demo Interface**
   ```bash
   cd frontend
   ./run.sh
   # Opens at: http://localhost:8501
   ```

3. **Test the System**
   - Use Single Expense tab for individual testing
   - Try Sample Scenarios for quick demos
   - Use Batch Testing for multiple expenses

### Screenshots Preview

**Single Expense Testing:**
- Amount, category, location, participants input
- Real-time fraud analysis with explanations
- Risk score gauge and feature importance charts

**Batch Analysis:**
- JSON input for multiple expenses
- Summary statistics and fraud distribution
- Exportable results with detailed breakdown

**Sample Scenarios:**
- Pre-built test cases (normal vs suspicious)
- One-click testing with instant results
- Perfect for demonstrations

### API Integration

The interface connects to your fraud detection API:
- **Health Check**: `GET /health`  
- **Single Prediction**: `POST /predict`
- **Batch Prediction**: `POST /predict-batch`

### Dependencies
```
streamlit==1.28.1
requests==2.31.0
pandas==2.1.3
plotly==5.17.0
numpy==1.24.3
```

## 🚀 Planned: Production Frontend Applications

### Web Application (Coming Soon)
```
web/                    # React web application
├── src/               # Source code
├── public/            # Static assets
├── package.json       # Dependencies
└── README.md          # Web app documentation
```

### Mobile Application (Coming Soon)
```
mobile/                # React Native mobile app
├── src/               # Source code
├── android/           # Android specific code
├── ios/               # iOS specific code
├── package.json       # Dependencies
└── README.md          # Mobile app documentation
```

## ✨ Key Features (Planned Production Apps)

### Web Application Features
- **👥 Group Management**: Create and manage expense groups
- **💰 Expense Splitting**: Smart bill splitting with multiple options
- **📱 Responsive Design**: Works on desktop, tablet, and mobile
- **🔔 Real-Time Notifications**: Instant updates and alerts
- **📊 Dashboard**: Expense analytics and insights
- **🔐 Secure Authentication**: JWT-based user authentication
- **🛡️ Fraud Detection**: Real-time fraud analysis integration

### Mobile Application Features  
- **📱 Native Performance**: Optimized for iOS and Android
- **📷 Receipt Scanning**: OCR-powered expense capture
- **🔔 Push Notifications**: Real-time expense updates
- **💳 Payment Integration**: In-app payment processing
- **📍 Location Services**: Automatic merchant detection
- **👥 Group Chat**: Discuss expenses within groups

## 🛠️ Technologies

### Current (Streamlit Demo)
- **Backend**: Python Streamlit
- **Visualization**: Plotly, Pandas
- **API Client**: Requests library
- **Data Processing**: NumPy, JSON

### Planned (Production Apps)
- **Web**: React, TypeScript, Material-UI, React Query
- **Mobile**: React Native, TypeScript, NativeBase
- **State Management**: Redux Toolkit / Zustand
- **API Integration**: Axios, React Query
- **Authentication**: Auth0 / JWT
- **Testing**: Jest, React Testing Library

## 🎯 Demo Interface Usage

### Testing Individual Expenses
1. Enter expense details (amount, category, location)
2. Add participants and payment method
3. Click "Analyze Expense" 
4. View fraud probability, risk score, and AI explanation

### Batch Testing
1. Upload JSON array of expenses OR use sample generator
2. Click "Analyze Batch"
3. View summary statistics and detailed results
4. Export results as CSV or JSON

### Sample Scenarios
1. Choose from pre-defined scenarios (normal vs suspicious)
2. One-click testing with instant results
3. Perfect for demonstrations and testing

## 📚 Getting Started (Current Demo)

### Prerequisites
- Python 3.10+
- Fraud detection service running on port 8000

### Installation
```bash
cd frontend
./run.sh
```

OR manually:
```bash
cd frontend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
streamlit run app.py
```

### Usage
1. **Start Fraud Detection Service**: `cd ../fraud-detection-service && docker-compose up -d`
2. **Open Demo Interface**: Navigate to `http://localhost:8501`
3. **Test Away**: Use any of the three testing modes

## 🚀 Future Development

### Phase 1: Enhanced Demo ✅ **COMPLETE**
- [x] Streamlit interface with visual testing
- [x] Single expense and batch analysis
- [x] Sample scenarios and export functionality
- [x] Real-time API integration

### Phase 2: Web Application (Q1 2024)
- [ ] React web application setup
- [ ] User authentication system
- [ ] Expense management interface
- [ ] Group creation and management
- [ ] Real-time notifications

### Phase 3: Mobile Application (Q2 2024)
- [ ] React Native setup for iOS/Android
- [ ] Receipt scanning with OCR
- [ ] Push notification system
- [ ] Payment processing integration
- [ ] Location-based features

### Phase 4: Advanced Features (Q3-Q4 2024)
- [ ] Advanced analytics dashboard
- [ ] Multi-currency support interface
- [ ] Third-party app integrations
- [ ] Enhanced fraud detection UI

---

**SafeSplitX Team** | Building intuitive financial management interfaces
