from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.messaging.api.v1.views import (
    ConversationViewSet, MessageViewSet, TypingIndicatorViewSet
)

router = DefaultRouter()
router.register(r'conversations', ConversationViewSet, basename='conversation')
router.register(r'messages', MessageViewSet, basename='message')
router.register(r'typing', TypingIndicatorViewSet, basename='typing-indicator')

urlpatterns = [
    path('', include(router.urls)),
]
