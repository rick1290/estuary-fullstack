"""
Services API views for DRF
"""
from rest_framework import viewsets, permissions, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from django.db.models import Q, Count, Avg, F, Prefetch, Max
from django.utils import timezone
from django.db import transaction
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, extend_schema_view

from services.models import (
    ServiceCategory, Service, ServiceType, ServiceSession,
    ServiceResource, PractitionerServiceCategory, Waitlist,
    ServicePractitioner, ServiceRelationship
)
from media.models import Media, MediaEntityType
from reviews.models import Review
from .serializers import (
    ServiceCategorySerializer, ServiceListSerializer, ServiceDetailSerializer,
    ServiceCreateUpdateSerializer, ServiceTypeSerializer, ServiceSessionSerializer,
    ServiceResourceSerializer, PractitionerServiceCategorySerializer,
    PackageSerializer, BundleSerializer, WaitlistSerializer, ServiceSearchSerializer,
    MediaAttachmentSerializer
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
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
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
    join_waitlist=extend_schema(tags=['Services'])
)
class ServiceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for services.
    Includes filtering, search, and special endpoints.
    """
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsServiceOwner]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = ServiceFilter
    search_fields = ['name', 'description', 'tags']
    ordering_fields = ['created_at', 'price_cents', 'name']
    ordering = ['-created_at']
    
    def get_queryset(self):
        """Get services with optimized queries"""
        queryset = Service.objects.select_related(
            'service_type', 'category', 'practitioner_category',
            'primary_practitioner', 'primary_practitioner__user', 'address'
        ).prefetch_related(
            'additional_practitioners',
            'languages',
            Prefetch('reviews', queryset=Review.objects.filter(is_published=True))
        )
        
        # Filter based on user role
        if self.action in ['list', 'retrieve']:
            # Public users see only active and public services
            if not self.request.user.is_authenticated:
                queryset = queryset.filter(is_active=True, is_public=True, status='published')
            # Authenticated users can see their own services regardless of status
            elif hasattr(self.request.user, 'practitioner_profile'):
                queryset = queryset.filter(
                    Q(is_active=True, is_public=True, status='published') |
                    Q(primary_practitioner=self.request.user.practitioner_profile)
                )
            else:
                queryset = queryset.filter(is_active=True, is_public=True, status='published')
        
        return queryset
    
    def get_serializer_class(self):
        """Use different serializers for different actions"""
        if self.action == 'list':
            return ServiceListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return ServiceCreateUpdateSerializer
        return ServiceDetailSerializer
    
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured services"""
        featured = self.get_queryset().filter(
            is_featured=True,
            is_active=True,
            is_public=True,
            status='published'
        )[:12]  # Limit to 12 featured services
        serializer = ServiceListSerializer(featured, many=True, context={'request': request})
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def popular(self, request):
        """Get popular services based on bookings and ratings"""
        popular = self.get_queryset().filter(
            is_active=True,
            is_public=True,
            status='published'
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
            address=service.address,
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
    """
    serializer_class = ServiceSessionSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        """Get sessions based on service"""
        service_id = self.request.query_params.get('service_id')
        if not service_id:
            return ServiceSession.objects.none()
        
        return ServiceSession.objects.filter(
            service_id=service_id
        ).select_related('service', 'room', 'address').order_by('start_time')
    
    def get_permissions(self):
        """Only service owners can modify sessions"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsServiceOwner()]
        return super().get_permissions()


@extend_schema_view(
    list=extend_schema(tags=['Services']),
    create=extend_schema(tags=['Services']),
    retrieve=extend_schema(tags=['Services']),
    update=extend_schema(tags=['Services']),
    partial_update=extend_schema(tags=['Services']),
    destroy=extend_schema(tags=['Services'])
)
class ServiceResourceViewSet(viewsets.ModelViewSet):
    """
    ViewSet for service resources.
    """
    serializer_class = ServiceResourceSerializer
    permission_classes = [permissions.IsAuthenticated]
    
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