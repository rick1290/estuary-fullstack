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
    
    def close_room(self, room: Room) -> None:
        """
        Close a room after session ends.
        
        Args:
            room: Room to close
        """
        if room.status == 'ended':
            return
        
        room.status = 'ended'
        room.actual_end = timezone.now()
        
        # Calculate total duration if we have a start time
        if room.actual_start:
            room.total_duration_seconds = int(
                (room.actual_end - room.actual_start).total_seconds()
            )
        
        room.save(update_fields=['status', 'actual_end', 'total_duration_seconds'])
        
        logger.info(f"Closed room {room.livekit_room_name}")
    
    def calculate_room_analytics(self, room: Room) -> dict:
        """
        Calculate analytics for a room.
        
        Args:
            room: Room to analyze
            
        Returns:
            Dict with analytics data
        """
        participants = room.participants.all()
        
        # Average participant duration
        total_participant_duration = sum(
            p.duration_seconds for p in participants if p.duration_seconds
        )
        avg_duration = total_participant_duration / len(participants) if participants else 0
        
        return {
            'avg_participant_duration': avg_duration,
            'total_participants': room.total_participants,
            'peak_participants': room.peak_participants,
            'room_duration': room.total_duration_seconds,
            'participant_count': len(participants),
            'completion_rate': self._calculate_completion_rate(room, participants)
        }
    
    def _calculate_completion_rate(self, room: Room, participants) -> float:
        """
        Calculate what percentage of participants stayed for the full session.
        
        Args:
            room: Room to check
            participants: QuerySet of participants
            
        Returns:
            Completion rate as percentage (0-100)
        """
        if not participants or not room.total_duration_seconds:
            return 0.0
        
        # Consider "completed" if they stayed for at least 80% of the session
        threshold_seconds = room.total_duration_seconds * 0.8
        completed_count = sum(
            1 for p in participants 
            if p.duration_seconds and p.duration_seconds >= threshold_seconds
        )
        
        return (completed_count / len(participants)) * 100
    
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