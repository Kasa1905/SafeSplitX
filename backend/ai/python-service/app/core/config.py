import os
from typing import List, Optional
from pydantic import BaseSettings

class Settings(BaseSettings):
    # Application
    VERSION: str = "1.0.0"
    DEBUG: bool = False
    ENVIRONMENT: str = "production"
    
    # Server
    HOST: str = "0.0.0.0"
    PORT: int = 8000
    WORKERS: int = 1
    
    # CORS
    ALLOWED_ORIGINS: List[str] = ["*"]
    
    # ML Models
    MODEL_PATH: str = "/app/models"
    MAX_BATCH_SIZE: int = 100
    MODEL_CACHE_SIZE: int = 5
    MODEL_RELOAD_INTERVAL: int = 3600  # seconds
    
    # Feature Engineering
    FEATURE_CACHE_SIZE: int = 1000
    FEATURE_CACHE_TTL: int = 300  # seconds
    
    # Performance
    MAX_WORKERS: int = 4
    ASYNC_TIMEOUT: int = 30
    MEMORY_LIMIT_MB: int = 2048
    
    # Logging
    LOG_LEVEL: str = "INFO"
    LOG_FORMAT: str = "json"
    LOG_FILE: Optional[str] = None
    
    # Database (optional - for storing feedback/metrics)
    DATABASE_URL: Optional[str] = None
    REDIS_URL: Optional[str] = None
    
    # Security
    API_KEY: Optional[str] = None
    JWT_SECRET: Optional[str] = None
    
    # Fraud Detection Thresholds
    HIGH_RISK_THRESHOLD: float = 0.7
    MEDIUM_RISK_THRESHOLD: float = 0.3
    
    # Model Configuration
    ENABLE_ENSEMBLE: bool = True
    ENABLE_ANOMALY_DETECTION: bool = True
    ENABLE_RULE_BASED: bool = True
    
    # Metrics
    ENABLE_METRICS: bool = True
    METRICS_PORT: int = 9090
    
    # Health Check
    HEALTH_CHECK_INTERVAL: int = 30
    
    class Config:
        env_file = ".env"
        case_sensitive = True

# Create settings instance
settings = Settings()