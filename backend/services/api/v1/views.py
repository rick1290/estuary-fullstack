from rest_framework import viewsets, filters, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework import serializers
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiTypes, OpenApiExample, inline_serializer, OpenApiResponse
from django.utils import timezone
from datetime import datetime

from apps.services.models import Service, ServiceType, ServiceCategory, ServiceSession, ServiceRelationship, ServicePractitioner
from apps.practitioners.utils.availability import get_practitioner_availability
from .serializers import (
    ServiceListSerializer, ServiceDetailSerializer, EnhancedServiceDetailSerializer, ServiceTypeSerializer,
    ServiceCategorySerializer, ServiceSessionSerializer, ServiceCreateSerializer,
    ServiceUpdateSerializer, ServiceRelationshipSerializer
)
from apps.utils.permissions import IsPractitionerOrReadOnly
from apps.utils.cache import cache_view_method

class ServiceTypeViewSet(viewsets.ReadOnlyModelViewSet):
    """
    API endpoint for viewing service types.
    """
    queryset = ServiceType.objects.all()
    serializer_class = ServiceTypeSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    @cache_view_method(timeout=3600)  # Cache for 1 hour (rarely changes)
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @cache_view_method(timeout=3600)  # Cache for 1 hour
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)


class ServiceCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing service categories.
    
    list:
    Return a list of all active categories.
    
    retrieve:
    Return the given category.
    
    create:
    Create a new category (requires practitioner privileges).
    
    update:
    Update a category (requires practitioner privileges).
    
    partial_update:
    Partially update a category (requires practitioner privileges).
    
    destroy:
    Delete a category (requires practitioner privileges).
    """
    queryset = ServiceCategory.objects.all()
    serializer_class = ServiceCategorySerializer
    permission_classes = [IsPractitionerOrReadOnly]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['is_active', 'parent']
    search_fields = ['name', 'description']
    
    @cache_view_method(timeout=1800)  # Cache for 30 minutes
    def list(self, request, *args, **kwargs):
        """Return a list of all active categories."""
        return super().list(request, *args, **kwargs)
    
    @cache_view_method(timeout=1800)  # Cache for 30 minutes
    def retrieve(self, request, *args, **kwargs):
        """Return the given category."""
        return super().retrieve(request, *args, **kwargs)
    
    def get_queryset(self):
        """
        Filter categories based on query parameters.
        """
        queryset = ServiceCategory.objects.all()
        
        # Filter by active status if not creating/updating
        if self.action in ['list', 'retrieve']:
            is_active = self.request.query_params.get('is_active', 'true').lower()
            if is_active == 'true':
                queryset = queryset.filter(is_active=True)
            elif is_active == 'false':
                queryset = queryset.filter(is_active=False)
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Set the creator of the category.
        """
        serializer.save()
    
    @extend_schema(
        description='Returns a list of root categories (categories without parents)'
    )
    @action(detail=False, methods=['get'])
    def root(self, request):
        """Return a list of root categories."""
        root_categories = self.get_queryset().filter(parent__isnull=True)
        serializer = self.get_serializer(root_categories, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns all child categories for a given category'
    )
    @action(detail=True, methods=['get'])
    def children(self, request, pk=None):
        """Return all child categories for a given category."""
        category = self.get_object()
        children = self.get_queryset().filter(parent=category)
        serializer = self.get_serializer(children, many=True)
        return Response(serializer.data)


class ServiceViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing services.
    
    list:
    Return a list of all active services.
    
    retrieve:
    Return the given service.
    
    create:
    Create a new service (requires practitioner privileges).
    
    update:
    Update a service (requires practitioner privileges, can only update own services).
    
    partial_update:
    Partially update a service (requires practitioner privileges, can only update own services).
    
    destroy:
    Delete a service (requires practitioner privileges, can only delete own services).
    
    featured:
    Return a list of featured services.
    
    by_practitioner:
    Return services for a specific practitioner.
    
    by_category:
    Return services for a specific category.
    
    child_services:
    Return child services for a course or package.
    
    add_child_service:
    Add a child service to a course or package.
    
    update_child_service:
    Update a child service relationship.
    
    remove_child_service:
    Remove a child service from a course or package.
    
    services_by_category:
    Return services grouped by category for a specific practitioner.
    
    available_times:
    Return available time slots for booking this service.
    """
    queryset = Service.objects.all()  # Default queryset for router registration
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['service_type', 'location_type', 'practitioner_relationships__practitioner', 'category', 'is_active', 'is_featured']
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['price', 'duration', 'average_rating', 'total_reviews', 'total_bookings', 'created_at']
    ordering = ['-is_featured', '-average_rating']
    permission_classes = [IsPractitionerOrReadOnly]
    
    def get_queryset(self):
        """
        Filter services based on query parameters and user role.
        """
        # If user is a practitioner and performing create/update/delete, show all their services
        if self.request.user.is_authenticated and hasattr(self.request.user, 'practitioner_profile') and self.action in ['update', 'partial_update', 'destroy']:
            return Service.objects.filter(practitioner_relationships__practitioner=self.request.user.practitioner_profile)
        
        # For list/retrieve, only show active services unless explicitly requested
        queryset = Service.objects.all()
        
        if self.action in ['list', 'retrieve']:
            is_active = self.request.query_params.get('is_active', 'true').lower()
            if is_active == 'true':
                queryset = queryset.filter(is_active=True)
            elif is_active == 'false' and self.request.user.is_authenticated and hasattr(self.request.user, 'practitioner_profile'):
                # Only practitioners can see inactive services
                practitioner_id = self.request.query_params.get('practitioner_id')
                if practitioner_id and str(practitioner_id) == str(self.request.user.practitioner_profile.id):
                    queryset = queryset.filter(is_active=False, practitioner_relationships__practitioner=self.request.user.practitioner_profile)
                else:
                    queryset = queryset.filter(is_active=True)
            else:
                queryset = queryset.filter(is_active=True)
        
        return queryset
    
    def get_serializer_class(self):
        """
        Return appropriate serializer class based on action.
        """
        if self.action == 'create':
            return ServiceCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ServiceUpdateSerializer
        elif self.action == 'list' or self.action == 'featured':
            return ServiceListSerializer
        elif self.action == 'retrieve':
            return EnhancedServiceDetailSerializer
        return ServiceDetailSerializer
    
    def perform_create(self, serializer):
        """
        Create service and associate it with the current practitioner.
        """
        service = serializer.save()
        
        # Create the practitioner relationship
        ServicePractitioner.objects.create(
            service=service,
            practitioner=self.request.user.practitioner_profile,
            is_primary=True,
            revenue_share_percentage=100  # As primary practitioner, gets 100%
        )
    
    @extend_schema(
        description='Returns services for the currently authenticated practitioner'
    )
    @action(detail=False, methods=['get'])
    def my_services(self, request):
        """Return services for the current practitioner."""
        if not hasattr(request.user, 'practitioner_profile'):
            return Response({'error': 'User is not a practitioner'}, status=status.HTTP_403_FORBIDDEN)
        
        services = self.get_queryset().filter(practitioner_relationships__practitioner=request.user.practitioner_profile)
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)

    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        """Return a list of all active services."""
        return super().list(request, *args, **kwargs)
    
    @cache_view_method(timeout=600)  # Cache for 10 minutes
    def retrieve(self, request, *args, **kwargs):
        """Return the given service."""
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='limit', description='Number of services to return', required=False, type=int)
        ],
        description='Returns a list of featured services'
    )
    @action(detail=False)
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def featured(self, request):
        """Return a list of featured services."""
        limit = request.query_params.get('limit', None)
        featured = self.get_queryset().filter(is_featured=True)
        
        if limit:
            try:
                featured = featured[:int(limit)]
            except ValueError:
                pass
        
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='practitioner_id', description='ID of the practitioner', required=True, type=str)
        ],
        description='Returns services for a specific practitioner'
    )
    @action(detail=False, methods=['get'])
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def by_practitioner(self, request):
        """Return services for a specific practitioner."""
        practitioner_id = request.query_params.get('practitioner_id', None)
        if not practitioner_id:
            return Response({'error': 'practitioner_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Use the M2M relationship through ServicePractitioner instead of the deprecated practitioner field
        services = self.get_queryset().filter(practitioner_relationships__practitioner_id=practitioner_id)
        serializer = self.get_serializer(services, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='category_id', description='ID of the category', required=True, type=str),
            OpenApiParameter(name='include_subcategories', description='Include services from subcategories', required=False, type=bool)
        ],
        description='Returns services for a specific category'
    )
    @action(detail=False, methods=['get'])
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def by_category(self, request):
        """Return services for a specific category."""
        category_id = request.query_params.get('category_id', None)
        include_subcategories = request.query_params.get('include_subcategories', 'false').lower() == 'true'
        
        if not category_id:
            return Response({'error': 'category_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            category = ServiceCategory.objects.get(pk=category_id)
            if include_subcategories:
                # Get all subcategories
                categories = [category] + list(category.get_descendants())
                category_ids = [c.id for c in categories]
                services = self.get_queryset().filter(category_id__in=category_ids)
            else:
                services = self.get_queryset().filter(category_id=category_id)
                
            serializer = self.get_serializer(services, many=True)
            return Response(serializer.data)
        except ServiceCategory.DoesNotExist:
            return Response({'error': 'Category not found'}, status=status.HTTP_404_NOT_FOUND)
    
    @extend_schema(
        description='Return child services for a course or package',
        responses={200: inline_serializer(
            name='ServiceRelationshipList',
            fields={
                'id': serializers.IntegerField(),
                'child_service': serializers.IntegerField(),
                'child_service_details': inline_serializer(
                    name='ServiceBasicDetails',
                    fields={
                        'id': serializers.IntegerField(),
                        'name': serializers.CharField(),
                        'price': serializers.DecimalField(max_digits=10, decimal_places=2),
                        'duration': serializers.IntegerField(),
                        'location_type': serializers.CharField(),
                        'is_active': serializers.BooleanField(),
                        'image_url': serializers.URLField(allow_null=True)
                    }
                ),
                'order': serializers.IntegerField(),
                'quantity': serializers.IntegerField(),
                'discount_percentage': serializers.DecimalField(max_digits=5, decimal_places=2),
                'is_required': serializers.BooleanField(),
                'description_override': serializers.CharField(allow_null=True),
                'discounted_price': serializers.DecimalField(max_digits=10, decimal_places=2)
            },
            many=True
        )}
    )
    @action(detail=True, methods=['get'], pagination_class=None)
    def child_services(self, request, pk=None):
        """Return child services for a course or package."""
        service = self.get_object()
        relationships = ServiceRelationship.objects.filter(parent_service=service).order_by('order')
        serializer = ServiceRelationshipSerializer(relationships, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Add a child service to a course or package',
        request=ServiceRelationshipSerializer,
        responses={201: ServiceRelationshipSerializer}
    )
    @action(detail=True, methods=['post'])
    def add_child_service(self, request, pk=None):
        """Add a child service to a course or package."""
        service = self.get_object()
        
        # Check if service is a course or package
        if not (service.is_course or service.is_package):
            return Response(
                {"detail": "Only courses and packages can have child services"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Validate child service ID
        child_id = request.data.get('child_service')
        try:
            child_service = Service.objects.get(pk=child_id)
        except Service.DoesNotExist:
            return Response(
                {"detail": "Child service not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if child service is not the same as parent
        if child_service.id == service.id:
            return Response(
                {"detail": "A service cannot be a child of itself"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get parameters
        order = request.data.get('order')
        quantity = request.data.get('quantity', 1)
        discount_percentage = request.data.get('discount_percentage', 0)
        is_required = request.data.get('is_required', True)
        description_override = request.data.get('description_override')
        
        # Add child service
        relationship = service.add_child_service(
            child_service=child_service,
            order=order,
            quantity=quantity,
            discount_percentage=discount_percentage,
            is_required=is_required,
            description_override=description_override
        )
        
        serializer = ServiceRelationshipSerializer(relationship)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        description='Update a child service relationship',
        request=ServiceRelationshipSerializer,
        responses={200: ServiceRelationshipSerializer}
    )
    @action(detail=True, methods=['put'], url_path='child-services/(?P<relationship_id>[^/.]+)')
    def update_child_service(self, request, pk=None, relationship_id=None):
        """Update a child service relationship."""
        service = self.get_object()
        
        # Find the relationship
        try:
            relationship = ServiceRelationship.objects.get(
                pk=relationship_id,
                parent_service=service
            )
        except ServiceRelationship.DoesNotExist:
            return Response(
                {"detail": "Relationship not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Update the relationship
        serializer = ServiceRelationshipSerializer(relationship, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @extend_schema(
        description='Remove a child service from a course or package',
        responses={204: None}
    )
    @action(detail=True, methods=['delete'], url_path='child-services/(?P<relationship_id>[^/.]+)')
    def remove_child_service(self, request, pk=None, relationship_id=None):
        """Remove a child service from a course or package."""
        service = self.get_object()
        
        try:
            relationship = ServiceRelationship.objects.get(id=relationship_id, parent_service=service)
        except ServiceRelationship.DoesNotExist:
            return Response({'error': 'Relationship not found'}, status=status.HTTP_404_NOT_FOUND)
        
        # Check if the user has permission to modify this service
        if service.practitioner_relationships.all()[0] != request.user.practitioner:
            return Response({'error': 'You do not have permission to modify this service'}, 
                           status=status.HTTP_403_FORBIDDEN)
        
        relationship.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='practitioner_id', description='ID of the practitioner', required=True, type=str)
        ],
        description='Returns services grouped by category for a specific practitioner'
    )
    @action(detail=False, methods=['get'])
    def services_by_category(self, request):
        """Return services grouped by category for a specific practitioner."""
        practitioner_id = request.query_params.get('practitioner_id', None)
        if not practitioner_id:
            return Response({'error': 'practitioner_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get all categories with services for this practitioner
        services = self.get_queryset().filter(practitioner_relationships__practitioner_id=practitioner_id)
        categories = ServiceCategory.objects.filter(
            id__in=services.values_list('category_id', flat=True).distinct()
        )
        
        result = []
        for category in categories:
            category_services = services.filter(category=category)
            result.append({
                'category': ServiceCategorySerializer(category).data,
                'services': self.get_serializer(category_services, many=True).data
            })
        
        return Response(result)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='start_date', description='Start date for availability (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='end_date', description='End date for availability (YYYY-MM-DD)', required=False, type=str),
            OpenApiParameter(name='days_ahead', description='Number of days ahead to check availability', required=False, type=int),
        ],
        description='Returns available time slots for booking this service',
        responses={
            200: inline_serializer(
                name='AvailableTimesList',
                fields={
                    'results': serializers.ListField(
                        child=serializers.DictField()
                    )
                }
            ),
            400: OpenApiTypes.OBJECT,
            500: OpenApiTypes.OBJECT,
        },
        examples=[
            OpenApiExample(
                'Individual Service Time Slots',
                value=[
                    {
                        "start_datetime": "2025-04-13T13:00:00Z",
                        "end_datetime": "2025-04-13T13:57:00Z",
                        "date": "2025-04-13",
                        "day": 6,
                        "day_name": "Sunday",
                        "start_time": "13:00:00",
                        "end_time": "13:57:00",
                        "is_available": True,
                        "service_id": "9",
                        "schedule_id": "e308d5b5-d342-4c1c-bcdd-f60d410161fb",
                        "schedule_name": "Morning Hours"
                    },
                    {
                        "start_datetime": "2025-04-13T13:15:00Z",
                        "end_datetime": "2025-04-13T14:12:00Z",
                        "date": "2025-04-13",
                        "day": 6,
                        "day_name": "Sunday",
                        "start_time": "13:15:00",
                        "end_time": "14:12:00",
                        "is_available": True,
                        "service_id": "9",
                        "schedule_id": "e308d5b5-d342-4c1c-bcdd-f60d410161fb",
                        "schedule_name": "Morning Hours"
                    }
                ],
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Workshop/Course Sessions',
                value=[
                    {
                        "date": "2025-04-13",
                        "start_time": "2025-04-13T15:00:00Z",
                        "end_time": "2025-04-13T16:30:00Z",
                        "available_spots": 8,
                        "session_id": "123"
                    },
                    {
                        "date": "2025-04-20",
                        "start_time": "2025-04-20T15:00:00Z",
                        "end_time": "2025-04-20T16:30:00Z",
                        "available_spots": 10,
                        "session_id": "124"
                    }
                ],
                response_only=True,
                status_codes=['200']
            ),
            OpenApiExample(
                'Error Response',
                value={"error": "Invalid start_date format. Use YYYY-MM-DD."},
                response_only=True,
                status_codes=['400']
            )
        ]
    )
    @action(detail=True, methods=['get'])
    def available_times(self, request, pk=None):
        """
        Return available time slots for booking this service.
        
        For individual sessions and packages, this returns available times based on the practitioner's schedule.
        For workshops and courses with fixed sessions, this returns the scheduled session times.
        """
        service = self.get_object()
        
        # Parse query parameters
        start_date_str = request.query_params.get('start_date', None)
        end_date_str = request.query_params.get('end_date', None)
        days_ahead_str = request.query_params.get('days_ahead', '30')
        
        # Convert date strings to date objects
        start_date = None
        end_date = None
        days_ahead = 30
        
        if start_date_str:
            try:
                start_date = datetime.strptime(start_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid start_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if end_date_str:
            try:
                end_date = datetime.strptime(end_date_str, '%Y-%m-%d').date()
            except ValueError:
                return Response(
                    {"error": "Invalid end_date format. Use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        if days_ahead_str:
            try:
                days_ahead = int(days_ahead_str)
            except ValueError:
                return Response(
                    {"error": "Invalid days_ahead. Must be an integer."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # For workshops and courses with fixed sessions, return the scheduled sessions
        if service.service_type and service.service_type.code in ['workshop', 'course']:
            # Get upcoming sessions for this service
            sessions = service.sessions.filter(
                start_time__gte=timezone.now(),
                status='scheduled'
            ).order_by('start_time')
            
            # Apply date filters if provided
            if start_date:
                sessions = sessions.filter(start_time__date__gte=start_date)
            if end_date:
                sessions = sessions.filter(start_time__date__lte=end_date)
            
            # Format sessions as available times
            available_times = []
            for session in sessions:
                # Check if session has available spots
                available_spots = None
                if session.max_participants:
                    available_spots = max(0, session.max_participants - session.current_participants)
                    # Skip if no spots available
                    if available_spots == 0:
                        continue
                
                available_times.append({
                    'date': session.start_time.date().isoformat(),
                    'start_time': session.start_time.isoformat(),
                    'end_time': session.end_time.isoformat(),
                    'available_spots': available_spots,
                    'session_id': str(session.id)
                })
            
            return Response(available_times)
        
        # For individual sessions and packages, calculate availability based on practitioner's schedule
        try:
            available_times = get_practitioner_availability(
                service_id=str(service.id),
                start_date=start_date,
                end_date=end_date,
                days_ahead=days_ahead
            )
            return Response(available_times)
        except ValueError as e:
            return Response(
                {"error": str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {"error": f"Error calculating availability: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    def destroy(self, request, *args, **kwargs):
        """
        Custom destroy method to handle service deletion safely.
        Instead of actually deleting the service, we mark it as inactive
        if it has existing bookings or other dependencies.
        """
        service = self.get_object()
        
        # Check for existing bookings
        has_bookings = service.booking_set.exists()
        
        # Check for child services (if this is a parent service)
        is_parent = service.child_relationships.exists()
        
        # Check for parent services (if this is a child service)
        is_child = service.parent_relationships.exists()
        
        # Check for upcoming sessions
        has_upcoming_sessions = service.sessions.filter(
            start_time__gt=timezone.now(),
            status='scheduled'
        ).exists()
        
        # Check for waitlist entries
        has_waitlist = hasattr(service, 'waitlist_entries') and service.waitlist_entries.exists()
        
        # If service has dependencies, mark as inactive instead of deleting
        if has_bookings or is_parent or is_child or has_upcoming_sessions or has_waitlist:
            service.is_active = False
            service.save()
            
            # Return information about why it wasn't deleted
            dependencies = []
            if has_bookings:
                dependencies.append("existing bookings")
            if is_parent:
                dependencies.append("child services")
            if is_child:
                dependencies.append("parent services")
            if has_upcoming_sessions:
                dependencies.append("upcoming sessions")
            if has_waitlist:
                dependencies.append("waitlist entries")
                
            return Response({
                "detail": "Service has been deactivated instead of deleted due to existing dependencies.",
                "dependencies": dependencies,
                "deactivated": True
            }, status=status.HTTP_200_OK)
        
        # If no dependencies, proceed with deletion
        return super().destroy(request, *args, **kwargs)


class ServiceRelationshipViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing service relationships.
    
    list:
    Return a list of all service relationships.
    
    retrieve:
    Return the given service relationship.
    
    create:
    Create a new service relationship (requires practitioner privileges).
    
    update:
    Update a service relationship (requires practitioner privileges).
    
    partial_update:
    Partially update a service relationship (requires practitioner privileges).
    
    destroy:
    Delete a service relationship (requires practitioner privileges).
    """
    queryset = ServiceRelationship.objects.all()
    serializer_class = ServiceRelationshipSerializer
    permission_classes = [IsPractitionerOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['parent_service', 'child_service']
    
    def get_queryset(self):
        """Filter relationships based on query parameters."""
        queryset = ServiceRelationship.objects.all()
        
        # Filter by parent service
        parent_service = self.request.query_params.get('parent_service')
        if parent_service:
            queryset = queryset.filter(parent_service_id=parent_service)
            
        # Filter by child service
        child_service = self.request.query_params.get('child_service')
        if child_service:
            queryset = queryset.filter(child_service_id=child_service)
            
        return queryset.order_by('order')


class ServiceSessionViewSet(viewsets.ModelViewSet):
    """
    API endpoint for managing service sessions (workshops/courses).
    
    list:
    Return a list of all scheduled sessions.
    
    retrieve:
    Return the given session.
    
    create:
    Create a new session (requires practitioner privileges).
    
    update:
    Update a session (requires practitioner privileges, can only update own sessions).
    
    partial_update:
    Partially update a session (requires practitioner privileges, can only update own sessions).
    
    destroy:
    Delete a session (requires practitioner privileges, can only delete own sessions).
    
    by_service:
    Return sessions for a specific service.
    """
    queryset = ServiceSession.objects.all()  # Default queryset for router registration
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['service', 'status', 'start_time']
    ordering_fields = ['start_time', 'sequence_number', 'created_at']
    ordering = ['start_time', 'sequence_number']
    permission_classes = [IsPractitionerOrReadOnly]
    serializer_class = ServiceSessionSerializer
    
    def get_queryset(self):
        """
        Filter sessions based on query parameters and user role.
        """
        # If user is a practitioner and performing create/update/delete, show all their sessions
        if self.request.user.is_authenticated and self.request.user.is_practitioner and self.action in ['update', 'partial_update', 'destroy']:
            return ServiceSession.objects.filter(service__practitioner_relationships__practitioner=self.request.user.practitioner)
        
        # For list/retrieve, only show scheduled sessions unless explicitly requested
        queryset = ServiceSession.objects.all()
        
        if self.action in ['list', 'retrieve']:
            status = self.request.query_params.get('status', 'scheduled')
            if status == 'all' and self.request.user.is_authenticated and self.request.user.is_practitioner:
                # Only practitioners can see all session statuses for their services
                service_id = self.request.query_params.get('service_id')
                if service_id:
                    service = Service.objects.filter(id=service_id, practitioner_relationships__practitioner=self.request.user.practitioner).first()
                    if service:
                        queryset = queryset.filter(service=service)
                    else:
                        queryset = queryset.filter(status='scheduled')
                else:
                    queryset = queryset.filter(service__practitioner_relationships__practitioner=self.request.user.practitioner)
            else:
                queryset = queryset.filter(status='scheduled')
        
        return queryset
    
    def perform_create(self, serializer):
        """
        Validate that the practitioner owns the service before creating a session.
        """
        service_id = self.request.data.get('service')
        if service_id:
            service = Service.objects.filter(id=service_id, practitioner_relationships__practitioner=self.request.user.practitioner).first()
            if service:
                serializer.save(service=service)
            else:
                raise permissions.exceptions.PermissionDenied("You can only create sessions for your own services.")
        else:
            raise serializers.ValidationError({"service": ["This field is required."]})

    @extend_schema(
        parameters=[
            OpenApiParameter(name='service_id', description='ID of the service', required=True, type=int)
        ],
        description='Returns sessions for a specific service'
    )
    @action(detail=False, methods=['get'])
    def by_service(self, request):
        """Return sessions for a specific service."""
        service_id = request.query_params.get('service_id', None)
        if not service_id:
            return Response({'error': 'service_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        sessions = self.get_queryset().filter(service_id=service_id)
        serializer = self.get_serializer(sessions, many=True)
        return Response(serializer.data)
