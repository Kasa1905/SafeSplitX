#!/usr/bin/env python3
"""
Simple test script for the fraud detection system.
"""

import sys
import os
import json
from datetime import datetime

# Add the current directory to Python path
sys.path.append('.')

def test_fraud_detection():
    """Test the fraud detection logic."""
    print("🧪 SafeSplitX Fraud Detection System Test")
    print("=" * 50)
    
    # Sample high-risk transaction
    high_risk_expense = {
        "amount": 2500.0,
        "category": "entertainment", 
        "location": "Las Vegas Casino",
        "payment_method": "cash",
        "timestamp": "2024-01-15T03:15:00Z",
        "user_id": "user_789",
        "group_id": "group_123",
        "merchant_name": "Lucky Seven Casino",
        "participants": [
            {"user_id": "user_789", "amount": 1250.0},
            {"user_id": "user_456", "amount": 1250.0}
        ]
    }
    
    # Sample low-risk transaction
    low_risk_expense = {
        "amount": 45.50,
        "category": "dining",
        "location": "New York",
        "payment_method": "credit_card", 
        "timestamp": "2024-01-15T19:30:00Z",
        "user_id": "user_123",
        "group_id": "group_456",
        "merchant_name": "Tony's Pizza",
        "participants": [
            {"user_id": "user_123", "amount": 22.75},
            {"user_id": "user_789", "amount": 22.75}
        ]
    }
    
    print("🧪 Testing High-Risk Transaction:")
    print(f"   Amount: ${high_risk_expense['amount']:,.2f}")
    print(f"   Category: {high_risk_expense['category']}")
    print(f"   Location: {high_risk_expense['location']}")
    print(f"   Payment: {high_risk_expense['payment_method']}")
    print(f"   Time: {high_risk_expense['timestamp']}")
    
    result_high = analyze_fraud_simple(high_risk_expense)
    print_results("HIGH-RISK", result_high)
    
    print("\n" + "="*50)
    print("🧪 Testing Low-Risk Transaction:")
    print(f"   Amount: ${low_risk_expense['amount']:,.2f}")
    print(f"   Category: {low_risk_expense['category']}")
    print(f"   Location: {low_risk_expense['location']}")
    print(f"   Payment: {low_risk_expense['payment_method']}")
    print(f"   Time: {low_risk_expense['timestamp']}")
    
    result_low = analyze_fraud_simple(low_risk_expense)
    print_results("LOW-RISK", result_low)
    
    print("\n" + "="*50)
    print("✅ Fraud Detection System Test Complete!")
    
    # Summary
    print(f"\n📊 SUMMARY:")
    print(f"High-risk transaction fraud probability: {result_high['fraud_probability']:.1%}")
    print(f"Low-risk transaction fraud probability: {result_low['fraud_probability']:.1%}")
    print(f"System correctly identified high-risk: {'✅' if result_high['is_fraud'] else '❌'}")
    print(f"System correctly identified low-risk: {'✅' if not result_low['is_fraud'] else '❌'}")

def analyze_fraud_simple(expense_data):
    """Simple fraud detection logic (same as in API)."""
    amount = expense_data.get("amount", 0)
    category = expense_data.get("category", "other")
    location = expense_data.get("location", "Unknown")
    timestamp_str = expense_data.get("timestamp", datetime.now().isoformat())
    participants = expense_data.get("participants", [])
    payment_method = expense_data.get("payment_method", "unknown")
    
    # Parse timestamp to get time component
    try:
        dt = datetime.fromisoformat(timestamp_str.replace("Z", "+00:00"))
        hour = dt.hour
    except:
        hour = 12
    
    # Simple fraud detection logic based on rules
    fraud_probability = 0.0
    risk_factors = []
    
    # High amount increases fraud probability
    if amount > 5000:
        fraud_probability += 0.5
        risk_factors.append(f"Very high amount (${amount:,.2f})")
    elif amount > 1000:
        fraud_probability += 0.3
        risk_factors.append(f"High amount (${amount:,.2f})")
    
    # Late night/early morning transactions are suspicious
    if hour >= 22 or hour <= 5:
        fraud_probability += 0.25
        risk_factors.append(f"Late night transaction ({hour:02d}:XX)")
    
    # Certain categories are riskier
    risky_categories = ['entertainment', 'online', 'gaming', 'travel', 'cash_advance']
    if category.lower() in risky_categories:
        fraud_probability += 0.2
        risk_factors.append(f"High-risk category ({category})")
    
    # Suspicious locations
    suspicious_locations = ['unknown', 'international', 'foreign', 'atm', 'casino', 'las vegas']
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
    
    # Ensure probability is between 0 and 1
    fraud_probability = max(0.0, min(1.0, fraud_probability))
    
    # Determine fraud status and risk level
    is_fraud = fraud_probability > 0.5
    
    if fraud_probability >= 0.8:
        risk_level = "Critical"
    elif fraud_probability >= 0.6:
        risk_level = "High"
    elif fraud_probability >= 0.4:
        risk_level = "Medium"
    elif fraud_probability >= 0.2:
        risk_level = "Low"
    else:
        risk_level = "Minimal"
    
    # Generate explanation
    if risk_factors:
        explanation = "Risk factors detected: " + "; ".join(risk_factors)
    else:
        explanation = "Transaction appears normal with standard risk profile"
    
    return {
        "is_fraud": is_fraud,
        "fraud_probability": fraud_probability,
        "risk_level": risk_level,
        "risk_factors": risk_factors,
        "confidence": 0.85,  # Static confidence for demo
        "explanation": explanation
    }

def print_results(test_name, result):
    """Print formatted test results."""
    print(f"\n🎯 {test_name} RESULTS:")
    print("=" * 30)
    
    fraud_status = "🚨 FRAUD DETECTED" if result['is_fraud'] else "✅ LEGITIMATE"
    print(f"Status: {fraud_status}")
    print(f"Fraud Probability: {result['fraud_probability']:.1%}")
    print(f"Risk Level: {result['risk_level']}")
    print(f"Confidence: {result['confidence']:.1%}")
    
    if result['risk_factors']:
        print(f"Risk Factors ({len(result['risk_factors'])}):")
        for factor in result['risk_factors']:
            print(f"  • {factor}")
    else:
        print("Risk Factors: None detected")
    
    print(f"Explanation: {result['explanation']}")
    
    if result['is_fraud']:
        print("\n🚫 RECOMMENDED ACTIONS:")
        if result['fraud_probability'] > 0.8:
            print("  • IMMEDIATELY block transaction")
            print("  • Contact user for verification") 
            print("  • Flag account for investigation")
        elif result['fraud_probability'] > 0.6:
            print("  • Flag for manual review")
            print("  • Require additional authentication")
        else:
            print("  • Monitor transaction closely")
            print("  • Log for pattern analysis")

if __name__ == "__main__":
    test_fraud_detection()
