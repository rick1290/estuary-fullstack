import uuid
from django.db import models
from django.utils import timezone
from django.core.validators import MinValueValidator, MaxValueValidator


class ServiceType(models.Model):
    """
    Model representing a service type.
    """
    id = models.SmallAutoField(primary_key=True)
    name = models.CharField(max_length=50)  # 'session', 'workshop', 'package', 'bundle', 'course'
    code = models.CharField(max_length=20, unique=True, null=True, blank=True, help_text="Unique code for this service type (e.g., 'session', 'workshop')")
    description = models.TextField(blank=True, null=True)

    class Meta:
        # Using Django's default naming convention (services_servicetype)
        db_table_comment = 'Base Table For Service Type'

    def __str__(self):
        return self.name


class Location(models.Model):
    """
    Model representing a service location with Google Maps integration.
    """
    id = models.BigIntegerField(primary_key=True)  # Keeping original ID type for compatibility
    name = models.TextField()  # Keeping original field type for compatibility
    
    # Address components for structured data
    address_line1 = models.CharField(max_length=255, blank=True, null=True, help_text="Street address")
    address_line2 = models.CharField(max_length=255, blank=True, null=True, help_text="Apt, Suite, etc.")
    city = models.CharField(max_length=100, blank=True, null=True)
    state = models.CharField(max_length=100, blank=True, null=True)
    postal_code = models.CharField(max_length=20, blank=True, null=True)
    country = models.CharField(max_length=100, blank=True, null=True, default="United States")
    
    # Google Maps specific fields
    latitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, blank=True, null=True)
    place_id = models.CharField(max_length=255, blank=True, null=True, help_text="Google Maps Place ID")
    
    # Additional fields
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True, null=True)
    updated_at = models.DateTimeField(auto_now=True, null=True)
    
    class Meta:
        # Using Django's default naming convention (services_location)
        db_table_comment = 'Location of service with Google Maps integration'

    def __str__(self):
        return self.name
    
    def formatted_address(self):
        """Return a fully formatted address string"""
        components = []
        if self.address_line1:
            components.append(self.address_line1)
        if self.address_line2:
            components.append(self.address_line2)
        city_state = []
        if self.city:
            city_state.append(self.city)
        if self.state:
            city_state.append(self.state)
        if self.postal_code:
            city_state.append(self.postal_code)
        if city_state:
            components.append(", ".join(city_state))
        if self.country:
            components.append(self.country)
        return ", ".join(components) if components else self.name
    
    def geocode(self):
        """
        Geocode this location to get coordinates and place ID.
        
        Returns:
            bool: True if geocoding was successful, False otherwise
        """
        from apps.integrations.google_maps.utils import geocode_location
        return geocode_location(self)
    
    def get_details(self):
        """
        Get detailed information about this location from Google Maps.
        
        Returns:
            dict: Location details or None if not found
        """
        if not self.place_id:
            # Try to geocode first if we don't have a place_id
            if not self.geocode():
                return None
                
        from apps.integrations.google_maps.utils import get_location_details
        return get_location_details(self.place_id)
    
    def calculate_distance_to(self, other_location, mode='driving'):
        """
        Calculate the distance and duration to another location.
        
        Args:
            other_location: Another Location model instance
            mode (str): Travel mode (driving, walking, bicycling, transit)
            
        Returns:
            dict: Distance and duration information or None if calculation failed
        """
        # Ensure both locations have coordinates
        if not (self.latitude and self.longitude):
            self.geocode()
            
        if not (other_location.latitude and other_location.longitude):
            other_location.geocode()
            
        from apps.integrations.google_maps.utils import calculate_distance_between_locations
        return calculate_distance_between_locations(self, other_location, mode)
    
    def save(self, *args, **kwargs):
        """Override save to geocode if coordinates are missing"""
        # Track whether this is a new instance
        is_new = self.pk is None
        
        # Save first
        super().save(*args, **kwargs)
        
        # Only geocode if we're not already in a geocoding operation
        # and we have address components but no coordinates
        geocode_needed = not (self.latitude and self.longitude) and (self.address_line1 or self.city)
        
        # Use update_fields to check if we're in a partial update that doesn't need geocoding
        update_fields = kwargs.get('update_fields')
        if update_fields and not any(field in update_fields for field in 
                                    ['address_line1', 'address_line2', 'city', 'state', 'postal_code', 'country']):
            geocode_needed = False
            
        if geocode_needed:
            # Import here to avoid circular imports
            from apps.integrations.google_maps.utils import geocode_location
            geocode_location(self)


