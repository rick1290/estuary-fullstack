from django.db import models
from django.utils import timezone
from utils.models import BaseModel


class Conversation(BaseModel):
    """
    Model representing a conversation between users.
    """
    participants = models.ManyToManyField('users.User', related_name='conversations')
    is_active = models.BooleanField(default=True)
    title = models.CharField(max_length=255, blank=True)
    
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


class MessageReceipt(BaseModel):
    """
    Model representing message read receipts.
    """
    message = models.ForeignKey(Message, on_delete=models.CASCADE, related_name='receipts')
    user = models.ForeignKey('users.User', on_delete=models.CASCADE, related_name='message_receipts')
    is_read = models.BooleanField(default=False)
    read_at = models.DateTimeField(blank=True, null=True)
    delivered_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        unique_together = ('message', 'user')
        indexes = [
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['message', 'is_read']),
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
