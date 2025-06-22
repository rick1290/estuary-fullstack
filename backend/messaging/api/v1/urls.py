"""
URL configuration for messaging API
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import ConversationViewSet, MessageViewSet, PractitionerMessagingViewSet

app_name = 'messaging_api_v1'

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'practitioner-messaging', PractitionerMessagingViewSet, basename='practitioner-messaging')

urlpatterns = [
    path('', include(router.urls)),
]