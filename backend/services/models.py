import uuid
from decimal import Decimal
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator
from django.db.models import Avg, Count
from utils.models import BaseModel, PublicModel, Address
from .enums import ServiceTypeEnum, ServiceStatusEnum

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
    slug = models.SlugField(max_length=100, unique=True, help_text="URL-friendly version of name")
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon class or identifier")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False, help_text="Whether to feature this category")
    order = models.PositiveIntegerField(default=0, help_text="Display order")
    
    class Meta:
        verbose_name = 'Service Category'
        verbose_name_plural = 'Service Categories'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
            models.Index(fields=['slug']),
            models.Index(fields=['is_featured']),
        ]

    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class PractitionerServiceCategory(BaseModel):
    """
    Model representing practitioner-specific service categories.
    Allows practitioners to create custom categories to organize their services.
    """
    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='service_categories'
    )
    name = models.CharField(max_length=100)
    slug = models.SlugField(max_length=100, help_text="URL-friendly version of name")
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon class or identifier")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order for drag-drop sorting")
    color = models.CharField(max_length=7, blank=True, null=True, help_text="Hex color for UI display")
    
    class Meta:
        verbose_name = 'Practitioner Service Category'
        verbose_name_plural = 'Practitioner Service Categories'
        ordering = ['order', 'name']
        unique_together = [('practitioner', 'slug'), ('practitioner', 'name')]
        indexes = [
            models.Index(fields=['practitioner', 'is_active']),
            models.Index(fields=['practitioner', 'order']),
        ]

    def __str__(self):
        return f"{self.practitioner} - {self.name}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            # Make slug unique within practitioner's categories
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            while PractitionerServiceCategory.objects.filter(
                practitioner=self.practitioner,
                slug=slug
            ).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


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
    slug = models.SlugField(max_length=255, unique=True, help_text="URL-friendly version of name")
    description = models.TextField(blank=True, null=True, help_text="Detailed service description")
    short_description = models.CharField(max_length=500, blank=True, null=True, 
                                       help_text="Brief description for listings")
    
    # Pricing and duration
    price_cents = models.IntegerField(
        validators=[MinValueValidator(0)],
        help_text="Price in cents (e.g., 10000 = $100.00)"
    )
    duration_minutes = models.PositiveIntegerField(help_text="Duration in minutes")
    
    # Relationships
    service_type = models.ForeignKey(ServiceType, on_delete=models.PROTECT, 
                                   help_text="Type of service")
    category = models.ForeignKey(ServiceCategory, on_delete=models.SET_NULL,
                               blank=True, null=True, related_name='services',
                               help_text="DEPRECATED: Use modalities instead. Global category for discovery")
    modalities = models.ManyToManyField(
        'common.Modality',
        related_name='services',
        blank=True,
        help_text="Treatment modalities for this service (e.g., Yoga, Meditation)"
    )
    practitioner_category = models.ForeignKey(PractitionerServiceCategory,
                                            on_delete=models.SET_NULL,
                                            blank=True, null=True,
                                            related_name='services',
                                            help_text="Practitioner's custom category")
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
    practitioner_location = models.ForeignKey('locations.PractitionerLocation',
                                            on_delete=models.SET_NULL,
                                            null=True, blank=True,
                                            related_name='services',
                                            help_text="Practitioner location where this service is offered")
    
    # Scheduling (for session-type services)
    schedule = models.ForeignKey('practitioners.Schedule', on_delete=models.SET_NULL,
                               null=True, blank=True, related_name='services',
                               help_text="Availability schedule for session-type services")
    
    # Content and learning
    what_youll_learn = models.TextField(blank=True, null=True, 
                                       help_text="Learning outcomes and benefits")
    prerequisites = models.TextField(blank=True, null=True,
                                   help_text="What participants need before joining")
    includes = models.JSONField(blank=True, null=True, 
                              help_text="What's included in the service")
    
    # Media and presentation
    image = models.ImageField(
        upload_to='services/images/%Y/%m/',
        blank=True,
        null=True,
        help_text="Service cover image"
    )
    # Note: Videos should be handled through ServiceResource, not directly on Service
    tags = models.JSONField(blank=True, null=True, help_text="Searchable tags")
    
    # Multi-language support
    languages = models.ManyToManyField('utils.Language', related_name='services', blank=True)
    
    # Status and visibility
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    is_public = models.BooleanField(default=True, help_text="Whether service is publicly visible")
    
    # Service lifecycle and status
    status = models.CharField(
        max_length=20, 
        choices=ServiceStatusEnum.choices, 
        default=ServiceStatusEnum.DRAFT,
        help_text="Service publication status"
    )
    published_at = models.DateTimeField(blank=True, null=True, 
                                      help_text="When service was first published")
    
    # Bundle/Package specific fields
    validity_days = models.PositiveIntegerField(
        default=365,
        help_text="Days valid after purchase (for bundles/packages)"
    )
    is_transferable = models.BooleanField(
        default=False,
        help_text="Whether bundle/package can be transferred to another user"
    )
    is_shareable = models.BooleanField(
        default=False,
        help_text="Whether bundle can be shared with family/friends"
    )
    sessions_included = models.PositiveIntegerField(
        blank=True, null=True,
        validators=[MinValueValidator(1)],
        help_text="Number of sessions in bundle (for bundle type only)"
    )
    bonus_sessions = models.PositiveIntegerField(
        default=0,
        help_text="Additional free sessions in bundle"
    )
    max_per_customer = models.PositiveIntegerField(
        blank=True, null=True,
        help_text="Maximum purchases per customer (for bundles)"
    )
    available_from = models.DateTimeField(
        blank=True, null=True,
        help_text="When this becomes available for purchase"
    )
    available_until = models.DateTimeField(
        blank=True, null=True,
        help_text="When sales end"
    )
    highlight_text = models.CharField(
        max_length=50,
        blank=True, null=True,
        help_text="e.g., 'BEST VALUE' or 'SAVE 20%'"
    )
    terms_conditions = models.TextField(
        blank=True, null=True,
        help_text="Specific terms for packages/bundles"
    )
    
    class Meta:
        verbose_name = 'Service'
        verbose_name_plural = 'Services'
        ordering = ['-created_at']
        # Using Django's default naming convention (services_service)
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['service_type', 'is_active']),
            models.Index(fields=['primary_practitioner', 'is_active']),
            models.Index(fields=['category', 'is_active']),
            models.Index(fields=['location_type']),
            models.Index(fields=['is_featured', 'is_active']),
            models.Index(fields=['price_cents']),
            models.Index(fields=['experience_level']),
        ]

    def __str__(self):
        return self.name

    @property
    def image_url(self):
        """Get the absolute URL for the service image."""
        if self.image:
            try:
                # Get the URL from the file field
                url = self.image.url
                
                # If it's already a full URL (from cloud storage), return it
                if url.startswith('http'):
                    return url
                
                # For local development, we need to build the full URL
                from django.conf import settings
                
                # Use the backend URL for media files, not frontend
                backend_url = getattr(settings, 'BACKEND_URL', 'http://localhost:8000')
                
                # Remove leading slash if present to avoid double slashes
                if url.startswith('/'):
                    url = url[1:]
                
                return f"{backend_url}/{url}"
            except Exception as e:
                print(f"Error getting image URL: {e}")
                return None
        return None
    
    @property
    def price(self):
        """Get price in dollars as Decimal."""
        return Decimal(self.price_cents) / 100
    
    @property
    def service_type_code(self):
        """Get the service type code for API consistency."""
        return self.service_type.code if self.service_type else None
    
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
    
    def get_total_package_price_cents(self):
        """
        Calculate the total price of this package/course including all child services
        and applying any discounts. Returns cents.
        """
        if not (self.is_course or self.is_package or self.is_bundle):
            return self.price_cents
            
        # If this service has its own price, use that
        if self.price_cents is not None:
            return self.price_cents
            
        # Otherwise calculate from child services
        total_cents = 0
        for relationship in self.child_relationships.all():
            item_price_cents = relationship.get_discounted_price_cents()
            if item_price_cents:
                total_cents += item_price_cents * relationship.quantity
                
        return total_cents
    
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
    
    @property
    def total_sessions(self):
        """Total sessions for bundles (including bonus sessions) and courses/workshops."""
        # For bundles, use sessions_included field
        if self.is_bundle and self.sessions_included:
            return self.sessions_included + self.bonus_sessions

        # For courses and workshops, count actual ServiceSession records
        if self.is_course or (self.service_type and self.service_type.code == 'workshop'):
            return self.sessions.count()

        # For individual sessions and other types
        return 1

    @property
    def first_session_date(self):
        """Get the start time of the first session for courses/workshops."""
        if self.is_course or (self.service_type and self.service_type.code == 'workshop'):
            first_session = self.sessions.order_by('start_time').first()
            return first_session.start_time if first_session else None
        return None

    @property
    def last_session_date(self):
        """Get the end time of the last session for courses/workshops."""
        if self.is_course or (self.service_type and self.service_type.code == 'workshop'):
            last_session = self.sessions.order_by('-end_time').first()
            return last_session.end_time if last_session else None
        return None

    @property
    def next_session_date(self):
        """Get the start time of the next upcoming session for courses/workshops."""
        if self.is_course or (self.service_type and self.service_type.code == 'workshop'):
            from django.utils import timezone
            upcoming_session = self.sessions.filter(
                start_time__gte=timezone.now()
            ).order_by('start_time').first()
            return upcoming_session.start_time if upcoming_session else None
        return None

    @property
    def price_per_session_cents(self):
        """Calculate effective price per session for bundles in cents."""
        if self.is_bundle and self.total_sessions > 0:
            return self.price_cents // self.total_sessions
        return self.price_cents
    
    @property
    def price_per_session(self):
        """Calculate effective price per session in dollars."""
        return Decimal(self.price_per_session_cents) / 100
    
    @property
    def original_price_cents(self):
        """Calculate original price before discounts (for packages/bundles) in cents."""
        if self.is_package:
            # Sum of all child service prices
            total_cents = 0
            for rel in self.child_relationships.all():
                if rel.child_service and rel.child_service.price_cents:
                    total_cents += rel.child_service.price_cents * rel.quantity
            return total_cents
        elif self.is_bundle:
            # Price of individual sessions
            child_rels = self.child_relationships.first()
            if child_rels and child_rels.child_service:
                return child_rels.child_service.price_cents * self.total_sessions
        return self.price_cents
    
    @property
    def original_price(self):
        """Get original price in dollars."""
        return Decimal(self.original_price_cents) / 100
    
    @property
    def savings_amount_cents(self):
        """Calculate savings for packages/bundles in cents."""
        if self.is_package or self.is_bundle:
            return self.original_price_cents - self.price_cents
        return 0
    
    @property
    def savings_amount(self):
        """Calculate savings in dollars."""
        return Decimal(self.savings_amount_cents) / 100
    
    @property
    def savings_percentage(self):
        """Calculate savings percentage for packages/bundles."""
        if (self.is_package or self.is_bundle) and self.original_price_cents > 0:
            return round((self.savings_amount_cents / self.original_price_cents) * 100, 1)
        return 0
    
    def is_available(self):
        """Check if service is currently available for purchase."""
        if not self.is_active:
            return False
            
        if self.available_from and timezone.now() < self.available_from:
            return False
            
        if self.available_until and timezone.now() > self.available_until:
            return False
            
        return True
    
    def save(self, *args, **kwargs):
        """Override save to auto-generate slug if not provided."""
        if not self.slug:
            from django.utils.text import slugify
            base_slug = slugify(self.name)
            slug = base_slug
            counter = 1
            # Ensure slug is unique
            while Service.objects.filter(slug=slug).exclude(pk=self.pk).exists():
                slug = f"{base_slug}-{counter}"
                counter += 1
            self.slug = slug
        super().save(*args, **kwargs)


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
        
    def get_discounted_price_cents(self):
        """
        Calculate the discounted price of this child service when purchased as part of the parent.
        Returns price in cents.
        """
        if not self.child_service or not self.child_service.price_cents:
            return None
            
        if not self.discount_percentage:
            return self.child_service.price_cents
            
        discount_factor = (100 - self.discount_percentage) / 100
        return int(self.child_service.price_cents * discount_factor)
    
    def get_discounted_price(self):
        """
        Get discounted price in dollars.
        """
        price_cents = self.get_discounted_price_cents()
        return Decimal(price_cents) / 100 if price_cents else None


