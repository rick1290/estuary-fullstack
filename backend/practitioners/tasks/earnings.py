"""
Practitioner earnings and financial tasks.
"""
import logging
from celery import shared_task

from practitioners.models import Practitioner
from notifications.services.registry import get_practitioner_notification_service

logger = logging.getLogger(__name__)


@shared_task
def send_practitioner_earnings_summaries():
    """
    Send weekly earnings summaries to practitioners.
    Run weekly via Celery Beat (e.g., Monday mornings).
    """
    service = get_practitioner_notification_service()
    
    # Get all active practitioners
    practitioners = Practitioner.objects.filter(
        is_active=True,
        user__is_active=True
    ).select_related('user')
    
    for practitioner in practitioners:
        try:
            service.send_earnings_summary(practitioner, period='weekly')
        except Exception as e:
            logger.error(f"Error sending earnings summary to practitioner {practitioner.id}: {str(e)}")