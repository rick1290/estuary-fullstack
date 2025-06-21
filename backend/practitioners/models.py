from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Q, F, Avg, Count, Min, Max
from django.utils import timezone
from users.models import User
from utils.models import BaseModel, PublicModel
import uuid
import pytz

# Common timezones for dropdown
TIMEZONE_CHOICES = [(tz, tz) for tz in pytz.common_timezones]

# Practitioner status choices
PRACTITIONER_STATUS_CHOICES = [
    ('active', 'Active'),
    ('inactive', 'Inactive'),
    ('vacation', 'On Vacation'),
    ('pending', 'Pending Approval'),
    ('suspended', 'Suspended'),
    ('rejected', 'Rejected'),
]


class Practitioner(PublicModel):
    """
    Model representing a practitioner in the marketplace.
    Extends the User model with practitioner-specific fields.
    Uses PublicModel for both internal UUID and public API exposure.
    """
    user = models.OneToOneField('users.User', on_delete=models.CASCADE, related_name='practitioner_profile')
    
    # Verification and status
    is_verified = models.BooleanField(default=False, help_text="Whether practitioner is verified by admin")
    practitioner_status = models.CharField(max_length=20, choices=PRACTITIONER_STATUS_CHOICES, default='pending')
    featured = models.BooleanField(default=False, help_text="Whether to feature this practitioner")
    
    # Professional details
    display_name = models.CharField(max_length=255, blank=True, null=True, 
                                  help_text="Professional display name shown to clients")
    slug = models.SlugField(max_length=255, unique=True, help_text="URL-friendly version of name")
    professional_title = models.CharField(max_length=255, blank=True, null=True,
                                        help_text="Professional title/designation")
    bio = models.TextField(blank=True, null=True, max_length=2000,
                          help_text="Professional biography and description")
    quote = models.TextField(blank=True, null=True, max_length=500,
                           help_text="Inspirational quote or motto")
    
    # Media
    profile_image_url = models.URLField(blank=True, null=True, 
                                      help_text="URL to practitioner's profile image")
    profile_video_url = models.URLField(blank=True, null=True,
                                      help_text="URL to practitioner's intro video")
    
    # Experience and qualifications
    years_of_experience = models.PositiveIntegerField(blank=True, null=True,
                                                    help_text="Years of professional experience")
    
    # Business settings
    buffer_time = models.PositiveIntegerField(default=15, 
                                            help_text="Buffer time between sessions in minutes")
    next_available_date = models.DateTimeField(blank=True, null=True,
                                             help_text="Next available booking date")
    
    # Onboarding
    is_onboarded = models.BooleanField(default=False)
    onboarding_step = models.PositiveSmallIntegerField(default=1)
    onboarding_completed_at = models.DateTimeField(blank=True, null=True)
    
    # Many-to-many relationships
    specializations = models.ManyToManyField('Specialize', related_name='practitioners', blank=True)
    styles = models.ManyToManyField('Style', related_name='practitioners', blank=True)
    topics = models.ManyToManyField('Topic', related_name='practitioners', blank=True)
    modalities = models.ManyToManyField('common.Modality', related_name='practitioners', blank=True)
    certifications = models.ManyToManyField('Certification', related_name='practitioners', blank=True)
    educations = models.ManyToManyField('Education', related_name='practitioners', blank=True)
    questions = models.ManyToManyField('Question', related_name='practitioners', blank=True)
    
    # Location (link to consolidated location model)
    primary_location = models.ForeignKey('locations.PractitionerLocation', on_delete=models.SET_NULL,
                                       blank=True, null=True, related_name='primary_practitioners')
    
    class Meta:
        verbose_name = 'Practitioner'
        verbose_name_plural = 'Practitioners'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_verified', 'practitioner_status']),
            models.Index(fields=['featured']),
            models.Index(fields=['practitioner_status']),
            models.Index(fields=['user']),
            models.Index(fields=['next_available_date']),
        ]
    
    def __str__(self):
        if self.display_name:
            return self.display_name
        return f"{self.user.first_name} {self.user.last_name}".strip() or self.user.email
    
    @property
    def full_name(self):
        """Return practitioner's full name."""
        return self.user.full_name
    
    @property
    def average_rating(self):
        """Calculate average rating from reviews."""
        from reviews.models import Review
        result = Review.objects.filter(
            practitioner=self,
            is_published=True
        ).aggregate(avg_rating=Avg('rating'))
        return round(result['avg_rating'] or 0, 2)
    
    @property 
    def total_reviews(self):
        """Count total published reviews."""
        from reviews.models import Review
        return Review.objects.filter(
            practitioner=self,
            is_published=True
        ).count()
    
    @property
    def total_services(self):
        """Count total active services."""
        return self.primary_services.filter(is_active=True).count()
    
    @property
    def price_range(self):
        """Get min and max price from active services."""
        result = self.primary_services.filter(is_active=True).aggregate(
            min_price=Min('price_cents'),
            max_price=Max('price_cents')
        )
        return {
            'min': result['min_price'],
            'max': result['max_price']
        }
    
    @property
    def completed_sessions_count(self):
        """Count completed bookings."""
        return self.bookings.filter(status='completed').count()
    
    @property
    def cancellation_rate(self):
        """Calculate cancellation rate."""
        total_bookings = self.bookings.count()
        if total_bookings == 0:
            return 0
        canceled_bookings = self.bookings.filter(status='canceled').count()
        return round((canceled_bookings / total_bookings) * 100, 2)
    
    @property
    def is_active(self):
        """Check if practitioner is active and available."""
        return self.practitioner_status == 'active' and self.is_verified
    
    def mark_onboarding_complete(self):
        """Mark onboarding as completed."""
        self.is_onboarded = True
        self.onboarding_completed_at = timezone.now()
        self.save(update_fields=['is_onboarded', 'onboarding_completed_at'])
    
    def save(self, *args, **kwargs):
        """Override save to auto-generate slug if not provided."""
        if not self.slug:
            from django.utils.text import slugify
            # Use display_name if available, otherwise use user's full name
            if self.display_name:
                base_slug = slugify(self.display_name)
            else:
                base_slug = slugify(self.user.full_name)
            
            slug = base_slug
            counter = 1
            # Ensure slug is unique
            while Practitioner.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


