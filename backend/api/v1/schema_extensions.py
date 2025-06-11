"""
Schema extensions and decorators for enhanced API documentation
"""
from drf_spectacular.utils import (
    extend_schema, extend_schema_view, OpenApiParameter, OpenApiExample,
    OpenApiResponse, inline_serializer
)
from drf_spectacular.types import OpenApiTypes
from rest_framework import serializers, status


# Common parameter definitions
pagination_parameters = [
    OpenApiParameter(
        name='page',
        type=int,
        location=OpenApiParameter.QUERY,
        description='Page number for pagination',
        examples=[
            OpenApiExample('Default', value=1),
            OpenApiExample('Second page', value=2),
        ]
    ),
    OpenApiParameter(
        name='page_size',
        type=int,
        location=OpenApiParameter.QUERY,
        description='Number of items per page (max 100)',
        examples=[
            OpenApiExample('Default', value=20),
            OpenApiExample('Large page', value=50),
        ]
    ),
]

search_parameters = [
    OpenApiParameter(
        name='search',
        type=str,
        location=OpenApiParameter.QUERY,
        description='Search term for filtering results',
        examples=[
            OpenApiExample('Search by name', value='yoga'),
            OpenApiExample('Search by location', value='san francisco'),
        ]
    ),
]

ordering_parameters = [
    OpenApiParameter(
        name='ordering',
        type=str,
        location=OpenApiParameter.QUERY,
        description='Field to use for ordering results. Prefix with - for descending order.',
        examples=[
            OpenApiExample('Order by created date', value='created_at'),
            OpenApiExample('Order by price descending', value='-price'),
        ]
    ),
]


