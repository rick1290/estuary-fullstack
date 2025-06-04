from django.urls import path, include
from rest_framework.routers import DefaultRouter
from apps.rooms.api.v1.views import (
    RoomViewSet, VideoTokenViewSet, RoomBookingRelationViewSet
)

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')
router.register(r'tokens', VideoTokenViewSet, basename='video-token')
router.register(r'relations', RoomBookingRelationViewSet, basename='room-booking-relation')

urlpatterns = [
    path('', include(router.urls)),
]
