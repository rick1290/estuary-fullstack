"""
Services API v1
"""
from .views import (
    ServiceCategoryViewSet,
    ServiceViewSet,
    PackageViewSet,
    BundleViewSet,
    ServiceSessionViewSet,
    ServiceResourceViewSet,
    PractitionerServiceCategoryViewSet,
)

from .serializers import (
    ServiceCategorySerializer,
    ServiceListSerializer,
    ServiceDetailSerializer,
    ServiceCreateUpdateSerializer,
    PackageSerializer,
    BundleSerializer,
    ServiceSessionSerializer,
    ServiceResourceSerializer,
    PractitionerServiceCategorySerializer,
    WaitlistSerializer,
)

__all__ = [
    # ViewSets
    'ServiceCategoryViewSet',
    'ServiceViewSet',
    'PackageViewSet',
    'BundleViewSet',
    'ServiceSessionViewSet',
    'ServiceResourceViewSet',
    'PractitionerServiceCategoryViewSet',
    
    # Serializers
    'ServiceCategorySerializer',
    'ServiceListSerializer',
    'ServiceDetailSerializer',
    'ServiceCreateUpdateSerializer',
    'PackageSerializer',
    'BundleSerializer',
    'ServiceSessionSerializer',
    'ServiceResourceSerializer',
    'PractitionerServiceCategorySerializer',
    'WaitlistSerializer',
]