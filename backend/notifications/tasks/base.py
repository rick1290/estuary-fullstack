"""
Base notification tasks and utilities.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone

from notifications.models import Notification

logger = logging.getLogger(__name__)


@shared_task
def test_celery():
    """Simple test task to verify Celery is working."""
    logger.info("Test Celery task executed successfully!")
    return "Celery is working!"


@shared_task
def cleanup_old_notifications():
    """
    Clean up old read notifications.
    Run daily via Celery Beat.
    """
    # Delete read notifications older than 30 days
    cutoff_date = timezone.now() - timedelta(days=30)
    
    deleted_count = Notification.objects.filter(
        is_read=True,
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old read notifications")
    
    # Delete failed notifications older than 7 days
    cutoff_date = timezone.now() - timedelta(days=7)
    
    deleted_count = Notification.objects.filter(
        status='failed',
        created_at__lt=cutoff_date
    ).delete()[0]
    
    logger.info(f"Deleted {deleted_count} old failed notifications")