import uuid
from django.db import models
from django.utils import timezone


class UserEngagement(models.Model):
    """
    Model for tracking user engagement metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='engagement_metrics')
    date = models.DateField(default=timezone.now)
    logins = models.PositiveIntegerField(default=0)
    session_duration_seconds = models.PositiveIntegerField(default=0)
    pages_viewed = models.PositiveIntegerField(default=0)
    searches_performed = models.PositiveIntegerField(default=0)
    bookings_viewed = models.PositiveIntegerField(default=0)
    practitioners_viewed = models.PositiveIntegerField(default=0)
    services_viewed = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'user_engagement'
        unique_together = ('user', 'date')
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['user', 'date']),
        ]
    
    def __str__(self):
        return f"Engagement for {self.user} on {self.date}"


class PractitionerPerformance(models.Model):
    """
    Model for tracking practitioner performance metrics.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    practitioner = models.ForeignKey('practitioners.Practitioner', on_delete=models.CASCADE, related_name='performance_metrics')
    date = models.DateField(default=timezone.now)
    profile_views = models.PositiveIntegerField(default=0)
    service_views = models.PositiveIntegerField(default=0)
    bookings_received = models.PositiveIntegerField(default=0)
    bookings_completed = models.PositiveIntegerField(default=0)
    bookings_cancelled = models.PositiveIntegerField(default=0)
    total_earnings = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    reviews_received = models.PositiveIntegerField(default=0)
    
    class Meta:
        db_table = 'practitioner_performance'
        unique_together = ('practitioner', 'date')
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['practitioner', 'date']),
        ]
    
    def __str__(self):
        return f"Performance for {self.practitioner} on {self.date}"


class ServiceAnalytics(models.Model):
    """
    Model for tracking service popularity and performance.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='analytics')
    date = models.DateField(default=timezone.now)
    views = models.PositiveIntegerField(default=0)
    bookings = models.PositiveIntegerField(default=0)
    cancellations = models.PositiveIntegerField(default=0)
    total_revenue = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    average_rating = models.DecimalField(max_digits=3, decimal_places=2, blank=True, null=True)
    
    class Meta:
        db_table = 'service_analytics'
        unique_together = ('service', 'date')
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['service', 'date']),
        ]
    
    def __str__(self):
        return f"Analytics for {self.service} on {self.date}"


class FinancialReport(models.Model):
    """
    Model for storing financial reporting data.
    """
    REPORT_TYPES = (
        ('daily', 'Daily'),
        ('weekly', 'Weekly'),
        ('monthly', 'Monthly'),
        ('quarterly', 'Quarterly'),
        ('yearly', 'Yearly'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    report_type = models.CharField(max_length=20, choices=REPORT_TYPES)
    start_date = models.DateField()
    end_date = models.DateField()
    total_revenue = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    total_payouts = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    platform_fees = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    tax_collected = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    refunds_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    net_income = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    generated_at = models.DateTimeField(auto_now_add=True)
    report_data = models.JSONField(blank=True, null=True)  # For storing detailed breakdown
    
    class Meta:
        db_table = 'financial_reports'
        indexes = [
            models.Index(fields=['report_type']),
            models.Index(fields=['start_date', 'end_date']),
        ]
    
    def __str__(self):
        return f"{self.report_type.capitalize()} financial report: {self.start_date} to {self.end_date}"


class SearchAnalytics(models.Model):
    """
    Model for tracking search patterns and behavior.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True, related_name='search_history')
    query_text = models.CharField(max_length=255)
    filters_applied = models.JSONField(blank=True, null=True)
    results_count = models.PositiveIntegerField(default=0)
    clicked_results = models.PositiveIntegerField(default=0)
    conversion = models.BooleanField(default=False)  # Whether the search led to a booking
    search_date = models.DateTimeField(auto_now_add=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)  # For tracking anonymous users
    
    class Meta:
        db_table = 'search_analytics'
        indexes = [
            models.Index(fields=['search_date']),
            models.Index(fields=['user']),
            models.Index(fields=['query_text']),
        ]
    
    def __str__(self):
        return f"Search for '{self.query_text}' on {self.search_date}"


class SearchLog(models.Model):
    """
    Model for logging all search queries for analytics and suggestions.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)
    query = models.CharField(max_length=255, db_index=True)
    search_type = models.CharField(max_length=20, default='all')
    filters = models.JSONField(blank=True, null=True)
    location = models.JSONField(blank=True, null=True)  # {'lat': x, 'lng': y}
    result_count = models.PositiveIntegerField(default=0)
    clicked_position = models.PositiveIntegerField(blank=True, null=True)  # Position of clicked result
    created_at = models.DateTimeField(auto_now_add=True)
    ip_address = models.GenericIPAddressField(blank=True, null=True)
    user_agent = models.TextField(blank=True, null=True)
    
    class Meta:
        db_table = 'search_logs'
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['user']),
            models.Index(fields=['query']),
            models.Index(fields=['search_type']),
        ]
    
    def __str__(self):
        return f"Search: '{self.query}' at {self.created_at}"


class ServiceView(models.Model):
    """
    Model for tracking service page views.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='views')
    user = models.ForeignKey('users.User', on_delete=models.SET_NULL, null=True, blank=True)
    session_id = models.CharField(max_length=100, blank=True, null=True)
    viewed_at = models.DateTimeField(auto_now_add=True)
    referrer = models.CharField(max_length=255, blank=True, null=True)
    search_query = models.CharField(max_length=255, blank=True, null=True)  # If came from search
    duration_seconds = models.PositiveIntegerField(blank=True, null=True)  # Time spent on page
    
    class Meta:
        db_table = 'service_views'
        indexes = [
            models.Index(fields=['service', 'viewed_at']),
            models.Index(fields=['user']),
            models.Index(fields=['viewed_at']),
        ]
    
    def __str__(self):
        return f"View of {self.service} at {self.viewed_at}"
