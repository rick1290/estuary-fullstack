from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from utils.models import BaseModel, PublicModel
from decimal import Decimal

# Booking status choices - Clear progression
BOOKING_STATUS_CHOICES = [
    ('draft', 'Draft'),  # Initial creation, not yet submitted
    ('pending_payment', 'Pending Payment'),  # Awaiting payment
    ('confirmed', 'Confirmed'),  # Payment received, booking confirmed
    ('in_progress', 'In Progress'),  # Service currently happening
    ('completed', 'Completed'),  # Service finished successfully
    ('canceled', 'Canceled'),  # Booking was canceled
    ('no_show', 'No Show'),  # Client didn't attend
]

# Payment status choices - Separate from booking status
PAYMENT_STATUS_CHOICES = [
    ('unpaid', 'Unpaid'),
    ('paid', 'Paid'),
    ('partially_refunded', 'Partially Refunded'),
    ('refunded', 'Refunded'),
]

# Cancellation source choices
CANCELED_BY_CHOICES = [
    ('client', 'Client'),
    ('practitioner', 'Practitioner'),
    ('system', 'System'),
    ('admin', 'Admin'),
]


class Booking(PublicModel):
    """
    Model representing a booking (reservation/seat) for a service session.

    ARCHITECTURE CHANGE:
    - Booking now represents a "seat" in a ServiceSession
    - ServiceSession is the source of truth for scheduling (start_time, end_time)
    - This applies to ALL service types: individual sessions, workshops, and courses

    Legacy fields (start_time, end_time, actual_start_time, actual_end_time) are
    deprecated and will be removed after migration. Use service_session times instead.
    """
    # Core relationships
    user = models.ForeignKey('users.User', on_delete=models.CASCADE,
                           related_name='bookings', help_text="Client making the booking")
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE,
                                   related_name='bookings', help_text="Practitioner providing the service")
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE,
                              related_name='bookings', help_text="Service being booked")

    # Scheduling - REMOVED: All time fields moved to ServiceSession
    # Access via: booking.get_start_time(), booking.get_end_time(), etc.
    # timezone moved to ServiceSession
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='draft')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    
    # Booking details
    # Note: title/description removed - use service_session.title/description
    client_notes = models.TextField(blank=True, null=True, help_text="Notes from the client")
    practitioner_notes = models.TextField(blank=True, null=True, help_text="Private notes from practitioner")

    # Location - REMOVED: Use service_session.practitioner_location instead

    # Credits allocated to this booking (in cents)
    # For individual sessions: full order amount
    # For courses: order amount / number of sessions
    # For packages/bundles: order amount / number of sessions
    credits_allocated = models.IntegerField(
        default=0,
        help_text="Credit value allocated to this booking in cents")

    # Pricing fields REMOVED - payment handled at Order level
    # Access via: booking.order.total_amount_cents, booking.order.credits_used_cents, etc.

    # Historical snapshot data - REMOVED
    # Snapshot data now lives on ServiceSession (title, description, duration)
    # ServiceSession is immutable after booking, so it preserves what was booked
    # Access via: booking.service_session.title, booking.service_session.description, etc.
    #
    # Package/Bundle snapshot data stored in Order.package_metadata
    
    # Completion tracking
    completed_at = models.DateTimeField(blank=True, null=True)
    no_show_at = models.DateTimeField(blank=True, null=True)
    
    # Cancellation and rescheduling
    canceled_at = models.DateTimeField(blank=True, null=True)
    canceled_by = models.CharField(max_length=20, choices=CANCELED_BY_CHOICES, blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    # Status change tracking
    status_changed_at = models.DateTimeField(auto_now=True, help_text="When status last changed")
    confirmed_at = models.DateTimeField(blank=True, null=True, help_text="When booking was confirmed")
    # Note: started_at removed - use actual_start_time instead
    
    rescheduled_from = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True,
                                       related_name='rescheduled_to_bookings',
                                       help_text="Original booking this was rescheduled from")
    
    # Financial relationship - PRIMARY
    order = models.ForeignKey('payments.Order', on_delete=models.CASCADE,
                            blank=True, null=True, related_name='bookings',
                            help_text="Financial transaction for this booking")

    # parent_booking - REMOVED: Use order relationship instead

    # Group bookings and sessions
    # TODO: Make this required (null=False) after migration
    service_session = models.ForeignKey('services.ServiceSession', on_delete=models.SET_NULL,
                                      blank=True, null=True, related_name='bookings',
                                      help_text="The scheduled session this booking reserves a seat in (will become required)")

    # max_participants - REMOVED: Use service_session.max_participants instead

    # credit_usage_transaction - REMOVED: Payment/credit tracking now at Order level

    # Metadata for tracking various flags and data
    metadata = models.JSONField(default=dict, blank=True, 
                              help_text="Additional data like reminder flags, custom fields, etc.")

    class Meta:
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-created_at']  # Changed from -start_time (field removed)
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['practitioner', 'status']),  # Removed start_time
            models.Index(fields=['service', 'status']),
            models.Index(fields=['status', 'created_at']),  # Changed from start_time
            models.Index(fields=['payment_status']),
            models.Index(fields=['service_session']),
            models.Index(fields=['order']),  # Added order index
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(credits_allocated__gte=0),
                name='booking_non_negative_credits'
            ),
        ]

    def __str__(self):
        return f"Booking #{self.id}: {self.service.name if self.service else 'Package/Bundle'} - {self.user.email}"

    def save(self, *args, **kwargs):
        """Override save to validate data."""
        self.clean()
        super().save(*args, **kwargs)

    def clean(self):
        """Validate booking data."""
        super().clean()

        # Validate time range (only if times are set)
        start = self.get_start_time()
        end = self.get_end_time()

        if start and end and start >= end:
            raise ValidationError("Start time must be before end time")

        # For scheduled bookings (non-draft with times), require service_session
        # Draft bookings don't need service_session yet (will get one when scheduled)
        if self.status not in ['draft', 'cancelled']:
            if start and not self.service_session:
                raise ValidationError("Scheduled bookings must have a service_session")
            if not start and not self.service_session:
                # Confirmed booking without times - might be package/bundle, allow it
                pass

    # Credits property in dollars
    @property
    def credits_allocated_dollars(self):
        """Get credits allocated in dollars."""
        return Decimal(self.credits_allocated) / 100

    # Time properties - Access times through service_session
    def get_start_time(self):
        """Get booking start time from service_session."""
        if self.service_session:
            return self.service_session.start_time
        return None

    def get_end_time(self):
        """Get booking end time from service_session."""
        if self.service_session:
            return self.service_session.end_time
        return None

    def get_actual_start_time(self):
        """Get actual start time (when session actually started) from service_session."""
        if self.service_session:
            return self.service_session.actual_start_time
        return None

    def get_actual_end_time(self):
        """Get actual end time (when session actually ended) from service_session."""
        if self.service_session:
            return self.service_session.actual_end_time
        return None

    # Booking type properties
    @property
    def is_individual_session(self):
        """Check if this is an individual session booking."""
        return not (self.is_group_session or self.is_package_booking or self.is_course_booking)

    @property
    def is_group_session(self):
        """Check if this is a group session or workshop."""
        return self.service_session is not None

    @property
    def is_package_booking(self):
        """Check if this is a package or bundle booking."""
        # Check order type (new way) or service type (fallback)
        if self.order and self.order.order_type in ['package', 'bundle']:
            return True
        return self.service and (self.service.is_package or self.service.is_bundle)

    @property
    def is_course_booking(self):
        """Check if this is a course booking."""
        return self.service and self.service.is_course

    @property
    def is_parent_booking(self):
        """
        DEPRECATED: parent_booking removed - use order.bookings.count() > 1 instead.
        Check if this booking is part of a multi-booking order (package/bundle).
        """
        if self.order:
            return self.order.bookings.count() > 1
        return False

    @property
    def duration_minutes(self):
        """Calculate booking duration in minutes."""
        actual_start = self.get_actual_start_time()
        actual_end = self.get_actual_end_time()
        start = self.get_start_time()
        end = self.get_end_time()

        if actual_start and actual_end:
            return int((actual_end - actual_start).total_seconds() / 60)
        elif start and end:
            return int((end - start).total_seconds() / 60)
        return 0

    @property
    def is_upcoming(self):
        """Check if booking is upcoming."""
        start = self.get_start_time()
        if not start:
            return False  # Unscheduled bookings are not upcoming
        return start > timezone.now() and self.status == 'confirmed'

    @property
    def is_active(self):
        """Check if booking is currently active."""
        start = self.get_start_time()
        end = self.get_end_time()
        actual_start = self.get_actual_start_time()
        actual_end = self.get_actual_end_time()

        if not start or not end:
            return False  # Unscheduled bookings are not active
        now = timezone.now()
        return (actual_start or start) <= now <= (actual_end or end)

    @property
    def can_be_canceled(self):
        """Check if booking can still be canceled."""
        if self.status in ['completed', 'canceled', 'no_show']:
            return False

        start = self.get_start_time()
        if not start:
            return True  # Unscheduled bookings can always be canceled

        # Check cancellation policy (could be moved to service level)
        min_notice_hours = 24  # This could come from service or practitioner settings
        notice_deadline = start - timezone.timedelta(hours=min_notice_hours)
        return timezone.now() < notice_deadline

    @property
    def room(self):
        """
        Get the video room for this booking via ServiceSession.

        Returns:
            Room instance or None
        """
        # All bookings now have service_session, get room from there
        if self.service_session and hasattr(self.service_session, 'livekit_room'):
            return self.service_session.livekit_room

        return None

    @property
    def can_be_rescheduled(self):
        """Check if booking can be rescheduled."""
        return self.can_be_canceled and self.status not in ['rescheduled']

    @property
    def is_past(self):
        """Check if booking is in the past."""
        end = self.get_end_time()
        if not end:
            return False  # Unscheduled bookings are not past
        return end < timezone.now()
    
    @property
    def notes(self):
        """Alias for client_notes for backward compatibility."""
        return self.client_notes

    # State transition validation
    def can_transition_to(self, new_status):
        """Check if transition to new status is valid."""
        # Define valid transitions
        valid_transitions = {
            'draft': ['pending_payment', 'canceled'],
            'pending_payment': ['confirmed', 'canceled'],
            'confirmed': ['in_progress', 'canceled', 'no_show'],
            'in_progress': ['completed', 'no_show'],
            'completed': [],  # Terminal state
            'canceled': [],  # Terminal state
            'no_show': [],  # Terminal state
        }
        
        current_transitions = valid_transitions.get(self.status, [])
        return new_status in current_transitions
    
    def transition_to(self, new_status, **kwargs):
        """Transition to a new status with validation."""
        if not self.can_transition_to(new_status):
            raise ValidationError(
                f"Cannot transition from '{self.status}' to '{new_status}'"
            )

        old_status = self.status
        self.status = new_status
        self.status_changed_at = timezone.now()

        # Handle status-specific updates
        if new_status == 'confirmed':
            self.confirmed_at = kwargs.get('confirmed_at', timezone.now())
        elif new_status == 'in_progress':
            # Track actual start time on ServiceSession
            if self.service_session and not self.service_session.actual_start_time:
                self.service_session.actual_start_time = kwargs.get('started_at', timezone.now())
                self.service_session.save(update_fields=['actual_start_time'])
        elif new_status == 'completed':
            self.completed_at = kwargs.get('completed_at', timezone.now())
            # Track actual end time on ServiceSession
            if self.service_session and not self.service_session.actual_end_time:
                self.service_session.actual_end_time = self.completed_at
                self.service_session.save(update_fields=['actual_end_time'])
        elif new_status == 'canceled':
            self.canceled_at = kwargs.get('canceled_at', timezone.now())
            self.canceled_by = kwargs.get('canceled_by', 'system')
            self.cancellation_reason = kwargs.get('reason')
        elif new_status == 'no_show':
            self.no_show_at = kwargs.get('no_show_at', timezone.now())

        self.save()
        return old_status
    
    # Booking actions
    def mark_completed(self, completion_time=None):
        """Mark booking as completed."""
        self.transition_to('completed', completed_at=completion_time)

    def mark_no_show(self):
        """Mark booking as no-show."""
        self.transition_to('no_show')
    
    def calculate_refund_amount(self):
        """
        Calculate refund amount based on cancellation policy.

        Returns:
            int: Refund amount in cents (based on credits_allocated)
        """
        start = self.get_start_time()

        # Unscheduled bookings (no start_time) are fully refundable
        if not start:
            return self.credits_allocated

        # If booking hasn't started yet
        if start > timezone.now():
            hours_until_start = (start - timezone.now()).total_seconds() / 3600

            # Full refund if canceled more than 24 hours before
            if hours_until_start >= 24:
                return self.credits_allocated
            # 50% refund if canceled 6-24 hours before
            elif hours_until_start >= 6:
                return int(self.credits_allocated * 0.5)
            # No refund if canceled less than 6 hours before
            else:
                return 0
        else:
            # No refund for already started bookings
            return 0

    def cancel(self, reason=None, canceled_by='client'):
        """Cancel this booking."""
        if not self.can_be_canceled:
            raise ValidationError("This booking cannot be canceled")

        self.transition_to('canceled', reason=reason, canceled_by=canceled_by)

        # Process refund if payment was made
        if self.payment_status == 'paid' and self.credits_allocated > 0:
            from payments.tasks import process_refund_credits
            # Calculate refund amount based on cancellation policy
            refund_amount_cents = self.calculate_refund_amount()
            if refund_amount_cents > 0:
                process_refund_credits.delay(
                    str(self.public_uuid),
                    refund_amount_cents,
                    reason or 'Booking canceled'
                )

        # Cancel related bookings if this is part of a package/bundle order
        if self.order and self.order.bookings.count() > 1:
            for booking in self.order.bookings.exclude(
                status__in=['canceled', 'completed'],
                public_uuid=self.public_uuid
            ):
                booking.cancel(
                    reason=f"Related booking {self.public_uuid} was canceled",
                    canceled_by='system'
                )

    def reschedule(self, new_start_time, new_end_time, rescheduled_by_user=None):
        """
        Reschedule this booking to a new time.

        NEW PARADIGM: Updates the ServiceSession times instead of creating
        a new booking. The booking stays the same, only the session times change.

        Args:
            new_start_time: New start time
            new_end_time: New end time
            rescheduled_by_user: User who initiated the reschedule

        Returns:
            self (the same booking, now with updated session times)
        """
        if not self.can_be_rescheduled:
            raise ValidationError("This booking cannot be rescheduled")

        if not self.service_session:
            raise ValidationError("Cannot reschedule booking without a service_session")

        # Update the ServiceSession times (this handles tracking automatically)
        self.service_session.reschedule(
            new_start_time=new_start_time,
            new_end_time=new_end_time,
            rescheduled_by_user=rescheduled_by_user or self.user
        )

        return self


