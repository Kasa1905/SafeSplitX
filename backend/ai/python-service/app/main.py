from fastapi import FastAPI, HTTPException, Depends, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from contextlib import asynccontextmanager
import structlog
import asyncio
from typing import List, Dict, Any, Optional
import time
import uuid
from datetime import datetime
import os
import sys

# Add the app directory to Python path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from models.model_manager import ModelManager
from models.fraud_detector import FraudDetector
from api.schemas import (
    ExpenseData, 
    FraudAnalysisRequest, 
    FraudAnalysisResponse,
    BulkFraudAnalysisRequest,
    BulkFraudAnalysisResponse,
    HealthResponse,
    ModelStatusResponse
)
from core.config import settings
from core.logging import setup_logging
from core.metrics import MetricsCollector
from utils.preprocessing import DataPreprocessor
from utils.feature_extractor import FeatureExtractor

# Setup logging
setup_logging()
logger = structlog.get_logger(__name__)

# Global variables
model_manager = None
fraud_detector = None
metrics_collector = None
data_preprocessor = None
feature_extractor = None

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application startup and shutdown"""
    global model_manager, fraud_detector, metrics_collector, data_preprocessor, feature_extractor
    
    # Startup
    logger.info("Starting SafeSplitX AI Fraud Detection Service", version=settings.VERSION)
    
    try:
        # Initialize components
        logger.info("Initializing components...")
        
        model_manager = ModelManager()
        metrics_collector = MetricsCollector()
        data_preprocessor = DataPreprocessor()
        feature_extractor = FeatureExtractor()
        
        # Load models
        logger.info("Loading ML models...")
        await model_manager.initialize()
        
        # Initialize fraud detector
        fraud_detector = FraudDetector(
            model_manager=model_manager,
            feature_extractor=feature_extractor,
            metrics_collector=metrics_collector
        )
        
        logger.info("Service startup completed successfully")
        
    except Exception as e:
        logger.error("Failed to initialize service", error=str(e))
        raise e
        
    yield
    
    # Shutdown
    logger.info("Shutting down SafeSplitX AI Fraud Detection Service")
    
    try:
        if model_manager:
            await model_manager.cleanup()
        if metrics_collector:
            await metrics_collector.shutdown()
        logger.info("Service shutdown completed successfully")
    except Exception as e:
        logger.error("Error during shutdown", error=str(e))

# Create FastAPI application
app = FastAPI(
    title="SafeSplitX AI Fraud Detection Service",
    description="AI-powered fraud detection service for expense analysis",
    version=settings.VERSION,
    docs_url="/docs" if settings.DEBUG else None,
    redoc_url="/redoc" if settings.DEBUG else None,
    lifespan=lifespan
)

# Add middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

# Dependency to get components
def get_fraud_detector() -> FraudDetector:
    if fraud_detector is None:
        raise HTTPException(
            status_code=503, 
            detail="Fraud detection service not initialized"
        )
    return fraud_detector

def get_model_manager() -> ModelManager:
    if model_manager is None:
        raise HTTPException(
            status_code=503, 
            detail="Model manager not initialized"
        )
    return model_manager

def get_metrics_collector() -> MetricsCollector:
    if metrics_collector is None:
        raise HTTPException(
            status_code=503, 
            detail="Metrics collector not initialized"
        )
    return metrics_collector

@app.get("/health", response_model=HealthResponse)
async def health_check(
    manager: ModelManager = Depends(get_model_manager),
    metrics: MetricsCollector = Depends(get_metrics_collector)
):
    """Health check endpoint"""
    try:
        # Check model status
        model_status = await manager.get_model_status()
        
        # Get system metrics
        system_metrics = await metrics.get_system_metrics()
        
        # Determine overall health
        is_healthy = (
            model_status.get("fraud_detection", {}).get("status") == "ready" and
            system_metrics.get("memory_usage", 1.0) < 0.9 and
            system_metrics.get("cpu_usage", 1.0) < 0.9
        )
        
        return HealthResponse(
            status="healthy" if is_healthy else "degraded",
            timestamp=datetime.utcnow(),
            version=settings.VERSION,
            models=model_status,
            metrics=system_metrics
        )
        
    except Exception as e:
        logger.error("Health check failed", error=str(e))
        return HealthResponse(
            status="unhealthy",
            timestamp=datetime.utcnow(),
            version=settings.VERSION,
            error=str(e)
        )

@app.get("/models/status", response_model=ModelStatusResponse)
async def get_model_status(manager: ModelManager = Depends(get_model_manager)):
    """Get status of all loaded models"""
    try:
        status = await manager.get_model_status()
        return ModelStatusResponse(
            models=status,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        logger.error("Failed to get model status", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/models/reload")
async def reload_models(
    background_tasks: BackgroundTasks,
    manager: ModelManager = Depends(get_model_manager)
):
    """Reload all models in the background"""
    try:
        background_tasks.add_task(manager.reload_all_models)
        return {"message": "Model reload initiated", "timestamp": datetime.utcnow()}
    except Exception as e:
        logger.error("Failed to initiate model reload", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/analyze/expense", response_model=FraudAnalysisResponse)
async def analyze_expense(
    request: FraudAnalysisRequest,
    detector: FraudDetector = Depends(get_fraud_detector),
    metrics: MetricsCollector = Depends(get_metrics_collector)
):
    """Analyze a single expense for fraud"""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        logger.info(
            "Processing fraud analysis request",
            request_id=request_id,
            expense_amount=request.expense.amount
        )
        
        # Track request
        await metrics.track_request("analyze_expense")
        
        # Perform analysis
        result = await detector.analyze_expense(
            expense_data=request.expense,
            context=request.context
        )
        
        processing_time = time.time() - start_time
        
        # Track processing time
        await metrics.track_processing_time("analyze_expense", processing_time)
        
        logger.info(
            "Fraud analysis completed",
            request_id=request_id,
            fraud_score=result.fraud_score,
            processing_time=processing_time
        )
        
        return FraudAnalysisResponse(
            request_id=request_id,
            fraud_score=result.fraud_score,
            risk_level=result.risk_level,
            confidence=result.confidence,
            features=result.features,
            model_version=result.model_version,
            processing_time=processing_time,
            timestamp=datetime.utcnow(),
            anomaly_scores=result.anomaly_scores,
            risk_factors=result.risk_factors,
            explanation=result.explanation
        )
        
    except Exception as e:
        processing_time = time.time() - start_time
        await metrics.track_error("analyze_expense")
        
        logger.error(
            "Fraud analysis failed",
            request_id=request_id,
            error=str(e),
            processing_time=processing_time
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Fraud analysis failed: {str(e)}"
        )

@app.post("/analyze/bulk", response_model=BulkFraudAnalysisResponse)
async def analyze_bulk_expenses(
    request: BulkFraudAnalysisRequest,
    detector: FraudDetector = Depends(get_fraud_detector),
    metrics: MetricsCollector = Depends(get_metrics_collector)
):
    """Analyze multiple expenses for fraud"""
    start_time = time.time()
    request_id = str(uuid.uuid4())
    
    try:
        expense_count = len(request.expenses)
        
        logger.info(
            "Processing bulk fraud analysis request",
            request_id=request_id,
            expense_count=expense_count
        )
        
        # Validate batch size
        if expense_count > settings.MAX_BATCH_SIZE:
            raise HTTPException(
                status_code=400,
                detail=f"Batch size {expense_count} exceeds maximum {settings.MAX_BATCH_SIZE}"
            )
        
        # Track request
        await metrics.track_request("analyze_bulk")
        
        # Perform bulk analysis
        results = await detector.analyze_expenses_bulk(
            expenses_data=request.expenses,
            context=request.context
        )
        
        processing_time = time.time() - start_time
        
        # Track processing time
        await metrics.track_processing_time("analyze_bulk", processing_time)
        
        # Calculate summary statistics
        fraud_scores = [r.fraud_score for r in results]
        summary = {
            "total_analyzed": len(results),
            "high_risk": len([s for s in fraud_scores if s >= 0.7]),
            "medium_risk": len([s for s in fraud_scores if 0.3 <= s < 0.7]),
            "low_risk": len([s for s in fraud_scores if s < 0.3]),
            "avg_score": sum(fraud_scores) / len(fraud_scores) if fraud_scores else 0,
            "max_score": max(fraud_scores) if fraud_scores else 0,
            "min_score": min(fraud_scores) if fraud_scores else 0
        }
        
        logger.info(
            "Bulk fraud analysis completed",
            request_id=request_id,
            expense_count=expense_count,
            processing_time=processing_time,
            summary=summary
        )
        
        return BulkFraudAnalysisResponse(
            request_id=request_id,
            results=results,
            summary=summary,
            processing_time=processing_time,
            timestamp=datetime.utcnow()
        )
        
    except HTTPException:
        raise
    except Exception as e:
        processing_time = time.time() - start_time
        await metrics.track_error("analyze_bulk")
        
        logger.error(
            "Bulk fraud analysis failed",
            request_id=request_id,
            error=str(e),
            processing_time=processing_time
        )
        
        raise HTTPException(
            status_code=500,
            detail=f"Bulk fraud analysis failed: {str(e)}"
        )

@app.get("/metrics")
async def get_metrics(metrics: MetricsCollector = Depends(get_metrics_collector)):
    """Get service metrics"""
    try:
        return await metrics.get_all_metrics()
    except Exception as e:
        logger.error("Failed to get metrics", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/feedback")
async def submit_feedback(
    request_id: str,
    is_fraud: bool,
    confidence: Optional[float] = None,
    notes: Optional[str] = None,
    detector: FraudDetector = Depends(get_fraud_detector)
):
    """Submit feedback for model improvement"""
    try:
        await detector.submit_feedback(
            request_id=request_id,
            is_fraud=is_fraud,
            confidence=confidence,
            notes=notes
        )
        
        logger.info(
            "Feedback submitted",
            request_id=request_id,
            is_fraud=is_fraud,
            confidence=confidence
        )
        
        return {"message": "Feedback submitted successfully", "timestamp": datetime.utcnow()}
        
    except Exception as e:
        logger.error("Failed to submit feedback", error=str(e))
        raise HTTPException(status_code=500, detail=str(e))

@app.exception_handler(Exception)
async def global_exception_handler(request, exc):
    """Global exception handler"""
    logger.error(
        "Unhandled exception",
        path=str(request.url),
        method=request.method,
        error=str(exc)
    )
    
    return JSONResponse(
        status_code=500,
        content={
            "error": "Internal server error",
            "timestamp": datetime.utcnow().isoformat()
        }
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info"
    )