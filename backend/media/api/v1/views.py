"""
Media API views
"""
from rest_framework import viewsets, permissions, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db.models import Q
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
import uuid
import os

from media.models import Media, MediaType, MediaStatus, MediaProcessingJob
from integrations.cloudflare_r2.storage import R2MediaStorage
from .serializers import (
    MediaSerializer,
    MediaUploadSerializer,
    BatchMediaUploadSerializer,
    PresignedUploadSerializer,
    PresignedUploadResponseSerializer,
    MediaBulkOperationSerializer,
    MediaBulkUpdateSerializer,
    MediaProcessingRequestSerializer,
    MediaProcessingJobSerializer
)
from .permissions import IsMediaOwner


class MediaViewSet(viewsets.ModelViewSet):
    """
    ViewSet for managing media objects.
    
    Provides CRUD operations plus specialized media handling:
    - Direct file uploads
    - Presigned URL generation for client-side uploads
    - Batch operations
    - Processing requests
    """
    
    serializer_class = MediaSerializer
    permission_classes = [permissions.IsAuthenticated, IsMediaOwner]
    parser_classes = [MultiPartParser, FormParser]
    
    def get_queryset(self):
        """
        Filter media based on user permissions and optional filters.
        """
        user = self.request.user
        queryset = Media.objects.select_related('uploaded_by').prefetch_related('versions', 'processing_jobs')
        
        # Users can only see their own media
        queryset = queryset.filter(uploaded_by=user)
        
        # Apply filters
        entity_type = self.request.query_params.get('entity_type')
        if entity_type:
            queryset = queryset.filter(entity_type=entity_type)
            
        entity_id = self.request.query_params.get('entity_id')
        if entity_id:
            queryset = queryset.filter(entity_id=entity_id)
            
        media_type = self.request.query_params.get('media_type')
        if media_type:
            queryset = queryset.filter(media_type=media_type)
            
        status_filter = self.request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            
        # Search in filename, title, description
        search = self.request.query_params.get('search')
        if search:
            queryset = queryset.filter(
                Q(filename__icontains=search) |
                Q(title__icontains=search) |
                Q(description__icontains=search)
            )
            
        return queryset
    
    def perform_create(self, serializer):
        """Set the uploaded_by field to the current user"""
        serializer.save(uploaded_by=self.request.user)
    
    @action(detail=False, methods=['post'], parser_classes=[MultiPartParser, FormParser])
    def upload(self, request):
        """
        Direct file upload endpoint.
        
        Handles file upload to cloud storage and creates media record.
        """
        serializer = MediaUploadSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        file = serializer.validated_data['file']
        entity_type = serializer.validated_data['entity_type']
        entity_id = serializer.validated_data['entity_id']
        
        # Generate storage key
        file_ext = os.path.splitext(file.name)[1]
        storage_key = f"media/{entity_type}/{entity_id}/{uuid.uuid4()}{file_ext}"
        
        # Upload to R2
        storage = R2MediaStorage()
        
        try:
            # Upload file to R2
            file.seek(0)
            file_content = file.read()
            storage.client.put_object(
                Bucket=storage.bucket_name,
                Key=storage_key,
                Body=file_content,
                ContentType=serializer.context.get('content_type', file.content_type)
            )
            
            # Get public URL
            public_url = storage.get_public_url(storage_key)
            
            # Create media record
            media = Media.objects.create(
                url=public_url,
                filename=file.name,
                file_size=file.size,
                content_type=serializer.context.get('content_type', file.content_type),
                media_type=serializer.context.get('media_type'),
                entity_type=entity_type,
                entity_id=entity_id,
                storage_key=storage_key,
                title=serializer.validated_data.get('title', ''),
                description=serializer.validated_data.get('description', ''),
                alt_text=serializer.validated_data.get('alt_text', ''),
                is_primary=serializer.validated_data.get('is_primary', False),
                display_order=serializer.validated_data.get('display_order', 0),
                uploaded_by=request.user,
                status=MediaStatus.READY
            )
            
            # Trigger processing for images and videos
            if media.media_type in [MediaType.IMAGE, MediaType.VIDEO]:
                self._trigger_processing(media, ['thumbnail', 'optimize'])

            # Auto-link primary images to their entities
            if media.is_primary and media.entity_type == 'practitioner':
                from practitioners.models import Practitioner
                try:
                    practitioner = Practitioner.objects.get(public_uuid=media.entity_id)
                    # Save the file to the ImageField
                    from django.core.files.base import ContentFile
                    practitioner.profile_image.save(
                        f"{media.entity_id}{file_ext}",
                        ContentFile(file_content),
                        save=True
                    )
                except Practitioner.DoesNotExist:
                    pass

            return Response(
                MediaSerializer(media).data,
                status=status.HTTP_201_CREATED
            )
            
        except Exception as e:
            # Clean up if upload fails
            if storage.file_exists(storage_key):
                storage.delete(storage_key)
            
            return Response(
                {'error': f'Upload failed: {str(e)}'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )
    
    @action(detail=False, methods=['post'])
    def batch_upload(self, request):
        """
        Batch file upload endpoint.
        
        Handles multiple file uploads in a single request.
        """
        serializer = BatchMediaUploadSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        uploads = serializer.validated_data['uploads']
        entity_type = serializer.validated_data['entity_type']
        entity_id = serializer.validated_data['entity_id']
        
        created_media = []
        errors = []
        
        for idx, upload_serializer in enumerate(uploads):
            file = upload_serializer.validated_data['file']
            
            # Use the single upload logic
            upload_request = request._request.POST.copy()
            upload_request['file'] = file
            upload_request['entity_type'] = entity_type
            upload_request['entity_id'] = entity_id
            
            # Create a new request with single file
            single_upload_data = {
                'file': file,
                'entity_type': entity_type,
                'entity_id': entity_id
            }
            
            single_serializer = MediaUploadSerializer(data=single_upload_data, context={'request': request})
            
            if single_serializer.is_valid():
                try:
                    # Reuse upload logic
                    response = self.upload(request)
                    if response.status_code == status.HTTP_201_CREATED:
                        created_media.append(response.data)
                    else:
                        errors.append({
                            'file': file.name,
                            'error': response.data.get('error', 'Upload failed')
                        })
                except Exception as e:
                    errors.append({
                        'file': file.name,
                        'error': str(e)
                    })
            else:
                errors.append({
                    'file': file.name,
                    'error': single_serializer.errors
                })
        
        return Response({
            'created': created_media,
            'errors': errors,
            'summary': {
                'total': len(uploads),
                'successful': len(created_media),
                'failed': len(errors)
            }
        }, status=status.HTTP_207_MULTI_STATUS)
    
    @action(detail=False, methods=['post'])
    def presigned_upload(self, request):
        """
        Generate presigned upload URL for client-side uploads.
        
        Returns a presigned URL that clients can use to upload directly to R2.
        """
        serializer = PresignedUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Generate media ID and storage key
        media_id = uuid.uuid4()
        file_ext = os.path.splitext(serializer.validated_data['filename'])[1]
        storage_key = f"media/{serializer.validated_data['entity_type']}/{serializer.validated_data['entity_id']}/{media_id}{file_ext}"
        
        # Generate presigned URL
        storage = R2MediaStorage()
        upload_url, headers = storage.generate_upload_url(
            key=storage_key,
            content_type=serializer.validated_data['content_type'],
            expires_in=3600,  # 1 hour
            metadata={
                'media_id': str(media_id),
                'user_id': str(request.user.id),
                'entity_type': serializer.validated_data['entity_type'],
                'entity_id': str(serializer.validated_data['entity_id'])
            }
        )
        
        # Create pending media record
        media = Media.objects.create(
            id=media_id,
            filename=serializer.validated_data['filename'],
            file_size=serializer.validated_data['file_size'],
            content_type=serializer.validated_data['content_type'],
            media_type=serializer.validated_data['media_type'],
            entity_type=serializer.validated_data['entity_type'],
            entity_id=serializer.validated_data['entity_id'],
            storage_key=storage_key,
            uploaded_by=request.user,
            status=MediaStatus.PENDING,
            url='',  # Will be updated after upload confirmation
        )
        
        response_data = {
            'upload_url': upload_url,
            'upload_headers': headers,
            'media_id': media_id,
            'storage_key': storage_key,
            'expires_at': timezone.now() + timedelta(hours=1)
        }
        
        return Response(
            PresignedUploadResponseSerializer(response_data).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def confirm_upload(self, request, pk=None):
        """
        Confirm that a presigned upload was completed.
        
        Updates the media record with the public URL and triggers processing.
        """
        media = self.get_object()
        
        if media.status != MediaStatus.PENDING:
            return Response(
                {'error': 'Media is not in pending state'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Verify file exists in storage
        storage = R2MediaStorage()
        if not storage.file_exists(media.storage_key):
            return Response(
                {'error': 'File not found in storage'},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Get file info and update media record
        file_info = storage.get_file_info(media.storage_key)
        if file_info:
            media.file_size = file_info['size']
            media.content_type = file_info['content_type']
        
        # Update URL and status
        media.url = storage.get_public_url(media.storage_key)
        media.status = MediaStatus.READY
        media.save()
        
        # Trigger processing
        if media.media_type in [MediaType.IMAGE, MediaType.VIDEO]:
            self._trigger_processing(media, ['thumbnail', 'optimize'])
        
        return Response(
            MediaSerializer(media).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def process(self, request, pk=None):
        """
        Request processing operations for a media item.
        """
        media = self.get_object()
        serializer = MediaProcessingRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Create processing job
        job = MediaProcessingJob.objects.create(
            media=media,
            operations=serializer.validated_data['operations'],
            options=serializer.validated_data.get('options', {})
        )
        
        # Trigger async processing (would integrate with Temporal)
        # For now, just update media status
        media.status = MediaStatus.PROCESSING
        media.save()
        
        return Response(
            MediaProcessingJobSerializer(job).data,
            status=status.HTTP_202_ACCEPTED
        )
    
    @action(detail=False, methods=['post'])
    def bulk_delete(self, request):
        """
        Delete multiple media items at once.
        """
        serializer = MediaBulkOperationSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        media_ids = serializer.validated_data['media_ids']
        
        # Get media objects
        media_objects = Media.objects.filter(
            id__in=media_ids,
            uploaded_by=request.user
        )
        
        # Delete from storage
        storage = R2MediaStorage()
        deleted_count = 0
        errors = []
        
        for media in media_objects:
            try:
                # Delete from R2
                if storage.file_exists(media.storage_key):
                    storage.delete(media.storage_key)
                
                # Delete thumbnail if exists
                if media.thumbnail_url:
                    thumbnail_key = media.storage_key.replace('/', '/thumbnails/')
                    if storage.file_exists(thumbnail_key):
                        storage.delete(thumbnail_key)
                
                # Delete database record
                media.delete()
                deleted_count += 1
                
            except Exception as e:
                errors.append({
                    'media_id': str(media.id),
                    'error': str(e)
                })
        
        return Response({
            'deleted': deleted_count,
            'errors': errors
        }, status=status.HTTP_200_OK)
    
    @action(detail=False, methods=['post'])
    def bulk_update(self, request):
        """
        Update multiple media items at once.
        """
        serializer = MediaBulkUpdateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        media_ids = serializer.validated_data['media_ids']
        updates = serializer.validated_data['updates']
        
        # Update media objects
        updated_count = Media.objects.filter(
            id__in=media_ids,
            uploaded_by=request.user
        ).update(**updates, updated_at=timezone.now())
        
        return Response({
            'updated': updated_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def set_primary(self, request, pk=None):
        """
        Set a media item as primary for its entity.
        """
        media = self.get_object()
        
        with transaction.atomic():
            # Remove primary flag from other media
            Media.objects.filter(
                entity_type=media.entity_type,
                entity_id=media.entity_id,
                is_primary=True
            ).exclude(pk=media.pk).update(is_primary=False)
            
            # Set this media as primary
            media.is_primary = True
            media.save()
        
        return Response(
            MediaSerializer(media).data,
            status=status.HTTP_200_OK
        )
    
    @action(detail=True, methods=['post'])
    def increment_view(self, request, pk=None):
        """
        Increment view count for a media item.
        """
        media = self.get_object()
        media.view_count += 1
        media.save(update_fields=['view_count'])
        
        return Response({
            'view_count': media.view_count
        }, status=status.HTTP_200_OK)
    
    @action(detail=True, methods=['post'])
    def increment_download(self, request, pk=None):
        """
        Increment download count for a media item.
        """
        media = self.get_object()
        media.download_count += 1
        media.save(update_fields=['download_count'])
        
        return Response({
            'download_count': media.download_count
        }, status=status.HTTP_200_OK)
    
    def _trigger_processing(self, media, operations):
        """
        Helper method to trigger media processing.
        
        This would integrate with Temporal workflows in production.
        """
        # Create processing job
        job = MediaProcessingJob.objects.create(
            media=media,
            operations=operations,
            options={}
        )
        
        # Update media status
        media.status = MediaStatus.PROCESSING
        media.save()
        
        # In production, this would trigger a Temporal workflow
        # For now, we'll just mark it as ready after creating the job
        # The actual processing would be handled by a background worker
        
        return job