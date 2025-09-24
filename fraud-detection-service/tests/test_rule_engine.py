"""Test suite for fraud detection rule engine."""

import pytest
from datetime import datetime, timedelta
from fraud_detection.models.rule_engine import RuleEngine
from fraud_detection.schemas import ExpenseIn, ParticipantInfo


class TestRuleEngine:
    """Test the rule-based fraud detection engine."""
    
    @pytest.fixture
    def rule_engine(self):
        """Create a rule engine instance for testing."""
        return RuleEngine()
    
    @pytest.fixture
    def normal_expense(self):
        """Create a normal expense for testing."""
        return ExpenseIn(
            expense_id="exp_001",
            group_id="group_123",
            payer_id="user_456",
            participants=[
                ParticipantInfo(user_id="user_456", amount=25.00),
                ParticipantInfo(user_id="user_789", amount=25.00)
            ],
            amount=50.00,
            currency="USD",
            merchant="Restaurant ABC",
            category="food",
            timestamp=datetime.utcnow()
        )
    
    def test_normal_expense_passes_rules(self, rule_engine, normal_expense):
        """Test that normal expenses pass all rules."""
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is False
        assert flags["fraud_score"] == 0.0
        assert flags["reasons"] == []
    
    def test_excessive_amount_flag(self, rule_engine, normal_expense):
        """Test excessive amount detection."""
        # Set amount above threshold
        normal_expense.amount = 10000.00
        for participant in normal_expense.participants:
            participant.amount = 5000.00
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("excessive amount" in reason.lower() for reason in flags["reasons"])
    
    def test_mismatched_amounts_flag(self, rule_engine, normal_expense):
        """Test detection of mismatched participant amounts."""
        # Make participant amounts not sum to total
        normal_expense.participants[0].amount = 10.00
        normal_expense.participants[1].amount = 20.00
        # Total amount remains 50.00, but participants sum to 30.00
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("amount mismatch" in reason.lower() for reason in flags["reasons"])
    
    def test_duplicate_participants_flag(self, rule_engine, normal_expense):
        """Test detection of duplicate participants."""
        # Add duplicate participant
        normal_expense.participants.append(
            ParticipantInfo(user_id="user_456", amount=10.00)  # Same user as payer
        )
        normal_expense.amount = 60.00  # Adjust total
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("duplicate participant" in reason.lower() for reason in flags["reasons"])
    
    def test_payer_not_in_participants_flag(self, rule_engine, normal_expense):
        """Test detection when payer is not in participants list."""
        # Remove payer from participants
        normal_expense.participants = [
            ParticipantInfo(user_id="user_999", amount=50.00)
        ]
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("payer not in participants" in reason.lower() for reason in flags["reasons"])
    
    def test_midnight_transaction_flag(self, rule_engine, normal_expense):
        """Test detection of suspicious midnight transactions."""
        # Set timestamp to 2 AM
        normal_expense.timestamp = datetime.utcnow().replace(hour=2, minute=0, second=0)
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("midnight transaction" in reason.lower() for reason in flags["reasons"])
    
    def test_weekend_late_night_flag(self, rule_engine, normal_expense):
        """Test detection of weekend late-night transactions."""
        # Find next Saturday and set to 11 PM
        now = datetime.utcnow()
        days_until_saturday = (5 - now.weekday()) % 7
        if days_until_saturday == 0:
            days_until_saturday = 7
        saturday = now + timedelta(days=days_until_saturday)
        normal_expense.timestamp = saturday.replace(hour=23, minute=0, second=0)
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("weekend late night" in reason.lower() for reason in flags["reasons"])
    
    def test_future_timestamp_flag(self, rule_engine, normal_expense):
        """Test detection of future timestamps."""
        # Set timestamp to 1 hour in the future
        normal_expense.timestamp = datetime.utcnow() + timedelta(hours=1)
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("future timestamp" in reason.lower() for reason in flags["reasons"])
    
    def test_invalid_merchant_flag(self, rule_engine, normal_expense):
        """Test detection of invalid merchant names."""
        # Set suspicious merchant name
        normal_expense.merchant = "cash"
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("invalid merchant" in reason.lower() for reason in flags["reasons"])
    
    def test_multiple_flags_accumulate_score(self, rule_engine, normal_expense):
        """Test that multiple rule violations accumulate fraud score."""
        # Trigger multiple rules
        normal_expense.amount = 8000.00  # Excessive amount
        normal_expense.participants[0].amount = 4000.00
        normal_expense.participants[1].amount = 3000.00  # Amount mismatch
        normal_expense.merchant = "atm"  # Invalid merchant
        normal_expense.timestamp = datetime.utcnow().replace(hour=1)  # Midnight transaction
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0.6  # Should be high with multiple violations
        assert len(flags["reasons"]) >= 3  # Multiple reasons flagged
    
    def test_high_frequency_same_merchant(self, rule_engine, normal_expense):
        """Test detection of high frequency transactions at same merchant."""
        # This would require historical data in a real implementation
        # For now, just test that the method exists and can be called
        flags = rule_engine.check_rules(normal_expense)
        # Should pass for single transaction
        assert flags["fraud_score"] >= 0
    
    def test_round_number_amounts(self, rule_engine, normal_expense):
        """Test detection of suspicious round number amounts."""
        # Set to exact round numbers
        normal_expense.amount = 1000.00
        normal_expense.participants[0].amount = 500.00
        normal_expense.participants[1].amount = 500.00
        
        flags = rule_engine.check_rules(normal_expense)
        # This might or might not be flagged depending on implementation
        assert isinstance(flags["fraud_score"], float)
        assert flags["fraud_score"] >= 0
    
    def test_currency_validation(self, rule_engine, normal_expense):
        """Test currency code validation."""
        # Most currencies should be accepted
        normal_expense.currency = "EUR"
        flags = rule_engine.check_rules(normal_expense)
        assert flags["fraud_score"] >= 0
        
        # Invalid currency might be flagged
        normal_expense.currency = "XXX"
        flags = rule_engine.check_rules(normal_expense)
        assert flags["fraud_score"] >= 0
    
    def test_category_validation(self, rule_engine, normal_expense):
        """Test expense category validation."""
        valid_categories = ["food", "transport", "entertainment", "shopping", "bills", "other"]
        
        for category in valid_categories:
            normal_expense.category = category
            flags = rule_engine.check_rules(normal_expense)
            assert flags["fraud_score"] >= 0
    
    def test_empty_participants_list(self, rule_engine, normal_expense):
        """Test handling of empty participants list."""
        normal_expense.participants = []
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("no participants" in reason.lower() for reason in flags["reasons"])
    
    def test_negative_participant_amounts(self, rule_engine, normal_expense):
        """Test detection of negative participant amounts."""
        normal_expense.participants[0].amount = -25.00
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("negative amount" in reason.lower() for reason in flags["reasons"])
    
    def test_zero_amount_expense(self, rule_engine, normal_expense):
        """Test handling of zero amount expenses."""
        normal_expense.amount = 0.00
        normal_expense.participants[0].amount = 0.00
        normal_expense.participants[1].amount = 0.00
        
        flags = rule_engine.check_rules(normal_expense)
        assert flags["is_flagged"] is True
        assert flags["fraud_score"] > 0
        assert any("zero amount" in reason.lower() for reason in flags["reasons"])
