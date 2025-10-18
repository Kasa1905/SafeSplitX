#!/usr/bin/env python3
"""
Mock AI Service for SafeSplitX Testing
Simulates the Python FastAPI AI service for integration testing
"""

from fastapi import FastAPI, HTTPException, BackgroundTasks
from pydantic import BaseModel
from typing import List, Optional, Dict, Any
import uvicorn
import random
import time
from datetime import datetime
import json

app = FastAPI(
    title="SafeSplitX AI Service Mock",
    description="Mock AI service for testing SafeSplitX integration",
    version="1.0.0"
)

# Pydantic models for request/response validation
class ExpenseAnalysisRequest(BaseModel):
    expense_id: str
    description: str
    amount: float
    category: str
    user_id: str
    timestamp: Optional[str] = None

class FraudIndicator(BaseModel):
    type: str
    description: str
    severity: str
    confidence: float

class FraudAnalysisResponse(BaseModel):
    expense_id: str
    risk_score: float
    risk_level: str
    indicators: List[FraudIndicator]
    predictions: Dict[str, float]
    recommendations: List[str]
    model_version: str
    processing_time: float

class CategoryPrediction(BaseModel):
    category: str
    confidence: float
    subcategory: Optional[str] = None

class CategorizationRequest(BaseModel):
    description: str
    amount: float

class CategorizationResponse(BaseModel):
    description: str
    predicted_categories: List[CategoryPrediction]
    suggested_tags: List[str]
    amount_category_match: float
    model_version: str

class BatchAnalysisRequest(BaseModel):
    expense_ids: List[str]

class HealthResponse(BaseModel):
    status: str
    version: str
    models_loaded: List[str]
    gpu_available: bool
    memory_usage: str
    uptime: float

# Mock data generators
def generate_fraud_analysis(expense_id: str, amount: float, description: str) -> FraudAnalysisResponse:
    """Generate mock fraud analysis based on expense characteristics"""
    
    # Determine risk based on amount and description
    risk_score = 0.05  # Default low risk
    indicators = []
    
    # High amount increases risk
    if amount > 1000:
        risk_score += 0.3
        indicators.append(FraudIndicator(
            type="amount_anomaly",
            description="Amount significantly higher than user average",
            severity="high" if amount > 2000 else "medium",
            confidence=0.85
        ))
    
    # Suspicious keywords
    suspicious_words = ["cash", "emergency", "urgent", "refund", "transfer"]
    if any(word in description.lower() for word in suspicious_words):
        risk_score += 0.25
        indicators.append(FraudIndicator(
            type="description_anomaly",
            description="Description contains suspicious keywords",
            severity="medium",
            confidence=0.72
        ))
    
    # Random additional factors
    if random.random() < 0.1:  # 10% chance of additional risk
        risk_score += random.uniform(0.1, 0.3)
        indicators.append(FraudIndicator(
            type="timing_anomaly",
            description="Transaction at unusual time",
            severity="low",
            confidence=0.45
        ))
    
    # Cap risk score
    risk_score = min(risk_score, 1.0)
    
    # Determine risk level
    if risk_score < 0.3:
        risk_level = "low"
    elif risk_score < 0.7:
        risk_level = "medium"
    else:
        risk_level = "high"
    
    # Generate recommendations based on risk
    recommendations = []
    if risk_level == "high":
        recommendations.extend([
            "Request additional verification",
            "Flag for manual review",
            "Check for receipt validation"
        ])
    elif risk_level == "medium":
        recommendations.extend([
            "Monitor for similar patterns",
            "Request receipt if above threshold"
        ])
    else:
        recommendations.append("Transaction appears normal")
    
    return FraudAnalysisResponse(
        expense_id=expense_id,
        risk_score=round(risk_score, 3),
        risk_level=risk_level,
        indicators=indicators,
        predictions={
            "is_legitimate": round(1 - risk_score, 3),
            "category_accuracy": round(random.uniform(0.7, 0.95), 3),
            "amount_reasonable": round(random.uniform(0.6, 0.9), 3)
        },
        recommendations=recommendations,
        model_version="2.1.0",
        processing_time=round(random.uniform(0.1, 0.5), 3)
    )

