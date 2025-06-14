import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class NotificationConsumer(AsyncWebsocketConsumer):
    """
    WebSocket consumer for real-time notifications.
    
    Handles:
    - Connection/disconnection
    - Receiving notifications
    - Sending notification updates
    """
    
    async def connect(self):
        """Handle WebSocket connection."""
        self.user = self.scope["user"]
        
        if self.user.is_anonymous:
            await self.close()
            return
        
        # Join user's notification group
        self.notification_group_name = f"notifications_{self.user.id}"
        await self.channel_layer.group_add(
            self.notification_group_name,
            self.channel_name
        )
        
        await self.accept()
        
        # Send initial unread count
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            "type": "connection_established",
            "unread_count": unread_count
        }))
    
    async def disconnect(self, close_code):
        """Handle WebSocket disconnection."""
        if hasattr(self, 'notification_group_name'):
            await self.channel_layer.group_discard(
                self.notification_group_name,
                self.channel_name
            )
    
    async def receive(self, text_data):
        """Handle incoming WebSocket messages."""
        try:
            data = json.loads(text_data)
            message_type = data.get("type")
            
            if message_type == "mark_read":
                await self.handle_mark_read(data)
            elif message_type == "mark_all_read":
                await self.handle_mark_all_read()
            elif message_type == "get_unread_count":
                await self.send_unread_count()
            elif message_type == "ping":
                await self.send(text_data=json.dumps({"type": "pong"}))
        except json.JSONDecodeError:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": "Invalid JSON"
            }))
        except Exception as e:
            await self.send(text_data=json.dumps({
                "type": "error",
                "message": str(e)
            }))
    
    async def notification_message(self, event):
        """Handle new notification message."""
        await self.send(text_data=json.dumps({
            "type": "new_notification",
            "notification": event["notification"]
        }))
    
    async def notification_update(self, event):
        """Handle notification update."""
        await self.send(text_data=json.dumps({
            "type": "notification_update",
            "update_type": event["update_type"],
            "data": event["data"]
        }))
    
    async def handle_mark_read(self, data):
        """Mark notification as read."""
        notification_id = data.get("notification_id")
        if notification_id:
            success = await self.mark_notification_read(notification_id)
            if success:
                # Send updated unread count
                unread_count = await self.get_unread_count()
                await self.send(text_data=json.dumps({
                    "type": "marked_read",
                    "notification_id": notification_id,
                    "unread_count": unread_count
                }))
    
    async def handle_mark_all_read(self):
        """Mark all notifications as read."""
        count = await self.mark_all_notifications_read()
        await self.send(text_data=json.dumps({
            "type": "marked_all_read",
            "count": count,
            "unread_count": 0
        }))
    
    async def send_unread_count(self):
        """Send current unread count."""
        unread_count = await self.get_unread_count()
        await self.send(text_data=json.dumps({
            "type": "unread_count",
            "count": unread_count
        }))
    
    @database_sync_to_async
    def get_unread_count(self):
        """Get unread notification count for user."""
        from notifications.models import Notification
        return Notification.objects.filter(
            user=self.user,
            is_read=False,
            delivery_channel='in_app'
        ).count()
    
    @database_sync_to_async
    def mark_notification_read(self, notification_id):
        """Mark a notification as read."""
        from notifications.models import Notification
        try:
            notification = Notification.objects.get(
                id=notification_id,
                user=self.user
            )
            notification.is_read = True
            notification.save()
            return True
        except Notification.DoesNotExist:
            return False
    
    @database_sync_to_async
    def mark_all_notifications_read(self):
        """Mark all notifications as read."""
        from notifications.models import Notification
        return Notification.objects.filter(
            user=self.user,
            is_read=False,
            delivery_channel='in_app'
        ).update(is_read=True)