# Booking ViewSet schema extensions
booking_schema = extend_schema_view(
    list=extend_schema(
        summary='List bookings',
        description='''
        Retrieve a paginated list of bookings. Users can only see their own bookings
        unless they have practitioner or admin permissions.
        
        ## Filtering Options
        - `status`: Filter by booking status (pending, confirmed, cancelled, completed)
        - `service_type`: Filter by service type (session, workshop, course)
        - `practitioner`: Filter by practitioner ID
        - `start_date`: Filter bookings starting after this date
        - `end_date`: Filter bookings ending before this date
        ''',
        parameters=[
            *pagination_parameters,
            *search_parameters,
            *ordering_parameters,
            OpenApiParameter(
                name='status',
                type=str,
                location=OpenApiParameter.QUERY,
                enum=['pending', 'confirmed', 'cancelled', 'completed'],
                description='Filter by booking status'
            ),
            OpenApiParameter(
                name='service_type',
                type=str,
                location=OpenApiParameter.QUERY,
                enum=['session', 'workshop', 'course'],
                description='Filter by service type'
            ),
        ],
        examples=[
            OpenApiExample(
                'Successful response',
                value={
                    'count': 42,
                    'next': 'http://api.example.com/bookings?page=2',
                    'previous': None,
                    'results': [
                        {
                            'id': 1,
                            'service': {'id': 1, 'name': 'Yoga Session'},
                            'practitioner': {'id': 1, 'name': 'Jane Doe'},
                            'start_time': '2024-01-15T10:00:00Z',
                            'status': 'confirmed'
                        }
                    ]
                },
                response_only=True,
            )
        ],
        tags=['Bookings']
    ),
    create=extend_schema(
        summary='Create a booking',
        description='''
        Create a new booking for a service. The system will automatically:
        - Check practitioner availability
        - Calculate pricing (including credit usage)
        - Create a payment intent if needed
        - Send confirmation notifications
        
        ## Booking Types
        - **Session**: Book a specific time slot with the practitioner
        - **Workshop**: Register for a workshop at a specific date/time
        - **Course**: Enroll in a course (schedule is predetermined)
        ''',
        request=inline_serializer(
            name='BookingCreateRequest',
            fields={
                'service_id': serializers.IntegerField(help_text='ID of the service to book'),
                'start_time': serializers.DateTimeField(help_text='Start time for the booking'),
                'use_credits': serializers.BooleanField(
                    default=False,
                    help_text='Whether to use available credits for payment'
                ),
                'notes': serializers.CharField(
                    required=False,
                    help_text='Optional notes for the practitioner'
                ),
            }
        ),
        examples=[
            OpenApiExample(
                'Book a session',
                value={
                    'service_id': 1,
                    'start_time': '2024-01-15T10:00:00Z',
                    'use_credits': True,
                    'notes': 'First time, please go easy on me!'
                },
                request_only=True,
            ),
            OpenApiExample(
                'Book a workshop',
                value={
                    'service_id': 2,
                    'start_time': '2024-01-20T14:00:00Z',
                    'use_credits': False
                },
                request_only=True,
            )
        ],
        responses={
            201: OpenApiResponse(
                description='Booking created successfully',
                examples=[
                    OpenApiExample(
                        'Created booking',
                        value={
                            'id': 123,
                            'booking_reference': 'BK-2024-0123',
                            'service': {
                                'id': 1,
                                'name': 'Yoga Session',
                                'price': '50.00'
                            },
                            'status': 'pending',
                            'payment_status': 'pending',
                            'payment_intent_id': 'pi_1234567890',
                            'total_price': '50.00',
                            'credits_used': 1
                        }
                    )
                ]
            ),
            400: OpenApiResponse(
                description='Validation error',
                examples=[
                    OpenApiExample(
                        'Time slot unavailable',
                        value={
                            'error': 'The selected time slot is not available',
                            'code': 'slot_unavailable'
                        }
                    ),
                    OpenApiExample(
                        'Insufficient credits',
                        value={
                            'error': 'Insufficient credits for this booking',
                            'code': 'insufficient_credits',
                            'details': {
                                'required_credits': 2,
                                'available_credits': 1
                            }
                        }
                    )
                ]
            )
        },
        tags=['Bookings']
    ),
    retrieve=extend_schema(
        summary='Get booking details',
        description='Retrieve detailed information about a specific booking',
        responses={
            200: OpenApiResponse(
                description='Booking details',
                examples=[
                    OpenApiExample(
                        'Confirmed booking',
                        value={
                            'id': 123,
                            'booking_reference': 'BK-2024-0123',
                            'service': {
                                'id': 1,
                                'name': 'Yoga Session',
                                'description': 'One-on-one yoga session',
                                'duration_minutes': 60,
                                'price': '50.00'
                            },
                            'practitioner': {
                                'id': 1,
                                'user': {
                                    'full_name': 'Jane Doe',
                                    'profile_image': 'https://example.com/profile.jpg'
                                },
                                'bio': 'Certified yoga instructor'
                            },
                            'start_time': '2024-01-15T10:00:00Z',
                            'end_time': '2024-01-15T11:00:00Z',
                            'status': 'confirmed',
                            'payment_status': 'paid',
                            'total_price': '50.00',
                            'credits_used': 1,
                            'location': {
                                'name': 'Downtown Wellness Center',
                                'address': '123 Main St, San Francisco, CA'
                            },
                            'meeting_url': 'https://meet.estuary.com/session/123',
                            'created_at': '2024-01-10T08:00:00Z',
                            'updated_at': '2024-01-10T08:30:00Z'
                        }
                    )
                ]
            ),
            404: OpenApiResponse(description='Booking not found')
        },
        tags=['Bookings']
    ),
    cancel=extend_schema(
        summary='Cancel a booking',
        description='''
        Cancel a booking. Cancellation policies apply based on:
        - Time until the booking starts
        - Service cancellation policy
        - Number of previous cancellations
        
        Credits and refunds are processed automatically based on the policy.
        ''',
        request=inline_serializer(
            name='BookingCancelRequest',
            fields={
                'reason': serializers.CharField(
                    required=False,
                    help_text='Reason for cancellation'
                )
            }
        ),
        responses={
            200: OpenApiResponse(
                description='Booking cancelled',
                examples=[
                    OpenApiExample(
                        'Full refund',
                        value={
                            'message': 'Booking cancelled successfully',
                            'refund': {
                                'amount': '50.00',
                                'credits_returned': 1,
                                'refund_status': 'processed'
                            }
                        }
                    ),
                    OpenApiExample(
                        'Partial refund',
                        value={
                            'message': 'Booking cancelled with late cancellation fee',
                            'refund': {
                                'amount': '25.00',
                                'credits_returned': 0,
                                'refund_status': 'processed',
                                'cancellation_fee': '25.00'
                            }
                        }
                    )
                ]
            ),
            400: OpenApiResponse(
                description='Cannot cancel booking',
                examples=[
                    OpenApiExample(
                        'Too late to cancel',
                        value={
                            'error': 'Cannot cancel booking less than 2 hours before start time',
                            'code': 'cancellation_deadline_passed'
                        }
                    )
                ]
            )
        },
        tags=['Bookings']
    ),
    reschedule=extend_schema(
        summary='Reschedule a booking',
        description='Reschedule an existing booking to a new time slot',
        request=inline_serializer(
            name='BookingRescheduleRequest',
            fields={
                'new_start_time': serializers.DateTimeField(
                    help_text='New start time for the booking'
                )
            }
        ),
        responses={
            200: OpenApiResponse(
                description='Booking rescheduled successfully'
            ),
            400: OpenApiResponse(
                description='Cannot reschedule booking'
            )
        },
        tags=['Bookings']
    )
)