# Factory methods for complex booking creation
class BookingFactory:
    """Factory class for creating different types of bookings."""
    
    @classmethod
    def create_individual_booking(cls, user, service, practitioner, start_time, end_time, **kwargs):
        """Create a simple individual booking with ServiceSession."""
        from services.models import ServiceSession

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
        # Note: credits_allocated should be set by caller or via Order
        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=practitioner,
            service_session=service_session,
            **kwargs
        )
    
    @classmethod
    def create_course_booking(cls, user, course, order=None, **kwargs):
        """
        Create bookings for a course enrollment (one booking per ServiceSession).

        When a user enrolls in a course:
        1. Payment is processed once
        2. N bookings are created (one per ServiceSession in the course)
        3. All bookings link to the same Order
        4. Each booking can be tracked individually (attendance, completion)

        Args:
            user: The user making the booking
            course: The course Service object
            order: The Order object for this transaction
            **kwargs: Additional booking parameters

        Returns:
            List of created bookings (one per course session)
        """
        if not course.is_course:
            raise ValueError("Service must be a course")

        # Get all ServiceSessions for this course
        service_sessions = course.sessions.filter(
            session_type='course_session'
        ).order_by('sequence_number', 'start_time')

        if not service_sessions.exists():
            raise ValueError("Course must have at least one ServiceSession")

        created_bookings = []
        num_sessions = service_sessions.count()

        # Calculate credits per session (divide order total by number of sessions)
        credits_per_session = 0
        if order and order.total_amount_cents and num_sessions > 0:
            credits_per_session = order.total_amount_cents // num_sessions

        # Create one booking per ServiceSession
        for session in service_sessions:
            booking = Booking.objects.create(
                user=user,
                service=course,
                practitioner=course.primary_practitioner,
                service_session=session,
                order=order,
                credits_allocated=credits_per_session,
                status=kwargs.get('status', 'confirmed'),
                **{k: v for k, v in kwargs.items() if k not in ['status', 'payment_intent_id']}
            )
            created_bookings.append(booking)

        return created_bookings
    
    @classmethod
    def create_package_booking(cls, user, package_service, order=None, **kwargs):
        """
        Create bookings for a package purchase.
        SIMPLIFIED: No longer creates a parent booking - just the session bookings.
        The Order record IS the package purchase record.

        Args:
            user: The user making the booking
            package_service: The Service object with service_type='package'
            order: The Order object for this transaction
            **kwargs: Additional booking parameters

        Returns:
            List of created session bookings
        """
        if not package_service.is_package:
            raise ValueError("Service must be a package type")

        # Count total sessions first
        from services.models import ServiceSession
        total_sessions = sum(rel.quantity for rel in package_service.child_relationships.all())

        # Calculate credits per session
        credits_per_session = 0
        if order and order.total_amount_cents and total_sessions > 0:
            credits_per_session = order.total_amount_cents // total_sessions

        created_bookings = []

        # Create session bookings for each included service
        # These are the ACTUAL bookings (no redundant parent)
        for rel in package_service.child_relationships.all().order_by('order'):
            service = rel.child_service
            for _ in range(rel.quantity):
                # Create draft ServiceSession (will be scheduled later)
                service_session = ServiceSession.objects.create(
                    service=service,
                    session_type='individual',
                    visibility='private',
                    start_time=None,  # Unscheduled
                    end_time=None,
                    duration=service.duration_minutes or 60,
                    max_participants=1,
                    current_participants=0,
                    status='draft',  # Draft until scheduled
                )

                booking = Booking.objects.create(
                    user=user,
                    service=service,
                    practitioner=service.primary_practitioner,
                    service_session=service_session,  # Link to draft session
                    order=order,  # Link to order (not parent_booking)
                    credits_allocated=credits_per_session,
                    status='draft',  # Draft until scheduled
                    **{k: v for k, v in kwargs.items() if k not in ['status', 'payment_intent_id']}
                )
                created_bookings.append(booking)

        # Return first booking for backward compatibility
        # (Some code expects a single booking object)
        return created_bookings[0] if created_bookings else None
    
    @classmethod
    def create_bundle_booking(cls, user, bundle_service, order=None, **kwargs):
        """
        Create bookings for a bundle purchase (multiple sessions of same service).
        SIMPLIFIED: Works like packages - creates N session bookings (no parent).

        Bundle = Buy N sessions of the same service at once
        Example: "10-Class Yoga Pass" creates 10 draft yoga session bookings

        Args:
            user: The user making the booking
            bundle_service: The Service object with service_type='bundle'
            order: The Order object for this transaction
            **kwargs: Additional booking parameters

        Returns:
            The first booking object (for backward compatibility)
        """
        if not bundle_service.is_bundle:
            raise ValueError("Service must be a bundle type")

        # Get the child service (bundles typically have 1 child service repeated N times)
        child_relationships = bundle_service.child_relationships.all()
        if not child_relationships.exists():
            raise ValueError("Bundle must have at least one child service relationship")

        # Get total sessions from bundle.sessions_included
        total_sessions = bundle_service.sessions_included or 1

        # Calculate credits per session
        credits_per_session = 0
        if order and order.total_amount_cents and total_sessions > 0:
            credits_per_session = order.total_amount_cents // total_sessions

        created_bookings = []

        # Create session bookings for each included session
        from services.models import ServiceSession

        for _ in range(total_sessions):
            # Use first child service (bundles usually have just one)
            child_rel = child_relationships.first()
            service = child_rel.child_service

            # Create draft ServiceSession (will be scheduled later)
            service_session = ServiceSession.objects.create(
                service=service,
                session_type='individual',
                visibility='private',
                start_time=None,  # Unscheduled
                end_time=None,
                duration=service.duration_minutes or 60,
                max_participants=1,
                current_participants=0,
                status='draft',  # Draft until scheduled
            )

            booking = Booking.objects.create(
                user=user,
                service=service,  # The actual service (e.g., "Yoga Class")
                practitioner=service.primary_practitioner,
                service_session=service_session,  # Link to draft session
                order=order,
                credits_allocated=credits_per_session,
                status='draft',  # Draft until scheduled
                **{k: v for k, v in kwargs.items() if k not in ['status', 'payment_intent_id']}
            )
            created_bookings.append(booking)

        return created_bookings[0] if created_bookings else None


