import json
import uuid
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone
from django.core.exceptions import ObjectDoesNotExist
from django.contrib.auth import get_user_model
from messaging.models import Conversation, Message, MessageReceipt, TypingIndicator

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.user = self.scope["user"]
        self.conversation_id = self.scope["url_route"]["kwargs"]["conversation_id"]
        self.conversation_group_name = f"chat_{self.conversation_id}"
        
        # Check if user is authenticated
        if not self.user.is_authenticated:
            await self.close(code=4001)
            return
        
        # Check if conversation exists and user is a participant
        if not await self.is_conversation_participant():
            await self.close(code=4002)
            return
        
        # Join conversation group
        await self.channel_layer.group_add(
            self.conversation_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Notify other participants that user is online
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "user_status",
                "user_id": str(self.user.id),
                "username": self.user.get_full_name() or self.user.email,
                "status": "online"
            }
        )

    async def disconnect(self, close_code):
        # Leave conversation group
        if hasattr(self, 'conversation_group_name'):
            await self.channel_layer.group_discard(
                self.conversation_group_name,
                self.channel_name
            )
            
            # Notify other participants that user is offline
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "user_status",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.email,
                    "status": "offline"
                }
            )

    async def receive(self, text_data):
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            if message_type == "chat_message":
                await self.handle_chat_message(data)
            elif message_type == "typing_indicator":
                await self.handle_typing_indicator(data)
            elif message_type == "read_receipt":
                await self.handle_read_receipt(data)
            elif message_type == "edit_message":
                await self.handle_edit_message(data)
            elif message_type == "interactive_action":
                await self.handle_interactive_action(data)
        except json.JSONDecodeError:
            pass

    async def handle_chat_message(self, data):
        content = data.get("content", "")
        message_type = data.get("message_type", "text")
        metadata = data.get("metadata", {})
        
        if not content and message_type == "text":
            return
        
        # Create message in database
        message = await self.create_message(content, message_type, metadata)
        
        # Send message to conversation group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "chat_message",
                "message_id": str(message.id),
                "sender_id": str(self.user.id),
                "sender_name": self.user.get_full_name() or self.user.email,
                "content": content,
                "message_type": message_type,
                "metadata": metadata,
                "timestamp": message.created_at.isoformat(),
            }
        )

    async def handle_typing_indicator(self, data):
        is_typing = data.get("is_typing", False)
        
        # Update typing indicator in database
        await self.update_typing_indicator(is_typing)
        
        # Send typing indicator to conversation group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "typing_indicator",
                "user_id": str(self.user.id),
                "username": self.user.get_full_name() or self.user.email,
                "is_typing": is_typing
            }
        )

    async def handle_read_receipt(self, data):
        message_id = data.get("message_id")
        
        if not message_id:
            return
        
        # Mark message as read in database
        success = await self.mark_message_as_read(message_id)
        
        if success:
            # Send read receipt to conversation group
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "read_receipt",
                    "user_id": str(self.user.id),
                    "username": self.user.get_full_name() or self.user.email,
                    "message_id": message_id
                }
            )

    async def handle_edit_message(self, data):
        message_id = data.get("message_id")
        new_content = data.get("content", "")
        
        if not message_id or not new_content:
            return
        
        # Edit message in database
        success = await self.edit_message(message_id, new_content)
        
        if success:
            # Send edited message to conversation group
            await self.channel_layer.group_send(
                self.conversation_group_name,
                {
                    "type": "message_edited",
                    "message_id": message_id,
                    "content": new_content,
                    "edited_at": timezone.now().isoformat(),
                }
            )
    
    async def handle_interactive_action(self, data):
        action_type = data.get("action_type")
        action_id = data.get("action_id")
        message_id = data.get("message_id")
        
        if not action_type or not action_id:
            return
        
        # Process the interactive action (e.g., accept booking request)
        result = await self.process_interactive_action(action_type, action_id, message_id)
        
        # Send action result to conversation group
        await self.channel_layer.group_send(
            self.conversation_group_name,
            {
                "type": "interactive_action_result",
                "action_type": action_type,
                "action_id": action_id,
                "message_id": message_id,
                "result": result,
                "user_id": str(self.user.id),
                "username": self.user.get_full_name() or self.user.email,
            }
        )

    async def chat_message(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def typing_indicator(self, event):
        # Send typing indicator to WebSocket
        await self.send(text_data=json.dumps(event))

    async def read_receipt(self, event):
        # Send read receipt to WebSocket
        await self.send(text_data=json.dumps(event))

    async def message_edited(self, event):
        # Send edited message to WebSocket
        await self.send(text_data=json.dumps(event))

    async def user_status(self, event):
        # Send user status to WebSocket
        await self.send(text_data=json.dumps(event))
    
    async def interactive_action_result(self, event):
        # Send interactive action result to WebSocket
        await self.send(text_data=json.dumps(event))

    @database_sync_to_async
    def is_conversation_participant(self):
        try:
            conversation = Conversation.objects.get(id=self.conversation_id)
            return conversation.participants.filter(id=self.user.id).exists()
        except ObjectDoesNotExist:
            return False

    @database_sync_to_async
    def create_message(self, content, message_type="text", metadata=None):
        conversation = Conversation.objects.get(id=self.conversation_id)
        message = Message.objects.create(
            conversation=conversation,
            sender=self.user,
            content=content,
            message_type=message_type,
            attachments=metadata
        )
        return message

    @database_sync_to_async
    def update_typing_indicator(self, is_typing):
        conversation = Conversation.objects.get(id=self.conversation_id)
        typing_indicator, created = TypingIndicator.objects.update_or_create(
            conversation=conversation,
            user=self.user,
            defaults={"is_typing": is_typing}
        )
        return typing_indicator

    @database_sync_to_async
    def mark_message_as_read(self, message_id):
        try:
            message = Message.objects.get(id=message_id, conversation_id=self.conversation_id)
            receipt, created = MessageReceipt.objects.get_or_create(
                message=message,
                user=self.user,
                defaults={"is_read": True, "read_at": timezone.now()}
            )
            
            if not created and not receipt.is_read:
                receipt.is_read = True
                receipt.read_at = timezone.now()
                receipt.save(update_fields=['is_read', 'read_at'])
            
            return True
        except ObjectDoesNotExist:
            return False

    @database_sync_to_async
    def edit_message(self, message_id, new_content):
        try:
            message = Message.objects.get(
                id=message_id,
                conversation_id=self.conversation_id,
                sender=self.user
            )
            message.content = new_content
            message.is_edited = True
            message.edited_at = timezone.now()
            message.save(update_fields=['content', 'is_edited', 'edited_at'])
            return True
        except ObjectDoesNotExist:
            return False
    
    @database_sync_to_async
    def process_interactive_action(self, action_type, action_id, message_id=None):
        # Process different types of interactive actions
        if action_type == "booking_request":
            # Logic to handle booking request acceptance/rejection
            # This would interact with your bookings app
            return {"status": "success", "message": "Booking request processed"}
            
        elif action_type == "payment_request":
            # Logic to handle payment request
            # This would interact with your payments app
            return {"status": "success", "message": "Payment request processed"}
            
        elif action_type == "link_click":
            # Track link clicks if needed
            return {"status": "success", "message": "Link click recorded"}
            
        return {"status": "error", "message": "Unknown action type"}
