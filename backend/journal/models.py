import uuid
from django.db import models
from django.conf import settings


class JournalEntry(models.Model):
    ENTRY_TYPE_CHOICES = [
        ('intention', 'Intention'),
        ('reflection', 'Reflection'),
        ('note', 'Note'),
        ('takeaway', 'Takeaway'),
    ]

    public_uuid = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='journal_entries'
    )
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_entries'
    )
    service_session = models.ForeignKey(
        'services.ServiceSession',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_entries'
    )
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='journal_entries',
        help_text='The service this entry relates to (for easy filtering)'
    )
    content = models.TextField()
    entry_type = models.CharField(
        max_length=20,
        choices=ENTRY_TYPE_CHOICES,
        default='note'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        verbose_name = 'Journal Entry'
        verbose_name_plural = 'Journal Entries'
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'booking']),
            models.Index(fields=['user', 'service']),
        ]

    def __str__(self):
        return f'{self.get_entry_type_display()} by {self.user} - {self.created_at:%Y-%m-%d}'
