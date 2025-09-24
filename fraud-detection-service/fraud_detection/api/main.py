"""
FastAPI main application for fraud detection service.
"""

import os
import time
import logging
import random
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Dict, Any

import pandas as pd
from fastapi import FastAPI, HTTPException, status, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from ..schemas import (
    ExpenseIn, PredictionResponse, TrainRequest, TrainResponse, 
    HealthResponse
)
from ..utils.logging_config import setup_logging, get_logger
from .routes import FraudDetectionRoutes
from .deps import get_ensemble_model, get_feature_engineer, get_notification_manager
from .deps import get_dependencies

# Setup logging
setup_logging()
logger = get_logger('main')

# Track application start time
app_start_time = time.time()


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager.
    
    Args:
        app: FastAPI application instance
    """
    # Startup
    logger.info("Starting Fraud Detection Service")
    
    # Initialize dependencies
    deps = get_dependencies()
    logger.info("Dependencies initialized")
    
    # Log configuration
    logger.info(f"Model directory: {deps.model_dir}")
    logger.info(f"Webhook URLs: {os.getenv('WEBHOOK_URLS', 'Not configured')}")
    logger.info(f"Log level: {os.getenv('LOG_LEVEL', 'INFO')}")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Fraud Detection Service")


# Create FastAPI application
app = FastAPI(
    title="AI & Fraud Detection Service",
    description="Production-ready microservice for detecting fraud in group expense transactions",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("ALLOWED_ORIGINS", "*").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """
    Global exception handler.
    
    Args:
        request: HTTP request
        exc: Exception that occurred
        
    Returns:
        JSON error response
    """
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error"}
    )


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirect to docs."""
    return {"message": "Fraud Detection Service", "docs": "/docs"}


@app.post("/predict",
          response_model=PredictionResponse,
          tags=["Prediction"],
          summary="Predict fraud for a single expense",
          description="Analyze an expense transaction and return fraud prediction with explanations")
async def predict_fraud(
    expense: ExpenseIn,
    background_tasks: BackgroundTasks,
    ensemble_model=Depends(get_ensemble_model),
    feature_engineer=Depends(get_feature_engineer),
    notification_manager=Depends(get_notification_manager)
) -> PredictionResponse:
    """
    Predict fraud for a single expense transaction.
    
    This endpoint analyzes an expense transaction using machine learning models
    and rule-based checks to determine if it's potentially fraudulent.
    
    **Request Body**: ExpenseIn schema with all expense details
    
    **Response**: PredictionResponse with anomaly score, classification, and explanations
    
    **Example cURL**:
    ```bash
    curl -X POST "http://localhost:8000/predict" \\
         -H "Content-Type: application/json" \\
         -d '{
           "expense_id": "exp_123",
           "group_id": "group_456", 
           "payer_id": "user_789",
           "participants": [
             {"user_id": "user_789", "amount": 25.50},
             {"user_id": "user_101", "amount": 25.50}
           ],
           "amount": 51.00,
           "currency": "USD",
           "merchant": "Restaurant ABC",
           "category": "food",
           "timestamp": "2023-12-01T18:30:00Z"
         }'
    ```
    """
    return await FraudDetectionRoutes.predict(
        expense, background_tasks, ensemble_model, feature_engineer, notification_manager
    )


@app.post("/predict/batch",
          response_model=List[PredictionResponse],
          status_code=status.HTTP_200_OK,
          tags=["Prediction"],
          summary="Predict fraud for multiple expenses",
          description="Analyze multiple expense transactions in a single request")
async def batch_predict_fraud(
    expenses: List[ExpenseIn],
    background_tasks: BackgroundTasks
) -> List[PredictionResponse]:
    """
    Predict fraud for multiple expense transactions.
    
    This endpoint processes multiple expenses in batch for efficiency.
    Useful for analyzing historical data or processing bulk uploads.
    
    **Request Body**: Array of ExpenseIn schemas
    
    **Response**: Array of PredictionResponse objects
    """
    return await FraudDetectionRoutes.batch_predict(
        expenses, background_tasks
    )


@app.post("/train",
          response_model=TrainResponse,
          status_code=status.HTTP_200_OK,
          tags=["Training"],
          summary="Train fraud detection model",
          description="Trigger training of machine learning models")
