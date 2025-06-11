from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CountryViewSet, StateViewSet, CityViewSet, 
    ZipCodeViewSet, PractitionerLocationViewSet
)

app_name = 'locations'

router = DefaultRouter()
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'states', StateViewSet, basename='state')
router.register(r'cities', CityViewSet, basename='city')
router.register(r'zipcodes', ZipCodeViewSet, basename='zipcode')
router.register(r'practitioner-locations', PractitionerLocationViewSet, basename='practitioner-location')

urlpatterns = [
    path('', include(router.urls)),
]