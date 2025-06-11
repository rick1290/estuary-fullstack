from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    StreamViewSet, LiveStreamViewSet, StreamScheduleViewSet,
    StreamCategoryViewSet
)

router = DefaultRouter()
router.register(r'streams', StreamViewSet, basename='stream')
router.register(r'live-streams', LiveStreamViewSet, basename='livestream')
router.register(r'stream-schedules', StreamScheduleViewSet, basename='streamschedule')
router.register(r'stream-categories', StreamCategoryViewSet, basename='streamcategory')

urlpatterns = [
    path('', include(router.urls)),
]