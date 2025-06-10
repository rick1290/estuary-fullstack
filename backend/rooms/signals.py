"""
Signal handlers for automatic room creation.
"""
import logging
from django.db.models.signals import post_save, pre_save
from django.dispatch import receiver
from django.conf import settings
from bookings.models import Booking
from services.models import ServiceSession, Service
from rooms.models import Room, RoomTemplate
from rooms.livekit.sip import enable_sip_for_room

logger = logging.getLogger(__name__)


@receiver(post_save, sender=Booking)
def create_room_for_booking(sender, instance: Booking, created: bool, **kwargs):
    """
    Create a room when a booking is confirmed and requires video.
    """
    if not created and instance.status == 'confirmed':
        # Check if booking already has a room
        if hasattr(instance, 'livekit_room'):
            return
        
        # Check if service is virtual/online
        if not _requires_video_room(instance.service):
            return
        
        try:
            # Get or create appropriate template
            template = _get_room_template_for_service(instance.service)
            
            # Create room
            room = Room.objects.create(
                booking=instance,
                room_type='individual',
                template=template,
                max_participants=2,  # Practitioner + Client
                recording_enabled=_should_enable_recording(instance.service),
                sip_enabled=_should_enable_sip(instance.service)
            )
            
            logger.info(f"Created room {room.name} for booking {instance.id}")
            
            # Enable SIP if configured
            if room.sip_enabled:
                enable_sip_for_room(room)
            
        except Exception as e:
            logger.error(f"Failed to create room for booking {instance.id}: {e}")


@receiver(post_save, sender=ServiceSession)
def create_room_for_session(sender, instance: ServiceSession, created: bool, **kwargs):
    """
    Create a room when a service session is created.
    """
    if created:
        # Check if session already has a room
        if hasattr(instance, 'livekit_room'):
            return
        
        # Check if service is virtual/online
        if not _requires_video_room(instance.service):
            return
        
        try:
            # Determine room type based on service
            room_type = 'group'
            if instance.service.is_course:
                room_type = 'webinar'
            
            # Get or create appropriate template
            template = _get_room_template_for_service(instance.service, room_type)
            
            # Create room
            room = Room.objects.create(
                service_session=instance,
                room_type=room_type,
                template=template,
                max_participants=instance.max_participants or 100,
                recording_enabled=_should_enable_recording(instance.service),
                sip_enabled=_should_enable_sip(instance.service)
            )
            
            logger.info(f"Created room {room.name} for session {instance.id}")
            
            # Enable SIP if configured
            if room.sip_enabled:
                enable_sip_for_room(room)
            
        except Exception as e:
            logger.error(f"Failed to create room for session {instance.id}: {e}")


@receiver(pre_save, sender=Room)
def update_room_from_booking_changes(sender, instance: Room, **kwargs):
    """
    Update room when booking time changes.
    """
    if instance.pk and instance.booking:
        # Check if booking times have changed
        old_room = Room.objects.filter(pk=instance.pk).first()
        if old_room:
            booking = instance.booking
            if (old_room.scheduled_start != booking.start_time or 
                old_room.scheduled_end != booking.end_time):
                instance.scheduled_start = booking.start_time
                instance.scheduled_end = booking.end_time
                logger.info(f"Updated room {instance.name} times from booking changes")


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
    if service.is_course or service.max_participants > 2:
        return getattr(settings, 'LIVEKIT_SIP_ENABLED', False)
    
    return False


def _get_room_template_for_service(service: Service, room_type: str = 'individual') -> RoomTemplate:
    """
    Get or create appropriate room template for a service.
    
    Args:
        service: Service instance
        room_type: Type of room
        
    Returns:
        RoomTemplate instance
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