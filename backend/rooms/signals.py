"""
Room signals for handling automatic actions on room events.
"""
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from django.utils import timezone
from .models import Room, RoomParticipant, RoomRecording, RoomTemplate
from .livekit.client import LiveKitClient
from .livekit.sip import enable_sip_for_room
from bookings.models import Booking
from services.models import ServiceSession, Service
import logging

logger = logging.getLogger(__name__)


# ========== Booking and ServiceSession Room Creation ==========

@receiver(post_save, sender=Booking)
def create_room_for_booking(sender, instance: Booking, created: bool, **kwargs):
    """
    Create a room when a booking is confirmed and requires video.
    """
    # Skip if this is a new booking (not yet confirmed)
    if created and instance.status != 'confirmed':
        return
    
    # Only create room when status changes to confirmed
    if instance.status == 'confirmed':
        # Check if booking already has a room
        if hasattr(instance, 'livekit_room') and instance.livekit_room:
            return
        
        # Skip if this is a group session (those use ServiceSession rooms)
        if instance.service_session:
            return
        
        # Check if service is virtual/online
        if not _requires_video_room(instance.service):
            return
        
        # Skip if this is a package/bundle booking
        if instance.is_package_purchase or instance.is_bundle_purchase:
            return
        
        try:
            # Get or create appropriate template
            template = _get_room_template_for_service(instance.service)
            
            # Create room
            room = Room.objects.create(
                booking=instance,
                room_type='individual',
                template=template,
                created_by=instance.practitioner.user,
                name=f"{instance.service_name_snapshot} - {instance.user.get_full_name()}",
                scheduled_start=instance.start_time,
                scheduled_end=instance.end_time,
                max_participants=2,  # Practitioner + Client
                recording_enabled=_should_enable_recording(instance.service),
                sip_enabled=_should_enable_sip(instance.service),
                metadata={
                    'booking_id': str(instance.id),
                    'service_id': str(instance.service.id),
                    'practitioner_id': str(instance.practitioner.id),
                    'client_id': str(instance.user.id),
                    'service_name': instance.service_name_snapshot,
                }
            )
            
            logger.info(f"Created room {room.name} for booking {instance.id}")
            
            # Enable SIP if configured
            if room.sip_enabled and hasattr(room, 'dial_in_number'):
                enable_sip_for_room(room)
            
        except Exception as e:
            logger.error(f"Failed to create room for booking {instance.id}: {e}")


@receiver(post_save, sender=ServiceSession)
def create_room_for_session(sender, instance: ServiceSession, created: bool, **kwargs):
    """
    Create a room when a service session is created for workshops and courses.
    """
    if created:
        # Check if session already has a room
        if hasattr(instance, 'livekit_room') and instance.livekit_room:
            return
        
        # Check if service is virtual/online
        if not _requires_video_room(instance.service):
            return
        
        try:
            # Determine room type based on service
            room_type = 'group'
            if instance.service.is_course:
                room_type = 'webinar'  # Courses typically use webinar format
            elif instance.service.service_type and instance.service.service_type.slug == 'workshop':
                room_type = 'group'
            
            # Get or create appropriate template
            template = _get_room_template_for_service(instance.service, room_type)
            
            # Create room
            room = Room.objects.create(
                service_session=instance,
                room_type=room_type,
                template=template,
                created_by=instance.service.practitioner.user,
                name=f"{instance.service.name} - Session {instance.sequence_number or 1}",
                scheduled_start=instance.start_time,
                scheduled_end=instance.end_time,
                max_participants=instance.max_participants or 100,
                recording_enabled=_should_enable_recording(instance.service),
                sip_enabled=_should_enable_sip(instance.service),
                metadata={
                    'service_session_id': str(instance.id),
                    'service_id': str(instance.service.id),
                    'practitioner_id': str(instance.service.practitioner.id),
                    'service_name': instance.service.name,
                    'session_number': instance.sequence_number or 1,
                }
            )
            
            logger.info(f"Created room {room.name} for session {instance.id}")
            
            # Enable SIP if configured
            if room.sip_enabled and hasattr(room, 'dial_in_number'):
                enable_sip_for_room(room)
            
        except Exception as e:
            logger.error(f"Failed to create room for session {instance.id}: {e}")


# ========== Booking Updates ==========

@receiver(pre_save, sender=Room)
def update_room_from_booking_changes(sender, instance: Room, **kwargs):
    """
    Update room when booking time changes.
    """
    if instance.pk and instance.booking:
        # Check if booking times have changed
        try:
            old_room = Room.objects.get(pk=instance.pk)
            booking = instance.booking
            if (old_room.scheduled_start != booking.start_time or 
                old_room.scheduled_end != booking.end_time):
                instance.scheduled_start = booking.start_time
                instance.scheduled_end = booking.end_time
                logger.info(f"Updated room {instance.name} times from booking changes")
        except Room.DoesNotExist:
            pass


