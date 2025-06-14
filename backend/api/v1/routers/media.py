"""
Media router for FastAPI
"""
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from fastapi.responses import StreamingResponse
from typing import Optional, List
from uuid import UUID, uuid4
from datetime import datetime, timedelta
from django.db import transaction
from django.db.models import Sum, Count, Q, F
from asgiref.sync import sync_to_async
import mimetypes
import os

from media.models import Media, MediaVersion
from integrations.cloudflare_r2.storage import R2MediaStorage
from ..schemas.media import (
    MediaUploadRequest,
    MediaUploadResponse,
    MediaBatchUploadRequest,
    MediaBatchUploadResponse,
    MediaResponse,
    MediaUpdate,
    MediaGalleryResponse,
    MediaProcessingRequest,
    MediaProcessingResponse,
    MediaListFilters,
    MediaListResponse,
    DirectUploadRequest,
    DirectUploadResponse,
    MediaType,
    MediaStatus,
    MediaEntityType,
    MediaVersionInfo,
)
from ...dependencies import (
    get_db,
    get_current_user,
    get_current_user_optional,
    get_current_active_user,
    get_current_superuser,
    get_pagination_params,
    PaginationParams,
)
from users.models import User

router = APIRouter(tags=["Media"])

# Initialize storage
storage = R2MediaStorage()


def get_media_type(content_type: str) -> MediaType:
    """Determine media type from content type"""
    if content_type.startswith('image/'):
        return MediaType.IMAGE
    elif content_type.startswith('video/'):
        return MediaType.VIDEO
    elif content_type == 'application/pdf':
        return MediaType.DOCUMENT
    elif content_type.startswith('audio/'):
        return MediaType.AUDIO
    else:
        raise ValueError(f"Unsupported content type: {content_type}")


@sync_to_async
def serialize_media(media: Media) -> MediaResponse:
    """Serialize media object for API response"""
    # Get versions
    versions = []
    for version in media.versions.all():
        versions.append(MediaVersionInfo(
            version=version.version_type,
            url=version.url,
            width=version.width,
            height=version.height,
            file_size=version.file_size,
            format=version.format,
        ))
    
    # Get thumbnail URL
    thumbnail_url = None
    thumbnail_version = media.versions.filter(version_type='thumbnail').first()
    if thumbnail_version:
        thumbnail_url = thumbnail_version.url
    
    return MediaResponse(
        id=media.id,
        type=media.media_type,
        status=media.status,
        filename=media.filename,
        content_type=media.content_type,
        file_size=media.file_size,
        url=media.url,
        thumbnail_url=thumbnail_url,
        versions=versions,
        title=media.title,
        description=media.description,
        alt_text=media.alt_text,
        width=media.width,
        height=media.height,
        duration_seconds=media.duration,
        entity_type=media.entity_type,
        entity_id=media.entity_id,
        is_primary=media.is_primary,
        display_order=media.display_order,
        processing_info=media.processing_metadata,
        error_message=media.error_message,
        created_at=media.created_at,
        updated_at=media.updated_at,
        processed_at=media.processed_at,
        view_count=media.view_count,
        download_count=media.download_count,
    )


# Helper functions for complex ORM operations
@sync_to_async
def create_media_record(upload_request: MediaUploadRequest, current_user, media_id: UUID, storage_key: str):
    """Create media record in database"""
    return Media.objects.create(
        id=media_id,
        uploaded_by=current_user,
        entity_type=upload_request.entity_type,
        entity_id=upload_request.entity_id,
        media_type=get_media_type(upload_request.content_type),
        filename=upload_request.filename,
        content_type=upload_request.content_type,
        file_size=0,  # Will be updated after upload
        storage_key=storage_key,
        title=upload_request.title,
        description=upload_request.description,
        is_primary=upload_request.is_primary,
        status=MediaStatus.PENDING,
        metadata=upload_request.metadata or {},
    )


@sync_to_async
def get_media_by_id_and_user(media_id: UUID, user_id: int):
    """Get media by ID and user"""
    try:
        return Media.objects.get(id=media_id, uploaded_by_id=user_id)
    except Media.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )


