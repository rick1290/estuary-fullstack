"""
Messaging router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, Query, status
from typing import Optional, List
from uuid import UUID
from datetime import datetime, timedelta
from django.db import transaction
from django.db.models import Count, Q, Max, Prefetch, F, Exists, OuterRef, Subquery, Value
from django.db.models.functions import Coalesce
from asgiref.sync import sync_to_async

from messaging.models import Conversation, Message, ConversationParticipant, MessageReceipt
from media.models import Media
from ..schemas.messaging import (
    ConversationCreate,
    ConversationResponse,
    ConversationUpdate,
    ConversationFilters,
    ConversationListResponse,
    MessageCreate,
    MessageResponse,
    MessageFilters,
    MessageListResponse,
    MessageReadReceipt,
    TypingIndicator,
    ConversationParticipantAdd,
    BlockUserRequest,
    UnreadCountResponse,
    MessageSearchRequest,
    MessageSearchResponse,
    MessageSearchResult,
    NotificationPreferences,
    ParticipantInfo,
    MessageAttachment,
    ConversationType,
    MessageType,
    MessageStatus,
)
from ...dependencies import (
    get_db,
    get_current_user,
    get_current_active_user,
    get_pagination_params,
    PaginationParams,
)
from users.models import User

router = APIRouter(tags=["Messaging"])


# Async database operations
@sync_to_async
def get_media_by_id(media_id):
    """Get media object by ID"""
    try:
        return Media.objects.get(id=media_id)
    except Media.DoesNotExist:
        return None


@sync_to_async
def get_message_by_id(message_id):
    """Get message by ID"""
    try:
        return Message.objects.get(id=message_id)
    except Message.DoesNotExist:
        return None


@sync_to_async
def get_message_read_status(message, user):
    """Get message read status for user"""
    from messaging.models import MessageReadStatus
    return MessageReadStatus.objects.filter(message=message, user=user).first()


@sync_to_async
def get_conversation_participants(conversation):
    """Get conversation participants"""
    return list(conversation.participants.all())


@sync_to_async
def get_conversation_last_message(conversation):
    """Get conversation's last message"""
    return conversation.messages.order_by('-created_at').first()


@sync_to_async
def get_conversation_unread_count(conversation, user):
    """Get unread message count for conversation"""
    return conversation.messages.filter(
        ~Q(sender=user)
    ).exclude(
        receipts__user=user
    ).count()


@sync_to_async
def get_conversation_participant(conversation, user):
    """Get conversation participant for user"""
    return conversation.participants.filter(user=user).first()


@sync_to_async
def create_conversation_with_participants(conversation_data, participants, current_user):
    """Create conversation with participants in transaction"""
    with transaction.atomic():
        conversation = Conversation.objects.create(
            title=conversation_data.title,
            conversation_type=conversation_data.conversation_type,
            created_by=current_user,
            metadata=conversation_data.metadata or {},
        )
        
        # Add participants
        for user in participants:
            ConversationParticipant.objects.create(
                conversation=conversation,
                user=user,
                joined_at=datetime.utcnow(),
            )
        
        # Create initial message if provided
        if conversation_data.message:
            message = Message.objects.create(
                conversation=conversation,
                sender=current_user,
                content=conversation_data.message.content,
                message_type=conversation_data.messaggoe.message_type,
                metadata=conversation_data.message.metadata or {},
                attachments=conversation_data.message.attachment_ids or [],
            )
            
            # Update conversation last message time
            conversation.last_message_at = message.created_at
            conversation.save()
    
    return conversation


@sync_to_async
def create_message_with_conversation_update(conversation, message_data, current_user):
    """Create message and update conversation in transaction"""
    with transaction.atomic():
        message = Message.objects.create(
            conversation=conversation,
            sender=current_user,
            content=message_data.content,
            message_type=message_data.message_type,
            reply_to_id=message_data.reply_to_id,
            metadata=message_data.metadata or {},
            attachments=message_data.attachment_ids or [],
            status=MessageStatus.SENT,
        )
        
        # Update conversation last message time
        conversation.last_message_at = message.created_at
        conversation.save()
        
        # Mark as delivered (in real app, this would be async)
        message.delivered_at = datetime.utcnow()
        message.status = MessageStatus.DELIVERED
        message.save()
    
    return message


