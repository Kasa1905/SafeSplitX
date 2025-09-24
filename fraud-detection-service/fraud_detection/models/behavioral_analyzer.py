"""
Behavioral Analysis Engine for Advanced Fraud Detection
Analyzes user behavior patterns and group dynamics for enhanced fraud detection.
"""

import logging
import numpy as np
import pandas as pd
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Tuple, Any
from dataclasses import dataclass, field
import json
import os

logger = logging.getLogger(__name__)


@dataclass
class UserProfile:
    """User behavioral profile for fraud detection."""
    user_id: str
    total_expenses: int = 0
    avg_amount: float = 0.0
    favorite_categories: List[str] = field(default_factory=list)
    usual_times: List[int] = field(default_factory=list)  # Hours of day
    frequent_locations: List[str] = field(default_factory=list)
    preferred_payment_methods: List[str] = field(default_factory=list)
    group_memberships: List[str] = field(default_factory=list)
    risk_score: float = 0.0
    last_updated: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization."""
        return {
            'user_id': self.user_id,
            'total_expenses': self.total_expenses,
            'avg_amount': self.avg_amount,
            'favorite_categories': self.favorite_categories,
            'usual_times': self.usual_times,
            'frequent_locations': self.frequent_locations,
            'preferred_payment_methods': self.preferred_payment_methods,
            'group_memberships': self.group_memberships,
            'risk_score': self.risk_score,
            'last_updated': self.last_updated
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UserProfile':
        """Create from dictionary."""
        return cls(**data)


@dataclass
class GroupProfile:
    """Group behavioral profile for fraud detection."""
    group_id: str
    members: List[str] = field(default_factory=list)
    avg_expense_amount: float = 0.0
    common_categories: List[str] = field(default_factory=list)
    expense_frequency: float = 0.0  # expenses per week
    risk_incidents: int = 0
    trust_score: float = 1.0  # 0-1, higher is more trusted
    created_at: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'group_id': self.group_id,
            'members': self.members,
            'avg_expense_amount': self.avg_expense_amount,
            'common_categories': self.common_categories,
            'expense_frequency': self.expense_frequency,
            'risk_incidents': self.risk_incidents,
            'trust_score': self.trust_score,
            'created_at': self.created_at
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'GroupProfile':
        return cls(**data)


class BehavioralAnalyzer:
    """
    Advanced behavioral analysis engine for fraud detection.
    Learns user and group patterns to enhance fraud detection accuracy.
    """
    
    def __init__(self, data_dir: str = "./behavioral_data"):
        """
        Initialize behavioral analyzer.
        
        Args:
            data_dir: Directory to store behavioral profiles
        """
        self.data_dir = data_dir
        os.makedirs(data_dir, exist_ok=True)
        
        self.user_profiles: Dict[str, UserProfile] = {}
        self.group_profiles: Dict[str, GroupProfile] = {}
        
        # Load existing profiles
        self._load_profiles()
        
        logger.info(f"BehavioralAnalyzer initialized with {len(self.user_profiles)} user profiles")
    
    def _load_profiles(self):
        """Load user and group profiles from disk."""
        try:
            # Load user profiles
            user_profile_path = os.path.join(self.data_dir, "user_profiles.json")
            if os.path.exists(user_profile_path):
                with open(user_profile_path, 'r') as f:
                    data = json.load(f)
                    for user_id, profile_data in data.items():
                        self.user_profiles[user_id] = UserProfile.from_dict(profile_data)
            
            # Load group profiles
            group_profile_path = os.path.join(self.data_dir, "group_profiles.json")
            if os.path.exists(group_profile_path):
                with open(group_profile_path, 'r') as f:
                    data = json.load(f)
                    for group_id, profile_data in data.items():
                        self.group_profiles[group_id] = GroupProfile.from_dict(profile_data)
                        
        except Exception as e:
            logger.warning(f"Could not load behavioral profiles: {e}")
    
    def _save_profiles(self):
        """Save profiles to disk."""
        try:
            # Save user profiles
            user_data = {uid: profile.to_dict() for uid, profile in self.user_profiles.items()}
            with open(os.path.join(self.data_dir, "user_profiles.json"), 'w') as f:
                json.dump(user_data, f, indent=2)
            
            # Save group profiles
            group_data = {gid: profile.to_dict() for gid, profile in self.group_profiles.items()}
            with open(os.path.join(self.data_dir, "group_profiles.json"), 'w') as f:
                json.dump(group_data, f, indent=2)
                
        except Exception as e:
            logger.error(f"Could not save behavioral profiles: {e}")
    
    def analyze_expense(self, expense_data: Dict[str, Any]) -> Dict[str, float]:
        """
        Analyze an expense against behavioral patterns.
        
        Args:
            expense_data: Expense information
            
        Returns:
            Dictionary with behavioral risk scores
        """
        user_id = expense_data.get('user_id', 'unknown')
        group_id = expense_data.get('group_id', 'unknown')
        amount = expense_data.get('amount', 0)
        category = expense_data.get('category', 'other')
        
        # Get or create user profile
        if user_id not in self.user_profiles:
            self.user_profiles[user_id] = UserProfile(user_id=user_id)
        
        # Get or create group profile
        if group_id not in self.group_profiles:
            self.group_profiles[group_id] = GroupProfile(group_id=group_id)
        
        user_profile = self.user_profiles[user_id]
        group_profile = self.group_profiles[group_id]
        
        # Calculate behavioral risk scores
        risk_scores = {
            'user_amount_deviation': self._calculate_amount_deviation(user_profile, amount),
            'user_category_familiarity': self._calculate_category_familiarity(user_profile, category),
            'user_time_consistency': self._calculate_time_consistency(user_profile, expense_data),
            'group_trust_score': 1.0 - group_profile.trust_score,
            'group_amount_deviation': self._calculate_group_amount_deviation(group_profile, amount),
            'new_user_risk': self._calculate_new_user_risk(user_profile),
            'velocity_risk': self._calculate_velocity_risk(user_profile, expense_data)
        }
        
        # Overall behavioral risk
        risk_scores['behavioral_risk_score'] = np.mean(list(risk_scores.values()))
        
        return risk_scores
    
    def _calculate_amount_deviation(self, profile: UserProfile, amount: float) -> float:
        """Calculate how much this amount deviates from user's normal spending."""
        if profile.total_expenses < 3:  # Not enough data
            return 0.3
        
        if profile.avg_amount == 0:
            return 0.5
        
        deviation = abs(amount - profile.avg_amount) / profile.avg_amount
        return min(1.0, deviation / 2.0)  # Normalize to 0-1
    
    def _calculate_category_familiarity(self, profile: UserProfile, category: str) -> float:
        """Calculate if this category is familiar to the user."""
        if not profile.favorite_categories:
            return 0.2
        
        if category in profile.favorite_categories:
            return 0.1  # Low risk for familiar category
        else:
            return 0.6  # Higher risk for unfamiliar category
    
    def _calculate_time_consistency(self, profile: UserProfile, expense_data: Dict) -> float:
        """Calculate time-based behavioral consistency."""
        try:
            timestamp = expense_data.get('timestamp', datetime.now().isoformat())
            dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
            hour = dt.hour
            
            if not profile.usual_times:
                return 0.2
            
            # Check if this hour is within user's usual times (±2 hours)
            for usual_hour in profile.usual_times:
                if abs(hour - usual_hour) <= 2:
                    return 0.1  # Low risk
            
            return 0.5  # Higher risk for unusual time
            
        except Exception:
            return 0.3
    
    def _calculate_group_amount_deviation(self, profile: GroupProfile, amount: float) -> float:
        """Calculate amount deviation within group context."""
        if profile.avg_expense_amount == 0:
            return 0.3
        
        deviation = abs(amount - profile.avg_expense_amount) / profile.avg_expense_amount
        return min(1.0, deviation / 3.0)
    
    def _calculate_new_user_risk(self, profile: UserProfile) -> float:
        """Calculate risk based on user's history length."""
        if profile.total_expenses < 5:
            return 0.4  # Higher risk for new users
        elif profile.total_expenses < 20:
            return 0.2  # Medium risk
        else:
            return 0.1  # Low risk for established users
    
    def _calculate_velocity_risk(self, profile: UserProfile, expense_data: Dict) -> float:
        """Calculate risk based on expense velocity (frequency)."""
        # This would need transaction timestamps to calculate properly
        # For now, return a simple score based on user's expense count
        if profile.total_expenses > 100:  # Very active user
            return 0.3
        return 0.1
    
    def update_profiles(self, expense_data: Dict[str, Any], is_fraud: bool = False):
        """
        Update user and group profiles with new expense data.
        
        Args:
            expense_data: Expense information
            is_fraud: Whether this expense was flagged as fraud
        """
        user_id = expense_data.get('user_id', 'unknown')
        group_id = expense_data.get('group_id', 'unknown')
        amount = expense_data.get('amount', 0)
        category = expense_data.get('category', 'other')
        payment_method = expense_data.get('payment_method', 'unknown')
        location = expense_data.get('location', 'unknown')
        
        # Update user profile
        if user_id in self.user_profiles:
            profile = self.user_profiles[user_id]
            
            # Update expense count and average
            profile.total_expenses += 1
            profile.avg_amount = ((profile.avg_amount * (profile.total_expenses - 1)) + amount) / profile.total_expenses
            
            # Update favorite categories
            if category not in profile.favorite_categories:
                profile.favorite_categories.append(category)
                if len(profile.favorite_categories) > 5:  # Keep top 5
                    profile.favorite_categories = profile.favorite_categories[-5:]
            
            # Update time patterns
            try:
                timestamp = expense_data.get('timestamp', datetime.now().isoformat())
                dt = datetime.fromisoformat(timestamp.replace('Z', '+00:00'))
                hour = dt.hour
                profile.usual_times.append(hour)
                if len(profile.usual_times) > 20:  # Keep recent 20
                    profile.usual_times = profile.usual_times[-20:]
            except Exception:
                pass
            
            # Update other preferences
            if payment_method not in profile.preferred_payment_methods:
                profile.preferred_payment_methods.append(payment_method)
            
            if location not in profile.frequent_locations:
                profile.frequent_locations.append(location)
                if len(profile.frequent_locations) > 10:  # Keep top 10
                    profile.frequent_locations = profile.frequent_locations[-10:]
            
            # Update risk score based on fraud feedback
            if is_fraud:
                profile.risk_score = min(1.0, profile.risk_score + 0.1)
            else:
                profile.risk_score = max(0.0, profile.risk_score - 0.01)
            
            profile.last_updated = datetime.now().isoformat()
        
        # Update group profile
        if group_id in self.group_profiles:
            group_profile = self.group_profiles[group_id]
            
            # Update average amount
            total_expenses = getattr(group_profile, 'total_expenses', 1)
            group_profile.avg_expense_amount = ((group_profile.avg_expense_amount * total_expenses) + amount) / (total_expenses + 1)
            
            # Update categories
            if category not in group_profile.common_categories:
                group_profile.common_categories.append(category)
                if len(group_profile.common_categories) > 5:
                    group_profile.common_categories = group_profile.common_categories[-5:]
            
            # Update trust score
            if is_fraud:
                group_profile.risk_incidents += 1
                group_profile.trust_score = max(0.0, group_profile.trust_score - 0.05)
            else:
                group_profile.trust_score = min(1.0, group_profile.trust_score + 0.001)
        
        # Save profiles periodically
        self._save_profiles()
    
    def get_user_insights(self, user_id: str) -> Dict[str, Any]:
        """Get behavioral insights for a specific user."""
        if user_id not in self.user_profiles:
            return {"message": "No profile found for user"}
        
        profile = self.user_profiles[user_id]
        return {
            "user_id": user_id,
            "total_expenses": profile.total_expenses,
            "average_amount": round(profile.avg_amount, 2),
            "favorite_categories": profile.favorite_categories,
            "risk_level": "High" if profile.risk_score > 0.6 else "Medium" if profile.risk_score > 0.3 else "Low",
            "established_user": profile.total_expenses > 20,
            "last_updated": profile.last_updated
        }
    
    def get_group_insights(self, group_id: str) -> Dict[str, Any]:
        """Get behavioral insights for a specific group."""
        if group_id not in self.group_profiles:
            return {"message": "No profile found for group"}
        
        profile = self.group_profiles[group_id]
        return {
            "group_id": group_id,
            "member_count": len(profile.members),
            "average_expense": round(profile.avg_expense_amount, 2),
            "common_categories": profile.common_categories,
            "trust_score": round(profile.trust_score, 3),
            "risk_incidents": profile.risk_incidents,
            "trust_level": "High" if profile.trust_score > 0.8 else "Medium" if profile.trust_score > 0.5 else "Low"
        }
