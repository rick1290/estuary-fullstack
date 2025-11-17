from django.db import models
from utils.models import BaseModel


class Modality(BaseModel):
    """
    Model representing treatment modalities.
    Used by both practitioners and services to categorize offerings.
    Moved to common app as it's a shared business entity across domains.

    Examples: Yoga, Meditation, Massage Therapy, Life Coaching
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True, null=True, help_text="URL-friendly version of name")
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon class or identifier")
    category = models.CharField(max_length=50, blank=True, null=True, help_text="Modality category for grouping")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False, help_text="Whether to feature this modality on homepage and marketing")
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    class Meta:
        verbose_name = 'Modality'
        verbose_name_plural = 'Modalities'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
            models.Index(fields=['category']),
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