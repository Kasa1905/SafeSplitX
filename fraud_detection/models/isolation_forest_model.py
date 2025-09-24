"""
Isolation Forest model implementation for fraud detection.
"""

import os
import json
import joblib
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
from sklearn.ensemble import IsolationForest
from sklearn.preprocessing import StandardScaler
import logging

from .base import BaseModel

logger = logging.getLogger(__name__)


class IsolationForestModel(BaseModel):
    """
    Isolation Forest wrapper for fraud detection.
    """
    
    def __init__(self, **params):
        """
        Initialize Isolation Forest model.
        
        Args:
            **params: Parameters for IsolationForest
        """
        super().__init__("isolation_forest", "1.0.0")
        
        # Default parameters
        default_params = {
            'n_estimators': 100,
            'contamination': 0.1,
            'random_state': 42,
            'n_jobs': -1
        }
        default_params.update(params)
        
        self.model = IsolationForest(**default_params)
        self.scaler = StandardScaler()
        self.params = default_params
        
    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> 'IsolationForestModel':
        """
        Train the Isolation Forest model.
        
        Args:
            X: Feature matrix
            y: Not used (unsupervised learning)
            **kwargs: Additional parameters
            
        Returns:
            Self for method chaining
        """
        try:
            logger.info(f"Training Isolation Forest with {X.shape[0]} samples, {X.shape[1]} features")
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train model
            self.model.fit(X_scaled)
            self.is_fitted = True
            
            # Store training metadata
            self.training_metadata = {
                'n_samples': X.shape[0],
                'n_features': X.shape[1],
                'contamination': self.params['contamination'],
                'n_estimators': self.params['n_estimators']
            }
            
            logger.info("Isolation Forest training completed")
            return self
            
        except Exception as e:
            logger.error(f"Error training Isolation Forest: {str(e)}")
            raise
    
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make binary predictions.
        
        Args:
            X: Feature matrix
            
        Returns:
            Binary predictions (1 = anomaly, 0 = normal)
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            X_scaled = self.scaler.transform(X)
            predictions = self.model.predict(X_scaled)
            # Convert sklearn format (-1, 1) to (1, 0) where 1 = anomaly
            return (predictions == -1).astype(int)
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            raise
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict anomaly probabilities.
        
        Args:
            X: Feature matrix
            
        Returns:
            Anomaly probabilities [0, 1]
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            X_scaled = self.scaler.transform(X)
            # Get anomaly scores (more negative = more anomalous)
            scores = self.model.decision_function(X_scaled)
            
            # Convert to probabilities [0, 1] where higher = more anomalous
            # Use sigmoid transformation on negative scores
            probabilities = 1 / (1 + np.exp(scores))
            
            return probabilities
            
        except Exception as e:
            logger.error(f"Error predicting probabilities: {str(e)}")
            raise
    
    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """
        Get approximate feature importance using permutation-based method.
        
        Returns:
            Dictionary mapping feature names to importance scores
        """
        if not self.is_fitted or self.feature_names is None:
            return None
        
        # For Isolation Forest, we can't get feature importance directly
        # This is a placeholder - in practice, you might use permutation importance
        # or SHAP values for better explanations
        n_features = len(self.feature_names)
        uniform_importance = 1.0 / n_features
        
        return {name: uniform_importance for name in self.feature_names}
    
    def explain_prediction(self, X: np.ndarray, sample_idx: int = 0) -> List[Tuple[str, float]]:
        """
        Explain prediction using feature values and approximate contributions.
        
        Args:
            X: Feature matrix
            sample_idx: Index of sample to explain
            
        Returns:
            List of (feature_name, contribution) tuples
        """
        if not self.is_fitted or self.feature_names is None or sample_idx >= len(X):
            return []
        
        try:
            sample = X[sample_idx]
            explanations = []
            
            # Simple explanation: features with extreme values contribute more
            X_scaled = self.scaler.transform(X[sample_idx:sample_idx+1])
            scaled_sample = X_scaled[0]
            
            for i, feature_name in enumerate(self.feature_names):
                if i < len(scaled_sample):
                    # Use scaled value as contribution (extreme values = higher contribution)
                    contribution = abs(scaled_sample[i])
                    explanations.append((feature_name, contribution))
            
            # Sort by contribution magnitude
            explanations.sort(key=lambda x: x[1], reverse=True)
            return explanations[:10]
            
        except Exception as e:
            logger.error(f"Error explaining prediction: {str(e)}")
            return []
    
    def save(self, path: str) -> None:
        """
        Save model to disk.
        
        Args:
            path: Directory path to save model
        """
        try:
            os.makedirs(path, exist_ok=True)
            
            # Save model and scaler
            joblib.dump(self.model, os.path.join(path, 'model.joblib'))
            joblib.dump(self.scaler, os.path.join(path, 'scaler.joblib'))
            
            # Save metadata
            metadata = {
                'model_name': self.model_name,
                'version': self.version,
                'is_fitted': self.is_fitted,
                'feature_names': self.feature_names,
                'training_metadata': self.training_metadata,
                'params': self.params
            }
            
            with open(os.path.join(path, 'metadata.json'), 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info(f"Model saved to {path}")
            
        except Exception as e:
            logger.error(f"Error saving model: {str(e)}")
            raise
    
    def load(self, path: str) -> None:
        """
        Load model from disk.
        
        Args:
            path: Directory path to load model from
        """
        try:
            # Load model and scaler
            self.model = joblib.load(os.path.join(path, 'model.joblib'))
            self.scaler = joblib.load(os.path.join(path, 'scaler.joblib'))
            
            # Load metadata
            with open(os.path.join(path, 'metadata.json'), 'r') as f:
                metadata = json.load(f)
            
            self.model_name = metadata['model_name']
            self.version = metadata['version']
            self.is_fitted = metadata['is_fitted']
            self.feature_names = metadata['feature_names']
            self.training_metadata = metadata['training_metadata']
            self.params = metadata.get('params', {})
            
            logger.info(f"Model loaded from {path}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
