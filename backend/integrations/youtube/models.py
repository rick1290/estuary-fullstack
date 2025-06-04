from django.db import models
import uuid


class YouTubeVideo(models.Model):
    """
    Model for tracking YouTube video uploads.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    # YouTube video details
    youtube_video_id = models.CharField(max_length=20, unique=True, null=True, blank=True)
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    
    # Source information
    source_file_url = models.URLField(help_text="URL to the source file in Cloudflare R2")
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='youtube_videos')
    
    # Status tracking
    STATUS_CHOICES = [
        ('pending', 'Pending'),
        ('processing', 'Processing'),
        ('uploaded', 'Uploaded'),
        ('published', 'Published'),
        ('failed', 'Failed'),
    ]
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    error_message = models.TextField(blank=True, null=True)
    
    # Privacy settings
    PRIVACY_CHOICES = [
        ('private', 'Private'),
        ('unlisted', 'Unlisted'),
        ('public', 'Public'),
    ]
    privacy_status = models.CharField(max_length=10, choices=PRIVACY_CHOICES, default='unlisted')
    
    # Video processing options
    apply_video_processing = models.BooleanField(default=True, help_text="Apply video processing to the video")
    
    class Meta:
        verbose_name = 'YouTube Video'
        verbose_name_plural = 'YouTube Videos'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.title} ({self.youtube_video_id or 'Not uploaded'})"
    
    def mark_as_processing(self):
        """Mark the video as processing."""
        self.status = 'processing'
        self.save(update_fields=['status', 'updated_at'])
    
    def mark_as_uploaded(self, youtube_video_id):
        """Mark the video as successfully uploaded."""
        self.youtube_video_id = youtube_video_id
        self.status = 'uploaded'
        self.save(update_fields=['youtube_video_id', 'status', 'updated_at'])
    
    def mark_as_published(self):
        """Mark the video as published (public)."""
        self.status = 'published'
        self.privacy_status = 'public'
        self.save(update_fields=['status', 'privacy_status', 'updated_at'])
    
    def mark_as_failed(self, error_message):
        """Mark the video upload as failed."""
        self.status = 'failed'
        self.error_message = error_message
        self.save(update_fields=['status', 'error_message', 'updated_at'])
