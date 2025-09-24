"""
Ensemble model combining ML models and rule-based detection.
"""

import logging
import numpy as np
from typing import Dict, List, Any, Optional, Tuple
import os

from ..schemas import ExpenseIn, RuleViolation, FeatureContribution
from .base import BaseModel
from .rule_engine import RuleEngine

logger = logging.getLogger(__name__)


class EnsembleModel:
    """
    Ensemble model that combines ML anomaly detection with rule-based checks.
    """
    
    def __init__(self, ml_model: BaseModel, rule_engine: RuleEngine):
        """
        Initialize ensemble model.
        
        Args:
            ml_model: Trained ML model for anomaly detection
            rule_engine: Rule engine for deterministic checks
        """
        self.ml_model = ml_model
        self.rule_engine = rule_engine
        
        # Load configurable thresholds
        self.ml_weight = float(os.getenv('ML_WEIGHT', '0.7'))
        self.rule_weight = float(os.getenv('RULE_WEIGHT', '0.3'))
        self.suspicion_threshold = float(os.getenv('SUSPICION_THRESHOLD', '0.6'))
        
        # Severity weights for rule scoring
        self.severity_weights = {
            'low': 0.3,
            'medium': 0.6,
            'high': 0.9
        }
        
        logger.info(f"EnsembleModel initialized with ML weight: {self.ml_weight}, "
                   f"Rule weight: {self.rule_weight}, Threshold: {self.suspicion_threshold}")
    
    def predict_single(self, expense: ExpenseIn, features: Dict[str, Any], 
                      feature_vector: np.ndarray, historical_data: List[Dict] = None) -> Dict[str, Any]:
        """
        Make prediction for a single expense.
        
        Args:
            expense: Expense to analyze
            features: Extracted features dictionary
            feature_vector: Feature vector for ML model
            historical_data: Historical data for rule context
            
        Returns:
            Prediction results dictionary
        """
        try:
            # Get ML model prediction
            ml_score = 0.0
            ml_explanation = []
            
            if self.ml_model and self.ml_model.is_fitted:
                ml_proba = self.ml_model.predict_proba(feature_vector.reshape(1, -1))
                ml_score = float(ml_proba[0]) if len(ml_proba) > 0 else 0.0
                
                # Get ML explanation
                ml_explanation = self.ml_model.explain_prediction(
                    feature_vector.reshape(1, -1), 0
                )
            
            # Get rule violations
            rule_violations = self.rule_engine.check_rules(expense, features, historical_data)
            
            # Calculate rule score
            rule_score = self._calculate_rule_score(rule_violations)
            
            # Combine scores
            final_score = self._combine_scores(ml_score, rule_score)
            
            # Determine if suspicious
            is_suspicious = final_score >= self.suspicion_threshold
            
            # Create explanation
            explanation = self._create_explanation(ml_explanation, features, rule_violations)
            
            result = {
                'anomaly_score': final_score,
                'is_suspicious': is_suspicious,
                'ml_score': ml_score,
                'rule_score': rule_score,
                'rule_violations': rule_violations,
                'explanation': explanation,
                'model_version': self.ml_model.version if self.ml_model else 'rules_only'
            }
            
            logger.debug(f"Ensemble prediction for {expense.expense_id}: "
                        f"ML={ml_score:.3f}, Rules={rule_score:.3f}, "
                        f"Final={final_score:.3f}, Suspicious={is_suspicious}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error in ensemble prediction: {str(e)}")
            # Return safe default
            return {
                'anomaly_score': 0.0,
                'is_suspicious': False,
                'ml_score': 0.0,
                'rule_score': 0.0,
                'rule_violations': [],
                'explanation': [],
                'model_version': 'error'
            }
    
    def _calculate_rule_score(self, violations: List[RuleViolation]) -> float:
        """
        Calculate aggregated rule score from violations.
        
        Args:
            violations: List of rule violations
            
        Returns:
            Rule score between 0 and 1
        """
        if not violations:
            return 0.0
        
        # Calculate weighted score based on severity and confidence
        total_score = 0.0
        max_possible_score = 0.0
        
        for violation in violations:
            severity_weight = self.severity_weights.get(violation.severity, 0.5)
            violation_score = severity_weight * violation.confidence
            total_score += violation_score
            max_possible_score += severity_weight
        
        # Normalize to [0, 1] range
        if max_possible_score > 0:
            normalized_score = min(1.0, total_score / max_possible_score)
        else:
            normalized_score = 0.0
        
        return normalized_score
    
    def _combine_scores(self, ml_score: float, rule_score: float) -> float:
        """
        Combine ML and rule scores using weighted average.
        
        Args:
            ml_score: ML model anomaly score
            rule_score: Rule-based score
            
        Returns:
            Combined score between 0 and 1
        """
        # Weighted combination
        combined = (self.ml_weight * ml_score) + (self.rule_weight * rule_score)
        
        # Apply boosting if both models agree
        if ml_score > 0.5 and rule_score > 0.5:
            boost_factor = 1.1
            combined = min(1.0, combined * boost_factor)
        
        return combined
    
    def _create_explanation(self, ml_explanation: List[Tuple[str, float]], 
                          features: Dict[str, Any], 
                          violations: List[RuleViolation]) -> List[FeatureContribution]:
        """
        Create unified explanation from ML and rule components.
        
        Args:
            ml_explanation: ML model feature contributions
            features: Original features
            violations: Rule violations
            
        Returns:
            List of feature contributions for explanation
        """
        explanation = []
        
        # Add ML contributions
        for feature_name, contribution in ml_explanation[:5]:  # Top 5 ML features
            value = features.get(feature_name, 0)
            explanation.append(FeatureContribution(
                feature_name=feature_name,
                contribution=float(contribution),
                value=value
            ))
        
        # Add rule-based contributions
        for violation in violations:
            # Convert rule violations to feature contributions
            contribution_score = (self.severity_weights.get(violation.severity, 0.5) * 
                                violation.confidence * self.rule_weight)
            
            explanation.append(FeatureContribution(
                feature_name=f"rule_{violation.rule_name}",
                contribution=contribution_score,
                value=violation.message
            ))
        
        # Sort by contribution magnitude
        explanation.sort(key=lambda x: abs(x.contribution), reverse=True)
        
        return explanation[:10]  # Return top 10 explanations
    
    def get_model_info(self) -> Dict[str, Any]:
        """Get ensemble model information."""
        ml_info = self.ml_model.get_model_info() if self.ml_model else {}
        rule_info = self.rule_engine.get_rule_summary()
        
        return {
            'ensemble_version': '1.0.0',
            'ml_model': ml_info,
            'rule_engine': rule_info,
            'weights': {
                'ml_weight': self.ml_weight,
                'rule_weight': self.rule_weight
            },
            'thresholds': {
                'suspicion_threshold': self.suspicion_threshold,
                'severity_weights': self.severity_weights
            }
        }
    
    def update_threshold(self, new_threshold: float) -> None:
        """
        Update suspicion threshold.
        
        Args:
            new_threshold: New threshold value between 0 and 1
        """
        if 0 <= new_threshold <= 1:
            self.suspicion_threshold = new_threshold
            logger.info(f"Updated suspicion threshold to {new_threshold}")
        else:
            raise ValueError("Threshold must be between 0 and 1")
    
    def get_performance_metrics(self, test_data: List[Dict], ground_truth: List[bool]) -> Dict[str, float]:
        """
        Calculate performance metrics on test data.
        
        Args:
            test_data: List of test expenses with features
            ground_truth: True fraud labels
            
        Returns:
            Dictionary of performance metrics
        """
        predictions = []
        scores = []
        
        for data in test_data:
            # This would need to be implemented with proper feature extraction
            # For now, return placeholder metrics
            predictions.append(False)
            scores.append(0.5)
        
        # Calculate metrics (placeholder implementation)
        accuracy = sum(p == gt for p, gt in zip(predictions, ground_truth)) / len(ground_truth)
        
        return {
            'accuracy': accuracy,
            'precision': 0.5,  # Placeholder
            'recall': 0.5,     # Placeholder
            'f1_score': 0.5,   # Placeholder
            'auc_roc': 0.5     # Placeholder
        }
