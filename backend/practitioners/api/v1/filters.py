"""
Django Filter classes for Practitioners API
"""
import django_filters
from django.db.models import Q
from practitioners.models import Practitioner
from services.models import ServiceCategory, ServiceType


class PractitionerFilter(django_filters.FilterSet):
    """
    Filter class for Practitioner model with advanced filtering options
    """
    # Location filters
    city = django_filters.CharFilter(
        field_name='primary_location__city',
        lookup_expr='icontains',
        label='City'
    )
    state = django_filters.CharFilter(
        field_name='primary_location__state',
        lookup_expr='icontains',
        label='State'
    )
    country = django_filters.CharFilter(
        field_name='primary_location__country',
        lookup_expr='icontains',
        label='Country'
    )
    
    # Service-related filters
    service_type = django_filters.ModelMultipleChoiceFilter(
        field_name='primary_services__service_type',
        queryset=ServiceType.objects.all(),
        label='Service Type'
    )
    service_category = django_filters.ModelMultipleChoiceFilter(
        field_name='primary_services__category',
        queryset=ServiceCategory.objects.all(),
        label='Service Category'
    )
    
    # Specialization filters
    specialization = django_filters.NumberFilter(
        field_name='specializations__id',
        label='Specialization ID'
    )
    style = django_filters.NumberFilter(
        field_name='styles__id',
        label='Style ID'
    )
    topic = django_filters.NumberFilter(
        field_name='topics__id',
        label='Topic ID'
    )
    modality = django_filters.CharFilter(
        method='filter_modality',
        label='Modality slug(s) - comma-separated'
    )
    modality_id = django_filters.CharFilter(
        method='filter_modality_id',
        label='Modality ID(s) - comma-separated'
    )
    
    # Experience and qualifications
    min_experience = django_filters.NumberFilter(
        field_name='years_of_experience',
        lookup_expr='gte',
        label='Minimum Years of Experience'
    )
    max_experience = django_filters.NumberFilter(
        field_name='years_of_experience',
        lookup_expr='lte',
        label='Maximum Years of Experience'
    )
    
    # Price range (based on services)
    min_price = django_filters.NumberFilter(
        method='filter_min_price',
        label='Minimum Price'
    )
    max_price = django_filters.NumberFilter(
        method='filter_max_price',
        label='Maximum Price'
    )
    
    # Status filters
    is_verified = django_filters.BooleanFilter(
        field_name='is_verified',
        label='Is Verified'
    )
    featured = django_filters.BooleanFilter(
        field_name='featured',
        label='Featured Only'
    )
    practitioner_status = django_filters.ChoiceFilter(
        field_name='practitioner_status',
        choices=Practitioner._meta.get_field('practitioner_status').choices,
        label='Practitioner Status'
    )
    
    # Availability
    available_now = django_filters.BooleanFilter(
        method='filter_available_now',
        label='Available Now'
    )
    
    # Service location type
    location_type = django_filters.ChoiceFilter(
        method='filter_location_type',
        choices=[
            ('virtual', 'Virtual'),
            ('in_person', 'In Person'),
            ('hybrid', 'Hybrid')
        ],
        label='Service Location Type'
    )
    
    # Language support
    language = django_filters.CharFilter(
        method='filter_language',
        label='Language Code'
    )
    
    # Search
    search = django_filters.CharFilter(
        method='filter_search',
        label='Search'
    )
    
    class Meta:
        model = Practitioner
        fields = [
            'city', 'state', 'country', 'service_type', 'service_category',
            'specialization', 'style', 'topic', 'modality', 'modality_id',
            'min_experience', 'max_experience', 'min_price', 'max_price',
            'is_verified', 'featured', 'practitioner_status',
            'available_now', 'location_type', 'language', 'search'
        ]
    
    def filter_min_price(self, queryset, name, value):
        """Filter by minimum service price"""
        return queryset.filter(
            Q(primary_services__price_cents__gte=int(value * 100)) |
            Q(services__price_cents__gte=int(value * 100))
        ).distinct()
    
    def filter_max_price(self, queryset, name, value):
        """Filter by maximum service price"""
        return queryset.filter(
            Q(primary_services__price_cents__lte=int(value * 100)) |
            Q(services__price_cents__lte=int(value * 100))
        ).distinct()
    
    def filter_available_now(self, queryset, name, value):
        """Filter practitioners available now"""
        if value:
            from django.utils import timezone
            return queryset.filter(
                next_available_date__lte=timezone.now()
            )
        return queryset
    
    def filter_location_type(self, queryset, name, value):
        """Filter by service location type"""
        return queryset.filter(
            Q(primary_services__location_type=value) |
            Q(services__location_type=value)
        ).distinct()
    
    def filter_language(self, queryset, name, value):
        """Filter by language support"""
        return queryset.filter(
            Q(primary_services__languages__code=value) |
            Q(services__languages__code=value)
        ).distinct()
    
    def filter_search(self, queryset, name, value):
        """Full text search across multiple fields"""
        return queryset.filter(
            Q(display_name__icontains=value) |
            Q(professional_title__icontains=value) |
            Q(bio__icontains=value) |
            Q(user__first_name__icontains=value) |
            Q(user__last_name__icontains=value) |
            Q(specializations__content__icontains=value) |
            Q(primary_services__name__icontains=value)
        ).distinct()

    def filter_modality(self, queryset, name, value):
        """Filter by modality slug(s) - supports comma-separated values"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"filter_modality received value: {repr(value)}")

        modality_slugs = [slug.strip() for slug in value.split(',') if slug.strip()]
        logger.info(f"Parsed modality_slugs: {modality_slugs}")

        if modality_slugs:
            result = queryset.filter(modalities__slug__in=modality_slugs).distinct()
            logger.info(f"Query returned {result.count()} results")
            return result
        return queryset

    def filter_modality_id(self, queryset, name, value):
        """Filter by modality ID(s) - supports comma-separated values"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"filter_modality_id received value: {repr(value)}")

        modality_ids = [id.strip() for id in value.split(',') if id.strip()]
        logger.info(f"Parsed modality_ids: {modality_ids}")

        if modality_ids:
            result = queryset.filter(modalities__id__in=modality_ids).distinct()
            logger.info(f"Query returned {result.count()} results")
            return result
        return queryset


class AvailabilityFilter(django_filters.FilterSet):
    """
    Filter for checking practitioner availability
    """
    date = django_filters.DateFilter(
        label='Date to check availability'
    )
    start_time = django_filters.TimeFilter(
        label='Start time'
    )
    end_time = django_filters.TimeFilter(
        label='End time'
    )
    service_type = django_filters.CharFilter(
        label='Service type'
    )
    duration_minutes = django_filters.NumberFilter(
        label='Duration in minutes'
    )
    
    class Meta:
        model = Practitioner
        fields = ['date', 'start_time', 'end_time', 'service_type', 'duration_minutes']