"""
Messaging schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

from .base import BaseSchema, ListResponse


class MessageType(str, Enum):
    """Types of messages"""
    TEXT = "text"
    IMAGE = "image"
    FILE = "file"
    SYSTEM = "system"


class MessageStatus(str, Enum):
    """Message delivery status"""
    SENT = "sent"
    DELIVERED = "delivered"
    READ = "read"
    FAILED = "failed"


class ConversationType(str, Enum):
    """Types of conversations"""
    DIRECT = "direct"
    GROUP = "group"
    BOOKING = "booking"  # Auto-created for bookings
    SUPPORT = "support"


class ParticipantInfo(BaseModel):
    """Information about a conversation participant"""
    id: UUID
    first_name: str
    last_name: str
    display_name: Optional[str] = None
    profile_image_url: Optional[str] = None
    is_practitioner: bool = False
    is_online: bool = False
    last_seen: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class MessageAttachment(BaseModel):
    """Message attachment information"""
    id: int  # Changed from UUID to int
    filename: str
    content_type: str
    file_size: int
    url: str
    thumbnail_url: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MessageCreate(BaseModel):
    """Schema for creating a message"""
    content: str = Field(..., min_length=1, max_length=10000)
    message_type: MessageType = MessageType.TEXT
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    attachment_ids: Optional[List[UUID]] = Field(default_factory=list)
    reply_to_id: Optional[int] = None  # Changed from UUID to int


class MessageResponse(BaseSchema):
    """Message response schema"""
    id: int  # Keep as int for BaseModel
    conversation_id: int  # Keep as int for BaseModel
    sender: ParticipantInfo
    content: str
    message_type: MessageType
    status: MessageStatus
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    delivered_at: Optional[datetime] = None
    read_at: Optional[datetime] = None
    
    # Additional data
    metadata: Dict[str, Any] = Field(default_factory=dict)
    attachments: List[MessageAttachment] = Field(default_factory=list)
    reply_to: Optional['MessageResponse'] = None
    
    # User-specific data
    is_mine: bool = False
    can_delete: bool = False
    
    model_config = ConfigDict(from_attributes=True)


class ConversationCreate(BaseModel):
    """Schema for creating a conversation"""
    participant_ids: List[UUID] = Field(..., min_length=1, max_length=50)
    title: Optional[str] = Field(None, max_length=200)
    message: Optional[MessageCreate] = None
    conversation_type: Optional[ConversationType] = None
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)


class ConversationResponse(BaseSchema):
    """Conversation response schema"""
    id: int  # Keep as int for BaseModel
    title: Optional[str] = None
    conversation_type: ConversationType
    created_by: ParticipantInfo
    
    # Participants
    participants: List[ParticipantInfo]
    participant_count: int
    
    # Last message preview
    last_message: Optional[MessageResponse] = None
    last_message_at: Optional[datetime] = None
    
    # User-specific data
    unread_count: int = 0
    is_archived: bool = False
    is_muted: bool = False
    is_blocked: bool = False
    
    # Metadata
    metadata: Dict[str, Any] = Field(default_factory=dict)
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ConversationUpdate(BaseModel):
    """Schema for updating conversation"""
    title: Optional[str] = Field(None, max_length=200)
    is_archived: Optional[bool] = None
    is_muted: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class ConversationFilters(BaseModel):
    """Filters for listing conversations"""
    is_archived: Optional[bool] = None
    is_muted: Optional[bool] = None
    has_unread: Optional[bool] = None
    conversation_type: Optional[ConversationType] = None
    participant_id: Optional[UUID] = None
    search: Optional[str] = Field(None, description="Search in titles and messages")
    sort_by: str = Field("last_message_at", pattern="^(last_message_at|created_at|unread_count)$")


class ConversationListResponse(ListResponse):
    """Response for conversation list"""
    results: List[ConversationResponse]
    total_unread: int = 0


class MessageFilters(BaseModel):
    """Filters for listing messages"""
    sender_id: Optional[UUID] = None
    message_type: Optional[MessageType] = None
    is_unread: Optional[bool] = None
    has_attachments: Optional[bool] = None
    search: Optional[str] = Field(None, description="Search in message content")
    before: Optional[datetime] = None
    after: Optional[datetime] = None


class MessageListResponse(ListResponse):
    """Response for message list"""
    results: List[MessageResponse]
    has_more: bool = False


class MessageReadReceipt(BaseModel):
    """Schema for marking messages as read"""
    message_ids: List[int] = Field(..., min_length=1, max_length=100)  # Changed from UUID to int
    read_at: Optional[datetime] = None


class TypingIndicator(BaseModel):
    """Schema for typing indicator"""
    conversation_id: int  # Changed from UUID to int
    is_typing: bool = True


class ConversationParticipantAdd(BaseModel):
    """Schema for adding participants"""
    user_ids: List[UUID] = Field(..., min_length=1, max_length=50)


class BlockUserRequest(BaseModel):
    """Schema for blocking a user"""
    user_id: UUID  # Keep as UUID since User model has uuid field
    reason: Optional[str] = Field(None, max_length=500)


class UnreadCountResponse(BaseModel):
    """Response for unread count"""
    total_unread_messages: int = 0
    total_unread_conversations: int = 0
    by_conversation: Dict[str, int] = Field(
        default_factory=dict,
        description="Unread count by conversation ID"
    )


class MessageSearchRequest(BaseModel):
    """Schema for searching messages"""
    query: str = Field(..., min_length=2, max_length=100)
    conversation_ids: Optional[List[UUID]] = None
    sender_ids: Optional[List[UUID]] = None
    message_types: Optional[List[MessageType]] = None
    date_from: Optional[datetime] = None
    date_to: Optional[datetime] = None
    limit: int = Field(50, ge=1, le=100)


class MessageSearchResult(BaseModel):
    """Search result item"""
    message: MessageResponse
    conversation: ConversationResponse
    relevance_score: float = Field(..., ge=0, le=1)
    
    model_config = ConfigDict(from_attributes=True)


class MessageSearchResponse(BaseModel):
    """Response for message search"""
    results: List[MessageSearchResult]
    total: int
    query: str


class NotificationPreferences(BaseModel):
    """User's messaging notification preferences"""
    email_notifications: bool = True
    push_notifications: bool = True
    sms_notifications: bool = False
    
    # Granular settings
    notify_new_message: bool = True
    notify_new_conversation: bool = True
    notify_mentions: bool = True
    
    # Quiet hours
    quiet_hours_enabled: bool = False
    quiet_hours_start: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    quiet_hours_end: Optional[str] = Field(None, pattern="^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$")
    
    model_config = ConfigDict(from_attributes=True)


class WebSocketMessage(BaseModel):
    """WebSocket message format"""
    type: str = Field(..., description="Message type (message, typing, read_receipt, etc.)")
    data: Dict[str, Any]
    timestamp: datetime = Field(default_factory=datetime.utcnow)


# Update forward references
MessageResponse.model_rebuild()