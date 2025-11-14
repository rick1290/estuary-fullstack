"""
Fast booking service that defers non-critical operations to background tasks.
"""
import logging
from typing import Optional, Dict, Any
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404

from bookings.models import Booking, BookingFactory
from services.models import Service, ServiceSession
from users.models import User

logger = logging.getLogger(__name__)


class FastBookingService:
    """Service for creating bookings with deferred operations."""
    
    @transaction.atomic
    def create_booking_fast(
        self,
        user: User,
        service: Service,
        booking_data: Dict[str, Any],
        payment_data: Dict[str, Any]
    ) -> Booking:
        """
        Create a booking quickly by deferring non-critical operations.
        
        This method:
        1. Creates the booking record (critical)
        2. Defers room creation, notifications, and reminders to background task
        
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
        
        # Queue post-payment tasks after transaction commits
        from payments.tasks import complete_booking_post_payment
        
        def queue_post_payment_tasks():
            complete_booking_post_payment.delay(booking.id)
            logger.info(f"Queued post-payment tasks for booking {booking.id}")
        
        transaction.on_commit(queue_post_payment_tasks)
        
        logger.info(f"Created booking {booking.id}")
        
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
        """
        Create a package purchase.
        SIMPLIFIED: Factory now creates session bookings (no parent).
        """
        # Factory returns first session booking (status='draft', start_time=None)
        first_booking = BookingFactory.create_package_booking(
            user=user,
            package_service=service,
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
        if first_session_time and first_booking:
            first_booking.start_time = first_session_time
            first_booking.end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            first_booking.status = 'confirmed'  # Now it has times, can be confirmed
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
        if first_session_time and first_booking:
            first_booking.start_time = first_session_time
            first_booking.end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            first_booking.status = 'confirmed'  # Now it has times, can be confirmed
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