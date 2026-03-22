from django.db import models
from utils.models import BaseModel


class ModalityCategory(BaseModel):
    """
    Category grouping for modalities.
    Examples: Breathwork, Yoga, Energy & Vibrational Healing
    """
    name = models.CharField(max_length=100, unique=True)
    slug = models.SlugField(max_length=100, unique=True, blank=True)
    short_description = models.TextField(blank=True, default='')
    long_description = models.TextField(blank=True, default='')
    icon = models.CharField(max_length=50, blank=True, null=True)
    color = models.CharField(max_length=7, blank=True, default='', help_text="Hex color code for UI theming")
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    seo_meta_title = models.CharField(max_length=200, blank=True, null=True)
    seo_meta_description = models.TextField(blank=True, null=True)

    class Meta:
        verbose_name = 'Modality Category'
        verbose_name_plural = 'Modality Categories'
        ordering = ['order', 'name']

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)


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
    # Legacy CharField category — kept for backward compat, new code uses category_ref FK
    category = models.CharField(max_length=50, blank=True, null=True, help_text="Modality category for grouping (legacy)")
    is_active = models.BooleanField(default=True)
    is_featured = models.BooleanField(default=False, help_text="Whether to feature this modality on homepage and marketing")
    order = models.PositiveIntegerField(default=0, help_text="Display order")

    # New fields
    category_ref = models.ForeignKey(
        ModalityCategory,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='modalities',
        help_text="FK to ModalityCategory"
    )
    cluster = models.CharField(max_length=100, blank=True, null=True, help_text="Sub-group within category")
    short_description = models.TextField(blank=True, null=True)
    long_description = models.TextField(blank=True, null=True)
    benefits = models.JSONField(default=list, blank=True, help_text="Array of benefit strings")
    faqs = models.JSONField(default=list, blank=True, help_text="Array of {question, answer} objects")
    seo_meta_title = models.CharField(max_length=200, blank=True, null=True)
    seo_meta_description = models.TextField(blank=True, null=True)
    seo_primary_keyword = models.CharField(max_length=200, blank=True, null=True)
    seo_secondary_keywords = models.JSONField(default=list, blank=True)
    related_modalities = models.ManyToManyField('self', symmetrical=True, blank=True)
    gray_zone = models.BooleanField(default=False, help_text="Whether this modality overlaps with licensed therapy")

    class Meta:
        verbose_name = 'Modality'
        verbose_name_plural = 'Modalities'
        ordering = ['order', 'name']
        indexes = [
            models.Index(fields=['is_active', 'order']),
            models.Index(fields=['category']),
            models.Index(fields=['slug']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['category_ref', 'cluster']),
        ]

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if not self.slug:
            from django.utils.text import slugify
            self.slug = slugify(self.name)
        super().save(*args, **kwargs)
