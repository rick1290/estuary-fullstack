from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register('templates', views.FormTemplateViewSet, basename='form-templates')
router.register('platform-templates', views.PlatformTemplateViewSet, basename='platform-templates')

urlpatterns = [
    path('', include(router.urls)),
    path('services/<int:service_pk>/forms/', views.ServiceFormViewSet.as_view({
        'get': 'list', 'post': 'create'
    }), name='service-forms-list'),
    path('services/<int:service_pk>/forms/<int:pk>/', views.ServiceFormViewSet.as_view({
        'delete': 'destroy'
    }), name='service-forms-detail'),
    path('bookings/<str:booking_uuid>/forms/', views.BookingFormsViewSet.as_view({
        'get': 'list'
    }), name='booking-forms'),
    path('bookings/<str:booking_uuid>/forms/intake/', views.BookingFormsViewSet.as_view({
        'post': 'submit_intake'
    }), name='booking-intake'),
    path('bookings/<str:booking_uuid>/forms/consent/', views.BookingFormsViewSet.as_view({
        'post': 'sign_consent'
    }), name='booking-consent'),
    path('bookings/<str:booking_uuid>/forms/responses/', views.PractitionerFormsViewSet.as_view({
        'get': 'list'
    }), name='booking-form-responses'),
]