class SchedulePreference(BaseModel):
    """
    Model representing scheduling preferences for practitioners.
    Updated to use BaseModel for consistency.
    """
    practitioner = models.OneToOneField(Practitioner, on_delete=models.CASCADE, related_name='schedule_preferences')
    timezone = models.CharField(max_length=50, default='UTC', choices=TIMEZONE_CHOICES, 
                               help_text="Timezone for the practitioner's schedule")
    country = models.ForeignKey('locations.Country', on_delete=models.SET_NULL, blank=True, null=True,
                               help_text="Country for holiday calculations")
    
    # Holiday settings
    holidays = models.JSONField(blank=True, null=True, help_text="List of custom holiday dates")
    respect_holidays = models.BooleanField(default=True, help_text="Whether to block bookings on holidays")
    
    # Booking buffer settings
    advance_booking_min_hours = models.PositiveIntegerField(default=24, 
                                                           help_text="Minimum hours before a booking can be made")
    advance_booking_max_days = models.PositiveIntegerField(default=30, 
                                                          help_text="Maximum days in advance a booking can be made")
    
    # Availability settings
    is_active = models.BooleanField(default=True)
    auto_accept_bookings = models.BooleanField(default=False, 
                                             help_text="Automatically accept bookings within schedule")

    class Meta:
        # Using Django's default naming convention (practitioners_schedulepreference)
        indexes = [
            models.Index(fields=['practitioner'], name='sp_practitioner_idx'),
        ]

    def __str__(self):
        return f"Schedule preference for {self.practitioner}"


