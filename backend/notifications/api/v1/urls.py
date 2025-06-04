from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.notifications.api.v1.views import (
    NotificationViewSet, NotificationTemplateViewSet, NotificationSettingViewSet
)

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'templates', NotificationTemplateViewSet, basename='notification-template')
router.register(r'settings', NotificationSettingViewSet, basename='notification-setting')

urlpatterns = [
    path('', include(router.urls)),
]