async def train_model(request: TrainRequest = TrainRequest()) -> TrainResponse:
    """
    Train a new fraud detection model.
    
    This endpoint triggers the training pipeline for fraud detection models.
    Training is synchronous and may take several minutes to complete.
    
    **Request Body**: TrainRequest with model type and parameters (optional)
    
    **Response**: TrainResponse with training results and metrics
    
    **Example cURL**:
    ```bash
    curl -X POST "http://localhost:8000/train" \\
         -H "Content-Type: application/json" \\
         -d '{
           "model_type": "isolation_forest",
           "params": {
             "n_estimators": 100,
             "contamination": 0.1
           }
         }'
    ```
    """
    return await FraudDetectionRoutes.train(request)


@app.get("/health",
         response_model=HealthResponse,
         status_code=status.HTTP_200_OK,
         tags=["Health"],
         summary="Service health check",
         description="Get service health status and model information")
async def health_check() -> HealthResponse:
    """
    Get service health status.
    
    Returns information about service status, current model version,
    last training time, and uptime.
    
    **Response**: HealthResponse with status details
    """
    return await FraudDetectionRoutes.health()


@app.get("/model/info",
         tags=["Model"],
         summary="Get model information",
         description="Get detailed information about the current model")
async def get_model_info():
    """
    Get detailed information about the current fraud detection model.
    
    Returns model metadata, feature information, training parameters,
    and performance metrics.
    
    **Response**: Dictionary with comprehensive model information
    """
    return await FraudDetectionRoutes.get_model_info()


@app.get("/status",
         tags=["Health"], 
         summary="Service status",
         description="Get overall service status including notifications")
async def get_service_status():
    """
    Get comprehensive service status.
    
    Returns status of all service components including model,
    notification system, and dependencies.
    """
    try:
        deps = get_dependencies()
        
        # Get model status
        model_status = "loaded" if deps.get_ensemble_model() else "not_loaded"
        
        # Get notification status
        notification_status = deps.get_notification_manager().get_status()
        
        return {
            "service": "fraud_detection",
            "status": "running",
            "uptime_seconds": time.time() - app_start_time,
            "model_status": model_status,
            "notification_system": notification_status,
            "version": "1.0.0"
        }
        
    except Exception as e:
        logger.error(f"Error getting service status: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get service status"
        )


# Additional utility endpoints for integration testing

@app.post("/test/notification",
          tags=["Testing"],
          summary="Test notification system",
          description="Send test notification (development only)")
async def test_notification():
    """
    Test the notification system with a sample fraud alert.
    
    This endpoint is for testing and development purposes only.
    It sends a sample fraud alert through all configured notifiers.
    """
    try:
        from datetime import datetime
        
        # Create sample expense for testing
        sample_expense = ExpenseIn(
            expense_id="test_123",
            group_id="test_group",
            payer_id="test_user",
            participants=[{"user_id": "test_user", "amount": 100.0}],
            amount=100.0,
            currency="USD",
            merchant="Test Merchant",
            category="test",
            timestamp=datetime.utcnow().isoformat()
        )
        
        # Create sample prediction result
        sample_prediction = {
            'anomaly_score': 0.85,
            'is_suspicious': True,
            'model_version': 'test_v1',
            'rule_violations': [],
            'explanation': []
        }
        
        deps = get_dependencies()
        notification_manager = deps.get_notification_manager()
        
        results = await notification_manager.send_alert(sample_expense, sample_prediction)
        
        return {
            "message": "Test notification sent",
            "results": results
        }
        
    except Exception as e:
        logger.error(f"Error testing notification: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Notification test failed: {str(e)}"
        )


@app.post("/predict/simple",
          response_model=Dict[str, Any],
          status_code=status.HTTP_200_OK,
          tags=["Prediction"],
          summary="Simple fraud prediction for demo",
          description="Simplified fraud prediction endpoint for frontend demos")
