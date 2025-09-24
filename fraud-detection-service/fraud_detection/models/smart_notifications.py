"""
Smart Notification System for Fraud Detection
Provides intelligent, contextual notifications and alerts.
"""

import logging
import json
import os
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import requests
import smtplib
from email.mime.text import MimeText
from email.mime.multipart import MimeMultipart

logger = logging.getLogger(__name__)


class AlertSeverity(Enum):
    """Alert severity levels."""
    CRITICAL = "CRITICAL"
    HIGH = "HIGH"
    MEDIUM = "MEDIUM"
    LOW = "LOW"
    INFO = "INFO"


class NotificationChannel(Enum):
    """Available notification channels."""
    EMAIL = "email"
    WEBHOOK = "webhook"
    SMS = "sms"
    IN_APP = "in_app"
    SLACK = "slack"
    DISCORD = "discord"


@dataclass
class NotificationRule:
    """Rule for when to send notifications."""
    name: str
    conditions: Dict[str, Any]
    channels: List[NotificationChannel]
    severity_threshold: AlertSeverity = AlertSeverity.MEDIUM
    cooldown_minutes: int = 30
    enabled: bool = True
    last_triggered: Optional[str] = None


@dataclass
class Alert:
    """Fraud alert data structure."""
    id: str
    timestamp: str
    severity: AlertSeverity
    title: str
    message: str
    details: Dict[str, Any]
    user_id: str
    group_id: Optional[str] = None
    expense_amount: float = 0.0
    risk_score: float = 0.0
    recommendations: List[str] = field(default_factory=list)
    acknowledged: bool = False
    resolved: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'timestamp': self.timestamp,
            'severity': self.severity.value,
            'title': self.title,
            'message': self.message,
            'details': self.details,
            'user_id': self.user_id,
            'group_id': self.group_id,
            'expense_amount': self.expense_amount,
            'risk_score': self.risk_score,
            'recommendations': self.recommendations,
            'acknowledged': self.acknowledged,
            'resolved': self.resolved
        }


