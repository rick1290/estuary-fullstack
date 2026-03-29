from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('templates', views.FormTemplateViewSet, basename='form-templates')
router.register('platform-templates', views.PlatformTemplateViewSet, basename='platform-templates')
router.register('responses', views.IntakeResponseViewSet, basename='intake-responses')
router.register('consent-signatures', views.ConsentSignatureViewSet, basename='consent-signatures')
router.register('questions', views.FormQuestionCRUDViewSet, basename='form-questions')
router.register('consent-documents', views.ConsentDocumentCRUDViewSet, basename='consent-documents')

urlpatterns = [
    path('', include(router.urls)),
    # Service form linking (attach/detach forms to services)
    path('services/<int:service_pk>/forms/', views.ServiceFormViewSet.as_view({
        'get': 'list', 'post': 'create'
    }), name='service-forms-list'),
    path('services/<int:service_pk>/forms/<int:pk>/', views.ServiceFormViewSet.as_view({
        'delete': 'destroy', 'patch': 'partial_update'
    }), name='service-forms-detail'),
    # Booking forms aggregation (read-only status view)
    path('bookings/<str:booking_uuid>/forms/', views.BookingFormsViewSet.as_view({
        'get': 'list'
    }), name='booking-forms'),
    # Legacy routes — kept for backwards compatibility, use /responses/ and /consent-signatures/ instead
    path('bookings/<str:booking_uuid>/forms/intake/', views.BookingFormsViewSet.as_view({
        'post': 'submit_intake'
    }), name='booking-intake'),
    path('bookings/<str:booking_uuid>/forms/consent/', views.BookingFormsViewSet.as_view({
        'post': 'sign_consent'
    }), name='booking-consent'),
    # Practitioner view of responses
    path('bookings/<str:booking_uuid>/forms/responses/', views.PractitionerFormsViewSet.as_view({
        'get': 'list'
    }), name='booking-form-responses'),
]
