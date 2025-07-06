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

# Create main router
router = DefaultRouter()

# Import and register all viewsets for OpenAPI documentation
# Booking system
from bookings.api.v1.views import BookingViewSet

# Service catalog
from services.api.v1.views import (
    ServiceCategoryViewSet, ServiceViewSet, PublicServiceViewSet, PackageViewSet,
    BundleViewSet, ServiceSessionViewSet, ServiceResourceViewSet,
    PractitionerServiceCategoryViewSet
)

# Practitioner endpoints
from practitioners.api.v1.views import (
    PractitionerViewSet, PublicPractitionerViewSet, ScheduleViewSet, AvailabilityViewSet,
    CertificationViewSet, EducationViewSet, PractitionerApplicationViewSet,
    SpecializationViewSet, StyleViewSet, TopicViewSet, ModalityViewSet
)

# Payment system
from payments.api.v1.views import (
    PaymentMethodViewSet, PaymentViewSet, CheckoutViewSet,
    CreditViewSet, PayoutViewSet, SubscriptionViewSet, CommissionViewSet
)

# Reviews and ratings
from reviews.api.v1.views import ReviewViewSet, ReviewQuestionViewSet

# Location management
from locations.api.v1.views import (
    CountryViewSet, StateViewSet, CityViewSet, ZipCodeViewSet,
    PractitionerLocationViewSet
)

# Media handling
from media.api.v1.views import MediaViewSet

# Notifications
from notifications.api.v1.views import (
    NotificationViewSet, NotificationSettingViewSet, NotificationTemplateViewSet
)

# Streaming content
from streams.api.v1.views import (
    StreamViewSet, StreamPostViewSet, StreamCategoryViewSet
)

# Messaging
from messaging.api.v1.views import ConversationViewSet, MessageViewSet, PractitionerMessagingViewSet

# Rooms (LiveKit video)
from rooms.api.v1.views import RoomViewSet

# Register all ViewSets properly
# Bookings
router.register(r'bookings', BookingViewSet, basename='booking')

# Services
router.register(r'service-categories', ServiceCategoryViewSet, basename='service-category')
router.register(r'practitioner-categories', PractitionerServiceCategoryViewSet, basename='practitioner-category')
router.register(r'services', ServiceViewSet, basename='service')  # Internal CRUD (uses PK)
router.register(r'public-services', PublicServiceViewSet, basename='public-service')  # Public API (uses public_uuid)
router.register(r'packages', PackageViewSet, basename='package')
router.register(r'bundles', BundleViewSet, basename='bundle')
router.register(r'service-sessions', ServiceSessionViewSet, basename='service-session')
router.register(r'service-resources', ServiceResourceViewSet, basename='service-resource')

# Practitioners
router.register(r'practitioners', PractitionerViewSet, basename='practitioner')  # Internal CRUD (uses PK)
router.register(r'public-practitioners', PublicPractitionerViewSet, basename='public-practitioner')  # Public API (uses public_uuid)
router.register(r'schedules', ScheduleViewSet, basename='schedule')
router.register(r'availability', AvailabilityViewSet, basename='availability')
router.register(r'certifications', CertificationViewSet, basename='certification')
router.register(r'education', EducationViewSet, basename='education')
router.register(r'practitioner-applications', PractitionerApplicationViewSet, basename='practitioner-application')
router.register(r'specializations', SpecializationViewSet, basename='specialization')
router.register(r'styles', StyleViewSet, basename='style')
router.register(r'topics', TopicViewSet, basename='topic')
router.register(r'modalities', ModalityViewSet, basename='modality')

# Payments
router.register(r'payment-methods', PaymentMethodViewSet, basename='payment-method')
router.register(r'payments', PaymentViewSet, basename='payment')
router.register(r'checkout', CheckoutViewSet, basename='checkout')
router.register(r'credits', CreditViewSet, basename='credit')
router.register(r'payouts', PayoutViewSet, basename='payout')
router.register(r'subscriptions', SubscriptionViewSet, basename='subscription')
router.register(r'commissions', CommissionViewSet, basename='commission')

# Reviews
router.register(r'reviews', ReviewViewSet, basename='review')
router.register(r'review-questions', ReviewQuestionViewSet, basename='review-question')

# Locations
router.register(r'countries', CountryViewSet, basename='country')
router.register(r'states', StateViewSet, basename='state')
router.register(r'cities', CityViewSet, basename='city')
router.register(r'zipcodes', ZipCodeViewSet, basename='zipcode')
router.register(r'practitioner-locations', PractitionerLocationViewSet, basename='practitioner-location')

# Media
router.register(r'media', MediaViewSet, basename='media')

# Notifications
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-settings', NotificationSettingViewSet, basename='notification-setting')
router.register(r'notification-templates', NotificationTemplateViewSet, basename='notification-template')

# Streams
router.register(r'streams', StreamViewSet, basename='stream')
router.register(r'stream-posts', StreamPostViewSet, basename='stream-post')
router.register(r'stream-categories', StreamCategoryViewSet, basename='stream-category')

# Messaging
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'practitioner-messaging', PractitionerMessagingViewSet, basename='practitioner-messaging')

# Rooms (LiveKit video)
router.register(r'rooms', RoomViewSet, basename='room')

# Import documentation views
from api.v1.docs import (
    health_check, api_info, api_resources, api_examples, api_error_codes
)

# URL patterns
urlpatterns = [
    # API Documentation following official drf-spectacular pattern
    path('schema/', SpectacularAPIView.as_view(), name='schema'),
    path('docs/', SpectacularSwaggerView.as_view(url_name='schema'), name='swagger-ui'),
    path('docs/redoc/', SpectacularRedocView.as_view(url_name='schema'), name='redoc'),
    
    # Custom documentation endpoints
    path('health/', health_check, name='health-check'),
    path('info/', api_info, name='api-info'),
    path('resources/', api_resources, name='api-resources'),
    path('examples/', api_examples, name='api-examples'),
    path('errors/', api_error_codes, name='api-error-codes'),
    
    # Include all router URLs (all viewsets registered above)
    path('', include(router.urls)),
    
    # Additional auth endpoints (login, refresh, etc.)
    path('auth/', include('users.api.v1.urls')),
    
    # Include payment URLs (for webhooks)
    path('', include('payments.api.v1.urls')),
    
    # Include room URLs (for booking-specific endpoints)
    path('', include('rooms.api.v1.urls')),
]