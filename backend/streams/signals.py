from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import StreamSubscription


def _update_stream_counts(stream):
    """Recalculate subscriber counts from database."""
    active_subs = stream.subscriptions.filter(status='active')
    stream.subscriber_count = active_subs.count()
    stream.free_subscriber_count = active_subs.filter(tier='free').count()
    stream.paid_subscriber_count = active_subs.filter(tier__in=['entry', 'premium']).count()
    stream.save(update_fields=['subscriber_count', 'free_subscriber_count', 'paid_subscriber_count'])


@receiver(post_save, sender=StreamSubscription)
def update_counts_on_subscription_save(sender, instance, **kwargs):
    _update_stream_counts(instance.stream)


@receiver(post_delete, sender=StreamSubscription)
def update_counts_on_subscription_delete(sender, instance, **kwargs):
    _update_stream_counts(instance.stream)
