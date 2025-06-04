from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status

def custom_exception_handler(exc, context):
    """
    Custom exception handler for DRF that provides more detailed error responses.
    """
    # Call DRF's default exception handler first
    response = exception_handler(exc, context)

    if response is None:
        # If DRF's handler returns None, create a generic 500 response
        response = Response(
            {
                'error': {
                    'message': str(exc),
                    'type': exc.__class__.__name__
                }
            },
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
    else:
        # Enhance the existing response with more details
        error_data = {
            'error': {
                'message': response.data.get('detail', str(response.data)) if isinstance(response.data, dict) else str(response.data),
                'type': exc.__class__.__name__,
                'status_code': response.status_code
            }
        }

        # Add field-specific errors if they exist
        if isinstance(response.data, dict) and any(isinstance(v, list) for v in response.data.values()):
            error_data['error']['fields'] = {
                field: errors[0] if isinstance(errors, list) else errors
                for field, errors in response.data.items()
                if field != 'detail'
            }

        response.data = error_data

    return response
