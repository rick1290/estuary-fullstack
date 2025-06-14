"""
Shared activities used across multiple workflow domains.
These are common operations like sending emails, SMS, etc.
"""
from temporalio import activity
from typing import Dict, Any, Optional
import logging
from datetime import datetime

logger = logging.getLogger(__name__)


@activity.defn
async def send_email(
    to_email: str,
    template_id: str,
    context: Dict[str, Any],
    from_email: Optional[str] = None
) -> bool:
    """
    Send an email using the configured email service.
    
    Args:
        to_email: Recipient email address
        template_id: Email template identifier
        context: Template context variables
        from_email: Optional sender email
        
    Returns:
        bool: True if email was sent successfully
    """
    try:
        # TODO: Integrate with actual email service (SendGrid, SES, etc.)
        logger.info(f"Sending email to {to_email} with template {template_id}")
        
        # For now, just log
        logger.info(f"Email context: {context}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to send email: {e}")
        raise


@activity.defn
async def send_sms(
    to_phone: str,
    message: str,
    from_phone: Optional[str] = None
) -> bool:
    """
    Send an SMS message using Twilio or similar service.
    
    Args:
        to_phone: Recipient phone number
        message: SMS message content
        from_phone: Optional sender phone number
        
    Returns:
        bool: True if SMS was sent successfully
    """
    try:
        # TODO: Integrate with Twilio/SMS service
        logger.info(f"Sending SMS to {to_phone}: {message}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to send SMS: {e}")
        raise


@activity.defn
async def send_push_notification(
    user_id: str,
    title: str,
    body: str,
    data: Optional[Dict[str, Any]] = None
) -> bool:
    """
    Send a push notification to user's mobile device.
    
    Args:
        user_id: User ID to send notification to
        title: Notification title
        body: Notification body
        data: Optional data payload
        
    Returns:
        bool: True if notification was sent
    """
    try:
        # TODO: Integrate with push notification service (FCM, APNS)
        logger.info(f"Sending push to user {user_id}: {title}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to send push notification: {e}")
        raise


@activity.defn
async def send_slack_notification(
    channel: str,
    message: str,
    blocks: Optional[list] = None
) -> bool:
    """
    Send a Slack notification to a channel.
    
    Args:
        channel: Slack channel ID or name
        message: Message text
        blocks: Optional Slack blocks for rich formatting
        
    Returns:
        bool: True if message was sent
    """
    try:
        # TODO: Integrate with Slack API
        logger.info(f"Sending Slack message to {channel}: {message}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to send Slack notification: {e}")
        raise


@activity.defn
async def log_event(
    event_type: str,
    entity_type: str,
    entity_id: str,
    data: Dict[str, Any],
    user_id: Optional[str] = None
) -> bool:
    """
    Log an event for analytics and auditing.
    
    Args:
        event_type: Type of event (e.g., 'booking.created')
        entity_type: Type of entity (e.g., 'booking')
        entity_id: ID of the entity
        data: Event data
        user_id: Optional user who triggered the event
        
    Returns:
        bool: True if event was logged
    """
    try:
        # TODO: Log to analytics service (Segment, Mixpanel, etc.)
        logger.info(f"Logging event: {event_type} for {entity_type}:{entity_id}")
        
        return True
    except Exception as e:
        logger.error(f"Failed to log event: {e}")
        raise


@activity.defn
async def wait_for_human_approval(
    approval_type: str,
    entity_id: str,
    approver_id: str,
    timeout_seconds: int = 86400  # 24 hours default
) -> Dict[str, Any]:
    """
    Wait for human approval (placeholder - actual implementation would poll DB).
    
    Args:
        approval_type: Type of approval needed
        entity_id: Entity requiring approval
        approver_id: User who can approve
        timeout_seconds: How long to wait
        
    Returns:
        Dict with approval status and metadata
    """
    # TODO: Implement actual approval mechanism
    # This would typically poll a database or wait for a signal
    
    return {
        'approved': True,
        'approver_id': approver_id,
        'approved_at': datetime.utcnow().isoformat(),
        'notes': 'Auto-approved for demo'
    }


# Export all activities
ACTIVITIES = [
    send_email,
    send_sms,
    send_push_notification,
    send_slack_notification,
    log_event,
    wait_for_human_approval,
]