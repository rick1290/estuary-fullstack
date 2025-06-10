"""
Media schemas for FastAPI endpoints
"""
from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from uuid import UUID
from enum import Enum

from .base import BaseSchema, ListResponse


class MediaType(str, Enum):
    """Supported media types"""
    IMAGE = "image"
    VIDEO = "video"
    DOCUMENT = "document"
    AUDIO = "audio"


class MediaStatus(str, Enum):
    """Media processing status"""
    PENDING = "pending"
    PROCESSING = "processing"
    READY = "ready"
    FAILED = "failed"


class MediaEntityType(str, Enum):
    """Types of entities that can have media"""
    SERVICE = "service"
    PRACTITIONER = "practitioner"
    REVIEW = "review"
    USER = "user"
    STREAM_POST = "stream_post"
    ROOM_RECORDING = "room_recording"


class MediaUploadRequest(BaseModel):
    """Request for media upload"""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str = Field(..., description="MIME type of the file")
    entity_type: MediaEntityType
    entity_id: UUID
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    is_primary: bool = Field(False, description="Set as primary media for entity")
    metadata: Optional[Dict[str, Any]] = Field(default_factory=dict)
    
    @field_validator('content_type')
    def validate_content_type(cls, v):
        """Validate content type is supported"""
        allowed_types = [
            'image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif',
            'video/mp4', 'video/quicktime', 'video/webm',
            'application/pdf',
            'audio/mpeg', 'audio/wav', 'audio/webm'
        ]
        if v not in allowed_types:
            raise ValueError(f"Content type {v} not supported")
        return v


class MediaUploadResponse(BaseModel):
    """Response after initiating media upload"""
    media_id: UUID
    upload_url: str = Field(..., description="Pre-signed URL for upload")
    upload_method: str = Field(default="PUT", description="HTTP method for upload")
    upload_headers: Dict[str, str] = Field(
        default_factory=dict,
        description="Headers to include in upload request"
    )
    expires_at: datetime = Field(..., description="When the upload URL expires")
    
    model_config = ConfigDict(from_attributes=True)


class MediaBatchUploadRequest(BaseModel):
    """Request for batch media upload"""
    files: List[MediaUploadRequest] = Field(..., min_length=1, max_length=20)
    entity_type: MediaEntityType
    entity_id: UUID


class MediaBatchUploadResponse(BaseModel):
    """Response for batch upload"""
    uploads: List[MediaUploadResponse]
    total: int


class MediaVersionInfo(BaseModel):
    """Information about a media version/variant"""
    version: str = Field(..., description="Version identifier (e.g., 'thumbnail', 'hd')")
    url: str
    width: Optional[int] = None
    height: Optional[int] = None
    file_size: int
    format: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class MediaResponse(BaseSchema):
    """Media item response"""
    id: UUID
    type: MediaType
    status: MediaStatus
    
    # File info
    filename: str
    content_type: str
    file_size: int
    
    # URLs
    url: str = Field(..., description="URL to access the media")
    thumbnail_url: Optional[str] = None
    versions: List[MediaVersionInfo] = Field(
        default_factory=list,
        description="Different versions/sizes of the media"
    )
    
    # Metadata
    title: Optional[str] = None
    description: Optional[str] = None
    alt_text: Optional[str] = None
    
    # Dimensions (for images/videos)
    width: Optional[int] = None
    height: Optional[int] = None
    duration_seconds: Optional[float] = Field(None, description="Duration for video/audio")
    
    # Entity relationship
    entity_type: MediaEntityType
    entity_id: UUID
    is_primary: bool = False
    display_order: int = 0
    
    # Processing info
    processing_info: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    
    # Timestamps
    created_at: datetime
    updated_at: datetime
    processed_at: Optional[datetime] = None
    
    # Usage stats
    view_count: int = 0
    download_count: int = 0
    
    model_config = ConfigDict(from_attributes=True)


