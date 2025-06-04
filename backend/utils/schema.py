"""
Custom schema generation utilities for DRF Spectacular.
"""
from drf_spectacular.generators import SchemaGenerator
from drf_spectacular.plumbing import ResolvedComponent, build_basic_type
from drf_spectacular.settings import spectacular_settings
from rest_framework import serializers
import importlib


class EstuarySchemaGenerator(SchemaGenerator):
    """
    Custom schema generator that ensures proper serializer mapping for read/write operations.
    
    This generator overrides the default behavior to use readable serializers for GET operations
    and writable serializers for POST/PUT/PATCH operations.
    """
    
    def _get_serializer_name(self, serializer, direction):
        """
        Get the appropriate serializer name based on the operation direction.
        
        For read operations (response), use the readable version if available.
        For write operations (request), use the writable version if available.
        """
        serializer_class = serializer.__class__
        serializer_path = f"{serializer_class.__module__}.{serializer_class.__name__}"
        
        # For read operations, check if we have a readable version
        if direction == 'response' and serializer_path in spectacular_settings.SERIALIZER_NAME_OVERRIDES:
            readable_path = spectacular_settings.SERIALIZER_NAME_OVERRIDES[serializer_path]
            module_name, class_name = readable_path.rsplit('.', 1)
            
            try:
                module = importlib.import_module(module_name)
                readable_class = getattr(module, class_name)
                
                # Create an instance of the readable serializer
                readable_serializer = readable_class()
                
                # Use the readable serializer's name
                return self._get_component_name(readable_serializer)
            except (ImportError, AttributeError):
                # Fall back to default behavior if readable serializer not found
                pass
        
        # Default to parent class behavior
        return super()._get_serializer_name(serializer, direction)
    
    def _get_component_name(self, serializer):
        """
        Get the component name for a serializer.
        
        For readable serializers, ensure they have "Readable" in the name.
        For writable serializers, ensure they have "Writable" in the name.
        """
        serializer_class = serializer.__class__
        name = serializer_class.__name__
        
        # Add appropriate suffix based on serializer type
        if name.endswith('Readable'):
            return name
        elif name.endswith('Writable'):
            return name
        elif hasattr(serializer, 'Meta') and getattr(serializer.Meta, 'read_only', False):
            # If all fields are read-only, treat as a readable serializer
            if not name.endswith('Readable'):
                return f"{name}Readable"
        
        return name
