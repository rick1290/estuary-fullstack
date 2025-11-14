from django.db import models
from django.utils import timezone
from django.contrib.postgres.fields import ArrayField
from utils.models import BaseModel


class Conversation(BaseModel):
    """
    Model representing a conversation between users.
    """
    participants = models.ManyToManyField(
        'users.User', 
        through='ConversationParticipant',
        related_name='conversations'
    )
    is_active = models.BooleanField(default=True)
    is_archived = models.BooleanField(default=False)
    title = models.CharField(max_length=255, blank=True)
    conversation_type = models.CharField(
        max_length=20,
        choices=[
            ('direct', 'Direct Message'),
            ('group', 'Group Conversation'),
            ('booking', 'Booking Related'),
            ('service', 'Service Related'),
            ('support', 'Support'),
        ],
        default='direct'
    )
    
    # For practitioner-client conversations
    related_booking = models.ForeignKey(
        'bookings.Booking', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True, 
        related_name='conversations'
    )
    related_service = models.ForeignKey(
        'services.Service', 
        on_delete=models.SET_NULL, 
        blank=True, 
        null=True,
        related_name='conversations'
    )
    
    class Meta:
        indexes = [
            models.Index(fields=['is_active', 'updated_at']),
            models.Index(fields=['related_booking']),
            models.Index(fields=['related_service']),
        ]
    
    def __str__(self):
        return f"Conversation {str(self.id)[:8]}... - {self.title or 'Untitled'}"
    
    def add_message(self, sender, content, message_type='text', attachments=None):
        """
        Add a new message to the conversation
        """
        message = Message.objects.create(
            conversation=self,
            sender=sender,
            content=content,
            message_type=message_type,
            attachments=attachments
        )
        
        # Update conversation timestamp
        self.updated_at = timezone.now()
        self.save(update_fields=['updated_at'])
        
        # Update participant's last read time
        ConversationParticipant.objects.filter(
            conversation=self,
            user=sender
        ).update(
            last_read_at=timezone.now(),
            last_read_message=message
        )
        
        return message
    
    def mark_as_read(self, user):
        """
        Mark all unread messages in the conversation as read for a specific user
        """
        MessageReceipt.objects.filter(
            message__conversation=self,
            user=user,
            is_read=False
        ).update(
            is_read=True,
            read_at=timezone.now()
        )
        
        # Update participant's last read
        last_message = self.messages.filter(is_deleted=False).last()
        if last_message:
            ConversationParticipant.objects.filter(
                conversation=self,
                user=user
            ).update(
                last_read_at=timezone.now(),
                last_read_message=last_message
            )
    
    def get_unread_count(self, user):
        """
        Get unread message count for a specific user
        """
        return MessageReceipt.objects.filter(
            message__conversation=self,
            user=user,
            is_read=False,
            message__is_deleted=False
        ).count()
    
    def add_participant(self, user, role='member'):
        """
        Add a participant to the conversation
        """
        participant, created = ConversationParticipant.objects.get_or_create(
            conversation=self,
            user=user,
            defaults={'role': role}
        )
        if not created and not participant.is_active:
            participant.is_active = True
            participant.left_at = None
            participant.save()
        return participant
    
    def remove_participant(self, user):
        """
        Remove a participant from the conversation
        """
        ConversationParticipant.objects.filter(
            conversation=self,
            user=user
        ).update(
            is_active=False,
            left_at=timezone.now()
        )
    
    def archive_for_user(self, user):
        """
        Archive the conversation for a specific user
        """
        ConversationParticipant.objects.filter(
            conversation=self,
            user=user
        ).update(
            is_archived=True,
            archived_at=timezone.now()
        )


class Message(BaseModel):
    """
    Model representing a message in a conversation.
    """
    MESSAGE_TYPES = (
        ('text', 'Text'),
        ('image', 'Image'),
        ('file', 'File'),
        ('video', 'Video'),
        ('audio', 'Audio'),
        ('system', 'System'),
        ('link', 'Link'),
        ('booking_request', 'Booking Request'),
        ('payment_request', 'Payment Request'),
        ('interactive', 'Interactive'),
    )
    
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    attachments = models.JSONField(default=list, blank=True)
    
    # Edit tracking
    edited_at = models.DateTimeField(blank=True, null=True)
    is_edited = models.BooleanField(default=False)
    
    # Soft delete
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender', 'created_at']),
            models.Index(fields=['is_deleted']),
            models.Index(fields=['message_type']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender} in {str(self.conversation.id)[:8]}..."
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create message receipts for all active participants except sender
        if is_new:
            active_participants = ConversationParticipant.objects.filter(
                conversation=self.conversation,
                is_active=True
            ).exclude(user=self.sender).values_list('user', flat=True)
            
            receipts = [
                MessageReceipt(message=self, user_id=user_id, is_read=False)
                for user_id in active_participants
            ]
            MessageReceipt.objects.bulk_create(receipts)
    
    def edit(self, new_content):
        """
        Edit the message content
        """
        self.content = new_content
        self.is_edited = True
        self.edited_at = timezone.now()
        self.save(update_fields=['content', 'is_edited', 'edited_at'])
    
    def soft_delete(self):
        """
        Soft delete the message
        """
        self.is_deleted = True
        self.deleted_at = timezone.now()
        self.save(update_fields=['is_deleted', 'deleted_at'])


