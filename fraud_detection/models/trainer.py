"""
Training pipeline for fraud detection models.
"""

import os
import json
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional, Tuple
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score

from ..feature_engineering import FeatureEngineer
from ..utils.metrics import calculate_metrics
from .isolation_forest_model import IsolationForestModel
from .rule_engine import RuleEngine
from .ensemble import EnsembleModel
from .registry import ModelRegistry

# Optional imports
try:
    from .autoencoder_model import AutoencoderModel
    AUTOENCODER_AVAILABLE = True
except ImportError:
    AUTOENCODER_AVAILABLE = False

logger = logging.getLogger(__name__)


class ModelTrainer:
    """
    Training pipeline for fraud detection models.
    """
    
    def __init__(self, model_dir: str = None):
        """
        Initialize model trainer.
        
        Args:
            model_dir: Directory to save trained models
        """
        self.model_dir = model_dir or os.getenv('MODEL_DIR', './models')
        self.feature_engineer = FeatureEngineer()
        self.rule_engine = RuleEngine()
        self.registry = ModelRegistry(self.model_dir)
        
        os.makedirs(self.model_dir, exist_ok=True)
        logger.info(f"ModelTrainer initialized with model_dir: {self.model_dir}")
    
    def train(self, training_data: pd.DataFrame, 
             model_type: str = 'isolation_forest',
             params: Dict[str, Any] = None,
             validation_split: float = 0.2) -> Dict[str, Any]:
        """
        Train a fraud detection model.
        
        Args:
            training_data: DataFrame with expense data
            model_type: Type of model to train ('isolation_forest' or 'autoencoder')
            params: Model-specific parameters
            validation_split: Fraction of data for validation
            
        Returns:
            Training results and metrics
        """
        try:
            logger.info(f"Starting training for {model_type} model with {len(training_data)} samples")
            
            if params is None:
                params = {}
            
            # Prepare data
            X, y, feature_names = self._prepare_training_data(training_data)
            
            if len(X) == 0:
                raise ValueError("No valid training data after preprocessing")
            
            # Split data
            X_train, X_val, y_train, y_val = train_test_split(
                X, y, test_size=validation_split, random_state=42, stratify=y
            )
            
            logger.info(f"Training set: {len(X_train)} samples, Validation set: {len(X_val)} samples")
            
            # Train model
            model = self._create_model(model_type, params)
            model.set_feature_names(feature_names)
            
            # Fit model (unsupervised, so we don't use y_train)
            model.fit(X_train)
            
            # Evaluate model
            metrics = self._evaluate_model(model, X_val, y_val)
            
            # Save model
            model_version = self._generate_version()
            model_path = os.path.join(self.model_dir, model_type, model_version)
            model.save(model_path)
            
            # Register model
            training_info = {
                'model_type': model_type,
                'version': model_version,
                'training_samples': len(X_train),
                'validation_samples': len(X_val),
                'feature_count': len(feature_names),
                'parameters': params,
                'metrics': metrics,
                'trained_at': datetime.utcnow().isoformat(),
                'trainer_version': '1.0.0'
            }
            
            self.registry.register_model(
                model_name=model_type,
                version=model_version,
                model_path=model_path,
                metrics=metrics,
                training_params=params
            )
            
            logger.info(f"Model training completed. Version: {model_version}")
            return {
                'success': True,
                'model_version': model_version,
                'model_path': model_path,
                'metrics': metrics,
                'training_info': training_info
            }
            
        except Exception as e:
            logger.error(f"Error during training: {str(e)}")
            return {
                'success': False,
                'error': str(e),
                'model_version': None,
                'metrics': {}
            }
    
    def _prepare_training_data(self, df: pd.DataFrame) -> Tuple[np.ndarray, np.ndarray, List[str]]:
        """
        Prepare training data from expense DataFrame.
        
        Args:
            df: DataFrame with expense data
            
        Returns:
            Feature matrix, labels, and feature names
        """
        try:
            features_list = []
            labels = []
            
            # Convert DataFrame to expense-like dictionaries for feature extraction
            for idx, row in df.iterrows():
                try:
                    # Create a simplified expense dict from DataFrame row
                    expense_dict = {
                        'expense_id': row.get('expense_id', f'exp_{idx}'),
                        'amount': float(row['amount']),
                        'group_id': row.get('group_id', 'group_1'),
                        'payer_id': row.get('payer_id', 'user_1'),
                        'currency': row.get('currency', 'USD'),
                        'merchant': row.get('merchant', 'unknown'),
                        'category': row.get('category', 'other'),
                        'timestamp': row.get('timestamp', datetime.utcnow().isoformat()),
                        'num_participants': int(row.get('num_participants', 2))
                    }
                    
                    # Extract features using feature engineering
                    features = self.feature_engineer.extract_features_from_dict(expense_dict)
                    feature_vector = self.feature_engineer.features_to_vector(features)
                    
                    features_list.append(feature_vector)
                    
                    # Use label if available, otherwise assume normal (0)
                    label = int(row.get('is_fraud', 0))
                    labels.append(label)
                    
                except Exception as e:
                    logger.warning(f"Skipping row {idx} due to error: {str(e)}")
                    continue
            
            if not features_list:
                raise ValueError("No valid features extracted from training data")
            
            X = np.array(features_list)
            y = np.array(labels)
            feature_names = self.feature_engineer.get_feature_names()
            
            logger.info(f"Prepared training data: {X.shape[0]} samples, {X.shape[1]} features")
            return X, y, feature_names
            
        except Exception as e:
            logger.error(f"Error preparing training data: {str(e)}")
            raise
    
    def _create_model(self, model_type: str, params: Dict[str, Any]):
        """Create model instance based on type."""
        if model_type == 'isolation_forest':
            return IsolationForestModel(**params)
        elif model_type == 'autoencoder' and AUTOENCODER_AVAILABLE:
            return AutoencoderModel(**params)
        elif model_type == 'autoencoder' and not AUTOENCODER_AVAILABLE:
            raise ValueError("Autoencoder model requires PyTorch. Install torch to use this model type.")
        else:
            raise ValueError(f"Unknown model type: {model_type}")
    
    def _evaluate_model(self, model, X_val: np.ndarray, y_val: np.ndarray) -> Dict[str, float]:
        """
        Evaluate trained model on validation data.
        
        Args:
            model: Trained model
            X_val: Validation features
            y_val: Validation labels
            
        Returns:
            Dictionary of evaluation metrics
        """
        try:
            # Get predictions
            y_pred_proba = model.predict_proba(X_val)
            y_pred = model.predict(X_val)
            
            # Calculate metrics
            metrics = calculate_metrics(y_val, y_pred, y_pred_proba)
            
            logger.info(f"Model evaluation metrics: {metrics}")
            return metrics
            
        except Exception as e:
            logger.error(f"Error evaluating model: {str(e)}")
            return {'error': str(e)}
    
    def _generate_version(self) -> str:
        """Generate version string based on timestamp."""
        return datetime.utcnow().strftime("%Y%m%d_%H%M%S")
    
    def load_latest_model(self, model_type: str = 'isolation_forest'):
        """
        Load the latest trained model of given type.
        
        Args:
            model_type: Type of model to load
            
        Returns:
            Loaded model instance
        """
        try:
            latest_model_info = self.registry.get_latest_model(model_type)
            if not latest_model_info:
                raise ValueError(f"No trained {model_type} model found")
            
            model = self._create_model(model_type, {})
            model.load(latest_model_info['model_path'])
            
            logger.info(f"Loaded {model_type} model version {latest_model_info['version']}")
            return model
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
    
    def create_ensemble(self, ml_model_type: str = 'isolation_forest') -> EnsembleModel:
        """
        Create ensemble model with latest ML model and rule engine.
        
        Args:
            ml_model_type: Type of ML model to use in ensemble
            
        Returns:
            Configured ensemble model
        """
        try:
            # Load latest ML model
            ml_model = self.load_latest_model(ml_model_type)
            
            # Create ensemble
            ensemble = EnsembleModel(ml_model, self.rule_engine)
            
            logger.info(f"Created ensemble with {ml_model_type} model")
            return ensemble
            
        except Exception as e:
            logger.error(f"Error creating ensemble: {str(e)}")
            raise
    
    def get_training_history(self) -> List[Dict[str, Any]]:
        """Get history of all trained models."""
        return self.registry.get_all_models()
    
    def retrain_on_feedback(self, model_type: str, feedback_data: pd.DataFrame) -> Dict[str, Any]:
        """
        Retrain model with feedback data.
        
        Args:
            model_type: Type of model to retrain
            feedback_data: DataFrame with labeled feedback examples
            
        Returns:
            Retraining results
        """
        logger.info(f"Retraining {model_type} with {len(feedback_data)} feedback examples")
        
        # For now, just retrain with feedback data
        # In production, you might want to combine with original training data
        return self.train(
            training_data=feedback_data,
            model_type=model_type,
            params={'contamination': 0.05}  # Lower contamination for feedback data
        )
