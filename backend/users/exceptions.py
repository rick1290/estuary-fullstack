"""
Custom exception handlers for Django REST Framework
"""
from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
import logging

logger = logging.getLogger(__name__)


def custom_exception_handler(exc, context):
    """
    Custom exception handler that provides consistent error responses
    """
    # Call REST framework's default exception handler first
    response = exception_handler(exc, context)
    
    if response is not None:
        # Log the exception
        logger.error(f"API Exception: {exc}", exc_info=True)
        
        # Create a custom error response format
        custom_response_data = {
            'error': True,
            'message': 'An error occurred',
            'details': response.data
        }
        
        # Handle different types of errors
        if hasattr(exc, 'detail'):
            if isinstance(exc.detail, dict):
                custom_response_data['message'] = 'Validation error'
                custom_response_data['details'] = exc.detail
            elif isinstance(exc.detail, list):
                custom_response_data['message'] = exc.detail[0] if exc.detail else 'An error occurred'
                custom_response_data['details'] = exc.detail
            else:
                custom_response_data['message'] = str(exc.detail)
        
        response.data = custom_response_data
    
    return response