"""
Real-time Risk Engine for Advanced Fraud Detection
Provides continuous monitoring and adaptive risk assessment.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
import json
import os
from collections import defaultdict, deque
import threading
import time

logger = logging.getLogger(__name__)


@dataclass
class RiskEvent:
    """Individual risk event for monitoring."""
    timestamp: str
    user_id: str
    group_id: str
    event_type: str
    risk_score: float
    details: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'timestamp': self.timestamp,
            'user_id': self.user_id,
            'group_id': self.group_id,
            'event_type': self.event_type,
            'risk_score': self.risk_score,
            'details': self.details
        }


class RealTimeRiskEngine:
    """
    Real-time risk monitoring engine for continuous fraud detection.
    Monitors patterns, velocities, and anomalies in real-time.
    """
    
    def __init__(self, monitoring_window_minutes: int = 60):
        """
        Initialize real-time risk engine.
        
        Args:
            monitoring_window_minutes: Time window for real-time monitoring
        """
        self.monitoring_window = timedelta(minutes=monitoring_window_minutes)
        
        # Recent events storage (in-memory for real-time processing)
        self.recent_events = deque(maxlen=10000)  # Keep last 10k events
        self.user_velocities = defaultdict(lambda: deque(maxlen=100))
        self.group_activities = defaultdict(lambda: deque(maxlen=200))
        
        # Risk thresholds
        self.risk_thresholds = {
            'high_velocity': 0.8,
            'suspicious_pattern': 0.7,
            'anomaly_detection': 0.6,
            'group_coordination': 0.75
        }
        
        # Pattern detection
        self.suspicious_patterns = {
            'round_amounts': [100, 250, 500, 1000, 2000, 5000],
            'common_fraud_categories': ['cash_advance', 'gift_cards', 'cryptocurrency', 'gambling'],
            'risky_times': [(22, 6), (12, 14)],  # Late night and lunch hours
            'high_risk_locations': ['atm', 'casino', 'pawn_shop', 'gas_station']
        }
        
        logger.info("RealTimeRiskEngine initialized")
    
    def analyze_real_time_risk(self, expense_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Perform real-time risk analysis on an expense.
        
        Args:
            expense_data: Current expense data
            
        Returns:
            Real-time risk assessment results
        """
        current_time = datetime.now()
        user_id = expense_data.get('user_id', 'unknown')
        group_id = expense_data.get('group_id', 'unknown')
        amount = expense_data.get('amount', 0)
        
        # Create risk event
        risk_event = RiskEvent(
            timestamp=current_time.isoformat(),
            user_id=user_id,
            group_id=group_id,
            event_type='expense_analysis',
            risk_score=0.0,
            details=expense_data.copy()
        )
        
        # Perform various real-time risk checks
        risk_scores = {}
        
        # 1. Velocity Analysis
        risk_scores['velocity_risk'] = self._analyze_velocity(user_id, amount, current_time)
        
        # 2. Pattern Recognition
        risk_scores['pattern_risk'] = self._analyze_patterns(expense_data)
        
        # 3. Group Coordination Analysis
        risk_scores['coordination_risk'] = self._analyze_group_coordination(group_id, expense_data, current_time)
        
        # 4. Anomaly Detection
        risk_scores['anomaly_risk'] = self._detect_anomalies(user_id, expense_data)
        
        # 5. Time-based Analysis
        risk_scores['temporal_risk'] = self._analyze_temporal_patterns(expense_data, current_time)
        
        # 6. Amount-based Suspicion
        risk_scores['amount_suspicion'] = self._analyze_amount_suspicion(amount)
        
        # Calculate overall real-time risk
        overall_risk = np.mean(list(risk_scores.values()))
        risk_scores['overall_realtime_risk'] = overall_risk
        
        # Update risk event
        risk_event.risk_score = overall_risk
        risk_event.details.update(risk_scores)
        
        # Store event
        self._store_event(risk_event)
        
        # Generate alerts if necessary
        alerts = self._generate_alerts(risk_scores, expense_data)
        
        return {
            'risk_scores': risk_scores,
            'alerts': alerts,
            'risk_level': self._categorize_risk(overall_risk),
            'recommendations': self._generate_recommendations(risk_scores),
            'monitoring_insights': self._get_monitoring_insights(user_id, group_id)
        }
    
    def _analyze_velocity(self, user_id: str, amount: float, current_time: datetime) -> float:
        """Analyze transaction velocity for suspicious activity."""
        user_transactions = self.user_velocities[user_id]
        
        # Add current transaction
        user_transactions.append((current_time, amount))
        
        # Clean old transactions (outside monitoring window)
        cutoff_time = current_time - self.monitoring_window
        while user_transactions and user_transactions[0][0] < cutoff_time:
            user_transactions.popleft()
        
        if len(user_transactions) < 2:
            return 0.1
        
        # Calculate velocity metrics
        recent_count = len(user_transactions)
        total_amount = sum(amt for _, amt in user_transactions)
        time_span = (current_time - user_transactions[0][0]).total_seconds() / 3600  # hours
        
        if time_span == 0:
            return 0.9  # Multiple transactions at exact same time = suspicious
        
        # Risk factors
        frequency_risk = min(1.0, recent_count / 20)  # >20 transactions in window = high risk
        amount_velocity_risk = min(1.0, total_amount / (time_span * 1000))  # $1000/hour threshold
        
        return (frequency_risk + amount_velocity_risk) / 2
    
    def _analyze_patterns(self, expense_data: Dict[str, Any]) -> float:
        """Analyze for suspicious patterns."""
        risk_score = 0.0
        factors = 0
        
        amount = expense_data.get('amount', 0)
        category = expense_data.get('category', '').lower()
        location = expense_data.get('location', '').lower()
        description = expense_data.get('description', '').lower()
        
        # Round amount pattern
        if amount in self.suspicious_patterns['round_amounts']:
            risk_score += 0.3
        factors += 1
        
        # Suspicious category
        if any(cat in category for cat in self.suspicious_patterns['common_fraud_categories']):
            risk_score += 0.4
        factors += 1
        
        # Risky location keywords
        if any(loc in location for loc in self.suspicious_patterns['high_risk_locations']):
            risk_score += 0.3
        factors += 1
        
        # Description patterns
        suspicious_words = ['cash', 'advance', 'atm', 'withdrawal', 'transfer', 'urgent', 'emergency']
        if any(word in description for word in suspicious_words):
            risk_score += 0.2
        factors += 1
        
        return min(1.0, risk_score / max(1, factors))
    
    def _analyze_group_coordination(self, group_id: str, expense_data: Dict[str, Any], current_time: datetime) -> float:
        """Analyze for coordinated group fraud."""
        group_activities = self.group_activities[group_id]
        
        # Add current activity
        group_activities.append((current_time, expense_data))
        
        # Clean old activities
        cutoff_time = current_time - self.monitoring_window
        while group_activities and group_activities[0][0] < cutoff_time:
            group_activities.popleft()
        
        if len(group_activities) < 2:
            return 0.1
        
        # Look for coordination patterns
        recent_activities = list(group_activities)
        
        # Similar amounts in short time
        amounts = [data.get('amount', 0) for _, data in recent_activities[-5:]]  # Last 5
        if len(set(amounts)) == 1 and len(amounts) > 1:  # All same amount
            return 0.8
        
        # Similar categories
        categories = [data.get('category', '') for _, data in recent_activities[-5:]]
        if len(set(categories)) == 1 and len(categories) > 2:  # All same category
            return 0.6
        
        # Time clustering (multiple transactions within minutes)
        times = [t for t, _ in recent_activities[-10:]]
        if len(times) > 3:
            time_diffs = [(times[i] - times[i-1]).total_seconds() for i in range(1, len(times))]
            if all(diff < 300 for diff in time_diffs):  # All within 5 minutes
                return 0.7
        
        return 0.2
    
    def _detect_anomalies(self, user_id: str, expense_data: Dict[str, Any]) -> float:
        """Detect anomalies based on user's historical patterns."""
        # This would integrate with the trained ML model in a real implementation
        # For now, use rule-based anomaly detection
        
        amount = expense_data.get('amount', 0)
        category = expense_data.get('category', '')
        
        # Get user's recent transactions
        user_transactions = [
            event.details for event in self.recent_events 
            if event.user_id == user_id
        ][-20:]  # Last 20 transactions
        
        if not user_transactions:
            return 0.3  # New user = moderate risk
        
        # Amount anomaly
        amounts = [t.get('amount', 0) for t in user_transactions]
        avg_amount = np.mean(amounts)
        std_amount = np.std(amounts) if len(amounts) > 1 else avg_amount * 0.5
        
        if std_amount == 0:
            std_amount = avg_amount * 0.1
        
        z_score = abs(amount - avg_amount) / std_amount if std_amount > 0 else 0
        amount_anomaly = min(1.0, z_score / 3)  # Normalize
        
        # Category anomaly
        categories = [t.get('category', '') for t in user_transactions]
        category_frequency = categories.count(category) / len(categories) if categories else 0
        category_anomaly = 1.0 - category_frequency  # New category = higher risk
        
        return (amount_anomaly + category_anomaly) / 2
    
    def _analyze_temporal_patterns(self, expense_data: Dict[str, Any], current_time: datetime) -> float:
        """Analyze temporal patterns for suspicious timing."""
        hour = current_time.hour
        day_of_week = current_time.weekday()  # 0 = Monday
        
        risk_score = 0.0
        
        # Late night / early morning (high risk)
        if hour >= 23 or hour <= 5:
            risk_score += 0.4
        
        # Business hours on weekday for personal expenses (moderate risk)
        if 9 <= hour <= 17 and day_of_week < 5:
            category = expense_data.get('category', '').lower()
            if any(word in category for word in ['entertainment', 'shopping', 'dining']):
                risk_score += 0.2
        
        # Weekend large transactions (moderate risk)
        if day_of_week >= 5:  # Weekend
            amount = expense_data.get('amount', 0)
            if amount > 1000:
                risk_score += 0.3
        
        return min(1.0, risk_score)
    
    def _analyze_amount_suspicion(self, amount: float) -> float:
        """Analyze amount for suspicious characteristics."""
        # Very round numbers
        if amount % 100 == 0 and amount >= 100:
            return 0.3
        
        # Amounts just under reporting thresholds
        suspicious_thresholds = [999, 1999, 2999, 4999, 9999]
        for threshold in suspicious_thresholds:
            if threshold - 50 <= amount <= threshold:
                return 0.5
        
        # Very large amounts
        if amount > 10000:
            return 0.6
        elif amount > 5000:
            return 0.4
        
        # Very small amounts (potential testing)
        if amount <= 1:
            return 0.3
        
        return 0.1
    
    def _store_event(self, event: RiskEvent):
        """Store risk event in memory."""
        self.recent_events.append(event)
    
    def _generate_alerts(self, risk_scores: Dict[str, float], expense_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate alerts based on risk scores."""
        alerts = []
        
        for risk_type, score in risk_scores.items():
            if score >= self.risk_thresholds.get(risk_type, 0.6):
                alert = {
                    'type': risk_type,
                    'severity': 'HIGH' if score >= 0.8 else 'MEDIUM',
                    'score': score,
                    'message': self._get_alert_message(risk_type, score),
                    'timestamp': datetime.now().isoformat(),
                    'expense_amount': expense_data.get('amount', 0),
                    'user_id': expense_data.get('user_id', 'unknown')
                }
                alerts.append(alert)
        
        return alerts
    
    def _get_alert_message(self, risk_type: str, score: float) -> str:
        """Generate alert message based on risk type."""
        messages = {
            'velocity_risk': f"High transaction velocity detected (score: {score:.2f})",
            'pattern_risk': f"Suspicious transaction pattern identified (score: {score:.2f})",
            'coordination_risk': f"Potential coordinated group activity (score: {score:.2f})",
            'anomaly_risk': f"Transaction anomaly detected (score: {score:.2f})",
            'temporal_risk': f"Suspicious timing pattern (score: {score:.2f})",
            'amount_suspicion': f"Suspicious amount characteristics (score: {score:.2f})"
        }
        return messages.get(risk_type, f"Risk detected: {risk_type} (score: {score:.2f})")
    
    def _categorize_risk(self, overall_risk: float) -> str:
        """Categorize overall risk level."""
        if overall_risk >= 0.8:
            return "CRITICAL"
        elif overall_risk >= 0.6:
            return "HIGH"
        elif overall_risk >= 0.4:
            return "MEDIUM"
        elif overall_risk >= 0.2:
            return "LOW"
        else:
            return "MINIMAL"
    
    def _generate_recommendations(self, risk_scores: Dict[str, float]) -> List[str]:
        """Generate recommendations based on risk analysis."""
        recommendations = []
        
        if risk_scores.get('velocity_risk', 0) > 0.6:
            recommendations.append("Consider implementing transaction velocity limits")
            recommendations.append("Review recent transaction history for this user")
        
        if risk_scores.get('pattern_risk', 0) > 0.6:
            recommendations.append("Flag for manual review due to suspicious patterns")
            recommendations.append("Verify transaction authenticity with user")
        
        if risk_scores.get('coordination_risk', 0) > 0.7:
            recommendations.append("Investigate potential coordinated fraud in group")
            recommendations.append("Review all group members' recent activities")
        
        if risk_scores.get('anomaly_risk', 0) > 0.6:
            recommendations.append("Transaction deviates significantly from user patterns")
            recommendations.append("Consider additional authentication")
        
        if not recommendations:
            recommendations.append("Transaction appears normal - continue monitoring")
        
        return recommendations
    
    def _get_monitoring_insights(self, user_id: str, group_id: str) -> Dict[str, Any]:
        """Get real-time monitoring insights."""
        current_time = datetime.now()
        cutoff_time = current_time - self.monitoring_window
        
        # User insights
        user_events = [e for e in self.recent_events if e.user_id == user_id and datetime.fromisoformat(e.timestamp) > cutoff_time]
        
        # Group insights
        group_events = [e for e in self.recent_events if e.group_id == group_id and datetime.fromisoformat(e.timestamp) > cutoff_time]
        
        return {
            'monitoring_window_minutes': self.monitoring_window.total_seconds() / 60,
            'user_activity_count': len(user_events),
            'group_activity_count': len(group_events),
            'avg_user_risk': np.mean([e.risk_score for e in user_events]) if user_events else 0.0,
            'avg_group_risk': np.mean([e.risk_score for e in group_events]) if group_events else 0.0,
            'high_risk_events': len([e for e in user_events + group_events if e.risk_score > 0.7])
        }
    
    def get_real_time_stats(self) -> Dict[str, Any]:
        """Get real-time monitoring statistics."""
        current_time = datetime.now()
        cutoff_time = current_time - self.monitoring_window
        
        recent_events = [e for e in self.recent_events if datetime.fromisoformat(e.timestamp) > cutoff_time]
        
        if not recent_events:
            return {
                'total_events': 0,
                'avg_risk_score': 0.0,
                'high_risk_events': 0,
                'active_users': 0,
                'active_groups': 0
            }
        
        return {
            'total_events': len(recent_events),
            'avg_risk_score': round(np.mean([e.risk_score for e in recent_events]), 3),
            'high_risk_events': len([e for e in recent_events if e.risk_score > 0.7]),
            'medium_risk_events': len([e for e in recent_events if 0.4 <= e.risk_score <= 0.7]),
            'low_risk_events': len([e for e in recent_events if e.risk_score < 0.4]),
            'active_users': len(set(e.user_id for e in recent_events)),
            'active_groups': len(set(e.group_id for e in recent_events)),
            'monitoring_window_minutes': int(self.monitoring_window.total_seconds() / 60)
        }
