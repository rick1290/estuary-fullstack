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
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes

from streams.models import StreamPost, StreamPostMedia
from streams.api.v1.serializers import StreamPostMediaSerializer


class StreamPostMediaMixin:
    """
    Mixin to handle media uploads for stream posts.
    Add this to StreamPostViewSet for proper media handling.
    """
    
    @action(detail=True, methods=['get'], url_path='test-endpoint')
    def test_endpoint(self, request, public_uuid=None):
        """Test endpoint to verify routing works."""
        print("=== TEST ENDPOINT REACHED ===")
        return Response({'message': 'Test endpoint working', 'uuid': public_uuid})
    
    @extend_schema(
        tags=['Stream Posts'],
        summary="Upload media to stream post",
        description="Upload multiple media files to a stream post with support for images, videos, and audio.",
        request={
            'multipart/form-data': {
                'type': 'object',
                'properties': {
                    'media_0': {'type': 'string', 'format': 'binary', 'description': 'Media file (can use media_0, media_1, etc.)'},
                    'caption_0': {'type': 'string', 'description': 'Caption for corresponding media file'},
                    'alt_text_0': {'type': 'string', 'description': 'Alt text for corresponding media file'},
                },
                'additionalProperties': True,
                'description': 'Upload multiple files using media_N naming (media_0, media_1, etc.) with optional caption_N and alt_text_N',
                'required': []
            }
        },
        responses={
            201: {
                'description': 'Media uploaded successfully',
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'uploaded': {
                                    'type': 'array',
                                    'items': {'$ref': '#/components/schemas/StreamPostMedia'}
                                },
                                'post_id': {'type': 'string', 'format': 'uuid'},
                                'errors': {
                                    'type': 'array',
                                    'items': {
                                        'type': 'object',
                                        'properties': {
                                            'file': {'type': 'string'},
                                            'error': {'type': 'string'}
                                        }
                                    }
                                }
                            }
                        }
                    }
                }
            },
            400: {'description': 'Bad request - invalid files or no files provided'},
            403: {'description': 'Permission denied - not the post owner'}
        }
    )
    @action(
        detail=True, 
        methods=['post'], 
        parser_classes=[MultiPartParser, FormParser],
        url_path='upload-media',
        url_name='upload-media'
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
        try:
            # Get the post - this will also handle 404 if not found
            post = self.get_object()
            
            # Check permissions
            if not request.user.is_authenticated:
                return Response(
                    {'error': 'Authentication required'},
                    status=status.HTTP_401_UNAUTHORIZED
                )
            
            if not hasattr(request.user, 'practitioner_profile') or not request.user.practitioner_profile:
                return Response(
                    {'error': 'Must be a practitioner to upload media'},
                    status=status.HTTP_403_FORBIDDEN
                )
                
            if post.stream.practitioner != request.user.practitioner_profile:
                return Response(
                    {'error': 'You can only upload media to your own posts'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Debug: Log what we're receiving
            print(f"DEBUG: request.FILES keys: {list(request.FILES.keys())}")
            print(f"DEBUG: request.data keys: {list(request.data.keys())}")
            
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
            
            print(f"DEBUG: Found {len(files)} files")
            
            if not files:
                return Response(
                    {'error': f'No files provided. Received keys: {list(request.FILES.keys())}'},
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
                        try:
                            index_num = int(file_data['index'])
                        except (ValueError, TypeError):
                            index_num = 0
                        
                        # Create the media object
                        media = StreamPostMedia.objects.create(
                            post=post,
                            file=file_data['file'],
                            media_type=media_type,
                            content_type=content_type,
                            file_size=file_data['file'].size,
                            caption=file_data['caption'],
                            alt_text=file_data['alt_text'],
                            order=max_order + 1 + index_num
                        )
                        uploaded_media.append(media)
                        
                    except Exception as e:
                        import traceback
                        print(f"ERROR uploading media: {str(e)}")
                        print(f"ERROR traceback: {traceback.format_exc()}")
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
            
        except Exception as e:
            import traceback
            return Response({
                'error': f'Upload endpoint error: {str(e)}',
                'traceback': traceback.format_exc(),
                'public_uuid': public_uuid
            }, status=500)
    
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
    
    @extend_schema(
        tags=['Stream Posts'],
        summary="Delete media from stream post",
        description="Delete a specific media item from a stream post.",
        parameters=[
            OpenApiParameter(
                name='media_id',
                type=OpenApiTypes.STR,
                location=OpenApiParameter.PATH,
                description='ID of the media item to delete'
            )
        ],
        responses={
            204: {'description': 'Media deleted successfully'},
            403: {'description': 'Permission denied - not the post owner'},
            404: {'description': 'Media not found'}
        }
    )
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
    
    @extend_schema(
        tags=['Stream Posts'],
        summary="Reorder media in stream post",
        description="Reorder media items in a stream post by providing a list of media IDs in the desired order.",
        request={
            'application/json': {
                'type': 'object',
                'properties': {
                    'media_ids': {
                        'type': 'array',
                        'items': {'type': 'string'},
                        'description': 'Array of media IDs in the desired order'
                    }
                },
                'required': ['media_ids']
            }
        },
        responses={
            200: {
                'description': 'Media reordered successfully',
                'content': {
                    'application/json': {
                        'schema': {
                            'type': 'object',
                            'properties': {
                                'message': {'type': 'string'}
                            }
                        }
                    }
                }
            },
            400: {'description': 'Bad request - missing media_ids'},
            403: {'description': 'Permission denied - not the post owner'}
        }
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