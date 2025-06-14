from django.db import models
from django.utils.text import slugify
from utils.models import BaseModel


class Country(BaseModel):
    """
    Model representing a country.
    """
    name = models.CharField(max_length=100, unique=True, help_text="Full country name")
    code = models.CharField(max_length=2, unique=True, help_text="ISO 3166-1 alpha-2 country code")
    code_3 = models.CharField(max_length=3, unique=True, help_text="ISO 3166-1 alpha-3 country code")
    numeric_code = models.CharField(max_length=3, blank=True, null=True, help_text="ISO 3166-1 numeric code")
    slug = models.SlugField(max_length=100, unique=True)
    
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
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class State(BaseModel):
    """
    Model for states/provinces/regions.
    Supports both US states and international subdivisions.
    """
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='states')
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, help_text="State/province code (e.g., 'CA', 'ON', 'NSW')")
    slug = models.SlugField(max_length=100)
    is_active = models.BooleanField(default=True)
    
    # SEO fields
    meta_title = models.CharField(max_length=200, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    
    class Meta:
        ordering = ['country', 'name']
        unique_together = ['country', 'slug']
        indexes = [
            models.Index(fields=['country', 'is_active']),
            models.Index(fields=['code']),
        ]
    
    def __str__(self):
        return f"{self.name}, {self.country.code}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class City(BaseModel):
    """
    Model for cities with geo coordinates.
    """
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='cities')
    slug = models.SlugField(max_length=100)
    population = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Metro area for grouping
    metro_area = models.CharField(max_length=100, blank=True, null=True,
                                help_text="e.g., 'San Francisco Bay Area', 'Greater NYC'")
    
    # SEO and discovery
    is_major = models.BooleanField(default=False, help_text="Flag for SEO-focused cities")
    is_active = models.BooleanField(default=True)
    service_count = models.PositiveIntegerField(default=0, help_text="Number of active services")
    
    # SEO fields
    meta_title = models.CharField(max_length=200, blank=True, null=True)
    meta_description = models.TextField(blank=True, null=True)
    
    class Meta:
        unique_together = ('state', 'slug')
        ordering = ['-is_major', '-population', 'name']
        verbose_name_plural = 'Cities'
        indexes = [
            models.Index(fields=['state', 'is_active']),
            models.Index(fields=['metro_area']),
            models.Index(fields=['is_major', 'is_active']),
        ]
    
    def __str__(self):
        return f"{self.name}, {self.state.code}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
    
    @property
    def seo_url(self):
        """Generate SEO-friendly URL path like 'san-francisco-ca'."""
        return f"{self.slug}-{self.state.code.lower()}"


class ZipCode(BaseModel):
    """
    Model for postal codes with geo coordinates.
    Supports international postal codes, not just US zip codes.
    """
    code = models.CharField(max_length=20, unique=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='postal_codes', null=True)
    country = models.ForeignKey(Country, on_delete=models.CASCADE, related_name='postal_codes')
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    class Meta:
        ordering = ['country', 'code']
        verbose_name = 'Postal Code'
        verbose_name_plural = 'Postal Codes'
        indexes = [
            models.Index(fields=['country', 'code']),
        ]
    
    def __str__(self):
        return f"{self.code} ({self.country.code})"


class PractitionerLocation(BaseModel):
    """
    Model for practitioner service locations.
    Links practitioners to their service locations.
    """
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=255, blank=True, null=True, help_text="Optional name for this location (e.g., 'Downtown Office')")
    
    # Address information
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, related_name='practitioner_locations')
    state = models.ForeignKey(State, on_delete=models.SET_NULL, null=True)
    postal_code = models.CharField(max_length=20)
    country = models.ForeignKey(Country, on_delete=models.SET_NULL, null=True)
    
    # Coordinates
    latitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    longitude = models.DecimalField(max_digits=9, decimal_places=6, null=True, blank=True)
    
    # Service types
    is_primary = models.BooleanField(default=False)
    is_virtual = models.BooleanField(default=False, help_text="Whether this practitioner offers virtual services from this location")
    is_in_person = models.BooleanField(default=True, help_text="Whether this practitioner offers in-person services at this location")
    
    # Service radius
    service_radius_miles = models.DecimalField(
        max_digits=5, decimal_places=1, null=True, blank=True,
        help_text="Service area radius in miles (for mobile services)"
    )
    
    class Meta:
        ordering = ['-is_primary', 'created_at']
        indexes = [
            models.Index(fields=['practitioner', 'is_primary']),
            models.Index(fields=['city', 'is_in_person']),
        ]
    
    def __str__(self):
        location_name = self.name or f"{self.address_line1}, {self.city.name}, {self.state.code}"
        return f"{self.practitioner} - {location_name}"
    
    def save(self, *args, **kwargs):
        # If this is being marked as primary, unmark other locations for this practitioner
        if self.is_primary:
            PractitionerLocation.objects.filter(
                practitioner=self.practitioner, 
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)
