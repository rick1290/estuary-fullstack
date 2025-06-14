"""
Services API URLs
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    ServiceCategoryViewSet, ServiceViewSet, PackageViewSet,
    BundleViewSet, ServiceSessionViewSet, ServiceResourceViewSet,
    PractitionerServiceCategoryViewSet
)

app_name = 'services'

router = DefaultRouter()

# Main endpoints
router.register(r'categories', ServiceCategoryViewSet, basename='category')
router.register(r'practitioner-categories', PractitionerServiceCategoryViewSet, basename='practitioner-category')
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'sessions', ServiceSessionViewSet, basename='session')
router.register(r'resources', ServiceResourceViewSet, basename='resource')

urlpatterns = [
    path('', include(router.urls)),
]