class ServiceSession(models.Model):
    """
    Model representing a scheduled occurrence of ANY service type.

    - For individual 1-to-1 sessions: Created dynamically when user books
    - For workshops: Pre-created by practitioner, multiple users can book
    - For courses: Multiple pre-created sessions (one per class)

    This model is the single source of truth for session scheduling.
    Bookings reference ServiceSession instead of storing times directly.
    """
    # Session type choices
    SESSION_TYPE_CHOICES = [
        ('individual', 'Individual Session'),
        ('workshop', 'Workshop'),
        ('course_session', 'Course Session'),
    ]

    # Visibility choices
    VISIBILITY_CHOICES = [
        ('public', 'Public'),        # Workshops/courses - shown in listings
        ('private', 'Private'),      # 1-to-1 sessions - not shown publicly
        ('unlisted', 'Unlisted'),    # Can access with link, not in listings
    ]

    id = models.BigAutoField(primary_key=True)
    service = models.ForeignKey(Service, models.CASCADE, related_name='sessions')

    # Session categorization (NEW)
    session_type = models.CharField(
        max_length=20,
        choices=SESSION_TYPE_CHOICES,
        default='individual',
        help_text="Type of session - determines visibility and booking behavior"
    )
    visibility = models.CharField(
        max_length=20,
        choices=VISIBILITY_CHOICES,
        default='public',
        help_text="Controls whether session appears in public listings"
    )

    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="Start time of the session. NULL for draft/unscheduled sessions."
    )
    end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="End time of the session. NULL for draft/unscheduled sessions."
    )
    duration = models.PositiveIntegerField(help_text="Duration in minutes", blank=True, null=True)

    # Actual times (when session actually started/ended)
    actual_start_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the session actually started (for billing/analytics)"
    )
    actual_end_time = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When the session actually ended (for billing/analytics)"
    )

    max_participants = models.IntegerField(null=True, blank=True)
    current_participants = models.IntegerField(default=0)
    sequence_number = models.PositiveIntegerField(default=0, help_text="For ordering course sessions")

    # DEPRECATED: room FK removed - use livekit_room (reverse OneToOne) instead
    # Access room via: service_session.livekit_room
    # room = REMOVED - use livekit_room instead
    price_cents = models.IntegerField(blank=True, null=True, help_text="Price override in cents")
    status = models.CharField(max_length=20, default='scheduled')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    agenda = models.TextField(blank=True, null=True)
    what_youll_learn = models.TextField(blank=True, null=True, help_text="Describe what clients will learn or gain from this specific session")

    # Location handling for in-person sessions
    practitioner_location = models.ForeignKey(
        'locations.PractitionerLocation',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='sessions',
        help_text="Practitioner location where this session takes place (for in-person sessions)"
    )
    
    class Meta:
        db_table = 'service_sessions'
        ordering = ['start_time', 'sequence_number']
        # NOTE: Removed unique_together on (service, start_time) to allow multiple
        # individual sessions for the same service at different times
        indexes = [
            models.Index(fields=['service', 'start_time']),
            models.Index(fields=['session_type', 'visibility']),
            models.Index(fields=['visibility', 'start_time']),
            models.Index(fields=['status', 'start_time']),
        ]

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

        # If practitioner_location not specified but service has one, use it
        if self.practitioner_location is None and self.service and hasattr(self.service, 'practitioner_location') and self.service.practitioner_location:
            self.practitioner_location = self.service.practitioner_location

        # Auto-set session_type based on service type if not explicitly set
        if not self.pk and self.service:  # Only on creation
            service_type_code = self.service.service_type.code if self.service.service_type else None

            # Infer session_type from service type if not already set
            if self.session_type == 'individual':  # Default value
                if service_type_code == 'workshop':
                    self.session_type = 'workshop'
                elif service_type_code == 'course':
                    self.session_type = 'course_session'
                # else: remains 'individual' (for session type services)

            # Auto-set visibility based on session_type
            if self.visibility == 'public':  # Default value
                if self.session_type == 'individual':
                    self.visibility = 'private'
                # else: remains 'public' for workshops/courses

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
                "session_type": self.session_type,  # Use the session_type field directly
                "visibility": self.visibility,
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


