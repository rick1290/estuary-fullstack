from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from utils.models import BaseModel, PublicModel
from decimal import Decimal

# Booking status choices
BOOKING_STATUS_CHOICES = [
    ('draft', 'Draft'),
    ('pending', 'Pending Approval'),
    ('confirmed', 'Confirmed'),
    ('in_progress', 'In Progress'),
    ('completed', 'Completed'),
    ('canceled', 'Canceled'),
    ('no_show', 'No Show'),
    ('rescheduled', 'Rescheduled'),
]

# Cancellation source choices
CANCELED_BY_CHOICES = [
    ('client', 'Client'),
    ('practitioner', 'Practitioner'),
    ('system', 'System'),
    ('admin', 'Admin'),
]

# Payment status choices
PAYMENT_STATUS_CHOICES = [
    ('pending', 'Pending'),
    ('paid', 'Paid'),
    ('partially_paid', 'Partially Paid'),
    ('refunded', 'Refunded'),
    ('failed', 'Failed'),
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
    status = models.CharField(max_length=20, choices=BOOKING_STATUS_CHOICES, default='pending')
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='pending')
    
    # Booking details
    title = models.CharField(max_length=255, blank=True, null=True, help_text="Custom booking title")
    description = models.TextField(blank=True, null=True, help_text="Booking description or notes")
    client_notes = models.TextField(blank=True, null=True, help_text="Notes from the client")
    practitioner_notes = models.TextField(blank=True, null=True, help_text="Private notes from practitioner")
    
    # Location and delivery
    location = models.ForeignKey('utils.Location', on_delete=models.SET_NULL, 
                               blank=True, null=True, related_name='bookings',
                               help_text="Physical location if in-person")
    meeting_url = models.URLField(blank=True, null=True, help_text="Virtual meeting link")
    meeting_id = models.CharField(max_length=100, blank=True, null=True, help_text="Meeting ID or room number")
    
    # Pricing and payment
    price_charged = models.DecimalField(max_digits=10, decimal_places=2, 
                                      help_text="Amount charged for this booking")
    discount_amount = models.DecimalField(max_digits=10, decimal_places=2, default=Decimal('0.00'),
                                        help_text="Discount applied")
    final_amount = models.DecimalField(max_digits=10, decimal_places=2,
                                     help_text="Final amount after discounts")
    
    # Completion tracking
    completed_at = models.DateTimeField(blank=True, null=True)
    no_show_at = models.DateTimeField(blank=True, null=True)
    
    # Cancellation and rescheduling
    canceled_at = models.DateTimeField(blank=True, null=True)
    canceled_by = models.CharField(max_length=20, choices=CANCELED_BY_CHOICES, blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    
    rescheduled_from = models.ForeignKey('self', on_delete=models.SET_NULL, blank=True, null=True,
                                       related_name='rescheduled_to_bookings',
                                       help_text="Original booking this was rescheduled from")
    
    # Hierarchical bookings (packages, bundles, courses)
    parent_booking = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True,
                                     related_name='child_bookings',
                                     help_text="Parent booking for packages/bundles")
    
    # Package and Bundle references
    package = models.ForeignKey('services.Package', on_delete=models.SET_NULL, blank=True, null=True,
                              related_name='bookings', help_text="Package this booking is for")
    bundle = models.ForeignKey('services.Bundle', on_delete=models.SET_NULL, blank=True, null=True,
                             related_name='bookings', help_text="Bundle this booking is for")
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
    payment_transaction = models.ForeignKey('payments.CreditTransaction', on_delete=models.SET_NULL,
                                          blank=True, null=True, related_name='bookings')

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
                check=models.Q(final_amount__gte=0),
                name='booking_non_negative_amount'
            ),
        ]

    def __str__(self):
        return f"Booking #{self.id}: {self.service.name} - {self.user.email}"

    def clean(self):
        """Validate booking data."""
        super().clean()
        
        # Validate time range
        if self.start_time and self.end_time and self.start_time >= self.end_time:
            raise ValidationError("Start time must be before end time")
        
        # Validate pricing
        expected_price = self.price_charged - self.discount_amount
        if abs(self.final_amount - expected_price) > Decimal('0.01'):
            raise ValidationError("Final amount doesn't match price calculation")
    
    def save(self, *args, **kwargs):
        # Auto-calculate final amount if not set
        if not self.final_amount:
            self.final_amount = self.price_charged - self.discount_amount
        
        # Set price from service if not set
        if not self.price_charged and self.service:
            self.price_charged = self.service.price
            
        self.clean()
        super().save(*args, **kwargs)

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
        return self.is_package_purchase or self.is_bundle_purchase or bool(self.package) or bool(self.bundle)

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
        return self.start_time > timezone.now() and self.status in ['confirmed', 'pending']

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

    # Booking actions
    def mark_completed(self, completion_time=None):
        """Mark booking as completed."""
        self.status = 'completed'
        self.completed_at = completion_time or timezone.now()
        if not self.actual_end_time:
            self.actual_end_time = self.completed_at
        self.save(update_fields=['status', 'completed_at', 'actual_end_time'])

    def mark_no_show(self):
        """Mark booking as no-show."""
        self.status = 'no_show'
        self.no_show_at = timezone.now()
        self.save(update_fields=['status', 'no_show_at'])

    def cancel(self, reason=None, canceled_by='client'):
        """Cancel this booking."""
        if not self.can_be_canceled:
            raise ValidationError("This booking cannot be canceled")
        
        self.status = 'canceled'
        self.canceled_at = timezone.now()
        self.cancellation_reason = reason
        self.canceled_by = canceled_by
        self.save(update_fields=['status', 'canceled_at', 'cancellation_reason', 'canceled_by'])
        
        # Cancel child bookings if this is a parent
        if self.is_parent_booking:
            for child in self.child_bookings.filter(status__in=['pending', 'confirmed']):
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
            price_charged=self.price_charged,
            discount_amount=self.discount_amount,
            final_amount=self.final_amount,
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
            price_charged=service.price,
            final_amount=service.price,
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
            price_charged=course.price,
            final_amount=course.price,
            status=kwargs.get('status', 'confirmed'),
            max_participants=course.max_participants,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status']}
        )
        
        return booking
    
    @classmethod
    def create_package_booking(cls, user, package, **kwargs):
        """
        Create a booking for a package with child bookings for included services.
        
        Args:
            user: The user making the booking  
            package: The Package object
            **kwargs: Additional booking parameters
            
        Returns:
            The parent booking object
        """
        from services.models import Package
        
        if not isinstance(package, Package):
            raise ValueError("Must provide a Package object")
            
        # Create parent booking
        parent_booking = Booking.objects.create(
            user=user,
            package=package,
            practitioner=package.practitioner,
            start_time=kwargs.get('start_time', timezone.now()),  # Placeholder
            end_time=kwargs.get('end_time', timezone.now() + timezone.timedelta(hours=1)),  # Placeholder
            price_charged=package.price,
            final_amount=package.price,
            status=kwargs.get('status', 'confirmed'),
            is_package_purchase=True,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status']}
        )
        
        # Create child bookings for each included service
        for package_service in package.package_services.all().order_by('order'):
            service = package_service.service
            for _ in range(package_service.quantity):
                Booking.objects.create(
                    user=user,
                    service=service,
                    practitioner=service.primary_practitioner,
                    parent_booking=parent_booking,
                    price_charged=Decimal('0.00'),  # Included in parent
                    final_amount=Decimal('0.00'),
                    status='pending',  # Pending until scheduled
                    start_time=timezone.now(),  # Placeholder
                    end_time=timezone.now() + timezone.timedelta(minutes=service.duration_minutes)
                )
        
        return parent_booking
    
    @classmethod
    def create_bundle_booking(cls, user, bundle, **kwargs):
        """
        Create a booking for a bundle purchase (creates credit balance).
        
        Args:
            user: The user making the booking  
            bundle: The Bundle object
            **kwargs: Additional booking parameters
            
        Returns:
            The bundle booking object
        """
        from services.models import Bundle
        
        if not isinstance(bundle, Bundle):
            raise ValueError("Must provide a Bundle object")
            
        # Create bundle purchase booking
        bundle_booking = Booking.objects.create(
            user=user,
            service=bundle.service,
            bundle=bundle,
            practitioner=bundle.service.primary_practitioner,
            start_time=kwargs.get('start_time', timezone.now()),  # Placeholder
            end_time=kwargs.get('end_time', timezone.now() + timezone.timedelta(hours=1)),  # Placeholder
            price_charged=bundle.price,
            final_amount=bundle.price,
            status=kwargs.get('status', 'confirmed'),
            is_bundle_purchase=True,
            **{k: v for k, v in kwargs.items() if k not in ['start_time', 'end_time', 'status']}
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
