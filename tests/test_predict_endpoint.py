"""
Tests for the fraud detection predict endpoint.
"""

import pytest
from fastapi.testclient import TestClient
from datetime import datetime
import json

# Import the FastAPI app
from fraud_detection.api.main import app

client = TestClient(app)


class TestPredictEndpoint:
    """Test cases for the /predict endpoint."""
    
    def test_predict_valid_expense(self):
        """Test prediction with valid expense data."""
        expense_data = {
            "expense_id": "test_123",
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
        }
        
        response = client.post("/predict", json=expense_data)
        
        # Check if the service is available (might not be if model not trained)
        if response.status_code == 503:
            pytest.skip("No trained model available")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Check response structure
        assert "expense_id" in data
        assert "anomaly_score" in data
        assert "is_suspicious" in data
        assert "model_version" in data
        assert "reasons" in data
        assert "explanation" in data
        assert "timestamp" in data
        
        # Check data types and ranges
        assert data["expense_id"] == "test_123"
        assert 0.0 <= data["anomaly_score"] <= 1.0
        assert isinstance(data["is_suspicious"], bool)
        assert isinstance(data["reasons"], list)
        assert isinstance(data["explanation"], list)
    
    def test_predict_suspicious_expense(self):
        """Test prediction with potentially suspicious expense."""
        # Create an expense that should trigger some rules
        expense_data = {
            "expense_id": "suspicious_123",
            "group_id": "group_456", 
            "payer_id": "user_999",  # Payer not participating
            "participants": [
                {"user_id": "user_789", "amount": 1000.00}  # Single large amount
            ],
            "amount": 1000.00,
            "currency": "USD",
            "merchant": "Cash Advance",  # Potentially suspicious merchant
            "category": "other",
            "timestamp": "2023-12-01T03:30:00Z"  # Unusual time
        }
        
        response = client.post("/predict", json=expense_data)
        
        if response.status_code == 503:
            pytest.skip("No trained model available")
        
        assert response.status_code == 200
        
        data = response.json()
        
        # Should have some rule violations due to suspicious patterns
        assert len(data["reasons"]) > 0
        
        # Check rule violation structure
        for reason in data["reasons"]:
            assert "rule_name" in reason
            assert "severity" in reason
            assert "message" in reason
            assert "confidence" in reason
            assert reason["severity"] in ["low", "medium", "high"]
            assert 0.0 <= reason["confidence"] <= 1.0
    
    def test_predict_invalid_expense_data(self):
        """Test prediction with invalid expense data."""
        # Missing required fields
        invalid_data = {
            "expense_id": "test_123",
            "amount": 51.00
            # Missing other required fields
        }
        
        response = client.post("/predict", json=invalid_data)
        assert response.status_code == 422  # Validation error
    
    def test_predict_invalid_amount(self):
        """Test prediction with invalid amount."""
        expense_data = {
            "expense_id": "test_123",
            "group_id": "group_456",
            "payer_id": "user_789",
            "participants": [
                {"user_id": "user_789", "amount": 25.50}
            ],
            "amount": -51.00,  # Invalid negative amount
            "currency": "USD",
            "merchant": "Restaurant ABC",
            "category": "food",
            "timestamp": "2023-12-01T18:30:00Z"
        }
        
        response = client.post("/predict", json=expense_data)
        assert response.status_code == 422
    
    def test_predict_participant_amount_mismatch(self):
        """Test prediction with participant amounts not matching total."""
        expense_data = {
            "expense_id": "test_123",
            "group_id": "group_456",
            "payer_id": "user_789",
            "participants": [
                {"user_id": "user_789", "amount": 20.00},
                {"user_id": "user_101", "amount": 20.00}
            ],
            "amount": 50.00,  # Total is 50 but participants sum to 40
            "currency": "USD",
            "merchant": "Restaurant ABC", 
            "category": "food",
            "timestamp": "2023-12-01T18:30:00Z"
        }
        
        response = client.post("/predict", json=expense_data)
        assert response.status_code == 422  # Should fail validation
    
    def test_predict_invalid_currency(self):
        """Test prediction with invalid currency format."""
        expense_data = {
            "expense_id": "test_123",
            "group_id": "group_456",
            "payer_id": "user_789",
            "participants": [
                {"user_id": "user_789", "amount": 51.00}
            ],
            "amount": 51.00,
            "currency": "usd",  # Should be uppercase
            "merchant": "Restaurant ABC",
            "category": "food",
            "timestamp": "2023-12-01T18:30:00Z"
        }
        
        response = client.post("/predict", json=expense_data)
        assert response.status_code == 422
    
    def test_predict_invalid_timestamp(self):
        """Test prediction with invalid timestamp format."""
        expense_data = {
            "expense_id": "test_123",
            "group_id": "group_456",
            "payer_id": "user_789",
            "participants": [
                {"user_id": "user_789", "amount": 51.00}
            ],
            "amount": 51.00,
            "currency": "USD",
            "merchant": "Restaurant ABC",
            "category": "food",
            "timestamp": "invalid-timestamp"
        }
        
        response = client.post("/predict", json=expense_data)
        assert response.status_code == 422
    
    def test_batch_predict_valid_expenses(self):
        """Test batch prediction with multiple valid expenses."""
        expenses_data = [
            {
                "expense_id": "batch_1",
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
            },
            {
                "expense_id": "batch_2",
                "group_id": "group_456",
                "payer_id": "user_101",
                "participants": [
                    {"user_id": "user_101", "amount": 30.00}
                ],
                "amount": 30.00,
                "currency": "USD", 
                "merchant": "Coffee Shop",
                "category": "food",
                "timestamp": "2023-12-01T19:00:00Z"
            }
        ]
        
        response = client.post("/predict/batch", json=expenses_data)
        
        if response.status_code == 503:
            pytest.skip("No trained model available")
        
        assert response.status_code == 200
        
        data = response.json()
        assert isinstance(data, list)
        assert len(data) == 2
        
        # Check each prediction result
        for i, prediction in enumerate(data):
            assert prediction["expense_id"] == f"batch_{i+1}"
            assert 0.0 <= prediction["anomaly_score"] <= 1.0
            assert isinstance(prediction["is_suspicious"], bool)
    
    def test_predict_edge_cases(self):
        """Test prediction with edge case values."""
        # Very small amount
        expense_data = {
            "expense_id": "edge_1",
            "group_id": "group_456",
            "payer_id": "user_789",
            "participants": [
                {"user_id": "user_789", "amount": 0.01}
            ],
            "amount": 0.01,
            "currency": "USD",
            "merchant": "Test Merchant",
            "category": "other",
            "timestamp": "2023-12-01T18:30:00Z"
        }
        
        response = client.post("/predict", json=expense_data)
        
        if response.status_code == 503:
            pytest.skip("No trained model available")
        
        assert response.status_code == 200
        
        # Very large amount  
        expense_data["expense_id"] = "edge_2"
        expense_data["amount"] = 999999.99
        expense_data["participants"][0]["amount"] = 999999.99
        
        response = client.post("/predict", json=expense_data)
        assert response.status_code == 200
    
    def test_predict_response_time(self):
        """Test that prediction response time is reasonable."""
        import time
        
        expense_data = {
            "expense_id": "perf_test",
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
        }
        
        start_time = time.time()
        response = client.post("/predict", json=expense_data)
        end_time = time.time()
        
        if response.status_code == 503:
            pytest.skip("No trained model available")
        
        assert response.status_code == 200
        
        # Response should be under 5 seconds for a single prediction
        response_time = end_time - start_time
        assert response_time < 5.0, f"Response time too slow: {response_time:.2f}s"


