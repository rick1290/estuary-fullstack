from django.db.models import Count, Q
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import StreamSubscription


def _update_stream_counts(stream):
    """Recalculate subscriber counts from database using a single aggregated query."""
    stats = stream.subscriptions.filter(status='active').aggregate(
        total=Count('id'),
        free=Count('id', filter=Q(tier='free')),
        paid=Count('id', filter=Q(tier__in=['entry', 'premium'])),
    )
    stream.subscriber_count = stats['total']
    stream.free_subscriber_count = stats['free']
    stream.paid_subscriber_count = stats['paid']
    stream.save(update_fields=['subscriber_count', 'free_subscriber_count', 'paid_subscriber_count'])


@receiver(post_save, sender=StreamSubscription)
def update_counts_on_subscription_save(sender, instance, **kwargs):
    _update_stream_counts(instance.stream)


@receiver(post_delete, sender=StreamSubscription)
def update_counts_on_subscription_delete(sender, instance, **kwargs):
    _update_stream_counts(instance.stream)
