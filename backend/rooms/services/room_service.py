"""
Room service for managing video conference rooms.
"""
import logging
from typing import Optional
from django.db import transaction
from django.utils import timezone

from rooms.models import Room, RoomTemplate
from bookings.models import Booking
from services.models import ServiceSession

logger = logging.getLogger(__name__)


class RoomService:
    """Service for managing video rooms."""
    
    @transaction.atomic
    def create_room_for_booking(self, booking: Booking) -> Room:
        """
        Create a room for an individual booking.
        
        Args:
            booking: Booking that needs a room
            
        Returns:
            Created Room instance
        """
        # Get or create appropriate template
        template = self._get_room_template('individual')
        
        # Create room
        room = Room.objects.create(
            booking=booking,
            room_type='individual',
            template=template,
            created_by=booking.practitioner.user if booking.practitioner else booking.user,
            name=f"{booking.service_name_snapshot} - {booking.user.get_full_name()}",
            scheduled_start=booking.start_time,
            scheduled_end=booking.end_time,
            max_participants=2,  # Practitioner + Client
            recording_enabled=self._should_enable_recording(booking.service),
            metadata={
                'booking_id': str(booking.id),
                'service_id': str(booking.service.id) if booking.service else None,
                'practitioner_id': str(booking.practitioner.id) if booking.practitioner else None,
                'client_id': str(booking.user.id),
                'service_name': booking.service_name_snapshot,
            }
        )
        
        logger.info(f"Created room {room.livekit_room_name} for booking {booking.id}")
        return room
    
    @transaction.atomic
    def create_room_for_session(self, service_session: ServiceSession) -> Room:
        """
        Create a room for a service session (workshop/course).
        
        Args:
            service_session: Service session that needs a room
            
        Returns:
            Created Room instance
        """
        service = service_session.service
        
        # Determine room type
        room_type = 'group'
        if service.is_course:
            room_type = 'webinar'
        elif service.service_type and service.service_type.code == 'workshop':
            room_type = 'group'
        
        # Get or create appropriate template
        template = self._get_room_template(room_type)
        
        # Create room
        room = Room.objects.create(
            service_session=service_session,
            room_type=room_type,
            template=template,
            created_by=service.primary_practitioner.user if service.primary_practitioner else None,
            name=f"{service.name} - Session {service_session.sequence_number or 1}",
            scheduled_start=service_session.start_time,
            scheduled_end=service_session.end_time,
            max_participants=service_session.max_participants or 100,
            recording_enabled=self._should_enable_recording(service),
            metadata={
                'service_session_id': str(service_session.id),
                'service_id': str(service.id),
                'practitioner_id': str(service.primary_practitioner.id) if service.primary_practitioner else None,
                'service_name': service.name,
                'session_number': service_session.sequence_number or 1,
            }
        )
        
        logger.info(f"Created room {room.livekit_room_name} for session {service_session.id}")
        return room
    
    def cancel_room(self, room: Room) -> None:
        """
        Cancel/close a room.
        
        Args:
            room: Room to cancel
        """
        if room.status in ['ended', 'cancelled']:
            return
        
        room.status = 'cancelled'
        room.actual_end = timezone.now()
        room.save()
        
        # End any active participants
        active_participants = room.participants.filter(left_at__isnull=True)
        for participant in active_participants:
            participant.left_at = timezone.now()
            participant.save()
        
        logger.info(f"Cancelled room {room.livekit_room_name}")
    
    def _get_room_template(self, room_type: str) -> Optional[RoomTemplate]:
        """
        Get or create appropriate room template.
        
        Args:
            room_type: Type of room ('individual', 'group', 'webinar')
            
        Returns:
            RoomTemplate instance or None
        """
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
                recording_enabled=False,
                sip_enabled=False
            )
            logger.info(f"Created default template for {room_type} rooms")
        
        return template
    
    def _should_enable_recording(self, service) -> bool:
        """
        Check if recording should be enabled for a service.
        
        Args:
            service: Service instance
            
        Returns:
            True if recording should be enabled
        """
        if not service:
            return False
            
        # Check service-level setting
        if hasattr(service, 'recording_enabled'):
            return service.recording_enabled
        
        # Default to False for privacy
        return False