"""
Evaluation metrics for fraud detection models.
"""

import numpy as np
import logging
from typing import Dict, List, Optional, Tuple
from sklearn.metrics import (
    accuracy_score, precision_score, recall_score, f1_score,
    roc_auc_score, average_precision_score, confusion_matrix,
    classification_report, roc_curve, precision_recall_curve
)

logger = logging.getLogger(__name__)


def calculate_metrics(y_true: np.ndarray, y_pred: np.ndarray, 
                     y_pred_proba: Optional[np.ndarray] = None) -> Dict[str, float]:
    """
    Calculate comprehensive evaluation metrics for fraud detection.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_pred_proba: Predicted probabilities (optional)
        
    Returns:
        Dictionary of evaluation metrics
    """
    try:
        metrics = {}
        
        # Basic classification metrics
        metrics['accuracy'] = float(accuracy_score(y_true, y_pred))
        metrics['precision'] = float(precision_score(y_true, y_pred, zero_division=0))
        metrics['recall'] = float(recall_score(y_true, y_pred, zero_division=0))
        metrics['f1_score'] = float(f1_score(y_true, y_pred, zero_division=0))
        
        # Confusion matrix components
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        metrics['true_positives'] = int(tp)
        metrics['true_negatives'] = int(tn)
        metrics['false_positives'] = int(fp)
        metrics['false_negatives'] = int(fn)
        
        # Derived metrics
        metrics['specificity'] = float(tn / (tn + fp) if (tn + fp) > 0 else 0)
        metrics['false_positive_rate'] = float(fp / (fp + tn) if (fp + tn) > 0 else 0)
        metrics['false_negative_rate'] = float(fn / (fn + tp) if (fn + tp) > 0 else 0)
        
        # Probability-based metrics (if probabilities available)
        if y_pred_proba is not None:
            try:
                metrics['roc_auc'] = float(roc_auc_score(y_true, y_pred_proba))
                metrics['average_precision'] = float(average_precision_score(y_true, y_pred_proba))
            except ValueError as e:
                logger.warning(f"Could not calculate ROC/PR metrics: {str(e)}")
                metrics['roc_auc'] = 0.0
                metrics['average_precision'] = 0.0
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error calculating metrics: {str(e)}")
        return {'error': str(e)}


def calculate_fraud_specific_metrics(y_true: np.ndarray, y_pred: np.ndarray, 
                                   costs: Dict[str, float] = None) -> Dict[str, float]:
    """
    Calculate fraud-specific metrics including cost considerations.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        costs: Dictionary of cost weights {'fp': cost, 'fn': cost, 'tp': benefit, 'tn': benefit}
        
    Returns:
        Dictionary of fraud-specific metrics
    """
    try:
        # Default costs for fraud detection
        if costs is None:
            costs = {
                'false_positive': 10,    # Cost of false alarm
                'false_negative': 100,   # Cost of missed fraud
                'true_positive': -50,    # Benefit of catching fraud
                'true_negative': 0       # No cost/benefit for normal transactions
            }
        
        tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
        
        metrics = {}
        
        # Cost-based metrics
        total_cost = (fp * costs['false_positive'] + 
                     fn * costs['false_negative'] + 
                     tp * costs['true_positive'] + 
                     tn * costs['true_negative'])
        metrics['total_cost'] = float(total_cost)
        
        # Fraud detection rate (recall for positive class)
        metrics['fraud_detection_rate'] = float(tp / (tp + fn) if (tp + fn) > 0 else 0)
        
        # False alarm rate
        metrics['false_alarm_rate'] = float(fp / (fp + tn) if (fp + tn) > 0 else 0)
        
        # Alert precision (precision for positive predictions)
        metrics['alert_precision'] = float(tp / (tp + fp) if (tp + fp) > 0 else 0)
        
        # Economic value (saved vs cost)
        fraud_value_saved = tp * 100  # Assume each fraud costs $100
        investigation_cost = (tp + fp) * 10  # Assume $10 per investigation
        metrics['economic_value'] = float(fraud_value_saved - investigation_cost)
        
        return metrics
        
    except Exception as e:
        logger.error(f"Error calculating fraud-specific metrics: {str(e)}")
        return {'error': str(e)}


