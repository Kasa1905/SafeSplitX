"""
Notification system for fraud alerts.
"""

import json
import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime
import os

import aiohttp
from tenacity import retry, stop_after_attempt, wait_exponential, retry_if_exception_type

from ..schemas import FraudAlert, ExpenseIn
from ..utils.exceptions import NotificationError, ExternalServiceError

logger = logging.getLogger(__name__)


class Notifier(ABC):
    """
    Abstract base class for notification systems.
    """
    
    @abstractmethod
    async def send_notification(self, alert: FraudAlert) -> bool:
        """
        Send fraud alert notification.
        
        Args:
            alert: Fraud alert to send
            
        Returns:
            True if successful, False otherwise
        """
        pass
    
    @abstractmethod
    def get_notification_type(self) -> str:
        """Get the type of notification system."""
        pass


class WebhookNotifier(Notifier):
    """
    Webhook-based notification system.
    """
    
    def __init__(self, webhook_urls: List[str], timeout: int = 30):
        """
        Initialize webhook notifier.
        
        Args:
            webhook_urls: List of webhook URLs to send notifications to
            timeout: Request timeout in seconds
        """
        self.webhook_urls = webhook_urls
        self.timeout = timeout
        
        logger.info(f"WebhookNotifier initialized with {len(webhook_urls)} endpoints")
    
    @retry(
        stop=stop_after_attempt(3),
        wait=wait_exponential(multiplier=1, min=4, max=10),
        retry=retry_if_exception_type((aiohttp.ClientError, asyncio.TimeoutError))
    )
    async def _send_webhook(self, url: str, payload: Dict[str, Any]) -> bool:
        """
        Send webhook with retry logic.
        
        Args:
            url: Webhook URL
            payload: JSON payload to send
            
        Returns:
            True if successful, False otherwise
        """
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=self.timeout)) as session:
                headers = {
                    'Content-Type': 'application/json',
                    'User-Agent': 'FraudDetection/1.0'
                }
                
                async with session.post(url, json=payload, headers=headers) as response:
                    if response.status == 200:
                        logger.info(f"Webhook sent successfully to {url}")
                        return True
                    else:
                        logger.error(f"Webhook failed with status {response.status}: {url}")
                        return False
                        
        except asyncio.TimeoutError:
            logger.error(f"Webhook timeout for {url}")
            return False
        except aiohttp.ClientError as e:
            logger.error(f"Webhook client error for {url}: {str(e)}")
            return False
        except Exception as e:
            logger.error(f"Unexpected webhook error for {url}: {str(e)}")
            return False
    
    async def send_notification(self, alert: FraudAlert) -> bool:
        """
        Send notification to all configured webhooks.
        
        Args:
            alert: Fraud alert to send
            
        Returns:
            True if at least one webhook succeeded
        """
        if not self.webhook_urls:
            logger.warning("No webhook URLs configured")
            return False
        
        try:
            # Convert alert to dict for JSON serialization
            payload = alert.dict()
            
            # Send to all webhooks concurrently
            tasks = [self._send_webhook(url, payload) for url in self.webhook_urls]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            success_count = sum(1 for result in results if result is True)
            total_count = len(self.webhook_urls)
            
            logger.info(f"Webhook notifications sent: {success_count}/{total_count} successful")
            
            return success_count > 0
            
        except Exception as e:
            logger.error(f"Error sending webhook notifications: {str(e)}")
            return False
    
    def get_notification_type(self) -> str:
        """Get notification type."""
        return "webhook"


class KafkaNotifier(Notifier):
    """
    Kafka-based notification system (stub for Team 4 integration).
    """
    
    def __init__(self, topic: str, bootstrap_servers: List[str] = None):
        """
        Initialize Kafka notifier.
        
        Args:
            topic: Kafka topic to publish to
            bootstrap_servers: List of Kafka bootstrap servers
        """
        self.topic = topic
        self.bootstrap_servers = bootstrap_servers or ['localhost:9092']
        
        # TODO: Initialize Kafka producer when Team 4 provides integration details
        logger.info(f"KafkaNotifier initialized for topic: {topic}")
        logger.warning("KafkaNotifier is a stub - requires Team 4 Kafka integration")
    
    async def send_notification(self, alert: FraudAlert) -> bool:
        """
        Send notification via Kafka.
        
        Args:
            alert: Fraud alert to send
            
        Returns:
            True if successful (currently always returns False as it's a stub)
        """
        # TODO: Implement Kafka publishing
        logger.info(f"Would send Kafka notification to topic {self.topic}")
        logger.info(f"Alert payload: {alert.json()}")
        
        # Placeholder - return False until actual implementation
        return False
    
    def get_notification_type(self) -> str:
        """Get notification type."""
        return "kafka"


