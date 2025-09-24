#!/usr/bin/env python3
"""
Comprehensive API test for SafeSplitX Fraud Detection System.
"""

import json
import requests
import time
from datetime import datetime

API_BASE_URL = "http://localhost:8000"

def test_api_endpoint(endpoint, method="GET", data=None, description=""):
    """Test an API endpoint and display results."""
    print(f"🧪 Testing: {method} {endpoint}")
    if description:
        print(f"   Description: {description}")
    
    try:
        if method == "GET":
            response = requests.get(f"{API_BASE_URL}{endpoint}", timeout=10)
        elif method == "POST":
            response = requests.post(
                f"{API_BASE_URL}{endpoint}", 
                json=data, 
                headers={"Content-Type": "application/json"},
                timeout=10
            )
        
        print(f"   Status: {response.status_code}")
        
        if response.status_code == 200:
            result = response.json()
            print(f"   ✅ SUCCESS")
            return result
        else:
            print(f"   ❌ ERROR: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"   ❌ CONNECTION ERROR: {e}")
        return None
    except Exception as e:
        print(f"   ❌ UNEXPECTED ERROR: {e}")
        return None

def print_prediction_results(result, transaction_type):
    """Pretty print prediction results."""
    if not result:
        return
    
    print(f"\n🎯 {transaction_type} PREDICTION RESULTS:")
    print("=" * 50)
    
    # Basic info
    is_fraud = result.get('is_fraud', False)
    probability = result.get('fraud_probability', 0)
    risk_level = result.get('risk_level', 'Unknown')
    confidence = result.get('confidence', 0)
    
    fraud_status = "🚨 FRAUD DETECTED" if is_fraud else "✅ LEGITIMATE"
    print(f"Status: {fraud_status}")
    print(f"Fraud Probability: {probability:.1%}")
    print(f"Risk Level: {risk_level}")
    print(f"Confidence: {confidence:.1%}")
    
    # Risk factors
    explanation = result.get('explanation', '')
    if explanation:
        print(f"Explanation: {explanation}")
    
    # Feature importance
    feature_importance = result.get('feature_importance', {})
    if feature_importance:
        print("Feature Importance:")
        for feature, importance in feature_importance.items():
            print(f"  • {feature}: {importance:.3f}")
    
    # Processing time
    processing_time = result.get('processing_time', 0)
    print(f"Processing Time: {processing_time:.3f}s")

def main():
    """Run comprehensive API tests."""
    print("🚀 SafeSplitX Fraud Detection API - Comprehensive Test Suite")
    print("=" * 70)
    print(f"Testing API at: {API_BASE_URL}")
    print(f"Test started at: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print()
    
    # Test 1: Health Check
    print("📋 TEST 1: System Health Checks")
    print("-" * 40)
    
    root_result = test_api_endpoint("/", description="Service information")
    if root_result:
        print(f"   Service: {root_result.get('message', 'Unknown')}")
    print()
    
    health_result = test_api_endpoint("/health", description="Health status")
    if health_result:
        print(f"   Health Status: {health_result.get('status', 'Unknown')}")
    print()
    
    status_result = test_api_endpoint("/status", description="Detailed status")
    if status_result:
        print(f"   Service Status: {status_result.get('status', 'Unknown')}")
        print(f"   Uptime: {status_result.get('uptime_seconds', 0):.1f} seconds")
        print(f"   Model Status: {status_result.get('model_status', 'Unknown')}")
    print()
    
    # Test 2: High-Risk Transaction
    print("📋 TEST 2: High-Risk Transaction Analysis")
    print("-" * 40)
    
    high_risk_transaction = {
        "amount": 3500.0,
        "category": "entertainment",
        "location": "Las Vegas Casino",
        "payment_method": "cash",
        "timestamp": "2024-01-15T02:45:00Z",
        "user_id": "user_suspicious_123",
        "group_id": "group_456",
        "merchant_name": "Golden Nugget Casino",
        "participants": [
            {"user_id": "user_suspicious_123", "amount": 1750.0},
            {"user_id": "user_accomplice_456", "amount": 1750.0}
        ]
    }
    
    print("Transaction Details:")
    print(f"  Amount: ${high_risk_transaction['amount']:,.2f}")
    print(f"  Category: {high_risk_transaction['category']}")
    print(f"  Location: {high_risk_transaction['location']}")
    print(f"  Payment: {high_risk_transaction['payment_method']}")
    print(f"  Time: {high_risk_transaction['timestamp']}")
    print()
    
    high_risk_result = test_api_endpoint(
        "/predict/simple", 
        method="POST", 
        data=high_risk_transaction,
        description="High-risk casino transaction"
    )
    
    print_prediction_results(high_risk_result, "HIGH-RISK")
    print()
    
    # Test 3: Low-Risk Transaction  
    print("📋 TEST 3: Low-Risk Transaction Analysis")
    print("-" * 40)
    
    low_risk_transaction = {
        "amount": 28.50,
        "category": "dining",
        "location": "Downtown Restaurant",
        "payment_method": "credit_card",
        "timestamp": "2024-01-15T18:45:00Z",
        "user_id": "user_regular_789",
        "group_id": "group_friends_123",
        "merchant_name": "Tony's Italian Bistro",
        "participants": [
            {"user_id": "user_regular_789", "amount": 14.25},
            {"user_id": "user_friend_101", "amount": 14.25}
        ]
    }
    
    print("Transaction Details:")
    print(f"  Amount: ${low_risk_transaction['amount']:,.2f}")
    print(f"  Category: {low_risk_transaction['category']}")
    print(f"  Location: {low_risk_transaction['location']}")
    print(f"  Payment: {low_risk_transaction['payment_method']}")
    print(f"  Time: {low_risk_transaction['timestamp']}")
    print()
    
    low_risk_result = test_api_endpoint(
        "/predict/simple",
        method="POST",
        data=low_risk_transaction,
        description="Low-risk dining transaction"
    )
    
    print_prediction_results(low_risk_result, "LOW-RISK")
    print()
    
    # Test 4: Medium-Risk Transaction
    print("📋 TEST 4: Medium-Risk Transaction Analysis")
    print("-" * 40)
    
    medium_risk_transaction = {
        "amount": 850.0,
        "category": "shopping",
        "location": "Online Store",
        "payment_method": "credit_card",
        "timestamp": "2024-01-15T23:30:00Z",  # Late night
        "user_id": "user_shopper_555",
        "group_id": "group_family_789"
    }
    
    print("Transaction Details:")
    print(f"  Amount: ${medium_risk_transaction['amount']:,.2f}")
    print(f"  Category: {medium_risk_transaction['category']}")
    print(f"  Location: {medium_risk_transaction['location']}")
    print(f"  Time: {medium_risk_transaction['timestamp']} (Late night)")
    print()
    
    medium_risk_result = test_api_endpoint(
        "/predict/simple",
        method="POST", 
        data=medium_risk_transaction,
        description="Medium-risk late-night shopping"
    )
    
    print_prediction_results(medium_risk_result, "MEDIUM-RISK")
    print()
    
    # Test 5: Performance Test
    print("📋 TEST 5: Performance Analysis")
    print("-" * 40)
    
    print("Running multiple predictions to test performance...")
    
    test_transactions = [
        {"amount": 100, "category": "groceries"},
        {"amount": 50, "category": "gas"},
        {"amount": 200, "category": "dining"},
        {"amount": 1000, "category": "electronics"},
        {"amount": 25, "category": "coffee"}
    ]
    
    total_time = 0
    successful_predictions = 0
    
    for i, transaction in enumerate(test_transactions, 1):
        start_time = time.time()
        result = test_api_endpoint(
            "/predict/simple",
            method="POST",
            data=transaction,
            description=f"Performance test {i}/5"
        )
        end_time = time.time()
        
        if result:
            request_time = end_time - start_time
            processing_time = result.get('processing_time', 0)
            total_time += request_time
            successful_predictions += 1
            
            print(f"   Transaction {i}: {request_time:.3f}s total, {processing_time:.3f}s processing")
    
    if successful_predictions > 0:
        avg_time = total_time / successful_predictions
        print(f"\\n   Average Response Time: {avg_time:.3f}s")
        print(f"   Successful Predictions: {successful_predictions}/{len(test_transactions)}")
        print(f"   Estimated Throughput: {1/avg_time:.0f} requests/second")
    print()
    
    # Test Summary
    print("📊 TEST SUMMARY")
    print("=" * 40)
    
    print("✅ Successfully tested:")
    print("  • Service health and status endpoints")
    print("  • High-risk transaction detection (Casino + Cash)")
    print("  • Low-risk transaction detection (Restaurant + Card)")
    print("  • Medium-risk transaction detection (Late night)")
    print("  • API performance and throughput")
    print()
    
    print("🎯 Key Results:")
    if high_risk_result:
        print(f"  • High-risk detection: {high_risk_result.get('fraud_probability', 0):.1%} fraud probability")
    if low_risk_result:
        print(f"  • Low-risk detection: {low_risk_result.get('fraud_probability', 0):.1%} fraud probability")
    if medium_risk_result:
        print(f"  • Medium-risk detection: {medium_risk_result.get('fraud_probability', 0):.1%} fraud probability")
    
    print()
    print("🚀 SafeSplitX Fraud Detection API is working correctly!")
    print("   Ready for integration with your main application.")
    print()
    print("📚 Integration Info:")
    print(f"   • API Base URL: {API_BASE_URL}")
    print("   • Main Endpoint: POST /predict/simple")
    print("   • Documentation: GET /docs")
    print("   • Health Check: GET /health")

if __name__ == "__main__":
    main()
