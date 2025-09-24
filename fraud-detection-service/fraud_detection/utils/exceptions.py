"""
Custom exceptions for the fraud detection service.
"""


class FraudDetectionError(Exception):
    """Base exception class for fraud detection errors."""
    
    def __init__(self, message: str, error_code: str = None):
        """
        Initialize fraud detection error.
        
        Args:
            message: Error message
            error_code: Optional error code for API responses
        """
        super().__init__(message)
        self.message = message
        self.error_code = error_code or 'FRAUD_DETECTION_ERROR'


class ModelNotFoundError(FraudDetectionError):
    """Raised when a requested model is not found."""
    
    def __init__(self, model_name: str, version: str = None):
        """
        Initialize model not found error.
        
        Args:
            model_name: Name of the missing model
            version: Version of the missing model
        """
        if version:
            message = f"Model '{model_name}' version '{version}' not found"
        else:
            message = f"Model '{model_name}' not found"
        
        super().__init__(message, 'MODEL_NOT_FOUND')
        self.model_name = model_name
        self.version = version


class ModelNotTrainedError(FraudDetectionError):
    """Raised when trying to use an untrained model."""
    
    def __init__(self, model_name: str):
        """
        Initialize model not trained error.
        
        Args:
            model_name: Name of the untrained model
        """
        message = f"Model '{model_name}' is not trained. Call fit() first."
        super().__init__(message, 'MODEL_NOT_TRAINED')
        self.model_name = model_name


class InvalidExpenseError(FraudDetectionError):
    """Raised when expense data is invalid or incomplete."""
    
    def __init__(self, message: str, expense_id: str = None):
        """
        Initialize invalid expense error.
        
        Args:
            message: Error message describing the validation issue
            expense_id: ID of the invalid expense
        """
        super().__init__(message, 'INVALID_EXPENSE')
        self.expense_id = expense_id


class FeatureExtractionError(FraudDetectionError):
    """Raised when feature extraction fails."""
    
    def __init__(self, message: str, expense_id: str = None):
        """
        Initialize feature extraction error.
        
        Args:
            message: Error message describing the extraction issue
            expense_id: ID of the expense that failed feature extraction
        """
        super().__init__(message, 'FEATURE_EXTRACTION_ERROR')
        self.expense_id = expense_id


class PredictionError(FraudDetectionError):
    """Raised when prediction fails."""
    
    def __init__(self, message: str, expense_id: str = None, model_name: str = None):
        """
        Initialize prediction error.
        
        Args:
            message: Error message describing the prediction issue
            expense_id: ID of the expense that failed prediction
            model_name: Name of the model that failed
        """
        super().__init__(message, 'PREDICTION_ERROR')
        self.expense_id = expense_id
        self.model_name = model_name


class TrainingError(FraudDetectionError):
    """Raised when model training fails."""
    
    def __init__(self, message: str, model_name: str = None):
        """
        Initialize training error.
        
        Args:
            message: Error message describing the training issue
            model_name: Name of the model that failed training
        """
        super().__init__(message, 'TRAINING_ERROR')
        self.model_name = model_name


class ConfigurationError(FraudDetectionError):
    """Raised when there's a configuration issue."""
    
    def __init__(self, message: str, config_key: str = None):
        """
        Initialize configuration error.
        
        Args:
            message: Error message describing the configuration issue
            config_key: Name of the problematic configuration key
        """
        super().__init__(message, 'CONFIGURATION_ERROR')
        self.config_key = config_key


class NotificationError(FraudDetectionError):
    """Raised when notification delivery fails."""
    
    def __init__(self, message: str, notification_type: str = None, recipient: str = None):
        """
        Initialize notification error.
        
        Args:
            message: Error message describing the notification issue
            notification_type: Type of notification that failed
            recipient: Recipient that couldn't be notified
        """
        super().__init__(message, 'NOTIFICATION_ERROR')
        self.notification_type = notification_type
        self.recipient = recipient


class RateLimitError(FraudDetectionError):
    """Raised when rate limits are exceeded."""
    
    def __init__(self, message: str, retry_after: int = None):
        """
        Initialize rate limit error.
        
        Args:
            message: Error message describing the rate limit
            retry_after: Seconds to wait before retrying
        """
        super().__init__(message, 'RATE_LIMIT_ERROR')
        self.retry_after = retry_after


class ExternalServiceError(FraudDetectionError):
    """Raised when external service calls fail."""
    
    def __init__(self, message: str, service_name: str = None, status_code: int = None):
        """
        Initialize external service error.
        
        Args:
            message: Error message describing the service issue
            service_name: Name of the external service
            status_code: HTTP status code if applicable
        """
        super().__init__(message, 'EXTERNAL_SERVICE_ERROR')
        self.service_name = service_name
        self.status_code = status_code


class ValidationError(FraudDetectionError):
    """Raised when data validation fails."""
    
    def __init__(self, message: str, field_name: str = None, field_value: str = None):
        """
        Initialize validation error.
        
        Args:
            message: Error message describing the validation issue
            field_name: Name of the field that failed validation
            field_value: Value that failed validation
        """
        super().__init__(message, 'VALIDATION_ERROR')
        self.field_name = field_name
        self.field_value = field_value


def handle_exception(func):
    """
    Decorator to handle exceptions and convert them to appropriate FraudDetectionError.
    
    Args:
        func: Function to decorate
        
    Returns:
        Decorated function
    """
    def wrapper(*args, **kwargs):
        try:
            return func(*args, **kwargs)
        except FraudDetectionError:
            # Re-raise custom exceptions as-is
            raise
        except ValueError as e:
            raise ValidationError(str(e))
        except FileNotFoundError as e:
            raise ModelNotFoundError(str(e))
        except Exception as e:
            # Convert unexpected exceptions to generic FraudDetectionError
            raise FraudDetectionError(f"Unexpected error in {func.__name__}: {str(e)}")
    
    return wrapper