class TestHealthEndpoint:
    """Test cases for the /health endpoint."""
    
    def test_health_check(self):
        """Test health check endpoint."""
        response = client.get("/health")
        
        # Health check should always return 200, even without a model
        assert response.status_code == 200
        
        data = response.json()
        
        # Check response structure
        assert "status" in data
        assert "uptime_seconds" in data
        
        # Status should be a string
        assert isinstance(data["status"], str)
        assert data["status"] in ["healthy", "unhealthy"]
        
        # Uptime should be a positive number
        assert isinstance(data["uptime_seconds"], (int, float))
        assert data["uptime_seconds"] >= 0


class TestTrainEndpoint:
    """Test cases for the /train endpoint."""
    
    def test_train_default_model(self):
        """Test training with default parameters."""
        response = client.post("/train")
        
        # Training might take a while, so we increase timeout expectations
        assert response.status_code == 200
        
        data = response.json()
        
        # Check response structure
        assert "success" in data
        assert "message" in data
        
        if data["success"]:
            assert "model_version" in data
            assert "metrics" in data
            assert isinstance(data["metrics"], dict)
    
    def test_train_with_parameters(self):
        """Test training with custom parameters."""
        train_request = {
            "model_type": "isolation_forest",
            "params": {
                "n_estimators": 50,
                "contamination": 0.1
            }
        }
        
        response = client.post("/train", json=train_request)
        assert response.status_code == 200
        
        data = response.json()
        assert "success" in data
    
    def test_train_invalid_model_type(self):
        """Test training with invalid model type."""
        train_request = {
            "model_type": "invalid_model",
            "params": {}
        }
        
        response = client.post("/train", json=train_request)
        assert response.status_code == 200  # API handles gracefully
        
        data = response.json()
        # Should return success=False for invalid model type
        assert data["success"] is False


if __name__ == "__main__":
    # Run tests with pytest
    pytest.main([__file__, "-v"])