# ========== Room Status and Lifecycle Management ==========

@receiver(pre_save, sender=Room)
def room_pre_save(sender, instance, **kwargs):
    """Handle room pre-save events."""
    if instance.pk:
        # Get the previous instance to check for status changes
        try:
            previous = Room.objects.get(pk=instance.pk)
            
            # Check if room is transitioning to active
            if previous.status != 'active' and instance.status == 'active':
                instance.actual_start = timezone.now()
                instance._status_changed_to_active = True
            else:
                instance._status_changed_to_active = False
            
            # Check if room is transitioning to ended
            if previous.status not in ['ended', 'error'] and instance.status == 'ended':
                instance.actual_end = timezone.now()
                instance._status_changed_to_ended = True
            else:
                instance._status_changed_to_ended = False
                
        except Room.DoesNotExist:
            instance._status_changed_to_active = False
            instance._status_changed_to_ended = False
    else:
        instance._status_changed_to_active = False
        instance._status_changed_to_ended = False


@receiver(post_save, sender=Room)
def room_post_save(sender, instance, created, **kwargs):
    """Handle room post-save events."""
    if created:
        # Create room in LiveKit
        create_livekit_room(instance)
    
    # Handle status transitions
    if getattr(instance, '_status_changed_to_active', False):
        handle_room_started(instance)
    
    if getattr(instance, '_status_changed_to_ended', False):
        handle_room_ended(instance)


def create_livekit_room(room):
    """
    Create a room in LiveKit when a new Room instance is created.
    """
    try:
        client = LiveKitClient()
        
        # Set room options based on template or defaults
        options = {
            'name': room.livekit_room_name,
            'empty_timeout': room.empty_timeout,
            'max_participants': room.max_participants,
            'metadata': str(room.metadata),
        }
        
        # Create room in LiveKit
        livekit_room = client.create_room(**options)
        
        # Update room with LiveKit SID
        if livekit_room and 'sid' in livekit_room:
            room.livekit_room_sid = livekit_room['sid']
            room.save(update_fields=['livekit_room_sid'])
            
        logger.info(f"Created LiveKit room {room.livekit_room_name} with SID {room.livekit_room_sid}")
        
    except Exception as e:
        logger.error(f"Failed to create LiveKit room for {room.id}: {str(e)}")
        room.status = 'error'
        room.save(update_fields=['status'])


def handle_room_started(room):
    """
    Handle actions when a room becomes active.
    """
    # Update booking status if applicable
    if room.booking and room.booking.status == 'confirmed':
        room.booking.status = 'in_progress'
        room.booking.actual_start_time = timezone.now()
        room.booking.save(update_fields=['status', 'actual_start_time'])
    
    # Send notifications to participants
    send_room_started_notifications(room)
    
    logger.info(f"Room {room.id} started")


def handle_room_ended(room):
    """
    Handle actions when a room ends.
    """
    # Calculate duration
    if room.actual_start and room.actual_end:
        room.total_duration_seconds = int((room.actual_end - room.actual_start).total_seconds())
        room.save(update_fields=['total_duration_seconds'])
    
    # Update booking status if applicable
    if room.booking:
        room.booking.status = 'completed'
        room.booking.actual_end_time = timezone.now()
        room.booking.save(update_fields=['status', 'actual_end_time'])
    
    # End all active participant sessions
    active_participants = room.participants.filter(left_at__isnull=True)
    for participant in active_participants:
        participant.left_at = timezone.now()
        participant.save(update_fields=['left_at'])
    
    # Stop recording if active
    if room.recording_status in ['active', 'starting']:
        stop_room_recording(room)
    
    logger.info(f"Room {room.id} ended")


@receiver(pre_save, sender=RoomParticipant)
def participant_pre_save(sender, instance, **kwargs):
    """Handle participant pre-save events."""
    if instance.pk and instance.left_at and not instance.duration_seconds:
        # Calculate duration when participant leaves
        if instance.joined_at:
            instance.duration_seconds = int((instance.left_at - instance.joined_at).total_seconds())


