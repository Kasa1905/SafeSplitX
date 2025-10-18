"""
FastAPI Application for SafeSplitX AI Fraud Detection
Provides ML-powered fraud detection endpoints
"""

import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any, List, Optional

import uvicorn
from fastapi import FastAPI, HTTPException, BackgroundTasks, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from pydantic import BaseModel, Field
from pydantic_settings import BaseSettings

from config import get_settings
from models.fraud_detector import FraudDetector
from models.model_manager import ModelManager
from utils.logging_config import setup_logging
from utils.health_checker import HealthChecker
from utils.metrics_collector import MetricsCollector

# Configure logging
setup_logging()
logger = logging.getLogger(__name__)

# Global instances
model_manager: Optional[ModelManager] = None
fraud_detector: Optional[FraudDetector] = None
health_checker: Optional[HealthChecker] = None
metrics_collector: Optional[MetricsCollector] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    global model_manager, fraud_detector, health_checker, metrics_collector
    
    logger.info("Starting SafeSplitX AI Fraud Detection Service...")
    
    try:
        # Initialize settings
        settings = get_settings()
        
        # Initialize components
        model_manager = ModelManager(settings)
        await model_manager.initialize()
        
        fraud_detector = FraudDetector(model_manager, settings)
        await fraud_detector.initialize()
        
        health_checker = HealthChecker(model_manager, fraud_detector)
        metrics_collector = MetricsCollector()
        
        logger.info("AI Fraud Detection Service initialized successfully")
        
    except Exception as e:
        logger.error(f"Failed to initialize AI service: {e}")
        raise
    
    yield
    
    # Cleanup
    logger.info("Shutting down AI Fraud Detection Service...")
    if fraud_detector:
        await fraud_detector.cleanup()
    if model_manager:
        await model_manager.cleanup()