@sync_to_async
def mark_message_as_read(message, user):
    """Mark message as read and update status if needed"""
    from messaging.models import MessageReadStatus
    
    # Create or update read status
    MessageReadStatus.objects.update_or_create(
        message=message,
        user=user,
        defaults={'read_at': datetime.utcnow()}
    )
    
    # Update message status if all participants have read
    participant_count = message.conversation.participants.exclude(
        user=message.sender
    ).count()
    read_count = message.read_statuses.count()
    
    if read_count >= participant_count:
        message.status = MessageStatus.READ
        message.save()


@sync_to_async
def bulk_mark_messages_read(messages, user, read_at):
    """Bulk mark messages as read"""
    # Bulk create read receipts
    receipts = []
    for message in messages:
        receipts.append(
            MessageReceipt(
                message=message,
                user=user,
                created_at=read_at
            )
        )
    
    # Use bulk_create with ignore_conflicts to handle duplicates
    MessageReceipt.objects.bulk_create(
        receipts,
        ignore_conflicts=True
    )
    
    # Update message statuses
    Message.objects.filter(
        id__in=[m.id for m in messages],
        status=MessageStatus.DELIVERED
    ).update(status=MessageStatus.READ)


@sync_to_async
def add_participants_to_conversation(conversation, new_users, current_user):
    """Add participants to conversation in transaction"""
    added = []
    with transaction.atomic():
        for user in new_users:
            cp, created = ConversationParticipant.objects.get_or_create(
                conversation=conversation,
                user=user,
                defaults={
                    'joined_at': datetime.utcnow(),
                    'added_by': current_user,
                }
            )
            if created:
                added.append(user)
                
                # Create system message
                Message.objects.create(
                    conversation=conversation,
                    sender=current_user,
                    content=f"{user.first_name} {user.last_name} was added to the conversation",
                    message_type=MessageType.SYSTEM,
                )
    
    return added


@sync_to_async
def remove_participant_from_conversation(conversation, user_id, current_user):
    """Remove participant from conversation"""
    to_remove = ConversationParticipant.objects.get(
        conversation=conversation,
        user_id=user_id
    )
    removed_user = to_remove.user
    to_remove.delete()
    
    # Create system message
    if user_id == current_user.id:
        message_content = f"{current_user.first_name} {current_user.last_name} left the conversation"
    else:
        message_content = f"{removed_user.first_name} {removed_user.last_name} was removed from the conversation"
    
    Message.objects.create(
        conversation=conversation,
        sender=current_user,
        content=message_content,
        message_type=MessageType.SYSTEM,
    )
    
    return removed_user


def serialize_participant(user: User) -> ParticipantInfo:
    """Serialize user as conversation participant"""
    return ParticipantInfo(
        id=user.id,
        first_name=user.first_name,
        last_name=user.last_name,
        display_name=getattr(user, 'display_name', None),
        profile_image_url=getattr(user, 'profile_image_url', None),
        is_practitioner=hasattr(user, 'practitioner_profile'),
        is_online=False,  # TODO: Implement online status
        last_seen=user.last_login,
    )


