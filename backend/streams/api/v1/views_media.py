"""
Stream Post Media Upload Handling

Simple implementation for handling media uploads in stream posts.
Works directly with StreamPostMedia model.
"""
from rest_framework import status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.parsers import MultiPartParser, FormParser
from django.db import transaction
from django.db.models import Max

from streams.models import StreamPost, StreamPostMedia
from streams.api.v1.serializers import StreamPostMediaSerializer


class StreamPostMediaMixin:
    """
    Mixin to handle media uploads for stream posts.
    Add this to StreamPostViewSet for proper media handling.
    """
    
    @action(
        detail=True, 
        methods=['post'], 
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-media'
    )
    def upload_media(self, request, public_uuid=None):
        """
        Upload media files for a stream post.
        Supports multiple file uploads in a single request.
        
        Expected form data:
        - files: Multiple file fields named 'media_0', 'media_1', etc.
        - captions: Optional captions for each file ('caption_0', 'caption_1', etc.)
        - alt_texts: Optional alt texts ('alt_text_0', 'alt_text_1', etc.)
        """
        post = self.get_object()
        
        # Check permissions
        if post.stream.practitioner != request.user.practitioner_profile:
            return Response(
                {'error': 'You can only upload media to your own posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Extract files from request
        files = []
        for key, file in request.FILES.items():
            if key.startswith('media_'):
                index = key.split('_')[1]
                files.append({
                    'file': file,
                    'index': index,
                    'caption': request.data.get(f'caption_{index}', ''),
                    'alt_text': request.data.get(f'alt_text_{index}', '')
                })
        
        if not files:
            return Response(
                {'error': 'No files provided'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Process uploads
        uploaded_media = []
        errors = []
        
        with transaction.atomic():
            # Get the current max order for this post
            max_order = post.media.aggregate(max_order=Max('order'))['max_order'] or -1
            
            for file_data in files:
                try:
                    # Determine media type from file
                    content_type = file_data['file'].content_type or 'application/octet-stream'
                    media_type = self._get_media_type_from_content_type(content_type)
                    
                    # Create StreamPostMedia object
                    media = StreamPostMedia.objects.create(
                        post=post,
                        file=file_data['file'],
                        media_type=media_type,
                        content_type=content_type,
                        file_size=file_data['file'].size,
                        caption=file_data['caption'],
                        alt_text=file_data['alt_text'],
                        order=max_order + 1 + int(file_data['index'])
                    )
                    uploaded_media.append(media)
                    
                except Exception as e:
                    errors.append({
                        'file': file_data['file'].name,
                        'error': str(e)
                    })
            
            # If any errors occurred and no successful uploads, rollback
            if errors and not uploaded_media:
                return Response(
                    {'errors': errors},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Return results
        response_data = {
            'uploaded': StreamPostMediaSerializer(uploaded_media, many=True).data,
            'post_id': str(post.public_uuid)
        }
        
        if errors:
            response_data['errors'] = errors
        
        return Response(response_data, status=status.HTTP_201_CREATED)
    
    def _get_media_type_from_content_type(self, content_type: str) -> str:
        """Determine media type from content type."""
        if content_type.startswith('image/'):
            return 'image'
        elif content_type.startswith('video/'):
            return 'video'
        elif content_type.startswith('audio/'):
            return 'audio'
        else:
            return 'document'
    
    @action(detail=True, methods=['delete'], url_path='media/(?P<media_id>[^/.]+)')
    def delete_media(self, request, public_uuid=None, media_id=None):
        """Delete a specific media item from a post."""
        post = self.get_object()
        
        # Check permissions
        if post.stream.practitioner != request.user.practitioner_profile:
            return Response(
                {'error': 'You can only delete media from your own posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        try:
            # Find and delete the StreamPostMedia
            post_media = post.media.get(id=media_id)
            post_media.delete()
            
            return Response(status=status.HTTP_204_NO_CONTENT)
            
        except StreamPostMedia.DoesNotExist:
            return Response(
                {'error': 'Media not found'},
                status=status.HTTP_404_NOT_FOUND
            )
    
    @action(detail=True, methods=['post'], url_path='reorder-media')
    def reorder_media(self, request, public_uuid=None):
        """Reorder media items for a post."""
        post = self.get_object()
        
        # Check permissions
        if post.stream.practitioner != request.user.practitioner_profile:
            return Response(
                {'error': 'You can only reorder media on your own posts'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        media_ids = request.data.get('media_ids', [])
        if not media_ids:
            return Response(
                {'error': 'media_ids required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Update order
        with transaction.atomic():
            for index, media_id in enumerate(media_ids):
                post.media.filter(id=media_id).update(order=index)
        
        return Response({'message': 'Media reordered successfully'})