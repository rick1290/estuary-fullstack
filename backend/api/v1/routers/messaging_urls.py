"""
URL configuration for messaging API endpoints.
"""

from django.urls import path
from . import messaging

app_name = 'messaging'

urlpatterns = [
    # Conversations
    path('conversations/', messaging.list_conversations, name='list-conversations'),
    path('conversations/create/', messaging.create_conversation, name='create-conversation'),
    path('conversations/<int:conversation_id>/', messaging.get_conversation, name='get-conversation'),
    path('conversations/<int:conversation_id>/archive/', messaging.archive_conversation, name='archive-conversation'),
    
    # Messages
    path('conversations/<int:conversation_id>/messages/', messaging.send_message, name='send-message'),
    path('messages/<int:message_id>/read/', messaging.mark_message_read, name='mark-message-read'),
    path('messages/<int:message_id>/delete/', messaging.delete_message, name='delete-message'),
    path('messages/search/', messaging.search_messages, name='search-messages'),
    
    # Participants
    path('conversations/<int:conversation_id>/participants/', messaging.get_conversation_participants, name='get-participants'),
    path('conversations/<int:conversation_id>/participants/add/', messaging.add_participant, name='add-participant'),
    path('conversations/<int:conversation_id>/participants/<int:user_id>/remove/', messaging.remove_participant, name='remove-participant'),
    
    # Typing indicators
    path('conversations/<int:conversation_id>/typing/', messaging.update_typing_status, name='update-typing-status'),
    
    # Unread count
    path('unread-count/', messaging.get_unread_count, name='unread-count'),
    
    # Block/unblock
    path('users/blocked/', messaging.get_blocked_users, name='get-blocked-users'),
    path('users/block/', messaging.block_user, name='block-user'),
    path('users/<int:user_id>/unblock/', messaging.unblock_user, name='unblock-user'),
    
    # Notification preferences
    path('notification-preferences/', messaging.notification_preferences, name='notification-preferences'),
]