class SmartNotificationSystem:
    """
    Intelligent notification system for fraud detection alerts.
    Provides contextual, actionable notifications across multiple channels.
    """
    
    def __init__(self, config_path: str = "./notification_config.json"):
        """
        Initialize smart notification system.
        
        Args:
            config_path: Path to notification configuration file
        """
        self.config_path = config_path
        self.config = self._load_config()
        self.active_alerts: Dict[str, Alert] = {}
        self.notification_history: List[Dict[str, Any]] = []
        self.rules: List[NotificationRule] = self._load_rules()
        
        # Default notification rules
        self._setup_default_rules()
        
        logger.info(f"SmartNotificationSystem initialized with {len(self.rules)} rules")
    
    def _load_config(self) -> Dict[str, Any]:
        """Load notification configuration."""
        default_config = {
            "channels": {
                "email": {
                    "enabled": False,
                    "smtp_server": "smtp.gmail.com",
                    "smtp_port": 587,
                    "username": "",
                    "password": "",
                    "recipients": []
                },
                "webhook": {
                    "enabled": True,
                    "urls": []
                },
                "slack": {
                    "enabled": False,
                    "webhook_url": "",
                    "channel": "#fraud-alerts"
                }
            },
            "general": {
                "max_alerts_per_hour": 50,
                "aggregate_similar_alerts": True,
                "include_recommendations": True
            }
        }
        
        if os.path.exists(self.config_path):
            try:
                with open(self.config_path, 'r') as f:
                    loaded_config = json.load(f)
                    # Merge with defaults
                    for key, value in loaded_config.items():
                        if key in default_config and isinstance(value, dict):
                            default_config[key].update(value)
                        else:
                            default_config[key] = value
                    return default_config
            except Exception as e:
                logger.warning(f"Could not load notification config: {e}")
        
        return default_config
    
    def _load_rules(self) -> List[NotificationRule]:
        """Load notification rules."""
        return []  # Will be populated by _setup_default_rules
    
    def _setup_default_rules(self):
        """Setup default notification rules."""
        self.rules = [
            NotificationRule(
                name="Critical Fraud Alert",
                conditions={"risk_score": {"min": 0.8}},
                channels=[NotificationChannel.WEBHOOK, NotificationChannel.EMAIL],
                severity_threshold=AlertSeverity.CRITICAL,
                cooldown_minutes=15
            ),
            NotificationRule(
                name="High Risk Transaction",
                conditions={"risk_score": {"min": 0.6}},
                channels=[NotificationChannel.WEBHOOK],
                severity_threshold=AlertSeverity.HIGH,
                cooldown_minutes=30
            ),
            NotificationRule(
                name="Velocity Alert",
                conditions={"alert_type": "velocity_risk"},
                channels=[NotificationChannel.WEBHOOK, NotificationChannel.IN_APP],
                severity_threshold=AlertSeverity.MEDIUM,
                cooldown_minutes=45
            ),
            NotificationRule(
                name="Group Coordination Alert",
                conditions={"alert_type": "coordination_risk"},
                channels=[NotificationChannel.WEBHOOK, NotificationChannel.EMAIL],
                severity_threshold=AlertSeverity.HIGH,
                cooldown_minutes=20
            ),
            NotificationRule(
                name="Large Amount Alert",
                conditions={"expense_amount": {"min": 5000}},
                channels=[NotificationChannel.WEBHOOK],
                severity_threshold=AlertSeverity.MEDIUM,
                cooldown_minutes=60
            )
        ]
    
    def process_risk_analysis(self, risk_analysis: Dict[str, Any], expense_data: Dict[str, Any]) -> List[Alert]:
        """
        Process risk analysis results and generate appropriate alerts.
        
        Args:
            risk_analysis: Risk analysis results
            expense_data: Original expense data
            
        Returns:
            List of generated alerts
        """
        alerts = []
        current_time = datetime.now()
        
        risk_scores = risk_analysis.get('risk_scores', {})
        overall_risk = risk_scores.get('overall_realtime_risk', 0.0)
        
        # Generate alerts based on risk types
        for risk_type, risk_score in risk_scores.items():
            if risk_score > 0.6:  # Significant risk threshold
                alert = self._create_alert(
                    risk_type=risk_type,
                    risk_score=risk_score,
                    expense_data=expense_data,
                    risk_analysis=risk_analysis,
                    current_time=current_time
                )
                alerts.append(alert)
        
        # Process each alert through notification rules
        for alert in alerts:
            self._process_alert(alert)
        
        return alerts
    
    def _create_alert(self, risk_type: str, risk_score: float, expense_data: Dict[str, Any], 
                     risk_analysis: Dict[str, Any], current_time: datetime) -> Alert:
        """Create a fraud alert from risk analysis."""
        alert_id = f"{risk_type}_{current_time.strftime('%Y%m%d_%H%M%S')}_{expense_data.get('user_id', 'unknown')}"
        
        # Determine severity
        if risk_score >= 0.8:
            severity = AlertSeverity.CRITICAL
        elif risk_score >= 0.6:
            severity = AlertSeverity.HIGH
        elif risk_score >= 0.4:
            severity = AlertSeverity.MEDIUM
        else:
            severity = AlertSeverity.LOW
        
        # Generate contextual title and message
        title, message = self._generate_alert_content(risk_type, risk_score, expense_data)
        
        alert = Alert(
            id=alert_id,
            timestamp=current_time.isoformat(),
            severity=severity,
            title=title,
            message=message,
            details={
                'risk_type': risk_type,
                'risk_analysis': risk_analysis,
                'expense_data': expense_data
            },
            user_id=expense_data.get('user_id', 'unknown'),
            group_id=expense_data.get('group_id'),
            expense_amount=expense_data.get('amount', 0.0),
            risk_score=risk_score,
            recommendations=risk_analysis.get('recommendations', [])
        )
        
        self.active_alerts[alert_id] = alert
        return alert
    
    def _generate_alert_content(self, risk_type: str, risk_score: float, expense_data: Dict[str, Any]) -> tuple:
        """Generate contextual alert title and message."""
        user_id = expense_data.get('user_id', 'Unknown')
        amount = expense_data.get('amount', 0)
        category = expense_data.get('category', 'Unknown')
        
        content_templates = {
            'velocity_risk': {
                'title': f"🚨 High Transaction Velocity - User {user_id}",
                'message': f"User {user_id} has unusual transaction velocity. Risk Score: {risk_score:.2f}\n"
                          f"Latest transaction: ${amount:.2f} in {category} category."
            },
            'pattern_risk': {
                'title': f"⚠️ Suspicious Pattern Detected - ${amount:.2f}",
                'message': f"Suspicious transaction pattern identified for user {user_id}.\n"
                          f"Amount: ${amount:.2f}, Category: {category}, Risk Score: {risk_score:.2f}"
            },
            'coordination_risk': {
                'title': f"🔍 Group Coordination Alert - Group {expense_data.get('group_id', 'Unknown')}",
                'message': f"Potential coordinated activity detected in group.\n"
                          f"User {user_id} transaction: ${amount:.2f}, Risk Score: {risk_score:.2f}"
            },
            'anomaly_risk': {
                'title': f"📊 Transaction Anomaly - User {user_id}",
                'message': f"Transaction deviates from user's normal patterns.\n"
                          f"Amount: ${amount:.2f}, Category: {category}, Risk Score: {risk_score:.2f}"
            },
            'temporal_risk': {
                'title': f"⏰ Suspicious Timing - ${amount:.2f}",
                'message': f"Transaction timing is unusual for user {user_id}.\n"
                          f"Amount: ${amount:.2f}, Risk Score: {risk_score:.2f}"
            },
            'amount_suspicion': {
                'title': f"💰 Suspicious Amount - ${amount:.2f}",
                'message': f"Transaction amount has suspicious characteristics.\n"
                          f"User: {user_id}, Amount: ${amount:.2f}, Risk Score: {risk_score:.2f}"
            }
        }
        
        template = content_templates.get(risk_type, {
            'title': f"⚠️ Fraud Risk Detected - User {user_id}",
            'message': f"Fraud risk detected for user {user_id}.\n"
                      f"Risk Type: {risk_type}, Score: {risk_score:.2f}, Amount: ${amount:.2f}"
        })
        
        return template['title'], template['message']
    
    def _process_alert(self, alert: Alert):
        """Process alert through notification rules."""
        for rule in self.rules:
            if not rule.enabled:
                continue
            
            if self._matches_rule(alert, rule):
                if self._should_notify(rule):
                    self._send_notifications(alert, rule)
                    rule.last_triggered = datetime.now().isoformat()
    
    def _matches_rule(self, alert: Alert, rule: NotificationRule) -> bool:
        """Check if alert matches notification rule conditions."""
        # Check severity threshold
        severity_levels = {
            AlertSeverity.INFO: 0,
            AlertSeverity.LOW: 1,
            AlertSeverity.MEDIUM: 2,
            AlertSeverity.HIGH: 3,
            AlertSeverity.CRITICAL: 4
        }
        
        if severity_levels.get(alert.severity, 0) < severity_levels.get(rule.severity_threshold, 2):
            return False
        
        # Check specific conditions
        for condition, criteria in rule.conditions.items():
            if condition == "risk_score":
                if isinstance(criteria, dict):
                    min_score = criteria.get('min', 0)
                    max_score = criteria.get('max', 1)
                    if not (min_score <= alert.risk_score <= max_score):
                        return False
            
            elif condition == "expense_amount":
                if isinstance(criteria, dict):
                    min_amount = criteria.get('min', 0)
                    max_amount = criteria.get('max', float('inf'))
                    if not (min_amount <= alert.expense_amount <= max_amount):
                        return False
            
            elif condition == "alert_type":
                alert_type = alert.details.get('risk_type', '')
                if criteria != alert_type:
                    return False
        
        return True
    
    def _should_notify(self, rule: NotificationRule) -> bool:
        """Check if we should notify based on cooldown period."""
        if not rule.last_triggered:
            return True
        
        last_triggered = datetime.fromisoformat(rule.last_triggered)
        cooldown = timedelta(minutes=rule.cooldown_minutes)
        
        return datetime.now() - last_triggered > cooldown
    
    def _send_notifications(self, alert: Alert, rule: NotificationRule):
        """Send notifications through specified channels."""
        for channel in rule.channels:
            try:
                if channel == NotificationChannel.WEBHOOK:
                    self._send_webhook(alert)
                elif channel == NotificationChannel.EMAIL:
                    self._send_email(alert)
                elif channel == NotificationChannel.SLACK:
                    self._send_slack(alert)
                elif channel == NotificationChannel.IN_APP:
                    self._store_in_app_notification(alert)
                
                # Log successful notification
                self.notification_history.append({
                    'alert_id': alert.id,
                    'channel': channel.value,
                    'timestamp': datetime.now().isoformat(),
                    'rule': rule.name,
                    'status': 'sent'
                })
                
            except Exception as e:
                logger.error(f"Failed to send notification via {channel.value}: {e}")
                self.notification_history.append({
                    'alert_id': alert.id,
                    'channel': channel.value,
                    'timestamp': datetime.now().isoformat(),
                    'rule': rule.name,
                    'status': 'failed',
                    'error': str(e)
                })
    
    def _send_webhook(self, alert: Alert):
        """Send webhook notification."""
        webhook_config = self.config.get('channels', {}).get('webhook', {})
        if not webhook_config.get('enabled', False):
            return
        
        urls = webhook_config.get('urls', [])
        payload = {
            'alert': alert.to_dict(),
            'timestamp': datetime.now().isoformat(),
            'source': 'SafeSplitX Fraud Detection'
        }
        
        for url in urls:
            try:
                response = requests.post(url, json=payload, timeout=10)
                response.raise_for_status()
                logger.info(f"Webhook notification sent successfully to {url}")
            except Exception as e:
                logger.error(f"Failed to send webhook to {url}: {e}")
                raise
    
    def _send_email(self, alert: Alert):
        """Send email notification."""
        email_config = self.config.get('channels', {}).get('email', {})
        if not email_config.get('enabled', False):
            return
        
        # Create email content
        subject = f"SafeSplitX Fraud Alert: {alert.title}"
        body = self._create_email_body(alert)
        
        # Send email
        msg = MimeMultipart()
        msg['From'] = email_config.get('username', '')
        msg['Subject'] = subject
        msg.attach(MimeText(body, 'html'))
        
        recipients = email_config.get('recipients', [])
        if not recipients:
            return
        
        msg['To'] = ', '.join(recipients)
        
        try:
            server = smtplib.SMTP(email_config.get('smtp_server'), email_config.get('smtp_port'))
            server.starttls()
            server.login(email_config.get('username'), email_config.get('password'))
            server.send_message(msg, to_addrs=recipients)
            server.quit()
            logger.info(f"Email notification sent to {len(recipients)} recipients")
        except Exception as e:
            logger.error(f"Failed to send email notification: {e}")
            raise
    
    def _create_email_body(self, alert: Alert) -> str:
        """Create HTML email body."""
        severity_colors = {
            AlertSeverity.CRITICAL: '#dc3545',
            AlertSeverity.HIGH: '#fd7e14',
            AlertSeverity.MEDIUM: '#ffc107',
            AlertSeverity.LOW: '#20c997',
            AlertSeverity.INFO: '#6c757d'
        }
        
        color = severity_colors.get(alert.severity, '#6c757d')
        
        html = f"""
        <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
                <div style="background-color: {color}; color: white; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h2 style="margin: 0;">{alert.title}</h2>
                    <p style="margin: 5px 0 0 0;">Severity: {alert.severity.value} | Risk Score: {alert.risk_score:.2f}</p>
                </div>
                
                <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin-bottom: 20px;">
                    <h3>Alert Details</h3>
                    <p><strong>Message:</strong> {alert.message}</p>
                    <p><strong>User ID:</strong> {alert.user_id}</p>
                    <p><strong>Amount:</strong> ${alert.expense_amount:.2f}</p>
                    <p><strong>Timestamp:</strong> {alert.timestamp}</p>
                    {f"<p><strong>Group ID:</strong> {alert.group_id}</p>" if alert.group_id else ""}
                </div>
                
                {self._create_recommendations_html(alert.recommendations) if alert.recommendations else ""}
                
                <div style="border-top: 1px solid #dee2e6; padding-top: 20px; font-size: 12px; color: #6c757d;">
                    <p>This alert was generated by SafeSplitX Fraud Detection System.</p>
                    <p>Alert ID: {alert.id}</p>
                </div>
            </div>
        </body>
        </html>
        """
        return html
    
    def _create_recommendations_html(self, recommendations: List[str]) -> str:
        """Create HTML for recommendations section."""
        if not recommendations:
            return ""
        
        rec_html = "<div style='background-color: #e7f3ff; padding: 15px; border-radius: 5px; margin-bottom: 20px;'>"
        rec_html += "<h3>Recommended Actions</h3><ul>"
        for rec in recommendations:
            rec_html += f"<li>{rec}</li>"
        rec_html += "</ul></div>"
        return rec_html
    
    def _send_slack(self, alert: Alert):
        """Send Slack notification."""
        slack_config = self.config.get('channels', {}).get('slack', {})
        if not slack_config.get('enabled', False):
            return
        
        webhook_url = slack_config.get('webhook_url', '')
        if not webhook_url:
            return
        
        # Create Slack message
        color_map = {
            AlertSeverity.CRITICAL: 'danger',
            AlertSeverity.HIGH: 'warning',
            AlertSeverity.MEDIUM: 'good',
            AlertSeverity.LOW: '#36a64f',
            AlertSeverity.INFO: '#439fe0'
        }
        
        payload = {
            "text": f"SafeSplitX Fraud Alert: {alert.title}",
            "attachments": [
                {
                    "color": color_map.get(alert.severity, 'warning'),
                    "fields": [
                        {"title": "Severity", "value": alert.severity.value, "short": True},
                        {"title": "Risk Score", "value": f"{alert.risk_score:.2f}", "short": True},
                        {"title": "User ID", "value": alert.user_id, "short": True},
                        {"title": "Amount", "value": f"${alert.expense_amount:.2f}", "short": True},
                        {"title": "Message", "value": alert.message, "short": False}
                    ],
                    "ts": int(datetime.fromisoformat(alert.timestamp).timestamp())
                }
            ]
        }
        
        try:
            response = requests.post(webhook_url, json=payload, timeout=10)
            response.raise_for_status()
            logger.info("Slack notification sent successfully")
        except Exception as e:
            logger.error(f"Failed to send Slack notification: {e}")
            raise
    
    def _store_in_app_notification(self, alert: Alert):
        """Store in-app notification."""
        # In a real implementation, this would store in a database
        # For now, just log it
        logger.info(f"In-app notification stored: {alert.id}")
    
    def acknowledge_alert(self, alert_id: str, user: str = "system") -> bool:
        """Acknowledge an alert."""
        if alert_id in self.active_alerts:
            self.active_alerts[alert_id].acknowledged = True
            logger.info(f"Alert {alert_id} acknowledged by {user}")
            return True
        return False
    
    def resolve_alert(self, alert_id: str, user: str = "system") -> bool:
        """Resolve an alert."""
        if alert_id in self.active_alerts:
            alert = self.active_alerts[alert_id]
            alert.resolved = True
            alert.acknowledged = True
            logger.info(f"Alert {alert_id} resolved by {user}")
            return True
        return False
    
    def get_active_alerts(self, severity_filter: Optional[AlertSeverity] = None) -> List[Dict[str, Any]]:
        """Get list of active alerts."""
        alerts = []
        for alert in self.active_alerts.values():
            if not alert.resolved:
                if severity_filter is None or alert.severity == severity_filter:
                    alerts.append(alert.to_dict())
        return sorted(alerts, key=lambda x: x['timestamp'], reverse=True)
    
    def get_notification_stats(self) -> Dict[str, Any]:
        """Get notification system statistics."""
        current_time = datetime.now()
        last_24h = current_time - timedelta(hours=24)
        
        recent_notifications = [
            n for n in self.notification_history 
            if datetime.fromisoformat(n['timestamp']) > last_24h
        ]
        
        stats = {
            'active_alerts': len([a for a in self.active_alerts.values() if not a.resolved]),
            'total_alerts_24h': len(recent_notifications),
            'successful_notifications_24h': len([n for n in recent_notifications if n['status'] == 'sent']),
            'failed_notifications_24h': len([n for n in recent_notifications if n['status'] == 'failed']),
            'notification_channels': len([ch for ch in self.config.get('channels', {}).values() if ch.get('enabled', False)]),
            'active_rules': len([r for r in self.rules if r.enabled])
        }
        
        return stats
