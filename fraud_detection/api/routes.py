"""
Route handlers for fraud detection API.
"""

import logging
from datetime import datetime
from typing import Dict, Any, List
import asyncio

from fastapi import HTTPException, status, BackgroundTasks, Depends
import pandas as pd

from ..schemas import (
    ExpenseIn, PredictionResponse, TrainRequest, TrainResponse, 
    HealthResponse, RuleViolation, FeatureContribution
)
from ..models import EnsembleModel, ModelTrainer
from ..feature_engineering import FeatureEngineer
from ..utils.exceptions import FraudDetectionError, FeatureExtractionError, PredictionError
from .deps import (
    get_ensemble_model, get_trainer, get_feature_engineer, 
    get_notification_manager, verify_model_health, handle_prediction_error
)
from .notifier import NotificationManager

logger = logging.getLogger(__name__)


class FraudDetectionRoutes:
    """
    Route handlers for fraud detection endpoints.
    """
    
    @staticmethod
    @handle_prediction_error
    async def predict(
        expense: ExpenseIn,
        background_tasks: BackgroundTasks,
        ensemble_model: EnsembleModel = Depends(verify_model_health),
        feature_engineer: FeatureEngineer = Depends(get_feature_engineer),
        notification_manager: NotificationManager = Depends(get_notification_manager)
    ) -> PredictionResponse:
        """
        Predict fraud for a single expense.
        
        Args:
            expense: Expense data to analyze
            background_tasks: FastAPI background tasks
            ensemble_model: Trained ensemble model
            feature_engineer: Feature engineering instance
            notification_manager: Notification manager
            
        Returns:
            Fraud prediction result
        """
        try:
            logger.info(f"Processing prediction for expense {expense.expense_id}")
            
            # Extract features from expense
            features = feature_engineer.extract_features(expense)
            feature_vector = feature_engineer.features_to_vector(features)
            
            # Make prediction using ensemble model
            prediction_result = ensemble_model.predict_single(
                expense=expense,
                features=features,
                feature_vector=feature_vector,
                historical_data=[]  # TODO: Add historical data lookup
            )
            
            # Create response
            response = PredictionResponse(
                expense_id=expense.expense_id,
                anomaly_score=prediction_result['anomaly_score'],
                is_suspicious=prediction_result['is_suspicious'],
                model_version=prediction_result['model_version'],
                reasons=prediction_result['rule_violations'],
                explanation=prediction_result['explanation'],
                timestamp=datetime.utcnow().isoformat()
            )
            
            # Send notification if suspicious (asynchronously)
            if response.is_suspicious:
                background_tasks.add_task(
                    FraudDetectionRoutes._send_fraud_alert,
                    expense,
                    prediction_result,
                    notification_manager
                )
            
            logger.info(f"Prediction completed for expense {expense.expense_id}: "
                       f"score={response.anomaly_score:.3f}, suspicious={response.is_suspicious}")
            
            return response
            
        except FeatureExtractionError as e:
            logger.error(f"Feature extraction failed for expense {expense.expense_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Feature extraction failed: {str(e)}"
            )
        except Exception as e:
            logger.error(f"Prediction failed for expense {expense.expense_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Prediction failed due to internal error"
            )
    
    @staticmethod
    async def _send_fraud_alert(
        expense: ExpenseIn,
        prediction_result: Dict[str, Any],
        notification_manager: NotificationManager
    ) -> None:
        """
        Send fraud alert notification (background task).
        
        Args:
            expense: Original expense data
            prediction_result: Prediction results
            notification_manager: Notification manager
        """
        try:
            results = await notification_manager.send_alert(expense, prediction_result)
            success_count = sum(1 for success in results.values() if success)
            logger.info(f"Fraud alert sent for expense {expense.expense_id}: "
                       f"{success_count}/{len(results)} notifications successful")
        except Exception as e:
            logger.error(f"Failed to send fraud alert for expense {expense.expense_id}: {str(e)}")
    
    @staticmethod
    async def train(
        request: TrainRequest,
        trainer: ModelTrainer = Depends(get_trainer)
    ) -> TrainResponse:
        """
        Trigger model training.
        
        Args:
            request: Training request parameters
            trainer: Model trainer instance
            
        Returns:
            Training result
        """
        try:
            logger.info(f"Starting training for model type: {request.model_type}")
            
            # Generate sample training data if no real data available
            # In production, this would load from a data source
            training_data = FraudDetectionRoutes._generate_sample_training_data()
            
            # Train model
            training_result = trainer.train(
                training_data=training_data,
                model_type=request.model_type,
                params=request.params
            )
            
            if training_result['success']:
                # Update the global ensemble model
                from .deps import get_dependencies
                deps = get_dependencies()
                new_ensemble = trainer.create_ensemble(request.model_type)
                deps.set_ensemble_model(new_ensemble)
                
                return TrainResponse(
                    success=True,
                    model_version=training_result['model_version'],
                    metrics=training_result['metrics'],
                    message=f"Model {request.model_type} trained successfully"
                )
            else:
                return TrainResponse(
                    success=False,
                    model_version="",
                    metrics={},
                    message=f"Training failed: {training_result.get('error', 'Unknown error')}"
                )
                
        except Exception as e:
            logger.error(f"Training failed: {str(e)}")
            return TrainResponse(
                success=False,
                model_version="",
                metrics={},
                message=f"Training failed: {str(e)}"
            )
    
    @staticmethod
    def _generate_sample_training_data() -> pd.DataFrame:
        """
        Generate sample training data for demonstration.
        
        Returns:
            DataFrame with sample training data
        """
        # This is a placeholder - in production, load from real data source
        import numpy as np
        
        np.random.seed(42)
        n_samples = 1000
        
        # Generate synthetic training data
        data = {
            'expense_id': [f'exp_{i}' for i in range(n_samples)],
            'amount': np.random.lognormal(3, 1, n_samples),
            'group_id': [f'group_{np.random.randint(1, 11)}' for _ in range(n_samples)],
            'payer_id': [f'user_{np.random.randint(1, 101)}' for _ in range(n_samples)],
            'currency': np.random.choice(['USD', 'EUR', 'GBP'], n_samples),
            'merchant': np.random.choice(['Restaurant', 'Grocery', 'Gas', 'Online'], n_samples),
            'category': np.random.choice(['food', 'transport', 'entertainment', 'utilities'], n_samples),
            'timestamp': [datetime.utcnow().isoformat() for _ in range(n_samples)],
            'num_participants': np.random.randint(2, 6, n_samples),
            'is_fraud': np.random.choice([0, 1], n_samples, p=[0.95, 0.05])  # 5% fraud rate
        }
        
        return pd.DataFrame(data)
    
    @staticmethod
    async def health(
        ensemble_model: EnsembleModel = Depends(get_ensemble_model)
    ) -> HealthResponse:
        """
        Get service health status.
        
        Args:
            ensemble_model: Current ensemble model
            
        Returns:
            Health status information
        """
        try:
            import time
            from ..api.main import app_start_time
            
            uptime_seconds = time.time() - app_start_time
            
            model_info = ensemble_model.get_model_info() if ensemble_model else {}
            model_version = model_info.get('ml_model', {}).get('version', 'unknown')
            
            # Get last trained timestamp from model metadata
            last_trained_at = None
            if ensemble_model and ensemble_model.ml_model:
                training_metadata = ensemble_model.ml_model.training_metadata
                if training_metadata:
                    last_trained_at = training_metadata.get('trained_at')
            
            return HealthResponse(
                status="healthy",
                model_version=model_version,
                last_trained_at=last_trained_at,
                uptime_seconds=uptime_seconds
            )
            
        except Exception as e:
            logger.error(f"Health check failed: {str(e)}")
            return HealthResponse(
                status="unhealthy",
                model_version=None,
                last_trained_at=None,
                uptime_seconds=0.0
            )
    
    @staticmethod
    async def get_model_info(
        ensemble_model: EnsembleModel = Depends(get_ensemble_model)
    ) -> Dict[str, Any]:
        """
        Get detailed model information.
        
        Args:
            ensemble_model: Current ensemble model
            
        Returns:
            Model information dictionary
        """
        try:
            return ensemble_model.get_model_info()
        except Exception as e:
            logger.error(f"Error getting model info: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to retrieve model information"
            )
    
    @staticmethod
    async def batch_predict(
        expenses: List[ExpenseIn],
        background_tasks: BackgroundTasks,
        ensemble_model: EnsembleModel = Depends(verify_model_health),
        feature_engineer: FeatureEngineer = Depends(get_feature_engineer),
        notification_manager: NotificationManager = Depends(get_notification_manager)
    ) -> List[PredictionResponse]:
        """
        Process batch predictions for multiple expenses.
        
        Args:
            expenses: List of expenses to analyze
            background_tasks: FastAPI background tasks
            ensemble_model: Trained ensemble model
            feature_engineer: Feature engineering instance
            notification_manager: Notification manager
            
        Returns:
            List of prediction results
        """
        try:
            logger.info(f"Processing batch prediction for {len(expenses)} expenses")
            
            results = []
            suspicious_expenses = []
            
            for expense in expenses:
                # Process each expense
                features = feature_engineer.extract_features(expense)
                feature_vector = feature_engineer.features_to_vector(features)
                
                prediction_result = ensemble_model.predict_single(
                    expense=expense,
                    features=features,
                    feature_vector=feature_vector,
                    historical_data=[]
                )
                
                response = PredictionResponse(
                    expense_id=expense.expense_id,
                    anomaly_score=prediction_result['anomaly_score'],
                    is_suspicious=prediction_result['is_suspicious'],
                    model_version=prediction_result['model_version'],
                    reasons=prediction_result['rule_violations'],
                    explanation=prediction_result['explanation'],
                    timestamp=datetime.utcnow().isoformat()
                )
                
                results.append(response)
                
                if response.is_suspicious:
                    suspicious_expenses.append((expense, prediction_result))
            
            # Send notifications for suspicious expenses (asynchronously)
            if suspicious_expenses:
                background_tasks.add_task(
                    FraudDetectionRoutes._send_batch_fraud_alerts,
                    suspicious_expenses,
                    notification_manager
                )
            
            logger.info(f"Batch prediction completed: {len(suspicious_expenses)} suspicious expenses found")
            return results
            
        except Exception as e:
            logger.error(f"Batch prediction failed: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Batch prediction failed due to internal error"
            )
    
    @staticmethod
    async def _send_batch_fraud_alerts(
        suspicious_expenses: List[tuple],
        notification_manager: NotificationManager
    ) -> None:
        """
        Send fraud alerts for batch predictions (background task).
        
        Args:
            suspicious_expenses: List of (expense, prediction_result) tuples
            notification_manager: Notification manager
        """
        try:
            for expense, prediction_result in suspicious_expenses:
                await notification_manager.send_alert(expense, prediction_result)
                await asyncio.sleep(0.1)  # Small delay to avoid overwhelming notifications
            
            logger.info(f"Sent {len(suspicious_expenses)} batch fraud alerts")
            
        except Exception as e:
            logger.error(f"Failed to send batch fraud alerts: {str(e)}")