class EmailNotifier(Notifier):
    """
    Email-based notification system (future implementation).
    """
    
    def __init__(self, recipients: List[str], smtp_config: Dict[str, Any] = None):
        """
        Initialize email notifier.
        
        Args:
            recipients: List of email addresses
            smtp_config: SMTP configuration
        """
        self.recipients = recipients
        self.smtp_config = smtp_config or {}
        
        logger.info(f"EmailNotifier initialized for {len(recipients)} recipients")
        logger.warning("EmailNotifier is not yet implemented")
    
    async def send_notification(self, alert: FraudAlert) -> bool:
        """
        Send notification via email.
        
        Args:
            alert: Fraud alert to send
            
        Returns:
            True if successful (currently always returns False - not implemented)
        """
        # TODO: Implement email sending
        logger.info(f"Would send email notification to {len(self.recipients)} recipients")
        return False
    
    def get_notification_type(self) -> str:
        """Get notification type."""
        return "email"


class NotificationManager:
    """
    Manages multiple notification systems.
    """
    
    def __init__(self):
        """Initialize notification manager."""
        self.notifiers: List[Notifier] = []
        
        # Initialize notifiers from environment configuration
        self._setup_from_environment()
        
    def _setup_from_environment(self) -> None:
        """Setup notifiers based on environment variables."""
        # Webhook notifier
        webhook_urls = os.getenv('WEBHOOK_URLS', '').split(',')
        webhook_urls = [url.strip() for url in webhook_urls if url.strip()]
        
        if webhook_urls:
            self.add_notifier(WebhookNotifier(webhook_urls))
        
        # Kafka notifier (if configured)
        kafka_topic = os.getenv('KAFKA_TOPIC')
        if kafka_topic:
            kafka_servers = os.getenv('KAFKA_BOOTSTRAP_SERVERS', 'localhost:9092').split(',')
            self.add_notifier(KafkaNotifier(kafka_topic, kafka_servers))
        
        # Email notifier (if configured)
        email_recipients = os.getenv('EMAIL_RECIPIENTS', '').split(',')
        email_recipients = [email.strip() for email in email_recipients if email.strip()]
        if email_recipients:
            self.add_notifier(EmailNotifier(email_recipients))
    
    def add_notifier(self, notifier: Notifier) -> None:
        """
        Add a notifier to the manager.
        
        Args:
            notifier: Notifier instance to add
        """
        self.notifiers.append(notifier)
        logger.info(f"Added {notifier.get_notification_type()} notifier")
    
    def remove_notifier(self, notifier_type: str) -> bool:
        """
        Remove notifiers of a specific type.
        
        Args:
            notifier_type: Type of notifier to remove
            
        Returns:
            True if any notifiers were removed
        """
        initial_count = len(self.notifiers)
        self.notifiers = [n for n in self.notifiers if n.get_notification_type() != notifier_type]
        removed_count = initial_count - len(self.notifiers)
        
        if removed_count > 0:
            logger.info(f"Removed {removed_count} {notifier_type} notifiers")
        
        return removed_count > 0
    
    async def send_alert(self, expense: ExpenseIn, prediction_result: Dict[str, Any]) -> Dict[str, bool]:
        """
        Send fraud alert through all configured notifiers.
        
        Args:
            expense: Original expense data
            prediction_result: Prediction results from ensemble model
            
        Returns:
            Dictionary mapping notifier types to success status
        """
        if not self.notifiers:
            logger.warning("No notifiers configured")
            return {}
        
        try:
            # Create fraud alert
            alert = FraudAlert(
                event="fraud_alert",
                expense=expense,
                anomaly={
                    'score': prediction_result['anomaly_score'],
                    'rules': [violation.dict() for violation in prediction_result['rule_violations']],
                    'explanation': [exp.dict() for exp in prediction_result['explanation']]
                },
                model_version=prediction_result['model_version'],
                timestamp=datetime.utcnow().isoformat()
            )
            
            # Send through all notifiers
            results = {}
            for notifier in self.notifiers:
                try:
                    success = await notifier.send_notification(alert)
                    results[notifier.get_notification_type()] = success
                except Exception as e:
                    logger.error(f"Error with {notifier.get_notification_type()} notifier: {str(e)}")
                    results[notifier.get_notification_type()] = False
            
            success_count = sum(1 for success in results.values() if success)
            logger.info(f"Alert sent: {success_count}/{len(self.notifiers)} notifiers succeeded")
            
            return results
            
        except Exception as e:
            logger.error(f"Error sending fraud alert: {str(e)}")
            return {notifier.get_notification_type(): False for notifier in self.notifiers}
    
    def get_status(self) -> Dict[str, Any]:
        """
        Get status of all configured notifiers.
        
        Returns:
            Status information for notification system
        """
        return {
            'total_notifiers': len(self.notifiers),
            'notifier_types': [n.get_notification_type() for n in self.notifiers],
            'status': 'active' if self.notifiers else 'inactive'
        }
