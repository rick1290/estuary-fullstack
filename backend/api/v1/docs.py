"""
Custom documentation endpoints for the API
"""
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework import status
from django.urls import reverse
from django.conf import settings


@api_view(['GET'])
@permission_classes([AllowAny])
def health_check(request):
    """
    Health check endpoint for monitoring
    """
    return Response({
        'status': 'healthy',
        'message': 'Estuary API is running',
        'version': '1.0.0',
        'environment': 'development' if settings.DEBUG else 'production'
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_info(request):
    """
    General API information
    """
    return Response({
        'title': 'Estuary API',
        'description': 'Wellness marketplace and content platform API',
        'version': '1.0.0',
        'documentation': {
            'swagger': request.build_absolute_uri(reverse('swagger-ui')),
            'redoc': request.build_absolute_uri(reverse('redoc')),
            'openapi': request.build_absolute_uri(reverse('schema'))
        },
        'authentication': {
            'type': 'JWT Bearer',
            'login': '/api/v1/auth/login/',
            'refresh': '/api/v1/auth/token/refresh/'
        },
        'contact': {
            'email': 'api@estuary.com',
            'support': 'https://estuary.com/support'
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_resources(request):
    """
    List of available API resources
    """
    return Response({
        'resources': {
            'auth': {
                'description': 'Authentication and user management',
                'endpoints': [
                    '/api/v1/auth/register/',
                    '/api/v1/auth/login/',
                    '/api/v1/auth/logout/',
                    '/api/v1/auth/token/refresh/',
                    '/api/v1/auth/me/'
                ]
            },
            'bookings': {
                'description': 'Booking management',
                'endpoints': [
                    '/api/v1/bookings/',
                    '/api/v1/bookings/{id}/',
                    '/api/v1/bookings/{id}/cancel/',
                    '/api/v1/bookings/{id}/confirm/',
                    '/api/v1/bookings/{id}/complete/'
                ]
            },
            'services': {
                'description': 'Service catalog',
                'endpoints': [
                    '/api/v1/services/',
                    '/api/v1/services/{id}/',
                    '/api/v1/services/categories/',
                    '/api/v1/services/featured/',
                    '/api/v1/services/popular/'
                ]
            },
            'practitioners': {
                'description': 'Practitioner profiles',
                'endpoints': [
                    '/api/v1/practitioners/',
                    '/api/v1/practitioners/{id}/',
                    '/api/v1/practitioners/search/',
                    '/api/v1/practitioners/me/',
                    '/api/v1/practitioners/availability/'
                ]
            },
            'payments': {
                'description': 'Payment processing',
                'endpoints': [
                    '/api/v1/payments/checkout/',
                    '/api/v1/payments/methods/',
                    '/api/v1/payments/credits/',
                    '/api/v1/payments/payouts/',
                    '/api/v1/payments/subscriptions/'
                ]
            },
            'reviews': {
                'description': 'Reviews and ratings',
                'endpoints': [
                    '/api/v1/reviews/',
                    '/api/v1/reviews/{id}/',
                    '/api/v1/reviews/{id}/vote/',
                    '/api/v1/reviews/{id}/report/',
                    '/api/v1/reviews/statistics/'
                ]
            },
            'locations': {
                'description': 'Location management',
                'endpoints': [
                    '/api/v1/locations/countries/',
                    '/api/v1/locations/states/',
                    '/api/v1/locations/cities/',
                    '/api/v1/locations/practitioner-locations/',
                    '/api/v1/locations/search/'
                ]
            },
            'media': {
                'description': 'Media file management',
                'endpoints': [
                    '/api/v1/media/',
                    '/api/v1/media/upload/',
                    '/api/v1/media/batch-upload/',
                    '/api/v1/media/presigned-upload/'
                ]
            },
            'notifications': {
                'description': 'Notification system',
                'endpoints': [
                    '/api/v1/notifications/',
                    '/api/v1/notifications/{id}/',
                    '/api/v1/notifications/mark-read/',
                    '/api/v1/notifications/unread-count/',
                    '/api/v1/notifications/settings/'
                ]
            },
            'streams': {
                'description': 'Content streaming',
                'endpoints': [
                    '/api/v1/streams/',
                    '/api/v1/streams/{id}/',
                    '/api/v1/streams/live/',
                    '/api/v1/streams/schedules/',
                    '/api/v1/streams/analytics/'
                ]
            }
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_examples(request):
    """
    Common usage examples
    """
    return Response({
        'examples': {
            'authentication': {
                'login': {
                    'method': 'POST',
                    'url': '/api/v1/auth/login/',
                    'body': {
                        'email': 'user@example.com',
                        'password': 'your-password'
                    },
                    'response': {
                        'access_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                        'refresh_token': 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...',
                        'token_type': 'bearer',
                        'expires_in': 1800,
                        'user': {
                            'id': 1,
                            'email': 'user@example.com',
                            'first_name': 'John',
                            'last_name': 'Doe'
                        }
                    }
                },
                'using_token': {
                    'headers': {
                        'Authorization': 'Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...'
                    }
                }
            },
            'searching_practitioners': {
                'method': 'GET',
                'url': '/api/v1/practitioners/search/',
                'params': {
                    'service_type': 'massage',
                    'city': 'San Francisco',
                    'availability_date': '2024-01-15',
                    'price_min': 50,
                    'price_max': 200
                }
            },
            'creating_booking': {
                'method': 'POST',
                'url': '/api/v1/bookings/',
                'body': {
                    'service_id': 123,
                    'practitioner_id': 456,
                    'start_time': '2024-01-15T10:00:00Z',
                    'duration_minutes': 60,
                    'notes': 'First time client'
                }
            },
            'uploading_media': {
                'method': 'POST',
                'url': '/api/v1/media/upload/',
                'headers': {
                    'Content-Type': 'multipart/form-data'
                },
                'body': {
                    'file': '<binary-file-data>',
                    'entity_type': 'service',
                    'entity_id': 123,
                    'title': 'Service Photo',
                    'media_type': 'image'
                }
            }
        }
    })


@api_view(['GET'])
@permission_classes([AllowAny])
def api_error_codes(request):
    """
    Common error codes and their meanings
    """
    return Response({
        'error_codes': {
            'authentication': {
                'INVALID_CREDENTIALS': 'Email or password is incorrect',
                'TOKEN_EXPIRED': 'JWT token has expired',
                'TOKEN_INVALID': 'JWT token is invalid or malformed',
                'USER_INACTIVE': 'User account is deactivated',
                'EMAIL_NOT_VERIFIED': 'Email address needs verification'
            },
            'validation': {
                'REQUIRED_FIELD': 'Required field is missing',
                'INVALID_FORMAT': 'Field format is invalid',
                'VALUE_TOO_LONG': 'Value exceeds maximum length',
                'VALUE_TOO_SHORT': 'Value is below minimum length',
                'INVALID_CHOICE': 'Value is not a valid choice',
                'DUPLICATE_VALUE': 'Value already exists'
            },
            'booking': {
                'SLOT_UNAVAILABLE': 'Time slot is no longer available',
                'INSUFFICIENT_CREDITS': 'Not enough credits for booking',
                'BOOKING_LOCKED': 'Booking cannot be modified',
                'INVALID_STATUS_TRANSITION': 'Invalid status change',
                'PAST_BOOKING': 'Cannot book in the past'
            },
            'payment': {
                'PAYMENT_FAILED': 'Payment processing failed',
                'CARD_DECLINED': 'Credit card was declined',
                'INSUFFICIENT_FUNDS': 'Insufficient funds',
                'SUBSCRIPTION_REQUIRED': 'Active subscription required',
                'PAYOUT_THRESHOLD': 'Minimum payout amount not met'
            },
            'permissions': {
                'PERMISSION_DENIED': 'You do not have permission',
                'PRACTITIONER_ONLY': 'Practitioner account required',
                'OWNER_ONLY': 'You can only access your own resources',
                'SUBSCRIPTION_LIMIT': 'Upgrade subscription for this feature'
            },
            'resource': {
                'NOT_FOUND': 'Resource not found',
                'ALREADY_EXISTS': 'Resource already exists',
                'CONFLICT': 'Resource conflict',
                'DELETED': 'Resource has been deleted'
            }
        },
        'http_status_codes': {
            '200': 'OK - Request succeeded',
            '201': 'Created - Resource created successfully',
            '204': 'No Content - Request succeeded with no response body',
            '400': 'Bad Request - Invalid request data',
            '401': 'Unauthorized - Authentication required',
            '403': 'Forbidden - Permission denied',
            '404': 'Not Found - Resource not found',
            '409': 'Conflict - Resource conflict',
            '422': 'Unprocessable Entity - Validation error',
            '429': 'Too Many Requests - Rate limit exceeded',
            '500': 'Internal Server Error - Server error',
            '503': 'Service Unavailable - Temporary outage'
        }
    })