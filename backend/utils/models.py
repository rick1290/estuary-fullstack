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


class PublicModel(BaseModel):
    """
    Abstract base class for models that need both internal integer PK and public UUID.
    Provides: id (AutoField) + public_uuid (UUIDField) for secure API exposure.
    """
    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, db_index=True,
                                   help_text="Public UUID for API exposure")

    class Meta:
        abstract = True


# ============================================================================
# LOCATION MODELS (Consolidated)
# ============================================================================

class Location(BaseModel):
    """
    Consolidated location model to replace scattered location implementations.
    """
    # Basic location info
    name = models.CharField(max_length=255)
    address_line_1 = models.CharField(max_length=255)
    address_line_2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.CharField(max_length=100)
    state_province = models.CharField(max_length=100)
    postal_code = models.CharField(max_length=20)
    country_code = models.CharField(max_length=2, help_text="ISO 3166-1 alpha-2 country code")
    
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

    class Meta:
        verbose_name = 'Location'
        verbose_name_plural = 'Locations'
        indexes = [
            models.Index(fields=['city', 'state_province']),
            models.Index(fields=['country_code']),
            models.Index(fields=['latitude', 'longitude']),
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


# ============================================================================
# EXISTING MODELS (Updated to use new base classes)
# ============================================================================


class Country(BaseModel):
    """
    Model representing a country.
    Updated to use BaseModel for consistency.
    """
    name = models.CharField(max_length=100, unique=True, help_text="Full country name")
    code = models.CharField(max_length=2, unique=True, help_text="ISO 3166-1 alpha-2 country code")
    code_3 = models.CharField(max_length=3, unique=True, help_text="ISO 3166-1 alpha-3 country code")
    numeric_code = models.CharField(max_length=3, blank=True, null=True, help_text="ISO 3166-1 numeric code")
    
    # Additional useful fields
    phone_code = models.CharField(max_length=10, blank=True, null=True, help_text="International dialing code")
    currency_code = models.CharField(max_length=3, blank=True, null=True, help_text="ISO 4217 currency code")
    is_active = models.BooleanField(default=True)

    class Meta:
        verbose_name = 'Country'
        verbose_name_plural = 'Countries'
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def __str__(self):
        return self.name


class Holiday(BaseModel):
    """
    Model representing a holiday for a specific country.
    Updated to use BaseModel and improved relationships.
    """
    name = models.CharField(max_length=255, help_text="Holiday name")
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='holidays')
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