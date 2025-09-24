"""
API package for fraud detection service.
"""

from .main import app
from .routes import FraudDetectionRoutes
from .deps import get_dependencies, get_ensemble_model, get_trainer
from .notifier import NotificationManager, WebhookNotifier

__all__ = [
    'app',
    'FraudDetectionRoutes',
    'get_dependencies',
    'get_ensemble_model', 
    'get_trainer',
    'NotificationManager',
    'WebhookNotifier'
]