class Schedule(BaseModel):
    """
    Model representing a named schedule template created by a practitioner.
    Practitioners can create multiple schedules (e.g., "Summer Hours", "Holiday Hours")
    and set one as default.
    Updated to use BaseModel for consistency.
    """
    name = models.CharField(max_length=100, help_text="Name of this schedule")
    practitioner = models.ForeignKey(Practitioner, models.CASCADE, related_name='schedules')
    is_default = models.BooleanField(default=False, help_text="Whether this is the default schedule")
    timezone = models.CharField(max_length=50, default='UTC', choices=TIMEZONE_CHOICES,
                               help_text="Timezone for this schedule")
    description = models.TextField(blank=True, null=True, help_text="Description of this schedule")
    is_active = models.BooleanField(default=True)
    
    class Meta:
        # Using Django's default naming convention (practitioners_schedule)
        indexes = [
            models.Index(fields=['practitioner'], name='schedule_practitioner_idx'),
            models.Index(fields=['is_default'], name='schedule_default_idx'),
            models.Index(fields=['is_active'], name='schedule_active_idx'),
        ]
        constraints = [
            # Ensure only one default schedule per practitioner
            models.UniqueConstraint(
                fields=['practitioner', 'is_default'],
                condition=models.Q(is_default=True),
                name='unique_default_schedule_per_practitioner'
            ),
        ]
    
    def save(self, *args, **kwargs):
        # If this schedule is being set as default, unset any other default schedules
        if self.is_default:
            Schedule.objects.filter(
                practitioner=self.practitioner, 
                is_default=True
            ).exclude(pk=self.pk).update(is_default=False)
        
        # If no default schedule exists for this practitioner, make this one default
        elif not Schedule.objects.filter(
            practitioner=self.practitioner, 
            is_default=True
        ).exists():
            self.is_default = True
        
        super().save(*args, **kwargs)


class ScheduleTimeSlot(BaseModel):
    """
    Model representing time slots within a named schedule.
    These define when a practitioner is generally available.
    Updated to use BaseModel for consistency.
    """
    schedule = models.ForeignKey(Schedule, models.CASCADE, related_name='time_slots')
    day = models.SmallIntegerField(help_text="Day of week (0=Monday, 6=Sunday)")
    start_time = models.TimeField()
    end_time = models.TimeField()
    is_active = models.BooleanField(default=True)
    
    class Meta:
        # Using Django's default naming convention (practitioners_scheduletimeslot)
        indexes = [
            models.Index(fields=['schedule'], name='sts_schedule_idx'),
            models.Index(fields=['day'], name='sts_day_idx'),
            models.Index(fields=['is_active'], name='sts_active_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')),
                name='sts_end_time_after_start_time'
            ),
        ]
    
    def clean(self):
        """
        Validate that end time is after start time and no overlapping time slots.
        """
        # Check that end time is after start time
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")
        
        # Check for overlapping time slots
        overlapping = ScheduleTimeSlot.objects.filter(
            schedule=self.schedule,
            day=self.day,
            is_active=True
        ).exclude(pk=self.pk).filter(
            # Overlap conditions
            (
                # New slot starts during existing slot
                Q(start_time__lte=self.start_time, end_time__gt=self.start_time) |
                # New slot ends during existing slot
                Q(start_time__lt=self.end_time, end_time__gte=self.end_time) |
                # New slot contains existing slot
                Q(start_time__gte=self.start_time, end_time__lte=self.end_time)
            )
        )
        
        if overlapping.exists():
            raise ValidationError("This time slot overlaps with an existing time slot")
    
    def __str__(self):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = days[self.day] if 0 <= self.day <= 6 else f"Day {self.day}"
        return f"{day_name} {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"


class ServiceSchedule(BaseModel):
    """
    Model representing a service schedule.
    Updated to use BaseModel for consistency.
    """
    day = models.SmallIntegerField(help_text="Day of week (0=Monday, 6=Sunday)")
    start_time = models.TimeField(help_text="Start time for availability")
    end_time = models.TimeField(help_text="End time for availability")
    practitioner = models.ForeignKey(Practitioner, models.DO_NOTHING)
    service = models.ForeignKey('services.Service', models.DO_NOTHING)
    is_active = models.BooleanField(default=True)

    class Meta:
        # Using Django's default naming convention (practitioners_serviceschedule)
        indexes = [
            models.Index(fields=['practitioner'], name='ss_practitioner_idx'),
            models.Index(fields=['service'], name='ss_service_idx'),
            models.Index(fields=['day'], name='ss_day_idx'),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')),
                name='ss_end_time_after_start_time'
            )
        ]

    def __str__(self):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = days[self.day] if 0 <= self.day <= 6 else f"Day {self.day}"
        return f"{self.service} on {day_name} {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"

    def clean(self):
        """
        Validate the schedule.
        """
        # Check that end time is after start time
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")


