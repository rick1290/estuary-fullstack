"""
Celery tasks for room management.
"""
from celery import shared_task
from django.utils import timezone
from rooms.models import Room
import logging

logger = logging.getLogger(__name__)


@shared_task
def close_empty_room(room_id):
    """
    Close a room if it's still empty after the timeout period.
    """
    from rooms.services import RoomService
    
    try:
        room = Room.objects.get(id=room_id)
        
        # Check if room is still empty
        if room.current_participants == 0 and room.status in ['active', 'in_use']:
            # Use RoomService to handle room closure
            room_service = RoomService()
            room_service.close_room(room)
            logger.info(f"Closed empty room {room.id} after timeout")
        else:
            logger.info(f"Room {room.id} is no longer empty, not closing")
            
    except Room.DoesNotExist:
        logger.error(f"Room {room_id} not found for closure")


@shared_task
def cleanup_old_rooms():
    """
    Clean up rooms that have been ended for more than 24 hours.
    This task could be extended to archive data or perform cleanup.
    """
    from rooms.services import RoomService
    
    cutoff_time = timezone.now() - timezone.timedelta(hours=24)
    old_rooms = Room.objects.filter(
        status='ended',
        actual_end__lt=cutoff_time
    )
    
    room_service = RoomService()
    cleaned_count = 0
    
    for room in old_rooms:
        try:
            # Use RoomService for any cleanup operations
            # This could be extended to archive recordings, clean up storage, etc.
            logger.info(f"Processing old room {room.id} for cleanup")
            # room_service.archive_room(room)  # Future method
            cleaned_count += 1
        except Exception as e:
            logger.error(f"Error cleaning up room {room.id}: {e}")
    
    logger.info(f"Cleanup task completed. Processed {cleaned_count} rooms.")
    return {'cleaned_count': cleaned_count}


@shared_task
def update_room_analytics(room_id):
    """
    Update analytics for a room after it ends.
    """
    from rooms.services import RoomService
    
    try:
        room = Room.objects.get(id=room_id)
        
        # Use RoomService to calculate and update analytics
        room_service = RoomService()
        analytics = room_service.calculate_room_analytics(room)
        
        # Update room metadata with analytics
        room.metadata.update({
            'analytics': analytics
        })
        room.save(update_fields=['metadata'])
        
        logger.info(f"Updated analytics for room {room.id}")
        
    except Room.DoesNotExist:
        logger.error(f"Room {room_id} not found for analytics update")