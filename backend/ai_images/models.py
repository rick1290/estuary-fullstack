from django.db import models
from django.conf import settings


class GeneratedImage(models.Model):
    """Tracks AI-generated images with prompts and metadata"""

    # Who generated it
    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='generated_images',
        help_text="Practitioner who generated this image"
    )

    # The prompt and result
    user_prompt = models.TextField(
        help_text="Original prompt from practitioner"
    )
    full_prompt = models.TextField(
        help_text="Complete prompt sent to AI (includes brand guidelines)"
    )
    image = models.ImageField(
        upload_to='ai_generated/%Y/%m/',
        help_text="Generated image file"
    )

    # Optional service association
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='generated_images',
        help_text="Service this image was applied to"
    )

    # Metadata
    model_used = models.CharField(
        max_length=100,
        default='gemini-2.5-flash-image',
        help_text="AI model version used"
    )
    generation_time_seconds = models.FloatField(
        null=True,
        blank=True,
        help_text="Time taken to generate image"
    )
    is_applied = models.BooleanField(
        default=False,
        help_text="Whether practitioner used this image"
    )

    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    applied_at = models.DateTimeField(
        null=True,
        blank=True,
        help_text="When image was applied to a service"
    )

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['practitioner', '-created_at']),
            models.Index(fields=['service']),
        ]

    def __str__(self):
        return f"Generated image for {self.practitioner} - {self.created_at.strftime('%Y-%m-%d %H:%M')}"

    @property
    def image_url(self):
        """Return full URL of the generated image"""
        if self.image:
            return self.image.url
        return None