class Service(models.Model):
    """
    Model representing a service offered by a practitioner.
    """
    EXPERIENCE_LEVEL_CHOICES = [
        ('beginner', 'Beginner'),
        ('intermediate', 'Intermediate'),
        ('advanced', 'Advanced'),
        ('all_levels', 'All Levels'),
    ]
    
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    name = models.TextField()
    description = models.TextField(blank=True, null=True)
    price = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    duration = models.IntegerField(blank=True, null=True)
    practitioners = models.ManyToManyField(
        'practitioners.Practitioner', 
        through='ServicePractitioner',
        related_name='services',
        blank=True
    )
    service_type = models.ForeignKey(ServiceType, models.DO_NOTHING, blank=True, null=True)
    category = models.ForeignKey('ServiceCategory', on_delete=models.SET_NULL, blank=True, null=True, related_name='services')
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False)
    max_participants = models.PositiveIntegerField(default=1)
    min_participants = models.PositiveIntegerField(default=1)
    location_type = models.CharField(max_length=20, choices=[
        ('virtual', 'Virtual'),
        ('in_person', 'In Person'),
        ('hybrid', 'Hybrid'),
    ], default='virtual')
    
    location = models.ForeignKey(
        Location,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='services',
        help_text="Structured location where this service is provided (for in-person and hybrid services)"
    )
    
    tags = models.JSONField(blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    total_reviews = models.PositiveIntegerField(default=0)
    total_bookings = models.PositiveIntegerField(default=0)
    experience_level = models.CharField(max_length=20, choices=EXPERIENCE_LEVEL_CHOICES, default='all_levels')
    languages = models.ManyToManyField('utils.Language', related_name='services', blank=True)
    what_youll_learn = models.TextField(blank=True, null=True, help_text="Describe what clients will learn or gain from this service")
    
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


class ServiceCategory(models.Model):
    """
    Model for hierarchical service categories.
    
    This is the primary category model used for organizing services.
    Practitioners can create their own categories to organize their services.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    name = models.CharField(max_length=255)
    slug = models.SlugField(max_length=255, unique=True)
    description = models.TextField(blank=True, null=True)
    parent = models.ForeignKey('self', on_delete=models.CASCADE, blank=True, null=True, related_name='children')
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    image_url = models.URLField(blank=True, null=True)
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, blank=True, null=True, related_name='categories')
    is_system = models.BooleanField(default=False, help_text="If True, this is a system-defined category that cannot be modified by practitioners")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'service_categories'
        ordering = ['order', 'name']
        verbose_name_plural = 'Service categories'
        indexes = [
            models.Index(fields=['parent']),
            models.Index(fields=['is_active']),
            models.Index(fields=['slug']),
            models.Index(fields=['practitioner']),
        ]
    
    def __str__(self):
        return self.name
    
    @property
    def full_path(self):
        """
        Returns the full category path (e.g., 'Health > Mental Health > Therapy')
        """
        if self.parent:
            return f"{self.parent.full_path} > {self.name}"
        return self.name
    
    def get_all_children(self, include_self=False):
        """
        Returns all child categories recursively
        """
        r = []
        if include_self:
            r.append(self)
        for c in self.children.all():
            _r = c.get_all_children(include_self=True)
            if _r:
                r.extend(_r)
        return r


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
