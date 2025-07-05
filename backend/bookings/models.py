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
    Model representing a booking between a client and practitioner.
    Updated to use PublicModel and improved structure.
    """
    # Core relationships
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, 
                           related_name='bookings', help_text="Client making the booking")
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE,
                                   related_name='bookings', help_text="Practitioner providing the service")
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE,
                              related_name='bookings', help_text="Service being booked")
    
    # Scheduling
    start_time = models.DateTimeField(help_text="Scheduled start time")
    end_time = models.DateTimeField(help_text="Scheduled end time")
    actual_start_time = models.DateTimeField(blank=True, null=True, help_text="Actual start time")
    actual_end_time = models.DateTimeField(blank=True, null=True, help_text="Actual end time")
    timezone = models.CharField(max_length=50, default='UTC', help_text="Timezone for this booking")
    
    # Status and tracking
    status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='draft')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='unpaid')
    
    # Booking details
    title = models.CharField(max_length=255, blank=True, null=True, help_text="Custom booking title")
    description = models.TextField(blank=True, null=True, help_text="Booking description or notes")
    client_notes = models.TextField(blank=True, null=True, help_text="Notes from the client")
    practitioner_notes = models.TextField(blank=True, null=True, help_text="Private notes from practitioner")
    
    # Location and delivery
    location = models.ForeignKey('utils.Address', on_delete=models.SET_NULL, 
                               blank=True, null=True, related_name='bookings',
                               help_text="Physical location if in-person")
    meeting_url = models.URLField(blank=True, null=True, help_text="Virtual meeting link")
    meeting_id = models.CharField(max_length=100, blank=True, null=True, help_text="Meeting ID or room number")
    
    # Pricing and payment (in cents)
    price_charged_cents = models.IntegerField(
        help_text="Amount charged for this booking in cents")
    discount_amount_cents = models.IntegerField(
        default=0,
        help_text="Discount applied in cents")
    final_amount_cents = models.IntegerField(
        help_text="Final amount after discounts in cents")
    
    # Historical snapshot data (preserves what user booked/paid for)
    service_name_snapshot = models.CharField(max_length=255, blank=True, 
                                           help_text="Service name at time of booking")
    service_description_snapshot = models.TextField(blank=True,
                                                  help_text="Service description at time of booking")
    practitioner_name_snapshot = models.CharField(max_length=255, blank=True,
                                                help_text="Practitioner name at time of booking")
    service_duration_snapshot = models.PositiveIntegerField(blank=True, null=True,
                                                          help_text="Duration in minutes at time of booking")
    
    # Package/Bundle snapshot data
    package_name_snapshot = models.CharField(max_length=255, blank=True,
                                           help_text="Package name at time of booking")
    package_contents_snapshot = models.JSONField(blank=True, null=True,
                                               help_text="What was included in package at time of booking")
    bundle_name_snapshot = models.CharField(max_length=255, blank=True,
                                          help_text="Bundle name at time of booking")
    bundle_sessions_snapshot = models.PositiveIntegerField(blank=True, null=True,
                                                         help_text="Total sessions in bundle at time of booking")
    
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
    started_at = models.DateTimeField(blank=True, null=True, help_text="When service started")
    
    rescheduled_from = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True,
                                       related_name='rescheduled_to_bookings',
                                       help_text="Original booking this was rescheduled from")
    
    # Hierarchical bookings (packages, bundles, courses)
    parent_booking = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True,
                                     related_name='child_bookings',
                                     help_text="Parent booking for packages/bundles")
    
    # Package and Bundle tracking
    is_package_purchase = models.BooleanField(default=False, help_text="Whether this is a package purchase")
    is_bundle_purchase = models.BooleanField(default=False, help_text="Whether this is a bundle purchase")
    
    # Group bookings and sessions
    service_session = models.ForeignKey('services.ServiceSession', on_delete=models.SET_NULL, 
                                      blank=True, null=True, related_name='bookings',
                                      help_text="Specific session for workshops/courses")
    max_participants = models.PositiveIntegerField(default=1, help_text="Max participants for this booking")
    
    # External integrations
    room = models.ForeignKey('rooms.Room', on_delete=models.SET_NULL, blank=True, null=True,
                           related_name='bookings', help_text="Video room for virtual sessions")
    payment_transaction = models.ForeignKey('payments.UserCreditTransaction', on_delete=models.SET_NULL,
                                          blank=True, null=True, related_name='bookings')
    
    # Metadata for tracking various flags and data
    metadata = models.JSONField(default=dict, blank=True, 
                              help_text="Additional data like reminder flags, custom fields, etc.")

    class Meta:
        verbose_name = 'Booking'
        verbose_name_plural = 'Bookings'
        ordering = ['-start_time']
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['practitioner', 'start_time']),
            models.Index(fields=['service', 'status']),
            models.Index(fields=['status', 'start_time']),
            models.Index(fields=['payment_status']),
            models.Index(fields=['parent_booking']),
            models.Index(fields=['service_session']),
            models.Index(fields=['start_time', 'end_time']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(start_time__lt=models.F('end_time')),
                name='booking_valid_time_range'
            ),
            models.CheckConstraint(
                check=models.Q(final_amount_cents__gte=0),
                name='booking_non_negative_amount'
            ),
        ]

    def __str__(self):
        return f"Booking #{self.id}: {self.service.name if self.service else 'Package/Bundle'} - {self.user.email}"

    def save(self, *args, **kwargs):
        """Override save to capture snapshot data on creation."""
        # Auto-calculate final amount if not set
        if not self.final_amount_cents:
            self.final_amount_cents = self.price_charged_cents - self.discount_amount_cents
        
        # Set price from service if not set
        if not self.price_charged_cents and self.service:
            self.price_charged_cents = self.service.price_cents
        
        if not self.pk:  # Only on creation
            # Capture service snapshot
            if self.service:
                self.service_name_snapshot = self.service.name
                self.service_description_snapshot = self.service.description
                self.service_duration_snapshot = self.service.duration_minutes
            
            # Capture practitioner snapshot
            if self.practitioner:
                self.practitioner_name_snapshot = self.practitioner.user.get_full_name() or self.practitioner.display_name
            
            # Capture package/bundle snapshot from service
            if self.service:
                if self.service.is_package:
                    self.package_name_snapshot = self.service.name
                    # Store package contents as JSON
                    contents = []
                    for rel in self.service.child_relationships.all():
                        if rel.child_service:
                            contents.append({
                                'service_name': rel.child_service.name,
                                'quantity': rel.quantity,
                                'price_cents': rel.child_service.price_cents
                            })
                    self.package_contents_snapshot = contents
                elif self.service.is_bundle:
                    self.bundle_name_snapshot = self.service.name
                    self.bundle_sessions_snapshot = self.service.total_sessions
        
        self.clean()
        super().save(*args, **kwargs)

    def clean(self):
        """Validate booking data."""
        super().clean()
        
        # Validate time range
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
        
        # Validate pricing
        expected_price_cents = self.price_charged_cents - self.discount_amount_cents
        if self.final_amount_cents != expected_price_cents:
            raise ValidationError("Final amount doesn't match price calculation")

    # Price properties in dollars
    @property
    def price_charged(self):
        """Get price charged in dollars."""
        return Decimal(self.price_charged_cents) / 100
    
    @property
    def discount_amount(self):
        """Get discount amount in dollars."""
        return Decimal(self.discount_amount_cents) / 100
    
    @property
    def final_amount(self):
        """Get final amount in dollars."""
        return Decimal(self.final_amount_cents) / 100
    
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
        return self.is_package_purchase or self.is_bundle_purchase or (self.service and (self.service.is_package or self.service.is_bundle))

    @property
    def is_course_booking(self):
        """Check if this is a course booking."""
        return self.service and self.service.is_course

    @property
    def is_parent_booking(self):
        """Check if this booking has child bookings."""
        return self.child_bookings.exists()

    @property
    def duration_minutes(self):
        """Calculate booking duration in minutes."""
        if self.actual_start_time and self.actual_end_time:
            return int((self.actual_end_time - self.actual_start_time).total_seconds() / 60)
        elif self.start_time and self.end_time:
            return int((self.end_time - self.start_time).total_seconds() / 60)
        return 0

    @property
    def is_upcoming(self):
        """Check if booking is upcoming."""
        return self.start_time > timezone.now() and self.status == 'confirmed'

    @property
    def is_active(self):
        """Check if booking is currently active."""
        now = timezone.now()
        return (self.actual_start_time or self.start_time) <= now <= (self.actual_end_time or self.end_time)

    @property
    def can_be_canceled(self):
        """Check if booking can still be canceled."""
        if self.status in ['completed', 'canceled', 'no_show']:
            return False
        
        # Check cancellation policy (could be moved to service level)
        min_notice_hours = 24  # This could come from service or practitioner settings
        notice_deadline = self.start_time - timezone.timedelta(hours=min_notice_hours)
        return timezone.now() < notice_deadline

    @property
    def can_be_rescheduled(self):
        """Check if booking can be rescheduled."""
        return self.can_be_canceled and self.status not in ['rescheduled']
    
    @property
    def is_past(self):
        """Check if booking is in the past."""
        return self.end_time < timezone.now()
    
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
            self.started_at = kwargs.get('started_at', timezone.now())
            if not self.actual_start_time:
                self.actual_start_time = self.started_at
        elif new_status == 'completed':
            self.completed_at = kwargs.get('completed_at', timezone.now())
            if not self.actual_end_time:
                self.actual_end_time = self.completed_at
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

    def cancel(self, reason=None, canceled_by='client'):
        """Cancel this booking."""
        if not self.can_be_canceled:
            raise ValidationError("This booking cannot be canceled")
        
        self.transition_to('canceled', reason=reason, canceled_by=canceled_by)
        
        # Cancel child bookings if this is a parent
        if self.is_parent_booking:
            for child in self.child_bookings.exclude(status__in=['canceled', 'completed']):
                child.cancel(
                    reason=f"Parent booking {self.public_uuid} was canceled", 
                    canceled_by='system'
                )

    def reschedule(self, new_start_time, new_end_time):
        """Reschedule this booking to a new time."""
        if not self.can_be_rescheduled:
            raise ValidationError("This booking cannot be rescheduled")
        
        # Create new booking with new time
        new_booking = Booking.objects.create(
            user=self.user,
            practitioner=self.practitioner,
            service=self.service,
            start_time=new_start_time,
            end_time=new_end_time,
            price_charged_cents=self.price_charged_cents,
            discount_amount_cents=self.discount_amount_cents,
            final_amount_cents=self.final_amount_cents,
            description=self.description,
            client_notes=self.client_notes,
            location=self.location,
            rescheduled_from=self,
            status='confirmed'
        )
        
        # Mark original as rescheduled
        self.status = 'rescheduled'
        self.save(update_fields=['status'])
        
        return new_booking


# Factory methods for complex booking creation
class BookingFactory:
    """Factory class for creating different types of bookings."""
    
    @classmethod
    def create_individual_booking(cls, user, service, practitioner, start_time, end_time, **kwargs):
        """Create a simple individual booking."""
        return Booking.objects.create(
            user=user,
            service=service,
            practitioner=practitioner,
            start_time=start_time,
            end_time=end_time,
            price_charged_cents=service.price_cents,
            final_amount_cents=service.price_cents,
            **kwargs
        )
    
    @classmethod
    def create_course_booking(cls, user, course, **kwargs):
        """
        Create a booking for a course and register user as participant in all sessions.
        
        Args:
            user: The user making the booking
            course: The course Service object
            **kwargs: Additional booking parameters
            
        Returns:
            The booking object
        """
        if not course.is_course:
            raise ValueError("Service must be a course")
            
        # Create main course booking (no specific time - determined by sessions)
        booking = Booking.objects.create(
            user=user,
            service=course,
            practitioner=course.primary_practitioner,
            start_time=kwargs.get('start_time', timezone.now()),  # Placeholder
            end_time=kwargs.get('end_time', timezone.now() + timezone.timedelta(hours=1)),  # Placeholder
            price_charged_cents=course.price_cents,
            final_amount_cents=course.price_cents,
            status=kwargs.get('status', 'confirmed'),
            max_participants=course.max_participants,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status', 'payment_intent_id']}
        )
        
        return booking
    
    @classmethod
    def create_package_booking(cls, user, package_service, **kwargs):
        """
        Create a booking for a package with child bookings for included services.
        
        Args:
            user: The user making the booking  
            package_service: The Service object with service_type='package'
            **kwargs: Additional booking parameters
            
        Returns:
            The parent booking object
        """
        if not package_service.is_package:
            raise ValueError("Service must be a package type")
            
        # Create parent booking
        parent_booking = Booking.objects.create(
            user=user,
            service=package_service,
            practitioner=package_service.primary_practitioner,
            start_time=kwargs.get('start_time', timezone.now()),  # Placeholder
            end_time=kwargs.get('end_time', timezone.now() + timezone.timedelta(hours=1)),  # Placeholder
            price_charged_cents=package_service.price_cents,
            final_amount_cents=package_service.price_cents,
            status=kwargs.get('status', 'confirmed'),
            is_package_purchase=True,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status', 'payment_intent_id']}
        )
        
        # Create child bookings for each included service
        for rel in package_service.child_relationships.all().order_by('order'):
            service = rel.child_service
            for _ in range(rel.quantity):
                Booking.objects.create(
                    user=user,
                    service=service,
                    practitioner=service.primary_practitioner,
                    parent_booking=parent_booking,
                    price_charged_cents=0,  # Included in parent
                    final_amount_cents=0,
                    status='draft',  # Draft until scheduled
                    start_time=timezone.now(),  # Placeholder
                    end_time=timezone.now() + timezone.timedelta(minutes=service.duration_minutes)
                )
        
        return parent_booking
    
    @classmethod
    def create_bundle_booking(cls, user, bundle_service, **kwargs):
        """
        Create a booking for a bundle purchase (creates credit balance).
        
        Args:
            user: The user making the booking  
            bundle_service: The Service object with service_type='bundle'
            **kwargs: Additional booking parameters
            
        Returns:
            The bundle booking object
        """
        if not bundle_service.is_bundle:
            raise ValueError("Service must be a bundle type")
            
        # Create bundle purchase booking
        bundle_booking = Booking.objects.create(
            user=user,
            service=bundle_service,
            practitioner=bundle_service.primary_practitioner,
            start_time=kwargs.get('start_time', timezone.now()),  # Placeholder
            end_time=kwargs.get('end_time', timezone.now() + timezone.timedelta(hours=1)),  # Placeholder
            price_charged_cents=bundle_service.price_cents,
            final_amount_cents=bundle_service.price_cents,
            status=kwargs.get('status', 'confirmed'),
            is_bundle_purchase=True,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status', 'payment_intent_id']}
        )
        
        return bundle_booking


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