def calculate_threshold_metrics(y_true: np.ndarray, y_pred_proba: np.ndarray,
                              thresholds: Optional[List[float]] = None) -> Dict[str, List[float]]:
    """
    Calculate metrics at different probability thresholds.
    
    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        thresholds: List of thresholds to evaluate
        
    Returns:
        Dictionary mapping metrics to lists of values at each threshold
    """
    try:
        if thresholds is None:
            thresholds = np.arange(0.1, 1.0, 0.1).tolist()
        
        threshold_metrics = {
            'thresholds': thresholds,
            'precision': [],
            'recall': [],
            'f1_score': [],
            'false_positive_rate': []
        }
        
        for threshold in thresholds:
            y_pred = (y_pred_proba >= threshold).astype(int)
            
            precision = precision_score(y_true, y_pred, zero_division=0)
            recall = recall_score(y_true, y_pred, zero_division=0)
            f1 = f1_score(y_true, y_pred, zero_division=0)
            
            tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
            fpr = fp / (fp + tn) if (fp + tn) > 0 else 0
            
            threshold_metrics['precision'].append(float(precision))
            threshold_metrics['recall'].append(float(recall))
            threshold_metrics['f1_score'].append(float(f1))
            threshold_metrics['false_positive_rate'].append(float(fpr))
        
        return threshold_metrics
        
    except Exception as e:
        logger.error(f"Error calculating threshold metrics: {str(e)}")
        return {'error': str(e)}


def find_optimal_threshold(y_true: np.ndarray, y_pred_proba: np.ndarray,
                         metric: str = 'f1') -> Tuple[float, float]:
    """
    Find optimal probability threshold based on specified metric.
    
    Args:
        y_true: True labels
        y_pred_proba: Predicted probabilities
        metric: Metric to optimize ('f1', 'precision', 'recall', 'youden')
        
    Returns:
        Tuple of (optimal_threshold, best_metric_value)
    """
    try:
        thresholds = np.arange(0.01, 1.0, 0.01)
        best_score = -1
        best_threshold = 0.5
        
        for threshold in thresholds:
            y_pred = (y_pred_proba >= threshold).astype(int)
            
            if metric == 'f1':
                score = f1_score(y_true, y_pred, zero_division=0)
            elif metric == 'precision':
                score = precision_score(y_true, y_pred, zero_division=0)
            elif metric == 'recall':
                score = recall_score(y_true, y_pred, zero_division=0)
            elif metric == 'youden':
                # Youden's J statistic = Sensitivity + Specificity - 1
                tn, fp, fn, tp = confusion_matrix(y_true, y_pred).ravel()
                sensitivity = tp / (tp + fn) if (tp + fn) > 0 else 0
                specificity = tn / (tn + fp) if (tn + fp) > 0 else 0
                score = sensitivity + specificity - 1
            else:
                raise ValueError(f"Unknown metric: {metric}")
            
            if score > best_score:
                best_score = score
                best_threshold = threshold
        
        return float(best_threshold), float(best_score)
        
    except Exception as e:
        logger.error(f"Error finding optimal threshold: {str(e)}")
        return 0.5, 0.0


def generate_model_report(y_true: np.ndarray, y_pred: np.ndarray, 
                         y_pred_proba: Optional[np.ndarray] = None,
                         model_name: str = "Model") -> str:
    """
    Generate a comprehensive text report of model performance.
    
    Args:
        y_true: True labels
        y_pred: Predicted labels
        y_pred_proba: Predicted probabilities (optional)
        model_name: Name of the model
        
    Returns:
        Formatted text report
    """
    try:
        report = f"\n=== {model_name} Performance Report ===\n\n"
        
        # Basic metrics
        basic_metrics = calculate_metrics(y_true, y_pred, y_pred_proba)
        report += "Basic Classification Metrics:\n"
        report += f"  Accuracy: {basic_metrics['accuracy']:.3f}\n"
        report += f"  Precision: {basic_metrics['precision']:.3f}\n"
        report += f"  Recall: {basic_metrics['recall']:.3f}\n"
        report += f"  F1-Score: {basic_metrics['f1_score']:.3f}\n"
        
        if 'roc_auc' in basic_metrics:
            report += f"  ROC AUC: {basic_metrics['roc_auc']:.3f}\n"
            report += f"  Average Precision: {basic_metrics['average_precision']:.3f}\n"
        
        # Confusion Matrix
        report += f"\nConfusion Matrix:\n"
        report += f"  True Positives: {basic_metrics['true_positives']}\n"
        report += f"  True Negatives: {basic_metrics['true_negatives']}\n"
        report += f"  False Positives: {basic_metrics['false_positives']}\n"
        report += f"  False Negatives: {basic_metrics['false_negatives']}\n"
        
        # Fraud-specific metrics
        fraud_metrics = calculate_fraud_specific_metrics(y_true, y_pred)
        report += f"\nFraud Detection Metrics:\n"
        report += f"  Fraud Detection Rate: {fraud_metrics['fraud_detection_rate']:.3f}\n"
        report += f"  False Alarm Rate: {fraud_metrics['false_alarm_rate']:.3f}\n"
        report += f"  Alert Precision: {fraud_metrics['alert_precision']:.3f}\n"
        report += f"  Economic Value: ${fraud_metrics['economic_value']:.2f}\n"
        
        # Optimal threshold
        if y_pred_proba is not None:
            optimal_thresh, optimal_f1 = find_optimal_threshold(y_true, y_pred_proba, 'f1')
            report += f"\nOptimal Threshold (F1): {optimal_thresh:.3f} (F1: {optimal_f1:.3f})\n"
        
        # Classification report
        report += f"\n{classification_report(y_true, y_pred, target_names=['Normal', 'Fraud'])}\n"
        
        return report
        
    except Exception as e:
        logger.error(f"Error generating model report: {str(e)}")
        return f"Error generating report: {str(e)}"


