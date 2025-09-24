"""
Pydantic schemas for request/response validation.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class ParticipantInfo(BaseModel):
    """Individual participant in an expense."""
    user_id: str = Field(..., description="Unique user identifier")
    amount: float = Field(..., gt=0, description="Amount owed by this participant")


class ExpenseIn(BaseModel):
    """Input schema for expense fraud detection."""
    expense_id: str = Field(..., description="Unique expense identifier")
    group_id: str = Field(..., description="Group where expense was created")
    payer_id: str = Field(..., description="User who paid for the expense")
    participants: List[ParticipantInfo] = Field(..., min_items=1, description="List of participants")
    amount: float = Field(..., gt=0, le=1000000, description="Total expense amount")
    currency: str = Field(..., min_length=3, max_length=3, description="Currency code (ISO 4217)")
    merchant: Optional[str] = Field(None, description="Merchant name")
    category: Optional[str] = Field(None, description="Expense category")
    timestamp: str = Field(..., description="Expense creation time (ISO format)")
    itemized: Optional[Dict[str, Any]] = Field(None, description="Itemized breakdown")

    @validator('currency')
    def validate_currency(cls, v):
        """Validate currency code format."""
        if not v.isupper():
            raise ValueError('Currency must be uppercase')
        return v

    @validator('timestamp')
    def validate_timestamp(cls, v):
        """Validate timestamp format."""
        try:
            datetime.fromisoformat(v.replace('Z', '+00:00'))
        except ValueError:
            raise ValueError('Invalid timestamp format. Use ISO format.')
        return v

    @validator('participants')
    def validate_participants_amount(cls, v, values):
        """Validate that participant amounts sum to total amount."""
        if 'amount' not in values:
            return v
        
        total_participant_amount = sum(p.amount for p in v)
        total_amount = values['amount']
        
        # Allow small floating point differences
        if abs(total_participant_amount - total_amount) > 0.01:
            raise ValueError('Participant amounts must sum to total amount')
        
        return v


class RuleViolation(BaseModel):
    """Represents a rule violation."""
    rule_name: str = Field(..., description="Name of the violated rule")
    severity: str = Field(..., description="Severity level: low, medium, high")
    message: str = Field(..., description="Human-readable violation message")
    confidence: float = Field(..., ge=0, le=1, description="Confidence score for this rule")


class FeatureContribution(BaseModel):
    """Feature contribution for explainability."""
    feature_name: str = Field(..., description="Name of the feature")
    contribution: float = Field(..., description="Contribution score (positive = suspicious)")
    value: Union[str, float, int] = Field(..., description="Original feature value")


class PredictionResponse(BaseModel):
    """Response schema for fraud prediction."""
    expense_id: str = Field(..., description="Original expense ID")
    anomaly_score: float = Field(..., ge=0, le=1, description="ML anomaly score")
    is_suspicious: bool = Field(..., description="Binary fraud classification")
    model_version: str = Field(..., description="Version of the model used")
    reasons: List[RuleViolation] = Field(..., description="Rule violations found")
    explanation: List[FeatureContribution] = Field(..., description="Feature contributions")
    timestamp: str = Field(..., description="Prediction timestamp")


class TrainRequest(BaseModel):
    """Request schema for model training."""
    model_type: Optional[str] = Field("isolation_forest", description="Model type to train")
    params: Optional[Dict[str, Any]] = Field({}, description="Training parameters")


class TrainResponse(BaseModel):
    """Response schema for training request."""
    success: bool = Field(..., description="Training success status")
    model_version: str = Field(..., description="New model version")
    metrics: Dict[str, float] = Field(..., description="Training metrics")
    message: str = Field(..., description="Status message")


class HealthResponse(BaseModel):
    """Health check response schema."""
    status: str = Field(..., description="Service status")
    model_version: Optional[str] = Field(None, description="Current model version")
    last_trained_at: Optional[str] = Field(None, description="Last training timestamp")
    uptime_seconds: float = Field(..., description="Service uptime in seconds")


class FraudAlert(BaseModel):
    """Fraud alert schema for notifications."""
    event: str = Field("fraud_alert", description="Event type")
    expense: ExpenseIn = Field(..., description="Original expense data")
    anomaly: Dict[str, Any] = Field(..., description="Anomaly detection results")
    model_version: str = Field(..., description="Model version used")
    timestamp: str = Field(..., description="Alert timestamp")


class SimpleExpenseIn(BaseModel):
    """Simplified expense schema for demo/frontend use."""
    amount: float = Field(..., gt=0, description="Transaction amount")
    merchant_category: str = Field(..., description="Merchant category")
    time_of_transaction: str = Field(..., description="Time of transaction (HH:MM)")
    location: str = Field(..., description="Transaction location")
    payment_method: str = Field(..., description="Payment method")
    user_id: str = Field(default="demo_user", description="User ID")
    merchant_name: Optional[str] = Field(None, description="Merchant name")
    
    # Optional fields for compatibility
    category: Optional[str] = Field(None, description="Alternative category field")
    timestamp: Optional[str] = Field(None, description="Full timestamp")
    participants: Optional[List[str]] = Field(None, description="Simple participant list")
    group_id: Optional[str] = Field(None, description="Group ID")
    split_method: Optional[str] = Field(None, description="Split method")


class SimplePredictionResponse(BaseModel):
    """Simplified response schema for demo/frontend use."""
    is_fraud: bool
    fraud_probability: float
    risk_level: str
    confidence: float
    explanation: str
    feature_importance: Dict[str, float]
    processing_time: float
