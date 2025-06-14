"""
Base views and viewsets for DRF
"""
from rest_framework import viewsets, status
from rest_framework.response import Response
from rest_framework.settings import api_settings
from django.core.exceptions import ValidationError as DjangoValidationError
from django.http import Http404
from django.db import transaction
from .pagination import StandardResultsSetPagination


class BaseViewSet(viewsets.ModelViewSet):
    """
    Base viewset with common functionality
    
    Features:
    - Standard pagination
    - Automatic serializer class selection based on action
    - Consistent error handling
    - Audit trail support
    """
    pagination_class = StandardResultsSetPagination
    
    # Define serializer classes for different actions
    serializer_class = None
    list_serializer_class = None
    create_serializer_class = None
    update_serializer_class = None
    partial_update_serializer_class = None
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action
        """
        if self.action == 'list' and self.list_serializer_class:
            return self.list_serializer_class
        elif self.action == 'create' and self.create_serializer_class:
            return self.create_serializer_class
        elif self.action == 'update' and self.update_serializer_class:
            return self.update_serializer_class
        elif self.action == 'partial_update' and self.partial_update_serializer_class:
            return self.partial_update_serializer_class
        
        return self.serializer_class
    
    def perform_create(self, serializer):
        """
        Hook for modifying object creation
        Adds audit trail if model has created_by field
        """
        save_kwargs = {}
        
        # Add created_by if model supports it
        if hasattr(serializer.Meta.model, 'created_by'):
            save_kwargs['created_by'] = self.request.user
        
        # Add updated_by if model supports it
        if hasattr(serializer.Meta.model, 'updated_by'):
            save_kwargs['updated_by'] = self.request.user
            
        serializer.save(**save_kwargs)
    
    def perform_update(self, serializer):
        """
        Hook for modifying object update
        Adds audit trail if model has updated_by field
        """
        save_kwargs = {}
        
        # Add updated_by if model supports it
        if hasattr(serializer.Meta.model, 'updated_by'):
            save_kwargs['updated_by'] = self.request.user
            
        serializer.save(**save_kwargs)
    
    def create(self, request, *args, **kwargs):
        """
        Create with consistent response format
        """
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            self.perform_create(serializer)
        
        # Use detail serializer for response
        response_serializer = self.serializer_class(serializer.instance)
        
        return Response(
            {
                'status': 'success',
                'message': f'{self.get_serializer_class().Meta.model.__name__} created successfully',
                'data': response_serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def update(self, request, *args, **kwargs):
        """
        Update with consistent response format
        """
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            self.perform_update(serializer)
        
        # Use detail serializer for response
        response_serializer = self.serializer_class(serializer.instance)
        
        return Response({
            'status': 'success',
            'message': f'{self.get_serializer_class().Meta.model.__name__} updated successfully',
            'data': response_serializer.data
        })
    
    def destroy(self, request, *args, **kwargs):
        """
        Delete with consistent response format
        """
        instance = self.get_object()
        
        with transaction.atomic():
            self.perform_destroy(instance)
        
        return Response({
            'status': 'success',
            'message': f'{self.get_serializer_class().Meta.model.__name__} deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


class ReadOnlyViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Base viewset for read-only endpoints
    """
    pagination_class = StandardResultsSetPagination
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action
        """
        if self.action == 'list' and hasattr(self, 'list_serializer_class'):
            return self.list_serializer_class
        return self.serializer_class


class CreateListRetrieveViewSet(viewsets.ModelViewSet):
    """
    Viewset that only allows create, list, and retrieve
    No update or delete
    """
    http_method_names = ['get', 'post', 'head', 'options']
    pagination_class = StandardResultsSetPagination


class BulkCreateMixin:
    """
    Mixin to support bulk creation of objects
    """
    
    def create(self, request, *args, **kwargs):
        """
        Override create to handle both single and bulk creation
        """
        is_many = isinstance(request.data, list)
        
        if not is_many:
            return super().create(request, *args, **kwargs)
        
        serializer = self.get_serializer(data=request.data, many=True)
        serializer.is_valid(raise_exception=True)
        
        with transaction.atomic():
            self.perform_bulk_create(serializer)
        
        return Response(
            {
                'status': 'success',
                'message': f'{len(serializer.data)} items created successfully',
                'data': serializer.data
            },
            status=status.HTTP_201_CREATED
        )
    
    def perform_bulk_create(self, serializer):
        """
        Hook for bulk creation
        """
        serializer.save()


class SoftDeleteMixin:
    """
    Mixin for soft delete functionality
    Assumes model has is_deleted and deleted_at fields
    """
    
    def get_queryset(self):
        """
        Filter out soft-deleted objects by default
        """
        queryset = super().get_queryset()
        
        # Only filter if model has is_deleted field
        if hasattr(queryset.model, 'is_deleted'):
            return queryset.filter(is_deleted=False)
        
        return queryset
    
    def perform_destroy(self, instance):
        """
        Soft delete instead of hard delete
        """
        if hasattr(instance, 'is_deleted'):
            instance.is_deleted = True
            
            if hasattr(instance, 'deleted_at'):
                from django.utils import timezone
                instance.deleted_at = timezone.now()
            
            if hasattr(instance, 'deleted_by'):
                instance.deleted_by = self.request.user
            
            instance.save()
        else:
            # Fallback to hard delete if model doesn't support soft delete
            instance.delete()


class OwnerFilterMixin:
    """
    Mixin to filter queryset by owner (user)
    """
    owner_field = 'user'  # Override if different field name
    
    def get_queryset(self):
        """
        Filter by owner unless user is staff
        """
        queryset = super().get_queryset()
        
        if self.request.user.is_staff:
            return queryset
        
        # Filter by owner field
        filter_kwargs = {self.owner_field: self.request.user}
        return queryset.filter(**filter_kwargs)


class PractitionerFilterMixin:
    """
    Mixin to filter queryset by practitioner
    """
    practitioner_field = 'practitioner'  # Override if different
    
    def get_queryset(self):
        """
        Filter by practitioner if user is one
        """
        queryset = super().get_queryset()
        
        if not hasattr(self.request.user, 'practitioner'):
            return queryset.none()
        
        filter_kwargs = {
            self.practitioner_field: self.request.user.practitioner
        }
        return queryset.filter(**filter_kwargs)