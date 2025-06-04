import os
import tempfile
import requests
from rest_framework import status
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, IsAdminUser
from drf_spectacular.utils import extend_schema, OpenApiResponse

from apps.practitioners.models import Practitioner
from apps.integrations.youtube.models import YouTubeVideo
from apps.integrations.youtube.utils import upload_video_to_youtube, update_youtube_video_privacy
from .serializers import (
    YouTubeVideoSerializer,
    PractitionerVideoUploadSerializer,
    VideoPrivacyUpdateSerializer
)


class YouTubeVideoListView(APIView):
    """
    API view for listing YouTube videos.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        responses={200: YouTubeVideoSerializer(many=True)},
        description="List YouTube videos for a practitioner"
    )
    def get(self, request, *args, **kwargs):
        practitioner_id = request.query_params.get('practitioner_id')
        
        if practitioner_id:
            videos = YouTubeVideo.objects.filter(practitioner_id=practitioner_id)
        else:
            # Admin users can see all videos, others only see their own
            if request.user.is_staff:
                videos = YouTubeVideo.objects.all()
            else:
                # Try to get the user's practitioner profile
                try:
                    practitioner = Practitioner.objects.get(user=request.user)
                    videos = YouTubeVideo.objects.filter(practitioner=practitioner)
                except Practitioner.DoesNotExist:
                    return Response(
                        {"error": "You don't have a practitioner profile"},
                        status=status.HTTP_403_FORBIDDEN
                    )
        
        serializer = YouTubeVideoSerializer(videos, many=True)
        return Response(serializer.data)


class YouTubeVideoUploadView(APIView):
    """
    API view for uploading videos to YouTube from Cloudflare R2.
    """
    permission_classes = [IsAuthenticated]
    
    @extend_schema(
        request=PractitionerVideoUploadSerializer,
        responses={
            202: YouTubeVideoSerializer,
            400: OpenApiResponse(description="Bad request or validation error"),
            403: OpenApiResponse(description="Permission denied"),
        },
        description="Upload a practitioner video from Cloudflare R2 to YouTube"
    )
    def post(self, request, *args, **kwargs):
        serializer = PractitionerVideoUploadSerializer(data=request.data)
        if serializer.is_valid():
            practitioner_id = serializer.validated_data['practitioner_id']
            video_url = serializer.validated_data['video_url']
            
            # Check permissions - only admins or the practitioner can upload
            try:
                practitioner = Practitioner.objects.get(id=practitioner_id)
                if not request.user.is_staff and practitioner.user != request.user:
                    return Response(
                        {"error": "You don't have permission to upload for this practitioner"},
                        status=status.HTTP_403_FORBIDDEN
                    )
            except Practitioner.DoesNotExist:
                return Response(
                    {"error": "Practitioner not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            # Create a record in the database
            youtube_video = YouTubeVideo.objects.create(
                title=serializer.validated_data.get('title', f"{practitioner.display_name or practitioner.user.get_full_name()} - Practitioner Profile"),
                description=serializer.validated_data.get('description', ''),
                source_file_url=video_url,
                practitioner=practitioner,
                status='pending',
                apply_video_processing=serializer.validated_data.get('apply_video_processing', True)
            )
            
            # Return the created record
            response_serializer = YouTubeVideoSerializer(youtube_video)
            return Response(response_serializer.data, status=status.HTTP_202_ACCEPTED)
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class YouTubeVideoProcessView(APIView):
    """
    API view for processing a pending YouTube video upload.
    Admin only endpoint.
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        responses={
            200: YouTubeVideoSerializer,
            400: OpenApiResponse(description="Bad request or processing error"),
            404: OpenApiResponse(description="Video not found"),
        },
        description="Process a pending YouTube video upload (admin only)"
    )
    def post(self, request, video_id, *args, **kwargs):
        try:
            youtube_video = YouTubeVideo.objects.get(id=video_id, status='pending')
        except YouTubeVideo.DoesNotExist:
            return Response(
                {"error": "Pending video not found"},
                status=status.HTTP_404_NOT_FOUND
            )
        
        # Mark as processing
        youtube_video.mark_as_processing()
        
        try:
            # Download the video from Cloudflare R2
            response = requests.get(youtube_video.source_file_url)
            if response.status_code != 200:
                raise Exception(f"Failed to download video: HTTP {response.status_code}")
            
            # Save to a temporary file
            with tempfile.NamedTemporaryFile(delete=False, suffix='.mp4') as temp_file:
                temp_file.write(response.content)
                temp_file_path = temp_file.name
            
            try:
                # Get practitioner details for the video
                practitioner = youtube_video.practitioner
                
                # Generate title and description if not provided
                title = youtube_video.title or f"{practitioner.display_name or practitioner.user.get_full_name()} - Practitioner Profile"
                description = youtube_video.description or f"Meet {practitioner.display_name or practitioner.user.get_full_name()}, a practitioner on Estuary."
                
                if practitioner.title and not youtube_video.description:
                    description += f"\n\nSpecialty: {practitioner.title}"
                
                if practitioner.bio and not youtube_video.description:
                    description += f"\n\n{practitioner.bio}"
                
                # Add a standard footer if using generated description
                if not youtube_video.description:
                    description += "\n\nLearn more at https://estuary.com"
                
                # Set tags based on practitioner specialties
                tags = ["estuary", "wellness", "practitioner"]
                
                # Upload to YouTube
                video_id = upload_video_to_youtube(
                    video_file_path=temp_file_path,
                    title=title,
                    description=description,
                    tags=tags,
                    privacy_status=youtube_video.privacy_status
                )
                
                # Update the record
                youtube_video.mark_as_uploaded(video_id)
                
                # Return the updated record
                serializer = YouTubeVideoSerializer(youtube_video)
                return Response(serializer.data)
                
            finally:
                # Clean up the temporary file
                if os.path.exists(temp_file_path):
                    os.unlink(temp_file_path)
                    
        except Exception as e:
            # Mark as failed
            youtube_video.mark_as_failed(str(e))
            return Response(
                {"error": f"Failed to process video: {str(e)}"},
                status=status.HTTP_400_BAD_REQUEST
            )


