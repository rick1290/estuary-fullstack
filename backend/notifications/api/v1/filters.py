import django_filters
from django.db import models
from django.utils import timezone
from datetime import timedelta
from notifications.models import Notification, NotificationSetting


class NotificationFilter(django_filters.FilterSet):
    """Advanced filtering for notifications."""
    
    # Date range filters
    created_after = django_filters.DateTimeFilter(
        field_name='created_at', 
        lookup_expr='gte',
        help_text='Filter notifications created after this date'
    )
    created_before = django_filters.DateTimeFilter(
        field_name='created_at', 
        lookup_expr='lte',
        help_text='Filter notifications created before this date'
    )
    
    # Time period filters
    period = django_filters.ChoiceFilter(
        method='filter_period',
        choices=[
            ('today', 'Today'),
            ('yesterday', 'Yesterday'),
            ('week', 'This Week'),
            ('month', 'This Month'),
            ('all', 'All Time'),
        ],
        help_text='Filter by time period'
    )
    
    # Multiple type filter
    notification_types = django_filters.MultipleChoiceFilter(
        field_name='notification_type',
        choices=Notification.NOTIFICATION_TYPES,
        help_text='Filter by multiple notification types'
    )
    
    # Status filters
    is_unread = django_filters.BooleanFilter(
        field_name='is_read',
        lookup_expr='exact',
        exclude=True,
        help_text='Show only unread notifications'
    )
    
    # Related object filters
    related_to = django_filters.CharFilter(
        method='filter_related_object',
        help_text='Filter by related object (format: type:id)'
    )
    
    class Meta:
        model = Notification
        fields = [
            'notification_type', 'is_read', 'delivery_channel', 
            'status', 'created_after', 'created_before'
        ]
    
    def filter_period(self, queryset, name, value):
        """Filter by predefined time periods."""
        now = timezone.now()
        today = now.date()
        
        if value == 'today':
            return queryset.filter(created_at__date=today)
        elif value == 'yesterday':
            yesterday = today - timedelta(days=1)
            return queryset.filter(created_at__date=yesterday)
        elif value == 'week':
            week_ago = now - timedelta(days=7)
            return queryset.filter(created_at__gte=week_ago)
        elif value == 'month':
            month_ago = now - timedelta(days=30)
            return queryset.filter(created_at__gte=month_ago)
        
        return queryset
    
    def filter_related_object(self, queryset, name, value):
        """Filter by related object type and ID."""
        if ':' in value:
            obj_type, obj_id = value.split(':', 1)
            return queryset.filter(
                related_object_type=obj_type,
                related_object_id=obj_id
            )
        return queryset


class NotificationSettingFilter(django_filters.FilterSet):
    """Filter for notification settings."""
    
    # Filter by enabled channels
    any_enabled = django_filters.BooleanFilter(
        method='filter_any_enabled',
        help_text='Show only notification types with at least one enabled channel'
    )
    
    all_disabled = django_filters.BooleanFilter(
        method='filter_all_disabled',
        help_text='Show only notification types with all channels disabled'
    )
    
    class Meta:
        model = NotificationSetting
        fields = [
            'notification_type', 'email_enabled', 'sms_enabled',
            'in_app_enabled', 'push_enabled'
        ]
    
    def filter_any_enabled(self, queryset, name, value):
        """Filter settings with at least one enabled channel."""
        if value:
            return queryset.filter(
                models.Q(email_enabled=True) |
                models.Q(sms_enabled=True) |
                models.Q(in_app_enabled=True) |
                models.Q(push_enabled=True)
            )
        return queryset
    
    def filter_all_disabled(self, queryset, name, value):
        """Filter settings with all channels disabled."""
        if value:
            return queryset.filter(
                email_enabled=False,
                sms_enabled=False,
                in_app_enabled=False,
                push_enabled=False
            )
        return queryset