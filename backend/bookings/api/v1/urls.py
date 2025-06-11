"""
Booking API URL configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from bookings.api.v1.views import BookingViewSet

# Create router
router = DefaultRouter()
router.register(r'bookings', BookingViewSet, basename='booking')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]