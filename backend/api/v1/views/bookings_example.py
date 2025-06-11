"""
Example of using schema extensions for the Booking ViewSet
This shows how to apply custom documentation to viewsets
"""
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample
from api.v1.schema_extensions import booking_schema
from api.v1.schemas.bookings import BookingSerializer, BookingCreateSerializer


# Apply the booking schema decorators to the viewset
@booking_schema
class DocumentedBookingViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing bookings with enhanced documentation
    
    This viewset provides full CRUD operations for bookings with
    additional actions for cancellation and rescheduling.
    """
    serializer_class = BookingSerializer
    
    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        return BookingSerializer
    
    @extend_schema(
        summary='Get booking statistics',
        description='Get statistics about bookings for the authenticated user',
        responses={
            200: {
                'description': 'Booking statistics',
                'example': {
                    'total_bookings': 42,
                    'completed_bookings': 35,
                    'upcoming_bookings': 5,
                    'cancelled_bookings': 2,
                    'total_spent': '1250.00',
                    'credits_used': 15,
                    'favorite_practitioners': [
                        {'id': 1, 'name': 'Jane Doe', 'bookings': 12}
                    ]
                }
            }
        },
        tags=['Bookings']
    )
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get booking statistics for the user"""
        # Implementation would go here
        return Response({
            'total_bookings': 42,
            'completed_bookings': 35,
            'upcoming_bookings': 5,
            'cancelled_bookings': 2,
            'total_spent': '1250.00',
            'credits_used': 15
        })
    
    @extend_schema(
        summary='Check booking availability',
        description='Check if a specific time slot is available for booking',
        parameters=[
            OpenApiParameter(
                name='service_id',
                type=int,
                location=OpenApiParameter.QUERY,
                required=True,
                description='ID of the service to check'
            ),
            OpenApiParameter(
                name='start_time',
                type=str,
                location=OpenApiParameter.QUERY,
                required=True,
                description='Start time to check (ISO 8601 format)'
            ),
        ],
        responses={
            200: {
                'description': 'Availability status',
                'example': {
                    'available': True,
                    'next_available': '2024-01-15T11:00:00Z',
                    'conflicts': []
                }
            }
        },
        tags=['Bookings']
    )
    @action(detail=False, methods=['get'])
    def check_availability(self, request):
        """Check availability for a booking"""
        # Implementation would go here
        return Response({
            'available': True,
            'next_available': '2024-01-15T11:00:00Z',
            'conflicts': []
        })
    
    @extend_schema(
        summary='Get cancellation policy',
        description='Get the cancellation policy for a specific booking',
        responses={
            200: {
                'description': 'Cancellation policy details',
                'example': {
                    'can_cancel': True,
                    'deadline': '2024-01-15T08:00:00Z',
                    'refund_percentage': 100,
                    'policy': {
                        'name': 'Standard Policy',
                        'description': 'Full refund if cancelled 24 hours before',
                        'rules': [
                            {'hours_before': 24, 'refund_percentage': 100},
                            {'hours_before': 12, 'refund_percentage': 50},
                            {'hours_before': 2, 'refund_percentage': 0}
                        ]
                    }
                }
            }
        },
        tags=['Bookings']
    )
    @action(detail=True, methods=['get'])
    def cancellation_policy(self, request, pk=None):
        """Get cancellation policy for a booking"""
        # Implementation would go here
        return Response({
            'can_cancel': True,
            'deadline': '2024-01-15T08:00:00Z',
            'refund_percentage': 100,
            'policy': {
                'name': 'Standard Policy',
                'description': 'Full refund if cancelled 24 hours before'
            }
        })