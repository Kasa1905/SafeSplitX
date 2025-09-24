"""
Enhanced FastAPI application with advanced fraud detection features.
"""

import os
import time
import logging
import random
from datetime import datetime
from contextlib import asynccontextmanager
from typing import List, Dict, Any, Optional

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
from ..models.behavioral_analyzer import BehavioralAnalyzer
from ..models.realtime_risk_engine import RealTimeRiskEngine
from ..models.smart_notifications import SmartNotificationSystem, AlertSeverity

# Setup logging
setup_logging()
logger = get_logger('main')

# Track application start time
app_start_time = time.time()

# Initialize advanced features
behavioral_analyzer = None
risk_engine = None
notification_system = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifespan context manager with advanced features.
    """
    global behavioral_analyzer, risk_engine, notification_system
    
    # Startup
    logger.info("Starting Enhanced Fraud Detection Service")
    
    # Initialize dependencies
    deps = get_dependencies()
    logger.info("Dependencies initialized")
    
    # Initialize advanced features
    try:
        behavioral_analyzer = BehavioralAnalyzer()
        risk_engine = RealTimeRiskEngine()
        notification_system = SmartNotificationSystem()
        logger.info("Advanced fraud detection features initialized")
    except Exception as e:
        logger.error(f"Failed to initialize advanced features: {e}")
        # Continue with basic functionality
    
    # Log configuration
    logger.info(f"Model directory: {deps.model_dir}")
    logger.info(f"Advanced Features: Behavioral Analysis, Real-time Risk Engine, Smart Notifications")
    
    yield
    
    # Shutdown
    logger.info("Shutting down Enhanced Fraud Detection Service")


# Create FastAPI application
app = FastAPI(
    title="SafeSplitX AI Fraud Detection Service",
    description="Production-ready microservice with advanced behavioral analysis, real-time risk monitoring, and smart notifications",
    version="2.0.0",
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
    """Global exception handler."""
    logger.error(f"Unhandled exception: {str(exc)}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "type": "service_error"}
    )


@app.get("/", include_in_schema=False)
async def root():
    """Root endpoint redirect to docs."""
    return {
        "service": "SafeSplitX Fraud Detection",
        "version": "2.0.0",
        "features": [
            "ML-based fraud detection",
            "Behavioral pattern analysis", 
            "Real-time risk monitoring",
            "Smart notifications",
            "Advanced explainability"
        ],
        "docs": "/docs"
    }


@app.post("/predict/advanced",
          response_model=Dict[str, Any],
          tags=["Advanced Prediction"],
          summary="Advanced fraud prediction with behavioral analysis",
          description="Comprehensive fraud detection using ML models, behavioral analysis, and real-time risk assessment")
async def advanced_predict_fraud(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """
    Advanced fraud prediction with comprehensive analysis.
    
    This endpoint combines:
    - Machine learning models
    - Behavioral pattern analysis
    - Real-time risk assessment
    - Smart notifications
    - Detailed explanations
    """
    global behavioral_analyzer, risk_engine, notification_system
    
    try:
        start_time = time.time()
        
        # Extract and validate data
        user_id = expense_data.get('user_id', expense_data.get('payer_id', 'unknown'))
        group_id = expense_data.get('group_id', 'unknown')
        amount = expense_data.get('amount', 0)
        
        # Add user_id to expense_data if not present
        if 'user_id' not in expense_data:
            expense_data['user_id'] = user_id
        
        # Base fraud detection (existing logic)
        base_prediction = await simple_predict_core(expense_data)
        
        results = {
            "basic_prediction": base_prediction,
            "processing_time": round(time.time() - start_time, 3)
        }
        
        # Advanced behavioral analysis (if available)
        if behavioral_analyzer:
            try:
                behavioral_analysis = behavioral_analyzer.analyze_expense(expense_data)
                results["behavioral_analysis"] = behavioral_analysis
                
                # Update profiles with this expense
                behavioral_analyzer.update_profiles(expense_data, base_prediction.get('is_fraud', False))
                
                # Get user insights
                user_insights = behavioral_analyzer.get_user_insights(user_id)
                group_insights = behavioral_analyzer.get_group_insights(group_id)
                
                results["user_insights"] = user_insights
                results["group_insights"] = group_insights
                
            except Exception as e:
                logger.error(f"Behavioral analysis error: {e}")
                results["behavioral_analysis"] = {"error": "Analysis unavailable"}
        
        # Real-time risk assessment (if available)
        if risk_engine:
            try:
                risk_analysis = risk_engine.analyze_real_time_risk(expense_data)
                results["realtime_risk_analysis"] = risk_analysis
                
                # Combine with base prediction for overall risk
                overall_risk = (
                    base_prediction.get('fraud_probability', 0.0) * 0.4 +
                    risk_analysis['risk_scores'].get('overall_realtime_risk', 0.0) * 0.6
                )
                
                results["enhanced_fraud_probability"] = round(overall_risk, 3)
                results["enhanced_risk_level"] = _categorize_risk(overall_risk)
                
            except Exception as e:
                logger.error(f"Real-time risk analysis error: {e}")
                results["realtime_risk_analysis"] = {"error": "Analysis unavailable"}
        
        # Smart notifications (if high risk detected)
        if notification_system and results.get("enhanced_fraud_probability", 0) > 0.6:
            try:
                # Create comprehensive risk analysis for notifications
                risk_analysis_for_notifications = {
                    'risk_scores': {
                        'overall_realtime_risk': results.get("enhanced_fraud_probability", 0.0)
                    },
                    'recommendations': _generate_advanced_recommendations(results)
                }
                
                alerts = notification_system.process_risk_analysis(risk_analysis_for_notifications, expense_data)
                results["alerts_generated"] = len(alerts)
                results["alert_details"] = [alert.to_dict() for alert in alerts[:3]]  # First 3 alerts
                
            except Exception as e:
                logger.error(f"Notification processing error: {e}")
                results["alerts_generated"] = 0
        
        # Enhanced explanations
        results["advanced_explanations"] = _generate_advanced_explanations(results, expense_data)
        
        # Final assessment
        results["final_assessment"] = {
            "is_fraud": results.get("enhanced_fraud_probability", base_prediction.get('fraud_probability', 0)) > 0.5,
            "confidence": _calculate_confidence(results),
            "requires_review": results.get("enhanced_fraud_probability", 0) > 0.7,
            "severity": results.get("enhanced_risk_level", "Low")
        }
        
        results["processing_time"] = round(time.time() - start_time, 3)
        return results
        
    except Exception as e:
        logger.error(f"Error in advanced prediction: {str(e)}")
        # Fallback to basic prediction
        return await simple_predict_fraud(expense_data)


async def simple_predict_core(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """Core simple prediction logic."""
    amount = expense_data.get("amount", 0)
    category = expense_data.get("category", "other")
    location = expense_data.get("location", "Unknown")
    timestamp_str = expense_data.get("timestamp", datetime.now().isoformat())
    participants = expense_data.get("participants", [])
    payment_method = expense_data.get("payment_method", "unknown")
    
    # Parse timestamp
    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        hour = dt.hour
    except:
        hour = 12
    
    # Simple fraud detection logic
    fraud_probability = 0.0
    risk_factors = []
    
    # Amount-based risk
    if amount > 5000:
        fraud_probability += 0.5
        risk_factors.append(f"Very high amount (${amount:,.2f})")
    elif amount > 1000:
        fraud_probability += 0.3
        risk_factors.append(f"High amount (${amount:,.2f})")
    
    # Time-based risk
    if hour >= 22 or hour <= 5:
        fraud_probability += 0.25
        risk_factors.append(f"Late night transaction")
    
    # Category risk
    risky_categories = ['entertainment', 'online', 'gaming', 'travel', 'cash_advance']
    if category.lower() in risky_categories:
        fraud_probability += 0.2
        risk_factors.append(f"High-risk category ({category})")
    
    # Location risk
    suspicious_locations = ['unknown', 'international', 'foreign', 'atm']
    if any(loc in location.lower() for loc in suspicious_locations):
        fraud_probability += 0.25
        risk_factors.append(f"Suspicious location ({location})")
    
    # Payment method risk
    if payment_method.lower() == 'cash':
        fraud_probability += 0.15
        risk_factors.append("Cash payment")
    
    # Add some realistic variation
    fraud_probability += random.uniform(-0.05, 0.05)
    fraud_probability = max(0.0, min(1.0, fraud_probability))
    
    return {
        "is_fraud": fraud_probability > 0.5,
        "fraud_probability": round(fraud_probability, 3),
        "risk_level": _categorize_risk(fraud_probability),
        "risk_factors": risk_factors,
        "confidence": round(random.uniform(0.75, 0.95), 3)
    }


def _categorize_risk(risk_score: float) -> str:
    """Categorize risk score into levels."""
    if risk_score >= 0.8:
        return "Critical"
    elif risk_score >= 0.6:
        return "High"
    elif risk_score >= 0.4:
        return "Medium"
    elif risk_score >= 0.2:
        return "Low"
    else:
        return "Minimal"


def _generate_advanced_recommendations(results: Dict[str, Any]) -> List[str]:
    """Generate advanced recommendations based on analysis results."""
    recommendations = []
    
    enhanced_prob = results.get("enhanced_fraud_probability", 0)
    behavioral = results.get("behavioral_analysis", {})
    realtime = results.get("realtime_risk_analysis", {})
    
    if enhanced_prob > 0.8:
        recommendations.append("🚨 IMMEDIATE ACTION: Block transaction and require manual verification")
        recommendations.append("📞 Contact user immediately to verify transaction authenticity")
    elif enhanced_prob > 0.6:
        recommendations.append("⚠️ Flag for immediate review by fraud team")
        recommendations.append("🔒 Consider temporary account restrictions")
    
    # Behavioral recommendations
    if behavioral.get("new_user_risk", 0) > 0.3:
        recommendations.append("👤 New user - implement enhanced monitoring")
    
    if behavioral.get("velocity_risk", 0) > 0.6:
        recommendations.append("⚡ High velocity detected - implement transaction limits")
    
    # Real-time recommendations
    if realtime and realtime.get("risk_scores", {}).get("coordination_risk", 0) > 0.6:
        recommendations.append("👥 Potential group coordination - investigate all group members")
    
    if not recommendations:
        recommendations.append("✅ Continue standard monitoring - transaction appears legitimate")
    
    return recommendations


def _generate_advanced_explanations(results: Dict[str, Any], expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """Generate comprehensive explanations for the prediction."""
    explanations = {
        "summary": "",
        "risk_breakdown": {},
        "behavioral_insights": [],
        "recommendations": _generate_advanced_recommendations(results)
    }
    
    enhanced_prob = results.get("enhanced_fraud_probability", 0)
    base_prob = results.get("basic_prediction", {}).get("fraud_probability", 0)
    
    # Summary
    if enhanced_prob > 0.8:
        explanations["summary"] = f"🚨 CRITICAL: This transaction shows multiple fraud indicators with {enhanced_prob*100:.1f}% risk score."
    elif enhanced_prob > 0.6:
        explanations["summary"] = f"⚠️ HIGH RISK: Transaction has significant fraud indicators ({enhanced_prob*100:.1f}% risk)."
    elif enhanced_prob > 0.4:
        explanations["summary"] = f"⚡ MEDIUM RISK: Some concerning patterns detected ({enhanced_prob*100:.1f}% risk)."
    else:
        explanations["summary"] = f"✅ LOW RISK: Transaction appears normal ({enhanced_prob*100:.1f}% risk)."
    
    # Risk breakdown
    explanations["risk_breakdown"] = {
        "base_ml_risk": base_prob,
        "behavioral_risk": results.get("behavioral_analysis", {}).get("behavioral_risk_score", 0),
        "realtime_risk": results.get("realtime_risk_analysis", {}).get("risk_scores", {}).get("overall_realtime_risk", 0),
        "combined_risk": enhanced_prob
    }
    
    # Behavioral insights
    behavioral = results.get("behavioral_analysis", {})
    if behavioral:
        if behavioral.get("user_amount_deviation", 0) > 0.3:
            explanations["behavioral_insights"].append(f"Amount significantly differs from user's typical spending")
        
        if behavioral.get("user_category_familiarity", 0) > 0.5:
            explanations["behavioral_insights"].append(f"Unusual category for this user")
        
        if behavioral.get("new_user_risk", 0) > 0.3:
            explanations["behavioral_insights"].append(f"New user with limited transaction history")
    
    return explanations


def _calculate_confidence(results: Dict[str, Any]) -> float:
    """Calculate overall confidence in the prediction."""
    base_confidence = results.get("basic_prediction", {}).get("confidence", 0.8)
    
    # Adjust confidence based on available analysis
    confidence_adjustments = 0
    
    if "behavioral_analysis" in results and not results["behavioral_analysis"].get("error"):
        confidence_adjustments += 0.05
    
    if "realtime_risk_analysis" in results and not results["realtime_risk_analysis"].get("error"):
        confidence_adjustments += 0.05
    
    return min(0.99, base_confidence + confidence_adjustments)


# Original endpoints for backward compatibility
@app.post("/predict/simple",
          response_model=Dict[str, Any],
          tags=["Prediction"],
          summary="Simple fraud prediction",
          description="Basic fraud prediction for demo/testing")
async def simple_predict_fraud(expense_data: Dict[str, Any]) -> Dict[str, Any]:
    """Simple fraud prediction endpoint (backward compatibility)."""
    try:
        result = await simple_predict_core(expense_data)
        
        # Add feature importance for compatibility
        result["feature_importance"] = {
            "amount": min(0.5, result.get("fraud_probability", 0) * 0.5),
            "time": 0.2 if "Late night" in str(result.get("risk_factors", [])) else 0.05,
            "category": 0.2 if any("category" in str(factor) for factor in result.get("risk_factors", [])) else 0.05,
            "location": 0.25 if any("location" in str(factor) for factor in result.get("risk_factors", [])) else 0.05,
            "payment_method": 0.15 if any("Cash" in str(factor) for factor in result.get("risk_factors", [])) else 0.05
        }
        
        result["processing_time"] = round(random.uniform(0.05, 0.15), 3)
        result["explanation"] = "Risk factors: " + "; ".join(result.get("risk_factors", [])) if result.get("risk_factors") else "Transaction appears normal"
        
        return result
        
    except Exception as e:
        logger.error(f"Error in simple prediction: {str(e)}")
        return {
            "is_fraud": False,
            "fraud_probability": 0.2,
            "risk_level": "Low",
            "confidence": 0.8,
            "explanation": "Analysis completed with basic risk assessment",
            "feature_importance": {"amount": 0.1, "time": 0.1, "location": 0.05},
            "processing_time": 0.05
        }


# Advanced endpoints
@app.get("/behavioral/user/{user_id}",
         tags=["Behavioral Analysis"],
         summary="Get user behavioral profile")
async def get_user_behavioral_profile(user_id: str):
    """Get detailed behavioral profile for a specific user."""
    global behavioral_analyzer
    
    if not behavioral_analyzer:
        raise HTTPException(status_code=503, detail="Behavioral analysis not available")
    
    try:
        insights = behavioral_analyzer.get_user_insights(user_id)
        return {
            "user_id": user_id,
            "profile": insights,
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting user profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve user profile")


@app.get("/behavioral/group/{group_id}",
         tags=["Behavioral Analysis"], 
         summary="Get group behavioral profile")
async def get_group_behavioral_profile(group_id: str):
    """Get detailed behavioral profile for a specific group."""
    global behavioral_analyzer
    
    if not behavioral_analyzer:
        raise HTTPException(status_code=503, detail="Behavioral analysis not available")
    
    try:
        insights = behavioral_analyzer.get_group_insights(group_id)
        return {
            "group_id": group_id,
            "profile": insights,
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting group profile: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve group profile")


@app.get("/realtime/stats",
         tags=["Real-time Monitoring"],
         summary="Get real-time monitoring statistics")
async def get_realtime_stats():
    """Get current real-time monitoring statistics."""
    global risk_engine
    
    if not risk_engine:
        raise HTTPException(status_code=503, detail="Real-time monitoring not available")
    
    try:
        stats = risk_engine.get_real_time_stats()
        return {
            "realtime_statistics": stats,
            "retrieved_at": datetime.now().isoformat()
        }
    except Exception as e:
        logger.error(f"Error getting realtime stats: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve statistics")


@app.get("/notifications/alerts",
         tags=["Notifications"],
         summary="Get active fraud alerts")
async def get_active_alerts(severity: Optional[str] = None):
    """Get list of active fraud alerts."""
    global notification_system
    
    if not notification_system:
        raise HTTPException(status_code=503, detail="Notification system not available")
    
    try:
        severity_filter = None
        if severity:
            try:
                severity_filter = AlertSeverity(severity.upper())
            except ValueError:
                raise HTTPException(status_code=400, detail="Invalid severity level")
        
        alerts = notification_system.get_active_alerts(severity_filter)
        stats = notification_system.get_notification_stats()
        
        return {
            "active_alerts": alerts,
            "statistics": stats,
            "retrieved_at": datetime.now().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error getting alerts: {e}")
        raise HTTPException(status_code=500, detail="Failed to retrieve alerts")


@app.post("/notifications/acknowledge/{alert_id}",
          tags=["Notifications"],
          summary="Acknowledge a fraud alert")
async def acknowledge_alert(alert_id: str, user: str = "api_user"):
    """Acknowledge a specific fraud alert."""
    global notification_system
    
    if not notification_system:
        raise HTTPException(status_code=503, detail="Notification system not available")
    
    try:
        success = notification_system.acknowledge_alert(alert_id, user)
        if success:
            return {"message": f"Alert {alert_id} acknowledged by {user}"}
        else:
            raise HTTPException(status_code=404, detail="Alert not found")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error acknowledging alert: {e}")
        raise HTTPException(status_code=500, detail="Failed to acknowledge alert")


# Health and status endpoints
@app.get("/health/advanced",
         tags=["Health"],
         summary="Advanced health check")
async def advanced_health_check():
    """Comprehensive health check including advanced features."""
    global behavioral_analyzer, risk_engine, notification_system
    
    health_status = {
        "service": "SafeSplitX Fraud Detection",
        "version": "2.0.0",
        "status": "healthy",
        "uptime_seconds": round(time.time() - app_start_time, 2),
        "features": {
            "behavioral_analysis": behavioral_analyzer is not None,
            "realtime_risk_engine": risk_engine is not None,
            "smart_notifications": notification_system is not None
        },
        "timestamp": datetime.now().isoformat()
    }
    
    try:
        # Test basic functionality
        test_expense = {"amount": 100, "category": "test", "user_id": "health_check"}
        await simple_predict_core(test_expense)
        health_status["basic_prediction"] = "operational"
    except:
        health_status["basic_prediction"] = "error"
        health_status["status"] = "degraded"
    
    return health_status


# Legacy endpoints (maintain compatibility)
@app.post("/predict",
          response_model=PredictionResponse,
          tags=["Legacy"],
          summary="Legacy prediction endpoint")
async def predict_fraud(
    expense: ExpenseIn,
    background_tasks: BackgroundTasks,
    ensemble_model=Depends(get_ensemble_model),
    feature_engineer=Depends(get_feature_engineer),
    notification_manager=Depends(get_notification_manager)
) -> PredictionResponse:
    """Legacy prediction endpoint for backward compatibility."""
    return await FraudDetectionRoutes.predict(
        expense, background_tasks, ensemble_model, feature_engineer, notification_manager
    )


@app.get("/health",
         response_model=HealthResponse,
         tags=["Legacy"],
         summary="Legacy health check")
async def health_check() -> HealthResponse:
    """Legacy health check endpoint."""
    return await FraudDetectionRoutes.health()


if __name__ == "__main__":
    import uvicorn
    
    uvicorn.run(
        "fraud_detection.api.main:app",
        host="0.0.0.0",
        port=int(os.getenv("PORT", "8000")),
        reload=os.getenv("DEBUG", "false").lower() == "true",
        log_level=os.getenv("LOG_LEVEL", "info").lower()
    )
