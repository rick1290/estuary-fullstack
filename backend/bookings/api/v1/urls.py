from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.bookings.api.v1.views import BookingViewSet, BookingReminderViewSet

router = DefaultRouter()
router.register(r'bookings', BookingViewSet)
router.register(r'reminders', BookingReminderViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
