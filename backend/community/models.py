from django.db import models
from django.utils.translation import gettext_lazy as _
from utils.models import BaseModel


class Post(BaseModel):
    """
    Model representing a post in the community section.
    Posts can be created by practitioners and viewed by users based on visibility settings.
    """
    VISIBILITY_CHOICES = (
        ('public', 'Public'),  # Visible to all users
        ('private', 'Private'),  # Visible only to users who have made a purchase
        ('followers', 'Followers'),  # Visible only to users who follow the practitioner
    )
    
    MEDIA_TYPES = (
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    )
    
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.CASCADE, 
        related_name='posts'
    )
    title = models.CharField(max_length=255, blank=True)
    content = models.TextField()
    media_url = models.URLField(blank=True, help_text="URL to image or video")
    media_type = models.CharField(max_length=20, blank=True, choices=MEDIA_TYPES)
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    is_pinned = models.BooleanField(default=False, help_text="Pin this post to the top of the feed")
    is_featured = models.BooleanField(default=False, help_text="Feature this post in the community highlights")
    is_archived = models.BooleanField(default=False, help_text="Archive this post (hidden but not deleted)")
    
    # Topics/hashtags for this post
    topics = models.ManyToManyField('CommunityTopic', related_name='posts', blank=True)
    
    # Counters for quick access (updated via signals)
    like_count = models.PositiveIntegerField(default=0)
    heart_count = models.PositiveIntegerField(default=0)
    comment_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
        indexes = [
            models.Index(fields=['practitioner', 'visibility']),
            models.Index(fields=['created_at', 'is_pinned']),
            models.Index(fields=['is_featured', 'visibility']),
            models.Index(fields=['is_archived']),
        ]
        ordering = ['-created_at']
    
    def __str__(self):
        return f"Post by {self.practitioner}: {self.title or self.content[:30]}"
    
    def update_counters(self):
        """Update the counter fields based on related objects"""
        self.like_count = self.reactions.filter(reaction_type='like').count()
        self.heart_count = self.reactions.filter(reaction_type='heart').count()
        self.comment_count = self.comments.count()
        self.save(update_fields=['like_count', 'heart_count', 'comment_count'])


class PostComment(BaseModel):
    """
    Model representing a comment on a post.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='post_comments')
    content = models.TextField()
    is_hidden = models.BooleanField(default=False, help_text="Hide this comment (e.g., for moderation)")
    
    # For threaded comments
    parent_comment = models.ForeignKey(
        'self', 
        on_delete=models.CASCADE, 
        null=True, 
        blank=True, 
        related_name='replies'
    )
    
    class Meta:
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
        indexes = [
            models.Index(fields=['post', 'created_at']),
            models.Index(fields=['user']),
            models.Index(fields=['parent_comment']),
            models.Index(fields=['is_hidden']),
        ]
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user} on {str(self.post.id)[:8]}..."


class PostReaction(BaseModel):
    """
    Model representing a reaction (like, heart) on a post.
    """
    REACTION_TYPES = (
        ('like', 'Like'),
        ('heart', 'Heart'),
    )
    
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='post_reactions')
    reaction_type = models.CharField(max_length=20, choices=REACTION_TYPES)
    
    class Meta:
        verbose_name = 'Reaction'
        verbose_name_plural = 'Reactions'
        indexes = [
            models.Index(fields=['post', 'reaction_type']),
            models.Index(fields=['user']),
        ]
        # Ensure a user can only have one reaction type per post
        constraints = [
            models.UniqueConstraint(
                fields=['post', 'user', 'reaction_type'],
                name='unique_user_reaction_per_post'
            ),
        ]
    
    def __str__(self):
        return f"{self.user} {self.reaction_type}d {str(self.post.id)[:8]}..."


class PostPurchaseVisibility(BaseModel):
    """
    Model linking posts to services for visibility control.
    If a post is set to 'private', it will only be visible to users who have purchased
    one of the services linked to this post.
    """
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='purchase_visibility')
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='visible_posts')
    
    class Meta:
        verbose_name = 'Post Purchase Visibility'
        verbose_name_plural = 'Post Purchase Visibilities'
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['service']),
        ]
        # Ensure a post is only linked to a service once
        constraints = [
            models.UniqueConstraint(
                fields=['post', 'service'],
                name='unique_post_service_visibility'
            ),
        ]
    
    def __str__(self):
        return f"Visibility for {str(self.post.id)[:8]}... restricted to purchasers of {self.service}"


class CommunityTopic(BaseModel):
    """
    Model representing a topic/hashtag that can be associated with posts.
    """
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True)
    is_featured = models.BooleanField(default=False, help_text="Feature this topic in the community highlights")
    
    # Counter for quick access (updated via signals)
    post_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        verbose_name = 'Topic'
        verbose_name_plural = 'Topics'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_featured']),
            models.Index(fields=['name']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CommunityFollow(BaseModel):
    """
    Model representing a user following a practitioner in the community.
    This allows users to see posts with 'followers' visibility.
    """
    user = models.ForeignKey(
        'users.User', 
        on_delete=models.CASCADE, 
        related_name='community_follows'
    )
    practitioner = models.ForeignKey(
        'practitioners.Practitioner', 
        on_delete=models.CASCADE, 
        related_name='community_followers'
    )
    
    class Meta:
        verbose_name = 'Community Follow'
        verbose_name_plural = 'Community Follows'
        indexes = [
            models.Index(fields=['user']),
            models.Index(fields=['practitioner']),
        ]
        # Ensure a user can only follow a practitioner once
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'practitioner'],
                name='unique_user_practitioner_follow'
            ),
        ]
    
    def __str__(self):
        return f"{self.user} follows {self.practitioner}"
