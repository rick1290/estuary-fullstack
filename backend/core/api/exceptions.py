"""
Custom exception handlers and exception classes
"""
from rest_framework.views import exception_handler
from rest_framework.exceptions import APIException
from rest_framework import status
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404


def custom_exception_handler(exc, context):
    """
    Custom exception handler that formats all errors consistently
    
    Format:
    {
        "status": "error",
        "message": "Human readable error message",
        "errors": {
            "field_name": ["Error message 1", "Error message 2"]
        },
        "code": "error_code"
    }
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        custom_response_data = {
            'status': 'error',
            'message': 'An error occurred',
            'errors': {}
        }
        
        # Handle different exception types
        if isinstance(exc, DjangoValidationError):
            custom_response_data['message'] = 'Validation error'
            if hasattr(exc, 'message_dict'):
                custom_response_data['errors'] = exc.message_dict
            else:
                custom_response_data['errors'] = {'detail': exc.messages}
                
        elif isinstance(exc, Http404):
            custom_response_data['message'] = 'Resource not found'
            custom_response_data['code'] = 'not_found'
            
        elif hasattr(exc, 'detail'):
            # Handle DRF exceptions
            if isinstance(exc.detail, dict):
                custom_response_data['errors'] = exc.detail
                # Extract message from errors
                if 'detail' in exc.detail:
                    custom_response_data['message'] = str(exc.detail['detail'])
                else:
                    # Use first error as message
                    first_error = next(iter(exc.detail.values()))
                    if isinstance(first_error, list):
                        custom_response_data['message'] = first_error[0]
                    else:
                        custom_response_data['message'] = str(first_error)
            elif isinstance(exc.detail, list):
                custom_response_data['errors'] = {'detail': exc.detail}
                custom_response_data['message'] = exc.detail[0] if exc.detail else 'An error occurred'
            else:
                custom_response_data['message'] = str(exc.detail)
                
        # Add error code if available
        if hasattr(exc, 'default_code'):
            custom_response_data['code'] = exc.default_code
            
        response.data = custom_response_data
    
    return response


# Custom exception classes

class BadRequest(APIException):
    """Generic bad request exception"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Bad request'
    default_code = 'bad_request'


class NotFound(APIException):
    """Resource not found exception"""
    status_code = status.HTTP_404_NOT_FOUND
    default_detail = 'Resource not found'
    default_code = 'not_found'


class PermissionDenied(APIException):
    """Permission denied exception"""
    status_code = status.HTTP_403_FORBIDDEN
    default_detail = 'You do not have permission to perform this action'
    default_code = 'permission_denied'


class Conflict(APIException):
    """Resource conflict exception"""
    status_code = status.HTTP_409_CONFLICT
    default_detail = 'Resource conflict'
    default_code = 'conflict'


class ValidationError(APIException):
    """Validation error with field-specific errors"""
    status_code = status.HTTP_400_BAD_REQUEST
    default_detail = 'Invalid input'
    default_code = 'validation_error'
    
    def __init__(self, detail=None, code=None, field_errors=None):
        if field_errors:
            detail = field_errors
        super().__init__(detail, code)


class AuthenticationFailed(APIException):
    """Authentication failed exception"""
    status_code = status.HTTP_401_UNAUTHORIZED
    default_detail = 'Authentication failed'
    default_code = 'authentication_failed'


class ServiceUnavailable(APIException):
    """Service temporarily unavailable"""
    status_code = status.HTTP_503_SERVICE_UNAVAILABLE
    default_detail = 'Service temporarily unavailable'
    default_code = 'service_unavailable'


class PaymentRequired(APIException):
    """Payment required to access resource"""
    status_code = status.HTTP_402_PAYMENT_REQUIRED
    default_detail = 'Payment required'
    default_code = 'payment_required'


class InsufficientCredits(PaymentRequired):
    """Insufficient credits for operation"""
    default_detail = 'Insufficient credits'
    default_code = 'insufficient_credits'


class SubscriptionRequired(PaymentRequired):
    """Active subscription required"""
    default_detail = 'Active subscription required'
    default_code = 'subscription_required'


class RateLimitExceeded(APIException):
    """Rate limit exceeded"""
    status_code = status.HTTP_429_TOO_MANY_REQUESTS
    default_detail = 'Rate limit exceeded'
    default_code = 'rate_limit_exceeded'