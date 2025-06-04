from typing import Dict, List, Optional
from rest_framework import serializers
from .models import Post, PostComment, PostReaction, CommunityFollow, CommunityTopic
from apps.practitioners.serializers import PractitionerMinimalSerializer
from apps.users.serializers import UserMinimalSerializer
from django.utils.text import slugify
from drf_spectacular.utils import extend_schema_field


class PostReactionSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    
    class Meta:
        model = PostReaction
        fields = ['id', 'user', 'reaction_type', 'created_at']
        read_only_fields = ['id', 'created_at']


class PostCommentSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    replies = serializers.SerializerMethodField()
    
    class Meta:
        model = PostComment
        fields = ['id', 'user', 'content', 'created_at', 'updated_at', 'replies']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    @extend_schema_field({'type': 'array', 'items': {'$ref': '#/components/schemas/PostComment'}})
    def get_replies(self, obj) -> List[Dict]:
        # Only get direct replies (not nested)
        replies = obj.replies.filter(is_hidden=False).order_by('created_at')
        return PostCommentSerializer(replies, many=True, context=self.context).data


class CommunityTopicSerializer(serializers.ModelSerializer):
    """Serializer for community topics/hashtags."""
    
    class Meta:
        model = CommunityTopic
        fields = ['id', 'name', 'slug', 'description', 'post_count', 'is_featured', 'created_at']
        read_only_fields = ['id', 'post_count', 'created_at']
    
    def create(self, validated_data):
        # Auto-generate slug if not provided
        if 'slug' not in validated_data or not validated_data['slug']:
            validated_data['slug'] = slugify(validated_data['name'])
        return super().create(validated_data)


class PostDetailSerializer(serializers.ModelSerializer):
    practitioner = PractitionerMinimalSerializer(read_only=True)
    comments = serializers.SerializerMethodField()
    reactions = serializers.SerializerMethodField()
    user_reaction = serializers.SerializerMethodField()
    topics = CommunityTopicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'practitioner', 'title', 'content', 'media_url', 'media_type',
            'visibility', 'created_at', 'updated_at', 'is_pinned', 'is_featured',
            'like_count', 'heart_count', 'comment_count', 'comments', 'reactions',
            'user_reaction', 'topics'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'like_count', 'heart_count', 'comment_count']
    
    @extend_schema_field({'type': 'array', 'items': {'$ref': '#/components/schemas/PostComment'}})
    def get_comments(self, obj) -> List[Dict]:
        # Only get top-level comments (not replies)
        comments = obj.comments.filter(parent_comment=None, is_hidden=False).order_by('-created_at')
        return PostCommentSerializer(comments, many=True, context=self.context).data
    
    @extend_schema_field({'type': 'object', 'properties': {'like': {'type': 'integer'}, 'heart': {'type': 'integer'}}})
    def get_reactions(self, obj) -> Dict[str, int]:
        # Get reaction counts by type
        return {
            'like': obj.reactions.filter(reaction_type='like').count(),
            'heart': obj.reactions.filter(reaction_type='heart').count()
        }
    
    @extend_schema_field({'type': 'array', 'items': {'type': 'string'}})
    def get_user_reaction(self, obj) -> List[str]:
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_reactions = obj.reactions.filter(user=request.user)
            return [reaction.reaction_type for reaction in user_reactions]
        return []


class PostListSerializer(serializers.ModelSerializer):
    practitioner = PractitionerMinimalSerializer(read_only=True)
    user_reaction = serializers.SerializerMethodField()
    topics = CommunityTopicSerializer(many=True, read_only=True)
    
    class Meta:
        model = Post
        fields = [
            'id', 'practitioner', 'title', 'content', 'media_url', 'media_type',
            'visibility', 'created_at', 'is_pinned', 'is_featured',
            'like_count', 'heart_count', 'comment_count', 'user_reaction', 'topics'
        ]
        read_only_fields = ['id', 'created_at', 'like_count', 'heart_count', 'comment_count']
    
    @extend_schema_field({'type': 'array', 'items': {'type': 'string'}})
    def get_user_reaction(self, obj) -> List[str]:
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            user_reactions = obj.reactions.filter(user=request.user)
            return [reaction.reaction_type for reaction in user_reactions]
        return []


class PostCreateUpdateSerializer(serializers.ModelSerializer):
    service_ids = serializers.ListField(
        child=serializers.UUIDField(),
        required=False,
        write_only=True,
        help_text="List of service IDs for purchase-based visibility"
    )
    topic_ids = serializers.PrimaryKeyRelatedField(
        queryset=CommunityTopic.objects.all(),
        many=True,
        write_only=True,
        required=False,
        source='topics'
    )
    
    class Meta:
        model = Post
        fields = [
            'title', 'content', 'media_url', 'media_type',
            'visibility', 'is_pinned', 'service_ids', 'topic_ids'
        ]
    
    def create(self, validated_data):
        service_ids = validated_data.pop('service_ids', [])
        topic_ids = validated_data.pop('topic_ids', [])
        request = self.context.get('request')
        
        # Set practitioner from the authenticated user
        if request and hasattr(request.user, 'practitioner_profile'):
            validated_data['practitioner'] = request.user.practitioner_profile
        else:
            raise serializers.ValidationError("User must be a practitioner to create posts")
        
        post = Post.objects.create(**validated_data)
        
        # Add service visibility if provided and post is private
        if service_ids and validated_data.get('visibility') == 'private':
            from apps.services.models import Service
            from .models import PostPurchaseVisibility
            
            for service_id in service_ids:
                try:
                    service = Service.objects.get(id=service_id, practitioner=post.practitioner)
                    PostPurchaseVisibility.objects.create(post=post, service=service)
                except Service.DoesNotExist:
                    pass  # Skip services that don't exist or don't belong to this practitioner
        
        # Add topics
        if topic_ids:
            post.topics.set(topic_ids)
        
        return post
    
    def update(self, instance, validated_data):
        service_ids = validated_data.pop('service_ids', None)
        topic_ids = validated_data.pop('topic_ids', None)
        
        # Update the post fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update service visibility if provided and post is private
        if service_ids is not None and instance.visibility == 'private':
            from apps.services.models import Service
            from .models import PostPurchaseVisibility
            
            # Clear existing visibility settings
            instance.purchase_visibility.all().delete()
            
            # Add new visibility settings
            for service_id in service_ids:
                try:
                    service = Service.objects.get(id=service_id, practitioner=instance.practitioner)
                    PostPurchaseVisibility.objects.create(post=instance, service=service)
                except Service.DoesNotExist:
                    pass  # Skip services that don't exist or don't belong to this practitioner
        
        # Update topics if provided
        if topic_ids is not None:
            instance.topics.set(topic_ids)
        
        return instance


class CommunityFollowSerializer(serializers.ModelSerializer):
    user = UserMinimalSerializer(read_only=True)
    practitioner = PractitionerMinimalSerializer(read_only=True)
    
    class Meta:
        model = CommunityFollow
        fields = ['id', 'user', 'practitioner', 'created_at']
        read_only_fields = ['id', 'created_at']
