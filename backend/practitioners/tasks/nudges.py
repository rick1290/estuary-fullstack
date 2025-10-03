"""
Practitioner nudge and onboarding tasks.
"""
import logging
from celery import shared_task
from django.utils import timezone
from django.conf import settings

from practitioners.models import Practitioner
from services.models import Service
from notifications.models import Notification
from notifications.services.registry import get_practitioner_notification_service

logger = logging.getLogger(__name__)


@shared_task
def send_practitioner_profile_nudge(notification_id: int):
    """
    Send profile incomplete nudge if profile is still incomplete.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        practitioner = Practitioner.objects.get(user=notification.user)
        
        # Check if profile is complete
        profile_complete = all([
            practitioner.bio,
            practitioner.professional_title,
            practitioner.years_of_experience,
            practitioner.profile_image_url,
            practitioner.specializations.exists() or practitioner.certifications.exists()
        ])
        
        if profile_complete:
            # Profile is now complete, cancel the notification
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'Profile completed'
            notification.save()
            logger.info(f"Cancelled profile nudge for {practitioner.user.email} - profile is complete")
            return "Profile complete, nudge cancelled"
        
        # Send the nudge
        service = get_practitioner_notification_service()
        service.send_email_notification(
            user=notification.user,
            template_id=notification.metadata.get('template_id'),
            data={
                'first_name': practitioner.user.first_name or 'there',
                'profile_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/profile",
                'missing_fields': [
                    field for field, label in [
                        ('bio', 'Professional Bio'),
                        ('professional_title', 'Professional Title'),
                        ('years_of_experience', 'Years of Experience'),
                        ('profile_image_url', 'Profile Image')
                    ]
                    if not getattr(practitioner, field)
                ] + (
                    ['Specializations or Certifications'] 
                    if not (practitioner.specializations.exists() or practitioner.certifications.exists())
                    else []
                )
            },
            notification=notification
        )
        
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        logger.info(f"Sent profile incomplete nudge to {practitioner.user.email}")
        return "Profile nudge sent"
        
    except Exception as e:
        logger.error(f"Error sending profile nudge: {str(e)}")
        return f"Error: {str(e)}"


@shared_task
def send_practitioner_services_nudge(notification_id: int):
    """
    Send no services nudge if practitioner still has no services.
    """
    try:
        notification = Notification.objects.get(id=notification_id)
        practitioner = Practitioner.objects.get(user=notification.user)
        
        # Check if practitioner has created any services
        has_services = Service.objects.filter(primary_practitioner=practitioner).exists()
        
        if has_services:
            # Services exist, cancel the notification
            notification.status = 'cancelled'
            notification.metadata['reason'] = 'Services created'
            notification.save()
            logger.info(f"Cancelled services nudge for {practitioner.user.email} - services exist")
            return "Services exist, nudge cancelled"
        
        # Send the nudge
        service = get_practitioner_notification_service()
        service.send_email_notification(
            user=notification.user,
            template_id=notification.metadata.get('template_id'),
            data={
                'first_name': practitioner.user.first_name or 'there',
                'create_service_url': f"{settings.FRONTEND_URL}/dashboard/practitioner/services/new",
                'service_ideas': [
                    "One-on-one coaching sessions",
                    "Group workshops",
                    "Online courses",
                    "Wellness packages"
                ]
            },
            notification=notification
        )
        
        notification.status = 'sent'
        notification.sent_at = timezone.now()
        notification.save()
        
        logger.info(f"Sent no services nudge to {practitioner.user.email}")
        return "Services nudge sent"
        
    except Exception as e:
        logger.error(f"Error sending services nudge: {str(e)}")
        return f"Error: {str(e)}"