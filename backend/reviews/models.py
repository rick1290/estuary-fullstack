from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from utils.models import BaseModel, PublicModel


class ReviewQuestion(BaseModel):
    """
    Model for structured review questions.
    """
    QUESTION_TYPES = (
        ('rating', 'Rating'),
        ('text', 'Text'),
        ('boolean', 'Yes/No'),
    )
    
    APPLIES_TO_CHOICES = (
        ('service', 'Service'),
        ('practitioner', 'Practitioner'),
        ('both', 'Both'),
    )
    
    question = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    is_required = models.BooleanField(default=True)
    question_type = models.CharField(max_length=20, choices=QUESTION_TYPES)
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    applies_to = models.CharField(max_length=20, choices=APPLIES_TO_CHOICES, default='both')
    
    class Meta:
        ordering = ['order']
        indexes = [
            models.Index(fields=['is_active', 'order']),
            models.Index(fields=['applies_to']),
        ]
    
    def __str__(self):
        return self.question


class Review(PublicModel):
    """
    Model representing a review for a practitioner or service.
    """
    rating = models.DecimalField(
        max_digits=3, 
        decimal_places=2, 
        validators=[MinValueValidator(0.0), MaxValueValidator(5.0)],
        help_text="Rating from 0.0 to 5.0"
    )
    comment = models.TextField(blank=True)
    
    # Relationships
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.CASCADE, 
        related_name='reviews'
    )
    booking = models.ForeignKey(
        'bookings.Booking', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='reviews'
    )
    user = models.ForeignKey(
        'users.User', 
        on_delete=models.CASCADE, 
        related_name='reviews_given'
    )
    service = models.ForeignKey(
        'services.Service', 
        on_delete=models.CASCADE, 
        blank=True, 
        null=True, 
        related_name='reviews'
    )
    
    # Status fields
    is_anonymous = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=True)
    is_published = models.BooleanField(default=True)
    
    # Engagement metrics (calculated from related models)
    helpful_votes = models.PositiveIntegerField(default=0)
    unhelpful_votes = models.PositiveIntegerField(default=0)
    reported_count = models.PositiveIntegerField(default=0)
    
    # Practitioner response
    response_text = models.TextField(blank=True)
    response_date = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        indexes = [
            models.Index(fields=['practitioner', 'is_published']),
            models.Index(fields=['service', 'is_published']),
            models.Index(fields=['user']),
            models.Index(fields=['booking']),
            models.Index(fields=['created_at']),
            models.Index(fields=['rating', 'is_published']),
            models.Index(fields=['is_verified', 'is_published']),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(rating__gte=0) & models.Q(rating__lte=5),
                name='reviews_review_rating_range'
            ),
        ]

    def clean(self):
        super().clean()
        if not self.practitioner and not self.service:
            raise ValidationError("Review must be for either a practitioner or service")
        
        if self.booking and self.booking.user != self.user:
            raise ValidationError("Review user must match booking user")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
        # Update vote counts
        self._update_vote_counts()

    def _update_vote_counts(self):
        """Update helpful/unhelpful vote counts from related votes"""
        votes = self.votes.all()
        self.helpful_votes = votes.filter(is_helpful=True).count()
        self.unhelpful_votes = votes.filter(is_helpful=False).count()
        self.reported_count = self.reports.count()
        # Avoid infinite recursion by using update instead of save
        Review.objects.filter(id=self.id).update(
            helpful_votes=self.helpful_votes,
            unhelpful_votes=self.unhelpful_votes,
            reported_count=self.reported_count
        )

    @property
    def net_helpful_votes(self):
        """Net helpful votes (helpful - unhelpful)"""
        return self.helpful_votes - self.unhelpful_votes

    @property
    def display_name(self):
        """Display name for the reviewer"""
        if self.is_anonymous:
            return "Anonymous"
        return self.user.get_full_name() or self.user.email

    def __str__(self):
        return f"Review {str(self.public_uuid)[:8]}... - {self.rating} stars"


class ReviewAnswer(BaseModel):
    """
    Model for answers to review questions.
    """
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(ReviewQuestion, on_delete=models.CASCADE, related_name='answers')
    rating_answer = models.IntegerField(
        blank=True, 
        null=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)]
    )
    text_answer = models.TextField(blank=True)
    boolean_answer = models.BooleanField(blank=True, null=True)
    
    class Meta:
        unique_together = ('review', 'question')
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['question']),
        ]

    def clean(self):
        super().clean()
        # Validate that answer type matches question type
        if self.question.question_type == 'rating' and self.rating_answer is None:
            raise ValidationError("Rating answer is required for rating questions")
        elif self.question.question_type == 'text' and not self.text_answer:
            raise ValidationError("Text answer is required for text questions")
        elif self.question.question_type == 'boolean' and self.boolean_answer is None:
            raise ValidationError("Boolean answer is required for yes/no questions")

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"Answer to '{self.question}' for Review {str(self.review.public_uuid)[:8]}..."


class ReviewVote(BaseModel):
    """
    Model for tracking helpful/unhelpful votes on reviews.
    """
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='review_votes')
    is_helpful = models.BooleanField(help_text="True for helpful, False for unhelpful")
    
    class Meta:
        unique_together = ('review', 'user')
        indexes = [
            models.Index(fields=['review', 'is_helpful']),
            models.Index(fields=['user']),
        ]

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update parent review vote counts
        self.review._update_vote_counts()
    
    def delete(self, *args, **kwargs):
        review = self.review
        super().delete(*args, **kwargs)
        # Update parent review vote counts after deletion
        review._update_vote_counts()
    
    def __str__(self):
        vote_type = "Helpful" if self.is_helpful else "Unhelpful"
        return f"{vote_type} vote by {self.user} for Review {str(self.review.public_uuid)[:8]}..."


class ReviewReport(BaseModel):
    """
    Model for tracking reported reviews.
    """
    REPORT_REASONS = (
        ('inappropriate', 'Inappropriate Content'),
        ('spam', 'Spam'),
        ('off_topic', 'Off Topic'),
        ('fake', 'Fake Review'),
        ('harassment', 'Harassment'),
        ('other', 'Other'),
    )
    
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='review_reports')
    reason = models.CharField(max_length=20, choices=REPORT_REASONS)
    details = models.TextField(blank=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(blank=True, null=True)
    resolved_by = models.ForeignKey(
        'users.User', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='resolved_review_reports'
    )
    resolution_notes = models.TextField(blank=True)
    
    class Meta:
        unique_together = ('review', 'user')
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['is_resolved', 'created_at']),
            models.Index(fields=['reason']),
        ]

    def resolve(self, resolved_by, notes=""):
        """Mark report as resolved"""
        from django.utils import timezone
        self.is_resolved = True
        self.resolved_at = timezone.now()
        self.resolved_by = resolved_by
        self.resolution_notes = notes
        self.save()
        
        # Update parent review report count
        self.review._update_vote_counts()

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update parent review report count
        self.review._update_vote_counts()
    
    def __str__(self):
        return f"Report for Review {str(self.review.public_uuid)[:8]}... by {self.user}"
