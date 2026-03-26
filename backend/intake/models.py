from django.db import models
from utils.models import BaseModel, PublicModel


class FormTemplate(BaseModel):
    """Reusable form template for intake or consent."""
    FORM_TYPE_CHOICES = [
        ('intake', 'Intake Questionnaire'),
        ('consent', 'Consent Form'),
    ]

    practitioner = models.ForeignKey(
        'practitioners.Practitioner',
        on_delete=models.CASCADE,
        related_name='form_templates',
        null=True, blank=True,  # null for platform templates
    )
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    form_type = models.CharField(max_length=20, choices=FORM_TYPE_CHOICES)
    is_platform_template = models.BooleanField(default=False)
    modality = models.ForeignKey(
        'common.Modality',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text="Suggested modality for this template"
    )
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['-is_platform_template', '-created_at']
        indexes = [
            models.Index(fields=['practitioner', 'form_type', 'is_active']),
            models.Index(fields=['is_platform_template', 'form_type']),
        ]

    def __str__(self):
        return f"{self.title} ({self.get_form_type_display()})"


class FormQuestion(BaseModel):
    """Individual question in an intake form."""
    QUESTION_TYPE_CHOICES = [
        ('short_text', 'Short Text'),
        ('long_text', 'Long Text'),
        ('single_choice', 'Single Choice'),
        ('multiple_choice', 'Multiple Choice'),
        ('yes_no', 'Yes/No'),
        ('scale', 'Scale (1-10)'),
        ('date', 'Date'),
        ('file_upload', 'File Upload'),
    ]

    template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='questions'
    )
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPE_CHOICES)
    label = models.CharField(max_length=500)
    help_text = models.TextField(blank=True)
    is_required = models.BooleanField(default=False)
    options = models.JSONField(
        null=True, blank=True,
        help_text="Options for choice questions: ['Option A', 'Option B']"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order', 'created_at']
        indexes = [
            models.Index(fields=['template', 'order']),
        ]

    def __str__(self):
        return f"{self.label[:50]} ({self.get_question_type_display()})"


class ConsentDocument(BaseModel):
    """Versioned consent text. Immutable once created."""
    template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='versions'
    )
    version = models.PositiveIntegerField()
    legal_text = models.TextField(help_text="Full consent/waiver text")

    class Meta:
        ordering = ['-version']
        unique_together = ['template', 'version']
        indexes = [
            models.Index(fields=['template', '-version']),
        ]

    def __str__(self):
        return f"{self.template.title} v{self.version}"

    def save(self, *args, **kwargs):
        if not self.version:
            last = ConsentDocument.objects.filter(template=self.template).order_by('-version').first()
            self.version = (last.version + 1) if last else 1
        super().save(*args, **kwargs)


class ServiceForm(BaseModel):
    """Links form templates to services."""
    service = models.ForeignKey(
        'services.Service',
        on_delete=models.CASCADE,
        related_name='intake_forms'
    )
    form_template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='service_links'
    )
    is_required = models.BooleanField(
        default=False,
        help_text="If True and consent form, blocks room entry"
    )
    order = models.PositiveIntegerField(default=0)

    class Meta:
        ordering = ['order']
        unique_together = ['service', 'form_template']

    def __str__(self):
        return f"{self.service} - {self.form_template}"


class IntakeResponse(PublicModel):
    """Client's submitted answers to an intake form."""
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='intake_responses'
    )
    form_template = models.ForeignKey(
        FormTemplate,
        on_delete=models.CASCADE,
        related_name='responses'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='intake_responses'
    )
    responses = models.JSONField(
        help_text="Answers keyed by question ID: {'123': 'answer'}"
    )
    submitted_at = models.DateTimeField(auto_now_add=True)
    is_prefilled = models.BooleanField(
        default=False,
        help_text="True if carried from a previous booking"
    )
    previous_response = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True, blank=True,
        help_text="Previous response this was pre-filled from"
    )

    class Meta:
        ordering = ['-submitted_at']
        indexes = [
            models.Index(fields=['booking', 'form_template']),
            models.Index(fields=['user', '-submitted_at']),
        ]

    def __str__(self):
        return f"Response by {self.user} for {self.form_template}"


class ConsentSignature(BaseModel):
    """Legal e-signature for consent forms. Immutable."""
    booking = models.ForeignKey(
        'bookings.Booking',
        on_delete=models.CASCADE,
        related_name='consent_signatures'
    )
    consent_document = models.ForeignKey(
        ConsentDocument,
        on_delete=models.PROTECT,
        related_name='signatures'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='consent_signatures'
    )
    signer_name = models.CharField(max_length=255, help_text="Typed name as e-signature")
    signed_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    user_agent = models.TextField(blank=True)

    class Meta:
        ordering = ['-signed_at']
        indexes = [
            models.Index(fields=['booking', 'user']),
            models.Index(fields=['consent_document']),
        ]

    def __str__(self):
        return f"Consent by {self.signer_name} on {self.signed_at}"
