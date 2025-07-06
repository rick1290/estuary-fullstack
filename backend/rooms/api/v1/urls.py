"""
Room API URLs.
"""
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import RoomViewSet, BookingRoomViewSet

router = DefaultRouter()
router.register(r'rooms', RoomViewSet, basename='room')

# Booking room endpoints
booking_room_patterns = [
    path('bookings/<uuid:booking_id>/room/', 
         BookingRoomViewSet.as_view({'get': 'get_room'}), 
         name='booking-room'),
    path('bookings/<uuid:booking_id>/join/', 
         BookingRoomViewSet.as_view({'post': 'join_room'}), 
         name='booking-join'),
]

urlpatterns = [
    path('', include(router.urls)),
] + booking_room_patterns