class MediaUpdate(BaseModel):
    """Schema for updating media metadata"""
    title: Optional[str] = Field(None, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    alt_text: Optional[str] = Field(None, max_length=500)
    is_primary: Optional[bool] = None
    display_order: Optional[int] = None
    metadata: Optional[Dict[str, Any]] = None


class MediaGalleryResponse(BaseModel):
    """Response for media gallery"""
    entity_type: MediaEntityType
    entity_id: UUID
    total_items: int
    primary_media: Optional[MediaResponse] = None
    media_items: List[MediaResponse]
    
    # Grouped by type
    images: List[MediaResponse] = Field(default_factory=list)
    videos: List[MediaResponse] = Field(default_factory=list)
    documents: List[MediaResponse] = Field(default_factory=list)
    
    model_config = ConfigDict(from_attributes=True)


class MediaProcessingRequest(BaseModel):
    """Request to process/reprocess media"""
    operations: List[str] = Field(
        ...,
        description="Operations to perform (e.g., 'thumbnail', 'optimize', 'transcode')"
    )
    options: Optional[Dict[str, Any]] = Field(
        default_factory=dict,
        description="Processing options"
    )


class MediaProcessingResponse(BaseModel):
    """Response for media processing request"""
    media_id: UUID
    status: str = Field(..., description="Processing status")
    job_id: Optional[str] = Field(None, description="Background job ID")
    estimated_completion: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)


class MediaListFilters(BaseModel):
    """Filters for listing media"""
    entity_type: Optional[MediaEntityType] = None
    entity_id: Optional[UUID] = None
    type: Optional[MediaType] = None
    status: Optional[MediaStatus] = None
    is_primary: Optional[bool] = None
    created_after: Optional[datetime] = None
    created_before: Optional[datetime] = None
    search: Optional[str] = Field(None, description="Search in title/description")
    sort_by: str = Field("created_at", pattern="^(created_at|updated_at|display_order|file_size)$")
    sort_order: str = Field("desc", pattern="^(asc|desc)$")


class MediaListResponse(ListResponse):
    """Response for media list"""
    results: List[MediaResponse]
    
    # Summary stats
    total_size_bytes: int = 0
    by_type: Dict[str, int] = Field(
        default_factory=dict,
        description="Count by media type"
    )


class MediaUploadProgress(BaseModel):
    """Upload progress tracking"""
    media_id: UUID
    bytes_uploaded: int
    total_bytes: int
    percentage: float
    status: str = Field(..., description="uploading, completed, failed")
    error: Optional[str] = None
    
    model_config = ConfigDict(from_attributes=True)


class DirectUploadRequest(BaseModel):
    """Request for direct upload URL"""
    filename: str = Field(..., min_length=1, max_length=255)
    content_type: str
    file_size: int = Field(..., gt=0, le=5368709120)  # Max 5GB
    entity_type: Optional[MediaEntityType] = None
    entity_id: Optional[UUID] = None
    
    @field_validator('file_size')
    def validate_file_size(cls, v, info):
        """Validate file size based on content type"""
        content_type = info.data.get('content_type', '')
        
        # Different limits for different types
        if content_type.startswith('image/'):
            max_size = 50 * 1024 * 1024  # 50MB for images
        elif content_type.startswith('video/'):
            max_size = 5 * 1024 * 1024 * 1024  # 5GB for videos
        elif content_type == 'application/pdf':
            max_size = 100 * 1024 * 1024  # 100MB for PDFs
        else:
            max_size = 10 * 1024 * 1024  # 10MB default
        
        if v > max_size:
            raise ValueError(f"File size exceeds maximum allowed ({max_size} bytes)")
        return v


class DirectUploadResponse(BaseModel):
    """Response with direct upload details"""
    upload_id: str = Field(..., description="Unique upload identifier")
    upload_url: str = Field(..., description="URL to upload to")
    upload_method: str = Field(default="PUT")
    upload_headers: Dict[str, str] = Field(default_factory=dict)
    complete_url: str = Field(..., description="URL to call after upload completes")
    expires_at: datetime
    max_size_bytes: int
    
    model_config = ConfigDict(from_attributes=True)