@sync_to_async
def get_media_by_id(media_id: UUID):
    """Get media by ID with versions"""
    try:
        return Media.objects.select_related('versions').get(id=media_id)
    except Media.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )


@sync_to_async
def update_media_after_upload(media: Media, file_size: int, storage):
    """Update media record after upload completion"""
    media.file_size = file_size
    media.status = MediaStatus.PROCESSING
    media.url = storage.get_public_url(media.storage_key)
    media.save()
    
    # For now, just mark as ready (TODO: add actual processing)
    media.status = MediaStatus.READY
    media.processed_at = datetime.utcnow()
    media.save()
    
    return media


@sync_to_async
def increment_view_count(media: Media):
    """Increment media view count"""
    media.view_count = F('view_count') + 1
    media.save(update_fields=['view_count'])


@sync_to_async
def update_media_metadata(media: Media, update_data: dict):
    """Update media metadata"""
    # Handle is_primary update
    if 'is_primary' in update_data and update_data['is_primary']:
        # Unset other primary media for this entity
        Media.objects.filter(
            entity_type=media.entity_type,
            entity_id=media.entity_id,
            is_primary=True
        ).exclude(id=media.id).update(is_primary=False)
    
    for field, value in update_data.items():
        setattr(media, field, value)
    
    media.save()
    return media


@sync_to_async
def delete_media_and_storage(media: Media, storage):
    """Delete media from database and storage"""
    # Delete from storage
    try:
        storage.delete(media.storage_key)
        # Delete versions
        for version in media.versions.all():
            if version.storage_key:
                storage.delete(version.storage_key)
    except Exception as e:
        # Log error but continue with database deletion
        print(f"Error deleting media from storage: {e}")
    
    # Delete from database
    media.delete()


@sync_to_async
def get_entity_media_gallery(entity_type, entity_id):
    """Get media gallery for an entity"""
    media_items = Media.objects.filter(
        entity_type=entity_type,
        entity_id=entity_id,
        status=MediaStatus.READY
    ).order_by('display_order', '-created_at')
    
    return list(media_items)


@sync_to_async
def update_media_processing_status(media: Media, processing_options: dict):
    """Update media processing status"""
    media.status = MediaStatus.PROCESSING
    media.processing_metadata = processing_options
    media.save()
    return media


@sync_to_async
def get_filtered_media_list(current_user, filters, pagination):
    """Get filtered media list with pagination"""
    # Base queryset - only show user's media or public media
    queryset = Media.objects.select_related('versions')
    
    # Filter by user's uploads unless admin
    if not current_user.is_superuser:
        queryset = queryset.filter(uploaded_by=current_user)
    
    # Apply filters
    if filters.entity_type:
        queryset = queryset.filter(entity_type=filters.entity_type)
    
    if filters.entity_id:
        queryset = queryset.filter(entity_id=filters.entity_id)
    
    if filters.type:
        queryset = queryset.filter(media_type=filters.type)
    
    if filters.status:
        queryset = queryset.filter(status=filters.status)
    
    if filters.is_primary is not None:
        queryset = queryset.filter(is_primary=filters.is_primary)
    
    if filters.created_after:
        queryset = queryset.filter(created_at__gte=filters.created_after)
    
    if filters.created_before:
        queryset = queryset.filter(created_at__lte=filters.created_before)
    
    if filters.search:
        queryset = queryset.filter(
            Q(title__icontains=filters.search) |
            Q(description__icontains=filters.search) |
            Q(filename__icontains=filters.search)
        )
    
    # Sorting
    order_field = filters.sort_by
    if filters.sort_order == 'desc':
        order_field = f'-{order_field}'
    queryset = queryset.order_by(order_field)
    
    # Get aggregate stats
    stats = queryset.aggregate(
        total_size=Sum('file_size'),
        count=Count('id')
    )
    
    # Count by type
    by_type = {}
    for media_type in MediaType:
        count = queryset.filter(media_type=media_type.value).count()
        if count > 0:
            by_type[media_type.value] = count
    
    # Paginate
    total = queryset.count()
    items = list(queryset[pagination.offset:pagination.offset + pagination.limit])
    
    return {
        'items': items,
        'total': total,
        'stats': stats,
        'by_type': by_type
    }


