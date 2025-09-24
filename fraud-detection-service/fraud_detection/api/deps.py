"""
Dependency injection for FastAPI application.
"""

import os
import logging
from typing import Optional
from fastapi import Depends, HTTPException, status

from ..models import ModelTrainer, EnsembleModel
from ..feature_engineering import FeatureEngineer
from ..utils.exceptions import ModelNotFoundError, FraudDetectionError
from .notifier import NotificationManager

logger = logging.getLogger(__name__)


class Dependencies:
    """
    Singleton class to manage application dependencies.
    """
    
    _instance = None
    _initialized = False
    
    def __new__(cls):
        """Ensure singleton pattern."""
        if cls._instance is None:
            cls._instance = super(Dependencies, cls).__new__(cls)
        return cls._instance
    
    def __init__(self):
        """Initialize dependencies."""
        if not self._initialized:
            self.model_dir = os.getenv('MODEL_DIR', './models')
            self.trainer = ModelTrainer(self.model_dir)
            self.feature_engineer = FeatureEngineer()
            self.notification_manager = NotificationManager()
            self._ensemble_model: Optional[EnsembleModel] = None
            
            # Try to load the latest ensemble model
            self._load_ensemble_model()
            
            Dependencies._initialized = True
            logger.info("Application dependencies initialized")
    
    def _load_ensemble_model(self) -> None:
        """Load the latest trained ensemble model."""
        try:
            self._ensemble_model = self.trainer.create_ensemble()
            logger.info("Loaded ensemble model successfully")
        except Exception as e:
            logger.warning(f"Could not load ensemble model: {str(e)}")
            self._ensemble_model = None
    
    def get_ensemble_model(self) -> Optional[EnsembleModel]:
        """Get the current ensemble model."""
        return self._ensemble_model
    
    def set_ensemble_model(self, model: EnsembleModel) -> None:
        """Set a new ensemble model."""
        self._ensemble_model = model
        logger.info("Updated ensemble model")
    
    def get_trainer(self) -> ModelTrainer:
        """Get the model trainer."""
        return self.trainer
    
    def get_feature_engineer(self) -> FeatureEngineer:
        """Get the feature engineer."""
        return self.feature_engineer
    
    def get_notification_manager(self) -> NotificationManager:
        """Get the notification manager."""
        return self.notification_manager


# Global dependencies instance
_deps = Dependencies()


def get_dependencies() -> Dependencies:
    """
    Get application dependencies.
    
    Returns:
        Dependencies instance
    """
    return _deps


def get_ensemble_model() -> EnsembleModel:
    """
    Get ensemble model dependency.
    
    Returns:
        Current ensemble model
        
    Raises:
        HTTPException: If no model is available
    """
    deps = get_dependencies()
    model = deps.get_ensemble_model()
    
    if model is None:
        logger.error("No trained model available")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="No trained model available. Please train a model first."
        )
    
    return model


def get_trainer() -> ModelTrainer:
    """
    Get model trainer dependency.
    
    Returns:
        Model trainer instance
    """
    return get_dependencies().get_trainer()


def get_feature_engineer() -> FeatureEngineer:
    """
    Get feature engineer dependency.
    
    Returns:
        Feature engineer instance
    """
    return get_dependencies().get_feature_engineer()


def get_notification_manager() -> NotificationManager:
    """
    Get notification manager dependency.
    
    Returns:
        Notification manager instance
    """
    return get_dependencies().get_notification_manager()


async def verify_model_health(
    ensemble_model: EnsembleModel = Depends(get_ensemble_model)
) -> EnsembleModel:
    """
    Verify that the model is healthy and ready to make predictions.
    
    Args:
        ensemble_model: Ensemble model to verify
        
    Returns:
        Verified ensemble model
        
    Raises:
        HTTPException: If model is not healthy
    """
    try:
        # Check if ML model is fitted
        if ensemble_model.ml_model and not ensemble_model.ml_model.is_fitted:
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Model is not trained"
            )
        
        return ensemble_model
        
    except Exception as e:
        logger.error(f"Model health check failed: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=f"Model health check failed: {str(e)}"
        )


def handle_prediction_error(func):
    """
    Decorator to handle prediction errors and convert to HTTP responses.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    async def wrapper(*args, **kwargs):
        try:
            return await func(*args, **kwargs)
        except ModelNotFoundError as e:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"Model not found: {e.message}"
            )
        except FraudDetectionError as e:
            logger.error(f"Fraud detection error: {e.message}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Prediction error: {e.message}"
            )
        except Exception as e:
            logger.error(f"Unexpected error in {func.__name__}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Internal server error during prediction"
            )
    
    return wrapper


class ModelCache:
    """
    Simple cache for model instances to avoid reloading.
    """
    
    def __init__(self, max_size: int = 3):
        """
        Initialize model cache.
        
        Args:
            max_size: Maximum number of models to cache
        """
        self.cache = {}
        self.max_size = max_size
        self.access_order = []
    
    def get(self, key: str) -> Optional[EnsembleModel]:
        """
        Get model from cache.
        
        Args:
            key: Cache key
            
        Returns:
            Cached model or None
        """
        if key in self.cache:
            # Update access order
            self.access_order.remove(key)
            self.access_order.append(key)
            return self.cache[key]
        
        return None
    
    def put(self, key: str, model: EnsembleModel) -> None:
        """
        Put model in cache.
        
        Args:
            key: Cache key
            model: Model to cache
        """
        # Remove oldest if cache is full
        if len(self.cache) >= self.max_size and key not in self.cache:
            oldest_key = self.access_order.pop(0)
            del self.cache[oldest_key]
        
        self.cache[key] = model
        
        if key in self.access_order:
            self.access_order.remove(key)
        self.access_order.append(key)
    
    def clear(self) -> None:
        """Clear the cache."""
        self.cache.clear()
        self.access_order.clear()


# Global model cache
_model_cache = ModelCache()


def get_model_cache() -> ModelCache:
    """Get the model cache instance."""
    return _model_cache
