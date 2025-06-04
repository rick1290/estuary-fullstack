from django.db import models
from django.utils.text import slugify


class State(models.Model):
    """
    Model for US states.
    """
    name = models.CharField(max_length=100)
    abbreviation = models.CharField(max_length=2)
    slug = models.SlugField(unique=True)
    
    class Meta:
        ordering = ['name']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class City(models.Model):
    """
    Model for cities with geo coordinates.
    """
    name = models.CharField(max_length=100)
    state = models.ForeignKey(State, on_delete=models.CASCADE, related_name='cities')
    slug = models.SlugField()
    population = models.IntegerField(null=True, blank=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_major = models.BooleanField(default=False)  # Flag for SEO-focused cities
    
    class Meta:
        unique_together = ('state', 'slug')
        ordering = ['-population']
        verbose_name_plural = 'Cities'
    
    def __str__(self):
        return f"{self.name}, {self.state.abbreviation}"
    
    def save(self, *args, **kwargs):
        if not self.slug:
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


class ZipCode(models.Model):
    """
    Model for zip codes with geo coordinates.
    """
    code = models.CharField(max_length=10, unique=True)
    city = models.ForeignKey(City, on_delete=models.CASCADE, related_name='zip_codes', null=True)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    
    class Meta:
        ordering = ['code']
    
    def __str__(self):
        return self.code


class PractitionerLocation(models.Model):
    """
    Model for practitioner service locations.
    """
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=255, blank=True, null=True, help_text="Optional name for this location (e.g., 'Downtown Office')")
    address_line1 = models.CharField(max_length=255)
    address_line2 = models.CharField(max_length=255, blank=True, null=True)
    city = models.ForeignKey(City, on_delete=models.SET_NULL, null=True, related_name='practitioner_locations')
    state = models.ForeignKey(State, on_delete=models.SET_NULL, null=True)
    zip_code = models.CharField(max_length=10)
    latitude = models.DecimalField(max_digits=9, decimal_places=6)
    longitude = models.DecimalField(max_digits=9, decimal_places=6)
    is_primary = models.BooleanField(default=False)
    is_virtual = models.BooleanField(default=False, help_text="Whether this practitioner offers virtual services from this location")
    is_in_person = models.BooleanField(default=True, help_text="Whether this practitioner offers in-person services at this location")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        ordering = ['-is_primary', 'created_at']
    
    def __str__(self):
        location_name = self.name or f"{self.address_line1}, {self.city}, {self.state.abbreviation}"
        return f"{self.practitioner} - {location_name}"
    
    def save(self, *args, **kwargs):
        # If this is being marked as primary, unmark other locations for this practitioner
        if self.is_primary:
            PractitionerLocation.objects.filter(
                practitioner=self.practitioner, 
                is_primary=True
            ).exclude(id=self.id).update(is_primary=False)
        super().save(*args, **kwargs)
