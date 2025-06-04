from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    StateViewSet, CityViewSet, ZipCodeViewSet,
    PractitionerLocationViewSet, LocationSearchViewSet
)

router = DefaultRouter()
router.register(r'states', StateViewSet, basename='state')
router.register(r'cities', CityViewSet, basename='city')
router.register(r'zip-codes', ZipCodeViewSet, basename='zipcode')
router.register(r'practitioner-locations', PractitionerLocationViewSet, basename='practitioner-location')
router.register(r'search', LocationSearchViewSet, basename='location-search')

urlpatterns = [
    path('', include(router.urls)),
]
