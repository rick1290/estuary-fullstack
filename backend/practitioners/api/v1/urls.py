"""
URL Configuration for Practitioners API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter

from .views import (
    PractitionerViewSet,
    ScheduleViewSet,
    AvailabilityViewSet,
    CertificationViewSet,
    EducationViewSet,
    PractitionerApplicationViewSet
)

# Create router
router = DefaultRouter()

# Register viewsets
router.register(r'practitioners', PractitionerViewSet, basename='practitioner')
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'availability', AvailabilityViewSet, basename='availability')
router.register(r'certifications', CertificationViewSet, basename='certification')
router.register(r'education', EducationViewSet, basename='education')
router.register(r'applications', PractitionerApplicationViewSet, basename='practitioner-application')

# URL patterns
urlpatterns = [
    path('', include(router.urls)),
]

# Additional URL patterns for nested resources can be added here
# For example:
# urlpatterns += [
#     path('practitioners/<int:practitioner_id>/services/', 
#          PractitionerServiceListView.as_view(), 
#          name='practitioner-services'),
# ]