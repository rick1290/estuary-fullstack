"""
Media API serializers
"""
from rest_framework import serializers
from django.core.validators import FileExtensionValidator
from django.core.files.uploadedfile import InMemoryUploadedFile
from media.models import Media, MediaVersion, MediaProcessingJob, MediaType, MediaStatus, MediaEntityType
from typing import List, Dict, Any
import magic
import os


class MediaVersionSerializer(serializers.ModelSerializer):
    """Serializer for media versions/variants"""
    
    class Meta:
        model = MediaVersion
        fields = [
            'id',
            'version_type',
            'url',
            'width',
            'height',
            'file_size',
            'format',
            'created_at'
        ]
        read_only_fields = ['id', 'created_at']


class MediaProcessingJobSerializer(serializers.ModelSerializer):
    """Serializer for media processing jobs"""
    
    class Meta:
        model = MediaProcessingJob
        fields = [
            'job_id',
            'status',
            'operations',
            'options',
            'progress',
            'current_operation',
            'completed_operations',
            'error_message',
            'started_at',
            'completed_at',
            'created_at',
            'updated_at'
        ]
        read_only_fields = [
            'job_id', 'created_at', 'updated_at', 
            'started_at', 'completed_at'
        ]


class MediaSerializer(serializers.ModelSerializer):
    """Main serializer for Media objects"""
    
    versions = MediaVersionSerializer(many=True, read_only=True)
    processing_jobs = MediaProcessingJobSerializer(many=True, read_only=True)
    uploaded_by_username = serializers.CharField(source='uploaded_by.username', read_only=True)
    
    class Meta:
        model = Media
        fields = [
            'id',
            'url',
            'thumbnail_url',
            'filename',
            'file_size',
            'content_type',
            'media_type',
            'entity_type',
            'entity_id',
            'title',
            'description',
            'alt_text',
            'status',
            'processing_metadata',
            'error_message',
            'width',
            'height',
            'duration',
            'is_primary',
            'display_order',
            'uploaded_by',
            'uploaded_by_username',
            'view_count',
            'download_count',
            'processed_at',
            'created_at',
            'updated_at',
            'versions',
            'processing_jobs'
        ]
        read_only_fields = [
            'id', 'url', 'thumbnail_url', 'file_size', 'content_type',
            'media_type', 'status', 'processing_metadata', 'error_message',
            'width', 'height', 'duration', 'uploaded_by', 'uploaded_by_username',
            'view_count', 'download_count', 'processed_at', 'created_at', 
            'updated_at', 'versions', 'processing_jobs'
        ]
        extra_kwargs = {
            'entity_id': {'required': True},
            'entity_type': {'required': True}
        }


