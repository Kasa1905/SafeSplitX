#!/bin/bash

# SafeSplitX Fraud Detection Service - Production Deployment Script
# This script sets up and runs the enhanced fraud detection API

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SERVICE_NAME="safesplitx-fraud-detection"
PORT=${PORT:-8000}
ENV=${ENV:-production}
LOG_LEVEL=${LOG_LEVEL:-info}

echo -e "${BLUE}🚀 SafeSplitX Fraud Detection Service Deployment${NC}"
echo "=================================================="

# Function to print colored output
print_status() {
    echo -e "${GREEN}✓${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Check if we're in the right directory
if [ ! -f "requirements.txt" ]; then
    print_error "requirements.txt not found. Please run this script from the fraud-detection-service directory."
    exit 1
fi

print_info "Starting deployment for environment: $ENV"

# Create necessary directories
print_info "Creating necessary directories..."
mkdir -p logs
mkdir -p models
mkdir -p behavioral_data
mkdir -p data

# Check Python version
print_info "Checking Python version..."
python_version=$(python3 --version 2>&1 | cut -d' ' -f2)
print_status "Python version: $python_version"

# Create virtual environment if it doesn't exist
if [ ! -d "venv" ]; then
    print_info "Creating virtual environment..."
    python3 -m venv venv
    print_status "Virtual environment created"
else
    print_status "Virtual environment already exists"
fi

# Activate virtual environment
print_info "Activating virtual environment..."
source venv/bin/activate
print_status "Virtual environment activated"

# Upgrade pip
print_info "Upgrading pip..."
pip install --upgrade pip > /dev/null 2>&1
print_status "Pip upgraded"

# Install dependencies
print_info "Installing dependencies..."
pip install -r requirements.txt > /dev/null 2>&1
print_status "Dependencies installed"

# Set up environment variables
print_info "Setting up environment variables..."
export PYTHONPATH="${PYTHONPATH}:$(pwd)"
export MODEL_DIR="$(pwd)/models"
export DATA_DIR="$(pwd)/data"
export LOG_DIR="$(pwd)/logs"
export ENV=$ENV
export PORT=$PORT
export LOG_LEVEL=$LOG_LEVEL

# Production environment variables
if [ "$ENV" = "production" ]; then
    export DEBUG=false
    export ALLOWED_ORIGINS="https://safesplitx.com,https://api.safesplitx.com"
    print_status "Production environment variables set"
else
    export DEBUG=true
    export ALLOWED_ORIGINS="*"
    print_status "Development environment variables set"
fi

# Check if models exist, if not, train basic models
if [ ! -d "models/isolation_forest" ]; then
    print_info "No trained models found. Training basic models..."
    python3 -c "
import sys
sys.path.append('.')
from fraud_detection.models.trainer import ModelTrainer
from fraud_detection.data.sample_data_generator import generate_sample_data
import pandas as pd

# Generate sample data if needed
data = generate_sample_data(1000)
df = pd.DataFrame(data)

# Train basic model
trainer = ModelTrainer()
result = trainer.train_isolation_forest(df)
print(f'Basic model trained with score: {result.get(\"score\", \"N/A\")}')
"
    print_status "Basic models trained"
else
    print_status "Trained models found"
fi

# Create systemd service file for production
if [ "$ENV" = "production" ]; then
    print_info "Creating systemd service file..."
    
    SERVICE_FILE="/tmp/$SERVICE_NAME.service"
    cat > $SERVICE_FILE << EOF
[Unit]
Description=SafeSplitX Fraud Detection API Service
After=network.target

[Service]
Type=simple
User=\$USER
WorkingDirectory=$(pwd)
Environment=PATH=$(pwd)/venv/bin
Environment=PYTHONPATH=$(pwd)
Environment=MODEL_DIR=$(pwd)/models
Environment=DATA_DIR=$(pwd)/data
Environment=LOG_DIR=$(pwd)/logs
Environment=ENV=production
Environment=PORT=$PORT
Environment=LOG_LEVEL=$LOG_LEVEL
Environment=DEBUG=false
ExecStart=$(pwd)/venv/bin/python -m fraud_detection.api.main_enhanced
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    print_warning "Systemd service file created at $SERVICE_FILE"
    print_warning "To install as a system service, run:"
    print_warning "  sudo cp $SERVICE_FILE /etc/systemd/system/"
    print_warning "  sudo systemctl enable $SERVICE_NAME"
    print_warning "  sudo systemctl start $SERVICE_NAME"
fi

# Health check function
health_check() {
    local max_attempts=30
    local attempt=1
    
    print_info "Performing health check..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -s -f "http://localhost:$PORT/health/advanced" > /dev/null 2>&1; then
            print_status "Health check passed"
            return 0
        fi
        
        echo -n "."
        sleep 2
        attempt=$((attempt + 1))
    done
    
    print_error "Health check failed after $max_attempts attempts"
    return 1
}

# Function to start the service
start_service() {
    print_info "Starting SafeSplitX Fraud Detection Service..."
    print_info "Port: $PORT"
    print_info "Environment: $ENV"
    print_info "Log Level: $LOG_LEVEL"
    
    # Start the enhanced API
    if [ "$ENV" = "production" ]; then
        print_info "Starting in production mode..."
        nohup python3 -m fraud_detection.api.main_enhanced > logs/app.log 2>&1 &
        echo $! > logs/app.pid
        print_status "Service started with PID $(cat logs/app.pid)"
    else
        print_info "Starting in development mode..."
        python3 -m fraud_detection.api.main_enhanced
    fi
}

# Function to stop the service
stop_service() {
    if [ -f "logs/app.pid" ]; then
        local pid=$(cat logs/app.pid)
        print_info "Stopping service with PID $pid..."
        kill $pid 2>/dev/null || true
        rm -f logs/app.pid
        print_status "Service stopped"
    else
        print_warning "No PID file found. Service may not be running."
    fi
}

# Function to restart the service
restart_service() {
    stop_service
    sleep 2
    start_service
}

# Function to show service status
show_status() {
    print_info "Service Status:"
    echo "=============="
    
    if [ -f "logs/app.pid" ]; then
        local pid=$(cat logs/app.pid)
        if ps -p $pid > /dev/null 2>&1; then
            print_status "Service is running (PID: $pid)"
            
            # Show basic stats
            if curl -s "http://localhost:$PORT/health/advanced" > /tmp/health.json 2>/dev/null; then
                print_status "API is responding"
                echo "Health Check Response:"
                cat /tmp/health.json | python3 -m json.tool
                rm -f /tmp/health.json
            else
                print_warning "API is not responding"
            fi
        else
            print_error "PID file exists but process is not running"
        fi
    else
        print_warning "Service is not running"
    fi
    
    # Show logs
    if [ -f "logs/app.log" ]; then
        echo ""
        print_info "Recent logs:"
        tail -n 10 logs/app.log
    fi
}

# Main command handling
case "${1:-start}" in
    "start")
        start_service
        if [ "$ENV" = "production" ]; then
            sleep 5
            health_check
        fi
        ;;
    "stop")
        stop_service
        ;;
    "restart")
        restart_service
        if [ "$ENV" = "production" ]; then
            sleep 5
            health_check
        fi
        ;;
    "status")
        show_status
        ;;
    "health")
        health_check
        ;;
    "logs")
        if [ -f "logs/app.log" ]; then
            tail -f logs/app.log
        else
            print_error "No log file found"
        fi
        ;;
    "install-deps")
        print_info "Installing dependencies only..."
        # Dependencies already installed above
        print_status "Dependencies installation complete"
        ;;
    *)
        echo "Usage: $0 {start|stop|restart|status|health|logs|install-deps}"
        echo ""
        echo "Commands:"
        echo "  start       - Start the fraud detection service"
        echo "  stop        - Stop the fraud detection service"
        echo "  restart     - Restart the fraud detection service"
        echo "  status      - Show service status and recent logs"
        echo "  health      - Perform health check"
        echo "  logs        - Show live logs"
        echo "  install-deps - Install dependencies only"
        echo ""
        echo "Environment Variables:"
        echo "  PORT        - Service port (default: 8000)"
        echo "  ENV         - Environment (production|development, default: production)"
        echo "  LOG_LEVEL   - Log level (debug|info|warning|error, default: info)"
        echo ""
        echo "Examples:"
        echo "  PORT=8080 ENV=development $0 start"
        echo "  LOG_LEVEL=debug $0 restart"
        exit 1
        ;;
esac

print_info "Deployment script completed"

# Show helpful information
echo ""
print_info "Service Information:"
echo "==================="
echo "• API Docs: http://localhost:$PORT/docs"
echo "• Health Check: http://localhost:$PORT/health/advanced"  
echo "• Real-time Stats: http://localhost:$PORT/realtime/stats"
echo "• Service Status: $0 status"
echo "• View Logs: $0 logs"
echo ""
print_info "Advanced API endpoint: http://localhost:$PORT/predict/advanced"
print_info "Simple API endpoint: http://localhost:$PORT/predict/simple"
echo ""
print_status "SafeSplitX Fraud Detection Service deployment completed!"