# Create FastAPI app
app = FastAPI(
    title="SafeSplitX AI Fraud Detection Service",
    description="Machine Learning powered fraud detection for expense management",
    version="1.0.0",
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(GZipMiddleware, minimum_size=1000)


# Pydantic models
class ExpenseData(BaseModel):
    """Expense data for fraud analysis"""
    amount: float = Field(..., description="Expense amount")
    description: str = Field(..., description="Expense description")
    category: str = Field(..., description="Expense category")
    currency: str = Field(default="USD", description="Currency code")
    timestamp: Optional[str] = Field(None, description="Expense timestamp")
    location: Optional[str] = Field(None, description="Expense location")
    merchant: Optional[str] = Field(None, description="Merchant name")
    payment_method: Optional[str] = Field(None, description="Payment method")
    receipt_url: Optional[str] = Field(None, description="Receipt URL")
    user_id: Optional[str] = Field(None, description="User ID")
    group_id: Optional[str] = Field(None, description="Group ID")


class AnalysisContext(BaseModel):
    """Analysis context data"""
    user_id: str = Field(..., description="User ID")
    ip_address: Optional[str] = Field(None, description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    session_id: Optional[str] = Field(None, description="Session ID")
    timestamp: Optional[str] = Field(None, description="Analysis timestamp")
    source: Optional[str] = Field(None, description="Analysis source")


class FraudAnalysisRequest(BaseModel):
    """Fraud analysis request"""
    expense: ExpenseData
    context: Optional[AnalysisContext] = None
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)


class BatchAnalysisRequest(BaseModel):
    """Batch fraud analysis request"""
    expenses: List[ExpenseData]
    context: Optional[AnalysisContext] = None
    options: Optional[Dict[str, Any]] = Field(default_factory=dict)


class FraudAnalysisResponse(BaseModel):
    """Fraud analysis response"""
    analysis_id: str
    fraud_score: float
    risk_level: str
    confidence: float
    risk_factors: List[str]
    model_version: str
    processing_time_ms: int
    features: Optional[Dict[str, Any]] = None
    recommendations: Optional[List[str]] = None


class BatchAnalysisResponse(BaseModel):
    """Batch analysis response"""
    analyses: List[FraudAnalysisResponse]
    batch_id: str
    total_processed: int
    processing_time_ms: int
    failed_analyses: int


class HealthResponse(BaseModel):
    """Health check response"""
    status: str
    timestamp: str
    uptime: float
    version: str
    models_loaded: int
    memory_usage: Dict[str, Any]
    gpu_available: bool = False


class ModelInfo(BaseModel):
    """Model information"""
    name: str
    version: str
    type: str
    loaded: bool
    last_updated: str
    accuracy_metrics: Optional[Dict[str, float]] = None


# Dependency to get fraud detector
async def get_fraud_detector() -> FraudDetector:
    if fraud_detector is None:
        raise HTTPException(status_code=503, detail="Fraud detector not initialized")
    return fraud_detector


# Dependency to get health checker
async def get_health_checker() -> HealthChecker:
    if health_checker is None:
        raise HTTPException(status_code=503, detail="Health checker not initialized")
    return health_checker


# Dependency to get metrics collector
async def get_metrics_collector() -> MetricsCollector:
    if metrics_collector is None:
        raise HTTPException(status_code=503, detail="Metrics collector not initialized")
    return metrics_collector


@app.get("/health", response_model=HealthResponse)
async def health_check(checker: HealthChecker = Depends(get_health_checker)):
    """Health check endpoint"""
    try:
        health_data = await checker.get_health_status()
        return HealthResponse(**health_data)
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unhealthy")


@app.get("/")
async def root():
    """Root endpoint"""
    return {
        "service": "SafeSplitX AI Fraud Detection",
        "version": "1.0.0",
        "status": "running",
        "endpoints": [
            "/health",
            "/predict",
            "/batch-predict",
            "/models",
            "/metrics"
        ]
    }


@app.post("/predict", response_model=FraudAnalysisResponse)
async def predict_fraud(
    request: FraudAnalysisRequest,
    background_tasks: BackgroundTasks,
    detector: FraudDetector = Depends(get_fraud_detector),
    metrics: MetricsCollector = Depends(get_metrics_collector)
):
    """Predict fraud for a single expense"""
    start_time = time.time()
    
    try:
        logger.info(f"Processing fraud prediction for expense: {request.expense.amount}")
        
        # Perform fraud analysis
        result = await detector.analyze_expense(
            expense_data=request.expense.dict(),
            context=request.context.dict() if request.context else {},
            options=request.options
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Update metrics in background
        background_tasks.add_task(
            metrics.record_prediction,
            result["fraud_score"],
            result["risk_level"],
            processing_time
        )
        
        response = FraudAnalysisResponse(
            analysis_id=result["analysis_id"],
            fraud_score=result["fraud_score"],
            risk_level=result["risk_level"],
            confidence=result["confidence"],
            risk_factors=result["risk_factors"],
            model_version=result["model_version"],
            processing_time_ms=processing_time,
            features=result.get("features"),
            recommendations=result.get("recommendations", [])
        )
        
        logger.info(f"Fraud prediction completed: score={result['fraud_score']}, risk={result['risk_level']}")
        return response
        
    except Exception as e:
        logger.error(f"Fraud prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/batch-predict", response_model=BatchAnalysisResponse)
async def batch_predict_fraud(
    request: BatchAnalysisRequest,
    background_tasks: BackgroundTasks,
    detector: FraudDetector = Depends(get_fraud_detector),
    metrics: MetricsCollector = Depends(get_metrics_collector)
):
    """Predict fraud for multiple expenses"""
    start_time = time.time()
    
    try:
        if not request.expenses:
            raise HTTPException(status_code=400, detail="No expenses provided")
        
        if len(request.expenses) > 1000:  # Limit batch size
            raise HTTPException(status_code=400, detail="Batch size too large (max 1000)")
        
        logger.info(f"Processing batch fraud prediction for {len(request.expenses)} expenses")
        
        # Perform batch analysis
        results = await detector.batch_analyze_expenses(
            expenses_data=[exp.dict() for exp in request.expenses],
            context=request.context.dict() if request.context else {},
            options=request.options
        )
        
        processing_time = int((time.time() - start_time) * 1000)
        
        # Convert results to response format
        analyses = []
        failed_count = 0
        
        for result in results:
            if result.get("error"):
                failed_count += 1
                continue
                
            analyses.append(FraudAnalysisResponse(
                analysis_id=result["analysis_id"],
                fraud_score=result["fraud_score"],
                risk_level=result["risk_level"],
                confidence=result["confidence"],
                risk_factors=result["risk_factors"],
                model_version=result["model_version"],
                processing_time_ms=result.get("processing_time_ms", 0),
                features=result.get("features"),
                recommendations=result.get("recommendations", [])
            ))
        
        # Update metrics in background
        background_tasks.add_task(
            metrics.record_batch_prediction,
            len(analyses),
            failed_count,
            processing_time
        )
        
        response = BatchAnalysisResponse(
            analyses=analyses,
            batch_id=results[0].get("batch_id", "unknown") if results else "unknown",
            total_processed=len(analyses),
            processing_time_ms=processing_time,
            failed_analyses=failed_count
        )
        
        logger.info(f"Batch prediction completed: {len(analyses)} successful, {failed_count} failed")
        return response
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Batch prediction failed: {e}")
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


@app.get("/models", response_model=List[ModelInfo])
async def get_model_info():
    """Get information about loaded models"""
    try:
        if model_manager is None:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
        
        models_info = await model_manager.get_models_info()
        
        return [
            ModelInfo(
                name=info["name"],
                version=info["version"],
                type=info["type"],
                loaded=info["loaded"],
                last_updated=info["last_updated"],
                accuracy_metrics=info.get("accuracy_metrics")
            )
            for info in models_info
        ]
        
    except Exception as e:
        logger.error(f"Failed to get model info: {e}")
        raise HTTPException(status_code=500, detail="Failed to get model information")


@app.get("/metrics")
async def get_metrics(metrics: MetricsCollector = Depends(get_metrics_collector)):
    """Get service metrics"""
    try:
        return await metrics.get_metrics()
    except Exception as e:
        logger.error(f"Failed to get metrics: {e}")
        raise HTTPException(status_code=500, detail="Failed to get metrics")


@app.post("/models/reload")
async def reload_models():
    """Reload all models"""
    try:
        if model_manager is None:
            raise HTTPException(status_code=503, detail="Model manager not initialized")
        
        logger.info("Reloading models...")
        await model_manager.reload_models()
        
        return {"message": "Models reloaded successfully"}
        
    except Exception as e:
        logger.error(f"Failed to reload models: {e}")
        raise HTTPException(status_code=500, detail="Failed to reload models")


# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return {"error": "Not found", "detail": "Endpoint not found"}


@app.exception_handler(500)
async def internal_error_handler(request, exc):
    logger.error(f"Internal server error: {exc}")
    return {"error": "Internal server error", "detail": "An unexpected error occurred"}


if __name__ == "__main__":
    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        log_level="info"
    )