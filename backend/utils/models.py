from django.db import models
import uuid


class Country(models.Model):
    """
    Model representing a country.
    """
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField()
    country = models.CharField(unique=True)
    country_code = models.CharField()

    class Meta:
        db_table = 'countries'

    def __str__(self):
        return self.country


class Holiday(models.Model):
    """
    Model representing a holiday for a specific country.
    """
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField()
    country_code = models.CharField()
    country = models.ForeignKey(Country, models.DO_NOTHING, db_column='country', to_field='country')
    holiday = models.CharField()
    date = models.DateField()

    class Meta:
        db_table = 'holidays'

    def __str__(self):
        return f"{self.holiday} ({self.date}) - {self.country}"


class Modality(models.Model):
    """
    Model representing treatment modalities.
    Used by both practitioners and users to indicate preferences.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'modalities'
        verbose_name = 'Modality'
        verbose_name_plural = 'Modalities'
        ordering = ['name']

    def __str__(self):
        return self.name


class Language(models.Model):
    """
    Model representing languages that services can be offered in.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    name = models.CharField(max_length=100)
    code = models.CharField(max_length=10, unique=True, help_text="ISO language code (e.g., 'en', 'es', 'fr')")
    native_name = models.CharField(max_length=100, blank=True, null=True, help_text="Name of the language in its native form")
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'languages'
        verbose_name = 'Language'
        verbose_name_plural = 'Languages'
        ordering = ['name']

    def __str__(self):
        return self.name