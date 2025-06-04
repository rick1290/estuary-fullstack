from rest_framework import viewsets, permissions, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Q, Count, Exists, OuterRef
from django.utils import timezone
from django.shortcuts import get_object_or_404

from .models import (
    Post, PostComment, PostReaction, CommunityFollow, CommunityTopic
)
from .serializers import (
    PostListSerializer, PostDetailSerializer, PostCreateUpdateSerializer,
    PostCommentSerializer, PostReactionSerializer, CommunityFollowSerializer,
    CommunityTopicSerializer
)


class IsPostOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a post to edit or delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the practitioner who owns the post
        return hasattr(request.user, 'practitioner_profile') and obj.practitioner == request.user.practitioner_profile


class IsCommentOwnerOrReadOnly(permissions.BasePermission):
    """
    Custom permission to only allow owners of a comment to edit or delete it.
    """
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed to any request
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the user who created the comment
        return obj.user == request.user


class PostViewSet(viewsets.ModelViewSet):
    """
    API endpoint for community posts.
    """
    queryset = Post.objects.filter(is_archived=False)
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsPostOwnerOrReadOnly]
    filter_backends = [filters.OrderingFilter, filters.SearchFilter]
    search_fields = ['title', 'content']
    ordering_fields = ['created_at', 'like_count', 'comment_count']
    ordering = ['-is_pinned', '-created_at']
    
    def get_serializer_class(self):
        if self.action == 'list':
            return PostListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return PostCreateUpdateSerializer
        return PostDetailSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = Post.objects.filter(is_archived=False)
        
        # If user is authenticated, filter based on visibility
        if user.is_authenticated:
            # For practitioners, show all their own posts
            if hasattr(user, 'practitioner_profile'):
                practitioner = user.practitioner_profile
                queryset = queryset.filter(
                    Q(visibility='public') |  # Public posts
                    Q(practitioner=practitioner) |  # Own posts
                    Q(visibility='followers', practitioner__in=user.community_follows.values('practitioner'))  # Posts from followed practitioners
                ).distinct()
            else:
                # For regular users, show public posts and posts from practitioners they've purchased from
                from apps.bookings.models import Booking
                
                # Get practitioners the user has booked with
                booked_practitioners = Booking.objects.filter(
                    user=user, 
                    status__in=['confirmed', 'completed']
                ).values('practitioner')
                
                # Get services the user has booked
                booked_services = Booking.objects.filter(
                    user=user,
                    status__in=['confirmed', 'completed']
                ).values('service')
                
                # Posts with purchase visibility that match user's bookings
                purchase_visible_posts = Post.objects.filter(
                    visibility='private',
                    purchase_visibility__service__in=booked_services
                )
                
                queryset = queryset.filter(
                    Q(visibility='public') |  # Public posts
                    Q(id__in=purchase_visible_posts) |  # Posts visible based on purchases
                    Q(visibility='followers', practitioner__in=user.community_follows.values('practitioner'))  # Posts from followed practitioners
                ).distinct()
        else:
            # For anonymous users, only show public posts
            queryset = queryset.filter(visibility='public')
        
        # Filter by practitioner if specified
        practitioner_id = self.request.query_params.get('practitioner')
        if practitioner_id:
            queryset = queryset.filter(practitioner_id=practitioner_id)
        
        # Filter by topic
        topic = self.request.query_params.get('topic')
        if topic:
            # Can filter by topic ID or slug
            if topic.isdigit():
                queryset = queryset.filter(topics__id=topic)
            else:
                queryset = queryset.filter(topics__slug=topic)
        
        # Filter by hashtag in content
        hashtag = self.request.query_params.get('hashtag')
        if hashtag:
            if hashtag.startswith('#'):
                hashtag = hashtag[1:]
            queryset = queryset.filter(content__icontains=f'#{hashtag}')
        
        return queryset
    
    @action(detail=True, methods=['post'])
    def react(self, request, pk=None):
        """
        Add or remove a reaction (like, heart) to a post.
        """
        post = self.get_object()
        reaction_type = request.data.get('reaction_type')
        
        if reaction_type not in dict(PostReaction.REACTION_TYPES).keys():
            return Response(
                {'error': f'Invalid reaction type. Must be one of: {", ".join(dict(PostReaction.REACTION_TYPES).keys())}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if the user already has this reaction type
        existing_reaction = PostReaction.objects.filter(
            post=post,
            user=request.user,
            reaction_type=reaction_type
        ).first()
        
        if existing_reaction:
            # Remove the reaction if it exists
            existing_reaction.delete()
            post.update_counters()
            return Response({'status': 'reaction removed'}, status=status.HTTP_200_OK)
        else:
            # Add the reaction
            PostReaction.objects.create(
                post=post,
                user=request.user,
                reaction_type=reaction_type
            )
            post.update_counters()
            return Response({'status': 'reaction added'}, status=status.HTTP_201_CREATED)
    
    @action(detail=True, methods=['post'])
    def comment(self, request, pk=None):
        """
        Add a comment to a post.
        """
        post = self.get_object()
        content = request.data.get('content')
        parent_comment_id = request.data.get('parent_comment_id')
        
        if not content:
            return Response(
                {'error': 'Comment content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if this is a reply to another comment
        parent_comment = None
        if parent_comment_id:
            try:
                parent_comment = PostComment.objects.get(id=parent_comment_id, post=post)
            except PostComment.DoesNotExist:
                return Response(
                    {'error': 'Parent comment not found'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Create the comment
        comment = PostComment.objects.create(
            post=post,
            user=request.user,
            content=content,
            parent_comment=parent_comment
        )
        
        # Update the post's comment count
        post.update_counters()
        
        serializer = PostCommentSerializer(comment, context={'request': request})
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class PostCommentViewSet(viewsets.ModelViewSet):
    """
    API endpoint for post comments.
    """
    queryset = PostComment.objects.filter(is_hidden=False)
    serializer_class = PostCommentSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsCommentOwnerOrReadOnly]
    
    def get_queryset(self):
        queryset = PostComment.objects.filter(is_hidden=False)
        
        # Filter by post if specified
        post_id = self.request.query_params.get('post')
        if post_id:
            queryset = queryset.filter(post_id=post_id)
        
        # Only show top-level comments by default
        parent = self.request.query_params.get('parent')
        if parent is None:
            queryset = queryset.filter(parent_comment=None)
        elif parent:
            queryset = queryset.filter(parent_comment_id=parent)
        
        return queryset
    
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)
        
        # Update the post's comment count
        post = serializer.validated_data.get('post')
        if post:
            post.update_counters()


class CommunityFollowViewSet(viewsets.ModelViewSet):
    """
    API endpoint for following practitioners in the community.
    """
    queryset = CommunityFollow.objects.all()
    serializer_class = CommunityFollowSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = CommunityFollow.objects.filter(user=user)
        
        # Filter by practitioner if specified
        practitioner_id = self.request.query_params.get('practitioner')
        if practitioner_id:
            queryset = queryset.filter(practitioner_id=practitioner_id)
        
        return queryset
    
    def create(self, request, *args, **kwargs):
        practitioner_id = request.data.get('practitioner_id')
        if not practitioner_id:
            return Response(
                {'error': 'Practitioner ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Check if already following
        if CommunityFollow.objects.filter(user=request.user, practitioner_id=practitioner_id).exists():
            return Response(
                {'error': 'Already following this practitioner'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Create the follow relationship
        follow = CommunityFollow.objects.create(
            user=request.user,
            practitioner_id=practitioner_id
        )
        
        serializer = self.get_serializer(follow)
        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    @action(detail=False, methods=['post'])
    def unfollow(self, request):
        """
        Unfollow a practitioner.
        """
        practitioner_id = request.data.get('practitioner_id')
        if not practitioner_id:
            return Response(
                {'error': 'Practitioner ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Find and delete the follow relationship
        follow = CommunityFollow.objects.filter(
            user=request.user,
            practitioner_id=practitioner_id
        ).first()
        
        if follow:
            follow.delete()
            return Response({'status': 'unfollowed'}, status=status.HTTP_200_OK)
        else:
            return Response(
                {'error': 'Not following this practitioner'},
                status=status.HTTP_400_BAD_REQUEST
            )


class CommunityTopicViewSet(viewsets.ModelViewSet):
    """
    ViewSet for community topics/hashtags.
    """
    queryset = CommunityTopic.objects.all()
    serializer_class = CommunityTopicSerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'slug', 'description']
    ordering_fields = ['name', 'post_count', 'created_at']
    ordering = ['name']
    
    def get_queryset(self):
        queryset = super().get_queryset()
        
        # Filter by featured status
        featured = self.request.query_params.get('featured')
        if featured is not None:
            queryset = queryset.filter(is_featured=featured.lower() == 'true')
        
        # Filter by minimum post count
        min_posts = self.request.query_params.get('min_posts')
        if min_posts is not None and min_posts.isdigit():
            queryset = queryset.filter(post_count__gte=int(min_posts))
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def posts(self, request, pk=None):
        """
        Get all posts with this topic.
        """
        topic = self.get_object()
        posts = topic.posts.filter(is_archived=False)
        
        # Apply visibility filters
        if not request.user.is_authenticated:
            # Unauthenticated users can only see public posts
            posts = posts.filter(visibility='public')
        elif hasattr(request.user, 'practitioner'):
            # Practitioners can see all posts they created plus public posts
            posts = posts.filter(
                Q(visibility='public') | 
                Q(practitioner=request.user.practitioner)
            )
        else:
            # Regular users can see public posts and posts from practitioners they follow
            followed_practitioners = CommunityFollow.objects.filter(
                user=request.user
            ).values_list('practitioner', flat=True)
            
            posts = posts.filter(
                Q(visibility='public') | 
                Q(visibility='followers', practitioner__in=followed_practitioners)
            )
        
        page = self.paginate_queryset(posts)
        if page is not None:
            serializer = PostListSerializer(page, many=True, context={'request': request})
            return self.get_paginated_response(serializer.data)
        
        serializer = PostListSerializer(posts, many=True, context={'request': request})
        return Response(serializer.data)
