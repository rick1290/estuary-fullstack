"""
Booking API URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from bookings.api.v1.views import BookingViewSet, JourneyViewSet

# Create router
router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')
router.register(r'journeys', JourneyViewSet, basename='journey')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]