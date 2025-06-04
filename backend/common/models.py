from django.db import models
from utils.models import BaseModel


class Modality(BaseModel):
    """
    Model representing treatment modalities.
    Used by both practitioners and users to indicate preferences.
    Moved to common app as it's a shared business entity across domains.
    """
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True, null=True)
    icon = models.CharField(max_length=50, blank=True, null=True, help_text="Icon class or identifier")
    category = models.CharField(max_length=50, blank=True, null=True, help_text="Modality category for grouping")
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    class Meta:
        verbose_name = 'Modality'
        verbose_name_plural = 'Modalities'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
            models.Index(fields=['category']),
        ]

    def __str__(self):
        return self.name