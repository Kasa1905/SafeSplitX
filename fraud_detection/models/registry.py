"""
Model registry for managing trained models and metadata.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional

logger = logging.getLogger(__name__)


class ModelRegistry:
    """
    Lightweight registry for managing model versions and metadata.
    """
    
    def __init__(self, base_dir: str):
        """
        Initialize model registry.
        
        Args:
            base_dir: Base directory for model storage
        """
        self.base_dir = base_dir
        self.registry_file = os.path.join(base_dir, 'registry.json')
        
        # Ensure base directory exists
        os.makedirs(base_dir, exist_ok=True)
        
        # Initialize registry file if it doesn't exist
        if not os.path.exists(self.registry_file):
            self._save_registry({})
        
        logger.info(f"ModelRegistry initialized with base_dir: {base_dir}")
    
    def register_model(self, model_name: str, version: str, model_path: str,
                      metrics: Dict[str, float], training_params: Dict[str, Any] = None) -> None:
        """
        Register a new trained model.
        
        Args:
            model_name: Name of the model type
            version: Version identifier
            model_path: Path to saved model files
            metrics: Training/validation metrics
            training_params: Parameters used for training
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry:
                registry[model_name] = []
            
            model_entry = {
                'version': version,
                'model_path': model_path,
                'metrics': metrics,
                'training_params': training_params or {},
                'created_at': datetime.utcnow().isoformat(),
                'status': 'active'
            }
            
            registry[model_name].append(model_entry)
            
            # Sort by creation time (newest first)
            registry[model_name].sort(key=lambda x: x['created_at'], reverse=True)
            
            self._save_registry(registry)
            
            logger.info(f"Registered model {model_name} version {version}")
            
        except Exception as e:
            logger.error(f"Error registering model: {str(e)}")
            raise
    
    def get_latest_model(self, model_name: str) -> Optional[Dict[str, Any]]:
        """
        Get the latest version of a model.
        
        Args:
            model_name: Name of the model type
            
        Returns:
            Model metadata or None if not found
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry or not registry[model_name]:
                return None
            
            # Get the most recent active model
            for model_entry in registry[model_name]:
                if model_entry.get('status') == 'active':
                    return model_entry
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting latest model: {str(e)}")
            return None
    
    def get_model_version(self, model_name: str, version: str) -> Optional[Dict[str, Any]]:
        """
        Get a specific model version.
        
        Args:
            model_name: Name of the model type
            version: Version identifier
            
        Returns:
            Model metadata or None if not found
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry:
                return None
            
            for model_entry in registry[model_name]:
                if model_entry['version'] == version:
                    return model_entry
            
            return None
            
        except Exception as e:
            logger.error(f"Error getting model version: {str(e)}")
            return None
    
    def list_models(self, model_name: str = None) -> List[Dict[str, Any]]:
        """
        List all registered models.
        
        Args:
            model_name: Optional filter by model name
            
        Returns:
            List of model metadata
        """
        try:
            registry = self._load_registry()
            
            if model_name:
                return registry.get(model_name, [])
            
            # Return all models with model_name added to each entry
            all_models = []
            for name, models in registry.items():
                for model_entry in models:
                    model_with_name = model_entry.copy()
                    model_with_name['model_name'] = name
                    all_models.append(model_with_name)
            
            # Sort by creation time (newest first)
            all_models.sort(key=lambda x: x['created_at'], reverse=True)
            
            return all_models
            
        except Exception as e:
            logger.error(f"Error listing models: {str(e)}")
            return []
    
    def deactivate_model(self, model_name: str, version: str) -> bool:
        """
        Mark a model version as inactive.
        
        Args:
            model_name: Name of the model type
            version: Version identifier
            
        Returns:
            True if successful, False otherwise
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry:
                return False
            
            for model_entry in registry[model_name]:
                if model_entry['version'] == version:
                    model_entry['status'] = 'inactive'
                    model_entry['deactivated_at'] = datetime.utcnow().isoformat()
                    self._save_registry(registry)
                    logger.info(f"Deactivated model {model_name} version {version}")
                    return True
            
            return False
            
        except Exception as e:
            logger.error(f"Error deactivating model: {str(e)}")
            return False
    
    def get_model_metrics_history(self, model_name: str) -> List[Dict[str, Any]]:
        """
        Get metrics history for a model type.
        
        Args:
            model_name: Name of the model type
            
        Returns:
            List of metrics with timestamps
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry:
                return []
            
            metrics_history = []
            for model_entry in registry[model_name]:
                metrics_entry = {
                    'version': model_entry['version'],
                    'created_at': model_entry['created_at'],
                    'metrics': model_entry['metrics'],
                    'status': model_entry.get('status', 'active')
                }
                metrics_history.append(metrics_entry)
            
            return metrics_history
            
        except Exception as e:
            logger.error(f"Error getting metrics history: {str(e)}")
            return []
    
    def cleanup_old_models(self, model_name: str, keep_latest: int = 5) -> int:
        """
        Clean up old model versions, keeping only the latest N.
        
        Args:
            model_name: Name of the model type
            keep_latest: Number of latest versions to keep
            
        Returns:
            Number of models cleaned up
        """
        try:
            registry = self._load_registry()
            
            if model_name not in registry or len(registry[model_name]) <= keep_latest:
                return 0
            
            models_to_remove = registry[model_name][keep_latest:]
            cleaned_count = 0
            
            for model_entry in models_to_remove:
                try:
                    # Remove model files from disk
                    model_path = model_entry['model_path']
                    if os.path.exists(model_path):
                        import shutil
                        shutil.rmtree(model_path)
                        logger.info(f"Removed model files: {model_path}")
                    
                    cleaned_count += 1
                    
                except Exception as e:
                    logger.warning(f"Error removing model files: {str(e)}")
            
            # Keep only the latest models in registry
            registry[model_name] = registry[model_name][:keep_latest]
            self._save_registry(registry)
            
            logger.info(f"Cleaned up {cleaned_count} old {model_name} models")
            return cleaned_count
            
        except Exception as e:
            logger.error(f"Error cleaning up models: {str(e)}")
            return 0
    
    def get_registry_summary(self) -> Dict[str, Any]:
        """
        Get summary statistics of the registry.
        
        Returns:
            Registry summary information
        """
        try:
            registry = self._load_registry()
            
            summary = {
                'total_model_types': len(registry),
                'model_types': list(registry.keys()),
                'total_versions': sum(len(models) for models in registry.values()),
                'active_versions': 0,
                'inactive_versions': 0
            }
            
            for models in registry.values():
                for model in models:
                    if model.get('status') == 'active':
                        summary['active_versions'] += 1
                    else:
                        summary['inactive_versions'] += 1
            
            return summary
            
        except Exception as e:
            logger.error(f"Error getting registry summary: {str(e)}")
            return {}
    
    def _load_registry(self) -> Dict[str, List[Dict[str, Any]]]:
        """Load registry from disk."""
        try:
            with open(self.registry_file, 'r') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {}
    
    def _save_registry(self, registry: Dict[str, List[Dict[str, Any]]]) -> None:
        """Save registry to disk."""
        try:
            with open(self.registry_file, 'w') as f:
                json.dump(registry, f, indent=2)
        except Exception as e:
            logger.error(f"Error saving registry: {str(e)}")
            raise
    
    def get_all_models(self) -> List[Dict[str, Any]]:
        """Get all models with their metadata."""
        return self.list_models()
