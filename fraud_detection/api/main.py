"""
FastAPI main application for fraud detection service.
"""

import os
import time
import logging
from contextlib import asynccontextmanager
from typing import List

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
