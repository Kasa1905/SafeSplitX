"""
Models package for fraud detection.
"""

from .base import BaseModel
from .isolation_forest_model import IsolationForestModel
from .rule_engine import RuleEngine
from .ensemble import EnsembleModel
from .trainer import ModelTrainer
from .registry import ModelRegistry

# Optional autoencoder import
try:
    from .autoencoder_model import AutoencoderModel
    __all__ = [
        'BaseModel',
        'IsolationForestModel',
        'AutoencoderModel',
        'RuleEngine',
        'EnsembleModel',
        'ModelTrainer',
        'ModelRegistry'
    ]
except ImportError:
    __all__ = [
        'BaseModel',
        'IsolationForestModel',
        'RuleEngine',
        'EnsembleModel',
        'ModelTrainer',
        'ModelRegistry'
    ]