class BookingReminder(BaseModel):
    """
    Model representing a reminder for a booking.
    Updated to use BaseModel and improved structure.
    """
    REMINDER_TYPE_CHOICES = [
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
        ('webhook', 'Webhook'),
    ]
    
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='reminders')
    reminder_type = models.CharField(max_length=20, choices=REMINDER_TYPE_CHOICES)
    scheduled_time = models.DateTimeField(help_text="When to send the reminder")
    sent_at = models.DateTimeField(blank=True, null=True, help_text="When reminder was actually sent")
    
    # Reminder content
    subject = models.CharField(max_length=255, blank=True, null=True)
    message = models.TextField(blank=True, null=True)
    
    # Delivery tracking
    is_sent = models.BooleanField(default=False)
    send_attempts = models.PositiveIntegerField(default=0)
    last_attempt_at = models.DateTimeField(blank=True, null=True)
    error_message = models.TextField(blank=True, null=True)
    
    class Meta:
        verbose_name = 'Booking Reminder'
        verbose_name_plural = 'Booking Reminders'
        ordering = ['scheduled_time']
        indexes = [
            models.Index(fields=['booking', 'scheduled_time']),
            models.Index(fields=['is_sent', 'scheduled_time']),
            models.Index(fields=['reminder_type']),
        ]

    def __str__(self):
        return f"{self.reminder_type.title()} reminder for {self.booking}"
    
    def mark_sent(self):
        """Mark reminder as sent."""
        self.is_sent = True
        self.sent_at = timezone.now()
        self.save(update_fields=['is_sent', 'sent_at'])
    
    def mark_failed(self, error_message):
        """Mark reminder send attempt as failed."""
        self.send_attempts += 1
        self.last_attempt_at = timezone.now()
        self.error_message = error_message
        self.save(update_fields=['send_attempts', 'last_attempt_at', 'error_message'])


class BookingNote(BaseModel):
    """
    Model for storing notes and communications related to a booking.
    """
    booking = models.ForeignKey(Booking, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='booking_notes')
    content = models.TextField()
    is_private = models.BooleanField(default=False, help_text="Whether note is visible only to practitioners")
    
    class Meta:
        verbose_name = 'Booking Note'
        verbose_name_plural = 'Booking Notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['booking', '-created_at']),
            models.Index(fields=['author']),
        ]
    
    def __str__(self):
        return f"Note by {self.author.email} on {self.booking}"