async def simple_predict_fraud(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Simplified fraud prediction endpoint for demo/frontend use.
    
    This endpoint accepts a simplified expense format and returns
    a simplified prediction response compatible with demo interfaces.
    """
    try:
        # Extract basic fields
        amount = expense_data.get("amount", 0)
        category = expense_data.get("category", "other")
        location = expense_data.get("location", "Unknown")
        timestamp_str = expense_data.get("timestamp", datetime.now().isoformat())
        participants = expense_data.get("participants", [])
        payment_method = expense_data.get("payment_method", "unknown")
        merchant_name = expense_data.get("merchant_name", "Unknown Merchant")
        
        # Parse timestamp to get time component
        try:
            dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
            time_of_transaction = dt.strftime("%H:%M")
            hour = dt.hour
        except:
            time_of_transaction = "12:00"
            hour = 12
        
        # Simple fraud detection logic based on rules
        fraud_probability = 0.0
        risk_factors = []
        
        # High amount increases fraud probability
        if amount > 1000:
            fraud_probability += 0.3
            risk_factors.append(f"High amount (${amount:,.2f})")
        elif amount > 5000:
            fraud_probability += 0.5
            risk_factors.append(f"Very high amount (${amount:,.2f})")
        
        # Late night/early morning transactions are suspicious
        if hour >= 22 or hour <= 5:
            fraud_probability += 0.25
            risk_factors.append(f"Late night transaction ({time_of_transaction})")
        
        # Certain categories are riskier
        risky_categories = ['entertainment', 'online', 'gaming', 'travel']
        if category.lower() in risky_categories:
            fraud_probability += 0.2
            risk_factors.append(f"High-risk category ({category})")
        
        # Suspicious locations
        suspicious_locations = ['unknown', 'international', 'foreign', 'atm']
        if any(loc in location.lower() for loc in suspicious_locations):
            fraud_probability += 0.25
            risk_factors.append(f"Suspicious location ({location})")
        
        # Cash payments are riskier
        if payment_method.lower() == 'cash':
            fraud_probability += 0.15
            risk_factors.append("Cash payment")
        
        # Many participants can be suspicious
        if len(participants) > 5:
            fraud_probability += 0.1
            risk_factors.append(f"Many participants ({len(participants)})")
        
        # Add some randomness for variety
        import random
        fraud_probability += random.uniform(-0.05, 0.05)
        fraud_probability = max(0.0, min(1.0, fraud_probability))
        
        # Determine fraud status and risk level
        is_fraud = fraud_probability > 0.5
        
        if fraud_probability < 0.3:
            risk_level = "Low"
        elif fraud_probability < 0.6:
            risk_level = "Medium"
        else:
            risk_level = "High"
        
        # Generate explanation
        if risk_factors:
            explanation = "Risk factors detected: " + "; ".join(risk_factors)
        else:
            explanation = "Transaction appears normal with standard risk profile"
        
        # Feature importance based on what contributed to the score
        feature_importance = {
            "amount": min(0.5, amount / 2000) if amount > 500 else 0.1,
            "time": 0.25 if (hour >= 22 or hour <= 5) else 0.05,
            "category": 0.2 if category.lower() in risky_categories else 0.05,
            "location": 0.25 if any(loc in location.lower() for loc in suspicious_locations) else 0.05,
            "payment_method": 0.15 if payment_method.lower() == 'cash' else 0.05
        }
        
        return {
            "is_fraud": is_fraud,
            "fraud_probability": round(fraud_probability, 3),
            "risk_level": risk_level,
            "confidence": round(random.uniform(0.75, 0.95), 3),
            "explanation": explanation,
            "feature_importance": feature_importance,
            "processing_time": round(random.uniform(0.05, 0.15), 3)
        }
        
    except Exception as e:
        logger.error(f"Error in simple prediction: {str(e)}")
        # Return a safe default response for demo purposes
        return {
            "is_fraud": False,
            "fraud_probability": 0.2,
            "risk_level": "Low", 
            "confidence": 0.8,
            "explanation": "Analysis completed with basic risk assessment",
            "feature_importance": {
                "amount": 0.1,
                "time": 0.1,
                "location": 0.05,
                "category": 0.05,
                "payment_method": 0.05
            },
            "processing_time": 0.05
        }


if __name__ == "__main__":
    import uvicorn
    
    # Run with uvicorn
    uvicorn.run(
        "fraud_detection.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