class YouTubeVideoPrivacyUpdateView(APIView):
    """
    API view for updating a YouTube video's privacy status.
    Admin only endpoint.
    """
    permission_classes = [IsAdminUser]
    
    @extend_schema(
        request=VideoPrivacyUpdateSerializer,
        responses={
            200: YouTubeVideoSerializer,
            400: OpenApiResponse(description="Bad request or update error"),
            404: OpenApiResponse(description="Video not found"),
        },
        description="Update a YouTube video's privacy status (admin only)"
    )
    def post(self, request, *args, **kwargs):
        serializer = VideoPrivacyUpdateSerializer(data=request.data)
        if serializer.is_valid():
            youtube_video_id = serializer.validated_data['youtube_video_id']
            privacy_status = serializer.validated_data['privacy_status']
            
            try:
                youtube_video = YouTubeVideo.objects.get(youtube_video_id=youtube_video_id)
            except YouTubeVideo.DoesNotExist:
                return Response(
                    {"error": "YouTube video not found"},
                    status=status.HTTP_404_NOT_FOUND
                )
            
            try:
                # Update privacy on YouTube
                update_youtube_video_privacy(youtube_video_id, privacy_status)
                
                # Update our record
                youtube_video.privacy_status = privacy_status
                if privacy_status == 'public':
                    youtube_video.mark_as_published()
                else:
                    youtube_video.save(update_fields=['privacy_status', 'updated_at'])
                
                # Return the updated record
                serializer = YouTubeVideoSerializer(youtube_video)
                return Response(serializer.data)
                
            except Exception as e:
                return Response(
                    {"error": f"Failed to update privacy: {str(e)}"},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
