from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    NotificationViewSet,
    NotificationSettingViewSet,
    NotificationTemplateViewSet
)

app_name = 'notifications'

router = DefaultRouter()
router.register(r'notifications', NotificationViewSet, basename='notification')
router.register(r'notification-settings', NotificationSettingViewSet, basename='notification-setting')
router.register(r'notification-templates', NotificationTemplateViewSet, basename='notification-template')

urlpatterns = [
    path('', include(router.urls)),
]