def generate_categorization(description: str, amount: float) -> CategorizationResponse:
    """Generate mock expense categorization"""
    
    # Category mapping based on keywords
    category_mappings = {
        "food": ["restaurant", "lunch", "dinner", "coffee", "starbucks", "mcdonalds", "pizza"],
        "transportation": ["uber", "taxi", "gas", "fuel", "parking", "subway", "train"],
        "entertainment": ["movie", "cinema", "concert", "game", "bar", "club"],
        "shopping": ["store", "shop", "amazon", "purchase", "buy"],
        "utilities": ["electric", "water", "internet", "phone", "bill"],
        "healthcare": ["doctor", "hospital", "pharmacy", "medical", "health"],
        "education": ["book", "course", "school", "university", "tuition"]
    }
    
    predictions = []
    desc_lower = description.lower()
    
    # Find matching categories
    for category, keywords in category_mappings.items():
        confidence = 0.1  # Base confidence
        for keyword in keywords:
            if keyword in desc_lower:
                confidence += 0.3
        
        if confidence > 0.1:
            predictions.append(CategoryPrediction(
                category=category,
                confidence=min(confidence, 0.95),
                subcategory=keywords[0] if keywords else None
            ))
    
    # If no matches found, use default categories
    if not predictions:
        predictions = [
            CategoryPrediction(category="other", confidence=0.6),
            CategoryPrediction(category="miscellaneous", confidence=0.4)
        ]
    
    # Sort by confidence
    predictions.sort(key=lambda x: x.confidence, reverse=True)
    predictions = predictions[:3]  # Top 3 predictions
    
    # Generate tags
    tags = []
    for keyword_list in category_mappings.values():
        for keyword in keyword_list:
            if keyword in desc_lower:
                tags.append(keyword)
    
    if not tags:
        tags = ["expense", "purchase"]
    
    return CategorizationResponse(
        description=description,
        predicted_categories=predictions,
        suggested_tags=tags[:5],  # Limit to 5 tags
        amount_category_match=round(random.uniform(0.7, 0.9), 3),
        model_version="1.3.0"
    )

