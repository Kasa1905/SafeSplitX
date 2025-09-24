"""
Serialization utilities for saving and loading models and data.
"""

import os
import json
import pickle
import joblib
import logging
from typing import Any, Dict, List, Optional
from datetime import datetime

logger = logging.getLogger(__name__)


class SerializationManager:
    """
    Handles serialization and deserialization of models and data.
    """
    
    @staticmethod
    def save_json(data: Dict[str, Any], filepath: str) -> None:
        """
        Save data as JSON file.
        
        Args:
            data: Data to save
            filepath: Path to save file
        """
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            with open(filepath, 'w') as f:
                json.dump(data, f, indent=2, default=str)
            
            logger.debug(f"Saved JSON data to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving JSON to {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def load_json(filepath: str) -> Optional[Dict[str, Any]]:
        """
        Load data from JSON file.
        
        Args:
            filepath: Path to JSON file
            
        Returns:
            Loaded data or None if file doesn't exist
        """
        try:
            if not os.path.exists(filepath):
                logger.warning(f"JSON file not found: {filepath}")
                return None
                
            with open(filepath, 'r') as f:
                data = json.load(f)
            
            logger.debug(f"Loaded JSON data from {filepath}")
            return data
            
        except Exception as e:
            logger.error(f"Error loading JSON from {filepath}: {str(e)}")
            return None
    
    @staticmethod
    def save_pickle(obj: Any, filepath: str) -> None:
        """
        Save object using pickle.
        
        Args:
            obj: Object to save
            filepath: Path to save file
        """
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            with open(filepath, 'wb') as f:
                pickle.dump(obj, f)
            
            logger.debug(f"Saved pickle object to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving pickle to {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def load_pickle(filepath: str) -> Optional[Any]:
        """
        Load object from pickle file.
        
        Args:
            filepath: Path to pickle file
            
        Returns:
            Loaded object or None if file doesn't exist
        """
        try:
            if not os.path.exists(filepath):
                logger.warning(f"Pickle file not found: {filepath}")
                return None
                
            with open(filepath, 'rb') as f:
                obj = pickle.load(f)
            
            logger.debug(f"Loaded pickle object from {filepath}")
            return obj
            
        except Exception as e:
            logger.error(f"Error loading pickle from {filepath}: {str(e)}")
            return None
    
    @staticmethod
    def save_joblib(obj: Any, filepath: str) -> None:
        """
        Save object using joblib (optimized for sklearn models).
        
        Args:
            obj: Object to save
            filepath: Path to save file
        """
        try:
            os.makedirs(os.path.dirname(filepath), exist_ok=True)
            
            joblib.dump(obj, filepath)
            
            logger.debug(f"Saved joblib object to {filepath}")
            
        except Exception as e:
            logger.error(f"Error saving joblib to {filepath}: {str(e)}")
            raise
    
    @staticmethod
    def load_joblib(filepath: str) -> Optional[Any]:
        """
        Load object from joblib file.
        
        Args:
            filepath: Path to joblib file
            
        Returns:
            Loaded object or None if file doesn't exist
        """
        try:
            if not os.path.exists(filepath):
                logger.warning(f"Joblib file not found: {filepath}")
                return None
                
            obj = joblib.load(filepath)
            
            logger.debug(f"Loaded joblib object from {filepath}")
            return obj
            
        except Exception as e:
            logger.error(f"Error loading joblib from {filepath}: {str(e)}")
            return None


def create_model_metadata(model_name: str, version: str, 
                         metrics: Dict[str, float], 
                         training_params: Dict[str, Any] = None) -> Dict[str, Any]:
    """
    Create standardized model metadata.
    
    Args:
        model_name: Name of the model
        version: Model version
        metrics: Training/validation metrics
        training_params: Parameters used for training
        
    Returns:
        Metadata dictionary
    """
    return {
        'model_name': model_name,
        'version': version,
        'created_at': datetime.utcnow().isoformat(),
        'metrics': metrics,
        'training_params': training_params or {},
        'framework': 'fraud_detection_v1',
        'serialization_format': 'joblib'
    }


def save_model_with_metadata(model: Any, model_dir: str, 
                           model_name: str, version: str,
                           metrics: Dict[str, float],
                           training_params: Dict[str, Any] = None) -> str:
    """
    Save model with associated metadata.
    
    Args:
        model: Model object to save
        model_dir: Base directory for models
        model_name: Name of the model
        version: Model version
        metrics: Training metrics
        training_params: Training parameters
        
    Returns:
        Path to saved model directory
    """
    try:
        # Create model directory
        save_dir = os.path.join(model_dir, model_name, version)
        os.makedirs(save_dir, exist_ok=True)
        
        # Save model
        model_path = os.path.join(save_dir, 'model.joblib')
        SerializationManager.save_joblib(model, model_path)
        
        # Save metadata
        metadata = create_model_metadata(model_name, version, metrics, training_params)
        metadata_path = os.path.join(save_dir, 'metadata.json')
        SerializationManager.save_json(metadata, metadata_path)
        
        logger.info(f"Saved model {model_name} v{version} to {save_dir}")
        return save_dir
        
    except Exception as e:
        logger.error(f"Error saving model with metadata: {str(e)}")
        raise


def load_model_with_metadata(model_dir: str) -> tuple[Any, Dict[str, Any]]:
    """
    Load model with its metadata.
    
    Args:
        model_dir: Directory containing model files
        
    Returns:
        Tuple of (model, metadata)
    """
    try:
        # Load model
        model_path = os.path.join(model_dir, 'model.joblib')
        model = SerializationManager.load_joblib(model_path)
        
        if model is None:
            raise ValueError(f"Model not found in {model_dir}")
        
        # Load metadata
        metadata_path = os.path.join(model_dir, 'metadata.json')
        metadata = SerializationManager.load_json(metadata_path) or {}
        
        logger.info(f"Loaded model from {model_dir}")
        return model, metadata
        
    except Exception as e:
        logger.error(f"Error loading model with metadata: {str(e)}")
        raise


def backup_file(filepath: str, backup_dir: str = None) -> str:
    """
    Create a backup copy of a file.
    
    Args:
        filepath: Path to file to backup
        backup_dir: Directory for backups (default: same directory)
        
    Returns:
        Path to backup file
    """
    try:
        if not os.path.exists(filepath):
            raise ValueError(f"File not found: {filepath}")
        
        # Generate backup filename
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        filename = os.path.basename(filepath)
        name, ext = os.path.splitext(filename)
        backup_filename = f"{name}_backup_{timestamp}{ext}"
        
        if backup_dir:
            os.makedirs(backup_dir, exist_ok=True)
            backup_path = os.path.join(backup_dir, backup_filename)
        else:
            backup_path = os.path.join(os.path.dirname(filepath), backup_filename)
        
        # Copy file
        import shutil
        shutil.copy2(filepath, backup_path)
        
        logger.info(f"Created backup: {backup_path}")
        return backup_path
        
    except Exception as e:
        logger.error(f"Error creating backup: {str(e)}")
        raise
