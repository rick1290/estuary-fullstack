from rest_framework import viewsets, filters, permissions, status, generics, serializers
from django.utils import timezone
from django.db.models import Count, Sum, Max, Min, Q, Prefetch
from apps.users.models import User
from apps.bookings.models import Booking
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter, OpenApiResponse, inline_serializer, OpenApiExample
from apps.services.api.v1.serializers import EnhancedServiceDetailSerializer
from django.db.models import Q, Count, Prefetch
from django.core.cache import cache

from apps.practitioners.models import (
    Practitioner, PractitionerOnboardingProgress,
    Specialize, Style, Topic, Education, 
    Certification, VerificationDocument
)
from .serializers import (
    PractitionerListSerializer, 
    PractitionerDetailSerializer, 
    PractitionerOnboardingProgressSerializer,
    PractitionerProfileSerializer,
    PractitionerApplicationSerializer,
    PractitionerBasicWritable,
    PractitionerProfileUpdateSerializer,
    PractitionerMediaSerializer,
    PractitionerEducationSerializer,
    PractitionerCertificationSerializer,
    VerificationDocumentSerializer,
    SpecializeSerializer,
    StyleSerializer,
    TopicSerializer,
    EducationSerializer,
    CertificationSerializer,
    ModalitySerializer,
    ClientListResponseSerializer,
    ClientListSerializer,
    ClientBookingSnapshotSerializer
)
from apps.utils.cache import cache_view_method
from apps.utils.permissions import IsPractitioner

