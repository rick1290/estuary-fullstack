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
        # NEW: Always create room for service_session (not booking directly)
        if self._should_create_room(service, booking):
            try:
                # NEW: Create room for ServiceSession (works for all booking types)
                room = self.room_service.create_room_for_session(booking.service_session)
                logger.info(f"Created room {room.livekit_room_name} for ServiceSession {booking.service_session.id}")
            except Exception as e:
                logger.error(f"Failed to create room for ServiceSession {booking.service_session.id}: {e}")
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
        """
        Create a one-on-one session booking.

        NEW ARCHITECTURE:
        1. Creates a ServiceSession (private, individual)
        2. Links Booking to ServiceSession
        3. ServiceSession stores scheduling info (not Booking)
        """
        # Step 1: Create ServiceSession for this individual booking
        service_session = ServiceSession.objects.create(
            service=service,
            session_type='individual',  # NEW: Marks as 1-to-1
            visibility='private',       # NEW: Not shown in public listings
            start_time=booking_data['start_time'],
            end_time=booking_data['end_time'],
            max_participants=1,  # Individual session
            current_participants=0,
            # Auto-calculated by ServiceSession.save():
            # - duration (from start/end times)
            # - practitioner_location (from service if set)
        )

        # Step 2: Create Booking linked to ServiceSession
        booking = Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            service_session=service_session,
            order=payment_data.get('order'),
            credits_allocated=payment_data.get('amount_charged_cents', 0),
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            confirmed_at=timezone.now()
        )

        logger.info(f"Created ServiceSession {service_session.id} and Booking {booking.id} for 1-to-1 session")
        return booking
    
    def _create_workshop_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a workshop booking.

        User selects an existing ServiceSession and books a seat.
        Times come from service_session, not duplicated on booking.
        """
        service_session = get_object_or_404(ServiceSession, id=booking_data['service_session_id'])

        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            service_session=service_session,
            order=payment_data.get('order'),
            credits_allocated=payment_data.get('amount_charged_cents', 0),
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            confirmed_at=timezone.now()
        )
    
    def _create_course_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a course enrollment.
        Creates one booking per ServiceSession in the course.
        Returns the first booking for backward compatibility.
        """
        bookings = BookingFactory.create_course_booking(
            user=user,
            course=service,
            order=payment_data.get('order'),  # Link all bookings to same order
            client_notes=booking_data.get('special_requests', '')
        )

        # Update all bookings with payment status
        for booking in bookings:
            booking.payment_status = 'paid'
            booking.status = 'confirmed'
            booking.confirmed_at = timezone.now()
            booking.save()

        # Return first booking for backward compatibility
        return bookings[0] if bookings else None
    
    def _create_package_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a package purchase.
        SIMPLIFIED: Just creates session bookings (no parent).
        """
        # Factory now returns first session booking (not parent)
        first_booking = BookingFactory.create_package_booking(
            user=user,
            package_service=service,
            order=payment_data.get('order'),  # Pass order to link all bookings
            payment_intent_id=payment_data.get('payment_intent_id'),
            client_notes=booking_data.get('special_requests', '')
        )

        # All session bookings start as draft (unscheduled)
        # Update payment status for all sessions in this order
        # Must set on first_booking directly since it's not saved yet
        if first_booking:
            first_booking.payment_status = 'paid'
            if first_booking.order:
                # Update other bookings that are already saved
                first_booking.order.bookings.exclude(id=first_booking.id).update(payment_status='paid')

        # Schedule first session if time provided
        first_session_time = booking_data.get('start_time')
        if first_session_time and first_booking and first_booking.service_session:
            # Update ServiceSession with the scheduled time
            first_booking.service_session.start_time = first_session_time
            first_booking.service_session.end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            first_booking.service_session.status = 'scheduled'
            first_booking.service_session.save()

            first_booking.status = 'confirmed'  # Scheduled
            first_booking.confirmed_at = timezone.now()
            first_booking.save()

        return first_booking

    def _create_bundle_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a bundle purchase.
        SIMPLIFIED: Factory now creates session bookings (no parent).
        """
        # Factory returns first session booking (status='draft', start_time=None)
        first_booking = BookingFactory.create_bundle_booking(
            user=user,
            bundle_service=service,
            order=payment_data.get('order'),  # Pass order to link all bookings
            payment_intent_id=payment_data.get('payment_intent_id'),
            client_notes=booking_data.get('special_requests', '')
        )

        # Update payment status for ALL sessions in this order
        # Must set on first_booking directly since it's not saved yet
        if first_booking:
            first_booking.payment_status = 'paid'
            if first_booking.order:
                # Update other bookings that are already saved
                first_booking.order.bookings.exclude(id=first_booking.id).update(payment_status='paid')

        # Schedule first session if time provided
        first_session_time = booking_data.get('start_time')
        if first_session_time and first_booking and first_booking.service_session:
            # Update ServiceSession with the scheduled time
            first_booking.service_session.start_time = first_session_time
            first_booking.service_session.end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            first_booking.service_session.status = 'scheduled'
            first_booking.service_session.save()

            first_booking.status = 'confirmed'  # Scheduled
            first_booking.confirmed_at = timezone.now()
            first_booking.save()

        return first_booking

    def _create_default_booking(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """Create a default booking for unknown service types with ServiceSession."""
        start_time = booking_data.get('start_time', timezone.now())
        end_time = booking_data.get('end_time', timezone.now() + timezone.timedelta(hours=1))

        # Create ServiceSession
        service_session = ServiceSession.objects.create(
            service=service,
            session_type='individual',
            visibility='private',
            start_time=start_time,
            end_time=end_time,
            max_participants=1,
            current_participants=1,
        )

        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=service.primary_practitioner,
            service_session=service_session,
            order=payment_data.get('order'),
            credits_allocated=payment_data.get('amount_charged_cents', 0),
            status='confirmed',
            payment_status='paid',
            client_notes=booking_data.get('special_requests', ''),
            confirmed_at=timezone.now()
        )
    
    def _should_create_room(self, service: Service, booking: Booking) -> bool:
        """
        Determine if a room should be created for this booking.

        NEW ARCHITECTURE:
        - All bookings have service_session
        - Room always linked to service_session (not booking)
        - Check if service_session already has room

        Args:
            service: Service being booked
            booking: Created booking

        Returns:
            True if room should be created
        """
        # Must have service_session
        if not booking.service_session:
            return False

        # Skip if service_session already has a room
        if hasattr(booking.service_session, 'livekit_room') and booking.service_session.livekit_room:
            return False

        # Skip if not virtual
        if service.location_type not in ['virtual', 'online', 'hybrid']:
            return False

        # Skip package/bundle parent bookings
        if booking.is_package_booking:
            return False

        return True
    
    @transaction.atomic
    def mark_booking_completed(self, booking: Booking) -> Booking:
        """
        Mark a booking as completed, update earnings, and send review request.
        UPDATED: Handles package/bundle completion tracking.

        Args:
            booking: Booking to complete

        Returns:
            Updated booking
        """
        if booking.status == 'completed':
            logger.warning(f"Booking {booking.id} already completed")
            return booking

        booking.status = 'completed'
        booking.actual_end_time = timezone.now()
        booking.completed_at = timezone.now()
        booking.save()

        # Update earnings transaction status from 'projected' to 'pending'
        try:
            from payments.models import EarningsTransaction
            from datetime import timedelta

            earnings = EarningsTransaction.objects.filter(
                booking=booking,
                status='projected'
            ).first()

            if earnings:
                earnings.status = 'pending'
                # Update available_after to 48 hours from NOW (actual completion time)
                earnings.available_after = timezone.now() + timedelta(hours=48)
                earnings.save(update_fields=['status', 'available_after', 'updated_at'])
                logger.info(f"Updated earnings transaction {earnings.id} to pending status")
            else:
                logger.warning(f"No projected earnings found for booking {booking.id}")

        except Exception as e:
            logger.error(f"Error updating earnings for booking {booking.id}: {e}")
            # Don't fail the completion if earnings update fails

        # If package/bundle child, update completion count
        if hasattr(booking, 'order') and booking.order and booking.order.is_package_or_bundle:
            try:
                booking.order.increment_sessions_completed()
                logger.info(
                    f"Package/bundle progress: {booking.order.sessions_completed}/"
                    f"{booking.order.total_sessions} completed"
                )
            except Exception as e:
                logger.error(f"Error updating package completion for order {booking.order.id}: {e}")

        # Send review request notification
        try:
            from notifications.services.client_notifications import ClientNotificationService
            client_service = ClientNotificationService()
            client_service.send_booking_completed_review_request(booking)
            logger.info(f"Sent review request for completed booking {booking.id}")
        except Exception as e:
            logger.error(f"Failed to send review request: {e}")
            # Don't fail the completion if notification fails

        return booking
    
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