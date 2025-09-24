"""
Abstract base class for fraud detection models.
"""

from abc import ABC, abstractmethod
from typing import Any, Dict, List, Optional, Tuple
import numpy as np
import logging

logger = logging.getLogger(__name__)


class BaseModel(ABC):
    """
    Abstract base class for fraud detection models.
    """
    
    def __init__(self, model_name: str, version: str = "1.0.0"):
        """
        Initialize base model.
        
        Args:
            model_name: Name of the model
            version: Model version
        """
        self.model_name = model_name
        self.version = version
        self.is_fitted = False
        self.feature_names: Optional[List[str]] = None
        self.training_metadata: Dict[str, Any] = {}
        
    @abstractmethod
    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> 'BaseModel':
        """
        Train the model on the provided data.
        
        Args:
            X: Feature matrix
            y: Target labels (optional for unsupervised models)
            **kwargs: Additional training parameters
            
        Returns:
            Self for method chaining
        """
        pass
    
    @abstractmethod
    def predict(self, X: np.ndarray) -> np.ndarray:
        """
        Make binary predictions.
        
        Args:
            X: Feature matrix
            
        Returns:
            Binary predictions (1 = anomaly/fraud, 0 = normal)
        """
        pass
    
    @abstractmethod
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict anomaly probabilities.
        
        Args:
            X: Feature matrix
            
        Returns:
            Anomaly probabilities [0, 1]
        """
        pass
    
    @abstractmethod
    def save(self, path: str) -> None:
        """
        Save model to disk.
        
        Args:
            path: Directory path to save model
        """
        pass
    
    @abstractmethod
    def load(self, path: str) -> None:
        """
        Load model from disk.
        
        Args:
            path: Directory path to load model from
        """
        pass
    
    def get_feature_importance(self) -> Optional[Dict[str, float]]:
        """
        Get feature importance scores if available.
        
        Returns:
            Dictionary mapping feature names to importance scores
        """
        return None
    
    def explain_prediction(self, X: np.ndarray, sample_idx: int = 0) -> List[Tuple[str, float]]:
        """
        Explain a prediction by returning feature contributions.
        
        Args:
            X: Feature matrix
            sample_idx: Index of sample to explain
            
        Returns:
            List of (feature_name, contribution) tuples
        """
        # Default implementation using feature importance
        importance = self.get_feature_importance()
        if importance is None or self.feature_names is None:
            return []
        
        if sample_idx >= len(X):
            return []
            
        sample = X[sample_idx]
        explanations = []
        
        for i, feature_name in enumerate(self.feature_names):
            if i < len(sample) and feature_name in importance:
                contribution = sample[i] * importance[feature_name]
                explanations.append((feature_name, contribution))
        
        # Sort by absolute contribution
        explanations.sort(key=lambda x: abs(x[1]), reverse=True)
        return explanations[:10]  # Return top 10
    
    def set_feature_names(self, feature_names: List[str]) -> None:
        """
        Set feature names for the model.
        
        Args:
            feature_names: List of feature names
        """
        self.feature_names = feature_names
        
    def get_model_info(self) -> Dict[str, Any]:
        """
        Get model information and metadata.
        
        Returns:
            Dictionary with model information
        """
        return {
            'model_name': self.model_name,
            'version': self.version,
            'is_fitted': self.is_fitted,
            'feature_count': len(self.feature_names) if self.feature_names else 0,
            'training_metadata': self.training_metadata
        }
