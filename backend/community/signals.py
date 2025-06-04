from django.db.models.signals import post_save, post_delete, m2m_changed
from django.dispatch import receiver

from .models import PostComment, PostReaction, Post, CommunityTopic


@receiver(post_save, sender=PostComment)
def update_post_comment_count_on_save(sender, instance, created, **kwargs):
    """Update post comment count when a comment is created."""
    if created:
        instance.post.update_counters()


@receiver(post_delete, sender=PostComment)
def update_post_comment_count_on_delete(sender, instance, **kwargs):
    """Update post comment count when a comment is deleted."""
    if instance.post:
        instance.post.update_counters()


@receiver(post_save, sender=PostReaction)
def update_post_reaction_count_on_save(sender, instance, created, **kwargs):
    """Update post reaction counts when a reaction is created or updated."""
    instance.post.update_counters()


@receiver(post_delete, sender=PostReaction)
def update_post_reaction_count_on_delete(sender, instance, **kwargs):
    """Update post reaction counts when a reaction is deleted."""
    if instance.post:
        instance.post.update_counters()


@receiver(m2m_changed, sender=Post.topics.through)
def update_topic_post_count(sender, instance, action, pk_set, **kwargs):
    """Update the post_count for topics when posts are added or removed."""
    if action in ['post_add', 'post_remove', 'post_clear']:
        # For post_add and post_remove, update the affected topics
        if pk_set and (action == 'post_add' or action == 'post_remove'):
            topics = CommunityTopic.objects.filter(pk__in=pk_set)
            for topic in topics:
                topic.post_count = topic.posts.count()
                topic.save(update_fields=['post_count'])
        
        # For post_clear, we need to update all topics that were previously related
        if action == 'post_clear':
            # This is more expensive, but necessary for post_clear
            for topic in CommunityTopic.objects.all():
                topic.post_count = topic.posts.count()
                topic.save(update_fields=['post_count'])


@receiver(post_delete, sender=Post)
def update_topic_post_count_on_post_delete(sender, instance, **kwargs):
    """Update topic post counts when a post is deleted."""
    # Get the topics that were associated with this post
    # We need to do this in a separate step because the m2m relation will be gone after delete
    for topic in instance.topics.all():
        topic.post_count = topic.posts.count()
        topic.save(update_fields=['post_count'])