async def serialize_message(message: Message, current_user: User) -> MessageResponse:
    """Serialize message for API response"""
    # Get attachments
    attachments = []
    if message.attachments:
        for media_id in message.attachments:
            media = await get_media_by_id(media_id)
            if media:
                attachments.append(MessageAttachment(
                    id=media.id,
                    filename=media.filename,
                    content_type=media.content_type,
                    file_size=media.file_size,
                    url=media.url,
                    thumbnail_url=media.thumbnail_url,
                ))
    
    # Get reply_to if exists
    reply_to = None
    if message.reply_to_id:
        reply_msg = await get_message_by_id(message.reply_to_id)
        if reply_msg:
            reply_to = await serialize_message(reply_msg, current_user)
    
    # Check read status
    read_at = None
    if message.sender != current_user:
        read_status = await get_message_read_status(message, current_user)
        if read_status:
            read_at = read_status.read_at
    
    return MessageResponse(
        id=message.id,
        conversation_id=message.conversation_id,
        sender=serialize_participant(message.sender),
        content=message.content,
        message_type=message.message_type,
        status=message.status,
        created_at=message.created_at,
        updated_at=message.updated_at,
        delivered_at=message.delivered_at,
        read_at=read_at,
        metadata=message.metadata or {},
        attachments=attachments,
        reply_to=reply_to,
        is_mine=message.sender == current_user,
        can_delete=message.sender == current_user or current_user.is_superuser,
    )


async def serialize_conversation(conversation: Conversation, current_user: User) -> ConversationResponse:
    """Serialize conversation for API response"""
    # Get participants
    participants_data = await get_conversation_participants(conversation)
    participants = []
    for cp in participants_data:
        participants.append(serialize_participant(cp.user))
    
    # Get last message
    last_message = None
    last_message_obj = await get_conversation_last_message(conversation)
    if last_message_obj:
        last_message = await serialize_message(last_message_obj, current_user)
    
    # Get unread count
    unread_count = await get_conversation_unread_count(conversation, current_user)
    
    # Get user-specific data
    participant = await get_conversation_participant(conversation, current_user)
    
    return ConversationResponse(
        id=conversation.id,
        title=conversation.title,
        conversation_type=conversation.conversation_type,
        created_by=serialize_participant(conversation.created_by),
        participants=participants,
        participant_count=len(participants),
        last_message=last_message,
        last_message_at=conversation.last_message_at,
        unread_count=unread_count,
        is_archived=participant.is_archived if participant else False,
        is_muted=participant.is_muted if participant else False,
        is_blocked=False,  # TODO: Implement blocking
        metadata=conversation.metadata or {},
        created_at=conversation.created_at,
        updated_at=conversation.updated_at,
    )


@sync_to_async
def get_conversations_queryset(filters, current_user):
    """Get conversations queryset with filters applied"""
    # Base queryset - user's conversations
    queryset = Conversation.objects.filter(
        participants__user=current_user
    ).prefetch_related(
        Prefetch('participants__user'),
        Prefetch('messages')
    ).distinct()
    
    # Apply filters
    if filters.is_archived is not None:
        queryset = queryset.filter(
            participants__user=current_user,
            participants__is_archived=filters.is_archived
        )
    
    if filters.is_muted is not None:
        queryset = queryset.filter(
            participants__user=current_user,
            participants__is_muted=filters.is_muted
        )
    
    if filters.conversation_type:
        queryset = queryset.filter(conversation_type=filters.conversation_type)
    
    if filters.participant_id:
        queryset = queryset.filter(participants__user_id=filters.participant_id)
    
    if filters.has_unread:
        unread_subquery = Message.objects.filter(
            conversation=OuterRef('pk')
        ).exclude(
            sender=current_user
        ).exclude(
            receipts__user=current_user
        )
        queryset = queryset.annotate(
            has_unread=Exists(unread_subquery)
        ).filter(has_unread=True)
    
    if filters.search:
        queryset = queryset.filter(
            Q(title__icontains=filters.search) |
            Q(messages__content__icontains=filters.search)
        ).distinct()
    
    # Sorting
    if filters.sort_by == "last_message_at":
        queryset = queryset.order_by('-last_message_at')
    elif filters.sort_by == "created_at":
        queryset = queryset.order_by('-created_at')
    elif filters.sort_by == "unread_count":
        # Complex sorting by unread count
        # Use subquery for unread count
        from django.db.models import Subquery
        unread_subq = Message.objects.filter(
            conversation=OuterRef('pk')
        ).exclude(
            sender=current_user
        ).exclude(
            receipts__user=current_user
        ).values('conversation').annotate(
            count=Count('*')
        ).values('count')
        
        queryset = queryset.annotate(
            unread_count=Coalesce(Subquery(unread_subq), 0)
        ).order_by('-unread_count', '-last_message_at')
    
    return queryset


