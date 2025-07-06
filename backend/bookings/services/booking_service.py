"""
Booking service for managing booking creation and updates.
"""
import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from bookings.models import Booking, BookingFactory
from services.models import Service, ServiceSession
from rooms.services.room_service import RoomService
from notifications.services import NotificationService
from users.models import User

logger = logging.getLogger(__name__)


class BookingService:
    """Service for managing bookings."""
    
    def __init__(self):
        self.room_service = RoomService()
        self.notification_service = NotificationService()
    
    @transaction.atomic
    def create_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a booking based on service type.
        
        Args:
            user: User making the booking
            service: Service being booked
            booking_data: Booking details (times, notes, etc)
            payment_data: Payment information (amounts, order)
            
        Returns:
            Created booking
        """
        service_type_code = service.service_type.code
        
        # Route to appropriate booking creation method
        if service_type_code == 'session':
            booking = self._create_session_booking(user, service, booking_data, payment_data)
        elif service_type_code == 'workshop':
            booking = self._create_workshop_booking(user, service, booking_data, payment_data)
        elif service_type_code == 'course':
            booking = self._create_course_booking(user, service, booking_data, payment_data)
        elif service_type_code == 'package':
            booking = self._create_package_booking(user, service, booking_data, payment_data)
        elif service_type_code == 'bundle':
            booking = self._create_bundle_booking(user, service, booking_data, payment_data)
        else:
            booking = self._create_default_booking(user, service, booking_data, payment_data)
        
        # Create room if needed (explicit, not via signal)
        if self._should_create_room(service, booking):
            try:
                room = self.room_service.create_room_for_booking(booking)
                logger.info(f"Created room {room.livekit_room_name} for booking {booking.id}")
            except Exception as e:
                logger.error(f"Failed to create room for booking {booking.id}: {e}")
                # Don't fail the booking if room creation fails
                # Can be retried later
        
        # Send notifications
        try:
            self.notification_service.send_booking_confirmation(booking)
        except Exception as e:
            logger.error(f"Failed to send booking notification: {e}")
            # Don't fail the booking if notification fails
        
        return booking
    
    def _create_session_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a one-on-one session booking."""
        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            price_charged_cents=payment_data['price_charged_cents'],
            discount_amount_cents=payment_data['credits_applied_cents'],
            final_amount_cents=payment_data['amount_charged_cents'],
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            start_time=booking_data['start_time'],
            end_time=booking_data['end_time'],
            timezone=booking_data.get('timezone', 'UTC'),
            service_name_snapshot=service.name,
            service_description_snapshot=service.description or '',
            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
            confirmed_at=timezone.now()
        )
    
    def _create_workshop_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a workshop booking."""
        service_session = get_object_or_404(ServiceSession, id=booking_data['service_session_id'])
        
        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            service_session=service_session,
            price_charged_cents=payment_data['price_charged_cents'],
            discount_amount_cents=payment_data['credits_applied_cents'],
            final_amount_cents=payment_data['amount_charged_cents'],
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            start_time=service_session.start_time,
            end_time=service_session.end_time,
            timezone=booking_data.get('timezone', 'UTC'),
            service_name_snapshot=service.name,
            service_description_snapshot=service.description or '',
            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
            confirmed_at=timezone.now(),
            max_participants=service_session.max_participants
        )
    
    def _create_course_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a course enrollment."""
        booking = BookingFactory.create_course_booking(
            user=user,
            course=service,
            payment_intent_id=payment_data.get('payment_intent_id'),
            client_notes=booking_data.get('special_requests', '')
        )
        booking.payment_status = 'paid'
        booking.status = 'confirmed'
        booking.confirmed_at = timezone.now()
        booking.save()
        return booking
    
    def _create_package_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a package purchase."""
        booking = BookingFactory.create_package_booking(
            user=user,
            package=service,
            payment_intent_id=payment_data.get('payment_intent_id'),
            client_notes=booking_data.get('special_requests', '')
        )
        booking.payment_status = 'paid'
        booking.status = 'confirmed'
        booking.confirmed_at = timezone.now()
        booking.save()
        
        # Schedule first session if time provided
        first_session_time = booking_data.get('start_time')
        if first_session_time and booking.child_bookings.exists():
            first_child = booking.child_bookings.first()
            first_child.start_time = first_session_time
            first_child.end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            first_child.status = 'scheduled'
            first_child.save()
        
        return booking
    
    def _create_bundle_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a bundle purchase."""
        booking = BookingFactory.create_bundle_booking(
            user=user,
            bundle=service,
            payment_intent_id=payment_data.get('payment_intent_id'),
            client_notes=booking_data.get('special_requests', '')
        )
        booking.payment_status = 'paid'
        booking.status = 'confirmed'
        booking.confirmed_at = timezone.now()
        booking.save()
        
        # Create first scheduled booking if time provided
        first_session_time = booking_data.get('start_time')
        if first_session_time:
            first_booking = Booking.objects.create(
                user=user,
                service=service,
                practitioner=service.primary_practitioner,
                parent_booking=booking,
                price_charged_cents=0,  # Using bundle credits
                discount_amount_cents=0,
                final_amount_cents=0,
                status='scheduled',
                payment_status='paid',
                client_notes=booking_data.get('special_requests', ''),
                start_time=first_session_time,
                end_time=booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1)),
                timezone=booking_data.get('timezone', 'UTC'),
                service_name_snapshot=service.name,
                service_description_snapshot=service.description or '',
                practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else ''
            )
        
        return booking
    
    def _create_default_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a default booking for unknown service types."""
        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            price_charged_cents=payment_data['price_charged_cents'],
            discount_amount_cents=payment_data['credits_applied_cents'],
            final_amount_cents=payment_data['amount_charged_cents'],
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            start_time=booking_data.get('start_time', timezone.now()),
            end_time=booking_data.get('end_time', timezone.now() + timezone.timedelta(hours=1)),
            timezone=booking_data.get('timezone', 'UTC'),
            service_name_snapshot=service.name,
            service_description_snapshot=service.description or '',
            practitioner_name_snapshot=service.primary_practitioner.display_name if service.primary_practitioner else '',
            confirmed_at=timezone.now()
        )
    
    def _should_create_room(self, service: Service, booking: Booking) -> bool:
        """
        Determine if a room should be created for this booking.
        
        Args:
            service: Service being booked
            booking: Created booking
            
        Returns:
            True if room should be created
        """
        # Skip if booking already has a room
        if hasattr(booking, 'livekit_room') and booking.livekit_room:
            return False
        
        # Skip if this is a group session (uses ServiceSession rooms)
        if booking.service_session:
            return False
        
        # Skip if not virtual
        if service.location_type not in ['virtual', 'online', 'hybrid']:
            return False
        
        # Skip package/bundle parent bookings
        if booking.is_package_purchase or booking.is_bundle_purchase:
            return False
        
        return True
    
    @transaction.atomic
    def cancel_booking(self, booking: Booking, cancelled_by: str = 'client', reason: str = '') -> Booking:
        """
        Cancel a booking.
        
        Args:
            booking: Booking to cancel
            cancelled_by: Who cancelled ('client', 'practitioner', 'system')
            reason: Cancellation reason
            
        Returns:
            Updated booking
        """
        if booking.status in ['cancelled', 'completed']:
            raise ValueError(f"Cannot cancel booking with status {booking.status}")
        
        booking.status = 'cancelled'
        booking.cancelled_at = timezone.now()
        booking.cancelled_by = cancelled_by
        booking.cancellation_reason = reason
        booking.save()
        
        # Handle room cancellation
        if hasattr(booking, 'livekit_room') and booking.livekit_room:
            try:
                self.room_service.cancel_room(booking.livekit_room)
            except Exception as e:
                logger.error(f"Failed to cancel room for booking {booking.id}: {e}")
        
        # Send cancellation notifications
        try:
            self.notification_service.send_booking_cancellation(booking)
        except Exception as e:
            logger.error(f"Failed to send cancellation notification: {e}")
        
        return booking