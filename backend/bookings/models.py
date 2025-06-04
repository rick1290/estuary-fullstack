from django.db import models
from django.utils import timezone


class Booking(models.Model):
    """
    Model representing a booking between a client and practitioner.
    """
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('confirmed', 'Confirmed'),
        ('completed', 'Completed'),
        ('canceled', 'Canceled'),
        ('no_show', 'No Show'),
    )
    
    CANCELED_BY_CHOICES = (
        ('client', 'Client'),
        ('practitioner', 'Practitioner'),
    )
    
    id = models.BigAutoField(primary_key=True)
    practitioner = models.ForeignKey('practitioners.Practitioner', models.DO_NOTHING, blank=True, null=True)
    user = models.ForeignKey('users.User', models.DO_NOTHING, related_name='booking_user_set', blank=True, null=True)
    start_time = models.DateTimeField(blank=True, null=True)
    end_time_expected = models.DateTimeField(blank=True, null=True)
    end_time = models.DateTimeField(blank=True, null=True)
    is_canceled = models.BooleanField(blank=True, null=True)
    cancellation_reason = models.TextField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_rescheduled = models.BooleanField(blank=True, null=True)
    service = models.ForeignKey('services.Service', models.DO_NOTHING, blank=True, null=True)
    note = models.TextField(blank=True, null=True)
    location = models.TextField(blank=True, null=True)
    title = models.TextField(blank=True, null=True)
    credit = models.ForeignKey('payments.CreditTransaction', models.DO_NOTHING, blank=True, null=True)
    parent_service = models.ForeignKey('services.Service', models.DO_NOTHING, related_name='booking_parent_service_set', blank=True, null=True)
    credit_value = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='confirmed')
    completed_at = models.DateTimeField(blank=True, null=True)
    # Removed redundant daily_room_id field as we're using the room ForeignKey
    practitioner_note = models.TextField(blank=True, null=True)
    canceled_by = models.CharField(max_length=20, choices=CANCELED_BY_CHOICES, blank=True, null=True)
    canceled_date = models.DateTimeField(blank=True, null=True)
    cancel_reason = models.TextField(blank=True, null=True)
    room = models.ForeignKey('rooms.Room', models.DO_NOTHING, blank=True, null=True)
    is_group = models.BooleanField(blank=True, null=True)
    
    # For packages/bundles/courses - links child bookings to parent booking
    parent_booking = models.ForeignKey('self', models.CASCADE, null=True, blank=True, related_name='child_bookings')
    
    # For workshops/courses - links to specific service session
    service_session = models.ForeignKey('services.ServiceSession', models.SET_NULL, null=True, blank=True)
    
    # Many-to-many relationships
    topics = models.ManyToManyField('practitioners.Topic', blank=True, related_name='bookings')
    
    # These fields are now in SessionParticipant but kept for backward compatibility
    check_in_time = models.DateTimeField(blank=True, null=True)
    check_out_time = models.DateTimeField(blank=True, null=True)
    attendance_duration = models.IntegerField(blank=True, null=True)

    class Meta:
        # Using Django's default naming convention (bookings_booking)
        db_table_comment = 'Booking for session and bundle'
        indexes = [
            models.Index(fields=['user', 'status']),
            models.Index(fields=['practitioner', 'start_time']),
            models.Index(fields=['service_session']),
        ]

    def __str__(self):
        return f"Booking {self.id} - {self.practitioner} and {self.user}"
    
    @property
    def is_workshop_booking(self):
        """Check if this is a booking for a workshop/group session"""
        return self.service_session is not None
    
    @property
    def is_course_booking(self):
        """Check if this is a booking for a course"""
        return self.service and self.service.is_course
    
    @property
    def is_package_booking(self):
        """Check if this is a booking for a package or bundle"""
        return self.service and (self.service.is_package or self.service.is_bundle)
    
    @property
    def is_parent_booking(self):
        """Check if this is a parent booking with child bookings"""
        return self.child_bookings.exists()
    
    @property
    def session_participants(self):
        """
        Get all session participants associated with this booking.
        This is particularly useful for course bookings.
        """
        from apps.services.models import SessionParticipant
        return SessionParticipant.objects.filter(booking=self)
    
    @property
    def sessions(self):
        """
        Get all service sessions associated with this booking.
        For course bookings, this returns all sessions the user is registered for.
        """
        if self.is_course_booking:
            from apps.services.models import ServiceSession
            return ServiceSession.objects.filter(participants__booking=self).distinct()
        elif self.service_session:
            return [self.service_session]
        return []
    
    @property
    def is_individual_session(self):
        """Check if this is a booking for an individual session"""
        return not (self.is_workshop_booking or self.is_course_booking or self.is_parent_booking)
    
    def mark_completed(self):
        """Mark this booking as completed"""
        self.status = 'completed'
        self.completed_at = timezone.now()
        self.save()
    
    def cancel(self, reason=None, canceled_by=None):
        """Cancel this booking"""
        self.status = 'canceled'
        self.is_canceled = True
        self.canceled_date = timezone.now()
        self.cancel_reason = reason
        self.canceled_by = canceled_by
        self.save()
        
        # Cancel any child bookings if this is a parent booking
        if self.is_parent_booking:
            for child in self.child_bookings.all():
                child.cancel(reason=f"Parent booking {self.id} was canceled", canceled_by=canceled_by)
    
    def get_participants(self):
        """Get all participants for this booking"""
        if self.is_workshop_booking or self.is_course_booking:
            from services.models import SessionParticipant
            return SessionParticipant.objects.filter(booking=self)
        return None
    
    @classmethod
    def create_course_booking(cls, user, course, **kwargs):
        """
        Create a booking for a course and register the user as a participant in all sessions.
        
        Instead of creating individual child bookings for each session, this method creates
        a single booking for the course and uses the SessionParticipant model to track
        attendance for each session. This is more efficient for courses with many participants.
        
        Args:
            user: The user making the booking
            course: The course Service object
            **kwargs: Additional booking parameters
            
        Returns:
            The booking object
        """
        if not course.is_course:
            raise ValueError("Service must be a course")
            
        # Create a single booking for the course
        booking = cls.objects.create(
            user=user,
            service=course,
            # Use the primary practitioner from the course or the first practitioner
            practitioner=kwargs.get('practitioner') or course.practitioner or course.practitioners.first(),
            status=kwargs.get('status', 'confirmed'),
            is_group=True
        )
        
        # Register the user as a participant in all sessions of all workshops in the course
        from apps.services.models import ServiceSession, SessionParticipant
        
        # Get all child services (workshops) in the course
        for relationship in course.child_relationships.all().order_by('order'):
            child_service = relationship.child_service
            
            # For each session of the child service
            for session in child_service.sessions.all():
                # Register the user as a participant in this session
                SessionParticipant.objects.create(
                    session=session,
                    user=user,
                    booking=booking,
                    attendance_status='registered'
                )
        
        return booking
    
    @classmethod
    def create_bundle_or_package_booking(cls, user, service, **kwargs):
        """
        Create a booking for a bundle or package, including child bookings for all services.
        
        Args:
            user: The user making the booking
            service: The bundle or package Service object
            **kwargs: Additional booking parameters
            
        Returns:
            The parent booking object
        """
        if not (service.is_package or service.is_bundle):
            raise ValueError("Service must be a package or bundle")
            
        # Create the parent booking
        parent_booking = cls.objects.create(
            user=user,
            service=service,
            # Use the primary practitioner from the service or the first practitioner
            practitioner=kwargs.get('practitioner') or service.practitioner or service.practitioners.first(),
            status=kwargs.get('status', 'confirmed')
        )
        
        # Create child bookings for each service in the bundle/package
        for relationship in service.child_relationships.all().order_by('order'):
            child_service = relationship.child_service
            
            # Create a booking for each quantity of the service
            for i in range(relationship.quantity):
                # Create a booking for this service (without specific time yet)
                child_booking = cls.objects.create(
                    user=user,
                    service=child_service,
                    practitioner=child_service.practitioner or child_service.practitioners.first(),
                    parent_booking=parent_booking,
                    status='pending',  # Pending until scheduled
                )
        
        return parent_booking


class BookingReminders(models.Model):
    """
    Model representing a reminder for a booking.
    """
    REMINDER_TYPES = (
        ('email', 'Email'),
        ('sms', 'SMS'),
        ('push', 'Push Notification'),
    )
    
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    booking = models.ForeignKey(Booking, models.CASCADE, related_name='reminders')
    type = models.CharField(max_length=20, choices=REMINDER_TYPES)
    scheduled_time = models.DateTimeField()
    sent_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        # Using Django's default naming convention (bookings_bookingreminders)
        indexes = [
            models.Index(fields=['booking', 'scheduled_time']),
        ]

    def __str__(self):
        return f"Reminder for {self.booking}"
