"""
Base notification service with common functionality.
"""
import logging
from typing import Dict, Optional, Any, List
from datetime import datetime, timedelta
from django.conf import settings
from django.utils import timezone
from celery import shared_task

from notifications.models import Notification, NotificationSetting
from integrations.courier.client import courier_client

logger = logging.getLogger(__name__)


class BaseNotificationService:
    """
    Base class for notification services.
    Handles common functionality like user preferences, scheduling, and delivery.
    """
    
    def __init__(self):
        self.courier_client = courier_client
    
    def should_send_notification(
        self, 
        user, 
        notification_type: str, 
        delivery_channel: str
    ) -> bool:
        """
        Check if a notification should be sent based on user preferences.
        """
        try:
            setting = NotificationSetting.objects.get(
                user=user,
                notification_type=notification_type
            )
            
            channel_map = {
                'email': setting.email_enabled,
                'sms': setting.sms_enabled,
                'in_app': setting.in_app_enabled,
                'push': setting.push_enabled
            }
            
            return channel_map.get(delivery_channel, True)
        except NotificationSetting.DoesNotExist:
            # Default to sending if no preference is set
            return True
    
    def create_notification_record(
        self,
        user,
        title: str,
        message: str,
        notification_type: str,
        delivery_channel: str,
        scheduled_for: Optional[datetime] = None,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None,
        metadata: Optional[Dict] = None
    ) -> Notification:
        """
        Create a notification record in the database.
        """
        return Notification.objects.create(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            delivery_channel=delivery_channel,
            scheduled_for=scheduled_for,
            related_object_type=related_object_type or '',
            related_object_id=related_object_id or '',
            metadata=metadata or {},
            status='pending'
        )
    
    def send_email_notification(
        self,
        user,
        template_id: str,
        data: Dict,
        notification: Optional[Notification] = None,
        idempotency_key: Optional[str] = None
    ) -> Dict:
        """
        Send an email notification using Courier.
        """
        if not user.email:
            logger.warning(f"Cannot send email: No email for user {user.id}")
            return {"error": "No email address"}
        
        try:
            # Add common data
            data.update({
                'user_name': user.get_full_name() or user.email,
                'user_email': user.email,
                'app_name': getattr(settings, 'APP_NAME', 'Estuary'),
                'frontend_url': getattr(settings, 'FRONTEND_URL', 'https://estuary.app'),
                'support_email': getattr(settings, 'SUPPORT_EMAIL', 'support@estuary.app')
            })
            
            # Send via Courier
            response = self.courier_client.send_email(
                email=user.email,
                subject=None,  # Using template
                body=None,     # Using template
                data=data,
                template_id=template_id,
                idempotency_key=idempotency_key
            )
            
            # Update notification status if provided
            if notification and 'request_id' in response:
                notification.status = 'sent'
                notification.sent_at = timezone.now()
                notification.metadata['courier_request_id'] = response['request_id']
                notification.save()
            
            return response
            
        except Exception as e:
            logger.error(f"Error sending email to {user.email}: {str(e)}")
            if notification:
                notification.status = 'failed'
                notification.metadata['error'] = str(e)
                notification.save()
            return {"error": str(e)}
    
    def schedule_notification(
        self,
        user,
        notification_type: str,
        delivery_channel: str,
        scheduled_for: datetime,
        template_id: str,
        data: Dict,
        title: str,
        message: str,
        related_object_type: Optional[str] = None,
        related_object_id: Optional[str] = None
    ) -> Notification:
        """
        Schedule a notification for future delivery.
        """
        # Create notification record
        notification = self.create_notification_record(
            user=user,
            title=title,
            message=message,
            notification_type=notification_type,
            delivery_channel=delivery_channel,
            scheduled_for=scheduled_for,
            related_object_type=related_object_type,
            related_object_id=related_object_id,
            metadata={
                'template_id': template_id,
                'template_data': data
            }
        )
        
        # Schedule Celery task
        send_scheduled_notification.apply_async(
            args=[notification.id],
            eta=scheduled_for
        )
        
        return notification


@shared_task
def send_scheduled_notification(notification_id: int):
    """
    Celery task to send scheduled notifications.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        
        # Check if already sent or cancelled
        if notification.status in ['sent', 'cancelled']:
            return
        
        # Get service class based on notification type
        from notifications.services.registry import get_notification_service
        service = get_notification_service(notification.notification_type)
        
        if not service:
            logger.error(f"No service found for notification type: {notification.notification_type}")
            notification.status = 'failed'
            notification.save()
            return
        
        # Check user preferences
        if not service.should_send_notification(
            notification.user,
            notification.notification_type,
            notification.delivery_channel
        ):
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'User preference'
            notification.save()
            return
        
        # Send based on delivery channel
        if notification.delivery_channel == 'email':
            template_id = notification.metadata.get('template_id')
            data = notification.metadata.get('template_data', {})
            
            service.send_email_notification(
                user=notification.user,
                template_id=template_id,
                data=data,
                notification=notification
            )
        
        # Add other delivery channels as needed (SMS, push, etc.)
        
    except Notification.DoesNotExist:
        logger.error(f"Notification {notification_id} not found")
    except Exception as e:
        logger.exception(f"Error sending scheduled notification {notification_id}: {str(e)}")