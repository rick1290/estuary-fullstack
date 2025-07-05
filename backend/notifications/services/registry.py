"""
Notification service registry.
"""
from typing import Optional

from .client_notifications import ClientNotificationService
from .practitioner_notifications import PractitionerNotificationService


# Service instances
client_service = ClientNotificationService()
practitioner_service = PractitionerNotificationService()


def get_notification_service(notification_type: str) -> Optional[object]:
    """
    Get the appropriate notification service based on notification type.
    """
    # Map notification types to services
    client_types = ['booking', 'payment', 'session', 'review', 'message', 'reminder']
    practitioner_types = ['booking', 'payment', 'session', 'review', 'message', 'reminder']
    
    # For now, we'll determine by context
    # In practice, you might want to check the user type or have separate notification types
    return None  # Will be determined by context
    

def get_client_notification_service() -> ClientNotificationService:
    """Get client notification service instance."""
    return client_service


def get_practitioner_notification_service() -> PractitionerNotificationService:
    """Get practitioner notification service instance."""
    return practitioner_service