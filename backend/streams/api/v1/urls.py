from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StreamViewSet, StreamPostViewSet,
    StreamCategoryViewSet, UserStreamSubscriptionViewSet
)

router = DefaultRouter()
router.register(r'streams', StreamViewSet, basename='stream')
router.register(r'stream-posts', StreamPostViewSet, basename='stream-post')
router.register(r'stream-categories', StreamCategoryViewSet, basename='streamcategory')

# User-specific endpoints
router.register(r'users/me/stream-subscriptions', UserStreamSubscriptionViewSet, basename='user-stream-subscription')

urlpatterns = [
    path('', include(router.urls)),
]