# API Endpoints
@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint"""
    return HealthResponse(
        status="healthy",
        version="1.0.0",
        models_loaded=["fraud_detection", "expense_categorization", "pattern_analysis"],
        gpu_available=False,
        memory_usage="2.1GB",
        uptime=time.time()
    )

@app.post("/analyze-expense", response_model=FraudAnalysisResponse)
async def analyze_expense(request: ExpenseAnalysisRequest):
    """Analyze expense for fraud indicators"""
    
    # Simulate processing delay
    await asyncio.sleep(random.uniform(0.1, 0.3))
    
    return generate_fraud_analysis(
        expense_id=request.expense_id,
        amount=request.amount,
        description=request.description
    )

@app.post("/analyze-batch")
async def analyze_batch(request: BatchAnalysisRequest):
    """Batch analyze multiple expenses"""
    
    analyses = []
    for expense_id in request.expense_ids:
        # Generate mock analysis for each expense
        analysis = {
            "expense_id": expense_id,
            "risk_score": round(random.uniform(0.05, 0.8), 3),
            "risk_level": random.choice(["low", "medium", "high"]),
            "processing_time": round(random.uniform(0.1, 0.3), 3)
        }
        analyses.append(analysis)
    
    return {
        "analyses": analyses,
        "total_processed": len(request.expense_ids),
        "average_processing_time": round(sum(a["processing_time"] for a in analyses) / len(analyses), 3),
        "batch_id": f"batch_{int(time.time())}"
    }

@app.post("/categorize-expense", response_model=CategorizationResponse)
async def categorize_expense(request: CategorizationRequest):
    """Categorize expense using ML model"""
    
    return generate_categorization(
        description=request.description,
        amount=request.amount
    )

@app.post("/categorize-batch")
async def categorize_batch(request: Dict[str, Any]):
    """Batch categorize multiple expenses"""
    
    expenses = request.get("expenses", [])
    categorizations = []
    
    for expense in expenses:
        categorization = generate_categorization(
            description=expense.get("description", ""),
            amount=expense.get("amount", 0)
        )
        
        categorizations.append({
            "description": expense.get("description"),
            "predicted_category": categorization.predicted_categories[0].category if categorization.predicted_categories else "other",
            "confidence": categorization.predicted_categories[0].confidence if categorization.predicted_categories else 0.5,
            "subcategory": categorization.predicted_categories[0].subcategory if categorization.predicted_categories else None
        })
    
    avg_confidence = sum(c["confidence"] for c in categorizations) / len(categorizations) if categorizations else 0
    
    return {
        "categorizations": categorizations,
        "total_processed": len(expenses),
        "average_confidence": round(avg_confidence, 3)
    }

@app.post("/analyze-patterns")
async def analyze_patterns(request: Dict[str, Any]):
    """Analyze user spending patterns"""
    
    user_id = request.get("user_id")
    period = request.get("period", "30_days")
    
    return {
        "user_id": user_id,
        "analysis_period": period,
        "patterns": {
            "spending_frequency": {
                "daily_average": round(random.uniform(1.5, 3.0), 1),
                "weekly_average": round(random.uniform(10, 25), 1),
                "monthly_trend": random.choice(["increasing", "decreasing", "stable"])
            },
            "category_distribution": {
                "food": round(random.uniform(0.3, 0.6), 2),
                "transportation": round(random.uniform(0.15, 0.35), 2),
                "entertainment": round(random.uniform(0.05, 0.25), 2),
                "utilities": round(random.uniform(0.05, 0.15), 2),
                "other": round(random.uniform(0.02, 0.1), 2)
            },
            "amount_patterns": {
                "average_expense": round(random.uniform(25, 75), 2),
                "median_expense": round(random.uniform(20, 50), 2),
                "most_common_range": random.choice(["10-30", "20-50", "30-70"]),
                "outlier_threshold": round(random.uniform(100, 200), 2)
            },
            "temporal_patterns": {
                "peak_day": random.choice(["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]),
                "peak_hour": random.randint(9, 21),
                "weekend_vs_weekday_ratio": round(random.uniform(0.8, 1.5), 2)
            }
        },
        "anomalies": [
            {
                "type": "amount_spike",
                "description": "Expense 3x higher than average",
                "expense_id": f"expense_{random.randint(100, 999)}",
                "severity": random.choice(["low", "medium", "high"])
            }
        ],
        "predictions": {
            "next_month_spending": round(random.uniform(800, 1500), 2),
            "budget_adherence_probability": round(random.uniform(0.6, 0.9), 2),
            "category_shifts": [random.choice(["increase_in_food", "increase_in_transportation", "decrease_in_entertainment"])]
        },
        "confidence_score": round(random.uniform(0.75, 0.95), 2)
    }

@app.post("/detect-anomalies")
async def detect_anomalies(request: Dict[str, Any]):
    """Detect spending anomalies"""
    
    user_id = request.get("user_id")
    
    anomalies = []
    
    # Generate random anomalies
    if random.random() < 0.7:  # 70% chance of finding anomalies
        anomalies.append({
            "type": "unusual_amount",
            "expense_id": f"expense_{random.randint(100, 999)}",
            "description": "Amount significantly higher than normal",
            "severity": random.choice(["medium", "high"]),
            "anomaly_score": round(random.uniform(0.7, 0.95), 2),
            "expected_range": [20, 80],
            "actual_amount": random.randint(250, 500)
        })
    
    if random.random() < 0.3:  # 30% chance of timing anomaly
        anomalies.append({
            "type": "unusual_timing",
            "expense_id": f"expense_{random.randint(100, 999)}",
            "description": "Transaction at unusual time",
            "severity": "low",
            "anomaly_score": round(random.uniform(0.3, 0.6), 2),
            "typical_time_range": "09:00-18:00",
            "actual_time": random.choice(["03:15", "23:45", "02:30", "04:12"])
        })
    
    return {
        "user_id": user_id,
        "anomalies": anomalies,
        "total_expenses_analyzed": random.randint(30, 100),
        "anomaly_rate": round(len(anomalies) / random.randint(30, 100), 3),
        "risk_assessment": random.choice(["low", "medium", "high"])
    }

@app.get("/metrics")
async def get_metrics():
    """Get model performance metrics"""
    
    return {
        "models": {
            "fraud_detection": {
                "version": "2.1.0",
                "accuracy": round(random.uniform(0.90, 0.96), 3),
                "precision": round(random.uniform(0.88, 0.94), 3),
                "recall": round(random.uniform(0.85, 0.92), 3),
                "f1_score": round(random.uniform(0.87, 0.93), 3),
                "last_retrained": "2024-01-15T10:30:00Z",
                "total_predictions": random.randint(10000, 20000),
                "error_rate": round(random.uniform(0.008, 0.015), 3)
            },
            "expense_categorization": {
                "version": "1.3.0",
                "accuracy": round(random.uniform(0.84, 0.90), 3),
                "top_3_accuracy": round(random.uniform(0.94, 0.98), 3),
                "category_coverage": round(random.uniform(0.90, 0.95), 3),
                "last_retrained": "2024-01-10T14:20:00Z",
                "total_predictions": random.randint(20000, 30000),
                "error_rate": round(random.uniform(0.005, 0.012), 3)
            }
        },
        "system_metrics": {
            "average_response_time": round(random.uniform(0.120, 0.180), 3),
            "requests_per_minute": round(random.uniform(35, 55), 1),
            "memory_usage": f"{round(random.uniform(1.8, 2.5), 1)}GB",
            "cpu_usage": round(random.uniform(0.25, 0.45), 2),
            "gpu_usage": round(random.uniform(0.60, 0.80), 2)
        }
    }

@app.get("/retrain-status")
async def get_retrain_status():
    """Get model retraining status"""
    
    return {
        "fraud_detection": {
            "status": random.choice(["training", "completed", "pending"]),
            "progress": round(random.uniform(0.0, 1.0), 2),
            "estimated_completion": "2024-01-20T16:00:00Z",
            "new_data_samples": random.randint(1000, 2000),
            "validation_accuracy": round(random.uniform(0.90, 0.95), 3)
        },
        "expense_categorization": {
            "status": "completed",
            "completion_time": "2024-01-18T12:30:00Z",
            "improvement": round(random.uniform(0.01, 0.05), 3),
            "deployed": True
        }
    }

# Error simulation endpoints
@app.post("/simulate-error")
async def simulate_error():
    """Endpoint to simulate various error conditions for testing"""
    error_type = random.choice(["500", "503", "timeout", "invalid_response"])
    
    if error_type == "500":
        raise HTTPException(status_code=500, detail="Internal server error")
    elif error_type == "503":
        raise HTTPException(status_code=503, detail="Service temporarily unavailable")
    elif error_type == "timeout":
        await asyncio.sleep(10)  # Simulate timeout
        return {"status": "timeout"}
    else:
        return {"invalid": "response format"}

# Add asyncio import for sleep functions
import asyncio

if __name__ == "__main__":
    print("Starting SafeSplitX AI Service Mock...")
    print("Health check: http://localhost:8000/health")
    print("API Documentation: http://localhost:8000/docs")
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info",
        access_log=True
    )