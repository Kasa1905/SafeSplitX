"""
Feature engineering module for converting expenses to feature vectors.
"""

import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
import logging
from collections import defaultdict

from .schemas import ExpenseIn

logger = logging.getLogger(__name__)


class FeatureEngineer:
    """
    Converts expense data into feature vectors for ML models.
    """
    
    def __init__(self):
        """Initialize feature engineer with default mappings."""
        self.merchant_encoder = defaultdict(int)
        self.category_encoder = defaultdict(int)
        self.group_stats = defaultdict(dict)
        self.payer_stats = defaultdict(dict)
        
    def extract_features(self, expense: ExpenseIn, historical_data: Optional[List[Dict]] = None) -> Dict[str, Any]:
        """
        Extract features from an expense for fraud detection.
        
        Args:
            expense: The expense to analyze
            historical_data: Historical expense data for computing rolling statistics
            
        Returns:
            Dictionary of feature values
        """
        try:
            features = {}
            
            # Basic amount features
            features['amount'] = expense.amount
            features['log_amount'] = np.log1p(expense.amount)
            
            # Participant features
            features['num_participants'] = len(expense.participants)
            participant_amounts = [p.amount for p in expense.participants]
            features['amount_variance'] = np.var(participant_amounts) if len(participant_amounts) > 1 else 0
            features['max_participant_amount'] = max(participant_amounts)
            features['min_participant_amount'] = min(participant_amounts)
            
            # Payer participation check
            payer_participating = any(p.user_id == expense.payer_id for p in expense.participants)
            features['payer_not_participating'] = 0 if payer_participating else 1
            
            # Time features
            expense_time = datetime.fromisoformat(expense.timestamp.replace('Z', '+00:00'))
            features['hour_of_day'] = expense_time.hour
            features['day_of_week'] = expense_time.weekday()
            features['is_weekend'] = 1 if expense_time.weekday() >= 5 else 0
            features['is_late_night'] = 1 if expense_time.hour >= 23 or expense_time.hour <= 5 else 0
            
            # Currency features
            features['currency_is_usd'] = 1 if expense.currency == 'USD' else 0
            features['currency_encoded'] = self._encode_categorical(expense.currency, self.merchant_encoder)
            
            # Merchant and category features
            merchant = expense.merchant or 'unknown'
            category = expense.category or 'unknown'
            features['merchant_encoded'] = self._encode_categorical(merchant, self.merchant_encoder)
            features['category_encoded'] = self._encode_categorical(category, self.category_encoder)
            
            # Historical features (if available)
            if historical_data:
                hist_features = self._compute_historical_features(expense, historical_data)
                features.update(hist_features)
            else:
                # Default values when no historical data
                features.update({
                    'amount_vs_group_mean': 1.0,
                    'amount_vs_payer_mean': 1.0,
                    'payer_expense_frequency': 0,
                    'group_expense_frequency': 0,
                    'recent_expense_count_1h': 0,
                    'recent_expense_count_24h': 0
                })
            
            logger.debug(f"Extracted {len(features)} features for expense {expense.expense_id}")
            return features
            
        except Exception as e:
            logger.error(f"Error extracting features: {str(e)}")
            raise
    
    def _encode_categorical(self, value: str, encoder: Dict[str, int]) -> int:
        """
        Encode categorical values with graceful handling of unseen values.
        """
        if value not in encoder:
            encoder[value] = len(encoder)
        return encoder[value]
    
    def _compute_historical_features(self, expense: ExpenseIn, historical_data: List[Dict]) -> Dict[str, float]:
        """
        Compute features based on historical expense data.
        """
        features = {}
        expense_time = datetime.fromisoformat(expense.timestamp.replace('Z', '+00:00'))
        
        # Filter historical data for the same group and payer
        group_expenses = [h for h in historical_data if h.get('group_id') == expense.group_id]
        payer_expenses = [h for h in historical_data if h.get('payer_id') == expense.payer_id]
        
        # Amount comparison features
        group_amounts = [h['amount'] for h in group_expenses if 'amount' in h]
        payer_amounts = [h['amount'] for h in payer_expenses if 'amount' in h]
        
        if group_amounts:
            group_mean = np.mean(group_amounts)
            features['amount_vs_group_mean'] = expense.amount / group_mean if group_mean > 0 else 1.0
            features['amount_vs_group_std'] = (expense.amount - group_mean) / np.std(group_amounts) if np.std(group_amounts) > 0 else 0
        else:
            features['amount_vs_group_mean'] = 1.0
            features['amount_vs_group_std'] = 0.0
            
        if payer_amounts:
            payer_mean = np.mean(payer_amounts)
            features['amount_vs_payer_mean'] = expense.amount / payer_mean if payer_mean > 0 else 1.0
        else:
            features['amount_vs_payer_mean'] = 1.0
        
        # Frequency features
        features['payer_expense_frequency'] = len(payer_expenses)
        features['group_expense_frequency'] = len(group_expenses)
        
        # Recent activity features
        recent_1h = sum(1 for h in historical_data 
                       if h.get('payer_id') == expense.payer_id 
                       and 'timestamp' in h
                       and (expense_time - datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00'))).total_seconds() <= 3600)
        
        recent_24h = sum(1 for h in historical_data 
                        if h.get('payer_id') == expense.payer_id 
                        and 'timestamp' in h
                        and (expense_time - datetime.fromisoformat(h['timestamp'].replace('Z', '+00:00'))).total_seconds() <= 86400)
        
        features['recent_expense_count_1h'] = recent_1h
        features['recent_expense_count_24h'] = recent_24h
        
        return features
    
    def extract_features_from_dict(self, expense_dict: Dict[str, Any]) -> Dict[str, Any]:
        """
        Extract features from a dictionary representation of expense data.
        Used by the trainer when processing DataFrame rows.
        
        Args:
            expense_dict: Dictionary containing expense data
            
        Returns:
            Dictionary of feature values
        """
        try:
            # Basic amount features
            amount = float(expense_dict.get('amount', 0))
            features = {
                'amount': amount,
                'log_amount': np.log1p(amount) if amount > 0 else 0,
                'num_participants': int(expense_dict.get('num_participants', 1)),
            }
            
            # Time-based features (simplified)
            try:
                timestamp_str = expense_dict.get('timestamp', '')
                if timestamp_str:
                    dt = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                    features.update({
                        'hour_of_day': dt.hour,
                        'day_of_week': dt.weekday(),
                        'is_weekend': int(dt.weekday() >= 5),
                        'is_midnight': int(dt.hour in [0, 1, 2, 3, 4, 5]),
                    })
                else:
                    features.update({
                        'hour_of_day': 12,
                        'day_of_week': 1,
                        'is_weekend': 0,
                        'is_midnight': 0,
                    })
            except Exception:
                features.update({
                    'hour_of_day': 12,
                    'day_of_week': 1,
                    'is_weekend': 0,
                    'is_midnight': 0,
                })
            
            # Categorical features
            merchant = str(expense_dict.get('merchant', 'unknown')).lower()
            category = str(expense_dict.get('category', 'other')).lower()
            currency = str(expense_dict.get('currency', 'USD')).upper()
            
            # Simple merchant encoding
            suspicious_merchants = ['atm', 'cash', 'unknown', 'venmo', 'paypal']
            features['is_suspicious_merchant'] = int(merchant in suspicious_merchants)
            
            # Category encoding (simplified)
            categories = ['food', 'transport', 'entertainment', 'shopping', 'bills', 'other']
            for cat in categories:
                features[f'category_{cat}'] = int(category == cat)
            
            # Currency features
            features['is_usd'] = int(currency == 'USD')
            
            # Amount analysis features
            features['is_round_amount'] = int(amount == round(amount))
            features['amount_per_person'] = amount / max(1, features['num_participants'])
            
            return features
            
        except Exception as e:
            logger.warning(f"Error extracting features from dict: {e}")
            # Return minimal features
            return {
                'amount': float(expense_dict.get('amount', 0)),
                'log_amount': 0,
                'num_participants': 1,
                'hour_of_day': 12,
                'day_of_week': 1,
                'is_weekend': 0,
                'is_midnight': 0,
                'is_suspicious_merchant': 0,
                'category_other': 1,
                'category_food': 0,
                'category_transport': 0,
                'category_entertainment': 0,
                'category_shopping': 0,
                'category_bills': 0,
                'is_usd': 1,
                'is_round_amount': 0,
                'amount_per_person': float(expense_dict.get('amount', 0)),
            }

    def features_to_vector(self, features: Dict[str, Any]) -> np.ndarray:
        """
        Convert feature dictionary to numpy vector for ML models.
        
        Args:
            features: Dictionary of features
            
        Returns:
            Feature vector as numpy array
        """
        # Define the expected feature order
        feature_names = [
            'amount', 'log_amount', 'num_participants', 'hour_of_day', 'day_of_week',
            'is_weekend', 'is_midnight', 'is_suspicious_merchant', 'category_food',
            'category_transport', 'category_entertainment', 'category_shopping',
            'category_bills', 'category_other', 'is_usd', 'is_round_amount', 'amount_per_person'
        ]
        
        # Extract values in order, using 0 as default
        vector = []
        for name in feature_names:
            vector.append(float(features.get(name, 0)))
        
        return np.array(vector)
    
    def get_feature_names(self) -> List[str]:
        """
        Get the list of feature names in the order they appear in the feature vector.
        
        Returns:
            List of feature names
        """
        return [
            'amount', 'log_amount', 'num_participants', 'hour_of_day', 'day_of_week',
            'is_weekend', 'is_midnight', 'is_suspicious_merchant', 'category_food',
            'category_transport', 'category_entertainment', 'category_shopping',
            'category_bills', 'category_other', 'is_usd', 'is_round_amount', 'amount_per_person'
        ]
