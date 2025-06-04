import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Count
from utils.models import BaseModel, PublicModel, Location

# Experience level choices
EXPERIENCE_LEVEL_CHOICES = [
    ('beginner', 'Beginner'),
    ('intermediate', 'Intermediate'), 
    ('advanced', 'Advanced'),
    ('all_levels', 'All Levels'),
]

# Location type choices
LOCATION_TYPE_CHOICES = [
    ('virtual', 'Virtual'),
    ('in_person', 'In Person'),
    ('hybrid', 'Hybrid'),
]



class ServiceCategory(BaseModel):
    """
    Model representing service categories for organizing services.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon class or identifier")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    
    class Meta:
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
        ]

    def __str__(self):
        return self.name


class ServiceType(BaseModel):
    """
    Model representing a service type (session, workshop, package, bundle, course).
    Updated to use BaseModel for consistency.
    """
    name = models.CharField(max_length=50, unique=True)
    code = models.CharField(max_length=20, unique=True, 
                          help_text="Unique code for this service type (e.g., 'session', 'workshop')")
    description = models.TextField(blank=True, null=True)
    category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, 
                               blank=True, null=True, related_name='service_types')
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    class Meta:
        verbose_name = 'Service Type'
        verbose_name_plural = 'Service Types'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active', 'order']),
        ]

    def __str__(self):
        return self.name


class Service(PublicModel):
    """
    Model representing a service offered by a practitioner.
    Updated to use PublicModel and remove redundant calculated fields.
    """
    # Basic service information
    name = models.CharField(max_length=255, help_text="Service name")
    description = models.TextField(blank=True, null=True, help_text="Detailed service description")
    short_description = models.CharField(max_length=500, blank=True, null=True, 
                                       help_text="Brief description for listings")
    
    # Pricing and duration
    price = models.DecimalField(max_digits=10, decimal_places=2, 
                              validators=[MinValueValidator(0)],
                              help_text="Price in USD")
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    
    # Relationships
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT, 
                                   help_text="Type of service")
    category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL, 
                               blank=True, null=True, related_name='services')
    primary_practitioner = models.ForeignKey('practitioners.Practitioner', 
                                           on_delete=models.CASCADE,
                                           related_name='primary_services',
                                           help_text="Main practitioner for this service")
    additional_practitioners = models.ManyToManyField(
        'practitioners.Practitioner', 
        through='ServicePractitioner',
        related_name='services',
        blank=True,
        help_text="Additional practitioners involved in this service"
    )
    
    # Capacity and targeting
    max_participants = models.PositiveIntegerField(default=1, 
                                                 validators=[MinValueValidator(1)],
                                                 help_text="Maximum number of participants")
    min_participants = models.PositiveIntegerField(default=1,
                                                 validators=[MinValueValidator(1)],
                                                 help_text="Minimum participants to run service")
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, 
                                      default='all_levels')
    age_min = models.PositiveIntegerField(blank=True, null=True, help_text="Minimum age")
    age_max = models.PositiveIntegerField(blank=True, null=True, help_text="Maximum age")
    
    # Location and delivery
    location_type = models.CharField(max_length=20, choices=LOCATION_TYPE_CHOICES, 
                                   default='virtual')
    location = models.ForeignKey('utils.Location', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='services',
                               help_text="Physical location for in-person/hybrid services")
    
    # Content and learning
    what_youll_learn = models.TextField(blank=True, null=True, 
                                       help_text="Learning outcomes and benefits")
    prerequisites = models.TextField(blank=True, null=True,
                                   help_text="What participants need before joining")
    includes = models.JSONField(blank=True, null=True, 
                              help_text="What's included in the service")
    
    # Media and presentation
    image_url = models.URLField(blank=True, null=True, help_text="Service image")
    video_url = models.URLField(blank=True, null=True, help_text="Promotional video")
    tags = models.JSONField(blank=True, null=True, help_text="Searchable tags")
    
    # Multi-language support
    languages = models.ManyToManyField('utils.Language', related_name='services', blank=True)
    
    # Status and visibility
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True, help_text="Whether service is publicly visible")
    
    # Service type flags (for complex services)
    is_course = models.BooleanField(default=False, help_text="Whether this is a multi-session course")
    
    class Meta:
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['service_type', 'is_active']),
            models.Index(fields=['primary_practitioner', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['location_type']),
            models.Index(fields=['is_featured', 'is_active']),
            models.Index(fields=['price']),
            models.Index(fields=['experience_level']),
        ]

    def __str__(self):
        return self.name

    @property
    def average_rating(self):
        """Calculate average rating from reviews."""
        from reviews.models import Review
        result = Review.objects.filter(
            service=self,
            is_published=True
        ).aggregate(avg_rating=Avg('rating'))
        return round(result['avg_rating'] or 0, 2)

    @property
    def total_reviews(self):
        """Count total published reviews."""
        from reviews.models import Review
        return Review.objects.filter(
            service=self,
            is_published=True
        ).count()

    @property
    def total_bookings(self):
        """Count total bookings for this service."""
        return self.bookings.count()

    @property
    def duration_display(self):
        """Return formatted duration string."""
        hours = self.duration_minutes // 60
        minutes = self.duration_minutes % 60
        
        if hours > 0 and minutes > 0:
            return f"{hours}h {minutes}m"
        elif hours > 0:
            return f"{hours}h"
        else:
            return f"{minutes}m"

    @property
    def all_practitioners(self):
        """Get all practitioners (primary + additional)."""
        additional_ids = self.additional_practitioners.values_list('id', flat=True)
        from practitioners.models import Practitioner
        return Practitioner.objects.filter(
            models.Q(id=self.primary_practitioner.id) | models.Q(id__in=additional_ids)
        ).distinct()

    def can_user_book(self, user):
        """Check if a user can book this service."""
        if not self.is_active or not self.is_public:
            return False
        
        # Add age restrictions if specified
        if user.profile and user.profile.birthdate:
            from datetime import date
            age = (date.today() - user.profile.birthdate).days // 365
            if self.age_min and age < self.age_min:
                return False
            if self.age_max and age > self.age_max:
                return False
        
        return True
    
    class Meta:
        # Using Django's default naming convention (services_service)
        indexes = [
            models.Index(fields=['service_type']),
            models.Index(fields=['category']),
            models.Index(fields=['is_active']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['experience_level']),
        ]

    def __str__(self):
        return self.name
        
    @property
    def is_course(self):
        """Check if this service is a course."""
        return self.service_type and self.service_type.code == 'course'
        
    @property
    def is_package(self):
        """Check if this service is a package."""
        if not self.service_type:
            return False
        return self.service_type.code == 'package'
        
    @property
    def is_bundle(self):
        """Check if this service is a bundle."""
        if not self.service_type:
            return False
        return self.service_type.code == 'bundle'
    
    @property
    def child_services(self):
        """Get all child services for this service (for courses, packages, bundles)."""
        return Service.objects.filter(
            parent_relationships__parent_service=self
        ).order_by('parent_relationships__order')
    
    def get_total_package_price(self):
        """
        Calculate the total price of this package/course including all child services
        and applying any discounts.
        """
        if not (self.is_course or self.is_package or self.is_bundle):
            return self.price
            
        # If this service has its own price, use that
        if self.price is not None:
            return self.price
            
        # Otherwise calculate from child services
        total = 0
        for relationship in self.child_relationships.all():
            item_price = relationship.get_discounted_price()
            if item_price:
                total += item_price * relationship.quantity
                
        return total
    
    def add_child_service(self, child_service, order=None, quantity=1, discount_percentage=0, 
                         is_required=True, description_override=None):
        """
        Add a child service to this service (for courses, packages, bundles).
        """
        if not (self.is_course or self.is_package or self.is_bundle):
            raise ValueError("Only courses, packages, and bundles can have child services")
            
        # Get the next order number if not specified
        if order is None:
            max_order = self.child_relationships.aggregate(
                max_order=models.Max('order')
            )['max_order'] or 0
            order = max_order + 1
            
        # Create or update the relationship
        relationship, created = ServiceRelationship.objects.update_or_create(
            parent_service=self,
            child_service=child_service,
            defaults={
                'order': order,
                'quantity': quantity,
                'discount_percentage': discount_percentage,
                'is_required': is_required,
                'description_override': description_override
            }
        )
        
        return relationship


class ServicePractitioner(models.Model):
    """
    Model representing the relationship between a service and a practitioner.
    Allows multiple practitioners to be associated with a single service.
    """
    id = models.BigAutoField(primary_key=True)
    service = models.ForeignKey(Service, on_delete=models.CASCADE, related_name='practitioner_relationships')
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='service_relationships')
    is_primary = models.BooleanField(default=False, help_text="If True, this practitioner is the primary owner of the service")
    role = models.CharField(max_length=100, blank=True, null=True, help_text="The role of the practitioner in this service")
    revenue_share_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=100.00,
        help_text="Percentage of revenue this practitioner receives from this service"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Using Django's default naming convention (services_servicepractitioner)
        unique_together = ('service', 'practitioner')
        ordering = ['-is_primary', 'created_at']
        
    def __str__(self):
        return f"{self.practitioner} - {self.service}"
        
    def save(self, *args, **kwargs):
        """
        Override save method to ensure revenue share percentages add up to 100%.
        For single practitioner services, the percentage is always 100%.
        """
        # First save the model to get an ID if it's a new record
        super().save(*args, **kwargs)
        
        # Check if this is the only practitioner for this service
        if self.service.practitioner_relationships.count() == 1:
            if self.revenue_share_percentage != 100:
                self.revenue_share_percentage = 100
                super().save(update_fields=['revenue_share_percentage'])
            return
            
        # For multiple practitioners, validate the total percentage
        total_percentage = self.service.practitioner_relationships.exclude(
            id=self.id
        ).aggregate(
            total=models.Sum('revenue_share_percentage')
        )['total'] or 0
        
        total_percentage += self.revenue_share_percentage
        
        # If total exceeds 100%, adjust this practitioner's percentage
        if total_percentage > 100:
            self.revenue_share_percentage = max(0, 100 - (total_percentage - self.revenue_share_percentage))
            super().save(update_fields=['revenue_share_percentage'])


class ServiceRelationship(models.Model):
    """
    Model representing the relationship between services.
    Used for packages, bundles, and courses where one service contains other services.
    """
    id = models.BigAutoField(primary_key=True)
    parent_service = models.ForeignKey(Service, models.CASCADE, related_name='child_relationships', blank=True, null=True)
    child_service = models.ForeignKey(Service, models.CASCADE, related_name='parent_relationships', blank=True, null=True)
    quantity = models.SmallIntegerField(default=1, help_text="Number of this service included in the package/bundle")
    order = models.SmallIntegerField(default=0, help_text="Order of this service in a course or bundle")
    discount_percentage = models.DecimalField(
        max_digits=5, 
        decimal_places=2, 
        default=0, 
        help_text="Discount percentage when this service is purchased as part of the parent"
    )
    is_required = models.BooleanField(default=True, help_text="Whether this service is required as part of the parent")
    description_override = models.TextField(blank=True, null=True, help_text="Custom description when part of this parent service")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_relationships'
        ordering = ['order', 'id']
        unique_together = [('parent_service', 'child_service')]

    def __str__(self):
        return f"{self.parent_service} > {self.child_service}"
        
    def get_discounted_price(self):
        """
        Calculate the discounted price of this child service when purchased as part of the parent.
        """
        if not self.child_service or not self.child_service.price:
            return None
            
        if not self.discount_percentage:
            return self.child_service.price
            
        discount_factor = (100 - self.discount_percentage) / 100
        return self.child_service.price * discount_factor


class ServiceSession(models.Model):
    """
    Model representing a scheduled occurrence of a service (workshop or course session).
    """
    id = models.BigAutoField(primary_key=True)
    service = models.ForeignKey(Service, models.CASCADE, related_name='sessions')
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField()
    end_time = models.DateTimeField()
    duration = models.PositiveIntegerField(help_text="Duration in minutes", blank=True, null=True)
    max_participants = models.IntegerField(null=True, blank=True)
    current_participants = models.IntegerField(default=0)
    sequence_number = models.PositiveIntegerField(default=0)
    room = models.ForeignKey('rooms.Room', models.SET_NULL, null=True, blank=True, related_name='service_sessions')
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    status = models.CharField(max_length=20, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    agenda = models.TextField(blank=True, null=True)
    what_youll_learn = models.TextField(blank=True, null=True, help_text="Describe what clients will learn or gain from this specific session")
    
    # Location handling for in-person sessions
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
        help_text="Location where this session takes place (for in-person sessions)"
    )
    
    class Meta:
        db_table = 'service_sessions'
        ordering = ['start_time', 'sequence_number']
        unique_together = (('service', 'start_time'),)

    def __str__(self):
        return f"{self.service.name} - Session {self.sequence_number}" if self.service else f"Session {self.id}"
        
    def save(self, *args, **kwargs):
        # Auto-calculate duration if not provided
        if not self.duration and self.start_time and self.end_time:
            delta = self.end_time - self.start_time
            self.duration = int(delta.total_seconds() / 60)
            
        # If max_participants not specified, use the service's value
        if self.max_participants is None and self.service and hasattr(self.service, 'max_participants'):
            self.max_participants = self.service.max_participants
            
        # If location not specified but service has one, use it
        if self.location is None and self.service and hasattr(self.service, 'location') and self.service.location:
            self.location = self.service.location
            
        super().save(*args, **kwargs)
        
    def create_room(self):
        """
        Create a Daily.co room for this session if it doesn't already exist.
        This should be called when a session is confirmed or when needed.
        """
        if self.room:
            return self.room
            
        from apps.integrations.daily.utils import create_daily_room
        
        # Create a unique room name
        room_name = f"session-{self.id}-{self.service.id}"
        
        # Create the room
        room = create_daily_room(
            room_name=room_name,
            metadata={
                "service_id": str(self.service.id),
                "session_id": str(self.id),
                "session_type": "workshop" if self.service.service_type and self.service.service_type.code == 'workshop' else "course",
            }
        )
        
        # Associate the room with this session
        self.room = room
        self.save(update_fields=['room'])
        
        return room


class SessionParticipant(models.Model):
    """
    Model representing a participant in a service session.
    """
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(ServiceSession, models.CASCADE, related_name='participants')
    user = models.ForeignKey('users.User', models.CASCADE)
    booking = models.ForeignKey('bookings.Booking', models.CASCADE)
    attendance_status = models.CharField(max_length=20, default='registered')
    check_in_time = models.DateTimeField(null=True, blank=True)
    check_out_time = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        db_table = 'session_participants'
        unique_together = (('session', 'user'),)
    
    def __str__(self):
        return f"{self.user} in {self.session}"



class SessionAgendaItem(models.Model):
    """
    Model representing an agenda item for a service session or service template.
    Can be linked to either a session (for specific scheduled items) or
    directly to a service (as a template).
    """
    id = models.BigAutoField(primary_key=True)
    session = models.ForeignKey(ServiceSession, models.CASCADE, related_name='agenda_items', null=True, blank=True)
    service = models.ForeignKey(Service, models.CASCADE, related_name='agenda_items', null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField(null=True, blank=True)  # Optional for service-level items
    end_time = models.DateTimeField(null=True, blank=True)    # Optional for service-level items
    order = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'session_agenda_items'
        ordering = ['order', 'start_time']
        constraints = [
            # Ensure exactly one of service or session is set
            models.CheckConstraint(
                check=(
                    models.Q(service__isnull=False, session__isnull=True) |
                    models.Q(service__isnull=True, session__isnull=False)
                ),
                name='agenda_item_exactly_one_parent'
            ),
            # Ensure order is unique per parent
            models.UniqueConstraint(
                fields=['service', 'order'],
                name='unique_service_agenda_item_order',
                condition=models.Q(service__isnull=False)
            ),
            models.UniqueConstraint(
                fields=['session', 'order'],
                name='unique_session_agenda_item_order',
                condition=models.Q(session__isnull=False)
            )
        ]
    
    def __str__(self):
        parent = self.session or self.service
        return f"{self.title} - {parent.name if isinstance(parent, Service) else parent.title or parent.service.name}"


class ServiceBenefit(models.Model):
    """
    Model representing a key benefit of a service or service session.
    """
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon identifier for UI display")
    order = models.PositiveIntegerField(default=0)
    service = models.ForeignKey(Service, models.CASCADE, related_name='benefits', null=True, blank=True)
    session = models.ForeignKey(ServiceSession, models.CASCADE, related_name='benefits', null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        db_table = 'service_benefits'
        ordering = ['order', 'id']
        constraints = [
            models.CheckConstraint(
                check=models.Q(service__isnull=False) | models.Q(session__isnull=False),
                name='service_or_session_required'
            ),
            models.UniqueConstraint(
                fields=['service', 'order'],
                name='unique_service_benefit_order',
                condition=models.Q(service__isnull=False)
            ),
            models.UniqueConstraint(
                fields=['session', 'order'],
                name='unique_session_benefit_order',
                condition=models.Q(session__isnull=False)
            )
        ]
    
    def __str__(self):
        if self.service:
            return f"{self.title} - {self.service.name}"
        elif self.session:
            return f"{self.title} - {self.session.title or self.session.service.name}"
        return self.title


class Waitlist(models.Model):
    """
    Model for managing waitlists for services and sessions.
    """
    STATUS_CHOICES = (
        ('waiting', 'Waiting'),
        ('notified', 'Notified'),
        ('converted', 'Converted'),
        ('expired', 'Expired'),
        ('removed', 'Removed'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, blank=True, null=True, related_name='waitlist_entries')
    service_session = models.ForeignKey('services.ServiceSession', on_delete=models.CASCADE, blank=True, null=True, related_name='waitlist_entries')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='waitlist_entries')
    joined_at = models.DateTimeField(auto_now_add=True)
    position = models.PositiveIntegerField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='waiting')
    notified_at = models.DateTimeField(blank=True, null=True)
    notification_count = models.PositiveIntegerField(default=0)
    last_notification = models.DateTimeField(blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'waitlists'
        ordering = ['position']
        indexes = [
            models.Index(fields=['service']),
            models.Index(fields=['service_session']),
            models.Index(fields=['user']),
            models.Index(fields=['status']),
        ]
        unique_together = [
            ('service', 'user'),
            ('service_session', 'user'),
        ]
    
    def __str__(self):
        target = self.service or self.service_session
        return f"Waitlist position {self.position} for {self.user} on {target}"
    
    def notify_user(self):
        """
        Send notification to user about availability
        """
        from django.utils import timezone
        from apps.notifications.models import Notification
        
        # Create notification
        Notification.objects.create(
            user=self.user,
            title="Spot Available!",
            message=f"A spot has opened up for {self.service or self.service_session}. Act quickly to secure your booking!",
            notification_type='booking',
            delivery_channel='in_app',
            related_object_type='waitlist',
            related_object_id=str(self.id),
        )
        
        # Update waitlist entry
        self.status = 'notified'
        self.notified_at = timezone.now()
        self.notification_count += 1
        self.last_notification = timezone.now()
        self.save()
    
    @classmethod
    def reorder_positions(cls, service=None, service_session=None):
        """
        Reorder positions for a specific service or session waitlist
        """
        if service:
            waitlist_entries = cls.objects.filter(service=service, status='waiting').order_by('joined_at')
        elif service_session:
            waitlist_entries = cls.objects.filter(service_session=service_session, status='waiting').order_by('joined_at')
        else:
            return
        
        # Update positions
        for i, entry in enumerate(waitlist_entries, 1):
            if entry.position != i:
                entry.position = i
                entry.save(update_fields=['position'])


# ============================================================================
# PACKAGE AND BUNDLE MODELS
# ============================================================================

class Package(PublicModel):
    """
    Model representing a package of different services sold together.
    Example: "Wellness Journey" containing consultation + 3 massages + yoga class
    """
    name = models.CharField(max_length=255, help_text="Package name")
    description = models.TextField(help_text="What this package includes and benefits")
    
    # Pricing
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Total package price"
    )
    original_price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Sum of individual service prices (for showing savings)"
    )
    
    # Package details
    validity_days = models.PositiveIntegerField(
        default=365,
        help_text="How many days the package is valid after purchase"
    )
    is_transferable = models.BooleanField(
        default=False,
        help_text="Whether package can be transferred to another user"
    )
    
    # Practitioner and category
    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='packages'
    )
    category = models.ForeignKey(
        ServiceCategory,
        on_delete=models.SET_NULL,
        null=True, blank=True,
        related_name='packages'
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Media
    image_url = models.URLField(blank=True, null=True)
    
    # Metadata
    tags = models.JSONField(blank=True, null=True, help_text="Searchable tags")
    terms_conditions = models.TextField(
        blank=True, null=True,
        help_text="Specific terms for this package"
    )

    class Meta:
        verbose_name = 'Package'
        verbose_name_plural = 'Packages'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['practitioner', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['is_featured', 'is_active']),
        ]

    def __str__(self):
        return f"{self.name} - {self.practitioner.user.get_full_name()}"

    @property
    def savings_amount(self):
        """Calculate savings compared to individual prices."""
        return self.original_price - self.price

    @property
    def savings_percentage(self):
        """Calculate savings percentage."""
        if self.original_price > 0:
            return round((self.savings_amount / self.original_price) * 100, 1)
        return 0


class PackageService(models.Model):
    """
    Junction table linking packages to services with quantities.
    """
    package = models.ForeignKey(
        Package,
        on_delete=models.CASCADE,
        related_name='package_services'
    )
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='service_packages'
    )
    quantity = models.PositiveIntegerField(
        default=1,
        validators=[MinValueValidator(1)],
        help_text="Number of times this service is included"
    )
    order = models.PositiveIntegerField(
        default=0,
        help_text="Display order within package"
    )
    is_mandatory = models.BooleanField(
        default=True,
        help_text="Whether this service must be used (vs optional)"
    )
    notes = models.CharField(
        max_length=255,
        blank=True, null=True,
        help_text="Special notes about this service in the package"
    )

    class Meta:
        verbose_name = 'Package Service'
        verbose_name_plural = 'Package Services'
        unique_together = ['package', 'service']
        ordering = ['order', 'id']

    def __str__(self):
        return f"{self.package.name} - {self.service.name} x{self.quantity}"


class Bundle(PublicModel):
    """
    Model representing bulk purchase options for a single service.
    Example: "5-Class Yoga Pass" or "10-Session Massage Bundle"
    """
    name = models.CharField(max_length=255, help_text="Bundle name")
    description = models.TextField(
        blank=True, null=True,
        help_text="Bundle description and benefits"
    )
    
    # The service this bundle is for
    service = models.ForeignKey(
        Service,
        on_delete=models.CASCADE,
        related_name='bundles'
    )
    
    # Bundle configuration
    sessions_included = models.PositiveIntegerField(
        validators=[MinValueValidator(2)],
        help_text="Number of sessions included in bundle"
    )
    bonus_sessions = models.PositiveIntegerField(
        default=0,
        help_text="Additional free sessions (e.g., buy 5 get 1 free)"
    )
    
    # Pricing
    price = models.DecimalField(
        max_digits=10, decimal_places=2,
        validators=[MinValueValidator(0)],
        help_text="Total bundle price"
    )
    
    # Validity
    validity_days = models.PositiveIntegerField(
        default=365,
        help_text="Days valid after purchase"
    )
    is_shareable = models.BooleanField(
        default=False,
        help_text="Whether bundle can be shared with family/friends"
    )
    
    # Restrictions
    max_per_customer = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Maximum bundles one customer can purchase"
    )
    available_from = models.DateTimeField(
        blank=True, null=True,
        help_text="When bundle becomes available"
    )
    available_until = models.DateTimeField(
        blank=True, null=True,
        help_text="When bundle sales end"
    )
    
    # Status
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    
    # Display
    highlight_text = models.CharField(
        max_length=50,
        blank=True, null=True,
        help_text="e.g., 'BEST VALUE' or 'SAVE 20%'"
    )
    
    class Meta:
        verbose_name = 'Bundle'
        verbose_name_plural = 'Bundles'
        ordering = ['service', 'sessions_included']
        indexes = [
            models.Index(fields=['service', 'is_active']),
            models.Index(fields=['is_featured', 'is_active']),
            models.Index(fields=['available_from', 'available_until']),
        ]

    def __str__(self):
        return f"{self.name} - {self.service.name}"

    @property
    def total_sessions(self):
        """Total sessions including bonus."""
        return self.sessions_included + self.bonus_sessions

    @property
    def price_per_session(self):
        """Effective price per session."""
        if self.total_sessions > 0:
            return round(self.price / self.total_sessions, 2)
        return 0

    @property
    def savings_amount(self):
        """Savings compared to individual sessions."""
        individual_total = self.service.price * self.total_sessions
        return individual_total - self.price

    @property
    def savings_percentage(self):
        """Savings percentage."""
        individual_total = self.service.price * self.total_sessions
        if individual_total > 0:
            return round((self.savings_amount / individual_total) * 100, 1)
        return 0

    def is_available(self):
        """Check if bundle is currently available for purchase."""
        from django.utils import timezone
        now = timezone.now()
        
        if not self.is_active:
            return False
            
        if self.available_from and now < self.available_from:
            return False
            
        if self.available_until and now > self.available_until:
            return False
            
        return True