@sync_to_async
def validate_entity_access_db(user, entity_type, entity_id, read_only=False):
    """Validate user has access to upload/modify media for entity"""
    if not user:
        return read_only  # Anonymous users can only read public content
    
    if user.is_superuser:
        return True
    
    # Entity-specific validation
    if entity_type == MediaEntityType.SERVICE:
        from services.models import Service
        try:
            service = Service.objects.get(id=entity_id)
            # Check if user is the practitioner who owns the service
            if hasattr(user, 'practitioner_profile'):
                return service.practitioner == user.practitioner_profile
            return read_only
        except Service.DoesNotExist:
            return False
    
    elif entity_type == MediaEntityType.PRACTITIONER:
        # Users can only upload to their own practitioner profile
        if hasattr(user, 'practitioner_profile'):
            return str(user.practitioner_profile.id) == str(entity_id)
        return read_only
    
    elif entity_type == MediaEntityType.USER:
        # Users can only upload to their own profile
        return str(user.id) == str(entity_id)
    
    elif entity_type == MediaEntityType.REVIEW:
        from reviews.models import Review
        try:
            review = Review.objects.get(id=entity_id)
            return review.user == user
        except Review.DoesNotExist:
            return False
    
    # Add more entity types as needed
    return False


@router.post("/upload", response_model=MediaUploadResponse)
async def initiate_upload(
    upload_request: MediaUploadRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Initiate media upload and get pre-signed URL"""
    # Validate entity access
    if not await validate_entity_access_db(
        current_user,
        upload_request.entity_type,
        upload_request.entity_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to upload media for this entity"
        )
    
    # Generate unique key for the file
    file_ext = os.path.splitext(upload_request.filename)[1]
    media_id = uuid4()
    storage_key = f"{upload_request.entity_type}/{upload_request.entity_id}/{media_id}{file_ext}"
    
    # Create media record
    media = await create_media_record(upload_request, current_user, media_id, storage_key)
    
    # Generate pre-signed upload URL
    upload_url, upload_headers = storage.generate_upload_url(
        key=storage_key,
        content_type=upload_request.content_type,
        expires_in=3600,  # 1 hour
    )
    
    return MediaUploadResponse(
        media_id=media.id,
        upload_url=upload_url,
        upload_method="PUT",
        upload_headers=upload_headers,
        expires_at=datetime.utcnow() + timedelta(hours=1),
    )


@router.post("/upload/batch", response_model=MediaBatchUploadResponse)
async def batch_upload(
    batch_request: MediaBatchUploadRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Initiate batch media upload"""
    # Validate entity access once
    if not _validate_entity_access(
        current_user,
        batch_request.entity_type,
        batch_request.entity_id
    ):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to upload media for this entity"
        )
    
    uploads = []
    
    for file_request in batch_request.files:
        # Override entity info from batch request
        file_request.entity_type = batch_request.entity_type
        file_request.entity_id = batch_request.entity_id
        
        # Process each file
        upload_response = await initiate_upload(file_request, current_user)
        uploads.append(upload_response)
    
    return MediaBatchUploadResponse(
        uploads=uploads,
        total=len(uploads),
    )


@router.post("/upload/complete/{media_id}")
async def complete_upload(
    media_id: UUID,
    file_size: int = Form(...),
    current_user: User = Depends(get_current_active_user),
):
    """Mark upload as complete and trigger processing"""
    media = await get_media_by_id_and_user(media_id, current_user.id)
    
    if media.status != MediaStatus.PENDING:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Media already processed"
        )
    
    # Update media record
    await update_media_after_upload(media, file_size, storage)
    
    return {"message": "Upload completed", "media_id": str(media_id)}


