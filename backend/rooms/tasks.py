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
    try:
        room = Room.objects.get(id=room_id)
        
        # Check if room is still empty
        if room.current_participants == 0 and room.status in ['active', 'in_use']:
            room.status = 'ended'
            room.actual_end = timezone.now()
            
            # Calculate total duration if we have a start time
            if room.actual_start:
                room.total_duration_seconds = int(
                    (room.actual_end - room.actual_start).total_seconds()
                )
            
            room.save(update_fields=['status', 'actual_end', 'total_duration_seconds'])
            logger.info(f"Closed empty room {room.id} after timeout")
        else:
            logger.info(f"Room {room.id} is no longer empty, not closing")
            
    except Room.DoesNotExist:
        logger.error(f"Room {room_id} not found for closure")


@shared_task
def cleanup_old_rooms():
    """
    Clean up rooms that have been ended for more than 24 hours.
    """
    cutoff_time = timezone.now() - timezone.timedelta(hours=24)
    old_rooms = Room.objects.filter(
        status='ended',
        actual_end__lt=cutoff_time
    )
    
    for room in old_rooms:
        # You might want to archive data before deleting
        logger.info(f"Cleaning up old room {room.id}")
        # room.delete()  # Uncomment to actually delete


@shared_task
def update_room_analytics(room_id):
    """
    Update analytics for a room after it ends.
    """
    try:
        room = Room.objects.get(id=room_id)
        
        # Calculate various metrics
        participants = room.participants.all()
        
        # Average participant duration
        total_participant_duration = sum(p.duration_seconds for p in participants if p.duration_seconds)
        avg_duration = total_participant_duration / len(participants) if participants else 0
        
        # Update room metadata with analytics
        room.metadata.update({
            'analytics': {
                'avg_participant_duration': avg_duration,
                'total_participants': room.total_participants,
                'peak_participants': room.peak_participants,
                'room_duration': room.total_duration_seconds,
            }
        })
        room.save(update_fields=['metadata'])
        
        logger.info(f"Updated analytics for room {room.id}")
        
    except Room.DoesNotExist:
        logger.error(f"Room {room_id} not found for analytics update")