import uuid
from django.db import models
from django.utils import timezone


class Conversation(models.Model):
    """
    Model representing a conversation between users.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    participants = models.ManyToManyField('users.User', related_name='conversations')
    is_active = models.BooleanField(default=True)
    title = models.CharField(max_length=255, blank=True, null=True)
    
    # For practitioner-client conversations
    related_booking = models.ForeignKey('bookings.Booking', on_delete=models.SET_NULL, blank=True, null=True, related_name='conversations')
    related_service = models.ForeignKey('services.Service', on_delete=models.SET_NULL, blank=True, null=True)
    
    class Meta:
        # Using Django's default naming convention (messaging_conversation)
        indexes = [
            models.Index(fields=['created_at']),
            models.Index(fields=['updated_at']),
        ]
    
    def __str__(self):
        return f"Conversation {self.id} - {self.title or 'Untitled'}"
    
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


class Message(models.Model):
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
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='sent_messages')
    content = models.TextField()
    message_type = models.CharField(max_length=20, choices=MESSAGE_TYPES, default='text')
    attachments = models.JSONField(blank=True, null=True)  # Store file URLs and metadata
    created_at = models.DateTimeField(auto_now_add=True)
    edited_at = models.DateTimeField(blank=True, null=True)
    is_edited = models.BooleanField(default=False)
    is_deleted = models.BooleanField(default=False)
    deleted_at = models.DateTimeField(blank=True, null=True)
    
    class Meta:
        # Using Django's default naming convention (messaging_message)
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['conversation', 'created_at']),
            models.Index(fields=['sender']),
            models.Index(fields=['is_deleted']),
        ]
    
    def __str__(self):
        return f"Message from {self.sender} in {self.conversation}"
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        
        # Create message receipts for all participants except sender
        if is_new:
            participants = self.conversation.participants.exclude(id=self.sender.id)
            receipts = [
                MessageReceipt(message=self, user=participant, is_read=False)
                for participant in participants
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


class MessageReceipt(models.Model):
    """
    Model representing message read receipts.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='message_receipts')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        # Using Django's default naming convention (messaging_messagereceipt)
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]
    
    def __str__(self):
        status = "Read" if self.is_read else "Unread"
        return f"{status} receipt for {self.user} - Message {self.message.id}"
    
    def mark_as_read(self):
        """
        Mark the message as read
        """
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])


class TypingIndicator(models.Model):
    """
    Model representing typing indicators in conversations.
    """
    id = models.UUIDField(primary_key=True, default=uuid.uuid4)
    conversation = models.ForeignKey(Conversation, on_delete=models.CASCADE, related_name='typing_indicators')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE)
    is_typing = models.BooleanField(default=True)
    timestamp = models.DateTimeField(auto_now=True)
    
    class Meta:
        # Using Django's default naming convention (messaging_typingindicator)
        unique_together = ('conversation', 'user')
    
    def __str__(self):
        status = "typing" if self.is_typing else "not typing"
        return f"{self.user} is {status} in {self.conversation}"
