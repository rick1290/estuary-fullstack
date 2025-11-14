"""
Messaging periodic tasks.
Handles unread message notifications.
"""
import logging
from datetime import timedelta
from celery import shared_task
from django.utils import timezone
from django.db.models import Count, Max
from django.conf import settings

from messaging.models import (
    MessageReceipt,
    Message,
    Conversation,
    ConversationParticipant,
    MessageNotificationPreference
)
from emails.services import EmailService
from emails.constants import EMAIL_SUBJECTS

logger = logging.getLogger(__name__)


@shared_task(name='process-unread-message-notifications')
def process_unread_message_notifications():
    """
    Process unread message notifications.
    Sends email notifications for unread messages that are at least 15 minutes old.

    Runs every 5 minutes via Celery Beat.

    Logic:
    - Find MessageReceipts where:
      - is_read = False
      - email_notified_at IS NULL (not yet notified)
      - delivered_at < now - 15 minutes (message is old enough)
    - Group by user + conversation
    - Check user preferences (email_notifications enabled)
    - Check conversation settings (not muted)
    - Check quiet hours if enabled
    - Send one email per conversation with unread message count
    """
    logger.info("Starting unread message notification processing")

    now = timezone.now()
    notification_threshold = now - timedelta(minutes=15)

    try:
        # Find unread message receipts that need email notifications
        unread_receipts = MessageReceipt.objects.filter(
            is_read=False,
            email_notified_at__isnull=True,
            delivered_at__lt=notification_threshold,
            message__is_deleted=False
        ).select_related(
            'message',
            'message__conversation',
            'message__sender',
            'user'
        ).prefetch_related(
            'message__conversation__conversation_participants'
        )

        logger.info(f"Found {unread_receipts.count()} unread message receipts to process")

        # Group by user and conversation
        user_conversation_groups = {}
        for receipt in unread_receipts:
            key = (receipt.user.id, receipt.message.conversation.id)
            if key not in user_conversation_groups:
                user_conversation_groups[key] = []
            user_conversation_groups[key].append(receipt)

        logger.info(f"Grouped into {len(user_conversation_groups)} user-conversation pairs")

        sent_count = 0
        skipped_count = 0
        error_count = 0

        for (user_id, conversation_id), receipts in user_conversation_groups.items():
            try:
                # Get the first receipt to access user and conversation
                first_receipt = receipts[0]
                user = first_receipt.user
                conversation = first_receipt.message.conversation

                # Check if user has email notifications enabled
                prefs, _ = MessageNotificationPreference.objects.get_or_create(
                    user=user,
                    defaults={'email_notifications': True}
                )

                if not prefs.email_notifications or not prefs.notify_new_message:
                    logger.debug(f"Skipping user {user.email} - email notifications disabled")
                    skipped_count += 1
                    continue

                # Check if conversation is muted
                participant = ConversationParticipant.objects.filter(
                    conversation=conversation,
                    user=user
                ).first()

                if participant and participant.is_muted:
                    # Check if mute is permanent or temporary
                    if not participant.muted_until or participant.muted_until > now:
                        logger.debug(f"Skipping conversation {conversation.id} for user {user.email} - muted")
                        skipped_count += 1
                        continue

                # Check quiet hours
                if prefs.quiet_hours_enabled and prefs.quiet_hours_start and prefs.quiet_hours_end:
                    user_local_time = now
                    if prefs.quiet_hours_timezone:
                        import pytz
                        try:
                            user_tz = pytz.timezone(prefs.quiet_hours_timezone)
                            user_local_time = now.astimezone(user_tz)
                        except Exception as e:
                            logger.warning(f"Invalid timezone {prefs.quiet_hours_timezone} for user {user.email}: {e}")

                    current_time = user_local_time.time()
                    if prefs.quiet_hours_start <= current_time <= prefs.quiet_hours_end:
                        logger.debug(f"Skipping user {user.email} - in quiet hours")
                        skipped_count += 1
                        continue

                # Get the most recent unread message for preview
                most_recent_message = Message.objects.filter(
                    id__in=[r.message.id for r in receipts]
                ).order_by('-created_at').first()

                if not most_recent_message:
                    logger.warning(f"No recent message found for conversation {conversation.id}")
                    skipped_count += 1
                    continue

                # Send notification email
                unread_count = len(receipts)
                sender = most_recent_message.sender

                # Truncate message preview
                message_preview = most_recent_message.content[:100]
                if len(most_recent_message.content) > 100:
                    message_preview += "..."

                # Build email context
                email_context = {
                    'sender_name': sender.get_full_name() or sender.email,
                    'message_preview': message_preview,
                    'unread_count': unread_count,
                    'conversation_id': str(conversation.id),
                    'sent_time': most_recent_message.created_at.strftime('%B %d, %Y at %I:%M %p'),
                    'WEBSITE_URL': settings.FRONTEND_URL,
                    'YEAR': now.year,
                }

                # Determine subject based on count
                if unread_count == 1:
                    subject = f"New message from {email_context['sender_name']}"
                else:
                    subject = f"{unread_count} new messages from {email_context['sender_name']}"

                # Send email
                EmailService.send_template_email(
                    to=user.email,
                    template_path='emails/shared/message_notification_standalone.mjml',
                    context=email_context,
                    subject=subject,
                    tags=[
                        {'name': 'category', 'value': 'message_notification'},
                        {'name': 'conversation_id', 'value': str(conversation.id)},
                    ]
                )

                # Mark all receipts as notified
                receipt_ids = [r.id for r in receipts]
                MessageReceipt.objects.filter(id__in=receipt_ids).update(
                    email_notified_at=now
                )

                logger.info(
                    f"Sent unread message notification to {user.email} "
                    f"for conversation {conversation.id} ({unread_count} messages)"
                )
                sent_count += 1

            except Exception as e:
                logger.error(
                    f"Error sending unread message notification for user {user_id}, "
                    f"conversation {conversation_id}: {str(e)}",
                    exc_info=True
                )
                error_count += 1
                continue

        logger.info(
            f"Unread message notification processing complete. "
            f"Sent: {sent_count}, Skipped: {skipped_count}, Errors: {error_count}"
        )

        return {
            'status': 'success',
            'sent_count': sent_count,
            'skipped_count': skipped_count,
            'error_count': error_count,
            'processed_at': now.isoformat()
        }

    except Exception as e:
        logger.exception(f"Error in unread message notification processing: {str(e)}")
        return {
            'status': 'error',
            'error': str(e)
        }
