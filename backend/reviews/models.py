from django.db import models
import uuid


class ReviewQuestion(models.Model):
    """
    Model for structured review questions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    question = models.CharField(max_length=255)
    description = models.TextField(blank=True, null=True)
    is_required = models.BooleanField(default=True)
    question_type = models.CharField(max_length=20, choices=[
        ('rating', 'Rating'),
        ('text', 'Text'),
        ('boolean', 'Yes/No'),
    ])
    order = models.PositiveIntegerField(default=0)
    is_active = models.BooleanField(default=True)
    applies_to = models.CharField(max_length=20, choices=[
        ('service', 'Service'),
        ('practitioner', 'Practitioner'),
        ('both', 'Both'),
    ], default='both')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (reviews_reviewquestion)
        ordering = ['order']
    
    def __str__(self):
        return self.question


class Review(models.Model):
    """
    Model representing a review for a practitioner or service.
    """
    id = models.BigAutoField(primary_key=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    comment = models.TextField(blank=True, null=True)
    practitioner = models.ForeignKey('practitioners.Practitioner', models.CASCADE, blank=True, null=True, related_name='reviews')
    booking = models.ForeignKey('bookings.Booking', models.SET_NULL, blank=True, null=True, related_name='reviews')
    user = models.ForeignKey('users.User', models.CASCADE, related_name='reviews_given', blank=True, null=True)
    service = models.ForeignKey('services.Service', models.CASCADE, blank=True, null=True, related_name='reviews')
    is_anonymous = models.BooleanField(default=False)
    is_verified = models.BooleanField(default=True)  # True if from a verified booking
    is_published = models.BooleanField(default=True)
    helpful_votes = models.PositiveIntegerField(default=0)
    unhelpful_votes = models.PositiveIntegerField(default=0)
    reported_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        # Using Django's default naming convention (reviews_review)
        indexes = [
            models.Index(fields=['practitioner']),
            models.Index(fields=['service']),
            models.Index(fields=['user']),
            models.Index(fields=['booking']),
            models.Index(fields=['created_at']),
            models.Index(fields=['rating']),
        ]

    def __str__(self):
        return f"Review {self.id} - {self.rating} stars"


class ReviewAnswer(models.Model):
    """
    Model for answers to review questions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='answers')
    question = models.ForeignKey(ReviewQuestion, on_delete=models.CASCADE, related_name='answers')
    rating_answer = models.IntegerField(blank=True, null=True)
    text_answer = models.TextField(blank=True, null=True)
    boolean_answer = models.BooleanField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (reviews_reviewanswer)
        unique_together = ('review', 'question')
    
    def __str__(self):
        return f"Answer to '{self.question}' for Review {self.review.id}"


class ReviewVote(models.Model):
    """
    Model for tracking helpful/unhelpful votes on reviews.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='votes')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='review_votes')
    is_helpful = models.BooleanField()  # True for helpful, False for unhelpful
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (reviews_reviewvote)
        unique_together = ('review', 'user')
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['user']),
        ]
    
    def __str__(self):
        vote_type = "Helpful" if self.is_helpful else "Unhelpful"
        return f"{vote_type} vote by {self.user} for Review {self.review.id}"


class ReviewReport(models.Model):
    """
    Model for tracking reported reviews.
    """
    REPORT_REASONS = (
        ('inappropriate', 'Inappropriate Content'),
        ('spam', 'Spam'),
        ('off_topic', 'Off Topic'),
        ('fake', 'Fake Review'),
        ('other', 'Other'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name='reports')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='review_reports')
    reason = models.CharField(max_length=20, choices=REPORT_REASONS)
    details = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_resolved = models.BooleanField(default=False)
    resolved_at = models.DateTimeField(blank=True, null=True)
    resolution_notes = models.TextField(blank=True, null=True)
    
    class Meta:
        # Using Django's default naming convention (reviews_reviewreport)
        unique_together = ('review', 'user')
        indexes = [
            models.Index(fields=['review']),
            models.Index(fields=['is_resolved']),
        ]
    
    def __str__(self):
        return f"Report for Review {self.review.id} by {self.user}"
