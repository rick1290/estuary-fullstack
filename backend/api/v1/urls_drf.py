"""
DRF URL Configuration
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import (
    SpectacularAPIView,
    SpectacularRedocView,
    SpectacularSwaggerView
)

from api.v1.views.bookings import BookingViewSet

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'bookings', BookingViewSet, basename='booking')

# URL patterns
urlpatterns = [
    # API routes
    path('', include(router.urls)),
    
    # Optional: DRF's own schema endpoints
    path('schema/', SpectacularAPIView.as_view(), name='drf-schema'),
    path('schema/swagger-ui/', SpectacularSwaggerView.as_view(url_name='drf-schema'), name='drf-swagger-ui'),
    path('schema/redoc/', SpectacularRedocView.as_view(url_name='drf-schema'), name='drf-redoc'),
]