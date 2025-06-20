"""
Custom filters for booking API
"""
import django_filters
from django.db.models import Q

from bookings.models import Booking, BOOKING_STATUS_CHOICES, PAYMENT_STATUS_CHOICES


class BookingFilter(django_filters.FilterSet):
    """Custom filter for bookings that handles comma-separated values"""
    
    status = django_filters.CharFilter(method='filter_status')
    payment_status = django_filters.CharFilter(method='filter_payment_status')
    start_date = django_filters.DateFilter(field_name='start_time__date', lookup_expr='gte')
    end_date = django_filters.DateFilter(field_name='start_time__date', lookup_expr='lte')
    is_upcoming = django_filters.BooleanFilter(method='filter_upcoming')
    booking_type = django_filters.ChoiceFilter(
        method='filter_booking_type',
        choices=[
            ('individual', 'Individual Session'),
            ('group', 'Group Session'),
            ('package', 'Package'),
            ('course', 'Course'),
            ('bundle', 'Bundle'),
        ]
    )
    
    class Meta:
        model = Booking
        fields = ['practitioner', 'service', 'user']
    
    def filter_status(self, queryset, name, value):
        """Filter by status, handling comma-separated values"""
        if not value:
            return queryset
        
        # Split comma-separated values
        statuses = [s.strip() for s in value.split(',')]
        
        # Validate statuses
        valid_statuses = [choice[0] for choice in BOOKING_STATUS_CHOICES]
        statuses = [s for s in statuses if s in valid_statuses]
        
        if statuses:
            return queryset.filter(status__in=statuses)
        return queryset
    
    def filter_payment_status(self, queryset, name, value):
        """Filter by payment status, handling comma-separated values"""
        if not value:
            return queryset
        
        # Split comma-separated values
        payment_statuses = [s.strip() for s in value.split(',')]
        
        # Validate payment statuses
        valid_statuses = [choice[0] for choice in PAYMENT_STATUS_CHOICES]
        payment_statuses = [s for s in payment_statuses if s in valid_statuses]
        
        if payment_statuses:
            return queryset.filter(payment_status__in=payment_statuses)
        return queryset
    
    def filter_upcoming(self, queryset, name, value):
        """Filter for upcoming bookings"""
        if value:
            from django.utils import timezone
            return queryset.filter(
                start_time__gt=timezone.now(),
                status='confirmed'
            )
        return queryset
    
    def filter_booking_type(self, queryset, name, value):
        """Filter by booking type"""
        if value == 'individual':
            return queryset.filter(
                service_session__isnull=True,
                is_package_purchase=False,
                is_bundle_purchase=False,
                service__is_course=False
            )
        elif value == 'group':
            return queryset.filter(service_session__isnull=False)
        elif value == 'package':
            return queryset.filter(
                Q(is_package_purchase=True) | Q(service__is_package=True)
            )
        elif value == 'bundle':
            return queryset.filter(
                Q(is_bundle_purchase=True) | Q(service__is_bundle=True)
            )
        elif value == 'course':
            return queryset.filter(service__is_course=True)
        return queryset