class ServiceResource(BaseModel):
    """
    Resources that can be attached at different levels:
    - Service level: Default resources for all bookings
    - Session level: Resources for specific workshop/course sessions
    - Booking level: Resources specific to individual bookings
    """
    # Resource types
    RESOURCE_TYPE_CHOICES = [
        ('post', 'Text Post'),
        ('document', 'Document'),  # PDF, DOC, PPT, XLS, TXT
        ('video', 'Video'),        # Upload or external link
        ('image', 'Image'),        # Upload
        ('link', 'External Link'), # General external resource
        ('audio', 'Audio'),        # Podcasts, meditations
    ]
    
    # Access level choices
    ACCESS_LEVEL_CHOICES = [
        ('public', 'Public'),              # Anyone can view
        ('registered', 'Registered Users'), # Any logged-in user
        ('enrolled', 'Enrolled Only'),     # Only users who booked this service
        ('completed', 'Post-Completion'),  # Only after completing service
        ('private', 'Private'),            # Only specific booking recipient
    ]
    
    # Attachment level
    ATTACHMENT_LEVEL_CHOICES = [
        ('service', 'Service Default'),     # Available to all bookings of this service
        ('session', 'Session Specific'),    # For workshop/course sessions
        ('booking', 'Booking Specific'),    # For individual bookings
    ]
    
    # Basic info
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    resource_type = models.CharField(max_length=20, choices=RESOURCE_TYPE_CHOICES)
    attachment_level = models.CharField(max_length=20, choices=ATTACHMENT_LEVEL_CHOICES)
    
    # Content fields
    content = models.TextField(blank=True, null=True,
                              help_text="For text posts and rich content")
    file_url = models.URLField(blank=True, null=True,
                              help_text="URL to uploaded file (S3/CDN)")
    external_url = models.URLField(blank=True, null=True,
                                  help_text="External video/link URL")
    
    # File metadata
    file_name = models.CharField(max_length=255, blank=True, null=True)
    file_size = models.IntegerField(blank=True, null=True,
                                   help_text="File size in bytes")
    file_type = models.CharField(max_length=50, blank=True, null=True,
                                help_text="MIME type")
    duration_seconds = models.IntegerField(blank=True, null=True,
                                         help_text="For video/audio resources")
    
    # Polymorphic relationships (only one should be set)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, 
                               related_name='resources', blank=True, null=True)
    service_session = models.ForeignKey('services.ServiceSession', on_delete=models.CASCADE,
                                       related_name='resources', blank=True, null=True)
    booking = models.ForeignKey('bookings.Booking', on_delete=models.CASCADE,
                               related_name='resources', blank=True, null=True)
    
    # Who added this
    uploaded_by = models.ForeignKey('practitioners.Practitioner', 
                                   on_delete=models.SET_NULL, null=True)
    
    # Access control
    access_level = models.CharField(max_length=20, choices=ACCESS_LEVEL_CHOICES,
                                   default='enrolled')
    is_downloadable = models.BooleanField(default=True,
                                         help_text="Allow downloads for files")
    
    # When to show (optional)
    available_from = models.DateTimeField(blank=True, null=True,
                                         help_text="When resource becomes available")
    available_until = models.DateTimeField(blank=True, null=True,
                                          help_text="When resource expires")
    
    # Organization
    order = models.PositiveIntegerField(default=0)
    is_featured = models.BooleanField(default=False)
    tags = models.JSONField(blank=True, null=True)
    
    # Personal note (for booking-level resources)
    personal_note = models.TextField(blank=True, null=True,
                                    help_text="Practitioner's note to specific client")
    
    # Tracking
    view_count = models.PositiveIntegerField(default=0)
    download_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        ordering = ['order', '-created_at']
        indexes = [
            models.Index(fields=['attachment_level', 'resource_type']),
            models.Index(fields=['service', 'access_level']),
            models.Index(fields=['service_session']),
            models.Index(fields=['booking']),
        ]
        constraints = [
            # Ensure exactly one parent is set based on attachment_level
            models.CheckConstraint(
                check=(
                    models.Q(attachment_level='service', service__isnull=False, 
                            service_session__isnull=True, booking__isnull=True) |
                    models.Q(attachment_level='session', service__isnull=True, 
                            service_session__isnull=False, booking__isnull=True) |
                    models.Q(attachment_level='booking', service__isnull=True, 
                            service_session__isnull=True, booking__isnull=False)
                ),
                name='resource_parent_matches_level'
            )
        ]
    
    def __str__(self):
        if self.attachment_level == 'service' and self.service:
            return f"{self.title} - {self.service.name}"
        elif self.attachment_level == 'session' and self.service_session:
            return f"{self.title} - {self.service_session}"
        elif self.attachment_level == 'booking' and self.booking:
            return f"{self.title} - Booking #{self.booking.id}"
        return self.title


class ServiceResourceAccess(BaseModel):
    """Track user access to resources for analytics and enforcement."""
    resource = models.ForeignKey(ServiceResource, on_delete=models.CASCADE,
                                related_name='access_logs')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    accessed_at = models.DateTimeField(auto_now_add=True)
    action = models.CharField(max_length=20, choices=[
        ('view', 'Viewed'),
        ('download', 'Downloaded'),
    ])
    
    class Meta:
        indexes = [
            models.Index(fields=['resource', 'user']),
            models.Index(fields=['accessed_at']),
        ]
    
    def __str__(self):
        return f"{self.user} {self.action} {self.resource.title}"


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
# Note: Package and Bundle functionality has been consolidated into the Service model
# Use service_type = 'package' or 'bundle' with ServiceRelationship
# ============================================================================
