#!/bin/bash

# SafeSplitX Fraud Detection - Frontend Launcher
# This script sets up and runs the Streamlit demo interface

echo "🛡️ SafeSplitX Fraud Detection - Demo Interface"
echo "=============================================="

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "📦 Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
echo "🔧 Activating virtual environment..."
source venv/bin/activate

# Install requirements
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Check if fraud detection service is running
echo "🔍 Checking fraud detection service..."
if curl -f -s http://localhost:8000/health > /dev/null; then
    echo "✅ Fraud detection service is running"
else
    echo "⚠️  Fraud detection service is not running"
    echo "   Please start it first:"
    echo "   cd ../fraud-detection-service && docker-compose up -d"
    echo ""
    echo "   Or run manually:"
    echo "   cd ../fraud-detection-service"
    echo "   pip install -r requirements.txt"
    echo "   python train.py"
    echo "   cd fraud_detection && python -m uvicorn api.main:app --host 0.0.0.0 --port 8000"
    echo ""
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

echo "🚀 Starting Streamlit interface..."
echo "   Frontend will open at: http://localhost:8501"
echo "   API endpoint: http://localhost:8000"
echo ""
echo "   Press Ctrl+C to stop"
echo ""

streamlit run app.py