@sync_to_async
def get_total_unread_conversations(current_user):
    """Get total count of conversations with unread messages"""
    return Conversation.objects.filter(
        participants__user=current_user
    ).annotate(
        has_unread=Exists(
            Message.objects.filter(
                conversation=OuterRef('pk')
            ).exclude(
                sender=current_user
            ).exclude(
                receipts__user=current_user
            )
        )
    ).filter(has_unread=True).count()


@sync_to_async
def get_conversations_page(queryset, pagination):
    """Get paginated conversations"""
    total = queryset.count()
    conversations = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    return total, conversations


@router.get("/conversations", response_model=ConversationListResponse)
async def list_conversations(
    filters: ConversationFilters = Depends(),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """List user's conversations"""
    # Get queryset with filters
    queryset = await get_conversations_queryset(filters, current_user)
    
    # Get total unread count
    total_unread = await get_total_unread_conversations(current_user)
    
    # Paginate
    total, conversations = await get_conversations_page(queryset, pagination)
    
    # Serialize
    results = []
    for conv in conversations:
        result = await serialize_conversation(conv, current_user)
        results.append(result)
    
    return ConversationListResponse(
        results=results,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
        total_unread=total_unread,
    )


@sync_to_async
def validate_participants(participant_ids):
    """Validate that all participants exist"""
    participants = User.objects.filter(id__in=participant_ids)
    if participants.count() != len(participant_ids):
        return None, False
    return list(participants), True


@sync_to_async
def check_existing_direct_conversation(participants):
    """Check if direct conversation already exists between participants"""
    if len(participants) == 2:
        existing = Conversation.objects.filter(
            conversation_type=ConversationType.DIRECT,
            participants__user__in=participants
        ).annotate(
            participant_count=Count('participants')
        ).filter(participant_count=2)
        
        return existing.first() if existing.exists() else None
    return None


@router.post("/conversations", response_model=ConversationResponse, status_code=status.HTTP_201_CREATED)
async def create_conversation(
    conversation_data: ConversationCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Start a new conversation"""
    # Validate participants
    if current_user.id not in conversation_data.participant_ids:
        conversation_data.participant_ids.append(current_user.id)
    
    # Check if all participants exist
    participants, valid = await validate_participants(conversation_data.participant_ids)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more participants not found"
        )
    
    # Determine conversation type
    conversation_type = conversation_data.conversation_type
    if not conversation_type:
        conversation_type = ConversationType.DIRECT if len(participants) == 2 else ConversationType.GROUP
    
    # Check if direct conversation already exists
    if conversation_type == ConversationType.DIRECT:
        existing = await check_existing_direct_conversation(participants)
        if existing:
            return await serialize_conversation(existing, current_user)
    
    # Update conversation data with determined type
    conversation_data.conversation_type = conversation_type
    
    # Create conversation
    conversation = await create_conversation_with_participants(conversation_data, participants, current_user)
    
    return await serialize_conversation(conversation, current_user)


@sync_to_async
def get_conversation_by_id(conversation_id, current_user):
    """Get conversation by ID with user access check"""
    try:
        return Conversation.objects.prefetch_related(
            'participants__user',
            'messages'
        ).get(
            id=conversation_id,
            participants__user=current_user
        )
    except Conversation.DoesNotExist:
        return None


@router.get("/conversations/{conversation_id}", response_model=ConversationResponse)
async def get_conversation(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get conversation details"""
    conversation = await get_conversation_by_id(conversation_id, current_user)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    return await serialize_conversation(conversation, current_user)


@sync_to_async
def get_messages_queryset(conversation, filters, current_user):
    """Get messages queryset for conversation with filters"""
    # Base queryset
    queryset = Message.objects.filter(
        conversation=conversation
    ).select_related('sender')
    
    # Apply filters
    if filters.sender_id:
        queryset = queryset.filter(sender_id=filters.sender_id)
    
    if filters.message_type:
        queryset = queryset.filter(message_type=filters.message_type)
    
    if filters.has_attachments:
        queryset = queryset.exclude(attachments=[])
    
    if filters.search:
        queryset = queryset.filter(content__icontains=filters.search)
    
    if filters.before:
        queryset = queryset.filter(created_at__lt=filters.before)
    
    if filters.after:
        queryset = queryset.filter(created_at__gt=filters.after)
    
    if filters.is_unread:
        queryset = queryset.exclude(
            receipts__user=current_user
        )
    
    # Order by created_at descending (newest first)
    queryset = queryset.order_by('-created_at')
    
    return queryset


@sync_to_async
def get_messages_page(queryset, pagination):
    """Get paginated messages"""
    total = queryset.count()
    messages = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    return total, messages


@router.get("/conversations/{conversation_id}/messages", response_model=MessageListResponse)
async def list_messages(
    conversation_id: UUID,
    filters: MessageFilters = Depends(),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get messages in a conversation"""
    # Verify user has access to conversation
    conversation = await get_conversation_by_id(conversation_id, current_user)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Get queryset with filters
    queryset = await get_messages_queryset(conversation, filters, current_user)
    
    # Paginate
    total, messages = await get_messages_page(queryset, pagination)
    
    # Serialize (reverse order for display)
    results = []
    for msg in reversed(messages):
        result = await serialize_message(msg, current_user)
        results.append(result)
    
    return MessageListResponse(
        results=results,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
        has_more=total > pagination.offset + pagination.limit,
    )


@sync_to_async
def validate_reply_to_message(reply_to_id, conversation):
    """Validate reply_to message exists in conversation"""
    try:
        Message.objects.get(
            id=reply_to_id,
            conversation=conversation
        )
        return True
    except Message.DoesNotExist:
        return False


@sync_to_async
def validate_attachments(attachment_ids, current_user):
    """Validate that all attachments exist and belong to user"""
    if not attachment_ids:
        return True
    
    attachments = Media.objects.filter(
        id__in=attachment_ids,
        uploaded_by=current_user
    )
    return attachments.count() == len(attachment_ids)


@router.post("/conversations/{conversation_id}/messages", response_model=MessageResponse, status_code=status.HTTP_201_CREATED)
async def send_message(
    conversation_id: UUID,
    message_data: MessageCreate,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Send a message in a conversation"""
    # Verify user has access to conversation
    conversation = await get_conversation_by_id(conversation_id, current_user)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if conversation is blocked
    # TODO: Implement blocking logic
    
    # Validate reply_to if provided
    if message_data.reply_to_id:
        valid_reply = await validate_reply_to_message(message_data.reply_to_id, conversation)
        if not valid_reply:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reply to message not found"
            )
    
    # Validate attachments if provided
    if message_data.attachment_ids:
        valid_attachments = await validate_attachments(message_data.attachment_ids, current_user)
        if not valid_attachments:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="One or more attachments not found"
            )
    
    # Create message
    message = await create_message_with_conversation_update(conversation, message_data, current_user)
    
    # TODO: Send real-time notification via WebSocket
    # TODO: Send push notification if recipient is offline
    
    return await serialize_message(message, current_user)


@sync_to_async
def get_message_with_access_check(message_id, current_user):
    """Get message and check user access"""
    try:
        message = Message.objects.get(id=message_id)
        # Check if user has access to conversation
        has_access = message.conversation.participants.filter(user=current_user).exists()
        return message, has_access
    except Message.DoesNotExist:
        return None, False


@router.patch("/messages/{message_id}/read")
async def mark_message_read(
    message_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Mark a message as read"""
    message, has_access = await get_message_with_access_check(message_id, current_user)
    
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    if not has_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No access to this message"
        )
    
    # Don't mark own messages as read
    if message.sender == current_user:
        return {"message": "Cannot mark own message as read"}
    
    # Mark message as read
    await mark_message_as_read(message, current_user)
    
    return {"message": "Message marked as read"}


@sync_to_async
def get_messages_to_mark_read(conversation, message_ids, current_user):
    """Get messages to mark as read"""
    return list(Message.objects.filter(
        id__in=message_ids,
        conversation=conversation
    ).exclude(sender=current_user))


@router.post("/conversations/{conversation_id}/messages/read")
async def mark_messages_read(
    conversation_id: UUID,
    read_receipt: MessageReadReceipt,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Mark multiple messages as read"""
    # Verify user has access to conversation
    conversation = await get_conversation_by_id(conversation_id, current_user)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Get messages
    messages = await get_messages_to_mark_read(conversation, read_receipt.message_ids, current_user)
    
    read_at = read_receipt.read_at or datetime.utcnow()
    
    # Bulk mark messages as read
    await bulk_mark_messages_read(messages, current_user, read_at)
    
    return {"message": f"Marked {len(messages)} messages as read"}


@sync_to_async
def soft_delete_message(message):
    """Soft delete a message"""
    message.is_deleted = True
    message.deleted_at = datetime.utcnow()
    message.save()


@router.delete("/messages/{message_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_message(
    message_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Delete a message (soft delete)"""
    message = await get_message_by_id(message_id)
    if not message:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Message not found"
        )
    
    # Only sender or admin can delete
    if message.sender != current_user and not current_user.is_superuser:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot delete this message"
        )
    
    # Soft delete
    await soft_delete_message(message)


@sync_to_async
def get_conversation_participant_for_archive(conversation_id, user):
    """Get conversation participant for archiving"""
    try:
        return ConversationParticipant.objects.get(
            conversation_id=conversation_id,
            user=user
        )
    except ConversationParticipant.DoesNotExist:
        return None


@sync_to_async
def update_participant_archive_status(participant, archive):
    """Update participant archive status"""
    participant.is_archived = archive
    participant.save()


@router.patch("/conversations/{conversation_id}/archive")
async def archive_conversation(
    conversation_id: UUID,
    archive: bool = True,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Archive or unarchive a conversation"""
    participant = await get_conversation_participant_for_archive(conversation_id, current_user)
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    await update_participant_archive_status(participant, archive)
    
    return {"message": f"Conversation {'archived' if archive else 'unarchived'}"}


@router.get("/conversations/{conversation_id}/participants")
async def get_participants(
    conversation_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get conversation participants"""
    conversation = await get_conversation_by_id(conversation_id, current_user)
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    participants_data = await get_conversation_participants(conversation)
    participants = []
    for cp in participants_data:
        participant_data = serialize_participant(cp.user)
        participants.append({
            **participant_data.model_dump(),
            'joined_at': cp.joined_at,
            'is_admin': cp.is_admin,
            'added_by': cp.added_by_id,
        })
    
    return {"participants": participants}


@sync_to_async
def get_conversation_for_admin_check(conversation_id, current_user):
    """Get conversation and check if user is admin"""
    try:
        conversation = Conversation.objects.get(id=conversation_id)
        participant = conversation.participants.filter(user=current_user).first()
        is_admin = participant.is_admin if participant else False
        return conversation, participant, is_admin
    except Conversation.DoesNotExist:
        return None, None, False


@sync_to_async  
def validate_new_participants(user_ids):
    """Validate new participants exist"""
    new_users = User.objects.filter(id__in=user_ids)
    if new_users.count() != len(user_ids):
        return None, False
    return list(new_users), True


@router.post("/conversations/{conversation_id}/participants")
async def add_participants(
    conversation_id: UUID,
    participant_data: ConversationParticipantAdd,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Add participants to a conversation"""
    conversation, participant, is_admin = await get_conversation_for_admin_check(conversation_id, current_user)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check if user is participant and admin
    if not participant or not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can add participants"
        )
    
    # Only group conversations can have participants added
    if conversation.conversation_type != ConversationType.GROUP:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot add participants to this conversation type"
        )
    
    # Validate new participants
    new_users, valid = await validate_new_participants(participant_data.user_ids)
    if not valid:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="One or more users not found"
        )
    
    # Add participants
    added_users = await add_participants_to_conversation(conversation, new_users, current_user)
    added = [serialize_participant(user) for user in added_users]
    
    return {
        "message": f"Added {len(added)} participants",
        "added": added
    }


@router.delete("/conversations/{conversation_id}/participants/{user_id}")
async def remove_participant(
    conversation_id: UUID,
    user_id: UUID,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Remove a participant from conversation"""
    conversation, participant, is_admin = await get_conversation_for_admin_check(conversation_id, current_user)
    
    if not conversation:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Conversation not found"
        )
    
    # Check permissions
    if not participant:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not a participant"
        )
    
    # Users can remove themselves, admins can remove others
    if user_id != current_user.id and not is_admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can remove other participants"
        )
    
    # Cannot remove from direct conversations
    if conversation.conversation_type == ConversationType.DIRECT:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot remove participants from direct conversations"
        )
    
    # Remove participant
    try:
        removed_user = await remove_participant_from_conversation(conversation, user_id, current_user)
        return {"message": "Participant removed"}
        
    except ConversationParticipant.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Participant not found"
        )


@sync_to_async
def get_user_conversations_with_unread(current_user):
    """Get user conversations for unread count calculation"""
    conversations = Conversation.objects.filter(
        participants__user=current_user
    ).prefetch_related('messages')
    
    total_unread_messages = 0
    total_unread_conversations = 0
    by_conversation = {}
    
    for conversation in conversations:
        unread_count = conversation.messages.exclude(
            sender=current_user
        ).exclude(
            receipts__user=current_user
        ).count()
        
        if unread_count > 0:
            total_unread_messages += unread_count
            total_unread_conversations += 1
            by_conversation[str(conversation.id)] = unread_count
    
    return total_unread_messages, total_unread_conversations, by_conversation


@router.get("/unread-count", response_model=UnreadCountResponse)
async def get_unread_count(
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Get unread message count"""
    # Get conversations with unread messages
    total_unread_messages, total_unread_conversations, by_conversation = await get_user_conversations_with_unread(current_user)
    
    return UnreadCountResponse(
        total_unread_messages=total_unread_messages,
        total_unread_conversations=total_unread_conversations,
        by_conversation=by_conversation,
    )


@sync_to_async
def search_messages_queryset(search_request, current_user):
    """Search messages with filters"""
    # Base queryset - only user's messages
    queryset = Message.objects.filter(
        conversation__participants__user=current_user,
        content__icontains=search_request.query
    ).select_related('sender', 'conversation').distinct()
    
    # Apply filters
    if search_request.conversation_ids:
        queryset = queryset.filter(conversation_id__in=search_request.conversation_ids)
    
    if search_request.sender_ids:
        queryset = queryset.filter(sender_id__in=search_request.sender_ids)
    
    if search_request.message_types:
        queryset = queryset.filter(message_type__in=search_request.message_types)
    
    if search_request.date_from:
        queryset = queryset.filter(created_at__gte=search_request.date_from)
    
    if search_request.date_to:
        queryset = queryset.filter(created_at__lte=search_request.date_to)
    
    # Order by relevance (simple version - by recency)
    queryset = queryset.order_by('-created_at')
    
    # Limit results
    total = queryset.count()
    messages = list(queryset[:search_request.limit])
    
    return total, messages


@router.post("/search", response_model=MessageSearchResponse)
async def search_messages(
    search_request: MessageSearchRequest,
    current_user: User = Depends(get_current_active_user),
    db=Depends(get_db),
):
    """Search messages across conversations"""
    # Get search results
    total, messages = await search_messages_queryset(search_request, current_user)
    
    # Serialize results
    results = []
    for message in messages:
        message_result = await serialize_message(message, current_user)
        conversation_result = await serialize_conversation(message.conversation, current_user)
        results.append(MessageSearchResult(
            message=message_result,
            conversation=conversation_result,
            relevance_score=1.0,  # TODO: Implement proper relevance scoring
        ))
    
    return MessageSearchResponse(
        results=results,
        total=total,
        query=search_request.query,
    )