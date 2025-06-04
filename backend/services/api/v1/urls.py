from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.services.api.v1.views import (
    ServiceViewSet, ServiceTypeViewSet, ServiceCategoryViewSet, 
    ServiceSessionViewSet, ServiceRelationshipViewSet
)

router = DefaultRouter()
router.register(r'services', ServiceViewSet, basename='service')
router.register(r'types', ServiceTypeViewSet, basename='servicetype')
router.register(r'categories', ServiceCategoryViewSet, basename='servicecategory')
router.register(r'sessions', ServiceSessionViewSet, basename='servicesession')
router.register(r'relationships', ServiceRelationshipViewSet, basename='servicerelationship')

urlpatterns = [
    path('', include(router.urls)),
]