class MediaUploadSerializer(serializers.Serializer):
    """Serializer for media file uploads"""
    
    # File size limits in bytes
    MAX_IMAGE_SIZE = 10 * 1024 * 1024  # 10MB
    MAX_VIDEO_SIZE = 500 * 1024 * 1024  # 500MB
    MAX_DOCUMENT_SIZE = 50 * 1024 * 1024  # 50MB
    MAX_AUDIO_SIZE = 100 * 1024 * 1024  # 100MB
    
    # Allowed file extensions by media type
    ALLOWED_IMAGE_EXTENSIONS = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg']
    ALLOWED_VIDEO_EXTENSIONS = ['mp4', 'mov', 'avi', 'webm', 'mkv']
    ALLOWED_DOCUMENT_EXTENSIONS = ['pdf', 'doc', 'docx', 'txt', 'odt', 'rtf']
    ALLOWED_AUDIO_EXTENSIONS = ['mp3', 'wav', 'ogg', 'aac', 'm4a', 'flac']
    
    # MIME type mappings
    MIME_TYPE_MAPPING = {
        'image': ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'],
        'video': ['video/mp4', 'video/quicktime', 'video/x-msvideo', 'video/webm', 'video/x-matroska'],
        'document': ['application/pdf', 'application/msword', 
                     'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
                     'text/plain', 'application/vnd.oasis.opendocument.text', 'application/rtf'],
        'audio': ['audio/mpeg', 'audio/wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/flac']
    }
    
    file = serializers.FileField(required=True)
    entity_type = serializers.ChoiceField(choices=MediaEntityType.choices, required=True)
    entity_id = serializers.UUIDField(required=True)
    title = serializers.CharField(max_length=255, required=False, allow_blank=True)
    description = serializers.CharField(required=False, allow_blank=True)
    alt_text = serializers.CharField(max_length=500, required=False, allow_blank=True)
    is_primary = serializers.BooleanField(default=False)
    display_order = serializers.IntegerField(min_value=0, default=0)
    
    def validate_file(self, file: InMemoryUploadedFile) -> InMemoryUploadedFile:
        """Validate uploaded file"""
        
        # Check file extension
        ext = os.path.splitext(file.name)[1][1:].lower()
        all_allowed_extensions = (
            self.ALLOWED_IMAGE_EXTENSIONS + 
            self.ALLOWED_VIDEO_EXTENSIONS + 
            self.ALLOWED_DOCUMENT_EXTENSIONS + 
            self.ALLOWED_AUDIO_EXTENSIONS
        )
        
        if ext not in all_allowed_extensions:
            raise serializers.ValidationError(
                f"File extension '{ext}' is not allowed. Allowed extensions: {', '.join(all_allowed_extensions)}"
            )
        
        # Determine media type from extension
        if ext in self.ALLOWED_IMAGE_EXTENSIONS:
            media_type = MediaType.IMAGE
            max_size = self.MAX_IMAGE_SIZE
        elif ext in self.ALLOWED_VIDEO_EXTENSIONS:
            media_type = MediaType.VIDEO
            max_size = self.MAX_VIDEO_SIZE
        elif ext in self.ALLOWED_DOCUMENT_EXTENSIONS:
            media_type = MediaType.DOCUMENT
            max_size = self.MAX_DOCUMENT_SIZE
        elif ext in self.ALLOWED_AUDIO_EXTENSIONS:
            media_type = MediaType.AUDIO
            max_size = self.MAX_AUDIO_SIZE
        else:
            raise serializers.ValidationError("Could not determine media type from file extension")
        
        # Check file size
        if file.size > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of {max_size / (1024 * 1024):.1f}MB for {media_type} files"
            )
        
        # Verify MIME type using python-magic
        try:
            file.seek(0)
            mime_type = magic.from_buffer(file.read(2048), mime=True)
            file.seek(0)
            
            # Check if MIME type matches expected type
            allowed_mimes = self.MIME_TYPE_MAPPING.get(media_type, [])
            if mime_type not in allowed_mimes:
                raise serializers.ValidationError(
                    f"File MIME type '{mime_type}' does not match expected type for {media_type} files"
                )
        except Exception as e:
            raise serializers.ValidationError(f"Could not verify file type: {str(e)}")
        
        # Store detected media type and mime type for later use
        self.context['media_type'] = media_type
        self.context['content_type'] = mime_type
        
        return file


class BatchMediaUploadSerializer(serializers.Serializer):
    """Serializer for batch media uploads"""
    
    files = serializers.ListField(
        child=serializers.FileField(),
        min_length=1,
        max_length=10,  # Limit batch uploads to 10 files
        required=True
    )
    entity_type = serializers.ChoiceField(choices=MediaEntityType.choices, required=True)
    entity_id = serializers.UUIDField(required=True)
    
    def validate(self, attrs):
        """Validate batch upload"""
        
        # Create individual upload serializers for each file
        uploads = []
        for file in attrs['files']:
            upload_data = {
                'file': file,
                'entity_type': attrs['entity_type'],
                'entity_id': attrs['entity_id']
            }
            upload_serializer = MediaUploadSerializer(data=upload_data, context=self.context)
            upload_serializer.is_valid(raise_exception=True)
            uploads.append(upload_serializer)
        
        attrs['uploads'] = uploads
        return attrs


class PresignedUploadSerializer(serializers.Serializer):
    """Serializer for generating presigned upload URLs"""
    
    filename = serializers.CharField(max_length=255, required=True)
    content_type = serializers.CharField(max_length=100, required=True)
    entity_type = serializers.ChoiceField(choices=MediaEntityType.choices, required=True)
    entity_id = serializers.UUIDField(required=True)
    file_size = serializers.IntegerField(min_value=1, required=True)
    
    def validate(self, attrs):
        """Validate presigned upload request"""
        
        # Extract extension and validate
        ext = os.path.splitext(attrs['filename'])[1][1:].lower()
        
        # Reuse validation logic from MediaUploadSerializer
        upload_serializer = MediaUploadSerializer()
        all_allowed_extensions = (
            upload_serializer.ALLOWED_IMAGE_EXTENSIONS + 
            upload_serializer.ALLOWED_VIDEO_EXTENSIONS + 
            upload_serializer.ALLOWED_DOCUMENT_EXTENSIONS + 
            upload_serializer.ALLOWED_AUDIO_EXTENSIONS
        )
        
        if ext not in all_allowed_extensions:
            raise serializers.ValidationError(
                f"File extension '{ext}' is not allowed"
            )
        
        # Determine media type and validate size
        if ext in upload_serializer.ALLOWED_IMAGE_EXTENSIONS:
            media_type = MediaType.IMAGE
            max_size = upload_serializer.MAX_IMAGE_SIZE
        elif ext in upload_serializer.ALLOWED_VIDEO_EXTENSIONS:
            media_type = MediaType.VIDEO
            max_size = upload_serializer.MAX_VIDEO_SIZE
        elif ext in upload_serializer.ALLOWED_DOCUMENT_EXTENSIONS:
            media_type = MediaType.DOCUMENT
            max_size = upload_serializer.MAX_DOCUMENT_SIZE
        elif ext in upload_serializer.ALLOWED_AUDIO_EXTENSIONS:
            media_type = MediaType.AUDIO
            max_size = upload_serializer.MAX_AUDIO_SIZE
        else:
            raise serializers.ValidationError("Could not determine media type")
        
        if attrs['file_size'] > max_size:
            raise serializers.ValidationError(
                f"File size exceeds maximum allowed size of {max_size / (1024 * 1024):.1f}MB"
            )
        
        # Validate content type
        allowed_mimes = upload_serializer.MIME_TYPE_MAPPING.get(media_type, [])
        if attrs['content_type'] not in allowed_mimes:
            raise serializers.ValidationError(
                f"Content type '{attrs['content_type']}' is not allowed for {media_type} files"
            )
        
        attrs['media_type'] = media_type
        return attrs