class MessageReceipt(BaseModel):
    """
    Model representing message read receipts.
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='message_receipts')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(auto_now_add=True)
    email_notified_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['message', 'is_read']),
            models.Index(fields=['is_read', 'email_notified_at', 'delivered_at']),
        ]
    
    def __str__(self):
        status = "Read" if self.is_read else "Unread"
        return f"{status} receipt for {self.user} - Message {str(self.message.id)[:8]}..."
    
    def mark_as_read(self):
        """
        Mark the message as read
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class TypingIndicator(BaseModel):
    """
    Model representing typing indicators in conversations.
    """
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='typing_indicators')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='typing_indicators')
    is_typing = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ('conversation', 'user')
        indexes = [
            models.Index(fields=['conversation', 'is_typing']),
            models.Index(fields=['user', 'updated_at']),
        ]
    
    def __str__(self):
        status = "typing" if self.is_typing else "not typing"
        return f"{self.user} is {status} in {str(self.conversation.id)[:8]}..."


class ConversationParticipant(BaseModel):
    """
    Through model for conversation participants with additional metadata.
    """
    ROLE_CHOICES = [
        ('member', 'Member'),
        ('admin', 'Admin'),
        ('owner', 'Owner'),
    ]
    
    conversation = models.ForeignKey(
        Conversation, 
        on_delete=models.CASCADE,
        related_name='conversation_participants'
    )
    user = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='conversation_participations'
    )
    role = models.CharField(max_length=20, choices=ROLE_CHOICES, default='member')
    
    # Participant settings
    is_muted = models.BooleanField(default=False)
    muted_until = models.DateTimeField(blank=True, null=True)
    
    # Archive status per participant
    is_archived = models.BooleanField(default=False)
    archived_at = models.DateTimeField(blank=True, null=True)
    
    # Last read tracking
    last_read_at = models.DateTimeField(blank=True, null=True)
    last_read_message = models.ForeignKey(
        'Message',
        on_delete=models.SET_NULL,
        blank=True,
        null=True,
        related_name='+'
    )
    
    # Join/leave tracking
    joined_at = models.DateTimeField(auto_now_add=True)
    left_at = models.DateTimeField(blank=True, null=True)
    is_active = models.BooleanField(default=True)
    
    class Meta:
        unique_together = ['conversation', 'user']
        indexes = [
            models.Index(fields=['user', 'is_active']),
            models.Index(fields=['conversation', 'is_active']),
            models.Index(fields=['user', 'is_archived']),
        ]
    
    def __str__(self):
        return f"{self.user} in {self.conversation} ({self.role})"


class BlockedUser(BaseModel):
    """
    Model to track blocked users.
    """
    blocker = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='blocked_users'
    )
    blocked = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='blocked_by_users'
    )
    reason = models.TextField(blank=True)
    
    class Meta:
        unique_together = ['blocker', 'blocked']
        indexes = [
            models.Index(fields=['blocker']),
            models.Index(fields=['blocked']),
        ]
    
    def __str__(self):
        return f"{self.blocker} blocked {self.blocked}"


class MessageNotificationPreference(BaseModel):
    """
    User preferences for message notifications.
    """
    user = models.OneToOneField(
        'users.User',
        on_delete=models.CASCADE,
        related_name='message_notification_preference'
    )
    
    # Global settings
    email_notifications = models.BooleanField(default=True)
    push_notifications = models.BooleanField(default=True)
    sms_notifications = models.BooleanField(default=False)
    
    # Notification types
    notify_new_message = models.BooleanField(default=True)
    notify_new_conversation = models.BooleanField(default=True)
    notify_mentions = models.BooleanField(default=True)
    
    # Quiet hours
    quiet_hours_enabled = models.BooleanField(default=False)
    quiet_hours_start = models.TimeField(blank=True, null=True)
    quiet_hours_end = models.TimeField(blank=True, null=True)
    quiet_hours_timezone = models.CharField(max_length=50, default='UTC')
    
    # Sound settings
    sound_enabled = models.BooleanField(default=True)
    vibration_enabled = models.BooleanField(default=True)
    
    def __str__(self):
        return f"Notification preferences for {self.user}"
