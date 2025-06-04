"""
Caching utilities for the Estuary API.
"""
from functools import wraps
from django.utils.decorators import method_decorator
from django.views.decorators.cache import cache_page
from django.conf import settings


def cache_view_method(timeout=300, cache_private=False, key_prefix='api'):
    """
    Method decorator for class-based views that applies caching.
    
    Args:
        timeout: Cache timeout in seconds (default: 5 minutes)
        cache_private: Whether to allow caching of private responses (default: False)
        key_prefix: Prefix for cache keys (default: 'api')
    
    Returns:
        Decorated method
    """
    return method_decorator(cache_page(timeout, key_prefix=key_prefix))