class PresignedUploadResponseSerializer(serializers.Serializer):
    """Response serializer for presigned upload URLs"""
    
    upload_url = serializers.URLField()
    upload_headers = serializers.DictField()
    media_id = serializers.UUIDField()
    storage_key = serializers.CharField()
    expires_at = serializers.DateTimeField()


class MediaBulkOperationSerializer(serializers.Serializer):
    """Serializer for bulk operations on media"""
    
    media_ids = serializers.ListField(
        child=serializers.UUIDField(),
        min_length=1,
        max_length=100
    )
    
    def validate_media_ids(self, media_ids: List[str]) -> List[str]:
        """Validate that all media IDs exist and belong to the user"""
        
        user = self.context['request'].user
        existing_media = Media.objects.filter(
            id__in=media_ids,
            uploaded_by=user
        ).values_list('id', flat=True)
        
        missing_ids = set(media_ids) - set(str(id) for id in existing_media)
        if missing_ids:
            raise serializers.ValidationError(
                f"The following media IDs were not found or don't belong to you: {', '.join(missing_ids)}"
            )
        
        return media_ids


class MediaBulkUpdateSerializer(MediaBulkOperationSerializer):
    """Serializer for bulk updating media metadata"""
    
    updates = serializers.DictField(
        child=serializers.CharField(),
        required=True
    )
    
    def validate_updates(self, updates: Dict[str, Any]) -> Dict[str, Any]:
        """Validate update fields"""
        
        allowed_fields = ['title', 'description', 'alt_text', 'display_order']
        invalid_fields = set(updates.keys()) - set(allowed_fields)
        
        if invalid_fields:
            raise serializers.ValidationError(
                f"The following fields cannot be updated: {', '.join(invalid_fields)}"
            )
        
        return updates


class MediaProcessingRequestSerializer(serializers.Serializer):
    """Serializer for requesting media processing operations"""
    
    operations = serializers.ListField(
        child=serializers.ChoiceField(choices=[
            'thumbnail',
            'optimize',
            'resize',
            'transcode',
            'extract_metadata'
        ]),
        min_length=1,
        required=True
    )
    options = serializers.DictField(required=False, default=dict)
    
    def validate_options(self, options: Dict[str, Any]) -> Dict[str, Any]:
        """Validate processing options"""
        
        # Validate resize options
        if 'resize' in self.initial_data.get('operations', []):
            if 'width' not in options and 'height' not in options:
                raise serializers.ValidationError(
                    "Resize operation requires either 'width' or 'height' in options"
                )
            
            if 'width' in options:
                if not isinstance(options['width'], int) or options['width'] < 1:
                    raise serializers.ValidationError("Width must be a positive integer")
                    
            if 'height' in options:
                if not isinstance(options['height'], int) or options['height'] < 1:
                    raise serializers.ValidationError("Height must be a positive integer")
        
        # Validate transcode options
        if 'transcode' in self.initial_data.get('operations', []):
            if 'format' not in options:
                raise serializers.ValidationError(
                    "Transcode operation requires 'format' in options"
                )
            
            allowed_formats = ['mp4', 'webm', 'jpg', 'png', 'webp']
            if options['format'] not in allowed_formats:
                raise serializers.ValidationError(
                    f"Invalid format. Allowed formats: {', '.join(allowed_formats)}"
                )
        
        return options