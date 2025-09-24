"""
Optional PyTorch autoencoder model for fraud detection.
"""

import os
import json
import numpy as np
from typing import Dict, List, Optional, Tuple, Any
import logging

try:
    import torch
    import torch.nn as nn
    import torch.optim as optim
    from torch.utils.data import DataLoader, TensorDataset
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from .base import BaseModel

logger = logging.getLogger(__name__)


class AutoencoderNet(nn.Module):
    """
    Simple autoencoder neural network.
    """
    
    def __init__(self, input_dim: int, hidden_dims: List[int] = None):
        """
        Initialize autoencoder.
        
        Args:
            input_dim: Number of input features
            hidden_dims: List of hidden layer dimensions
        """
        super(AutoencoderNet, self).__init__()
        
        if hidden_dims is None:
            hidden_dims = [input_dim // 2, input_dim // 4, input_dim // 2]
        
        # Encoder
        encoder_layers = []
        prev_dim = input_dim
        for hidden_dim in hidden_dims[:-1]:
            encoder_layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.1)
            ])
            prev_dim = hidden_dim
        
        # Bottleneck
        encoder_layers.append(nn.Linear(prev_dim, hidden_dims[-1]))
        self.encoder = nn.Sequential(*encoder_layers)
        
        # Decoder
        decoder_layers = []
        prev_dim = hidden_dims[-1]
        for hidden_dim in reversed(hidden_dims[:-1]):
            decoder_layers.extend([
                nn.Linear(prev_dim, hidden_dim),
                nn.ReLU(),
                nn.Dropout(0.1)
            ])
            prev_dim = hidden_dim
        
        decoder_layers.append(nn.Linear(prev_dim, input_dim))
        self.decoder = nn.Sequential(*decoder_layers)
    
    def forward(self, x):
        """Forward pass through autoencoder."""
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded


