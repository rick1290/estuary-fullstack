from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django.db.models import Avg, Count, Q, F
from django.utils import timezone
from django_filters import rest_framework as django_filters
from datetime import timedelta

from reviews.models import Review, ReviewQuestion, ReviewVote, ReviewReport
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking
from .serializers import (
    ReviewListSerializer, ReviewDetailSerializer, ReviewCreateSerializer,
    ReviewUpdateSerializer, ReviewResponseSerializer, ReviewStatisticsSerializer,
    ReviewQuestionSerializer, ReviewVoteSerializer, ReviewReportSerializer
)
from .permissions import (
    IsOwnerOrReadOnly, CanCreateReview, CanRespondToReview,
    IsStaffOrReadOnly
)


class ReviewFilter(django_filters.FilterSet):
    """Filter for reviews"""
    practitioner = django_filters.UUIDFilter(field_name='practitioner__public_uuid')
    service = django_filters.UUIDFilter(field_name='service__public_uuid')
    user = django_filters.UUIDFilter(field_name='user__public_uuid')
    min_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='gte')
    max_rating = django_filters.NumberFilter(field_name='rating', lookup_expr='lte')
    is_verified = django_filters.BooleanFilter()
    is_anonymous = django_filters.BooleanFilter()
    has_response = django_filters.BooleanFilter(method='filter_has_response')
    created_after = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='gte')
    created_before = django_filters.DateTimeFilter(field_name='created_at', lookup_expr='lte')
    
    class Meta:
        model = Review
        fields = [
            'practitioner', 'service', 'user', 'rating',
            'is_verified', 'is_anonymous', 'is_published'
        ]
    
    def filter_has_response(self, queryset, name, value):
        """Filter reviews that have practitioner responses"""
        if value:
            return queryset.exclude(response_text__isnull=True).exclude(response_text='')
        else:
            return queryset.filter(Q(response_text__isnull=True) | Q(response_text=''))


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for Review CRUD operations
    
    list: Get all published reviews (filterable)
    create: Create a new review (requires completed booking)
    retrieve: Get a specific review
    update: Update own review (limited fields, within 24 hours)
    destroy: Soft delete own review (within 24 hours)
    
    Custom actions:
    - vote: Vote helpful/unhelpful on a review
    - report: Report a review for moderation
    - respond: Practitioner response to review
    - statistics: Get aggregate statistics
    """
    serializer_class = ReviewDetailSerializer
    permission_classes = [IsOwnerOrReadOnly]
    filterset_class = ReviewFilter
    filter_backends = [django_filters.DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['comment', 'user__first_name', 'user__last_name', 'user__email']
    ordering_fields = ['created_at', 'rating', 'helpful_votes', 'net_helpful_votes']
    ordering = ['-created_at']
    lookup_field = 'public_uuid'
    
    def get_queryset(self):
        """Get reviews based on user permissions"""
        queryset = Review.objects.select_related(
            'user', 'practitioner', 'service', 'booking'
        ).prefetch_related('answers__question', 'votes')
        
        # Only show published reviews to non-staff
        if not self.request.user.is_staff:
            queryset = queryset.filter(is_published=True)
        
        return queryset
    
    def get_serializer_class(self):
        """Return appropriate serializer based on action"""
        if self.action == 'list':
            return ReviewListSerializer
        elif self.action == 'create':
            return ReviewCreateSerializer
        elif self.action in ['update', 'partial_update']:
            return ReviewUpdateSerializer
        elif self.action == 'respond':
            return ReviewResponseSerializer
        elif self.action == 'statistics':
            return ReviewStatisticsSerializer
        return self.serializer_class
    
    def get_permissions(self):
        """Return appropriate permissions based on action"""
        if self.action == 'create':
            return [IsAuthenticated(), CanCreateReview()]
        elif self.action == 'respond':
            return [IsAuthenticated(), CanRespondToReview()]
        elif self.action in ['update', 'partial_update', 'destroy']:
            return [IsAuthenticated(), IsOwnerOrReadOnly()]
        elif self.action in ['vote', 'report']:
            return [IsAuthenticated()]
        return [AllowAny()]
    
    @action(detail=True, methods=['post'])
    def vote(self, request, public_uuid=None):
        """Vote helpful or unhelpful on a review"""
        review = self.get_object()
        is_helpful = request.data.get('is_helpful')
        
        if is_helpful is None:
            return Response(
                {"error": "is_helpful field is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if user is voting on their own review
        if review.user == request.user:
            return Response(
                {"error": "You cannot vote on your own review"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create or update vote
        vote, created = ReviewVote.objects.update_or_create(
            review=review,
            user=request.user,
            defaults={'is_helpful': is_helpful}
        )
        
        serializer = ReviewVoteSerializer(vote)
        return Response(serializer.data, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['delete'])
    def unvote(self, request, public_uuid=None):
        """Remove vote from a review"""
        review = self.get_object()
        
        try:
            vote = ReviewVote.objects.get(review=review, user=request.user)
            vote.delete()
            return Response(status=status.HTTP_204_NO_CONTENT)
        except ReviewVote.DoesNotExist:
            return Response(
                {"error": "Vote not found"},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'])
    def report(self, request, public_uuid=None):
        """Report a review for moderation"""
        review = self.get_object()
        
        # Check if user is reporting their own review
        if review.user == request.user:
            return Response(
                {"error": "You cannot report your own review"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already reported by this user
        if ReviewReport.objects.filter(review=review, user=request.user).exists():
            return Response(
                {"error": "You have already reported this review"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        serializer = ReviewReportSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(review=review, user=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=True, methods=['post'])
    def respond(self, request, public_uuid=None):
        """Practitioner response to a review"""
        review = self.get_object()
        serializer = self.get_serializer(review, data=request.data)
        
        if serializer.is_valid():
            # Add response to review (assuming we add response fields to model)
            review.response_text = serializer.validated_data['response_text']
            review.response_date = timezone.now()
            review.save()
            
            return Response(
                {"message": "Response added successfully"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
    
    @action(detail=False, methods=['get'])
    def statistics(self, request):
        """Get review statistics for a practitioner or service"""
        practitioner_uuid = request.query_params.get('practitioner')
        service_uuid = request.query_params.get('service')
        
        if not practitioner_uuid and not service_uuid:
            return Response(
                {"error": "Either practitioner or service UUID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Base queryset
        queryset = Review.objects.filter(is_published=True)
        
        if practitioner_uuid:
            queryset = queryset.filter(practitioner__public_uuid=practitioner_uuid)
        if service_uuid:
            queryset = queryset.filter(service__public_uuid=service_uuid)
        
        # Calculate statistics
        total_reviews = queryset.count()
        
        if total_reviews == 0:
            stats = {
                'total_reviews': 0,
                'average_rating': 0,
                'rating_distribution': {str(i): 0 for i in range(1, 6)},
                'verified_reviews': 0,
                'total_helpful_votes': 0,
                'reviews_last_30_days': 0,
                'reviews_last_90_days': 0
            }
        else:
            # Get aggregate data
            aggregates = queryset.aggregate(
                average_rating=Avg('rating'),
                verified_reviews=Count('id', filter=Q(is_verified=True)),
                total_helpful_votes=Count('votes', filter=Q(votes__is_helpful=True))
            )
            
            # Rating distribution
            rating_distribution = {}
            for i in range(1, 6):
                count = queryset.filter(rating__gte=i, rating__lt=i+1).count()
                rating_distribution[str(i)] = count
            
            # Time-based stats
            now = timezone.now()
            reviews_last_30_days = queryset.filter(
                created_at__gte=now - timedelta(days=30)
            ).count()
            reviews_last_90_days = queryset.filter(
                created_at__gte=now - timedelta(days=90)
            ).count()
            
            stats = {
                'total_reviews': total_reviews,
                'average_rating': round(aggregates['average_rating'], 2),
                'rating_distribution': rating_distribution,
                'verified_reviews': aggregates['verified_reviews'],
                'total_helpful_votes': aggregates['total_helpful_votes'],
                'reviews_last_30_days': reviews_last_30_days,
                'reviews_last_90_days': reviews_last_90_days
            }
            
            # Add service breakdown if for practitioner
            if practitioner_uuid and not service_uuid:
                service_ratings = []
                services = Service.objects.filter(
                    reviews__practitioner__public_uuid=practitioner_uuid,
                    reviews__is_published=True
                ).distinct()
                
                for service in services:
                    service_reviews = queryset.filter(service=service)
                    if service_reviews.exists():
                        service_data = service_reviews.aggregate(
                            average_rating=Avg('rating'),
                            total_reviews=Count('id')
                        )
                        service_ratings.append({
                            'service_uuid': str(service.public_uuid),
                            'service_name': service.name,
                            'average_rating': round(service_data['average_rating'], 2),
                            'total_reviews': service_data['total_reviews']
                        })
                
                stats['service_ratings'] = service_ratings
        
        serializer = ReviewStatisticsSerializer(stats)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def my_reviews(self, request):
        """Get reviews written by the current user"""
        if not request.user.is_authenticated:
            return Response(
                {"error": "Authentication required"},
                status=status.HTTP_401_UNAUTHORIZED
            )
        
        reviews = self.get_queryset().filter(user=request.user)
        page = self.paginate_queryset(reviews)
        
        if page is not None:
            serializer = self.get_serializer(page, many=True)
            return self.get_paginated_response(serializer.data)
        
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def can_review(self, request):
        """Check if user can review a practitioner/service"""
        practitioner_uuid = request.query_params.get('practitioner')
        service_uuid = request.query_params.get('service')
        
        if not request.user.is_authenticated:
            return Response({"can_review": False, "reason": "Authentication required"})
        
        # Check for completed bookings
        bookings = Booking.objects.filter(
            user=request.user,
            status='completed'
        )
        
        if practitioner_uuid:
            bookings = bookings.filter(practitioner__public_uuid=practitioner_uuid)
        if service_uuid:
            bookings = bookings.filter(service__public_uuid=service_uuid)
        
        # Check if any booking doesn't have a review yet
        for booking in bookings:
            if not Review.objects.filter(booking=booking, user=request.user).exists():
                return Response({
                    "can_review": True,
                    "booking_uuid": str(booking.public_uuid)
                })
        
        return Response({
            "can_review": False,
            "reason": "No completed bookings without reviews"
        })


class ReviewQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """ViewSet for review questions (read-only for non-staff)"""
    queryset = ReviewQuestion.objects.filter(is_active=True).order_by('order')
    serializer_class = ReviewQuestionSerializer
    permission_classes = [IsStaffOrReadOnly]
    
    def get_queryset(self):
        """Filter questions based on applies_to parameter"""
        queryset = super().get_queryset()
        applies_to = self.request.query_params.get('applies_to')
        
        if applies_to in ['service', 'practitioner']:
            queryset = queryset.filter(
                Q(applies_to=applies_to) | Q(applies_to='both')
            )
        
        return queryset