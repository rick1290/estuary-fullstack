"""
Pagination classes for DRF
"""
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response


class StandardResultsSetPagination(PageNumberPagination):
    """
    Standard pagination for all endpoints
    
    Query parameters:
    - page: Page number (default 1)
    - page_size: Items per page (default 20, max 100)
    
    Response format:
    {
        "status": "success",
        "data": {
            "results": [...],
            "count": 100,
            "next": "http://api/v1/resource?page=2",
            "previous": null,
            "page_size": 20,
            "total_pages": 5,
            "current_page": 1
        }
    }
    """
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100
    page_query_param = 'page'
    
    def get_paginated_response(self, data):
        """
        Return paginated response in our standard format
        """
        return Response({
            'status': 'success',
            'data': {
                'results': data,
                'count': self.page.paginator.count,
                'next': self.get_next_link(),
                'previous': self.get_previous_link(),
                'page_size': self.page.paginator.per_page,
                'total_pages': self.page.paginator.num_pages,
                'current_page': self.page.number
            }
        })


class LargeResultsSetPagination(PageNumberPagination):
    """
    Pagination for endpoints that may return large datasets
    """
    page_size = 50
    page_size_query_param = 'page_size'
    max_page_size = 200


class SmallResultsSetPagination(PageNumberPagination):
    """
    Pagination for endpoints with typically small results
    """
    page_size = 10
    page_size_query_param = 'page_size'
    max_page_size = 50