@receiver(post_save, sender=RoomParticipant)
def participant_post_save(sender, instance, created, **kwargs):
    """Handle participant post-save events."""
    if created:
        # Update room participant count
        room = instance.room
        room.current_participants = room.participants.filter(left_at__isnull=True).count()
        room.total_participants = room.participants.count()
        
        # Update peak if necessary
        if room.current_participants > room.peak_participants:
            room.peak_participants = room.current_participants
        
        room.save(update_fields=['current_participants', 'total_participants', 'peak_participants'])
        
        # If first participant and room is pending, activate it
        if room.status == 'pending' and room.current_participants > 0:
            room.status = 'active'
            room.save(update_fields=['status'])
    
    elif instance.left_at:
        # Participant left - update count
        room = instance.room
        room.current_participants = room.participants.filter(left_at__isnull=True).count()
        room.save(update_fields=['current_participants'])
        
        # If last participant left, schedule room closure
        if room.current_participants == 0 and room.status == 'active':
            schedule_room_closure(room)


def schedule_room_closure(room):
    """
    Schedule a room to be closed after empty_timeout seconds.
    This would typically use Celery or another task queue.
    """
    # For now, we'll just log it
    logger.info(f"Room {room.id} is empty, will close in {room.empty_timeout} seconds")
    # TODO: Implement actual scheduling with Celery


def send_room_started_notifications(room):
    """
    Send notifications when a room starts.
    """
    # TODO: Implement notification sending
    pass


def stop_room_recording(room):
    """
    Stop an active recording.
    """
    try:
        client = LiveKitClient()
        if room.recording_id:
            client.stop_egress(room.recording_id)
            room.recording_status = 'stopping'
            room.save(update_fields=['recording_status'])
    except Exception as e:
        logger.error(f"Failed to stop recording for room {room.id}: {str(e)}")


@receiver(post_save, sender=RoomRecording)
def recording_post_save(sender, instance, created, **kwargs):
    """Handle recording post-save events."""
    if instance.status == 'ready' and not instance.is_processed:
        # Recording is ready - process it
        process_recording(instance)


def process_recording(recording):
    """
    Process a completed recording.
    """
    # Mark as processed
    recording.is_processed = True
    recording.processed_at = timezone.now()
    recording.save(update_fields=['is_processed', 'processed_at'])
    
    # Update room recording status
    if recording.room.recording_status != 'none':
        recording.room.recording_status = 'ready'
        recording.room.save(update_fields=['recording_status'])
    
    # TODO: Generate thumbnail, transcode if needed, etc.
    logger.info(f"Processed recording {recording.id}")


# ========== Helper Functions ==========

def _requires_video_room(service: Service) -> bool:
    """
    Check if a service requires a video room.
    
    Args:
        service: Service instance
        
    Returns:
        True if video room is required
    """
    if not service:
        return False
    
    # Check if service is virtual
    if hasattr(service, 'is_virtual') and service.is_virtual:
        return True
    
    # Check service delivery method
    if hasattr(service, 'delivery_method'):
        return service.delivery_method in ['online', 'hybrid']
    
    # Check service type
    if service.service_type:
        virtual_types = ['online_consultation', 'webinar', 'online_workshop', 'virtual_class']
        return service.service_type.code in virtual_types
    
    # Default to checking if it's not explicitly in-person
    return not getattr(service, 'is_in_person', False)


def _should_enable_recording(service: Service) -> bool:
    """
    Check if recording should be enabled for a service.
    
    Args:
        service: Service instance
        
    Returns:
        True if recording should be enabled
    """
    # Check service-level setting
    if hasattr(service, 'recording_enabled'):
        return service.recording_enabled
    
    # Check global setting
    return getattr(settings, 'LIVEKIT_DEFAULT_RECORDING_ENABLED', False)


def _should_enable_sip(service: Service) -> bool:
    """
    Check if SIP/dial-in should be enabled for a service.
    
    Args:
        service: Service instance
        
    Returns:
        True if SIP should be enabled
    """
    # Check service-level setting
    if hasattr(service, 'sip_enabled'):
        return service.sip_enabled
    
    # Enable for group sessions by default
    if service.is_course or (hasattr(service, 'max_participants') and service.max_participants > 2):
        return getattr(settings, 'LIVEKIT_SIP_ENABLED', False)
    
    return False


def _get_room_template_for_service(service: Service, room_type: str = 'individual') -> RoomTemplate:
    """
    Get or create appropriate room template for a service.
    
    Args:
        service: Service instance
        room_type: Type of room
        
    Returns:
        RoomTemplate instance or None
    """
    # Try to find existing template
    template = RoomTemplate.objects.filter(
        room_type=room_type,
        is_active=True,
        is_default=True
    ).first()
    
    if not template:
        # Create default template
        template = RoomTemplate.objects.create(
            name=f"Default {room_type.title()} Template",
            room_type=room_type,
            is_default=True,
            empty_timeout=300,
            max_participants=100 if room_type != 'individual' else 2,
            recording_enabled=_should_enable_recording(service),
            sip_enabled=_should_enable_sip(service)
        )
        logger.info(f"Created default template for {room_type} rooms")
    
    return template