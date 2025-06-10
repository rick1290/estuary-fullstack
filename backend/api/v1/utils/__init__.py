"""
Utility functions for API v1
"""
from typing import List, Callable, TypeVar, Any
from django.db.models import QuerySet
from django.core.paginator import Paginator
from api.dependencies import PaginationParams


T = TypeVar('T')


async def paginate_queryset(
    queryset: QuerySet,
    pagination: PaginationParams,
    serializer: Callable[[Any], T]
) -> dict:
    """
    Paginate a Django queryset and serialize the results.
    
    Args:
        queryset: Django QuerySet to paginate
        pagination: PaginationParams object
        serializer: Function to serialize each item
        
    Returns:
        Dictionary with paginated results
    """
    # Create paginator
    paginator = Paginator(queryset, pagination.limit)
    
    # Get page number from offset
    page_number = (pagination.offset // pagination.limit) + 1
    
    # Get page
    page = paginator.get_page(page_number)
    
    # Serialize results - handle both sync and async serializers
    import asyncio
    import inspect
    
    if inspect.iscoroutinefunction(serializer):
        # Async serializer
        results = [await serializer(item) for item in page]
    else:
        # Sync serializer
        results = [serializer(item) for item in page]
    
    # Return paginated response
    return {
        "results": results,
        "total": paginator.count,
        "limit": pagination.limit,
        "offset": pagination.offset,
        "has_next": page.has_next(),
        "has_previous": page.has_previous()
    }