"""
DRF ViewSets for Practitioners API
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count, Min, Max, Prefetch, F, Sum, OuterRef, Subquery
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from drf_spectacular.utils import extend_schema, extend_schema_view, OpenApiParameter

from practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot, SchedulePreference,
    OutOfOffice, VerificationDocument, PractitionerOnboardingProgress,
    Certification, Education
)
# from practitioners.utils.availability import AvailabilityCalculator
from bookings.models import Booking
from services.models import Service
from users.models import User

from .serializers import (
    PractitionerListSerializer, PractitionerDetailSerializer,
    PractitionerPrivateSerializer, PractitionerUpdateSerializer,
    PractitionerApplicationSerializer, ScheduleSerializer,
    ScheduleCreateSerializer, SchedulePreferenceSerializer,
    ScheduleTimeSlotSerializer, OutOfOfficeSerializer,
    OnboardingProgressSerializer, AvailabilitySlotSerializer,
    AvailabilityQuerySerializer, PractitionerSearchSerializer,
    VerificationDocumentSerializer, CertificationSerializer,
    EducationSerializer, SpecializationSerializer, StyleSerializer,
    TopicSerializer, ModalitySerializer, PractitionerClientSerializer
)
from .permissions import IsPractitionerOwner, IsPractitionerOrReadOnly
from .filters import PractitionerFilter
from emails.services import PractitionerEmailService


@extend_schema_view(
    list=extend_schema(tags=['Practitioners']),
    create=extend_schema(tags=['Practitioners']),
    retrieve=extend_schema(tags=['Practitioners']),
    update=extend_schema(tags=['Practitioners']),
    partial_update=extend_schema(tags=['Practitioners']),
    destroy=extend_schema(tags=['Practitioners']),
    my_profile=extend_schema(tags=['Practitioners']),
    apply=extend_schema(tags=['Practitioners']),
    verify_email=extend_schema(tags=['Practitioners']),
    upload_document=extend_schema(tags=['Practitioners']),
    services=extend_schema(tags=['Practitioners']),
    availability=extend_schema(tags=['Practitioners']),
    search=extend_schema(tags=['Practitioners']),
    stats=extend_schema(tags=['Practitioners']),
    clients=extend_schema(tags=['Practitioners']),
    client_detail=extend_schema(tags=['Practitioners']),
    client_notes=extend_schema(tags=['Practitioners']),
    client_note_detail=extend_schema(tags=['Practitioners']),
    earnings=extend_schema(tags=['Practitioners']),
    transactions=extend_schema(tags=['Practitioners']),
    balance=extend_schema(tags=['Practitioners']),
    payouts=extend_schema(tags=['Practitioners']),
    request_payout=extend_schema(tags=['Practitioners']),
    analytics=extend_schema(tags=['Practitioners']),
    certifications=extend_schema(tags=['Practitioners']),
    certification_detail=extend_schema(tags=['Practitioners']),
    educations=extend_schema(tags=['Practitioners']),
    education_detail=extend_schema(tags=['Practitioners']),
    questions=extend_schema(tags=['Practitioners']),
    question_detail=extend_schema(tags=['Practitioners']),
    by_slug=extend_schema(tags=['Practitioners'])
)
class PractitionerViewSet(viewsets.ModelViewSet):
    """
    ViewSet for practitioner profiles.
    
    Supports:
    - Public listing with search/filters
    - Public profile viewing
    - Private profile management for practitioners
    - Application process for new practitioners
    - Verification status tracking
    """
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PractitionerFilter
    search_fields = ['display_name', 'bio', 'professional_title']
    ordering_fields = ['created_at', 'years_of_experience', 'featured']
    ordering = ['-featured', '-created_at']
    
    def get_queryset(self):
        """Get queryset based on action"""
        queryset = Practitioner.objects.select_related(
            'user', 'primary_location'
        ).prefetch_related(
            'specializations', 'styles', 'topics', 'modalities',
            'certifications', 'educations',
            Prefetch(
                'primary_services',
                queryset=Service.objects.filter(is_active=True)
            )
        )
        
        # For public views, only show active and verified practitioners
        if self.action in ['list', 'retrieve']:
            queryset = queryset.filter(
                is_verified=True,
                practitioner_status='active'
            )
        
        return queryset
    
    def get_serializer_class(self):
        """Get serializer based on action"""
        if self.action == 'list':
            return PractitionerListSerializer
        elif self.action == 'retrieve':
            # Use private serializer for own profile
            if self.request.user.is_authenticated and hasattr(self.request.user, 'practitioner_profile'):
                practitioner = self.get_object()
                if practitioner.user == self.request.user:
                    return PractitionerPrivateSerializer
            return PractitionerDetailSerializer
        elif self.action in ['update', 'partial_update']:
            return PractitionerUpdateSerializer
        elif self.action == 'apply':
            return PractitionerApplicationSerializer
        elif self.action == 'my_profile':
            return PractitionerPrivateSerializer
        return PractitionerDetailSerializer
    
    def get_permissions(self):
        """Get permissions based on action"""
        if self.action in ['list', 'retrieve', 'by_slug']:
            permission_classes = [AllowAny]
        elif self.action == 'apply':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsPractitionerOwner]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[-\w]+)')
    def by_slug(self, request, slug=None):
        """Get practitioner by slug"""
        try:
            practitioner = self.get_queryset().get(slug=slug)
            serializer = PractitionerDetailSerializer(practitioner, context={'request': request})
            return Response(serializer.data)
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "Practitioner not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_profile(self, request):
        """Get authenticated practitioner's own profile"""
        try:
            practitioner = request.user.practitioner_profile
            serializer = self.get_serializer(practitioner)
            return Response(serializer.data)
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def apply(self, request):
        """Apply to become a practitioner"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        practitioner = serializer.save()
        
        # Return the created profile
        response_serializer = PractitionerPrivateSerializer(practitioner)
        return Response(
            response_serializer.data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['post'], permission_classes=[IsPractitionerOwner])
    def verify_email(self, request, pk=None):
        """Send email verification for practitioner"""
        practitioner = self.get_object()
        # TODO: Implement email verification logic
        return Response({"detail": "Verification email sent"})
    
    @action(detail=True, methods=['post'], permission_classes=[IsPractitionerOwner])
    def upload_document(self, request, pk=None):
        """Upload verification document"""
        practitioner = self.get_object()
        serializer = VerificationDocumentSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        document = serializer.save(practitioner=practitioner)
        return Response(
            VerificationDocumentSerializer(document).data,
            status=status.HTTP_201_CREATED
        )
    
    @action(detail=True, methods=['get'], permission_classes=[IsPractitionerOwner])
    def onboarding_progress(self, request, pk=None):
        """Get onboarding progress"""
        practitioner = self.get_object()
        try:
            progress = practitioner.onboarding_progress
            serializer = OnboardingProgressSerializer(progress)
            return Response(serializer.data)
        except PractitionerOnboardingProgress.DoesNotExist:
            return Response(
                {"detail": "No onboarding progress found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['get'])
    def search(self, request):
        """
        Advanced search endpoint with multiple filters.
        Supports location-based search, service filters, availability, and more.
        """
        # Validate search parameters
        serializer = PractitionerSearchSerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        filters = serializer.validated_data
        
        # Start with base queryset
        queryset = self.get_queryset()
        
        # Apply location filters
        if filters.get('city'):
            queryset = queryset.filter(primary_location__city__icontains=filters['city'])
        if filters.get('state'):
            queryset = queryset.filter(primary_location__state__icontains=filters['state'])
        if filters.get('country'):
            queryset = queryset.filter(primary_location__country__icontains=filters['country'])
        
        # Location-based radius search
        if filters.get('latitude') and filters.get('longitude'):
            # TODO: Implement geographic distance calculation
            pass
        
        # Service type and category filters
        if filters.get('service_type_ids'):
            queryset = queryset.filter(
                Q(primary_services__service_type_id__in=filters['service_type_ids']) |
                Q(services__service_type_id__in=filters['service_type_ids'])
            ).distinct()
        
        if filters.get('category_ids'):
            queryset = queryset.filter(
                Q(primary_services__category_id__in=filters['category_ids']) |
                Q(services__category_id__in=filters['category_ids'])
            ).distinct()
        
        # Specialization filters
        if filters.get('specialization_ids'):
            queryset = queryset.filter(
                specializations__id__in=filters['specialization_ids']
            ).distinct()
        
        if filters.get('style_ids'):
            queryset = queryset.filter(styles__id__in=filters['style_ids']).distinct()
        
        if filters.get('topic_ids'):
            queryset = queryset.filter(topics__id__in=filters['topic_ids']).distinct()
        
        if filters.get('modality_ids'):
            queryset = queryset.filter(modalities__id__in=filters['modality_ids']).distinct()
        
        # Price range filter
        if filters.get('min_price') or filters.get('max_price'):
            price_q = Q()
            if filters.get('min_price'):
                price_q &= Q(primary_services__price_cents__gte=int(filters['min_price'] * 100))
            if filters.get('max_price'):
                price_q &= Q(primary_services__price_cents__lte=int(filters['max_price'] * 100))
            queryset = queryset.filter(price_q).distinct()
        
        # Experience filter
        if filters.get('min_experience_years'):
            queryset = queryset.filter(
                years_of_experience__gte=filters['min_experience_years']
            )
        
        # Location type filter
        if filters.get('location_type'):
            queryset = queryset.filter(
                Q(primary_services__location_type=filters['location_type']) |
                Q(services__location_type=filters['location_type'])
            ).distinct()
        
        # Rating filter
        if filters.get('min_rating'):
            queryset = queryset.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
            ).filter(avg_rating__gte=filters['min_rating'])
        
        # Language filter
        if filters.get('languages'):
            queryset = queryset.filter(
                Q(primary_services__languages__code__in=filters['languages']) |
                Q(services__languages__code__in=filters['languages'])
            ).distinct()
        
        # Verification and featured filters
        if filters.get('is_verified') is not None:
            queryset = queryset.filter(is_verified=filters['is_verified'])
        
        if filters.get('featured_only'):
            queryset = queryset.filter(featured=True)
        
        # Apply sorting
        sort_by = filters.get('sort_by', 'relevance')
        if sort_by == 'rating':
            queryset = queryset.annotate(
                avg_rating=Avg('reviews__rating', filter=Q(reviews__is_published=True))
            ).order_by('-avg_rating', '-featured')
        elif sort_by == 'price_low':
            queryset = queryset.annotate(
                min_price=Min('primary_services__price_cents')
            ).order_by('min_price')
        elif sort_by == 'price_high':
            queryset = queryset.annotate(
                max_price=Max('primary_services__price_cents')
            ).order_by('-max_price')
        elif sort_by == 'experience':
            queryset = queryset.order_by('-years_of_experience', '-featured')
        elif sort_by == 'availability':
            queryset = queryset.order_by('next_available_date', '-featured')
        else:  # relevance or default
            queryset = queryset.order_by('-featured', '-is_verified', '-years_of_experience')
        
        # Paginate results
        page = self.paginate_queryset(queryset)
        if page is not None:
            serializer = PractitionerListSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PractitionerListSerializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stats(self, request):
        """
        Get dashboard statistics for the practitioner.
        Returns bookings, revenue, clients, and rating stats.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate date ranges
        now = timezone.now()
        current_month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (current_month_start - timedelta(days=1)).replace(day=1)
        
        # Get current month stats
        current_month_bookings = Booking.objects.filter(
            practitioner=practitioner,
            created_at__gte=current_month_start,
            status__in=['completed', 'confirmed']
        )
        
        # Get last month stats for comparison
        last_month_bookings = Booking.objects.filter(
            practitioner=practitioner,
            created_at__gte=last_month_start,
            created_at__lt=current_month_start,
            status__in=['completed', 'confirmed']
        )
        
        # Calculate stats
        total_bookings = current_month_bookings.count()
        total_bookings_last = last_month_bookings.count()
        
        total_revenue = current_month_bookings.filter(
            status='completed'
        ).aggregate(
            total=Sum('final_amount_cents')
        )['total'] or 0
        
        total_revenue_last = last_month_bookings.filter(
            status='completed'
        ).aggregate(
            total=Sum('final_amount_cents')
        )['total'] or 0
        
        # Active clients (unique users with bookings in the last 30 days)
        active_clients = User.objects.filter(
            bookings__practitioner=practitioner,
            bookings__created_at__gte=now - timedelta(days=30),
            bookings__status__in=['completed', 'confirmed']
        ).distinct().count()
        
        active_clients_last = User.objects.filter(
            bookings__practitioner=practitioner,
            bookings__created_at__gte=now - timedelta(days=60),
            bookings__created_at__lt=now - timedelta(days=30),
            bookings__status__in=['completed', 'confirmed']
        ).distinct().count()
        
        # Average rating
        from reviews.models import Review
        rating_data = Review.objects.filter(
            practitioner=practitioner,
            is_published=True
        ).aggregate(
            avg_rating=Avg('rating'),
            total_reviews=Count('id')
        )
        
        # Calculate percentage changes
        def calculate_change(current, previous):
            if previous == 0:
                return 100 if current > 0 else 0
            return round(((current - previous) / previous) * 100, 1)
        
        stats = {
            'total_bookings': {
                'value': total_bookings,
                'change': calculate_change(total_bookings, total_bookings_last),
                'is_positive': total_bookings >= total_bookings_last
            },
            'total_revenue': {
                'value': total_revenue,
                'value_display': f"${total_revenue / 100:,.2f}",
                'change': calculate_change(total_revenue, total_revenue_last),
                'is_positive': total_revenue >= total_revenue_last
            },
            'active_clients': {
                'value': active_clients,
                'change': calculate_change(active_clients, active_clients_last),
                'is_positive': active_clients >= active_clients_last
            },
            'average_rating': {
                'value': round(rating_data['avg_rating'] or 0, 1),
                'total_reviews': rating_data['total_reviews'],
                'change': 0,  # Rating changes are calculated differently
                'is_positive': True
            }
        }
        
        return Response(stats)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def clients(self, request):
        """
        Get list of clients who have booked with the practitioner.
        Returns unique clients with booking statistics.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get unique users who have bookings with this practitioner
        # Annotate with booking statistics
        clients = User.objects.filter(
            bookings__practitioner=practitioner,
            bookings__status__in=['completed', 'confirmed', 'in_progress']
        ).distinct().annotate(
            total_bookings=Count('bookings', filter=Q(
                bookings__practitioner=practitioner,
                bookings__status__in=['completed', 'confirmed', 'in_progress']
            )),
            total_spent=Sum('bookings__final_amount_cents', filter=Q(
                bookings__practitioner=practitioner,
                bookings__status='completed'
            )),
            last_booking_date=Max('bookings__start_time', filter=Q(
                bookings__practitioner=practitioner
            )),
            # Get next upcoming booking
            next_booking_date=Subquery(
                Booking.objects.filter(
                    user=OuterRef('pk'),
                    practitioner=practitioner,
                    status='confirmed',
                    start_time__gte=timezone.now()
                ).order_by('start_time').values('start_time')[:1]
            )
        ).select_related('profile').order_by('-last_booking_date')
        
        # Apply filters
        search = request.query_params.get('search')
        if search:
            clients = clients.filter(
                Q(first_name__icontains=search) |
                Q(last_name__icontains=search) |
                Q(email__icontains=search) |
                Q(profile__display_name__icontains=search)
            )

        # Serialize the results
        from .serializers import PractitionerClientSerializer
        
        # Paginate
        page = self.paginate_queryset(clients)
        if page is not None:
            serializer = PractitionerClientSerializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = PractitionerClientSerializer(clients, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'], url_path='clients/(?P<client_id>[^/]+)', permission_classes=[IsAuthenticated])
    def client_detail(self, request, client_id=None):
        """
        Get detailed information about a specific client.
        Returns client profile and booking statistics.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get the specific client user
        client = get_object_or_404(User, id=client_id)

        # Verify this client has bookings with the practitioner
        has_bookings = Booking.objects.filter(
            user=client,
            practitioner=practitioner,
            status__in=['completed', 'confirmed', 'in_progress']
        ).exists()

        if not has_bookings:
            return Response(
                {"detail": "This user is not your client"},
                status=status.HTTP_404_NOT_FOUND
            )

        # Annotate with booking statistics
        from django.db.models import Count, Sum, Max, Subquery, OuterRef

        client_data = User.objects.filter(id=client_id).annotate(
            total_bookings=Count('bookings', filter=Q(
                bookings__practitioner=practitioner,
                bookings__status__in=['completed', 'confirmed', 'in_progress']
            )),
            total_spent=Sum('bookings__final_amount_cents', filter=Q(
                bookings__practitioner=practitioner,
                bookings__status='completed'
            )),
            last_booking_date=Max('bookings__start_time', filter=Q(
                bookings__practitioner=practitioner
            )),
            next_booking_date=Subquery(
                Booking.objects.filter(
                    user=OuterRef('pk'),
                    practitioner=practitioner,
                    status='confirmed',
                    start_time__gte=timezone.now()
                ).order_by('start_time').values('start_time')[:1]
            )
        ).select_related('profile').first()

        from .serializers import PractitionerClientSerializer
        serializer = PractitionerClientSerializer(client_data)
        return Response(serializer.data)

    @extend_schema(
        methods=['POST'],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'content': {
                        'type': 'string',
                        'description': 'The note content'
                    }
                },
                'required': ['content']
            }
        },
        responses={201: 'ClientNote'},
        description="Create a new note for a specific client"
    )
    @action(detail=False, methods=['get', 'post'], url_path='clients/(?P<client_id>[^/]+)/notes', permission_classes=[IsAuthenticated])
    def client_notes(self, request, client_id=None):
        """
        Get or create notes for a specific client.
        Only the practitioner who created the notes can view/edit them.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the client
        client = get_object_or_404(User, pk=client_id)
        
        # Verify the practitioner has had bookings with this client
        has_bookings = Booking.objects.filter(
            practitioner=practitioner,
            user=client,
            status__in=['completed', 'confirmed', 'in_progress']
        ).exists()
        
        if not has_bookings:
            return Response(
                {"detail": "You have not had any bookings with this client"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if request.method == 'GET':
            # Get all notes for this client by this practitioner
            from practitioners.models import ClientNote
            notes = practitioner.client_notes.filter(client=client).order_by('-created_at')
            
            from .serializers import ClientNoteSerializer
            serializer = ClientNoteSerializer(notes, many=True, context={'request': request})
            return Response(serializer.data)
        
        else:  # POST
            # Create a new note
            from .serializers import ClientNoteSerializer
            serializer = ClientNoteSerializer(data=request.data, context={'request': request})
            serializer.is_valid(raise_exception=True)
            
            # Add the client to the validated data
            serializer.save(client=client)
            
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @extend_schema(
        methods=['PUT'],
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'content': {
                        'type': 'string',
                        'description': 'The note content'
                    }
                },
                'required': ['content']
            }
        },
        responses={200: 'ClientNote'},
        description="Update a specific client note"
    )
    @action(detail=False, methods=['put', 'delete'], url_path='clients/notes/(?P<note_id>[^/]+)', permission_classes=[IsAuthenticated])
    def client_note_detail(self, request, note_id=None):
        """
        Update or delete a specific client note.
        Only the practitioner who created the note can modify it.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get the note and verify ownership
        from practitioners.models import ClientNote
        note = get_object_or_404(ClientNote, pk=note_id, practitioner=practitioner)
        
        if request.method == 'PUT':
            # Update the note
            from .serializers import ClientNoteSerializer
            serializer = ClientNoteSerializer(note, data=request.data, partial=True, context={'request': request})
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        else:  # DELETE
            note.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def earnings(self, request):
        """
        Get practitioner earnings with filtering options.
        Supports date range filtering and grouping by period.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get query parameters
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        group_by = request.query_params.get('group_by', 'day')  # day, week, month, year
        
        # Base queryset
        bookings = Booking.objects.filter(
            practitioner=practitioner,
            status='completed'
        )
        
        # Apply date filters
        if start_date:
            bookings = bookings.filter(completed_at__gte=start_date)
        if end_date:
            bookings = bookings.filter(completed_at__lte=end_date)
        
        # Get earnings transactions instead of bookings for accurate commission data
        from payments.models import EarningsTransaction
        earnings_transactions = EarningsTransaction.objects.filter(
            practitioner=practitioner,
            booking__in=bookings
        )
        
        # Calculate totals from earnings transactions
        totals = earnings_transactions.aggregate(
            gross_amount=Sum('gross_amount_cents'),
            commission_amount=Sum('commission_amount_cents'),
            net_amount=Sum('net_amount_cents'),
            total_bookings=Count('booking_id', distinct=True)
        )
        
        # Get earnings by service type
        by_service_type = bookings.values('service__service_type').annotate(
            amount=Sum('final_amount_cents'),
            count=Count('id')
        ).order_by('-amount')
        
        # Get time series data based on grouping
        from django.db.models.functions import Trunc
        if group_by == 'day':
            trunc_fn = 'day'
        elif group_by == 'week':
            trunc_fn = 'week'
        elif group_by == 'month':
            trunc_fn = 'month'
        else:
            trunc_fn = 'year'
        
        time_series = earnings_transactions.annotate(
            period=Trunc('created_at', trunc_fn)
        ).values('period').annotate(
            gross_amount=Sum('gross_amount_cents'),
            commission_amount=Sum('commission_amount_cents'),
            net_amount=Sum('net_amount_cents'),
            booking_count=Count('booking_id', distinct=True)
        ).order_by('period')
        
        # Get available balance from PractitionerEarnings model
        from payments.models import PractitionerEarnings
        try:
            earnings = PractitionerEarnings.objects.get(practitioner=practitioner)
            available_balance = earnings.available_balance_cents
        except PractitionerEarnings.DoesNotExist:
            available_balance = 0
        
        # Format response
        response_data = {
            'totals': {
                'gross_amount': totals['gross_amount'] or 0,
                'gross_amount_display': f"${(totals['gross_amount'] or 0) / 100:,.2f}",
                'commission_amount': totals['commission_amount'] or 0,
                'commission_amount_display': f"${(totals['commission_amount'] or 0) / 100:,.2f}",
                'net_amount': totals['net_amount'] or 0,
                'net_amount_display': f"${(totals['net_amount'] or 0) / 100:,.2f}",
                'total_bookings': totals['total_bookings']
            },
            'available_balance': available_balance,
            'available_balance_display': f"${available_balance / 100:,.2f}",
            'by_service_type': [
                {
                    'service_type': item['service__service_type'],
                    'amount': item['amount'],
                    'amount_display': f"${item['amount'] / 100:,.2f}",
                    'count': item['count']
                }
                for item in by_service_type
            ],
            'time_series': [
                {
                    'period': item['period'].isoformat() if item['period'] else None,
                    'gross_amount': item['gross_amount'],
                    'gross_amount_display': f"${item['gross_amount'] / 100:,.2f}",
                    'commission_amount': item['commission_amount'],
                    'commission_amount_display': f"${item['commission_amount'] / 100:,.2f}",
                    'net_amount': item['net_amount'],
                    'net_amount_display': f"${item['net_amount'] / 100:,.2f}",
                    'booking_count': item['booking_count']
                }
                for item in time_series
            ]
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def transactions(self, request):
        """
        Get practitioner transactions with extensive filtering.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get all bookings for this practitioner
        bookings = Booking.objects.filter(
            practitioner=practitioner
        ).exclude(
            status__in=['draft', 'pending_payment']
        ).select_related(
            'user', 'service'
        ).order_by('-created_at')
        
        # Apply filters
        status = request.query_params.get('status')
        if status:
            bookings = bookings.filter(status=status)
        
        service_type = request.query_params.get('service_type')
        if service_type:
            bookings = bookings.filter(service__service_type=service_type)
        
        client_id = request.query_params.get('client')
        if client_id:
            bookings = bookings.filter(user_id=client_id)
        
        start_date = request.query_params.get('start_date')
        if start_date:
            bookings = bookings.filter(created_at__gte=start_date)
        
        end_date = request.query_params.get('end_date')
        if end_date:
            bookings = bookings.filter(created_at__lte=end_date)
        
        # Paginate
        page = self.paginate_queryset(bookings)
        
        # Format transactions
        from payments.models import EarningsTransaction
        transactions = []
        for booking in (page if page is not None else bookings):
            # Get earnings transaction for commission data
            earnings_tx = EarningsTransaction.objects.filter(
                booking=booking,
                practitioner=practitioner
            ).first()
            
            # Calculate commission (default to 15% if no earnings transaction)
            if earnings_tx:
                commission_cents = earnings_tx.commission_amount_cents
                net_amount_cents = earnings_tx.net_amount_cents
            else:
                # Fallback calculation
                commission_cents = int(booking.final_amount_cents * 0.15)
                net_amount_cents = booking.final_amount_cents - commission_cents
            
            transaction = {
                'id': f"TXN-{booking.id}",
                'booking_id': booking.id,
                'date': booking.created_at,
                'type': 'booking',
                'status': booking.status,
                'client': {
                    'id': booking.user.id,
                    'name': booking.user.get_full_name() or booking.user.email,
                    'email': booking.user.email
                },
                'service': {
                    'id': booking.service.id,
                    'title': booking.service.name,  # Service model uses 'name' not 'title'
                    'type': booking.service.service_type.code  # Use 'code' field for the type identifier
                },
                'amount': booking.final_amount_cents,
                'amount_display': f"${booking.final_amount_cents / 100:,.2f}",
                'commission': commission_cents,
                'commission_display': f"${commission_cents / 100:,.2f}",
                'net_amount': net_amount_cents,
                'net_amount_display': f"${net_amount_cents / 100:,.2f}",
            }
            transactions.append(transaction)
        
        if page is not None:
            return self.get_paginated_response(transactions)
        
        return Response(transactions)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def balance(self, request):
        """
        Get practitioner's current balance and commission information.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from payments.models import PractitionerEarnings, EarningsTransaction
        
        # Get or create earnings record
        earnings, created = PractitionerEarnings.objects.get_or_create(
            practitioner=practitioner
        )
        
        # Get pending earnings (not yet available)
        pending_earnings = EarningsTransaction.objects.filter(
            practitioner=practitioner,
            status='pending'
        ).aggregate(
            total=Sum('net_amount_cents')
        )['total'] or 0
        
        # Get commission information
        commission_rate = practitioner.commission_rate if hasattr(practitioner, 'commission_rate') else 5.0
        
        # Get next payout date (assuming weekly payouts on Mondays)
        from datetime import timedelta
        today = timezone.now().date()
        days_until_monday = (7 - today.weekday()) % 7
        if days_until_monday == 0:
            days_until_monday = 7
        next_payout_date = today + timedelta(days=days_until_monday)
        
        response_data = {
            'available_balance': earnings.available_balance_cents,
            'available_balance_display': f"${earnings.available_balance_cents / 100:,.2f}",
            'pending_balance': earnings.pending_balance_cents,
            'pending_balance_display': f"${earnings.pending_balance_cents / 100:,.2f}",
            'lifetime_earnings': earnings.lifetime_earnings_cents,
            'lifetime_earnings_display': f"${earnings.lifetime_earnings_cents / 100:,.2f}",
            'lifetime_payouts': earnings.lifetime_payouts_cents,
            'lifetime_payouts_display': f"${earnings.lifetime_payouts_cents / 100:,.2f}",
            'last_payout_date': earnings.last_payout_date,
            'next_payout_date': next_payout_date,
            'minimum_payout_amount': 5000,  # $50 minimum
            'minimum_payout_display': "$50.00",
            'commission_rate': commission_rate,
            'can_request_payout': earnings.available_balance_cents >= 5000
        }
        
        return Response(response_data)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def payouts(self, request):
        """
        Get practitioner's payout history.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from payments.models import PractitionerPayout
        
        # Get payouts
        payouts = PractitionerPayout.objects.filter(
            practitioner=practitioner
        ).order_by('-created_at')
        
        # Apply filters
        status = request.query_params.get('status')
        if status:
            payouts = payouts.filter(status=status)
        
        start_date = request.query_params.get('start_date')
        if start_date:
            payouts = payouts.filter(created_at__gte=start_date)
        
        end_date = request.query_params.get('end_date')
        if end_date:
            payouts = payouts.filter(created_at__lte=end_date)
        
        # Paginate
        page = self.paginate_queryset(payouts)
        
        # Format payouts
        payout_data = []
        for payout in (page if page is not None else payouts):
            data = {
                'id': payout.id,
                'reference_number': f"PO-{payout.id:06d}",
                'amount': payout.credits_payout_cents,
                'amount_display': f"${payout.credits_payout_cents / 100:,.2f}",
                'fee': payout.transaction_fee_cents,
                'fee_display': f"${payout.transaction_fee_cents / 100:,.2f}",
                'net_amount': payout.credits_payout_cents - payout.transaction_fee_cents,
                'net_amount_display': f"${(payout.credits_payout_cents - payout.transaction_fee_cents) / 100:,.2f}",
                'status': payout.status,
                'payment_method': payout.payment_method,
                'created_at': payout.created_at,
                'completed_at': payout.completed_at,
                'stripe_transfer_id': payout.stripe_transfer_id,
                'failure_reason': payout.failure_reason,
            }
            payout_data.append(data)
        
        if page is not None:
            return self.get_paginated_response(payout_data)
        
        return Response(payout_data)
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def request_payout(self, request):
        """
        Request a payout of available balance.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        from payments.models import PractitionerEarnings, PractitionerPayout, EarningsTransaction
        
        # Get current balance
        try:
            earnings = PractitionerEarnings.objects.get(practitioner=practitioner)
        except PractitionerEarnings.DoesNotExist:
            return Response(
                {"detail": "No earnings balance found"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check minimum payout amount
        if earnings.available_balance_cents < 5000:  # $50 minimum
            return Response(
                {"detail": "Minimum payout amount is $50.00"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if practitioner has Stripe account
        if not hasattr(practitioner, 'stripe_account_id') or not practitioner.stripe_account_id:
            return Response(
                {"detail": "Please complete your payout setup first"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get payout method from request
        payout_method = request.data.get('method', 'standard')  # standard or instant
        
        # Calculate fees
        if payout_method == 'instant':
            fee_cents = 250  # $2.50 instant fee
        else:
            fee_cents = 0  # No fee for standard payouts
        
        # Create payout
        with transaction.atomic():
            # Get all available earnings transactions
            available_transactions = EarningsTransaction.objects.filter(
                practitioner=practitioner,
                status='available'
            )
            
            if not available_transactions.exists():
                return Response(
                    {"detail": "No available earnings to pay out"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create payout record
            payout = PractitionerPayout.objects.create(
                practitioner=practitioner,
                credits_payout_cents=earnings.available_balance_cents,
                transaction_fee_cents=fee_cents,
                payment_method=payout_method,
                status='pending'
            )
            
            # Link earnings transactions to payout
            available_transactions.update(
                payout=payout,
                status='processing'
            )
            
            # Update earnings balance
            earnings.available_balance_cents = 0
            earnings.save()
            
            # TODO: Trigger Stripe payout via Temporal workflow
            
        return Response({
            'id': payout.id,
            'reference_number': f"PO-{payout.id:06d}",
            'amount': payout.credits_payout_cents,
            'amount_display': f"${payout.credits_payout_cents / 100:,.2f}",
            'fee': payout.transaction_fee_cents,
            'fee_display': f"${payout.transaction_fee_cents / 100:,.2f}",
            'net_amount': payout.credits_payout_cents - payout.transaction_fee_cents,
            'net_amount_display': f"${(payout.credits_payout_cents - payout.transaction_fee_cents) / 100:,.2f}",
            'status': payout.status,
            'payment_method': payout.payment_method,
            'created_at': payout.created_at,
            'message': "Payout request submitted successfully"
        }, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def analytics(self, request):
        """
        Get analytics data for the practitioner dashboard.
        """
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get date range from query params
        days = int(request.query_params.get('days', 30))
        end_date = timezone.now()
        start_date = end_date - timedelta(days=days)
        
        # Profile views (simulated for now)
        import random
        profile_views = {
            'total': random.randint(100, 500),
            'trend': random.uniform(-10, 20),
            'daily_average': random.randint(3, 15)
        }
        
        # Booking analytics
        bookings = Booking.objects.filter(
            practitioner=practitioner,
            created_at__gte=start_date,
            created_at__lte=end_date
        )
        
        total_bookings = bookings.count()
        completed_bookings = bookings.filter(status='completed').count()
        canceled_bookings = bookings.filter(status='canceled').count()
        
        # Conversion rate (views to bookings)
        conversion_rate = (total_bookings / profile_views['total'] * 100) if profile_views['total'] > 0 else 0
        
        # Service popularity
        service_popularity = bookings.values(
            'service__title', 'service__service_type'
        ).annotate(
            count=Count('id'),
            revenue=Sum('final_amount_cents')
        ).order_by('-count')[:5]
        
        # Customer retention (repeat customers)
        unique_customers = bookings.values('user').distinct().count()
        repeat_customers = bookings.values('user').annotate(
            booking_count=Count('id')
        ).filter(booking_count__gt=1).count()
        
        retention_rate = (repeat_customers / unique_customers * 100) if unique_customers > 0 else 0
        
        # Time series data for charts
        from django.db.models.functions import TruncDate
        booking_trend = bookings.annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            count=Count('id'),
            revenue=Sum('final_amount_cents')
        ).order_by('date')
        
        # Peak booking times
        from django.db.models.functions import ExtractHour, ExtractWeekDay
        peak_hours = bookings.annotate(
            hour=ExtractHour('start_time')
        ).values('hour').annotate(
            count=Count('id')
        ).order_by('-count')[:5]
        
        peak_days = bookings.annotate(
            weekday=ExtractWeekDay('start_time')
        ).values('weekday').annotate(
            count=Count('id')
        ).order_by('-count')
        
        # Format response
        analytics_data = {
            'overview': {
                'profile_views': profile_views,
                'total_bookings': total_bookings,
                'completed_bookings': completed_bookings,
                'canceled_bookings': canceled_bookings,
                'cancellation_rate': (canceled_bookings / total_bookings * 100) if total_bookings > 0 else 0,
                'conversion_rate': round(conversion_rate, 2),
                'unique_customers': unique_customers,
                'repeat_customers': repeat_customers,
                'retention_rate': round(retention_rate, 2)
            },
            'service_popularity': [
                {
                    'title': item['service__title'],
                    'type': item['service__service_type'],
                    'bookings': item['count'],
                    'revenue': item['revenue'],
                    'revenue_display': f"${item['revenue'] / 100:,.2f}" if item['revenue'] else "$0.00"
                }
                for item in service_popularity
            ],
            'booking_trend': [
                {
                    'date': item['date'].isoformat() if item['date'] else None,
                    'bookings': item['count'],
                    'revenue': item['revenue'],
                    'revenue_display': f"${item['revenue'] / 100:,.2f}" if item['revenue'] else "$0.00"
                }
                for item in booking_trend
            ],
            'peak_hours': [
                {
                    'hour': item['hour'],
                    'bookings': item['count']
                }
                for item in peak_hours
            ],
            'peak_days': [
                {
                    'weekday': ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][item['weekday'] - 1],
                    'bookings': item['count']
                }
                for item in peak_days
            ]
        }
        
        return Response(analytics_data)
    
    @action(detail=True, methods=['get', 'post'])
    def certifications(self, request, pk=None):
        """
        Manage practitioner's certifications.
        GET: List all certifications for the practitioner
        POST: Add a new certification to the practitioner
        """
        practitioner = self.get_object()
        
        if request.method == 'GET':
            certifications = practitioner.certifications.all().order_by('order')
            serializer = CertificationSerializer(certifications, many=True)
            return Response(serializer.data)
        
        else:  # POST
            # Check permissions
            if practitioner.user != request.user and not request.user.is_staff:
                return Response(
                    {"detail": "You don't have permission to modify this practitioner's certifications"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = CertificationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            cert = serializer.save()
            practitioner.certifications.add(cert)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put', 'delete'], url_path='certifications/(?P<cert_id>[^/.]+)')
    def certification_detail(self, request, pk=None, cert_id=None):
        """
        Update or delete a specific certification.
        PUT: Update certification details
        DELETE: Remove certification from practitioner
        """
        practitioner = self.get_object()
        
        # Check permissions
        if practitioner.user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to modify this practitioner's certifications"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            cert = practitioner.certifications.get(id=cert_id)
        except Certification.DoesNotExist:
            return Response(
                {"detail": "Certification not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'PUT':
            serializer = CertificationSerializer(cert, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        else:  # DELETE
            practitioner.certifications.remove(cert)
            # If no other practitioners have this cert, delete it
            if not cert.practitioners.exists():
                cert.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get', 'post'])
    def educations(self, request, pk=None):
        """
        Manage practitioner's education entries.
        GET: List all education entries for the practitioner
        POST: Add a new education entry to the practitioner
        """
        practitioner = self.get_object()
        
        if request.method == 'GET':
            educations = practitioner.educations.all().order_by('order')
            serializer = EducationSerializer(educations, many=True)
            return Response(serializer.data)
        
        else:  # POST
            # Check permissions
            if practitioner.user != request.user and not request.user.is_staff:
                return Response(
                    {"detail": "You don't have permission to modify this practitioner's education"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            serializer = EducationSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            edu = serializer.save()
            practitioner.educations.add(edu)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put', 'delete'], url_path='educations/(?P<edu_id>[^/.]+)')
    def education_detail(self, request, pk=None, edu_id=None):
        """
        Update or delete a specific education entry.
        PUT: Update education details
        DELETE: Remove education from practitioner
        """
        practitioner = self.get_object()
        
        # Check permissions
        if practitioner.user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to modify this practitioner's education"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            edu = practitioner.educations.get(id=edu_id)
        except Education.DoesNotExist:
            return Response(
                {"detail": "Education entry not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'PUT':
            serializer = EducationSerializer(edu, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        else:  # DELETE
            practitioner.educations.remove(edu)
            # If no other practitioners have this education, delete it
            if not edu.practitioners.exists():
                edu.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
    
    @action(detail=True, methods=['get', 'post'])
    def questions(self, request, pk=None):
        """
        Manage practitioner's questions.
        GET: List all questions for the practitioner
        POST: Add a new question to the practitioner
        """
        practitioner = self.get_object()
        
        if request.method == 'GET':
            questions = practitioner.questions.all().order_by('order')
            from .serializers import QuestionSerializer
            serializer = QuestionSerializer(questions, many=True)
            return Response(serializer.data)
        
        else:  # POST
            # Check permissions
            if practitioner.user != request.user and not request.user.is_staff:
                return Response(
                    {"detail": "You don't have permission to modify this practitioner's questions"},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            from .serializers import QuestionSerializer
            serializer = QuestionSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            question = serializer.save()
            practitioner.questions.add(question)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['put', 'delete'], url_path='questions/(?P<question_id>[^/.]+)')
    def question_detail(self, request, pk=None, question_id=None):
        """
        Update or delete a specific question.
        PUT: Update question details
        DELETE: Remove question from practitioner
        """
        practitioner = self.get_object()
        
        # Check permissions
        if practitioner.user != request.user and not request.user.is_staff:
            return Response(
                {"detail": "You don't have permission to modify this practitioner's questions"},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            from practitioners.models import Question
            question = practitioner.questions.get(id=question_id)
        except Question.DoesNotExist:
            return Response(
                {"detail": "Question not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'PUT':
            from .serializers import QuestionSerializer
            serializer = QuestionSerializer(question, data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
        
        else:  # DELETE
            practitioner.questions.remove(question)
            # If no other practitioners have this question, delete it
            if not question.practitioners.exists():
                question.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)


@extend_schema_view(
    list=extend_schema(tags=['Public Practitioners']),
    retrieve=extend_schema(tags=['Public Practitioners'])
)
class PublicPractitionerViewSet(viewsets.ReadOnlyModelViewSet):
    """
    Public-facing ViewSet for practitioners using public_uuid for lookup.
    Used by marketing pages and public practitioner discovery.
    Read-only access with public-friendly URLs.
    """
    serializer_class = PractitionerDetailSerializer
    permission_classes = [AllowAny]  # Public access
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PractitionerFilter
    search_fields = ['display_name', 'bio', 'professional_title']
    ordering_fields = ['created_at', 'years_of_experience', 'featured']
    ordering = ['-featured', '-created_at']
    lookup_field = 'public_uuid'
    lookup_url_kwarg = 'public_uuid'
    
    def get_queryset(self):
        """Get public practitioners only - active and verified"""
        return Practitioner.objects.filter(
            is_verified=True,
            practitioner_status='active'
        ).select_related(
            'user', 'primary_location'
        ).prefetch_related(
            'specializations', 'styles', 'topics', 'modalities',
            'certifications', 'educations',
            Prefetch(
                'primary_services',
                queryset=Service.objects.filter(is_active=True, is_public=True)
            )
        )
    
    def get_serializer_class(self):
        """Always use public serializers"""
        if self.action == 'list':
            return PractitionerListSerializer
        return PractitionerDetailSerializer
    
    @action(detail=False, methods=['get'], url_path='by-slug/(?P<slug>[-\w]+)')
    def by_slug(self, request, slug=None):
        """Get practitioner by slug - public access"""
        try:
            practitioner = self.get_queryset().get(slug=slug)
            serializer = PractitionerDetailSerializer(practitioner, context={'request': request})
            return Response(serializer.data)
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "Practitioner not found"},
                status=status.HTTP_404_NOT_FOUND
            )


class ScheduleViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing practitioner schedules.
    Practitioners can create multiple named schedules.
    """
    serializer_class = ScheduleSerializer
    permission_classes = [IsAuthenticated, IsPractitionerOwner]
    
    def get_queryset(self):
        """Get schedules for the authenticated practitioner"""
        if hasattr(self.request.user, 'practitioner_profile'):
            return Schedule.objects.filter(
                practitioner=self.request.user.practitioner_profile
            ).prefetch_related('time_slots')
        return Schedule.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ScheduleCreateSerializer
        return ScheduleSerializer
    
    def perform_create(self, serializer):
        """Create schedule for authenticated practitioner"""
        serializer.save(practitioner=self.request.user.practitioner_profile)
    
    @action(detail=True, methods=['post'])
    def set_default(self, request, pk=None):
        """Set a schedule as default"""
        schedule = self.get_object()
        
        with transaction.atomic():
            # Unset any existing default
            Schedule.objects.filter(
                practitioner=schedule.practitioner,
                is_default=True
            ).update(is_default=False)
            
            # Set this as default
            schedule.is_default = True
            schedule.save()
        
        serializer = self.get_serializer(schedule)
        return Response(serializer.data)
    
    @action(detail=True, methods=['post'])
    def add_time_slot(self, request, pk=None):
        """Add a time slot to a schedule"""
        schedule = self.get_object()
        
        # Validate time slot data
        from .serializers import ScheduleTimeSlotSerializer
        serializer = ScheduleTimeSlotSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create time slot
        time_slot = serializer.save(schedule=schedule)
        
        return Response(
            ScheduleTimeSlotSerializer(time_slot).data,
            status=status.HTTP_201_CREATED
        )
    
    @extend_schema(
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'time_slot_id': {
                        'type': 'integer',
                        'description': 'ID of the time slot to remove'
                    }
                },
                'required': ['time_slot_id']
            }
        },
        responses={204: None}
    )
    @action(detail=True, methods=['delete'])
    def remove_time_slot(self, request, pk=None):
        """Remove a time slot from a schedule"""
        schedule = self.get_object()
        time_slot_id = request.data.get('time_slot_id')
        
        if not time_slot_id:
            return Response(
                {"detail": "time_slot_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            time_slot = schedule.time_slots.get(id=time_slot_id)
            time_slot.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ScheduleTimeSlot.DoesNotExist:
            return Response(
                {"detail": "Time slot not found"},
                status=status.HTTP_404_NOT_FOUND
            )


@extend_schema_view(
    check=extend_schema(tags=['Availability']),
    out_of_office=extend_schema(tags=['Availability']),
    preferences=extend_schema(tags=['Availability']),
    update_next_available=extend_schema(tags=['Availability'])
)
class AvailabilityViewSet(viewsets.ViewSet):
    """
    ViewSet for managing practitioner availability.
    Handles availability queries, schedule preferences, and out-of-office periods.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['get'])
    def check(self, request):
        """
        Check practitioner availability for a date range.
        Returns available time slots based on schedules and existing bookings.
        """
        # Validate query parameters
        serializer = AvailabilityQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        query_params = serializer.validated_data
        
        # Get practitioner
        practitioner_id = request.query_params.get('practitioner_id')
        if not practitioner_id:
            return Response(
                {"detail": "practitioner_id is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            practitioner = Practitioner.objects.get(
                id=practitioner_id,
                is_verified=True,
                practitioner_status='active'
            )
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "Practitioner not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate availability
        # TODO: Implement AvailabilityCalculator
        # calculator = AvailabilityCalculator(practitioner)
        # available_slots = calculator.get_available_slots(
        #     start_date=query_params['start_date'],
        #     end_date=query_params['end_date'],
        #     service_id=query_params.get('service_id'),
        #     duration_minutes=query_params.get('duration_minutes'),
        #     timezone_str=query_params.get('timezone', 'UTC')
        # )
        
        # For now, return empty availability
        available_slots = []
        
        # Serialize results
        serializer = AvailabilitySlotSerializer(available_slots, many=True)
        return Response({
            'practitioner_id': practitioner.id,
            'timezone': query_params.get('timezone', 'UTC'),
            'available_slots': serializer.data
        })
    
    @action(detail=False, methods=['get', 'put'], permission_classes=[IsPractitionerOwner])
    def preferences(self, request):
        """Get or update schedule preferences"""
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            preference, created = SchedulePreference.objects.get_or_create(
                practitioner=practitioner
            )
            serializer = SchedulePreferenceSerializer(preference)
            return Response(serializer.data)
        
        else:  # PUT
            preference, created = SchedulePreference.objects.get_or_create(
                practitioner=practitioner
            )
            serializer = SchedulePreferenceSerializer(
                preference,
                data=request.data,
                partial=True
            )
            serializer.is_valid(raise_exception=True)
            serializer.save()
            return Response(serializer.data)
    
    @action(detail=False, methods=['get', 'post'], permission_classes=[IsPractitionerOwner])
    def out_of_office(self, request):
        """Manage out-of-office periods"""
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        if request.method == 'GET':
            periods = OutOfOffice.objects.filter(
                practitioner=practitioner,
                is_archived=False
            ).order_by('from_date')
            serializer = OutOfOfficeSerializer(periods, many=True)
            return Response(serializer.data)
        
        else:  # POST
            serializer = OutOfOfficeSerializer(data=request.data)
            serializer.is_valid(raise_exception=True)
            serializer.save(practitioner=practitioner)
            return Response(
                serializer.data,
                status=status.HTTP_201_CREATED
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsPractitionerOwner])
    def update_next_available(self, request):
        """Update practitioner's next available date"""
        try:
            practitioner = request.user.practitioner_profile
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Calculate next available date
        # TODO: Implement AvailabilityCalculator
        # calculator = AvailabilityCalculator(practitioner)
        # next_available = calculator.calculate_next_available_date()
        
        # For now, set next available to tomorrow
        next_available = timezone.now() + timedelta(days=1)
        
        # Update practitioner
        practitioner.next_available_date = next_available
        practitioner.save(update_fields=['next_available_date'])
        
        return Response({
            'next_available_date': next_available
        })


class CertificationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing certifications"""
    serializer_class = CertificationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get certifications based on user role:
        - Practitioners: Get their own certifications
        - Staff: Get all certifications
        - Others: Get all certifications (read-only)
        """
        from practitioners.models import Certification
        user = self.request.user
        
        if hasattr(user, 'practitioner_profile'):
            # For practitioners, return their own certifications
            return user.practitioner_profile.certifications.all().order_by('order')
        elif user.is_staff:
            # Staff can see all certifications
            return Certification.objects.all()
        else:
            # Others can see all certifications (read-only)
            return Certification.objects.all()
    
    def get_permissions(self):
        """Allow practitioners to manage their own certifications"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Check if user is a practitioner or admin
            if hasattr(self.request.user, 'practitioner_profile') or self.request.user.is_staff:
                return [IsAuthenticated()]
            else:
                from rest_framework.permissions import IsAdminUser
                return [IsAdminUser()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Create certification and associate with practitioner if applicable"""
        cert = serializer.save()
        if hasattr(self.request.user, 'practitioner_profile'):
            self.request.user.practitioner_profile.certifications.add(cert)
    
    def perform_destroy(self, instance):
        """Remove certification from practitioner before deleting"""
        if hasattr(self.request.user, 'practitioner_profile'):
            self.request.user.practitioner_profile.certifications.remove(instance)
        instance.delete()


class EducationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing education entries"""
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """
        Get education entries based on user role:
        - Practitioners: Get their own education entries
        - Staff: Get all education entries
        - Others: Get all education entries (read-only)
        """
        from practitioners.models import Education
        user = self.request.user
        
        if hasattr(user, 'practitioner_profile'):
            # For practitioners, return their own education entries
            return user.practitioner_profile.educations.all().order_by('order')
        elif user.is_staff:
            # Staff can see all education entries
            return Education.objects.all()
        else:
            # Others can see all education entries (read-only)
            return Education.objects.all()
    
    def get_permissions(self):
        """Allow practitioners to manage their own education entries"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Check if user is a practitioner or admin
            if hasattr(self.request.user, 'practitioner_profile') or self.request.user.is_staff:
                return [IsAuthenticated()]
            else:
                from rest_framework.permissions import IsAdminUser
                return [IsAdminUser()]
        return super().get_permissions()
    
    def perform_create(self, serializer):
        """Create education entry and associate with practitioner if applicable"""
        edu = serializer.save()
        if hasattr(self.request.user, 'practitioner_profile'):
            self.request.user.practitioner_profile.educations.add(edu)
    
    def perform_destroy(self, instance):
        """Remove education entry from practitioner before deleting"""
        if hasattr(self.request.user, 'practitioner_profile'):
            self.request.user.practitioner_profile.educations.remove(instance)
        instance.delete()


@extend_schema_view(
    start=extend_schema(tags=['Practitioner Applications']),
    status=extend_schema(tags=['Practitioner Applications']),
    complete_step=extend_schema(tags=['Practitioner Applications']),
    stripe_connect_status=extend_schema(tags=['Practitioner Applications']),
    stripe_connect_create=extend_schema(tags=['Practitioner Applications']),
    stripe_connect_refresh=extend_schema(tags=['Practitioner Applications']),
    stripe_connect_disconnect=extend_schema(tags=['Practitioner Applications'])
)
class PractitionerApplicationViewSet(viewsets.ViewSet):
    """
    ViewSet for practitioner application process.
    Handles the multi-step application and onboarding flow.
    """
    permission_classes = [IsAuthenticated]
    
    @action(detail=False, methods=['post'])
    def start(self, request):
        """Start practitioner application"""
        serializer = PractitionerApplicationSerializer(
            data=request.data,
            context={'request': request}
        )
        serializer.is_valid(raise_exception=True)
        practitioner = serializer.save()
        
        # Return the created profile with onboarding info
        response_data = PractitionerPrivateSerializer(practitioner).data
        response_data['onboarding'] = OnboardingProgressSerializer(
            practitioner.onboarding_progress
        ).data
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['get'])
    def status(self, request):
        """Get application status"""
        try:
            practitioner = request.user.practitioner_profile
            progress = practitioner.onboarding_progress
            
            return Response({
                'practitioner_status': practitioner.practitioner_status,
                'onboarding': OnboardingProgressSerializer(progress).data
            })
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "No practitioner application found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'])
    def complete_step(self, request):
        """Mark an onboarding step as complete"""
        step_name = request.data.get('step')
        if not step_name:
            return Response(
                {"detail": "step name is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            practitioner = request.user.practitioner_profile
            progress = practitioner.onboarding_progress
            
            # Add step to completed list if not already there
            if step_name not in progress.steps_completed:
                progress.steps_completed.append(step_name)
                progress.save()
            
            # Update current step based on completion
            # This logic should match your onboarding flow
            step_order = [
                'profile_completion',
                'document_verification',
                'background_check',
                'training_modules',
                'subscription_setup',
                'service_configuration'
            ]
            
            current_index = step_order.index(progress.current_step)
            if current_index < len(step_order) - 1:
                progress.current_step = step_order[current_index + 1]
                progress.save()
            
            # Check if all steps are complete
            if len(progress.steps_completed) >= len(step_order):
                progress.status = 'completed'
                progress.completed_at = timezone.now()
                progress.save()

                # Update practitioner status
                practitioner.is_onboarded = True
                practitioner.onboarding_completed_at = timezone.now()
                practitioner.save()

                # Send onboarding completion email
                try:
                    PractitionerEmailService.send_onboarding_completed_email(practitioner)
                except Exception as e:
                    # Log error but don't fail the request
                    import logging
                    logger = logging.getLogger(__name__)
                    logger.error(f"Failed to send onboarding completion email: {str(e)}")

            return Response(OnboardingProgressSerializer(progress).data)
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "No practitioner application found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def complete_onboarding(self, request):
        """
        Mark practitioner onboarding as complete and send confirmation email.
        This should be called when the practitioner finishes all onboarding steps.
        """
        try:
            practitioner = request.user.practitioner_profile

            # Check if already onboarded
            if practitioner.is_onboarded:
                return Response({
                    "detail": "Onboarding already completed",
                    "practitioner": {
                        "id": str(practitioner.id),
                        "is_onboarded": True,
                        "onboarding_completed_at": practitioner.onboarding_completed_at
                    }
                })

            # Mark as onboarded and activate
            practitioner.is_onboarded = True
            practitioner.onboarding_completed_at = timezone.now()
            practitioner.practitioner_status = 'active'
            practitioner.save()

            # Send onboarding completion email
            try:
                PractitionerEmailService.send_onboarding_completed_email(practitioner)
            except Exception as e:
                # Log error but don't fail the request
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f"Failed to send onboarding completion email to {practitioner.user.email}: {str(e)}")

            return Response({
                "detail": "Onboarding completed successfully",
                "practitioner": {
                    "id": str(practitioner.id),
                    "is_onboarded": True,
                    "onboarding_completed_at": practitioner.onboarding_completed_at
                }
            }, status=status.HTTP_200_OK)

        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "No practitioner profile found"},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def stripe_connect_status(self, request):
        """Get the current Stripe Connect status for the practitioner"""
        try:
            practitioner = request.user.practitioner_profile
            payment_profile = request.user.payment_profile
            
            # Check if Stripe account exists
            has_stripe_account = bool(payment_profile.stripe_account_id)
            
            response_data = {
                'has_stripe_account': has_stripe_account,
                'stripe_account_id': payment_profile.stripe_account_id if has_stripe_account else None,
                'is_connected': False,
                'charges_enabled': False,
                'payouts_enabled': False,
                'requirements': None
            }
            
            # If account exists, get details from Stripe
            if has_stripe_account:
                try:
                    from integrations.stripe.client import StripeClient
                    import stripe
                    
                    stripe_client = StripeClient()
                    stripe_client.initialize()
                    
                    account = stripe.Account.retrieve(payment_profile.stripe_account_id)
                    
                    response_data.update({
                        'is_connected': True,
                        'charges_enabled': account.charges_enabled,
                        'payouts_enabled': account.payouts_enabled,
                        'requirements': {
                            'currently_due': account.requirements.currently_due,
                            'eventually_due': account.requirements.eventually_due,
                            'current_deadline': account.requirements.current_deadline
                        } if account.requirements else None
                    })
                except Exception as e:
                    # Account might be invalid or disconnected
                    pass
            
            return Response(response_data)
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def stripe_connect_create(self, request):
        """Create a Stripe Connect account link for onboarding"""
        try:
            practitioner = request.user.practitioner_profile
            payment_profile = request.user.payment_profile
            
            from integrations.stripe.client import StripeClient
            import stripe
            from django.conf import settings
            
            stripe_client = StripeClient()
            stripe_client.initialize()
            
            # Create Stripe account if doesn't exist
            if not payment_profile.stripe_account_id:
                account = stripe.Account.create(
                    type='express',
                    country='US',  # TODO: Make this dynamic based on user location
                    email=request.user.email,
                    capabilities={
                        'card_payments': {'requested': True},
                        'transfers': {'requested': True},
                    },
                    metadata={
                        'practitioner_id': str(practitioner.id),
                        'user_id': str(request.user.id)
                    }
                )
                
                # Save the account ID
                payment_profile.stripe_account_id = account.id
                payment_profile.save()
            
            # Create account link
            account_link = stripe.AccountLink.create(
                account=payment_profile.stripe_account_id,
                refresh_url=f"{settings.FRONTEND_URL}/dashboard/practitioner/settings?tab=payment&refresh=true",
                return_url=f"{settings.FRONTEND_URL}/dashboard/practitioner/settings?tab=payment&success=true",
                type='account_onboarding'
            )
            
            return Response({
                'url': account_link.url,
                'expires_at': account_link.expires_at
            })
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"Failed to create Stripe Connect link: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def stripe_connect_refresh(self, request):
        """Create a new account link to continue onboarding or update account"""
        try:
            practitioner = request.user.practitioner_profile
            payment_profile = request.user.payment_profile
            
            if not payment_profile.stripe_account_id:
                return Response(
                    {"detail": "No Stripe account found. Please create one first."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            from integrations.stripe.client import StripeClient
            import stripe
            from django.conf import settings
            
            stripe_client = StripeClient()
            stripe_client.initialize()
            
            # Create account link for updating
            account_link = stripe.AccountLink.create(
                account=payment_profile.stripe_account_id,
                refresh_url=f"{settings.FRONTEND_URL}/dashboard/practitioner/settings?tab=payment&refresh=true",
                return_url=f"{settings.FRONTEND_URL}/dashboard/practitioner/settings?tab=payment&success=true",
                type='account_onboarding'
            )
            
            return Response({
                'url': account_link.url,
                'expires_at': account_link.expires_at
            })
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {"detail": f"Failed to create Stripe Connect link: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'], permission_classes=[IsAuthenticated])
    def stripe_connect_disconnect(self, request):
        """Disconnect the Stripe Connect account"""
        try:
            practitioner = request.user.practitioner_profile
            payment_profile = request.user.payment_profile
            
            if not payment_profile.stripe_account_id:
                return Response(
                    {"detail": "No Stripe account to disconnect"},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Note: In production, you might want to check for pending payouts
            # before allowing disconnection
            
            # Clear the stripe account ID
            payment_profile.stripe_account_id = None
            payment_profile.save()
            
            return Response({"detail": "Stripe account disconnected successfully"})
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "You are not registered as a practitioner"},
                status=status.HTTP_404_NOT_FOUND
            )


class SpecializationViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing specializations"""
    serializer_class = SpecializationSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Get all specializations"""
        from practitioners.models import Specialize
        return Specialize.objects.all().order_by('content')


class StyleViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing styles"""
    serializer_class = StyleSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Get all styles"""
        from practitioners.models import Style
        return Style.objects.all().order_by('content')


class TopicViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing topics"""
    serializer_class = TopicSerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Get all topics"""
        from practitioners.models import Topic
        return Topic.objects.all().order_by('content')


@extend_schema_view(
    list=extend_schema(tags=['Common']),
    retrieve=extend_schema(tags=['Common'])
)
class ModalityViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for viewing modalities"""
    serializer_class = ModalitySerializer
    permission_classes = [AllowAny]
    
    def get_queryset(self):
        """Get all modalities"""
        from common.models import Modality
        return Modality.objects.all().order_by('name')