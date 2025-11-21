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
        """Create a one-on-one session booking with ServiceSession."""
        start_time = booking_data['start_time']
        end_time = booking_data['end_time']

        # Create ServiceSession for this individual booking
        duration = int((end_time - start_time).total_seconds() / 60)
        service_session = ServiceSession.objects.create(
            service=service,
            session_type='individual',
            visibility='private',
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            max_participants=1,
            current_participants=1,
        )

        # Create booking linked to ServiceSession
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
            start_time = first_session_time
            end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            duration = int((end_time - start_time).total_seconds() / 60)

            # Update draft ServiceSession with actual times
            if first_booking.service_session:
                first_booking.service_session.start_time = start_time
                first_booking.service_session.end_time = end_time
                first_booking.service_session.duration = duration
                first_booking.service_session.current_participants = 1
                first_booking.service_session.status = 'scheduled'
                first_booking.service_session.save()
            else:
                # Fallback: Create new ServiceSession (shouldn't happen with new architecture)
                service_session = ServiceSession.objects.create(
                    service=first_booking.service,
                    session_type='individual',
                    visibility='private',
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    max_participants=1,
                    current_participants=1,
                    status='scheduled',
                )
                first_booking.service_session = service_session

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
            start_time = first_session_time
            end_time = booking_data.get('end_time', first_session_time + timezone.timedelta(hours=1))
            duration = int((end_time - start_time).total_seconds() / 60)

            # Update draft ServiceSession with actual times
            if first_booking.service_session:
                first_booking.service_session.start_time = start_time
                first_booking.service_session.end_time = end_time
                first_booking.service_session.duration = duration
                first_booking.service_session.current_participants = 1
                first_booking.service_session.status = 'scheduled'
                first_booking.service_session.save()
            else:
                # Fallback: Create new ServiceSession (shouldn't happen with new architecture)
                service_session = ServiceSession.objects.create(
                    service=first_booking.service,
                    session_type='individual',
                    visibility='private',
                    start_time=start_time,
                    end_time=end_time,
                    duration=duration,
                    max_participants=1,
                    current_participants=1,
                    status='scheduled',
                )
                first_booking.service_session = service_session

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
        """Create a default booking for unknown service types with ServiceSession."""
        start_time = booking_data.get('start_time', timezone.now())
        end_time = booking_data.get('end_time', timezone.now() + timezone.timedelta(hours=1))

        # Create ServiceSession for this booking
        duration = int((end_time - start_time).total_seconds() / 60)
        service_session = ServiceSession.objects.create(
            service=service,
            session_type='individual',
            visibility='private',
            start_time=start_time,
            end_time=end_time,
            duration=duration,
            max_participants=1,
            current_participants=1,
        )

        # Create booking linked to ServiceSession
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