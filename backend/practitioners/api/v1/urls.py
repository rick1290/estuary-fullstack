from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    PractitionerViewSet,
    PractitionerOnboardingViewSet,
    PractitionerApplicationView,
    PractitionerProfileViewSet,
    PractitionerProfessionalViewSet,
    PractitionerCredentialsViewSet,
    PractitionerVerificationViewSet
)
from .views_scheduling import ScheduleViewSet, ScheduleTimeSlotViewSet, AvailabilityViewSet

app_name = 'practitioners'

# Main router for practitioner endpoints
router = DefaultRouter()
router.register('', PractitionerViewSet, basename='practitioner')

# Router for profile management endpoints
profile_router = DefaultRouter()
profile_router.register('profile', PractitionerProfileViewSet, basename='profile')
profile_router.register('professional', PractitionerProfessionalViewSet, basename='professional')
profile_router.register('credentials', PractitionerCredentialsViewSet, basename='credentials')
profile_router.register('verification', PractitionerVerificationViewSet, basename='verification')

# Router for scheduling endpoints
scheduling_router = DefaultRouter()
scheduling_router.register('schedules', ScheduleViewSet, basename='schedule')
scheduling_router.register('time-slots', ScheduleTimeSlotViewSet, basename='time-slot')
scheduling_router.register('availability', AvailabilityViewSet, basename='availability')

# Router for onboarding endpoints
onboarding_router = DefaultRouter()
onboarding_router.register('', PractitionerOnboardingViewSet, basename='onboarding')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', include(profile_router.urls)),
    path('apply/', PractitionerApplicationView.as_view(), name='practitioner-apply'),
    path('scheduling/', include(scheduling_router.urls)),
    path('onboarding/', include(onboarding_router.urls)),
]
