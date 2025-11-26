from rest_framework import serializers
from django.db import transaction
from django.utils import timezone
from reviews.models import Review, ReviewQuestion, ReviewAnswer, ReviewVote, ReviewReport
from practitioners.models import Practitioner
from services.models import Service
from bookings.models import Booking
from core.api.serializers import BaseModelSerializer


class ReviewQuestionSerializer(BaseModelSerializer):
    """Serializer for review questions"""
    
    class Meta:
        model = ReviewQuestion
        fields = [
            'id', 'question', 'description', 'is_required',
            'question_type', 'order', 'is_active', 'applies_to',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class ReviewAnswerSerializer(BaseModelSerializer):
    """Serializer for review answers"""
    question = ReviewQuestionSerializer(read_only=True)
    question_id = serializers.IntegerField(write_only=True)
    
    class Meta:
        model = ReviewAnswer
        fields = [
            'id', 'question', 'question_id', 'rating_answer',
            'text_answer', 'boolean_answer', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate(self, attrs):
        """Validate answer matches question type"""
        question_id = attrs.get('question_id')
        try:
            question = ReviewQuestion.objects.get(id=question_id)
        except ReviewQuestion.DoesNotExist:
            raise serializers.ValidationError({"question_id": "Invalid question ID"})
        
        # Validate answer type matches question type
        if question.question_type == 'rating':
            if attrs.get('rating_answer') is None:
                raise serializers.ValidationError({"rating_answer": "Rating answer is required for rating questions"})
        elif question.question_type == 'text':
            if not attrs.get('text_answer'):
                raise serializers.ValidationError({"text_answer": "Text answer is required for text questions"})
        elif question.question_type == 'boolean':
            if attrs.get('boolean_answer') is None:
                raise serializers.ValidationError({"boolean_answer": "Boolean answer is required for yes/no questions"})
        
        return attrs


class ReviewVoteSerializer(BaseModelSerializer):
    """Serializer for review votes"""
    user_display_name = serializers.SerializerMethodField()
    
    class Meta:
        model = ReviewVote
        fields = [
            'id', 'is_helpful', 'user_display_name',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'user_display_name', 'created_at', 'updated_at']
    
    def get_user_display_name(self, obj):
        """Get display name of voting user if not anonymous"""
        return obj.user.get_full_name() or obj.user.email


class ReviewReportSerializer(BaseModelSerializer):
    """Serializer for review reports"""
    
    class Meta:
        model = ReviewReport
        fields = [
            'id', 'reason', 'details', 'is_resolved', 'resolved_at',
            'resolution_notes', 'created_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'is_resolved', 'resolved_at', 'resolution_notes',
            'created_at', 'updated_at'
        ]


class ReviewListSerializer(BaseModelSerializer):
    """Serializer for listing reviews with minimal data"""
    practitioner_name = serializers.SerializerMethodField()
    service_name = serializers.SerializerMethodField()
    display_name = serializers.ReadOnlyField()
    user_avatar_url = serializers.SerializerMethodField()
    has_response = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = [
            'public_uuid', 'rating', 'comment', 'practitioner_name',
            'service_name', 'display_name', 'user_avatar_url',
            'is_anonymous', 'is_verified', 'helpful_votes',
            'unhelpful_votes', 'created_at', 'has_response'
        ]
        read_only_fields = fields
    
    def get_practitioner_name(self, obj):
        """Get practitioner display name"""
        return obj.practitioner.display_name if obj.practitioner else None
    
    def get_service_name(self, obj):
        """Get service name"""
        return obj.service.name if obj.service else None
    
    def get_user_avatar_url(self, obj):
        """Get user avatar URL if not anonymous"""
        if obj.is_anonymous:
            return None
        # Assuming user model has avatar_url field
        return getattr(obj.user, 'avatar_url', None)
    
    def get_has_response(self, obj):
        """Check if review has a practitioner response"""
        return bool(obj.response_text)


class ReviewDetailSerializer(ReviewListSerializer):
    """Detailed serializer for individual review"""
    answers = ReviewAnswerSerializer(many=True, read_only=True)
    practitioner = serializers.SerializerMethodField()
    service = serializers.SerializerMethodField()
    booking = serializers.SerializerMethodField()
    user_vote = serializers.SerializerMethodField()
    
    class Meta:
        model = Review
        fields = ReviewListSerializer.Meta.fields + [
            'answers', 'practitioner', 'service', 'booking',
            'user_vote', 'net_helpful_votes', 'updated_at',
            'response_text', 'response_date'
        ]
        read_only_fields = fields
    
    def get_practitioner(self, obj):
        """Get basic practitioner info"""
        if not obj.practitioner:
            return None
        return {
            'public_uuid': obj.practitioner.public_uuid,
            'display_name': obj.practitioner.display_name,
            'professional_title': obj.practitioner.professional_title,
            'profile_image_url': obj.practitioner.profile_image_url
        }
    
    def get_service(self, obj):
        """Get basic service info"""
        if not obj.service:
            return None
        return {
            'public_uuid': obj.service.public_uuid,
            'name': obj.service.name,
            'description': obj.service.description
        }
    
    def get_booking(self, obj):
        """Get basic booking info"""
        if not obj.booking:
            return None
        # Note: start_time and end_time are now on ServiceSession, use accessor methods
        return {
            'public_uuid': obj.booking.public_uuid,
            'start_time': obj.booking.get_start_time(),
            'end_time': obj.booking.get_end_time()
        }
    
    def get_user_vote(self, obj):
        """Get current user's vote on this review"""
        request = self.context.get('request')
        if not request or not request.user.is_authenticated:
            return None
        
        vote = obj.votes.filter(user=request.user).first()
        if vote:
            return {'is_helpful': vote.is_helpful}
        return None


class ReviewCreateSerializer(BaseModelSerializer):
    """Serializer for creating reviews"""
    practitioner_uuid = serializers.UUIDField(write_only=True, required=False)
    service_uuid = serializers.UUIDField(write_only=True, required=False)
    booking_uuid = serializers.UUIDField(write_only=True, required=False)
    answers = ReviewAnswerSerializer(many=True, required=False)
    
    class Meta:
        model = Review
        fields = [
            'public_uuid', 'rating', 'comment', 'practitioner_uuid',
            'service_uuid', 'booking_uuid', 'is_anonymous',
            'answers', 'created_at'
        ]
        read_only_fields = ['public_uuid', 'created_at']
    
    def validate_rating(self, value):
        """Validate rating is between 0 and 5"""
        if value < 0 or value > 5:
            raise serializers.ValidationError("Rating must be between 0 and 5")
        return value
    
    def validate(self, attrs):
        """Validate review data"""
        practitioner_uuid = attrs.get('practitioner_uuid')
        service_uuid = attrs.get('service_uuid')
        booking_uuid = attrs.get('booking_uuid')
        
        # Ensure at least practitioner or service is provided
        if not practitioner_uuid and not service_uuid:
            raise serializers.ValidationError(
                "Review must be for either a practitioner or service"
            )
        
        # Validate practitioner exists
        if practitioner_uuid:
            try:
                practitioner = Practitioner.objects.get(public_uuid=practitioner_uuid)
                attrs['practitioner'] = practitioner
            except Practitioner.DoesNotExist:
                raise serializers.ValidationError({"practitioner_uuid": "Invalid practitioner"})
        
        # Validate service exists
        if service_uuid:
            try:
                service = Service.objects.get(public_uuid=service_uuid)
                attrs['service'] = service
            except Service.DoesNotExist:
                raise serializers.ValidationError({"service_uuid": "Invalid service"})
        
        # Validate booking if provided
        if booking_uuid:
            try:
                user = self.context['request'].user
                booking = Booking.objects.get(
                    public_uuid=booking_uuid,
                    user=user,
                    status='completed'
                )
                
                # Check if review already exists for this booking
                if Review.objects.filter(booking=booking, user=user).exists():
                    raise serializers.ValidationError(
                        {"booking_uuid": "Review already exists for this booking"}
                    )
                
                # Ensure booking matches practitioner/service
                if practitioner_uuid and booking.practitioner != attrs['practitioner']:
                    raise serializers.ValidationError(
                        {"booking_uuid": "Booking practitioner doesn't match"}
                    )
                if service_uuid and booking.service != attrs['service']:
                    raise serializers.ValidationError(
                        {"booking_uuid": "Booking service doesn't match"}
                    )
                
                attrs['booking'] = booking
                # Auto-populate practitioner and service from booking
                if not practitioner_uuid:
                    attrs['practitioner'] = booking.practitioner
                if not service_uuid:
                    attrs['service'] = booking.service
                    
            except Booking.DoesNotExist:
                raise serializers.ValidationError(
                    {"booking_uuid": "Invalid booking or booking not completed"}
                )
        
        # Remove UUID fields as we've converted to model instances
        attrs.pop('practitioner_uuid', None)
        attrs.pop('service_uuid', None)
        attrs.pop('booking_uuid', None)
        
        return attrs
    
    @transaction.atomic
    def create(self, validated_data):
        """Create review with answers"""
        answers_data = validated_data.pop('answers', [])
        validated_data['user'] = self.context['request'].user
        
        # Create review
        review = Review.objects.create(**validated_data)
        
        # Create answers if provided
        for answer_data in answers_data:
            answer_data['review'] = review
            ReviewAnswer.objects.create(**answer_data)
        
        return review


class ReviewUpdateSerializer(BaseModelSerializer):
    """Serializer for updating reviews (limited fields)"""
    
    class Meta:
        model = Review
        fields = ['comment', 'is_anonymous']
    
    def validate(self, attrs):
        """Ensure review can be updated"""
        instance = self.instance
        
        # Only allow updates within 24 hours of creation
        hours_since_creation = (timezone.now() - instance.created_at).total_seconds() / 3600
        if hours_since_creation > 24:
            raise serializers.ValidationError(
                "Reviews can only be edited within 24 hours of creation"
            )
        
        return attrs


class ReviewResponseSerializer(BaseModelSerializer):
    """Serializer for practitioner responses to reviews"""
    response_text = serializers.CharField(required=True, max_length=2000)
    
    class Meta:
        model = Review
        fields = ['response_text']
    
    def validate(self, attrs):
        """Validate practitioner can respond"""
        review = self.instance
        user = self.context['request'].user
        
        # Check if user is the practitioner
        if not hasattr(user, 'practitioner_profile'):
            raise serializers.ValidationError("Only practitioners can respond to reviews")
        
        if review.practitioner != user.practitioner_profile:
            raise serializers.ValidationError("You can only respond to your own reviews")
        
        # Check if already responded
        if review.response_text:
            raise serializers.ValidationError("You have already responded to this review")
        
        return attrs


class ReviewStatisticsSerializer(serializers.Serializer):
    """Serializer for review statistics"""
    total_reviews = serializers.IntegerField()
    average_rating = serializers.DecimalField(max_digits=3, decimal_places=2)
    rating_distribution = serializers.DictField(child=serializers.IntegerField())
    verified_reviews = serializers.IntegerField()
    total_helpful_votes = serializers.IntegerField()
    
    # Time-based stats
    reviews_last_30_days = serializers.IntegerField()
    reviews_last_90_days = serializers.IntegerField()
    
    # Breakdown by service (if applicable)
    service_ratings = serializers.ListField(
        child=serializers.DictField(),
        required=False
    )