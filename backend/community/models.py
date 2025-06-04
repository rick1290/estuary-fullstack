from django.db import models
from django.utils.translation import gettext_lazy as _
from users.models import User
from practitioners.models import Practitioner


class Post(models.Model):
    """
    Model representing a post in the community section.
    Posts can be created by practitioners and viewed by users based on visibility settings.
    """
    VISIBILITY_CHOICES = (
        ('public', 'Public'),  # Visible to all users
        ('private', 'Private'),  # Visible only to users who have made a purchase
        ('followers', 'Followers'),  # Visible only to users who follow the practitioner
    )
    
    id = models.BigAutoField(primary_key=True)
    practitioner = models.ForeignKey(Practitioner, on_delete=models.CASCADE, related_name='posts')
    title = models.CharField(max_length=255, blank=True, null=True)
    content = models.TextField()
    media_url = models.URLField(blank=True, null=True, help_text="URL to image or video")
    media_type = models.CharField(max_length=20, blank=True, null=True, choices=[
        ('image', 'Image'),
        ('video', 'Video'),
        ('audio', 'Audio'),
    ])
    visibility = models.CharField(max_length=20, choices=VISIBILITY_CHOICES, default='public')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
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
        # Using Django's default naming convention (community_post)
        verbose_name = 'Post'
        verbose_name_plural = 'Posts'
        indexes = [
            models.Index(fields=['practitioner']),
            models.Index(fields=['visibility']),
            models.Index(fields=['created_at']),
            models.Index(fields=['is_pinned']),
            models.Index(fields=['is_featured']),
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


class PostComment(models.Model):
    """
    Model representing a comment on a post.
    """
    id = models.BigAutoField(primary_key=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='comments')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_comments')
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    is_hidden = models.BooleanField(default=False, help_text="Hide this comment (e.g., for moderation)")
    
    # For threaded comments
    parent_comment = models.ForeignKey('self', on_delete=models.CASCADE, null=True, blank=True, related_name='replies')
    
    class Meta:
        # Using Django's default naming convention (community_postcomment)
        verbose_name = 'Comment'
        verbose_name_plural = 'Comments'
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user']),
            models.Index(fields=['created_at']),
            models.Index(fields=['parent_comment']),
        ]
        ordering = ['created_at']
    
    def __str__(self):
        return f"Comment by {self.user} on {self.post}"


class PostReaction(models.Model):
    """
    Model representing a reaction (like, heart) on a post.
    """
    REACTION_TYPES = (
        ('like', 'Like'),
        ('heart', 'Heart'),
    )
    
    id = models.BigAutoField(primary_key=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='reactions')
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='post_reactions')
    reaction_type = models.CharField(max_length=20, choices=REACTION_TYPES)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (community_postreaction)
        verbose_name = 'Reaction'
        verbose_name_plural = 'Reactions'
        indexes = [
            models.Index(fields=['post']),
            models.Index(fields=['user']),
            models.Index(fields=['reaction_type']),
        ]
        # Ensure a user can only have one reaction type per post
        constraints = [
            models.UniqueConstraint(
                fields=['post', 'user', 'reaction_type'],
                name='unique_user_reaction_per_post'
            ),
        ]
    
    def __str__(self):
        return f"{self.user} {self.reaction_type}d {self.post}"


class PostPurchaseVisibility(models.Model):
    """
    Model linking posts to services for visibility control.
    If a post is set to 'private', it will only be visible to users who have purchased
    one of the services linked to this post.
    """
    id = models.BigAutoField(primary_key=True)
    post = models.ForeignKey(Post, on_delete=models.CASCADE, related_name='purchase_visibility')
    service = models.ForeignKey('services.Service', on_delete=models.CASCADE, related_name='visible_posts')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (community_postpurchasevisibility)
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
        return f"Visibility for {self.post} restricted to purchasers of {self.service}"


class CommunityTopic(models.Model):
    """
    Model representing a topic/hashtag that can be associated with posts.
    """
    id = models.BigAutoField(primary_key=True)
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=50, unique=True)
    description = models.TextField(blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    is_featured = models.BooleanField(default=False, help_text="Feature this topic in the community highlights")
    
    # Counter for quick access (updated via signals)
    post_count = models.PositiveIntegerField(default=0)
    
    class Meta:
        # Using Django's default naming convention (community_communitytopic)
        verbose_name = 'Topic'
        verbose_name_plural = 'Topics'
        indexes = [
            models.Index(fields=['slug']),
            models.Index(fields=['is_featured']),
        ]
        ordering = ['name']
    
    def __str__(self):
        return self.name


class CommunityFollow(models.Model):
    """
    Model representing a user following a practitioner in the community.
    This allows users to see posts with 'followers' visibility.
    """
    id = models.BigAutoField(primary_key=True)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='community_follows')
    practitioner = models.ForeignKey(Practitioner, on_delete=models.CASCADE, related_name='community_followers')
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (community_communityfollow)
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
