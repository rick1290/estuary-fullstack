"""
Celery tasks for the services app
"""
from celery import shared_task
from django.core.management import call_command
from django.utils import timezone
import logging

logger = logging.getLogger(__name__)


@shared_task(name='services.cleanup_draft_services')
def cleanup_draft_services(hours=24, keep_with_media=True, keep_with_sessions=True):
    """
    Celery task to clean up abandoned draft services.
    
    Args:
        hours: Delete drafts older than this many hours
        keep_with_media: Keep drafts that have associated media
        keep_with_sessions: Keep drafts that have associated sessions
    
    Returns:
        dict: Summary of cleanup results
    """
    logger.info(f"Starting draft service cleanup (older than {hours} hours)")
    
    try:
        # Call the management command
        call_command(
            'cleanup_draft_services',
            hours=hours,
            keep_with_media=keep_with_media,
            keep_with_sessions=keep_with_sessions
        )
        
        return {
            'status': 'success',
            'message': f'Draft service cleanup completed',
            'timestamp': timezone.now().isoformat()
        }
        
    except Exception as e:
        logger.error(f"Error during draft service cleanup: {e}")
        return {
            'status': 'error',
            'message': str(e),
            'timestamp': timezone.now().isoformat()
        }


@shared_task(name='services.update_service_rankings')
def update_service_rankings():
    """
    Update service rankings based on bookings, reviews, and other metrics.
    This can be used for featured services, search ranking, etc.
    """
    from services.models import Service
    from django.db.models import Count, Avg, Q
    from django.utils import timezone
    from datetime import timedelta
    
    # Get services with recent activity
    recent_date = timezone.now() - timedelta(days=30)
    
    services = Service.objects.filter(
        is_active=True,
        is_public=True,
        status='published'
    ).annotate(
        recent_bookings=Count(
            'bookings',
            filter=Q(bookings__created_at__gte=recent_date)
        ),
        avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True)),
        total_reviews=Count('reviews', filter=Q(reviews__is_published=True))
    )
    
    updated_count = 0
    
    for service in services:
        # Simple ranking algorithm (can be made more sophisticated)
        ranking_score = 0
        
        # Recent bookings weight
        ranking_score += service.recent_bookings * 10
        
        # Average rating weight
        if service.avg_rating:
            ranking_score += service.avg_rating * 20
        
        # Total reviews weight (with diminishing returns)
        if service.total_reviews:
            ranking_score += min(service.total_reviews, 50) * 2
        
        # Update service metadata (you might want to add a ranking_score field)
        # For now, we'll just log it
        logger.info(
            f"Service {service.id} '{service.name}' ranking score: {ranking_score}"
        )
        
        updated_count += 1
    
    return {
        'status': 'success',
        'services_updated': updated_count,
        'timestamp': timezone.now().isoformat()
    }