class MetricsTracker:
    """
    Track metrics over time for model monitoring.
    """
    
    def __init__(self):
        """Initialize metrics tracker."""
        self.history = []
        
    def add_prediction_batch(self, y_true: np.ndarray, y_pred: np.ndarray,
                           y_pred_proba: Optional[np.ndarray] = None,
                           timestamp: Optional[str] = None) -> None:
        """
        Add a batch of predictions to tracking history.
        
        Args:
            y_true: True labels
            y_pred: Predicted labels  
            y_pred_proba: Predicted probabilities
            timestamp: Timestamp for this batch
        """
        try:
            from datetime import datetime
            
            if timestamp is None:
                timestamp = datetime.utcnow().isoformat()
            
            metrics = calculate_metrics(y_true, y_pred, y_pred_proba)
            metrics['timestamp'] = timestamp
            metrics['sample_count'] = len(y_true)
            
            self.history.append(metrics)
            
        except Exception as e:
            logger.error(f"Error adding prediction batch: {str(e)}")
    
    def get_recent_metrics(self, days: int = 7) -> List[Dict]:
        """
        Get metrics from the last N days.
        
        Args:
            days: Number of days to look back
            
        Returns:
            List of recent metrics
        """
        try:
            from datetime import datetime, timedelta
            
            cutoff_date = datetime.utcnow() - timedelta(days=days)
            
            recent_metrics = []
            for entry in self.history:
                entry_date = datetime.fromisoformat(entry['timestamp'])
                if entry_date >= cutoff_date:
                    recent_metrics.append(entry)
            
            return recent_metrics
            
        except Exception as e:
            logger.error(f"Error getting recent metrics: {str(e)}")
            return []
    
    def detect_drift(self, baseline_window: int = 30, 
                    current_window: int = 7) -> Dict[str, bool]:
        """
        Detect performance drift by comparing recent vs baseline metrics.
        
        Args:
            baseline_window: Days for baseline metrics
            current_window: Days for current metrics
            
        Returns:
            Dictionary indicating drift detection for each metric
        """
        try:
            baseline_metrics = self.get_recent_metrics(baseline_window)
            current_metrics = self.get_recent_metrics(current_window)
            
            if not baseline_metrics or not current_metrics:
                return {}
            
            # Calculate average metrics for each period
            baseline_avg = {}
            current_avg = {}
            
            for metric in ['accuracy', 'precision', 'recall', 'f1_score']:
                baseline_values = [m.get(metric, 0) for m in baseline_metrics]
                current_values = [m.get(metric, 0) for m in current_metrics]
                
                baseline_avg[metric] = np.mean(baseline_values)
                current_avg[metric] = np.mean(current_values)
            
            # Detect significant changes (>10% degradation)
            drift_detected = {}
            for metric in baseline_avg:
                change_pct = abs(current_avg[metric] - baseline_avg[metric]) / baseline_avg[metric]
                drift_detected[metric] = change_pct > 0.1
            
            return drift_detected
            
        except Exception as e:
            logger.error(f"Error detecting drift: {str(e)}")
            return {}
