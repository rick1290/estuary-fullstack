"""
Filters for services API
"""
import django_filters
from django.db.models import Q
from services.models import Service, ServiceCategory, ServiceType
from practitioners.models import Practitioner


class ServiceFilter(django_filters.FilterSet):
    """
    Filter for services with various parameters
    """
    # Category filters
    category = django_filters.CharFilter(field_name='category__slug', lookup_expr='exact')
    category_id = django_filters.NumberFilter(field_name='category__id')

    # Modality filters
    modality = django_filters.CharFilter(method='filter_modality')
    modality_id = django_filters.CharFilter(method='filter_modality_id')

    # Service type filters
    service_type = django_filters.CharFilter(method='filter_service_type')
    service_type_id = django_filters.NumberFilter(field_name='service_type__id')
    exclude_types = django_filters.CharFilter(method='filter_exclude_types')
    
    # Practitioner filters
    practitioner = django_filters.NumberFilter(field_name='primary_practitioner__id')
    practitioner_slug = django_filters.CharFilter(field_name='primary_practitioner__slug')

    # Practitioner category filters
    practitioner_category_id = django_filters.NumberFilter(field_name='practitioner_category__id')
    uncategorized = django_filters.BooleanFilter(method='filter_uncategorized')
    
    # Price range filters (in dollars, converted to cents)
    min_price = django_filters.NumberFilter(method='filter_min_price')
    max_price = django_filters.NumberFilter(method='filter_max_price')
    
    # Duration filters
    min_duration = django_filters.NumberFilter(field_name='duration_minutes', lookup_expr='gte')
    max_duration = django_filters.NumberFilter(field_name='duration_minutes', lookup_expr='lte')
    
    # Participant filters
    min_participants = django_filters.NumberFilter(field_name='min_participants', lookup_expr='lte')
    max_participants = django_filters.NumberFilter(field_name='max_participants', lookup_expr='gte')
    
    # Location type
    location_type = django_filters.ChoiceFilter(
        field_name='location_type',
        choices=[
            ('virtual', 'Virtual'),
            ('in_person', 'In Person'),
            ('hybrid', 'Hybrid')
        ]
    )
    
    # Experience level
    experience_level = django_filters.ChoiceFilter(
        field_name='experience_level',
        choices=[
            ('beginner', 'Beginner'),
            ('intermediate', 'Intermediate'),
            ('advanced', 'Advanced'),
            ('all_levels', 'All Levels')
        ]
    )
    
    # Age range
    age = django_filters.NumberFilter(method='filter_age')
    
    # Status filters
    is_featured = django_filters.BooleanFilter(field_name='is_featured')
    is_active = django_filters.BooleanFilter(field_name='is_active')
    is_public = django_filters.BooleanFilter(field_name='is_public')
    status = django_filters.ChoiceFilter(
        field_name='status',
        choices=[
            ('draft', 'Draft'),
            ('published', 'Published'),
            ('paused', 'Paused'),
            ('discontinued', 'Discontinued')
        ]
    )
    
    # Bundle/Package specific
    is_bundle = django_filters.BooleanFilter(method='filter_is_bundle')
    is_package = django_filters.BooleanFilter(method='filter_is_package')
    has_bonus = django_filters.BooleanFilter(method='filter_has_bonus')
    
    # Availability
    available_now = django_filters.BooleanFilter(method='filter_available_now')
    
    # Search
    search = django_filters.CharFilter(method='filter_search')
    
    class Meta:
        model = Service
        fields = [
            'category', 'category_id', 'modality', 'modality_id', 'service_type', 'service_type_id', 'exclude_types',
            'practitioner', 'practitioner_slug', 'practitioner_category_id', 'uncategorized', 'min_price', 'max_price',
            'min_duration', 'max_duration', 'min_participants', 'max_participants',
            'location_type', 'experience_level', 'age', 'is_featured',
            'is_active', 'is_public', 'status', 'is_bundle', 'is_package',
            'has_bonus', 'available_now', 'search'
        ]
    
    def filter_min_price(self, queryset, name, value):
        """Convert dollar value to cents for filtering"""
        return queryset.filter(price_cents__gte=int(value * 100))
    
    def filter_max_price(self, queryset, name, value):
        """Convert dollar value to cents for filtering"""
        return queryset.filter(price_cents__lte=int(value * 100))
    
    def filter_age(self, queryset, name, value):
        """Filter services suitable for a specific age"""
        return queryset.filter(
            Q(age_min__lte=value) | Q(age_min__isnull=True),
            Q(age_max__gte=value) | Q(age_max__isnull=True)
        )
    
    def filter_is_bundle(self, queryset, name, value):
        """Filter for bundle services"""
        if value:
            return queryset.filter(service_type__code='bundle')
        return queryset.exclude(service_type__code='bundle')
    
    def filter_is_package(self, queryset, name, value):
        """Filter for package services"""
        if value:
            return queryset.filter(service_type__code='package')
        return queryset.exclude(service_type__code='package')
    
    def filter_has_bonus(self, queryset, name, value):
        """Filter services with bonus sessions"""
        if value:
            return queryset.filter(bonus_sessions__gt=0)
        return queryset
    
    def filter_available_now(self, queryset, name, value):
        """Filter services currently available"""
        if value:
            from django.utils import timezone
            now = timezone.now()
            return queryset.filter(
                Q(available_from__lte=now) | Q(available_from__isnull=True),
                Q(available_until__gte=now) | Q(available_until__isnull=True),
                is_active=True,
                is_public=True,
                status='published'
            )
        return queryset
    
    def filter_service_type(self, queryset, name, value):
        """Filter by service type(s) - supports comma-separated values"""
        import logging
        logger = logging.getLogger(__name__)
        logger.info(f"filter_service_type received value: {repr(value)}")

        service_types = [t.strip() for t in value.split(',') if t.strip()]
        logger.info(f"Parsed service_types: {service_types}")

        if service_types:
            result = queryset.filter(service_type__code__in=service_types)
            logger.info(f"Query returned {result.count()} results")
            return result
        return queryset

    def filter_exclude_types(self, queryset, name, value):
        """Exclude specific service types (comma-separated)"""
        exclude_types = [t.strip() for t in value.split(',') if t.strip()]
        if exclude_types:
            return queryset.exclude(service_type__code__in=exclude_types)
        return queryset

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

    def filter_search(self, queryset, name, value):
        """Full text search across multiple fields"""
        return queryset.filter(
            Q(name__icontains=value) |
            Q(description__icontains=value) |
            Q(short_description__icontains=value) |
            Q(tags__icontains=value) |
            Q(primary_practitioner__display_name__icontains=value) |
            Q(category__name__icontains=value)
        )

    def filter_uncategorized(self, queryset, name, value):
        """Filter services without a practitioner category"""
        if value:
            return queryset.filter(practitioner_category__isnull=True)
        return queryset.filter(practitioner_category__isnull=False)