# Practitioner search schema
search_practitioners_schema = extend_schema(
    summary='Search practitioners',
    description='''
    Search for practitioners based on various criteria including:
    - Services offered
    - Location/distance
    - Availability
    - Price range
    - Ratings
    
    Results are ranked by relevance and can be filtered and sorted.
    ''',
    parameters=[
        *pagination_parameters,
        OpenApiParameter(
            name='q',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Search query (searches name, bio, specialties)',
            examples=[
                OpenApiExample('Search yoga', value='yoga'),
                OpenApiExample('Search meditation', value='meditation instructor'),
            ]
        ),
        OpenApiParameter(
            name='service_types',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Comma-separated list of service types',
            examples=[
                OpenApiExample('Sessions only', value='session'),
                OpenApiExample('Multiple types', value='session,workshop'),
            ]
        ),
        OpenApiParameter(
            name='categories',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Comma-separated list of category IDs',
        ),
        OpenApiParameter(
            name='lat',
            type=float,
            location=OpenApiParameter.QUERY,
            description='Latitude for location-based search',
        ),
        OpenApiParameter(
            name='lng',
            type=float,
            location=OpenApiParameter.QUERY,
            description='Longitude for location-based search',
        ),
        OpenApiParameter(
            name='radius',
            type=int,
            location=OpenApiParameter.QUERY,
            description='Search radius in miles (default: 25)',
        ),
        OpenApiParameter(
            name='min_price',
            type=float,
            location=OpenApiParameter.QUERY,
            description='Minimum price per session',
        ),
        OpenApiParameter(
            name='max_price',
            type=float,
            location=OpenApiParameter.QUERY,
            description='Maximum price per session',
        ),
        OpenApiParameter(
            name='min_rating',
            type=float,
            location=OpenApiParameter.QUERY,
            description='Minimum rating (1-5)',
        ),
        OpenApiParameter(
            name='available_on',
            type=str,
            location=OpenApiParameter.QUERY,
            description='Date to check availability (YYYY-MM-DD)',
        ),
        OpenApiParameter(
            name='sort',
            type=str,
            location=OpenApiParameter.QUERY,
            enum=['relevance', 'rating', 'price_low', 'price_high', 'distance'],
            description='Sort order for results',
        ),
    ],
    responses={
        200: OpenApiResponse(
            description='Search results',
            examples=[
                OpenApiExample(
                    'Search results',
                    value={
                        'count': 15,
                        'next': None,
                        'previous': None,
                        'results': [
                            {
                                'id': 1,
                                'user': {
                                    'full_name': 'Jane Doe',
                                    'profile_image': 'https://example.com/profile.jpg'
                                },
                                'bio': 'Certified yoga instructor with 10 years experience',
                                'specialties': ['Vinyasa', 'Hatha', 'Meditation'],
                                'rating': 4.9,
                                'total_reviews': 127,
                                'hourly_rate': '75.00',
                                'distance_miles': 2.3,
                                'next_available': '2024-01-15T09:00:00Z',
                                'services': [
                                    {
                                        'id': 1,
                                        'name': 'Private Yoga Session',
                                        'service_type': 'session',
                                        'price': '75.00'
                                    }
                                ]
                            }
                        ]
                    }
                )
            ]
        )
    },
    tags=['Search']
)