@router.get("/{media_id}", response_model=MediaResponse)
async def get_media(
    media_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get media metadata"""
    media = await get_media_by_id(media_id)
    
    # Check access permissions
    if not await validate_entity_access_db(current_user, media.entity_type, media.entity_id, read_only=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view this media"
        )
    
    # Increment view count
    await increment_view_count(media)
    
    return await serialize_media(media)


@router.patch("/{media_id}", response_model=MediaResponse)
async def update_media(
    media_id: UUID,
    media_update: MediaUpdate,
    current_user: User = Depends(get_current_active_user),
):
    """Update media metadata"""
    media = await get_media_by_id(media_id)
    
    # Check permissions
    if not await validate_entity_access_db(current_user, media.entity_type, media.entity_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to update this media"
        )
    
    # Update fields
    update_data = media_update.model_dump(exclude_unset=True)
    media = await update_media_metadata(media, update_data)
    
    return await serialize_media(media)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_media(
    media_id: UUID,
    current_user: User = Depends(get_current_active_user),
):
    """Delete media"""
    try:
        media = Media.objects.get(id=media_id)
    except Media.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check permissions
    if not _validate_entity_access(current_user, media.entity_type, media.entity_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to delete this media"
        )
    
    # Delete from storage
    try:
        storage.delete(media.storage_key)
        # Delete versions
        for version in media.versions.all():
            if version.storage_key:
                storage.delete(version.storage_key)
    except Exception as e:
        # Log error but continue with database deletion
        print(f"Error deleting media from storage: {e}")
    
    # Delete from database
    media.delete()


@router.get("/gallery/{entity_type}/{entity_id}", response_model=MediaGalleryResponse)
async def get_media_gallery(
    entity_type: MediaEntityType,
    entity_id: UUID,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get media gallery for an entity"""
    # Check access permissions
    if not _validate_entity_access(current_user, entity_type, entity_id, read_only=True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to view this gallery"
        )
    
    # Get all media for entity
    media_items = Media.objects.filter(
        entity_type=entity_type,
        entity_id=entity_id,
        status=MediaStatus.READY
    ).order_by('display_order', '-created_at')
    
    # Serialize media
    serialized_items = [serialize_media(m) for m in media_items]
    
    # Group by type
    images = [m for m in serialized_items if m.type == MediaType.IMAGE]
    videos = [m for m in serialized_items if m.type == MediaType.VIDEO]
    documents = [m for m in serialized_items if m.type == MediaType.DOCUMENT]
    
    # Find primary media
    primary_media = next((m for m in serialized_items if m.is_primary), None)
    
    return MediaGalleryResponse(
        entity_type=entity_type,
        entity_id=entity_id,
        total_items=len(serialized_items),
        primary_media=primary_media,
        media_items=serialized_items,
        images=images,
        videos=videos,
        documents=documents,
    )


@router.post("/{media_id}/process", response_model=MediaProcessingResponse)
async def process_media(
    media_id: UUID,
    processing_request: MediaProcessingRequest,
    current_user: User = Depends(get_current_active_user),
):
    """Trigger media processing/reprocessing"""
    try:
        media = Media.objects.get(id=media_id)
    except Media.DoesNotExist:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Media not found"
        )
    
    # Check permissions
    if not _validate_entity_access(current_user, media.entity_type, media.entity_id):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="No permission to process this media"
        )
    
    # Update status
    media.status = MediaStatus.PROCESSING
    media.processing_metadata = processing_request.options or {}
    media.save()
    
    # TODO: Trigger actual processing workflow
    job_id = f"process-{media_id}"
    
    return MediaProcessingResponse(
        media_id=media_id,
        status="processing",
        job_id=job_id,
        estimated_completion=datetime.utcnow() + timedelta(minutes=5),
    )


