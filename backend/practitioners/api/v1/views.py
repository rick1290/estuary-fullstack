"""
DRF ViewSets for Practitioners API
"""
from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Q, Avg, Count, Min, Max, Prefetch
from django.db import transaction
from django.utils import timezone
from django.shortcuts import get_object_or_404
from datetime import datetime, timedelta
from drf_spectacular.utils import extend_schema, extend_schema_view

from practitioners.models import (
    Practitioner, Schedule, ScheduleTimeSlot, SchedulePreference,
    OutOfOffice, VerificationDocument, PractitionerOnboardingProgress
)
# from practitioners.utils.availability import AvailabilityCalculator
from bookings.models import Booking
from services.models import Service

from .serializers import (
    PractitionerListSerializer, PractitionerDetailSerializer,
    PractitionerPrivateSerializer, PractitionerUpdateSerializer,
    PractitionerApplicationSerializer, ScheduleSerializer,
    ScheduleCreateSerializer, SchedulePreferenceSerializer,
    OutOfOfficeSerializer, OnboardingProgressSerializer,
    AvailabilitySlotSerializer, AvailabilityQuerySerializer,
    PractitionerSearchSerializer, VerificationDocumentSerializer,
    CertificationSerializer, EducationSerializer
)
from .permissions import IsPractitionerOwner, IsPractitionerOrReadOnly
from .filters import PractitionerFilter


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
    stats=extend_schema(tags=['Practitioners']),
    search=extend_schema(tags=['Practitioners'])
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
        if self.action in ['list', 'retrieve']:
            permission_classes = [AllowAny]
        elif self.action == 'apply':
            permission_classes = [IsAuthenticated]
        elif self.action in ['update', 'partial_update', 'destroy']:
            permission_classes = [IsPractitionerOwner]
        else:
            permission_classes = [IsAuthenticated]
        return [permission() for permission in permission_classes]
    
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
        calculator = AvailabilityCalculator(practitioner)
        available_slots = calculator.get_available_slots(
            start_date=query_params['start_date'],
            end_date=query_params['end_date'],
            service_id=query_params.get('service_id'),
            duration_minutes=query_params.get('duration_minutes'),
            timezone_str=query_params.get('timezone', 'UTC')
        )
        
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
        calculator = AvailabilityCalculator(practitioner)
        next_available = calculator.calculate_next_available_date()
        
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
        """Get all certifications (read-only for non-staff)"""
        from practitioners.models import Certification
        return Certification.objects.all()
    
    def get_permissions(self):
        """Only staff can create/update/delete certifications"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()


class EducationViewSet(viewsets.ModelViewSet):
    """ViewSet for managing education entries"""
    serializer_class = EducationSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        """Get all education entries (read-only for non-staff)"""
        from practitioners.models import Education
        return Education.objects.all()
    
    def get_permissions(self):
        """Only staff can create/update/delete education entries"""
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            from rest_framework.permissions import IsAdminUser
            return [IsAdminUser()]
        return super().get_permissions()


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
            
            return Response(OnboardingProgressSerializer(progress).data)
            
        except Practitioner.DoesNotExist:
            return Response(
                {"detail": "No practitioner application found"},
                status=status.HTTP_404_NOT_FOUND
            )