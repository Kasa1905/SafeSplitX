#!/bin/bash

# Start script for SafeSplitX AI Fraud Detection Service

echo "Starting SafeSplitX AI Fraud Detection Service..."

# Wait for dependencies (if any)
if [ ! -z "$WAIT_FOR_SERVICES" ]; then
    echo "Waiting for dependent services..."
    sleep 10
fi

# Run database migrations or model loading if needed
if [ "$LOAD_MODELS_ON_START" = "true" ]; then
    echo "Loading ML models..."
    python -c "from app.models.model_manager import ModelManager; ModelManager.load_all_models()"
fi

# Start the FastAPI server
echo "Starting FastAPI server on port 8000..."
exec uvicorn app.main:app \
    --host 0.0.0.0 \
    --port 8000 \
    --workers ${WORKERS:-1} \
    --log-level ${LOG_LEVEL:-info} \
    --reload ${RELOAD:-false}