@router.get("/", response_model=MediaListResponse)
async def list_media(
    filters: MediaListFilters = Depends(),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: User = Depends(get_current_active_user),
):
    """List media with filters"""
    # Base queryset - only show user's media or public media
    queryset = Media.objects.select_related('versions')
    
    # Filter by user's uploads unless admin
    if not current_user.is_superuser:
        queryset = queryset.filter(uploaded_by=current_user)
    
    # Apply filters
    if filters.entity_type:
        queryset = queryset.filter(entity_type=filters.entity_type)
    
    if filters.entity_id:
        queryset = queryset.filter(entity_id=filters.entity_id)
    
    if filters.type:
        queryset = queryset.filter(media_type=filters.type)
    
    if filters.status:
        queryset = queryset.filter(status=filters.status)
    
    if filters.is_primary is not None:
        queryset = queryset.filter(is_primary=filters.is_primary)
    
    if filters.created_after:
        queryset = queryset.filter(created_at__gte=filters.created_after)
    
    if filters.created_before:
        queryset = queryset.filter(created_at__lte=filters.created_before)
    
    if filters.search:
        queryset = queryset.filter(
            Q(title__icontains=filters.search) |
            Q(description__icontains=filters.search) |
            Q(filename__icontains=filters.search)
        )
    
    # Sorting
    order_field = filters.sort_by
    if filters.sort_order == 'desc':
        order_field = f'-{order_field}'
    queryset = queryset.order_by(order_field)
    
    # Get aggregate stats
    stats = queryset.aggregate(
        total_size=Sum('file_size'),
        count=Count('id')
    )
    
    # Count by type
    by_type = {}
    for media_type in MediaType:
        count = queryset.filter(media_type=media_type.value).count()
        if count > 0:
            by_type[media_type.value] = count
    
    # Paginate
    total = queryset.count()
    items = queryset[pagination.offset:pagination.offset + pagination.limit]
    
    # Serialize
    results = [serialize_media(m) for m in items]
    
    return MediaListResponse(
        results=results,
        total=total,
        limit=pagination.limit,
        offset=pagination.offset,
        total_size_bytes=stats['total_size'] or 0,
        by_type=by_type,
    )


@router.post("/upload-url", response_model=DirectUploadResponse)
async def get_direct_upload_url(
    upload_request: DirectUploadRequest,
    current_user: Optional[User] = Depends(get_current_user_optional),
):
    """Get pre-signed URL for direct browser upload"""
    # Generate unique upload ID
    upload_id = str(uuid4())
    
    # Determine storage path
    if upload_request.entity_type and upload_request.entity_id:
        storage_key = f"{upload_request.entity_type}/{upload_request.entity_id}/{upload_id}/{upload_request.filename}"
    else:
        # Temporary upload path
        storage_key = f"temp/{upload_id}/{upload_request.filename}"
    
    # Generate pre-signed upload URL
    upload_url, upload_headers = storage.generate_upload_url(
        key=storage_key,
        content_type=upload_request.content_type,
        expires_in=3600,  # 1 hour
        metadata={
            'uploaded_by': str(current_user.id) if current_user else 'anonymous',
            'original_filename': upload_request.filename,
        }
    )
    
    # Determine max size based on content type
    if upload_request.content_type.startswith('image/'):
        max_size = 50 * 1024 * 1024  # 50MB
    elif upload_request.content_type.startswith('video/'):
        max_size = 5 * 1024 * 1024 * 1024  # 5GB
    else:
        max_size = 10 * 1024 * 1024  # 10MB
    
    return DirectUploadResponse(
        upload_id=upload_id,
        upload_url=upload_url,
        upload_method="PUT",
        upload_headers=upload_headers,
        complete_url=f"/api/v1/media/upload/complete/{upload_id}",
        expires_at=datetime.utcnow() + timedelta(hours=1),
        max_size_bytes=max_size,
    )


def _validate_entity_access(
    user: Optional[User],
    entity_type: str,
    entity_id: UUID,
    read_only: bool = False
) -> bool:
    """Validate user has access to upload/modify media for entity"""
    if not user:
        return read_only  # Anonymous users can only read public content
    
    if user.is_superuser:
        return True
    
    # Entity-specific validation
    if entity_type == MediaEntityType.SERVICE:
        from services.models import Service
        try:
            service = Service.objects.get(id=entity_id)
            # Check if user is the practitioner who owns the service
            if hasattr(user, 'practitioner_profile'):
                return service.practitioner == user.practitioner_profile
            return read_only
        except Service.DoesNotExist:
            return False
    
    elif entity_type == MediaEntityType.PRACTITIONER:
        # Users can only upload to their own practitioner profile
        if hasattr(user, 'practitioner_profile'):
            return str(user.practitioner_profile.id) == str(entity_id)
        return read_only
    
    elif entity_type == MediaEntityType.USER:
        # Users can only upload to their own profile
        return str(user.id) == str(entity_id)
    
    elif entity_type == MediaEntityType.REVIEW:
        from reviews.models import Review
        try:
            review = Review.objects.get(id=entity_id)
            return review.user == user
        except Review.DoesNotExist:
            return False
    
    # Add more entity types as needed
    
    return False