from django.db import models
from django.core.validators import RegexValidator
import uuid


# ============================================================================
# ABSTRACT BASE CLASSES
# ============================================================================

class TimestampedModel(models.Model):
    """
    Abstract base class that provides self-updating 'created_at' and 'updated_at' fields.
    """
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


class BaseModel(TimestampedModel):
    """
    Abstract base class with integer primary key and timestamps.
    Use this for most internal models for optimal database performance.
    """
    # Django will automatically add: id = models.AutoField(primary_key=True)

    class Meta:
        abstract = True


class SoftDeleteModel(BaseModel):
    """
    Abstract base class that provides soft delete functionality.
    """
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        abstract = True

    def soft_delete(self):
        """Soft delete this instance."""
        from django.utils import timezone
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])

    def restore(self):
        """Restore a soft-deleted instance."""
        self.is_deleted = False
        self.deleted_at = None
        self.save(update_fields=['is_deleted', 'deleted_at'])


class PublicModel(SoftDeleteModel):
    """
    Abstract base class for models that need both internal integer PK and public UUID.
    Provides: id (AutoField) + public_uuid (UUIDField) for secure API exposure.
    Includes soft delete functionality for data retention.
    """
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True,
                                   help_text="Public UUID for API exposure")

    class Meta:
        abstract = True


# ============================================================================
# ADDRESS MODEL
# ============================================================================

class Address(BaseModel):
    """
    Model for storing physical addresses that can be used by any other model.
    For geographic entities (Country, State, City), see the locations app.
    """
    # Basic location info
    name = models.CharField(max_length=255)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100, 
                                    help_text="State, province, or region")
    state_province_code = models.CharField(max_length=10, blank=True, null=True,
                                         help_text="e.g., 'CA', 'ON', 'NSW'")
    postal_code = models.CharField(max_length=20)
    country = models.ForeignKey('locations.Country', on_delete=models.SET_NULL, 
                              null=True, blank=True, related_name='addresses')
    country_code = models.CharField(max_length=2, help_text="ISO 3166-1 alpha-2 country code")
    
    # SEO-friendly fields
    city_slug = models.SlugField(max_length=100, blank=True, db_index=True)
    state_slug = models.SlugField(max_length=100, blank=True, db_index=True)
    
    # Metro area for grouping
    metro_area = models.CharField(max_length=100, blank=True, null=True,
                                help_text="e.g., 'San Francisco Bay Area', 'Greater NYC'")
    
    # Geographic coordinates
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Additional metadata
    timezone = models.CharField(max_length=50, default='UTC')
    is_verified = models.BooleanField(default=False)
    location_type = models.CharField(max_length=20, choices=[
        ('office', 'Office'),
        ('home', 'Home'),
        ('clinic', 'Clinic'),
        ('studio', 'Studio'),
        ('online', 'Online Only'),
        ('other', 'Other'),
    ], default='office')
    
    # Service tracking
    active_service_count = models.PositiveIntegerField(default=0,
                                                     help_text="Number of active services at this location")

    class Meta:
        verbose_name = 'Address'
        verbose_name_plural = 'Addresses'
        indexes = [
            models.Index(fields=['city', 'state_province']),
            models.Index(fields=['state_province']),
            models.Index(fields=['postal_code']),
            models.Index(fields=['country_code']),
            models.Index(fields=['latitude', 'longitude']),
            models.Index(fields=['is_verified']),
            models.Index(fields=['metro_area']),
        ]

    def __str__(self):
        return f"{self.name} - {self.city}, {self.state_province}"

    @property
    def full_address(self):
        """Return formatted full address."""
        address_parts = [self.address_line_1]
        if self.address_line_2:
            address_parts.append(self.address_line_2)
        address_parts.extend([self.city, self.state_province, self.postal_code])
        return ", ".join(address_parts)
    
    def save(self, *args, **kwargs):
        """Auto-generate slugs if not provided."""
        if not self.city_slug and self.city:
            from django.utils.text import slugify
            self.city_slug = slugify(self.city)
        if not self.state_slug and self.state_province:
            from django.utils.text import slugify
            self.state_slug = slugify(self.state_province)
        super().save(*args, **kwargs)
    
    @property
    def seo_url_path(self):
        """Generate SEO-friendly URL path like 'san-francisco-ca'."""
        if self.city_slug and self.state_slug:
            return f"{self.city_slug}-{self.state_slug}"
        return None


# ============================================================================
# EXISTING MODELS (Updated to use new base classes)
# ============================================================================


# Note: Country model has been moved to locations.models for better organization


class Holiday(BaseModel):
    """
    Model representing a holiday for a specific country.
    Updated to use BaseModel and improved relationships.
    """
    name = models.CharField(max_length=255, help_text="Holiday name")
    country = models.ForeignKey('locations.Country', on_delete=models.CASCADE, related_name='holidays')
    date = models.DateField()
    is_recurring = models.BooleanField(default=True, help_text="Whether this holiday recurs annually")
    is_business_day = models.BooleanField(default=False, help_text="Whether businesses typically remain open")
    
    class Meta:
        verbose_name = 'Holiday'
        verbose_name_plural = 'Holidays'
        ordering = ['date', 'name']
        unique_together = ['country', 'name', 'date']
        indexes = [
            models.Index(fields=['country', 'date']),
            models.Index(fields=['date']),
        ]

    def __str__(self):
        return f"{self.name} ({self.date}) - {self.country.name}"




class Language(BaseModel):
    """
    Model representing languages that services can be offered in.
    Updated to use BaseModel and improved structure.
    """
    name = models.CharField(max_length=100, help_text="English name of the language")
    native_name = models.CharField(max_length=100, blank=True, null=True, 
                                 help_text="Name of the language in its native form")
    code = models.CharField(max_length=10, unique=True, 
                          help_text="ISO 639-1 language code (e.g., 'en', 'es', 'fr')")
    code_3 = models.CharField(max_length=3, blank=True, null=True,
                            help_text="ISO 639-3 language code")
    is_rtl = models.BooleanField(default=False, help_text="Whether language is right-to-left")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    class Meta:
        verbose_name = 'Language'
        verbose_name_plural = 'Languages'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active', 'order']),
        ]

    def __str__(self):
        return self.native_name if self.native_name else self.name