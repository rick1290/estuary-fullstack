"""
Custom schema generation for DRF Spectacular
"""
from drf_spectacular.openapi import AutoSchema
from drf_spectacular.utils import extend_schema
from rest_framework.decorators import api_view
from rest_framework.response import Response
from drf_spectacular.views import SpectacularAPIView
from django.urls import reverse
from django.conf import settings


class CustomSpectacularAPIView(SpectacularAPIView):
    """
    Custom schema view that ensures proper path discovery
    """
    def get(self, request, *args, **kwargs):
        # Force re-generation with debug info
        response = super().get(request, *args, **kwargs)
        
        # Add debug info if in DEBUG mode
        if settings.DEBUG and hasattr(response, 'data'):
            if isinstance(response.data, dict) and 'paths' in response.data:
                if not response.data['paths']:
                    response.data['x-debug'] = {
                        'message': 'No paths discovered',
                        'url_patterns_checked': request.build_absolute_uri(reverse('schema')),
                        'schema_path_prefix': getattr(settings, 'SPECTACULAR_SETTINGS', {}).get('SCHEMA_PATH_PREFIX', 'None')
                    }
        
        return response


def preprocessing_filter_spec(endpoints):
    """
    Custom preprocessing hook to debug endpoint discovery
    """
    if settings.DEBUG:
        print(f"[SCHEMA DEBUG] Discovered {len(endpoints)} endpoints")
        for endpoint in endpoints:
            print(f"[SCHEMA DEBUG] Endpoint: {endpoint[0]} -> {endpoint[1]}")
    
    # Make sure to return endpoints without any filtering
    return endpoints


def postprocess_schema_responses(result, generator, request, public):
    """
    Custom postprocessing hook to add debug info
    """
    # Remove debug info that causes schema validation to fail
    # Only add debug extension fields in development
    if settings.DEBUG and not result.get('paths'):
        # Use x- prefix for extension fields to comply with OpenAPI spec
        result['x-debug-info'] = {
            'paths_discovered': len(result.get('paths', {})),
            'components_discovered': len(result.get('components', {})),
            'message': 'Schema generated but no paths found'
        }
    
    return result