class PractitionerViewSet(viewsets.ModelViewSet):
    """
    API endpoint for viewing practitioners.
    
    list:
    Return a list of all practitioners.
    
    retrieve:
    Return the given practitioner.
    
    featured:
    Return a list of featured practitioners.
    
    profile:
    Return the comprehensive profile for a practitioner with all related data.
    
    search:
    Search for practitioners based on multiple criteria.
    
    reviews:
    Return reviews for a specific practitioner.
    
    clear_cache:
    Clear the cache for a specific practitioner profile.
    """
    queryset = Practitioner.objects.filter(practitioner_status='active')
    serializer_class = PractitionerDetailSerializer  # Default serializer class
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['specializations', 'styles', 'topics', 'modalities', 'is_verified', 'featured']
    search_fields = ['user__first_name', 'user__last_name', 'title', 'bio', 'description', 'display_name']
    ordering_fields = ['average_rating', 'total_reviews', 'years_of_experience', 'min_price', 'max_price']
    ordering = ['-featured', '-average_rating']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    
    @extend_schema(
        summary="Get practitioner list",
        description="Return a list of all practitioners.",
        responses={200: PractitionerListSerializer(many=True)}
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get practitioner details",
        description="Return details for a specific practitioner.",
        responses={200: PractitionerDetailSerializer}
    )
    def retrieve(self, request, *args, **kwargs):
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        summary="Get practitioner profile",
        description="Return the comprehensive profile for a practitioner with all related data.",
        responses={
            200: inline_serializer(
                name='PractitionerProfileResponse',
                fields={
                    'id': serializers.UUIDField(),
                    'user': inline_serializer(
                        name='UserBasicInfo',
                        fields={
                            'id': serializers.UUIDField(),
                            'first_name': serializers.CharField(),
                            'last_name': serializers.CharField(),
                            'email': serializers.EmailField(),
                            'profile_picture': serializers.URLField(allow_null=True)
                        }
                    ),
                    'services': inline_serializer(
                        name='ServiceWithSessions',
                        fields={
                            'id': serializers.IntegerField(),
                            'name': serializers.CharField(),
                            'price': serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True),
                            'duration': serializers.IntegerField(),
                            'location_type': serializers.CharField(),
                            'is_active': serializers.BooleanField(),
                            'image_url': serializers.URLField(allow_null=True),
                            'description': serializers.CharField(),
                            'average_rating': serializers.DecimalField(max_digits=3, decimal_places=2, allow_null=True),
                            'total_reviews': serializers.IntegerField(),
                            'service_type': inline_serializer(
                                name='ServiceTypeInfo',
                                fields={
                                    'id': serializers.IntegerField(),
                                    'name': serializers.CharField(),
                                    'description': serializers.CharField(),
                                    'code': serializers.CharField(allow_null=True)
                                }
                            ),
                            'upcoming_sessions': inline_serializer(
                                name='SessionSnapshot',
                                fields={
                                    'id': serializers.IntegerField(),
                                    'start_time': serializers.DateTimeField(),
                                    'end_time': serializers.DateTimeField(),
                                    'location': serializers.CharField(allow_null=True),
                                    'max_participants': serializers.IntegerField(),
                                    'current_participants': serializers.IntegerField()
                                },
                                many=True
                            )
                        },
                        many=True
                    )
                }
            )
        }
    )
    @action(detail=True, methods=['get'])
    @cache_view_method(timeout=600)  # Cache for 10 minutes
    def profile(self, request, pk=None):
        """
        Return the comprehensive profile for a practitioner with all related data.
        This includes services, categories, and all other related information.
        """
        practitioner = self.get_object()
        serializer = PractitionerProfileSerializer(practitioner, context={'request': request})
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get featured practitioners",
        description="Return a list of featured practitioners.",
        responses={200: PractitionerListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def featured(self, request):
        """Get featured practitioners."""
        featured_practitioners = Practitioner.objects.filter(featured=True)
        serializer = PractitionerListSerializer(featured_practitioners, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Search for practitioners",
        description="Search for practitioners based on multiple criteria.",
        parameters=[
            OpenApiParameter(
                name="q", 
                description="Search query", 
                required=False, 
                type=str
            ),
            OpenApiParameter(
                name="specializations", 
                description="Specialization IDs", 
                required=False, 
                type=str
            ),
            OpenApiParameter(
                name="styles", 
                description="Style IDs", 
                required=False, 
                type=str
            ),
            OpenApiParameter(
                name="topics", 
                description="Topic IDs", 
                required=False, 
                type=str
            ),
            OpenApiParameter(
                name="modalities", 
                description="Modality IDs", 
                required=False, 
                type=str
            ),
            OpenApiParameter(
                name="is_verified", 
                description="Verified status", 
                required=False, 
                type=bool
            ),
            OpenApiParameter(
                name="featured", 
                description="Featured status", 
                required=False, 
                type=bool
            )
        ],
        responses={200: PractitionerListSerializer(many=True)}
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search for practitioners."""
        query = request.query_params.get('q')
        specializations = request.query_params.get('specializations')
        styles = request.query_params.get('styles')
        topics = request.query_params.get('topics')
        modalities = request.query_params.get('modalities')
        is_verified = request.query_params.get('is_verified')
        featured = request.query_params.get('featured')
        
        practitioners = Practitioner.objects.filter(practitioner_status='active')
        
        if query:
            practitioners = practitioners.filter(
                Q(user__first_name__icontains=query) | 
                Q(user__last_name__icontains=query) | 
                Q(title__icontains=query) | 
                Q(bio__icontains=query) | 
                Q(description__icontains=query) | 
                Q(display_name__icontains=query)
            )
        
        if specializations:
            practitioners = practitioners.filter(specializations__in=specializations.split(','))
        
        if styles:
            practitioners = practitioners.filter(styles__in=styles.split(','))
        
        if topics:
            practitioners = practitioners.filter(topics__in=topics.split(','))
        
        if modalities:
            practitioners = practitioners.filter(modalities__in=modalities.split(','))
        
        if is_verified:
            practitioners = practitioners.filter(is_verified=is_verified)
        
        if featured:
            practitioners = practitioners.filter(featured=featured)
        
        serializer = PractitionerListSerializer(practitioners, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Get reviews for a practitioner",
        description="Return reviews for a specific practitioner.",
        responses={200: OpenApiResponse(description="Reviews for the practitioner")}
    )
    @action(detail=True, methods=['get'])
    def reviews(self, request, pk=None):
        """Get reviews for a practitioner."""
        practitioner = self.get_object()
        reviews = practitioner.reviews.all()
        return Response(reviews)
    
    @extend_schema(
        summary="Get practitioner's clients",
        description="Return a list of clients who have booked services with the practitioner.",
        parameters=[
            OpenApiParameter(name='status', description='Filter by booking status', type=str),
            OpenApiParameter(name='service', description='Filter by service', type=int),
            OpenApiParameter(name='from_date', description='Filter from date (YYYY-MM-DD)', type=str),
            OpenApiParameter(name='to_date', description='Filter to date (YYYY-MM-DD)', type=str),
            OpenApiParameter(name='active_only', description='Show only active clients (had booking in last 3 months)', type=bool),
        ],
        responses={
            200: ClientListResponseSerializer,
            404: OpenApiResponse(description="Practitioner not found")
        }
    )
    @action(detail=True, methods=['get'])
    def clients(self, request, pk=None):
        """Return a list of clients who have booked services with the practitioner."""
        practitioner = self.get_object()
        
        # Start with all bookings for this practitioner
        bookings = Booking.objects.filter(practitioner=practitioner)
        
        # Apply filters
        status = request.query_params.get('status')
        service = request.query_params.get('service')
        from_date = request.query_params.get('from_date')
        to_date = request.query_params.get('to_date')
        active_only = request.query_params.get('active_only') == 'true'
        
        if status:
            bookings = bookings.filter(status=status)
        if service:
            bookings = bookings.filter(service_id=service)
        if from_date:
            bookings = bookings.filter(start_time__date__gte=from_date)
        if to_date:
            bookings = bookings.filter(start_time__date__lte=to_date)
        
        # Get unique clients who have these bookings
        clients = User.objects.filter(
            bookings__in=bookings
        ).distinct()
        
        # Filter for active clients if requested
        if active_only:
            three_months_ago = timezone.now() - timezone.timedelta(days=90)
            clients = clients.filter(
                bookings__start_time__gte=three_months_ago
            ).distinct()
        
        # Prefetch related bookings for better performance
        clients = clients.prefetch_related(
            Prefetch(
                'bookings',
                queryset=bookings.select_related('service'),
                to_attr='_filtered_bookings'
            )
        )
        
        serializer = ClientListResponseSerializer(clients)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Clear cache for a practitioner profile",
        description="Clear the cache for a specific practitioner profile.",
        responses={204: OpenApiResponse(description="Cache cleared successfully")}
    )
    @action(detail=True, methods=['post'])
    def clear_cache(self, request, pk=None):
        """Clear cache for a practitioner profile."""
        practitioner = self.get_object()
        cache.delete(f"practitioner_profile_{practitioner.id}")
        return Response(status=204)

class PractitionerProfileViewSet(viewsets.GenericViewSet):
    """API endpoint for managing own practitioner profile."""
    permission_classes = [permissions.IsAuthenticated, IsPractitioner]
    parser_classes = (MultiPartParser, FormParser)
    queryset = Practitioner.objects.none()  # Required for OpenAPI schema generation
    
    @extend_schema(
        summary="Get own practitioner profile",
        description="Returns the complete profile for the authenticated practitioner with all related data.",
        responses={
            200: PractitionerProfileSerializer,
            404: OpenApiResponse(description="Practitioner profile not found"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-profile"]
    )
    @action(detail=False, methods=['get'])
    def me(self, request):
        """Get own profile."""
        practitioner = request.user.practitioner_profile
        serializer = PractitionerProfileSerializer(practitioner)
        return Response(serializer.data)
    
    @extend_schema(
        summary="Update practitioner profile",
        description="Update basic profile information for the authenticated practitioner.",
        request=PractitionerProfileUpdateSerializer,
        responses={
            200: PractitionerProfileUpdateSerializer,
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-profile"]
    )
    @action(detail=False, methods=['patch'])
    def update_profile(self, request):
        """Update own profile."""
        practitioner = request.user.practitioner_profile
        serializer = PractitionerProfileUpdateSerializer(practitioner, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    @extend_schema(
        summary="Upload profile media",
        description="Upload profile image or video for the authenticated practitioner.",
        request=PractitionerMediaSerializer,
        responses={
            200: PractitionerMediaSerializer,
            400: OpenApiResponse(description="Invalid file format or data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-profile"]
    )
    @action(detail=False, methods=['post'])
    def upload_media(self, request):
        """Upload profile image/video."""
        practitioner = request.user.practitioner_profile
        serializer = PractitionerMediaSerializer(practitioner, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
    
    @extend_schema(
        summary="Remove profile media",
        description="Remove profile image or video for the authenticated practitioner.",
        parameters=[
            OpenApiParameter(
                name="type", 
                description="Type of media to remove (image or video)", 
                required=True, 
                type=str, 
                enum=["image", "video"]
            )
        ],
        responses={
            204: OpenApiResponse(description="Media removed successfully"),
            400: OpenApiResponse(description="Invalid media type"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-profile"]
    )
    @action(detail=False, methods=['delete'])
    def remove_media(self, request):
        """Remove profile image or video."""
        practitioner = request.user.practitioner_profile
        media_type = request.query_params.get('type')
        if media_type == 'image':
            practitioner.profile_image_url = None
        elif media_type == 'video':
            practitioner.profile_video_url = None
        else:
            return Response({'error': 'Invalid media type'}, status=400)
        practitioner.save()
        return Response(status=204)

    @extend_schema(
        summary="Get practitioner's services",
        description="Returns all services associated with the current practitioner.",
        responses={
            200: inline_serializer(
                name='PractitionerServicesResponse',
                fields={
                    'services': EnhancedServiceDetailSerializer(many=True)
                }
            ),
            403: OpenApiResponse(description="User is not a practitioner")
        },
        examples=[
            OpenApiExample(
                'Example Response',
                value={
                    'services': [{
                        'id': 123,
                        'name': 'Meditation Session',
                        'description': 'A calming meditation session',
                        'duration': 60,
                        'price': '75.00',
                        'is_active': True,
                        'service_type': {
                            'id': 1,
                            'name': 'session',
                            'code': 'session'
                        },
                        'category': {
                            'id': 1,
                            'name': 'Meditation',
                            'slug': 'meditation'
                        },
                        'primary_practitioner': {
                            'user': {
                                'id': 1,
                                'email': 'practitioner@example.com',
                                'first_name': 'John',
                                'last_name': 'Doe'
                            },
                            'title': 'Meditation Teacher',
                            'display_name': 'John D.',
                            'is_verified': True,
                            'average_rating': 4.8
                        },
                        'benefits': [
                            {'id': 1, 'title': 'Stress Relief', 'description': 'Reduce daily stress'}
                        ],
                        'location': {
                            'type': 'online',
                            'name': 'Zoom'
                        },
                        'languages': ['en', 'es'],
                        'what_youll_learn': 'Basic meditation techniques',
                        'waitlist_count': 0,
                        'experience_level': 'beginner'
                    }]
                }
            )
        ],
        tags=["practitioner-profile"]
    )
    @action(detail=False, methods=['get'])
    def services(self, request):
        """Return services for the current practitioner."""
        from apps.services.models import Service

        services = Service.objects.filter(
            practitioner_relationships__practitioner=request.user.practitioner_profile
        ).select_related('category', 'service_type')
        
        serializer = EnhancedServiceDetailSerializer(services, many=True)
        return Response({'services': serializer.data})

class PractitionerProfessionalViewSet(viewsets.GenericViewSet):
    """API endpoint for managing professional information."""
    permission_classes = [permissions.IsAuthenticated, IsPractitioner]
    queryset = Practitioner.objects.none()  # Required for OpenAPI schema generation
    
    @extend_schema(
        summary="Manage practitioner specializations",
        description="Get, add, or remove specializations for the authenticated practitioner.",
        request=inline_serializer(
            name='SpecializationIdsRequest',
            fields={
                'specializations': serializers.ListField(child=serializers.IntegerField())
            }
        ),
        responses={
            200: SpecializeSerializer(many=True),
            201: OpenApiResponse(description="Specializations added successfully"),
            204: OpenApiResponse(description="Specializations removed successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-professional"]
    )
    @action(detail=False, methods=['get', 'post', 'delete'])
    def specializations(self, request):
        """Manage specializations."""
        practitioner = request.user.practitioner_profile
        if request.method == 'GET':
            serializer = SpecializeSerializer(practitioner.specializations.all(), many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            specialization_ids = request.data.get('specializations', [])
            practitioner.specializations.add(*specialization_ids)
            return Response(status=201)
        elif request.method == 'DELETE':
            specialization_ids = request.data.get('specializations', [])
            practitioner.specializations.remove(*specialization_ids)
            return Response(status=204)
    
    @extend_schema(
        summary="Manage practitioner styles",
        description="Get, add, or remove styles for the authenticated practitioner.",
        request=inline_serializer(
            name='StyleIdsRequest',
            fields={
                'styles': serializers.ListField(child=serializers.IntegerField())
            }
        ),
        responses={
            200: StyleSerializer(many=True),
            201: OpenApiResponse(description="Styles added successfully"),
            204: OpenApiResponse(description="Styles removed successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-professional"]
    )
    @action(detail=False, methods=['get', 'post', 'delete'])
    def styles(self, request):
        """Manage styles."""
        practitioner = request.user.practitioner_profile
        if request.method == 'GET':
            serializer = StyleSerializer(practitioner.styles.all(), many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            style_ids = request.data.get('styles', [])
            practitioner.styles.add(*style_ids)
            return Response(status=201)
        elif request.method == 'DELETE':
            style_ids = request.data.get('styles', [])
            practitioner.styles.remove(*style_ids)
            return Response(status=204)
    
    @extend_schema(
        summary="Manage practitioner topics",
        description="Get, add, or remove topics for the authenticated practitioner.",
        request=inline_serializer(
            name='TopicIdsRequest',
            fields={
                'topics': serializers.ListField(child=serializers.IntegerField())
            }
        ),
        responses={
            200: TopicSerializer(many=True),
            201: OpenApiResponse(description="Topics added successfully"),
            204: OpenApiResponse(description="Topics removed successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-professional"]
    )
    @action(detail=False, methods=['get', 'post', 'delete'])
    def topics(self, request):
        """Manage topics."""
        practitioner = request.user.practitioner_profile
        if request.method == 'GET':
            serializer = TopicSerializer(practitioner.topics.all(), many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            topic_ids = request.data.get('topics', [])
            practitioner.topics.add(*topic_ids)
            return Response(status=201)
        elif request.method == 'DELETE':
            topic_ids = request.data.get('topics', [])
            practitioner.topics.remove(*topic_ids)
            return Response(status=204)
    
    @extend_schema(
        summary="Manage practitioner modalities",
        description="Get, add, or remove modalities for the authenticated practitioner.",
        request=inline_serializer(
            name='ModalityIdsRequest',
            fields={
                'modalities': serializers.ListField(child=serializers.IntegerField())
            }
        ),
        responses={
            200: ModalitySerializer(many=True),
            201: OpenApiResponse(description="Modalities added successfully"),
            204: OpenApiResponse(description="Modalities removed successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-professional"]
    )
    @action(detail=False, methods=['get', 'post', 'delete'])
    def modalities(self, request):
        """Manage modalities."""
        practitioner = request.user.practitioner_profile
        if request.method == 'GET':
            serializer = ModalitySerializer(practitioner.modalities.all(), many=True)
            return Response(serializer.data)
        elif request.method == 'POST':
            modality_ids = request.data.get('modalities', [])
            practitioner.modalities.add(*modality_ids)
            return Response(status=201)
        elif request.method == 'DELETE':
            modality_ids = request.data.get('modalities', [])
            practitioner.modalities.remove(*modality_ids)
            return Response(status=204)

class PractitionerCredentialsViewSet(viewsets.GenericViewSet):
    """API endpoint for managing credentials."""
    permission_classes = [permissions.IsAuthenticated, IsPractitioner]
    parser_classes = (MultiPartParser, FormParser)
    queryset = Practitioner.objects.none()  # Required for OpenAPI schema generation
    
    @extend_schema(
        summary="Manage education history",
        description="Get, add, update, or remove education history for the authenticated practitioner.",
        request=inline_serializer(
            name='EducationRequest',
            fields={
                'id': serializers.UUIDField(required=False),  # Required for PATCH/DELETE
                'degree': serializers.CharField(),
                'educational_institute': serializers.CharField(),
                'order': serializers.IntegerField(required=False),
                'start_date': serializers.DateField(required=False),
                'end_date': serializers.DateField(required=False),
                'description': serializers.CharField(required=False)
            }
        ),
        responses={
            200: PractitionerEducationSerializer(many=True),
            201: PractitionerEducationSerializer,
            204: OpenApiResponse(description="Education entry deleted successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner"),
            404: OpenApiResponse(description="Education entry not found")
        },
        tags=["practitioner-credentials"]
    )
    @action(detail=False, methods=['get', 'post', 'patch', 'delete'])
    def education(self, request):
        """Manage education history."""
        if request.method == 'GET':
            education = Education.objects.all()
            serializer = PractitionerEducationSerializer(education, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            serializer = PractitionerEducationSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
            
        elif request.method == 'PATCH':
            try:
                education = Education.objects.get(id=request.data.get('id'))
                serializer = PractitionerEducationSerializer(education, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=400)
            except Education.DoesNotExist:
                return Response({"detail": "Education entry not found"}, status=404)
            
        elif request.method == 'DELETE':
            try:
                education = Education.objects.get(id=request.data.get('id'))
                education.delete()
                return Response(status=204)
            except Education.DoesNotExist:
                return Response({"detail": "Education entry not found"}, status=404)
    
    @extend_schema(
        summary="Manage certifications",
        description="Get, add, update, or remove certifications for the authenticated practitioner.",
        request=inline_serializer(
            name='CertificationRequest',
            fields={
                'id': serializers.UUIDField(required=False),  # Required for PATCH/DELETE
                'certificate': serializers.CharField(),
                'institution': serializers.CharField(),
                'order': serializers.IntegerField(required=False),
                'issue_date': serializers.DateField(required=False),
                'expiry_date': serializers.DateField(required=False),
                'document': serializers.FileField(required=False)
            }
        ),
        responses={
            200: PractitionerCertificationSerializer(many=True),
            201: PractitionerCertificationSerializer,
            204: OpenApiResponse(description="Certification deleted successfully"),
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner"),
            404: OpenApiResponse(description="Certification not found")
        },
        tags=["practitioner-credentials"]
    )
    @action(detail=False, methods=['get', 'post', 'patch', 'delete'])
    def certifications(self, request):
        """Manage certifications."""
        if request.method == 'GET':
            certifications = Certification.objects.all()
            serializer = PractitionerCertificationSerializer(certifications, many=True)
            return Response(serializer.data)
            
        elif request.method == 'POST':
            serializer = PractitionerCertificationSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response(serializer.data, status=201)
            return Response(serializer.errors, status=400)
            
        elif request.method == 'PATCH':
            try:
                certification = Certification.objects.get(id=request.data.get('id'))
                serializer = PractitionerCertificationSerializer(certification, data=request.data, partial=True)
                if serializer.is_valid():
                    serializer.save()
                    return Response(serializer.data)
                return Response(serializer.errors, status=400)
            except Certification.DoesNotExist:
                return Response({"detail": "Certification not found"}, status=404)
            
        elif request.method == 'DELETE':
            try:
                certification = Certification.objects.get(id=request.data.get('id'))
                certification.delete()
                return Response(status=204)
            except Certification.DoesNotExist:
                return Response({"detail": "Certification not found"}, status=404)

class PractitionerVerificationViewSet(viewsets.GenericViewSet):
    """API endpoint for practitioner verification."""
    permission_classes = [permissions.IsAuthenticated, IsPractitioner]
    parser_classes = (MultiPartParser, FormParser)
    queryset = Practitioner.objects.none()  # Required for OpenAPI schema generation
    
    @extend_schema(
        summary="Get verification status",
        description="Get the current verification status for the authenticated practitioner.",
        responses={
            200: inline_serializer(
                name='VerificationStatusResponse',
                fields={
                    'is_verified': serializers.BooleanField(),
                    'verification_status': serializers.CharField(),
                    'verification_notes': serializers.CharField(allow_null=True)
                }
            ),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-verification"]
    )
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get verification status."""
        practitioner = request.user.practitioner_profile
        return Response({
            'is_verified': practitioner.is_verified,
            'verification_status': getattr(practitioner, 'verification_status', 'not_submitted'),
            'verification_notes': getattr(practitioner, 'verification_notes', None)
        })
    
    @extend_schema(
        summary="Submit for verification",
        description="Submit the practitioner profile for verification.",
        responses={
            200: inline_serializer(
                name='VerificationSubmitResponse',
                fields={
                    'status': serializers.CharField()
                }
            ),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-verification"]
    )
    @action(detail=False, methods=['post'])
    def submit(self, request):
        """Submit for verification."""
        practitioner = request.user.practitioner_profile
        practitioner.verification_status = 'pending'
        practitioner.save()
        return Response({'status': 'verification request submitted'})
    
    @extend_schema(
        summary="Upload verification document",
        description="Upload a document for practitioner verification.",
        request=VerificationDocumentSerializer,
        responses={
            201: VerificationDocumentSerializer,
            400: OpenApiResponse(description="Invalid data"),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-verification"]
    )
    @action(detail=False, methods=['post'])
    def upload_document(self, request):
        """Upload verification document."""
        practitioner = request.user.practitioner_profile
        serializer = VerificationDocumentSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(practitioner=practitioner)
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)
        
    @extend_schema(
        summary="List verification documents",
        description="List all verification documents for the authenticated practitioner.",
        responses={
            200: VerificationDocumentSerializer(many=True),
            403: OpenApiResponse(description="Not authenticated as a practitioner")
        },
        tags=["practitioner-verification"]
    )
    @action(detail=False, methods=['get'])
    def documents(self, request):
        """List verification documents."""
        practitioner = request.user.practitioner_profile
        documents = VerificationDocument.objects.filter(practitioner=practitioner)
        serializer = VerificationDocumentSerializer(documents, many=True)
        return Response(serializer.data)
    
    def get_queryset(self):
        """
        Get the list of practitioners with appropriate prefetches based on the action.
        """
        queryset = Practitioner.objects.filter(practitioner_status='active')
        
        # For detailed views, prefetch related data to optimize performance
        if self.action in ['retrieve', 'profile']:
            queryset = queryset.prefetch_related(
                'specializations', 
                'styles', 
                'topics', 
                'modalities',
                'certifications',
                'educations',
                'questions',
                'services',
                'categories'
            )
        # For list views, prefetch only what's needed for the list
        elif self.action == 'list' or self.action == 'featured' or self.action == 'search':
            queryset = queryset.prefetch_related('specializations', 'modalities')
            
        return queryset
    
    def get_serializer_class(self):
        if self.action == 'list' or self.action == 'featured' or self.action == 'search':
            return PractitionerListSerializer
        elif self.action == 'profile':
            return PractitionerProfileSerializer
        elif self.action == 'reviews':
            from apps.reviews.api.v1.serializers import ReviewSerializer
            return ReviewSerializer
        return PractitionerDetailSerializer
    
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def list(self, request, *args, **kwargs):
        """
        Return a list of all practitioners.
        """
        return super().list(request, *args, **kwargs)
    
    @cache_view_method(timeout=600)  # Cache for 10 minutes
    def retrieve(self, request, *args, **kwargs):
        """
        Return the given practitioner.
        """
        return super().retrieve(request, *args, **kwargs)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='limit', description='Number of practitioners to return', required=False, type=int)
        ],
        description='Returns a list of featured practitioners'
    )
    @action(detail=False)
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def featured(self, request):
        """Return a list of featured practitioners."""
        limit = request.query_params.get('limit', None)
        featured = self.get_queryset().filter(featured=True)
        
        if limit:
            try:
                featured = featured[:int(limit)]
            except ValueError:
                pass
        
        serializer = self.get_serializer(featured, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns the comprehensive profile for a practitioner with all related data'
    )
    @action(detail=True, methods=['get'])
    @cache_view_method(timeout=600)  # Cache for 10 minutes
    def profile(self, request, pk=None):
        """
        Return the comprehensive profile for a practitioner with all related data.
        This includes services, categories, and all other related information.
        """
        practitioner = self.get_object()
        serializer = PractitionerProfileSerializer(practitioner, context={'request': request})
        return Response(serializer.data)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='specializations', description='Filter by specialization IDs (comma-separated)', required=False, type=str),
            OpenApiParameter(name='styles', description='Filter by style IDs (comma-separated)', required=False, type=str),
            OpenApiParameter(name='topics', description='Filter by topic IDs (comma-separated)', required=False, type=str),
            OpenApiParameter(name='modalities', description='Filter by modality IDs (comma-separated)', required=False, type=str),
            OpenApiParameter(name='min_rating', description='Minimum average rating', required=False, type=float),
            OpenApiParameter(name='max_price', description='Maximum price', required=False, type=float),
            OpenApiParameter(name='verified_only', description='Only show verified practitioners', required=False, type=bool),
            OpenApiParameter(name='search', description='Search term for name, title, bio, etc.', required=False, type=str),
            OpenApiParameter(name='limit', description='Number of practitioners to return', required=False, type=int),
            OpenApiParameter(name='offset', description='Offset for pagination', required=False, type=int),
        ],
        description='Search for practitioners based on multiple criteria'
    )
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Advanced search for practitioners with multiple filter options.
        """
        queryset = self.get_queryset()
        
        # Apply filters based on query parameters
        specializations = request.query_params.get('specializations', None)
        if specializations:
            spec_ids = [int(id) for id in specializations.split(',') if id.isdigit()]
            if spec_ids:
                queryset = queryset.filter(specializations__id__in=spec_ids)
        
        styles = request.query_params.get('styles', None)
        if styles:
            style_ids = [int(id) for id in styles.split(',') if id.isdigit()]
            if style_ids:
                queryset = queryset.filter(styles__id__in=style_ids)
        
        topics = request.query_params.get('topics', None)
        if topics:
            topic_ids = [int(id) for id in topics.split(',') if id.isdigit()]
            if topic_ids:
                queryset = queryset.filter(topics__id__in=topic_ids)
        
        modalities = request.query_params.get('modalities', None)
        if modalities:
            modality_ids = [int(id) for id in modalities.split(',') if id.isdigit()]
            if modality_ids:
                queryset = queryset.filter(modalities__id__in=modality_ids)
        
        min_rating = request.query_params.get('min_rating', None)
        if min_rating:
            try:
                queryset = queryset.filter(average_rating__gte=float(min_rating))
            except ValueError:
                pass
        
        max_price = request.query_params.get('max_price', None)
        if max_price:
            try:
                queryset = queryset.filter(min_price__lte=float(max_price))
            except ValueError:
                pass
        
        verified_only = request.query_params.get('verified_only', None)
        if verified_only and verified_only.lower() in ['true', '1', 'yes']:
            queryset = queryset.filter(is_verified=True)
        
        search_term = request.query_params.get('search', None)
        if search_term:
            queryset = queryset.filter(
                Q(user__first_name__icontains=search_term) |
                Q(user__last_name__icontains=search_term) |
                Q(display_name__icontains=search_term) |
                Q(title__icontains=search_term) |
                Q(bio__icontains=search_term) |
                Q(description__icontains=search_term)
            )
        
        # Remove duplicates that might have been introduced by the filters
        queryset = queryset.distinct()
        
        # Apply pagination
        limit = request.query_params.get('limit', None)
        offset = request.query_params.get('offset', None)
        
        if limit and offset:
            try:
                limit = int(limit)
                offset = int(offset)
                queryset = queryset[offset:offset + limit]
            except ValueError:
                pass
        elif limit:
            try:
                queryset = queryset[:int(limit)]
            except ValueError:
                pass
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='page', description='Page number for pagination', required=False, type=int),
            OpenApiParameter(name='page_size', description='Number of reviews per page', required=False, type=int),
            OpenApiParameter(name='min_rating', description='Filter by minimum rating', required=False, type=float),
            OpenApiParameter(name='max_rating', description='Filter by maximum rating', required=False, type=float),
            OpenApiParameter(name='is_verified', description='Filter by verified status', required=False, type=bool),
            OpenApiParameter(name='ordering', description='Order by field (created_at, -created_at, rating, -rating, helpful_votes, -helpful_votes)', required=False, type=str),
        ],
        description='Returns reviews for a specific practitioner'
    )
    @action(detail=True, methods=['get'])
    @cache_view_method(timeout=300)  # Cache for 5 minutes
    def reviews(self, request, pk=None):
        """
        Return reviews for a specific practitioner.
        """
        from apps.reviews.models import Review
        from apps.reviews.api.v1.serializers import ReviewSerializer
        
        practitioner = self.get_object()
        
        # Get reviews for this practitioner
        reviews_queryset = Review.objects.filter(
            practitioner=practitioner,
            is_published=True
        ).order_by('-created_at')
        
        # Apply filters
        min_rating = request.query_params.get('min_rating')
        if min_rating:
            try:
                reviews_queryset = reviews_queryset.filter(rating__gte=float(min_rating))
            except ValueError:
                pass
        
        max_rating = request.query_params.get('max_rating')
        if max_rating:
            try:
                reviews_queryset = reviews_queryset.filter(rating__lte=float(max_rating))
            except ValueError:
                pass
        
        is_verified = request.query_params.get('is_verified')
        if is_verified:
            reviews_queryset = reviews_queryset.filter(is_verified=is_verified.lower() == 'true')
        
        # Apply ordering
        ordering = request.query_params.get('ordering', '-created_at')
        valid_ordering_fields = ['created_at', '-created_at', 'rating', '-rating', 'helpful_votes', '-helpful_votes']
        if ordering in valid_ordering_fields:
            reviews_queryset = reviews_queryset.order_by(ordering)
        
        # Pagination
        from rest_framework.pagination import PageNumberPagination
        paginator = PageNumberPagination()
        paginator.page_size = request.query_params.get('page_size', 10)
        paginated_reviews = paginator.paginate_queryset(reviews_queryset, request)
        
        serializer = ReviewSerializer(paginated_reviews, many=True, context={'request': request})
        return paginator.get_paginated_response(serializer.data)
    
    @extend_schema(
        description='Clears the cache for a specific practitioner profile'
    )
    @action(detail=True, methods=['post'], permission_classes=[permissions.IsAdminUser])
    def clear_cache(self, request, pk=None):
        """
        Clear the cache for a specific practitioner profile.
        This is useful when you've made changes to the data structure and need to ensure
        the frontend gets the latest data.
        """
        practitioner = self.get_object()
        
        # Clear cache for profile endpoint
        profile_cache_key = f"practitioner_profile_{practitioner.id}"
        cache.delete(profile_cache_key)
        
        # Clear cache for other endpoints
        list_cache_key = "practitioner_list"
        featured_cache_key = "practitioner_featured"
        cache.delete(list_cache_key)
        cache.delete(featured_cache_key)
        
        return Response({"status": "cache cleared"})
    
    @extend_schema(
        description='Returns a list of specializations available for practitioners'
    )
    @action(detail=False, methods=['get'])
    def specializations(self, request):
        """Return a list of all specializations."""
        specializations = Specialize.objects.all()
        serializer = SpecializeSerializer(specializations, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns a list of styles available for practitioners'
    )
    @action(detail=False, methods=['get'])
    def styles(self, request):
        """Return a list of all styles."""
        styles = Style.objects.all()
        serializer = StyleSerializer(styles, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns a list of topics available for practitioners'
    )
    @action(detail=False, methods=['get'])
    def topics(self, request):
        """Return a list of all topics."""
        topics = Topic.objects.all()
        serializer = TopicSerializer(topics, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns a list of certifications available for practitioners'
    )
    @action(detail=False, methods=['get'])
    def certifications(self, request):
        """Return a list of all certifications."""
        certifications = Certification.objects.all()
        serializer = CertificationSerializer(certifications, many=True)
        return Response(serializer.data)
    
    @extend_schema(
        description='Returns a list of education institutions available for practitioners'
    )
    @action(detail=False, methods=['get'])
    def educations(self, request):
        """Return a list of all education institutions."""
        educations = Education.objects.all()
        serializer = EducationSerializer(educations, many=True)
        return Response(serializer.data)


class PractitionerApplicationView(generics.CreateAPIView):
    """API endpoint for creating a practitioner application.
    
    This endpoint allows existing users to apply to become practitioners.
    It creates a practitioner profile and initiates the onboarding process.
    """
    serializer_class = PractitionerApplicationSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    @extend_schema(
        summary="Apply to become a practitioner",
        description="Submit an application to become a practitioner. Must be authenticated as a user.",
        responses={
            201: PractitionerApplicationSerializer,
            400: OpenApiResponse(description="Invalid data or user already has a practitioner profile"),
            403: OpenApiResponse(description="Not authenticated")
        }
    )
    def post(self, request, *args, **kwargs):
        # Check if user already has a practitioner profile
        if hasattr(request.user, 'practitioner_profile'):
            return Response(
                {"detail": "User already has a practitioner profile."},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the practitioner profile
        return super().post(request, *args, **kwargs)


class PractitionerOnboardingViewSet(viewsets.GenericViewSet):
    """
    API endpoint for viewing and managing practitioner onboarding progress.
    
    retrieve:
    Return the onboarding progress for the current practitioner.
    
    This endpoint allows practitioners to view their current onboarding progress,
    including completion percentage, current step, and next steps.
    """
    serializer_class = PractitionerOnboardingProgressSerializer
    permission_classes = [permissions.IsAuthenticated]
    queryset = PractitionerOnboardingProgress.objects.none()  # Required for OpenAPI schema generation
    
    @extend_schema(
        summary="Get onboarding progress",
        description="Returns the onboarding progress for the current practitioner, including completion percentage, current step, and next steps.",
        responses={
            200: PractitionerOnboardingProgressSerializer,
            404: OpenApiResponse(description="Practitioner profile not found")
        },
        tags=["practitioner-onboarding"]
    )
    @action(detail=False, methods=['get'])
    def progress(self, request):
        """Return the onboarding progress for the current user's practitioner profile."""
        try:
            # Get the practitioner profile for the current user
            practitioner = request.user.practitioner_profile
            
            # Get or create the onboarding progress
            progress, created = PractitionerOnboardingProgress.objects.get_or_create(
                practitioner=practitioner,
                defaults={
                    'status': 'in_progress',
                    'current_step': 'profile_completion',
                    'steps_completed': []
                }
            )
            
            serializer = self.get_serializer(progress)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": "Practitioner profile not found or you don't have permission to access it."},
                status=404
            )
    
    @extend_schema(
        summary="Update onboarding step",
        description="Update the current onboarding step for the practitioner.",
        request=inline_serializer(
            name='OnboardingStepUpdateRequest',
            fields={
                'step': serializers.CharField(),
                'completed': serializers.BooleanField()
            }
        ),
        responses={
            200: PractitionerOnboardingProgressSerializer,
            400: OpenApiResponse(description="Invalid step data"),
            404: OpenApiResponse(description="Practitioner profile not found")
        },
        tags=["practitioner-onboarding"]
    )
    @action(detail=False, methods=['patch'])
    def update_step(self, request):
        """Update the current onboarding step."""
        try:
            practitioner = request.user.practitioner_profile
            progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
            
            step = request.data.get('step')
            completed = request.data.get('completed', False)
            
            if completed and step not in progress.steps_completed:
                progress.steps_completed.append(step)
            
            if step:
                progress.current_step = step
                
            progress.save()
            serializer = self.get_serializer(progress)
            return Response(serializer.data)
        except Exception as e:
            return Response(
                {"detail": "Failed to update onboarding step."},
                status=400
            )
    
    @extend_schema(
        summary="Complete onboarding",
        description="Mark the onboarding process as complete.",
        responses={
            200: OpenApiResponse(
                response=inline_serializer(
                    name='OnboardingCompleteResponse',
                    fields={
                        'status': serializers.CharField(help_text="Status message"),
                        'completed_at': serializers.DateTimeField(help_text="Timestamp when onboarding was completed")
                    }
                ),
                description="Onboarding completion successful"
            ),
            400: OpenApiResponse(description="Unable to complete onboarding"),
            404: OpenApiResponse(description="Practitioner profile not found")
        },
        tags=["practitioner-onboarding"]
    )
    @action(detail=False, methods=['post'])
    def complete(self, request):
        """Mark onboarding as complete."""
        try:
            from django.utils import timezone
            
            practitioner = request.user.practitioner_profile
            progress = PractitionerOnboardingProgress.objects.get(practitioner=practitioner)
            
            progress.status = 'completed'
            progress.completed_at = timezone.now()
            progress.save()
            
            # Update practitioner status
            practitioner.is_onboarded = True
            practitioner.onboarding_completed_at = timezone.now()
            practitioner.save()
            
            return Response({
                'status': 'onboarding completed',
                'completed_at': progress.completed_at
            })
        except Exception as e:
            return Response(
                {"detail": "Failed to complete onboarding."},
                status=400
            )
    
    @extend_schema(
        summary="Get onboarding progress for specific practitioner",
        description="Returns the onboarding progress for a specific practitioner (admin only).",
        responses={
            200: PractitionerOnboardingProgressSerializer,
            404: OpenApiResponse(description="Onboarding progress not found")
        },
        tags=["practitioner-onboarding-admin"]
    )
    @action(detail=True, methods=['get'], url_path='admin/progress', permission_classes=[permissions.IsAdminUser])
    def practitioner_progress(self, request, pk=None):
        """Return the onboarding progress for a specific practitioner (admin only)."""
        try:
            progress = PractitionerOnboardingProgress.objects.get(practitioner_id=pk)
            serializer = self.get_serializer(progress)
            return Response(serializer.data)
        except PractitionerOnboardingProgress.DoesNotExist:
            return Response(
                {"detail": "Onboarding progress not found for this practitioner."},
                status=404
            )