class AutoencoderModel(BaseModel):
    """
    PyTorch autoencoder wrapper for fraud detection.
    """
    
    def __init__(self, **params):
        """
        Initialize autoencoder model.
        
        Args:
            **params: Model parameters
        """
        if not TORCH_AVAILABLE:
            raise ImportError("PyTorch is not available. Install torch to use AutoencoderModel.")
        
        super().__init__("autoencoder", "1.0.0")
        
        # Default parameters
        default_params = {
            'hidden_dims': None,
            'learning_rate': 0.001,
            'epochs': 100,
            'batch_size': 32,
            'threshold_percentile': 95
        }
        default_params.update(params)
        
        self.params = default_params
        self.model = None
        self.device = torch.device('cuda' if torch.cuda.is_available() else 'cpu')
        self.threshold = None
        self.scaler_mean = None
        self.scaler_std = None
        
        logger.info(f"AutoencoderModel initialized with device: {self.device}")
    
    def fit(self, X: np.ndarray, y: Optional[np.ndarray] = None, **kwargs) -> 'AutoencoderModel':
        """
        Train the autoencoder model.
        
        Args:
            X: Feature matrix
            y: Not used (unsupervised learning)
            **kwargs: Additional parameters
            
        Returns:
            Self for method chaining
        """
        try:
            logger.info(f"Training autoencoder with {X.shape[0]} samples, {X.shape[1]} features")
            
            # Normalize features
            self.scaler_mean = np.mean(X, axis=0)
            self.scaler_std = np.std(X, axis=0) + 1e-8  # Avoid division by zero
            X_scaled = (X - self.scaler_mean) / self.scaler_std
            
            # Initialize model
            input_dim = X.shape[1]
            hidden_dims = self.params['hidden_dims']
            if hidden_dims is None:
                hidden_dims = [input_dim // 2, input_dim // 4, input_dim // 2]
            
            self.model = AutoencoderNet(input_dim, hidden_dims).to(self.device)
            
            # Prepare data
            dataset = TensorDataset(
                torch.FloatTensor(X_scaled).to(self.device)
            )
            dataloader = DataLoader(
                dataset, 
                batch_size=self.params['batch_size'], 
                shuffle=True
            )
            
            # Training setup
            criterion = nn.MSELoss()
            optimizer = optim.Adam(self.model.parameters(), lr=self.params['learning_rate'])
            
            # Training loop
            self.model.train()
            for epoch in range(self.params['epochs']):
                epoch_loss = 0.0
                for batch_data, in dataloader:
                    optimizer.zero_grad()
                    output = self.model(batch_data)
                    loss = criterion(output, batch_data)
                    loss.backward()
                    optimizer.step()
                    epoch_loss += loss.item()
                
                if epoch % 20 == 0:
                    avg_loss = epoch_loss / len(dataloader)
                    logger.info(f"Epoch {epoch}/{self.params['epochs']}, Loss: {avg_loss:.4f}")
            
            # Calculate threshold using reconstruction error
            self.model.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X_scaled).to(self.device)
                reconstructed = self.model(X_tensor)
                errors = torch.mean((X_tensor - reconstructed) ** 2, dim=1)
                self.threshold = np.percentile(errors.cpu().numpy(), self.params['threshold_percentile'])
            
            self.is_fitted = True
            
            # Store training metadata
            self.training_metadata = {
                'n_samples': X.shape[0],
                'n_features': X.shape[1],
                'epochs': self.params['epochs'],
                'threshold': float(self.threshold),
                'device': str(self.device)
            }
            
            logger.info(f"Autoencoder training completed. Threshold: {self.threshold:.4f}")
            return self
            
        except Exception as e:
            logger.error(f"Error training autoencoder: {str(e)}")
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
            probabilities = self.predict_proba(X)
            return (probabilities > 0.5).astype(int)
            
        except Exception as e:
            logger.error(f"Error making predictions: {str(e)}")
            raise
    
    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        """
        Predict anomaly probabilities based on reconstruction error.
        
        Args:
            X: Feature matrix
            
        Returns:
            Anomaly probabilities [0, 1]
        """
        if not self.is_fitted:
            raise ValueError("Model must be fitted before making predictions")
        
        try:
            # Normalize features
            X_scaled = (X - self.scaler_mean) / self.scaler_std
            
            self.model.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X_scaled).to(self.device)
                reconstructed = self.model(X_tensor)
                errors = torch.mean((X_tensor - reconstructed) ** 2, dim=1)
                
                # Convert reconstruction error to probability
                probabilities = np.minimum(errors.cpu().numpy() / self.threshold, 1.0)
                
                return probabilities
            
        except Exception as e:
            logger.error(f"Error predicting probabilities: {str(e)}")
            raise
    
    def explain_prediction(self, X: np.ndarray, sample_idx: int = 0) -> List[Tuple[str, float]]:
        """
        Explain prediction using feature reconstruction errors.
        
        Args:
            X: Feature matrix
            sample_idx: Index of sample to explain
            
        Returns:
            List of (feature_name, contribution) tuples
        """
        if not self.is_fitted or self.feature_names is None or sample_idx >= len(X):
            return []
        
        try:
            # Get reconstruction error for each feature
            X_scaled = (X[sample_idx:sample_idx+1] - self.scaler_mean) / self.scaler_std
            
            self.model.eval()
            with torch.no_grad():
                X_tensor = torch.FloatTensor(X_scaled).to(self.device)
                reconstructed = self.model(X_tensor)
                feature_errors = ((X_tensor - reconstructed) ** 2)[0].cpu().numpy()
            
            explanations = []
            for i, feature_name in enumerate(self.feature_names):
                if i < len(feature_errors):
                    explanations.append((feature_name, float(feature_errors[i])))
            
            # Sort by error magnitude
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
            
            # Save model state
            torch.save(self.model.state_dict(), os.path.join(path, 'model.pth'))
            
            # Save metadata and parameters
            metadata = {
                'model_name': self.model_name,
                'version': self.version,
                'is_fitted': self.is_fitted,
                'feature_names': self.feature_names,
                'training_metadata': self.training_metadata,
                'params': self.params,
                'threshold': float(self.threshold) if self.threshold else None,
                'scaler_mean': self.scaler_mean.tolist() if self.scaler_mean is not None else None,
                'scaler_std': self.scaler_std.tolist() if self.scaler_std is not None else None,
                'input_dim': self.model.encoder[0].in_features if self.model else None
            }
            
            with open(os.path.join(path, 'metadata.json'), 'w') as f:
                json.dump(metadata, f, indent=2)
                
            logger.info(f"Autoencoder model saved to {path}")
            
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
            # Load metadata
            with open(os.path.join(path, 'metadata.json'), 'r') as f:
                metadata = json.load(f)
            
            self.model_name = metadata['model_name']
            self.version = metadata['version']
            self.is_fitted = metadata['is_fitted']
            self.feature_names = metadata['feature_names']
            self.training_metadata = metadata['training_metadata']
            self.params = metadata.get('params', {})
            self.threshold = metadata.get('threshold')
            
            if metadata.get('scaler_mean'):
                self.scaler_mean = np.array(metadata['scaler_mean'])
            if metadata.get('scaler_std'):
                self.scaler_std = np.array(metadata['scaler_std'])
            
            # Reconstruct and load model
            input_dim = metadata['input_dim']
            hidden_dims = self.params.get('hidden_dims')
            if hidden_dims is None:
                hidden_dims = [input_dim // 2, input_dim // 4, input_dim // 2]
                
            self.model = AutoencoderNet(input_dim, hidden_dims).to(self.device)
            self.model.load_state_dict(torch.load(
                os.path.join(path, 'model.pth'),
                map_location=self.device
            ))
            
            logger.info(f"Autoencoder model loaded from {path}")
            
        except Exception as e:
            logger.error(f"Error loading model: {str(e)}")
            raise
