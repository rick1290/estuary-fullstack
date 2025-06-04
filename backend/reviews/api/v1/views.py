from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from drf_spectacular.utils import extend_schema, OpenApiParameter

from apps.reviews.models import Review, ReviewQuestion, ReviewAnswer, ReviewVote, ReviewReport
from apps.reviews.api.v1.serializers import (
    ReviewSerializer, ReviewQuestionSerializer, ReviewAnswerSerializer,
    ReviewVoteSerializer, ReviewReportSerializer, ReviewCreateSerializer
)
from apps.utils.permissions import IsOwnerOrReadOnly


class ReviewQuestionViewSet(viewsets.ReadOnlyModelViewSet):
    """
    ViewSet for viewing review questions.
    """
    queryset = ReviewQuestion.objects.filter(is_active=True).order_by('order')
    serializer_class = ReviewQuestionSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [DjangoFilterBackend]
    filterset_fields = ['applies_to', 'question_type']
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='applies_to', description='Filter by what the question applies to (service, practitioner, both)', required=False, type=str),
            OpenApiParameter(name='question_type', description='Filter by question type (rating, text, boolean)', required=False, type=str)
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)


class ReviewViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing reviews.
    """
    queryset = Review.objects.filter(is_published=True).order_by('-created_at')
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['practitioner', 'service', 'user', 'is_verified']
    ordering_fields = ['created_at', 'rating', 'helpful_votes']
    ordering = ['-created_at']
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsOwnerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ReviewCreateSerializer
        return ReviewSerializer
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by minimum rating
        min_rating = self.request.query_params.get('min_rating')
        if min_rating:
            try:
                queryset = queryset.filter(rating__gte=float(min_rating))
            except ValueError:
                pass
        
        # Filter by maximum rating
        max_rating = self.request.query_params.get('max_rating')
        if max_rating:
            try:
                queryset = queryset.filter(rating__lte=float(max_rating))
            except ValueError:
                pass
        
        return queryset
    
    @extend_schema(
        parameters=[
            OpenApiParameter(name='practitioner', description='Filter by practitioner ID', required=False, type=str),
            OpenApiParameter(name='service', description='Filter by service ID', required=False, type=str),
            OpenApiParameter(name='min_rating', description='Filter by minimum rating', required=False, type=float),
            OpenApiParameter(name='max_rating', description='Filter by maximum rating', required=False, type=float),
            OpenApiParameter(name='is_verified', description='Filter by verified status', required=False, type=bool)
        ]
    )
    def list(self, request, *args, **kwargs):
        return super().list(request, *args, **kwargs)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def my_reviews(self, request):
        """
        Return reviews created by the current user.
        """
        reviews = Review.objects.filter(user=request.user).order_by('-created_at')
        serializer = self.get_serializer(reviews, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'], permission_classes=[permissions.IsAuthenticated])
    def pending(self, request):
        """
        Return services/practitioners that the user has booked but not yet reviewed.
        This helps identify what the user can review.
        """
        from apps.bookings.models import Booking
        
        # Get completed bookings that don't have reviews
        completed_bookings = Booking.objects.filter(
            user=request.user,
            status='completed',
            reviews__isnull=True
        ).select_related('service', 'service__practitioner')
        
        # Prepare the response data
        pending_reviews = []
        for booking in completed_bookings:
            pending_reviews.append({
                'booking_id': booking.id,
                'service_id': booking.service.id,
                'service_name': booking.service.title,
                'practitioner_id': booking.service.practitioner.user.id,
                'practitioner_name': booking.service.practitioner.user.full_name,
                'session_date': booking.start_time,
            })
        
        return Response(pending_reviews)


class ReviewVoteViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing review votes.
    """
    serializer_class = ReviewVoteSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ReviewVote.objects.filter(user=self.request.user)
    
    @action(detail=False, methods=['post'])
    def toggle(self, request):
        """
        Toggle helpful/unhelpful vote for a review.
        """
        review_id = request.data.get('review')
        is_helpful = request.data.get('is_helpful', True)
        
        if not review_id:
            return Response(
                {"error": "Review ID is required"},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            review = Review.objects.get(id=review_id)
        except Review.DoesNotExist:
            return Response(
                {"error": "Review not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Check if user already voted
        vote = ReviewVote.objects.filter(
            user=request.user,
            review=review
        ).first()
        
        if vote:
            # If vote exists with same value, remove it
            if vote.is_helpful == is_helpful:
                vote.delete()
                # Update helpful_votes count
                helpful_votes = ReviewVote.objects.filter(review=review, is_helpful=True).count()
                review.helpful_votes = helpful_votes
                review.save(update_fields=['helpful_votes'])
                return Response({"status": "vote_removed"})
            else:
                # If vote exists with different value, update it
                vote.is_helpful = is_helpful
                vote.save()
        else:
            # Create new vote
            vote = ReviewVote.objects.create(
                user=request.user,
                review=review,
                is_helpful=is_helpful
            )
        
        # Update helpful_votes count
        helpful_votes = ReviewVote.objects.filter(review=review, is_helpful=True).count()
        review.helpful_votes = helpful_votes
        review.save(update_fields=['helpful_votes'])
        
        return Response({
            "status": "voted",
            "is_helpful": vote.is_helpful
        })


class ReviewReportViewSet(viewsets.ModelViewSet):
    """
    ViewSet for reporting inappropriate reviews.
    """
    serializer_class = ReviewReportSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        return ReviewReport.objects.filter(user=self.request.user)