class ScheduleAvailability(models.Model):
    """
    Model representing availability slots in a schedule.
    """
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    start_time = models.TimeField(help_text="Start time for availability")
    end_time = models.TimeField(help_text="End time for availability")
    practitioner = models.ForeignKey(Practitioner, models.DO_NOTHING)
    date = models.DateField(help_text="Date for this availability slot")
    service_schedule = models.ForeignKey(ServiceSchedule, models.DO_NOTHING)
    day = models.SmallIntegerField(help_text="Day of week (0=Monday, 6=Sunday)")
    is_active = models.BooleanField(default=True)

    class Meta:
        db_table = 'schedule_availabilities'
        constraints = [
            models.CheckConstraint(
                check=models.Q(end_time__gt=models.F('start_time')),
                name='sa_end_time_after_start_time'
            )
        ]

    def __str__(self):
        days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        day_name = days[self.day] if 0 <= self.day <= 6 else f"Day {self.day}"
        return f"{day_name} {self.date} {self.start_time.strftime('%H:%M')} - {self.end_time.strftime('%H:%M')}"

    def clean(self):
        """
        Validate the availability.
        """
        # Check that end time is after start time
        if self.end_time <= self.start_time:
            raise ValidationError("End time must be after start time")
    
    def save(self, *args, **kwargs):
        """
        Save the availability, ensuring day matches date.
        """
        # Set day based on date if not provided
        if self.date and (self.day is None or self.day < 0 or self.day > 6):
            # Get day of week (0=Monday, 6=Sunday)
            self.day = self.date.weekday()
        
        super().save(*args, **kwargs)


class OutOfOffice(BaseModel):
    """
    Model representing out-of-office periods for practitioners.
    Updated to use BaseModel for consistency.
    """
    from_date = models.DateField()
    to_date = models.DateField()
    title = models.TextField()
    practitioner = models.ForeignKey(Practitioner, models.DO_NOTHING)
    is_archived = models.BooleanField(default=False)

    class Meta:
        db_table = 'out_of_office'

    def __str__(self):
        return f"{self.practitioner} - {self.title} ({self.from_date} to {self.to_date})"


class Question(BaseModel):
    """
    Model representing a question for user feedback.
    Updated to use BaseModel for consistency.
    """
    title = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'questions'

    def __str__(self):
        return self.title or f"Question {self.id}"


class Certification(BaseModel):
    """
    Model representing practitioner certifications.
    Updated to use BaseModel for consistency.
    """
    certificate = models.TextField(blank=True, null=True)
    institution = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)

    issue_date = models.DateField(blank=True, null=True)
    expiry_date = models.DateField(blank=True, null=True)

    class Meta:
        db_table = 'certifications'
        db_table_comment = 'User certifications'

    def __str__(self):
        return f"{self.certificate} from {self.institution}" if self.certificate else f"Certification {self.id}"


class Education(BaseModel):
    """
    Model representing practitioner education.
    Updated to use BaseModel for consistency.
    """
    degree = models.TextField(blank=True, null=True)
    educational_institute = models.TextField(blank=True, null=True)
    order = models.IntegerField(default=0)

    class Meta:
        db_table = 'educations'
        db_table_comment = 'User educations'

    def __str__(self):
        return f"{self.degree} from {self.educational_institute}" if self.degree else f"Education {self.id}"


class Specialize(models.Model):
    """
    Model representing practitioner specializations.
    """
    id = models.BigAutoField(primary_key=True)
    content = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'specializations'
        db_table_comment = 'Specialize base data'

    def __str__(self):
        return self.content or f"Specialization {self.id}"


class Style(models.Model):
    """
    Model representing practitioner styles.
    """
    id = models.BigAutoField(primary_key=True)
    content = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'styles'
        db_table_comment = 'Style base data'

    def __str__(self):
        return self.content or f"Style {self.id}"


class Topic(models.Model):
    """
    Model representing topics for practitioners.
    """
    id = models.BigAutoField(primary_key=True)
    content = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'topics'
        db_table_comment = 'Topic base data'

    def __str__(self):
        return self.content or f"Topic {self.id}"


