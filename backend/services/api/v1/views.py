"""
Services API views for DRF
"""
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from django.db.models import Q, Count, Avg, F, Prefetch, Max
from django.utils import timezone
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from services.models import (
    ServiceCategory, Service, ServiceType, ServiceSession,
    ServiceResource, PractitionerServiceCategory, Waitlist,
    ServicePractitioner, ServiceRelationship, ServiceBenefit,
    SessionAgendaItem
)
from media.models import Media, MediaEntityType
from reviews.models import Review
from .serializers import (
    ServiceCategorySerializer, ServiceListSerializer, ServiceDetailSerializer,
    ServiceCreateUpdateSerializer, ServiceTypeSerializer, ServiceSessionSerializer,
    ServiceSessionListSerializer, ServiceSessionDetailSerializer,
    ServiceResourceSerializer, PractitionerServiceCategorySerializer,
    PackageSerializer, BundleSerializer, WaitlistSerializer, ServiceSearchSerializer,
    MediaAttachmentSerializer, ServiceBenefitSerializer, SessionAgendaItemSerializer
)
from .permissions import (
    IsOwnerOrReadOnly, IsPractitionerOrReadOnly, IsServiceOwner,
    IsPractitionerCategoryOwner
)
from .filters import ServiceFilter


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services']),
    featured=extend_schema(tags=['Services'])
)
class ServiceCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for service categories.
    Read-only for regular users, full CRUD for admins.
    """
    queryset = ServiceCategory.objects.filter(is_active=True)
    serializer_class = ServiceCategorySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    lookup_field = 'slug'
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'description']
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order', 'name']
    
    def get_permissions(self):
        """Allow write operations only for staff users"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAdminUser()]
        return super().get_permissions()
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured categories"""
        featured = self.get_queryset().filter(is_featured=True)
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services']),
    reorder=extend_schema(tags=['Services'])
)
class PractitionerServiceCategoryViewSet(viewsets.ModelViewSet):
    """
    ViewSet for practitioner-specific service categories.
    Practitioners can manage their own categories.
    """
    serializer_class = PractitionerServiceCategorySerializer
    permission_classes = [permissions.IsAuthenticated, IsPractitionerCategoryOwner]
    filter_backends = [filters.OrderingFilter]
    ordering_fields = ['order', 'name', 'created_at']
    ordering = ['order', 'name']
    
    def get_queryset(self):
        """Filter categories based on user"""
        if not hasattr(self.request.user, 'practitioner_profile'):
            return PractitionerServiceCategory.objects.none()
        
        return PractitionerServiceCategory.objects.filter(
            practitioner=self.request.user.practitioner_profile,
            is_active=True
        )
    
    @action(detail=False, methods=['post'])
    def reorder(self, request):
        """Reorder categories"""
        category_ids = request.data.get('category_ids', [])
        if not category_ids:
            return Response(
                {"error": "category_ids is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        practitioner = request.user.practitioner_profile
        categories = PractitionerServiceCategory.objects.filter(
            id__in=category_ids,
            practitioner=practitioner
        )
        
        # Update order based on position in the list
        for index, cat_id in enumerate(category_ids):
            categories.filter(id=cat_id).update(order=index)
        
        return Response({"message": "Categories reordered successfully"})


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(
        tags=['Services'],
        request={
            'multipart/form-data': ServiceCreateUpdateSerializer,
            'application/json': ServiceCreateUpdateSerializer,
        },
        description="Create a new service. Supports both JSON and multipart/form-data for file uploads."
    ),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(
        tags=['Services'],
        request={
            'multipart/form-data': ServiceCreateUpdateSerializer,
            'application/json': ServiceCreateUpdateSerializer,
        },
        description="Update a service. Supports both JSON and multipart/form-data for file uploads."
    ),
    partial_update=extend_schema(
        tags=['Services'],
        request={
            'multipart/form-data': ServiceCreateUpdateSerializer,
            'application/json': ServiceCreateUpdateSerializer,
        },
        description="Update a service. Supports both JSON and multipart/form-data for file uploads."
    ),
    destroy=extend_schema(tags=['Services']),
    featured=extend_schema(tags=['Services']),
    popular=extend_schema(tags=['Services']),
    upcoming=extend_schema(tags=['Services']),
    search=extend_schema(tags=['Services']),
    by_practitioner=extend_schema(tags=['Services']),
    duplicate=extend_schema(tags=['Services']),
    add_media=extend_schema(tags=['Services']),
    remove_media=extend_schema(tags=['Services']),
    reorder_media=extend_schema(tags=['Services']),
    add_resources=extend_schema(tags=['Services']),
    add_practitioners=extend_schema(tags=['Services']),
    join_waitlist=extend_schema(tags=['Services']),
    by_slug=extend_schema(tags=['Services'])
)
class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for services - Internal CRUD operations using primary keys.
    Used by practitioner dashboard and admin interfaces.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsServiceOwner]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Accept both JSON and multipart
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ServiceFilter
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['created_at', 'price_cents', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get services with optimized queries"""
        queryset = Service.objects.select_related(
            'service_type', 'category', 'practitioner_category',
            'primary_practitioner', 'primary_practitioner__user', 'practitioner_location',
            'schedule'
        ).prefetch_related(
            'modalities',
            'additional_practitioners',
            'languages',
            'benefits',
            'agenda_items',
            'sessions__agenda_items',
            'sessions__benefits',
            'practitioner_relationships__practitioner__user',
            'child_relationships__child_service',
            'resources',
            'waitlist_entries',
            Prefetch('reviews', queryset=Review.objects.filter(is_published=True))
        )
        
        # Filter based on user role
        if self.action in ['list', 'retrieve']:
            # Public users see only active and public services
            if not self.request.user.is_authenticated:
                queryset = queryset.filter(is_active=True, is_public=True, status='active')
            # Authenticated users can see their own services regardless of status
            elif hasattr(self.request.user, 'practitioner_profile'):
                queryset = queryset.filter(
                    Q(is_active=True, is_public=True, status='active') |
                    Q(primary_practitioner=self.request.user.practitioner_profile)
                )
            else:
                queryset = queryset.filter(is_active=True, is_public=True, status='active')
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ServiceListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ServiceCreateUpdateSerializer
        return ServiceDetailSerializer
    
    # No override needed - let DRF handle JSON/FormData parsing naturally
    
    # Let DRF handle the request parsing - it already handles JSON and FormData correctly
    
    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[-\w]+)')
    def by_slug(self, request, slug=None):
        """Get service by slug"""
        try:
            service = self.get_queryset().get(slug=slug)
            serializer = ServiceDetailSerializer(service, context={'request': request})
            return Response(serializer.data)
        except Service.DoesNotExist:
            return Response(
                {"detail": "Service not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured services"""
        featured = self.get_queryset().filter(
            is_featured=True,
            is_active=True,
            is_public=True,
            status='active'
        )[:12]  # Limit to 12 featured services
        serializer = ServiceListSerializer(featured, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular services based on bookings and ratings"""
        popular = self.get_queryset().filter(
            is_active=True,
            is_public=True,
            status='active'
        ).annotate(
            booking_count=Count('bookings'),
            avg_rating_annotated=Avg('reviews__rating')
        ).order_by('-booking_count', '-avg_rating')[:20]
        
        serializer = ServiceListSerializer(popular, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Advanced search endpoint"""
        search_serializer = ServiceSearchSerializer(data=request.query_params)
        search_serializer.is_valid(raise_exception=True)
        params = search_serializer.validated_data
        
        queryset = self.get_queryset()
        
        # Apply search filters
        if params.get('q'):
            queryset = queryset.filter(
                Q(name__icontains=params['q']) |
                Q(description__icontains=params['q']) |
                Q(tags__icontains=params['q'])
            )
        
        if params.get('category'):
            queryset = queryset.filter(category__slug=params['category'])
        
        if params.get('service_type'):
            queryset = queryset.filter(service_type__code=params['service_type'])
        
        if params.get('practitioner'):
            queryset = queryset.filter(primary_practitioner_id=params['practitioner'])
        
        if params.get('location_type'):
            queryset = queryset.filter(location_type=params['location_type'])
        
        if params.get('min_price') is not None:
            queryset = queryset.filter(price_cents__gte=int(params['min_price'] * 100))
        
        if params.get('max_price') is not None:
            queryset = queryset.filter(price_cents__lte=int(params['max_price'] * 100))
        
        if params.get('min_duration') is not None:
            queryset = queryset.filter(duration_minutes__gte=params['min_duration'])
        
        if params.get('max_duration') is not None:
            queryset = queryset.filter(duration_minutes__lte=params['max_duration'])
        
        if params.get('experience_level'):
            queryset = queryset.filter(experience_level=params['experience_level'])
        
        if params.get('is_featured') is not None:
            queryset = queryset.filter(is_featured=params['is_featured'])
        
        # Apply sorting
        sort_by = params.get('sort_by', '-created_at')
        if sort_by == 'rating':
            queryset = queryset.annotate(avg_rating_sort=Avg('reviews__rating')).order_by('-avg_rating_sort')
        elif sort_by == '-rating':
            queryset = queryset.annotate(avg_rating_sort=Avg('reviews__rating')).order_by('avg_rating_sort')
        elif sort_by == 'popularity':
            queryset = queryset.annotate(booking_count=Count('bookings')).order_by('-booking_count')
        elif sort_by == 'price':
            queryset = queryset.order_by('price_cents')
        elif sort_by == '-price':
            queryset = queryset.order_by('-price_cents')
        else:
            queryset = queryset.order_by(sort_by)
        
        # Paginate results
        page_size = params.get('page_size', 20)
        page = params.get('page', 1)
        start = (page - 1) * page_size
        end = start + page_size
        
        total_count = queryset.count()
        services = queryset[start:end]
        
        serializer = ServiceListSerializer(services, many=True, context={'request': request})
        
        return Response({
            'count': total_count,
            'page': page,
            'page_size': page_size,
            'total_pages': (total_count + page_size - 1) // page_size,
            'results': serializer.data
        })
    
    @action(detail=True, methods=['post'])
    def duplicate(self, request, pk=None):
        """Duplicate a service"""
        service = self.get_object()
        
        # Check permission
        if service.primary_practitioner != request.user.practitioner_profile:
            raise PermissionDenied("You can only duplicate your own services")
        
        # Create duplicate
        duplicate = Service.objects.create(
            name=f"{service.name} (Copy)",
            description=service.description,
            short_description=service.short_description,
            price_cents=service.price_cents,
            duration_minutes=service.duration_minutes,
            service_type=service.service_type,
            category=service.category,
            practitioner_category=service.practitioner_category,
            primary_practitioner=service.primary_practitioner,
            max_participants=service.max_participants,
            min_participants=service.min_participants,
            experience_level=service.experience_level,
            age_min=service.age_min,
            age_max=service.age_max,
            location_type=service.location_type,
            practitioner_location=service.practitioner_location,
            what_youll_learn=service.what_youll_learn,
            prerequisites=service.prerequisites,
            includes=service.includes,
            image_url=service.image_url,
            video_url=service.video_url,
            tags=service.tags,
            is_active=False,  # Start as inactive
            is_featured=False,
            is_public=False,  # Start as private
            status='draft',
            validity_days=service.validity_days,
            is_transferable=service.is_transferable,
            is_shareable=service.is_shareable,
            sessions_included=service.sessions_included,
            bonus_sessions=service.bonus_sessions,
            max_per_customer=service.max_per_customer,
            highlight_text=service.highlight_text,
            terms_conditions=service.terms_conditions
        )
        
        # Copy relationships
        for rel in service.practitioner_relationships.all():
            ServicePractitioner.objects.create(
                service=duplicate,
                practitioner=rel.practitioner,
                is_primary=rel.is_primary,
                role=rel.role,
                revenue_share_percentage=rel.revenue_share_percentage
            )
        
        # Copy child services for packages/bundles
        for rel in service.child_relationships.all():
            ServiceRelationship.objects.create(
                parent_service=duplicate,
                child_service=rel.child_service,
                quantity=rel.quantity,
                order=rel.order,
                discount_percentage=rel.discount_percentage,
                is_required=rel.is_required,
                description_override=rel.description_override
            )
        
        serializer = ServiceDetailSerializer(duplicate, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['get'])
    def media(self, request, pk=None):
        """Get media attachments for a service"""
        service = self.get_object()
        media = Media.objects.filter(
            entity_type=MediaEntityType.SERVICE,
            entity_id=service.id
        ).order_by('display_order', '-created_at')
        
        serializer = MediaAttachmentSerializer(media, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def resources(self, request, pk=None):
        """Get resources for a service"""
        service = self.get_object()
        
        # Filter resources based on user access
        if request.user.is_authenticated:
            # Check if user has booked this service
            has_booking = service.bookings.filter(user=request.user).exists()
            if has_booking:
                resources = service.resources.all()
            else:
                resources = service.resources.filter(
                    access_level__in=['public', 'registered']
                )
        else:
            resources = service.resources.filter(access_level='public')
        
        resources = resources.order_by('order', '-created_at')
        serializer = ServiceResourceSerializer(resources, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get', 'post'])
    def waitlist(self, request, pk=None):
        """Manage waitlist for a service"""
        service = self.get_object()
        
        if request.method == 'GET':
            # Get waitlist entries
            waitlist = service.waitlist_entries.filter(
                status='waiting'
            ).order_by('position')
            serializer = WaitlistSerializer(waitlist, many=True)
            return Response(serializer.data)
        
        elif request.method == 'POST':
            # Join waitlist
            if not request.user.is_authenticated:
                raise PermissionDenied("Must be logged in to join waitlist")
            
            # Check if already on waitlist
            existing = Waitlist.objects.filter(
                service=service,
                user=request.user,
                status='waiting'
            ).first()
            
            if existing:
                return Response(
                    {"message": "You are already on the waitlist", "position": existing.position},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Get next position
            last_position = service.waitlist_entries.filter(
                status='waiting'
            ).aggregate(max_pos=Max('position'))['max_pos'] or 0
            
            # Create waitlist entry
            waitlist_entry = Waitlist.objects.create(
                service=service,
                user=request.user,
                position=last_position + 1
            )
            
            serializer = WaitlistSerializer(waitlist_entry)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        tags=['Services'],
        summary="Upload cover image for service",
        description="Upload a cover image for a service. This will replace any existing cover image.",
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'image': {'type': 'string', 'format': 'binary', 'description': 'Image file to upload'},
                },
                'required': ['image']
            }
        },
        responses={
            200: {
                'description': 'Cover image uploaded successfully',
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'message': {'type': 'string'},
                                'image_url': {'type': 'string'},
                            }
                        }
                    }
                }
            },
            400: {'description': 'Bad request - invalid file or no file provided'},
            403: {'description': 'Permission denied - not the service owner'}
        }
    )
    @action(
        detail=True, 
        methods=['post'], 
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-cover-image',
        url_name='upload-cover-image'
    )
    def upload_cover_image(self, request, pk=None):
        """
        Upload cover image for a service.
        Replaces any existing cover image.
        """
        try:
            # Get the service - this will also handle 404 if not found
            service = self.get_object()
            
            # Check permissions (IsServiceOwner should handle this, but double-check)
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not hasattr(request.user, 'practitioner_profile') or not request.user.practitioner_profile:
                return Response(
                    {'error': 'Must be a practitioner to upload cover images'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            if service.primary_practitioner != request.user.practitioner_profile:
                return Response(
                    {'error': 'You can only upload cover images for your own services'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Check if image file is provided
            if 'image' not in request.FILES:
                return Response(
                    {'error': 'No image file provided'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            image_file = request.FILES['image']
            
            # Validate file type
            if not image_file.content_type or not image_file.content_type.startswith('image/'):
                return Response(
                    {'error': 'File must be an image'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Update service with new image
            service.image = image_file
            service.save(update_fields=['image'])
            
            # Return success response with image URL
            image_url = service.image.url if service.image else None
            return Response({
                'message': 'Cover image uploaded successfully',
                'image_url': image_url
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            import traceback
            return Response({
                'error': f'Upload failed: {str(e)}',
                'traceback': traceback.format_exc()
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

    @extend_schema(
        tags=['Services'],
        request=ServiceBenefitSerializer,
        responses={200: ServiceBenefitSerializer(many=True)}
    )
    @action(detail=True, methods=['post'], url_path='benefits')
    def create_benefit(self, request, pk=None):
        """Create a new benefit for this service"""
        service = self.get_object()
        serializer = ServiceBenefitSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(service=service)

        # Return all benefits for this service
        benefits = service.benefits.all()
        return Response(ServiceBenefitSerializer(benefits, many=True).data)

    @extend_schema(
        tags=['Services'],
        request=ServiceBenefitSerializer,
        responses={200: ServiceBenefitSerializer(many=True)}
    )
    @action(detail=True, methods=['put'], url_path='benefits/(?P<benefit_id>[^/.]+)')
    def update_benefit(self, request, pk=None, benefit_id=None):
        """Update a specific benefit"""
        service = self.get_object()
        try:
            benefit = service.benefits.get(id=benefit_id)
        except ServiceBenefit.DoesNotExist:
            return Response(
                {'error': 'Benefit not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = ServiceBenefitSerializer(benefit, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return all benefits for this service
        benefits = service.benefits.all()
        return Response(ServiceBenefitSerializer(benefits, many=True).data)

    @extend_schema(
        tags=['Services'],
        responses={200: ServiceBenefitSerializer(many=True)}
    )
    @action(detail=True, methods=['delete'], url_path='benefits/(?P<benefit_id>[^/.]+)')
    def delete_benefit(self, request, pk=None, benefit_id=None):
        """Delete a specific benefit"""
        service = self.get_object()
        try:
            benefit = service.benefits.get(id=benefit_id)
            benefit.delete()
        except ServiceBenefit.DoesNotExist:
            return Response(
                {'error': 'Benefit not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Return remaining benefits
        benefits = service.benefits.all()
        return Response(ServiceBenefitSerializer(benefits, many=True).data)

    @extend_schema(
        tags=['Services'],
        request=SessionAgendaItemSerializer,
        responses={200: SessionAgendaItemSerializer(many=True)}
    )
    @action(detail=True, methods=['post'], url_path='agenda')
    def create_agenda_item(self, request, pk=None):
        """Create a new agenda item for this service"""
        service = self.get_object()
        serializer = SessionAgendaItemSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(service=service)

        # Return all agenda items for this service
        agenda_items = service.agenda_items.all()
        return Response(SessionAgendaItemSerializer(agenda_items, many=True).data)

    @extend_schema(
        tags=['Services'],
        request=SessionAgendaItemSerializer,
        responses={200: SessionAgendaItemSerializer(many=True)}
    )
    @action(detail=True, methods=['put'], url_path='agenda/(?P<agenda_id>[^/.]+)')
    def update_agenda_item(self, request, pk=None, agenda_id=None):
        """Update a specific agenda item"""
        service = self.get_object()
        try:
            agenda_item = service.agenda_items.get(id=agenda_id)
        except SessionAgendaItem.DoesNotExist:
            return Response(
                {'error': 'Agenda item not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        serializer = SessionAgendaItemSerializer(agenda_item, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()

        # Return all agenda items for this service
        agenda_items = service.agenda_items.all()
        return Response(SessionAgendaItemSerializer(agenda_items, many=True).data)

    @extend_schema(
        tags=['Services'],
        responses={200: SessionAgendaItemSerializer(many=True)}
    )
    @action(detail=True, methods=['delete'], url_path='agenda/(?P<agenda_id>[^/.]+)')
    def delete_agenda_item(self, request, pk=None, agenda_id=None):
        """Delete a specific agenda item"""
        service = self.get_object()
        try:
            agenda_item = service.agenda_items.get(id=agenda_id)
            agenda_item.delete()
        except SessionAgendaItem.DoesNotExist:
            return Response(
                {'error': 'Agenda item not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Return remaining agenda items
        agenda_items = service.agenda_items.all()
        return Response(SessionAgendaItemSerializer(agenda_items, many=True).data)


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services'])
)
class PackageViewSet(viewsets.ModelViewSet):
    """
    ViewSet specifically for service packages.
    """
    serializer_class = PackageSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsServiceOwner]
    
    def get_queryset(self):
        """Get only package-type services"""
        return Service.objects.filter(
            service_type__code='package'
        ).select_related(
            'service_type', 'category', 'primary_practitioner'
        ).prefetch_related(
            'modalities',
            'child_relationships__child_service',
            'additional_practitioners'
        )


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services'])
)
class BundleViewSet(viewsets.ModelViewSet):
    """
    ViewSet specifically for service bundles.
    """
    serializer_class = BundleSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsServiceOwner]
    
    def get_queryset(self):
        """Get only bundle-type services"""
        return Service.objects.filter(
            service_type__code='bundle'
        ).select_related(
            'service_type', 'category', 'primary_practitioner'
        ).prefetch_related(
            'modalities',
            'child_relationships__child_service',
            'additional_practitioners'
        )


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services'])
)
class ServiceSessionViewSet(viewsets.ModelViewSet):
    """
    ViewSet for service sessions (workshops/courses).

    List: GET /api/v1/services/sessions/
        - Returns all sessions for the authenticated practitioner
        - Optional filters: service_id, status, start_date, end_date, session_type

    Detail: GET /api/v1/services/sessions/{id}/
        - Returns full session details including bookings, recordings, etc.
    """
    permission_classes = [permissions.IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    ordering_fields = ['start_time', 'created_at', 'status']
    ordering = ['start_time']

    def get_serializer_class(self):
        """Use different serializers for list vs detail"""
        if self.action == 'list':
            return ServiceSessionListSerializer
        elif self.action == 'retrieve':
            return ServiceSessionDetailSerializer
        return ServiceSessionSerializer

    def get_queryset(self):
        """
        Get sessions with filtering support.

        For practitioners: Returns all sessions for their services
        For users: Returns sessions they have bookings for
        """
        user = self.request.user
        queryset = ServiceSession.objects.select_related(
            'service',
            'service__service_type',
            'service__primary_practitioner',
            'service__primary_practitioner__user',
            'livekit_room',
            'practitioner_location',
            'rescheduled_by'
        ).prefetch_related(
            'bookings',
            'bookings__user',
            'livekit_room__recordings',
            'agenda_items',
            'benefits',
            'waitlist_entries'
        )

        # Check if user is a practitioner
        is_practitioner = hasattr(user, 'practitioner_profile')

        if is_practitioner:
            # Practitioners see all their sessions
            practitioner = user.practitioner_profile
            queryset = queryset.filter(service__primary_practitioner=practitioner)
        else:
            # Regular users see sessions they have bookings for
            queryset = queryset.filter(bookings__user=user).distinct()

        # Apply filters
        service_id = self.request.query_params.get('service_id')
        if service_id:
            queryset = queryset.filter(service_id=service_id)

        status = self.request.query_params.get('status')
        if status:
            queryset = queryset.filter(status=status)

        session_type = self.request.query_params.get('session_type')
        if session_type:
            queryset = queryset.filter(session_type=session_type)

        visibility = self.request.query_params.get('visibility')
        if visibility:
            queryset = queryset.filter(visibility=visibility)

        # Date range filters
        start_date = self.request.query_params.get('start_date')
        if start_date:
            queryset = queryset.filter(start_time__date__gte=start_date)

        end_date = self.request.query_params.get('end_date')
        if end_date:
            queryset = queryset.filter(start_time__date__lte=end_date)

        # Filter for upcoming only
        upcoming = self.request.query_params.get('upcoming')
        if upcoming and upcoming.lower() == 'true':
            queryset = queryset.filter(start_time__gte=timezone.now())

        # Filter for past only
        past = self.request.query_params.get('past')
        if past and past.lower() == 'true':
            queryset = queryset.filter(start_time__lt=timezone.now())

        return queryset

    def get_permissions(self):
        """Only service owners can modify sessions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy', 'reschedule', 'mark_completed', 'mark_in_progress', 'create_room']:
            return [permissions.IsAuthenticated(), IsServiceOwner()]
        return super().get_permissions()

    def perform_create(self, serializer):
        """Create session and ensure room is created for virtual services"""
        session = serializer.save()
        self._ensure_room_for_session(session)

    def perform_destroy(self, instance):
        """Prevent deletion of sessions with bookings"""
        # Check if there are any bookings for this session
        booking_count = instance.bookings.count()
        if booking_count > 0:
            raise ValidationError({
                'detail': f'Cannot delete session with {booking_count} existing booking(s). Please cancel the bookings first.'
            })
        instance.delete()

    def _ensure_room_for_session(self, session):
        """
        Ensure a room exists for virtual/hybrid service sessions.
        Called after session creation or update.
        """
        import logging
        logger = logging.getLogger(__name__)

        # Skip if session already has a room
        if hasattr(session, 'livekit_room') and session.livekit_room:
            logger.info(f"Session {session.id} already has room {session.livekit_room.id}")
            return

        # Check if service requires a video room
        service = session.service
        if not service:
            return

        location_type = getattr(service, 'location_type', None)
        if location_type not in ['virtual', 'online', 'hybrid']:
            logger.info(f"Session {session.id} service location_type={location_type}, skipping room creation")
            return

        # Create room via RoomService
        try:
            from rooms.services import RoomService
            room_service = RoomService()
            room = room_service.create_room_for_session(session)
            logger.info(f"Created room {room.livekit_room_name} for session {session.id}")
        except Exception as e:
            logger.error(f"Failed to create room for session {session.id}: {e}")

    def perform_update(self, serializer):
        """Prevent editing date/time of sessions with bookings via regular update"""
        instance = self.get_object()

        # Check if start_time or end_time is being changed
        if 'start_time' in serializer.validated_data or 'end_time' in serializer.validated_data:
            booking_count = instance.bookings.count()
            if booking_count > 0:
                raise ValidationError({
                    'detail': f'Cannot modify session date/time with {booking_count} existing booking(s). Use the reschedule endpoint instead.'
                })

        serializer.save()

    @action(detail=True, methods=['post'])
    def reschedule(self, request, pk=None):
        """
        Reschedule a service session to new times.

        This endpoint is for practitioners to reschedule workshops, courses, etc.
        All users with bookings for this session will be notified.

        Request body:
        {
            "start_time": "2024-01-15T14:00:00Z",
            "end_time": "2024-01-15T15:00:00Z"
        }
        """
        from rest_framework import status
        from django.utils import timezone
        from datetime import datetime

        session = self.get_object()

        # Validate request data
        start_time_str = request.data.get('start_time')
        end_time_str = request.data.get('end_time')

        if not start_time_str or not end_time_str:
            return Response(
                {'detail': 'start_time and end_time are required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            # Parse datetime strings
            from django.utils.dateparse import parse_datetime
            new_start_time = parse_datetime(start_time_str)
            new_end_time = parse_datetime(end_time_str)

            if not new_start_time or not new_end_time:
                raise ValueError("Invalid datetime format")
        except (ValueError, TypeError) as e:
            return Response(
                {'detail': f'Invalid datetime format: {e}'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Validate times
        if new_start_time >= new_end_time:
            return Response(
                {'detail': 'End time must be after start time'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if new_start_time < timezone.now():
            return Response(
                {'detail': 'Cannot reschedule to a time in the past'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Store old times for notification
        old_start_time = session.start_time
        old_end_time = session.end_time

        # Perform reschedule
        session.reschedule(
            new_start_time=new_start_time,
            new_end_time=new_end_time,
            rescheduled_by_user=request.user
        )

        # Send notifications to all affected users
        try:
            from notifications.services import NotificationService
            notification_service = NotificationService()

            affected_users = session.get_affected_users()
            for user in affected_users:
                # Get the user's booking for this session
                booking = session.bookings.filter(
                    user=user,
                    status__in=['confirmed', 'pending_payment']
                ).first()
                if booking:
                    notification_service.send_booking_rescheduled(
                        booking,
                        rescheduled_by=request.user
                    )
        except Exception as e:
            import logging
            logging.getLogger(__name__).error(f"Failed to send reschedule notifications: {e}")

        # Return updated session
        serializer = self.get_serializer(session)
        return Response({
            'session': serializer.data,
            'affected_bookings_count': session.bookings.filter(
                status__in=['confirmed', 'pending_payment']
            ).count(),
            'reschedule_count': session.reschedule_count,
            'old_start_time': old_start_time.isoformat() if old_start_time else None,
            'new_start_time': new_start_time.isoformat(),
        })

    @action(detail=True, methods=['post'])
    def create_room(self, request, pk=None):
        """
        Create a room for this session if one doesn't exist.
        Useful for backfilling sessions that were created before room auto-creation.
        """
        session = self.get_object()

        # Check if room already exists
        if hasattr(session, 'livekit_room') and session.livekit_room:
            return Response({
                'message': 'Room already exists',
                'room_id': session.livekit_room.id,
                'room_uuid': str(session.livekit_room.public_uuid),
                'room_name': session.livekit_room.livekit_room_name
            })

        # Create room
        self._ensure_room_for_session(session)

        # Refresh from DB
        session.refresh_from_db()

        if hasattr(session, 'livekit_room') and session.livekit_room:
            return Response({
                'message': 'Room created successfully',
                'room_id': session.livekit_room.id,
                'room_uuid': str(session.livekit_room.public_uuid),
                'room_name': session.livekit_room.livekit_room_name
            }, status=status.HTTP_201_CREATED)
        else:
            return Response({
                'error': 'Failed to create room. Check if service is virtual/online/hybrid.'
            }, status=status.HTTP_400_BAD_REQUEST)

    @extend_schema(
        request=None,
        responses={200: ServiceSessionSerializer},
        tags=['Service Sessions']
    )
    @action(detail=True, methods=['post'])
    def mark_completed(self, request, pk=None):
        """
        Mark a service session as completed.

        This allows practitioners to manually mark a session as completed
        (e.g., for in-person sessions or if the LiveKit webhook didn't fire).

        POST /api/v1/service-sessions/{id}/mark_completed/
        """
        from django.utils import timezone

        session = self.get_object()

        # Validate session can be marked completed
        if session.status == 'completed':
            return Response(
                {'detail': 'Session is already marked as completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.status == 'canceled':
            return Response(
                {'detail': 'Cannot mark a canceled session as completed'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.status == 'draft':
            return Response(
                {'detail': 'Cannot mark a draft session as completed. Schedule it first.'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as completed
        now = timezone.now()
        session.status = 'completed'
        session.actual_end_time = now
        if not session.actual_start_time:
            # If never started, set start time to scheduled start or now
            session.actual_start_time = session.start_time or now
        session.save(update_fields=['status', 'actual_start_time', 'actual_end_time', 'updated_at'])

        # Also end the room if it exists and is still active
        if hasattr(session, 'livekit_room') and session.livekit_room:
            room = session.livekit_room
            if room.status in ['pending', 'active', 'in_use']:
                room.status = 'ended'
                room.actual_end = now
                if room.actual_start:
                    room.total_duration_seconds = int((now - room.actual_start).total_seconds())
                room.save(update_fields=['status', 'actual_end', 'total_duration_seconds', 'updated_at'])

        serializer = self.get_serializer(session)
        return Response({
            'message': 'Session marked as completed',
            'session': serializer.data
        })

    @extend_schema(
        request=None,
        responses={200: ServiceSessionSerializer},
        tags=['Service Sessions']
    )
    @action(detail=True, methods=['post'])
    def mark_in_progress(self, request, pk=None):
        """
        Mark a service session as in progress.

        This allows practitioners to manually mark a session as started
        (e.g., for in-person sessions).

        POST /api/v1/service-sessions/{id}/mark_in_progress/
        """
        from django.utils import timezone

        session = self.get_object()

        # Validate session can be marked in progress
        if session.status == 'in_progress':
            return Response(
                {'detail': 'Session is already in progress'},
                status=status.HTTP_400_BAD_REQUEST
            )

        if session.status in ['completed', 'canceled']:
            return Response(
                {'detail': f'Cannot start a {session.status} session'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Mark as in progress
        now = timezone.now()
        session.status = 'in_progress'
        session.actual_start_time = now
        session.save(update_fields=['status', 'actual_start_time', 'updated_at'])

        serializer = self.get_serializer(session)
        return Response({
            'message': 'Session marked as in progress',
            'session': serializer.data
        })


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(
        tags=['Services'],
        summary="Create service resource",
        description="Create a new service resource. Supports file uploads via multipart/form-data.",
        request={
            'multipart/form-data': ServiceResourceSerializer,
            'application/json': ServiceResourceSerializer,
        }
    ),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(
        tags=['Services'],
        request={
            'multipart/form-data': ServiceResourceSerializer,
            'application/json': ServiceResourceSerializer,
        }
    ),
    partial_update=extend_schema(
        tags=['Services'],
        request={
            'multipart/form-data': ServiceResourceSerializer,
            'application/json': ServiceResourceSerializer,
        }
    ),
    destroy=extend_schema(tags=['Services'])
)
class ServiceResourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for service resources.
    """
    serializer_class = ServiceResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    parser_classes = [JSONParser, MultiPartParser, FormParser]  # Add parsers for file uploads
    
    def get_queryset(self):
        """Get resources based on filters"""
        queryset = ServiceResource.objects.all()
        
        # Filter by service
        service_id = self.request.query_params.get('service_id')
        if service_id:
            queryset = queryset.filter(service_id=service_id)
        
        # Filter by session
        session_id = self.request.query_params.get('session_id')
        if session_id:
            queryset = queryset.filter(service_session_id=session_id)
        
        # Filter by booking
        booking_id = self.request.query_params.get('booking_id')
        if booking_id:
            queryset = queryset.filter(booking_id=booking_id)
        
        return queryset.order_by('order', '-created_at')
    
    def perform_create(self, serializer):
        """Set uploaded_by to current practitioner"""
        if hasattr(self.request.user, 'practitioner_profile'):
            serializer.save(uploaded_by=self.request.user.practitioner_profile)
        else:
            raise PermissionDenied("Only practitioners can upload resources")


@extend_schema_view(
    list=extend_schema(tags=['Public Services']),
    retrieve=extend_schema(tags=['Public Services'])
)
class PublicServiceViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public-facing ViewSet for services using public_uuid for lookup.
    Used by marketing pages and public service discovery.
    Read-only access with public-friendly URLs.
    """
    serializer_class = ServiceDetailSerializer
    permission_classes = [permissions.AllowAny]  # Public access
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ServiceFilter
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['created_at', 'price_cents', 'name']
    ordering = ['-is_featured', '-created_at']
    lookup_field = 'public_uuid'
    lookup_url_kwarg = 'public_uuid'
    
    def get_queryset(self):
        """Get active, public services with optimized queries"""
        return Service.objects.filter(
            is_active=True,
            is_public=True
        ).select_related(
            'service_type', 'category', 'practitioner_category',
            'primary_practitioner', 'primary_practitioner__user', 'practitioner_location',
            'schedule'
        ).prefetch_related(
            'additional_practitioners',
            'languages',
            'benefits',
            'agenda_items',
            'sessions__agenda_items',
            'sessions__benefits',
            'practitioner_relationships__practitioner__user',
            'child_relationships__child_service',
            'resources',
            'waitlist_entries'
        )
    
    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[-\w]+)')
    def by_slug(self, request, slug=None):
        """Get service by slug - public access"""
        try:
            service = self.get_queryset().get(slug=slug)
            serializer = ServiceDetailSerializer(service, context={'request': request})
            return Response(serializer.data)
        except Service.DoesNotExist:
            return Response(
                {"detail": "Service not found"},
                status=status.HTTP_404_NOT_FOUND
            )