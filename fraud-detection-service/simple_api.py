"""
Simplified mock fraud detection API for demo purposes.
This version works without PyTorch/SHAP dependencies.
"""

import random
import time
from datetime import datetime
from typing import Dict, Any, List

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field


class ExpenseIn(BaseModel):
    """Input schema for expense prediction."""
    amount: float = Field(..., description="Transaction amount")
    merchant_category: str = Field(..., description="Merchant category")
    time_of_transaction: str = Field(..., description="Time of transaction (HH:MM)")
    location: str = Field(..., description="Transaction location")
    payment_method: str = Field(..., description="Payment method")
    user_id: str = Field(default="demo_user", description="User ID")


class PredictionResponse(BaseModel):
    """Response schema for fraud prediction."""
    is_fraud: bool
    fraud_probability: float
    risk_level: str
    confidence: float
    explanation: str
    feature_importance: Dict[str, float]
    processing_time: float


class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    timestamp: str
    uptime: float
    version: str = "1.0.0-mock"


# Create FastAPI app
app = FastAPI(
    title="Fraud Detection API (Mock)",
    description="Mock version of fraud detection service for demo purposes",
    version="1.0.0-mock"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Track start time
start_time = time.time()

# Mock fraud detection logic
def mock_fraud_detection(expense: ExpenseIn) -> PredictionResponse:
    """
    Mock fraud detection that generates realistic responses.
    """
    processing_start = time.time()
    
    # Simple rule-based mock logic for demonstration
    fraud_probability = 0.0
    
    # High amount increases fraud probability
    if expense.amount > 1000:
        fraud_probability += 0.3
    if expense.amount > 5000:
        fraud_probability += 0.4
    
    # Late night transactions are more suspicious
    hour = int(expense.time_of_transaction.split(':')[0])
    if hour >= 22 or hour <= 5:
        fraud_probability += 0.2
    
    # Certain categories are riskier
    risky_categories = ['ATM', 'Online', 'Gas Station', 'Entertainment']
    if expense.merchant_category in risky_categories:
        fraud_probability += 0.15
    
    # International locations are riskier
    international_indicators = ['International', 'Foreign', 'Online', 'Unknown']
    if any(indicator in expense.location for indicator in international_indicators):
        fraud_probability += 0.25
    
    # Add some randomness to make it realistic
    fraud_probability += random.uniform(-0.1, 0.1)
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
    factors = []
    if expense.amount > 1000:
        factors.append(f"High transaction amount (${expense.amount:,.2f})")
    if hour >= 22 or hour <= 5:
        factors.append(f"Late night transaction ({expense.time_of_transaction})")
    if expense.merchant_category in risky_categories:
        factors.append(f"Risky merchant category ({expense.merchant_category})")
    if any(indicator in expense.location for indicator in international_indicators):
        factors.append(f"Suspicious location ({expense.location})")
    
    if factors:
        explanation = "Risk factors detected: " + "; ".join(factors)
    else:
        explanation = "Transaction appears normal with standard risk factors"
    
    # Mock feature importance
    feature_importance = {
        "amount": min(0.4, expense.amount / 10000),
        "time": 0.3 if (hour >= 22 or hour <= 5) else 0.1,
        "category": 0.2 if expense.merchant_category in risky_categories else 0.05,
        "location": 0.25 if any(indicator in expense.location for indicator in international_indicators) else 0.1,
        "payment_method": random.uniform(0.05, 0.15)
    }
    
    processing_time = time.time() - processing_start
    
    return PredictionResponse(
        is_fraud=is_fraud,
        fraud_probability=fraud_probability,
        risk_level=risk_level,
        confidence=random.uniform(0.75, 0.95),  # Mock confidence
        explanation=explanation,
        feature_importance=feature_importance,
        processing_time=processing_time
    )


@app.get("/", response_model=Dict[str, str])
async def root():
    """Root endpoint."""
    return {"message": "Fraud Detection API (Mock Version)", "status": "running"}


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Health check endpoint."""
    uptime = time.time() - start_time
    return HealthResponse(
        status="healthy",
        timestamp=datetime.now().isoformat(),
        uptime=uptime
    )


@app.post("/predict", response_model=PredictionResponse)
async def predict_fraud(expense: ExpenseIn):
    """
    Predict if an expense is fraudulent.
    """
    try:
        prediction = mock_fraud_detection(expense)
        return prediction
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Prediction failed: {str(e)}")


@app.post("/predict/batch")
async def predict_fraud_batch(expenses: List[ExpenseIn]):
    """
    Predict fraud for multiple expenses.
    """
    try:
        predictions = []
        for expense in expenses:
            prediction = mock_fraud_detection(expense)
            predictions.append({
                "expense": expense.dict(),
                "prediction": prediction
            })
        return {"predictions": predictions, "count": len(predictions)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Batch prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