class VerificationDocument(models.Model):
    """
    Model for storing practitioner verification documents.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    practitioner = models.ForeignKey(Practitioner, on_delete=models.CASCADE, related_name='verification_documents')
    document_type = models.CharField(
        max_length=50,
        choices=[
            ('id_proof', 'ID Proof'),
            ('certification', 'Professional Certification'),
            ('license', 'Professional License'),
            ('insurance', 'Insurance Document'),
            ('background_check', 'Background Check'),
            ('other', 'Other Document')
        ]
    )
    document_url = models.URLField(help_text="URL to the document stored in Cloudflare R2")
    status = models.CharField(
        max_length=20,
        choices=[
            ('pending', 'Pending Review'),
            ('approved', 'Approved'),
            ('rejected', 'Rejected')
        ],
        default='pending'
    )
    rejection_reason = models.TextField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    expires_at = models.DateTimeField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'verification_documents'
        verbose_name = 'Verification Document'
        verbose_name_plural = 'Verification Documents'
        indexes = [
            models.Index(fields=['practitioner'], name='vd_practitioner_idx'),
            models.Index(fields=['document_type'], name='vd_type_idx'),
            models.Index(fields=['status'], name='vd_status_idx'),
            models.Index(fields=['expires_at'], name='vd_expiry_idx'),
        ]

    def __str__(self):
        return f"{self.document_type} for {self.practitioner} - {self.status}"


class PractitionerOnboardingProgress(models.Model):
    """
    Model for tracking practitioner onboarding progress through the Temporal workflow.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    practitioner = models.OneToOneField(Practitioner, on_delete=models.CASCADE, related_name='onboarding_progress')
    status = models.CharField(
        max_length=20,
        choices=[
            ('in_progress', 'In Progress'),
            ('completed', 'Completed'),
            ('stalled', 'Stalled'),
            ('rejected', 'Rejected'),
        ],
        default='in_progress'
    )
    current_step = models.CharField(max_length=50, default='profile_completion')
    steps_completed = models.JSONField(default=list)
    stall_reason = models.TextField(blank=True, null=True)
    rejection_reason = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(auto_now_add=True)
    last_updated = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(blank=True, null=True)

    class Meta:
        db_table = 'practitioner_onboarding_progress'
        verbose_name = 'Practitioner Onboarding Progress'
        verbose_name_plural = 'Practitioner Onboarding Progress'
        indexes = [
            models.Index(fields=['status'], name='onb_status_idx'),
            models.Index(fields=['current_step'], name='onb_step_idx'),
        ]

    def __str__(self):
        return f"Onboarding progress for {self.practitioner} - {self.status}"
    
    @property
    def is_complete(self):
        """Check if onboarding is complete."""
        return self.status == 'completed'
        
    def calculate_completion_percentage(self):
        """
        Calculate the percentage of onboarding steps completed.
        """
        # Define all possible steps in the onboarding process
        all_steps = [
            'profile_completion',
            'document_verification',
            'background_check',
            'training_modules',
            'subscription_setup',
            'service_configuration'
        ]
        
        # Calculate percentage based on completed steps
        if not self.steps_completed:
            return 0
            
        completed_count = len(self.steps_completed)
        total_steps = len(all_steps)
        
        return int((completed_count / total_steps) * 100)
        
    def get_next_step_description(self):
        """
        Returns a user-friendly description of the current/next step.
        """
        step_descriptions = {
            'profile_completion': 'Complete your professional profile',
            'document_verification': 'Upload and verify your credentials',
            'background_check': 'Complete background verification',
            'training_modules': 'Complete required training modules',
            'subscription_setup': 'Set up your subscription plan',
            'service_configuration': 'Configure your services and availability'
        }
        
        return step_descriptions.get(self.current_step, 'Continue onboarding process')


class ClientNote(BaseModel):
    """
    Model for storing practitioner's private notes about clients.
    These notes are only visible to the practitioner who created them.
    """
    practitioner = models.ForeignKey(
        Practitioner, 
        on_delete=models.CASCADE, 
        related_name='client_notes',
        help_text="The practitioner who created this note"
    )
    client = models.ForeignKey(
        User, 
        on_delete=models.CASCADE, 
        related_name='practitioner_notes_about',
        help_text="The client this note is about"
    )
    content = models.TextField(
        help_text="The note content"
    )
    
    class Meta:
        verbose_name = 'Client Note'
        verbose_name_plural = 'Client Notes'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['practitioner', 'client', '-created_at']),
            models.Index(fields=['practitioner', '-created_at']),
            models.Index(fields=['client']),
        ]
        # Ensure each practitioner can only see their own notes
        permissions = [
            ("view_own_client_notes", "Can view own client notes"),
        ]
    
    def __str__(self):
        return f"Note by {self.practitioner} about {self.client.email} - {self.created_at.date()}"
    
    def clean(self):
        """Validate that practitioner isn't making notes about themselves."""
        if self.practitioner.user == self.client:
            raise ValidationError("Practitioners cannot create notes about themselves")
    
    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
EOF < /dev/null