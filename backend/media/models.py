"""
Media models for the marketplace
"""
from django.db import models
from django.core.validators import FileExtensionValidator
from utils.models import PublicModel
from django.contrib.postgres.fields import ArrayField
import uuid


class MediaType(models.TextChoices):
    """Media type choices"""
    IMAGE = 'image', 'Image'
    VIDEO = 'video', 'Video'
    DOCUMENT = 'document', 'Document'
    AUDIO = 'audio', 'Audio'


class MediaStatus(models.TextChoices):
    """Media processing status choices"""
    PENDING = 'pending', 'Pending'
    PROCESSING = 'processing', 'Processing'
    READY = 'ready', 'Ready'
    FAILED = 'failed', 'Failed'
    DELETED = 'deleted', 'Deleted'


class MediaEntityType(models.TextChoices):
    """Types of entities that can have media"""
    SERVICE = 'service', 'Service'
    PRACTITIONER = 'practitioner', 'Practitioner'
    REVIEW = 'review', 'Review'
    USER = 'user', 'User'
    STREAM_POST = 'stream_post', 'Stream Post'
    ROOM_RECORDING = 'room_recording', 'Room Recording'


class Media(PublicModel):
    """
    Generic media model that can be associated with any entity
    """
    # Use UUID as primary key for API compatibility
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    
    # File information (aligned with API schema)
    url = models.URLField(max_length=500, help_text="URL to the file in CloudFlare R2")
    thumbnail_url = models.URLField(max_length=500, blank=True, null=True, 
                                   help_text="URL to the thumbnail version")
    filename = models.CharField(max_length=255)  # Changed from original_filename
    file_size = models.PositiveBigIntegerField(help_text="File size in bytes")
    content_type = models.CharField(max_length=100)  # Changed from mime_type
    media_type = models.CharField(max_length=20, choices=MediaType.choices)
    
    # Entity relationship (simplified from generic relation)
    entity_type = models.CharField(max_length=50, choices=MediaEntityType.choices)
    entity_id = models.UUIDField()
    
    # Storage information
    storage_key = models.CharField(max_length=500, help_text="Key/path in storage backend")
    
    # Metadata
    title = models.CharField(max_length=255, blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    alt_text = models.CharField(max_length=500, blank=True, null=True,
                               help_text="Alternative text for accessibility")
    
    # Status and processing
    status = models.CharField(max_length=20, choices=MediaStatus.choices, 
                            default=MediaStatus.PENDING)
    processing_metadata = models.JSONField(blank=True, null=True,
                                         help_text="Processing metadata and results")
    error_message = models.TextField(blank=True, null=True)
    
    # Media-specific dimensions and metadata
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    duration = models.FloatField(null=True, blank=True, help_text="Duration in seconds for audio/video")
    
    # Ordering and display
    is_primary = models.BooleanField(default=False, 
                                   help_text="Primary media for the entity")
    display_order = models.PositiveIntegerField(default=0, 
                                              help_text="Display order within entity")
    
    # Upload tracking
    uploaded_by = models.ForeignKey('users.User', on_delete=models.SET_NULL, 
                                  null=True, related_name='uploaded_media')
    
    # Usage stats
    view_count = models.PositiveIntegerField(default=0)
    download_count = models.PositiveIntegerField(default=0)
    
    # Processing timestamp
    processed_at = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = 'Media'
        verbose_name_plural = 'Media'
        ordering = ['display_order', '-created_at']
        indexes = [
            models.Index(fields=['entity_type', 'entity_id']),
            models.Index(fields=['media_type']),
            models.Index(fields=['status']),
            models.Index(fields=['is_primary']),
            models.Index(fields=['uploaded_by']),
        ]
        constraints = [
            # Only one primary media per entity
            models.UniqueConstraint(
                fields=['entity_type', 'entity_id'],
                condition=models.Q(is_primary=True),
                name='unique_primary_media_per_entity'
            )
        ]
    
    def __str__(self):
        return f"{self.media_type} - {self.filename}"
    
    def save(self, *args, **kwargs):
        # Ensure only one primary media per entity
        if self.is_primary:
            Media.objects.filter(
                entity_type=self.entity_type,
                entity_id=self.entity_id,
                is_primary=True
            ).exclude(pk=self.pk).update(is_primary=False)
        
        super().save(*args, **kwargs)


class MediaVersion(models.Model):
    """
    Different versions/sizes of the same media (renamed from MediaVariant for API compatibility)
    """
    media = models.ForeignKey(Media, on_delete=models.CASCADE, related_name='versions')
    version_type = models.CharField(max_length=50, help_text="e.g., 'thumbnail', 'small', 'medium', 'large', 'hd'")
    url = models.URLField(max_length=500)
    storage_key = models.CharField(max_length=500, help_text="Key/path in storage backend")
    width = models.PositiveIntegerField(null=True, blank=True)
    height = models.PositiveIntegerField(null=True, blank=True)
    file_size = models.PositiveBigIntegerField()
    format = models.CharField(max_length=20)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Media Version'
        verbose_name_plural = 'Media Versions'
        unique_together = ['media', 'version_type']
        ordering = ['version_type']
    
    def __str__(self):
        return f"{self.media.filename} - {self.version_type}"


# Keep MediaVariant as an alias for backward compatibility
MediaVariant = MediaVersion


class MediaProcessingJob(models.Model):
    """
    Track media processing jobs
    """
    class JobStatus(models.TextChoices):
        QUEUED = 'queued', 'Queued'
        PROCESSING = 'processing', 'Processing'
        COMPLETED = 'completed', 'Completed'
        FAILED = 'failed', 'Failed'
        CANCELLED = 'cancelled', 'Cancelled'
    
    media = models.ForeignKey(Media, on_delete=models.CASCADE, 
                            related_name='processing_jobs')
    job_id = models.UUIDField(default=uuid.uuid4, editable=False, unique=True)
    status = models.CharField(max_length=20, choices=JobStatus.choices, 
                            default=JobStatus.QUEUED)
    operations = ArrayField(models.CharField(max_length=50), 
                          help_text="List of operations to perform")
    options = models.JSONField(default=dict, 
                             help_text="Processing options and parameters")
    progress = models.FloatField(default=0.0, 
                               help_text="Progress percentage (0-100)")
    current_operation = models.CharField(max_length=100, blank=True, null=True)
    completed_operations = ArrayField(models.CharField(max_length=50), 
                                    blank=True, default=list)
    error_message = models.TextField(blank=True, null=True)
    started_at = models.DateTimeField(null=True, blank=True)
    completed_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Media Processing Job'
        verbose_name_plural = 'Media Processing Jobs'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['job_id']),
            models.Index(fields=['status']),
            models.Index(fields=['created_at']),
        ]
    
    def __str__(self):
        return f"Job {self.job_id} - {self.status}"