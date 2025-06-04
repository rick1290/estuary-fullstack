from rest_framework import serializers
from apps.reviews.models import Review, ReviewQuestion, ReviewAnswer, ReviewVote, ReviewReport
from apps.users.api.v1.serializers import UserSerializer


class ReviewQuestionSerializer(serializers.ModelSerializer):
    """
    Serializer for review questions.
    """
    class Meta:
        model = ReviewQuestion
        fields = [
            'id', 'question', 'description', 'is_required', 'question_type',
            'order', 'is_active', 'applies_to', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class ReviewAnswerSerializer(serializers.ModelSerializer):
    """
    Serializer for review answers.
    """
    question_details = ReviewQuestionSerializer(source='question', read_only=True)
    
    class Meta:
        model = ReviewAnswer
        fields = [
            'id', 'question', 'question_details', 'rating_answer',
            'text_answer', 'boolean_answer', 'created_at'
        ]
        read_only_fields = ['id', 'created_at']
    
    def validate(self, data):
        """
        Validate that the answer matches the question type.
        """
        question = data.get('question')
        rating_answer = data.get('rating_answer')
        text_answer = data.get('text_answer')
        boolean_answer = data.get('boolean_answer')
        
        if question.question_type == 'rating' and rating_answer is None:
            raise serializers.ValidationError("Rating answer is required for rating questions")
        elif question.question_type == 'text' and not text_answer:
            raise serializers.ValidationError("Text answer is required for text questions")
        elif question.question_type == 'boolean' and boolean_answer is None:
            raise serializers.ValidationError("Boolean answer is required for yes/no questions")
        
        return data


class ReviewSerializer(serializers.ModelSerializer):
    """
    Serializer for reviews.
    """
    answers = ReviewAnswerSerializer(many=True, read_only=True)
    user_details = UserSerializer(source='user', read_only=True)
    
    class Meta:
        model = Review
        fields = [
            'id', 'created_at', 'updated_at', 'rating', 'comment',
            'practitioner', 'booking', 'user', 'user_details', 'service',
            'is_anonymous', 'is_verified', 'is_published', 'helpful_votes',
            'answers'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'user', 'is_verified', 'helpful_votes']
    
    def create(self, validated_data):
        """
        Create a review and set the user from the request.
        """
        user = self.context['request'].user
        validated_data['user'] = user
        
        # Check if this is a verified booking review
        booking = validated_data.get('booking')
        if booking and booking.user == user:
            validated_data['is_verified'] = True
        
        return super().create(validated_data)


class ReviewCreateSerializer(serializers.ModelSerializer):
    """
    Serializer for creating reviews with answers.
    """
    answers = serializers.ListField(
        child=serializers.JSONField(),
        required=False,
        write_only=True
    )
    
    class Meta:
        model = Review
        fields = [
            'rating', 'comment', 'practitioner', 'booking', 'service',
            'is_anonymous', 'answers'
        ]
    
    def create(self, validated_data):
        answers_data = validated_data.pop('answers', [])
        user = self.context['request'].user
        
        # Create the review
        review = Review.objects.create(
            user=user,
            **validated_data
        )
        
        # Create the answers
        for answer_data in answers_data:
            question_id = answer_data.get('question')
            try:
                question = ReviewQuestion.objects.get(id=question_id)
                
                # Create answer based on question type
                if question.question_type == 'rating':
                    ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        rating_answer=answer_data.get('rating_answer')
                    )
                elif question.question_type == 'text':
                    ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        text_answer=answer_data.get('text_answer')
                    )
                elif question.question_type == 'boolean':
                    ReviewAnswer.objects.create(
                        review=review,
                        question=question,
                        boolean_answer=answer_data.get('boolean_answer')
                    )
            except ReviewQuestion.DoesNotExist:
                pass  # Skip invalid questions
        
        return review


class ReviewVoteSerializer(serializers.ModelSerializer):
    """
    Serializer for review votes.
    """
    class Meta:
        model = ReviewVote
        fields = ['id', 'review', 'is_helpful', 'created_at']
        read_only_fields = ['id', 'created_at', 'user']
    
    def create(self, validated_data):
        """
        Create or update a vote.
        """
        user = self.context['request'].user
        review = validated_data.get('review')
        is_helpful = validated_data.get('is_helpful')
        
        # Check if user already voted on this review
        vote, created = ReviewVote.objects.update_or_create(
            user=user,
            review=review,
            defaults={'is_helpful': is_helpful}
        )
        
        # Update the helpful_votes count on the review
        helpful_votes = ReviewVote.objects.filter(review=review, is_helpful=True).count()
        review.helpful_votes = helpful_votes
        review.save(update_fields=['helpful_votes'])
        
        return vote


class ReviewReportSerializer(serializers.ModelSerializer):
    """
    Serializer for review reports.
    """
    class Meta:
        model = ReviewReport
        fields = ['id', 'review', 'reason', 'details', 'created_at', 'is_resolved']
        read_only_fields = ['id', 'created_at', 'is_resolved', 'user']
    
    def create(self, validated_data):
        """
        Create a report and set the user from the request.
        """
        validated_data['user'] = self.context['request'].user
        return super().create(validated_data)
