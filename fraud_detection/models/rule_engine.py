"""
Rule-based fraud detection engine.
"""

import logging
from typing import Dict, List, Any
from datetime import datetime, timedelta
import os

from ..schemas import ExpenseIn, RuleViolation

logger = logging.getLogger(__name__)


class RuleEngine:
    """
    Rule-based fraud detection engine.
    """
    
    def __init__(self):
        """Initialize rule engine with configurable thresholds."""
        # Load thresholds from environment or use defaults
        self.amount_multiplier_threshold = float(os.getenv('AMOUNT_MULTIPLIER_THRESHOLD', '5.0'))
        self.rapid_expense_minutes = int(os.getenv('RAPID_EXPENSE_MINUTES', '15'))
        self.max_participants_threshold = int(os.getenv('MAX_PARTICIPANTS_THRESHOLD', '20'))
        self.suspicious_merchants = set(os.getenv('BLACKLISTED_MERCHANTS', '').split(','))
        self.suspicious_categories = set(os.getenv('SUSPICIOUS_CATEGORIES', 'gambling,adult').split(','))
        
        logger.info("RuleEngine initialized with configurable thresholds")
    
    def check_rules(self, expense: ExpenseIn, derived_features: Dict[str, Any], 
                   historical_data: List[Dict] = None) -> List[RuleViolation]:
        """
        Check expense against fraud detection rules.
        
        Args:
            expense: Expense to check
            derived_features: Features computed from expense
            historical_data: Historical expense data for context
            
        Returns:
            List of rule violations found
        """
        violations = []
        
        try:
            # Rule 1: Excessive amount compared to group average
            violations.extend(self._check_excessive_amount(expense, derived_features))
            
            # Rule 2: Single participant mismatch
            violations.extend(self._check_participant_mismatch(expense))
            
            # Rule 3: Blacklisted merchant or category
            violations.extend(self._check_blacklisted_entities(expense))
            
            # Rule 4: Rapid repeated expenses
            if historical_data:
                violations.extend(self._check_rapid_expenses(expense, historical_data))
            
            # Rule 5: Unusual time patterns
            violations.extend(self._check_time_patterns(expense))
            
            # Rule 6: Too many participants
            violations.extend(self._check_participant_count(expense))
            
            # Rule 7: Payer not participating
            violations.extend(self._check_payer_participation(expense))
            
            # Rule 8: Amount precision anomalies
            violations.extend(self._check_amount_precision(expense))
            
            logger.debug(f"Found {len(violations)} rule violations for expense {expense.expense_id}")
            return violations
            
        except Exception as e:
            logger.error(f"Error checking rules: {str(e)}")
            return []
    
    def _check_excessive_amount(self, expense: ExpenseIn, features: Dict[str, Any]) -> List[RuleViolation]:
        """Check if expense amount is excessively high compared to group average."""
        violations = []
        
        amount_vs_group = features.get('amount_vs_group_mean', 1.0)
        
        if amount_vs_group > self.amount_multiplier_threshold:
            severity = 'high' if amount_vs_group > self.amount_multiplier_threshold * 2 else 'medium'
            violations.append(RuleViolation(
                rule_name='excessive_amount',
                severity=severity,
                message=f'Expense amount is {amount_vs_group:.1f}x higher than group average',
                confidence=min(0.9, amount_vs_group / (self.amount_multiplier_threshold * 2))
            ))
        
        return violations
    
    def _check_participant_mismatch(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check for suspicious participant patterns."""
        violations = []
        
        # Check if total participant amounts don't match expense amount
        participant_total = sum(p.amount for p in expense.participants)
        if abs(participant_total - expense.amount) > 0.01:
            violations.append(RuleViolation(
                rule_name='amount_mismatch',
                severity='high',
                message=f'Participant amounts ({participant_total}) don\'t match total ({expense.amount})',
                confidence=0.95
            ))
        
        # Check for duplicate participants
        participant_ids = [p.user_id for p in expense.participants]
        if len(participant_ids) != len(set(participant_ids)):
            violations.append(RuleViolation(
                rule_name='duplicate_participants',
                severity='medium',
                message='Duplicate participants found in expense',
                confidence=0.9
            ))
        
        return violations
    
    def _check_blacklisted_entities(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check for blacklisted merchants or categories."""
        violations = []
        
        if expense.merchant and expense.merchant.lower() in self.suspicious_merchants:
            violations.append(RuleViolation(
                rule_name='blacklisted_merchant',
                severity='high',
                message=f'Transaction with blacklisted merchant: {expense.merchant}',
                confidence=0.95
            ))
        
        if expense.category and expense.category.lower() in self.suspicious_categories:
            violations.append(RuleViolation(
                rule_name='suspicious_category',
                severity='medium',
                message=f'Transaction in suspicious category: {expense.category}',
                confidence=0.8
            ))
        
        return violations
    
    def _check_rapid_expenses(self, expense: ExpenseIn, historical_data: List[Dict]) -> List[RuleViolation]:
        """Check for rapid repeated expenses from same payer."""
        violations = []
        
        try:
            expense_time = datetime.fromisoformat(expense.timestamp.replace('Z', '+00:00'))
            rapid_threshold = timedelta(minutes=self.rapid_expense_minutes)
            
            # Count recent expenses from same payer
            rapid_count = 0
            for hist in historical_data:
                if (hist.get('payer_id') == expense.payer_id and 
                    'timestamp' in hist):
                    hist_time = datetime.fromisoformat(hist['timestamp'].replace('Z', '+00:00'))
                    if expense_time - hist_time < rapid_threshold:
                        rapid_count += 1
            
            if rapid_count >= 3:
                violations.append(RuleViolation(
                    rule_name='rapid_expenses',
                    severity='high',
                    message=f'{rapid_count} expenses from same payer in {self.rapid_expense_minutes} minutes',
                    confidence=0.8
                ))
            elif rapid_count >= 2:
                violations.append(RuleViolation(
                    rule_name='rapid_expenses',
                    severity='medium',
                    message=f'{rapid_count} expenses from same payer in {self.rapid_expense_minutes} minutes',
                    confidence=0.6
                ))
                
        except Exception as e:
            logger.warning(f"Error checking rapid expenses: {str(e)}")
        
        return violations
    
    def _check_time_patterns(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check for unusual time patterns."""
        violations = []
        
        try:
            expense_time = datetime.fromisoformat(expense.timestamp.replace('Z', '+00:00'))
            hour = expense_time.hour
            
            # Very late night transactions (2-5 AM)
            if 2 <= hour <= 5:
                violations.append(RuleViolation(
                    rule_name='unusual_time',
                    severity='low',
                    message=f'Transaction at unusual hour: {hour}:00',
                    confidence=0.4
                ))
            
            # Future timestamp (more than 1 hour ahead)
            now = datetime.utcnow()
            if expense_time > now + timedelta(hours=1):
                violations.append(RuleViolation(
                    rule_name='future_timestamp',
                    severity='high',
                    message='Transaction timestamp is in the future',
                    confidence=0.9
                ))
                
        except Exception as e:
            logger.warning(f"Error checking time patterns: {str(e)}")
        
        return violations
    
    def _check_participant_count(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check for unusual participant count."""
        violations = []
        
        participant_count = len(expense.participants)
        
        if participant_count > self.max_participants_threshold:
            violations.append(RuleViolation(
                rule_name='excessive_participants',
                severity='medium',
                message=f'Unusually high participant count: {participant_count}',
                confidence=0.7
            ))
        
        return violations
    
    def _check_payer_participation(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check if payer is participating in the expense."""
        violations = []
        
        payer_participating = any(p.user_id == expense.payer_id for p in expense.participants)
        
        if not payer_participating:
            violations.append(RuleViolation(
                rule_name='payer_not_participating',
                severity='medium',
                message='Payer is not listed as a participant',
                confidence=0.6
            ))
        
        return violations
    
    def _check_amount_precision(self, expense: ExpenseIn) -> List[RuleViolation]:
        """Check for unusual amount precision patterns."""
        violations = []
        
        # Check for round numbers (might indicate estimates)
        if expense.amount == int(expense.amount) and expense.amount >= 100:
            violations.append(RuleViolation(
                rule_name='round_amount',
                severity='low',
                message=f'Suspiciously round amount: ${expense.amount:.0f}',
                confidence=0.3
            ))
        
        # Check for very precise amounts (might be calculated)
        amount_str = str(expense.amount)
        if '.' in amount_str and len(amount_str.split('.')[1]) > 2:
            violations.append(RuleViolation(
                rule_name='precise_amount',
                severity='low',
                message=f'Unusually precise amount: ${expense.amount}',
                confidence=0.25
            ))
        
        return violations
    
    def get_rule_summary(self) -> Dict[str, Any]:
        """Get summary of configured rules and thresholds."""
        return {
            'amount_multiplier_threshold': self.amount_multiplier_threshold,
            'rapid_expense_minutes': self.rapid_expense_minutes,
            'max_participants_threshold': self.max_participants_threshold,
            'suspicious_merchants_count': len(self.suspicious_merchants),
            'suspicious_categories': list(self.suspicious_categories)
        }
